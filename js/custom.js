// =============================================================================
//  ForgeCustom: custom courses for QMLCamp.
//  - loads custom/<id>.js files listed in custom/index.js (works from file://)
//  - stores UI-made courses in localStorage (same schema as the files)
//  - validates courses, exports/imports them, adds badges and card actions
//  Loaded before js/app.js (which calls ForgeCustom.boot before its first route).
// =============================================================================
(function () {
'use strict';
const G = (window.ForgeCustom = window.ForgeCustom || {});
const KEY = 'qmlcamp.courses.v1';
const BUILTIN = ['qml', 'js', 'rust'];
const OPS_QML = ['noErrors', 'has', 'count', 'eq', 'near', 'rgbBelow', 'uses', 'declares', 'sourceHas', 'click', 'advance'];
const OPS_RUST = ['noErrors', 'sourceHas', 'outHas'];
const errors = [];                       // { file, message } shown on the welcome page as an error card
const stored = {};                       // id -> course, from localStorage
const loadedFiles = {};                  // id -> true, from custom/ files
G.errors = errors;
G.refresh = () => { location.hash = location.hash || '#/'; window.scrollTo(0, 0); if (G.onRefresh) G.onRefresh(); };

// ------------------------------------------------------------------ small DOM helper
const h = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
G.h = h;
const slug = s => String(s || 'course').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'course';
G.slug = slug;
const clone = o => JSON.parse(JSON.stringify(o));
const isPlain = o => o && typeof o === 'object' && !Array.isArray(o);
G.isValidId = id => /^x-[a-z0-9-]{1,}$/.test(String(id || ''));
G.newId = title => 'x-' + slug(title) + '-' + Math.random().toString(36).slice(2, 5);

// ------------------------------------------------------------------ stored courses
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  for (const [id, c] of Object.entries(raw)) {
    const bad = validate(c);
    if (bad.length) errors.push({ file: 'localStorage:' + id, message: 'Stored course is not valid: ' + bad[0] });
    else stored[id] = c;
  }
} catch (e) {
  errors.push({ file: 'localStorage', message: 'Stored courses are corrupt; built-in courses still work.' });
}
const persist = () => {
  try { localStorage.setItem(KEY, JSON.stringify(stored)); }
  catch (e) { errors.push({ file: 'localStorage', message: 'Could not save courses (storage full or blocked).' }); }
};

// ------------------------------------------------------------------ validation (QMLCamp)
function validate(c) {
  const e = [];
  if (!isPlain(c)) return ['Course is missing or not an object.'];
  if (!G.isValidId(c.id)) e.push('Course id must start with "x-" and use only a-z, 0-9 and dashes.');
  if (!c.title) e.push('Course title is empty.');
  if (c.lang && !['qml', 'js', 'rust'].includes(c.lang)) e.push('Unknown course language: ' + c.lang);
  if (!Array.isArray(c.modules) || !c.modules.length) { e.push('The course has no modules.'); return e; }
  c.modules.forEach((m, i) => {
    const at = 'Module ' + (i + 1) + ' (' + (m.title || m.id || '?') + ')';
    if (!m.id) e.push(at + ': missing id.'); else if (BUILTIN.includes(m.id)) e.push(at + ': id "' + m.id + '" is reserved.');
    if (!m.title) e.push(at + ': missing title.');
    if (!Array.isArray(m.blocks) || !m.blocks.length) { e.push(at + ': no blocks.'); return; }
    m.blocks.forEach((b, j) => {
      const ba = at + ' > block ' + (j + 1) + ' (' + (b.title || b.id || '?') + ')';
      if (!b.id) e.push(ba + ': missing id.'); else if (BUILTIN.includes(b.id)) e.push(ba + ': id "' + b.id + '" is reserved.');
      if (!b.title) e.push(ba + ': missing title.');
      if (b.type === 'theory') {
        if (!Array.isArray(b.lessons) || !b.lessons.length) e.push(ba + ': no lessons.');
        else b.lessons.forEach((l, k) => {
          const la = ba + ' > lesson ' + (k + 1);
          if (!l.title) e.push(la + ': missing title.');
          if (!l.html) e.push(la + ': missing html.');
          if (l.q && (!Array.isArray(l.q.options) || l.q.options.length < 2 || !(l.q.answer >= 0 && l.q.answer < l.q.options.length))) e.push(la + ': question needs 2+ options and a valid answer index.');
        });
      } else if (b.type === 'lab') {
        if (!isPlain(b.files) || !Object.keys(b.files).length) e.push(ba + ': no starter files.');
        if (!isPlain(b.solution) || !Object.keys(b.solution).length) e.push(ba + ': no solution files.');
        if (!Array.isArray(b.tests) || !b.tests.length) e.push(ba + ': no tests.');
        else b.tests.forEach((t, k) => {
          if (!t.story) e.push(ba + ' > test ' + (k + 1) + ': missing story.');
          if (t.run) return;               // hand-written tests are allowed in custom/ files
          if (!Array.isArray(t.steps) || !t.steps.length) { e.push(ba + ' > test ' + (k + 1) + ': no steps.'); return; }
          const ops = (c.lang === 'rust' || b.lang === 'rust') ? OPS_RUST : OPS_QML;
          t.steps.forEach((s, n) => { if (!s || !ops.includes(s.op)) e.push(ba + ' > test ' + (k + 1) + ' step ' + (n + 1) + ': unknown step "' + (s && s.op) + '".'); });
        });
      } else if (b.type === 'quiz') {
        if (!Array.isArray(b.questions) || !b.questions.length) e.push(ba + ': no questions.');
        else b.questions.forEach((q, k) => { if (!Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length)) e.push(ba + ' > question ' + (k + 1) + ': needs 2+ options and a valid answer index.'); });
      } else if (b.type === 'review') {
        if (!b.html) e.push(ba + ': missing html.');
      } else e.push(ba + ': unknown block type "' + b.type + '".');
    });
  });
  return e;
}
G.validate = validate;
const exportable = c => (c.modules || []).every(m => (m.blocks || []).every(b => b.type !== 'lab' || (b.tests || []).every(t => !t.run)));
G.exportable = exportable;

