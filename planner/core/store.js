// PlannerStore: localStorage persistence for the v2 model.
//   v2 key  qmlcamp-planner-v2   (synced by js/sync.js)
//   v1 key  qmlcamp-planner-v1   (never written or deleted here)
// load(): v2 if present; else v1 migrated in memory; else (first run) seed templates.
// Nothing is written unless load({persist:true}) or save() is called, so read-only pages (home) are safe.
(function (G) {
  'use strict';
  if (G.PlannerStore) return;
  const M = G.PlannerModel,
    MG = G.PlannerMigrate;
  const KEY2 = 'qmlcamp-planner-v2',
    KEY1 = 'qmlcamp-planner-v1';
  const ls = () => S.ls || G.localStorage;
  const raw = (k) => {
    try {
      return ls().getItem(k);
    } catch (e) {
      return null;
    }
  };
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      return undefined;
    }
  };

  let pending = null,
    timer = 0;

  const S = {
    KEY1, KEY2,
    ls: null, // tests inject a fake storage here
    failed: false, // last save failed (show the "can't store" notice)

    // opts: { persist: write v2 when it came from v1/seed, seed: false = never seed (default true) }
    // -> { store, source: 'v2'|'v1'|'seed'|'empty'|'corrupt', focus, firstRun }
    load(opts) {
      opts = opts || {};
      const r2 = raw(KEY2),
        r1 = raw(KEY1);
      let res = null,
        corrupt = false;
      if (r2 !== null) {
        const j = parse(r2);
        if (M.isObj(j) && Array.isArray(j.categories)) {
          res = { store: M.cleanStore(j, false), source: 'v2', focus: null, firstRun: false };
        } else {
          corrupt = true; // keep a copy before anything can overwrite it
          try {
            ls().setItem(KEY2 + '-bak', r2);
          } catch (e) {}
        }
      }
      if (!res && r1 !== null) {
        const j = parse(r1);
        if (M.isObj(j) && Array.isArray(j.plans)) {
          const m = MG.fromV1(j);
          res = { store: m.store, source: 'v1', focus: m.focus, firstRun: false };
        }
      }
      if (!res && r1 === null && r2 === null && opts.seed !== false) {
        const m = MG.seed(G.PLANNER_TEMPLATES);
        res = { store: m.store, source: 'seed', focus: m.focus, firstRun: true };
      }
      if (!res) res = { store: M.emptyStore(), source: corrupt ? 'corrupt' : 'empty', focus: null, firstRun: false };
      if (opts.persist && (res.source === 'v1' || res.source === 'seed')) S.save(res.store);
      return res;
    },

    save(store) {
      pending = null; // a stale pending object must never overwrite this save
      clearTimeout(timer);
      try {
        ls().setItem(KEY2, JSON.stringify(store));
        S.failed = false;
      } catch (e) {
        S.failed = true;
      }
      return !S.failed;
    },
    // Debounced save (300 ms); flushed when the page is hidden or closed.
    saveSoon(store) {
      pending = store;
      clearTimeout(timer);
      timer = setTimeout(S.flush, 300);
    },
    flush() {
      clearTimeout(timer);
      if (!pending) return !S.failed;
      const s = pending;
      pending = null;
      return S.save(s);
    },
    // Characters stored under the v2 key (usage meter comes later).
    usage() {
      const r = raw(KEY2);
      return r ? r.length : 0;
    },

    // Home widget: every plan card of every category, in category/array order. Read-only, never seeds.
    homePlans() {
      const s = S.load({ seed: false }).store,
        plans = [];
      s.categories.forEach((c) =>
        c.cards.forEach((k) => {
          if (k.kind === 'plan') plans.push({ id: k.id, title: k.title, tags: k.tags, blocks: k.blocks, catId: c.id, catName: c.name });
        })
      );
      return { plans: plans, categories: s.categories.length };
    },
  };
  if (G.addEventListener) {
    G.addEventListener('pagehide', S.flush);
    if (G.document)
      G.document.addEventListener('visibilitychange', () => {
        if (G.document.hidden) S.flush();
      });
  }
  G.PlannerStore = S;
})(window);
