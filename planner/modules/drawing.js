// Planner widget module: drawing
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('drawing')) return;
  G.PlannerModules.registerBuiltin({
    id: 'drawing',
    kind: 'widget',
    name: 'Drawing',
    icon: '✏',
    category: 'Creative',
    defaults: function () { return { strokes: [] }; },
    sanitize: function (d, c) {
      d = d || {};
      var strokes = c.arr(d.strokes, 1000).map(function (st) {
        st = st && typeof st === 'object' ? st : {};
        var pts = c.arr(st.pts, 10000).map(function (p) {
          if (Array.isArray(p)) return [c.num(p[0], 5000), c.num(p[1], 5000)];
          if (p && typeof p === 'object') return [c.num(p.x, 5000), c.num(p.y, 5000)];
          return [0,0];
        });
        return { id: c.uid(), pts: pts, color: c.str(st.color, 20) || '#222', w: c.num(st.w, 20) || 2 };
      });
      return { strokes: strokes };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      var canvas = document.createElement('canvas');
      canvas.width = 280; canvas.height = 200;
      canvas.className = 'draw';
      var ctx = canvas.getContext('2d');
      function drawAll() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        (d.strokes||[]).forEach(function (st) {
          if (!st.pts || st.pts.length < 2) return;
          ctx.beginPath();
          ctx.strokeStyle = st.color || '#222';
          ctx.lineWidth = st.w || 2;
          ctx.moveTo(st.pts[0][0], st.pts[0][1]);
          for (var i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i][0], st.pts[i][1]);
          ctx.stroke();
        });
      }
      drawAll();
      var drawing = false, cur = null;
      canvas.addEventListener('mousedown', function (e) {
        drawing = true;
        var r = canvas.getBoundingClientRect();
        cur = { id: G.PlannerModules.util.uid(), pts: [[e.clientX-r.left,e.clientY-r.top]], color: '#222', w: 2 };
        d.strokes.push(cur);
      });
      canvas.addEventListener('mousemove', function (e) {
        if (!drawing || !cur) return;
        var r = canvas.getBoundingClientRect();
        cur.pts.push([e.clientX-r.left,e.clientY-r.top]);
        drawAll();
      });
      canvas.addEventListener('mouseup', function () {
        if (!drawing) return;
        drawing = false;
        api.act(function () { api.set({ strokes: d.strokes }); });
      });
      el.append(canvas);
    },
    toMarkdown: function () { return '[drawing]'; },
    size: { w: 320, h: 240, min: [260, 200] }
  });
})(window);
