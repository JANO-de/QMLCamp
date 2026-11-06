// PlannerModel: v2 data model. Whitelist sanitising for categories, cards, blocks, edges.
// Pure functions (no DOM, no storage). Unknown fields are dropped EXCEPT the `data` of a block/widget
// whose module is not registered: that is kept untouched so removing a module file never loses data.
(function (G) {
  'use strict';
  if (G.PlannerModel) return;
  const R = G.PlannerModules,
    U = R.util;

  const COLORS = ['rose', 'butter', 'sage', 'sky', 'lav', 'peach'];
  const KINDS = ['plan', 'widget', 'frame', 'text'];
  const SIDES = ['auto', 'left', 'right', 'top', 'bottom'];
  const STYLES = ['curve', 'straight', 'step'];
  const ARROWS = ['end', 'both', 'none'];
  const LIMITS = { categories: 40, cards: 300, blocks: 200, edges: 1000, tags: 40 };
  const TYPE_ID = /^[a-z][a-z0-9-]*$/;

  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const color = (c, d) => (COLORS.indexOf(c) >= 0 ? c : d);
  const pick = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const flt = (x, min, max, d) => {
    x = Number(x);
    return isFinite(x) ? Math.max(min, Math.min(max, x)) : d;
  };
  const int = (x, min, max, d) => Math.round(flt(x, min, max, d));
  // Unique ids inside one array: a missing or repeated id is replaced.
  const seen = () => {
    const s = {};
    return (id) => {
      id = U.str(id, 20);
      while (!id || s[id]) id = U.uid();
      s[id] = 1;
      return id;
    };
  };
  // JSON-safe deep copy for data of unregistered modules (never dropped, only size-capped).
  const keep = (x) => {
    try {
      const s = JSON.stringify(x === undefined ? {} : x);
      return s.length <= 1e6 ? JSON.parse(s) : {};
    } catch (e) {
      return {};
    }
  };

  function cleanTags(list) {
    const uq = seen();
    return U.arr(list, LIMITS.tags).map((t) => {
      t = isObj(t) ? t : {};
      return { id: uq(t.id), name: U.str(t.name, 30), color: color(t.color, 'lav') };
    });
  }

  // ok: map of valid tag ids of the card.
  function cleanBlock(b, ok, strict, uq) {
    b = isObj(b) ? b : {};
    const type = typeof b.type === 'string' && b.type.length <= 40 && TYPE_ID.test(b.type) ? b.type : 'tasks';
    const data = R.has(type) ? R.sanitize(type, isObj(b.data) ? b.data : {}, strict) : keep(b.data);
    return {
      id: uq ? uq(b.id) : U.str(b.id, 20) || U.uid(),
      type: type,
      label: U.str(b.label, 16),
      title: U.str(b.title, 120),
      exam: !!b.exam,
      tags: U.arr(b.tags, LIMITS.tags).filter((i) => typeof i === 'string' && ok[i]),
      data: data,
    };
  }

  function cleanWidget(w, strict) {
    if (!isObj(w) || typeof w.type !== 'string' || w.type.length > 40 || !TYPE_ID.test(w.type)) return null;
    return {
      type: w.type,
      data: R.has(w.type) ? R.sanitize(w.type, isObj(w.data) ? w.data : {}, strict) : keep(w.data),
    };
  }

  function cleanCard(c, strict, uq) {
    c = isObj(c) ? c : {};
    const kind = pick(c.kind, KINDS, 'plan');
    const tags = cleanTags(c.tags),
      ok = {};
    tags.forEach((t) => (ok[t.id] = 1));
    const bq = seen();
    return {
      id: uq(c.id),
      kind: kind,
      x: flt(c.x, -1e6, 1e6, 0),
      y: flt(c.y, -1e6, 1e6, 0),
      w: flt(c.w, 120, 4000, 340),
      h: c.h == null ? null : flt(c.h, 40, 4000, null),
      z: int(c.z, 0, 1e6, 0),
      color: color(c.color, 'lav'),
      icon: U.str(c.icon, 8),
      collapsed: !!c.collapsed,
      title: U.str(c.title, 80) || (kind === 'plan' ? 'Untitled plan' : ''),
      tags: tags,
      blocks: U.arr(c.blocks, LIMITS.blocks).map((b) => cleanBlock(b, ok, strict, bq)),
      widget: cleanWidget(c.widget, strict),
    };
  }

  // idx: { cardId: { blockId: 1 } }. Returns null if the end cannot be kept.
  function cleanEnd(e, idx, side) {
    if (!isObj(e)) return null;
    const card = U.str(e.card, 20);
    if (!card || !idx[card]) return null;
    const o = { card: card, side: pick(e.side, SIDES, side) };
    const b = U.str(e.block, 20);
    if (b && idx[card][b]) o.block = b; // missing block: edge falls back to the card
    return o;
  }
  const endKey = (e) => e.card + '/' + (e.block || '');

  function cleanEdges(list, idx) {
    const uq = seen(),
      dup = {};
    const out = [];
    U.arr(list, LIMITS.edges).forEach((e) => {
      e = isObj(e) ? e : {};
      const from = cleanEnd(e.from, idx, 'right'),
        to = cleanEnd(e.to, idx, 'left');
      if (!from || !to) return;
      const k = endKey(from) + '>' + endKey(to);
      if (endKey(from) === endKey(to) || dup[k]) return; // self-loop / duplicate
      dup[k] = 1;
      out.push({
        id: uq(e.id),
        from: from,
        to: to,
        label: U.str(e.label, 80),
        color: color(e.color, 'sage'),
        style: pick(e.style, STYLES, 'curve'),
        arrow: pick(e.arrow, ARROWS, 'end'),
      });
    });
    return out;
  }

  function cleanCategory(c, strict, uq, i) {
    c = isObj(c) ? c : {};
    const cq = seen();
    const cards = U.arr(c.cards, LIMITS.cards).map((k) => cleanCard(k, strict, cq));
    const idx = {};
    cards.forEach((k) => {
      idx[k.id] = {};
      k.blocks.forEach((b) => (idx[k.id][b.id] = 1));
    });
    const v = isObj(c.view) ? c.view : {};
    return {
      id: uq(c.id),
      name: U.str(c.name, 40) || 'Category',
      color: color(c.color, 'lav'),
      order: int(c.order, 0, 1e6, i),
      view: { x: flt(v.x, -1e6, 1e6, 0), y: flt(v.y, -1e6, 1e6, 0), zoom: flt(v.zoom, 0.2, 3, 1) },
      cards: cards,
      edges: cleanEdges(c.edges, idx),
    };
  }

  function cleanStore(s, strict) {
    s = isObj(s) ? s : {};
    const uq = seen();
    const cats = U.arr(s.categories, LIMITS.categories).map((c, i) => cleanCategory(c, strict, uq, i));
    const cur = cats.some((c) => c.id === s.current) ? s.current : (cats[0] && cats[0].id) || null;
    return { v: 2, current: cur, categories: cats };
  }

  // Markdown of one plan card (port of the v1 toMd; block bodies come from the modules).
  function cardToMarkdown(p) {
    const names = {};
    p.tags.forEach((t) => (names[t.id] = t.name));
    let tt = 0,
      td = 0;
    p.blocks.forEach((b) => {
      const s = R.stats(b.type, b.data);
      tt += s.total;
      td += s.done;
    });
    const out = ['# ' + p.title, ''];
    if (tt) out.push('Progress: ' + td + ' of ' + tt + ' tasks', '');
    p.blocks.forEach((b) => {
      const m = R.get(b.type);
      out.push('## ' + (b.label ? '[' + b.label + '] ' : '') + (b.title || (m ? m.name : b.type)) + (b.exam ? ' \u2691' : ''));
      const tg = b.tags.map((i) => names[i]).filter(Boolean);
      if (tg.length) out.push('Tags: ' + tg.join(', '));
      out.push('');
      const body = R.toMarkdown(b.type, b.data);
      if (body) out.push(body);
      out.push('');
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  // Fresh ids for copies/imports (cards, blocks, edges). Edge ends are remapped; ends that do not map are dropped.
  function reid(cards, edges) {
    const cm = {},
      bm = {};
    const out = cards.map((c) => {
      const n = JSON.parse(JSON.stringify(c)),
        id = U.uid();
      cm[c.id] = id;
      n.id = id;
      n.blocks.forEach((b, i) => {
        const nb = U.uid();
        bm[c.id + '/' + c.blocks[i].id] = nb;
        b.id = nb;
      });
      return n;
    });
    const end = (e) => {
      if (!e || !cm[e.card]) return null;
      const o = { card: cm[e.card], side: e.side };
      if (e.block && bm[e.card + '/' + e.block]) o.block = bm[e.card + '/' + e.block];
      return o;
    };
    const es = [];
    (edges || []).forEach((e) => {
      const f = end(e.from),
        t = end(e.to);
      if (f && t) es.push(Object.assign({}, e, { id: U.uid(), from: f, to: t }));
    });
    return { cards: out, edges: es };
  }
  const newCard = (props) => cleanCard(Object.assign({ kind: 'plan' }, props), false, seen());
  const newCategory = (name) => cleanCategory({ id: U.uid(), name: name, cards: [], edges: [] }, false, seen(), 0);

  G.PlannerModel = {
    reid, newCard, newCategory,
    COLORS, KINDS, SIDES, STYLES, ARROWS, LIMITS,
    isObj, cleanTags, cleanBlock, cleanCard, cleanEdges, cleanCategory, cleanStore, cardToMarkdown,
    emptyStore: () => ({ v: 2, current: null, categories: [] }),
  };
})(window);
