// ═══════════════════════════════════════════════════════════════
// pages.js — 各頁面的渲染函數
// ═══════════════════════════════════════════════════════════════

// ────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────
function renderDash() {
  const todayStr = todayISO();
  const todayDow = new Date().getDay();
  const todayLessons = DB.lessons.filter(l =>
    (l.type === 'fixed' && parseInt(l.day) === todayDow) ||
    (l.type === 'once'  && l.date === todayStr)
  ).sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  const thisMonth = monthISO(0);
  const monthIncome = DB.payments
    .filter(p => p.date && p.date.startsWith(thisMonth))
    .reduce((a, p) => a + parseFloat(p.amount || 0), 0);

  const recentRecs = [...DB.records]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 4);

  let h = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px">
    ${statTile('學生人數', DB.students.length, '人')}
    ${statTile('今日課堂', todayLessons.length, '堂')}
    ${statTile('所屬學校', DB.schools.length, '所')}
    ${statTile('本月收入', 'HK$' + Math.round(monthIncome), '')}
  </div>`;

  if (todayLessons.length) {
    h += `<div class="sh">今日課堂</div>`;
    todayLessons.forEach(l => {
      const name = lessonName(l);
      h += `<div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:7px;cursor:pointer"
        onclick="${l.groupId ? "goPage('timetable')" : `openDetail('${l.studentId}')`}">
        <div style="font-family:var(--KAI);font-size:1rem;color:var(--gold);min-width:42px;text-align:center">${l.start || '—'}</div>
        <div>
          <div style="font-size:.82rem;color:var(--txt)">${name}</div>
          <div style="font-size:.64rem;color:var(--txt3)">${l.dur || 60} 分鐘${l.fee ? ' · HK$' + l.fee : ''}</div>
        </div>
      </div>`;
    });
  }

  if (recentRecs.length) {
    h += `<div class="sh">最近記錄</div>`;
    recentRecs.forEach(r => {
      const s = DB.students.find(x => x.id === r.studentId);
      if (!s) return;
      h += `<div class="card" style="cursor:pointer;margin-bottom:7px" onclick="openDetail('${s.id}')">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-family:var(--KAI);font-size:.82rem;color:var(--txt)">${s.name}</span>
          <span style="font-size:.63rem;color:var(--txt3)">${r.date || ''}</span>
        </div>
        <div style="font-size:.73rem;color:var(--txt2);line-height:1.6">${(r.content || '').slice(0, 65)}${(r.content || '').length > 65 ? '…' : ''}</div>
      </div>`;
    });
  }

  if (!todayLessons.length && !recentRecs.length) {
    h += emptyState('履', '素履往，無咎<br>新增學生開始記錄');
  }

  document.getElementById('pg-dash').querySelector('.dc').innerHTML = h;
}

function statTile(label, val, unit) {
  return `<div class="card" style="text-align:center;padding:11px 8px">
    <div style="font-family:var(--KAI);font-size:1.2rem;color:var(--gold)">${val}<span style="font-size:.62rem;color:var(--txt3)">${unit}</span></div>
    <div style="font-size:.6rem;color:var(--txt3);margin-top:2px;letter-spacing:.06em">${label}</div>
  </div>`;
}

function lessonName(l) {
  if (l.groupId) {
    const g = DB.groups.find(x => x.id === l.groupId);
    return g ? g.name : '（群組）';
  }
  const s = DB.students.find(x => x.id === l.studentId);
  return s ? s.name : '（學生）';
}

// ────────────────────────────────────────────
// TIMETABLE
// ────────────────────────────────────────────
function renderCal() {
  const y = UI.calYear, m = UI.calMonth;
  const MON = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  document.getElementById('calLabel').textContent = `${y} 年 ${MON[m]}`;

  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayISO();

  let html = '';
  for (let i = 0; i < firstDow; i++) html += `<div class="cd" style="background:transparent;cursor:default"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(y, m, d).getDay();
    const hasL = DB.lessons.some(l =>
      (l.type === 'fixed' && parseInt(l.day) === dow) ||
      (l.type === 'once'  && l.date === ds)
    );
    const isToday = ds === today;
    const isSel = ds === UI.calSelDay;
    html += `<div class="cd${isToday ? ' today' : ''}${hasL ? ' has' : ''}${isSel ? ' sel' : ''}" onclick="calDayClick('${ds}')">
      <div class="cn">${d}</div>
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
  renderDayPanel(UI.calSelDay || today);
}

function calPrev() { UI.calMonth--; if (UI.calMonth < 0) { UI.calMonth = 11; UI.calYear--; } renderCal(); }
function calNext() { UI.calMonth++; if (UI.calMonth > 11) { UI.calMonth = 0; UI.calYear++; } renderCal(); }
function calDayClick(ds) { UI.calSelDay = ds; renderCal(); }

function renderDayPanel(ds) {
  if (!ds) return;
  const dow = new Date(ds).getDay();
  const lessons = DB.lessons.filter(l =>
    (l.type === 'fixed' && parseInt(l.day) === dow) ||
    (l.type === 'once'  && l.date === ds)
  ).sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  let h = `<div class="sh">${ds}</div>`;
  if (!lessons.length) {
    h += `<div style="font-size:.75rem;color:var(--txt3);padding:8px 0">此日無課堂安排</div>`;
  } else {
    lessons.forEach(l => {
      const name = lessonName(l);
      const isGrp = !!l.groupId;
      h += `<div class="card" style="display:flex;gap:10px;margin-bottom:7px">
        <div style="font-family:var(--KAI);font-size:.78rem;color:var(--gold);min-width:40px;flex-shrink:0">${l.start || '—'}</div>
        <div style="flex:1">
          <div style="font-size:.82rem;color:var(--txt);margin-bottom:2px">${name}${isGrp ? ' <span style="font-size:.58rem;color:var(--jade);border:1px solid var(--jade);padding:1px 4px">群組</span>' : ''}</div>
          <div style="font-size:.64rem;color:var(--txt3)">${l.dur || 60} 分 · ${l.type === 'fixed' ? '固定每週' : '單次'}</div>
        </div>
        <button onclick="deleteLesson('${l.id}')" style="color:var(--txt3);font-size:.9rem;padding:0 4px;background:none;border:none;cursor:pointer;align-self:flex-start">✕</button>
      </div>`;
    });
  }
  document.getElementById('calPanel').innerHTML = h;
}

// ────────────────────────────────────────────
// STUDENTS
// ────────────────────────────────────────────
function renderSchChips() {
  let h = `<div class="ch${UI.schFilter === 'all' ? ' on' : ''}" onclick="setSchFilter('all')">全部</div>`;
  DB.schools.forEach(s => {
    h += `<div class="ch${UI.schFilter === s.id ? ' on' : ''}" onclick="setSchFilter('${s.id}')">${s.name}</div>`;
  });
  document.getElementById('schChips').innerHTML = h;
}

function setSchFilter(id) { UI.schFilter = id; renderSchChips(); renderStudents(); }

function renderStudents() {
  const q = (document.getElementById('stuQ') ? document.getElementById('stuQ').value : '').toLowerCase();
  let list = [...DB.students];
  if (UI.schFilter !== 'all') list = list.filter(s => s.schoolId === UI.schFilter);
  if (q) list = list.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.nameEn || '').toLowerCase().includes(q)
  );
  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));

  const el = document.getElementById('stuList');
  if (!list.length) { el.innerHTML = emptyState('學', '尚未有學生記錄'); return; }

  el.innerHTML = list.map(s => {
    const sch = DB.schools.find(x => x.id === s.schoolId);
    const g = s.overallScore != null ? getGrade(s.overallScore) : null;
    const rc = DB.records.filter(r => r.studentId === s.id).length;
    return `<div class="sc" onclick="openDetail('${s.id}')">
      <div class="av">${s.name[0]}</div>
      <div class="si">
        <div class="sn">${s.name}${s.nameEn ? `<span style="font-size:.64rem;color:var(--txt3);font-weight:400;margin-left:5px">${s.nameEn}</span>` : ''}</div>
        <div class="ss">${[s.instrument, s.level, sch ? sch.name : null].filter(Boolean).join(' · ')}</div>
        <div style="font-size:.6rem;color:var(--txt3);margin-top:1px">${rc} 條記錄</div>
      </div>
      ${g ? `<div class="gc" style="border-color:${g.color};color:${g.color}">${g.grade}</div>` : ''}
    </div>`;
  }).join('');
}

// ────────────────────────────────────────────
// DETAIL TABS
// ────────────────────────────────────────────
function renderTabRecords(s) {
  const recs = DB.records.filter(r => r.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let h = `<button class="btn p sm" onclick="openModalRecord('${s.id}')" style="margin-bottom:11px">新增記錄</button>`;
  if (!recs.length) return h + emptyState('錄', '尚未有課堂記錄');
  const attendLabel = { present:'出席', absent:'請假', makeup:'補堂' };
  const attendCls   = { present:'p',    absent:'a',    makeup:'m' };
  h += recs.map(r => `
    <div class="ri ${r.attend === 'absent' ? 'absent' : r.attend === 'makeup' ? 'makeup' : ''}">
      <div class="rd">${r.date || ''} <span class="pill ${attendCls[r.attend] || 'p'}">${attendLabel[r.attend] || '出席'}</span></div>
      <div class="rc">${r.content || ''}</div>
      ${r.piece ? `<div style="font-size:.66rem;color:var(--gold2);margin-top:3px">♩ ${r.piece}</div>` : ''}
      <div style="font-size:.63rem;color:var(--txt3);margin-top:4px">
        ${'★'.repeat(parseInt(r.rating) || 3)} ${['','待改進','一般','良好','優秀','卓越'][parseInt(r.rating) || 3]}
        ${r.hw ? ` · 功課：${r.hw}` : ''}
      </div>
    </div>`).join('');
  return h;
}

function renderTabPlans(s) {
  const plans = DB.plans.filter(p => p.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let h = `<button class="btn p sm" onclick="openModalPlan('${s.id}')" style="margin-bottom:11px">新增教案</button>`;
  if (!plans.length) return h + emptyState('案', '尚未有教案記錄');
  h += plans.map(p => `
    <div class="pc">
      <div style="font-size:.63rem;color:var(--txt3);margin-bottom:6px">${p.date || ''}</div>
      ${p.goal   ? `<div class="psl">教學目標</div><div class="pt">${p.goal}</div>` : ''}
      ${p.plan   ? `<div class="psl" style="margin-top:6px">教案內容</div><div class="pt">${p.plan}</div>` : ''}
      ${p.record ? `<div class="psl" style="margin-top:8px;color:var(--jade)">實際記錄</div><div class="pt">${p.record}</div>` : ''}
      ${p.hw     ? `<div style="font-size:.65rem;color:var(--txt3);margin-top:5px">功課：${p.hw}</div>` : ''}
    </div>`).join('');
  return h;
}

function renderTabProfile(s) {
  const sch = DB.schools.find(x => x.id === s.schoolId);
  const age = s.dob ? Math.floor((Date.now() - new Date(s.dob)) / (365.25 * 24 * 3600 * 1000)) : null;
  const genderLabel = { M:'男', F:'女' };

  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px">
    <div style="font-size:.74rem;color:var(--txt2)">學生資料</div>
    <button class="btn s sm" onclick="openModalStudent('${s.id}')">編輯資料</button>
  </div>`;

  h += infoCard('基本資料', [
    infoRow('樂器', s.instrument),
    infoRow('程度', s.level),
    infoRow('學習年數', s.yearsLearning),
    age ? infoRow('年齡', age + ' 歲') : '',
    infoRow('出生日期', s.dob),
    s.gender ? infoRow('性別', genderLabel[s.gender] || s.gender) : '',
    infoRow('就讀年級', s.schoolGrade),
    sch ? infoRow('學校', sch.name) : '',
  ]);

  if (s.exam) h += infoCard('考級目標', [infoRow('考級', s.exam)]);

  h += infoCard('聯絡資料', [
    infoRow('家長', s.parent + (s.parentRel ? '（' + s.parentRel + '）' : '')),
    infoRow('電話', s.phone),
    infoRow('電郵', s.email),
  ]);

  if (s.defaultFee || s.payMethod) {
    h += infoCard('學費', [
      infoRow('每堂學費', s.defaultFee ? 'HK$' + s.defaultFee : ''),
      infoRow('繳費方式', s.payMethod),
    ]);
  }

  if (s.personality || s.bottleneck || s.prefs || s.note) {
    h += infoCard('個人背景', [
      infoRow('性格', s.personality),
      infoRow('學習瓶頸', s.bottleneck),
      infoRow('喜好', s.prefs),
      infoRow('備注', s.note),
    ]);
  }

  const pieces = [...new Set(
    DB.records.filter(r => r.studentId === s.id && r.piece).map(r => r.piece)
  )].slice(0, 10);
  if (pieces.length) {
    h += `<div class="card" style="margin-top:0">
      <div style="font-size:.6rem;color:var(--gold2);letter-spacing:.1em;margin-bottom:6px">近期曲目</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${pieces.map(p => `<span class="pill">♩ ${p}</span>`).join('')}</div>
    </div>`;
  }

  h += `<button class="btn d" style="margin-top:8px" onclick="confirmDeleteStudent('${s.id}')">刪除此學生及所有記錄</button>`;
  return h;
}

