PlannerModules.registerBuiltin({
  id: 'milestone',
  kind: 'block',
  name: 'Milestone',
  icon: '\u2691',
  category: 'Organise',
  defaults: () => ({ text: '' }),
  sanitize: (d, c) => ({ text: c.str(d && d.text, 300) }),
  render(el, api) {
    const { h } = PlannerUI,
      d = api.get();
    if (api.mode === 'view') return void el.append(h('p', { class: 'msgread' }, d.text));
    el.append(h('input', {
      class: 'msg', type: 'text', value: d.text, maxlength: 300, placeholder: 'What happens?', 'aria-label': 'Milestone details',
      oninput: (e) => api.edit('m', () => { d.text = e.target.value; }),
    }));
  },
  toMarkdown: (d) => d.text || '',
});
