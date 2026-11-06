// Planner widget module: sticky-note
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('sticky-note')) return;
  G.PlannerModules.registerBuiltin({
    id: 'sticky-note',
    kind: 'widget',
    name: 'Sticky note',
    icon: '🗒',
    category: 'Widgets',
    defaults: function () { return { text: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { text: c.str(d.text, 5000) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var area = h('textarea', { class: 'stick', maxlength: 5000, placeholder: 'Write...', 'aria-label': 'Sticky note' });
      area.value = d.text || '';
      area.addEventListener('input', function () {
        api.edit('sticky:' + (api.block ? api.block.id : 'w'), function () { api.set({ text: area.value }); });
      });
      el.append(area);
    },
    toMarkdown: function (d) { return d.text || ''; },
    stats: function () { return { total: 0, done: 0 }; },
    size: { w: 260, h: 200, min: [200, 140] }
  });
})(window);
