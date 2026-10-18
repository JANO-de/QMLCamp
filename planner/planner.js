(function () {
"use strict";
var KEY = "qmlcamp-planner-v1";
var COLORS = ["rose", "butter", "sage", "sky", "lav", "peach"];
var saveFailed = false, newColor = "lav", focusId = null;
var view = document.getElementById("view"), notice = document.getElementById("notice");

function uid() { return Math.random().toString(36).slice(2, 9); }
function str(x, n) { return typeof x === "string" ? x.slice(0, n) : ""; }
function arr(x, n) { return Array.isArray(x) ? x.slice(0, n) : []; }

function cleanPlan(p) {
  p = p && typeof p === "object" ? p : {};
  var tags = arr(p.tags, 40).map(function (t) {
    t = t || {};
    return { id: str(t.id, 20) || uid(), name: str(t.name, 30), color: COLORS.indexOf(t.color) >= 0 ? t.color : "lav" };
  });
  var ok = {}; tags.forEach(function (t) { ok[t.id] = 1; });
  var blocks = arr(p.blocks, 200).map(function (b) {
    b = b || {};
    return {
      id: str(b.id, 20) || uid(), label: str(b.label, 16), title: str(b.title, 120), exam: !!b.exam,
      tags: arr(b.tags, 40).filter(function (i) { return ok[i]; }),
      tasks: arr(b.tasks, 100).map(function (t) { t = t || {}; return { id: str(t.id, 20) || uid(), text: str(t.text, 200), done: !!t.done }; })
    };
  });
  return { id: str(p.id, 20) || uid(), title: str(p.title, 80) || "Untitled plan", tags: tags, blocks: blocks };
}

function load() {
  try {
    var s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.plans)) {
      var plans = s.plans.slice(0, 100).map(cleanPlan);
      var cur = plans.some(function (p) { return p.id === s.current; }) ? s.current : (plans[0] && plans[0].id) || null;
      return { plans: plans, current: cur };
    }
  } catch (e) {}
  return { plans: [], current: null };
}
var state = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); saveFailed = false; }
  catch (e) { saveFailed = true; }
  notice.hidden = !saveFailed;
  notice.textContent = saveFailed ? "This browser can\u2019t store data here. Use Export to keep your plans." : "";
}
function cur() { return state.plans.filter(function (p) { return p.id === state.current; })[0] || null; }

function h(tag, attrs) {
  var e = document.createElement(tag);
  for (var k in attrs || {}) {
    var v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c == null || c === false) continue;
    (Array.isArray(c) ? c : [c]).forEach(function (n) { e.append(n && n.nodeType ? n : document.createTextNode(n)); });
  }
  return e;
}

var refs = {};
function progress(p) {
  var total = 0, done = 0;
  p.blocks.forEach(function (b) {
    b.tasks.forEach(function (t) { total++; if (t.done) done++; });
    var el = refs[b.id]; if (el) el.classList.toggle("done", b.tasks.length > 0 && b.tasks.every(function (t) { return t.done; }));
  });
  var pct = total ? Math.round(done / total * 100) : 0;
  if (refs.pct) { refs.pct.textContent = pct + " %"; refs.cnt.textContent = done + " of " + total + " tasks"; refs.fill.style.width = pct + "%"; }
}

