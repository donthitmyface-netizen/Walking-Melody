// ═══════════════════════════════════════════════════════════════
// data.js — 靜態資料、常數
// ═══════════════════════════════════════════════════════════════

// ── Firebase Config ──
const FB_CFG = {
  apiKey: "AIzaSyCNonPT0mdrzI9p8Qlh-iKbkqpJciJ64lQ",
  authDomain: "walking-melody.firebaseapp.com",
  projectId: "walking-melody",
  storageBucket: "walking-melody.firebasestorage.app",
  messagingSenderId: "906826621436",
  appId: "1:906826621436:web:96850e4bff2d470c7e5279"
};

// ── 評分維度 (17個子項) ──
const DIMS = [
  {key:'pitch',    label:'音準',    cat:'技術基礎'},
  {key:'rhythm',   label:'節奏',    cat:'技術基礎'},
  {key:'pulse',    label:'拍子',    cat:'技術基礎'},
  {key:'musical',  label:'音樂感',  cat:'音樂感受'},
  {key:'tone',     label:'音色',    cat:'音樂感受'},
  {key:'ear',      label:'聽力',    cat:'音樂感受'},
  {key:'sightread',label:'視奏',    cat:'視奏模仿'},
  {key:'imitate',  label:'模仿力',  cat:'視奏模仿'},
  {key:'creative', label:'創意',    cat:'創意記憶'},
  {key:'memory',   label:'記憶力',  cat:'創意記憶'},
  {key:'attitude', label:'態度',    cat:'體能動力'},
  {key:'motivation',label:'動力',   cat:'體能動力'},
  {key:'stamina',  label:'持久力',  cat:'體能動力'},
  {key:'power',    label:'力量',    cat:'體能動力'},
  {key:'physical', label:'身體機能',cat:'體能動力'},
  {key:'stage',    label:'舞台表現',cat:'演出環境'},
  {key:'family',   label:'家庭支援',cat:'演出環境', note:'含家庭財力、練習環境及家長配合'},
];

// ── 六維雷達軸 (由子項平均計算) ──
const AXES = [
  {key:'tech',  label:'技術基礎', dims:['pitch','rhythm','pulse'],                          color:'#9b2a1a'},
  {key:'music', label:'音樂感受', dims:['musical','tone','ear'],                            color:'#b8862a'},
  {key:'read',  label:'視奏模仿', dims:['sightread','imitate'],                             color:'#3d6b5a'},
  {key:'mind',  label:'創意記憶', dims:['creative','memory'],                               color:'#4a5e8a'},
  {key:'body',  label:'體能動力', dims:['attitude','motivation','stamina','power','physical'],color:'#7a4a8a'},
  {key:'stage', label:'演出環境', dims:['stage','family'],                                  color:'#8a6a2a'},
];

// ── 評級 ──
const GRADES = [
  {grade:'S', min:92, color:'#d4b840', desc:'卓越'},
  {grade:'A', min:80, color:'#3d6b5a', desc:'優秀'},
  {grade:'B', min:65, color:'#4a80c0', desc:'良好'},
  {grade:'C', min:50, color:'#8a7a62', desc:'一般'},
  {grade:'D', min:35, color:'#9b6030', desc:'待改進'},
  {grade:'F', min:0,  color:'#9b2a1a', desc:'需加強'},
];

