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
let _planGid = null;
let _paSelected = null; // currently selected suggestion text

function openModalPlan(sid, gid) {
  _planSid = sid || null;
  _planGid = gid || null;
  document.getElementById('pDate').value = todayISO();
  ['pGoal','pPlan','pRecord','pPiece','pHw','pNext'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('pEval').value = '';
  document.querySelectorAll('.pa-eval').forEach(b => b.classList.remove('on'));

  // Set context label
  const ctx = document.getElementById('moPlanContext');
  if (gid) {
    const g = DB.groups.find(x => x.id === gid);
    ctx.textContent = g ? `群組：${g.name}（${(g.members||[]).length} 人）` : '群組課堂';
    document.getElementById('moPlanTitle').textContent = '群組教案';
  } else if (sid) {
    const s = DB.students.find(x => x.id === sid);
    ctx.textContent = s ? `學生：${s.name}（${s.instrument || '—'}）` : '';
    document.getElementById('moPlanTitle').textContent = '課堂教案';
  } else {
    ctx.textContent = '';
    document.getElementById('moPlanTitle').textContent = '課堂教案';
  }

  // Hide suggestion panel
  document.getElementById('paSuggest').style.display = 'none';
  _paSelected = null;

  openMo('moPlan');
}

// ── 教案輔助工具 ──
const PA_TOOLS = {
  goal: {
    title: '🎯 教學目標建議',
    items: [
      '能流暢背奏指定段落，雙手協調一致',
      '掌握本曲的速度與節奏，達到穩定拍子',
      '認識並正確演奏附點、切分、三連音節奏',
      '改善弓法 / 指法的一致性和清晰度',
      '提升力度對比（強弱）的表達能力',
      '學習並應用正確的換把 / 換弓技巧',
      '能視奏新段落，識別調性和拍子記號',
      '培養音樂感，注意樂句的起伏和呼吸',
      '鞏固上週功課，糾正常見錯誤',
      '準備考級曲目，達到考試要求標準',
    ]
  },
  steps: {
    title: '📋 上課步驟範本',
    items: [
      '1. 音階暖身 5分\n2. 複習上週功課段落\n3. 示範新段落 + 學生跟奏\n4. 分手慢速練習\n5. 合手嘗試\n6. 派發功課',
      '1. 節奏拍手練習 5分\n2. 分析新樂段的難點\n3. 慢速分段練習\n4. 配合伴奏合奏\n5. 總結及評估\n6. 下次功課說明',
      '1. 暖身：手指靈活練習 5分\n2. 複習整首曲目從頭到尾\n3. 重點糾正特定小節\n4. 加速至目標速度\n5. 錄音對比進步',
      '1. 視奏練習 10分（新材料）\n2. 分析技術難點\n3. 針對性技術練習\n4. 音樂表達討論\n5. 功課安排',
    ]
  },
  hw: {
    title: '📝 功課點子',
    items: [
      '每天練習指定段落各 10 次，先左右手分開，再合手',
      '用節拍器練習，速度先慢後快（建議 ♩=60 開始）',
      '睡前默背樂譜一次，確認記清楚',
      '錄音練習片段，自行聆聽找出需要改善的地方',
      '練習音階（大小調）和琶音各 3 遍',
      '著重練習第 ___ 至 ___ 小節，每天最少 5 遍',
      '視奏新頁，先慢速認清音符和節奏',
      '專注練習力度對比，強弱要明顯分別',
    ]
  },
  warm: {
    title: '🎵 暖身活動',
    items: [
      'C 大調音階及琶音，兩手各 3 遍',
    '音階練習：全音符→二分音符→四分音符，逐步加速',
      '手指獨立練習（哈農 / 卡爾·車爾尼 / 施拉姆）',
      '長弓練習，注意弓壓和發音均勻',
      '節奏拍手：先用手拍，再用樂器演奏',
      '即興演奏 2 分鐘，放鬆心情',
      '視唱昨日功課的主旋律',
    ]
  },
};

function paTool(type) {
  if (type === 'clear') {
    document.getElementById('paSuggest').style.display = 'none';
    _paSelected = null;
    return;
  }
  const tool = PA_TOOLS[type];
  if (!tool) return;

  document.getElementById('paSuggestTitle').textContent = tool.title;
  document.getElementById('paSuggestList').innerHTML = tool.items.map((item, i) =>
    `<div class="pa-sug-item" onclick="paSelect(this,'${i}',\`${item.replace(/`/g,'\\`').replace(/\n/g,'\\n')}\`)">${item.replace(/\n/g,'<br>')}</div>`
  ).join('');

  document.getElementById('paSuggest').style.display = 'block';
  _paSelected = null;
}

