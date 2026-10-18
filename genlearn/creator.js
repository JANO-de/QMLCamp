(function () {
  'use strict';
  const G = (window.GENLearnCreator = {});
  G.view = function (tail) {
    const id = (tail.split('/')[1] || '').trim();
    const app = document.getElementById('view');
    app.innerHTML = '<div class="block"><h2>Course creator (GENLearn)</h2><p class="mut">Create, edit, export/import language courses. This is a minimal scaffold; the full editor is shared in spirit with QMLCamp but adapted to language units/lessons.</p>'+
      '<div class="row"><a class="btn" href="../index.html#/creator/new" style="text-decoration:none">Go to QMLCamp creator (for now)</a></div></div>';
  };
})();