// ── 考級資料庫 ──
const EXAMS = [
  {
    name:'ABRSM 英國皇家音樂學院',
    url:'https://www.abrsm.org',
    grades:'Grade 1–8 及各級文憑',
    note:'西洋古典音樂考級，香港最廣泛認可。每年多次考試，成績獲本地及海外院校承認。',
    src:'英國皇家音樂學院官方網站',
  },
  {
    name:'Trinity College London',
    url:'https://www.trinitycollege.com',
    grades:'Initial–Grade 8 及文憑級別',
    note:'英國著名考試機構，涵蓋古典、流行及當代曲目，樂理要求相對靈活。',
    src:'Trinity College London 官方網站',
  },
  {
    name:'Rockschool（RSL Awards）',
    url:'https://www.rslawards.com',
    grades:'Debut–Grade 8',
    note:'專注流行、搖滾、爵士風格，適合現代音樂及電子樂器學生。',
    src:'RSL Awards 官方網站',
  },
  {
    name:'中央音樂學院（北京）',
    url:'https://www.ccom.edu.cn',
    grades:'業餘考級 1–10 級',
    note:'中國最具權威的中西樂器考級體系，分級細緻，在中國大陸及香港廣泛認可。',
    src:'中央音樂學院官方網站',
  },
  {
    name:'人民音樂出版社（人音）',
    url:'http://www.rccm.com.cn',
    grades:'1–10 級',
    note:'普及型考級，適合普通學校教學體系，教材與考試體系完整。',
    src:'人民音樂出版社官方網站',
  },
  {
    name:'香港中國音樂考級協會',
    url:'https://www.hkcgea.org',
    grades:'1–10 級',
    note:'香港本地中樂考級機構，專為中樂學生設計，在香港本地受認可。',
    src:'香港中國音樂考級協會官方網站',
  },
];

