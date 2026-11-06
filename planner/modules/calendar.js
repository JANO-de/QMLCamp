// Planner widget module: calendar
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('calendar')) return;
  G.PlannerModules.registerBuiltin({
    id: 'calendar',
    kind: 'widget',
    name: 'Calendar',
    icon: '📅',
    category: 'Time',
    defaults: function () { return { events: [] }; },
    sanitize: function (d, c) {
      d = d || {};
      var events = c.arr(d.events, 200).map(function (ev) {
        ev = ev && typeof ev === 'object' ? ev : {};
        return { id: c.uid(), title: c.str(ev.title, 80), date: c.str(ev.date, 40) };
      });
      return { events: events };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var now = new Date();
      var month = now.getMonth(), year = now.getFullYear();
      var first = new Date(year, month, 1);
      var last = new Date(year, month+1, 0);
      var days = [];
      for (var i = 1; i <= last.getDate(); i++) days.push(i);
      var grid = h('div', { class: 'cal' });
      days.forEach(function (dd) {
        var cell = h('div', { class: 'cday' }, dd);
        grid.append(cell);
      });
      var add = h('div', { class: 'row' });
      var t = h('input', { type: 'text', placeholder: 'Event', maxlength: 80 });
      var dt = h('input', { type: 'date' });
      var btn = h('button', { class: 'btn sm', type: 'button' }, 'Add');
      btn.addEventListener('click', function () {
        if (!t.value.trim()) return;
        api.act(function () {
          d.events.push({ id: G.PlannerModules.util.uid(), title: t.value.trim(), date: dt.value });
          api.set({ events: d.events });
          t.value = ''; api.rerender();
        });
      });
      add.append(t, dt, btn);
      el.append(h('div', { class: 'chead' }, now.toLocaleString(undefined, { month: 'long', year: 'numeric' })), grid, add);
    },
    toMarkdown: function (d) {
      var ev = Array.isArray(d.events) ? d.events : [];
      return ev.map(function (e) { return '- ' + (e.date||'') + ' ' + (e.title||''); }).join('\n');
    },
    size: { w: 320, h: 280, min: [280, 240] }
  });
})(window);
