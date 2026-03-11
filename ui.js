// ═══════════════════════════════════════════════════════════════
// ui.js — 導航、彈窗、通知列、共用 UI 工具
// ═══════════════════════════════════════════════════════════════

const PAGE_TITLES = {
  dash:      '總覽',
  timetable: '時間表',
  students:  '學生管理',
  detail:    '',
  income:    '收入管理',
  tasks:     '任務派發',
  exam:      '考級資料庫',
  ref:       '教學參考',
  settings:  '設定',
};

// ── 身份對應可見頁面 ──
const TEACHER_PAGES = new Set(['dash','timetable','students','detail','income','tasks','ref','exam','settings']);
const STUDENT_PAGES = new Set(['mytasks','contact','settings']);
const PARENT_PAGES  = new Set(['mytasks','contact','settings']);

function canSeePage(p) {
  if (!USER_ROLE || USER_ROLE === 'teacher') return TEACHER_PAGES.has(p);
  if (USER_ROLE === 'student') return STUDENT_PAGES.has(p);
  if (USER_ROLE === 'parent')  return PARENT_PAGES.has(p);
  return false;
}

// ── 更新 nav 按鈕高亮 ──
function updateNav(p) {
  const isTeacher = !USER_ROLE || USER_ROLE === 'teacher';
  // Teacher-only nav items
  const teacherOnly  = new Set(['dash','timetable','students','income','tasks']);
  // Student/parent nav items (hidden by default in HTML)
  const studentOnly  = new Set(['mytasks','contact']);

  document.querySelectorAll('.ni').forEach(el => {
    el.classList.toggle('on', el.dataset.p === p);
    if (studentOnly.has(el.dataset.p)) {
      el.style.display = isTeacher ? 'none' : '';
    } else if (teacherOnly.has(el.dataset.p)) {
      el.style.display = isTeacher ? '' : 'none';
    }
    // 'settings' is always visible
  });
}

function goPage(p) {
  UI.prevPage = UI.page;
  UI.page = p;

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('pg-' + p);
  if (pg) pg.classList.add('active');

  updateNav(p);

  document.getElementById('hdrTitle').textContent = PAGE_TITLES[p] || '履音';
  document.getElementById('hdrBtn').style.display = 'none';
  document.getElementById('main').scrollTop = 0;

  const renders = {
    dash:      renderDash,
    timetable: renderCal,
    income:    renderIncome,
    tasks:     renderTasks,
    ref:       renderRef,
    exam:      renderExam,
    settings:  renderSettings,
    mytasks:   renderMyTasks,
    contact:   renderContact,
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
  updateNav('detail');
  document.getElementById('pg-detail').classList.add('active');

  const sch = DB.schools.find(x => x.id === s.schoolId);
  document.getElementById('dtAv').textContent = s.name[0];
  document.getElementById('dtName').textContent = s.name;
  document.getElementById('dtSub').textContent =
    [s.instrument, s.level, sch ? sch.name : null].filter(Boolean).join(' · ');
  document.getElementById('hdrTitle').textContent = s.name;

  const hb = document.getElementById('hdrBtn');
  hb.textContent = '＋記錄'; hb.onclick = () => openModalRecord(sid); hb.style.display = 'block';

  renderDetailTabs(); renderDetailBody();
}

function backPage() {
  const prev = UI.prevPage || 'students';
  goPage(prev === 'detail' ? 'students' : prev);
}

// ── 彈窗 ──
function openMo(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.scrollTop = 0; }
}
function closeMo(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function overlayTap(e, id) { if (e.target.id === id) closeMo(id); }

// ── 通知橫幅 ──
let _banTimer = null;
function showBan(msg, isErr = false) {
  const el = document.getElementById('ban');
  el.textContent = msg;
  el.className = 'ban show ' + (isErr ? 'err' : 'ok');
  clearTimeout(_banTimer);
  _banTimer = setTimeout(() => { el.className = 'ban'; }, 2800);
}

// ── 詳情分頁（老師可見全部，學生/家長不可進入詳情頁） ──
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
  UI.detailTab = tab; renderDetailTabs(); renderDetailBody();
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
  const el = document.getElementById(id); if (el) { el.disabled = true; el.textContent = text; }
}
function setBtnDone(id, text) {
  const el = document.getElementById(id); if (el) { el.disabled = false; el.textContent = text; }
}

// ── Privacy masking helper ──
function masked(val) { return '●●●●'; }