// ------------------------------------------------------------------ install into QMLCAMP.courses
function mergeTr(c) {
  if (!isPlain(c.tr)) return;
  const T = (window.QMLCAMP.tr = window.QMLCAMP.tr || {});
  for (const lang of Object.keys(c.tr)) {
    T[lang] = T[lang] || {};
    for (const id of Object.keys(c.tr[lang])) T[lang][id] = Object.assign({}, T[lang][id], c.tr[lang][id]);
  }
}
function install() {
  const C = window.QMLCAMP;
  C.courses = C.courses || [];
  // Built-in courses win by id, then custom/ files, then localStorage.
  for (const c of Object.values(stored)) {
    if (loadedFiles[c.id]) continue;                    // a custom/ file with the same id takes over
    const cur = C.courses.find(x => x.id === c.id);
    if (cur) Object.assign(cur, c, { custom: 'ui' });
    else C.courses.push(Object.assign(clone(c), { custom: 'ui' }));
    mergeTr(c);
  }
  for (const c of C.courses) if (loadedFiles[c.id]) { c.custom = 'file'; mergeTr(c); }
}
G.install = install;

// ------------------------------------------------------------------ load custom/ files
const pending = [];
function loadFiles() {
  const C = window.QMLCAMP;
  const list = (window.CUSTOM_COURSES || []).filter(x => x && x.engine === 'qmlcamp');
  const before = new Set((C.courses || []).map(c => c.id));
  for (const entry of list) {
    if (!entry.id || !entry.file) { errors.push({ file: entry.file || '?', message: 'Manifest entry needs an id and a file.' }); continue; }
    pending.push(new Promise(resolve => {
      const s = document.createElement('script');
      s.src = entry.file;
      const done = () => {
        const found = (window.QMLCAMP.courses || []).some(c => c.id === entry.id);
        if (found) loadedFiles[entry.id] = true;
        else errors.push({ file: entry.file, message: 'Did not register a QMLCamp course with id "' + entry.id + '" (missing file, or a syntax/runtime error).' });
        resolve();
      };
      s.onload = done;
      s.onerror = () => { errors.push({ file: entry.file, message: 'Could not load the file (not found?).' }); resolve(); };
      document.head.append(s);
    }));
  }
  void before;
}
// wait until every custom/ file has settled, then install
G.boot = function (cb) {
  let done = false;
  const go = () => { if (done) return; done = true; install(); (cb || (() => {}))(); };
  if (!pending.length) { go(); return; }
  Promise.all(pending).then(go);
  setTimeout(go, 4000);                                  // safety net, never hang the app
};

