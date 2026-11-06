// PlannerModules: registry of block / widget modules. Adding a module = adding one file.
// Load order: this file first, then planner/modules/*.js, then model.js, migrate.js, store.js.
(function (G) {
  'use strict';
  if (G.PlannerModules) return;

  // ---- helpers shared by every module (also handed to sanitize/toMarkdown as `ctx`)
  const str = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
  const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n) : []);
  const num = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x)) || 0));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const safeUrl = (u) => {
    u = str(u, 500).trim();
    return /^https?:\/\/\S+$/i.test(u) ? u : '';
  };
  const fmt = (m) =>
    m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  const util = { str, arr, num, uid, safeUrl, fmt };

  const ID = /^[a-z][a-z0-9-]*$/;
  const KINDS = ['block', 'widget', 'both'];
  const mods = {}; // id -> definition
  const builtin = {}; // id -> true
  const errors = [];

  function check(def) {
    if (!def || typeof def !== 'object') return 'definition must be an object';
    if (!ID.test(def.id || '')) return 'id must match /^[a-z][a-z0-9-]*$/';
    if (KINDS.indexOf(def.kind) < 0) return 'kind must be block | widget | both';
    if (typeof def.name !== 'string' || !def.name) return 'name is required';
    if (typeof def.defaults !== 'function') return 'defaults() is required';
    if (typeof def.sanitize !== 'function') return 'sanitize() is required';
    if (mods[def.id]) return 'id already registered';
    return '';
  }
  function add(def, isBuiltin) {
    const why = check(def);
    if (why) {
      errors.push({ id: def && def.id, error: why });
      if (typeof console !== 'undefined') console.warn('PlannerModules: ' + (def && def.id) + ': ' + why);
      return false;
    }
    mods[def.id] = def;
    if (isBuiltin) builtin[def.id] = true;
    return true;
  }

  G.PlannerModules = {
    util,
    errors,
    // Third-party modules. Cannot reuse an id (builtins included).
    register: (def) => add(def, false),
    // Used by planner/modules/<builtin>.js only.
    registerBuiltin: (def) => add(def, true),
    has: (id) => !!mods[id],
    get: (id) => mods[id] || null,
    isBuiltin: (id) => !!builtin[id],
    list: (kind) =>
      Object.keys(mods)
        .map((k) => mods[k])
        .filter((m) => !kind || m.kind === kind || m.kind === 'both'),
    defaults: (id) => (mods[id] ? mods[id].defaults() : {}),
    // Returns a NEW object. Unknown id: null (caller keeps the data untouched).
    sanitize: (id, data, strict) =>
      mods[id] ? mods[id].sanitize(data, Object.assign({ strict: !!strict }, util)) : null,
    // {total, done}: work items (feeds progress bars and the home widget).
    stats(id, data) {
      const m = mods[id];
      const s = m && m.stats ? m.stats(data || {}) : null;
      return { total: (s && s.total) | 0, done: (s && s.done) | 0 };
    },
    // Extension to the spec: true when the block counts as finished (default: all items done).
    isDone(id, data) {
      const m = mods[id];
      if (!m) return false;
      if (m.isDone) return !!m.isDone(data || {});
      const s = G.PlannerModules.stats(id, data);
      return s.total > 0 && s.done >= s.total;
    },
    // Non-null when the block still has work to do ("Next up").
    nextUp: (id, data) => (mods[id] && mods[id].nextUp ? mods[id].nextUp(data || {}) : null),
    // Copy of data for a duplicated card (module hook reset(); default = unchanged copy).
    reset(id, data) {
      const m = mods[id],
        c = JSON.parse(JSON.stringify(data || {}));
      return m && m.reset ? m.reset(c) : c;
    },
    toMarkdown: (id, data) =>
      mods[id] && mods[id].toMarkdown ? mods[id].toMarkdown(data || {}, util) : '',
  };
})(window);
