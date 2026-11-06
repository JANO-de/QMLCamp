// Planner block module: habit-row
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('habit-row')) return;
  G.PlannerModules.registerBuiltin({
    id: 'habit-row',
    kind: 'block',
    name: 'Habit',
    icon: '✓',
    category: 'Habit',
    defaults: function () { return { habit: '', days: [false,false,false,false,false,false,false] }; },
    sanitize: function (d, c) {
      d = d || {};
      var days = Array.isArray(d.days) ? d.days.slice(0,7).map(function(x){return !!x;}) : [false,false,false,false,false,false,false];
      while (days.length < 7) days.push(false);
      return { habit: c.str(d.habit, 80), days: days };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var inp = h('input', { type: 'text', value: d.habit || '', placeholder: 'Habit name', maxlength: 80 });
      inp.addEventListener('input', function () { api.edit('habit:' + api.block.id, function () { api.set({ habit: inp.value }); }); });
      var row = h('div', { class: 'hrow' });
      var days = ['M','T','W','T','F','S','S'];
      days.forEach(function (lab, i) {
        var b = h('button', { type: 'button', class: d.days[i] ? 'on' : '', 'aria-label': lab }, lab);
        b.addEventListener('click', function () {
          api.act(function () {
            d.days[i] = !d.days[i];
            api.set({ days: d.days });
            api.rerender();
          });
        });
        row.append(b);
      });
      el.append(inp, row);
    },
    stats: function (d) {
      d = d || {};
      var days = Array.isArray(d.days) ? d.days : [];
      var done = days.filter(function(x){return x;}).length;
      return { total: days.length || 7, done: done };
    },
    toMarkdown: function (d) { return (d.habit||'Habit') + ' [' + (Array.isArray(d.days)?d.days.map(function(x){return x?'x':'.';}).join(''): '.......') + ']'; }
  });
})(window);
