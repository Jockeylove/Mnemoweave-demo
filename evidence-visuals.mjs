import { evidence } from './case.mjs';

const rows = entries => `<dl>${entries.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
const documents = {
  E01: () => `<div class="document-time">20:10</div>${rows([['事件','刷卡开启展柜'],['通行卡','K17'],['重量变化','减少 · 与月光石及包装重量相符']])}`,
  E03: () => rows([['借用人','林舟'],['原持卡人','许禾'],['卡号','K17'],['签收 → 归还','19:50 → 20:25'],['中途转借','无记录']]),
  E04: () => `<blockquote>“我是按维护申请搬的，<br>你们可以去查。”</blockquote>${rows([['陈述人','林舟'],['提供的申请编号','P32']])}<span class="document-stamp pending-stamp">当事人说法 · 待核实</span>`,
  E05: () => rows([['通行卡','K17'],['登记持卡人','许禾'],['职务','园丁']])+`<p class="document-caution">登记人不等于案发时的实际持卡人。</p>`,
  E06: () => rows([['器材','手推车'],['编号','T2'],['领用人','林舟'],['使用时段','19:55 → 20:20']]),
  E07: () => `${rows([['维护申请','P32'],['撤销时间','18:40'],['当晚其他批准','无可替代批准']])}<span class="document-stamp">已撤销</span>`,
};
function video() {
  return `<div class="camera-frame" role="img" aria-label="通道记录示意：20:12，编号 T2 的手推车载箱前往温室，无法辨认推车人脸部"><div class="camera-clock">20:12 <span>通道摄像头 / 记录示意</span></div><svg viewBox="0 0 640 210" aria-hidden="true"><path d="M0 180 170 70H640M0 35 170 70V0M170 70V155L0 210M170 155H640" fill="none" stroke="#829b96" stroke-width="2" opacity=".45"/><path d="M230 160H410V151H265V92H247V160" fill="none" stroke="#afc1b7" stroke-width="7"/><path d="M280 87 363 76 399 91V147H280Z" fill="#9fa391" stroke="#c9cbb5" stroke-width="2"/><path d="m280 87 35 15 84-11M315 102v45M350 78l-34 24" fill="none" stroke="#5e6e63" stroke-width="2"/><circle cx="281" cy="172" r="11" fill="#151e21" stroke="#93a39a" stroke-width="4"/><circle cx="386" cy="172" r="11" fill="#151e21" stroke="#93a39a" stroke-width="4"/><path d="M470 145H560l-18-14m18 14-18 14" fill="none" stroke="#c2cfbd" stroke-width="3"/></svg><div class="camera-caption"><strong>车身编号 T2</strong><span>运往温室 →</span></div></div><p class="visual-note">运输箱外观一致；推车人的脸无法辨认。依据已取得记录绘制，非原始监控影像。</p>`;
}
function recovery() {
  return `<div class="recovery-frame" role="img" aria-label="发现位置示意：温室工作台下的运输箱内有月光石"><svg viewBox="0 0 640 260" aria-hidden="true"><defs><radialGradient id="stone-light"><stop stop-color="#e4f2de"/><stop offset="1" stop-color="#88b7b2"/></radialGradient></defs><path d="M65 55H570V77H65ZM88 77V242M545 77V242" fill="#64685a" stroke="#9eaa96" stroke-width="7"/><path d="M229 138 360 120 411 150V228H229Z" fill="#6d7667" stroke="#c3bf9f" stroke-width="3"/><path d="m229 138 44 33 138-21M273 171v57M229 138l-27-40 131-20 27 42" fill="none" stroke="#b0b49d" stroke-width="3"/><path d="m302 136 25-20 28 11 9 22-29 14-30-9Z" fill="url(#stone-light)" stroke="#e2e9cf" stroke-width="2"/><path d="M440 180H500" stroke="#d4c097" stroke-width="2"/></svg><div class="camera-caption"><strong>温室 · 工作台下</strong><span>运输箱内 / 月光石</span></div></div><p class="visual-note">发现位置与物品关系示意，依据阿镜的实地调查记录整理。</p>`;
}
export function materialView(ids) {
  return `<div class="material-documents ${ids.length === 1 ? 'single' : ''}">${ids.map(id=>{
    const item = evidence[id];
    return `<figure class="material ${id === 'E02' || id === 'E08' ? 'visual-material' : 'paper-material'}" data-material="${id}"><figcaption>${item.title}<span>${item.label}</span></figcaption>${id === 'E02' ? video() : id === 'E08' ? recovery() : documents[id]()}${documents[id] ? '<small class="paper-note">根据已取得材料整理的记录示意</small>' : ''}</figure>`;
  }).join('')}</div>`;
}
