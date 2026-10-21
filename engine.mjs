import { agents, participants, actions, evidence, resolution } from './case.mjs';
import { walkable, findPath, hallSpots } from './navigation.mjs';
import { councilEvidence, newCouncil, councilNode, councilConclusion } from './council.mjs';

export function createGame() {
  return {
    version: 2, phase: 'intro', remaining: 8,
    memories: Object.fromEntries(Object.keys(participants).map(id => [id, []])),
    public: [], completed: [], positions: { captain: 'hall', ajing: 'duty', wensheng: 'duty', shuheng: 'duty' },
    hallPositions: { captain: [-.65,4.65], ajing: [.75,4.65] },
    events: [], lastReport: null, judgment: null
  };
}

// Presentation stops before the meeting: findings remain with their owners.
export function createDemoGame() {
  let state = transition(createGame(), {type:'start'});
  for (const action of ['inspect','footage','interview','registry','trolley','permit','search']) {
    if (action === 'footage') state = transition(state,{type:'move',actor:'ajing',point:[...hallSpots.footage]});
    if (action === 'trolley') state = transition(state,{type:'share',sender:'ajing',evidence:['E02'],recipient:'shuheng'});
    if (action === 'permit') state = transition(state,{type:'share',sender:'wensheng',evidence:['E04'],recipient:'shuheng'});
    state = transition(state,{type:'investigate',action});
  }
  return state;
}

