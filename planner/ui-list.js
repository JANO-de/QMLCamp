// PlannerList: the old vertical timeline, now a "List view" of one plan card.
(function (G) {
  'use strict';
  if (G.PlannerList) return;
  const h = G.PlannerUI.h,
    C = G.PlannerCard,
    R = G.PlannerModules;

  // First block with work left (reading mode only).
  function nextBlock(card) {
    for (let i = 0; i < card.blocks.length; i++) if (R.nextUp(card.blocks[i].type, card.blocks[i].data)) return card.blocks[i].id;
    return null;
  }

  function render(app, host, card) {
    const ed = app.editing,
      nextId = ed ? null : nextBlock(card);
    const root = h('div', { class: 'listview' });
    root.append(h('div', { class: 'modehint', role: 'status', hidden: ed }, 'Reading mode. You can tick tasks and log time; press Edit to change the plan itself.'));
    root.append(
      ed
        ? h('input', {
            class: 'title', value: card.title, 'aria-label': 'Plan title', maxlength: 80,
            oninput: (e) => { app.checkpoint('ct:' + card.id); card.title = e.target.value; app.save(); },
          })
        : h('h1', { class: 'title ro' }, card.title));
    const st = C.stats(card);
    root.append(h('div', { class: 'prog' }, h('b', null, st.pct + ' %'), h('div', { class: 'meter' }, h('i', { style: 'width:' + st.pct + '%' })), h('span', null, st.done + ' of ' + st.total + ' tasks')));
    if (ed) root.append(C.tagBox(app, card));
    else if (card.tags.length)
      root.append(h('div', { class: 'chips ro' }, card.tags.map((t) => h('span', { class: 'chip', 'data-c': t.color }, t.name))));
    const ol = h('ol', { class: 'line' });
    card.blocks.forEach((b, i) => ol.append(C.blockEl(app, card, b, i, { timeline: true, nextId })));
    if (!ed && !card.blocks.length) ol.append(h('li', { class: 'hint' }, 'This plan has no blocks yet. Press Edit to add some.'));
    root.append(ol);
    if (ed) root.append(C.addRow(app, card));
    host.append(root);

    return {
      el: root,
      refresh: () => C.refresh(card, root),
      jump(blockId) {
        const el = root.querySelector('[data-b="' + blockId + '"]');
        if (!el) return;
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 1800);
      },
    };
  }
  G.PlannerList = { render, nextBlock };
})(window);
