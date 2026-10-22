// Browser orientation is a capability, never inferred from an Android/iOS name.
export function setupMobileDisplay() {
  const touch = matchMedia('(any-pointer: coarse)');
  const portrait = matchMedia('(orientation: portrait)');
  const gate = document.querySelector('#orientation-gate');
  const start = document.querySelector('#landscape-start');
  const message = document.querySelector('#orientation-message');
  const game = document.querySelector('#game');
  const panel = document.querySelector('#panel');
  let busy = false, pending = null;
  const canLock = () => typeof screen.orientation?.lock === 'function';
  const canFullscreen = () => Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const manual = '请把手机横过来；若画面没有转动，请先关闭系统的竖屏方向锁定。';

  function sync() {
    if (!busy && touch.matches && portrait.matches) {
      if (!gate.open) gate.showModal();
    } else if (gate.open) gate.close();
    start.disabled = busy;
    start.hidden = !canLock() && !canFullscreen();
    for (const button of document.querySelectorAll('[data-display-mode]')) {
      button.disabled = busy;
      button.textContent = document.fullscreenElement ? '退出全屏' : '横屏 / 全屏';
    }
  }

  function changeDisplay(action) {
    if (pending) return pending;
    // Fullscreen and modal dialogs share the browser's top layer. Finish the
    // display transition before reopening dialogs; retain their DOM and scroll.
    const reopenPanel = panel.open, focus = document.activeElement, inert = game.inert;
    const scroll = [...panel.querySelectorAll('*'), panel].map(el => [el, el.scrollTop, el.scrollLeft]);
    busy = true;
    if (panel.open) panel.close();
    if (gate.open) gate.close();
    game.inert = true;
    sync();
    pending = (async () => {
      try { await action(); }
      finally {
        game.inert = inert;
        busy = false;
        if (reopenPanel) panel.showModal();
        sync();
        if (!gate.open && focus?.isConnected) focus.focus({preventScroll:true});
        for (const [el, top, left] of scroll) { el.scrollTop = top; el.scrollLeft = left; }
        pending = null;
      }
    })();
    return pending;
  }

  function landscape() {
    message.textContent = '正在进入横屏…';
    return changeDisplay(async () => {
      if (!document.fullscreenElement && canFullscreen()) {
        try { await document.documentElement.requestFullscreen(); }
        catch { /* A standalone app may allow orientation lock without fullscreen. */ }
      }
      if (canLock()) {
        try {
          await screen.orientation.lock('landscape');
          message.textContent = '已请求锁定横屏。';
        } catch {
          message.textContent = `当前浏览器未能锁定横屏。${manual}`;
        }
      } else message.textContent = `当前浏览器不支持自动锁定横屏。${manual}`;
    });
  }

  message.textContent = canLock() ? '点击下方按钮进入横屏。也可以直接将手机横置。' : `当前浏览器不支持自动锁定横屏。${manual}`;
  start.addEventListener('click', landscape);
  gate.addEventListener('cancel', event => event.preventDefault());
  portrait.addEventListener('change', sync);
  touch.addEventListener('change', sync);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-display-mode]')) {
      if (document.fullscreenElement) {
        changeDisplay(() => document.exitFullscreen()).catch(() => {
          const status = document.querySelector('#display-message');
          if (status) status.textContent = '未能退出全屏，请使用浏览器的退出全屏操作。';
        });
      } else {
        void landscape().then(() => {
          const status = document.querySelector('#display-message');
          if (status) status.textContent = message.textContent;
        });
      }
    }
  });
  sync();
  return {enterLandscape: () => touch.matches ? landscape() : Promise.resolve()};
}
