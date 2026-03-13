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
    ${statTile('本月收入', isPrivacyHidden() ? '●●●●' : 'HK$' + Math.round(monthIncome), '')}
  </div>`;

  if (todayLessons.length) {
    h += `<div class="sh">今日課堂</div>`;
    todayLessons.forEach(l => {
      const name = lessonName(l);
      h += `<div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:7px;cursor:pointer"
        onclick="${l.groupId ? "goPage('timetable')" : `openDetail('${l.studentId}')`}">
        <div style="font-family:var(--KAI);font-size:1rem;color:var(--gold);min-width:42px;text-align:center">${l.start || '—'}</div>
        <div>
          <div style="font-size:0.98rem;color:var(--txt)">${name}</div>
          <div style="font-size:0.85rem;color:var(--txt3)">${l.dur || 60} 分鐘${l.fee ? ' · HK$' + l.fee : ''}</div>
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
          <span style="font-family:var(--KAI);font-size:0.98rem;color:var(--txt)">${s.name}</span>
          <span style="font-size:0.84rem;color:var(--txt3)">${r.date || ''}</span>
        </div>
        <div style="font-size:0.92rem;color:var(--txt2);line-height:1.6">${(r.content || '').slice(0, 65)}${(r.content || '').length > 65 ? '…' : ''}</div>
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
    <div style="font-family:var(--KAI);font-size:1.2rem;color:var(--gold)">${val}<span style="font-size:0.83rem;color:var(--txt3)">${unit}</span></div>
    <div style="font-size:0.81rem;color:var(--txt3);margin-top:2px;letter-spacing:.06em">${label}</div>
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
// ── Google Calendar URL builder ──
function buildGcalUrl(l, ds) {
  const name = lessonName(l);
  const title = encodeURIComponent('音樂課：' + name);
  const loc = l.location ? encodeURIComponent(l.location) : '';
  const details = encodeURIComponent(l.note || '');
  if (!l.start || !ds) return 'https://calendar.google.com/';
  const [hh, mm] = l.start.split(':').map(Number);
  const dur = parseInt(l.dur || 60);
  // Format: YYYYMMDDTHHmmss
  const pad = n => String(n).padStart(2,'0');
  const startStr = ds.replace(/-/g,'') + 'T' + pad(hh) + pad(mm) + '00';
  const endDate = new Date(ds + 'T' + pad(hh) + ':' + pad(mm) + ':00');
  endDate.setMinutes(endDate.getMinutes() + dur);
  const endStr = endDate.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'').replace('Z','');
  const recur = l.type === 'fixed' ? '&recur=RRULE:FREQ%3DWEEKLY' : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&location=${loc}&details=${details}${recur}`;
}

function renderCal() {
  const y = UI.calYear, m = UI.calMonth;
  const MON = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  document.getElementById('calLabel').textContent = `${y} 年 ${MON[m]}`;

  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayISO();

  // Build set of once-skip dates per lessonId
  const onceSkips = new Set(DB.lessons
    .filter(l => l.type === 'once-skip')
    .map(l => l.lessonId + '|' + l.date));

  let html = '';
  for (let i = 0; i < firstDow; i++) html += `<div class="cd" style="background:transparent;cursor:default"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(y, m, d).getDay();
    const hasL = DB.lessons.some(l => {
      if (l.type === 'fixed') {
        if (parseInt(l.day) !== dow) return false;
        if (onceSkips.has(l.id + '|' + ds)) return false;
        if (l.dateFrom && ds < l.dateFrom) return false;
        if (l.dateTo   && ds > l.dateTo)   return false;
        return true;
      }
      return l.type === 'once' && l.date === ds;
    });
    const isToday = ds === today;
    const isSel = ds === UI.calSelDay;
    html += `<div class="cd${isToday ? ' today' : ''}${hasL ? ' has' : ''}${isSel ? ' sel' : ''}" onclick="calDayClick('${ds}')">
      <div class="cn">${d}</div>
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
  if (!UI.calSelDay) UI.calSelDay = today;
  renderDayPanel(UI.calSelDay);
}

function calPrev() { UI.calMonth--; if (UI.calMonth < 0) { UI.calMonth = 11; UI.calYear--; } renderCal(); }
function calNext() { UI.calMonth++; if (UI.calMonth > 11) { UI.calMonth = 0; UI.calYear++; } renderCal(); }
function calDayClick(ds) { UI.calSelDay = ds; renderCal(); }

function renderDayPanel(ds) {
  if (!ds) return;
  const dow = new Date(ds + 'T00:00:00').getDay();
  const now = new Date();

  const skipSet = new Set(DB.lessons
    .filter(l => l.type === 'once-skip' && l.date === ds)
    .map(l => l.lessonId));
  const lessons = DB.lessons.filter(l => {
    if (l.type === 'fixed') {
      if (parseInt(l.day) !== dow) return false;
      if (skipSet.has(l.id)) return false;
      if (l.dateFrom && ds < l.dateFrom) return false;
      if (l.dateTo   && ds > l.dateTo)   return false;
      return true;
    }
    return l.type === 'once' && l.date === ds;
  }).sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  const skipped  = new Set((DB.records || []).filter(r => r.date === ds && r.attend === 'absent'  && r.lessonId).map(r => r.lessonId));
  const attended = new Set((DB.records || []).filter(r => r.date === ds && r.attend === 'present' && r.lessonId).map(r => r.lessonId));

  let h = `<div class="sh">${ds}</div>`;
  if (!lessons.length) {
    h += `<div style="font-size:0.94rem;color:var(--txt3);padding:8px 0">此日無課堂安排</div>`;
  } else {
    lessons.forEach(l => {
      const name = lessonName(l);
      const isGrp = !!l.groupId;
      const isSkip = skipped.has(l.id);
      let isDone = attended.has(l.id);
      let isAuto = false;

      // Auto-confirm: if lesson end time has passed and no manual record
      if (!isDone && !isSkip && l.start) {
        const [hh, mm] = l.start.split(':').map(Number);
        const lessonEnd = new Date(ds + 'T00:00:00');
        lessonEnd.setMinutes(hh * 60 + mm + parseInt(l.dur || 60));
        if (now > lessonEnd) { isDone = true; isAuto = true; }
      }

      const cred = l.studentId ? (DB.credits || []).find(c => c.studentId === l.studentId) : null;
      const credLeft = cred ? (cred.total - cred.used) : null;
      const border = isSkip ? 'border-left:3px solid var(--red)' : isDone ? 'border-left:3px solid var(--jade)' : '';

      // Location line with Maps link
      const locHtml = l.location
        ? `<div style="font-size:0.80rem;color:var(--txt3);margin-top:2px">
             📍 <a href="https://maps.google.com/?q=${encodeURIComponent(l.location)}" target="_blank"
                style="color:var(--gold2);text-decoration:underline">${l.location}</a>
           </div>`
        : '';

      // Google Calendar link for this specific occurrence
      const gcalUrl = buildGcalUrl(l, ds);

      h += `<div class="card" style="display:flex;gap:10px;margin-bottom:7px;${border}">
        <div style="font-family:var(--KAI);font-size:0.97rem;color:var(--gold);min-width:40px;flex-shrink:0;padding-top:2px">${l.start || '—'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.98rem;color:var(--txt);margin-bottom:2px">
            ${name}
            ${isGrp ? ' <span style="font-size:0.80rem;color:var(--jade);border:1px solid var(--jade);padding:1px 4px">群組</span>' : ''}
            ${isSkip ? ' <span style="font-size:0.80rem;color:var(--red)">請假</span>' : ''}
            ${isDone ? ` <span style="font-size:0.80rem;color:var(--jade)">${isAuto ? '已上堂' : '✓已上堂'}</span>` : ''}
          </div>
          <div style="font-size:0.84rem;color:var(--txt3)">
          ${l.instrument ? `<span style="color:var(--gold2)">♩ ${l.instrument}</span> · ` : ''}${l.dur||60} 分 · ${l.type==='fixed'?'固定每週':'單次'}${l.dateFrom||l.dateTo ? ` · ${l.dateFrom||''}${l.dateTo?' 至 '+l.dateTo:''}` : ''}${credLeft!==null&&!isPrivacyHidden()?' · 剩 '+credLeft+' 節':''}
        </div>
          ${locHtml}
          <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
            ${!isDone && !isSkip ? `<button onclick="confirmAttend('${l.id}','${ds}')" class="btn s sm">✓確認上堂</button>` : ''}
            ${isSkip
              ? `<button onclick="unskipLesson('${l.id}','${ds}')" class="btn s sm">取消請假</button>`
              : `<button onclick="skipLesson('${l.id}','${ds}')" class="btn s sm" style="color:var(--red)">請假</button>`}
            ${l.type==='once'
              ? `<button onclick="deleteLesson('${l.id}')" class="btn s sm" style="color:var(--red)">刪除</button>`
              : `<button onclick="skipOneLesson('${l.id}','${ds}')" class="btn s sm">單次刪除</button>`}
            <button onclick="openModalLesson(null,'${l.id}')" class="btn s sm">編輯</button>
            <button onclick="openModalPlan('${l.studentId||''}','${l.groupId||''}','${l.instrument||''}')" class="btn s sm" style="color:var(--gold2)">✎ 教案</button>
            ${l.studentId ? `<button onclick="openParentContact('${l.studentId}')" class="btn s sm" style="color:var(--jade)">📞 聯絡家長</button>` : ''}
            <a href="${gcalUrl}" target="_blank" class="btn s sm" style="text-decoration:none">📅 日曆</a>
          </div>
        </div>
      </div>`;
    });
  }
  document.getElementById('calPanel').innerHTML = h
    + `<button class="btn p" onclick="openModalLesson('${ds}')" style="margin-top:10px;width:100%">＋ 新增課堂</button>`;
}

// ────────────────────────────────────────────
// PLANS PAGE (教案查閱)
// ────────────────────────────────────────────
let _planFilter = 'all'; // 'all' | studentId | 'groups'

function renderPlansPage() {
  const evalEmoji = ['','😟','😐','🙂','😊','🌟'];
  const plans = [...(DB.plans || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // ── Search bar ──
  const qEl = document.getElementById('planQ');
  const q = qEl ? qEl.value.toLowerCase() : '';

  // ── Filter chips: All | Groups | each student ──
  let chips = `<div class="chips" style="margin-bottom:10px;flex-wrap:wrap">
    <div class="ch${_planFilter==='all'?' on':''}" onclick="_planFilter='all';renderPlansPage()">全部</div>
    <div class="ch${_planFilter==='groups'?' on':''}" onclick="_planFilter='groups';renderPlansPage()">👥 群組</div>`;
  DB.students.forEach(s => {
    chips += `<div class="ch${_planFilter===s.id?' on':''}" onclick="_planFilter='${s.id}';renderPlansPage()">${s.name}</div>`;
  });
  chips += '</div>';

  // ── Filter ──
  let filtered = plans;
  if (_planFilter === 'groups') {
    filtered = plans.filter(p => !!p.groupId);
  } else if (_planFilter !== 'all') {
    filtered = plans.filter(p => p.studentId === _planFilter);
  }
  if (q) {
    filtered = filtered.filter(p =>
      (p.goal||'').toLowerCase().includes(q) ||
      (p.plan||'').toLowerCase().includes(q) ||
      (p.piece||'').toLowerCase().includes(q) ||
      (p.record||'').toLowerCase().includes(q) ||
      (p.hw||'').toLowerCase().includes(q) ||
      (p.next||'').toLowerCase().includes(q)
    );
  }

  // ── Build grouped view: per student+instrument or per group ──
  // Group key: groupId | studentId+instrument (instrument from plan, not student default)
  const getKey = p => p.groupId ? ('g:' + p.groupId) : ('s:' + p.studentId + ':' + (p.instrument || ''));
  const getName = p => {
    if (p.groupId) {
      const g = DB.groups.find(x => x.id === p.groupId);
      return g ? '👥 ' + g.name : '👥 群組';
    }
    const s = DB.students.find(x => x.id === p.studentId);
    if (!s) return '—';
    const inst = p.instrument || s.instrument || '';
    return s.name + (inst ? ' · ' + inst : '');
  };

  // Group plans by key, preserving date-sorted order within each group
  const groupMap = new Map();
  filtered.forEach(plan => {
    const k = getKey(plan);
    if (!groupMap.has(k)) groupMap.set(k, []);
    groupMap.get(k).push(plan);
  });

  let content = '';
  if (!filtered.length) {
    content = emptyState('案', '尚未有教案記錄');
  } else if (_planFilter === 'all' || _planFilter === 'groups') {
    // All view: flat list grouped by entity
    groupMap.forEach((groupPlans, key) => {
      const latest = groupPlans[0]; // already sorted desc
      const displayName = getName(latest);
      const sid = latest.studentId || '';
      const gid = latest.groupId || '';
      content += `<div style="margin-bottom:4px;padding:6px 10px;background:var(--bg2);border:1px solid var(--bdr2);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:0.90rem;color:var(--gold2);font-family:var(--KAI)">${displayName}</div>
        <button onclick="openModalPlan('${sid}','${gid}')" class="btn p sm">＋ 教案</button>
      </div>`;
      groupPlans.forEach((plan, i) => {
        const evalV = parseInt(plan.eval) || 0;
        // Carry-forward: check gap from previous plan for same entity
        let carryHtml = '';
        if (i > 0) {
          const prev = new Date(groupPlans[i-1].date + 'T00:00:00');
          const curr = new Date(plan.date + 'T00:00:00');
          const diffDays = Math.round((prev - curr) / 86400000);
          if (diffDays > 13) {
            carryHtml = `<div class="plan-carry">↑ 上方教案沿用 ${diffDays} 天（${groupPlans[i-1].date} 至 ${plan.date}）</div>`;
          }
        }
        content += carryHtml + renderPlanCard(plan, evalEmoji, displayName, false);
      });
      content += `<div style="height:8px"></div>`;
    });
  } else {
    // Single student/group view — show plans chronologically with carry-forward
    filtered.forEach((plan, i) => {
      const displayName = getName(plan);
      let carryHtml = '';
      if (i > 0) {
        const prev = new Date(filtered[i-1].date + 'T00:00:00');
        const curr = new Date(plan.date + 'T00:00:00');
        const diffDays = Math.round((prev - curr) / 86400000);
        if (diffDays > 13) {
          carryHtml = `<div class="plan-carry">↑ 此教案沿用 ${diffDays} 天（${filtered[i-1].date} → ${plan.date}）</div>`;
        }
      }
      const evalV = parseInt(plan.eval) || 0;
      content += carryHtml + renderPlanCard(plan, evalEmoji, displayName, true);
    });
  }

  const totalLabel = `<div style="font-size:0.80rem;color:var(--txt3);margin-bottom:10px">${filtered.length} 份教案${q ? '（搜尋結果）' : ''}</div>`;

  const h = `
    <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">
      <button class="btn p sm" onclick="openModalPlan()" style="flex-shrink:0">＋ 新增教案</button>
      <input class="fi" id="planQ" placeholder="搜尋教案內容…" oninput="renderPlansPage()"
        style="flex:1;margin:0;height:34px;font-size:0.88rem" value="${q}">
    </div>
    ${chips}
    ${totalLabel}
    ${content}`;

  document.getElementById('pg-plans').querySelector('.dc').innerHTML = h;
}

function renderPlanCard(plan, evalEmoji, displayName, showName) {
  const evalV = parseInt(plan.eval) || 0;
  const sid = plan.studentId || '';
  const gid = plan.groupId || '';
  const inst = plan.instrument || '';
  return `<div class="pc" style="margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div>
        ${showName && displayName ? `<div style="font-size:0.82rem;color:var(--gold2);margin-bottom:2px">${displayName}</div>` : ''}
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.81rem;color:var(--txt3)">${plan.date || ''}</span>
          ${inst ? `<span style="font-size:0.75rem;color:var(--gold2);border:1px solid var(--gold2);padding:0 5px">♩ ${inst}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${evalV ? `<span style="font-size:1.05rem" title="整體評估">${evalEmoji[evalV]}</span>` : ''}
        <button onclick="openModalPlan('${sid}','${gid}','${inst}')" class="btn p sm" style="font-size:0.75rem">＋新教案</button>
        <button onclick="deletePlan('${plan.id}')" style="font-size:0.78rem;color:var(--txt3);background:none;border:none;cursor:pointer;padding:2px 4px">✕</button>
      </div>
    </div>
    ${plan.goal   ? `<div class="psl">教學目標</div><div class="pt">${plan.goal}</div>` : ''}
    ${plan.plan   ? `<div class="psl" style="margin-top:6px">教案內容</div><div class="pt" style="white-space:pre-wrap">${plan.plan}</div>` : ''}
    ${plan.piece  ? `<div style="font-size:0.85rem;color:var(--txt3);margin-top:4px">🎵 ${plan.piece}</div>` : ''}
    ${plan.hw     ? `<div style="font-size:0.85rem;color:var(--txt3);margin-top:3px">📝 功課：${plan.hw}</div>` : ''}
    ${plan.record ? `<div class="psl" style="margin-top:8px;color:var(--jade)">實際記錄</div><div class="pt">${plan.record}</div>` : ''}
    ${plan.next   ? `<div style="font-size:0.85rem;color:var(--gold2);margin-top:6px;padding-top:5px;border-top:1px solid var(--bdr)">➡ 下次：${plan.next}</div>` : ''}
  </div>`;
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
    const _hideGrade = isPrivacyHidden();
    const g = (!_hideGrade && s.overallScore != null) ? getGrade(s.overallScore) : null;
    const rc = DB.records.filter(r => r.studentId === s.id).length;
    return `<div class="sc" onclick="openDetail('${s.id}')">
      <div class="av">${s.name[0]}</div>
      <div class="si">
        <div class="sn">${s.name}${s.nameEn ? `<span style="font-size:0.85rem;color:var(--txt3);font-weight:400;margin-left:5px">${s.nameEn}</span>` : ''}</div>
        <div class="ss">${[s.instrument, s.level, sch ? sch.name : null].filter(Boolean).join(' · ')}</div>
        <div style="font-size:0.81rem;color:var(--txt3);margin-top:1px">${rc} 條記錄</div>
      </div>
      ${_hideGrade ? `<div class="gc" style="border-color:var(--bdr2);color:var(--txt3);font-size:0.72rem">●●</div>` : (g ? `<div class="gc" style="border-color:${g.color};color:${g.color}">${g.grade}</div>` : '')}
    </div>`;
  }).join('');
}

