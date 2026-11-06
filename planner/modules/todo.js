// Planner widget/block module: todo
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('todo')) return;
  G.PlannerModules.registerBuiltin({
    id: 'todo',
    kind: 'both',
    name: 'Todo',
    icon: '☑',
    category: 'Organise',
    defaults: function () { return { items: [] }; },
    sanitize: function (d, c) {
      d = d || {};
      var items = c.arr(d.items, 200).map(function (it) {
        it = it && typeof it === 'object' ? it : {};
        return { id: c.uid ? c.uid() : Math.random().toString(36).slice(2,9), text: c.str(it.text, 200), done: !!it.done, due: c.str(it.due, 40) };
      });
      return { items: items };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var list = h('div', { class: 'tlist' });
      function draw() {
        list.textContent = '';
        (d.items||[]).forEach(function (it) {
          var row = h('div', { class: 'trow' + (it.done ? ' done' : '') });
          var cb = h('input', { type: 'checkbox', checked: it.done });
          cb.addEventListener('change', function () {
            api.act(function () { it.done = cb.checked; api.set({ items: d.items }); api.rerender(); });
          });
          var tx = h('span', { class: 'ttx' }, it.text);
          row.append(cb, tx);
          list.append(row);
        });
      }
      draw();
      var add = UI.adder ? UI.adder(api, 'Add todo', 'todo-add', function (v) {
        api.act(function () {
          d.items.push({ id: (G.PlannerModules.util.uid()), text: v, done: false });
          api.set({ items: d.items });
          api.rerender('todo-add');
        });
      }) : h('input', { type: 'text', placeholder: 'Add todo' });
      if (!(UI.adder)) {
        add.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && add.value.trim()) {
            api.act(function () {
              d.items.push({ id: G.PlannerModules.util.uid(), text: add.value.trim(), done: false });
              api.set({ items: d.items });
              add.value = '';
              api.rerender();
            });
          }
        });
      }
      el.append(list, add);
    },
    stats: function (d) {
      d = d || {};
      var items = Array.isArray(d.items) ? d.items : [];
      var done = items.filter(function (x) { return x && x.done; }).length;
      return { total: items.length, done: done };
    },
    nextUp: function (d) {
      d = d || {};
      var items = Array.isArray(d.items) ? d.items : [];
      for (var i = 0; i < items.length; i++) {
        if (items[i] && !items[i].done && items[i].text) return items[i].text;
      }
      return null;
    },
    toMarkdown: function (d) {
      var items = Array.isArray(d.items) ? d.items : [];
      return items.map(function (it) { return '- [' + (it.done ? 'x' : ' ') + '] ' + (it.text||''); }).join('\n');
    },
    ports: 'items',
    size: { w: 320, h: 240, min: [220, 140] }
  });
})(window);