function render() {
  refs = {}; view.textContent = "";
  var p = cur();
  var file = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: importFile });
  var sel = h("select", { "aria-label": "Plan", onchange: function (e) { state.current = e.target.value; save(); render(); } },
    state.plans.map(function (q) { return h("option", { value: q.id, selected: q.id === state.current }, q.title); }));
  view.append(h("div", { class: "bar" },
    state.plans.length ? sel : null,
    h("button", { class: "btn main", type: "button", onclick: newPlan }, "New plan"),
    p ? h("button", { class: "btn", type: "button", onclick: dupPlan }, "Duplicate") : null,
    state.plans.length ? h("button", { class: "btn", type: "button", onclick: exportAll }, "Export") : null,
    h("button", { class: "btn", type: "button", onclick: function () { file.click(); } }, "Import"),
    p ? h("button", { class: "btn danger", type: "button", onclick: delPlan }, "Delete plan") : null,
    file));
  if (!p) {
    view.append(h("div", { class: "empty" }, h("h1", null, "No plans yet"),
      h("p", null, "Create a blank plan, add blocks (days, weeks, phases) and tick tasks off.")));
    return;
  }
  view.append(h("input", { class: "title", value: p.title, "aria-label": "Plan title", maxlength: 80, oninput: function (e) {
    p.title = e.target.value; save(); var o = sel.querySelector("option:checked"); if (o) o.textContent = p.title || "Untitled plan"; } }));
  refs.pct = h("b", null, "0 %"); refs.cnt = h("span"); refs.fill = h("i");
  view.append(h("div", { class: "prog" }, refs.pct, h("div", { class: "meter" }, refs.fill), refs.cnt));
  view.append(tagBox(p));
  var ol = h("ol", { class: "line" });
  p.blocks.forEach(function (b, i) { ol.append(blockEl(p, b, i)); });
  view.append(ol, h("button", { class: "btn addblk", type: "button", onclick: function () {
    var b = { id: uid(), label: "", title: "", exam: false, tags: [], tasks: [] };
    p.blocks.push(b); focusId = "t-" + b.id; save(); render(); } }, "+ Add block"));
  progress(p);
  if (focusId) { var f = document.getElementById(focusId); if (f) f.focus(); focusId = null; }
}

function chip(t, extra) { return h("span", { class: "chip " + (extra || ""), "data-c": t.color }, t.name || "tag"); }

function tagBox(p) {
  var list = h("div", { class: "chips" }, p.tags.length ? p.tags.map(function (t) {
    return h("span", { class: "chip", "data-c": t.color }, t.name,
      h("button", { class: "x", type: "button", "aria-label": "Delete tag " + t.name, onclick: function () {
        p.tags = p.tags.filter(function (x) { return x.id !== t.id; });
        p.blocks.forEach(function (b) { b.tags = b.tags.filter(function (i) { return i !== t.id; }); });
        save(); render(); } }, "\u00d7"));
  }) : h("span", { class: "hint" }, "No tags yet. Tags label blocks by topic (e.g. theory, practice, review)."));
  var inp = h("input", { type: "text", placeholder: "New tag", maxlength: 30, "aria-label": "New tag name", onkeydown: function (e) { if (e.key === "Enter") addTag(); } });
  function addTag() {
    var n = inp.value.trim(); if (!n) return;
    p.tags.push({ id: uid(), name: n.slice(0, 30), color: newColor }); save(); render();
  }
  var sw = h("div", { class: "sw", role: "group", "aria-label": "Tag colour" }, COLORS.map(function (c) {
    return h("button", { type: "button", "data-c": c, "aria-label": c, "aria-pressed": String(c === newColor), onclick: function (e) {
      newColor = c; Array.prototype.forEach.call(sw.children, function (b) { b.setAttribute("aria-pressed", String(b === e.currentTarget)); }); } });
  }));
  return h("section", { class: "tagbox" }, h("h2", null, "Tags"), list,
    h("div", { class: "newtag" }, inp, sw, h("button", { class: "btn", type: "button", onclick: addTag }, "Add tag")));
}

