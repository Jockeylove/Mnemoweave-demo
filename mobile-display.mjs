// Browser orientation is a capability, never inferred from an Android/iOS name.
export function setupMobileDisplay() {
  const touch = matchMedia('(any-pointer: coarse)');
  const portrait = matchMedia('(orientation: portrait)');
  const gate = document.querySelector('#orientation-gate');
  const start = document.querySelector('#landscape-start');
  const message = document.querySelector('#orientation-message');
  let busy = false;
  const canLock = () => typeof screen.orientation?.lock === 'function';
  const canFullscreen = () => Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const manual = '请把手机横过来；若画面没有转动，请先关闭系统的竖屏方向锁定。';

  function sync() {
    if (touch.matches && portrait.matches) {
      if (!gate.open) gate.showModal();
    } else if (gate.open) gate.close();
    start.disabled = busy;
    start.hidden = !canLock() && !canFullscreen();
    for (const button of document.querySelectorAll('[data-display-mode]')) {
      button.disabled = busy;
      button.textContent = document.fullscreenElement ? '退出全屏' : '横屏 / 全屏';
    }
  }

  async function landscape() {
    if (busy) return;
    busy = true;
    message.textContent = '正在进入横屏…';
    sync();
    try {
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
    } finally { busy = false; sync(); }
  }

  message.textContent = canLock() ? '点击下方按钮进入横屏。也可以直接将手机横置。' : `当前浏览器不支持自动锁定横屏。${manual}`;
  start.addEventListener('click', landscape);
  gate.addEventListener('cancel', event => event.preventDefault());
  portrait.addEventListener('change', sync);
  touch.addEventListener('change', sync);
  document.addEventListener('fullscreenchange', sync);
  // Capture keeps the original click's user activation, before game navigation.
  document.addEventListener('click', event => {
    if (event.target.closest('[data-display-mode]')) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          const status = document.querySelector('#display-message');
          if (status) status.textContent = '未能退出全屏，请使用浏览器的退出全屏操作。';
        });
      } else {
        void landscape().then(() => {
          const status = document.querySelector('#display-message');
          if (status) status.textContent = message.textContent;
        });
      }
    } else if (touch.matches && event.target.closest('#enter-game, #title-screen [data-command="toggleDemo"], #title-screen [data-command="opening"]')) {
      void landscape();
    }
  }, true);
  sync();
}
