PlannerModules.registerBuiltin({
  id: 'links',
  kind: 'block',
  name: 'Links',
  icon: '\u2197',
  category: 'Text',
  defaults: () => ({ links: [] }),
  sanitize: (d, c) => ({
    links: c.arr(d && d.links, 50).map((l) => {
      l = l || {};
      return {
        id: c.str(l.id, 20) || c.uid(),
        title: c.str(l.title, 80),
        url: c.strict ? c.safeUrl(l.url) : c.str(l.url, 500),
      };
    }),
  }),
  render(el, api) {
    const { h, rowDel } = PlannerUI,
      d = api.get(),
      su = api.util.safeUrl;
    if (api.mode === 'view')
      return void el.append(h('ul', { class: 'rlinks' }, d.links.map((l) => {
        const u = su(l.url);
        return h('li', null, u ? h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, l.title || u) : l.title || '');
      })));
    d.links.forEach((l, j) => {
      const a = h('a', { class: 'ic open', target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Open link' }, '\u2197');
      const setA = () => {
        const u = su(l.url);
        if (u) { a.setAttribute('href', u); a.removeAttribute('aria-disabled'); }
        else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); }
      };
      setA();
      el.append(h('div', { class: 'linkrow' },
        h('input', {
          type: 'text', id: 'lt-' + l.id, value: l.title, placeholder: 'Title', maxlength: 80, 'aria-label': 'Link title',
          oninput: (e) => api.edit('lt' + l.id, () => { l.title = e.target.value; }),
        }),
        h('input', {
          type: 'text', value: l.url, placeholder: 'https://\u2026', maxlength: 500, 'aria-label': 'Link URL',
          oninput: (e) => { api.edit('lu' + l.id, () => { l.url = e.target.value; }); setA(); },
          onchange: (e) => {
            let v = e.target.value.trim();
            if (v && !/^[a-z][a-z0-9+.\-]*:/i.test(v)) v = 'https://' + v;
            e.target.value = v;
            api.edit('lu' + l.id, () => { l.url = v.slice(0, 500); });
            setA();
          },
        }),
        a,
        rowDel(api, d.links, j, 'Delete link')));
    });
    el.append(h('button', {
      class: 'btn sm', type: 'button',
      onclick: () => {
        const l = { id: api.util.uid(), title: '', url: '' };
        api.act(() => d.links.push(l));
        api.rerender('lt-' + l.id);
      },
    }, '+ Add link'));
  },
  toMarkdown: (d, c) =>
    d.links
      .map((l) => {
        const u = c.safeUrl(l.url);
        return '- ' + (u ? '[' + (l.title || u) + '](' + u + ')' : l.title);
      })
      .join('\n'),
});
