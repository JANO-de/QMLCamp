PlannerModules.registerBuiltin({
  id: 'list',
  kind: 'block',
  name: 'List',
  icon: '\u2022',
  category: 'Text',
  defaults: () => ({ items: [] }),
  sanitize: (d, c) => ({
    items: c.arr(d && d.items, 100).map((t) => {
      if (typeof t === 'string') t = { text: t };
      t = t || {};
      return { id: c.str(t.id, 20) || c.uid(), text: c.str(t.text, 200) };
    }),
  }),
  render(el, api) {
    const { h, rowDel, adder } = PlannerUI,
      d = api.get();
    if (api.mode === 'view')
      return void el.append(h('ul', { class: 'rlist' }, d.items.map((t) => h('li', null, t.text))));
    d.items.forEach((t, j) =>
      el.append(h('div', { class: 'task item' },
        h('span', { class: 'dot', 'aria-hidden': 'true' }, '\u2022'),
        h('input', {
          type: 'text', value: t.text, maxlength: 200, 'aria-label': 'Item',
          oninput: (e) => api.edit('i' + t.id, () => { t.text = e.target.value; }),
        }),
        rowDel(api, d.items, j, 'Delete item'))));
    el.append(adder(api, 'Add item, press Enter', 'a-' + api.block.id, (v) =>
      d.items.push({ id: api.util.uid(), text: v })));
  },
  toMarkdown: (d) => d.items.map((t) => '- ' + t.text).join('\n'),
});
