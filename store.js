// ═══════════════════════════════════════════════════════════════
// store.js — 狀態 + Firebase + 本地快取
// ═══════════════════════════════════════════════════════════════

// ── 全域狀態 ──
let CU = null;          // firebase.User（老師帳號）
let USER_ROLE = null;   // 'teacher' | 'student' | 'parent'
let USER_PROFILE = {};  // Firestore users/{uid} 文件

let DB = {
  schools: [], students: [], lessons: [],
  records: [], payments: [], plans: [], groups: [],
};

let UI = {
  page: 'dash', prevPage: 'dash',
  detailSid: null, detailTab: 'records',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calSelDay: null,
  schFilter: 'all',
  editSid: null, editGid: null,
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
function getDb() { if (!_db) _db = firebase.firestore(); return _db; }
function getUid() { return CU ? CU.uid : ''; }

async function fbSave(coll, id, data) {
  try {
    await getDb().collection(coll).doc(id).set(
      { ...data, uid: getUid() }, { merge: true }
    );
  } catch(e) {
    // 儲存失敗不影響本地資料，但通知用戶
    console.warn('fbSave error:', e.message);
    showBan('雲端同步失敗（本地已儲存）', true);
  }
}

async function fbDel(coll, id) {
  try {
    await getDb().collection(coll).doc(id).delete();
  } catch(e) {
    console.warn('fbDel error:', e.message);
  }
}

async function fbLoad(coll) {
  try {
    const snap = await getDb().collection(coll)
      .where('uid', '==', getUid()).get();
    return snap.docs.map(d => d.data());
  } catch(e) {
    console.warn('fbLoad error:', coll, e.message);
    return null; // null = 載入失敗，保留本地
  }
}

// ── 載入所有資料（不覆蓋本地已有資料，只合併）──
async function loadAll() {
  const colls = ['schools','students','lessons','records','payments','plans','groups'];
  const results = await Promise.all(colls.map(c => fbLoad(c)));
  let anyLoaded = false;
  colls.forEach((c, i) => {
    if (results[i] !== null && results[i].length > 0) {
      DB[c] = results[i];
      anyLoaded = true;
    }
    // 若 Firebase 回傳空陣列但本地有資料，保留本地
  });
  if (anyLoaded) saveLocal();
}

// ── 儲存/讀取用戶角色 profile（users 集合）──
async function saveUserProfile(data) {
  try {
    await getDb().collection('users').doc(getUid()).set(
      { ...data, uid: getUid() }, { merge: true }
    );
    USER_PROFILE = { ...USER_PROFILE, ...data };
  } catch(e) {
    console.warn('saveUserProfile error:', e.message);
  }
}

async function loadUserProfile() {
  try {
    const doc = await getDb().collection('users').doc(getUid()).get();
    if (doc.exists) {
      USER_PROFILE = doc.data();
      USER_ROLE = USER_PROFILE.role || 'teacher';
    } else {
      // 新用戶：預設老師角色，建立 profile
      USER_ROLE = 'teacher';
      USER_PROFILE = { role: 'teacher', createdAt: Date.now() };
      await saveUserProfile(USER_PROFILE);
    }
  } catch(e) {
    USER_ROLE = 'teacher'; // 網絡問題時預設老師
  }
}

// ── 新 ID ──
function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}
