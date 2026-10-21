// Art placement and flavour text only. Evidence and action rules live in case.mjs.
export const rooms = {
  hall: {
    name: '展厅', area: '山庄东翼', companion: 'ajing', image: 'hall-2d-v2.webp',
    mood: '展柜没有破损。月光石是怎样离开的？',
    rain: [0, 0, 36, 52], lamp: [86, 30],
    hotspots: [
      { id: 'case-spot', title: '空展柜', x: 36, y: 61, action: 'inspect', crop: [37,79], text: '玻璃上没有裂纹，锁也没有被撬动。深色衬垫上，只剩下月光石曾经压过的凹痕。柜体保存着开启与称重记录。' },
      { id: 'monitor-spot', title: '录像设备', x: 83, y: 48, action: 'footage', crop: [100,50], text: '屏幕映着通向温室的长廊。录像还存着。阿镜拉过一把椅子，等着你开口。' },
      { id: 'passage-spot', title: '温室通道', x: 58, y: 43, destination: 'garden' }
    ]
  },
  archive: {
    name: '档案室', area: '山庄西翼', companion: 'shuheng', image: 'archive-2d-v2.webp',
    mood: '台灯亮着，取教授手里的登记册翻过了一页。',
    rain: [0,0,18,50], lamp: [11,28],
    hotspots: [
      { id: 'registry-spot', title: '通行卡登记册', x: 33, y: 55, action: 'registry', crop: [26,63], text: '取教授翻开登记册，手指沿着卡号那一栏往下找。每张卡的后面，都写着一个名字。' },
      { id: 'permit-spot', title: '维护申请档案', x: 85, y: 59, action: 'permit', crop: [100,60], text: '边柜上放着几叠维护申请，批复夹在各自的文件后。拿到申请编号，就能请取教授查对应那份。' },
      { id: 'archive-exit', title: '返回展厅', x: 67, y: 44, destination: 'hall' }
    ]
  },
  duty: {
    name: '值班室', area: '山庄内院', companion: 'wensheng', image: 'duty-2d-v2.webp',
    mood: '林舟坐在桌边，手旁放着一张凭条。',
    rain: [0,0,39,48], lamp: [48,27],
    hotspots: [
      { id: 'interview-spot', title: '林舟与借用凭条', x: 69, y: 46, action: 'interview', crop: [73,52], text: '你们走近时，林舟把凭条往桌子中间推了推。闻声已经准备好记笔记，可以开始问话了。' },
      { id: 'recover-spot', title: '签收凭据', x: 56, y: 57, action: 'recover', crop: [60,60], text: '借用凭条仍在桌上。若需要重新调取，可以请闻声再核对一次；已经收到的副本可直接在手记中阅读。' },
      { id: 'duty-exit', title: '返回展厅', x: 89, y: 34, destination: 'hall' }
    ]
  },
  equipment: {
    name: '器材间', area: '山庄后院', companion: 'shuheng', image: 'equipment-2d-v2.webp',
    mood: '推车停在工具架旁，登记册还摊在桌上。',
    rain: [2,0,18,35], lamp: [76,22],
    hotspots: [
      { id: 'trolley-spot', title: '手推车与领用册', x: 27, y: 70, action: 'trolley', crop: [13,80], text: '旧手推车停在工具架旁，台面已经空了。要知道是谁用过录像中的那辆车，需要把车身编号与领用册对上。' },
      { id: 'ledger-spot', title: '领用登记台', x: 82, y: 53, action: 'trolley', crop: [100,54], text: '每件工具的领用时间都记在册上。先告诉取教授要追查哪辆车，他才能找到对应的签领记录。' },
      { id: 'equipment-exit', title: '返回展厅', x: 56, y: 43, destination: 'hall' }
    ]
  },
  garden: {
    name: '温室', area: '山庄北侧', companion: 'ajing', image: 'garden-2d-v2.webp',
    mood: '雨水遮住了玻璃。植物架后，还有没看见的角落。',
    rain: [0,0,100,57], lamp: [74,19],
    hotspots: [
      { id: 'search-spot', title: '植物架与工作台', x: 76, y: 64, action: 'search', crop: [97,68], text: '花盆和遮盖物挡住了工作台底下，最里面黑着。叫阿镜过来，一起把这一带翻找一遍。' },
      { id: 'garden-exit', title: '返回展厅', x: 36, y: 42, destination: 'hall' }
    ]
  }
};
export const roomImage = id => `./assets/scenes/${rooms[id].image}`;