// ────────────────────────────────────────────
// DETAIL TABS
// ────────────────────────────────────────────
function renderTabRecords(s) {
  const recs = DB.records.filter(r => r.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let h = `<button class="btn p sm" onclick="openModalRecord('${s.id}')" style="margin-bottom:11px"><svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新增記錄</button>`;
  if (!recs.length) return h + emptyState('錄', '尚未有課堂記錄');
  const attendLabel = { present:'出席', absent:'請假', makeup:'補堂' };
  const attendCls   = { present:'p',    absent:'a',    makeup:'m' };
  h += recs.map(r => `
    <div class="ri ${r.attend === 'absent' ? 'absent' : r.attend === 'makeup' ? 'makeup' : ''}">
      <div class="rd">${r.date || ''} <span class="pill ${attendCls[r.attend] || 'p'}">${attendLabel[r.attend] || '出席'}</span></div>
      <div class="rc">${r.content || ''}</div>
      ${r.piece ? `<div style="font-size:0.87rem;color:var(--gold2);margin-top:3px">♩ ${r.piece}</div>` : ''}
      <div style="font-size:0.84rem;color:var(--txt3);margin-top:4px">
        ${'★'.repeat(parseInt(r.rating) || 3)} ${['','待改進','一般','良好','優秀','卓越'][parseInt(r.rating) || 3]}
        ${r.hw ? ` · 功課：${r.hw}` : ''}
      </div>
    </div>`).join('');
  return h;
}

function renderTabPlans(s) {
  const plans = DB.plans.filter(p => p.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const evalEmoji = ['','😟','😐','🙂','😊','🌟'];
  let h = `<button class="btn p sm" onclick="openModalPlan('${s.id}')" style="margin-bottom:11px"><svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新增教案</button>`;
  if (!plans.length) return h + emptyState('案', '尚未有教案記錄');
  h += plans.map(p => {
    const evalV = parseInt(p.eval) || 0;
    return `
    <div class="pc">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:0.84rem;color:var(--txt3)">${p.date || ''}</div>
        ${evalV ? `<div style="font-size:1.1rem" title="整體評估">${evalEmoji[evalV]}</div>` : ''}
      </div>
      ${p.goal   ? `<div class="psl">教學目標</div><div class="pt">${p.goal}</div>` : ''}
      ${p.plan   ? `<div class="psl" style="margin-top:6px">教案內容</div><div class="pt" style="white-space:pre-wrap">${p.plan}</div>` : ''}
      ${p.piece  ? `<div style="font-size:0.86rem;color:var(--txt3);margin-top:5px">🎵 ${p.piece}</div>` : ''}
      ${p.hw     ? `<div style="font-size:0.86rem;color:var(--txt3);margin-top:4px">📝 功課：${p.hw}</div>` : ''}
      ${p.record ? `<div class="psl" style="margin-top:8px;color:var(--jade)">實際記錄</div><div class="pt">${p.record}</div>` : ''}
      ${p.next   ? `<div style="font-size:0.86rem;color:var(--gold2);margin-top:6px;padding-top:6px;border-top:1px solid var(--bdr)">➡ 下次：${p.next}</div>` : ''}
    </div>`;
  }).join('');
  return h;
}

function renderTabProfile(s) {
  const sch = DB.schools.find(x => x.id === s.schoolId);
  const age = s.dob ? Math.floor((Date.now() - new Date(s.dob)) / (365.25 * 24 * 3600 * 1000)) : null;
  const genderLabel = { M:'男', F:'女' };

  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px">
    <div style="font-size:0.93rem;color:var(--txt2)">學生資料</div>
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

  // Parent contact buttons
  if (s.phone) {
    h += `<div style="display:flex;gap:8px;margin-bottom:10px;margin-top:-4px">
      <button class="btn p sm" style="flex:1;background:#25D366;border-color:#25D366" onclick="openParentContact('${s.id}')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>WhatsApp 家長
      </button>
      <button class="btn s sm" style="flex:1" onclick="openParentContact('${s.id}')">💬 微信 / 其他</button>
    </div>`;
  }

  if (s.defaultFee || s.payMethod) {
    const _hideAmt = isPrivacyHidden();
    h += infoCard('學費', [
      infoRow('每堂學費', s.defaultFee ? (_hideAmt ? '●●●●' : 'HK$' + s.defaultFee) : ''),
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
      <div style="font-size:0.81rem;color:var(--gold2);letter-spacing:.1em;margin-bottom:6px">近期曲目</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${pieces.map(p => `<span class="pill">♩ ${p}</span>`).join('')}</div>
    </div>`;
  }

  h += `<button class="btn d" style="margin-top:8px" onclick="confirmDeleteStudent('${s.id}')">刪除此學生及所有記錄</button>`;
  return h;
}

function renderTabFees(s) {
  const hide = isPrivacyHidden();
  const recs = DB.records.filter(r => r.studentId === s.id);
  const pays = DB.payments.filter(p => p.studentId === s.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const cred = (DB.credits || []).find(c => c.studentId === s.id);

  const present = recs.filter(r => r.attend === 'present' || !r.attend).length;
  const absent  = recs.filter(r => r.attend === 'absent').length;
  const makeup  = recs.filter(r => r.attend === 'makeup').length;
  const total   = pays.reduce((a, p) => a + parseFloat(p.amount || 0), 0);

  const credTotal = cred ? cred.total : 0;
  const credUsed  = cred ? cred.used  : 0;
  const credLeft  = credTotal - credUsed;

  let h = `<div class="card gold" style="margin-bottom:10px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:9px">
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--jade)">${present}</div><div style="font-size:0.81rem;color:var(--txt3)">已上堂</div></div>
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--red)">${absent}</div><div style="font-size:0.81rem;color:var(--txt3)">請假</div></div>
      <div><div style="font-family:var(--KAI);font-size:1.15rem;color:var(--gold2)">${makeup}</div><div style="font-size:0.81rem;color:var(--txt3)">補堂</div></div>
    </div>
    ${!hide ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;padding-top:9px;border-top:1px solid var(--bdr)">
      <div style="text-align:center">
        <div style="font-family:var(--KAI);font-size:1.1rem;color:var(--jade)">${credLeft}</div>
        <div style="font-size:0.81rem;color:var(--txt3)">剩餘課節</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:var(--KAI);font-size:1.1rem;color:var(--txt2)">HK$${Math.round(total)}</div>
        <div style="font-size:0.81rem;color:var(--txt3)">總收款</div>
      </div>
    </div>` : ''}
  </div>

  <div style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap">
    <button class="btn p sm" onclick="openModalPayment('${s.id}')">新增收款</button>
    <button class="btn s sm" onclick="openModalAddCredits('${s.id}')">增加課節</button>
  </div>`;

  if (!pays.length) {
    h += `<div class="sh">收款記錄</div><div style="font-size:0.94rem;color:var(--txt3);padding:6px 0">尚未有收款記錄</div>`;
    return h;
  }

  h += `<div class="sh">收款記錄</div>`;
  h += pays.map(p => `<div class="card" style="margin-bottom:7px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--jade)">${hide ? '●●●●' : 'HK$' + Math.round(parseFloat(p.amount || 0))}</div>
      <div style="font-size:0.84rem;color:var(--txt3)">${p.date || ''}</div>
    </div>
    <div style="font-size:0.87rem;color:var(--txt3);margin-top:2px">
      ${[p.period, p.method, p.note, p.credits ? '+' + p.credits + '節' : ''].filter(Boolean).join(' · ')}
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
  const overall = calcOverall(sc);
  const g = getGrade(overall);

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

  const cats = [...new Set(DIMS.map(d => d.cat))];
  const sliders = cats.map(cat => {
    const dims = DIMS.filter(d => d.cat === cat);
    return `<div class="dcat">${cat}</div>` + dims.map(d => {
      const v = sc[d.key] || 5;
      return `<div class="drow">
        <div class="dhd">
          <span class="dl">${d.label}${d.note ? ` <span style="font-size:0.79rem;color:#8a7a62">（${d.note}）</span>` : ''}</span>
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
      <span style="font-family:var(--KAI);font-size:0.98rem;color:var(--gold2);letter-spacing:.1em">六維能力圖</span>
      <div class="gc" id="gBadge_${s.id}" style="border-color:${g.color};color:${g.color}">${g.grade}</div>
    </div>

    <div id="hexWrap_${s.id}">${buildHexSvg(sc, overall)}</div>

    <div style="display:flex;justify-content:space-between;font-size:0.89rem;margin-bottom:14px">
      <span style="color:var(--txt3)">整體評分 <strong id="ovNum_${s.id}" style="color:var(--txt)">${overall}/100</strong></span>
      <span id="ovDesc_${s.id}" style="color:var(--txt3)">${g.desc}</span>
    </div>

    <div style="margin-bottom:12px">${axBars}</div>

    <details>
      <summary class="expand-btn">▸ 展開各項詳細評分</summary>
      <div style="margin-top:9px">${sliders}</div>
    </details>

    <div style="font-size:0.81rem;color:var(--txt3);border-top:1px solid var(--bdr);padding-top:6px;line-height:2;margin-top:8px">
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

function refreshHex(sid) {
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  const sc = s.scores || {};
  const overall = calcOverall(sc);
  const g = getGrade(overall);
  const wrap = document.getElementById('hexWrap_' + sid);
  if (wrap) wrap.innerHTML = buildHexSvg(sc, overall);
  AXES.forEach(ax => {
    const pct = Math.round(axisVal(sc, ax) * 10);
    const lbl = document.getElementById('axv_' + ax.key + '_' + sid);
    const bar = document.getElementById('axf_' + ax.key + '_' + sid);
    if (lbl) lbl.textContent = pct;
    if (bar) bar.style.width = pct + '%';
  });
  const lbl = document.getElementById('ovNum_' + sid);
  if (lbl) lbl.textContent = overall + '/100';
  const badge = document.getElementById('gBadge_' + sid);
  if (badge) { badge.textContent = g.grade; badge.style.borderColor = g.color; badge.style.color = g.color; }
  const desc = document.getElementById('ovDesc_' + sid);
  if (desc) desc.textContent = g.desc;
}

async function saveDim(sid, key, val) {
  const s = DB.students.find(x => x.id === sid);
  if (!s) return;
  if (!s.scores) s.scores = {};
  s.scores[key] = parseInt(val);
  saveLocal();
  await fbSave('students', sid, s);
}

// ────────────────────────────────────────────
// INCOME
// ────────────────────────────────────────────
function renderIncome() {
  const hide = isPrivacyHidden();
  let h = `<button class="btn p sm" onclick="openModalPayment(null)" style="margin-bottom:12px">新增收款</button>`;

  // Monthly totals summary (top 6 months)
  let hasAny = false;
  for (let i = 0; i < 6; i++) {
    const ym = monthISO(-i);
    const pays = DB.payments.filter(p => p.date && p.date.startsWith(ym))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!pays.length) continue;
    hasAny = true;
    const total = pays.reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const ymLabel = ym.replace('-', ' 年 ') + ' 月';
    h += `<div class="sh">${ymLabel}`;
    if (!hide) h += ` <span style="color:var(--jade);font-size:0.95rem;margin-left:4px">HK$${Math.round(total)}</span>`;
    h += `</div>`;
    pays.forEach(p => {
      const stu = DB.students.find(x => x.id === p.studentId);
      h += `<div class="card" style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:var(--KAI);font-size:0.99rem;color:var(--jade)">${hide ? '●●●●' : 'HK$' + Math.round(parseFloat(p.amount || 0))}</span>
          <span style="font-size:0.84rem;color:var(--txt3)">${p.date || ''}</span>
        </div>
        <div style="font-size:0.89rem;color:var(--txt3);margin-top:2px">
          ${[stu ? stu.name : '—', p.period, p.method, p.note, p.credits ? '+' + p.credits + '節' : ''].filter(Boolean).join(' · ')}
        </div>
      </div>`;
    });
  }

  if (!hasAny) h += emptyState('帳', '尚未有收款記錄');
  document.getElementById('pg-income').querySelector('.dc').innerHTML = h;
}

// ────────────────────────────────────────────
// LINEAGE
// ────────────────────────────────────────────
// ── 傳承頁：已移至教學參考頁（renderRef） ──

function renderLineage(tab) { renderRef('lineage'); }

// ────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────
function renderSettings() {
  const curTheme = localStorage.getItem('luyin_theme') || 'dark';
  const curFs    = localStorage.getItem('luyin_fs')    || 'md';

  const themes = [
    { id:'dark',   label:'深色水墨', bg:'linear-gradient(to right,#1c1408 60%,#9b2a1a)' },
    { id:'light',  label:'淺色宣紙', bg:'linear-gradient(to right,#f5ede0 60%,#9b2a1a)' },
    { id:'hc',     label:'高對比',   bg:'linear-gradient(to right,#000 60%,#ffd700)'    },
    { id:'system', label:'跟隨系統', bg:'linear-gradient(to right,#555 60%,#888)'       },
  ];
  const fszOpts = [
    { id:'sm', label:'小',   px:'14px' },
    { id:'md', label:'標準', px:'17px' },
    { id:'lg', label:'大',   px:'20px' },
    { id:'xl', label:'特大', px:'24px' },
  ];

  let h = '';

  // User card
  if (CU) {
    h += `<div class="card gold" style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--red);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff">
        ${CU.photoURL ? `<img src="${CU.photoURL}" style="width:100%;height:100%;object-fit:cover">` : (CU.displayName || CU.email || '?')[0].toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--txt);margin-bottom:2px">${CU.displayName || ''}</div>
        <div style="font-size:0.86rem;color:var(--txt3);overflow:hidden;text-overflow:ellipsis">${CU.email || ''}</div>
      </div>
      <button class="btn s sm" onclick="doSignOut()">登出</button>
    </div>`;
  }

  // Theme
  h += `<div class="sh">介面主題</div><div class="theme-grid">`;
  themes.forEach(t => {
    h += `<div class="theme-tile${curTheme === t.id ? ' on' : ''}" onclick="setTheme('${t.id}')">
      <div class="theme-swatch" style="background:${t.bg}"></div>
      <div class="theme-label">${t.label}</div>
    </div>`;
  });
  h += `</div>`;

  // Font size
  h += `<div class="sh">字體大小</div><div class="fs-grid">`;
  fszOpts.forEach(f => {
    h += `<div class="fs-tile${curFs === f.id ? ' on' : ''}" onclick="setFs('${f.id}')">
      <div class="fs-demo" style="font-size:${f.px}">文</div>
      <div class="fs-label">${f.label}</div>
    </div>`;
  });
  h += `</div>`;

  // Quick navigation
  h += `<div class="sh">功能頁面</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px">
    <div onclick="goPage('ref')" class="card" style="cursor:pointer;text-align:center;padding:14px 8px">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold2)" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      <div style="font-family:var(--KAI);font-size:0.91rem;color:var(--gold2);margin-top:6px">教學參考</div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:2px">傳承 · 考級 · 資源</div>
    </div>
    <div onclick="goPage('tasks')" class="card" style="cursor:pointer;text-align:center;padding:14px 8px">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold2)" stroke-width="1.5"><rect x="9" y="11" width="4" height="10"/><path d="M9 11V6a3 3 0 0 1 6 0v5"/><rect x="3" y="6" width="18" height="5" rx="1"/></svg>
      <div style="font-family:var(--KAI);font-size:0.91rem;color:var(--gold2);margin-top:6px">任務管理</div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:2px">派發 · 追蹤進度</div>
    </div>
  </div>`;

  // Privacy toggle — single switch
  const hideAll = isPrivacyHidden();
  h += `<div class="sh">隱私模式</div>
  <div class="card" style="margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-size:0.96rem;color:var(--txt2);margin-bottom:3px">一鍵隱藏所有隱私資訊</div>
        <div style="font-size:0.83rem;color:var(--txt3);line-height:1.7">隱藏學費金額、收款記錄、能力評級及課節數量，以 ●●●● 顯示</div>
      </div>
      <div class="priv-toggle${hideAll?' on':''}" onclick="toggleAllPrivacy()">
        <div class="priv-thumb"></div>
      </div>
    </div>
  </div>`;

  // Schools
  h += `<div class="sh">學校管理</div>`;
  DB.schools.forEach(sch => {
    h += `<div class="card" style="display:flex;align-items:center;margin-bottom:7px">
      <span style="flex:1;font-size:0.96rem;color:var(--txt2)">${sch.name}</span>
      <button onclick="deleteSchool('${sch.id}')" style="font-size:0.89rem;color:var(--txt3);background:none;border:none;cursor:pointer;padding:2px 5px">刪除</button>
    </div>`;
  });
  h += `<button class="btn s sm" onclick="openMo('moSchool')" style="margin-bottom:14px">新增學校</button>`;

  // Groups
  h += `<div class="sh">群組 / 班級管理</div>`;
  DB.groups.forEach(g => {
    h += `<div class="card" style="margin-bottom:7px">
      <div style="display:flex;align-items:center">
        <span style="flex:1;font-size:0.96rem;color:var(--txt2)">${g.name}</span>
        <button onclick="openModalGroup('${g.id}')" style="font-size:0.89rem;color:var(--gold2);background:none;border:none;cursor:pointer;margin-right:9px">編輯</button>
        <button onclick="deleteGroup('${g.id}')" style="font-size:0.89rem;color:var(--txt3);background:none;border:none;cursor:pointer">刪除</button>
      </div>
      <div style="font-size:0.83rem;color:var(--txt3);margin-top:3px">${(g.members || []).length} 名成員</div>
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

// ────────────────────────────────────────────
// EXAM DATABASE PAGE
// ────────────────────────────────────────────
function renderExam() {
  let h = `<div style="font-size:0.89rem;color:var(--txt3);line-height:1.9;margin-bottom:14px;padding:10px 12px;background:var(--card);border-left:3px solid var(--gold2)">
    以下考級資料僅供參考，請以各機構官方網站公佈為準。
  </div>`;

  EXAMS.forEach(ex => {
    h += `<div class="card gold" style="margin-bottom:10px">
      <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--gold);margin-bottom:4px">${ex.name}</div>
      <div style="font-size:0.88rem;color:var(--jade);letter-spacing:.06em;margin-bottom:6px">${ex.grades}</div>
      <div style="font-size:0.91rem;color:var(--txt2);line-height:1.7;margin-bottom:7px">${ex.note}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:0.78rem;color:var(--txt3)">來源：${ex.src}</div>
        <a href="${ex.url}" target="_blank" style="font-size:0.84rem;color:var(--gold2);border:1px solid var(--bdr2);padding:3px 9px;text-decoration:none;letter-spacing:.06em">官網 ↗</a>
      </div>
    </div>`;
  });

  document.getElementById('pg-exam').querySelector('.dc').innerHTML = h;
}

// ────────────────────────────────────────────
// REFERENCE / TEACHING RESOURCES PAGE
// ────────────────────────────────────────────
const REF_ITEMS = [
  { cat:'樂理與視唱', items:[
    { title:'樂理基礎 — 香港音樂專科學校', url:'https://www.hksmschool.com', note:'本地樂理課程資源' },
    { title:'樂理網 musictheory.net', url:'https://www.musictheory.net', note:'免費互動樂理教學，支援多語言' },
    { title:'視唱練耳 — 中央音樂學院', url:'https://www.ccom.edu.cn', note:'聽音、節奏、視唱系統訓練' },
  ]},
  { cat:'中樂資源', items:[
    { title:'香港中樂團 教育資源', url:'https://www.hkco.org', note:'中樂欣賞、樂器介紹、音樂會資料' },
    { title:'中央音樂學院 附中課程', url:'https://www.ccom.edu.cn', note:'中樂各科教學大綱及考級資料' },
    { title:'上海音樂學院 民樂系', url:'https://www.shcmuseum.com', note:'民族樂器研究及演奏錄像資料' },
    { title:'YouTube — 古箏頻道精選', url:'https://www.youtube.com/results?search_query=古箏+教學', note:'各程度示範及教學錄像' },
  ]},
  { cat:'考試準備', items:[
    { title:'ABRSM 考試指引', url:'https://www.abrsm.org/exam-guidance', note:'考試當日指引、評分標準' },
    { title:'Trinity 評分準則', url:'https://www.trinitycollege.com/qualifications/music', note:'各級評分細則及示範錄音' },
    { title:'人音考級教材', url:'http://www.rccm.com.cn', note:'各樂器考級教材及示範' },
  ]},
  { cat:'教學工具', items:[
    { title:'Musescore — 免費樂譜', url:'https://musescore.com', note:'大量免費樂譜，可移調、打印' },
    { title:'IMSLP 樂譜庫', url:'https://imslp.org', note:'公版古典樂譜庫' },
    { title:'Metronome Online', url:'https://www.metronomeonline.com', note:'網頁版節拍器，免安裝' },
    { title:'Chrome Music Lab', url:'https://musiclab.chromeexperiments.com', note:'適合啟蒙學生的互動音樂實驗' },
  ]},
];

// ── 教學參考：包含名師傳承 + 資源連結 ──
let _refTab = 'lineage';
let _lineageTab = 'guqin';

function renderRef(tab) {
  if (tab) _refTab = tab;

  // Top-level tab bar
  const topTabs = [
    { id:'lineage', label:'名師傳承' },
    { id:'exam',    label:'考級資料' },
    { id:'links',   label:'教學資源' },
  ];
  let h = `<div class="tabs" style="margin-bottom:16px">` +
    topTabs.map(t =>
      `<button class="tb${_refTab===t.id?' on':''}" onclick="renderRef('${t.id}')">${t.label}</button>`
    ).join('') + `</div>`;

  if (_refTab === 'lineage') {
    h += buildLineageHtml();
  } else if (_refTab === 'exam') {
    h += buildExamHtml();
  } else {
    h += buildLinksHtml();
  }

  document.getElementById('pg-ref').querySelector('.dc').innerHTML = h;
}

function buildLineageHtml() {
  const secOrder = ['guqin','guzheng','pipa','dizi','suona','hk'];
  let h = `<div class="tabs" style="margin-bottom:14px">` +
    secOrder.map(k => {
      const sec = LINEAGE[k];
      return `<button class="tb${_lineageTab===k?' on':''}" onclick="_lineageTab='${k}';renderRef('lineage')">${sec.label}</button>`;
    }).join('') + `</div>`;

  const sec = LINEAGE[_lineageTab];
  if (!sec) return h;

  const sorted = [...sec.masters].sort((a,b) => {
    const ya = parseInt(a.years.replace(/[^\d]/g,'').slice(0,4)) || 9999;
    const yb = parseInt(b.years.replace(/[^\d]/g,'').slice(0,4)) || 9999;
    return ya - yb;
  });

  h += `<div class="tl">`;
  sorted.forEach((m, i) => {
    const isLast = i === sorted.length - 1;
    h += `<div class="tl-item">
      <div class="tl-axis">
        <div class="tl-dot" style="border-color:${sec.color}"></div>
        ${isLast ? '' : `<div class="tl-line" style="background:linear-gradient(to bottom,${sec.color}88,${sec.color}22)"></div>`}
      </div>
      <div class="tl-body">
        <div class="tl-year" style="color:${sec.color}">${m.years}</div>
        <div class="lm" style="border-left-color:${sec.color};margin-bottom:0">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:3px">
            <span class="lmn">${m.name}</span>
            ${m.sect?`<span style="font-size:0.81rem;color:var(--txt3);padding:1px 6px;border:1px solid var(--bdr)">${m.sect}</span>`:''}
          </div>
          ${m.school?`<div class="lms">${m.school}</div>`:''}
          <div class="lmd">${m.desc}</div>
          ${m.src?`<div class="lmsrc">資料來源：${m.src}</div>`:''}
          <a href="${m.yt}" target="_blank" class="ytl">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
            YouTube 搜尋
          </a>
        </div>
      </div>
    </div>`;
  });
  h += `</div>`;
  return h;
}

function buildExamHtml() {
  let h = `<div style="font-size:0.89rem;color:var(--txt3);line-height:1.9;margin-bottom:12px;padding:9px 11px;background:var(--card);border-left:3px solid var(--gold2)">
    以下考級資料僅供參考，請以各機構官方網站公佈為準。</div>`;
  EXAMS.forEach(ex => {
    h += `<div class="card gold" style="margin-bottom:10px">
      <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--gold);margin-bottom:4px">${ex.name}</div>
      <div style="font-size:0.87rem;color:var(--jade);letter-spacing:.06em;margin-bottom:6px">${ex.grades}</div>
      <div style="font-size:0.90rem;color:var(--txt2);line-height:1.7;margin-bottom:7px">${ex.note}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:0.78rem;color:var(--txt3)">來源：${ex.src}</div>
        <a href="${ex.url}" target="_blank" style="font-size:0.83rem;color:var(--gold2);border:1px solid var(--bdr2);padding:3px 9px;text-decoration:none">官網 ↗</a>
      </div>
    </div>`;
  });
  return h;
}

function buildLinksHtml() {
  let h = '';
  REF_ITEMS.forEach(sec => {
    h += `<div class="sh">${sec.cat}</div>`;
    sec.items.forEach(item => {
      h += `<div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
          <div style="flex:1">
            <div style="font-size:0.96rem;color:var(--txt);margin-bottom:3px">${item.title}</div>
            <div style="font-size:0.87rem;color:var(--txt3);line-height:1.6">${item.note}</div>
          </div>
          <a href="${item.url}" target="_blank"
            style="font-size:0.83rem;color:var(--gold2);border:1px solid var(--bdr2);padding:3px 9px;text-decoration:none;white-space:nowrap;flex-shrink:0">開啟 ↗</a>
        </div>
      </div>`;
    });
  });
  return h;
}


// ═══════════════════════════════════════════════════════════════
// 任務派發（老師視角）
// ═══════════════════════════════════════════════════════════════
let _taskFilter = 'all'; // 'all' | studentId

function renderTasks() {
  const students = DB.students;
  const tasks = DB.tasks || [];

  // Filter bar
  let filterHtml = `<div class="chips" style="margin-bottom:12px">
    <div class="ch${_taskFilter==='all'?' on':''}" onclick="_taskFilter='all';renderTasks()">全部</div>`;
  students.forEach(s => {
    filterHtml += `<div class="ch${_taskFilter===s.id?' on':''}" onclick="_taskFilter='${s.id}';renderTasks()">${s.name}</div>`;
  });
  filterHtml += `</div>`;

  const filtered = _taskFilter === 'all' ? tasks : tasks.filter(t => t.studentId === _taskFilter);
  const sorted = [...filtered].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  let taskHtml = '';
  if (!sorted.length) {
    taskHtml = emptyState('任', '尚未派發任務');
  } else {
    sorted.forEach(t => {
      const stu = students.find(s => s.id === t.studentId);
      const done = t.status === 'done';
      taskHtml += `<div class="card" style="margin-bottom:9px;border-left:3px solid ${done?'var(--jade)':'var(--gold2)'}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1">
            <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--txt);margin-bottom:2px">${t.title}</div>
            <div style="font-size:0.84rem;color:var(--txt3);margin-bottom:5px">
              ${stu?stu.name:'?'} · ${t.dueDate?'截止：'+t.dueDate:''} ·
              <span style="color:${done?'var(--jade)':'var(--gold2)'}">${done?'已完成':'待完成'}</span>
            </div>
            ${t.desc?`<div style="font-size:0.91rem;color:var(--txt2);line-height:1.65;margin-bottom:5px">${t.desc}</div>`:''}
            ${t.progress?`<div style="font-size:0.89rem;color:var(--jade);padding:5px 8px;background:var(--card2);border-left:2px solid var(--jade)">學生回報：${t.progress}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex-shrink:0">
            <button onclick="deleteTask('${t.id}')"
              style="font-size:0.81rem;color:var(--txt3);background:none;border:none;cursor:pointer;padding:2px">刪除</button>
          </div>
        </div>
      </div>`;
    });
  }

  const h = `
    <button class="btn p sm" onclick="openMo('moTask')" style="margin-bottom:12px">＋ 派發任務</button>
    ${filterHtml}${taskHtml}`;

  document.getElementById('pg-tasks').querySelector('.dc').innerHTML = h;
}

// ═══════════════════════════════════════════════════════════════
// 我的任務（學生 / 家長視角）
// ═══════════════════════════════════════════════════════════════
function renderMyTasks() {
  const tasks = (DB.tasks || []).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  let h = '';
  if (!tasks.length) {
    h = emptyState('任', '目前沒有任務');
  } else {
    tasks.forEach(t => {
      const done = t.status === 'done';
      h += `<div class="card" style="margin-bottom:9px;border-left:3px solid ${done?'var(--jade)':'var(--gold2)'}">
        <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--txt);margin-bottom:3px">${t.title}</div>
        <div style="font-size:0.84rem;color:var(--txt3);margin-bottom:6px">
          ${t.dueDate?'截止：'+t.dueDate+' · ':''}
          <span style="color:${done?'var(--jade)':'var(--gold2)'}">${done?'✓ 已完成':'待完成'}</span>
        </div>
        ${t.desc?`<div style="font-size:0.93rem;color:var(--txt2);line-height:1.65;margin-bottom:8px">${t.desc}</div>`:''}
        ${t.progress&&!done?`<div style="font-size:0.89rem;color:var(--txt2);margin-bottom:6px">你的回報：${t.progress}</div>`:''}
        ${!done?`
          <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
            <input id="prog_${t.id}" class="fi" style="flex:1;min-width:0;padding:6px 9px"
              placeholder="回報進度…" value="${t.progress||''}">
            <button class="btn p sm" onclick="reportProgress('${t.id}')">回報</button>
            <button class="btn s sm" onclick="markTaskDone('${t.id}')">標為完成</button>
          </div>
        `:`<div style="font-size:0.84rem;color:var(--jade)">✓ 已完成</div>`}
      </div>`;
    });
  }

  document.getElementById('pg-mytasks').querySelector('.dc').innerHTML = h;
}

// ═══════════════════════════════════════════════════════════════
// 聯絡老師（學生 / 家長視角）
// ═══════════════════════════════════════════════════════════════
function renderContact() {
  const teacherEmail = USER_PROFILE.teacherEmail || '';
  const h = `
    <div class="card gold" style="margin-bottom:14px">
      <div style="font-family:var(--KAI);font-size:0.99rem;color:var(--gold);margin-bottom:4px">聯絡老師</div>
      <div style="font-size:0.89rem;color:var(--txt2);line-height:1.8">
        ${teacherEmail
          ? `老師電郵：<a href="mailto:${teacherEmail}" style="color:var(--gold2)">${teacherEmail}</a>`
          : '老師電郵暫未設定，請向老師查詢。'}
      </div>
    </div>
    <div class="sh">傳送訊息</div>
    <div class="fg"><label class="fl">訊息</label>
      <textarea class="fi" id="msgBody" placeholder="輸入要傳送給老師的訊息…" style="min-height:120px"></textarea>
    </div>
    <button class="btn p" onclick="sendContactMsg()" style="margin-bottom:10px">傳送（開啟電郵）</button>
    <div style="font-size:0.83rem;color:var(--txt3);line-height:1.8">
      此功能會開啟裝置預設電郵程式，直接傳送給老師。
    </div>`;
  document.getElementById('pg-contact').querySelector('.dc').innerHTML = h;
}

