(function () {
  'use strict';
  const G = window.GENLEARN, course = G.german, R = G.resources;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- progress (localStorage, falls back to memory) ----------
  const KEY = 'genlearn.v1';
  let mem = null;
  function load() {
    if (mem) return mem;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* private mode or corrupt */ }
    mem = Object.assign({ xp: 0, streak: 0, last: '', done: {} }, s || {});
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* memory only */ } }
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function bumpStreak() {
    const st = load(), now = new Date(), y = new Date(now.getTime() - 864e5);
    if (st.last === dayKey(now)) return;
    st.streak = st.last === dayKey(y) ? st.streak + 1 : 1;
    st.last = dayKey(now);
  }
  function liveStreak() {
    const st = load(), now = new Date(), y = new Date(now.getTime() - 864e5);
    return st.last === dayKey(now) || st.last === dayKey(y) ? st.streak : 0;
  }

  // ---------- course helpers ----------
  const flat = [];
  course.units.forEach((u) => u.lessons.forEach((l) => flat.push({ unit: u, lesson: l })));
  const findLesson = (id) => flat.find((x) => x.lesson.id === id);
  const isDone = (id) => !!load().done[id];
  function nextLesson() { return flat.find((x) => !isDone(x.lesson.id)) || flat[flat.length - 1]; }
  const doneCount = () => flat.filter((x) => isDone(x.lesson.id)).length;

  // ---------- speech ----------
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const voices = () => (synth ? synth.getVoices() : []);
  if (synth) { voices(); synth.addEventListener && synth.addEventListener('voiceschanged', () => { if (!$('#player').hidden) return; render(); }); }
  const speechReady = () => !!synth && voices().some((v) => /^de/i.test(v.lang));
  function say(t) {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'de-DE'; u.rate = 0.9;
    const v = voices().find((x) => /^de/i.test(x.lang));
    if (v) u.voice = v;
    synth.speak(u);
  }
  const sayBtn = (t) => speechReady() ? '<button class="say" data-say="' + esc(t) + '" aria-label="Hear it">&#9658;</button>' : '';

  // ---------- routing ----------
  const view = $('#view'), nav = $('#nav'), playerEl = $('#player');
  function route() { return (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean); }
  function render() {
    const r = route();
    if (r[0] === 'lesson') { startLesson(r[1]); return; }
    closePlayer();
    const page = r[0] || 'home';
    nav.innerHTML = [['home', '#/', 'Home'], ['german', '#/german', 'German'], ['resources', '#/resources', 'Resources']]
      .map(([k, h, t]) => '<a href="' + h + '"' + (k === page ? ' class="on" aria-current="page"' : '') + '>' + t + '</a>').join('');
    if (page === 'german') viewGerman();
    else if (page === 'resources') viewResources();
    else viewHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-say]');
    if (s) { say(s.getAttribute('data-say')); }
  });

  // ---------- home ----------
  function viewHome() {
    const h = new Date().getHours();
    const [de, en] = h < 12 ? ['Guten Morgen', 'Good morning'] : h < 18 ? ['Guten Tag', 'Good day'] : ['Guten Abend', 'Good evening'];
    const st = load(), nx = nextLesson(), n = doneCount();
    const started = n > 0;
    view.innerHTML =
      '<div class="hero">' +
        '<div class="greet"><div class="phrase">' + de + '.</div>' +
        '<p class="gloss">' + en + '. Five minutes of German is enough for today. ' + sayBtn(de) + '</p>' +
        '<div class="row"><a class="btn" href="#/lesson/' + nx.lesson.id + '" style="text-decoration:none">' + (started ? 'Continue: ' : 'Start: ') + esc(nx.lesson.title) + '</a>' +
        '<a class="btn alt" href="#/german" style="text-decoration:none">See the course</a></div></div>' +
        '<aside class="panel" aria-label="Your progress"><h3>Today</h3>' +
          '<div class="stats"><div class="stat"><b>' + liveStreak() + '</b><span>day streak</span></div>' +
          '<div class="stat"><b>' + st.xp + '</b><span>XP</span></div>' +
          '<div class="stat"><b>' + n + '/' + flat.length + '</b><span>lessons</span></div></div>' +
          '<p class="mut" style="margin:0">Progress is saved in this browser only.</p></aside>' +
      '</div>' +
      '<section class="block"><h2>Topics</h2><div class="shelf">' +
        '<a class="topic live" style="--c:var(--rose)" href="#/german"><h3>German</h3><small>Level A1: greetings, numbers, food, family, and some tech and fantasy words.</small><span class="tag">' + flat.length + ' lessons</span></a>' +
        topic('Electronics', 'var(--sky)', 'Components, circuits, and reading datasheets.') +
        topic('Studies', 'var(--sage)', 'Study methods, spaced repetition, and course notes.') +
        topic('Maker and DIY', 'var(--butter)', 'Soldering, microcontrollers, and 3D printing.') +
        topic('Art and games', 'var(--lav)', 'Drawing basics, game design, and D&amp;D worldbuilding.') +
      '</div></section>' +
      '<section class="block"><h2>Watch and read</h2><p class="mut">Channels and sites picked for electronics, computing, making, art, games, and D&amp;D.</p>' +
      '<a class="btn alt" href="#/resources" style="text-decoration:none;display:inline-block">Open the resource list</a></section>';
  }
  const topic = (t, c, d) => '<div class="topic soon" style="--c:' + c + '"><h3>' + t + '</h3><small>' + d + '</small><span class="tag">Planned</span></div>';

  // ---------- course page ----------
  function viewGerman() {
    let idx = 0;
    const nx = nextLesson();
    view.innerHTML = '<h2>German, level A1</h2><p class="mut">' + doneCount() + ' of ' + flat.length + ' lessons done. Do them in order, repeat any time.</p><div class="course">' +
      course.units.map((u) =>
        '<section class="unit c-' + u.color + '"><div class="unit-head"><h3>' + esc(u.title) + '</h3><span>' + u.lessons.length + ' lessons</span></div>' +
        '<details class="tips"><summary>Grammar and tips</summary><ul>' + u.tips.map((t) => '<li>' + t + '</li>').join('') + '</ul></details>' +
        '<div class="path">' + u.lessons.map((l) => {
          idx++;
          const d = isDone(l.id), nxt = nx.lesson.id === l.id && !d;
          const rec = load().done[l.id];
          return '<button class="node' + (d ? ' done' : '') + (nxt ? ' next' : '') + '" data-lesson="' + l.id + '">' +
            '<div class="disc">' + (d ? '&#10003;' : idx) + '</div><div class="name">' + esc(l.title) + '</div>' +
            '<div class="sub">' + (d ? 'best ' + Math.round(rec.best * 100) + '%' : l.words.length + ' words') + '</div></button>';
        }).join('') + '</div></section>').join('') + '</div>';
    view.querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/lesson/' + b.dataset.lesson; }));
  }

  // ---------- resources ----------
  let filter = 'all';
  function viewResources() {
    const tags = Object.keys(R.tagNames);
    const has = (x) => filter === 'all' || x.tags.includes(filter);
    const tagHtml = (x) => '<div class="tags">' + x.tags.map((t) => '<span>' + esc(R.tagNames[t]) + '</span>').join('') + '</div>';
    const card = (x) => '<div class="res"><a class="name" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.name) + '</a><p>' + esc(x.why) + '</p>' + tagHtml(x) + '</div>';
    const ch = R.channels.filter(has), si = R.sites.filter(has);
    view.innerHTML = '<h2>Resources</h2>' +
      '<div class="note">Channel links open a YouTube search, so they keep working when a channel changes its address. The picks are written from memory and not checked live; skip what does not fit.</div>' +
      '<div class="chips" role="group" aria-label="Filter">' + [['all', 'All']].concat(tags.map((t) => [t, R.tagNames[t]])).map(([k, t]) =>
        '<button class="chip' + (k === filter ? ' on' : '') + '" data-f="' + k + '" aria-pressed="' + (k === filter) + '">' + esc(t) + '</button>').join('') + '</div>' +
      (ch.length ? '<h3 style="margin:20px 0 10px">YouTube channels</h3><div class="cards">' + ch.map(card).join('') + '</div>' : '') +
      (filter === 'all' || filter === 'eng' || filter === 'mit' ? '<h3 style="margin:28px 0 10px">Searches for student life and projects</h3><ul class="plain">' +
        R.searches.map((s) => '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.label) + '</a></li>').join('') + '</ul>' : '') +
      (si.length ? '<h3 style="margin:28px 0 10px">Sites and tools</h3><div class="cards">' + si.map(card).join('') + '</div>' : '');
    view.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; viewResources(); }));
  }

  // ---------- lesson player ----------
  let L = null;
  function closePlayer() { playerEl.hidden = true; playerEl.innerHTML = ''; document.body.style.overflow = ''; L = null; if (synth) synth.cancel(); }

  function startLesson(id) {
    const f = findLesson(id);
    if (!f) { location.hash = '#/german'; return; }
    const speech = speechReady();
    const queue = G.buildLesson(course, f.lesson, (Date.now() & 0xffff) || 1, { speech });
    L = { unit: f.unit, lesson: f.lesson, queue, i: 0, phase: 'intro', correct: 0, wrong: 0, retries: {}, sel: null, slots: [], m: null, answered: false, res: null, speech };
    playerEl.hidden = false;
    document.body.style.overflow = 'hidden';
    drawPlayer();
  }

  const cur = () => L.queue[L.i];

  function drawPlayer() {
    const pct = L.phase === 'done' ? 100 : L.phase === 'intro' ? 0 : Math.round((L.i / L.queue.length) * 100);
    playerEl.innerHTML =
      '<div class="player c-' + L.unit.color + '" role="dialog" aria-label="Lesson: ' + esc(L.lesson.title) + '">' +
      '<div class="ptop"><button class="x" id="quit" aria-label="Leave lesson">&times;</button><div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="pmain"><div class="stage" id="stage"></div></div>' +
      '<div class="pfoot" id="foot"><div class="in" id="footin"></div></div></div>';
    $('#quit').addEventListener('click', () => {
      if (L.phase === 'done' || confirm('Leave this lesson? Progress in this lesson will be lost.')) location.hash = '#/german';
    });
    drawStage();
  }

  function setFoot(kind, msgHtml, label, enabled) {
    const foot = $('#foot'); if (!foot) return;
    foot.className = 'pfoot' + (kind ? ' ' + kind : '');
    $('#footin').innerHTML = '<div class="msg" aria-live="polite">' + (msgHtml || '') + '</div><button class="btn' + (kind === 'bad' ? ' bad' : '') + '" id="act"' + (enabled ? '' : ' disabled') + '>' + label + '</button>';
    $('#act').addEventListener('click', onAct);
  }

  function drawStage() {
    const st = $('#stage'); if (!st) return;
    if (L.phase === 'intro') {
      st.innerHTML = '<div class="intro"><h2>New words</h2>' + L.lesson.words.map((w) =>
        '<div class="w"><b>' + esc(w[0]) + '</b><span class="mut">' + esc(w[1]) + '</span>' + sayBtn(w[0]) + '</div>').join('') + '</div>';
      setFoot('', '', 'Start', true);
      return;
    }
    if (L.phase === 'done') { drawDone(); return; }
    const e = cur();
    const done = L.answered;
    let h = '';
    if (e.type === 'mc' || e.type === 'listen') {
      if (e.type === 'listen') {
        h = '<h2>Tap what you hear</h2><div class="q-de"><button class="say" data-say="' + esc(e.speak) + '" aria-label="Play audio">&#9658;</button></div>';
      } else if (e.dir === 'de-en') {
        h = '<h2>What does this mean?</h2><div class="q-de">' + esc(e.prompt) + sayBtn(e.speak) + '</div>';
      } else {
        h = '<h2>How do you say this in German?</h2><div class="q-de" style="color:var(--text)">' + esc(e.prompt) + '</div>';
      }
      h += '<div class="opts">' + e.options.map((o, i) => {
        let c = 'opt';
        if (done && o === e.answer) c += ' right';
        else if (done && o === L.sel) c += ' wrong';
        else if (o === L.sel) c += ' sel';
        return '<button class="' + c + '" data-o="' + i + '"' + (done ? ' disabled' : '') + '><kbd>' + (i + 1) + '</kbd>' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else if (e.type === 'build') {
      h = '<h2>Write this in German</h2><div class="q-de" style="color:var(--text);font-size:1.5rem">' + esc(e.prompt) + '</div>' +
        '<div class="slots" id="slots">' + L.slots.map((bi, k) => '<button class="tile' + (done ? (L.res && L.res.ok ? ' right' : ' wrong') : '') + '" data-s="' + k + '"' + (done ? ' disabled' : '') + '>' + esc(e.bank[bi]) + '</button>').join('') + '</div>' +
        '<div class="bank">' + e.bank.map((t, i) => '<button class="tile' + (L.slots.includes(i) ? ' used' : '') + '" data-b="' + i + '"' + (done ? ' disabled' : '') + '>' + esc(t) + '</button>').join('') + '</div>';
    } else if (e.type === 'type') {
      h = '<h2>Type this in German</h2><div class="q-de" style="color:var(--text)">' + esc(e.prompt) + '</div>' +
        '<input class="typebox" id="tb" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="de" aria-label="Your answer"' + (done ? ' disabled' : '') + ' value="' + esc(L.typed || '') + '">' +
        '<div class="special">' + ['ä', 'ö', 'ü', 'ß'].map((c) => '<button data-ch="' + c + '"' + (done ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div>';
    } else if (e.type === 'match') {
      if (!L.m) L.m = { left: shuf(e.pairs.map((p) => p[0])), right: shuf(e.pairs.map((p) => p[1])), pick: null, gone: [], slips: 0 };
      const m = L.m;
      h = '<h2>Tap the matching pairs</h2><div class="match"><div class="opts">' + m.left.map((t, i) =>
        '<button class="opt' + (m.gone.includes(t) ? ' gone' : m.pick === t ? ' sel' : '') + '" data-l="' + i + '">' + esc(t) + '</button>').join('') + '</div><div class="opts">' +
        m.right.map((t, i) => '<button class="opt' + (m.gone.includes(t) ? ' gone' : '') + '" data-r="' + i + '">' + esc(t) + '</button>').join('') + '</div></div>';
    }
    st.innerHTML = h;

    st.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => pickOption(+b.dataset.o)));
    st.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { if (!L.answered && !L.slots.includes(+b.dataset.b)) { L.slots.push(+b.dataset.b); drawStage(); } }));
    st.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { if (!L.answered) { L.slots.splice(+b.dataset.s, 1); drawStage(); } }));
    st.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => { const t = $('#tb'); t.value += b.dataset.ch; t.focus(); L.typed = t.value; refreshAct(); }));
    const tb = $('#tb');
    if (tb) { tb.addEventListener('input', () => { L.typed = tb.value; refreshAct(); }); if (!done) tb.focus(); }
    st.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => { const m = L.m; const t = m.left[+b.dataset.l]; if (m.gone.includes(t)) return; m.pick = t; drawStage(); }));
    st.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => matchRight(b)));

    if (e.type === 'listen' && !done && !L.spoken) { L.spoken = true; say(e.speak); }
    if (e.type === 'mc' && e.dir === 'de-en' && !done && !L.spoken && speechReady()) { L.spoken = true; say(e.speak); }

    if (e.type === 'match') { if (!done) setFoot('', '', 'Check', false); }
    else if (!done) setFoot('', '', 'Check', canCheck());
  }

  const shuf = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  function canCheck() {
    const e = cur();
    if (e.type === 'mc' || e.type === 'listen') return L.sel != null;
    if (e.type === 'build') return L.slots.length > 0;
    if (e.type === 'type') return !!(L.typed && L.typed.trim());
    return false;
  }
  function refreshAct() { const b = $('#act'); if (b && !L.answered) b.disabled = !canCheck(); }

  function pickOption(i) {
    if (L.answered) return;
    L.sel = cur().options[i];
    drawStage();
  }

  function matchRight(btn) {
    const e = cur(), m = L.m;
    if (L.answered || !m.pick) return;
    const t = m.right[+btn.dataset.r];
    if (m.gone.includes(t)) return;
    const pair = e.pairs.find((p) => p[0] === m.pick);
    if (pair && pair[1] === t) {
      m.gone.push(m.pick, t); m.pick = null;
      if (m.gone.length === e.pairs.length * 2) { finish(G.check(e, m.slips), true); return; }
      drawStage();
    } else {
      m.slips++; m.pick = null;
      drawStage();
      const again = $('#stage'); again.classList.remove('shake'); void again.offsetWidth; again.classList.add('shake');
    }
  }

  function onAct() {
    if (!L) return;
    if (L.phase === 'intro') { L.phase = 'ex'; drawPlayer(); return; }
    if (L.phase === 'done') { const n = nextAfter(); location.hash = n ? '#/lesson/' + n : '#/german'; return; }
    const e = cur();
    if (!L.answered) {
      if (!canCheck() && e.type !== 'match') return;
      let resp = null;
      if (e.type === 'mc' || e.type === 'listen') resp = L.sel;
      else if (e.type === 'build') resp = L.slots.map((i) => e.bank[i]);
      else if (e.type === 'type') resp = L.typed;
      finish(G.check(e, resp), false);
    } else {
      next();
    }
  }

  function finish(res, isMatch) {
    const e = cur();
    L.answered = true; L.res = res;
    if (res.ok) L.correct++; else L.wrong++;
    if (!res.ok && !isMatch && (L.retries[e.id] || 0) < 2) {
      L.retries[e.id] = (L.retries[e.id] || 0) + 1;
      L.queue.push(Object.assign({}, e, { retry: true }));
    }
    drawStage();
    if (e.speak && (e.type === 'build') && speechReady()) say(e.speak);
    if (isMatch) {
      setFoot(res.ok ? 'ok' : 'bad', '<b>' + (res.ok ? 'Matched!' : 'Matched, with ' + L.m.slips + ' slip' + (L.m.slips === 1 ? '' : 's')) + '</b>', 'Continue', true);
    } else if (res.ok) {
      setFoot('ok', '<b>Correct!</b>' + (res.note ? '<span class="mut">' + esc(res.note) + '</span>' : ''), 'Continue', true);
    } else {
      setFoot('bad', '<b>Correct answer</b><span>' + esc(res.expected) + '</span>', 'Continue', true);
    }
    const a = $('#act'); if (a) a.focus({ preventScroll: true });
  }

  function next() {
    L.i++; L.sel = null; L.slots = []; L.m = null; L.answered = false; L.res = null; L.typed = ''; L.spoken = false;
    if (L.i >= L.queue.length) { completeLesson(); return; }
    drawPlayer();
  }

  function completeLesson() {
    const st = load(), total = L.correct + L.wrong;
    const acc = total ? L.correct / total : 1;
    const xp = G.xpFor(L.correct, total);
    L.acc = acc; L.xp = xp;
    const prev = st.done[L.lesson.id] || { n: 0, best: 0 };
    st.done[L.lesson.id] = { n: prev.n + 1, best: Math.max(prev.best, acc) };
    st.xp += xp;
    bumpStreak();
    save();
    L.phase = 'done';
    drawPlayer();
  }

  function nextAfter() {
    const i = flat.findIndex((x) => x.lesson.id === L.lesson.id);
    return flat[i + 1] ? flat[i + 1].lesson.id : null;
  }

  function drawDone() {
    const n = nextAfter();
    $('#stage').innerHTML = '<div class="done-card"><div class="big">Lesson done</div>' +
      '<p class="mut" style="margin-top:10px">' + esc(L.lesson.title) + '</p>' +
      '<div class="stats" style="max-width:420px;margin:24px auto"><div class="stat"><b>+' + L.xp + '</b><span>XP</span></div>' +
      '<div class="stat"><b>' + Math.round(L.acc * 100) + '%</b><span>accuracy</span></div>' +
      '<div class="stat"><b>' + liveStreak() + '</b><span>day streak</span></div></div></div>';
    setFoot('ok', '<b>Well done.</b>', n ? 'Next lesson' : 'Back to course', true);
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', (ev) => {
    if (!L || playerEl.hidden) return;
    const t = ev.target;
    if (ev.key === 'Enter') {
      if (t.tagName === 'BUTTON' && t.id !== 'act') return;
      if (t.id === 'act') return; // native click handles it
      ev.preventDefault(); onAct();
    } else if (/^[1-4]$/.test(ev.key) && L.phase === 'ex' && t.tagName !== 'INPUT') {
      const e = cur();
      if (e && (e.type === 'mc' || e.type === 'listen') && e.options[+ev.key - 1] != null) pickOption(+ev.key - 1);
    }
  });

  render();
})();
