// Planner block module: table
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('table')) return;
  G.PlannerModules.registerBuiltin({
    id: 'table',
    kind: 'block',
    name: 'Table',
    icon: '▦',
    category: 'Organise',
    defaults: function () { return { rows: [['']] }; },
    sanitize: function (d, c) {
      d = d || {};
      var rows = c.arr(d.rows, 50).map(function (r) {
        if (!Array.isArray(r)) return [''];
        return c.arr(r, 20).map(function (x) { return c.str(x, 200); });
      });
      if (!rows.length) rows = [['']];
      return { rows: rows };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var tbl = h('table', { class: 'ptbl' });
      function draw() {
        tbl.textContent = '';
        d.rows.forEach(function (row, ri) {
          var tr = h('tr');
          row.forEach(function (cell, ci) {
            var td = h('td');
            var inp = h('input', { value: cell, 'aria-label': 'Cell' });
            inp.addEventListener('input', function () {
              api.edit('tbl:' + api.block.id, function () {
                d.rows[ri][ci] = inp.value;
                api.set({ rows: d.rows });
              });
            });
            td.append(inp);
            tr.append(td);
          });
          tbl.append(tr);
        });
      }
      draw();
      var bar = h('div', { class: 'row' });
      bar.append(h('button', { class: 'btn sm', type: 'button', onclick: function () { api.act(function () { d.rows.push(d.rows[0] ? d.rows[0].map(function(){return '';}) : ['']); api.set({ rows: d.rows }); draw(); }); } }, '+ Row'));
      bar.append(h('button', { class: 'btn sm', type: 'button', onclick: function () { if(d.rows.length && d.rows[0]) d.rows[0].push(''); api.act(function () { api.set({ rows: d.rows }); draw(); }); } }, '+ Col'));
      el.append(tbl, bar);
    },
    toMarkdown: function (d) {
      if (!d.rows || !d.rows.length) return '';
      var lines = [];
      d.rows.forEach(function (r, i) {
        lines.push('| ' + r.map(function(x){return (x||'').replace(/\|/g,'\\|');}).join(' | ') + ' |');
        if (i === 0) lines.push('| ' + r.map(function(){return '---';}).join(' | ') + ' |');
      });
      return lines.join('\n');
    },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
