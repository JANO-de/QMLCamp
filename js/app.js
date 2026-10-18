// =============================================================================
//  QMLCamp app: hash router + views (home, module, theory, lab, quiz, review, verify)
//  Block types, like freeCodeCamp: theory (lessons + questions), lab (build to user
//  stories, pass/fail tests), quiz (practice test), review (cheat sheet).
// =============================================================================
(function () {
'use strict';
const cleanups = [];
const C = window.QMLCAMP, $app = document.getElementById('app');
const { createEditor, esc } = window.QmlEditor;
const { makeKit, Fail } = window.QmlTestKit;
const I = window.QmlI18n, tr = I.t, L = I.loc;

// ------------------------------------------------------------------ progress (localStorage, optional)
const KEY = 'qmlcamp.v1';
let prog = { done: {}, files: {}, q: {}, last: {}, lastCourse: null };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const saveProg = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) {} };
const doneCount = () => Object.keys(prog.done || {}).length;
const exportProg = () => {
  const courses = window.ForgeCustom ? window.ForgeCustom.exportStored() : [];
  const blob = new Blob([JSON.stringify({ app: 'qmlcamp', v: 1, at: new Date().toISOString(), prog, courses }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qmlcamp-progress.json';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  note(tr('expDone'));
};
const importProg = file => {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result), p = d && d.app === 'qmlcamp' && d.prog;
      if (!p || typeof p !== 'object') throw 0;
      for (const k of ['done', 'files', 'q', 'last']) if (p[k] && typeof p[k] === 'object') prog[k] = Object.assign({}, prog[k], p[k]);
      if (typeof p.lastCourse === 'string') prog.lastCourse = p.lastCourse;
      if (window.ForgeCustom && Array.isArray(d.courses)) window.ForgeCustom.importStored(d.courses);
      saveProg(); route(); note(tr('impOk', { n: doneCount() }));
    } catch (e) { note(tr('impBad')); }
  };
  r.readAsText(file);
};
const note = msg => { const n = document.getElementById('ioNote'); if (n) n.textContent = msg; };
const ioBar = () => {
  const inp = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => { if (e.target.files[0]) importProg(e.target.files[0]); e.target.value = ''; } });
  return h('div', { class: 'toolbar', style: 'align-items:center' },
    h('button', { class: 'btn sm ghost', onclick: exportProg }, tr('expBtn')),
    h('button', { class: 'btn sm ghost', onclick: () => inp.click() }, tr('impBtn')), inp,
    h('span', { id: 'ioNote', style: 'font-size:13px;color:var(--dim)' }));
};
const isDone = id => !!prog.done[id];
const markDone = id => { prog.done[id] = true; saveProg(); };

