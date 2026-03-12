// ═══════════════════════════════════════════════════════════════
// store.js — 狀態 + Firebase + 本地快取
// ═══════════════════════════════════════════════════════════════

let CU = null;
let USER_ROLE = null;   // 'teacher' | 'student' | 'parent'
let USER_PROFILE = {};  // Firestore users/{uid}

let DB = {
  schools: [], students: [], lessons: [],
  records: [], payments: [], plans: [], groups: [],
  tasks: [],   // { id, title, desc, studentId, dueDate, createdBy, status:'pending'|'done', progress:'', uid }
  credits: [], // { id, studentId, total, used, createdAt, uid } — 可上課節數
};

let UI = {
  page: 'dash', prevPage: 'dash',
  detailSid: null, detailTab: 'records',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calSelDay: null,
  schFilter: 'all',
  editSid: null, editGid: null, editLessonId: null,
};

// ── Privacy toggle (老師專用) — 單一開關隱藏所有隱私 ──
function isPrivacyHidden() {
  return localStorage.getItem('luyin_hideAll') === '1';
}
function toggleHideAll() {
  localStorage.setItem('luyin_hideAll', isPrivacyHidden() ? '0' : '1');
}
// backwards compat shims
function privacyHide(key) { return isPrivacyHidden(); }
function getPrivacy() { return {}; }
function setPrivacy(key, val) {}

// ── 本地快取 ──
function lsKey() { return 'luyin6_' + (CU ? CU.uid : 'x'); }
function saveLocal() {
  try { localStorage.setItem(lsKey(), JSON.stringify(DB)); } catch(e) {}
}
function loadLocal() {
  try { const r = localStorage.getItem(lsKey()); if (r) DB = JSON.parse(r); } catch(e) {}
}

// ── Firebase helpers ──
let _db = null;
function getDb() { if (!_db) _db = firebase.firestore(); return _db; }
function getUid() { return CU ? CU.uid : ''; }

async function fbSave(coll, id, data) {
  try {
    await getDb().collection(coll).doc(id).set({ ...data, uid: getUid() }, { merge: true });
  } catch(e) {
    console.warn('fbSave:', coll, e.message);
    showBan('雲端同步失敗（本地已儲存）', true);
  }
}
async function fbDel(coll, id) {
  try { await getDb().collection(coll).doc(id).delete(); }
  catch(e) { console.warn('fbDel:', e.message); }
}
async function fbLoad(coll) {
  try {
    const snap = await getDb().collection(coll).where('uid', '==', getUid()).get();
    return snap.docs.map(d => d.data());
  } catch(e) { console.warn('fbLoad:', coll, e.message); return null; }
}

// 學生/家長：用 linkedStudentIds 載入老師的任務
async function fbLoadTasksForLinked() {
  try {
    const ids = USER_PROFILE.linkedStudentIds || [];
    if (!ids.length) return [];
    // Firestore 'in' 最多 10 個
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i+10));
    const all = [];
    for (const chunk of chunks) {
      const snap = await getDb().collection('tasks').where('studentId','in',chunk).get();
      snap.docs.forEach(d => all.push(d.data()));
    }
    return all;
  } catch(e) { console.warn('fbLoadTasksForLinked:', e.message); return null; }
}

// loadAll: 不覆蓋本地有資料的情況
async function loadAll() {
  const colls = ['schools','students','lessons','records','payments','plans','groups'];
  let tasks = null;

  if (USER_ROLE === 'teacher') {
    // 老師：載入自己的所有資料
    const results = await Promise.all(colls.map(c => fbLoad(c)));
    colls.forEach((c, i) => {
      if (results[i] !== null && results[i].length > 0) DB[c] = results[i];
    });
    tasks = await fbLoad('tasks');
    const cr = await fbLoad('credits');
    if (cr !== null && cr.length > 0) DB.credits = cr;
  } else {
    // 學生/家長：只載入任務
    tasks = await fbLoadTasksForLinked();
  }

  if (tasks !== null && tasks.length > 0) DB.tasks = tasks;
  saveLocal();
}

// ── User profile ──
async function saveUserProfile(data) {
  try {
    await getDb().collection('users').doc(getUid()).set({ ...data, uid: getUid() }, { merge: true });
    USER_PROFILE = { ...USER_PROFILE, ...data };
  } catch(e) { console.warn('saveUserProfile:', e.message); }
}

async function loadUserProfile() {
  try {
    const doc = await getDb().collection('users').doc(getUid()).get();
    if (doc.exists) {
      USER_PROFILE = doc.data();
      USER_ROLE = USER_PROFILE.role || 'teacher';
    } else {
      USER_ROLE = 'teacher';
      USER_PROFILE = { role: 'teacher', createdAt: Date.now() };
      await saveUserProfile(USER_PROFILE);
    }
  } catch(e) { USER_ROLE = 'teacher'; }
}

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}
