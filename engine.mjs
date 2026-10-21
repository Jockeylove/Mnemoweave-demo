import { agents, participants, actions, evidence, resolution } from './case.mjs';
import { walkable, findPath, hallSpots } from './navigation.mjs';

export function createGame() {
  return {
    version: 2, phase: 'intro', remaining: 8,
    memories: Object.fromEntries(Object.keys(participants).map(id => [id, []])),
    public: [], completed: [], positions: { captain: 'hall', ajing: 'duty', wensheng: 'duty', shuheng: 'duty' },
    hallPositions: { captain: [-.65,4.65], ajing: [.75,4.65] },
    events: [], lastReport: null, judgment: null
  };
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
    return { key: rule.key, title: rule.title, passed, references: passed ? support : [], feedback: passed ? '结论与引用证据相符。' : rule.failure };
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
function meetingReport(state, agent) {
  const known = knownEvidence(state, agent);
  const reports = [`我目前持有 ${known.length} 份材料。`];
  if (known.includes('E01') && known.includes('E03')) reports.push('展柜打开时，那张通行卡还在林舟的借用时段内。日志和凭条能对上。');
  else if (known.includes('E01')) reports.push('日志留下了开柜通行卡的编号，还得查清当时是谁拿着它。');
  if (known.includes('E04') && known.includes('E07')) reports.push('林舟提到的维护申请在案发前就撤销了，他的授权说法不能成立。');
  else if (known.includes('E04')) reports.push('林舟说搬运有维护申请作为依据，得请书衡核实。');
  if (known.includes('E02') && !known.includes('E08')) reports.push('录像显示运输箱驶向温室，建议实地搜索。');
  if (known.includes('E08')) reports.push('月光石已在温室找回。');
  if (known.includes('E02') && !known.includes('E06')) reports.push('录像里能辨认出手推车的编号，也可以追查是谁领走了它。');
  if (!known.length) reports.push('我还没有收到调查材料。');
  return { actor: agent, text: reports.join(''), evidence: known };
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
  return structuredClone(value);
}
