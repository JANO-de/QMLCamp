// PlannerCard: DOM for plan cards and their blocks (shared by the canvas and the list view).
//   build(app, card)                      -> <article class="pc"> for the canvas
//   blockEl(app, card, b, i, {timeline})  -> block (canvas row, or timeline <li> for the list view)
//   tagBox(app, card)                     -> tag editor (edit mode)
//   refresh(card, el)                     -> progress + done state after a change (el = card or list root)
(function (G) {
  'use strict';
  if (G.PlannerCard) return;
  const UI = G.PlannerUI,
    h = UI.h,
    R = G.PlannerModules,
    M = G.PlannerModel,
    U = R.util;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function stats(card) {
    let total = 0,
      done = 0;
    card.blocks.forEach((b) => {
      const s = R.stats(b.type, b.data);
      total += s.total;
      done += s.done;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function tagMap(card) {
    const m = {};
    card.tags.forEach((t) => (m[t.id] = t));
    return m;
  }

  function tagBox(app, card) {
    const edit = (fn) => {
      app.checkpoint();
      fn();
      app.save(true);
      app.renderCard(card.id);
    };
    const list = h('div', { class: 'chips' },
      card.tags.length
        ? card.tags.map((t) =>
            h('span', { class: 'chip', 'data-c': t.color }, t.name,
              h('button', {
                class: 'x', type: 'button', 'aria-label': 'Delete tag ' + t.name,
                onclick: () => edit(() => {
                  card.tags = card.tags.filter((x) => x.id !== t.id);
                  card.blocks.forEach((b) => (b.tags = b.tags.filter((i) => i !== t.id)));
                }),
              }, '\u00d7')))
        : h('span', { class: 'hint' }, 'No tags yet. Tags label blocks by topic (e.g. theory, practice, review).'));
    const add = () => {
      const n = inp.value.trim();
      if (!n || card.tags.length >= M.LIMITS.tags) return;
      edit(() => card.tags.push({ id: U.uid(), name: n.slice(0, 30), color: app.newColor }));
    };
    const inp = h('input', {
      type: 'text', placeholder: 'New tag', maxlength: 30, 'aria-label': 'New tag name',
      onkeydown: (e) => { if (e.key === 'Enter') add(); },
    });
    const sw = h('div', { class: 'sw', role: 'group', 'aria-label': 'Tag colour' },
      M.COLORS.map((c) =>
        h('button', {
          type: 'button', 'data-c': c, 'aria-label': c, 'aria-pressed': String(c === app.newColor),
          onclick: (e) => {
            app.newColor = c;
            Array.prototype.forEach.call(sw.children, (b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          },
        })));
    return h('section', { class: 'tagbox' }, h('h2', null, 'Tags'), list,
      h('div', { class: 'newtag' }, inp, sw, h('button', { class: 'btn', type: 'button', onclick: add }, 'Add tag')));
  }

  function moveBlock(app, card, i, d) {
    const j = i + d;
    if (j < 0 || j >= card.blocks.length) return;
    app.checkpoint();
    const t = card.blocks[i];
    card.blocks[i] = card.blocks[j];
    card.blocks[j] = t;
    app.save(true);
    app.renderCard(card.id);
  }

  function diamond() {
    const sv = document.createElementNS(SVGNS, 'svg');
    sv.setAttribute('viewBox', '0 0 76 76');
    sv.setAttribute('aria-hidden', 'true');
    const pg = document.createElementNS(SVGNS, 'polygon');
    pg.setAttribute('points', '38,3 73,38 38,73 3,38');
    sv.append(pg);
    return sv;
  }

  function blockEl(app, card, b, i, opts) {
    opts = opts || {};
    const tl = !!opts.timeline,
      ed = app.editing,
      mod = R.get(b.type);
    const name = mod ? mod.name : b.type,
      icon = mod && mod.icon ? mod.icon : '\u25a1';
    const cls = 't-' + b.type + (b.exam ? ' exam' : '') + (R.isDone(b.type, b.data) ? ' done' : '');
    const root = tl ? h('li', { class: 'blk ' + cls, 'data-b': b.id }) : h('div', { class: 'cb ' + cls, 'data-b': b.id });
    const body = h('div', { class: 'body' });

    const changed = () => {
      app.save();
      app.refreshCard(card.id);
    };
    const api = {
      mode: ed ? 'edit' : 'view',
      block: b,
      card: card,
      util: U,
      get: () => b.data,
      set: (p) => api.act(() => Object.assign(b.data, p)),
      // typing: same key within ~1 s = one undo step
      edit: (key, fn) => {
        app.checkpoint(key + ':' + b.id);
        fn();
        changed();
      },
      act: (fn) => {
        app.checkpoint();
        fn();
        changed();
      },
      undoable: (msg, fn) => {
        app.checkpoint();
        fn();
        app.save(true);
        renderBody();
        app.refreshCard(card.id);
        app.toast(msg, { label: 'Undo', onClick: () => app.undo() });
      },
      rerender: (focusId) => {
        renderBody();
        app.refreshCard(card.id);
        const f = focusId && document.getElementById(focusId);
        if (f) f.focus();
      },
      toast: (m, o) => app.toast(m, o),
    };
    function renderBody() {
      body.textContent = '';
      if (!mod) body.append(h('p', { class: 'hint' }, 'Module \u201c' + b.type + '\u201d is not loaded. Its data is kept.'));
      else if (!mod.render) body.append(h('p', { class: 'hint' }, name + ' has no editor yet.'));
      else {
        try {
          mod.render(body, api);
        } catch (e) {
          body.append(h('p', { class: 'hint' }, 'This block failed to render: ' + e.message));
          if (typeof console !== 'undefined') console.error(e);
        }
      }
    }
    renderBody();

    const tags = tagMap(card);
    let head, chips;
    if (!ed) {
      head = h('div', { class: 'head' },
        h('span', { class: 'kind', title: name }, icon),
        !tl && b.label ? h('span', { class: 'blabel-ro' }, b.label) : null,
        h(tl ? 'h2' : 'h3', { class: 'btitle' }, b.title || name),
        b.exam ? h('span', { class: 'keydate', title: 'Key date' }, '\u2691 key date') : null,
        opts.nextId === b.id ? h('span', { class: 'nextup' }, '\u25b6 next up') : null);
      chips = b.tags.length
        ? h('div', { class: 'chips' }, b.tags.map((id) => (tags[id] ? h('span', { class: 'chip', 'data-c': tags[id].color }, tags[id].name) : null)))
        : null;
    } else {
      head = h('div', { class: 'head' },
        h('span', { class: 'kind', title: name, 'aria-label': name + ' block' }, icon),
        tl ? null : h('input', {
          class: 'blabel', value: b.label, placeholder: 'label', maxlength: 16, 'aria-label': 'Block label',
          oninput: (e) => { app.checkpoint('lb:' + b.id); b.label = e.target.value; app.save(); },
        }),
        h('input', {
          id: 't-' + b.id, class: 'btitle-in', value: b.title, placeholder: 'Block title', maxlength: 120, 'aria-label': 'Block title',
          oninput: (e) => { app.checkpoint('bt:' + b.id); b.title = e.target.value; app.save(); },
        }),
        h('button', {
          class: 'ic' + (b.exam ? ' on' : ''), type: 'button', title: 'Mark as key date', 'aria-label': 'Mark as key date',
          'aria-pressed': String(b.exam),
          onclick: () => { app.checkpoint(); b.exam = !b.exam; app.save(true); app.renderCard(card.id); },
        }, '\u2691'),
        h('button', { class: 'ic', type: 'button', title: 'Move up', 'aria-label': 'Move block up', disabled: i === 0, onclick: () => moveBlock(app, card, i, -1) }, '\u25b2'),
        h('button', { class: 'ic', type: 'button', title: 'Move down', 'aria-label': 'Move block down', disabled: i === card.blocks.length - 1, onclick: () => moveBlock(app, card, i, 1) }, '\u25bc'),
        h('button', {
          class: 'ic del', type: 'button', title: 'Delete block', 'aria-label': 'Delete block',
          onclick: () => app.undoable('Block deleted', () => card.blocks.splice(i, 1), card.id),
        }, '\u00d7'));
      chips = h('div', { class: 'chips' },
        card.tags.length
          ? card.tags.map((t) => {
              const on = b.tags.indexOf(t.id) >= 0;
              return h('button', {
                class: 'chip ' + (on ? 'on' : 'off'), 'data-c': t.color, type: 'button', 'aria-pressed': String(on),
                onclick: (e) => {
                  app.checkpoint();
                  const k = b.tags.indexOf(t.id);
                  if (k >= 0) b.tags.splice(k, 1);
                  else b.tags.push(t.id);
                  e.currentTarget.className = 'chip ' + (k < 0 ? 'on' : 'off');
                  e.currentTarget.setAttribute('aria-pressed', String(k < 0));
                  app.save();
                },
              }, t.name);
            })
          : h('span', { class: 'hint' }, 'Create tags on the card to label this block.'));
    }
    if (!tl) {
      root.append(head, chips, body);
      return root;
    }
    const node = h('div', { class: 'node' }, diamond(),
      ed
        ? h('input', {
            value: b.label, placeholder: 'label', maxlength: 16, 'aria-label': 'Block label',
            oninput: (e) => { app.checkpoint('lb:' + b.id); b.label = e.target.value; app.save(); },
          })
        : h('span', { class: 'nlabel' }, b.label));
    root.append(node, h('div', { class: 'card' }, head, chips, body));
    return root;
  }

  function addRow(app, card) {
    return h('div', { class: 'addrow', role: 'group', 'aria-label': 'Add block' },
      R.list('block').map((m) =>
        h('button', {
          class: 'btn sm', type: 'button',
          onclick: () => {
            if (card.blocks.length >= M.LIMITS.blocks) return app.toast('Card is full.');
            app.checkpoint();
            const b = M.cleanBlock({ id: U.uid(), type: m.id, exam: m.id === 'milestone', data: m.defaults() }, {}, false);
            card.blocks.push(b);
            app.save(true);
            app.renderCard(card.id, 't-' + b.id);
          },
        }, '+ ' + m.name)));
  }

  // Canvas card = cover only (title, progress, tags, next up, key dates). The full plan opens in the list view.
  function build(app, card) {
    const ed = app.editing,
      R_ = R;
    const root = h('article', {
      class: 'pc k-' + card.kind + (app.selected === card.id ? ' sel' : ''),
      'data-id': card.id, 'data-c': card.color, tabindex: 0, 'aria-label': card.title || 'Card',
    });
    const st = stats(card);
    const act = (fn) => () => { app.checkpoint(); fn(); app.save(true); app.renderCard(card.id); };
    const head = h('header', { class: 'chead' },
      ed ? h('span', { class: 'grip', title: 'Drag to move', 'aria-hidden': 'true' }, '\u283f') : null,
      ed
        ? h('input', {
            id: 'ct-' + card.id, class: 'ctitle-in', value: card.title, maxlength: 80, 'aria-label': 'Card title',
            oninput: (e) => { app.checkpoint('ct:' + card.id); card.title = e.target.value; app.save(); root.setAttribute('aria-label', card.title); },
          })
        : h('h2', { class: 'ctitle' }, card.title),
      ed
        ? [
            h('button', {
              class: 'ic', type: 'button', title: 'Change colour', 'aria-label': 'Change card colour',
              onclick: act(() => (card.color = M.COLORS[(M.COLORS.indexOf(card.color) + 1) % M.COLORS.length])),
            }, '\u25d0'),
            h('button', { class: 'ic', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate card', onclick: () => app.duplicateCard(card.id) }, '\u29c9'),
            h('button', { class: 'ic del', type: 'button', title: 'Delete card', 'aria-label': 'Delete card', onclick: () => app.deleteCard(card.id) }, '\u00d7'),
          ]
        : null);
    const meter = h('div', { class: 'cmeter', hidden: !st.total }, h('i', { style: 'width:' + st.pct + '%' }));
    const body = h('div', { class: 'cbody cover' });
    const ICONS = ['\ud83d\udcda', '\ud83d\udcd6', '\u270f\ufe0f', '\ud83c\udf93', '\ud83d\udcbb', '\ud83e\uddea', '\ud83e\uddee', '\ud83d\udcd0', '\ud83c\udfa8', '\ud83c\udfb5', '\ud83c\udfc3', '\ud83c\udf4e', '\u2708\ufe0f', '\ud83c\udfe0', '\ud83d\udcbc', '\ud83d\udca1', '\ud83c\udfaf', '\u2b50', '\u2764\ufe0f', '\ud83d\udd27', '\ud83c\udf31', '\ud83d\uddd3\ufe0f', '\ud83d\udcac', '\ud83e\udde0'];
    const setIcon = (v) => { app.checkpoint(); card.icon = v; app.save(true); app.renderCard(card.id); };
    const shown = card.icon || '\u25c8';
    body.append(ed
      ? h('details', { class: 'menu iconpick' },
          h('summary', { class: 'cicon edit', title: 'Change icon', 'aria-label': 'Change card icon' }, shown),
          h('div', { class: 'pop icons' },
            ICONS.map((i) => h('button', { type: 'button', class: 'btn', onclick: () => setIcon(i) }, i)),
            h('button', { type: 'button', class: 'btn wide', onclick: () => G.QmlUI.prompt('Icon (an emoji or up to 2 characters)', card.icon || '', { ok: 'Set' }).then((v) => { if (v !== null) setIcon(v.trim().slice(0, 8)); }) }, 'Custom\u2026'),
            h('button', { type: 'button', class: 'btn wide', onclick: () => setIcon('') }, 'Default')))
      : h('div', { class: 'cicon', role: 'img', 'aria-label': 'Card icon' }, shown));
    if (card.kind !== 'plan') {
      body.append(h('p', { class: 'hint' }, 'This card type is not available yet. Its data is kept.'));
    } else {
      if (card.tags.length)
        body.append(h('div', { class: 'chips ro' }, card.tags.map((t) => h('span', { class: 'chip', 'data-c': t.color }, t.name))));
      const next = card.blocks.filter((b) => R_.nextUp(b.type, b.data))[0];
      const keys = card.blocks.filter((b) => b.exam);
      body.append(h('p', { class: 'cstat' },
        card.blocks.length + (card.blocks.length === 1 ? ' block' : ' blocks') +
          (st.total ? ' \u00b7 ' + st.done + ' of ' + st.total + ' tasks (' + st.pct + ' %)' : '')));
      if (next) body.append(h('p', { class: 'cnext' }, '\u25b6 ', (next.label ? next.label + ' \u00b7 ' : '') + (next.title || (R_.get(next.type) || { name: next.type }).name)));
      keys.slice(0, 3).forEach((b) =>
        body.append(h('p', { class: 'ckey' }, '\u2691 ', (b.label ? b.label + ' \u00b7 ' : '') + (b.title || 'Key date'))));
      body.append(h('button', { class: 'btn sm open', type: 'button', onclick: () => app.openList(card.id) }, 'Open plan'));
    }
    root.append(head, meter, body);
    if (ed) {
      root.append(h('div', { class: 'rz', title: 'Resize width', 'aria-hidden': 'true' }));
      ['top', 'right', 'bottom', 'left'].forEach((s) =>
        root.append(h('span', { class: 'port p-' + s, 'data-side': s, title: 'Drag to connect', 'aria-hidden': 'true' })));
    }
    return root;
  }

  // Update progress and "done" marks inside el (a card or the list root) without rebuilding it.
  function refresh(card, el) {
    if (!card || !el) return;
    const st = stats(card);
        const m = el.querySelector('.cmeter');
    if (m) {
      m.hidden = !st.total;
      m.firstChild.style.width = st.pct + '%';
    }
    const pb = el.querySelector('.prog b');
    if (pb) {
      pb.textContent = st.pct + ' %';
      el.querySelector('.prog span').textContent = st.done + ' of ' + st.total + ' tasks';
      el.querySelector('.prog .meter i').style.width = st.pct + '%';
    }
    card.blocks.forEach((b) => {
      const be = el.querySelector('[data-b="' + b.id + '"]');
      if (be) be.classList.toggle('done', R.isDone(b.type, b.data));
    });
  }

  G.PlannerCard = { stats, build, blockEl, tagBox, addRow, refresh };
})(window);
