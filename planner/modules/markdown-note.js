// Planner block module: markdown-note
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('markdown-note')) return;
  G.PlannerModules.registerBuiltin({
    id: 'markdown-note',
    kind: 'block',
    name: 'Markdown',
    icon: '¶',
    category: 'Text',
    defaults: function () { return { text: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { text: c.str(d.text, 10000) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var area = h('textarea', {
        class: 'notearea',
        rows: 5,
        maxlength: 10000,
        placeholder: 'Write markdown\u2026',
        'aria-label': 'Markdown'
      });
      area.value = d.text || '';
      area.addEventListener('input', function () {
        api.edit('mdnote:' + api.block.id, function () {
          api.set({ text: area.value });
        });
      });
      el.append(area);
    },
    toMarkdown: function (d) { return d.text || ''; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
