import { actions, agents } from './case.mjs';
import { knownEvidence, characterReasoning } from './engine.mjs';

// Establish the case and cast before anyone starts the scene conversation.
// These frames contain only the briefing, never investigation results.
export const openingPrelude = [
  { title:'雨夜山庄', scene:'hall', speaker:'narrator', portrait:null, label:'夜里九点 · 山庄', text:'雨封住了山路。山庄里，管家报来一件怪事：展厅收藏的月光石不见了，玻璃却没有碎，柜门也还锁着。' },
  { title:'一件失踪的藏品', scene:'hall', speaker:'narrator', portrait:null, label:'这次委托', text:'你和三位搭档受托调查。月光石是被人偷走了，还是有人把它搬到了别处？管家说不清，得由你们查明。' },
  { title:'今晚要查清的事', scene:'hall', speaker:'narrator', portrait:null, label:'调查目标', text:'今晚要找回月光石，查清是谁取走的、有没有得到批准。等大家带回材料，你们会坐下来对一遍，最后由你决定向管家交代谁的名字。' },
  { title:'由你带队', scene:'hall', speaker:'narrator', portrait:'captain', kind:'introduction', label:'你 · 调查队长', text:'你负责带队，也会亲自检查现场。搭档们查到的东西，要交流后才会进入你的手记；接下来追哪条线索、最后如何判断，都由你决定。' },
  { title:'阿镜', scene:'hall', speaker:'narrator', portrait:'ajing', kind:'introduction', label:'阿镜 · 侦探', text:'阿镜负责现场勘查，查物件，也盯录像。平时说话有点懒散，遇到可疑的痕迹却很有耐心。这次，展厅和运输路线先交给他。' },
  { title:'闻声', scene:'duty', speaker:'narrator', portrait:'wensheng', kind:'introduction', label:'闻声 · 调查助手', text:'闻声负责访谈。她和人聊得来，记笔记也快，常能记住别人随口提到的小事。她会去值班室问当事人，带回他们的说法和凭据。' },
  { title:'取风', scene:'archive', speaker:'narrator', portrait:'shuheng', kind:'introduction', label:'取风 · 大家叫他取教授', text:'取教授负责核对档案。登记册、借用记录、申请批复，都可以请他查。把现场找到的编号或访谈材料交给他，他才能找到对应的原件。' }
];

export const openingBeats = [
  { title:'柜子还锁着', scene:'hall', text:'管家在展柜前停住。灯还亮着，深色衬垫上空了一块。他又拉了一下柜门，没拉开。', lines:[['管家','我发现的时候，就是这样。'],['阿镜','还锁着？队长，你看看锁，我去找录像。']], question:'没砸玻璃，也没撬锁。是谁把柜子打开了？' },
  { title:'雨还没停', scene:'duty', text:'闻声翻开笔记本，试了试笔。取教授接过档案室钥匙，问管家借了一盏台灯。', lines:[['闻声','我去值班室问问。你要是想起什么，过来找我就行。'],['取教授','登记册在哪一柜？麻烦带我过去。']], question:'先让他们各自查。我留在展厅，看看开柜记录还在不在。' },
  { title:'从空展柜开始', scene:'hall', text:'走廊里的脚步声远了。阿镜拉过椅子坐到屏幕前，朝你扬了扬下巴。', lines:[['你','查到什么就叫我。'],['阿镜','行。别光站着，你那柜子还没看呢。']], question:'先检查展柜，再和阿镜对一下录像里的时间。' }
];

const topic = (id, label, gesture, line, followups) => ({id,label,gesture,line,followups});

