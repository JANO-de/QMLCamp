// =============================================================================
//  QML mini runtime (course subset).
//  - reactive properties: bindings re-run when anything they READ changes
//  - scope rules like QML: ids of the file > the object itself > the file's root object
//  - items render to absolutely positioned DOM nodes; anchors/Row/Column compute x,y,width,height
//  - a virtual clock drives Timer (tests can advance it)
//  Supported types: QtObject Item Rectangle Text MouseArea Row Column Grid Repeater Timer
//                   Window Connections Component Behavior NumberAnimation ColorAnimation
// =============================================================================
(function (G) {
'use strict';
const { parse, QmlError } = G.QmlParser;

// ---------------------------------------------------------------- type table
const ANCHORS = ['fill', 'centerIn', 'left', 'right', 'top', 'bottom', 'horizontalCenter', 'verticalCenter',
  'margins', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin', 'horizontalCenterOffset', 'verticalCenterOffset'];
const T = {
  QtObject: { base: null, visual: false, props: {} },
  Item: { base: 'QtObject', visual: true, props: Object.assign({
    x: ['real', 0], y: ['real', 0], z: ['real', 0], width: ['real', 0], height: ['real', 0],
    implicitWidth: ['real', 0], implicitHeight: ['real', 0], visible: ['bool', true], opacity: ['real', 1],
    rotation: ['real', 0], scale: ['real', 1], clip: ['bool', false], enabled: ['bool', true], focus: ['bool', false], state: ['string', '']
  }, Object.fromEntries(ANCHORS.map(a => ['anchors.' + a, ['var', /Margin|margins|Offset/.test(a) ? 0 : null]]))) },
  Rectangle: { base: 'Item', props: { color: ['color', 'white'], radius: ['real', 0], 'border.color': ['color', 'black'], 'border.width': ['real', 0] } },
  Text: { base: 'Item', props: { text: ['string', ''], color: ['color', 'black'], 'font.pixelSize': ['int', 14], 'font.bold': ['bool', false],
    'font.italic': ['bool', false], 'font.family': ['string', ''], horizontalAlignment: ['int', 1], verticalAlignment: ['int', 32],
    wrapMode: ['int', 0], elide: ['int', 0], contentWidth: ['real', 0], contentHeight: ['real', 0] } },
  MouseArea: { base: 'Item', props: { hoverEnabled: ['bool', false], containsMouse: ['bool', false], pressed: ['bool', false],
    mouseX: ['real', 0], mouseY: ['real', 0], cursorShape: ['int', 0] }, signals: { clicked: ['mouse'], pressed: ['mouse'], released: ['mouse'], entered: [], exited: [], doubleClicked: ['mouse'] } },
  Row: { base: 'Item', props: { spacing: ['real', 0], padding: ['real', 0] } },
  Column: { base: 'Item', props: { spacing: ['real', 0], padding: ['real', 0] } },
  Grid: { base: 'Item', props: { spacing: ['real', 0], padding: ['real', 0], columns: ['int', 4], rows: ['int', 0], rowSpacing: ['real', -1], columnSpacing: ['real', -1] } },
  Repeater: { base: 'Item', props: { model: ['var', 0], delegate: ['Component', null], count: ['int', 0] } },
  // ---- Quickshell (sandbox stubs) ----
  ShellRoot: { base: 'QtObject', module: 'Quickshell', props: {} },
  Singleton: { base: 'QtObject', module: 'Quickshell', props: {} },
  PanelWindow: { base: 'Item', module: 'Quickshell', props: { color: ['color', 'white'], exclusiveZone: ['int', 0], screen: ['var', null], mask: ['var', null],
    'margins.left': ['real', 0], 'margins.right': ['real', 0], 'margins.top': ['real', 0], 'margins.bottom': ['real', 0] } },
  Variants: { base: 'QtObject', module: 'Quickshell', props: { model: ['var', 0], delegate: ['Component', null] } },
  LazyLoader: { base: 'QtObject', module: 'Quickshell', props: { active: ['bool', false], item: ['var', null], delegate: ['Component', null] } },
  Region: { base: 'QtObject', module: 'Quickshell', props: { item: ['var', null] } },
  SystemClock: { base: 'QtObject', module: 'Quickshell', props: { precision: ['int', 2], enabled: ['bool', true], hours: ['int', 12], minutes: ['int', 0], seconds: ['int', 0] } },
  Process: { base: 'QtObject', module: 'Quickshell.Io', props: { command: ['var', []], running: ['bool', false], exitCode: ['int', 0], stdout: ['var', null], stderr: ['var', null] }, signals: { exited: ['exitCode'] } },
  StdioCollector: { base: 'QtObject', module: 'Quickshell.Io', props: { text: ['string', ''] }, signals: { streamFinished: [] } },
  SplitParser: { base: 'QtObject', module: 'Quickshell.Io', props: { splitMarker: ['string', '\n'] }, signals: { read: ['data'] } },
  IpcHandler: { base: 'QtObject', module: 'Quickshell.Io', props: { target: ['string', ''], enabled: ['bool', true] } },
  ListModel: { base: 'QtObject', props: { count: ['int', 0], revision: ['int', 0] } },
  ListView: { base: 'Item', props: { model: ['var', 0], delegate: ['Component', null], spacing: ['real', 0], orientation: ['int', 1], currentIndex: ['int', 0], count: ['int', 0], contentWidth: ['real', 0], contentHeight: ['real', 0], contentX: ['real', 0], contentY: ['real', 0] } },
  Timer: { base: 'QtObject', props: { interval: ['int', 1000], running: ['bool', false], repeat: ['bool', false], triggeredOnStart: ['bool', false] }, signals: { triggered: [] } },
  Window: { base: 'Item', props: { title: ['string', ''], color: ['color', 'white'] } },
  Connections: { base: 'QtObject', props: { target: ['var', null], enabled: ['bool', true] } },
  Component: { base: 'QtObject', props: {} },
  Behavior: { base: 'QtObject', props: { enabled: ['bool', true] } },
  NumberAnimation: { base: 'QtObject', props: { duration: ['int', 250], from: ['var', 0], to: ['var', 0], easing: ['var', null] } },
  ColorAnimation: { base: 'QtObject', props: { duration: ['int', 250], from: ['var', 0], to: ['var', 0], easing: ['var', null] } }
};
const KNOWN_UNSUPPORTED = { Image: 'Image needs files from disk, which the course sandbox does not have' };
const chainOf = t => { const c = []; while (t) { c.unshift(t); t = T[t].base; } return c; };
const camel = s => s[0].toLowerCase() + s.slice(1);
const CONSTS = {
  Text: { AlignLeft: 1, AlignRight: 2, AlignHCenter: 4, AlignTop: 32, AlignBottom: 64, AlignVCenter: 128, NoWrap: 0, WordWrap: 1, WrapAnywhere: 2, Wrap: 3, ElideNone: 0, ElideLeft: 1, ElideRight: 2 },
  SystemClock: { Hours: 0, Minutes: 1, Seconds: 2 }, WlrLayer: { Background: 0, Bottom: 1, Top: 2, Overlay: 3 },
  MouseArea: {}, ListView: { Horizontal: 0, Vertical: 1 }, Easing: { Linear: 0, InOutQuad: 1, OutCubic: 2 }
};
const QtConsts = { AlignLeft: 1, AlignRight: 2, AlignHCenter: 4, AlignTop: 32, AlignBottom: 64, AlignVCenter: 128, PointingHandCursor: 13, ArrowCursor: 0 };

// ---------------------------------------------------------------- reactivity
class Prop {
  constructor(obj, name, type, value) { this.obj = obj; this.name = name; this.type = type; this.value = value; this.subs = new Set(); this.comp = null; this.onSet = null; this.readonly = false; this.alias = null; }
}
class Comp {                       // a computation: re-runs when a property it read changes
  constructor(rt, fn, apply, where) { this.rt = rt; this.fn = fn; this.apply = apply; this.where = where; this.deps = new Set(); this.queued = false; this.dead = false; }
  run() {
    if (this.dead) return;
    for (const d of this.deps) d.subs.delete(this);
    this.deps = new Set();
    const rt = this.rt, prev = rt.cur; rt.cur = this;
    let v, ok = true;
    try { v = this.fn(); } catch (e) { ok = false; rt.report(e, this.where); } finally { rt.cur = prev; }
    for (const d of this.deps) d.subs.add(this);
    if (ok) this.apply(v);
  }
  dispose() { this.dead = true; for (const d of this.deps) d.subs.delete(this); this.deps.clear(); }
}

// ---------------------------------------------------------------- objects
class QObj {
  constructor(rt, typeName, ctx) {
    this.rt = rt; this.typeName = typeName; this.chainNames = []; this.base = typeName;
    this.props = new Map(); this.signals = new Map(); this.methods = new Map(); this.changed = new Map();
    this.ctx = ctx; this.id = ''; this.el = null; this.behaviors = {}; this.cleanups = [];
    this.proxy = rt.wrap(this);
    this.chain = chainOf(typeName);
    this.visual = this.chain.includes('Item');
    for (const t of this.chain) {
      for (const [k, [ty, dv]] of Object.entries(T[t].props)) this.define(k, ty, dv);
      for (const [k, ps] of Object.entries(T[t].signals || {})) this.signals.set(k, { params: ps, handlers: [] });
    }
    this.chainNames = this.chain.slice();
    if (this.visual) { this.define('parent', 'var', null); this.define('children', 'var', []); this.define('data', 'var', []); }
  }
  define(name, type, value) { const p = new Prop(this, name, type, value); this.props.set(name, p); return p; }
  has(name) { return this.props.has(name) || this.signals.has(name) || this.methods.has(name) || name === 'children' ; }
  coerce(p, v) {
    if (v && v.__line) return v;
    switch (p.type) {
      case 'int': return typeof v === 'number' ? Math.trunc(v) : (v === undefined || v === null ? 0 : (isNaN(Number(v)) ? v : Math.trunc(Number(v))));
      case 'real': return typeof v === 'number' ? v : (v === undefined || v === null || v === '' || isNaN(Number(v)) ? v : Number(v));
      case 'bool': return typeof v === 'boolean' ? v : !!v;
      case 'string': return v === undefined || v === null ? '' : String(v);
      default: return v;
    }
  }
  get(name) {
    const p = this.props.get(name);
    if (!p) return undefined;
    const rt = this.rt;
    if (rt.cur) rt.cur.deps.add(p);
    return p.alias ? p.alias.read() : p.value;
  }
  // assign a plain value (this breaks a binding, like in QML)
  set(name, v, keepComp) {
    const p = this.props.get(name);
    if (!p) return;
    if (p.readonly && !this.rt.allowReadonly) { this.rt.report(new Error('Cannot assign to read-only property "' + name + '"'), this.where(name)); return; }
    if (p.comp && !keepComp) { p.comp.dispose(); p.comp = null; p.binding = null; }
    if (p.alias) { p.alias.write(v); return; }
    v = this.coerce(p, v);
    if (p.value === v && (typeof v !== 'object' || v === null)) return;
    p.value = v;
    this.rt.batch(() => {
      for (const c of [...p.subs]) this.rt.enqueue(c);
      if (p.onSet) p.onSet(v);
      const hs = this.changed.get(name);
      if (hs) for (const h of hs) this.rt.runHandler(h);
    });
  }
  where(name) { return (this.ctx && this.ctx.file ? this.ctx.file : '') + ' ' + this.typeName + '.' + name; }
  bind(name, fn, where) {                         // property: <expression>
    const p = this.props.get(name);
    if (!p) return;
    if (p.comp) p.comp.dispose();
    const c = new Comp(this.rt, fn, v => { const rt = this.rt, prev = rt.allowReadonly; rt.allowReadonly = true; try { this.set(name, v, true); } finally { rt.allowReadonly = prev; } }, where || this.where(name));
    p.comp = c; p.binding = { fn, where: where || this.where(name) }; this.rt.run(c);
  }
  emit(name, ...args) {
    const s = this.signals.get(name);
    if (!s) return;
    this.rt.batch(() => { for (const h of [...s.handlers]) this.rt.runHandler(h, args, s.params); });
  }
  onChanged(name, h) { if (!this.changed.has(name)) this.changed.set(name, []); this.changed.get(name).push(h); }
  lineCoord(edge) {                              // anchor lines in own coordinates
    const w = this.get('width') || 0, h = this.get('height') || 0;
    return { left: 0, right: w, top: 0, bottom: h, horizontalCenter: w / 2, verticalCenter: h / 2 }[edge];
  }
}

// ---------------------------------------------------------------- the runtime
class Runtime {
  constructor(opts = {}) {
    this.container = opts.container || null;
    this.files = {};          // name -> source
    this.docs = {};           // name -> parsed document
    this.errors = [];         // {file,line,message}
    this.logs = [];           // console.log lines
    this.cur = null; this.queue = []; this.depth = 0; this.flushing = false;
    this.pending = []; this.completed = [];
    this.now = 0; this.timers = new Set(); this.oneShots = []; this.singletons = {}; this.ipc = {}; this.detached = []; this.desktops = null;
    this.screens = [{ name: 'DP-1', width: 360, height: 200 }, { name: 'HDMI-A-1', width: 360, height: 200 }];
    this.root = null; this.mainCtx = null; this.all = [];
    this.allowReadonly = false;
    this.proxies = new WeakMap();
    this.fnCache = new Map();
    this.loopGuard = 0;
    this.live = !!opts.live; this._raf = 0; this._last = 0;
  }
  // ---- errors & logging
  report(e, where) {
    const msg = (e && e.message) ? (e.name && e.name !== 'Error' ? e.name + ': ' : '') + e.message : String(e);
    const m = String(where || '').match(/^(\S+\.qml)\s/);
    this.errors.push({ file: m ? m[1] : '', line: e && e.line || 0, message: msg, where: String(where || '') });
    if (this.onError) this.onError(this.errors[this.errors.length - 1]);
  }
  log(...a) { const s = a.map(x => typeof x === 'object' && x !== null ? safeJson(x) : String(x)).join(' '); this.logs.push(s); if (this.onLog) this.onLog(s); }

  // ---- scheduling
  enqueue(c) { if (!c.queued && !c.dead) { c.queued = true; this.queue.push(c); } }
  run(c) { this.batch(() => c.run()); }
  batch(fn) {
    this.depth++;
    try { fn(); } finally { this.depth--; }
    if (this.depth === 0) this.flush();
  }
  flush() {
    if (this.flushing) return;
    this.flushing = true; let n = 0;
    try {
      while (this.queue.length) {
        const c = this.queue.shift(); c.queued = false;
        if (++n > 20000) { this.queue.length = 0; this.report(new Error('Binding loop detected (a binding keeps changing its own inputs)'), c.where); break; }
        const prev = this.cur; this.cur = null; this.cur = prev;
        c.run();
      }
    } finally { this.flushing = false; }
  }
  runHandler(h, args, params) {
    const prevCur = this.cur; this.cur = null;
    try { this.batch(() => h(args || [], params || [])); }
    catch (e) { this.report(e, h.where); }
    finally { this.cur = prevCur; }
  }

  // ---- JS compilation: expressions run inside `with(scopeProxy)`
  compile(kind, src, params) {
    const key = kind + '|' + params + '|' + src;
    let f = this.fnCache.get(key);
    if (!f) {
      let body;
      if (kind === 'expr') body = 'with(__s){ return (\n' + src + '\n); }';
      else if (kind === 'block') body = 'with(__s){ return (function(){\n' + src + '\n})(); }';
      else if (kind === 'stmt') body = 'with(__s){\n' + src + '\n}';
      else body = 'with(__s){ return function(' + params + '){\n' + src + '\n}; }';
      f = new Function('__s', body);
      this.fnCache.set(key, f);
    }
    return f;
  }
  scopeFor(obj, ctx, extra) {
    const rt = this;
    const lookup = name => {
      if (extra && name in extra) return { v: extra[name] };
      for (let c = ctx; c; c = c.parentCtx) {
        if (c.extra && name in c.extra) return { v: c.extra[name] };
        if (c.ids.has(name)) return { v: c.ids.get(name).proxy };
      }
      if (obj && obj.has(name)) return { m: obj };
      for (let c = ctx; c; c = c.parentCtx) if (c.root && c.root !== obj && c.root.has(name)) return { m: c.root };
      for (let c = ctx; c; c = c.parentCtx) if (c.enums && c.enums[name]) return { v: c.enums[name] };
      if (name === 'Qt') return { v: rt.Qt };
      if (name === 'Quickshell') return { v: rt.quickshell };
      if (/^[A-Z]/.test(name) && rt.docs[name + '.qml'] && (rt.docs[name + '.qml'].pragmas || []).includes('Singleton')) return { v: rt.getSingleton(name).proxy };
      if (name === 'console') return { v: rt.console };
      if (name in CONSTS) return { v: CONSTS[name] };
      if (name === 'parent' && obj && obj.visual) return { m: obj };
      return null;
    };
    return new Proxy({}, {
      has: (t, k) => typeof k === 'string' && lookup(k) !== null,
      get: (t, k) => {
        if (typeof k !== 'string') return undefined;
        const r = lookup(k);
        if (!r) return undefined;
        return 'v' in r ? r.v : rt.getMember(r.m, k);
      },
      set: (t, k, val) => {
        const r = lookup(k);
        if (r && r.m) rt.setMember(r.m, k, val);
        else if (r) rt.report(new Error('Cannot assign to "' + k + '": ids and constants cannot be reassigned'), '');
        return true;
      }
    });
  }
  get Qt() {
    if (this._qt) return this._qt;
    const clamp = x => Math.max(0, Math.min(255, Math.round(x)));
    const parseColor = c => { const d = document.createElement('canvas').getContext('2d'); d.fillStyle = '#000'; d.fillStyle = String(c); const h = d.fillStyle;
      if (h[0] === '#') return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 1];
      const m = h.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]]; };
    const css = a => 'rgba(' + clamp(a[0]) + ',' + clamp(a[1]) + ',' + clamp(a[2]) + ',' + a[3] + ')';
    this._qt = Object.assign({
      rgba: (r, g, b, a) => css([r * 255, g * 255, b * 255, a === undefined ? 1 : a]),
      lighter: (c, f = 1.5) => { const a = parseColor(c); return css([a[0] * f, a[1] * f, a[2] * f, a[3]]); },
      darker: (c, f = 2) => { const a = parseColor(c); return css([a[0] / f, a[1] / f, a[2] / f, a[3]]); },
      binding: fn => ({ __qtBinding: fn }),
      callLater: fn => setTimeout(fn, 0),
      quit: () => this.log('Qt.quit() called')
    }, QtConsts);
    return this._qt;
  }
  get console() {
    return this._console || (this._console = { log: (...a) => this.log(...a), warn: (...a) => this.log('warning:', ...a), error: (...a) => this.log('error:', ...a) });
  }
  wrap(o) {
    const rt = this;
    const p = new Proxy({}, {
      get: (t, k) => typeof k === 'string' ? rt.getMember(o, k) : undefined,
      set: (t, k, v) => { rt.setMember(o, k, v); return true; },
      has: (t, k) => typeof k === 'string' && o.has(k)
    });
    this.proxies.set(p, o);
    return p;
  }
  unwrap(v) { return v && typeof v === 'object' ? (this.proxies.get(v) || null) : null; }
  getMember(o, k) {
    if (o.props.has(k)) return o.get(k);
    if (o.methods.has(k)) return o.methods.get(k);
    if (o.signals.has(k)) { const rt = this; return (...a) => o.emit(k, ...a); }
    if (k === 'font' || k === 'border' || k === 'anchors') return this.group(o, k);
    if (o.visual && ['left', 'right', 'top', 'bottom', 'horizontalCenter', 'verticalCenter'].includes(k)) { if (this.cur) {} return { __line: true, item: o, edge: k }; }
    if (k === 'destroy') return () => this.destroyObj(o);
    if (k === 'start' && o.base === 'Timer' || k === 'Timer') return () => o.set('running', true);
    if (k === 'stop' && o.base === 'Timer') return () => o.set('running', false);
    if (k === 'restart' && o.base === 'Timer') return () => { o.set('running', false); o.set('running', true); };
    if (k === 'itemAt' && o.base === 'Repeater') return i => { const it = (o.items || [])[i]; return it ? it.proxy : null; };
    if (o.base === 'ListModel') {
      const rows = o.rows, bump = () => { o.set('count', rows.length, true); o.set('revision', (o.props.get('revision').value || 0) + 1, true); };
      const plain = x => Object.assign({}, x);
      const f = { append: x => { rows.push(plain(x)); bump(); }, insert: (i, x) => { rows.splice(i, 0, plain(x)); bump(); },
        remove: (i, n = 1) => { rows.splice(i, n); bump(); }, clear: () => { rows.length = 0; bump(); },
        get: i => rows[i] ? Object.assign({}, rows[i]) : undefined, set: (i, x) => { rows[i] = plain(x); bump(); },
        setProperty: (i, k, v) => { if (rows[i]) { rows[i][k] = v; bump(); } }, move: (a, b, n = 1) => { rows.splice(b, 0, ...rows.splice(a, n)); bump(); } };
      if (f[k]) return f[k];
    }
    if (k === 'toString') return () => o.typeName + '(' + (o.id || '') + ')';
    return undefined;
  }
  group(o, g) {
    return new Proxy({}, {
      get: (t, k) => typeof k === 'string' ? o.get(g + '.' + k) : undefined,
      set: (t, k, v) => { this.setMember(o, g + '.' + k, v); return true; }
    });
  }
  setMember(o, k, v) {
    if (!o.props.has(k)) {
      if (o.signals.has(k) || o.methods.has(k)) { this.report(new Error('Cannot assign to "' + k + '": it is a signal or function'), ''); return; }
      this.report(new ReferenceError('Cannot assign to non-existent property "' + k + '"'), ''); return;
    }
    if (v && v.__qtBinding) { const fn = v.__qtBinding; o.bind(k, () => fn(), o.where(k)); return; }
    o.set(k, v && this.proxies.has(v) ? v : v);
  }

  // ---- loading
  load(files, mainName) {
    this.dispose();
    this.files = files; this.docs = {}; this.errors = []; this.logs = [];
    this.mainName = mainName || 'main.qml';
    try {
      for (const [name, src] of Object.entries(files)) {
        if (!name.endsWith('.qml')) continue;
        try { this.docs[name] = parse(src, name); }
        catch (e) { if (e instanceof QmlError) { this.report(Object.assign(e, { line: e.line }), name + ' parse'); this.errors[this.errors.length - 1].file = name; this.errors[this.errors.length - 1].line = e.line; this.errors[this.errors.length - 1].syntax = true; } else throw e; }
      }
      if (this.errors.length) return false;
      const main = this.docs[this.mainName];
      if (!main) { this.report(new Error('No ' + this.mainName + ' file'), ''); return false; }
      this.mainCtx = this.newCtx(main, null);
      this.batch(() => {
        const obj = this.instantiate(main.root, null, this.mainCtx);
        this.root = obj;
        this.finish();
        if (this.container && (obj.base === 'PanelWindow' || !obj.visual)) this.mountShell();
        else if (this.container && obj.visual) this.mount(obj);
      });
    } catch (e) { this.report(e, this.mainName + ' load'); const last = this.errors[this.errors.length - 1]; last.file = this.mainName; if (e.line) last.line = e.line; return false; }
    return this.errors.length === 0;
  }
  newCtx(doc, parentCtx) {
    return { doc, file: doc.file, ids: new Map(), root: null, parentCtx: parentCtx, components: {}, enums: {}, extra: null };
  }
  checkImports(ctx) {
    const d = ctx.doc;
    const OK = ['QtQuick', 'Quickshell', 'Quickshell.Io', 'Quickshell.Wayland'];
    ctx.mods = new Set();
    for (const im of d.imports) {
      if (im.path) continue;
      if (!OK.includes(im.module)) { const e = new QmlError('module "' + im.module + '" is not installed (the sandbox has ' + OK.join(', ') + ')', im.line, d.file); throw e; }
      ctx.mods.add(im.module);
    }
    ctx.hasQtQuick = ctx.mods.has('QtQuick');
  }
  resolveType(name, ctx, line) {
    for (let c = ctx; c; c = c.parentCtx) if (c.components[name]) return { kind: 'inline', def: c.components[name] };
    if (this.docs[name + '.qml'] && /^[A-Z]/.test(name)) {
      if ((this.docs[name + '.qml'].pragmas || []).includes('Singleton')) throw new QmlError(name + ' is a singleton: use it by name (' + name + '.property), do not create it with ' + name + ' { }', line, ctx.file);
      return { kind: 'file', doc: this.docs[name + '.qml'] };
    }
    if (KNOWN_UNSUPPORTED[name]) throw new QmlError(KNOWN_UNSUPPORTED[name], line, ctx.file);
    if (T[name]) {
      let c = ctx; while (c.parentCtx) c = c.parentCtx;
      if (ctx.hasQtQuick === undefined) this.checkImports(ctx);
      if (!ctx.mods) ctx.mods = new Set(ctx.hasQtQuick ? ['QtQuick'] : []);
      const mod = T[name].module || 'QtQuick';
      if (!ctx.mods.has(mod)) throw new QmlError(name + ' is not a type (did you forget "import ' + mod + '"?)', line, ctx.file);
      return { kind: 'builtin' };
    }
    throw new QmlError(name + ' is not a type', line, ctx.file);
  }

  // ---- instantiation
  instantiate(node, parent, ctx) {
    if (ctx.hasQtQuick === undefined) this.checkImports(ctx);
    const r = this.resolveType(node.type, ctx, node.line);
    let obj;
    if (r.kind === 'builtin') {
      obj = new QObj(this, node.type, ctx);
      if (!ctx.root) ctx.root = obj;
      this.all.push(obj);
      this.initBuiltin(obj);
      if (parent) this.attach(obj, parent, node);
      this.apply(obj, node, ctx);
    } else {
      const cdoc = r.kind === 'file' ? r.doc : r.def.doc;
      const cnode = r.kind === 'file' ? r.doc.root : r.def.node;
      const cctx = this.newCtx(cdoc, r.kind === 'inline' ? r.def.ctx : null);
      cctx.hasQtQuick = undefined;
      if (r.kind === 'inline') { cctx.hasQtQuick = r.def.ctx.hasQtQuick; cctx.mods = r.def.ctx.mods; cctx.components = r.def.ctx.components; }
      obj = this.instantiate(cnode, parent, cctx);          // the component's own tree (applies its members)
      obj.chainNames = obj.chainNames.concat([node.type]);
      obj.typeName = node.type;
      this.apply(obj, node, ctx, true);                      // the instance's overrides, in the OUTER scope
    }
    return obj;
  }
  initBuiltin(o) {
    const b = o.base;
    if (o.visual) {
      // width/height default to implicit size
      for (const [p, ip] of [['width', 'implicitWidth'], ['height', 'implicitHeight']]) o.bind(p, () => o.get(ip), o.where(p));
      this.setupItem(o);
    }
    if (b === 'Timer') this.setupTimer(o);
    if (b === 'Repeater') this.setupRepeater(o);
    if (b === 'ListModel') o.rows = [];
    if (b === 'PanelWindow') this.setupPanel(o);
    if (b === 'Variants') this.setupRepeater(o);
    if (b === 'LazyLoader') this.setupLazy(o);
    if (b === 'Process') this.setupProcess(o);
    if (b === 'SystemClock') this.setupClock(o);
    if (b === 'IpcHandler') {
      let cur = '';
      const c = new Comp(this, () => o.get('target'), tg => { if (cur && this.ipc[cur] === o) delete this.ipc[cur]; cur = tg; if (tg) this.ipc[tg] = o; }, o.where('target'));
      o.cleanups.push(() => c.dispose()); this.pending.push(() => this.run(c));
    }
    if (b === 'ListView') this.setupListView(o);
    if (b === 'Connections') this.setupConnections(o);
    if (b === 'Row' || b === 'Column' || b === 'Grid') this.setupPositioner(o);
  }
  attach(obj, parent, node) {
    if (obj.visual && parent.visual) { obj.set('parent', parent.proxy); }
    else if (!parent.visual && obj.visual && parent.base !== 'QtObject') { /* e.g. inside Component: handled by caller */ }
    else if (!obj.visual) { obj.nonVisualParent = parent; }
  }
  // apply the members of a node onto obj. `ctx` = scope the expressions live in.
  apply(obj, node, ctx, isInstance) {
    const rt = this;
    for (const m of node.members) {
      const where = ctx.file + ' ' + node.type + '.' + (m.name || m.kind);
      const loc = (e) => { if (e && !e.line) e.line = m.line; return e; };
      try {
        switch (m.kind) {
          case 'id': ctx.ids.set(m.value, obj); obj.id = m.value; break;
          case 'decl': this.declare(obj, m, ctx); break;
          case 'signal': obj.signals.set(m.name, { params: m.params, handlers: [] }); break;
          case 'func':
            if (obj.base === 'Connections' && /^on[A-Z]/.test(m.name)) { obj.connHandlers = (obj.connHandlers || []).concat([{ sn: camel(m.name.slice(2)), m: { expr: m.body, line: m.line }, ctx, where: ctx.file + ' Connections.' + m.name, params: m.params }]); if (obj.reconnect) obj.reconnect(); }
            else this.defMethod(obj, m, ctx);
            break;
          case 'component': ctx.components[m.name] = { doc: ctx.doc, node: m.node, ctx }; break;
          case 'enum': ctx.enums[m.name] = Object.freeze(Object.assign({}, m.values)); break;
          case 'bind': this.pending.push(() => this.applyBind(obj, m, ctx, node)); break;
          case 'objval':
            if (m.name === 'transitions') { obj.transitionNodes = [m.node]; obj.transitionCtx = ctx; }
            else if (m.name === 'states') this.pending.push(() => this.setupStates(obj, [m.node], ctx));
            else this.pending.push(() => this.applyObjVal(obj, m, ctx));
            break;
          case 'objlist':
            if (m.name === 'states') this.pending.push(() => this.setupStates(obj, m.nodes, ctx));
            else if (m.name === 'transitions') obj.transitionNodes = m.nodes, obj.transitionCtx = ctx;
            else this.pending.push(() => { for (const nn of m.nodes) this.addChildNode(obj, nn, ctx, m); });
            break;
          case 'child': this.addChildNode(obj, m.node, ctx, m); break;
        }
      } catch (e) { if (e instanceof QmlError) { if (!e.line) e.line = m.line; throw e; } throw Object.assign(e, { line: m.line }); }
    }
    if (!isInstance && obj.visual) this.pending.push(() => this.installAnchors(obj));
    else if (isInstance && obj.visual) this.pending.push(() => this.installAnchors(obj));
  }
  addChildNode(parentObj, nn, ctx, m) {
    if (nn.onProp) {                        // Behavior on x { NumberAnimation { duration: 200 } }
      if (nn.type !== 'Behavior') throw new QmlError('"' + nn.type + ' on ' + nn.onProp + '" is not supported in the sandbox', nn.line, ctx.file);
      const anim = nn.members.find(x => x.kind === 'child');
      let dur = 250;
      const dm = anim && anim.node.members.find(x => x.kind === 'bind' && x.name === 'duration');
      if (dm) dur = Number(dm.expr) || 250;
      parentObj.behaviors[nn.onProp] = dur; if (parentObj.syncDom) parentObj.syncDom();
      return;
    }
    if (parentObj.base === 'ListModel') {
      if (nn.type !== 'ListElement') throw new QmlError('ListModel can only contain ListElement, not ' + nn.type, nn.line, ctx.file);
      const row = {}, sc = this.scopeFor(parentObj, ctx);
      for (const m of nn.members) {
        if (m.kind !== 'bind') throw new QmlError('ListElement only takes "name: value" lines', m.line || nn.line, ctx.file);
        row[m.name] = this.compile('expr', m.expr)(sc);
      }
      parentObj.rows.push(row); parentObj.set('count', parentObj.rows.length, true);
      return;
    }
    if (parentObj.base === 'Repeater' || parentObj.base === 'ListView' || parentObj.base === 'Variants' || parentObj.base === 'LazyLoader') { if (nn.type === 'Component') { const inner = nn.members.find(x => x.kind === 'child'); parentObj.componentDef = { node: inner.node, ctx }; } else parentObj.componentDef = { node: nn, ctx }; return; }
    if (nn.type === 'Component') {
      const inner = nn.members.find(x => x.kind === 'child');
      if (!inner) throw new QmlError('Component needs one child object', nn.line, ctx.file);
      parentObj.componentDef = { node: inner.node, ctx }; return;
    }
    if (!parentObj.visual && !['QtObject', 'Timer', 'Connections', 'ShellRoot', 'Singleton', 'Process', 'IpcHandler', 'SystemClock'].includes(parentObj.base))
      throw new QmlError('Cannot assign to non-existent default property', nn.line, ctx.file);
    const child = this.instantiate(nn, parentObj.visual ? parentObj : null, ctx);
    child.nonVisualParent = parentObj;
    if (!child.visual && parentObj.visual) { parentObj.nvChildren = (parentObj.nvChildren || []).concat([child]); }
    return child;
  }
  declare(obj, m, ctx) {
    if (m.alias) { obj.define(m.name, 'var', undefined).alias = { pending: true }; return; }
    const defv = { int: 0, real: 0, bool: false, string: '', color: 'black', var: undefined, url: '', list: [], double: 0, variant: undefined }[m.ptype];
    const p = obj.define(m.name, m.ptype, defv === undefined && m.ptype !== 'var' ? null : defv);
    p.readonly = !!m.readonly;
    if (m.readonly) p.readonlyDecl = true;
  }
  defMethod(obj, m, ctx) {
    const f = this.compile('func', m.body, m.params.join(','));
    let compiled = null;
    obj.methods.set(m.name, (...a) => {
      if (!compiled) compiled = f(this.scopeFor(obj, ctx));
      return this.batchRet(() => compiled(...a));   // reads inside a function called from a binding are tracked (as in real QML)
    });
  }
  batchRet(fn) { this.depth++; let r; try { r = fn(); } finally { this.depth--; } if (this.depth === 0) this.flush(); return r; }
  applyObjVal(obj, m, ctx) {
    const nn = m.node;
    if (nn.onProp) { this.addChildNode(obj, nn, ctx, m); return; }
    if (nn.type === 'Component') {
      const inner = nn.members.find(x => x.kind === 'child');
      if (!inner) throw new QmlError('Component needs one child object', nn.line, ctx.file);
      this.setValue(obj, m.name, { __component: { node: inner.node, ctx } }, m);
      return;
    }
    if (obj.props.has(m.name) && obj.props.get(m.name).type === 'Component') { this.setValue(obj, m.name, { __component: { node: nn, ctx } }, m); return; }
    const child = this.instantiate(nn, null, ctx);
    this.setValue(obj, m.name, child.proxy, m);
  }
  setValue(obj, name, v, m) {
    const p = obj.props.get(name);
    if (!p) throw new QmlError('Cannot assign to non-existent property "' + name + '"', m && m.line, obj.ctx.file);
    obj.set(name, v);
  }
  applyBind(obj, m, ctx, node) {
    const name = m.name, rt = this;
    const where = ctx.file + ' ' + node.type + '.' + name;
    const handlerLike = /^on[A-Z]/.test(name) || /\.on[A-Z]/.test(name);
    if (handlerLike) { this.connectHandler(obj, m, ctx, where); return; }
    if (/^WlrLayershell\./.test(name)) {
      if (!(ctx.mods && ctx.mods.has('Quickshell.Wayland'))) throw new QmlError('WlrLayershell is not a type (did you forget "import Quickshell.Wayland"?)', m.line, ctx.file);
      obj.attached = obj.attached || {};
      obj.attached[name.slice(14)] = this.compile('expr', m.expr)(this.scopeFor(obj, ctx));
      return;
    }
    if (/^[A-Z][A-Za-z]*\.[a-z]/.test(name)) return;                    // attached properties (Layout.fillWidth ...): ignored
    if (!obj.props.has(name)) {
      throw Object.assign(new QmlError('Cannot assign to non-existent property "' + name + '"', m.line, ctx.file), {});
    }
    const p = obj.props.get(name);
    if (p.alias && p.alias.pending) { this.resolveAlias(obj, p, m, ctx); return; }
    if (p.readonly && !p.readonlyDecl) throw new QmlError('Cannot assign to read-only property "' + name + '"', m.line, ctx.file);
    const scope = this.scopeFor(obj, ctx);
    const kind = m.block ? 'block' : 'expr';
    const fn = this.compile(kind, m.expr);
    const line = m.line;
    const comp = () => { try { return fn(scope); } catch (e) { e.line = line; throw e; } };
    const prevRO = this.allowReadonly; this.allowReadonly = true;
    try { obj.bind(name, () => { const v = comp(); return (v && v.__qtBinding) ? v.__qtBinding() : unwrapVal(v); }, where); } finally { this.allowReadonly = prevRO; }
  }
  resolveAlias(obj, p, m, ctx) {
    const path = m.expr.trim().split('.');
    const target = ctx.ids.get(path[0]);
    if (!target) throw new QmlError('Invalid alias reference. Unable to find id "' + path[0] + '"', m.line, ctx.file);
    if (path.length === 1) { p.alias = { read: () => target.proxy, write: () => {} }; return; }
    const pn = path.slice(1).join('.');
    if (!target.props.has(pn)) throw new QmlError('Invalid alias target: ' + path[0] + ' has no property "' + pn + '"', m.line, ctx.file);
    p.alias = { read: () => target.get(pn), write: v => target.set(pn, v) };
    const tp = target.props.get(pn);
    // forward change notifications: subscribers of the alias also subscribe to the target
    const orig = p.alias.read; p.alias.read = () => { if (this.cur) this.cur.deps.add(tp); return tp.value; };
    obj.onChangedForward = obj.onChangedForward || [];
    obj.onChanged(m.name, () => {});
    tp.aliasHandlers = (tp.aliasHandlers || []).concat([() => { const hs = obj.changed.get(m.name); if (hs) for (const h of hs) this.runHandler(h); }]);
    const prevOnSet = tp.onSet; tp.onSet = v => { if (prevOnSet) prevOnSet(v); for (const f of tp.aliasHandlers) f(); };
  }
  connectHandler(obj, m, ctx, where) {
    const name = m.name;
    let sig = name, target = obj;
    if (name === 'Component.onCompleted') { this.completed.push({ obj, m, ctx, where }); return; }
    if (name === 'Component.onDestruction') return;
    const short = name.replace(/^.*\./, '');
    const mk = (tobj, sname, isChange, propName, ownerObj) => {
      const line = m.line;
      let fnc = null;
      const h = (args, params) => {
        const extra = {}; (params || []).forEach((pn, i) => extra[pn] = unwrapVal(args[i]));
        if (m.block || /[;{]/.test(m.expr) || !/^[\w$.\[\]()'"`+\-*/%<>=!&|?:, ]+$/.test(m.expr)) { /* statements */ }
        const scope = this.scopeFor(ownerObj, ctx, extra);
        try {
          if (/^\s*(\([^)]*\)|\w+)\s*=>/.test(m.expr)) { const f = this.compile('expr', m.expr)(scope); if (typeof f === 'function') f(...args); }
          else { const fn = this.compile('stmt', m.expr); fn(scope); }
        } catch (e) { e.line = line; throw e; }
      };
      h.where = where;
      if (isChange) tobj.onChanged(propName, h); else tobj.signals.get(sname).handlers.push(h);
    };
    const sn = camel(short.slice(2));
    if (obj.base === 'Connections') {            // handlers act on the (dynamic) target
      obj.connHandlers = (obj.connHandlers || []).concat([{ sn, m, ctx, where }]); if (obj.reconnect) obj.reconnect(); return;
    }
    if (obj.signals.has(sn)) { mk(obj, sn, false, null, obj); return; }
    if (/Changed$/.test(sn) && obj.props.has(sn.slice(0, -7))) { mk(obj, sn, true, sn.slice(0, -7), obj); return; }
    // allow onXxxChanged for dotted props: onWidthChanged on a property we know
    throw new QmlError('Cannot assign to non-existent property "' + name + '"', m.line, ctx.file);
  }
  finish() {
    // run deferred member application until nothing is queued (children may queue more)
    let guard = 0;
    while (this.pending.length) {
      const f = this.pending.shift();
      f();
      if (++guard > 100000) throw new Error('Too many objects');
    }
    const done = this.completed.splice(0).reverse();
    for (const c of done) {
      const h = (args) => { const scope = this.scopeFor(c.obj, c.ctx); const fn = this.compile('stmt', c.m.expr); try { fn(scope); } catch (e) { e.line = c.m.line; throw e; } };
      h.where = c.where; this.runHandler(h);
    }
  }
  destroyObj(o) {
    if (o.destroyed) return;
    if (o.visual) for (const c of [...(o.get('children') || [])]) { const co = this.unwrap(c); if (co && co !== o) this.destroyObj(co); }
    if (o.visual) { const p = this.unwrap(o.get('parent')); if (p) p.set('children', p.get('children').filter(c => c !== o.proxy)); if (o.el && o.el.parentNode) o.el.parentNode.removeChild(o.el); }
    for (const p of o.props.values()) if (p.comp) p.comp.dispose();
    for (const f of o.cleanups) f();
    o.destroyed = true;
  }
  dispose() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    for (const o of this.all) { for (const p of o.props.values()) if (p.comp) p.comp.dispose(); for (const f of o.cleanups) f(); }
    this.all = []; this.oneShots = []; this.singletons = {}; this.ipc = {}; this.detached = []; this.desktops = null; this.timers.clear(); this.queue = []; this.pending = []; this.completed = [];
    if (this.container) this.container.innerHTML = '';
    this.root = null; this.now = 0;
  }
  // wrapper for deferred creation (repeater delegates etc.)
  create(def, parentObj, extra, indexInfo) {
    const ctx = { doc: def.ctx.doc, file: def.ctx.file, ids: new Map(), root: null, parentCtx: def.ctx, components: {}, enums: {}, extra: extra, hasQtQuick: def.ctx.hasQtQuick, mods: def.ctx.mods };
    let obj;
    this.batch(() => { obj = this.instantiate(def.node, parentObj, ctx); this.finish(); });
    return obj;
  }

  // rows of a model: number, JS array or ListModel (reading it inside a binding tracks changes)
  modelRows(m) {
    if (typeof m === 'number') return Array.from({ length: Math.max(0, Math.floor(m)) }, (_, i) => i);
    if (Array.isArray(m)) return m;
    const lm = this.unwrap(m);
    if (lm && lm.base === 'ListModel') { lm.get('revision'); return lm.rows.map(r => Object.assign({}, r)); }
    return [];
  }
  // ---- items: geometry + DOM
  setupItem(o) {
    const rt = this;
    o.el = document.createElement('div');
    o.el.className = 'q-item q-' + o.base;
    o.el.style.position = 'absolute';
    o.el.style.boxSizing = 'border-box';
    // parent <-> children bookkeeping
    o.props.get('parent').onSet = (pv) => {
      const np = rt.unwrap(pv);
      if (o.curParent && o.curParent !== np) o.curParent.set('children', o.curParent.get('children').filter(c => c !== o.proxy));
      o.curParent = np;
      if (np) { np.set('children', np.get('children').concat([o.proxy])); np.el.appendChild(o.el); }
      else if (o.el.parentNode) o.el.parentNode.removeChild(o.el);
    };
    const css = () => {
      const g = n => o.get(n);
      const s = o.el.style;
      const vis = g('visible') !== false;
      s.display = vis ? '' : 'none';
      s.left = (g('x') || 0) + 'px'; s.top = (g('y') || 0) + 'px';
      s.width = (g('width') || 0) + 'px'; s.height = (g('height') || 0) + 'px';
      s.opacity = g('opacity'); s.zIndex = g('z') || 0;
      s.overflow = g('clip') ? 'hidden' : '';
      const rot = g('rotation') || 0, sc = g('scale'); s.transform = (rot || sc !== 1) ? 'rotate(' + rot + 'deg) scale(' + sc + ')' : '';
      if (o.base === 'Rectangle' || o.base === 'Window' || o.base === 'PanelWindow') {
        s.backgroundColor = cssColor(g('color'));
        if (o.base === 'Rectangle') { s.borderRadius = (g('radius') || 0) + 'px'; const bw = g('border.width') || 0; s.border = bw ? bw + 'px solid ' + cssColor(g('border.color')) : 'none'; }
      }
      if (o.base === 'MouseArea') s.cursor = g('cursorShape') === 13 ? 'pointer' : '';
      const tr = [];
      const map = { x: 'left', y: 'top', width: 'width', height: 'height', opacity: 'opacity', color: o.base === 'Text' ? 'color' : 'background-color', rotation: 'transform', scale: 'transform', radius: 'border-radius' };
      for (const [k, d] of Object.entries(o.behaviors)) if (map[k]) tr.push(map[k] + ' ' + d + 'ms');
      s.transition = tr.join(',');
      return null;
    };
    o.syncDom = () => rt.run(new Comp(rt, css, () => {}, o.where('visual')));
    const c = new Comp(rt, css, () => {}, o.where('visual')); o.cleanups.push(() => c.dispose()); rt.run(c);
    if (o.base === 'Text') this.setupText(o);
    if (o.base === 'MouseArea') this.setupMouse(o);
  }
  setupText(o) {
    const rt = this;
    const span = document.createElement('span'); span.className = 'q-text'; o.el.appendChild(span);
    o.el.style.display = 'flex';
    const c = new Comp(rt, () => {
      const g = n => o.get(n);
      const wrap = g('wrapMode') !== 0;
      span.textContent = g('text');
      const s = span.style;
      s.fontSize = (g('font.pixelSize') || 14) + 'px'; s.fontWeight = g('font.bold') ? '700' : '400'; s.fontStyle = g('font.italic') ? 'italic' : 'normal';
      s.fontFamily = g('font.family') || ''; s.color = cssColor(g('color'));
      s.whiteSpace = wrap ? 'pre-wrap' : 'pre'; s.display = 'block'; s.overflow = 'hidden';
      s.textOverflow = g('elide') === 2 ? 'ellipsis' : '';
      const ha = g('horizontalAlignment'), va = g('verticalAlignment');
      s.textAlign = ha === 2 ? 'right' : ha === 4 ? 'center' : 'left';
      o.el.style.alignItems = va === 64 ? 'flex-end' : va === 128 ? 'center' : 'flex-start';
      s.width = '100%'; s.wordBreak = g('wrapMode') === 2 ? 'break-all' : '';
      // measure natural size
      s.width = wrap ? Math.max(0, g('width') || 0) + 'px' : 'auto'; s.position = 'absolute'; s.visibility = 'hidden'; s.maxWidth = 'none';
      if (!wrap) { s.overflow = 'visible'; }
      const w = span.offsetWidth, h = span.offsetHeight;
      s.position = ''; s.visibility = ''; s.width = '100%'; s.overflow = 'hidden';
      return [w, wrap && !(g('width') > 0) ? h : h];
    }, v => { o.set('implicitWidth', v[0], true); o.set('implicitHeight', v[1], true); o.set('contentWidth', v[0], true); o.set('contentHeight', v[1], true); }, o.where('text'));
    o.cleanups.push(() => c.dispose()); rt.run(c);
  }
  setupMouse(o) {
    const rt = this;
    const rel = e => { const r = o.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pos = (x, y) => { o.set('mouseX', x); o.set('mouseY', y); };
    const mouseObj = (x, y) => ({ x, y, accepted: true, button: 1 });
    o.sim = {
      press: (x, y) => { if (!o.get('enabled') ) return; rt.batch(() => { pos(x, y); o.set('pressed', true); o.emit('pressed', mouseObj(x, y)); }); },
      release: (x, y, inside = true) => { rt.batch(() => { pos(x, y); const was = o.get('pressed'); o.set('pressed', false); o.emit('released', mouseObj(x, y)); if (was && inside) o.emit('clicked', mouseObj(x, y)); }); },
      enter: () => { if (o.get('hoverEnabled') || o.get('pressed')) rt.batch(() => { o.set('containsMouse', true); o.emit('entered'); }); },
      leave: () => { if (o.get('containsMouse')) rt.batch(() => { o.set('containsMouse', false); o.emit('exited'); }); }
    };
    const el = o.el; el.style.pointerEvents = 'auto';
    el.addEventListener('mousedown', e => { const [x, y] = rel(e); o.sim.press(x, y); });
    el.addEventListener('mouseup', e => { const [x, y] = rel(e); o.sim.release(x, y); });
    el.addEventListener('mouseenter', () => o.sim.enter());
    el.addEventListener('mouseleave', () => o.sim.leave());
    el.addEventListener('dblclick', e => { const [x, y] = rel(e); o.emit('doubleClicked', mouseObj(x, y)); });
    el.addEventListener('mousemove', e => { if (o.get('hoverEnabled') || o.get('pressed')) { const [x, y] = rel(e); pos(x, y); } });
  }
  // anchors: replace the default x/y/width/height bindings by anchor-aware ones
  installAnchors(o) {
    const rt = this;
    const has = k => { const p = o.props.get('anchors.' + k); return p && p.value !== null && p.value !== undefined; };
    const anyAnchor = ANCHORS.some(a => !/Margin|margins|Offset/.test(a) && has(a));
    if (!anyAnchor || o.anchorsInstalled || o.base === 'PanelWindow') return;
    o.anchorsInstalled = true;
    const val = k => o.get('anchors.' + k);
    const line = (v, axis) => {
      if (!v || !v.__line) return null;
      const t = v.item, par = rt.unwrap(o.get('parent'));
      if (t === par) return t.lineCoord(v.edge);
      const x = t.get('x') || 0, y = t.get('y') || 0, w = t.get('width') || 0, h = t.get('height') || 0;
      return { left: x, right: x + w, top: y, bottom: y + h, horizontalCenter: x + w / 2, verticalCenter: y + h / 2 }[v.edge];
    };
    const target = k => rt.unwrap(val(k));
    const m = k => { const s = val(k); return s !== null && s !== undefined && !(s && s.__line) ? s : (val('margins') || 0); };
    const horiz = () => {
      const f = target('fill'), c = target('centerIn');
      const par = rt.unwrap(o.get('parent'));
      if (f || c) {
        const t = f || c;
        const base = t === par ? { l: 0, t: 0, w: t.get('width') || 0, h: t.get('height') || 0 } : { l: t.get('x') || 0, t: t.get('y') || 0, w: t.get('width') || 0, h: t.get('height') || 0 };
        return { f, c, base };
      }
      return null;
    };
    const X = () => {
      const fc = horiz();
      if (fc && fc.f) return fc.base.l + m('leftMargin');
      if (fc && fc.c) return fc.base.l + fc.base.w / 2 - (o.get('width') || 0) / 2 + (val('horizontalCenterOffset') || 0);
      const L = line(val('left')), R = line(val('right')), H = line(val('horizontalCenter'));
      if (L !== null) return L + m('leftMargin');
      if (R !== null) return R - m('rightMargin') - (o.get('width') || 0);
      if (H !== null) return H - (o.get('width') || 0) / 2 + (val('horizontalCenterOffset') || 0);
      return rt.userVal(o, 'x');
    };
    const Y = () => {
      const fc = horiz();
      if (fc && fc.f) return fc.base.t + m('topMargin');
      if (fc && fc.c) return fc.base.t + fc.base.h / 2 - (o.get('height') || 0) / 2 + (val('verticalCenterOffset') || 0);
      const T_ = line(val('top')), B = line(val('bottom')), V = line(val('verticalCenter'));
      if (T_ !== null) return T_ + m('topMargin');
      if (B !== null) return B - m('bottomMargin') - (o.get('height') || 0);
      if (V !== null) return V - (o.get('height') || 0) / 2 + (val('verticalCenterOffset') || 0);
      return rt.userVal(o, 'y');
    };
    const W = () => {
      const fc = horiz();
      if (fc && fc.f) return Math.max(0, fc.base.w - m('leftMargin') - m('rightMargin'));
      const L = line(val('left')), R = line(val('right'));
      if (L !== null && R !== null) return Math.max(0, R - L - m('leftMargin') - m('rightMargin'));
      return rt.userVal(o, 'width');
    };
    const H = () => {
      const fc = horiz();
      if (fc && fc.f) return Math.max(0, fc.base.h - m('topMargin') - m('bottomMargin'));
      const T_ = line(val('top')), B = line(val('bottom'));
      if (T_ !== null && B !== null) return Math.max(0, B - T_ - m('topMargin') - m('bottomMargin'));
      return rt.userVal(o, 'height');
    };
    for (const [n, f] of [['width', W], ['height', H], ['x', X], ['y', Y]]) {
      const p = o.props.get(n);
      o.userComp = o.userComp || {};
      o.userComp[n] = p.comp;                      // keep the user's own binding to read from
      o.userVal0 = o.userVal0 || {};
      o.userVal0[n] = p.comp ? null : p.value;
      if (p.comp) p.comp.apply = () => {};           // stop it writing; we read its result instead
      const c = new Comp(rt, f, v => o.set(n, v, true), o.where('anchors'));
      o.cleanups.push(() => c.dispose());
      p.anchorComp = c; rt.run(c);
    }
  }
  userVal(o, n) {                                    // value of x/y/width/height as the user wrote it
    const uc = o.userComp && o.userComp[n];
    if (uc) { try { return uc.fn(); } catch (e) { return 0; } }
    const base = o.userVal0 && o.userVal0[n];
    if (base !== null && base !== undefined) return base;
    return n === 'width' ? o.get('implicitWidth') : n === 'height' ? o.get('implicitHeight') : 0;
  }
  setupPositioner(o) {
    const rt = this;
    const c = new Comp(rt, () => {
      const kids = o.get('children').map(k => rt.unwrap(k)).filter(k => k && k.base !== 'Repeater' && k.get('visible') !== false);
      const sp = o.get('spacing') || 0, pad = o.get('padding') || 0;
      const res = { pos: [], w: 0, h: 0 };
      if (o.base === 'Row') {
        let x = pad, h = 0;
        for (const k of kids) { res.pos.push([k, x, pad]); x += (k.get('width') || 0) + sp; h = Math.max(h, k.get('height') || 0); }
        res.w = kids.length ? x - sp + pad : pad * 2; res.h = h + pad * 2;
      } else if (o.base === 'Column') {
        let y = pad, w = 0;
        for (const k of kids) { res.pos.push([k, pad, y]); y += (k.get('height') || 0) + sp; w = Math.max(w, k.get('width') || 0); }
        res.h = kids.length ? y - sp + pad : pad * 2; res.w = w + pad * 2;
      } else {
        const cols = Math.max(1, o.get('columns') || 1);
        const rs = o.get('rowSpacing') >= 0 ? o.get('rowSpacing') : sp, cs = o.get('columnSpacing') >= 0 ? o.get('columnSpacing') : sp;
        const colW = [], rowH = [];
        kids.forEach((k, i) => { const cI = i % cols, rI = Math.floor(i / cols); colW[cI] = Math.max(colW[cI] || 0, k.get('width') || 0); rowH[rI] = Math.max(rowH[rI] || 0, k.get('height') || 0); });
        kids.forEach((k, i) => { const cI = i % cols, rI = Math.floor(i / cols); let x = pad, y = pad; for (let a = 0; a < cI; a++) x += colW[a] + cs; for (let b = 0; b < rI; b++) y += rowH[b] + rs; res.pos.push([k, x, y]); });
        res.w = colW.reduce((a, b) => a + b, 0) + cs * Math.max(0, colW.length - 1) + pad * 2;
        res.h = rowH.reduce((a, b) => a + b, 0) + rs * Math.max(0, rowH.length - 1) + pad * 2;
      }
      return res;
    }, res => {
      o.set('implicitWidth', res.w, true); o.set('implicitHeight', res.h, true);
      rt.batch(() => { for (const [k, x, y] of res.pos) { const px = k.props.get('x'), py = k.props.get('y'); if (!(k.anchorsInstalled)) { px.comp && px.comp.dispose(); py.comp && py.comp.dispose(); px.comp = py.comp = null; k.set('x', x, true); k.set('y', y, true); } } });
    }, o.where('layout'));
    o.cleanups.push(() => c.dispose()); rt.run(c);
  }
  // ---- states: State { name; when; PropertyChanges { target; prop: value } } -------------
  // Entering a state binds the listed properties; leaving restores the old binding/value.
  // A Transition's animations become CSS transitions on the properties a state changes.
  setupStates(o, nodes, ctx) {
    const rt = this, scope = this.scopeFor(o, ctx);
    const ev = src => rt.compile('expr', src)(scope);
    const getm = (n, k) => { const m = n.members.find(x => x.kind === 'bind' && x.name === k); return m ? m.expr : null; };
    const defs = nodes.map(n => {
      if (n.type !== 'State') throw new QmlError('"states" can only contain State objects, not ' + n.type, n.line, ctx.file);
      const ne = getm(n, 'name');
      if (ne === null) throw new QmlError('A State needs a name', n.line, ctx.file);
      return { name: String(ev(ne)), whenExpr: getm(n, 'when'), line: n.line, changes: n.members.filter(x => x.kind === 'child' && x.node.type === 'PropertyChanges').map(x => x.node) };
    });
    const specs = [];
    const collect = n => { for (const m of n.members) if (m.kind === 'child') { const t = m.node.type;
      if (/Animation$/.test(t) && t !== 'ParallelAnimation' && t !== 'SequentialAnimation') { const pe = getm(m.node, 'properties') || getm(m.node, 'property'); const de = getm(m.node, 'duration');
        specs.push({ props: pe ? String(ev(pe)).split(',').map(s => s.trim()) : null, dur: de ? Number(de) || 250 : 250 }); }
      else collect(m.node); } };
    for (const tn of (o.transitionNodes || [])) collect(tn);
    let undo = [];
    const revert = () => {
      for (const u of undo.reverse()) { if (u.binding) u.obj.bind(u.prop, u.binding.fn, u.binding.where); else u.obj.set(u.prop, u.value); }
      undo = [];
    };
    const enter = name => {
      revert();
      const d = defs.find(x => x.name === name);
      if (!d) { if (name !== '') throw new QmlError('Unknown state "' + name + '"', 0, ctx.file); return; }
      for (const ch of d.changes) {
        const tm = getm(ch, 'target');
        const target = tm ? rt.unwrap(ev(tm)) : null;
        if (!target) throw new QmlError('PropertyChanges needs a valid target (an item id)', ch.line, ctx.file);
        for (const m of ch.members) {
          if (m.kind !== 'bind' || m.name === 'target' || m.name === 'restoreEntryValues' || m.name === 'explicit') continue;
          const p = target.props.get(m.name);
          if (!p) throw new QmlError('Cannot assign to non-existent property "' + m.name + '"', m.line, ctx.file);
          undo.push({ obj: target, prop: m.name, binding: p.binding, value: p.value });
          const fn = rt.compile(m.block ? 'block' : 'expr', m.expr);
          const sc = rt.scopeFor(o, ctx);
          target.bind(m.name, () => fn(sc), ctx.file + ' PropertyChanges.' + m.name);
          for (const s of specs) if (!s.props || s.props.includes(m.name)) { target.behaviors[m.name] = s.dur; }
          if (target.syncDom) target.syncDom();
        }
      }
    };
    const h = () => enter(o.get('state')); h.where = o.where('state');
    o.onChanged('state', h);
    const whens = defs.filter(d => d.whenExpr).map(d => [d, rt.compile('expr', d.whenExpr)]);
    if (whens.length) {
      const c = new Comp(rt, () => { for (const [d, f] of whens) if (f(scope)) return d.name; return ''; }, v => o.set('state', v, true), o.where('state'));
      o.cleanups.push(() => c.dispose()); rt.run(c);
    }
    if (o.get('state') !== '') rt.runHandler(h);
  }
  setupListView(o) {
    const rt = this;
    o.items = []; o.el.style.overflow = 'hidden';
    const lay = new Comp(rt, () => {
      const vert = o.get('orientation') !== 0, sp = o.get('spacing') || 0, cy = o.get('contentY') || 0, cx = o.get('contentX') || 0;
      let pos = 0; const res = [];
      for (const it of o.items) { const w = it.get('width') || 0, h = it.get('height') || 0; res.push([it, vert ? 0 : pos - cx, vert ? pos - cy : 0]); pos += (vert ? h : w) + sp; }
      return { res, vert, total: Math.max(0, pos - sp) };
    }, ({ res, vert, total }) => {
      for (const [it, x, y] of res) for (const [n, v] of [['x', x], ['y', y]]) { const p = it.props.get(n); if (p.comp) { p.comp.dispose(); p.comp = null; } it.set(n, v, true); }
      o.set(vert ? 'contentHeight' : 'contentWidth', total, true);
    }, o.where('layout'));
    o.cleanups.push(() => lay.dispose());
    const c = new Comp(rt, () => { const m = o.get('model'), d = o.get('delegate'); rt.modelRows(m); o.get('currentIndex'); return [m, d]; }, ([m, d]) => {
      for (const it of o.items) rt.destroyObj(it);
      o.items = [];
      const def = d && d.__component ? d.__component : o.componentDef;
      if (!def) { o.set('count', 0, true); return; }
      const list = rt.modelRows(m), cur = o.get('currentIndex');
      list.forEach((md, index) => {
        const extra = { index, modelData: md, ListView: { isCurrentItem: index === cur, view: o.proxy, Horizontal: 0, Vertical: 1 } };
        if (md && typeof md === 'object' && !Array.isArray(md)) { Object.assign(extra, md); extra.model = Object.assign({ index }, md); }
        o.items.push(rt.create(def, o, extra));
      });
      o.set('count', list.length, true);
      rt.run(lay);
    }, o.where('listview'));
    o.cleanups.push(() => c.dispose());
    o.el.addEventListener('wheel', e => {
      e.preventDefault();
      const vert = o.get('orientation') !== 0, tot = o.get(vert ? 'contentHeight' : 'contentWidth'), view = o.get(vert ? 'height' : 'width');
      const k = vert ? 'contentY' : 'contentX';
      o.set(k, Math.max(0, Math.min(Math.max(0, tot - view), (o.get(k) || 0) + (vert ? e.deltaY : e.deltaX))));
    }, { passive: false });
    this.pending.push(() => rt.run(c));
  }
  // ---- Quickshell stubs ----------------------------------------------------------
  get quickshell() {
    return this._qs || (this._qs = {
      screens: this.screens, shellDir: '/home/jano/.config/quickshell/shell',
      env: n => ({ HOME: '/home/jano', USER: 'jano', XDG_SESSION_TYPE: 'wayland' })[n],
      execDetached: cmd => { this.detached.push(cmd); this.log('execDetached: ' + (Array.isArray(cmd) ? cmd.join(' ') : String(cmd))); }
    });
  }
  getSingleton(name) {
    if (this.singletons[name]) return this.singletons[name];
    const doc = this.docs[name + '.qml'], ctx = this.newCtx(doc, null);
    const base = this.pending.length;
    let obj; this.batch(() => { obj = this.instantiate(doc.root, null, ctx); });
    this.singletons[name] = obj;
    // finish only the work this singleton queued (not the caller's), so its bindings are ready before the first read
    while (this.pending.length > base) { const f = this.pending.splice(base, 1)[0]; f(); }
    return obj;
  }
  desktopFor(screen) {
    if (!this.desktops) return null;
    return this.desktops[screen && screen.name] || this.desktops[this.screens[0].name];
  }
  mountShell() {
    const c = this.container; c.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'q-desktops';
    this.desktops = {};
    for (const s of this.screens) {
      const d = document.createElement('div'); d.className = 'q-desktop'; d.style.width = s.width + 'px'; d.style.height = s.height + 'px';
      const lab = document.createElement('div'); lab.className = 'q-dlabel'; lab.textContent = s.name + ' ' + s.width + 'x' + s.height; d.appendChild(lab);
      this.desktops[s.name] = d; wrap.appendChild(d);
    }
    c.appendChild(wrap);
    for (const o of this.all) if (o.base === 'PanelWindow' && !o.destroyed && o.placeEl) o.placeEl();
  }
  setupPanel(o) {
    const rt = this;
    o.el.style.overflow = 'hidden';
    o.placeEl = () => { const d = rt.desktopFor(o.get('screen')); if (d && o.el.parentNode !== d) d.appendChild(o.el); };
    const geo = () => {
      const s = o.get('screen') || rt.screens[0], W = s.width, H = s.height;
      const L = o.get('anchors.left') === true, R = o.get('anchors.right') === true, T_ = o.get('anchors.top') === true, B = o.get('anchors.bottom') === true;
      const ml = o.get('margins.left') || 0, mr = o.get('margins.right') || 0, mt = o.get('margins.top') || 0, mb = o.get('margins.bottom') || 0;
      const iw = o.get('implicitWidth') || 0, ih = o.get('implicitHeight') || 0;
      const w = L && R ? W - ml - mr : iw, h = T_ && B ? H - mt - mb : ih;
      return { width: w, height: h, x: L ? ml : R ? W - w - mr : (W - w) / 2, y: T_ ? mt : B ? H - h - mb : (H - h) / 2 };
    };
    for (const n of ['x', 'y', 'width', 'height']) o.bind(n, () => geo()[n], o.where('layout'));
    const c = new Comp(rt, () => o.get('screen'), () => o.placeEl(), o.where('screen'));
    o.cleanups.push(() => c.dispose()); rt.run(c);
    o.placeEl();
  }
  setupLazy(o) {
    const rt = this;
    const c = new Comp(rt, () => o.get('active'), act => {
      if (o.inst) { rt.destroyObj(o.inst); o.inst = null; o.set('item', null, true); }
      const def = o.componentDef;
      if (act && def) { o.inst = rt.create(def, null, null); o.set('item', o.inst.proxy, true); if (rt.desktops && o.inst.placeEl) o.inst.placeEl(); }
    }, o.where('active'));
    o.cleanups.push(() => c.dispose());
    this.pending.push(() => rt.run(c));
  }
  fakeExec(cmd) {
    if (!Array.isArray(cmd) || !cmd.length) return { out: '', err: 'Process.command must be an array of strings', code: 1 };
    const a = cmd.map(String), p = a[0].replace(/^.*\//, ''), args = a.slice(1);
    const ts = 12 * 3600 + Math.floor(this.now / 1000), pad = n => String(n).padStart(2, '0');
    const H = Math.floor(ts / 3600) % 24, M = Math.floor(ts / 60) % 60, S = ts % 60;
    switch (p) {
      case 'whoami': return { out: 'jano\n', err: '', code: 0 };
      case 'hostname': return { out: 'desktop\n', err: '', code: 0 };
      case 'uname': return { out: 'Linux\n', err: '', code: 0 };
      case 'nproc': return { out: '8\n', err: '', code: 0 };
      case 'echo': return { out: args.join(' ') + '\n', err: '', code: 0 };
      case 'seq': { const lo = args.length > 1 ? +args[0] : 1, hi = +args[args.length - 1]; let o = ''; for (let i = lo; i <= hi; i++) o += i + '\n'; return { out: o, err: '', code: 0 }; }
      case 'date': { const f = (args[0] || '').replace(/^\+/, ''); const o = f ? f.replace(/%H/g, pad(H)).replace(/%M/g, pad(M)).replace(/%S/g, pad(S)) : 'Tue Oct 13 ' + pad(H) + ':' + pad(M) + ':' + pad(S) + ' 2026'; return { out: o + '\n', err: '', code: 0 }; }
      case 'sh': case 'bash': if (args[0] === '-c' && args[1]) return this.fakeExec(args[1].trim().split(/\s+/)); return { out: '', err: '', code: 0 };
      default: return { out: '', err: p + ': command not found', code: 127 };
    }
  }
  setupProcess(o) {
    const rt = this;
    const c = new Comp(rt, () => [o.get('running'), o.get('command')], ([run]) => {
      if (o.job) { rt.oneShots = rt.oneShots.filter(x => x !== o.job); o.job = null; }
      if (!run) return;
      const cmd = o.get('command');
      o.job = { due: rt.now + 50, fire: () => {
        o.job = null;
        const r = rt.fakeExec(cmd), so = rt.unwrap(o.get('stdout')), se = rt.unwrap(o.get('stderr'));
        if (so) { so.set('text', r.out); const ls = r.out.split('\n'); ls.forEach((ln, i) => { if (!(i === ls.length - 1 && ln === '')) so.emit('read', ln); }); so.emit('streamFinished'); }
        if (se && r.err) { se.set('text', r.err + '\n'); se.emit('streamFinished'); }
        o.set('exitCode', r.code); o.set('running', false); o.emit('exited', r.code);
      } };
      rt.oneShots.push(o.job);
    }, o.where('running'));
    o.cleanups.push(() => { c.dispose(); rt.oneShots = rt.oneShots.filter(x => x !== o.job); });
    this.pending.push(() => rt.run(c));
  }
  setupClock(o) {
    const rt = this;
    const upd = () => { const ts = 12 * 3600 + Math.floor(rt.now / 1000); o.set('hours', Math.floor(ts / 3600) % 24, true); o.set('minutes', Math.floor(ts / 60) % 60, true); o.set('seconds', ts % 60, true); };
    const t = new QObj(rt, 'Timer', o.ctx);
    t.signals.get('triggered').handlers.push(Object.assign(() => { if (o.get('enabled')) upd(); }, { where: 'SystemClock' }));
    t.set('interval', 1000); t.set('repeat', true); t.set('running', true);
    rt.setupTimer(t); o.cleanups.push(() => rt.timers.delete(t));
    upd();
  }
  setupRepeater(o) {
    const rt = this;
    o.items = [];
    const c = new Comp(rt, () => {
      const m = o.get('model'), d = o.get('delegate');
      rt.modelRows(m);
      return [m, d];
    }, ([m, d]) => {
      for (const it of o.items) rt.destroyObj(it);
      o.items = [];
      const def = d && d.__component ? d.__component : o.componentDef;
      if (!def) { o.set('count', 0, true); return; }
      const par = rt.unwrap(o.get('parent'));
      const list = rt.modelRows(m);
      list.forEach((md, index) => {
        const extra = { index, modelData: md };
        if (md && typeof md === 'object' && !Array.isArray(md)) { Object.assign(extra, md); extra.model = Object.assign({ index }, md); }
        const it = rt.create(def, par, extra);
        o.items.push(it);
      });
      if (par) { const kids = par.get('children').filter(c => !o.items.some(it => it.proxy === c)); const at = kids.indexOf(o.proxy); kids.splice(at + 1, 0, ...o.items.map(i => i.proxy)); par.set('children', kids); }
      o.set('count', list.length, true);
    }, o.where('repeater'));
    o.cleanups.push(() => c.dispose());
    o.pendingRepeater = c;
    this.pending.push(() => rt.run(c));
  }
  setupTimer(o) {
    const rt = this;
    o.due = 0;
    const c = new Comp(rt, () => [o.get('running'), o.get('interval')], ([run, iv]) => {
      if (run) { rt.timers.add(o); o.due = rt.now + Math.max(1, iv); if (o.get('triggeredOnStart')) rt.batch(() => o.emit('triggered')); }
      else rt.timers.delete(o);
    }, o.where('running'));
    o.cleanups.push(() => { c.dispose(); rt.timers.delete(o); });
    this.pending.push(() => rt.run(c));
  }
  setupConnections(o) {
    const rt = this;
    let attached = [];
    o.reconnect = () => {
      for (const [sigs, h] of attached) { const i = sigs.handlers.indexOf(h); if (i >= 0) sigs.handlers.splice(i, 1); }
      attached = [];
      const t = rt.unwrap(o.get('target'));
      if (!t || o.get('enabled') === false) return;
      for (const ch of (o.connHandlers || [])) {
        const sg = t.signals.get(ch.sn);
        const isChange = !sg && /Changed$/.test(ch.sn) && t.props.has(ch.sn.slice(0, -7));
        const h = (args, params) => {
          const extra = {}; (ch.params || params || []).forEach((pn, i) => extra[pn] = unwrapVal(args[i]));
          try { rt.compile('stmt', ch.m.expr)(rt.scopeFor(o, ch.ctx, extra)); } catch (e) { e.line = ch.m.line; throw e; }
        };
        h.where = ch.where;
        if (sg) { sg.handlers.push(h); attached.push([sg, h]); }
        else if (isChange) { const pn = ch.sn.slice(0, -7); t.onChanged(pn, h); const arr = t.changed.get(pn); attached.push([{ handlers: arr }, h]); }
      }
    };
    const c = new Comp(rt, () => [o.get('target'), o.get('enabled')], () => o.reconnect(), o.where('target'));
    o.cleanups.push(() => c.dispose());
    this.pending.push(() => rt.run(c));
  }

  // ---- display
  mount(root) {
    const c = this.container;
    c.innerHTML = '';
    let el = root.el;
    if (root.base === 'Window') {
      const frame = document.createElement('div'); frame.className = 'q-window';
      const bar = document.createElement('div'); bar.className = 'q-titlebar';
      const dots = '<i></i><i></i><i></i>'; bar.innerHTML = dots + '<span></span>';
      const title = bar.querySelector('span');
      const tc = new Comp(this, () => root.get('title'), v => { title.textContent = v || ''; }, '');
      root.cleanups.push(() => tc.dispose()); this.run(tc);
      const body = document.createElement('div'); body.className = 'q-winbody';
      const sync = new Comp(this, () => [root.get('width'), root.get('height')], ([w, h]) => { body.style.width = (w || 0) + 'px'; body.style.height = (h || 0) + 'px'; }, '');
      root.cleanups.push(() => sync.dispose()); this.run(sync);
      el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0';
      body.appendChild(el); frame.appendChild(bar); frame.appendChild(body); c.appendChild(frame);
    } else {
      const holder = document.createElement('div'); holder.className = 'q-holder';
      const sync = new Comp(this, () => [root.get('width'), root.get('height')], ([w, h]) => { holder.style.width = (w || 0) + 'px'; holder.style.height = (h || 0) + 'px'; }, '');
      root.cleanups.push(() => sync.dispose()); this.run(sync);
      el.style.left = '0'; el.style.top = '0';
      holder.appendChild(el); c.appendChild(holder);
    }
  }
  // ---- clock
  advance(ms) {
    const target = this.now + ms;
    for (let guard = 0; guard < 100000; guard++) {
      let next = null, job = null;
      for (const t of this.timers) if (t.due <= target && (!next || t.due < next.due)) next = t;
      for (const j of this.oneShots) if (j.due <= target && (!job || j.due < job.due)) job = j;
      if (job && (!next || job.due <= next.due)) { this.oneShots = this.oneShots.filter(x => x !== job); this.now = Math.max(this.now, job.due); this.batch(() => job.fire()); continue; }
      if (!next) break;
      this.now = next.due;
      this.batch(() => {
        if (next.get('repeat')) next.due = this.now + Math.max(1, next.get('interval')); else { next.set('running', false); }
        next.emit('triggered');
      });
    }
    this.now = target;
  }
  start() {                     // real-time clock for the live preview
    if (this._raf) return;
    this._last = performance.now();
    const loop = t => { const dt = Math.min(200, t - this._last); this._last = t; if (this.timers.size || this.oneShots.length) this.advance(dt); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }
  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }

  // ---- test helpers --------------------------------------------------------------
  find(id) { const c = this.mainCtx; const o = c && c.ids.get(id); return o ? o.proxy : null; }
  findAll(type) { return this.all.filter(o => !o.destroyed && (o.chainNames.includes(type) || o.typeName === type)).map(o => o.proxy); }
  objOf(x) { return typeof x === 'string' ? (this.mainCtx.ids.get(x) || null) : this.unwrap(x); }
  isShown(o) { for (let n = o; n; n = this.unwrap(n.get('parent'))) if (n.get('visible') === false || n.get('opacity') === 0) return false; return true; }
}
function cssColor(c) { return c === undefined || c === null ? 'transparent' : String(c); }
function unwrapVal(v) { return v; }
function safeJson(x) { try { return JSON.stringify(x); } catch (e) { return String(x); } }

G.QmlRuntime = Runtime;
G.QmlParser.T = T;
})(typeof window !== 'undefined' ? window : globalThis);
