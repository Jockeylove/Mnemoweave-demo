import { createGame, createDemoGame, transition, knownEvidence, actionStatus, restoreGame } from './engine.mjs';
import { agents, participants, evidence, actions, truth } from './case.mjs';
import { hallSpots } from './navigation.mjs';
import { rooms, roomImage } from './rooms-2d.mjs';
import { materialView } from './evidence-visuals.mjs';
import { openingPrelude, openingBeats, conversationEntry, conversationTopics, investigationLead, captainReflection, reportResponses } from './narrative.mjs';
import { councilEvidence, councilNode } from './council.mjs';
import { recapChapters, closingFrames } from './recap.mjs';
import { setupMobileDisplay } from './mobile-display.mjs?v=0.5.4';

const SAVE_KEY = 'mnemoweave.moonstone.2d.v1';
const $ = selector => document.querySelector(selector);
const panel = $('#panel');
const fresh = () => transition(createGame(), { type: 'start' });
let state = fresh(), room = 'hall', bootError = '', navigating = false, navigation = null, hasSave = false, toastTimer;
let conversationMemory = {}, demoReturn = null;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    const value = JSON.parse(saved);
    if (!Object.hasOwn(rooms, value.room)) throw new Error('存档中的地点无法识别。');
    state = restoreGame(value.state);
    room = value.room;
    conversationMemory = value.conversationMemory || {};
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
  if (demoReturn) { $('#save-status').textContent='演示模式 · 不写入存档'; return; }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state, room, conversationMemory }));
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
function close() { if (navigation) cancelTravel(); else panel.close(); }
function show(content, mode) {
  $('#panel-body').innerHTML = content; panel.dataset.mode = mode;
  if (!panel.open) panel.showModal();
  $('#close').focus(); panel.scrollTop=0;
}
function choice(label, command, value = '', primary = false, disabled = false) {
  return `<button type="button" data-command="${command}" data-value="${value}" class="${primary ? 'primary' : ''}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}
let dialogueSession=null;
function startDialogue({title,frames,buttons,partner,scene=room,mode,index=0}) {
  dialogueSession={title,frames,buttons,partner,scene,mode,index};
  drawDialogue();
}
function dialogueText(frame) {
  if(!frame.destination) return escape(frame.text);
  const label=rooms[frame.destination].name;
  return frame.text.split(label).map(escape).join(`<button class="vn-place" data-command="travel" data-value="${frame.destination}" title="前往${label}">${label} ↗</button>`);
}
function reflectionButtons(frame) {
  return frame.destination ? choice(`去${rooms[frame.destination].name}看看`,'travel',frame.destination,true) : choice('梳理下一步','progress','',true);
}
function drawDialogue() {
  const session=dialogueSession, frame=session.frames[session.index], last=session.index===session.frames.length-1;
  const speaker=frame.speaker || 'narrator', isThought=frame.kind==='thought';
  const person=participants[speaker];
  const name=frame.label || (isThought?'你 · 心中所想':speaker==='captain'?'你 · 队长':person?.name || (speaker==='narrator'?'旁白':speaker));
  const portrait=frame.portrait !== undefined ? frame.portrait : person ? speaker : session.partner;
  const active=(Boolean(person) && !isThought) || frame.kind==='introduction';
  const title=frame.title || session.title;
  const scene=frame.scene || session.scene;
  const buttons=last ? session.buttons : choice('继续 ▸','vnNext','',true);
  const isCouncil=session.mode==='council';
  const referenced=frame.refs || [];
  const exhibits=isCouncil && !last && referenced.length ? `<aside class="council-evidence" aria-label="本句出示的证据">${referenced.map(id=>`<article data-council-evidence="${id}"><small>${evidence[id].label} · ${evidence[id].time}</small><h3>${evidence[id].title}</h3><p>${evidence[id].text}</p><span>${participants[state.council.owners[id]].name}带来的材料 · 全队已听取</span></article>`).join('')}</aside>` : '';
  const audience=frame.to ? `对${frame.to==='captain'?'队长':participants[frame.to].name}说` : isCouncil ? '向全队发言' : null;
  show(`<section class="vn-stage" data-speaker="${speaker}" data-kind="${frame.kind || 'speech'}" style="--vn-background:url('${roomImage(scene)}')"><header class="vn-heading"><span>${rooms[scene].name} / ${title}</span><span>${session.index+1} / ${session.frames.length}</span></header>${portrait ? `<img class="vn-character ${active?'speaking':'listening'} ${portrait==='captain'?'captain':''}" src="./${participants[portrait].portrait}" alt="${participants[portrait].name}">` : ''}${exhibits}${last ? `<aside class="vn-decisions" aria-label="对话选择">${buttons}</aside>` : ''}<section class="vn-textbox"><div class="vn-name">${name}<small>${audience || (isThought?'内心独白':frame.kind==='introduction'?'人物介绍':speaker==='narrator'?'':'交谈')}</small></div><div class="vn-line" aria-live="polite" ${!last?'data-command="vnNext"':''}><h2 id="panel-title" class="vn-sr">${title}</h2><p>${dialogueText(frame)}</p></div><nav class="vn-controls" aria-label="对话控制">${choice('上一句','vnPrevious','',false,session.index===0)}<span>${last?'选择下一步，或返回现场':'点击文字 / 空格 / → 继续'}</span>${!last?buttons:''}${choice(isCouncil ? '暂停讨论' : session.mode==='opening' ? '跳过序章' : '离开交谈','close')}</nav></section></section>`,session.mode);
  if(!last) $('#panel button[data-command=vnNext]').focus({preventScroll:true});
  else { const line=$('#panel .vn-line');line.tabIndex=-1;line.focus({preventScroll:true}); }
  // Remember only the line actually displayed, not later lines in this session.
  if(frame.remember && !(conversationMemory[frame.remember] || []).includes(frame.text)) {
    (conversationMemory[frame.remember] ||= []).push(frame.text);
    persist();
  }
}
function vnNext() {
  if(!dialogueSession || !panel.querySelector('.vn-stage') || dialogueSession.index>=dialogueSession.frames.length-1)return;
  if(dialogueSession.mode==='council') { send({type:'council-next'});renderCouncil();return; }
  dialogueSession.index++;drawDialogue();
}
function vnPrevious() {
  if(!dialogueSession || !panel.querySelector('.vn-stage') || dialogueSession.index===0)return;
  if(dialogueSession.mode==='council') { send({type:'council-previous'});renderCouncil();return; }
  dialogueSession.index--;drawDialogue();
}
function opening() {
  const inGame=!$('#play-ui').hidden;
  const speakers={'阿镜':'ajing','闻声':'wensheng','取教授':'shuheng','你':'captain'};
  const frames=[...openingPrelude, ...openingBeats.flatMap(beat=>[
    {speaker:'narrator',text:beat.text,scene:beat.scene},
    ...beat.lines.map(([name,text])=>({speaker:speakers[name] || name,text,scene:beat.scene})),
    {speaker:'captain',kind:'thought',text:beat.question,scene:beat.scene}
  ])];
  const buttons=inGame?choice('我先检查展柜','detail','inspect',true)+choice('先和阿镜商量','talk','ajing')+choice('进入现场','close'):choice('返回标题','close','',true);
  startDialogue({title:'雨夜序章',frames,buttons,partner:'ajing',scene:'hall',mode:'opening'});
}
function topicOptions(actor) {
  return conversationTopics(state,actor).map(t=>choice(t.label,'topic',actor+':'+t.id)).join('');
}
function topic(value) {
  const [actor,id,answer]=value.split(':');
  const entry=conversationTopics(state,actor).find(t=>t.id===id);
  if(!entry)return;
  const follow=answer===undefined?null:entry.followups[Number(answer)];
  if(answer!==undefined && !follow)return;
  const reflection=captainReflection(state,actor,id,answer);
  const frames=follow ? [
    {speaker:'captain',text:follow[0]}, {speaker:actor,text:follow[1]}, reflection
  ] : [
    {speaker:'narrator',text:entry.gesture}, {speaker:'captain',text:entry.label}, {speaker:actor,text:entry.line}
  ];
  let buttons=follow ? reflectionButtons(reflection) : '';
  buttons+=entry.followups.map(([label],index)=>choice(label,'topic',actor+':'+id+':'+index,false,String(index)===answer)).join('');
  buttons+=choice('聊其他问题','talk',actor)+choice('梳理下一步','progress')+choice('回到现场','close');
  startDialogue({title:entry.label,frames,buttons,partner:actor,mode:'topic:'+actor+':'+id});
}
function reportConversation(id) {
  const action=actions[id], reflection=captainReflection(state,action.agent);
  const frames=[
    {speaker:action.agent,text:action.report},
    {speaker:'captain',kind:action.agent==='captain'?'thought':'speech',text:reportResponses[id]},
    reflection
  ];
  startDialogue({title:action.name,frames,partner:action.agent,scene:action.location,mode:'report-dialogue:'+id,
    buttons:reflectionButtons(reflection)+choice('查看调查记录与图示','report',id)+choice('打开调查手记','journal')+choice('回到现场','close')});
}

function progress() {
  const lead=investigationLead(state);
  show(`<section class="journal"><span class="small">案情进展 / 你已掌握的线索</span><h2 id="panel-title">${lead.title}</h2><p>${lead.text}</p><p class="source">这是当前可追查的方向。你也可以自由探索其他地点，或先与队员讨论。</p><div class="choices">${choice(lead.label,'pursueLead','',true)}${choice('联系队员','team')}${choice('查看地点','map')}${choice('回到现场','close')}</div></section>`,'progress');
}
async function pursueLead() {
  const lead=investigationLead(state);
  if(lead.command==='detail') {
    const destination=actions[lead.value].location;
    await travel(destination);
    if(room!==destination) return;
  }
  commands[lead.command](lead.value);
}
function epilogue() {
  if (state.phase!=='solved') return;
  startDialogue({title:'尾声 · 灯还亮着',frames:closingFrames,partner:null,scene:'duty',mode:'epilogue',
    buttons:choice('回看这个夜晚','ending','',true)+choice('翻看调查手记','journal')+(demoReturn?choice('退出演示，返回原进度','exitDemo'):choice('重新开始','restart'))+choice('回看现场','close')});
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
  show(`<section class="journal report-panel"><span class="small">${rooms[action.location].name} / 调查记录</span><h2 id="panel-title">${action.name}</h2>${materialView(ids)}<div class="report-speaker"><span class="report-avatar painted"><img src="./${actor.portrait}" alt="${actor.name}"></span><div><span class="small">${actor.name} · ${actor.role}</span><p>“${action.report}”</p></div></div><details class="full-record"><summary>展开完整文字记录 · ${action.produces.length} 份</summary><div class="report-records">${action.produces.filter(e=>knows('captain',e)).map(record).join('')}</div></details><div class="choices">${choice('梳理下一步','progress','',true)}${choice('在手记中传递材料','journal')}${action.agent === 'captain' ? '' : choice('继续交流','talk',action.agent)}${action.repeat && playing() ? choice('重新调取 · 1 次行动','investigate',id,false,!actionStatus(state,id).allowed) : ''}${choice('回到现场','close')}</div></section>`,`report:${id}`);
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
  if (!playing()) body += '<p class="muted">这轮调查已经结束。手记和复盘都可以重看。</p>';
  buttons += choice('回到现场', 'close');
  layout({ title: spot.title, eyebrow: `${rooms[action.location].name} / ${participants[action.agent].role}`, body, buttons, spot, mode: `detail:${id}` });
}
function investigate(id) {
  let next = state;
  if (!actionStatus(next,id).allowed) throw new Error(actionStatus(next,id).reason);
  if (id === 'footage') next = transition(next,{type:'move',actor:'ajing',point:[...hallSpots.footage]});
  next = transition(next,{type:'investigate',action:id}); commit(next);
  if (!playing()) { ending(); return; }
  if (actions[id].agent === 'captain') { reportConversation(id); notify('已记下展柜开启记录 · 可在手记中告诉队员'); }
  else { close(); notify(`${participants[actions[id].agent].name}已完成调查 · 点击队员听取汇报`); }
}
function receive(id) {
  send({type:'receive-report',action:id});
  reportConversation(id);
  notify('已听取汇报 · 材料加入你的手记');
}
function talk(actor = rooms[room].companion) {
  const waiting = pending(actor);
  const reports = Object.keys(actions).filter(id=>actions[id].agent === actor && complete(id) && received(id));
  let buttons = waiting.map(id=>choice(`听取：${actions[id].name}`,'receive',id,true,!playing())).join('');
  buttons += reports.map(id=>choice(`重看：${actions[id].name}`,'detail',id)).join('');
  const available = [...new Set(rooms[room].hotspots.map(s=>s.action).filter(Boolean))].filter(id=>actions[id].agent === actor && !complete(id));
  if (playing()) buttons += available.map(id=>choice(actions[id].name,'detail',id)).join('');
  buttons += choice('传递我的材料','journal') + choice('回到现场','close');
  buttons=topicOptions(actor)+buttons;
  const reflection=captainReflection(state,actor);
  const resume=panel.open && panel.dataset.mode.startsWith('topic:'+actor+':');
  const frames=conversationEntry(state,actor,conversationMemory[actor] || [],resume);
  startDialogue({title:'与'+agents[actor].name+'交谈',frames,buttons:reflectionButtons(reflection)+buttons,partner:actor,mode:'talk:'+actor});
}
function journal() {
  const ids = knownEvidence(state,'captain');
  const articles = ids.map(id=>{
    const item=evidence[id], recipients=Object.keys(agents).filter(actor=>knows(actor,id)).map(actor=>agents[actor].name);
    return `<article data-evidence="${id}"><span class="small">${item.label}</span><h3>${item.title}</h3><p>${item.text}</p>${choice("查看材料图示","material",id)}<div class="source">${item.source} · ${item.time}</div><p class="source">${state.public.includes(id) ? '已放入公共证据板 · 全队知晓' : recipients.length ? `你与${recipients.join('、')}知晓` : '目前只有你记录了这份材料'}</p>${playing() ? `<div class="evidence-share">${Object.keys(agents).filter(actor=>!knows(actor,id)).map(actor=>choice(`告诉${agents[actor].name}`,'share',`${id}:${actor}`)).join('')}${!state.public.includes(id) ? choice('放入公共证据板','share',`${id}:all`,true) : ''}</div>` : ''}</article>`;
  }).join('');
  show(`<section class="journal"><span class="small">月光石 / 现场笔记</span><h2 id="panel-title">调查手记 <span class="small">${ids.length} 份材料 · 公共 ${state.public.length} 份</span></h2><p class="source">这里收着你亲眼见过、听队员说过的材料。可以单独告诉某位队员，也可以让全队知道。</p>${ids.length ? `<div class="journal-grid">${articles}</div>` : '<p class="empty">纸页还是空的。先调查现场，或听取队员的发现。</p>'}<div class="choices">${choice('联系队员','team')}${state.phase==='solved'?choice('回到故事复盘','recapPage',recapIndex,true):choice('召集讨论','conclude','',true)}${choice('回到现场','close')}</div></section>`,'journal');
}
function material(id) {
  if (!knows('captain',id)) return;
  show(`<section class="journal report-panel"><span class="small">调查手记 / 已取得材料</span><h2 id="panel-title">${evidence[id].title}</h2>${materialView([id])}${record(id)}<div class="choices">${choice('返回手记','journal','',true)}${choice('回到现场','close')}</div></section>`,`material:${id}`);
}
function team() {
  const cards=Object.entries(agents).map(([id,a])=>`<article class="team-card"><img src="./${a.portrait}" alt="${a.name}"><div><span class="small">${a.role}</span><h3>${a.name}</h3><p>${a.profile}</p><p>${pending(id).length ? `${pending(id).length} 项调查等待汇报` : '可以交流已取得的材料'}</p>${choice('与队员交流','talk',id)}</div></article>`).join('');
  show(`<section class="journal"><span class="small">各自的记忆 / 共同的真相</span><h2 id="panel-title">联系队员</h2><div class="team-grid">${cards}</div><div class="journal-summary"><p>召集队员，逐份出示材料并相互追问。讨论免费；听完证据后，由队长选择最终人选，确认结案消耗 1 次行动。${state.remaining === 1 ? '剩余 1 次行动，足够在讨论后确认结案。' : ''}</p><div class="choices">${choice('召集小队讨论 · 免费','meeting','',false,!playing() || !Object.values(state.memories).some(ids=>ids.length))}${choice('回到现场','close')}</div></div></section>`,'team');
}
function meeting() {
  if (!playing()) { ending(); return; }
  if(!councilEvidence(state).length) {
    show(`<section class="journal"><span class="small">小队讨论</span><h2 id="panel-title">先查点东西再碰头</h2><p>目前还没有调查材料。检查展柜，或请队员调查一处，再召集大家讨论。等材料带回来，再听听大家的看法。</p><div class="choices">${choice('先检查展柜','detail','inspect',true)}${choice('回到现场','close')}</div></section>`,'meeting-empty');
    return;
  }
  send({type:'council-start'});renderCouncil();
}
function renderCouncil() {
  const node=councilNode(state.council);
  const buttons=node.choices.map(option=>choice(option.label,'councilChoice',option.id,option.id==='confirm')).join('');
  startDialogue({title:`${demoReturn?'演示讨论':'小队讨论'} · ${node.title}`,frames:node.frames,buttons,partner:null,scene:'duty',mode:'council',index:state.council.index});
}
function councilChoice(value) {
  send({type:'council-choice',choice:value});
  if(!playing()) {ending();return;}
  if(!state.council.active) {
    if(value==='confirm')judgment();else {close();notify('先继续调查，之后可以再召集大家。');}
    return;
  }
  renderCouncil();
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
  const image=new Image(), portrait=new Image(), request={image,portrait};
  navigation=request;
  navigating=true;
  show(`<section class="journal"><span class="small">切换地点</span><h2 id="panel-title">正在前往${rooms[id].name}</h2><p role="status">正在加载场景与同行队员，加载完成后进入。切换地点不消耗行动。</p><div class="choices">${choice('留在当前地点','cancelTravel')}</div></section>`, 'travel-loading');
  try {
    image.src=roomImage(id); portrait.src=`./${agents[rooms[id].companion].portrait}`;
    await Promise.all([image.decode(),portrait.decode()]);
  } catch {
    if (navigation!==request) return;
    navigation=null; navigating=false;
    show(`<section class="journal"><span class="small">切换地点未完成</span><h2 id="panel-title">暂时无法进入${rooms[id].name}</h2><p>场景图片未能加载。你仍在${rooms[room].name}，调查进度未变；可以重试或继续在这里调查。</p><div class="choices">${choice('重新加载','travel',id,true)}${choice('留在当前地点','close')}</div></section>`, 'travel-error');
    return;
  }
  if (navigation!==request) return;
  navigation=null; navigating=false;
  room=id; persist(); close(); render();
  $('.room-art').getAnimations().forEach(animation=>animation.cancel());
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $('.room-art').animate([{opacity:0,transform:'scale(1.035)'},{opacity:1,transform:'scale(1.015)'}],{duration:650,easing:'ease-out'});
}
function cancelTravel() {
  if (!navigation) return;
  const request=navigation;
  navigation=null; navigating=false;
  request.image.removeAttribute('src'); request.portrait.removeAttribute('src');
  panel.close();
}
function conclude() {
  meeting();
}
function judgment() {
  const rows=state.judgment.map(item=>`<article><h3>${item.passed ? '✓' : '○'} ${item.title}</h3><p>${item.feedback}</p></article>`).join('');
  show(`<section class="journal"><span class="small">判断复核</span><h2 id="panel-title">这件事还没说通</h2>${rows}<p class="source">剩余 ${state.remaining} 次行动。你可以继续调查、交换材料，再提交判断。</p><div class="choices">${choice('继续调查','close','',true)}${choice('查看手记','journal')}</div></section>`,'judgment');
}
let recapIndex=0;
function recapPage(value=recapIndex) {
  if(state.phase!=='solved')return;
  const index=Number(value), chapter=recapChapters[index];
  if(!chapter)return;
  recapIndex=index;
  const last=index===recapChapters.length-1;
  show(`<section class="story-recap" data-chapter="${index}"><header class="recap-heading"><span>${demoReturn?'演示模式 · 原进度已保留':'案件已解决'} / 雨夜回望</span><span>忆织 · 雨夜山庄</span></header><div class="recap-spread"><figure class="recap-art"><img src="./${chapter.image}" alt="${escape(chapter.alt)}"><figcaption>雨夜回望 · ${index+1} / ${recapChapters.length}</figcaption></figure><article class="recap-copy" aria-live="polite"><span class="recap-time">${chapter.time}</span><h2 id="panel-title">${chapter.title}</h2>${chapter.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</article></div><footer class="recap-footer"><div class="recap-links">${choice('调查手记','journal')}${choice('核对时间线','caseFile')}${demoReturn?choice('退出演示，返回原进度','exitDemo'):choice('重新开始','restart')}</div><nav class="recap-navigation" aria-label="故事翻页">${choice('上一幕','recapPrevious','',false,index===0)}<span>${index+1} / ${recapChapters.length}</span>${choice(last?'尾声 · 灯还亮着':'下一幕 ▸','recapNext','',true)}</nav></footer></section>`,'ending');
  $('#panel [data-command=recapNext]').focus({preventScroll:true});
  if(!last) {const next=new Image();next.src='./'+recapChapters[index+1].image;}
}
function recapNext() { if(recapIndex<recapChapters.length-1)recapPage(recapIndex+1);else epilogue(); }
function recapPrevious() { if(recapIndex>0)recapPage(recapIndex-1); }
function caseFile() {
  if(state.phase!=='solved')return;
  show(`<section class="journal"><span class="small">调查手记 / 时间核对</span><h2 id="panel-title">当晚的时间线</h2><ol class="truth-timeline">${truth.map(([time,text])=>`<li><time>${time}</time><span>${text}</span></li>`).join('')}</ol><div class="choices">${choice('回到故事','recapPage',recapIndex,true)}${choice('调查手记','journal')}</div></section>`,'case-file');
}
function ending() {
  if(state.phase==='solved') {recapPage(0);return;}
  show(`<section class="journal ending-panel"><span class="small">${demoReturn?'演示模式 / 原进度已保留':'行动耗尽 / 调查未完成'}</span><h2 id="panel-title">时间到了，调查还没做完。</h2><p>你合上笔记本，几处疑点还没解开。可以回看手里的材料，或重新调查一遍；记得给最后的判断留一次行动。</p>${state.judgment?state.judgment.map(item=>`<p class="result-line">${item.passed?'✓':'○'} ${item.title} · ${item.feedback}</p>`).join(''):''}<div class="choices">${choice('查看调查手记','journal')}${demoReturn?choice('退出演示，返回原进度','exitDemo'):choice('重新开始','restart')}${choice('回看现场','close')}</div></section>`,'ending');
}
function restart() {
  if (demoReturn) { exitDemo(); return; }
  show(`<section class="journal"><span class="small">新的调查</span><h2 id="panel-title">重新开始这个案件？</h2><p>将清空本轮调查进度，返回最初的标题界面。点击「开始调查」后再进入展厅。</p><div class="choices">${choice('重新开始','reset','',true)}${choice('保留当前调查','close')}</div></section>`,'restart');
}
function toggleDemo() {
  if (demoReturn) { exitDemo(); return; }
  const completed = createDemoGame();
  demoReturn={state,room,conversationMemory,hasSave,onTitle:!$('#title-screen').hidden,saveStatus:$('#save-status').textContent};
  state=completed; room='hall'; conversationMemory={};
  $('#title-screen').hidden=true; $('#play-ui').hidden=false;
  clearTimeout(toastTimer); $('#toast').classList.remove('visible');
  render(); meeting();
}
function exitDemo() {
  const original=demoReturn;
  if(!original)return;
  ({state,room,conversationMemory,hasSave}=original);
  demoReturn=null; dialogueSession=null;
  close(); render(); $('#save-status').textContent=original.saveStatus;
  if(original.onTitle)titleScreen();
  else { $('#title-screen').hidden=true; $('#play-ui').hidden=false; $('#talk').focus(); }
}
function titleScreen() {
  $('#title-screen').hidden=false; $('#play-ui').hidden=true;
  $('#enter-game').textContent=hasSave ? playing() ? '继续调查' : '查看本轮复盘' : '开始调查';
  $('#menu-restart').hidden=!hasSave;
  $('#resume-status').textContent=hasSave ? `已保存 · ${rooms[room].name} · ${knownEvidence(state,'captain').length} 份材料 · 剩余 ${state.remaining} 次行动` : '进度自动保存在当前浏览器';
  $('#enter-game').focus();
}
function enter() {
  const starting=!hasSave;
  $('#title-screen').hidden=true; $('#play-ui').hidden=false;
  if (!hasSave) persist();
  render(); $('#map').focus();
  if (!playing()) ending();
  else if(state.council?.active)meeting();
  else if (starting) opening();
}
function guide() {
  show(`<section class="journal"><span class="small">调查指南</span><h2 id="panel-title">从哪里开始调查</h2><p>你是调查队长。点击场景中的标记观察物件，或让搭档展开调查；通过「山庄地点」前往其他房间。</p><p>队员的发现先留在各自的记忆里。听取汇报后，材料才进入你的手记；你可以单独告诉某位队员，也可以放入公共证据板让全队知晓。</p><p>共有 8 次行动。调查和确认结案各消耗 1 次；小队讨论、切换地点、听取汇报与传递材料免费。记得留 1 次行动结案。</p><p>结案前先召集大家。队员逐步出示材料、互相核对，队长可以选择追问；材料充分后再选择最终人选。地点、授权与引用依据从实际讨论中整理。</p><div class="choices">${choice('明白了','close','',true)}</div></section>`,'guide');
}
function mobileTools() {
  show(`<section class="journal"><span class="small">调查工具</span><h2 id="panel-title">游玩设置</h2><p>${escape($('#save-status').textContent)}</p><div class="choices"><button data-display-mode>${document.fullscreenElement?'退出全屏':'横屏 / 全屏'}</button>${choice($('#hints').textContent,'mobileHints')}${choice(demoReturn?'退出演示':'演示破案','toggleDemo')}${choice('调查指南','guide')}${choice('重新开始','restart','',false,Boolean(demoReturn))}${choice('返回现场','close')}</div><p id="display-message" role="status">手机请横屏游玩。自动锁定方向需要浏览器支持。</p><p>交流、传递与切换地点免费。记得留 1 次行动结案。</p></section>`, 'mobile-tools');
}
function reset() {
  // Remove the saved run before changing the UI; a new run is saved only on Start.
  try { localStorage.removeItem(SAVE_KEY); }
  catch { notify('无法清除浏览器中的进度，本轮调查尚未重置。'); return; }
  bootError=''; state=fresh(); room='hall'; hasSave=false; conversationMemory={};
  clearTimeout(toastTimer); $('#toast').classList.remove('visible'); $('#toast').textContent='';
  $('#game').classList.remove('hide-hints');
  $('#hints').setAttribute('aria-pressed','true'); $('#hints').textContent='调查标记 开';
  $('#save-status').textContent='固定剧情 · 自动保存';
  $('.room-art').getAnimations().forEach(animation=>animation.cancel());
  $('#close').hidden=false; close(); render(); titleScreen();
}
function render() {
  const current=rooms[room], actor=current.companion;
  $('#demo-action').textContent=demoReturn ? '退出演示' : '演示破案';
  $('#restart').disabled=Boolean(demoReturn);
  if(demoReturn)$('#save-status').textContent='演示模式 · 不写入存档';
  $('#game').dataset.room=room; $('.room-art img').src=roomImage(room);
  $('.chapter h1').textContent=`雨夜 · ${current.name}`; $('.chapter p').textContent=`${current.area} / 雨仍未停`;
  const [left,top,width,height]=current.rain;
  Object.assign($('.window-rain').style,{left:`${left}%`,top:`${top}%`,width:`${width}%`,height:`${height}%`});
  Object.assign($('.lamplight').style,{left:`${current.lamp[0]}%`,top:`${current.lamp[1]}%`});
  $('.hotspots').innerHTML=current.hotspots.map(spot=>{
    const done=spot.action && complete(spot.action);
    const subtitle=spot.destination ? '前往此处' : done ? received(spot.action) ? '已记录 · 可重看' : '已调查 · 待汇报' : actions[spot.action].agent === 'captain' ? '亲自调查' : `交给${participants[actions[spot.action].agent].name}`;
    return `<button class="hotspot ${done ? 'done' : ''}" id="${spot.id}" style="--x:${spot.x}%;--y:${spot.y}%" data-command="${spot.destination ? 'travel' : 'detail'}" data-value="${spot.destination || spot.action}" data-spot="${spot.id}" aria-label="${spot.title}，${subtitle}"><i>${spot.destination ? '↑' : '◇'}</i><span>${spot.title}<small>${subtitle}</small></span></button>`;
  }).join('');
  $('#talk').dataset.actor=actor; $('#talk img').src=`./${agents[actor].portrait}`; $('#talk img').alt=agents[actor].name;
  $('#talk strong').textContent=agents[actor].name; $('#talk small').textContent=agents[actor].role;
  $('#partner-state').textContent=pending(actor).length ? `${pending(actor).length} 项发现 · 等待汇报` : '有线索想问？找他聊聊';
  $('#count').textContent=knownEvidence(state,'captain').length; $('#pending-count').textContent=pending().length;
  $('#objective').textContent=!playing() ? state.phase === 'solved' ? '案件已解决。可查看结案复盘。' : '行动已耗尽。可回看本轮调查。' : pending().length ? '有队员带回了发现。点击「联系队员」听取汇报。' : investigationLead(state).text;
  const stageLabel=investigationLead(state).title+' · 梳理下一步';
  $('#story-stage').innerHTML=`<span class="full-label">${escape(stageLabel)}</span><span class="compact-label">案情进展</span>`;
  $('#story-stage').setAttribute('aria-label',stageLabel);
  $('#action-budget').textContent=`剩余 ${state.remaining} / 8 次行动`; $('#action-budget').classList.toggle('last-action',state.remaining === 1);
}
const commands={close,detail,investigate,receive,talk,journal,team,meeting,map,travel,cancelTravel,conclude,restart,reset,enter,guide,mobileTools,mobileHints(){ $('#hints').click(); mobileTools(); },material,opening,topic,progress,pursueLead,epilogue,ending,report,vnNext,vnPrevious,toggleDemo,exitDemo,councilChoice,recapPage,recapNext,recapPrevious,caseFile,
  share(value) {
    const [id,recipient]=value.split(':');
    send({type:'share',sender:'captain',recipient,evidence:[id]});
    journal(); notify(recipient === 'all' ? '材料已放入公共证据板 · 全队知晓' : `${agents[recipient].name}已收到这份材料`);
  }
};
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-command]');
  if (!button || button.disabled || (navigating && button.dataset.command !== 'cancelTravel') || (bootError && button.dataset.command !== 'reset')) return;
  try {
    if (button.matches('#enter-game, #title-screen [data-command="toggleDemo"], #title-screen [data-command="opening"]')) await mobileDisplay.enterLandscape();
    await commands[button.dataset.command](button.dataset.value,button.dataset.spot);
  } catch(error) { notify(error.message); }
});
panel.addEventListener('keydown',event=>{
  if(panel.querySelector('.story-recap') && !event.altKey && !event.ctrlKey && !event.metaKey) {
    if(event.key==='ArrowRight') {event.preventDefault();recapNext();}
    else if(event.key==='ArrowLeft') {event.preventDefault();recapPrevious();}
    return;
  }
  if(!panel.querySelector('.vn-stage') || event.altKey || event.ctrlKey || event.metaKey)return;
  if(event.key==='ArrowRight') { event.preventDefault();vnNext(); }
  else if(event.key==='ArrowLeft') { event.preventDefault();vnPrevious(); }
  else if((event.key===' ' || event.key==='Enter') && !event.target.closest('button,a,input,select,textarea')) {
    event.preventDefault();vnNext();
  }
});
$('#talk').addEventListener('click',()=>talk());
for (const id of ['map','team','journal','conclude','restart']) $(`#${id}`).addEventListener('click',()=>commands[id]());
$('#close').addEventListener('click',close);
$('#hints').addEventListener('click',()=>{
  const hidden=$('#game').classList.toggle('hide-hints'); $('#hints').setAttribute('aria-pressed',String(!hidden)); $('#hints').textContent=`调查标记 ${hidden ? '关' : '开'}`;
});
panel.addEventListener('cancel',event=>{
  if(bootError)event.preventDefault();
  else if(navigation) {event.preventDefault();cancelTravel();}
});
render();
if (bootError) {
  $('#close').hidden=true;
  show(`<section class="journal"><h2 id="panel-title">进度读取失败</h2><p>${escape(bootError)}</p><p>原进度还在。可以先关闭页面，或重新开始这版游戏。</p><div class="choices">${choice('重新开始二维版','reset','',true)}</div></section>`,'save-error');
} else titleScreen();
const mobileDisplay=setupMobileDisplay();