export function conversationEntry(state, actor, heard = [], resume = false) {
  const frame = text => ({speaker:actor,text});
  if (resume) return [frame({ajing:'嗯，接着说。',wensheng:'还想问哪一处？',shuheng:'你说，我听着。'}[actor])];
  if (state.phase !== 'playing') return [frame(state.phase === 'solved'
    ? {ajing:'该交代的都交代完了。怎么，还有哪里想不通？',wensheng:'笔记我还留着呢，你想看哪一页？',shuheng:'册子还没收。你要看哪一页？'}[actor]
    : {ajing:'这回没查完。先看看手头留下的东西吧。',wensheng:'先别收本子，我们看看还漏了哪儿。',shuheng:'今天只能查到这里了。材料先收好，别弄丢。'}[actor])];
  const shared = knownEvidence(state,actor).filter(id=>knownEvidence(state,'captain').includes(id));
  const pending = Object.keys(actions).filter(id=>actions[id].agent===actor && state.completed.includes(id) && !actions[id].produces.every(e=>knownEvidence(state,'captain').includes(e)));
  if (pending.length) return [frame({
    footage:'录像查完了。过来，我放给你看。',
    interview:'这边查完了。我问到的，都记在本子上，你看看。',
    registry:'登记册查完了，要找的那页在这里。',
    trolley:'领用册查完了。队长，你来看看这个签名。',
    permit:'申请查完了。这里有一处，得跟你说一下。',
    search:'温室查完了。队长，过来一下。',
    recover:'副本取来了。给你。'
  }[pending[0]])];
  const candidates = shared.length ? characterReasoning(actor,shared).lines : [agents[actor].bio];
  const fresh = candidates.filter(text=>!heard.includes(text));
  if (!fresh.length) return [frame({ajing:'还是刚才那些线索。你想接着查，还是再对一遍？',wensheng:'我这边暂时没新消息。你想接着问哪件事？',shuheng:'目前没有新的记录。你想复核哪一页？'}[actor])];
  const frames = fresh.map(text=>({...frame(text),remember:actor}));
  if(shared.length) frames.push(captainReflection(state,actor));
  return frames;
}

