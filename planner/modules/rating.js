// Planner block module: rating
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('rating')) return;
  G.PlannerModules.registerBuiltin({
    id: 'rating',
    kind: 'block',
    name: 'Rating',
    icon: '★',
    category: 'Review',
    defaults: function () { return { max: 5, value: 0 }; },
    sanitize: function (d, c) {
      d = d || {};
      var max = c.num(d.max, 10);
      if (max < 1) max = 5;
      var val = c.num(d.value, max);
      return { max: max, value: val };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var row = h('div', { class: 'rate' });
      for (var i = 1; i <= d.max; i++) {
        (function (n) {
          var b = h('button', { type: 'button', class: n <= d.value ? 'on' : '', 'aria-label': n + ' stars' }, '★');
          b.addEventListener('click', function () {
            api.act(function () { api.set({ value: n }); api.rerender(); });
          });
          row.append(b);
        })(i);
      }
      el.append(row);
    },
    toMarkdown: function (d) { return (d.value||0) + '/' + (d.max||5); },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
