import { actions, participants, resolution } from './case.mjs';

export const councilEvidence = state => [...new Set([...state.public,...Object.values(state.memories).flat()])];
export function newCouncil(state) {
  const ids=councilEvidence(state);
  const owners=Object.fromEntries(ids.map(id=>{
    const source=Object.values(actions).find(action=>action.produces.includes(id)).agent;
    const owner=state.memories[source].includes(id) ? source : Object.keys(participants).find(actor=>state.memories[actor].includes(id)) || 'captain';
    return [id,owner];
  }));
  return {evidence:ids,owners,node:'opening',index:0,presented:[],visited:[],proposal:null,active:true};
}

// This script only uses the meeting's available materials. A referenced material
// is communicated when its line is displayed, not when the meeting is opened.
export function councilNode(council) {
  const has=id=>council.evidence.includes(id);
  const line=(speaker,text,refs=[],to=null)=>({speaker,text,refs,to});
  const show=(id,text,to=null)=>line(council.owners[id],text,[id],to);
  const choice=(id,label)=>({id,label});
  const node=(title,frames,choices)=>({title,frames,choices});
  const proceed=choice('authorization','林舟说的那份申请呢？');
  const identityChoices=[
    ...(has('E03')?[choice('card','把借卡时段和开柜时间对一遍')]:[]),
    ...(has('E02')||has('E06')?[choice('cart','录像和推车记录能不能对上？')]:[]),proceed
  ];
  switch(council.node) {
    case 'opening': return node('先把材料摆出来',[
      line('captain','大家先坐。各自查到了什么，拿出来看看。阿镜，你那边怎么样？'),
      line('ajing','录像我带来了。队长，你先说说柜子。',[],'captain')
    ],[choice('scene','从展柜和录像开始')]);
    case 'scene': {
      const frames=[];
      if(has('E01')) frames.push(show('E01','20:10，有人刷卡开了柜子。紧接着重量就少了，正好少了一块月光石和它的包装。看这里。','ajing'));
      else frames.push(line('captain','柜子还没查。我先听听你们的。'));
      if(has('E02')) {
        frames.push(show('E02','20:12，箱子就到走廊了。跟展柜那只一个样，往温室去的。人倒好，偏偏没拍清脸。','captain'));
        frames.push(line('wensheng','确实看不清。等等，车上那块牌子呢？',['E02'],'ajing'));
        frames.push(line('ajing','牌子能看清，我抄了车号。取教授，待会儿帮我看看。至于箱子，得打开才知道装的什么。',['E02'],'wensheng'));
      } else frames.push(line('ajing','录像还没看。东西从哪儿搬出去的，我现在也说不上来。'));
      return node('现场留下的时间',frames,[choice('identity','接下来，谁拿过卡、领过车？')]);
    }
    case 'identity': {
      const frames=[];
      if(has('E05')) {
        frames.push(show('E05','开柜用的这张卡，登记在许禾名下。就是那位园丁。','wensheng'));
        frames.push(line('ajing','闻声，你问过没有？这卡有没有借出去？',['E05'],'wensheng'));
      }
      if(has('E03')) {
        frames.push(show('E03','有，凭条在我这儿。林舟借的，19:50 拿走，20:25 才还。中间没有转借记录。取教授，你看签收这一栏。','shuheng'));
        if(has('E05')) frames.push(line('shuheng','是同一张卡。这样就清楚了，册子上记的是许禾，这一晚用卡的却是林舟。',['E05','E03'],'wensheng'));
      }
      if(has('E06')) frames.push(show('E06','车也是林舟领的。19:55 到 20:20，编号在这儿，阿镜你对一下。','ajing'));
      if(!frames.length) frames.push(line('wensheng','卡和车是谁拿走的，我们都还没问到。先别急着认人吧。'));
      frames.push(line('captain','等一下，把这几个时间放近一点。'));
      return node('物主、借用人和搬运人',frames,identityChoices);
    }
    case 'card': return node('借卡时段',[
      line('captain','闻声，把凭条上的时间再指给阿镜看。'),
      line('wensheng','19:50 到 20:25，期间没有转借记录。',['E03'],'ajing'),
      has('E01') ? line('ajing','20:10 开柜。那时候卡还在林舟手里，没还回去。这下就对上了。',['E01','E03'],'wensheng') : line('ajing','卡借过了，可柜子是什么时候开的？这还得查。',[],'wensheng')
    ],[...(has('E02')||has('E06')?[choice('cart','再看看推车这条线')]:[]),proceed]);
    case 'cart': {
      const frames=[line('captain','阿镜，你和取教授对一下车号和时间。')];
      if(has('E02'))frames.push(line('ajing','20:12。别看脸，看车号，我把这一帧停住。',['E02'],'shuheng'));
      if(has('E06'))frames.push(line('shuheng','领用人是林舟，19:55 到 20:20。',['E06'],'ajing'));
      if(has('E02')&&has('E06'))frames.push(line('ajing','对，是这辆。拍到的时候，车还在林舟的领用时段里。队长，借车这边也是他。',['E02','E06'],'captain'));
      else frames.push(line('shuheng',has('E02')?'录像给我一份，我去器材间找领用册。':'这页只有领用时间，得把录像找来一起看。',[], 'captain'));
      return node('把推车记录对上',frames,[...(has('E03')?[choice('card','再核对借卡时段')]:[]),proceed]);
    }
    case 'authorization': {
      const frames=[];
      if(has('E04')) {
        frames.push(show('E04','林舟说：“我是按维护申请搬的，你们可以去查。”他给的申请编号，我记在这张口述记录上了。','shuheng'));
        frames.push(line('ajing','取教授，那份申请当时能用吗？',['E04'],'shuheng'));
      }
      if(has('E07')) {
        frames.push(show('E07','早就不能用了。18:40 撤销的，你们看这个时间。我也查了其他申请，当晚没有别的批准。','ajing'));
        frames.push(line('wensheng','可他一问就让我们查这份申请。我还特意跟他确认过编号。',['E07'],'captain'));
      } else frames.push(line('shuheng',has('E04')?'我还没翻到那份申请。先别把他说的当成批准，等我查完。':'得先问问他，搬走东西是谁同意的。不然我也不知道该找哪份申请。'));
      return node('他说的批准',frames,[...(has('E07')?[choice('notice','他会不会不知道申请撤销了？')]:[]),choice('recovery','再确认月光石的下落')]);
    }
    case 'notice': return node('记录没有回答的事',[
      line('captain','申请撤销了，他会不会还不知道？'),
      line('shuheng','可能。这页写了撤销时间，没写何时通知他。批准已经无效了，他知不知道，还得再问。',['E07'],'captain'),
      line('wensheng','好，这个我记下。下次问他，不能又让他拿申请编号搪塞过去。',['E07'],'shuheng')
    ],[choice('recovery','先把已经查明的经过说清楚')]);
    case 'recovery': {
      const frames=[];
      if(has('E08')) {
        frames.push(show('E08','箱子找到了，在温室工作台下面。我打开看过，月光石就在里面。','wensheng'));
        frames.push(line('wensheng','那就好。刚才听你说看不清箱子，我还担心要找一晚上。',['E08'],'ajing'));
      } else {
        frames.push(line('ajing',has('E02')?'箱子往温室去了，但我还没去开箱。先留着这一步，别算找着了。':'东西还没找到。人可以继续问，月光石也得接着找。',has('E02')?['E02']:[],'captain'));
      }
      return node('箱子里的东西',frames,[choice('summary','把几条线放到一起看')]);
    }
    case 'summary': {
      const ready=councilAssessment(council);
      const frames=[];
      if(ready.person)frames.push(line('ajing',has('E03')?'队长，我看是林舟。20:10 开柜时，那张卡正借在他手上。':'我看是林舟。刚开完柜，箱子就进了走廊，用的也是他领走的那辆车。',ready.person,'captain'));
      else frames.push(line('ajing','还差一点。谁拿过卡、谁用过车，总得有一条跟现场对得上。',[],'captain'));
      if(ready.place)frames.push(line('wensheng','而且东西确实在温室。刚才那段录像，没让我们白跑。',ready.place,'captain'));
      if(ready.authorization)frames.push(line('shuheng','申请的事我再说一句：18:40 就撤销了。不能把林舟那句“按申请搬的”，原样交给管家。',ready.authorization,'captain'));
      frames.push(line('captain',ready.complete?'该查的都对过了。取走月光石的人是……':'现在还说不准。再查一趟，大家别急着收东西。'));
      return node('队长的判断',frames,ready.complete ? [
        ...resolution[0].options.map(([id,label])=>choice('person:'+id,`我认为是${label.replace(' · ','（')}）`)),
        choice('leave','暂不定人，回现场再查')
      ] : [choice('leave','带着这些疑点继续调查')]);
    }
    case 'proposal': {
      const label=resolution[0].options.find(([id])=>id===council.proposal)?.[1];
      const refs=councilAssessment(council).person || [];
      const response=council.proposal==='lin'
        ? '嗯。我们查了这么一圈，卡和搬运的时间，最后都落在他身上。'
        : council.proposal==='xu' && has('E03')
          ? '等一下，队长。凭条上签收的是林舟，开柜那会儿卡还没还。你是不是只看了登记人？'
          : '怎么会是他？咱们刚才对的记录，连起来的是林舟。队长，你再想想。';
      return node('确认最终人选',[
        line('captain',`取走月光石的是${label.split(' · ')[0]}。`),
        line(council.proposal==='xu'&&has('E03')?'wensheng':'ajing',response,refs,'captain')
      ],[choice('confirm',`就这样，向管家交代 · 1 次行动`),choice('summary','等等，我再想想'),choice('leave','先不结案，回去调查')]);
    }
    default: throw new Error('案情会环节无法识别。');
  }
}

export function councilAssessment(council) {
  const refs=council.presented;
  const result=Object.fromEntries(resolution.map(rule=>[rule.key,rule.supports.find(group=>group.every(id=>refs.includes(id))) || null]));
  return {...result,complete:resolution.every(rule=>result[rule.key])};
}

export function councilConclusion(council) {
  const assessment=councilAssessment(council);
  if(!assessment.complete || !council.proposal)throw new Error('先听完材料讨论，再选择最终人选。');
  return {answers:{person:council.proposal,place:resolution[1].answer,authorization:resolution[2].answer},citations:[...new Set(resolution.flatMap(rule=>assessment[rule.key]))]};
}
