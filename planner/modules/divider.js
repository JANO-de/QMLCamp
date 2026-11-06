// Planner block module: divider
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('divider')) return;
  G.PlannerModules.registerBuiltin({
    id: 'divider',
    kind: 'block',
    name: 'Divider',
    icon: '—',
    category: 'Text',
    defaults: function () { return {}; },
    sanitize: function (d, c) { return {}; },
    render: function (el, api) {
      var UI = G.PlannerUI, h = UI.h;
      el.append(h('hr', { class: 'pdiv' }));
    },
    toMarkdown: function () { return '---'; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
