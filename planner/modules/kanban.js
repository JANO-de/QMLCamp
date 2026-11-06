// Planner widget/block module: kanban
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('kanban')) return;
  G.PlannerModules.registerBuiltin({
    id: 'kanban',
    kind: 'both',
    name: 'Kanban',
    icon: '▥',
    category: 'Organise',
    defaults: function () { return { columns: [{ id: 'todo', name: 'To do', items: [] }, { id: 'doing', name: 'Doing', items: [] }, { id: 'done', name: 'Done', items: [] }] }; },
    sanitize: function (d, c) {
      d = d || {};
      var cols = c.arr(d.columns, 10).map(function (col) {
        col = col && typeof col === 'object' ? col : {};
        var items = c.arr(col.items, 100).map(function (it) {
          it = it && typeof it === 'object' ? it : {};
          return { id: c.uid(), text: c.str(it.text, 200), done: !!it.done };
        });
        return { id: c.str(col.id, 20) || c.uid(), name: c.str(col.name, 40) || 'Column', items: items };
      });
      if (!cols.length) cols = [{ id: c.uid(), name: 'To do', items: [] }];
      return { columns: cols };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var wrap = h('div', { class: 'kanban' });
      function draw() {
        wrap.textContent = '';
        (d.columns||[]).forEach(function (col, ci) {
          var c = h('div', { class: 'kcol' });
          c.append(h('div', { class: 'khead' }, col.name));
          (col.items||[]).forEach(function (it) {
            var card = h('div', { class: 'kcard' }, it.text);
            c.append(card);
          });
          var add = h('input', { type: 'text', class: 'kadd', placeholder: '+ Add card' });
          add.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && add.value.trim()) {
              api.act(function () {
                col.items.push({ id: G.PlannerModules.util.uid(), text: add.value.trim(), done: false });
                api.set({ columns: d.columns });
                add.value = '';
                api.rerender();
              });
            }
          });
          c.append(add);
          wrap.append(c);
        });
      }
      draw();
      el.append(wrap);
    },
    stats: function (d) {
      d = d || {};
      var cols = Array.isArray(d.columns) ? d.columns : [];
      var total = 0, done = 0;
      cols.forEach(function (col) {
        var items = Array.isArray(col.items) ? col.items : [];
        total += items.length;
        items.forEach(function (it) { if (it && it.done) done++; });
      });
      return { total: total, done: done };
    },
    ports: 'items',
    size: { w: 420, h: 280, min: [320, 200] }
  });
})(window);
