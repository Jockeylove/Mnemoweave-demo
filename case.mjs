export const agents = {
  ajing: { name: '阿镜', role: '现场勘查', initial: '镜', portrait: 'assets/portraits/ajing-v1.png', bio: '现场不会给出答案，但会留下痕迹。' },
  wensheng: { name: '闻声', role: '人物访谈', initial: '声', portrait: 'assets/portraits/wensheng-v1.png', bio: '先记清对方说了什么，再判断是否可信。' },
  shuheng: { name: '书衡', role: '档案核对', initial: '衡', portrait: 'assets/portraits/shuheng-v1.png', bio: '记录上的名字，不一定是当时的持有人。' }
};
export const participants = {
  captain: { name: '你', role: '现场队长', portrait: 'assets/portraits/captain-v1.png', bio: '亲自观察，和搭档一起拼出完整经过。' },
  ...agents
};

export const locations = {
  hall: { name: '展厅', number: '01', subtitle: '玻璃展柜 · 出入口录像', description: '展柜完好，月光石却已不在原处。摄像头仍对着通向温室的走廊。', x: 27, y: 28 },
  archive: { name: '档案室', number: '02', subtitle: '通行卡登记 · 维护申请', description: '登记册与申请记录留在桌上。要查清一项许可，必须核对它在当晚的有效状态。', x: 72, y: 28 },
  duty: { name: '值班室', number: '03', subtitle: '当事人 · 借用凭据', description: '先听当事人的解释，再查看他们提供的凭据。两者需要分别记录。', x: 50, y: 54 },
  equipment: { name: '器材间', number: '04', subtitle: '推车 · 领用记录', description: '山庄的运输工具都在这里登记领用。先从现场找到线索，再来追查是谁借走了那辆车。', x: 27, y: 80 },
  garden: { name: '温室', number: '05', subtitle: '植物架 · 工作台', description: '雾气凝在玻璃内侧。这里需要一次实地搜索，才能确认物品的去向。', x: 72, y: 80 }
};

export const evidence = {
  E01: { title: '展柜开启记录', type: 'observation', label: '设备记录', time: '20:10', source: '展厅 · 展柜日志', text: '20:10，一张通行卡打开了展柜，随后重量减少，与月光石及包装重量相符。日志记下的卡号为 K17。', tags: ['K17'] },
  E02: { title: '通道录像', type: 'observation', label: '现场录像', time: '20:12', source: '展厅 · 出入口摄像头', text: '20:12，一辆手推车载着与展柜运输箱外观一致的箱子，经过通道前往温室。推车人的脸无法辨认，车身编号 T2 仍清晰可见。', tags: ['T2', '温室'] },
  E03: { title: '通行卡借用凭条', type: 'record', label: '签收记录', time: '19:50—20:25', source: '值班室 · 签收凭条', text: '凭条记载：林舟在 19:50 签收借用许禾的通行卡，20:25 归还，中途没有转借记录。卡号：K17。', tags: ['K17'] },
  E04: { title: '林舟的搬运解释', type: 'statement', label: '当事人说法 · 待核实', time: '调查时', source: '值班室 · 林舟陈述', text: '林舟说：“我是按维护申请搬的，你们可以去查。”他提供的申请编号是 P32，是否获得有效授权仍待核实。', tags: ['P32'] },
  E05: { title: '通行卡登记信息', type: 'record', label: '登记记录', time: '登记状态', source: '档案室 · 通行卡登记册', text: '登记册记载：卡号 K17，持卡人是园丁许禾。登记信息无法说明案发时这张卡实际在谁手中。', tags: ['K17'] },
  E06: { title: '手推车领用记录', type: 'record', label: '器材记录', time: '19:55—20:20', source: '器材间 · 领用登记册', text: '领用册记载：林舟签领了一辆手推车，使用时段为 19:55—20:20。器材编号：T2。', tags: ['T2'] },
  E07: { title: '维护申请撤销记录', type: 'record', label: '申请状态记录', time: '18:40', source: '档案室 · 维护申请记录', text: '编号 P32 的维护申请已在 18:40 撤销，当晚没有其他维护批准可以替代。', tags: ['P32'] },
  E08: { title: '月光石找回记录', type: 'observation', label: '实地发现', time: '搜索时', source: '温室 · 工作台下', text: '温室工作台下发现对应运输箱，箱内有月光石。', tags: ['温室'] }
};

