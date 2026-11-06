PlannerModules.registerBuiltin({
  id: 'tasks',
  kind: 'block',
  name: 'Tasks',
  icon: '\u2611',
  category: 'Organise',
  defaults: () => ({ tasks: [] }),
  sanitize: (d, c) => ({
    tasks: c.arr(d && d.tasks, 100).map((t) => {
      if (typeof t === 'string') t = { text: t };
      t = t || {};
      return { id: c.str(t.id, 20) || c.uid(), text: c.str(t.text, 200), done: !!t.done };
    }),
  }),
  reset: (d) => ({ tasks: d.tasks.map((t) => Object.assign({}, t, { done: false })) }),
  stats: (d) => ({ total: d.tasks.length, done: d.tasks.filter((t) => t.done).length }),
  nextUp: (d) => (d.tasks.some((t) => !t.done) ? { remaining: d.tasks.filter((t) => !t.done).length } : null),
  render(el, api) {
    const { h, rowDel, adder } = PlannerUI,
      d = api.get(),
      ro = api.mode === 'view';
    d.tasks.forEach((t, j) => {
      const row = h('label', { class: 'task' + (t.done ? ' done' : '') },
        h('input', {
          type: 'checkbox', checked: t.done, 'aria-label': 'Done',
          onchange: (e) => {
            api.act(() => { t.done = e.target.checked; });
            row.classList.toggle('done', t.done);
          },
        }),
        ro
          ? h('span', { class: 'txt' }, t.text)
          : h('input', {
              type: 'text', value: t.text, maxlength: 200, 'aria-label': 'Task',
              oninput: (e) => api.edit('t' + t.id, () => { t.text = e.target.value; }),
            }),
        ro ? null : rowDel(api, d.tasks, j, 'Delete task'));
      el.append(row);
    });
    if (!ro)
      el.append(adder(api, 'Add task, press Enter', 'a-' + api.block.id, (v) =>
        d.tasks.push({ id: api.util.uid(), text: v, done: false })));
  },
  toMarkdown: (d) => d.tasks.map((t) => '- [' + (t.done ? 'x' : ' ') + '] ' + t.text).join('\n'),
});