// ── 名師傳承資料 ──
const LINEAGE = {
  guqin: {
    label: '古琴',
    color: '#9b2a1a',
    masters: [
      {
        name: '管平湖',
        years: '1897–1967',
        sect: '諸派融通',
        school: '中央音樂學院',
        desc: '二十世紀最重要的古琴演奏家之一。師承楊宗稷、葉詩夢等名家，精通九嶷、廣陵諸派。1956年參與全國古琴曲搶救錄音，留下大量珍貴錄音，《廣陵散》錄音尤為著名。',
        yt: 'https://www.youtube.com/results?search_query=管平湖+古琴',
        src: '維基百科（zh.wikipedia.org/wiki/管平湖）',
      },
      {
        name: '查阜西',
        years: '1895–1976',
        sect: '諸派融通',
        school: '中國音樂家協會、民族音樂研究所',
        desc: '二十世紀最重要的古琴組織者與學者。主持1950年代全國古琴普查，建立現代琴學學術體系，推動古琴進入高等音樂院校，對古琴傳承貢獻深遠。',
        yt: 'https://www.youtube.com/results?search_query=查阜西+古琴',
        src: '維基百科（zh.wikipedia.org/wiki/查阜西）',
      },
      {
        name: '吳景略',
        years: '1907–1987',
        sect: '虞山派',
        school: '中央音樂學院',
        desc: '虞山派代表人物，曾任中央音樂學院古琴教授。演奏風格典雅細膩，對虞山派的現代傳承影響深遠，培育大量門人。',
        yt: 'https://www.youtube.com/results?search_query=吳景略+古琴',
        src: '維基百科（zh.wikipedia.org/wiki/吳景略）',
      },
      {
        name: '龔一',
        years: '1941–',
        sect: '梅庵派',
        school: '上海音樂學院',
        desc: '上海音樂學院古琴教授，師承劉景韶、張正吟。演奏兼融多派，著有多部古琴理論著作，錄製大量唱片，是當代重要的古琴演奏家與教育家。',
        yt: 'https://www.youtube.com/results?search_query=龔一+古琴',
        src: '維基百科（zh.wikipedia.org/wiki/龔一）',
      },
      {
        name: '李祥霆',
        years: '1940–',
        sect: '諸派融通',
        school: '中央音樂學院',
        desc: '中央音樂學院古琴教授，師承查阜西、吳景略。曾赴英國劍橋大學研究，是將古琴帶入國際視野的重要人物，亦以即興演奏著稱。',
        yt: 'https://www.youtube.com/results?search_query=李祥霆+古琴',
        src: '中央音樂學院官方網站（ccom.edu.cn）；維基百科（zh.wikipedia.org/wiki/李祥霆）',
      },
      {
        name: '戴曉蓮',
        years: '1965–',
        sect: '廣陵派',
        school: '上海音樂學院',
        desc: '上海音樂學院古琴教授，師承吳兆基（廣陵派傳人）。曾赴英國深造，融合學術研究與演奏實踐，是廣陵派的當代重要傳人。',
        yt: 'https://www.youtube.com/results?search_query=戴曉蓮+古琴',
        src: '上海音樂學院官方網站（shcmuseum.com）；維基百科',
      },
    ],
  },

  guzheng: {
    label: '古箏',
    color: '#b8862a',
    masters: [
      {
        name: '娄树华',
        years: '1907–1952',
        sect: '河南箏派',
        school: '北京',
        desc: '師承魏子猷（河南箏派）。《漁舟唱晚》為其最著名改編作品，惟此曲著作權長期存在爭議（一說源自金灼南）。其演奏對河南箏派的推廣有重要貢獻，惜英年早逝。',
        yt: 'https://www.youtube.com/results?search_query=漁舟唱晚+古箏',
        src: '維基百科《漁舟唱晚》條目（zh.wikipedia.org/wiki/漁舟唱晚）；中國古箏網',
      },
      {
        name: '曹東扶',
        years: '1898–1970',
        sect: '河南箏派',
        school: '河南省歌舞劇院',
        desc: '河南箏派重要傳人，演奏以豪放有力著稱，對河南流派的技法整理與傳授貢獻卓著，影響深遠。',
        yt: 'https://www.youtube.com/results?search_query=曹東扶+古箏',
        src: '維基百科（zh.wikipedia.org/wiki/曹東扶）',
      },
      {
        name: '曹正',
        years: '1920–1998',
        sect: '諸派融通',
        school: '中央音樂學院',
        desc: '師承娄树华，後赴中央音樂學院任教。制定統一的箏樂指法符號系統，出版系統性教材，為古箏教學的規範化作出奠基貢獻。',
        yt: 'https://www.youtube.com/results?search_query=曹正+古箏',
        src: '維基百科（zh.wikipedia.org/wiki/曹正_(音乐家)）',
      },
      {
        name: '王中山',
        years: '1968–',
        sect: '現代箏派',
        school: '中央音樂學院',
        desc: '中央音樂學院古箏教授。以左手搖指、雙手輪奏等創新技法著稱，大幅擴展古箏演奏技術範疇，是當代最具影響力的古箏演奏家之一。',
        yt: 'https://www.youtube.com/results?search_query=王中山+古箏',
        src: '維基百科（zh.wikipedia.org/wiki/王中山_(古筝演奏家)）',
      },
      {
        name: '袁莎',
        years: '1978–',
        sect: '現代箏派',
        school: '中央音樂學院',
        desc: '中央音樂學院古箏副教授，師承李婉芬。演奏技術精湛，教學成果豐碩，並積極推動古箏的普及教育，培育大量優秀學生。',
        yt: 'https://www.youtube.com/results?search_query=袁莎+古箏',
        src: '中央音樂學院官方網站（ccom.edu.cn）',
      },
    ],
  },

  pipa: {
    label: '琵琶',
    color: '#3d6b5a',
    masters: [
      {
        name: '劉德海',
        years: '1937–2020',
        sect: '現代浦東派',
        school: '中央音樂學院',
        desc: '中央音樂學院琵琶教授，創作並演奏大量現代琵琶曲，包括著名的《天鵝》系列。拓展琵琶技法與音樂表達範疇，是二十世紀最重要的琵琶演奏家與作曲家。',
        yt: 'https://www.youtube.com/results?search_query=劉德海+琵琶',
        src: '維基百科（zh.wikipedia.org/wiki/刘德海）',
      },
      {
        name: '吳蠻',
        years: '1963–',
        sect: '現代浦東派',
        school: '中央音樂學院（畢業）',
        desc: '師承劉德海，中央音樂學院畢業後旅居美國，與馬友友「絲路計劃」長期合作，是將琵琶推向國際樂壇的最重要人物之一。',
        yt: 'https://www.youtube.com/results?search_query=吳蠻+琵琶',
        src: '維基百科（zh.wikipedia.org/wiki/吳蠻）；個人官網（wumanpipa.com）',
      },
      {
        name: '章紅艷',
        years: '1969–',
        sect: '諸派融通',
        school: '中央音樂學院',
        desc: '中央音樂學院琵琶教授，演奏風格兼融古典與現代，同時積極推動跨文化音樂合作及琵琶的國際推廣。',
        yt: 'https://www.youtube.com/results?search_query=章紅艷+琵琶',
        src: '中央音樂學院官方網站（ccom.edu.cn）',
      },
    ],
  },

  dizi: {
    label: '笛子',
    color: '#4a5e8a',
    masters: [
      {
        name: '馮子存',
        years: '1904–1994',
        sect: '北派笛',
        school: '中央歌舞團',
        desc: '北派笛代表人物，以《喜相逢》《放風箏》等曲著名，演奏風格高亢豪放，花舌、吐音技法精湛，奠定北派笛的現代技術標準。',
        yt: 'https://www.youtube.com/results?search_query=馮子存+笛子',
        src: '維基百科（zh.wikipedia.org/wiki/馮子存）',
      },
      {
        name: '陸春齡',
        years: '1921–2018',
        sect: '南派笛',
        school: '上海音樂學院',
        desc: '南派笛代表人物，以《今昔》《鷓鴣飛》等曲著名，演奏風格柔美細膩，是南派曲笛藝術的最重要傳承人，享壽九十八歲。',
        yt: 'https://www.youtube.com/results?search_query=陸春齡+笛子',
        src: '維基百科（zh.wikipedia.org/wiki/陸春齡）',
      },
      {
        name: '趙松庭',
        years: '1924–2001',
        sect: '浙江笛派',
        school: '浙江省歌舞劇院',
        desc: '浙江笛派創始人之一，發展了顫音、疊音等細膩表達技法，著有《笛藝春秋》等重要理論著作，對笛學理論體系的建立貢獻卓著。',
        yt: 'https://www.youtube.com/results?search_query=趙松庭+笛子',
        src: '維基百科（zh.wikipedia.org/wiki/趙松庭）',
      },
      {
        name: '張維良',
        years: '1957–',
        sect: '現代笛派',
        school: '中央音樂學院',
        desc: '中央音樂學院笛子教授，師承趙松庭。演奏兼融南北各派，大量委約及演奏現代笛子作品，積極拓展笛子的現代音樂表達空間。',
        yt: 'https://www.youtube.com/results?search_query=張維良+笛子',
        src: '中央音樂學院官方網站（ccom.edu.cn）',
      },
    ],
  },

  suona: {
    label: '嗩吶',
    color: '#7a4a8a',
    masters: [
      {
        name: '任同祥',
        years: '1927–',
        sect: '山東嗩吶',
        school: '山東省文化系統',
        desc: '山東濟寧人，1953年布加勒斯特第四屆世界青年聯歡節獲銀質獎章。整理改編《百鳥朝鳳》現代演奏版本，使此曲成為嗩吶最具代表性的標誌曲目之一。',
        yt: 'https://www.youtube.com/results?search_query=任同祥+嗩吶',
        src: '中國音樂家協會資料；布加勒斯特世青節歷史紀錄',
      },
      {
        name: '劉英',
        years: '1963–',
        sect: '現代嗩吶',
        school: '上海音樂學院',
        desc: '男，安徽肥西人，上海音樂學院教授、副院長。被譽為「中國現代嗩吶第一人」，大幅拓展嗩吶的現代演奏技法與音樂表達範疇，委約及演奏大量現代作品。',
        yt: 'https://www.youtube.com/results?search_query=劉英+嗩吶',
        src: '上海音樂學院官方網站（shcmuseum.com）；維基百科（zh.wikipedia.org/wiki/刘英_(唢呐)）',
      },
      {
        name: '郭雅志',
        years: '1966–',
        sect: '香港·現代嗩吶',
        school: '香港中樂團',
        desc: '山西人，1993年發明活芯嗩吶，可演奏半音音階，大幅提升嗩吶的音樂表現力。1999年起擔任香港中樂團嗩吶首席，積極推動嗩吶的現代化發展。',
        yt: 'https://www.youtube.com/results?search_query=郭雅志+嗩吶',
        src: '香港中樂團官方網站（hkco.org）；香港中樂團節目冊',
      },
      {
        name: '劉雯雯',
        years: '1990年代–',
        sect: '現代嗩吶',
        school: '上海音樂學院',
        desc: '上海音樂學院劉英教授學生，2020年成為中國首位取得嗩吶演奏方向博士學位的演奏家（上海音樂學院），代表嗩吶學術地位的重大提升。',
        yt: 'https://www.youtube.com/results?search_query=劉雯雯+嗩吶',
        src: '上海音樂學院官方網站（shcmuseum.com）',
      },
    ],
  },

  hk: {
    label: '香港',
    color: '#8a6a2a',
    masters: [
      {
        name: '閻惠昌',
        years: '1955–',
        sect: '指揮·藝術總監',
        school: '香港中樂團',
        desc: '現任香港中樂團藝術總監及首席指揮，任職逾二十年。帶領香港中樂團躋身國際一流中樂團行列，委約大量香港及國際作曲家新作，推動中樂創作現代化。',
        yt: 'https://www.youtube.com/results?search_query=閻惠昌+香港中樂團',
        src: '香港中樂團官方網站（hkco.org）',
      },
      {
        name: '余其偉',
        years: '1951–',
        sect: '廣東音樂·高胡',
        school: '星海音樂學院',
        desc: '廣東音樂及高胡演奏家，廣州星海音樂學院教授。以廣東音樂風格演奏著稱，對廣東音樂的學術研究與傳承貢獻卓著，著有多部廣東音樂理論著作。',
        yt: 'https://www.youtube.com/results?search_query=余其偉+高胡',
        src: '維基百科（zh.wikipedia.org/wiki/余其偉）',
      },
      {
        name: '黃安源',
        years: '1945–',
        sect: '二胡·廣東音樂',
        school: '香港中樂團（原首席）',
        desc: '香港著名二胡演奏家，曾任香港中樂團二胡首席多年。演奏風格融合廣東音樂傳統與現代技法，錄製大量唱片，對香港中樂發展貢獻深遠。',
        yt: 'https://www.youtube.com/results?search_query=黃安源+二胡',
        src: '香港中樂團節目冊及歷史資料',
      },
    ],
  },
};

// ── 樂器列表 ──
const INSTRUMENTS = {
  '西洋樂器': ['鋼琴','小提琴','大提琴','結他','長笛','雙簧管','單簧管','聲樂'],
  '中國樂器': ['二胡','琵琶','古琴','古箏','笛子 / 簫','揚琴','中阮 / 大阮','中胡','板胡','三弦','嗩吶','中國敲擊'],
  '其他':     ['敲擊樂','其他'],
};

// ── 程度選項 ──
const LEVELS = ['初級','中級','高級','考級準備','專業進修'];

// ── 評分輔助 ──
function getGrade(v) {
  return GRADES.find(g => v >= g.min) || GRADES[GRADES.length - 1];
}
function axisVal(sc, ax) {
  const vals = ax.dims.map(k => sc[k] || 5);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function calcOverall(sc) {
  return Math.round(DIMS.map(d => sc[d.key] || 5).reduce((a, b) => a + b, 0) / DIMS.length * 10);
}

// ── 日期輔助 ──
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthISO(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}