function paSelect(el, i, text) {
  document.querySelectorAll('.pa-sug-item').forEach(x => x.classList.remove('sel'));
  el.classList.add('sel');
  _paSelected = text.replace(/\\n/g, '\n');
}

function paInsert(targetId) {
  if (!_paSelected) { showBan('請先點選一個建議', true); return; }
  const el = document.getElementById(targetId);
  if (!el) return;
  const cur = el.value.trim();
  el.value = cur ? cur + '\n' + _paSelected : _paSelected;
  el.focus();
  showBan('已插入建議');
}

function paSetEval(v) {
  document.getElementById('pEval').value = v;
  document.querySelectorAll('.pa-eval').forEach((b, i) => {
    b.classList.toggle('on', i + 1 === v);
  });
}

async function savePlan() {
  setBtnLoading('btnSavePlan', '儲存中…');
  const p = {
    id: newId(),
    studentId: _planSid,
    groupId:   _planGid,
    date:      document.getElementById('pDate').value,
    goal:      document.getElementById('pGoal').value.trim(),
    plan:      document.getElementById('pPlan').value.trim(),
    record:    document.getElementById('pRecord').value.trim(),
    piece:     document.getElementById('pPiece').value.trim(),
    hw:        document.getElementById('pHw').value.trim(),
    eval:      document.getElementById('pEval').value || null,
    next:      document.getElementById('pNext').value.trim(),
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
function openModalLesson(presetDate = null, editLessonId = null) {
  const editL = editLessonId ? DB.lessons.find(x => x.id === editLessonId) : null;
  UI.editLessonId = editLessonId || null;

  document.getElementById('moLessonTitle').textContent = editL ? '編輯課堂' : '新增課堂';
  document.getElementById('btnSaveLesson').textContent = editL ? '更新課堂' : '儲存課堂';

  // Populate instruments for inline student form
  const instEl = document.getElementById('lnStuInst');
  if (instEl && !instEl.options.length) {
    instEl.innerHTML = Object.entries(INSTRUMENTS).map(([grp, items]) =>
      `<optgroup label="${grp}">${items.map(i => `<option>${i}</option>`).join('')}</optgroup>`
    ).join('');
  }

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

  // Hide inline forms
  document.getElementById('lInlineStu').style.display = 'none';
  document.getElementById('lInlineGrp').style.display = 'none';

  if (editL) {
    // Fill with existing lesson data
    document.getElementById('lTargetType').value = editL.targetType || 'student';
    onLessonTargetChange();
    if (editL.studentId) document.getElementById('lStu').value = editL.studentId;
    if (editL.groupId)   document.getElementById('lGrp').value = editL.groupId;
    document.getElementById('lType').value = editL.type || 'fixed';
    onLessonTypeChange();
    if (editL.day  != null) document.getElementById('lDay').value  = editL.day;
    if (editL.date)         document.getElementById('lDate').value = editL.date;
    document.getElementById('lStart').value    = editL.start || '15:00';
    document.getElementById('lDur').value      = editL.dur   || '60';
    document.getElementById('lFeeAmt').value   = editL.fee   || '';
    document.getElementById('lLocation').value = editL.location || '';
    document.getElementById('lNote').value     = editL.note  || '';
  } else {
    // Reset for new lesson
    document.getElementById('lTargetType').value = 'student';
    onLessonTargetChange();
    document.getElementById('lType').value = 'fixed';
    onLessonTypeChange();
    document.getElementById('lStart').value    = '15:00';
    document.getElementById('lDur').value      = '60';
    document.getElementById('lFeeAmt').value   = '';
    document.getElementById('lLocation').value = '';
    document.getElementById('lNote').value     = '';
    if (presetDate) {
      document.getElementById('lDate').value = presetDate;
      document.getElementById('lDay').value  = new Date(presetDate + 'T00:00:00').getDay();
    }
  }

  openMo('moLesson');
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
  const id = UI.editLessonId || newId();
  const existing = UI.editLessonId ? DB.lessons.find(x => x.id === id) : null;

  const l = {
    id, studentId, groupId, targetType, type,
    day:      type === 'fixed' ? document.getElementById('lDay').value   : null,
    date:     type === 'once'  ? document.getElementById('lDate').value  : null,
    start:    document.getElementById('lStart').value,
    dur:      document.getElementById('lDur').value,
    fee:      document.getElementById('lFeeAmt').value,
    location: document.getElementById('lLocation').value.trim(),
    note:     document.getElementById('lNote').value.trim(),
    createdAt: existing?.createdAt || Date.now(),
  };

  const idx = DB.lessons.findIndex(x => x.id === id);
  if (idx >= 0) DB.lessons[idx] = l; else DB.lessons.push(l);

  saveLocal();
  await fbSave('lessons', l.id, l);
  UI.editLessonId = null;
  closeMo('moLesson');
  setBtnDone('btnSaveLesson', '儲存課堂');
  renderCal();
  renderDash();
  showBan(existing ? '課堂已更新' : '課堂已新增');
}

// ── Inline new student inside lesson modal ──
function inlineSwitchToNewStudent() {
  document.getElementById('lInlineStu').style.display = '';
  document.getElementById('lInlineGrp').style.display = 'none';
}
async function inlineSaveNewStudent() {
  const name = document.getElementById('lnStuName').value.trim();
  if (!name) { showBan('請填寫學生姓名', true); return; }
  const s = {
    id: newId(), name,
    instrument: document.getElementById('lnStuInst').value,
    phone:      document.getElementById('lnStuPhone').value,
    defaultFee: document.getElementById('lnStuFee').value,
    scores: {}, createdAt: Date.now(),
  };
  DB.students.push(s);
  saveLocal();
  await fbSave('students', s.id, s);
  // Add to select and choose it
  const opt = document.createElement('option');
  opt.value = s.id; opt.textContent = `${s.name}（${s.instrument || '—'}）`;
  document.getElementById('lStu').appendChild(opt);
  document.getElementById('lStu').value = s.id;
  document.getElementById('lTargetType').value = 'student';
  onLessonTargetChange();
  document.getElementById('lInlineStu').style.display = 'none';
  document.getElementById('lnStuName').value = '';
  document.getElementById('lnStuPhone').value = '';
  document.getElementById('lnStuFee').value = '';
  showBan('學生已新增');
}

// ── Inline new group inside lesson modal ──
function inlineSwitchToNewGroup() {
  document.getElementById('lInlineGrp').style.display = '';
  document.getElementById('lInlineStu').style.display = 'none';
}
async function inlineSaveNewGroup() {
  const name = document.getElementById('lnGrpName').value.trim();
  if (!name) { showBan('請填寫群組名稱', true); return; }
  const g = {
    id: newId(), name,
    note: document.getElementById('lnGrpNote').value.trim(),
    members: [], createdAt: Date.now(),
  };
  DB.groups.push(g);
  saveLocal();
  await fbSave('groups', g.id, g);
  const opt = document.createElement('option');
  opt.value = g.id; opt.textContent = `${g.name}（0 人）`;
  document.getElementById('lGrp').appendChild(opt);
  document.getElementById('lGrp').value = g.id;
  document.getElementById('lTargetType').value = 'group';
  onLessonTargetChange();
  document.getElementById('lInlineGrp').style.display = 'none';
  document.getElementById('lnGrpName').value = '';
  document.getElementById('lnGrpNote').value = '';
  showBan('群組已新增');
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

// saveLesson is defined above in openModalLesson block

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
  const creditsEl = document.getElementById('payCredits');
  const creditsAmt = creditsEl ? parseInt(creditsEl.value) || 0 : 0;
  const sid = document.getElementById('payStus').value;

  const p = {
    id: newId(),
    studentId: sid,
    amount:  parseFloat(amt),
    date:    document.getElementById('payDate').value,
    period:  document.getElementById('payPeriod').value,
    method:  document.getElementById('payMethod').value,
    note:    document.getElementById('payNote').value,
    credits: creditsAmt || null,
    createdAt: Date.now(),
  };
  DB.payments.push(p);

  // Auto-add credits if specified
  if (creditsAmt > 0 && sid) {
    if (!DB.credits) DB.credits = [];
    let cred = DB.credits.find(c => c.studentId === sid);
    if (cred) {
      cred.total = (cred.total || 0) + creditsAmt;
      await fbSave('credits', cred.id, cred);
    } else {
      cred = { id: newId(), studentId: sid, total: creditsAmt, used: 0, createdAt: Date.now() };
      DB.credits.push(cred);
      await fbSave('credits', cred.id, cred);
    }
  }

  saveLocal();
  await fbSave('payments', p.id, p);
  if (creditsEl) creditsEl.value = '';
  closeMo('moPayment');
  setBtnDone('btnSavePay', '記錄收款');
  if (UI.page === 'detail') renderDetailBody();
  renderDash();
  if (UI.page === 'income') renderIncome();
  showBan(creditsAmt > 0 ? `收款已記錄，已增加 ${creditsAmt} 課節` : '收款已記錄');
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
          `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:0.95rem;color:var(--txt2);cursor:pointer">
            <input type="checkbox" value="${s.id}" ${members.includes(s.id) ? 'checked' : ''} style="width:15px;height:15px;accent-color:var(--red)">
            ${s.name}（${s.instrument || '—'}）
          </label>`
        ).join('')
      : '<div style="font-size:0.93rem;color:var(--txt3);padding:8px 0">尚未有學生，請先新增學生</div>';
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
function toggleAllPrivacy() {
  toggleHideAll();
  renderSettings();
  if (UI.page === 'students')  renderStudents();
  if (UI.page === 'detail')    renderDetailBody();
  if (UI.page === 'income')    renderIncome();
  if (UI.page === 'dash')      renderDash();
}
// legacy compat
function togglePrivacy(key) { toggleAllPrivacy(); }

// ═══════════════════════════════════════════════════════════════
// 課堂出席 / 請假 / 確認上堂
// ═══════════════════════════════════════════════════════════════

// 確認上堂：記錄 attend=present，扣除一課節
async function confirmAttend(lessonId, ds) {
  const l = DB.lessons.find(x => x.id === lessonId);
  if (!l) return;

  // 避免重複確認
  const already = DB.records.find(r =>
    r.lessonId === lessonId && r.date === ds && r.attend === 'present'
  );
  if (already) { showBan('此課堂已確認上堂', true); return; }

  const rec = {
    id: newId(),
    studentId: l.studentId || null,
    groupId:   l.groupId   || null,
    lessonId,
    date: ds,
    attend: 'present',
    content: '',
    rating: null,
    createdAt: Date.now(),
  };
  DB.records.push(rec);

  // 扣除課節
  if (l.studentId) {
    let cred = DB.credits.find(c => c.studentId === l.studentId);
    if (cred) {
      cred.used = (cred.used || 0) + 1;
      await fbSave('credits', cred.id, cred);
    }
  }

  saveLocal();
  await fbSave('records', rec.id, rec);
  renderDayPanel(ds);
  renderDash();
  showBan('已確認上堂');
}

// 請假：記錄 attend=absent（不扣課節）
async function skipLesson(lessonId, ds) {
  const l = DB.lessons.find(x => x.id === lessonId);
  if (!l) return;

  const already = DB.records.find(r =>
    r.lessonId === lessonId && r.date === ds && r.attend === 'absent'
  );
  if (already) { showBan('已標記請假', true); return; }

  const rec = {
    id: newId(),
    studentId: l.studentId || null,
    groupId:   l.groupId   || null,
    lessonId, date: ds,
    attend: 'absent',
    content: '請假',
    rating: null,
    createdAt: Date.now(),
  };
  DB.records.push(rec);
  saveLocal();
  await fbSave('records', rec.id, rec);
  renderDayPanel(ds);
  showBan('已標記請假');
}

// 取消請假
async function unskipLesson(lessonId, ds) {
  const rec = DB.records.find(r =>
    r.lessonId === lessonId && r.date === ds && r.attend === 'absent'
  );
  if (!rec) return;
  DB.records = DB.records.filter(r => r.id !== rec.id);
  saveLocal();
  await fbDel('records', rec.id);
  renderDayPanel(ds);
  showBan('已取消請假');
}

// 單次刪除（固定課堂這次不上，加一個 once-skip record）
async function skipOneLesson(lessonId, ds) {
  if (!confirm(`確定要刪除 ${ds} 這次課堂？（只刪除這一次，固定安排不受影響）`)) return;
  // Add a one-off skip marker
  const l = DB.lessons.find(x => x.id === lessonId);
  const oneOff = {
    id: newId(),
    type: 'once-skip',
    lessonId,
    date: ds,
    studentId: l?.studentId || null,
    uid: getUid(),
    createdAt: Date.now(),
  };
  // Store in lessons as a once-skip entry
  DB.lessons.push(oneOff);
  saveLocal();
  await fbSave('lessons', oneOff.id, oneOff);
  renderCal();
  showBan('此次課堂已刪除');
}

// ═══════════════════════════════════════════════════════════════
// 增加可上課節（學費繳交後）
// ═══════════════════════════════════════════════════════════════
let _creditSid = null;

function openModalAddCredits(sid) {
  _creditSid = sid;
  const stu = DB.students.find(s => s.id === sid);
  const existing = (DB.credits || []).find(c => c.studentId === sid);
  document.getElementById('credStuName').textContent = stu ? stu.name : '';
  document.getElementById('credCurrent').textContent = existing
    ? `現有：${existing.total - existing.used} 節（共 ${existing.total} 節，已上 ${existing.used} 節）`
    : '現有：0 節';
  document.getElementById('credAmt').value = '';
  openMo('moCredits');
}

async function saveCredits() {
  const amt = parseInt(document.getElementById('credAmt').value);
  if (!amt || amt <= 0) { showBan('請填寫課節數量', true); return; }

  setBtnLoading('btnSaveCred', '儲存中…');
  if (!DB.credits) DB.credits = [];

  let cred = DB.credits.find(c => c.studentId === _creditSid);
  if (cred) {
    cred.total = (cred.total || 0) + amt;
    await fbSave('credits', cred.id, cred);
  } else {
    cred = {
      id: newId(),
      studentId: _creditSid,
      total: amt,
      used: 0,
      createdAt: Date.now(),
    };
    DB.credits.push(cred);
    await fbSave('credits', cred.id, cred);
  }
  saveLocal();
  closeMo('moCredits');
  setBtnDone('btnSaveCred', '確認增加');

  if (UI.page === 'detail') renderDetailBody();
  showBan(`已增加 ${amt} 課節`);
}