export const actions = {
  inspect: { name: '亲自检查展柜', location: 'hall', agent: 'captain', produces: ['E01'], requires: [], repeat: false, report: '柜锁完好，没有撬动的痕迹。日志显示，有人在 20:10 刷卡开柜，随后柜内重量减少。你记下了卡号，接下来可以查查这张通行卡的来历。' },
  footage: { name: '请阿镜查看录像', location: 'hall', agent: 'ajing', produces: ['E02'], requires: [], repeat: false, report: '20:12，有人用手推车把箱子运往温室，外观和展柜的运输箱一致。脸看不清，但车身编号还能辨认。我记下来了，可以去器材间查查。' },
  interview: { name: '访谈并查看凭据', location: 'duty', agent: 'wensheng', produces: ['E03', 'E04'], requires: [], repeat: false, report: '林舟拿出了一张通行卡借用凭条。他说搬运是按维护申请办的，还报了申请编号。凭条我记下了，至于那份申请，还得去档案室核实。' },
  registry: { name: '追查开柜通行卡的归属', location: 'archive', agent: 'shuheng', produces: ['E05'], requires: [], repeat: false, report: '开柜用的这张通行卡，登记在园丁许禾名下。不过，登记的是谁的名字，和当晚是谁拿着它，是两回事。' },
  trolley: { name: '追查录像中的手推车', location: 'equipment', agent: 'shuheng', produces: ['E06'], requires: ['T2'], prerequisite: '先把拍到手推车的通道录像分享给书衡，他才能核对领用记录。', repeat: false, report: '按车身编号查到了，是林舟签领的。领用时间从 19:55 到 20:20，可以和录像里的时间对一对。' },
  permit: { name: '核实那份维护申请', location: 'archive', agent: 'shuheng', produces: ['E07'], requires: ['P32'], prerequisite: '先把林舟提到维护申请的陈述分享给书衡，他才能查到对应的申请。', repeat: false, report: '林舟提到的那份申请，18:40 就撤销了，当晚也没有其他批准。申请确实存在过，但搬运时已经无效。' },
  search: { name: '搜索温室', location: 'garden', agent: 'ajing', produces: ['E08'], requires: [], repeat: false, report: '工作台下找到了对应的运输箱，月光石就在里面。物品去向已经有实物支持。' },
  recover: { name: '重新调取借用凭条', location: 'duty', agent: 'wensheng', produces: ['E03'], requires: [], after: 'interview', repeat: true, report: '借用凭条重新调出来了：林舟在 19:50 借走通行卡，20:25 归还，中途没有转借记录。' }
};

export const resolution = [
  { key: 'person', title: '取走物品的人', answer: 'lin', options: [['xu', '许禾 · 园丁'], ['lin', '林舟 · 修复师'], ['zhou', '周宁 · 管家']], supports: [['E01', 'E03'], ['E01', 'E02', 'E06']], failure: '人物判断或引用依据尚不充分。需要把现场事件与实际使用人联系起来。' },
  { key: 'place', title: '实际找回的位置', answer: 'garden', options: Object.entries(locations).map(([id, l]) => [id, l.name]), supports: [['E08']], failure: '位置判断或引用依据尚不充分。去向线索不能代替实地找回记录。' },
  { key: 'authorization', title: '当时是否获得授权', answer: 'no', options: [['yes', '有有效授权'], ['no', '无有效授权'], ['unknown', '尚不能确定']], supports: [['E07']], failure: '授权判断或引用依据尚不充分。需要核实当晚的有效状态。' }
];

export const truth = [
  ['18:40', '维护申请被撤销，当晚没有其他批准可以替代。'],
  ['19:50', '林舟签收借用许禾的通行卡。'],
  ['19:55', '林舟签领手推车，使用时段截至 20:20。'],
  ['20:10', '林舟用借来的通行卡打开展柜，取走月光石及包装。'],
  ['20:12', '手推车载着运输箱进入温室通道；录像无法辨认人脸。'],
  ['随后', '林舟将运输箱藏在温室工作台下。'],
  ['20:25', '林舟归还通行卡。'],
  ['21:00', '案件被报告，调查开始。']
];