function blockEl(p, b, i) {
  var li = h("li", { class: "blk" + (b.exam ? " exam" : "") }); refs[b.id] = li;
  var node = h("div", { class: "node" },
    (function () { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 76 76"); s.setAttribute("aria-hidden", "true");
      var g = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); g.setAttribute("points", "38,3 73,38 38,73 3,38"); s.append(g); return s; })(),
    h("input", { value: b.label, placeholder: "label", maxlength: 16, "aria-label": "Block label", oninput: function (e) { b.label = e.target.value; save(); } }));
  var head = h("div", { class: "head" },
    h("input", { id: "t-" + b.id, value: b.title, placeholder: "Block title", maxlength: 120, "aria-label": "Block title", oninput: function (e) { b.title = e.target.value; save(); } }),
    h("button", { class: "ic" + (b.exam ? " on" : ""), type: "button", title: "Mark as key date", "aria-label": "Mark as key date", "aria-pressed": String(b.exam), onclick: function () { b.exam = !b.exam; save(); render(); } }, "\u2691"),
    h("button", { class: "ic", type: "button", title: "Move up", "aria-label": "Move block up", disabled: i === 0, onclick: function () { move(p, i, -1); } }, "\u25b2"),
    h("button", { class: "ic", type: "button", title: "Move down", "aria-label": "Move block down", disabled: i === p.blocks.length - 1, onclick: function () { move(p, i, 1); } }, "\u25bc"),
    h("button", { class: "ic del", type: "button", title: "Delete block", "aria-label": "Delete block", onclick: function () {
      if (b.tasks.length && !confirm("Delete this block and its tasks?")) return;
      p.blocks.splice(i, 1); save(); render(); } }, "\u00d7"));
  var tags = h("div", { class: "chips" }, p.tags.length ? p.tags.map(function (t) {
    var on = b.tags.indexOf(t.id) >= 0;
    return h("button", { class: "chip " + (on ? "on" : "off"), "data-c": t.color, type: "button", "aria-pressed": String(on), onclick: function (e) {
      var k = b.tags.indexOf(t.id); if (k >= 0) b.tags.splice(k, 1); else b.tags.push(t.id);
      var now = k < 0; e.currentTarget.className = "chip " + (now ? "on" : "off"); e.currentTarget.setAttribute("aria-pressed", String(now)); save(); } }, t.name);
  }) : h("span", { class: "hint" }, "Create tags above to label this block."));
  var tasks = h("div");
  b.tasks.forEach(function (t, j) {
    var row = h("label", { class: "task" + (t.done ? " done" : "") },
      h("input", { type: "checkbox", checked: t.done, "aria-label": "Done", onchange: function (e) { t.done = e.target.checked; row.classList.toggle("done", t.done); save(); progress(p); } }),
      h("input", { type: "text", value: t.text, maxlength: 200, "aria-label": "Task", oninput: function (e) { t.text = e.target.value; save(); } }),
      h("button", { class: "ic del", type: "button", "aria-label": "Delete task", onclick: function (e) { e.preventDefault(); b.tasks.splice(j, 1); save(); render(); } }, "\u00d7"));
    tasks.append(row);
  });
  var add = h("input", { class: "add", type: "text", placeholder: "Add task, press Enter", maxlength: 200, "aria-label": "Add task", onkeydown: function (e) {
    if (e.key !== "Enter") return; var v = e.target.value.trim(); if (!v) return;
    b.tasks.push({ id: uid(), text: v.slice(0, 200), done: false }); focusId = "a-" + b.id; save(); render(); } });
  add.id = "a-" + b.id;
  li.append(node, h("div", { class: "card" }, head, tags, tasks, add));
  return li;
}

function move(p, i, d) { var j = i + d; if (j < 0 || j >= p.blocks.length) return; var t = p.blocks[i]; p.blocks[i] = p.blocks[j]; p.blocks[j] = t; save(); render(); }
function newPlan() {
  var t = prompt("Plan name", "New plan"); if (t === null) return;
  var p = cleanPlan({ title: t.trim() || "New plan" }); p.id = uid(); state.plans.push(p); state.current = p.id; save(); render();
}
function dupPlan() {
  var p = cleanPlan(JSON.parse(JSON.stringify(cur()))); p.id = uid(); p.title = (p.title + " (copy)").slice(0, 80);
  p.blocks.forEach(function (b) { b.tasks.forEach(function (t) { t.done = false; }); });
  state.plans.push(p); state.current = p.id; save(); render();
}
function delPlan() {
  var p = cur(); if (!p || !confirm("Delete \u201c" + p.title + "\u201d? This cannot be undone.")) return;
  state.plans = state.plans.filter(function (q) { return q.id !== p.id; });
  state.current = state.plans[0] ? state.plans[0].id : null; save(); render();
}
function exportAll() {
  var blob = new Blob([JSON.stringify({ v: 1, plans: state.plans }, null, 2)], { type: "application/json" });
  var a = h("a", { href: URL.createObjectURL(blob), download: "qmlcamp-plans.json" });
  document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function importFile(e) {
  var f = e.target.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var d = JSON.parse(r.result), list = Array.isArray(d.plans) ? d.plans : (d && d.blocks ? [d] : null);
      if (!list || !list.length) throw new Error("bad");
      var added = list.slice(0, 100).map(function (q) { var p = cleanPlan(q); p.id = uid(); return p; });
      state.plans = state.plans.concat(added); state.current = added[0].id; save(); render();
    } catch (err) { alert("This file is not a valid plans export."); }
  };
  r.readAsText(f); e.target.value = "";
}

render();
})();
