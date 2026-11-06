// Planner block module: file-ref
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('file-ref')) return;
  G.PlannerModules.registerBuiltin({
    id: 'file-ref',
    kind: 'block',
    name: 'File ref',
    icon: '📎',
    category: 'Links',
    defaults: function () { return { name: '', url: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { name: c.str(d.name, 80), url: c.str(d.url, 500) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var n = h('input', { type: 'text', placeholder: 'Name', value: d.name || '', maxlength: 80 });
      var u = h('input', { type: 'text', placeholder: 'URL or path', value: d.url || '', maxlength: 500 });
      n.addEventListener('input', function () { api.edit('frn:' + api.block.id, function () { api.set({ name: n.value }); }); });
      u.addEventListener('input', function () { api.edit('fru:' + api.block.id, function () { api.set({ url: u.value }); }); });
      el.append(h('div', { class: 'row' }, n, u));
    },
    toMarkdown: function (d) { if (!d.url) return d.name||''; return '[' + (d.name||d.url) + '](' + d.url + ')'; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
