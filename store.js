// ═══════════════════════════════════════════════════════════════
// store.js — 應用程式狀態 + Firebase + 本地快取
// ═══════════════════════════════════════════════════════════════

// ── 全域狀態 ──
let CU = null; // 當前登入用戶 (firebase.User)

// 本地資料快取
let DB = {
  schools:  [],
  students: [],
  lessons:  [],
  records:  [],
  payments: [],
  plans:    [],
  groups:   [],
};

// UI 狀態
let UI = {
  page:       'dash',
  prevPage:   'dash',
  detailSid:  null,
  detailTab:  'records',
  calYear:    new Date().getFullYear(),
  calMonth:   new Date().getMonth(),
  schFilter:  'all',
  editSid:    null,   // 編輯學生 ID
  editGid:    null,   // 編輯群組 ID
};

// ── 本地快取 ──
function lsKey() { return 'luyin6_' + (CU ? CU.uid : 'x'); }
function saveLocal() {
  try { localStorage.setItem(lsKey(), JSON.stringify(DB)); } catch(e) {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(lsKey());
    if (raw) DB = JSON.parse(raw);
  } catch(e) {}
}

// ── Firebase helpers ──
let _db = null;
function getDb() {
  if (!_db) _db = firebase.firestore();
  return _db;
}
function getUid() { return CU ? CU.uid : ''; }

async function fbSave(coll, id, data) {
  try {
    await getDb().collection(coll).doc(id).set({ ...data, uid: getUid() }, { merge: true });
  } catch(e) {
    showBan('儲存失敗：' + e.message, true);
  }
}

async function fbDel(coll, id) {
  try {
    await getDb().collection(coll).doc(id).delete();
  } catch(e) {
    showBan('刪除失敗：' + e.message, true);
  }
}

async function fbLoad(coll) {
  const snap = await getDb().collection(coll).where('uid', '==', getUid()).get();
  return snap.docs.map(d => d.data());
}

// ── 載入所有資料 ──
async function loadAll() {
  const colls = ['schools','students','lessons','records','payments','plans','groups'];
  const results = await Promise.all(colls.map(c => fbLoad(c)));
  colls.forEach((c, i) => { DB[c] = results[i]; });
  saveLocal();
}

// ── 新 ID ──
function newId() { return Date.now().toString() + Math.random().toString(36).slice(2, 6); }
