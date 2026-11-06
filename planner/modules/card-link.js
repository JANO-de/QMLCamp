// Planner block module: card-link
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('card-link')) return;
  G.PlannerModules.registerBuiltin({
    id: 'card-link',
    kind: 'block',
    name: 'Card link',
    icon: '→',
    category: 'Links',
    defaults: function () { return { cardId: '', label: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { cardId: c.str(d.cardId, 20), label: c.str(d.label, 80) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var app = G.PlannerApp;
      var cats = app && app.store ? app.store.categories : [];
      var sel = h('select');
      sel.append(h('option', { value: '' }, 'Select card...'));
      cats.forEach(function (cat) {
        if (!cat.cards) return;
        cat.cards.forEach(function (card) {
          var o = h('option', { value: card.id }, (cat.name ? cat.name + ': ' : '') + (card.title || card.id));
          if (card.id === d.cardId) o.selected = true;
          sel.append(o);
        });
      });
      sel.addEventListener('change', function () { api.act(function () { api.set({ cardId: sel.value }); api.rerender(); }); });
      var btn = h('button', { class: 'btn sm', type: 'button' }, d.label || 'Jump to card');
      btn.addEventListener('click', function () {
        if (!d.cardId || !app) return;
        // find card
        var found = null, foundCat = null;
        cats.forEach(function (cat) {
          (cat.cards||[]).forEach(function (c) { if (c.id === d.cardId) { found = c; foundCat = cat; } });
        });
        if (foundCat && found) {
          app.store.current = foundCat.id;
          app.editing = false;
          app.mode = 'canvas';
          app.save(true);
          app.render();
          setTimeout(function () { if (app.canvas) { app.canvas.select(found.id); app.canvas.centerOn(found.id, 1); } }, 50);
        }
      });
      el.append(h('div', { class: 'row' }, sel), btn);
    },
    toMarkdown: function (d) { return d.cardId ? ('[card:' + d.cardId + ']') : ''; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
