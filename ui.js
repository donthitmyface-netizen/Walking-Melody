// ═══════════════════════════════════════════════════════════════
// ui.js — 導航、彈窗、通知列、共用 UI 工具
// ═══════════════════════════════════════════════════════════════

// ── 頁面導航 ──
const PAGE_TITLES = {
  dash:      '總覽',
  timetable: '時間表',
  students:  '學生管理',
  detail:    '',
  income:    '收入管理',
  lineage:   '名師傳承',
  exam:      '考級資料庫',
  ref:       '教學參考',
  settings:  '設定',
};

function goPage(p) {
  UI.prevPage = UI.page;
  UI.page = p;

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(el => el.classList.remove('on'));

  const pg = document.getElementById('pg-' + p);
  if (pg) pg.classList.add('active');

  const nb = document.querySelector(`.ni[data-p="${p}"]`);
  if (nb) nb.classList.add('on');

  document.getElementById('hdrTitle').textContent = PAGE_TITLES[p] || '履音';
  document.getElementById('hdrBtn').style.display = 'none';
  document.getElementById('main').scrollTop = 0;

  // 按頁面渲染
  const renders = {
    dash:      renderDash,
    timetable: renderCal,
    income:    renderIncome,
    lineage:   renderLineage,
    exam:      renderExam,
    ref:       renderRef,
    settings:  renderSettings,
  };
  if (renders[p]) renders[p]();
  else if (p === 'students') { renderSchChips(); renderStudents(); }
}

function openDetail(sid) {
  UI.prevPage = UI.page;
  UI.detailSid = sid;
  UI.detailTab = 'records';
  UI.page = 'detail';

  const s = DB.students.find(x => x.id === sid);
  if (!s) return;

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(el => el.classList.remove('on'));
  document.getElementById('pg-detail').classList.add('active');

  const sch = DB.schools.find(x => x.id === s.schoolId);
  document.getElementById('dtAv').textContent = s.name[0];
  document.getElementById('dtName').textContent = s.name;
  document.getElementById('dtSub').textContent =
    [s.instrument, s.level, sch ? sch.name : null].filter(Boolean).join(' · ');

  document.getElementById('hdrTitle').textContent = s.name;

  // 頭部按鈕：新增記錄
  const hb = document.getElementById('hdrBtn');
  hb.textContent = '＋記錄';
  hb.onclick = () => openModalRecord(sid);
  hb.style.display = 'block';

  renderDetailTabs();
  renderDetailBody();
}

function backPage() {
  const prev = UI.prevPage || 'students';
  goPage(prev === 'detail' ? 'students' : prev);
}

// ── 彈窗 ──
function openMo(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById(id).scrollTop = 0;
}
function closeMo(id) {
  document.getElementById(id).classList.remove('open');
}
function overlayTap(e, id) {
  if (e.target.id === id) closeMo(id);
}

// ── 通知橫幅 ──
let _banTimer = null;
function showBan(msg, isErr = false) {
  const el = document.getElementById('ban');
  el.textContent = msg;
  el.className = 'ban show ' + (isErr ? 'err' : 'ok');
  clearTimeout(_banTimer);
  _banTimer = setTimeout(() => { el.className = 'ban'; }, 2800);
}

// ── 詳情分頁 ──
const DETAIL_TABS = [
  { id:'records', label:'課堂記錄' },
  { id:'plans',   label:'教案計劃' },
  { id:'profile', label:'學生資料' },
  { id:'fees',    label:'學費出席' },
  { id:'scores',  label:'能力評分' },
];

function renderDetailTabs() {
  document.getElementById('dtTabs').innerHTML = DETAIL_TABS.map(t => `
    <button class="tb${UI.detailTab === t.id ? ' on' : ''}"
      onclick="switchTab('${t.id}')">${t.label}</button>
  `).join('');
}

function switchTab(tab) {
  UI.detailTab = tab;
  renderDetailTabs();
  renderDetailBody();
}

function renderDetailBody() {
  const sid = UI.detailSid;
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  const el = document.getElementById('dtBody');
  switch (UI.detailTab) {
    case 'records': el.innerHTML = renderTabRecords(s); break;
    case 'plans':   el.innerHTML = renderTabPlans(s);   break;
    case 'profile': el.innerHTML = renderTabProfile(s); break;
    case 'fees':    el.innerHTML = renderTabFees(s);    break;
    case 'scores':  el.innerHTML = renderTabScores(s);  break;
  }
}

// ── 共用渲染工具 ──
function emptyState(char, text) {
  return `<div class="empty"><div class="ec">${char}</div><div class="et">${text}</div></div>`;
}

function infoRow(label, val) {
  if (!val) return '';
  return `<div class="row"><div class="rl">${label}</div><div class="rv">${val}</div></div>`;
}

function infoCard(title, rows) {
  const content = rows.filter(Boolean).join('');
  if (!content) return '';
  return `<div class="card gold" style="margin-bottom:8px">
    <div style="font-size:.6rem;color:var(--gold2);letter-spacing:.1em;margin-bottom:7px">${title}</div>
    ${content}
  </div>`;
}

// ── 按鈕狀態 ──
function setBtnLoading(id, text) {
  const el = document.getElementById(id);
  if (el) { el.disabled = true; el.textContent = text; }
}
function setBtnDone(id, text) {
  const el = document.getElementById(id);
  if (el) { el.disabled = false; el.textContent = text; }
}