// ------------------------------------------------------------------ create / edit / delete
G.saveCourse = function (course) {
  const bad = validate(course);
  if (bad.length) return bad;
  stored[course.id] = clone(course);
  delete stored[course.id].custom;
  persist();
  install();
  return [];
};
G.deleteCourse = function (id) {
  delete stored[id];
  persist();
  const C = window.QMLCAMP;
  const i = C.courses.findIndex(c => c.id === id);
  if (i >= 0) C.courses.splice(i, 1);
  G.refresh();
};
G.getCourse = id => stored[id] ? clone(stored[id]) : (window.QMLCAMP.courses.find(c => c.id === id) ? clone(window.QMLCAMP.courses.find(c => c.id === id)) : null);
G.storedList = () => Object.values(stored).map(clone);

// rewrite module/block ids so a copy never clashes with the original (or its progress)
function reid(c, newId, title) {
  const map = {};
  c.id = newId;
  if (title) c.title = title;
  c.modules.forEach((m, i) => {
    const nm = newId + '-m' + (i + 1); map[m.id] = nm; m.id = nm;
    m.blocks.forEach((b, j) => { const nb = nm + '-b' + (j + 1); map[b.id] = nb; b.id = nb; });
  });
  if (isPlain(c.tr)) {
    const t2 = {};
    for (const lang of Object.keys(c.tr)) { t2[lang] = {}; for (const k of Object.keys(c.tr[lang])) t2[lang][map[k] || k] = c.tr[lang][k]; }
    c.tr = t2;
  }
  return c;
}
G.reid = reid;
G.duplicateCourse = function (id) {
  const src = G.getCourse(id);
  if (!src) return null;
  const copy = reid(clone(src), G.newId(src.title), src.title + ' (copy)');
  delete copy.custom;
  G.saveCourse(copy);
  G.refresh();
  return copy.id;
};

