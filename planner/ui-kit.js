// PlannerUI: tiny DOM helpers shared by the planner views and the module render() functions.
(function (G) {
  'use strict';
  if (G.PlannerUI) return;

  // h('div', {class:'x', onclick:fn, hidden:true}, child, [children], 'text'); null/false children are skipped.
  function h(tag, attrs) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach((n) => {
        if (n == null || n === false) return;
        e.append(n && n.nodeType ? n : document.createTextNode(n));
      });
    }
    return e;
  }
  const fit = (ta) => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };
  // Small "x" button that removes arr[j] (undoable). api = block api from ui-card.js
  const rowDel = (api, arr, j, label) =>
    h('button', {
      class: 'ic del', type: 'button', 'aria-label': label,
      onclick: (e) => {
        e.preventDefault();
        api.undoable('Item removed', () => arr.splice(j, 1));
      },
    }, '\u00d7');
  // "Add ..., press Enter" input. push(value) mutates the data; the block re-renders and keeps focus.
  const adder = (api, placeholder, id, push) =>
    h('input', {
      class: 'add', id: id, type: 'text', placeholder: placeholder, maxlength: 200, 'aria-label': placeholder,
      onkeydown: (e) => {
        if (e.key !== 'Enter') return;
        const v = e.target.value.trim();
        if (!v) return;
        api.act(() => push(v.slice(0, 200)));
        api.rerender(id);
      },
    });
  // <details> menu with a button list.
  function menu(label, items, cls) {
    const d = h('details', { class: 'menu' + (cls ? ' ' + cls : '') },
      h('summary', { class: 'btn' }, label),
      h('div', { class: 'pop' }, items.map((it) =>
        h('button', { type: 'button', class: 'btn', onclick: () => { d.removeAttribute('open'); it.fn(); } }, it.text))));
    return d;
  }
  document.addEventListener('click', (e) => {
    Array.prototype.forEach.call(document.querySelectorAll('details.menu[open]'), (d) => {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  G.PlannerUI = { h, fit, rowDel, adder, menu };
})(window);
