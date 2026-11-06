// Planner self-test: pure assertions (no DOM). Run by selftest.html in the browser; the same file runs in node.
// PlannerSelfTest(report) calls report(name, ok, detail) once per test. Uses an in-memory fake storage.
window.PlannerSelfTest = function (report) {
  'use strict';
  const R = PlannerModules,
    M = PlannerModel,
    MG = PlannerMigrate,
    S = PlannerStore;
  const J = JSON.stringify;
  const eq = (a, b, msg) => {
    if (J(a) !== J(b)) throw new Error((msg || 'not equal') + '\n  got:      ' + J(a) + '\n  expected: ' + J(b));
  };
  const ok = (c, msg) => {
    if (!c) throw new Error(msg || 'assertion failed');
  };
  const test = (name, fn) => {
    try {
      fn();
      report(name, true);
    } catch (e) {
      report(name, false, e.message);
    }
  };
  const fake = (init) => {
    const m = Object.assign({}, init);
    return {
      m,
      getItem: (k) => (k in m ? m[k] : null),
      setItem: (k, v) => {
        if (fake.full) throw new Error('quota');
        m[k] = String(v);
      },
      removeItem: (k) => delete m[k],
    };
  };
  const withStore = (init, fn) => {
    const old = S.ls,
      f = fake(init);
    S.ls = f;
    try {
      fn(f);
    } finally {
      S.ls = old;
      fake.full = false;
    }
  };

  // ---- v1 fixture: all six types, tags, key dates, string tasks, an unknown type
  const v1 = () => ({
    current: 'p2',
    plans: [
      {
        id: 'p1', title: 'Databases',
        tags: [{ id: 'ta', name: 'E/R', color: 'sky' }, { id: 'tb', name: 'SQL', color: 'sage' }],
        blocks: [
          { id: 'b1', type: 'tasks', label: '18-19', title: 'Base', exam: false, tags: ['ta', 'zz'],
            tasks: [{ id: 't1', text: 'One', done: true }, { id: 't2', text: 'Two', done: false }, 'Three'] },
          { id: 'b2', type: 'note', label: 'rules', title: 'Rules', exam: true, tags: ['tb'], text: 'Keep it simple' },
          { id: 'b3', type: 'links', label: '', title: 'Refs', exam: false, tags: [],
            links: [{ id: 'l1', title: 'Doc', url: 'https://example.com' }, { id: 'l2', title: 'Bad', url: 'javascript:alert(1)' }] },
          { id: 'b4', type: 'list', label: '', title: 'Ideas', exam: false, tags: [], items: [{ id: 'i1', text: 'A' }, 'B'] },
          { id: 'b5', type: 'time', label: '', title: 'Study', exam: false, tags: [], target: 120, logged: 150 },
          { id: 'b6', type: 'milestone', label: '28 Oct', title: 'Exam', exam: true, tags: [], text: 'Room 4' },
        ],
      },
      { id: 'p2', title: 'Maths', tags: [], blocks: [
          { id: 'c1', type: 'tasks', title: 'Sets', tasks: [{ id: 'x1', text: 'S', done: true }] },
          { id: 'c2', type: 'weird', title: 'Unknown', tasks: [{ id: 'x2', text: 'kept as tasks' }] },
      ] },
      { id: 'p3', title: 'Empty', tags: [], blocks: [] },
    ],
  });
  // Old planner task stats / "done" rules, written out literally for comparison.
  const v1Stats = (p) => {
    let n = 0, d = 0;
    p.blocks.forEach((b) => {
      if (b.type === 'tasks') (b.tasks || []).forEach((t) => { n++; if (t.done) d++; });
    });
    return { n, d };
  };

  // ---------------------------------------------------------------- registry
  test('registry: six builtins registered', () => {
    eq(R.list().map((m) => m.id).sort(), ['links', 'list', 'milestone', 'note', 'tasks', 'time']);
    ok(R.list().every((m) => R.isBuiltin(m.id)));
  });
  test('registry: builtin ids reserved, bad definitions rejected', () => {
    const n = R.errors.length;
    const base = { kind: 'block', name: 'X', defaults: () => ({}), sanitize: (d) => d };
    ok(!R.register(Object.assign({ id: 'tasks' }, base)), 'builtin id reused');
    ok(!R.register(Object.assign({ id: 'Bad_Id' }, base)), 'bad id');
    ok(!R.register(Object.assign({ id: 'okid', kind: 'nope' }, base, { kind: 'nope' })), 'bad kind');
    ok(!R.register({ id: 'nosanitize', kind: 'block', name: 'X', defaults: () => ({}) }), 'no sanitize');
    eq(R.errors.length, n + 4);
  });
  test('registry: third-party module registers once', () => {
    const def = { id: 'selftest-mod', kind: 'both', name: 'T', defaults: () => ({ a: 1 }), sanitize: (d, c) => ({ a: c.num(d && d.a, 9) }) };
    ok(R.register(def) || R.has('selftest-mod'));
    ok(!R.register(def), 'second registration must fail');
    eq(R.sanitize('selftest-mod', { a: 99, junk: 1 }), { a: 9 });
    ok(R.list('widget').some((m) => m.id === 'selftest-mod'), 'kind both is listed as widget');
  });

  // ---------------------------------------------------------------- sanitising
  test('sanitize: unknown fields dropped, caps applied, string tasks accepted', () => {
    const b = M.cleanBlock({ type: 'tasks', evil: 1, data: { tasks: ['a', { text: 'b', done: 1, x: 2 }], extra: 1 } }, {}, false);
    eq(Object.keys(b).sort(), ['data', 'exam', 'id', 'label', 'tags', 'title', 'type']);
    eq(b.data.tasks.map((t) => [t.text, t.done]), [['a', false], ['b', true]]);
    eq(Object.keys(b.data), ['tasks']);
    const big = M.cleanBlock({ type: 'tasks', data: { tasks: new Array(150).fill('x') } }, {}, false);
    eq(big.data.tasks.length, 100);
  });
  test('sanitize: strict drops non-http(s) link urls, lenient keeps text', () => {
    const d = { links: [{ title: 'a', url: 'javascript:1' }, { title: 'b', url: 'https://x.org' }] };
    eq(R.sanitize('links', d, true).links.map((l) => l.url), ['', 'https://x.org']);
    eq(R.sanitize('links', d, false).links.map((l) => l.url), ['javascript:1', 'https://x.org']);
  });
  test('sanitize: unknown module keeps its data untouched (missing-module placeholder)', () => {
    const data = { columns: [{ id: 'c', items: [1, 2, { id: 'z' }] }], n: 5 };
    const b = M.cleanBlock({ type: 'kanban', title: 'K', data: data, junk: 1 }, {}, true);
    eq(b.type, 'kanban');
    eq(b.data, data);
    ok(b.data !== data, 'must be a copy');
    const k = M.cleanCard({ kind: 'widget', widget: { type: 'kanban', data: data } }, true, (x) => x || 'id1');
    eq(k.widget, { type: 'kanban', data: data });
  });
  test('sanitize: invalid block type falls back to tasks; tags filtered by card tags', () => {
    const c = M.cleanCard({ id: 'k', tags: [{ id: 't1', name: 'A' }], blocks: [{ type: 'Bad Type!', tags: ['t1', 'nope'] }] }, false, (x) => x);
    eq(c.blocks[0].type, 'tasks');
    eq(c.blocks[0].tags, ['t1']);
  });
  test('model: ids unique in every array (duplicates and gaps repaired)', () => {
    const s = M.cleanStore({ categories: [
      { id: 'a', cards: [{ id: 'k', blocks: [{ id: 'b' }, { id: 'b' }, {}] }, { id: 'k' }] },
      { id: 'a' },
    ] });
    const uniq = (l) => new Set(l).size === l.length && l.every(Boolean);
    ok(uniq(s.categories.map((c) => c.id)));
    ok(uniq(s.categories[0].cards.map((c) => c.id)));
    ok(uniq(s.categories[0].cards[0].blocks.map((b) => b.id)));
  });
  test('model: numbers clamped, defaults applied', () => {
    const c = M.cleanStore({ categories: [{ id: 'a', view: { zoom: 99, x: 'abc' }, cards: [{ id: 'k', w: 5, h: 'x', z: -4, x: 1e12 }] }] }).categories[0];
    eq(c.view, { x: 0, y: 0, zoom: 3 });
    const k = c.cards[0];
    eq([k.w, k.h, k.z, k.x, k.kind, k.color], [120, null, 0, 1e6, 'plan', 'lav']);
  });
  test('model: size guards (cards, blocks, edges, categories)', () => {
    const cards = Array.from({ length: 310 }, (_, i) => ({ id: 'k' + i, blocks: new Array(210).fill({ type: 'note' }) }));
    const edges = Array.from({ length: 1100 }, (_, i) => ({ from: { card: 'k0' }, to: { card: 'k' + (i % 300 + 1) } }));
    const c = M.cleanStore({ categories: new Array(45).fill(0).map((_, i) => (i ? { id: 'c' + i } : { id: 'c0', cards, edges })) });
    eq(c.categories.length, 40);
    eq(c.categories[0].cards.length, 300);
    eq(c.categories[0].cards[0].blocks.length, 200);
    ok(c.categories[0].edges.length <= 300, 'edges deduped to unique targets');
  });

  // ---------------------------------------------------------------- edges
  const edgeStore = (edges) => M.cleanStore({ categories: [{ id: 'c', cards: [
    { id: 'k1', blocks: [{ id: 'b1', type: 'note' }, { id: 'b2', type: 'note' }] },
    { id: 'k2', blocks: [{ id: 'b3', type: 'note' }] },
  ], edges: edges }] }).categories[0].edges;
  test('edges: duplicates and self-loops removed, card edges and block edges coexist', () => {
    const e = edgeStore([
      { id: 'e1', from: { card: 'k1', block: 'b1' }, to: { card: 'k2', block: 'b3' } },
      { id: 'e2', from: { card: 'k1', block: 'b1', side: 'top' }, to: { card: 'k2', block: 'b3' } }, // duplicate
      { id: 'e3', from: { card: 'k1', block: 'b1' }, to: { card: 'k1', block: 'b1' } }, // self-loop (block)
      { id: 'e4', from: { card: 'k1' }, to: { card: 'k1' } }, // self-loop (card)
      { id: 'e5', from: { card: 'k1', block: 'b1' }, to: { card: 'k1', block: 'b2' } }, // same card, different blocks: allowed
      { id: 'e6', from: { card: 'k1' }, to: { card: 'k2' } }, // card edge: allowed
    ]);
    eq(e.map((x) => x.id), ['e1', 'e5', 'e6']);
  });
  test('edges: unknown card dropped; unknown block falls back to the card', () => {
    const e = edgeStore([
      { id: 'e1', from: { card: 'k1', block: 'gone' }, to: { card: 'k2' } },
      { id: 'e2', from: { card: 'nope' }, to: { card: 'k2' } },
      { id: 'e3', from: { card: 'k2' }, to: { card: 'k1', block: 'b2' }, style: 'bad', arrow: 'both', color: 'x' },
    ]);
    eq(e.map((x) => x.id), ['e1', 'e3']);
    eq(e[0].from, { card: 'k1', side: 'right' });
    eq([e[1].style, e[1].arrow, e[1].color, e[1].to.block], ['curve', 'both', 'sage', 'b2']);
  });
  test('edges: deleting a block keeps a card-level edge (re-clean)', () => {
    const s = M.cleanStore({ categories: [{ id: 'c', cards: [{ id: 'k1', blocks: [{ id: 'b1', type: 'note' }] }, { id: 'k2' }],
      edges: [{ id: 'e', from: { card: 'k1', block: 'b1' }, to: { card: 'k2' } }] }] });
    s.categories[0].cards[0].blocks = [];
    const t = M.cleanStore(s);
    eq(t.categories[0].edges.length, 1);
    eq(t.categories[0].edges[0].from.block, undefined);
  });
  test('model: cleanStore is idempotent', () => {
    const a = MG.fromV1(v1()).store;
    eq(M.cleanStore(a, false), a);
  });

  // ---------------------------------------------------------------- migration
  test('migrate: v1 input is not mutated', () => {
    const src = v1(),
      before = J(src);
    MG.fromV1(src);
    eq(J(src), before);
  });
  test('migrate: same plans, titles, tags, block order, labels, exam flags', () => {
    const src = v1(),
      s = MG.fromV1(src).store;
    eq(s.v, 2);
    eq(s.categories.length, 1);
    eq([s.categories[0].id, s.categories[0].name], ['c-plans', 'Plans']);
    const cards = s.categories[0].cards;
    eq(cards.map((c) => [c.id, c.title, c.kind]), src.plans.map((p) => [p.id, p.title, 'plan']));
    eq(cards[0].tags, src.plans[0].tags);
    eq(cards[0].blocks.map((b) => [b.id, b.type, b.label, b.title, b.exam]),
      src.plans[0].blocks.map((b) => [b.id, b.type, b.label, b.title, !!b.exam]));
    eq(cards[0].blocks[0].tags, ['ta'], 'unknown tag id dropped like v1');
  });
  test('migrate: block payloads move into data, ticks and counts preserved', () => {
    const b = MG.fromV1(v1()).store.categories[0].cards[0].blocks;
    eq(b[0].data.tasks.map((t) => [t.id, t.text, t.done]), [['t1', 'One', true], ['t2', 'Two', false], [b[0].data.tasks[2].id, 'Three', false]]);
    eq(b[1].data, { text: 'Keep it simple' });
    eq(b[2].data.links.map((l) => l.url), ['https://example.com', 'javascript:alert(1)'], 'lenient like v1 load');
    eq(b[3].data.items.map((i) => i.text), ['A', 'B']);
    eq(b[4].data, { target: 120, logged: 150 });
    eq(b[5].data, { text: 'Room 4' });
  });
  test('migrate: unknown v1 block type becomes tasks (as v1 did)', () => {
    const c = MG.fromV1(v1()).store.categories[0].cards[1];
    eq(c.blocks[1].type, 'tasks');
    eq(c.blocks[1].data.tasks.map((t) => t.text), ['kept as tasks']);
  });
  test('migrate: grid layout 3 columns, 360 px pitch; focus = v1 current', () => {
    const src = v1();
    for (let i = 0; i < 4; i++) src.plans.push({ id: 'q' + i, title: 'Q' + i, tags: [], blocks: [] });
    const r = MG.fromV1(src);
    const c = r.store.categories[0].cards;
    eq(c.slice(0, 4).map((k) => [k.x, k.y]), [[0, 0], [360, 0], [720, 0], [0, 520]]);
    eq(r.focus, 'p2');
    eq(MG.fromV1({ plans: [], current: null }).focus, null);
  });
  test('migrate: garbage input gives an empty Plans category', () => {
    eq(MG.fromV1(null).store.categories[0].cards, []);
    eq(MG.fromV1({ plans: [null, 5, 'x'] }).store.categories[0].cards.length, 3);
  });
  test('migrate: seed templates become cards (strict urls)', () => {
    const r = MG.seed([{ id: 't', seed: true, plan: { title: 'T', tags: [], blocks: [{ type: 'links', links: [{ title: 'x', url: 'javascript:1' }] }] } }, { id: 'n', plan: { title: 'N' } }]);
    eq(r.store.categories[0].cards.map((k) => k.title), ['T']);
    eq(r.store.categories[0].cards[0].blocks[0].data.links[0].url, '');
  });
  test('migrate: real templates.js seeds without errors', () => {
    if (!window.PLANNER_TEMPLATES) return;
    const r = MG.seed(window.PLANNER_TEMPLATES);
    ok(r.store.categories[0].cards.length >= 1, 'no seed card');
  });
  test('migrate: import shapes (array / {plans} / single plan / bad)', () => {
    eq(MG.plansFromAny([{ blocks: [] }]).length, 1);
    eq(MG.plansFromAny({ plans: [{}, {}] }).length, 2);
    eq(MG.plansFromAny({ title: 'x', blocks: [] }).length, 1);
    eq(MG.plansFromAny({ nope: 1 }), null);
    eq(MG.plansFromAny([]), null);
  });

  // ---------------------------------------------------------------- store
  test('store: v1 only -> migrated in memory, nothing written', () => {
    const raw = J(v1());
    withStore({ [S.KEY1]: raw }, (f) => {
      const r = S.load({ seed: false });
      eq(r.source, 'v1');
      eq(r.focus, 'p2');
      eq(Object.keys(f.m), [S.KEY1]);
    });
  });
  test('store: persist writes v2, v1 stays byte-identical, reload reads v2', () => {
    const raw = J(v1());
    withStore({ [S.KEY1]: raw }, (f) => {
      const a = S.load({ persist: true });
      eq(f.m[S.KEY1], raw);
      ok(f.m[S.KEY2], 'v2 not written');
      const b = S.load();
      eq(b.source, 'v2');
      eq(b.store, a.store);
    });
  });
  test('store: first run seeds, seed:false does not', () => {
    withStore({}, () => eq(S.load({ seed: false }).source, 'empty'));
    withStore({}, (f) => {
      const r = S.load({ persist: true });
      eq([r.source, r.firstRun], ['seed', true]);
      ok(f.m[S.KEY2]);
    });
  });
  test('store: corrupt v2 is backed up and v1 is used', () => {
    withStore({ [S.KEY2]: '{not json', [S.KEY1]: J(v1()) }, (f) => {
      const r = S.load();
      eq(r.source, 'v1');
      eq(f.m[S.KEY2 + '-bak'], '{not json');
      eq(f.m[S.KEY2], '{not json', 'corrupt key must not be overwritten by load');
    });
  });
  test('store: save failure sets failed, success clears it', () => {
    withStore({}, () => {
      fake.full = true;
      eq(S.save(M.emptyStore()), false);
      ok(S.failed);
      fake.full = false;
      eq(S.save(M.emptyStore()), true);
      ok(!S.failed);
    });
  });
  test('store: home plans give the same task stats and key dates as the v1 rules', () => {
    const src = v1();
    withStore({ [S.KEY1]: J(src) }, () => {
      const h = S.homePlans();
      eq(h.categories, 1);
      eq(h.plans.map((p) => p.id), src.plans.map((p) => p.id));
      h.plans.forEach((p, i) => {
        let n = 0, d = 0;
        p.blocks.forEach((b) => {
          const s = R.stats(b.type, b.data);
          n += s.total;
          d += s.done;
        });
        // v1 counts tasks of blocks whose type is 'tasks' after v1 cleaning (unknown types became tasks)
        const old = { blocks: src.plans[i].blocks.map((b) => (['tasks', 'note', 'links', 'list', 'time', 'milestone'].indexOf(b.type) < 0 ? Object.assign({}, b, { type: 'tasks' }) : b)) };
        const o = v1Stats(old);
        eq([n, d], [o.n, o.d], 'stats of ' + p.title);
      });
      const p1 = h.plans[0].blocks;
      eq(p1.map((b) => R.isDone(b.type, b.data)), [false, false, false, false, true, false], 'isDone: time 150>=120 only');
      eq(p1.filter((b) => b.exam || b.type === 'milestone').map((b) => b.id), ['b2', 'b6']);
    });
  });
  test('store: home never seeds on an empty profile', () => {
    withStore({}, () => eq(S.homePlans().plans, []));
  });
  test('store: v2 categories show in home in category order with names', () => {
    const v2 = { v: 2, current: 'b', categories: [
      { id: 'a', name: 'Uni', cards: [{ id: 'k1', title: 'One', blocks: [] }, { id: 'k2', kind: 'widget', title: 'W', widget: { type: 'kanban', data: {} } }] },
      { id: 'b', name: 'Home', cards: [{ id: 'k3', title: 'Three', blocks: [] }] },
    ] };
    withStore({ [S.KEY2]: J(v2), [S.KEY1]: J(v1()) }, () => {
      const h = S.homePlans();
      eq(h.plans.map((p) => [p.id, p.catName]), [['k1', 'Uni'], ['k3', 'Home']]);
      eq(h.categories, 2);
    });
  });

  // ---------------------------------------------------------------- markdown
  test('markdown: card export matches the v1 format', () => {
    const c = MG.fromV1({ plans: [{ id: 'p', title: 'Plan', tags: [{ id: 'a', name: 'Tag A', color: 'sky' }], blocks: [
      { type: 'tasks', label: 'L', title: 'T', exam: true, tags: ['a'], tasks: [{ text: 'x', done: true }, { text: 'y' }] },
      { type: 'links', links: [{ title: 'Doc', url: 'https://e.com' }, { title: 'Nope', url: 'ftp://x' }] },
      { type: 'time', target: 90, logged: 30 },
      { type: 'note', text: 'hello' },
    ] }] }).store.categories[0].cards[0];
    const md = M.cardToMarkdown(c);
    ok(md.indexOf('## [L] T \u2691\nTags: Tag A\n\n- [x] x\n- [ ] y\n') >= 0, 'tasks section');
    ok(md.indexOf('## Links\n\n- [Doc](https://e.com)\n- Nope\n') >= 0, 'links section');
    ok(md.indexOf('## Time\n\nTime: 30 min of 1 h 30 min\n') >= 0, 'time section');
    ok(/## Note\n\nhello\n$/.test(md), 'note section last');
    ok(md.indexOf('Progress: 1 of 2 tasks') >= 0, 'progress line');
  });

  // ---------------------------------------------------------------- P1
  test('reid: new ids, edges remapped, dangling ends dropped', () => {
    const cs = [{ id: 'a', blocks: [{ id: 'b1' }] }, { id: 'c', blocks: [] }];
    const es = [
      { id: 'e1', from: { card: 'a', block: 'b1', side: 'right' }, to: { card: 'c', side: 'left' } },
      { id: 'e2', from: { card: 'a', side: 'right' }, to: { card: 'zz', side: 'left' } },
    ];
    const r = M.reid(cs, es);
    ok(r.cards[0].id !== 'a' && r.cards[0].blocks[0].id !== 'b1', 'ids replaced');
    eq(r.edges.length, 1);
    eq(r.edges[0].from.card, r.cards[0].id);
    eq(r.edges[0].from.block, r.cards[0].blocks[0].id);
    eq(r.edges[0].to.card, r.cards[1].id);
    ok(cs[0].id === 'a', 'input untouched');
  });
  test('reset: duplicated tasks unticked, time logged 0', () => {
    const R = PlannerModules;
    eq(R.reset('tasks', { tasks: [{ id: 'x', text: 't', done: true }] }).tasks[0].done, false);
    eq(R.reset('time', { target: 60, logged: 30 }), { target: 60, logged: 0 });
    eq(R.reset('note', { text: 'a' }), { text: 'a' });
  });
  test('history: undo/redo, key coalescing, redo cleared by new change', () => {
    let v = 'a';
    const hs = PlannerHistory.create(() => v, (s) => (v = s));
    hs.checkpoint('k'); v = 'b'; hs.checkpoint('k'); v = 'c'; // same key: one step
    ok(hs.undo(), 'undo'); eq(v, 'a');
    ok(hs.redo(), 'redo'); eq(v, 'c');
    hs.undo(); hs.checkpoint(); v = 'z';
    ok(!hs.canRedo(), 'redo cleared');
    ok(!PlannerHistory.create(() => v, () => {}).undo(), 'empty undo is false');
  });
  test('store: save() cancels a pending debounced save', () => {
    const fake = (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, x) => (m[k] = String(x)), m }; })();
    const old = S.ls; S.ls = fake;
    try {
      S.saveSoon({ v: 2, current: null, categories: [], tag: 'stale' });
      S.save({ v: 2, current: null, categories: [], tag: 'fresh' });
      S.flush();
      ok(JSON.parse(fake.m[S.KEY2]).tag === 'fresh', 'stale pending did not overwrite');
    } finally { S.ls = old; }
  });
  test('model: card icon is kept and capped', () => {
    const c = M.cleanCard({ id: 'a', title: 'x', icon: '\ud83d\udcda' }, false, () => 'a');
    ok(c.icon === '\ud83d\udcda', 'icon kept');
    ok(M.cleanCard({ id: 'b', icon: 'x'.repeat(30) }, false, () => 'b').icon.length <= 8, 'icon capped');
  });
};