function renderTabFees(s) {
  const recs = DB.records.filter(r => r.studentId === s.id);
  const pays = DB.payments.filter(p => p.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const present = recs.filter(r => !r.attend || r.attend === 'present').length;
  const absent  = recs.filter(r => r.attend === 'absent').length;
  const makeup  = recs.filter(r => r.attend === 'makeup').length;
  const total   = pays.reduce((a, p) => a + parseFloat(p.amount || 0), 0);

  let h = `<div class="card gold" style="margin-bottom:10px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--jade)">${present}</div><div style="font-size:.6rem;color:var(--txt3)">出席</div></div>
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--red)">${absent}</div><div style="font-size:.6rem;color:var(--txt3)">請假</div></div>
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--gold2)">${makeup}</div><div style="font-size:.6rem;color:var(--txt3)">補堂</div></div>
    </div>
    <div style="border-top:1px solid var(--bdr);margin-top:9px;padding-top:7px;text-align:center;font-size:.76rem;color:var(--jade)">總收款 HK$${Math.round(total)}</div>
  </div>
  <button class="btn p sm" onclick="openModalPayment('${s.id}')" style="margin-bottom:10px">新增收款</button>`;

  if (!pays.length) return h + `<div style="font-size:.75rem;color:var(--txt3)">尚未有收款記錄</div>`;

  h += pays.map(p => `<div class="card" style="margin-bottom:7px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:var(--KAI);font-size:.9rem;color:var(--jade)">HK$${Math.round(parseFloat(p.amount || 0))}</div>
      <div style="font-size:.63rem;color:var(--txt3)">${p.date || ''}</div>
    </div>
    <div style="font-size:.66rem;color:var(--txt3);margin-top:2px">
      ${[p.period, p.method, p.note].filter(Boolean).join(' · ')}
    </div>
  </div>`).join('');
  return h;
}

// ────────────────────────────────────────────
// SCORES TAB  — 六維雷達圖，全部硬編碼顏色（iOS Safari 相容）
// ────────────────────────────────────────────
function buildHexSvg(sc, overall) {
  const g = getGrade(overall);
  const n = 6, sz = 220, cx = sz / 2, cy = sz / 2, r = 78, tr = r + 26;
  let s = `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="display:block;margin:0 auto 10px">`;

  // Grid rings
  [.25, .5, .75, 1].forEach(f => {
    const pp = AXES.map((_, i) => {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${(cx + r * f * Math.cos(a)).toFixed(1)},${(cy + r * f * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    s += `<polygon points="${pp}" fill="none" stroke="rgba(155,130,80,${f === 1 ? .5 : .2})" stroke-width="${f === 1 ? 1.2 : .5}"/>`;
  });

  // Axis lines
  AXES.forEach((_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(a)).toFixed(1)}" y2="${(cy + r * Math.sin(a)).toFixed(1)}" stroke="rgba(155,130,80,.3)" stroke-width=".8"/>`;
  });

  // Labels
  AXES.forEach((ax, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    s += `<text x="${(cx + tr * Math.cos(a)).toFixed(1)}" y="${(cy + tr * Math.sin(a)).toFixed(1)}"
      text-anchor="middle" dominant-baseline="middle"
      font-size="9.5" fill="${ax.color}" font-weight="bold" font-family="sans-serif">${ax.label}</text>`;
  });

  // Data polygon
  const pts = AXES.map((ax, i) => {
    const v = axisVal(sc, ax) / 10;
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${(cx + r * v * Math.cos(a)).toFixed(1)},${(cy + r * v * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  s += `<polygon points="${pts}" fill="rgba(155,42,26,.15)" stroke="#9b2a1a" stroke-width="2" stroke-linejoin="round"/>`;

  // Dots
  AXES.forEach((ax, i) => {
    const v = axisVal(sc, ax) / 10;
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    s += `<circle cx="${(cx + r * v * Math.cos(a)).toFixed(1)}" cy="${(cy + r * v * Math.sin(a)).toFixed(1)}"
      r="4" fill="${ax.color}" stroke="white" stroke-width="1.5"/>`;
  });

  // Centre grade
  s += `<text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="20" fill="${g.color}" font-weight="bold" font-family="sans-serif">${g.grade}</text>`;
  s += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="9" fill="#8a7a62" font-family="sans-serif">${overall}/100</text>`;
  s += '</svg>';
  return s;
}

function renderTabScores(s) {
  const sc = s.scores || {};
  const autoOv = calcOverall(sc);
  const overall = s.overallScore != null ? s.overallScore : autoOv;
  const g = getGrade(overall);

  // Axis summary bars
  const axBars = AXES.map(ax => {
    const v = axisVal(sc, ax);
    const pct = Math.round(v * 10);
    return `<div class="axb">
      <div class="axhd">
        <span class="axn">${ax.label}</span>
        <span class="axv" id="axv_${ax.key}_${s.id}" style="color:${ax.color}">${pct}</span>
      </div>
      <div class="axbg"><div class="axfill" id="axf_${ax.key}_${s.id}" style="width:${pct}%;background:${ax.color}"></div></div>
      <div class="axsub">${ax.dims.map(k => DIMS.find(d => d.key === k)?.label || k).join(' · ')}</div>
    </div>`;
  }).join('');

  // Dimension sliders (grouped by category)
  const cats = [...new Set(DIMS.map(d => d.cat))];
  const sliders = cats.map(cat => {
    const dims = DIMS.filter(d => d.cat === cat);
    return `<div class="dcat">${cat}</div>` + dims.map(d => {
      const v = sc[d.key] || 5;
      return `<div class="drow">
        <div class="dhd">
          <span class="dl">${d.label}${d.note ? ` <span style="font-size:.57rem;color:#8a7a62">（${d.note}）</span>` : ''}</span>
          <span class="dv" id="dv_${d.key}_${s.id}">${v}/10</span>
        </div>
        <input type="range" min="1" max="10" value="${v}"
          oninput="onDimSlide(this,'${s.id}','${d.key}')"
          onchange="saveDim('${s.id}','${d.key}',this.value)">
      </div>`;
    }).join('');
  }).join('');

  return `<div class="sw">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:var(--KAI);font-size:.82rem;color:var(--gold2);letter-spacing:.1em">六維能力圖</span>
      <div class="gc" id="gBadge_${s.id}" style="border-color:${g.color};color:${g.color}">${g.grade}</div>
    </div>

    <div id="hexWrap_${s.id}">${buildHexSvg(sc, overall)}</div>

    <div style="margin-bottom:13px">
      <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:4px">
        <span style="color:var(--txt3)">整體評分 <strong id="ovNum_${s.id}" style="color:var(--txt)">${overall}/100</strong></span>
        <span id="ovDesc_${s.id}" style="font-size:.61rem;color:var(--txt3)">${g.desc}</span>
      </div>
      <input type="range" min="0" max="100" value="${overall}"
        oninput="onOverallSlide(this,'${s.id}')"
        onchange="saveOverall('${s.id}',this.value)">
      <div style="font-size:.57rem;color:var(--txt3);margin-top:2px">手動拖動可覆蓋自動計算</div>
    </div>

    <div style="margin-bottom:12px">${axBars}</div>

    <details>
      <summary style="font-size:.67rem;color:var(--gold2);padding:5px 0;letter-spacing:.06em">展開各項詳細評分</summary>
      <div style="margin-top:9px">${sliders}</div>
    </details>

    <div style="font-size:.59rem;color:var(--txt3);border-top:1px solid var(--bdr);padding-top:6px;line-height:2;margin-top:8px">
      評分：1–3 待努力　4–5 一般　6–7 良好　8–9 優秀　10 卓越<br>
      S≥92 · A≥80 · B≥65 · C≥50 · D≥35 · F&lt;35
    </div>
  </div>`;
}

// Score slider handlers
function onDimSlide(el, sid, key) {
  const val = parseInt(el.value);
  const lbl = document.getElementById('dv_' + key + '_' + sid);
  if (lbl) lbl.textContent = val + '/10';
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  if (!s.scores) s.scores = {};
  s.scores[key] = val;
  refreshHex(sid);
}

function onOverallSlide(el, sid) {
  const val = parseInt(el.value);
  const g = getGrade(val);
  const lbl = document.getElementById('ovNum_' + sid);
  if (lbl) lbl.textContent = val + '/100';
  const desc = document.getElementById('ovDesc_' + sid);
  if (desc) desc.textContent = g.desc;
  const badge = document.getElementById('gBadge_' + sid);
  if (badge) { badge.textContent = g.grade; badge.style.borderColor = g.color; badge.style.color = g.color; }
  const s = DB.students.find(x => x.id === sid);
  if (s) s.overallScore = val;
}

function refreshHex(sid) {
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  const sc = s.scores || {};
  const autoOv = calcOverall(sc);
  const overall = s.overallScore != null ? s.overallScore : autoOv;

  const wrap = document.getElementById('hexWrap_' + sid);
  if (wrap) wrap.innerHTML = buildHexSvg(sc, overall);

  // Refresh axis bars
  AXES.forEach(ax => {
    const v = axisVal(sc, ax);
    const pct = Math.round(v * 10);
    const lbl = document.getElementById('axv_' + ax.key + '_' + sid);
    const bar = document.getElementById('axf_' + ax.key + '_' + sid);
    if (lbl) lbl.textContent = pct;
    if (bar) bar.style.width = pct + '%';
  });

  // Update badge if using auto score
  if (s.overallScore == null) {
    const g = getGrade(autoOv);
    const lbl = document.getElementById('ovNum_' + sid);
    if (lbl) lbl.textContent = autoOv + '/100';
    const badge = document.getElementById('gBadge_' + sid);
    if (badge) { badge.textContent = g.grade; badge.style.borderColor = g.color; badge.style.color = g.color; }
    const desc = document.getElementById('ovDesc_' + sid);
    if (desc) desc.textContent = g.desc;
  }
}

async function saveDim(sid, key, val) {
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  if (!s.scores) s.scores = {};
  s.scores[key] = parseInt(val);
  saveLocal();
  await fbSave('students', sid, s);
}

async function saveOverall(sid, val) {
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  s.overallScore = parseInt(val);
  saveLocal();
  await fbSave('students', sid, s);
}

// ────────────────────────────────────────────
// INCOME
// ────────────────────────────────────────────
function renderIncome() {
  let h = `<button class="btn p sm" onclick="openModalPayment(null)" style="margin-bottom:12px">新增收款</button>`;

  for (let i = 0; i < 6; i++) {
    const ym = monthISO(-i);
    const pays = DB.payments.filter(p => p.date && p.date.startsWith(ym))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!pays.length) continue;
    const total = pays.reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    h += `<div class="sh">${ym.replace('-', ' 年 ')} 月 <span style="color:var(--jade);font-size:.76rem;margin-left:4px">HK$${Math.round(total)}</span></div>`;
    pays.forEach(p => {
      const s = DB.students.find(x => x.id === p.studentId);
      h += `<div class="card" style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between">
          <span style="font-family:var(--KAI);font-size:.9rem;color:var(--jade)">HK$${Math.round(parseFloat(p.amount || 0))}</span>
          <span style="font-size:.63rem;color:var(--txt3)">${p.date || ''}</span>
        </div>
        <div style="font-size:.68rem;color:var(--txt3);margin-top:2px">
          ${[s ? s.name : '—', p.period, p.method, p.note].filter(Boolean).join(' · ')}
        </div>
      </div>`;
    });
  }

  if (!DB.payments.length) h += emptyState('帳', '尚未有收款記錄');
  document.getElementById('pg-income').querySelector('.dc').innerHTML = h;
}

// ────────────────────────────────────────────
// LINEAGE
// ────────────────────────────────────────────
function renderLineage() {
  const secOrder = ['guqin','guzheng','pipa','dizi','suona','hk'];
  let h = '';

  secOrder.forEach(key => {
    const sec = LINEAGE[key];
    if (!sec) return;
    h += `<div class="sh">${sec.label}</div>`;
    sec.masters.forEach(m => {
      const borderColor = sec.color;
      h += `<div class="lm" style="border-left-color:${borderColor}">
        <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
          <span class="lmn">${m.name}</span>
          <span class="lmy">${m.years}</span>
        </div>
        ${m.school ? `<div class="lms">${m.sect ? m.sect + ' · ' : ''}${m.school}</div>` : ''}
        <div class="lmd">${m.desc}</div>
        ${m.src ? `<div class="lmsrc">資料來源：${m.src}</div>` : ''}
        <a href="${m.yt}" target="_blank" class="ytl">YouTube 搜尋</a>
      </div>`;
    });
  });

  document.getElementById('pg-lineage').querySelector('.dc').innerHTML = h;
}

// ────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────
function renderSettings() {
  const curTheme = localStorage.getItem('luyin_theme') || 'dark';
  const curFs    = localStorage.getItem('luyin_fs')    || 'md';

  const themes = [
    { id:'dark',   label:'深色水墨', bg:'#1c1408', ac:'#9b2a1a' },
    { id:'light',  label:'淺色宣紙', bg:'#f5ede0', ac:'#9b2a1a' },
    { id:'hc',     label:'高對比',   bg:'#000',    ac:'#ffd700' },
    { id:'system', label:'跟隨系統', bg:'#666',    ac:'#999'    },
  ];
  const fszOpts = [
    { id:'sm', label:'小',   demo:'12px' },
    { id:'md', label:'標準', demo:'15px' },
    { id:'lg', label:'大',   demo:'18px' },
    { id:'xl', label:'特大', demo:'21px' },
  ];

  let h = '';

  // User card
  if (CU) {
    h += `<div class="card gold" style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--red);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff">
        ${CU.photoURL ? `<img src="${CU.photoURL}" style="width:100%;height:100%;object-fit:cover">` : (CU.displayName || CU.email || '?')[0].toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--KAI);font-size:.88rem;color:var(--txt);margin-bottom:2px">${CU.displayName || ''}</div>
        <div style="font-size:.65rem;color:var(--txt3);overflow:hidden;text-overflow:ellipsis">${CU.email || ''}</div>
      </div>
      <button class="btn s sm" onclick="doSignOut()">登出</button>
    </div>`;
  }

  // Theme
  h += `<div class="sh">介面主題</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px">`;
  themes.forEach(t => {
    h += `<div onclick="setTheme('${t.id}')" style="cursor:pointer;border:2px solid ${curTheme === t.id ? 'var(--red)' : 'var(--bdr)'};padding:8px;background:var(--card2)">
      <div style="height:22px;background:linear-gradient(to right,${t.bg} 60%,${t.ac});margin-bottom:5px;border-radius:1px"></div>
      <div style="font-size:.67rem;color:var(--txt2);text-align:center">${t.label}</div>
    </div>`;
  });
  h += `</div>`;

  // Font size
  h += `<div class="sh">字體大小</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">`;
  fszOpts.forEach(f => {
    h += `<div onclick="setFs('${f.id}')" style="cursor:pointer;border:2px solid ${curFs === f.id ? 'var(--red)' : 'var(--bdr)'};padding:8px;text-align:center;background:var(--card2)">
      <div style="font-family:var(--KAI);font-size:${f.demo};color:var(--txt);line-height:1.2">文</div>
      <div style="font-size:.6rem;color:var(--txt3);margin-top:3px">${f.label}</div>
    </div>`;
  });
  h += `</div>`;

  // Schools
  h += `<div class="sh">學校管理</div>`;
  DB.schools.forEach(sch => {
    h += `<div class="card" style="display:flex;align-items:center;margin-bottom:7px">
      <span style="flex:1;font-size:.8rem;color:var(--txt2)">${sch.name}</span>
      <button onclick="deleteSchool('${sch.id}')" style="font-size:.68rem;color:var(--txt3);background:none;border:none;cursor:pointer;padding:2px 5px">刪除</button>
    </div>`;
  });
  h += `<button class="btn s sm" onclick="openMo('moSchool')" style="margin-bottom:14px">新增學校</button>`;

  // Groups
  h += `<div class="sh">群組 / 班級管理</div>`;
  DB.groups.forEach(g => {
    h += `<div class="card" style="margin-bottom:7px">
      <div style="display:flex;align-items:center">
        <span style="flex:1;font-size:.8rem;color:var(--txt2)">${g.name}</span>
        <button onclick="openModalGroup('${g.id}')" style="font-size:.68rem;color:var(--gold2);background:none;border:none;cursor:pointer;margin-right:9px">編輯</button>
        <button onclick="deleteGroup('${g.id}')" style="font-size:.68rem;color:var(--txt3);background:none;border:none;cursor:pointer">刪除</button>
      </div>
      <div style="font-size:.62rem;color:var(--txt3);margin-top:3px">${(g.members || []).length} 名成員</div>
    </div>`;
  });
  h += `<button class="btn s sm" onclick="openModalGroup(null)" style="margin-bottom:14px">新增群組</button>`;

  document.getElementById('pg-settings').querySelector('.dc').innerHTML = h;
}

function setTheme(id) { localStorage.setItem('luyin_theme', id); applyTheme(); renderSettings(); }
function setFs(id)    { localStorage.setItem('luyin_fs', id);    applyFs();    renderSettings(); }

function applyTheme() {
  const id = localStorage.getItem('luyin_theme') || 'dark';
  let theme = id;
  if (id === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

function applyFs() {
  const id = localStorage.getItem('luyin_fs') || 'md';
  document.documentElement.className =
    document.documentElement.className.replace(/\bfs-\w+\b/g, '').trim() + ' fs-' + id;
}