const unique = values => [...new Set(values)];
function event(state, data) {
  state.events.push({ sequence: state.events.length + 1, remaining: state.remaining, ...data });
}
export function knownEvidence(state, agent) {
  if (!participants[agent]) throw new Error('未知队员。');
  return unique([...state.memories[agent], ...state.public]);
}
export function actionStatus(state, id) {
  const action = actions[id];
  if (!action) return { allowed: false, reason: '不存在这项调查。' };
  if (state.phase !== 'playing') return { allowed: false, reason: '调查尚未开始或已经结束。' };
  if (!state.remaining) return { allowed: false, reason: '行动次数已耗尽。' };
  if (!action.repeat && state.completed.includes(id)) return { allowed: false, reason: '已完成调查，请查看队员汇报。' };
  if (action.after && !state.completed.includes(action.after)) return { allowed: false, reason: '先完成当事人访谈。' };
  const tags = knownEvidence(state, action.agent).flatMap(id => evidence[id].tags);
  const missing = action.requires.filter(tag => !tags.includes(tag));
  if (missing.length) return { allowed: false, reason: action.prerequisite };
  return { allowed: true, reason: '' };
}
export function checkConclusion(state, answers, citations) {
  if (citations.some(id => !state.public.includes(id))) throw new Error('结案只能引用已共享到公共证据板的材料。');
  return resolution.map(rule => {
    const support = rule.supports.find(group => group.every(id => citations.includes(id)));
    const passed = answers[rule.key] === rule.answer && Boolean(support);
    return { key: rule.key, title: rule.title, passed, references: passed ? support : [], feedback: passed ? '这项判断有相应记录支持。' : rule.failure };
  });
}
function share(state, sender, ids, recipient) {
  if (!participants[sender] || !(recipient === 'all' || participants[recipient]) || sender === recipient) throw new Error('请选择有效的发送者与接收者。');
  if (!ids.length || ids.some(id => !knownEvidence(state, sender).includes(id))) throw new Error('只能分享发送者实际持有的材料。');
  ids = unique(ids);
  const recipients = recipient === 'all' ? Object.keys(participants).filter(id => id !== sender) : [recipient];
  if (recipient === 'all') state.public = unique([...state.public, ...ids]);
  recipients.forEach(agent => { state.memories[agent] = unique([...state.memories[agent], ...ids]); });
  event(state, { type: 'share', actor: sender, recipient, evidence: ids, text: `${participants[sender].name}将${ids.length}份材料分享给${recipient === 'all' ? '全队' : participants[recipient].name}。` });
}
// The caller supplies the evidence available in this conversation. Meetings use
// the shared pool; private conversations use the speaker/captain intersection.
export function characterReasoning(agent, known) {
  const has = id => known.includes(id), lines = [], references = new Set();
  const say = (text, ids) => { lines.push(text); ids.forEach(id => references.add(id)); };
  if (agent === 'ajing') {
    if (has('E01') && has('E02')) say('20:10 开柜，20:12 箱子就到走廊了。两分钟，动作够快的。可惜没拍清脸，还得看看别的记录。',['E01','E02']);
    else if (has('E01')) say('20:10 有人刷卡开柜，重量跟着少了。先查那会儿谁拿着卡；东西从哪条路出去的，录像也得看。',['E01']);
    else if (has('E02')) say('20:12，车推着箱子往温室去了。脸看不清，光凭这段录像，我认不出是谁。',['E02']);
    if (has('E08')) say('温室工作台下那只箱子里就是月光石，可算没白找。',['E08']);
    else if (has('E02')) say('我想先去温室翻翻。箱子长得像，里面是不是月光石，打开才知道。',['E02']);
    if (has('E02') && has('E06')) say('车也对上了，是林舟领的那辆。20:12 还没到归还时间，又是他。',['E02','E06']);
    else if (has('E02')) say('车身编号拍得清楚。队长，把这段给取教授看看，请他查一下领用册。',['E02']);
  } else if (agent === 'wensheng') {
    if (has('E03') && has('E01')) say('凭条写着林舟 19:50 借卡、20:25 归还，中间没有转借记录。开柜是 20:10，卡正借在他手上，我更怀疑是他。',['E03','E01']);
    else if (has('E03')) say('林舟借过卡，19:50 到 20:25，中间没有转借记录。现在得看看开柜时间是不是落在这段里。',['E03']);
    else if (has('E05')) say('许禾是登记人。卡有没有借出去，我还得去问问，不能只盯着他的名字。',['E05']);
    if (has('E04') && has('E07')) say('他说按维护申请搬，可那份申请早撤销了。我想再问他：是谁告诉他可以搬的？这件事目前还没问清。',['E04','E07']);
    else if (has('E04')) say('林舟说自己按维护申请搬的。我把编号记下了，先请取教授查查，再回来问他。',['E04']);
    if (has('E08')) say('月光石找到了就好。待会儿问话，可以直接问它为什么会在温室。',['E08']);
  } else if (agent === 'shuheng') {
    if (has('E05') && has('E03')) say('两页我都看了。许禾的卡借给了林舟，名字没写错。开柜那会儿，卡还在谁手里？把时间也放过来。',['E05','E03']);
    else if (has('E05')) say('登记册只能确认这张卡属于许禾。借没借给别人，这页没记。',['E05']);
    else if (has('E01') && has('E03')) say('开柜日志与借用凭条能对上卡号和时间。结案时，两份都要附上。',['E01','E03']);
    if (has('E07')) say('18:40，这份申请已经撤销。我翻过当晚的其他批复，没有另一份批准。他搬的时候，这张申请已经不能用了。',['E07']);
    else if (has('E04')) say('编号有了，我得找到原件再看。总不能他说批准了，就算批准了。',['E04']);
    if (has('E02') && has('E06')) say('领用册与录像的车号一致。林舟领用的时段是 19:55 到 20:20，录像拍在 20:12，也能对上。',['E02','E06']);
    else if (has('E06')) say('林舟领车的时间是 19:55 到 20:20。还要拿它和现场录像对照，单看领用册不够。',['E06']);
  }
  if (!lines.length) lines.push({ajing:'我这边还没凑出能判断的线索。先把现场和录像看一遍。',wensheng:'我还想听听当事人的话。现在让我猜，我也没底。',shuheng:'现有材料还不够我核对。把访谈里的编号或现场记录拿来，我继续查。'}[agent]);
  return { lines, evidence: [...references] };
}
function meetingReport(state, agent) {
  const report = characterReasoning(agent, knownEvidence(state, agent));
  return { actor: agent, text: report.lines.join(' '), evidence: report.evidence };
}

function enterCouncilLine(state) {
  const council=state.council, frame=councilNode(council).frames[council.index];
  const key=`${council.node}:${council.index}:${council.proposal || ''}`;
  if(council.visited.includes(key))return;
  const refs=frame.refs || [];
  const unshared=refs.filter(id=>!state.public.includes(id));
  if(unshared.length)share(state,frame.speaker,unshared,'all');
  council.presented=unique([...council.presented,...refs]);
  council.visited.push(key);
  event(state,{type:'council-line',actor:frame.speaker,recipient:frame.to || 'all',evidence:refs,text:frame.text});
}