const h = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
// courses: other languages can push their own { id, title, desc, modules, upcoming } into QMLCAMP.courses
C.courses = C.courses || [];
if (!C.courses.some(c => c.id === 'qml')) C.courses.unshift({ id: 'qml', title: 'QML Foundations', desc: 'Learn the whole QML language and build a Quickshell Dynamic Island.', modules: C.modules, upcoming: C.upcoming || [] });
if (window.ForgeCustom) { window.ForgeCustom.onRefresh = () => route(); window.ForgeCustom.install(); }
let course = C.courses[0];
const allBlocks = (c) => (c || course).modules.flatMap(m => m.blocks);
const everyBlock = () => C.courses.flatMap(c => allBlocks(c));
const blockById = id => { for (const c of C.courses) for (const m of c.modules) for (const b of m.blocks) if (b.id === id) return [m, b, c]; return [null, null, null]; };
const moduleById = id => { for (const c of C.courses) for (const m of c.modules) if (m.id === id) return [m, c]; return [null, null]; };
const labelOf = (c, route) => {          // "Module 5 > Toggle switch" for a #/m/.. or #/b/.. route
  const [kind, id] = String(route || '').replace(/^#\/?/, '').split('/');
  if (kind === 'b') { const [m, b] = blockById(id); if (b) return tr('module') + ' ' + (c.modules.indexOf(m) + 1) + ' > ' + L(b).title; }
  if (kind === 'm') { const [m] = moduleById(id); if (m) return tr('module') + ' ' + (c.modules.indexOf(m) + 1) + ' > ' + L(m).title; }
  return null;
};
const resumeFor = c => {                 // where "Continue" goes for a course: last visited page, else the first block
  const last = prog.last && prog.last[c.id];
  if (last && labelOf(c, last)) return { href: last, label: labelOf(c, last), started: true };
  const m = c.modules[0], b = m && m.blocks[0];
  return b ? { href: '#/b/' + b.id, label: tr('module') + ' 1 > ' + L(b).title, started: false } : { href: '#/c/' + c.id, label: cT(c).title, started: false };
};
const cT = c => c.id === 'qml' && I.lang !== 'en' ? Object.assign({}, c, { title: tr('courseTitle'), desc: tr('courseDesc') }) : c;
const TYPE_LABEL = { get theory() { return tr('theory'); }, get lab() { return tr('lab'); }, get quiz() { return tr('quiz'); }, get review() { return tr('review'); } };
const blockLang = (b, c) => (b && b.lang) || (c && c.lang) || (course && course.lang) || 'qml';

function updateOverall(welcome) {
  const all = allBlocks(), d = all.filter(b => isDone(b.id)).length, el = document.getElementById('overall');
  el.style.display = welcome ? 'none' : '';
  el.textContent = tr('overall', { c: cT(course).title, d, n: all.length });
}

// ------------------------------------------------------------------ router
function route() {
  cleanups.splice(0).forEach(f => f());   // dispose runtimes of the previous view
  $app.style.maxWidth = '';
  const hash = location.hash.replace(/^#\/?/, '');
  const [kind, id] = hash.split('/');
  window.scrollTo(0, 0);
  $app.innerHTML = '';
  if (kind === 'c') course = C.courses.find(c => c.id === id) || course;
  else if (kind === 'm') course = moduleById(id)[1] || course;
  else if (kind === 'b') course = blockById(id)[2] || course;
  if ((kind === 'm' && moduleById(id)[0]) || (kind === 'b' && blockById(id)[1])) {   // remember the last visited page of this course
    prog.last = prog.last || {}; prog.last[course.id] = '#/' + hash; prog.lastCourse = course.id; saveProg();
  }
  const welcome = !(kind === 'c' || kind === 'm' || kind === 'b' || kind === 'verify' || kind === 'creator');
  updateOverall(welcome);
  if (kind === 'c') return viewCourse(id);
  if (kind === 'm') return viewModule(id);
  if (kind === 'b') return viewBlock(id);
  if (kind === 'verify') return viewVerify();
  if (kind === 'creator' && window.ForgeCreator) return window.ForgeCreator.view(hash);
  viewWelcome();
}
window.addEventListener('hashchange', route);

// ------------------------------------------------------------------ home
function viewWelcome() {
  const lastC = C.courses.find(c => c.id === prog.lastCourse) || null, hero = lastC ? resumeFor(lastC) : null;
  $app.append(h('div', { class: 'page', style: 'max-width:1100px' },
    h('h1', {}, tr('welcome')),
    h('p', {}, tr('welcomeP')),
    hero && hero.started ? h('div', { class: 'card', style: 'margin:18px 0;border-color:var(--ok,#4cd964)' },
      h('div', { class: 'dim', style: 'color:var(--dim);font-size:13px' }, cT(lastC).title),
      h('h3', {}, tr('leftOff')), h('p', {}, hero.label),
      h('a', { class: 'btn', href: hero.href }, tr('cont') + hero.label)) : null,
    h('div', { class: 'toolbar', style: 'justify-content:space-between;align-items:center' },
      h('h2', { style: 'margin:0' }, C.courses.length > 1 ? tr('courses') : tr('course')),
      h('a', { class: 'btn', href: '#/creator' }, tr('newCourse'))),
    h('div', { class: 'mods' }, C.courses.map(c => {
      const all = allBlocks(c), d = all.filter(b => isDone(b.id)).length, r = resumeFor(c);
      return h('div', { class: 'card' + (c.custom ? ' custom' : '') }, h('h3', {}, cT(c).title, ...(window.ForgeCustom ? ForgeCustom.badges(c) : [])), h('p', {}, cT(c).desc),
        h('div', { class: 'bar' }, h('i', { style: 'width:' + (all.length ? 100 * d / all.length : 0) + '%' })),
        h('div', { style: 'font-size:13px;color:var(--dim);margin-bottom:10px' }, tr('modsDone', { m: c.modules.length, d, n: all.length })),
        h('div', { class: 'toolbar' }, h('a', { class: 'btn sm', href: r.href }, (r.started ? tr('cont') : tr('start')) + r.label), h('a', { class: 'btn sm ghost', href: '#/c/' + c.id }, tr('allModules')), ...(window.ForgeCustom ? ForgeCustom.cardActions(c) : [])));
    })),
    window.ForgeCustom ? ForgeCustom.errorCard() : null,
    ioBar(),
    h('p', { style: 'margin-top:26px;color:var(--dim);font-size:13px' }, tr('saved'), h('a', { href: '#/verify' }, tr('selfCheck')), '')));
}
function viewCourse(id) {
  const all = allBlocks(), d = all.filter(b => isDone(b.id)).length, r = resumeFor(course);
  $app.append(h('div', { class: 'page', style: 'max-width:1100px' },
    h('div', { class: 'crumbs' }, h('a', { href: '#/' }, tr('welcomeCrumb')), ' / ', cT(course).title),
    h('h1', {}, cT(course).title, ...(window.ForgeCustom ? ForgeCustom.badges(course) : [])),
    h('div', { class: 'toolbar' }, h('a', { class: 'btn', href: r.href }, (r.started ? tr('cont') : tr('start')) + r.label), ...(course.custom && window.ForgeCustom ? ForgeCustom.cardActions(course) : [])),
    h('p', { html: course.intro || tr('courseIntro') }),
    h('div', { class: 'bar' }, h('i', { style: 'width:' + (100 * d / all.length) + '%' })),
    h('div', { class: 'mods' },
      course.modules.map((m, i) => {
        const dn = m.blocks.filter(b => isDone(b.id)).length;
        return h('div', { class: 'card' },
          h('h3', {}, (i + 1) + '. ' + L(m).title), h('p', {}, L(m).desc),
          h('div', { class: 'bar' }, h('i', { style: 'width:' + (100 * dn / m.blocks.length) + '%' })),
          h('div', { class: 'dim', style: 'font-size:13px;color:var(--dim);margin-bottom:10px' }, tr('blocksDone', { d: dn, n: m.blocks.length })),
          h('a', { class: 'btn sm', href: '#/m/' + m.id }, dn ? tr('contBtn') : tr('startBtn')));
      }),
      (course.upcoming || []).map((u, i) => h('div', { class: 'card coming' }, h('h3', {}, (course.modules.length + i + 1) + '. ' + u.title), h('p', {}, u.desc), h('span', { class: 'state' }, tr('comingNext'))))
    ),
    h('p', { style: 'margin-top:26px;color:var(--dim);font-size:13px' }, tr('savedShort'), h('a', { href: '#/verify' }, tr('selfCheckLong')), tr('selfCheckNote'))));
}

// ------------------------------------------------------------------ module
function viewModule(id) {
  const m = course.modules.find(x => x.id === id);
  if (!m) return viewWelcome();
  $app.append(h('div', { class: 'page' },
    h('div', { class: 'crumbs' }, h('a', { href: '#/' }, tr('welcomeCrumb')), ' / ', h('a', { href: '#/c/' + course.id }, cT(course).title), ' / ', L(m).title),
    h('h1', {}, L(m).title), h('p', {}, L(m).desc),
    h('div', { class: 'bar' }, h('i', { style: 'width:' + (100 * m.blocks.filter(b => isDone(b.id)).length / m.blocks.length) + '%' })),
    h('ul', { class: 'blocks' }, m.blocks.map(b => h('li', { onclick: () => location.hash = '#/b/' + b.id },
      h('span', { class: 't' }, TYPE_LABEL[b.type]), h('span', { class: 'n' }, L(b).title, h('div', { class: 'd' }, L(b).desc || '')),
      h('span', { class: 'chk' + (isDone(b.id) ? ' on' : '') }, isDone(b.id) ? '✓' : ''))))));
}
function nextLink(m, b) {
  const i = m.blocks.indexOf(b), nx = m.blocks[i + 1];
  return nx ? h('a', { class: 'btn', href: '#/b/' + nx.id }, tr('next') + L(nx).title + ' →') : h('a', { class: 'btn', href: '#/m/' + m.id }, tr('backToModule'));
}
function viewBlock(id) {
  const [m, b] = blockById(id);
  if (!b) return viewWelcome();
  ({ theory: viewTheory, lab: viewLab, quiz: viewQuiz, review: viewReview })[b.type](m, b, L(b));
}
const head = (m, b, lb) => h('div', {}, h('div', { class: 'crumbs' }, h('a', { href: '#/' }, tr('welcomeCrumb')), ' / ', h('a', { href: '#/c/' + course.id }, cT(course).title), ' / ', h('a', { href: '#/m/' + m.id }, L(m).title), ' / ', lb.title), h('h1', {}, TYPE_LABEL[b.type] + ': ' + lb.title));

// ------------------------------------------------------------------ question widget (theory + quiz)
function question(q, qid, onResult) {
  const name = 'q' + Math.random().toString(36).slice(2);
  const res = h('div', { class: 'res' });
  const opts = q.options.map((o, i) => h('label', { class: 'opt' }, h('input', { type: 'radio', name, value: i }), h('span', { html: o })));
  const box = h('div', { class: 'q' }, h('div', { html: '<b>' + q.text + '</b>' }), opts,
    h('button', { class: 'btn sm', onclick: () => {
      const sel = box.querySelector('input:checked');
      if (!sel) { res.className = 'res no'; res.textContent = tr('pickFirst'); return; }
      const ok = +sel.value === q.answer;
      res.className = 'res ' + (ok ? 'ok' : 'no');
      res.innerHTML = (ok ? tr('passed') : tr('notPassed')) + '<span class="why">' + (q.why || '') + '</span>';
      prog.q[qid] = ok; saveProg(); onResult && onResult(ok);
    } }, tr('checkAnswer')), res);
  if (prog.q[qid]) { res.className = 'res ok'; res.innerHTML = tr('passed') + '<span class="why">' + (q.why || '') + '</span>'; }
  return box;
}

// ------------------------------------------------------------------ playground (editor + live preview)
function playground(files, opts = {}) {
  const names = Object.keys(files);
  let cur = names[0];
  const state = Object.assign({}, files);
  const isRust = opts.lang === 'rust' || state['main.rs'] !== undefined;
  const mainName = state['main.qml'] !== undefined ? 'main.qml' : state['main.rs'] !== undefined ? 'main.rs' : names[0];
  if (isRust) {
    const out = h('pre', { class: 'rustout' }), con = h('div', { class: 'con' });
    const show = () => {
      const res = window.RustLib.runProgram(state[cur]);
      out.textContent = res.out || '';
      con.innerHTML = '';
      if (res.errOut) con.append(h('div', { class: 'l' }, res.errOut.replace(/\n$/, '')));
      if (res.error) con.append(h('div', { class: 'e' }, res.error));
      if (!res.errOut && !res.error) con.append(h('div', { class: 'okm' }, tr('noErrors')));
    };
    const run = () => { if (state[cur] === undefined) cur = mainName; show(); };
    const ed = createEditor(state[cur], v => { state[cur] = v; run(); }, run, window.RustLib && window.RustLib.highlightRust);
    const tabs = h('div', { class: 'tabs' }, names.map(n => h('button', { class: n === cur ? 'on' : '', onclick: () => {
      state[cur] = ed.value; cur = n; ed.value = state[n]; ed.focus();
      tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.textContent === n)); run();
    } }, n)));
    run();
    return { state, out, preview: out, con, run, ed, tabs, isRust: true,
      current: () => { state[cur] = ed.value; return Object.assign({}, state); },
      setFiles(f) { for (const k in state) delete state[k]; Object.assign(state, f); const ns = Object.keys(f); cur = ns.includes(mainName) ? mainName : ns[0]; ed.value = state[cur]; run(); } };
  }
  const preview = h('div', { class: 'pv' }), con = h('div', { class: 'con' });
  const rt = new window.QmlRuntime({ container: preview });
  let timer = 0;
  const show = () => {
    con.innerHTML = '';
    for (const e of rt.errors) con.append(h('div', { class: 'e' }, (e.file ? e.file + (e.line ? ':' + e.line : '') + ': ' : '') + e.message));
    for (const l of rt.logs) con.append(h('div', { class: 'l' }, 'qml: ' + l));
    if (!rt.errors.length && !rt.logs.length) con.append(h('div', { class: 'okm' }, tr('noErrors')));
  };
  rt.onLog = () => show(); rt.onError = () => show();
  const run = () => { rt.load(state, mainName); rt.start(); show(); };
  const ed = createEditor(state[cur], v => { state[cur] = v; clearTimeout(timer); timer = setTimeout(run, 450); }, run);
  const tabs = h('div', { class: 'tabs' }, names.map(n => h('button', { class: n === cur ? 'on' : '', onclick: () => {
    state[cur] = ed.value; cur = n; ed.value = state[n]; ed.focus();
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.textContent === n)); run();
  } }, n)));
  return { state, preview, con, rt, run, ed, tabs, isRust: false,
    current: () => { state[cur] = ed.value; return Object.assign({}, state); },
    setFiles(f) { for (const k in state) delete state[k]; Object.assign(state, f); const ns = Object.keys(f); cur = ns.includes(mainName) ? mainName : ns[0]; ed.value = state[cur]; run(); } };
}

