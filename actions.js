// ═══════════════════════════════════════════════════════════════
// actions.js — 所有表單 CRUD 操作
// ═══════════════════════════════════════════════════════════════

// ── 學生 ──
function openModalStudent(editSid = null) {
  UI.editSid = editSid;
  document.getElementById('moStuTitle').textContent = editSid ? '編輯學生資料' : '新增學生';

  // Populate school select
  document.getElementById('sSchool').innerHTML =
    `<option value="">（無學校）</option>` +
    DB.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  // Fill instrument optgroups
  const instSel = document.getElementById('sInst');
  instSel.innerHTML = Object.entries(INSTRUMENTS).map(([grp, items]) =>
    `<optgroup label="${grp}">${items.map(v => `<option>${v}</option>`).join('')}</optgroup>`
  ).join('');

  // Fill level select
  document.getElementById('sLevel').innerHTML = LEVELS.map(l => `<option>${l}</option>`).join('');

  const s = editSid ? DB.students.find(x => x.id === editSid) : null;
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };

  sv('sName', s?.name); sv('sNameEn', s?.nameEn); sv('sDob', s?.dob); sv('sGender', s?.gender);
  sv('sSchool', s?.schoolId); sv('sGrade', s?.schoolGrade);
  sv('sInst', s?.instrument || '鋼琴'); sv('sLevel', s?.level || '初級');
  sv('sYears', s?.yearsLearning); sv('sExam', s?.exam);
  sv('sParent', s?.parent); sv('sParentRel', s?.parentRel);
  sv('sPhone', s?.phone); sv('sEmail', s?.email);
  sv('sFee', s?.defaultFee); sv('sPayMethod', s?.payMethod);
  sv('sPersonality', s?.personality); sv('sBottleneck', s?.bottleneck);
  sv('sPrefs', s?.prefs); sv('sNote', s?.note);

  openMo('moStudent');
}

async function saveStudent() {
  const name = document.getElementById('sName').value.trim();
  if (!name) { showBan('請填寫學生姓名', true); return; }

  setBtnLoading('btnSaveStu', '儲存中…');
  const gv = id => (document.getElementById(id) || {}).value || '';
  const existing = UI.editSid ? DB.students.find(x => x.id === UI.editSid) : null;

  const s = {
    id: UI.editSid || newId(),
    name, nameEn: gv('sNameEn'), dob: gv('sDob'), gender: gv('sGender'),
    schoolId: gv('sSchool'), schoolGrade: gv('sGrade'),
    instrument: gv('sInst'), level: gv('sLevel'),
    yearsLearning: gv('sYears'), exam: gv('sExam'),
    parent: gv('sParent'), parentRel: gv('sParentRel'),
    phone: gv('sPhone'), email: gv('sEmail'),
    defaultFee: gv('sFee'), payMethod: gv('sPayMethod'),
    personality: gv('sPersonality'), bottleneck: gv('sBottleneck'),
    prefs: gv('sPrefs'), note: gv('sNote'),
    scores: existing?.scores || {},
    overallScore: existing?.overallScore ?? null,
    createdAt: existing?.createdAt || Date.now(),
  };

  const idx = DB.students.findIndex(x => x.id === s.id);
  if (idx >= 0) DB.students[idx] = s; else DB.students.push(s);

  saveLocal();
  await fbSave('students', s.id, s);
  closeMo('moStudent');
  setBtnDone('btnSaveStu', '儲存學生');
  UI.editSid = null;
  renderStudents(); renderSchChips(); renderDash();
  showBan(existing ? '學生資料已更新' : '學生已新增');
}

async function confirmDeleteStudent(sid) {
  if (!confirm('確定刪除此學生？所有課堂記錄、教案及收款記錄將一併刪除，此操作不可復原。')) return;
  if (!confirm('再次確認：刪除後無法復原，確定嗎？')) return;

  const delOps = [fbDel('students', sid)];
  ['records','lessons','payments','plans'].forEach(coll => {
    DB[coll].filter(x => x.studentId === sid).forEach(x => delOps.push(fbDel(coll, x.id)));
  });
  await Promise.all(delOps);

  DB.students  = DB.students.filter(x => x.id !== sid);
  DB.records   = DB.records.filter(x => x.studentId !== sid);
  DB.lessons   = DB.lessons.filter(x => x.studentId !== sid);
  DB.payments  = DB.payments.filter(x => x.studentId !== sid);
  DB.plans     = DB.plans.filter(x => x.studentId !== sid);

  saveLocal();
  goPage('students');
  showBan('學生已刪除');
}

