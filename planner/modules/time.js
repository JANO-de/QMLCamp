PlannerModules.registerBuiltin({
  id: 'time',
  kind: 'block',
  name: 'Time',
  icon: '\u23f1',
  category: 'Organise',
  defaults: () => ({ target: 0, logged: 0 }),
  sanitize: (d, c) => ({ target: c.num(d && d.target, 100000), logged: c.num(d && d.logged, 100000) }),
  reset: (d) => ({ target: d.target, logged: 0 }),
  // Minutes are not "work items": stats stay 0 so task counts match the old planner.
  stats: () => ({ total: 0, done: 0 }),
  isDone: (d) => d.target > 0 && d.logged >= d.target,
  nextUp: (d) => (d.target > 0 && d.logged < d.target ? { remaining: d.target - d.logged } : null),
  render(el, api) {
    const { h } = PlannerUI,
      d = api.get(),
      u = api.util,
      ro = api.mode === 'view';
    const lab = h('span', { class: 'tlabel' }),
      fill = h('i');
    const upd = () => {
      lab.textContent = u.fmt(d.logged) + ' of ' + (d.target ? u.fmt(d.target) : 'no target');
      fill.style.width = (d.target ? Math.min(100, (d.logged / d.target) * 100) : 0) + '%';
    };
    const add = (n) =>
      h('button', {
        class: 'btn sm', type: 'button',
        onclick: () => { api.act(() => { d.logged = u.num(d.logged + n, 100000); }); upd(); },
      }, (n > 0 ? '+' : '\u2212') + Math.abs(n));
    el.append(
      h('div', { class: 'timebox' }, h('div', { class: 'meter' }, fill), lab),
      h('div', { class: 'timectl' }, add(-15), add(15), add(30), add(60),
        ro ? null : h('label', { class: 'tgt' }, 'Target (min)',
          h('input', {
            type: 'number', min: 0, max: 100000, value: d.target, 'aria-label': 'Target minutes',
            oninput: (e) => { api.edit('tg', () => { d.target = u.num(e.target.value, 100000); }); upd(); },
          }))));
    upd();
  },
  toMarkdown: (d, c) =>
    'Time: ' + c.fmt(d.logged) + ' of ' + (d.target ? c.fmt(d.target) : 'no target'),
});