export function transition(previous, command) {
  const state = structuredClone(previous);
  if (command.type === 'start') {
    if (state.phase !== 'intro') throw new Error('案件已经开始。');
    state.phase = 'playing';
    event(state, { type: 'start', evidence: [], text: '21:00，接受月光石失踪案。展柜没有被破坏，日志留下了一张通行卡的使用记录。' });
    return state;
  }
  if (state.phase !== 'playing') throw new Error('本次调查已结束，请查看复盘或重新开局。');
  if(command.type==='council-start') {
    const available=councilEvidence(state);
    if(!available.length)throw new Error('先取得一份调查材料，再召集大家讨论。');
    const current=state.council;
    if(!current?.active || available.some(id=>!current.evidence.includes(id))) {
      state.council=newCouncil(state);
      event(state,{type:'council-start',evidence:[],text:'召集小队讨论，材料将随发言向全队公开。'});
    }
    enterCouncilLine(state);
    return state;
  }
  if(['council-next','council-previous','council-choice'].includes(command.type)) {
    const council=state.council;
    if(!council?.active)throw new Error('请先召集小队讨论。');
    const node=councilNode(council), last=council.index===node.frames.length-1;
    if(command.type==='council-next') {
      if(!last)council.index++;
    } else if(command.type==='council-previous') {
      if(council.index>0)council.index--;
    } else {
      const selected=node.choices.find(option=>option.id===command.choice);
      if(!last || !selected)throw new Error('听完当前发言后，再选择这一轮的问题。');
      event(state,{type:'council-choice',actor:'captain',evidence:[],choice:selected.id,text:selected.label});
      if(selected.id==='leave') { council.active=false;return state; }
      if(selected.id==='confirm') {
        const conclusion=councilConclusion(council);
        council.active=false;
        return transition(state,{type:'submit',...conclusion});
      }
      if(selected.id.startsWith('person:')) {
        council.proposal=selected.id.slice(7);council.node='proposal';
      } else council.node=selected.id;
      council.index=0;
    }
    enterCouncilLine(state);
    return state;
  }
  if (command.type === 'move') {
    if (!['captain','ajing'].includes(command.actor) || !findPath(state.hallPositions[command.actor], command.point)) throw new Error('这个位置不能通行。');
    state.hallPositions[command.actor] = [...command.point];
    state.positions[command.actor] = 'hall';
    return state;
  }
  if (command.type === 'receive-report') {
    const action = actions[command.action];
    if (!action || action.agent === 'captain' || !state.completed.includes(command.action)) throw new Error('这项调查尚无队员汇报。');
    const ids = action.produces.filter(id => !knownEvidence(state,'captain').includes(id));
    if (ids.length) share(state,action.agent,ids,'captain');
    return state;
  }
  if (command.type === 'investigate') {
    const status = actionStatus(state, command.action);
    if (!status.allowed) throw new Error(status.reason);
    const action = actions[command.action];
    if (action.agent !== 'captain' && action.location === 'hall' && Math.hypot(...state.hallPositions[action.agent].map((v,i)=>v-hallSpots[command.action][i])) > .55) {
      throw new Error('请先走到调查物件旁边。');
    }
    state.remaining--;
    state.memories[action.agent] = unique([...state.memories[action.agent], ...action.produces]);
    state.completed = unique([...state.completed, command.action]);
    state.positions[action.agent] = action.location;
    state.lastReport = command.action;
    event(state, { type: 'investigate', actor: action.agent, action: command.action, evidence: action.produces, text: `${participants[action.agent].name}完成「${action.name}」。`, report: action.report });
  } else if (command.type === 'share') {
    share(state, command.sender, command.evidence, command.recipient);
  } else if (command.type === 'meeting') {
    if (!Object.values(state.memories).some(ids => ids.length)) throw new Error('先取得至少一份材料，再召开案情会。');
    state.remaining--;
    event(state, { type: 'meeting', evidence: [], text: '召开案情会：队员公开目前持有的材料。' });
    for (const id of Object.keys(participants)) {
      const unshared = knownEvidence(state, id).filter(card => !state.public.includes(card));
      if (unshared.length) share(state, id, unshared, 'all');
    }
    for (const id of Object.keys(agents)) {
      const report = meetingReport(state, id);
      event(state, { type: 'briefing', ...report, text: report.text });
    }
  } else if (command.type === 'submit') {
    for (const rule of resolution) {
      if (!rule.options.some(([value]) => command.answers?.[rule.key] === value)) throw new Error('请填写三个结案判断。');
    }
    state.judgment = checkConclusion(state, command.answers, command.citations || []);
    state.remaining--;
    event(state, { type: 'submit', evidence: unique(command.citations || []), answers: command.answers, judgment: state.judgment, text: '提交结案判断与引用证据。' });
    if (state.judgment.every(item => item.passed)) state.phase = 'solved';
  } else {
    throw new Error('未知操作。');
  }
  if (state.remaining === 0 && state.phase === 'playing') state.phase = 'unfinished';
  if (state.phase !== 'playing') {
    event(state, { type: 'end', evidence: [], text: state.phase === 'solved' ? '案件解决：人物、位置与授权状态均有证据支持。' : '行动耗尽，调查未完成。' });
  }
  return state;
}

