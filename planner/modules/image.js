// Planner block module: image
(function (G) {
  'use strict';
  if (G.PlannerModules && G.PlannerModules.has && G.PlannerModules.has('image')) return;
  G.PlannerModules.registerBuiltin({
    id: 'image',
    kind: 'block',
    name: 'Image',
    icon: '🖼',
    category: 'Media',
    defaults: function () { return { src: '', caption: '' }; },
    sanitize: function (d, c) {
      d = d || {};
      var src = c.str(d.src, 200000);
      // only data URLs or http(s)
      if (src && !/^data:image\//i.test(src) && !/^https?:\/\//i.test(src)) src = '';
      return { src: src, caption: c.str(d.caption, 200) };
    },
    render: function (el, api) {
      var d = api.get();
      var UI = G.PlannerUI, h = UI.h;
      if (d.src) {
        var img = h('img', { class: 'pimg', src: d.src, alt: d.caption || '' });
        el.append(img);
      }
      var row = h('div', { class: 'row' });
      var file = h('input', { type: 'file', accept: 'image/*' });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.size > 200*1024) {
          if (G.QmlUI && G.QmlUI.toast) G.QmlUI.toast('Image too large (max 200 KB).');
          return;
        }
        var fr = new FileReader();
        fr.onload = function () {
          api.act(function () { api.set({ src: String(fr.result) }); api.rerender(); });
        };
        fr.readAsDataURL(f);
      });
      var cap = h('input', { type: 'text', placeholder: 'Caption', value: d.caption || '', maxlength: 200 });
      cap.addEventListener('input', function () { api.edit('imgc:' + api.block.id, function () { api.set({ caption: cap.value }); }); });
      row.append(file);
      el.append(row, cap);
    },
    toMarkdown: function (d) { return d.src ? '![' + (d.caption||'') + '](' + d.src + ')' : ''; },
    stats: function () { return { total: 0, done: 0 }; }
  });
})(window);
