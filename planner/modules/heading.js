// Planner block module: heading
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('heading')) return;
  G.PlannerModules.registerBuiltin({
    id: 'heading',
    kind: 'block',
    name: 'Heading',
    icon: 'H',
    category: 'Text',
    defaults: function () { return { text: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { text: c.str(d.text, 200) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var inp = h('input', {
        class: 'hn',
        value: d.text,
        placeholder: 'Heading',
        maxlength: 200,
        'aria-label': 'Heading'
      });
      inp.addEventListener('input', function () {
        api.edit('heading:' + api.block.id, function () {
          api.set({ text: inp.value });
        });
      });
      el.append(inp);
    },
    toMarkdown: function (d) { return '## ' + (d.text || ''); },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
