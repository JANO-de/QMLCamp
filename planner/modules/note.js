PlannerModules.registerBuiltin({
  id: 'note',
  kind: 'block',
  name: 'Note',
  icon: '\u270e',
  category: 'Text',
  defaults: () => ({ text: '' }),
  sanitize: (d, c) => ({ text: c.str(d && d.text, 5000) }),
  render(el, api) {
    const { h, fit } = PlannerUI,
      d = api.get();
    if (api.mode === 'view') return void el.append(h('div', { class: 'noteread' }, d.text));
    const ta = h('textarea', {
      class: 'notearea', rows: 3, maxlength: 5000, placeholder: 'Write a note\u2026', 'aria-label': 'Note',
      oninput: (e) => { api.edit('n', () => { d.text = e.target.value; }); fit(e.target); },
    });
    ta.value = d.text;
    el.append(ta);
    requestAnimationFrame(() => fit(ta));
  },
  toMarkdown: (d) => d.text || '',
});
