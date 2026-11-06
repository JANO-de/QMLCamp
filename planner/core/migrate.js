// PlannerMigrate: v1 -> v2, one-time and non-destructive. Pure: never reads or writes storage and never
// mutates its input. v1 data stays in localStorage untouched (backup until the user removes it).
(function (G) {
  'use strict';
  if (G.PlannerMigrate) return;
  const M = G.PlannerModel,
    U = G.PlannerModules.util;
  const V1_TYPES = ['tasks', 'note', 'links', 'list', 'time', 'milestone'];
  const COLS = 3,
    PITCH_X = 360,
    PITCH_Y = 520,
    CARD_W = 340;
  const CAT_ID = 'c-plans'; // fixed so two devices migrating the same v1 data converge on one category

  // Flat v1 block -> v2 block (fields move into `data`; final cleaning is done by PlannerModel).
  function blockV1(b) {
    b = M.isObj(b) ? b : {};
    const type = V1_TYPES.indexOf(b.type) >= 0 ? b.type : 'tasks';
    const data =
      type === 'tasks' ? { tasks: b.tasks }
      : type === 'links' ? { links: b.links }
      : type === 'list' ? { items: b.items }
      : type === 'time' ? { target: b.target, logged: b.logged }
      : { text: b.text }; // note, milestone
    return { id: b.id, type: type, label: b.label, title: b.title, exam: b.exam, tags: b.tags, data: data };
  }

  // v1: {plans:[{id,title,tags[],blocks[]}], current}. -> { store, focus } (focus = card id to open).
  function fromV1(v1, opts) {
    opts = opts || {};
    const plans = U.arr(v1 && v1.plans, M.LIMITS.cards).map((p) => (M.isObj(p) ? p : {}));
    const cards = plans.map((p, i) => ({
      id: p.id,
      kind: 'plan',
      x: (i % COLS) * PITCH_X,
      y: Math.floor(i / COLS) * PITCH_Y,
      w: CARD_W,
      h: null,
      z: i + 1,
      color: 'lav',
      collapsed: false,
      title: p.title,
      tags: p.tags,
      blocks: U.arr(p.blocks, M.LIMITS.blocks).map(blockV1),
      widget: null,
    }));
    const store = M.cleanStore(
      {
        v: 2,
        current: CAT_ID,
        categories: [{ id: CAT_ID, name: 'Plans', color: 'lav', order: 0, view: { x: 0, y: 0, zoom: 1 }, cards: cards, edges: [] }],
      },
      !!opts.strict
    );
    const out = store.categories[0].cards;
    let at = plans.findIndex((p) => p.id === (v1 && v1.current));
    if (at < 0 || at >= out.length) at = 0;
    return { store: store, focus: out[at] ? out[at].id : null };
  }

  // First run (neither key present): seed templates become plan cards in the default category.
  function seed(templates) {
    const plans = (templates || [])
      .filter((t) => t && t.seed && t.plan)
      .map((t) => Object.assign({}, t.plan, { id: U.uid() }));
    return fromV1({ plans: plans, current: plans[0] && plans[0].id }, { strict: true });
  }

  // Import files: v1 shapes (array / {plans} / single plan) -> list of v1 plans, or null.
  function plansFromAny(d) {
    const list = Array.isArray(d) ? d : d && Array.isArray(d.plans) ? d.plans : d && Array.isArray(d.blocks) ? [d] : null;
    return list && list.length ? list.slice(0, M.LIMITS.cards) : null;
  }

  G.PlannerMigrate = { CAT_ID, blockV1, fromV1, seed, plansFromAny };
})(window);
