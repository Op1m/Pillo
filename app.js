// app.js — logic for week, mini calendar, accordion by time, bottom sheet, expanding nav
(function(){
  // utilities
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  const monthLabel = q('#monthLabel');
  const weekRow = q('#weekRow');
  const miniBackdrop = q('#miniCalBackdrop');
  const miniGrid = q('#miniGrid');
  const miniTitle = q('#miniTitle');
  const prevWeekBtn = q('#prevWeek'), nextWeekBtn = q('#nextWeek');

  const timesContainer = q('#timesContainer');
  const addBackdrop = q('#addBackdrop');
  const addBtn = q('#addBtn'), addSave = q('#addSave'), addCancel = q('#addCancel');
  const iName = q('#iName'), iDose = q('#iDose'), iTime = q('#iTime');

  const sheetBackdrop = q('#sheetBackdrop'), medSheet = q('#medSheet');
  const sheetTitle = q('#sheetTitle'), sheetSub = q('#sheetSub'), sheetDose = q('#sheetDose'),
        sheetNote = q('#sheetNote'), progressFill = q('#progressFill'), sheetAvatar = q('#sheetAvatar');

  const STORAGE = 'mr_v3_meds_v1';
  let selectedDay = new Date();
  let editingId = null;

  // NAV expand logic
  qa('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      qa('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // Could switch screens here if multiple screens implemented
    });
  });

  // Date helpers
  function startOfWeek(d){
    const copy = new Date(d);
    const day = copy.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + offset);
    copy.setHours(0,0,0,0);
    return copy;
  }
  function daysOfWeek(center){
    const s = startOfWeek(center);
    const arr = [];
    for(let i=0;i<7;i++){ const dd = new Date(s); dd.setDate(s.getDate()+i); arr.push(dd); }
    return arr;
  }
  function renderWeek(center){
    weekRow.innerHTML = '';
    const days = daysOfWeek(center);
    monthLabel.textContent = days[3].toLocaleString('ru',{month:'long', year:'numeric'}).replace(/\u00A0/g,' ');
    days.forEach(d => {
      const dd = document.createElement('div'); dd.className = 'week-day';
      const n = document.createElement('div'); n.className='num'; n.innerText = d.getDate();
      const dow = document.createElement('div'); dow.className='dow'; dow.innerText = d.toLocaleString('ru',{weekday:'short'}).slice(0,2).toUpperCase();
      dd.appendChild(n); dd.appendChild(dow);
      if(d.toDateString() === selectedDay.toDateString()) dd.classList.add('active');
      dd.addEventListener('click', () => {
        selectedDay = d;
        renderWeek(selectedDay);
        renderTimes();
      });
      weekRow.appendChild(dd);
    });
  }

  prevWeekBtn.addEventListener('click', ()=>{ selectedDay.setDate(selectedDay.getDate()-7); renderWeek(selectedDay); renderTimes(); });
  nextWeekBtn.addEventListener('click', ()=>{ selectedDay.setDate(selectedDay.getDate()+7); renderWeek(selectedDay); renderTimes(); });

  // mini calendar open
  q('.month-label').addEventListener('click', ()=> openMiniCalendar(selectedDay));
  function openMiniCalendar(me){
    miniBackdrop.style.display='flex'; miniBackdrop.setAttribute('aria-hidden','false');
    renderMiniCalendar(me);
  }
  q('#miniClose').addEventListener('click', ()=> { miniBackdrop.style.display='none'; miniBackdrop.setAttribute('aria-hidden','true'); });
  q('#miniPrev').addEventListener('click', ()=> { changeMiniMonth(-1); });
  q('#miniNext').addEventListener('click', ()=> { changeMiniMonth(1); });

  let miniCurrent = new Date();
  function changeMiniMonth(delta){
    miniCurrent.setMonth(miniCurrent.getMonth()+delta);
    renderMiniCalendar(miniCurrent);
  }
  function renderMiniCalendar(d){
    miniGrid.innerHTML = '';
    const y = d.getFullYear(), m = d.getMonth();
    miniTitle.textContent = d.toLocaleString('ru',{month:'long', year:'numeric'});
    const first = new Date(y,m,1);
    const last = new Date(y,m+1,0);
    // leading blanks to start on Monday
    let startIndex = first.getDay() === 0 ? 6 : first.getDay()-1;
    for(let i=0;i<startIndex;i++){
      const e = document.createElement('div'); e.className='mini-day'; miniGrid.appendChild(e);
    }
    for(let day=1; day<=last.getDate(); day++){
      const dt = new Date(y,m,day);
      const el = document.createElement('div'); el.className='mini-day';
      el.innerHTML = `<div class="dnum">${day}</div><div class="dm">${dt.toLocaleString('ru',{weekday:'short'}).slice(0,2).toUpperCase()}</div>`;
      if(dt.toDateString()===selectedDay.toDateString()) el.style.boxShadow='inset 0 0 0 2px rgba(43,140,255,0.12)';
      el.addEventListener('click', ()=> {
        selectedDay = dt;
        miniBackdrop.style.display='none'; miniBackdrop.setAttribute('aria-hidden','true');
        renderWeek(selectedDay); renderTimes();
      });
      miniGrid.appendChild(el);
    }
  }

  // storage helpers
  function loadMeds(){ try { return JSON.parse(localStorage.getItem(STORAGE))||[]; } catch(e){ return []; } }
  function saveMeds(v){ localStorage.setItem(STORAGE, JSON.stringify(v)); }

  // group meds by time for selectedDay
  function medsForSelected(){
    const meds = loadMeds().filter(m => {
      const md = new Date(m.date);
      return md.getDate()===selectedDay.getDate() && md.getMonth()===selectedDay.getMonth() && md.getFullYear()===selectedDay.getFullYear();
    });
    // group by time string
    const map = {};
    meds.forEach(m => { (map[m.time] = map[m.time]||[]).push(m); });
    // sort times ascending
    const keys = Object.keys(map).sort((a,b)=>a.localeCompare(b));
    return keys.map(k=>({time:k, items:map[k]}));
  }

  function renderTimes(){
    timesContainer.innerHTML='';
    const groups = medsForSelected();
    if(groups.length===0){
      timesContainer.innerHTML = `<div class="muted" style="padding:12px;text-align:center">Нет препаратов на этот день</div>`;
      return;
    }
    groups.forEach(g=>{
      const wrap = document.createElement('div'); wrap.className='time-group';
      const header = document.createElement('div'); header.className='time-header';
      const ttitle = document.createElement('div'); ttitle.className='time-title'; ttitle.innerText = g.time;
      const tcount = document.createElement('div'); tcount.className='time-count'; tcount.innerText = g.items.length + ' шт';
      header.appendChild(ttitle); header.appendChild(tcount);
      const body = document.createElement('div'); body.className='time-body';
      // create pill cards
      g.items.forEach(m=>{
        const card = document.createElement('div'); card.className='pill-card';
        const av = document.createElement('div'); av.className='pill-avatar'; av.innerText = (m.name[0]||'P').toUpperCase();
        const meta = document.createElement('div'); meta.className='pill-meta';
        const title = document.createElement('div'); title.className='pill-title'; title.innerText = m.name;
        const sub = document.createElement('div'); sub.className='pill-sub'; sub.innerText = `${m.dose} · ${m.time}`;
        meta.appendChild(title); meta.appendChild(sub);
        const actions = document.createElement('div'); actions.className='pill-actions';
        const but = document.createElement('button'); but.className='tiny'; but.innerText='⋯'; but.style.border='none'; but.style.background='transparent';
        but.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(confirm('Удалить препарат "'+m.name+'"?')) { deleteMed(m.id); } });
        actions.appendChild(but);

        card.appendChild(av); card.appendChild(meta); card.appendChild(actions);
        // open bottom sheet on click
        card.addEventListener('click', ()=> openSheet(m));
        body.appendChild(card);
      });

      header.addEventListener('click', ()=> body.classList.toggle('open'));
      wrap.appendChild(header); wrap.appendChild(body);
      timesContainer.appendChild(wrap);
    });
  }

  // add/edit/delete med helpers
  function addMed(name,dose,time){
    const arr = loadMeds();
    const date = new Date(selectedDay); date.setHours(0,0,0,0);
    arr.push({id:Date.now(), name, dose, time, date:date.toISOString(), taken:0, total:14, note:'Во время еды'});
    saveMeds(arr);
    renderTimes();
  }
  function updateMed(id, patch){
    const arr = loadMeds().map(m => m.id===id ? Object.assign({}, m, patch) : m);
    saveMeds(arr); renderTimes();
  }
  function deleteMed(id){ const arr = loadMeds().filter(m=>m.id!==id); saveMeds(arr); renderTimes(); }

  // bottom sheet
  function openSheet(m){
    sheetTitle.innerText = m.name;
    sheetSub.innerText = 'Напоминание: ' + m.time;
    sheetDose.innerText = m.dose;
    sheetNote.innerText = m.note || '';
    sheetAvatar.innerText = (m.name[0]||'P').toUpperCase();
    const p = Math.round((m.taken||0) / (m.total||1) * 100);
    progressFill.style.width = p + '%';
    sheetBackdrop.style.display='flex'; sheetBackdrop.setAttribute('aria-hidden','false');

    // wire sheet buttons (simple demo behavior)
    q('#btnTake').onclick = ()=> { updateMed(m.id, {taken: (m.taken||0)+1}); sheetBackdrop.style.display='none'; sheetBackdrop.setAttribute('aria-hidden','true'); };
    q('#btnSkip').onclick = ()=> { alert('Пропущено (демо)'); sheetBackdrop.style.display='none'; sheetBackdrop.setAttribute('aria-hidden','true'); };
    q('#btnSnooze').onclick = ()=> { alert('Отложено (демо)'); sheetBackdrop.style.display='none'; sheetBackdrop.setAttribute('aria-hidden','true'); };
    q('#btnDelete').onclick = ()=> { if(confirm('Удалить "'+m.name+'"?')) { deleteMed(m.id); sheetBackdrop.style.display='none'; sheetBackdrop.setAttribute('aria-hidden','true'); } };
    q('#sheetEdit').onclick = ()=> { sheetBackdrop.style.display='none'; openAddModal(m); };
  }

  sheetBackdrop.addEventListener('click', (e)=>{ if(e.target===sheetBackdrop){ sheetBackdrop.style.display='none'; sheetBackdrop.setAttribute('aria-hidden','true'); } });

  // add modal
  addBtn.addEventListener('click', ()=> openAddModal());
  addCancel.addEventListener('click', ()=> { addBackdrop.style.display='none'; addBackdrop.setAttribute('aria-hidden','true'); editingId=null; });
  addSave.addEventListener('click', ()=> {
    const name = iName.value.trim(); const dose = iDose.value.trim() || '1 таб.'; const time = iTime.value || '08:30';
    if(!name) return alert('Введите название');
    if(editingId){ updateMed(editingId, {name,dose,time}); } else addMed(name,dose,time);
    addBackdrop.style.display='none'; addBackdrop.setAttribute('aria-hidden','true'); editingId=null;
  });

  function openAddModal(m){
    editingId = m ? m.id : null;
    iName.value = m ? m.name : '';
    iDose.value = m ? m.dose : '1 таб.';
    iTime.value = m ? m.time : '08:30';
    addBackdrop.style.display='flex'; addBackdrop.setAttribute('aria-hidden','false');
    iName.focus();
  }

  // seed demo data for today if none
  function seedDemo(){
    const existing = loadMeds();
    if(existing.length===0){
      const d = new Date(); d.setHours(0,0,0,0);
      const base = d.toISOString();
      const items = [
        {id:Date.now()+1, name:'Парацетамол', dose:'1 таб.', time:'08:30', date:base, taken:7, total:14, note:'Во время еды'},
        {id:Date.now()+2, name:'Витамин D', dose:'1 кап.', time:'12:00', date:base, taken:3, total:30, note:'После еды'},
        {id:Date.now()+3, name:'Бромгексин', dose:'1 таб.', time:'20:00', date:base, taken:0, total:7, note:'Перед сном'}
      ];
      saveMeds(items);
    }
  }

  // init
  seedDemo();
  renderWeek(selectedDay);
  renderTimes();

  // keyboard escape to close overlays
  window.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      addBackdrop.style.display='none'; miniBackdrop.style.display='none'; sheetBackdrop.style.display='none';
    }
  });

})();
