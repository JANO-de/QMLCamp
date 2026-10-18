(function () {
  'use strict';
  const G = window.GENLEARN;
  if (!G) { console.error('GENLEARN global missing'); return; }
  const courses = G.courses || (G.german ? [Object.assign({ id: 'german', title: 'German', engine: 'genlearn', lang: 'de', units: G.german.units.slice(0), tr: G.german.tr || {} }, G.german)] : []);
  if (G.german && courses[0]) {
    // keep original for compatibility if needed
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let course = courses[0] || null;

  // progress
  const KEY = 'genlearn.v1';
  const KEY_C = 'genlearn.courses.v1';
  let mem = null;
  function load() {
    if (mem) return mem;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    mem = Object.assign({ xp: 0, streak: 0, last: '', done: {}, cDone: {}, cFiles: {} }, s || {});
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  function exportProg() {
    const cust = [];
    try { cust = JSON.parse(localStorage.getItem(KEY_C) || '[]'); } catch (e) {}
    const blob = new Blob([JSON.stringify({ app: 'genlearn', v: 1, at: new Date().toISOString(), prog: load(), courses: cust }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'genlearn-progress.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importProg(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d && d.app === 'genlearn' && d.prog) {
          const p = d.prog; for (const k of ['xp','streak','last','done','cDone','cFiles']) if (p[k] && typeof p[k] === 'object') Object.assign(load()[k], p[k]);
        }
        if (Array.isArray(d.courses)) localStorage.setItem(KEY_C, JSON.stringify(d.courses));
        window.location.reload();
      } catch (e) {}
    };
    r.readAsText(file);
  }

  function buildFlat(c) {
    const flat = [];
    if (!c) return flat;
    (c.units || []).forEach(u => (u.lessons || []).forEach(l => flat.push({ unit: u, lesson: l })));
    return flat;
  }
  let flat = buildFlat(course);
  function findLesson(id, c) { const f = buildFlat(c || course); return f.find(x => x.lesson.id === id); }
  function doneCount(c) { const f = buildFlat(c || course), p = load(); return f.filter(x => p.done[x.lesson.id]).length; }
  function nextLesson(c) { const f = buildFlat(c || course), p = load(); const nx = f.find(x => !p.done[x.lesson.id]); return nx || f[f.length - 1]; }
  function isDone(id) { return !!load().done[id]; }

  // speech
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const voices = () => (synth ? synth.getVoices() : []);
  if (synth) { try { voices(); synth.addEventListener('voiceschanged', () => {}); } catch (e) {} }
  function speechReady() { return !!synth && voices().some(v => /^de|de-/i.test(v.lang)); }
  function say(t, lang) { if (!synth) return; synth.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = lang || (course && course.lang) || 'de-DE'; u.rate = 0.9; const v = voices().find(x => new RegExp((course && course.lang) || 'de', 'i').test(x.lang)); if (v) u.voice = v; synth.speak(u); }
  const sayBtn = (t) => speechReady() ? '<button class="say" data-say="' + esc(t) + '" aria-label="Hear it">&#9658;</button>' : '';

  const view = $('#view'), nav = $('#nav'), playerEl = $('#player');
  function route() { return (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean); }
  function render() {
    const r = route();
    if (r[0] === 'lesson') { startLesson(r[1]); return; }
    if (r[0] === 'c') { const cc = courses.find(x => x.id === r[1]); if (cc) { course = cc; flat = buildFlat(course); location.hash = '#/c/' + cc.id; viewCourse(); return; } }
    if (r[0] === 'creator') { if (window.GENLearnCreator && window.GENLearnCreator.view) return window.GENLearnCreator.view(location.hash.replace('#/creator', '')); }
    closePlayer();
    const page = r[0] || 'home';
    const links = [['home','#/','Home']];
    courses.slice(0,4).forEach(c => links.push([c.id,'#/c/'+c.id,c.title]));
    links.push(['resources','#/resources','Resources']);
    nav.innerHTML = links.map(([k,h,t]) => '<a href="'+h+'"'+(k===page|| (page==='german'&&k==='german')?' class="on" aria-current="page"':'')+'>'+esc(t)+'</a>').join('');
    if (page === 'resources') viewResources();
    else if (page === 'german') { course = courses.find(x => x.id === 'german') || courses[0]; flat = buildFlat(course); viewCourse(); }
    else { viewHome(); }
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('click', (e) => { const s = e.target.closest('[data-say]'); if (s) say(s.getAttribute('data-say')); });
  // load stored courses
  try { const sc = JSON.parse(localStorage.getItem(KEY_C) || '[]'); sc.forEach(c => { if (!courses.find(x => x.id === c.id)) courses.push(c); }); } catch (e) {}

  function viewHome() {
    const h = new Date().getHours();
    const [de,en] = h < 12 ? ['Guten Morgen','Good morning'] : h < 18 ? ['Guten Tag','Good day'] : ['Guten Abend','Good evening'];
    const st = load(), nx = nextLesson(course), n = doneCount(course), total = flat.length;
    view.innerHTML = '<div class="hero"><div class="greet"><div class="phrase">'+de+'.</div><p class="gloss">'+en+'. '+sayBtn(de)+'</p>'+
      '<div class="row"><a class="btn" href="#/lesson/'+nx.lesson.id+'" style="text-decoration:none">'+(n>0?'Continue: ':'Start: ')+esc(nx.lesson.title)+'</a>'+
      '<a class="btn alt" href="#/c/'+(course?course.id:'german')+'" style="text-decoration:none">See course</a>'+
      '<a class="btn alt" href="#/creator/new" style="text-decoration:none">New course</a></div></div>'+
      '<aside class="panel" aria-label="Progress"><h3>Today</h3><div class="stats"><div class="stat"><b>'+liveStreak()+'</b><span>day streak</span></div><div class="stat"><b>'+st.xp+'</b><span>XP</span></div><div class="stat"><b>'+n+'/'+total+'</b><span>lessons</span></div></div></aside></div>'+
      '<section class="block"><h2>Courses</h2><div class="shelf">'+courses.map(c => '<a class="topic" style="--c:var(--lav)" href="#/c/'+c.id+'"><h3>'+esc(c.title)+'</h3><small>'+buildFlat(c).length+' lessons</small></a>').join('')+'</div></section>';
  }
  function liveStreak() { const st = load(), now = new Date(), y = new Date(now.getTime()-864e5); return st.last === dayKey(now) || st.last === dayKey(y) ? st.streak : 0; }
  function dayKey(d) { return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  function bumpStreak() { const st = load(), now = new Date(), y = new Date(now.getTime()-864e5); if (st.last === dayKey(now)) return; st.streak = st.last === dayKey(y) ? st.streak+1 : 1; st.last = dayKey(now); save(); }

  function viewCourse() {
    if (!course) { viewHome(); return; }
    let idx = 0;
    const nx = nextLesson(course), total = flat.length, n = doneCount(course);
    view.innerHTML = '<h2>'+esc(course.title)+'</h2><p class="mut">'+n+' of '+total+' lessons done.</p><div class="course">'+(course.units||[]).map(u =>
      '<section class="unit"><div class="unit-head"><h3>'+esc(u.title)+'</h3><span>'+ (u.lessons||[]).length+' lessons</span></div>'+
      (u.tips?'<details class="tips"><summary>Tips</summary><ul>'+u.tips.map(t=>'<li>'+t+'</li>').join('')+'</ul></details>':'')+
      '<div class="path">'+(u.lessons||[]).map(l => {
        idx++;
        const d = isDone(l.id), nxt = nx.lesson.id === l.id && !d, rec = load().done[l.id];
        return '<button class="node'+(d?' done':'')+(nxt?' next':'')+'" data-lesson="'+l.id+'"><div class="disc">'+(d?'&#10003;':idx)+'</div><div class="name">'+esc(l.title)+'</div><div class="sub">'+(d?'best '+Math.round(rec.best*100)+'%': (l.words?l.words.length:'-')+' words')+'</div></button>';
      }).join('')+'</div></section>').join('')+'</div>';
    view.querySelectorAll('[data-lesson]').forEach(b => b.addEventListener('click', () => location.hash = '#/lesson/'+b.dataset.lesson));
  }

  function viewResources() {
    view.innerHTML = '<h2>Resources</h2><p class="mut">See QMLCamp/resources for electronics/maker sites.</p>'+
      '<div class="toolbar" style="margin-top:12px"><a class="btn alt" href="../index.html#/resources" target="_blank" rel="noopener">Open QMLCamp resources</a></div>';
  }

  let L = null;
  function closePlayer() { playerEl.hidden = true; playerEl.innerHTML = ''; document.body.style.overflow = ''; L = null; if (synth) synth.cancel(); }

  function startLesson(id) {
    const f = findLesson(id, course);
    if (!f) { location.hash = '#/c/'+(course?course.id:''); return; }
    const queue = window.GENLEARN.buildLesson ? window.GENLEARN.buildLesson(course, f.lesson, (Date.now() & 0xffff), { speech: speechReady() }) : [];
    L = { unit: f.unit, lesson: f.lesson, queue, i: 0, phase: 'intro', correct: 0, wrong: 0, retries: {}, sel: null, answered: false };
    playerEl.hidden = false; document.body.style.overflow = 'hidden'; drawPlayer();
  }
  function drawPlayer() {
    const pct = L.phase === 'done' ? 100 : L.phase === 'intro' ? 0 : Math.round((L.i/L.queue.length)*100);
    playerEl.innerHTML = '<div class="player"><div class="ptop"><button class="x" id="quit">&times;</button><div class="bar" role="progressbar"><i style="width:'+pct+'%"></i></div></div><div class="pmain"><div class="stage" id="stage"></div></div><div class="pfoot" id="foot"><div class="in" id="footin"></div></div></div>';
    $('#quit').onclick = () => location.hash = '#/c/'+(course?course.id:'');
    drawStage();
  }
  function setFoot(kind, msgHtml, label, en) { const foot = $('#foot'); foot.className = 'pfoot'+(kind?' '+kind:''); $('#footin').innerHTML = '<div class="msg">'+(msgHtml||'')+'</div><button class="btn" id="act"'+(en?'':' disabled')+'>'+label+'</button>'; $('#act').onclick = onAct; }
  function onAct() { /* minimal: advance */ if (L.phase==='intro') { L.phase='ex'; L.i=0; L.answered=false; drawPlayer(); return; } if (L.answered && L.i < L.queue.length-1) { L.i++; L.answered=false; drawPlayer(); return; } if (L.answered && L.i === L.queue.length-1) { L.phase='done'; drawDone(); return; } }
  function drawDone() { const st = load(); st.xp += 10; bumpStreak(); save(); const nx = nextLesson(course); const nextId = (buildFlat(course).findIndex(x=>x.lesson.id===L.lesson.id)+1 < flat.length ? flat[buildFlat(course).findIndex(x=>x.lesson.id===L.lesson.id)+1].lesson.id : null); $('#stage').innerHTML = '<div class="done-card"><div class="big">Lesson done</div><p class="mut">'+esc(L.lesson.title)+'</p></div>'; setFoot('ok','', nx && nx.lesson.id!==L.lesson.id ? 'Next' : 'Back', true); $('#act').onclick = () => location.hash = nextId ? '#/lesson/'+nextId : '#/c/'+(course?course.id:''); }
  function drawStage() { const st = $('#stage'); if (L.phase==='intro') { st.innerHTML = '<div class="intro"><h2>New words</h2>'+L.lesson.words.map(w=>'<div class="w"><b>'+esc(w[0])+'</b><span class="mut">'+esc(w[1])+'</span>'+sayBtn(w[0])+'</div>').join(''); setFoot('','Start',true); return; } if (L.phase==='done') { drawDone(); return; } const e = cur(); st.innerHTML = '<h2>Exercise</h2><p>'+esc(e.prompt||'')+'</p>'+sayBtn(e.speak||e.prompt); setFoot('','Check',L.answered,true); }

  function cur() { return L.queue[L.i]; }
  render();
})();