// ------------------------------------------------------------------ theory
function viewTheory(m, b, lb) {
  const page = h('div', { class: 'page' }, head(m, b, lb), lb.intro ? h('p', { html: lb.intro }) : null);
  const status = [];
  const refresh = () => {
    const ok = b.lessons.every((l, i) => !l.q || prog.q[b.id + ':' + i]);
    if (ok && !isDone(b.id)) { markDone(b.id); updateOverall(); }
    done.disabled = !ok; doneNote.textContent = ok ? tr('allPassed') : tr('passAll');
  };
  const done = h('a', { class: 'btn', href: '#', onclick: ev => { ev.preventDefault(); if (!done.disabled) location.hash = nextHash(m, b); } }, tr('continueArrow'));
  const doneNote = h('span', { style: 'margin-left:12px;color:var(--dim)' });
  lb.lessons.forEach((l, i) => {
    const st = h('span', { class: 'state' + (prog.q[b.id + ':' + i] ? ' ok' : '') }, l.q ? (prog.q[b.id + ':' + i] ? tr('stPassed') : tr('stNot')) : tr('stRead'));
    const sec = h('section', { class: 'lesson' }, st, h('h2', {}, l.title), h('div', { html: l.html }));
    if (l.example) {
      const isRust = blockLang(b) === 'rust';
      const exFiles = isRust
        ? { 'main.rs': typeof l.example === 'string' ? l.example : (l.example['main.rs'] || Object.values(l.example)[0]) }
        : (typeof l.example === 'string' ? { 'main.qml': l.example } : l.example);
      const pg = playground(exFiles, { lang: isRust ? 'rust' : 'qml' });
      cleanups.push(() => pg.rt && pg.rt.dispose());
      const pane = isRust
        ? h('div', { style: 'display:grid;grid-template-rows:1fr auto;min-height:0' }, pg.out, pg.con)
        : h('div', { style: 'display:grid;grid-template-rows:2fr 1fr;min-height:0' }, pg.preview, pg.con);
      sec.append(h('div', { class: 'ex' }, h('div', { class: 'exh' }, tr('tryIt')), h('div', { class: 'pg' }, pg.ed.el, pane)));
    }
    if (l.q) sec.append(question(l.q, b.id + ':' + i, ok => { st.className = 'state' + (ok ? ' ok' : ''); st.textContent = ok ? tr('stPassed') : tr('stNot'); refresh(); }));
    page.append(sec);
  });
  page.append(h('div', { class: 'toolbar' }, done, doneNote));
  $app.append(page); refresh();
}
function nextHash(m, b) { const i = m.blocks.indexOf(b), nx = m.blocks[i + 1]; return nx ? '#/b/' + nx.id : '#/m/' + m.id; }