// ------------------------------------------------------------------ export / import
function exportText(c, engine) {
  const clean = clone(c);
  delete clean.custom;
  const push = engine === 'genlearn' ? 'window.GENLEARN.courses' : 'window.QMLCAMP.courses';
  return '// ' + clean.id + '.js — custom ' + (engine === 'genlearn' ? 'GENLearn' : 'QMLCamp') + ' course (created with the course creator).\n' +
    '// Put it in custom/ and add it to custom/index.js:\n' +
    '//   { engine: ' + JSON.stringify(engine) + ', id: ' + JSON.stringify(clean.id) + ', file: "custom/' + clean.id + '.js" }\n' +
    '(function () {\n  \'use strict\';\n  ' + push + ' = ' + push + ' || [];\n' +
    '  ' + push + '.push(' + JSON.stringify(clean, null, 2) + ');\n})();\n';
}
G.exportText = exportText;
function download(name, text) {
  const blob = new Blob([text], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
G.download = download;
G.exportCourse = c => download(c.id + '.js', exportText(c, 'qmlcamp'));
G.manifestLine = c => '{ engine: "qmlcamp", id: ' + JSON.stringify(c.id) + ', file: "custom/' + c.id + '.js" }';

function parseCourse(text) {
  let json = null;
  const m = String(text).match(/\.push\(\s*([\s\S]*)\)\s*;\s*\}\)\(\)\s*;?\s*$/);
  if (m) json = m[1];
  else if (/^\s*\{/.test(text)) json = String(text).replace(/;\s*$/, '');
  if (json == null) throw new Error('Not a course file. Expected JSON or a file made with Export.');
  const c = JSON.parse(json);
  if (!G.isValidId(c.id)) c.id = G.newId(c.title);
  return c;
}
G.importCourse = function (text) {
  let c;
  try { c = parseCourse(text); } catch (e) { return { error: e.message }; }
  const bad = validate(c);
  if (bad.length) return { error: bad[0] };
  if (BUILTIN.includes(c.id)) c.id = G.newId(c.title);
  const r = G.saveCourse(c);
  if (r.length) return { error: r[0] };
  return { id: c.id };
};
G.importFile = function (file, cb) {
  const r = new FileReader();
  r.onload = () => cb(G.importCourse(r.result));
  r.readAsText(file);
};

// ------------------------------------------------------------------ progress extras (bundled with Export progress)
G.exportStored = () => Object.values(stored).map(clone);
G.importStored = function (list) {
  if (!Array.isArray(list)) return;
  for (const c of list) {
    const bad = validate(c);
    if (bad.length) { errors.push({ file: 'import:' + (c && c.id), message: bad[0] }); continue; }
    if (!BUILTIN.includes(c.id)) { stored[c.id] = clone(c); delete stored[c.id].custom; }
  }
  persist(); install();
};

// ------------------------------------------------------------------ welcome-page pieces
G.badges = function (c) {
  const out = [];
  if (c.custom) out.push(h('span', { class: 'badge', title: 'Not a built-in course' }, c.custom === 'file' ? 'custom file' : 'custom'));
  if (c.lang === 'rust') out.push(h('span', { class: 'badge rust' }, 'Rust'));
  else if (c.lang === 'js') out.push(h('span', { class: 'badge js' }, 'JavaScript'));
  else if (c.id !== 'qml' && c.id !== 'js' && c.id !== 'rust') out.push(h('span', { class: 'badge' }, 'QML'));
  return out;
};
G.cardActions = function (c) {
  const acts = [];
  if (c.custom === 'ui') {
    acts.push(h('a', { class: 'btn sm ghost', href: '#/creator/' + c.id, title: 'Edit this course' }, 'Edit'));
  }
  acts.push(h('button', { class: 'btn sm ghost', title: exportable(c) ? 'Download custom/' + c.id + '.js' : 'This course has hand-written tests; export is only for the creator format', disabled: !exportable(c), onclick: () => { if (!exportable(c)) return; G.exportCourse(c); alert('Downloaded ' + c.id + '.js. Put it in custom/ and add to custom/index.js:\n\n' + G.manifestLine(c)); } }, 'Export'));
  acts.push(h('button', { class: 'btn sm ghost', title: 'Make an editable copy', onclick: () => { const id = G.duplicateCourse(c.id); if (id) location.hash = '#/creator/' + id; } }, 'Duplicate'));
  if (c.custom === 'ui') acts.push(h('button', { class: 'btn sm ghost', onclick: () => { if (confirm('Delete "' + c.title + '" from this browser? The built-in courses are not affected.')) G.deleteCourse(c.id); } }, 'Delete'));
  return acts;
};
G.errorCard = function () {
  if (!errors.length) return null;
  return h('div', { class: 'card errcard' },
    h('h3', {}, '\u26a0 Custom courses could not all be loaded'),
    h('ul', {}, errors.map(e => h('li', {}, h('b', {}, e.file + ': '), e.message))),
    h('div', { class: 'dim', style: 'font-size:13px;margin-top:8px' }, 'Fix custom/index.js or the listed files, then reload. Everything else keeps working.'));
};
})();
