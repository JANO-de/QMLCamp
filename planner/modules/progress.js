// Planner block module: progress
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('progress')) return;
  G.PlannerModules.registerBuiltin({
    id: 'progress',
    kind: 'block',
    name: 'Progress',
    icon: '%',
    category: 'Organise',
    defaults: function () { return { label: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { label: c.str(d.label, 80) };
    },
    render: function (el, api) {
      var UI = G.PlannerUI, h = UI.h;
      var card = api.card;
      var total = 0, done = 0;
      if (card && card.blocks) {
        card.blocks.forEach(function (b) {
          if (b === api.block) return;
          var s = G.PlannerModules.stats(b.type, b.data);
          total += s.total; done += s.done;
        });
      }
      var pct = total ? Math.round((done/total)*100) : 0;
      el.append(h('div', { class: 'pmeter' }, h('div', { class: 'bar' }, h('i', { style: 'width:' + pct + '%' })), h('span', null, done + ' / ' + total + ' (' + pct + '%)')));
    },
    toMarkdown: function (d) { return d.label || 'Progress'; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
