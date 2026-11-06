// Planner block module: date/countdown
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('date-countdown')) return;
  G.PlannerModules.registerBuiltin({
    id: 'date-countdown',
    kind: 'block',
    name: 'Date / Countdown',
    icon: '⏲',
    category: 'Time',
    defaults: function () { return { label: '', date: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      return { label: c.str(d.label, 80), date: c.str(d.date, 40) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var row = h('div', { class: 'row' });
      var l = h('input', { type: 'text', placeholder: 'Label', value: d.label || '', maxlength: 80 });
      var dt = h('input', { type: 'date', value: d.date || '' });
      l.addEventListener('input', function () { api.act(function () { api.set({ label: l.value }); }); });
      dt.addEventListener('change', function () { api.act(function () { api.set({ date: dt.value }); }); });
      row.append(l, dt);
      el.append(row);
    },
    toMarkdown: function (d) { return d.label ? (d.label + (d.date ? ': ' + d.date : '')) : (d.date || ''); },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