export function restoreGame(value) {
  value = structuredClone(value);
  // The previous public prototype immediately reported every discovery to the
  // captain. Preserve that actual knowledge, original owners, costs and events.
  if (value?.version === 1) {
    if (!value.memories || !value.positions || !Array.isArray(value.completed) || !Array.isArray(value.events) ||
        Object.keys(agents).some(id=>!Array.isArray(value.memories[id]))) throw new Error('旧版存档数据不完整。');
    value.version = 2;
    value.memories.captain = unique(Object.values(value.memories).flat());
    value.positions.captain = 'hall';
    value.hallPositions = { captain: [-.65,4.65], ajing: value.completed.includes('inspect') ? [...hallSpots.footage] : [.75,4.65] };
    if (value.completed.includes('inspect')) value.completed = unique([...value.completed,'footage']);
  }
  // This version has a fixed, local save format; invalid data is reported to the player.
  if (!value || value.version !== 2 || !['intro', 'playing', 'solved', 'unfinished'].includes(value.phase) ||
      !Number.isInteger(value.remaining) || value.remaining < 0 || value.remaining > 8 ||
      !Array.isArray(value.events) || !Array.isArray(value.completed) ||
      value.completed.some(id => !actions[id]) || !value.positions ||
      Object.keys(participants).some(id => !Object.values(actions).some(action => action.location === value.positions[id])) ||
      !value.hallPositions || ['captain','ajing'].some(id=>!walkable(value.hallPositions[id]))) {
    throw new Error('本地存档格式不适用于这个版本，请重新开局。');
  }
  for (const ids of [value.public, ...Object.keys(participants).map(id => value.memories?.[id])]) {
    if (!Array.isArray(ids) || ids.some(id => !evidence[id])) throw new Error('本地存档的证据数据不完整，请重新开局。');
  }
  if ((value.phase === 'playing' && value.remaining === 0) ||
      (value.phase === 'unfinished' && value.remaining !== 0)) throw new Error('本地存档的行动状态不完整，请重新开局。');
  if(value.council) {
    const council=value.council;
    if(typeof council.active!=='boolean' || !Array.isArray(council.evidence) || council.evidence.some(id=>!evidence[id]) ||
      !council.owners || council.evidence.some(id=>!participants[council.owners[id]]) ||
      !Array.isArray(council.presented) || council.presented.some(id=>!council.evidence.includes(id) || !value.public.includes(id)) ||
      !Array.isArray(council.visited) || council.visited.some(id=>typeof id!=='string') ||
      (council.proposal!==null && !resolution[0].options.some(([id])=>id===council.proposal)))throw new Error('本地存档的讨论记录不完整。');
    const node=councilNode(council);
    if(!Number.isInteger(council.index) || council.index<0 || council.index>=node.frames.length)throw new Error('本地存档的讨论位置不完整。');
  }
  return structuredClone(value);
}