// ------------------------------------------------------------------ quiz
function viewQuiz(m, b, lb) {
  const page = h('div', { class: 'page' }, head(m, b, lb), h('p', {}, lb.intro || tr('quizIntro')));
  const picks = [];
  const result = h('div', { class: 'score' });
  lb.questions.forEach((q, i) => {
    const name = 'qz' + i;
    page.append(h('div', { class: 'lesson' }, h('div', { html: '<b>' + (i + 1) + '. ' + q.text + '</b>' }),
      q.options.map((o, k) => h('label', { class: 'opt', style: 'display:block;margin:6px 0' }, h('input', { type: 'radio', name, value: k, onchange: () => { picks[i] = k; } }), ' ', h('span', { html: o }))),
      h('div', { class: 'res', id: 'qzr' + i })));
  });
  page.append(h('div', { class: 'toolbar' }, h('button', { class: 'btn', onclick: () => {
    let ok = 0;
    b.questions.forEach((q, i) => {
      const r = page.querySelector('#qzr' + i), good = picks[i] === q.answer; if (good) ok++;
      r.className = 'res ' + (good ? 'ok' : 'no'); r.innerHTML = (good ? tr('correct') : tr('notQuite')) + '<span class="why">' + (q.why || '') + '</span>';
    });
    const pct = Math.round(100 * ok / b.questions.length);
    result.textContent = ok + ' / ' + b.questions.length + ' (' + pct + '%) ' + (pct >= 70 ? tr('quizPass') : tr('quizFail'));
    if (pct >= 70) { markDone(b.id); updateOverall(); }
  } }, tr('submit')), nextLink(m, b)), result);
  $app.append(page);
}

