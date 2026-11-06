// Planner app controller (P1): category tabs, canvas / list views, toolbar, undo, import / export, hash routing.
(function () {
  'use strict';
  const G = window,
    h = G.PlannerUI.h,
    R = G.PlannerModules,
    M = G.PlannerModel,
    U = R.util,
    St = G.PlannerStore,
    MG = G.PlannerMigrate,
    C = G.PlannerCard;
  const $ = (id) => document.getElementById(id);
  const els = { cats: $('cats'), tool: $('toolbar'), view: $('view'), notice: $('notice') };

  const loaded = St.load({ persist: true }); // writes v2 once; v1 stays byte-identical
  const app = {
    store: loaded.store,
    editing: false, // every load, category switch and card switch starts in reading mode
    snap: true,
    selected: null,
    selectedEdge: null,
    newColor: 'lav',
    mode: 'canvas', // 'canvas' | 'list'
    listId: null,
    canvas: null,
    list: null,
  };
  const toast = (m, o) => G.QmlUI.toast(m, o);
  app.toast = toast;

  // ---- store access
  if (!app.store.categories.length) {
    const c = M.newCategory('Plans');
    app.store.categories.push(c);
    app.store.current = c.id;
  }
  app.cat = () => app.store.categories.filter((c) => c.id === app.store.current)[0] || app.store.categories[0];
  app.card = (id) => app.cat().cards.filter((k) => k.id === id)[0] || null;
  const topZ = () => app.cat().cards.reduce((m, k) => Math.max(m, k.z), 0);

  function showNotice() {
    els.notice.hidden = !St.failed;
    els.notice.textContent = St.failed ? 'This browser can\u2019t store data here. Use Export to keep your plans.' : '';
  }
  app.save = (now) => {
    if (now) St.save(app.store);
    else St.saveSoon(app.store);
    showNotice();
    if (!now) setTimeout(showNotice, 450);
  };

  // ---- history
  const hist = G.PlannerHistory.create(
    () => JSON.stringify(app.store),
    (s) => {
      const views = {};
      app.store.categories.forEach((c) => (views[c.id] = c.view)); // undo never moves the camera
      const st = M.cleanStore(JSON.parse(s), false);
      st.categories.forEach((c) => {
        if (views[c.id]) c.view = views[c.id];
      });
      app.store = st;
      if (!st.categories.length) {
        const c = M.newCategory('Plans');
        st.categories.push(c);
        st.current = c.id;
      }
      if (app.selected && !app.card(app.selected)) app.selected = null;
      if (app.mode === 'list' && !app.card(app.listId)) app.mode = 'canvas';
      St.save(app.store);
      showNotice();
      render();
    }
  );
  app.checkpoint = (k) => hist.checkpoint(k);
  app.undo = () => hist.undo() || toast('Nothing to undo.');
  app.redo = () => hist.redo() || toast('Nothing to redo.');
  app.undoable = (msg, fn, cardId) => {
    app.checkpoint();
    fn();
    app.save(true);
    if (app.mode === 'list' && !app.card(app.listId)) {
      app.mode = 'canvas';
      render();
    } else if (cardId && app.canvas && app.mode === 'canvas') app.canvas.renderCard(cardId);
    else render();
    toast(msg, { label: 'Undo', onClick: app.undo });
  };

  // ---- rendering
  app.renderCard = (id, focusId) => {
    if (app.mode === 'list' || !app.canvas) return render(focusId);
    app.canvas.renderCard(id, focusId);
  };
  app.refreshCard = (id) => {
    if (app.mode === 'list' && app.list) app.list.refresh();
    else if (app.canvas) app.canvas.refreshCard(id);
  };
  app.selectionChanged = () => renderTool();
  app.render = render;

  function render(focusId) {
    if (app.selectedEdge && !app.cat().edges.some((e) => e.id === app.selectedEdge)) app.selectedEdge = null;
    const keep = app.mode === 'list' ? els.view.scrollTop : 0;
    els.view.textContent = '';
    els.view.classList.toggle('scroll', app.mode === 'list');
    app.canvas = null;
    app.list = null;
    renderCats();
    renderTool();
    const card = app.mode === 'list' ? app.card(app.listId) : null;
    if (card) {
      const wrap = h('div', { class: 'listwrap' });
      els.view.append(wrap);
      app.list = G.PlannerList.render(app, wrap, card);
      els.view.scrollTop = keep;
    } else {
      app.mode = 'canvas';
      els.view.classList.remove('scroll');
      app.canvas = G.PlannerCanvas.create(app);
      els.view.append(app.canvas.el);
      app.canvas.renderAll();
      if (!app.cat().cards.length)
        els.view.append(h('div', { class: 'emptyhint' }, h('h1', null, 'Empty canvas'),
          h('p', null, 'Press Edit, then double-click the canvas or use + Card. Double-click a card to open the plan.')));
    }
    const f = focusId && document.getElementById(focusId);
    if (f) f.focus();
  }

  function renderCats() {
    const cats = app.store.categories;
    const nav = h('div', { class: 'cattabs', role: 'tablist', 'aria-label': 'Categories' });
    cats.forEach((c, i) => {
      const on = c.id === app.cat().id;
      nav.append(h('button', {
        class: 'cat' + (on ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(on), 'data-c': c.color,
        title: 'Double-click to rename',
        onclick: () => switchCat(c.id),
        ondblclick: () => renameCat(c),
      }, c.name));
    });
    nav.append(h('button', { class: 'cat add', type: 'button', 'aria-label': 'New category', title: 'New category', onclick: newCat }, '+'));
    const c = app.cat(),
      i = cats.indexOf(c);
    els.cats.textContent = '';
    els.cats.append(nav, G.PlannerUI.menu('\u22ef', [
      { text: 'Rename', fn: () => renameCat(c) },
      { text: 'Change colour', fn: () => catEdit(() => (c.color = M.COLORS[(M.COLORS.indexOf(c.color) + 1) % M.COLORS.length])) },
      { text: 'Move left', fn: () => moveCat(i, -1) },
      { text: 'Move right', fn: () => moveCat(i, 1) },
      { text: 'Duplicate', fn: dupCat },
      { text: 'Delete', fn: delCat },
    ], 'catmenu'));
  }
  function catEdit(fn) {
    app.checkpoint();
    fn();
    app.save(true);
    renderCats();
  }
  function switchCat(id) {
    if (id === app.store.current && app.mode === 'canvas') return;
    app.store.current = id;
    app.selected = null;
    app.selectedEdge = null;
    app.editing = false;
    app.mode = 'canvas';
    app.save(true);
    render();
  }
  function newCat() {
    if (app.store.categories.length >= M.LIMITS.categories) return toast('Too many categories.');
    G.QmlUI.prompt('Category name', 'New category', { ok: 'Create' }).then((t) => {
      if (t === null) return;
      app.checkpoint();
      const c = M.newCategory(t.trim() || 'New category');
      c.order = app.store.categories.length;
      app.store.categories.push(c);
      app.store.current = c.id;
      app.selected = null;
      app.editing = false;
      app.mode = 'canvas';
      app.save(true);
      render();
    });
  }
  function renameCat(c) {
    G.QmlUI.prompt('Category name', c.name, { ok: 'Rename' }).then((t) => {
      if (t === null || !t.trim()) return;
      catEdit(() => (c.name = t.trim().slice(0, 40)));
    });
  }
  function moveCat(i, d) {
    const a = app.store.categories,
      j = i + d;
    if (j < 0 || j >= a.length) return;
    app.checkpoint();
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
    a.forEach((c, k) => (c.order = k));
    app.save(true);
    renderCats();
  }
  function dupCat() {
    if (app.store.categories.length >= M.LIMITS.categories) return toast('Too many categories.');
    const c = app.cat();
    app.checkpoint();
    const r = M.reid(c.cards, c.edges);
    r.cards.forEach((k) => (k.blocks = k.blocks.map((b) => Object.assign(b, { data: R.reset(b.type, b.data) }))));
    const n = Object.assign(JSON.parse(JSON.stringify(c)), { id: U.uid(), name: (c.name + ' (copy)').slice(0, 40), cards: r.cards, edges: r.edges });
    n.order = app.store.categories.length;
    app.store.categories.push(n);
    app.store.current = n.id;
    app.selected = null;
    app.editing = false;
    app.mode = 'canvas';
    app.save(true);
    render();
  }
  function delCat() {
    const c = app.cat();
    app.checkpoint();
    app.store.categories = app.store.categories.filter((k) => k.id !== c.id);
    if (!app.store.categories.length) app.store.categories.push(M.newCategory('Plans'));
    app.store.current = app.store.categories[0].id;
    app.selected = null;
    app.editing = false;
    app.mode = 'canvas';
    app.save(true);
    render();
    toast('Category \u201c' + c.name + '\u201d deleted', { label: 'Undo', onClick: app.undo });
  }

  // ---- cards
  app.setEditing = (on, focusId) => {
    app.editing = on;
    render(focusId);
  };
  app.openList = (id) => {
    app.mode = 'list';
    app.listId = id;
    app.selected = id;
    render();
  };
  app.addCard = (pos) => {
    const cat = app.cat();
    if (cat.cards.length >= M.LIMITS.cards) return toast('This category is full.');
    if (app.mode !== 'canvas') return;
    const p = pos || (app.canvas ? { x: app.canvas.centerWorld().x - 170, y: app.canvas.centerWorld().y - 60 } : { x: 0, y: 0 });
    app.checkpoint();
    const c = M.newCard({ id: U.uid(), title: 'New plan', x: p.x, y: p.y, z: topZ() + 1, color: 'lav' });
    cat.cards.push(c);
    app.save(true);
    app.canvas.select(c.id);
    app.canvas.renderCard(c.id, 'ct-' + c.id);
    const f = document.getElementById('ct-' + c.id);
    if (f) f.select();
  };
  app.duplicateCard = (id) => {
    const cat = app.cat(),
      c = app.card(id);
    if (!c || cat.cards.length >= M.LIMITS.cards) return;
    app.checkpoint();
    const n = M.reid([c], []).cards[0];
    n.blocks.forEach((b) => (b.data = R.reset(b.type, b.data)));
    n.title = (c.title + ' (copy)').slice(0, 80);
    n.x = c.x + 30;
    n.y = c.y + 30;
    n.z = topZ() + 1;
    cat.cards.push(n);
    app.selected = n.id;
    app.save(true);
    app.canvas.renderCard(n.id);
    app.canvas.select(n.id);
  };
  app.deleteCard = (id) => {
    const cat = app.cat(),
      c = app.card(id);
    if (!c) return;
    app.undoable('Card \u201c' + c.title + '\u201d deleted', () => {
      cat.cards = cat.cards.filter((k) => k.id !== id);
      cat.edges = cat.edges.filter((e) => e.from.card !== id && e.to.card !== id);
      if (app.selected === id) app.selected = null;
    }, id);
  };
  // ---- links (card-level edges)
  const edge = (id) => app.cat().edges.filter((e) => e.id === id)[0] || null;
  const edgeDone = () => { app.save(true); if (app.canvas) app.canvas.drawEdges(); renderTool(); };
  app.addEdge = (fromId, side, toId) => {
    const cat = app.cat();
    if (!app.card(fromId) || !app.card(toId) || fromId === toId) return;
    if (cat.edges.some((e) => e.from.card === fromId && e.to.card === toId && !e.from.block && !e.to.block)) return toast('Already linked.');
    if (cat.edges.length >= M.LIMITS.edges) return toast('Too many links.');
    app.checkpoint();
    const e = { id: U.uid(), from: { card: fromId, side: side || 'auto' }, to: { card: toId, side: 'auto' }, label: '', color: 'sage', style: 'curve', arrow: 'end' };
    cat.edges.push(e);
    app.save(true);
    app.canvas.selectEdge(e.id);
  };
  app.updateEdge = (id, fn) => {
    const e = edge(id);
    if (!e) return;
    app.checkpoint();
    fn(e);
    edgeDone();
  };
  app.deleteEdge = (id) => {
    if (!edge(id)) return;
    app.undoable('Link deleted', () => {
      const cat = app.cat();
      cat.edges = cat.edges.filter((e) => e.id !== id);
      if (app.selectedEdge === id) app.selectedEdge = null;
    });
  };
  const cycle = (a, v) => a[(a.indexOf(v) + 1) % a.length];
  function edgeTools(t) {
    const e = edge(app.selectedEdge);
    if (!e) return;
    t.push(
      btn('Style: ' + e.style, () => app.updateEdge(e.id, (x) => (x.style = cycle(['curve', 'straight', 'step'], x.style)))),
      btn('Arrow: ' + e.arrow, () => app.updateEdge(e.id, (x) => (x.arrow = cycle(['end', 'both', 'none'], x.arrow)))),
      btn('Link colour', () => app.updateEdge(e.id, (x) => (x.color = cycle(M.COLORS, x.color)))),
      btn('Label', () => G.QmlUI.prompt('Link label', e.label, { ok: 'Set' }).then((v) => { if (v !== null) app.updateEdge(e.id, (x) => (x.label = v.trim().slice(0, 80))); })),
      btn('Swap', () => app.updateEdge(e.id, (x) => { const f = x.from; x.from = x.to; x.to = f; })),
      btn('Delete link', () => app.deleteEdge(e.id)));
  }
  function addTemplate(t) {
    const cat = app.cat();
    if (app.mode !== 'canvas') return;
    if (cat.cards.length >= M.LIMITS.cards) return toast('This category is full.');
    app.checkpoint();
    const src = MG.fromV1({ plans: [t.plan] }, { strict: true }).store.categories[0].cards[0];
    const n = M.reid([src], []).cards[0],
      p = app.canvas.centerWorld();
    n.x = Math.round(p.x - n.w / 2);
    n.y = Math.round(p.y - 60);
    n.z = topZ() + 1;
    cat.cards.push(n);
    app.selected = n.id;
    app.save(true);
    app.canvas.renderCard(n.id);
    app.canvas.select(n.id);
    toast('Template added.');
  }

  // ---- toolbar
  function selectedPlan() {
    const id = app.mode === 'list' ? app.listId : app.selected,
      c = id && app.card(id);
    return c && c.kind === 'plan' ? c : null;
  }
  function jumpNext() {
    if (app.mode === 'list') {
      const id = G.PlannerList.nextBlock(app.card(app.listId));
      return id ? app.list.jump(id) : toast('Nothing left to do.');
    }
    const sel = selectedPlan(),
      all = app.cat().cards.filter((c) => c.kind === 'plan').sort((a, b) => a.y - b.y || a.x - b.x);
    const order = sel ? [sel].concat(all.filter((c) => c !== sel)) : all;
    for (const c of order)
      for (const b of c.blocks)
        if (R.nextUp(b.type, b.data)) {
          app.canvas.jump(b.id);
          return;
        }
    toast('Nothing left to do.');
  }
  function btn(text, fn, o) {
    o = o || {};
    return h('button', {
      class: 'btn' + (o.main ? ' main' : '') + (o.sm ? ' sm' : ''), type: 'button', onclick: fn,
      'aria-pressed': o.pressed == null ? null : String(o.pressed), title: o.title, 'aria-label': o.label,
    }, text);
  }
  function renderTool() {
    const ed = app.editing,
      list = app.mode === 'list',
      tpls = G.PLANNER_TEMPLATES || [];
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: importFile });
    const t = [];
    t.push(btn(ed ? 'Done editing' : 'Edit', () => app.setEditing(!ed), { main: ed, pressed: ed }));
    if (!ed) t.push(btn('\u25b6 Next up', jumpNext, { main: true }));
    if (ed && !list) t.push(btn('+ Card', () => app.addCard()));
    if (ed && !list && app.selected && app.card(app.selected)) {
      const others = app.cat().cards.filter((k) => k.id !== app.selected);
      if (others.length) t.push(G.PlannerUI.menu('Link to\u2026', others.map((k) => ({ text: k.title || 'Untitled', fn: () => app.addEdge(app.selected, 'auto', k.id) }))));
    }
    if (ed && !list && app.selectedEdge) edgeTools(t);
    if (!list && tpls.length) t.push(G.PlannerUI.menu('Templates', tpls.map((x) => ({ text: x.name, fn: () => addTemplate(x) }))));
    if (list) t.push(btn('\u2190 Canvas', () => { const id = app.listId; app.mode = 'canvas'; render(); app.focusCard(id); }));
    else t.push(btn('List view', () => { const c = selectedPlan(); c ? app.openList(c.id) : toast('Select a plan card first.'); }));
    if (!list) {
      t.push(btn('Fit', () => app.canvas.fitAll(), { title: 'Fit all cards' }), btn('100%', () => app.canvas.resetZoom(), { title: 'Reset zoom' }));
      if (ed) t.push(btn('Snap', () => { app.snap = !app.snap; renderTool(); }, { pressed: app.snap, title: 'Snap to grid' }));
    }
    if (ed) t.push(btn('\u21b6', app.undo, { label: 'Undo', title: 'Undo (Ctrl+Z)' }), btn('\u21b7', app.redo, { label: 'Redo', title: 'Redo (Ctrl+Shift+Z)' }));
    t.push(G.PlannerUI.menu('Export', [
      { text: 'This card (.json)', fn: () => exportCard('json') },
      { text: 'This card as Markdown (.md)', fn: () => exportCard('md') },
      { text: 'This category (.json)', fn: () => exportJson([app.cat()], slug(app.cat().name) + '.category.json') },
      { text: 'Everything (.json)', fn: () => exportJson(app.store.categories, 'qmlcamp-planner.json') },
    ]), btn('Import', () => file.click()), file);
    els.tool.textContent = '';
    els.tool.append(...t);
  }

  // ---- export / import
  const slug = (t) =>
    (t || 'plan').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'plan';
  function download(name, text, type) {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportJson(cats, name) {
    const data = { app: 'qmlcamp-planner', v: 2, exported: new Date().toISOString(), categories: JSON.parse(JSON.stringify(cats)) };
    download(name, JSON.stringify(data, null, 2), 'application/json');
    toast('Exported ' + cats.length + (cats.length === 1 ? ' category.' : ' categories.'));
  }
  function exportCard(kind) {
    const c = selectedPlan() || (app.selected && app.card(app.selected));
    if (!c) return toast('Select a card first.');
    if (kind === 'md') {
      if (c.kind !== 'plan') return toast('Only plan cards export as Markdown.');
      download(slug(c.title) + '.md', M.cardToMarkdown(c), 'text/markdown');
    } else {
      const es = app.cat().edges.filter((e) => e.from.card === c.id && e.to.card === c.id);
      const data = { app: 'qmlcamp-planner', v: 2, exported: new Date().toISOString(), cards: [JSON.parse(JSON.stringify(c))], edges: es };
      download(slug(c.title) + '.card.json', JSON.stringify(data, null, 2), 'application/json');
    }
    toast('Exported.');
  }
  // Imported cards go below what is already on the canvas; ids are always new (nothing is overwritten).
  function placeBelow(cat, cards) {
    let maxY = -Infinity,
      minX = Infinity;
    cat.cards.forEach((c) => {
      maxY = Math.max(maxY, c.y + (app.canvas ? app.canvas.height(c.id) || 200 : 200));
      minX = Math.min(minX, c.x);
    });
    if (!isFinite(maxY)) {
      maxY = 0;
      minX = 0;
    } else maxY += 40;
    const x0 = Math.min.apply(null, cards.map((c) => c.x)),
      y0 = Math.min.apply(null, cards.map((c) => c.y));
    let z = topZ();
    cards.forEach((c) => {
      c.x = Math.round(c.x - x0 + minX);
      c.y = Math.round(c.y - y0 + maxY);
      c.z = ++z;
    });
  }
  function importFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2e6) return toast('File too large (max 2 MB).');
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        app.checkpoint();
        let msg;
        if (M.isObj(d) && Array.isArray(d.categories)) {
          const room = M.LIMITS.categories - app.store.categories.length;
          const cats = d.categories.slice(0, Math.max(0, room)).map((c, i) => {
            const t = M.cleanCategory(c, true, () => 'imp', i),
              rr = M.reid(t.cards, t.edges);
            t.id = U.uid();
            t.cards = rr.cards;
            t.edges = rr.edges;
            t.order = app.store.categories.length + i;
            return t;
          });
          if (!cats.length) throw new Error('bad');
          app.store.categories.push.apply(app.store.categories, cats);
          app.store.current = cats[0].id;
          app.mode = 'canvas';
          msg = 'Imported ' + cats.length + (cats.length === 1 ? ' category.' : ' categories.');
        } else {
          let cards, edges;
          if (M.isObj(d) && Array.isArray(d.cards)) {
            const t = M.cleanCategory({ id: 'imp', name: 'x', cards: d.cards, edges: d.edges }, true, () => 'imp', 0);
            cards = t.cards;
            edges = t.edges;
          } else {
            const list = MG.plansFromAny(d);
            if (!list) throw new Error('bad');
            cards = MG.fromV1({ plans: list }, { strict: true }).store.categories[0].cards;
            edges = [];
          }
          if (!cards.length) throw new Error('bad');
          const cat = app.cat();
          cards = cards.slice(0, Math.max(0, M.LIMITS.cards - cat.cards.length));
          if (!cards.length) return toast('This category is full.');
          const rr = M.reid(cards, edges);
          placeBelow(cat, rr.cards);
          cat.cards.push.apply(cat.cards, rr.cards);
          cat.edges.push.apply(cat.edges, rr.edges.slice(0, Math.max(0, M.LIMITS.edges - cat.edges.length)));
          app.mode = 'canvas';
          app.selected = rr.cards[0].id;
          msg = 'Imported ' + rr.cards.length + (rr.cards.length === 1 ? ' card.' : ' cards.');
        }
        app.editing = false;
        app.save(true);
        render();
        if (app.selected) app.focusCard(app.selected);
        toast(msg);
      } catch (err) {
        toast('This file is not a valid planner export.');
      }
    };
    r.onerror = () => toast('Could not read the file.');
    r.readAsText(f);
  }

  // ---- routing: #cat=<id>&card=<id>  (and the old #plan=<id> alias)
  function applyHash() {
    const g = (k) => {
      const m = new RegExp('[#&]' + k + '=([\\w-]+)').exec(G.location.hash);
      return m ? m[1] : null;
    };
    const cardId = g('card') || g('plan'),
      catId = g('cat');
    const cats = app.store.categories;
    let cat = null;
    if (cardId) cat = cats.filter((c) => c.cards.some((k) => k.id === cardId))[0] || null;
    if (!cat && catId) cat = cats.filter((c) => c.id === catId)[0] || null;
    if (!cat) return null;
    app.store.current = cat.id;
    return cat.cards.some((k) => k.id === cardId) ? cardId : null;
  }
  app.focusCard = (id) => {
    const c = id && app.card(id);
    if (!c || !app.canvas) return;
    app.canvas.select(id);
    app.canvas.centerOn(id, 1);
    app.canvas.flashCard(id);
  };

  // ---- keyboard: undo / redo outside text fields (fields keep their own native undo)
  G.document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      app.undo();
    } else if ((k === 'z' && e.shiftKey) || k === 'y') {
      e.preventDefault();
      app.redo();
    }
  });
  G.addEventListener('hashchange', () => {
    const before = app.store.current,
      id = applyHash();
    if (!id && app.store.current === before) return;
    app.editing = false;
    app.mode = 'canvas';
    app.save(true);
    render();
    app.focusCard(id);
  });

  // ---- boot
  const first = applyHash() || (loaded.source === 'v1' || loaded.source === 'seed' ? loaded.focus : null);
  if (loaded.source === 'corrupt') toast('Stored planner data was unreadable. A backup copy was kept.');
  showNotice();
  render();
  app.focusCard(first);
  G.PlannerApp = app;
})();
