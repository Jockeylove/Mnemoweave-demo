import { createGame, transition, knownEvidence, actionStatus, restoreGame } from './engine.mjs';
import { agents, participants, evidence, actions, resolution, truth } from './case.mjs';
import { hallSpots } from './navigation.mjs';
import { rooms, roomImage } from './rooms-2d.mjs';
import { materialView } from './evidence-visuals.mjs';

const SAVE_KEY = 'mnemoweave.moonstone.2d.v1';
const $ = selector => document.querySelector(selector);
const panel = $('#panel');
const fresh = () => transition(createGame(), { type: 'start' });
let state = fresh(), room = 'hall', bootError = '', navigating = false, hasSave = false, toastTimer;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    const value = JSON.parse(saved);
    if (!Object.hasOwn(rooms, value.room)) throw new Error('存档中的地点无法识别。');
    state = restoreGame(value.state);
    room = value.room;
    hasSave = true;
  }
} catch (error) { bootError = `无法读取二维版进度：${error.message}`; }
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const knows = (actor, id) => knownEvidence(state, actor).includes(id);
const complete = id => state.completed.includes(id);
const playing = () => state.phase === 'playing';
const received = id => actions[id].produces.every(e => knows('captain', e));
const pending = actor => Object.keys(actions).filter(id => actions[id].agent !== 'captain' && (!actor || actions[id].agent === actor) && complete(id) && !received(id));
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state, room }));
    hasSave = true;
    $('#save-status').textContent = '固定剧情 · 进度已保存';
  } catch {
    $('#save-status').textContent = '保存失败 · 请勿刷新';
    notify('浏览器无法保存进度。本次调查仍可继续，但刷新会丢失新进度。');
  }
}
function commit(next) { state = next; persist(); render(); }
function send(command) { commit(transition(state, command)); }
function notify(text) {
  clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function close() { panel.close(); }
function show(content, mode) {
  $('#panel-body').innerHTML = content; panel.dataset.mode = mode;
  if (!panel.open) panel.showModal();
  $('#close').focus(); panel.scrollTop=0;
}
function choice(label, command, value = '', primary = false, disabled = false) {
  return `<button type="button" data-command="${command}" data-value="${value}" class="${primary ? 'primary' : ''}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}
function layout({ title, eyebrow, body, buttons, actor, spot, mode = 'detail' }) {
  const sourceRoom = spot ? actions[spot.action].location : room;
  const visual = actor ? `<img class="portrait-art" src="./${participants[actor].portrait}" alt="${participants[actor].name}">`
    : `<div class="detail-art" style="background-image:url('${roomImage(sourceRoom)}');background-position:${spot.crop[0]}% ${spot.crop[1]}%" role="img" aria-label="${spot.title}的场景局部特写"></div>`;
  show(`<div class="panel-layout ${actor ? 'dialogue' : ''}">${visual}<section class="copy"><span class="small">${eyebrow}</span><h2 id="panel-title">${title}</h2>${body}<div class="choices">${buttons}</div></section></div>`, mode);
}
function record(id) {
  const item = evidence[id];
  return `<div class="record"><small>${item.time} · ${item.label}</small><p>${item.text}</p></div>`;
}
function report(id) {
  const action = actions[id], actor = participants[action.agent];
  // Display only materials already communicated to the player, including related scene records.
  const related = ['inspect','footage'].includes(id) ? ['E01','E02'] : action.produces;
  const ids = related.filter(e => knows('captain',e));
  show(`<section class="journal report-panel"><span class="small">${rooms[action.location].name} / 调查记录</span><h2 id="panel-title">${action.name}</h2>${materialView(ids)}<div class="report-speaker">${action.agent === 'captain' ? '' : `<img src="./${actor.portrait}" alt="${actor.name}">`}<div><span class="small">${actor.name} · ${actor.role}</span><p>“${action.report}”</p></div></div><details class="full-record"><summary>展开完整文字记录 · ${action.produces.length} 份</summary><div class="report-records">${action.produces.filter(e=>knows('captain',e)).map(record).join('')}</div></details><div class="choices">${choice('在手记中传递材料','journal','',true)}${action.agent === 'captain' ? '' : choice('继续交流','talk',action.agent)}${action.repeat && playing() ? choice('重新调取 · 1 次行动','investigate',id,false,!actionStatus(state,id).allowed) : ''}${choice('回到现场','close')}</div></section>`,`report:${id}`);
}
function spotFor(action) { return rooms[actions[action].location].hotspots.find(spot => spot.action === action); }
function detail(id, spotId) {
  const action = actions[id];
  const spot = spotId ? rooms[action.location].hotspots.find(item=>item.id===spotId) : spotFor(id);
  const status = actionStatus(state,id), done = complete(id);
  if (done && received(id)) { report(id); return; }
  let body = `<p>${spot.text}</p>`, buttons = '';
  if (done) {
      body = `<p>${participants[action.agent].name}已完成这项调查。具体发现还没有向你汇报。</p><p class="muted">与队员交流后，材料才会进入你的手记。</p>`;
      buttons += choice('听取调查汇报', 'receive', id, true, !playing());
  }
  if ((!done || action.repeat) && playing()) {
    body += `<p class="muted">${status.allowed ? `由${participants[action.agent].name}调查 · 消耗 1 次行动${state.remaining === 1 ? '。这会耗尽行动，无法再提交结案。' : ''}` : status.reason}</p>`;
    buttons += choice(action.name + ' · 1 次行动', 'investigate', id, !done, !status.allowed);
    if (!status.allowed && !done) buttons += choice('打开手记传递线索', 'journal');
  }
  if (!playing()) body += '<p class="muted">本轮调查已结束，可查看手记或结案结果。</p>';
  buttons += choice('回到现场', 'close');
  layout({ title: spot.title, eyebrow: `${rooms[action.location].name} / ${participants[action.agent].role}`, body, buttons, spot, mode: `detail:${id}` });
}
function investigate(id) {
  let next = state;
  if (!actionStatus(next,id).allowed) throw new Error(actionStatus(next,id).reason);
  if (id === 'footage') next = transition(next,{type:'move',actor:'ajing',point:[...hallSpots.footage]});
  next = transition(next,{type:'investigate',action:id}); commit(next);
  if (!playing()) { ending(); return; }
  if (actions[id].agent === 'captain') { detail(id); notify('已记下展柜开启记录 · 可在手记中告诉队员'); }
  else { close(); notify(`${participants[actions[id].agent].name}已完成调查 · 点击队员听取汇报`); }
}
function receive(id) {
  send({type:'receive-report',action:id});
  report(id);
  notify('已听取汇报 · 材料加入你的手记');
}
function sharedThought(actor) {
  // A comment may only combine facts both the speaker and the player know.
  const shared = id => knows(actor,id) && knows('captain',id), lines = [];
  if (shared('E01') && shared('E03')) lines.push('“开柜时，通行卡还在林舟的借用时段内。登记人和实际拿卡的人，确实不同。”');
  else if (shared('E01') && shared('E02')) lines.push('“20:10 开柜，20:12 箱子经过走廊。时间接得上，录像却看不清人脸，还要核对实际使用人。”');
  if (shared('E04') && shared('E07')) lines.push('“申请存在过，但案发前就已经撤销。不能把曾经提出申请，当作当时已经获得授权。”');
  if (shared('E08')) lines.push('“物品已经找回。还要把是谁取走、当时有无授权分别核实。”');
  return lines.length ? lines.map(text=>`<p>${text}</p>`).join('') : `<p>“${agents[actor].bio}”</p><p>把你查到的材料告诉我，我们再对一对。</p>`;
}
function talk(actor = rooms[room].companion) {
  const waiting = pending(actor);
  const reports = Object.keys(actions).filter(id=>actions[id].agent === actor && complete(id) && received(id));
  let body = sharedThought(actor);
  if (waiting.length) body += `<p class="muted">有 ${waiting.length} 项调查尚未向你汇报。</p>`;
  let buttons = waiting.map(id=>choice(`听取：${actions[id].name}`,'receive',id,true,!playing())).join('');
  buttons += reports.map(id=>choice(`重看：${actions[id].name}`,'detail',id)).join('');
  const available = [...new Set(rooms[room].hotspots.map(s=>s.action).filter(Boolean))].filter(id=>actions[id].agent === actor && !complete(id));
  if (playing()) buttons += available.map(id=>choice(actions[id].name,'detail',id)).join('');
  buttons += choice('传递我的材料','journal') + choice('回到现场','close');
  layout({title:agents[actor].name,eyebrow:`队员交流 / ${agents[actor].role}`,actor,body,buttons,mode:`talk:${actor}`});
}
function journal() {
  const ids = knownEvidence(state,'captain');
  const articles = ids.map(id=>{
    const item=evidence[id], recipients=Object.keys(agents).filter(actor=>knows(actor,id)).map(actor=>agents[actor].name);
    return `<article data-evidence="${id}"><span class="small">${item.label}</span><h3>${item.title}</h3><p>${item.text}</p>${choice("查看材料图示","material",id)}<div class="source">${item.source} · ${item.time}</div><p class="source">${state.public.includes(id) ? '已放入公共证据板 · 全队知晓' : recipients.length ? `你与${recipients.join('、')}知晓` : '目前只有你记录了这份材料'}</p>${playing() ? `<div class="evidence-share">${Object.keys(agents).filter(actor=>!knows(actor,id)).map(actor=>choice(`告诉${agents[actor].name}`,'share',`${id}:${actor}`)).join('')}${!state.public.includes(id) ? choice('放入公共证据板','share',`${id}:all`,true) : ''}</div>` : ''}</article>`;
  }).join('');
  show(`<section class="journal"><span class="small">月光石 / 现场笔记</span><h2 id="panel-title">调查手记 <span class="small">${ids.length} 份材料 · 公共 ${state.public.length} 份</span></h2><p class="source">先听取队员汇报，再决定告诉谁。结案只引用已放入公共证据板的材料。</p>${ids.length ? `<div class="journal-grid">${articles}</div>` : '<p class="empty">纸页还是空的。先调查现场，或听取队员的发现。</p>'}<div class="choices">${choice('联系队员','team')}${choice('整理结案','conclude','',true)}${choice('回到现场','close')}</div></section>`,'journal');
}
function material(id) {
  if (!knows('captain',id)) return;
  show(`<section class="journal report-panel"><span class="small">调查手记 / 已取得材料</span><h2 id="panel-title">${evidence[id].title}</h2>${materialView([id])}${record(id)}<div class="choices">${choice('返回手记','journal','',true)}${choice('回到现场','close')}</div></section>`,`material:${id}`);
}
function team() {
  const cards=Object.entries(agents).map(([id,a])=>`<article class="team-card"><img src="./${a.portrait}" alt="${a.name}"><div><span class="small">${a.role}</span><h3>${a.name}</h3><p>${pending(id).length ? `${pending(id).length} 项调查等待汇报` : '可以交流已取得的材料'}</p>${choice('与队员交流','talk',id)}</div></article>`).join('');
  show(`<section class="journal"><span class="small">各自的记忆 / 共同的真相</span><h2 id="panel-title">联系队员</h2><div class="team-grid">${cards}</div><div class="journal-summary"><p>听取个人汇报和传递材料免费。召开案情会消耗 1 次行动，所有队员会公开当前材料并对照讨论。${state.remaining === 1 ? '当前仅剩 1 次行动，召开后无法再结案。' : ''}</p><div class="choices">${choice('召开案情会 · 1 次行动','meeting','',false,!playing() || !Object.values(state.memories).some(ids=>ids.length))}${choice('回到现场','close')}</div></div></section>`,'team');
}
function meeting() {
  send({type:'meeting'});
  if (!playing()) { ending(); return; }
  const briefings=state.events.filter(e=>e.type==='briefing').slice(-3);
  show(`<section class="journal"><span class="small">案情会 / 已向全队公开材料</span><h2 id="panel-title">把各自的发现拼在一起</h2>${briefings.map(event=>`<article><h3>${agents[event.actor].name}</h3><p>${event.text}</p></article>`).join('')}<div class="choices">${choice('查看公共材料','journal','',true)}${choice('回到现场','close')}</div></section>`,'meeting');
}
function map() {
  const cards=Object.entries(rooms).map(([id,r])=>{
    const ids=[...new Set(r.hotspots.filter(s=>s.action && !actions[s.action].repeat).map(s=>s.action))];
    return `<button class="location-card ${room === id ? 'current' : ''}" data-command="travel" data-value="${id}" ${room === id ? 'aria-current="location"' : ''}><img src="${roomImage(id)}" alt="${r.name}全景"><span><small>${r.area} ${room === id ? '· 当前位置' : ''}</small><strong>${r.name}</strong><em>${ids.filter(complete).length} / ${ids.length} 项调查完成</em></span></button>`;
  }).join('');
  show(`<section class="journal map-panel"><span class="small">雨夜山庄 / 地点</span><h2 id="panel-title">去哪里继续调查？</h2><p class="source">五处地点均可进入。切换地点不消耗行动，调查发现仍需队员交流后才能获得。</p><div class="location-grid">${cards}</div><div class="choices">${choice('回到现场','close')}</div></section>`,'map');
}
async function travel(id) {
  if (navigating) return;
  if (id === room) { close(); return; }
  navigating=true;
  try {
    const image=new Image(), portrait=new Image();
    image.src=roomImage(id); portrait.src=`./${agents[rooms[id].companion].portrait}`;
    await Promise.all([image.decode(),portrait.decode()]);
    room=id; persist(); close(); render();
    $('.room-art').getAnimations().forEach(animation=>animation.cancel());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $('.room-art').animate([{opacity:0,transform:'scale(1.035)'},{opacity:1,transform:'scale(1.015)'}],{duration:650,easing:'ease-out'});
  } catch { notify('场景图片加载失败，请稍后重试。'); }
  finally { navigating=false; }
}
function conclude() {
  if (!playing()) { ending(); return; }
  const citations=state.public.map(id=>`<label class="citation"><input type="checkbox" name="citation" value="${id}"><span>${evidence[id].title}</span></label>`).join('');
  show(`<section class="journal"><span class="small">结案 / 判断与依据</span><h2 id="panel-title">让结论有据可循</h2><p class="source">提交消耗 1 次行动。请选择三项判断，并勾选支持它们的公共材料。</p><form id="conclusion-form"><div class="answer-grid">${resolution.map(rule=>`<label>${rule.title}<select name="${rule.key}" required><option value="">请选择</option>${rule.options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label>`).join('')}</div><fieldset><legend>引用公共证据</legend><div class="citation-grid">${citations || '<p class="empty">还没有公共材料。请先在手记中把证据放入公共证据板。</p>'}</div></fieldset><div class="choices"><button type="submit" class="primary" ${!state.public.length ? 'disabled' : ''}>提交结案 · 1 次行动</button>${choice('去整理材料','journal')}${choice('回到现场','close')}</div></form></section>`,'conclude');
}
function judgment() {
  const rows=state.judgment.map(item=>`<article><h3>${item.passed ? '✓' : '○'} ${item.title}</h3><p>${item.feedback}</p></article>`).join('');
  show(`<section class="journal"><span class="small">判断复核</span><h2 id="panel-title">还有需要补齐的依据</h2>${rows}<p class="source">剩余 ${state.remaining} 次行动。你可以继续调查、交换材料，再提交判断。</p><div class="choices">${choice('继续调查','close','',true)}${choice('查看手记','journal')}</div></section>`,'judgment');
}
function ending() {
  const solved=state.phase === 'solved';
  show(`<section class="journal ending-panel"><span class="small">${solved ? '案件解决 / 复盘' : '行动耗尽 / 调查未完成'}</span><h2 id="panel-title">${solved ? '各自的记忆，终于拼合。' : '线索还没有接成完整的答案。'}</h2><p>${solved ? '人物、物品位置与授权状态，都有公共证据支持。' : '调查已结束。可以回看你已掌握的材料，或重新开始；下一轮记得留一次行动提交结案。'}</p>${state.judgment ? state.judgment.map(item=>`<p class="result-line">${item.passed ? '✓' : '○'} ${item.title} · ${item.feedback}</p>`).join('') : ''}${solved ? `<ol class="truth-timeline">${truth.map(([time,text])=>`<li><time>${time}</time><span>${text}</span></li>`).join('')}</ol>` : ''}<div class="choices">${choice('查看调查手记','journal')}${choice('重新开始','restart','',true)}${choice('回看现场','close')}</div></section>`,'ending');
}
function restart() {
  show(`<section class="journal"><span class="small">新的调查</span><h2 id="panel-title">重新开始这个案件？</h2><p>将清空本轮调查进度，返回最初的标题界面。点击「开始调查」后再进入展厅。</p><div class="choices">${choice('重新开始','reset','',true)}${choice('保留当前调查','close')}</div></section>`,'restart');
}
function titleScreen() {
  $('#title-screen').hidden=false; $('#play-ui').hidden=true;
  $('#enter-game').textContent=hasSave ? playing() ? '继续调查' : '查看本轮复盘' : '开始调查';
  $('#menu-restart').hidden=!hasSave;
  $('#resume-status').textContent=hasSave ? `已保存 · ${rooms[room].name} · ${knownEvidence(state,'captain').length} 份材料 · 剩余 ${state.remaining} 次行动` : '进度自动保存在当前浏览器';
  $('#enter-game').focus();
}
function enter() {
  $('#title-screen').hidden=true; $('#play-ui').hidden=false;
  if (!hasSave) persist();
  render(); $('#map').focus();
  if (!playing()) ending();
}
function guide() {
  show(`<section class="journal"><span class="small">调查指南</span><h2 id="panel-title">听见彼此，才能接近真相。</h2><p>你是调查队长。点击场景中的标记观察物件，或让搭档展开调查；通过「山庄地点」前往其他房间。</p><p>队员的发现先留在各自的记忆里。听取汇报后，材料才进入你的手记；你可以单独告诉某位队员，也可以放入公共证据板让全队知晓。</p><p>共有 8 次行动。调查、案情会和提交结案各消耗 1 次；切换地点、听取汇报与传递材料免费。记得留 1 次行动结案。</p><p>结案时，选择人物、物品位置和授权状态，并引用公共证据支持判断。</p><div class="choices">${choice('明白了','close','',true)}</div></section>`,'guide');
}
function reset() {
  // Remove the saved run before changing the UI; a new run is saved only on Start.
  try { localStorage.removeItem(SAVE_KEY); }
  catch { notify('无法清除浏览器中的进度，本轮调查尚未重置。'); return; }
  bootError=''; state=fresh(); room='hall'; hasSave=false;
  clearTimeout(toastTimer); $('#toast').classList.remove('visible'); $('#toast').textContent='';
  $('#game').classList.remove('hide-hints');
  $('#hints').setAttribute('aria-pressed','true'); $('#hints').textContent='调查标记 开';
  $('#save-status').textContent='固定剧情 · 自动保存';
  $('.room-art').getAnimations().forEach(animation=>animation.cancel());
  $('#close').hidden=false; close(); render(); titleScreen();
}
function render() {
  const current=rooms[room], actor=current.companion;
  $('#game').dataset.room=room; $('.room-art img').src=roomImage(room);
  $('.chapter h1').textContent=`雨夜 · ${current.name}`; $('.chapter p').textContent=`${current.area} / 雨仍未停`;
  const [left,top,width,height]=current.rain;
  Object.assign($('.window-rain').style,{left:`${left}%`,top:`${top}%`,width:`${width}%`,height:`${height}%`});
  Object.assign($('.lamplight').style,{left:`${current.lamp[0]}%`,top:`${current.lamp[1]}%`});
  $('.hotspots').innerHTML=current.hotspots.map(spot=>{
    const done=spot.action && complete(spot.action);
    const subtitle=spot.destination ? '前往此处' : done ? received(spot.action) ? '已记录 · 可重看' : '已调查 · 待汇报' : actions[spot.action].agent === 'captain' ? '亲自调查' : `交给${participants[actions[spot.action].agent].name}`;
    return `<button class="hotspot ${done ? 'done' : ''}" id="${spot.id}" style="--x:${spot.x}%;--y:${spot.y}%" data-command="${spot.destination ? 'travel' : 'detail'}" data-value="${spot.destination || spot.action}" data-spot="${spot.id}" aria-label="${spot.title}"><i>${spot.destination ? '↑' : '◇'}</i><span>${spot.title}<small>${subtitle}</small></span></button>`;
  }).join('');
  $('#talk img').src=`./${agents[actor].portrait}`; $('#talk img').alt=agents[actor].name;
  $('#talk strong').textContent=agents[actor].name; $('#talk small').textContent=agents[actor].role;
  $('#partner-state').textContent=pending(actor).length ? `${pending(actor).length} 项发现 · 等待汇报` : '交流、对照与传递发现';
  $('#count').textContent=knownEvidence(state,'captain').length; $('#pending-count').textContent=pending().length;
  $('#objective').textContent=!playing() ? state.phase === 'solved' ? '案件已解决。可查看结案复盘。' : '行动已耗尽。可回看本轮调查。' : pending().length ? '有队员带回了发现。点击「联系队员」听取汇报。' : current.mood;
  $('#action-budget').textContent=`剩余 ${state.remaining} / 8 次行动`; $('#action-budget').classList.toggle('last-action',state.remaining === 1);
}
const commands={close,detail,investigate,receive,talk,journal,team,meeting,map,travel,conclude,restart,reset,enter,guide,material,
  share(value) {
    const [id,recipient]=value.split(':');
    send({type:'share',sender:'captain',recipient,evidence:[id]});
    journal(); notify(recipient === 'all' ? '材料已放入公共证据板 · 全队知晓' : `${agents[recipient].name}已收到这份材料`);
  }
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-command]');
  if (!button || button.disabled || navigating || (bootError && button.dataset.command !== 'reset')) return;
  try { commands[button.dataset.command](button.dataset.value,button.dataset.spot); } catch(error) { notify(error.message); }
});
$('#panel-body').addEventListener('submit',event=>{
  if (event.target.id !== 'conclusion-form') return;
  event.preventDefault(); const values=new FormData(event.target);
  try {
    send({type:'submit',answers:Object.fromEntries(resolution.map(rule=>[rule.key,values.get(rule.key)])),citations:values.getAll('citation')});
    if (playing()) judgment(); else ending();
  } catch(error) { notify(error.message); }
});
$('#talk').addEventListener('click',()=>talk());
for (const id of ['map','team','journal','conclude','restart']) $(`#${id}`).addEventListener('click',()=>commands[id]());
$('#close').addEventListener('click',close);
$('#hints').addEventListener('click',()=>{
  const hidden=$('#game').classList.toggle('hide-hints'); $('#hints').setAttribute('aria-pressed',String(!hidden)); $('#hints').textContent=`调查标记 ${hidden ? '关' : '开'}`;
});
panel.addEventListener('cancel',event=>{if(bootError)event.preventDefault();});
render();
if (bootError) {
  $('#close').hidden=true;
  show(`<section class="journal"><h2 id="panel-title">进度读取失败</h2><p>${escape(bootError)}</p><p>原存档尚未覆盖。可以关闭页面保留文件，或明确重新开始二维版。</p><div class="choices">${choice('重新开始二维版','reset','',true)}</div></section>`,'save-error');
} else titleScreen();