export function conversationTopics(state, actor) {
  if(state.phase!=='playing')return [];
  const shared = id => knownEvidence(state,actor).includes(id) && knownEvidence(state,'captain').includes(id);
  const all = (...ids) => ids.every(shared);
  const result=[];
  if(actor==='ajing') {
    if(!all('E01','E02'))result.push(topic('method','看出什么没有？','阿镜扶了一下眼镜，往展柜那边看。',shared('E02')?'录像看过了，柜子呢？你那边有发现没有？':shared('E01')?'柜子的时间有了。我再看看录像，东西总得从门口出去。':'还早。先看看锁，再查录像，总不能站在这儿猜一晚上。',[
      ['不先找人问问？','闻声已经去了。咱俩也去围着问，柜子谁看？'],
      ['那我们怎么分工？',shared('E02')?'录像我查完了。你把开柜日志拿来，咱们对对。':'你查柜体和开柜日志，我看录像。看完叫你。']
    ]));
    if(all('E01','E02')) result.push(topic('route','开柜到推车出现，只隔了两分钟？','阿镜用笔尖点了点两个时间。','20:10 开柜，20:12 箱子就到走廊了。够快的。可惜，这个角度偏偏看不清脸。',[
      ['可箱子看起来一样。',shared('E08')?'就是在温室找到的那只。我开过了，月光石还在里面。':'我也觉得像。去温室开箱看看，省得对着这张糊图瞪眼。'],
      ['录像里还有什么能追？',shared('E06')?'车号。取教授已经对过，是林舟领的那辆。':'车身编号拍到了。把录像给取教授，请他去器材间查是谁领的车。']
    ]));
    if(all('E08')) result.push(topic('found','找到了，就算结束了吗？','阿镜合上本子，又看了你一眼。','月光石找到了。谁搬的、准没准搬，总得给管家一个交代吧。',[
      ['还要补查什么？','看看手上的记录，能不能对出当时拿卡的人。搬运有没有批准，也得查清。'],
      ['那先把找到的事告诉大家。','嗯，放到公共证据板上。别让他们还在别处找。']
    ]));
  }
  if(actor==='wensheng') {
    if(!state.completed.includes('interview'))result.push(topic('listen','准备好了吗？','闻声把笔帽扣在笔尾，给你让出一点位置。','好了。你先别急着插话啊，我想听他自己把经过讲完。',[
      ['如果他一直绕圈子呢？','那就问具体动作。比如进了哪扇门，手里拿着什么。你要听到前后对不上的，记得提醒我。'],
      ['我怕漏掉细节。','你听他说，我记。放心，我写得快，你又不是第一天知道。']
    ]));
    if(all('E03','E04')) result.push(topic('account','你相信林舟的解释吗？','闻声抽出凭条副本，放到你的笔记旁。',shared('E07')?'他让我们查的申请已经撤销了。东西是他搬的，这份申请却用不了了，我还想听他怎么说。':'借卡这件事，他拿得出凭条。可一问为什么搬，他就让我们去查维护申请。我想看看那张申请到底怎么写的。',[
      ['他都承认搬运了，还查什么？',shared('E07')?'问他为什么拿一份撤销的申请当理由。这个他还没回答呢。':'他说有人批准，总得找得到批准吧？把申请编号给取教授看看。'],
      ['你觉得他在撒谎？',shared('E07')?'他的说法对不上了。可他知不知道申请撤销，还没问到，我不想替他回答。':'还说不好。我想先查完那份申请，再回来听他怎么解释。']
    ]));
    if(all('E03','E05')) result.push(topic('holder','卡怎么会牵出两个人？','闻声把借用凭条翻过来，让你看签名。','卡是许禾的，借走它的却是林舟。你看这儿，还有借走和归还的时间。',[
      ['所以登记册错了？','没写错呀，卡本来就是许禾的。我们得看开柜的时候，它还在不在林舟手里。'],
      ['我刚才差点只看登记人。','幸好你又看了一眼凭条。开柜是几点？把两个时间放一起看看。']
    ]));
  }
  if(actor==='shuheng') {
    result.push(topic('records','取教授，这些都要翻完？','取教授用手指夹住书页，抬起头。','不必。有卡号或申请编号，就能找到对应那页。你们查到后给我一份。',[
      ['找到名字就能认人？','先看看那一栏记的是什么。物主、借用人、经办人，名字的意思可不一样。'],
      ['我给你线索，你能查到哪一步？','我可以查登记和申请原件。要查工具领用，就去器材间。先把你拿到的材料给我。']
    ]));
    if(all('E05') && !shared('E03')) result.push(topic('registry','卡登记在许禾名下，就该找他吗？','取教授把登记册转向你。','可以问他。只是这页没有记借用情况，卡离没离过他的手，还得查。',[
      ['那还缺哪一页？','借用凭据。闻声在值班室，可以请她问问有没有人签收过这张卡。'],
      ['登记信息岂不是没用？','至少知道该查哪张卡、找谁问了。但仅凭这一页，我没法告诉你是谁开的柜子。']
    ]));
    if(all('E04','E07')) result.push(topic('permit','他提的申请查到了？','取教授圈出 18:40，指给你看。','查到了，18:40 已经撤销。当晚也没有其他批准。他不能拿这张申请解释那次搬运。',[
      ['他会不会不知道撤销了？','有可能。这份记录没有写他何时收到通知，不能据此说他知情。'],
      ['这个区别要写进结论。','好，把撤销记录留着。下次问他知不知道，别让他只重复那个申请编号。']
    ]));
    if(all('E02','E06')) result.push(topic('trolley','领用记录和录像能对上吗？','取教授把领用册移到录像截图旁边。','同一辆车。林舟领用的时间是 19:55 到 20:20，录像拍在 20:12，落在这个时段内。人脸仍然看不清。',[
      ['那就把两份材料一起保留。','好。就夹在这一页，回头给其他人看，也好找。'],
      ['还需要看箱子里面吗？','需要。录像拍到的是箱子，我们要找的是月光石。']
    ]));
  }
  return result;
}

