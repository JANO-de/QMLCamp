// Planner block module: quote
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('quote')) return;
  G.PlannerModules.registerBuiltin({
    id: 'quote',
    kind: 'block',
    name: 'Quote',
    icon: '"',
    category: 'Text',
    defaults: function () { return { text: '', author: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { text: c.str(d.text, 2000), author: c.str(d.author, 80) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var ta = h('textarea', { class: 'notearea', rows: 3, maxlength: 2000, placeholder: 'Quote...', 'aria-label': 'Quote' });
      ta.value = d.text || '';
      var a = h('input', { type: 'text', placeholder: 'Author', value: d.author || '', maxlength: 80 });
      ta.addEventListener('input', function () { api.edit('quote:' + api.block.id, function () { api.set({ text: ta.value }); }); });
      a.addEventListener('input', function () { api.edit('qa:' + api.block.id, function () { api.set({ author: a.value }); }); });
      el.append(ta, h('div', { class: 'row' }, a));
    },
    toMarkdown: function (d) { return '> ' + (d.text||'') + (d.author ? '\n> — ' + d.author : ''); },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
