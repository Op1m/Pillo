// app.js - UI logic for the Medicine Reminder demo (no backend)
(function(){
  // Elements
  const weekScroll = document.getElementById('weekScroll');
  const reminderList = document.getElementById('reminderList');
  const emptyState = document.getElementById('emptyState');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const addMedicationBtn = document.getElementById('addMedicationBtn');
  const saveMed = document.getElementById('saveMed');
  const cancelMed = document.getElementById('cancelMed');
  const medName = document.getElementById('medName');
  const medDose = document.getElementById('medDose');
  const medTime = document.getElementById('medTime');
  const monthLabel = document.getElementById('monthLabel');
  const monthPrev = document.getElementById('monthPrev');
  const monthNext = document.getElementById('monthNext');
  const currentTimeLabel = document.getElementById('currentTimeLabel');
  const takeAll = document.getElementById('takeAll');

  const STORAGE_KEY = 'mr_v2_meds_v1';
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const userNameEl = document.getElementById('userName');
  const userSubEl = document.getElementById('userSub');

  // Simple in-memory selected day
  let selectedDay = new Date();

  function formatWeekDates(centerDay = new Date()){
    const start = new Date(centerDay);
    const day = start.getDay();
    const offset = (day === 0) ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    const days=[];
    for(let i=0;i<7;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      days.push(d);
    }
    return days;
  }

  function renderWeek(centerDay){
    weekScroll.innerHTML='';
    const days = formatWeekDates(centerDay || selectedDay);
    const now = new Date();
    monthLabel.textContent = days[3].toLocaleString('ru',{month:'long', year:'numeric'}).replace(/\u00A0/g,' ');
    days.forEach(d=>{
      const div = document.createElement('div');
      div.className='day';
      const num = document.createElement('div'); num.className='num'; num.innerText = d.getDate();
      const dow = document.createElement('div'); dow.className='dow'; dow.innerText = d.toLocaleString('ru',{weekday:'short'}).slice(0,2).toUpperCase();
      div.appendChild(num); div.appendChild(dow);
      if(d.getDate()===selectedDay.getDate() && d.getMonth()===selectedDay.getMonth() && d.getFullYear()===selectedDay.getFullYear()) div.classList.add('active');
      if(d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()){
        div.setAttribute('aria-current','date');
      }
      div.addEventListener('click',()=>{
        document.querySelectorAll('.day').forEach(n=>n.classList.remove('active'));
        div.classList.add('active');
        selectedDay = d;
        renderMeds();
      });
      weekScroll.appendChild(div);
    });
  }

  // storage helpers
  function loadMeds(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ return []; }
  }
  function saveMeds(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function medsForDay(day){
    const meds = loadMeds();
    return meds.filter(m=>{
      const md = new Date(m.date || m.createdAt || 0);
      // compare by date only: day, month, year
      return md.getDate()===day.getDate() && md.getMonth()===day.getMonth() && md.getFullYear()===day.getFullYear();
    });
  }

  function renderMeds(){
    const meds = medsForDay(selectedDay);
    reminderList.innerHTML = '';
    if(!meds.length){ emptyState.style.display='flex'; return; }
    emptyState.style.display='none';
    meds.sort((a,b)=>a.time.localeCompare(b.time));
    meds.forEach(m=>{
      const card = document.createElement('div'); card.className='reminder-card';
      const avatar = document.createElement('div'); avatar.className='pill-avatar'; avatar.innerText = (m.name[0]||'P').toUpperCase();
      const meta = document.createElement('div'); meta.className='pill-meta';
      const title = document.createElement('div'); title.className='pill-title'; title.innerText = m.name;
      const sub = document.createElement('div'); sub.className='pill-sub'; sub.innerText = `${m.dose} · ${m.time}`;
      meta.appendChild(title); meta.appendChild(sub);
      const actions = document.createElement('div');
      const edit = document.createElement('button'); edit.className='tiny'; edit.innerText='✎'; edit.title='Редактировать'; edit.style.border='none'; edit.style.background='transparent'; edit.style.cursor='pointer';
      edit.addEventListener('click',()=>{ openEditModal(m.id); });
      const more = document.createElement('button'); more.className='tiny'; more.innerText='⋯'; more.title='Ещё'; more.style.border='none'; more.style.background='transparent'; more.style.cursor='pointer';
      more.addEventListener('click',()=>{ if(confirm('Удалить препарат "'+m.name+'"?')){ deleteMed(m.id); } });
      actions.appendChild(edit); actions.appendChild(more);
      card.appendChild(avatar); card.appendChild(meta); card.appendChild(actions);
      reminderList.appendChild(card);
    });
  }

  function addMed(name,dose,time,dateStr){
    const meds = loadMeds();
    const date = dateStr ? (new Date(dateStr)) : new Date(selectedDay);
    // normalize date to local date without time
    date.setHours(0,0,0,0);
    meds.push({id:Date.now(),name,dose,time,date:date.toISOString(),createdAt:Date.now()});
    saveMeds(meds); renderMeds();
  }
  function updateMed(id, data){
    const meds = loadMeds().map(m => m.id===id ? Object.assign({}, m, data) : m);
    saveMeds(meds); renderMeds();
  }
  function deleteMed(id){ const meds=loadMeds().filter(m=>m.id!==id); saveMeds(meds); renderMeds(); }

  // modal logic (supports add and edit)
  let editingId = null;
  function openAddModal(){
    editingId = null;
    medName.value=''; medDose.value='1 таб.'; medTime.value='08:30';
    modalBackdrop.style.display='flex'; modalBackdrop.setAttribute('aria-hidden','false');
    medName.focus();
  }
  function openEditModal(id){
    const meds = loadMeds(); const m = meds.find(x=>x.id===id); if(!m) return;
    editingId = id;
    medName.value = m.name; medDose.value = m.dose; medTime.value = m.time;
    modalBackdrop.style.display='flex'; modalBackdrop.setAttribute('aria-hidden','false');
    medName.focus();
  }
  function closeModal(){ modalBackdrop.style.display='none'; modalBackdrop.setAttribute('aria-hidden','true'); editingId=null; }

  saveMed.addEventListener('click', ()=>{
    const name = medName.value.trim(); const dose = medDose.value.trim() || '1 таб.'; const time = medTime.value || '08:30';
    if(!name) return alert('Введите название');
    if(editingId){ updateMed(editingId, {name,dose,time}); } else { addMed(name,dose,time); }
    closeModal();
  });
  cancelMed.addEventListener('click', ()=>{ closeModal(); });

  addMedicationBtn.addEventListener('click', ()=>{ openAddModal(); });

  // quick "take all" action for current day/time bucket (demo)
  takeAll.addEventListener('click', ()=>{ alert('Принято: все препараты (демо)'); });

  // simple profile placeholders
  userNameEl.textContent = 'Алексей П.';
  userSubEl.textContent = 'Нажмите, чтобы сменить';
  document.getElementById('profileName').textContent = userNameEl.textContent;
  document.getElementById('profileNick').textContent = '@user_demo';

  // keyboard: ESC closes modal
  window.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeModal(); } });

  // navigation (left buttons)
  document.querySelectorAll('.nav-button-left').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      document.querySelectorAll('.nav-button-left').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      const screen = btn.dataset.screen;
      document.querySelectorAll('.screen').forEach(s=> s.classList.add('hidden'));
      const target = document.querySelector('#screen-'+screen);
      if(target) target.classList.remove('hidden');
    });
  });

  // month navigation
  monthPrev.addEventListener('click', ()=>{ selectedDay.setDate(selectedDay.getDate()-7); renderWeek(selectedDay); renderMeds(); });
  monthNext.addEventListener('click', ()=>{ selectedDay.setDate(selectedDay.getDate()+7); renderWeek(selectedDay); renderMeds(); });

  // helper to seed demo data on first load
  function seedDemo(){
    const existing = loadMeds();
    if(existing.length===0){
      const d = new Date(); d.setHours(0,0,0,0);
      const base = d.toISOString();
      const items = [
        {id:Date.now()+1, name:'Парацетамол', dose:'1 таб.', time:'08:30', date:base},
        {id:Date.now()+2, name:'Витамин D', dose:'1 кап.', time:'12:00', date:base},
        {id:Date.now()+3, name:'Бромгексин', dose:'1 таб.', time:'20:00', date:base}
      ];
      saveMeds(items);
    }
  }

  // initial render
  seedDemo();
  renderWeek(selectedDay);
  renderMeds();
})();
