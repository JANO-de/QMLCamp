(function () {
  'use strict';
  var KEY = 'qmlcamp-planner-v1';
  var COLORS = ['rose', 'butter', 'sage', 'sky', 'lav', 'peach'];
  var TYPES = {
    tasks: { icon: '\u2611', name: 'Tasks' },
    note: { icon: '\u270e', name: 'Note' },
    links: { icon: '\u2197', name: 'Links' },
    list: { icon: '\u2022', name: 'List' },
    time: { icon: '\u23f1', name: 'Time' },
    milestone: { icon: '\u2691', name: 'Milestone' },
  };
  var ORDER = ['tasks', 'note', 'links', 'list', 'time', 'milestone'];
  var saveFailed = false,
    newColor = 'lav',
    focusId = null,
    firstRun = false;
  var editing = false; /* every page load and plan switch starts in reading mode; editing is switched on by hand */
  var view = document.getElementById('view'),
    notice = document.getElementById('notice');

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }
  function str(x, n) {
    return typeof x === 'string' ? x.slice(0, n) : '';
  }
  function arr(x, n) {
    return Array.isArray(x) ? x.slice(0, n) : [];
  }
  function num(x, max) {
    return Math.max(0, Math.min(max, Math.round(Number(x)) || 0));
  }
  function safeUrl(u) {
    u = str(u, 500).trim();
    return /^https?:\/\/\S+$/i.test(u) ? u : '';
  }
  function fmt(m) {
    return m < 60
      ? m + ' min'
      : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  }
  // Short message at the bottom of the screen (shared helper from js/ui.js).
  function toast(msg, opt) {
    QmlUI.toast(msg, opt);
  }
  // Run a change that can be undone: the old state is kept and an Undo button is offered.
  // (Used instead of "are you sure?" popups: acting is quick, and a mistake costs one tap.)
  function undoable(message, change) {
    var before = JSON.stringify(state);
    change();
    save();
    render();
    toast(message, {
      label: 'Undo',
      onClick: function () {
        var s = JSON.parse(before);
        state.plans = s.plans.map(function (p) {
          return cleanPlan(p, false);
        });
        state.current = s.current;
        save();
        render();
      },
    });
  }

  function cleanBlock(b, ok, strict) {
    b = b && typeof b === 'object' ? b : {};
    var type = TYPES[b.type] ? b.type : 'tasks';
    var o = {
      id: str(b.id, 20) || uid(),
      type: type,
      label: str(b.label, 16),
      title: str(b.title, 120),
      exam: !!b.exam,
      tags: arr(b.tags, 40).filter(function (i) {
        return ok[i];
      }),
    };
    if (type === 'tasks')
      o.tasks = arr(b.tasks, 100).map(function (t) {
        if (typeof t === 'string') t = { text: t };
        t = t || {};
        return { id: str(t.id, 20) || uid(), text: str(t.text, 200), done: !!t.done };
      });
    else if (type === 'note') o.text = str(b.text, 5000);
    else if (type === 'links')
      o.links = arr(b.links, 50).map(function (l) {
        l = l || {};
        return {
          id: str(l.id, 20) || uid(),
          title: str(l.title, 80),
          url: strict ? safeUrl(l.url) : str(l.url, 500),
        };
      });
    else if (type === 'list')
      o.items = arr(b.items, 100).map(function (t) {
        if (typeof t === 'string') t = { text: t };
        t = t || {};
        return { id: str(t.id, 20) || uid(), text: str(t.text, 200) };
      });
    else if (type === 'time') {
      o.target = num(b.target, 100000);
      o.logged = num(b.logged, 100000);
    } else o.text = str(b.text, 300);
    return o;
  }
  function cleanPlan(p, strict) {
    p = p && typeof p === 'object' ? p : {};
    var tags = arr(p.tags, 40).map(function (t) {
      t = t || {};
      return {
        id: str(t.id, 20) || uid(),
        name: str(t.name, 30),
        color: COLORS.indexOf(t.color) >= 0 ? t.color : 'lav',
      };
    });
    var ok = {};
    tags.forEach(function (t) {
      ok[t.id] = 1;
    });
    return {
      id: str(p.id, 20) || uid(),
      title: str(p.title, 80) || 'Untitled plan',
      tags: tags,
      blocks: arr(p.blocks, 200).map(function (b) {
        return cleanBlock(b, ok, strict);
      }),
    };
  }
  function clone(p, strict) {
    return cleanPlan(JSON.parse(JSON.stringify(p)), strict);
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {}
    if (raw === null) {
      firstRun = true;
      return { plans: [], current: null };
    }
    try {
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.plans)) {
        var plans = s.plans.slice(0, 100).map(function (p) {
          return cleanPlan(p, false);
        });
        var cur = plans.some(function (p) {
          return p.id === s.current;
        })
          ? s.current
          : (plans[0] && plans[0].id) || null;
        return { plans: plans, current: cur };
      }
    } catch (e) {}
    return { plans: [], current: null };
  }
  var state = load();
  function applyHash() {
    var m = /plan=([\w-]+)/.exec(location.hash);
    if (
      m &&
      state.plans.some(function (p) {
        return p.id === m[1];
      })
    )
      state.current = m[1];
  }
  applyHash();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveFailed = false;
    } catch (e) {
      saveFailed = true;
    }
    notice.hidden = !saveFailed;
    notice.textContent = saveFailed
      ? 'This browser can\u2019t store data here. Use Export to keep your plans.'
      : '';
  }
  function cur() {
    return (
      state.plans.filter(function (p) {
        return p.id === state.current;
      })[0] || null
    );
  }
  // Add a plan made from a template and open it.
  function addTemplate(t) {
    var q = fromTemplate(t);
    state.plans.push(q);
    state.current = q.id;
    editing = false;
    save();
    render();
    toast('Template added.');
  }
  // The first block that still has work to do: unticked tasks, or logged time below the target.
  function nextUp(p) {
    for (var i = 0; i < p.blocks.length; i++) {
      var b = p.blocks[i];
      if (
        (b.type === 'tasks' &&
          b.tasks.some(function (t) {
            return !t.done;
          })) ||
        (b.type === 'time' && b.target > 0 && b.logged < b.target)
      )
        return b.id;
    }
    return null;
  }
  // Scroll to the "next up" block and flash it.
  function jumpNext() {
    var el = refs[nextUp(cur())];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(function () {
      el.classList.remove('flash');
    }, 1800);
  }
  function uniqueTitle(t) {
    var names = state.plans.map(function (p) {
        return p.title;
      }),
      n = t,
      i = 2;
    while (names.indexOf(n) >= 0) n = (t + ' (' + i++ + ')').slice(0, 80);
    return n;
  }
  function fromTemplate(t) {
    var p = clone(t.plan, true);
    p.id = uid();
    p.title = uniqueTitle(p.title);
    return p;
  }
  if (firstRun) {
    (window.PLANNER_TEMPLATES || []).forEach(function (t) {
      if (t.seed) {
        var p = fromTemplate(t);
        state.plans.push(p);
        state.current = state.current || p.id;
      }
    });
    save();
  }

  function h(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (n) {
        e.append(n && n.nodeType ? n : document.createTextNode(n));
      });
    }
    return e;
  }
  function menu(label, items) {
    var d = h(
      'details',
      { class: 'menu' },
      h('summary', { class: 'btn' }, label),
      h(
        'div',
        { class: 'pop' },
        items.map(function (it) {
          return h(
            'button',
            {
              type: 'button',
              class: 'btn',
              onclick: function () {
                d.removeAttribute('open');
                it.fn();
              },
            },
            it.text
          );
        })
      )
    );
    return d;
  }
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(document.querySelectorAll('details.menu[open]'), function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  var refs = {};
  var nextId = null; // id of the block marked "next up" (reading mode only)
  function progress(p) {
    var total = 0,
      done = 0;
    p.blocks.forEach(function (b) {
      if (b.type !== 'tasks') return;
      b.tasks.forEach(function (t) {
        total++;
        if (t.done) done++;
      });
      var el = refs[b.id];
      if (el)
        el.classList.toggle(
          'done',
          b.tasks.length > 0 &&
            b.tasks.every(function (t) {
              return t.done;
            })
        );
    });
    var pct = total ? Math.round((done / total) * 100) : 0;
    if (refs.pct) {
      refs.pct.textContent = pct + ' %';
      refs.cnt.textContent = done + ' of ' + total + ' tasks';
      refs.fill.style.width = pct + '%';
    }
  }
  function fit(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  function render() {
    refs = {};
    view.textContent = '';
    nextId = null;
    var p = cur(),
      tpls = window.PLANNER_TEMPLATES || [];
    var file = h('input', {
      type: 'file',
      accept: 'application/json,.json',
      hidden: true,
      onchange: importFile,
    });
    var sel = h(
      'select',
      {
        'aria-label': 'Plan',
        onchange: function (e) {
          state.current = e.target.value;
          editing = false;
          save();
          render();
        },
      },
      state.plans.map(function (q) {
        return h('option', { value: q.id, selected: q.id === state.current }, q.title);
      })
    );
    view.append(
      h(
        'div',
        { class: 'bar' },
        state.plans.length ? sel : null,
        p && !editing && nextUp(p)
          ? h('button', { class: 'btn main', type: 'button', onclick: jumpNext }, '\u25b6 Next up')
          : null,
        h('button', { class: 'btn', type: 'button', onclick: newPlan }, 'New plan'),
        p
          ? h(
              'button',
              {
                class: 'btn' + (editing ? ' main' : ''),
                type: 'button',
                'aria-pressed': String(editing),
                onclick: function () {
                  editing = !editing;
                  render();
                },
              },
              editing ? 'Done editing' : 'Edit plan'
            )
          : null,
        p && editing
          ? h('button', { class: 'btn', type: 'button', onclick: dupPlan }, 'Duplicate')
          : null,
        tpls.length
          ? menu(
              'Templates',
              tpls.map(function (t) {
                return {
                  text: t.name,
                  fn: function () {
                    addTemplate(t);
                  },
                };
              })
            )
          : null,
        state.plans.length
          ? menu('Export', [
              {
                text: 'This plan (.json)',
                fn: function () {
                  exportJson([p], slug(p.title) + '.plan.json');
                },
              },
              {
                text: 'All plans (.json)',
                fn: function () {
                  exportJson(state.plans, 'qmlcamp-plans.json');
                },
              },
              {
                text: 'This plan as Markdown (.md)',
                fn: function () {
                  download(slug(p.title) + '.md', toMd(p), 'text/markdown');
                },
              },
            ])
          : null,
        h(
          'button',
          {
            class: 'btn',
            type: 'button',
            onclick: function () {
              file.click();
            },
          },
          'Import'
        ),
        p && editing
          ? h('button', { class: 'btn danger', type: 'button', onclick: delPlan }, 'Delete plan')
          : null,
        file
      )
    );
    if (!p) {
      view.append(
        h(
          'div',
          { class: 'empty' },
          h('h1', null, 'No plans yet'),
          h(
            'p',
            null,
            'A plan is a timeline of blocks (days, weeks, phases) with tasks you tick off. Start from scratch, from a template, or import a plan file.'
          ),
          h(
            'div',
            { class: 'bar' },
            h(
              'button',
              { class: 'btn main', type: 'button', onclick: newPlan },
              'Create your first plan'
            ),
            tpls.map(function (t) {
              return h(
                'button',
                {
                  class: 'btn',
                  type: 'button',
                  onclick: function () {
                    addTemplate(t);
                  },
                },
                'Start from: ' + t.name
              );
            })
          )
        )
      );
      return;
    }
    view.classList.toggle('reading', !editing);
    nextId = editing ? null : nextUp(p);
    if (!editing)
      view.append(
        h(
          'div',
          { class: 'modehint', role: 'status' },
          'Reading mode. You can tick tasks and log time; press Edit plan to change the plan itself.'
        )
      );
    view.append(
      !editing
        ? h('h1', { class: 'title ro' }, p.title)
        : h('input', {
            class: 'title',
            value: p.title,
            'aria-label': 'Plan title',
            maxlength: 80,
            oninput: function (e) {
              p.title = e.target.value;
              save();
              var o = sel.querySelector('option:checked');
              if (o) o.textContent = p.title || 'Untitled plan';
            },
          })
    );
    refs.pct = h('b', null, '0 %');
    refs.cnt = h('span');
    refs.fill = h('i');
    view.append(
      h('div', { class: 'prog' }, refs.pct, h('div', { class: 'meter' }, refs.fill), refs.cnt)
    );
    if (editing) view.append(tagBox(p));
    else if (p.tags.length)
      view.append(
        h(
          'div',
          { class: 'chips ro' },
          p.tags.map(function (t) {
            return h('span', { class: 'chip', 'data-c': t.color }, t.name);
          })
        )
      );
    var ol = h('ol', { class: 'line' });
    p.blocks.forEach(function (b, i) {
      ol.append(blockEl(p, b, i));
    });
    if (!editing && !p.blocks.length)
      ol.append(
        h('li', { class: 'hint' }, 'This plan has no blocks yet. Press Edit plan to add some.')
      );
    view.append(
      ol,
      !editing
        ? null
        : h(
            'div',
            { class: 'addrow', role: 'group', 'aria-label': 'Add block' },
            ORDER.map(function (t) {
              return h(
                'button',
                {
                  class: 'btn',
                  type: 'button',
                  onclick: function () {
                    var b = cleanBlock({ id: uid(), type: t, exam: t === 'milestone' }, {}, false);
                    p.blocks.push(b);
                    focusId = 't-' + b.id;
                    save();
                    render();
                  },
                },
                '+ ' + TYPES[t].name
              );
            })
          )
    );
    progress(p);
    Array.prototype.forEach.call(view.querySelectorAll('.notearea'), fit);
    if (focusId) {
      var f = document.getElementById(focusId);
      if (f) f.focus();
      focusId = null;
    }
  }

  function tagBox(p) {
    var list = h(
      'div',
      { class: 'chips' },
      p.tags.length
        ? p.tags.map(function (t) {
            return h(
              'span',
              { class: 'chip', 'data-c': t.color },
              t.name,
              h(
                'button',
                {
                  class: 'x',
                  type: 'button',
                  'aria-label': 'Delete tag ' + t.name,
                  onclick: function () {
                    p.tags = p.tags.filter(function (x) {
                      return x.id !== t.id;
                    });
                    p.blocks.forEach(function (b) {
                      b.tags = b.tags.filter(function (i) {
                        return i !== t.id;
                      });
                    });
                    save();
                    render();
                  },
                },
                '\u00d7'
              )
            );
          })
        : h(
            'span',
            { class: 'hint' },
            'No tags yet. Tags label blocks by topic (e.g. theory, practice, review).'
          )
    );
    var inp = h('input', {
      type: 'text',
      placeholder: 'New tag',
      maxlength: 30,
      'aria-label': 'New tag name',
      onkeydown: function (e) {
        if (e.key === 'Enter') addTag();
      },
    });
    function addTag() {
      var n = inp.value.trim();
      if (!n) return;
      p.tags.push({ id: uid(), name: n.slice(0, 30), color: newColor });
      save();
      render();
    }
    var sw = h(
      'div',
      { class: 'sw', role: 'group', 'aria-label': 'Tag colour' },
      COLORS.map(function (c) {
        return h('button', {
          type: 'button',
          'data-c': c,
          'aria-label': c,
          'aria-pressed': String(c === newColor),
          onclick: function (e) {
            newColor = c;
            Array.prototype.forEach.call(sw.children, function (b) {
              b.setAttribute('aria-pressed', String(b === e.currentTarget));
            });
          },
        });
      })
    );
    return h(
      'section',
      { class: 'tagbox' },
      h('h2', null, 'Tags'),
      list,
      h(
        'div',
        { class: 'newtag' },
        inp,
        sw,
        h('button', { class: 'btn', type: 'button', onclick: addTag }, 'Add tag')
      )
    );
  }

  function hasContent(b) {
    return (
      (b.tasks && b.tasks.length) ||
      (b.items && b.items.length) ||
      (b.links && b.links.length) ||
      (b.text && b.text.length) ||
      b.logged > 0
    );
  }
  function rowDel(arr, j, label) {
    return h(
      'button',
      {
        class: 'ic del',
        type: 'button',
        'aria-label': label,
        onclick: function (e) {
          e.preventDefault();
          undoable('Item removed', function () {
            arr.splice(j, 1);
          });
        },
      },
      '\u00d7'
    );
  }
  function adder(placeholder, id, push) {
    var a = h('input', {
      class: 'add',
      id: id,
      type: 'text',
      placeholder: placeholder,
      maxlength: 200,
      'aria-label': placeholder,
      onkeydown: function (e) {
        if (e.key !== 'Enter') return;
        var v = e.target.value.trim();
        if (!v) return;
        push(v.slice(0, 200));
        focusId = id;
        save();
        render();
      },
    });
    return a;
  }

  function readBody(b) {
    var box = h('div', { class: 'body' });
    if (b.type === 'list')
      box.append(
        h(
          'ul',
          { class: 'rlist' },
          b.items.map(function (t) {
            return h('li', null, t.text);
          })
        )
      );
    else if (b.type === 'note') box.append(h('div', { class: 'noteread' }, b.text));
    else if (b.type === 'links')
      box.append(
        h(
          'ul',
          { class: 'rlinks' },
          b.links.map(function (l) {
            var u = safeUrl(l.url);
            return h(
              'li',
              null,
              u
                ? h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, l.title || u)
                : l.title || ''
            );
          })
        )
      );
    else box.append(h('p', { class: 'msgread' }, b.text));
    return box;
  }
  function bodyEl(p, b, ro) {
    if (ro && b.type !== 'tasks' && b.type !== 'time') return readBody(b);
    var box = h('div', { class: 'body' });
    if (b.type === 'tasks') {
      b.tasks.forEach(function (t, j) {
        var row = h(
          'label',
          { class: 'task' + (t.done ? ' done' : '') },
          h('input', {
            type: 'checkbox',
            checked: t.done,
            'aria-label': 'Done',
            onchange: function (e) {
              t.done = e.target.checked;
              row.classList.toggle('done', t.done);
              save();
              progress(p);
            },
          }),
          ro
            ? h('span', { class: 'txt' }, t.text)
            : h('input', {
                type: 'text',
                value: t.text,
                maxlength: 200,
                'aria-label': 'Task',
                oninput: function (e) {
                  t.text = e.target.value;
                  save();
                },
              }),
          ro ? null : rowDel(b.tasks, j, 'Delete task')
        );
        box.append(row);
      });
      if (!ro)
        box.append(
          adder('Add task, press Enter', 'a-' + b.id, function (v) {
            b.tasks.push({ id: uid(), text: v, done: false });
          })
        );
    } else if (b.type === 'list') {
      b.items.forEach(function (t, j) {
        box.append(
          h(
            'div',
            { class: 'task item' },
            h('span', { class: 'dot', 'aria-hidden': 'true' }, '\u2022'),
            h('input', {
              type: 'text',
              value: t.text,
              maxlength: 200,
              'aria-label': 'Item',
              oninput: function (e) {
                t.text = e.target.value;
                save();
              },
            }),
            rowDel(b.items, j, 'Delete item')
          )
        );
      });
      box.append(
        adder('Add item, press Enter', 'a-' + b.id, function (v) {
          b.items.push({ id: uid(), text: v });
        })
      );
    } else if (b.type === 'note') {
      var ta = h('textarea', {
        class: 'notearea',
        rows: 3,
        maxlength: 5000,
        placeholder: 'Write a note\u2026',
        'aria-label': 'Note',
        oninput: function (e) {
          b.text = e.target.value;
          save();
          fit(e.target);
        },
      });
      ta.value = b.text;
      box.append(ta);
    } else if (b.type === 'links') {
      b.links.forEach(function (l, j) {
        var a = h(
          'a',
          {
            class: 'ic open',
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': 'Open link',
          },
          '\u2197'
        );
        function setA() {
          var u = safeUrl(l.url);
          if (u) {
            a.setAttribute('href', u);
            a.removeAttribute('aria-disabled');
          } else {
            a.removeAttribute('href');
            a.setAttribute('aria-disabled', 'true');
          }
        }
        setA();
        box.append(
          h(
            'div',
            { class: 'linkrow' },
            h('input', {
              type: 'text',
              id: 'lt-' + l.id,
              value: l.title,
              placeholder: 'Title',
              maxlength: 80,
              'aria-label': 'Link title',
              oninput: function (e) {
                l.title = e.target.value;
                save();
              },
            }),
            h('input', {
              type: 'text',
              value: l.url,
              placeholder: 'https://\u2026',
              maxlength: 500,
              'aria-label': 'Link URL',
              oninput: function (e) {
                l.url = e.target.value;
                save();
                setA();
              },
              onchange: function (e) {
                var v = e.target.value.trim();
                if (v && !/^[a-z][a-z0-9+.\-]*:/i.test(v)) v = 'https://' + v;
                e.target.value = v;
                l.url = v.slice(0, 500);
                save();
                setA();
              },
            }),
            a,
            rowDel(b.links, j, 'Delete link')
          )
        );
      });
      box.append(
        h(
          'button',
          {
            class: 'btn sm',
            type: 'button',
            onclick: function () {
              var l = { id: uid(), title: '', url: '' };
              b.links.push(l);
              focusId = 'lt-' + l.id;
              save();
              render();
            },
          },
          '+ Add link'
        )
      );
    } else if (b.type === 'time') {
      var lab = h('span', { class: 'tlabel' }),
        fill = h('i');
      var upd = function () {
        lab.textContent = fmt(b.logged) + ' of ' + (b.target ? fmt(b.target) : 'no target');
        fill.style.width = (b.target ? Math.min(100, (b.logged / b.target) * 100) : 0) + '%';
        refs[b.id].classList.toggle('done', b.target > 0 && b.logged >= b.target);
      };
      var add = function (n) {
        return h(
          'button',
          {
            class: 'btn sm',
            type: 'button',
            onclick: function () {
              b.logged = num(b.logged + n, 100000);
              save();
              upd();
            },
          },
          (n > 0 ? '+' : '\u2212') + Math.abs(n)
        );
      };
      box.append(
        h('div', { class: 'timebox' }, h('div', { class: 'meter' }, fill), lab),
        h(
          'div',
          { class: 'timectl' },
          add(-15),
          add(15),
          add(30),
          add(60),
          ro
            ? null
            : h(
                'label',
                { class: 'tgt' },
                'Target (min)',
                h('input', {
                  type: 'number',
                  min: 0,
                  max: 100000,
                  value: b.target,
                  'aria-label': 'Target minutes',
                  oninput: function (e) {
                    b.target = num(e.target.value, 100000);
                    save();
                    upd();
                  },
                })
              )
        )
      );
      upd();
    } else {
      box.append(
        h('input', {
          class: 'msg',
          type: 'text',
          value: b.text,
          maxlength: 300,
          placeholder: 'What happens?',
          'aria-label': 'Milestone details',
          oninput: function (e) {
            b.text = e.target.value;
            save();
          },
        })
      );
    }
    return box;
  }

  function blockEl(p, b, i) {
    var li = h('li', { class: 'blk t-' + b.type + (b.exam ? ' exam' : '') });
    refs[b.id] = li;
    if (!editing) {
      var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('viewBox', '0 0 76 76');
      sv.setAttribute('aria-hidden', 'true');
      var pg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pg.setAttribute('points', '38,3 73,38 38,73 3,38');
      sv.append(pg);
      var names = {};
      p.tags.forEach(function (t) {
        names[t.id] = t;
      });
      li.append(
        h('div', { class: 'node' }, sv, h('span', { class: 'nlabel' }, b.label)),
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'head' },
            h('span', { class: 'kind', title: TYPES[b.type].name }, TYPES[b.type].icon),
            h('h2', { class: 'btitle' }, b.title || TYPES[b.type].name),
            b.exam ? h('span', { class: 'keydate', title: 'Key date' }, '\u2691 key date') : null,
            b.id === nextId ? h('span', { class: 'nextup' }, '\u25b6 next up') : null
          ),
          b.tags.length
            ? h(
                'div',
                { class: 'chips' },
                b.tags.map(function (i) {
                  return names[i]
                    ? h('span', { class: 'chip', 'data-c': names[i].color }, names[i].name)
                    : null;
                })
              )
            : null,
          bodyEl(p, b, true)
        )
      );
      return li;
    }
    var node = h(
      'div',
      { class: 'node' },
      (function () {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 76 76');
        s.setAttribute('aria-hidden', 'true');
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        g.setAttribute('points', '38,3 73,38 38,73 3,38');
        s.append(g);
        return s;
      })(),
      h('input', {
        value: b.label,
        placeholder: 'label',
        maxlength: 16,
        'aria-label': 'Block label',
        oninput: function (e) {
          b.label = e.target.value;
          save();
        },
      })
    );
    var head = h(
      'div',
      { class: 'head' },
      h(
        'span',
        { class: 'kind', title: TYPES[b.type].name, 'aria-label': TYPES[b.type].name + ' block' },
        TYPES[b.type].icon
      ),
      h('input', {
        id: 't-' + b.id,
        value: b.title,
        placeholder: 'Block title',
        maxlength: 120,
        'aria-label': 'Block title',
        oninput: function (e) {
          b.title = e.target.value;
          save();
        },
      }),
      h(
        'button',
        {
          class: 'ic' + (b.exam ? ' on' : ''),
          type: 'button',
          title: 'Mark as key date',
          'aria-label': 'Mark as key date',
          'aria-pressed': String(b.exam),
          onclick: function () {
            b.exam = !b.exam;
            save();
            render();
          },
        },
        '\u2691'
      ),
      h(
        'button',
        {
          class: 'ic',
          type: 'button',
          title: 'Move up',
          'aria-label': 'Move block up',
          disabled: i === 0,
          onclick: function () {
            move(p, i, -1);
          },
        },
        '\u25b2'
      ),
      h(
        'button',
        {
          class: 'ic',
          type: 'button',
          title: 'Move down',
          'aria-label': 'Move block down',
          disabled: i === p.blocks.length - 1,
          onclick: function () {
            move(p, i, 1);
          },
        },
        '\u25bc'
      ),
      h(
        'button',
        {
          class: 'ic del',
          type: 'button',
          title: 'Delete block',
          'aria-label': 'Delete block',
          onclick: function () {
            undoable('Block deleted', function () {
              p.blocks.splice(i, 1);
            });
          },
        },
        '\u00d7'
      )
    );
    var tags = h(
      'div',
      { class: 'chips' },
      p.tags.length
        ? p.tags.map(function (t) {
            var on = b.tags.indexOf(t.id) >= 0;
            return h(
              'button',
              {
                class: 'chip ' + (on ? 'on' : 'off'),
                'data-c': t.color,
                type: 'button',
                'aria-pressed': String(on),
                onclick: function (e) {
                  var k = b.tags.indexOf(t.id);
                  if (k >= 0) b.tags.splice(k, 1);
                  else b.tags.push(t.id);
                  var now = k < 0;
                  e.currentTarget.className = 'chip ' + (now ? 'on' : 'off');
                  e.currentTarget.setAttribute('aria-pressed', String(now));
                  save();
                },
              },
              t.name
            );
          })
        : h('span', { class: 'hint' }, 'Create tags above to label this block.')
    );
    li.append(node, h('div', { class: 'card' }, head, tags, bodyEl(p, b)));
    return li;
  }

  function move(p, i, d) {
    var j = i + d;
    if (j < 0 || j >= p.blocks.length) return;
    var t = p.blocks[i];
    p.blocks[i] = p.blocks[j];
    p.blocks[j] = t;
    save();
    render();
  }
  function newPlan() {
    QmlUI.prompt('Plan name', 'New plan', { ok: 'Create' }).then(function (t) {
      if (t === null) return;
      var p = cleanPlan({ title: t.trim() || 'New plan' }, false);
      p.id = uid();
      state.plans.push(p);
      state.current = p.id;
      editing = true;
      save();
      render();
    });
  }
  function dupPlan() {
    var p = clone(cur(), false);
    p.id = uid();
    p.title = uniqueTitle((p.title + ' (copy)').slice(0, 80));
    p.blocks.forEach(function (b) {
      (b.tasks || []).forEach(function (t) {
        t.done = false;
      });
      if (b.type === 'time') b.logged = 0;
    });
    state.plans.push(p);
    state.current = p.id;
    save();
    render();
  }
  function delPlan() {
    var p = cur();
    if (!p) return;
    undoable('Plan \u201c' + p.title + '\u201d deleted', function () {
      state.plans = state.plans.filter(function (q) {
        return q.id !== p.id;
      });
      state.current = state.plans[0] ? state.plans[0].id : null;
    });
  }

  /* ---- export / import ---- */
  function slug(t) {
    return (
      (t || 'plan')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'plan'
    );
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type + ';charset=utf-8' });
    var a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }
  function exportJson(plans, name) {
    var data = {
      app: 'qmlcamp-planner',
      v: 1,
      exported: new Date().toISOString(),
      plans: plans.map(function (p) {
        return clone(p, true);
      }),
    };
    download(name, JSON.stringify(data, null, 2), 'application/json');
    toast('Exported ' + plans.length + (plans.length === 1 ? ' plan.' : ' plans.'));
  }
  function toMd(p) {
    var tt = 0,
      td = 0,
      names = {};
    p.tags.forEach(function (t) {
      names[t.id] = t.name;
    });
    p.blocks.forEach(function (b) {
      if (b.type === 'tasks')
        b.tasks.forEach(function (t) {
          tt++;
          if (t.done) td++;
        });
    });
    var out = ['# ' + p.title, ''];
    if (tt) out.push('Progress: ' + td + ' of ' + tt + ' tasks', '');
    p.blocks.forEach(function (b) {
      out.push(
        '## ' +
          (b.label ? '[' + b.label + '] ' : '') +
          (b.title || TYPES[b.type].name) +
          (b.exam ? ' \u2691' : '')
      );
      var tg = b.tags
        .map(function (i) {
          return names[i];
        })
        .filter(Boolean);
      if (tg.length) out.push('Tags: ' + tg.join(', '));
      out.push('');
      if (b.type === 'tasks')
        b.tasks.forEach(function (t) {
          out.push('- [' + (t.done ? 'x' : ' ') + '] ' + t.text);
        });
      else if (b.type === 'list')
        b.items.forEach(function (t) {
          out.push('- ' + t.text);
        });
      else if (b.type === 'links')
        b.links.forEach(function (l) {
          var u = safeUrl(l.url);
          out.push('- ' + (u ? '[' + (l.title || u) + '](' + u + ')' : l.title));
        });
      else if (b.type === 'time')
        out.push('Time: ' + fmt(b.logged) + ' of ' + (b.target ? fmt(b.target) : 'no target'));
      else if (b.text) out.push(b.text);
      out.push('');
    });
    return (
      out
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim() + '\n'
    );
  }
  function importFile(e) {
    var f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2e6) {
      toast('File too large (max 2 MB).');
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        var list = Array.isArray(d)
          ? d
          : d && Array.isArray(d.plans)
            ? d.plans
            : d && Array.isArray(d.blocks)
              ? [d]
              : null;
        if (!list || !list.length) throw new Error('bad');
        var added = list.slice(0, 100).map(function (q) {
          var p = cleanPlan(q, true);
          p.id = uid();
          p.title = uniqueTitle(p.title);
          state.plans.push(p);
          return p;
        });
        state.current = added[0].id;
        editing = false;
        save();
        render();
        toast('Imported ' + added.length + (added.length === 1 ? ' plan.' : ' plans.'));
      } catch (err) {
        toast('This file is not a valid planner export.');
      }
    };
    r.onerror = function () {
      toast('Could not read the file.');
    };
    r.readAsText(f);
  }

  window.addEventListener('hashchange', function () {
    var c = state.current;
    applyHash();
    if (state.current !== c) {
      editing = false;
      save();
      render();
    }
  });
  render();
})();