// Narrative guidance uses the captain's actual knowledge, never hidden teammate findings.
export function investigationLead(state) {
  const ids=knownEvidence(state,'captain'), has=id=>ids.includes(id);
  const waiting=Object.keys(actions).find(id=>actions[id].agent!=='captain' && state.completed.includes(id) && !actions[id].produces.every(has));
  const lead=(title,text,command,value,label)=>({title,text,command,value,label});
  if(state.phase==='solved') return lead('收起笔记之前','管家还没收到消息，去跟大家交代一声。','epilogue','','收好材料，去见管家');
  if(state.phase!=='playing') return lead('调查暂停','本轮行动已经耗尽，可以回看已取得的材料。','journal','','回看手记');
  if(waiting) return lead('队员有发现','有人查完了，去听听结果。','receive',waiting,'听取待交流的发现');
  if(!has('E01')) return lead(has('E08')?'柜子是怎么打开的？':'一 · 空展柜','检查柜锁，再看看开柜日志。','detail','inspect','检查展柜');
  if(!has('E03')) {
    if(!has('E05')) return lead('二 · 谁的通行卡','拿着日志上的卡号，去找取教授查登记册。','detail','registry','查通行卡登记');
    return lead('二 · 卡有没有借给别人','去值班室找闻声，问问当晚的借用情况。','detail','interview','查看访谈线索');
  }
  if(has('E04') && !has('E07')) return lead('三 · 他说有依据','把林舟的搬运解释交给取教授，请他按编号查那份维护申请。',knownEvidence(state,'shuheng').includes('E04')?'detail':'journal',knownEvidence(state,'shuheng').includes('E04')?'permit':'','核查搬运依据');
  if(!has('E08')) return has('E02') ? lead('四 · 走廊尽头','箱子被推向温室了。去那里找找。','detail','search','查看温室搜索线索') : lead('四 · 东西去了哪里','还不知道月光石被搬去了哪儿。请阿镜查查录像。','detail','footage','查看录像线索');
  if(!has('E07')) return lead('谁批准的搬运','月光石找回来了，还要查搬运是否获准。回去听听当事人的解释。','detail','interview','回看访谈');
  return lead('五 · 一起推敲','召集大家，把各自的材料摆出来。有哪处对不上，当面问清楚。','meeting','','召集小队讨论');
}

// Internal monologues can use the captain's knowledge; dialogue topics still
// require knowledge shared with the speaker. Destinations never reveal findings.
export function captainReflection(state, actor, topicId='', answer='') {
  const has=id=>knownEvidence(state,'captain').includes(id);
  const thought=(text,destination=null)=>({speaker:'captain',kind:'thought',text,destination});
  if(state.phase!=='playing') return thought(state.phase==='solved'?'可以向管家交代了。还有几个问题，得留到再问林舟的时候。':'没查完。先把这些材料收好。');
  if(actor==='ajing') {
    if(has('E02') && !has('E08')) {
      if(topicId==='route' && answer==='1') return thought('车身编号还看得清。把录像交给取教授，再去器材间查领用册。','equipment');
      return thought('去温室看看，那只箱子说不定还在。','garden');
    }
    if(!has('E01')) return thought('展柜还没检查。回展厅看看锁和日志。','hall');
    if(!has('E02')) return thought('柜子开过了，东西又从哪儿搬出去的？回展厅，请阿镜看看录像。','hall');
  }
  if(actor==='wensheng' && has('E04') && !has('E07')) return thought('林舟让我们查申请，那就查。去档案室，把闻声记下的编号交给取教授。','archive');
  if(actor==='wensheng' && !has('E03')) return thought('去值班室听听。我还不知道当事人怎么说。','duty');
  if(actor==='shuheng' && has('E05') && !has('E03')) return thought('卡是许禾的，会不会借给别人了？去值班室找闻声问问。','duty');
  const lead=investigationLead(state);
  if(lead.command==='detail') {
    const reflections={
      inspect:['回展厅，展柜还没查过。','hall'],
      registry:['先弄清这张卡是谁的。去档案室找取教授。','archive'],
      interview:['还缺当晚借卡的情况。去值班室听听。','duty'],
      permit:['材料已经交给取教授了。去档案室和他一起确认申请的状态。','archive'],
      search:['去温室找那只箱子，看看里面装了什么。','garden'],
      footage:['月光石会被搬去哪儿？回展厅查录像。','hall']
    };
    return thought(...reflections[lead.value]);
  }
  if(lead.command==='receive') return thought('还有人查完没来得及说。先听听。');
  if(!has('E07') && has('E04')) return thought('去档案室。取教授还没收到林舟说的申请编号，得先给他。','archive');
  return thought('该把大家叫到一起了。让他们把各自的发现对一遍，我还有几处想当面问。');
}

export const reportResponses = {
  inspect:'刷卡开的。把卡号抄下来。',
  footage:'往温室去了？那边值得找找。',
  interview:'好，凭条给我一份。申请也得查。',
  registry:'许禾。记下了，再问问卡有没有借出去。',
  trolley:'20:12 还在他的领用时段里。我把录像也放过来。',
  permit:'那他搬的时候，这份申请已经用不了了。',
  search:'总算找到了。先收好，搬运的事还得查完。',
  recover:'收到了，这份副本我留着。'
};
