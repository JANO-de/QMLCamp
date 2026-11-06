// Planner block module: code
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('code')) return;
  G.PlannerModules.registerBuiltin({
    id: 'code',
    kind: 'block',
    name: 'Code',
    icon: '</>',
    category: 'Text',
    defaults: function () { return { text: '', lang: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { text: c.str(d.text, 10000), lang: c.str(d.lang, 20) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var area = h('textarea', { class: 'codearea', rows: 6, maxlength: 10000, placeholder: 'Code...', 'aria-label': 'Code' });
      area.value = d.text || '';
      area.addEventListener('input', function () {
        api.edit('code:' + api.block.id, function () { api.set({ text: area.value }); });
      });
      el.append(area);
    },
    toMarkdown: function (d) { return '```' + (d.lang||'') + '\n' + (d.text||'') + '\n```'; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