// ------------------------------------------------------------------ review
function viewReview(m, b, lb) {
  $app.append(h('div', { class: 'page' }, head(m, b, lb), h('div', { class: 'lesson', html: lb.html }),
    h('div', { class: 'toolbar' }, h('button', { class: 'btn', onclick: () => { markDone(b.id); updateOverall(); location.hash = '#/m/' + m.id; } }, tr('markReviewed')))));
}

// ------------------------------------------------------------------ test running
function runTests(lab, files, rt) {
  const isRust = (lab.lang === 'rust' || (files && files['main.rs'] !== undefined)) && window.RustLib;
  if (isRust) {
    const src = files['main.rs'] !== undefined ? files['main.rs'] : files[Object.keys(files)[0]];
    const results = [];
    for (const test of lab.tests) {
      const r = { story: test.story, ok: false, why: '' };
      try { const t = window.RustLib.makeRustKit(src, Fail); (test.run || window.QmlTestKit.stepsToRun(test.steps))(t); r.ok = true; }
      catch (e) { r.why = e instanceof Fail ? e.message : 'Test could not run: ' + e.message; }
      results.push(r);
    }
    return results;
  }
  const results = [];
  const loaded = rt.load(files, 'main.qml');
  for (const test of lab.tests) {
    const r = { story: test.story, ok: false, why: '' };
    try {
      if (!loaded && !test.allowErrors) {
        const e = rt.errors[0]; r.why = 'QML error: ' + (e.file ? e.file + ':' : '') + (e.line ? e.line + ': ' : '') + e.message;
      } else {
        const t = makeKit(rt, files);
        (test.run || window.QmlTestKit.stepsToRun(test.steps))(t);
        r.ok = true;
      }
    } catch (e) {
      r.why = e instanceof Fail ? e.message : 'Test could not run: ' + e.message;
    }
    // each test starts from a fresh engine so tests cannot disturb each other
    results.push(r);
    if (!(loaded === false)) rt.load(files, 'main.qml');
  }
  return results;
}

