// PlannerCanvas: canvas of one category. A <div class="world"> is moved/scaled with a CSS transform; cards are
// absolutely positioned DOM elements inside it; links are one SVG layer under the cards.
// Bounded space: a "board" = cards' bounding box + padding; grows/shrinks with the cards.
// Pointer Events: drag empty space = pan; wheel / pinch = zoom; Edit: grip = move, corner = resize width,
// drag from a side port onto another card = link. Links are card-level.
(function (G) {
  'use strict';
  if (G.PlannerCanvas) return;
  const h = G.PlannerUI.h,
    C = G.PlannerCard,
    M = G.PlannerModel;
  const MAX_Z = 3, GRID = 10, MIN_W = 220, PAD = 200, DEF = { w: 1000, h: 600 };
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  };

  function create(app) {
    const cat = app.cat(),
      view = cat.view;
    if (view.x === 0 && view.y === 0 && view.zoom === 1) {
      view.x = 24;
      view.y = 24;
    }
    const vp = h('div', { class: 'vp' + (app.editing ? ' editing' : ''), tabindex: -1, role: 'application', 'aria-label': 'Planner canvas' });
    const world = h('div', { class: 'world' });
    const board = h('div', { class: 'board', 'aria-hidden': 'true' });
    const svg = svgEl('svg', { class: 'edges' });
    const defs = svgEl('defs');
    M.COLORS.forEach((c) => {
      const mk = svgEl('marker', { id: 'ar-' + c, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
      mk.append(svgEl('path', { d: 'M0 0L10 5L0 10z', style: 'fill:var(--' + c + ')' }));
      defs.append(mk);
    });
    const gE = svgEl('g');
    svg.append(defs, gE);
    world.append(board, svg);
    vp.append(world);
    const els = {},
      ptrs = new Map();
    let g = null,
      bnd = null,
      tmp = null;

    const snap = (v) => (app.snap ? Math.round(v / GRID) * GRID : v);
    const cardEl = (t) => (t && t.closest ? t.closest('.pc') : null);
    const rect = () => vp.getBoundingClientRect();
    const height = (id) => (els[id] ? els[id].offsetHeight : 0);
    const toWorld = (cx, cy) => {
      const r = rect();
      return { x: (cx - r.left - view.x) / view.zoom, y: (cy - r.top - view.y) / view.zoom };
    };

    // ---- bounded space
    function bounds() {
      if (bnd) return bnd;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      cat.cards.forEach((c) => {
        x0 = Math.min(x0, c.x);
        y0 = Math.min(y0, c.y);
        x1 = Math.max(x1, c.x + c.w);
        y1 = Math.max(y1, c.y + (height(c.id) || 160));
      });
      if (!isFinite(x0)) {
        x0 = 0;
        y0 = 0;
        x1 = DEF.w - 2 * PAD;
        y1 = DEF.h - 2 * PAD;
      }
      bnd = { x0: x0 - PAD, y0: y0 - PAD, x1: x1 + PAD, y1: y1 + PAD };
      return bnd;
    }
    function minZoom() {
      const b = bounds(),
        W = vp.clientWidth,
        H = vp.clientHeight;
      if (!W || !H) return 0.2;
      return Math.max(0.2, Math.min(Math.min(W / (b.x1 - b.x0), H / (b.y1 - b.y0)), 0.5));
    }
    const clampZ = (z) => Math.max(minZoom(), Math.min(MAX_Z, z));
    function clampView() {
      const W = vp.clientWidth,
        H = vp.clientHeight;
      if (!W || !H) return;
      const b = bounds();
      view.zoom = clampZ(view.zoom);
      const z = view.zoom;
      const cx = Math.max(b.x0, Math.min(b.x1, (W / 2 - view.x) / z)),
        cy = Math.max(b.y0, Math.min(b.y1, (H / 2 - view.y) / z));
      view.x = W / 2 - cx * z;
      view.y = H / 2 - cy * z;
    }
    function applyView() {
      clampView();
      world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.zoom + ')';
    }
    function dirty() {
      bnd = null;
      const b = bounds();
      board.style.left = b.x0 + 'px';
      board.style.top = b.y0 + 'px';
      board.style.width = b.x1 - b.x0 + 'px';
      board.style.height = b.y1 - b.y0 + 'px';
      // The SVG must own a layout box that covers the paths so pointer events hit the links.
      svg.style.left = b.x0 + 'px';
      svg.style.top = b.y0 + 'px';
      svg.style.width = b.x1 - b.x0 + 'px';
      svg.style.height = b.y1 - b.y0 + 'px';
      gE.setAttribute('transform', 'translate(' + -b.x0 + ' ' + -b.y0 + ')');
      drawEdges();
    }

    // ---- links
    const rectOf = (id) => {
      const c = app.card(id);
      return c ? { x: c.x, y: c.y, w: c.w, h: height(id) || 160 } : null;
    };
    const anchor = (r, s) =>
      s === 'left' ? { x: r.x, y: r.y + r.h / 2, nx: -1, ny: 0 }
      : s === 'right' ? { x: r.x + r.w, y: r.y + r.h / 2, nx: 1, ny: 0 }
      : s === 'top' ? { x: r.x + r.w / 2, y: r.y, nx: 0, ny: -1 }
      : { x: r.x + r.w / 2, y: r.y + r.h, nx: 0, ny: 1 };
    function autoSides(a, b) {
      const dx = b.x + b.w / 2 - (a.x + a.w / 2),
        dy = b.y + b.h / 2 - (a.y + a.h / 2);
      if (Math.abs(dx) / (a.w + b.w) > Math.abs(dy) / (a.h + b.h)) return dx > 0 ? ['right', 'left'] : ['left', 'right'];
      return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
    }
    function pathD(A, B, style) {
      if (style === 'straight') return 'M' + A.x + ' ' + A.y + 'L' + B.x + ' ' + B.y;
      if (style === 'step') {
        if (A.nx) {
          const mx = (A.x + B.x) / 2;
          return 'M' + A.x + ' ' + A.y + 'H' + mx + 'V' + B.y + 'H' + B.x;
        }
        const my = (A.y + B.y) / 2;
        return 'M' + A.x + ' ' + A.y + 'V' + my + 'H' + B.x + 'V' + B.y;
      }
      const d = Math.max(50, Math.hypot(B.x - A.x, B.y - A.y) * 0.4);
      return 'M' + A.x + ' ' + A.y + 'C' + (A.x + A.nx * d) + ' ' + (A.y + A.ny * d) + ' ' + (B.x + B.nx * d) + ' ' + (B.y + B.ny * d) + ' ' + B.x + ' ' + B.y;
    }
    function drawEdges() {
      gE.textContent = '';
      tmp = null;
      (cat.edges || []).forEach((e) => {
        const ra = rectOf(e.from.card),
          rb = rectOf(e.to.card);
        if (!ra || !rb) return;
        const au = autoSides(ra, rb);
        const A = anchor(ra, e.from.side !== 'auto' ? e.from.side : au[0]),
          B = anchor(rb, e.to.side !== 'auto' ? e.to.side : au[1]);
        const d = pathD(A, B, e.style);
        const grp = svgEl('g', {
          class: 'edge' + (app.selectedEdge === e.id ? ' sel' : '') + (app.selected && (e.from.card === app.selected || e.to.card === app.selected) ? ' hl' : ''),
          'data-id': e.id,
        });
        const line = svgEl('path', { class: 'line', d: d, style: 'stroke:var(--' + e.color + ')' });
        if (e.arrow !== 'none') line.setAttribute('marker-end', 'url(#ar-' + e.color + ')');
        if (e.arrow === 'both') line.setAttribute('marker-start', 'url(#ar-' + e.color + ')');
        grp.append(line, svgEl('path', { class: 'hit', d: d }));
        gE.append(grp);
        if (e.label) {
          const p = line.getPointAtLength(line.getTotalLength() / 2),
            t = svgEl('text', { x: p.x, y: p.y - 6 });
          t.textContent = e.label;
          grp.append(t);
        }
      });
    }

    function place(el, c) {
      el.style.left = c.x + 'px';
      el.style.top = c.y + 'px';
      el.style.width = c.w + 'px';
      el.style.zIndex = c.z + 1; // links layer is z 0
    }
    function add(c) {
      const el = C.build(app, c);
      place(el, c);
      els[c.id] = el;
      world.append(el);
      return el;
    }
    function renderAll() {
      Object.keys(els).forEach((k) => {
        els[k].remove();
        delete els[k];
      });
      cat.cards.slice().sort((a, b) => a.z - b.z).forEach(add);
      dirty();
      applyView();
    }
    function renderCard(id, focusId) {
      const c = app.card(id),
        old = els[id];
      if (!c) {
        if (old) old.remove();
        delete els[id];
      } else {
        const el = C.build(app, c);
        place(el, c);
        if (old) old.replaceWith(el);
        else world.append(el);
        els[id] = el;
        const f = focusId && document.getElementById(focusId);
        if (f) f.focus();
      }
      dirty();
    }
    function select(id, keepEdge) {
      if (app.selected === id && (keepEdge || !app.selectedEdge)) return;
      app.selected = id;
      if (!keepEdge) app.selectedEdge = null;
      Object.keys(els).forEach((k) => els[k].classList.toggle('sel', k === id));
      drawEdges();
      app.selectionChanged();
    }
    function selectEdge(id) {
      app.selectedEdge = id;
      app.selected = null;
      Object.keys(els).forEach((k) => els[k].classList.remove('sel'));
      drawEdges();
      vp.focus({ preventScroll: true });
      app.selectionChanged();
    }
    function bringFront(c) {
      let top = 0,
        same = false;
      cat.cards.forEach((k) => {
        if (k !== c) {
          top = Math.max(top, k.z);
          if (k.z >= c.z) same = true;
        }
      });
      if (!same) return;
      c.z = top + 1;
      if (els[c.id]) els[c.id].style.zIndex = c.z + 1;
      app.save();
    }
    function zoomAt(cx, cy, z) {
      z = clampZ(z);
      const r = rect(),
        wx = (cx - r.left - view.x) / view.zoom,
        wy = (cy - r.top - view.y) / view.zoom;
      view.zoom = z;
      view.x = cx - r.left - wx * z;
      view.y = cy - r.top - wy * z;
      applyView();
    }

    // ---- gestures
    const startPan = (e) => {
      g = { type: 'pan', id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      vp.classList.add('panning');
    };
    const startDrag = (e, c, el) => {
      g = { type: 'drag', id: e.pointerId, c, el, sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y, moved: false };
    };
    const startResize = (e, c, el) => {
      g = { type: 'rz', id: e.pointerId, c, el, sx: e.clientX, sy: e.clientY, w: c.w, moved: false };
      e.preventDefault();
    };
    const startLink = (e, c, side) => {
      g = { type: 'link', id: e.pointerId, c, side, sx: e.clientX, sy: e.clientY, moved: false, over: null };
      e.preventDefault();
    };
    const pts = () => Array.from(ptrs.values());
    function startPinch() {
      const [a, b] = pts();
      g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: view.zoom, vx: view.x, vy: view.y };
      vp.classList.remove('panning');
    }
    function pinchMove() {
      const [a, b] = pts();
      if (!b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1,
        c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = clampZ((g.z0 * d) / g.d0),
        r = rect(),
        wx = (g.c0.x - r.left - g.vx) / g.z0,
        wy = (g.c0.y - r.top - g.vy) / g.z0;
      view.zoom = z;
      view.x = c.x - r.left - wx * z;
      view.y = c.y - r.top - wy * z;
      applyView();
    }
    const cardAt = (x, y, not) => {
      const ce = cardEl(document.elementFromPoint(x, y));
      return ce && ce.dataset.id !== not ? ce : null;
    };

    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) return startPinch();
      if (ptrs.size > 2) return;
      const t = e.target,
        ce = cardEl(t),
        inter = t.closest('input,textarea,button,a,select,label,summary');
      const eg = t.closest && t.closest('.edge');
      if (eg) return selectEdge(eg.getAttribute('data-id'));
      if (ce) {
        const c = app.card(ce.dataset.id);
        if (!c) return;
        select(c.id);
        bringFront(c);
        if (t.closest('.port') && app.editing) startLink(e, c, t.closest('.port').dataset.side);
        else if (t.closest('.rz') && app.editing) startResize(e, c, ce);
        else if (t.closest('.chead') && !inter) app.editing ? startDrag(e, c, ce) : startPan(e);
        return;
      }
      select(null);
      startPan(e);
    });
    vp.addEventListener('pointermove', (e) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!g) return;
      if (g.type === 'pinch') return pinchMove();
      if (e.pointerId !== g.id) return;
      const dx = e.clientX - g.sx,
        dy = e.clientY - g.sy;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      if (!g.moved) {
        g.moved = true;
        try {
          vp.setPointerCapture(g.id);
        } catch (x) {}
        if (g.type === 'drag' || g.type === 'rz') app.checkpoint();
      }
      if (g.type === 'pan') {
        view.x = g.vx + dx;
        view.y = g.vy + dy;
        applyView();
      } else if (g.type === 'drag') {
        g.c.x = snap(g.cx + dx / view.zoom);
        g.c.y = snap(g.cy + dy / view.zoom);
        g.el.style.left = g.c.x + 'px';
        g.el.style.top = g.c.y + 'px';
        dirty();
      } else if (g.type === 'rz') {
        g.c.w = Math.max(MIN_W, snap(g.w + dx / view.zoom));
        place(g.el, g.c);
        dirty();
      } else if (g.type === 'link') {
        const A = anchor(rectOf(g.c.id), g.side),
          p = toWorld(e.clientX, e.clientY);
        if (!tmp) {
          tmp = svgEl('path', { class: 'tmp' });
          gE.append(tmp);
        }
        tmp.setAttribute('d', 'M' + A.x + ' ' + A.y + 'L' + p.x + ' ' + p.y);
        const over = cardAt(e.clientX, e.clientY, g.c.id);
        if (over !== g.over) {
          if (g.over) g.over.classList.remove('ltarget');
          if (over) over.classList.add('ltarget');
          g.over = over;
        }
      }
    });
    const end = (e) => {
      ptrs.delete(e.pointerId);
      if (!g) return;
      if (g.type === 'pinch') {
        if (ptrs.size < 2) {
          g = null;
          app.save();
        }
        return;
      }
      if (e.pointerId !== g.id) return;
      vp.classList.remove('panning');
      try {
        vp.releasePointerCapture(e.pointerId);
      } catch (x) {}
      const gg = g;
      g = null;
      if (gg.type === 'link') {
        if (tmp) {
          tmp.remove();
          tmp = null;
        }
        if (gg.over) gg.over.classList.remove('ltarget');
        const to = gg.moved && e.type === 'pointerup' ? cardAt(e.clientX, e.clientY, gg.c.id) : null;
        if (to) app.addEdge(gg.c.id, gg.side, to.dataset.id);
      } else if (gg.moved) app.save();
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * (e.ctrlKey ? 0.01 : 0.0015));
        zoomAt(e.clientX, e.clientY, view.zoom * k);
        app.save();
      },
      { passive: false }
    );
    vp.addEventListener('dblclick', (e) => {
      const ce = cardEl(e.target);
      if (ce && !e.target.closest('input,textarea,button,a,select,summary,.rz,.port')) {
        const c = app.card(ce.dataset.id);
        if (c && c.kind === 'plan') app.openList(c.id);
      } else if (e.target === vp || e.target === world || e.target === board) {
        if (!app.editing) return app.toast('Press Edit to add cards.');
        const p = toWorld(e.clientX, e.clientY);
        app.addCard({ x: snap(p.x - 170), y: snap(p.y - 20) });
      }
    });
    vp.addEventListener('keydown', (e) => {
      if (app.selectedEdge && e.target === vp && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        if (app.editing) app.deleteEdge(app.selectedEdge);
        return;
      }
      const ce = cardEl(e.target);
      if (!ce || e.target !== ce) return;
      const c = app.card(ce.dataset.id);
      if (!c) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (c.kind === 'plan') app.openList(c.id);
      } else if (app.editing) {
        const s = e.shiftKey ? 50 : GRID,
          d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
        if (d) {
          e.preventDefault();
          app.checkpoint('mv:' + c.id);
          c.x += d[0];
          c.y += d[1];
          place(ce, c);
          dirty();
          app.save();
        } else if (e.key === 'Delete') {
          e.preventDefault();
          app.deleteCard(c.id);
        }
      }
    });

    // ---- view helpers
    function centerOn(id, zoom) {
      const c = app.card(id),
        el = els[id];
      if (!c || !el) return;
      const z = clampZ(zoom || view.zoom),
        hh = el.offsetHeight;
      view.zoom = z;
      view.x = vp.clientWidth / 2 - (c.x + c.w / 2) * z;
      view.y = vp.clientHeight / 2 - (c.y + Math.min(hh / 2, vp.clientHeight / (2 * z) - 24)) * z;
      applyView();
      app.save();
    }
    function flashCard(id) {
      const el = els[id];
      if (!el) return;
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
    }
    // Next up: blocks live in the list view; on the canvas go to the card that holds the block.
    function jump(blockId) {
      const c = cat.cards.filter((k) => k.blocks && k.blocks.some((b) => b.id === blockId))[0];
      if (!c) return;
      select(c.id);
      centerOn(c.id, Math.max(view.zoom, 0.6));
      flashCard(c.id);
    }
    function fitAll() {
      const b = bounds(),
        W = vp.clientWidth,
        H = vp.clientHeight;
      const w = b.x1 - b.x0 - 2 * PAD,
        hh = b.y1 - b.y0 - 2 * PAD;
      if (!cat.cards.length) {
        view.zoom = 1;
        view.x = 24;
        view.y = 24;
        return applyView();
      }
      const z = clampZ(Math.min(1, (W - 80) / w, (H - 80) / hh));
      view.zoom = z;
      view.x = W / 2 - (b.x0 + PAD + w / 2) * z;
      view.y = H / 2 - (b.y0 + PAD + hh / 2) * z;
      applyView();
      app.save();
    }
    function resetZoom() {
      const r = rect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1);
      app.save();
    }
    const centerWorld = () => ({ x: (vp.clientWidth / 2 - view.x) / view.zoom, y: (vp.clientHeight / 2 - view.y) / view.zoom });

    return {
      el: vp,
      renderAll, renderCard, select, selectEdge, applyView, centerOn, flashCard, jump, fitAll, resetZoom, centerWorld, height, drawEdges, dirty,
      refreshCard: (id) => C.refresh(app.card(id), els[id]),
    };
  }
  G.PlannerCanvas = { create };
})(window);