// ── 課堂記錄 ──
let _recordSid = null;
function openModalRecord(sid) {
  _recordSid = sid;
  document.getElementById('rDate').value = todayISO();
  ['rContent','rPiece','rHw'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('rAttend').value = 'present';
  document.getElementById('rRating').value = '3';
  openMo('moRecord');
}

async function saveRecord() {
  const content = document.getElementById('rContent').value.trim();
  if (!content) { showBan('請填寫課堂內容', true); return; }

  setBtnLoading('btnSaveRec', '記錄中…');
  const r = {
    id: newId(), studentId: _recordSid,
    date:    document.getElementById('rDate').value,
    attend:  document.getElementById('rAttend').value,
    content,
    piece:   document.getElementById('rPiece').value.trim(),
    rating:  document.getElementById('rRating').value,
    hw:      document.getElementById('rHw').value.trim(),
    createdAt: Date.now(),
  };
  DB.records.push(r);
  saveLocal();
  await fbSave('records', r.id, r);
  closeMo('moRecord');
  setBtnDone('btnSaveRec', '記錄入冊');
  if (UI.page === 'detail') renderDetailBody();
  renderDash();
  showBan('記錄已入冊');
}

// ── 教案 ──
let _planSid = null;
function openModalPlan(sid) {
  _planSid = sid;
  document.getElementById('pDate').value = todayISO();
  ['pGoal','pPlan','pRecord','pPiece','pHw'].forEach(id => document.getElementById(id).value = '');
  openMo('moPlan');
}

async function savePlan() {
  setBtnLoading('btnSavePlan', '儲存中…');
  const p = {
    id: newId(), studentId: _planSid,
    date:   document.getElementById('pDate').value,
    goal:   document.getElementById('pGoal').value.trim(),
    plan:   document.getElementById('pPlan').value.trim(),
    record: document.getElementById('pRecord').value.trim(),
    piece:  document.getElementById('pPiece').value.trim(),
    hw:     document.getElementById('pHw').value.trim(),
    createdAt: Date.now(),
  };
  DB.plans.push(p);
  saveLocal();
  await fbSave('plans', p.id, p);
  closeMo('moPlan');
  setBtnDone('btnSavePlan', '儲存教案');
  if (UI.page === 'detail') renderDetailBody();
  showBan('教案已儲存');
}

// ── 課堂時間表 ──
function openModalLesson(presetDate = null) {
  // Populate student select
  document.getElementById('lStu').innerHTML =
    DB.students.length
      ? DB.students.map(s => `<option value="${s.id}">${s.name}（${s.instrument || '—'}）</option>`).join('')
      : '<option value="">（尚未有學生）</option>';

  // Populate group select
  document.getElementById('lGrp').innerHTML =
    DB.groups.length
      ? DB.groups.map(g => `<option value="${g.id}">${g.name}（${(g.members || []).length} 人）</option>`).join('')
      : '<option value="">（尚未建立群組）</option>';

  // Reset target type to student
  document.getElementById('lTargetType').value = 'student';
  onLessonTargetChange();

  // Reset lesson type
  document.getElementById('lType').value = 'fixed';
  onLessonTypeChange();

  if (presetDate) {
    document.getElementById('lDate').value = presetDate;
    const dow = new Date(presetDate).getDay();
    document.getElementById('lDay').value = dow;
  }

  openMo('moLesson');
}

function onLessonTargetChange() {
  const t = document.getElementById('lTargetType').value;
  document.getElementById('lStuRow').style.display = t === 'student' ? '' : 'none';
  document.getElementById('lGrpRow').style.display = t === 'group'   ? '' : 'none';
}

function onLessonTypeChange() {
  const t = document.getElementById('lType').value;
  document.getElementById('lFixedRow').style.display = t === 'fixed' ? '' : 'none';
  document.getElementById('lOnceRow').style.display  = t === 'once'  ? '' : 'none';
}

async function saveLesson() {
  const targetType = document.getElementById('lTargetType').value;
  const type = document.getElementById('lType').value;

  let studentId = null, groupId = null;
  if (targetType === 'group') {
    groupId = document.getElementById('lGrp').value;
    if (!groupId) { showBan('請選擇群組', true); return; }
  } else {
    studentId = document.getElementById('lStu').value;
    if (!studentId) { showBan('請選擇學生', true); return; }
  }

  setBtnLoading('btnSaveLesson', '儲存中…');
  const l = {
    id: newId(),
    studentId, groupId, targetType, type,
    day:   type === 'fixed' ? document.getElementById('lDay').value  : null,
    date:  type === 'once'  ? document.getElementById('lDate').value : null,
    start: document.getElementById('lStart').value,
    dur:   document.getElementById('lDur').value,
    fee:   document.getElementById('lFeeAmt').value,
    createdAt: Date.now(),
  };
  DB.lessons.push(l);
  saveLocal();
  await fbSave('lessons', l.id, l);
  closeMo('moLesson');
  setBtnDone('btnSaveLesson', '儲存課堂');
  renderCal();
  renderDash();
  showBan('課堂已新增');
}

async function deleteLesson(id) {
  if (!confirm('刪除此課堂安排？')) return;
  DB.lessons = DB.lessons.filter(x => x.id !== id);
  saveLocal();
  await fbDel('lessons', id);
  renderCal();
  renderDash();
  showBan('課堂已刪除');
}

// ── 收款 ──
let _paySid = null;
function openModalPayment(sid) {
  _paySid = sid;
  document.getElementById('payStus').innerHTML =
    DB.students.map(s => `<option value="${s.id}"${s.id === sid ? ' selected' : ''}>${s.name}</option>`).join('');
  document.getElementById('payDate').value = todayISO();
  document.getElementById('payAmt').value = sid ? (DB.students.find(x => x.id === sid)?.defaultFee || '') : '';
  ['payPeriod','payNote'].forEach(id => document.getElementById(id).value = '');
  openMo('moPayment');
}

async function savePayment() {
  const amt = document.getElementById('payAmt').value;
  if (!amt) { showBan('請填寫金額', true); return; }

  setBtnLoading('btnSavePay', '記錄中…');
  const p = {
    id: newId(),
    studentId: document.getElementById('payStus').value,
    amount: parseFloat(amt),
    date:   document.getElementById('payDate').value,
    period: document.getElementById('payPeriod').value,
    method: document.getElementById('payMethod').value,
    note:   document.getElementById('payNote').value,
    createdAt: Date.now(),
  };
  DB.payments.push(p);
  saveLocal();
  await fbSave('payments', p.id, p);
  closeMo('moPayment');
  setBtnDone('btnSavePay', '記錄收款');
  if (UI.page === 'detail') renderDetailBody();
  renderDash();
  renderIncome();
  showBan('收款已記錄');
}

// ── 學校 ──
async function saveSchool() {
  const name = document.getElementById('schoolName').value.trim();
  if (!name) { showBan('請填寫學校名稱', true); return; }
  const s = { id: newId(), name, createdAt: Date.now() };
  DB.schools.push(s);
  saveLocal();
  await fbSave('schools', s.id, s);
  closeMo('moSchool');
  document.getElementById('schoolName').value = '';
  renderSchChips(); renderStudents(); renderSettings();
  showBan('學校已新增');
}

async function deleteSchool(id) {
  if (!confirm('刪除此學校？')) return;
  DB.schools = DB.schools.filter(x => x.id !== id);
  saveLocal();
  await fbDel('schools', id);
  renderSchChips(); renderStudents(); renderSettings();
  showBan('學校已刪除');
}

// ── 群組 ──
function openModalGroup(editGid = null) {
  UI.editGid = editGid;
  document.getElementById('moGrpTitle').textContent = editGid ? '編輯群組' : '新增群組';
  const g = editGid ? DB.groups.find(x => x.id === editGid) : null;
  document.getElementById('gName').value = g?.name || '';
  document.getElementById('gNote').value = g?.note || '';
  const members = g?.members || [];
  document.getElementById('gMemberList').innerHTML =
    DB.students.length
      ? DB.students.map(s =>
          `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:.76rem;color:var(--txt2);cursor:pointer">
            <input type="checkbox" value="${s.id}" ${members.includes(s.id) ? 'checked' : ''} style="width:15px;height:15px;accent-color:var(--red)">
            ${s.name}（${s.instrument || '—'}）
          </label>`
        ).join('')
      : '<div style="font-size:.74rem;color:var(--txt3);padding:8px 0">尚未有學生，請先新增學生</div>';
  openMo('moGroup');
}

async function saveGroup() {
  const name = document.getElementById('gName').value.trim();
  if (!name) { showBan('請填寫群組名稱', true); return; }

  setBtnLoading('btnSaveGrp', '儲存中…');
  const members = [...document.querySelectorAll('#gMemberList input:checked')].map(el => el.value);
  const existing = UI.editGid ? DB.groups.find(x => x.id === UI.editGid) : null;

  const g = {
    id: UI.editGid || newId(),
    name, members,
    note: document.getElementById('gNote').value.trim(),
    createdAt: existing?.createdAt || Date.now(),
  };
  const idx = DB.groups.findIndex(x => x.id === g.id);
  if (idx >= 0) DB.groups[idx] = g; else DB.groups.push(g);

  saveLocal();
  await fbSave('groups', g.id, g);
  closeMo('moGroup');
  setBtnDone('btnSaveGrp', '儲存群組');
  UI.editGid = null;
  renderSettings();
  showBan('群組已儲存');
}

async function deleteGroup(id) {
  if (!confirm('刪除此群組？（課堂記錄不會刪除）')) return;
  DB.groups = DB.groups.filter(x => x.id !== id);
  saveLocal();
  await fbDel('groups', id);
  renderSettings();
  showBan('群組已刪除');
}

// ── Auth ──
async function doLogin() {
  document.getElementById('loginStatus').textContent = '登入中…';
  try {
    const p = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(p);
  } catch(e) {
    document.getElementById('loginStatus').textContent = '登入失敗：' + e.message;
  }
}

function doSignOut() {
  if (confirm('確定登出？')) firebase.auth().signOut();
}

// ── 任務功能 ──
function openModalTask() {
  const sel = document.getElementById('tStu');
  sel.innerHTML = DB.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('tTitle').value = '';
  document.getElementById('tDesc').value  = '';
  document.getElementById('tDue').value   = '';
  openMo('moTask');
}

async function saveTask() {
  const title = document.getElementById('tTitle').value.trim();
  if (!title) { showBan('請填寫任務名稱', true); return; }
  const studentId = document.getElementById('tStu').value;
  const stu = DB.students.find(s => s.id === studentId);
  if (!stu) { showBan('請選擇學生', true); return; }

  setBtnLoading('btnSaveTask', '儲存中…');
  const t = {
    id:         newId(),
    title,
    desc:       document.getElementById('tDesc').value.trim(),
    dueDate:    document.getElementById('tDue').value,
    studentId,
    createdBy:  getUid(),
    status:     'pending',
    progress:   '',
    createdAt:  Date.now(),
  };

  if (!DB.tasks) DB.tasks = [];
  DB.tasks.push(t);
  saveLocal();
  // Save to Firestore with the STUDENT's uid field so they can read it
  // We store createdBy (teacher uid) but also studentId for querying
  try {
    await getDb().collection('tasks').doc(t.id).set({ ...t, uid: getUid() }, { merge: true });
  } catch(e) {
    console.warn('saveTask fbSave:', e.message);
    showBan('雲端同步失敗（本地已儲存）', true);
  }

  closeMo('moTask');
  setBtnDone('btnSaveTask', '派發任務');
  renderTasks();
  showBan(`已派任務給 ${stu.name}`);
}

async function deleteTask(id) {
  if (!confirm('確定刪除此任務？')) return;
  DB.tasks = (DB.tasks || []).filter(t => t.id !== id);
  saveLocal();
  await fbDel('tasks', id);
  renderTasks();
  showBan('任務已刪除');
}

// 學生/家長：回報進度
async function reportProgress(taskId) {
  const inp = document.getElementById('prog_' + taskId);
  if (!inp) return;
  const progress = inp.value.trim();
  if (!progress) { showBan('請先填寫進度說明', true); return; }

  const t = (DB.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  t.progress = progress;
  saveLocal();
  try {
    await getDb().collection('tasks').doc(taskId).update({ progress });
  } catch(e) { console.warn('reportProgress:', e.message); }
  renderMyTasks();
  showBan('進度已回報');
}

async function markTaskDone(taskId) {
  const t = (DB.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  t.status = 'done';
  saveLocal();
  try {
    await getDb().collection('tasks').doc(taskId).update({ status: 'done' });
  } catch(e) { console.warn('markTaskDone:', e.message); }
  renderMyTasks();
  showBan('任務已標為完成');
}

// 學生/家長：開啟電郵聯絡老師
function sendContactMsg() {
  const body = (document.getElementById('msgBody')?.value || '').trim();
  const to   = USER_PROFILE.teacherEmail || '';
  const sub  = encodeURIComponent('【履音】學生/家長留言');
  const msg  = encodeURIComponent(body);
  if (!body) { showBan('請填寫訊息', true); return; }
  window.location.href = `mailto:${to}?subject=${sub}&body=${msg}`;
}

// ── Privacy toggle ──
function togglePrivacy(key) {
  const cur = privacyHide(key);
  setPrivacy(key, !cur);
  renderSettings();
  // 重渲學生列表（如果在相關頁面）
  if (UI.page === 'students') renderStudents();
  if (UI.page === 'detail' && (key === 'hideAmount' || key === 'hideGrade')) renderDetailBody();
}