// ------------------------------------------------------------------ lab
function viewLab(m, b, lb) {
  const saved = prog.files[b.id];
  const start = saved || b.files;
  const isRust = blockLang(b) === 'rust';
  const pg = playground(JSON.parse(JSON.stringify(start)), { lang: isRust ? 'rust' : 'qml' });
  cleanups.push(() => pg.rt && pg.rt.dispose());
  let saveT = 0;
  pg.ed.el.addEventListener('input', () => { clearTimeout(saveT); saveT = setTimeout(() => { prog.files[b.id] = pg.current(); saveProg(); }, 500); });
  const list = h('div', {});
  const msg = h('div', { style: 'margin:10px 0;font-weight:700' });
  const renderStories = res => {
    list.innerHTML = '';
    b.tests.forEach((t, i) => {
      const r = res && res[i];
      list.append(h('div', { class: 'story ' + (r ? (r.ok ? 'p' : 'f') : '') }, h('span', { class: 'm' }, r ? (r.ok ? '✓' : '✗') : (i + 1) + '.'), h('div', {}, h('span', { html: lb.stories ? lb.stories[i] : t.story }), r && !r.ok ? h('span', { class: 'why' }, r.why) : null)));
    });
  };
  const test = () => {
    const files = pg.current();
    let res;
    if (isRust) {
      res = runTests(b, files, null);
      pg.run();
    } else {
      const tmp = document.createElement('div'); document.body.append(tmp); tmp.style.cssText = 'position:absolute;left:-9999px;top:0';
      const rt = new window.QmlRuntime({ container: tmp });
      res = runTests(b, files, rt); rt.dispose(); tmp.remove();
      pg.run();
    }
    renderStories(res);
    const pass = res.filter(r => r.ok).length;
    if (pass === res.length) { msg.style.color = 'var(--ok)'; msg.textContent = tr('labOk'); markDone(b.id); updateOverall(); nextBtn.style.display = ''; }
    else { msg.style.color = 'var(--bad)'; msg.textContent = tr('labPart', { p: pass, n: res.length }); }
  };
  const nextBtn = nextLink(m, b); nextBtn.style.display = isDone(b.id) ? '' : 'none';
  const sol = h('details', { style: 'margin-top:14px;color:var(--dim)' }, h('summary', {}, tr('stuck')),
    h('div', {}, Object.entries(b.solution).map(([n, s]) => h('div', {}, h('div', { class: 'dim' }, n), h('pre', { style: 'background:#0a0a23;padding:10px;overflow:auto;font:13px var(--mono)' }, s))),
      h('button', { class: 'btn sm ghost', onclick: () => pg.setFiles(JSON.parse(JSON.stringify(b.solution))) }, tr('loadSol'))));
  renderStories(null);
  const left = h('div', { class: 'left' }, h('div', { class: 'crumbs' }, h('a', { href: '#/m/' + m.id }, L(m).title), ' / ' + tr('labCrumb')), h('h2', { style: 'margin-top:0' }, lb.title),
    h('div', { html: lb.desc2 || '' }), h('h3', {}, tr('stories')), list,
    h('div', { class: 'toolbar' }, h('button', { class: 'btn', onclick: test }, tr('runTests')), h('button', { class: 'btn ghost', onclick: () => { if (confirm(tr('resetAsk'))) { delete prog.files[b.id]; saveProg(); pg.setFiles(JSON.parse(JSON.stringify(b.files))); renderStories(null); msg.textContent = ''; } } }, tr('reset'))),
    msg, nextBtn, sol);
  const right = h('div', { class: 'right' }, h('div', { class: 'edwrap' }, pg.tabs, pg.ed.el),
    h('div', { class: 'lower' }, h('div', { style: 'display:grid;grid-template-rows:auto 1fr;min-height:0' }, h('div', { class: 'pvhead' }, tr(isRust ? 'output' : 'preview')), pg.preview), h('div', { style: 'display:grid;grid-template-rows:auto 1fr;min-height:0' }, h('div', { class: 'conhead' }, tr(isRust ? 'errors' : 'console')), pg.con)));
  $app.append(h('div', { class: 'lab' }, left, right));
  $app.style.maxWidth = '1700px';
}

// ------------------------------------------------------------------ verify: every solution passes, every starter fails
function viewVerify() {
  const tbl = h('table', { class: 'vt' }, h('tr', {}, h('td', {}, 'Lab'), h('td', {}, 'Starter (should fail)'), h('td', {}, 'Solution (should pass)'), h('td', {}, 'Details')));
  $app.append(h('div', { class: 'page', style: 'max-width:1100px' }, h('h1', {}, 'Self-check'), tbl));
  const tmp = h('div', { style: 'position:absolute;left:-9999px;top:0' }); document.body.append(tmp);
  window.__verify = { rows: [] };
  for (const bl of everyBlock().filter(x => x.type === 'lab')) {
    const isRust = blockLang(bl) === 'rust';
    let a, s;
    if (isRust) {
      a = runTests(bl, bl.files, null); s = runTests(bl, bl.solution, null);
    } else {
      const rt = new window.QmlRuntime({ container: tmp });
      a = runTests(bl, bl.files, rt); s = runTests(bl, bl.solution, rt); rt.dispose();
    }
    const aOk = a.some(r => !r.ok), sOk = s.every(r => r.ok);
    const bad = s.filter(r => !r.ok).map(r => r.story.replace(/<[^>]+>/g, '') + ' → ' + r.why).join(' | ');
    window.__verify.rows.push({ id: bl.id, starterFails: aOk, solutionPasses: sOk, bad });
    tbl.append(h('tr', {}, h('td', {}, bl.id + ' ' + bl.title), h('td', { class: aOk ? 'ok' : 'no' }, aOk ? 'fails ✓' : 'PASSES (bad)'), h('td', { class: sOk ? 'ok' : 'no' }, sOk ? 'passes ✓' : 'FAILS'), h('td', {}, bad)));
  }
  tmp.remove(); window.__verify.done = true;
}

// ------------------------------------------------------------------ language switcher
const sel = document.getElementById('lang');
sel.append(...I.LANGS.map(([k, n]) => h('option', { value: k }, n)));
function chrome() { sel.value = I.lang; sel.title = tr('language'); document.getElementById('tagline').textContent = tr('tag'); }
sel.addEventListener('change', () => { I.set(sel.value); chrome(); route(); });
chrome();
window.QMLCampCore = { runTests, h, blockLang, esc, allBlocks, everyBlock, cT, TYPE_LABEL };
if (window.ForgeCustom) ForgeCustom.boot(route);
else route();
})();
