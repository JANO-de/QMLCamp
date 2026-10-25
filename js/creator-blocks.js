// =============================================================================
//  ForgeBlocks: per-type forms for the QMLCamp course creator.
//  Every control mutates the block object in place; structural changes call the
//  editor's refresh(). Tests are data-only steps (no code is ever eval'd).
// =============================================================================
(function () {
  'use strict';
  const FB = (window.ForgeBlocks = {});
  const h = (...a) => window.ForgeCustom.h(...a);

  // step ops: [param, type] — '?' marks optional, ':num'/':bool' force the type
  const OPS = {
    noErrors: [],
    has: [['id']],
    count: [['type'], ['n', 'number']],
    eq: [['id'], ['prop'], ['value']],
    near: [['id'], ['prop'], ['value', 'number'], ['tol', 'number', '?']],
    rgbBelow: [['id'], ['prop', 'text', '?'], ['max', 'number']],
    uses: [['type']],
    declares: [['name']],
    sourceHas: [['text'], ['file', 'text', '?']],
    outHas: [['text']],
    click: [['id'], ['px', 'number', '?'], ['py', 'number', '?']],
    advance: [['ms', 'number']],
  };
  FB.ops = OPS;
  const QML_OPS = [
    'noErrors',
    'has',
    'count',
    'eq',
    'near',
    'rgbBelow',
    'uses',
    'declares',
    'sourceHas',
    'click',
    'advance',
  ];
  const RUST_OPS = ['noErrors', 'sourceHas', 'outHas'];
  FB.opsFor = (lang) => (lang === 'rust' ? RUST_OPS : QML_OPS);

  // Are we looking at a Rust lab? Block lang wins, then the course lang.
  FB.isRust = (block, course) => (block.lang || course.lang) === 'rust';

  function coerce(v) {
    const t = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    if (t === 'true') return true;
    if (t === 'false') return false;
    return v;
  }
  FB.coerce = coerce;

  function input(value, on, type) {
    return h('input', {
      class: 'cw-in',
      type: type || 'text',
      value: value == null ? '' : String(value),
      oninput: (e) => on(e.target.value),
    });
  }
  function area(value, on, rows) {
    return h(
      'textarea',
      { class: 'cw-in', rows: rows || 3, oninput: (e) => on(e.target.value) },
      value == null ? '' : String(value)
    );
  }
  function field(label, control, hint) {
    return h(
      'label',
      { class: 'cw-f' },
      h('span', {}, label),
      control,
      hint ? h('small', {}, hint) : null
    );
  }

  // a textarea that shows the HTML it produces live underneath
  function htmlBlock(label, value, on, rows) {
    const pv = h('div', { class: 'cw-pv', html: value || '' });
    const ta = area(
      value,
      (v) => {
        on(v);
        pv.innerHTML = v;
      },
      rows
    );
    return h(
      'div',
      { class: 'cw-f cw-wide' },
      h('span', {}, label),
      ta,
      h('small', {}, 'Live preview'),
      pv
    );
  }

  // a reorderable list of rows: renderRow(item, i) -> element, plus add/remove/move
  function list(label, items, ctx, renderRow, makeNew, addLabel) {
    const box = h('div', { class: 'cw-list' });
    items.forEach((it, i) => {
      const row = h(
        'div',
        { class: 'cw-item' },
        h(
          'div',
          { class: 'cw-itemhead' },
          h('b', {}, i + 1 + '. ' + (it.title || it.story || it.text || 'item')),
          h('span', { class: 'cw-sp' }),
          h(
            'button',
            {
              class: 'cw-x',
              title: 'Move up',
              disabled: i === 0,
              onclick: () => {
                items.splice(i - 1, 0, items.splice(i, 1)[0]);
                ctx.refresh();
              },
            },
            '\u2191'
          ),
          h(
            'button',
            {
              class: 'cw-x',
              title: 'Move down',
              disabled: i === items.length - 1,
              onclick: () => {
                items.splice(i + 1, 0, items.splice(i, 1)[0]);
                ctx.refresh();
              },
            },
            '\u2193'
          ),
          h(
            'button',
            {
              class: 'cw-x',
              title: 'Delete',
              onclick: () => {
                QmlUI.confirm('Delete this ' + label + '?', { ok: 'Delete', danger: true }).then(
                  (yes) => {
                    if (!yes) return;
                    items.splice(i, 1);
                    ctx.refresh();
                  }
                );
              },
            },
            '\u2715'
          )
        ),
        renderRow(it, i)
      );
      box.append(row);
    });
    box.append(
      h(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            items.push(makeNew());
            ctx.refresh();
          },
        },
        addLabel
      )
    );
    return box;
  }
  FB.list = list;

  // options textarea (one per line) + answer select — shared by theory questions and quizzes
  function optionsEditor(q, ctx) {
    const opts = q.options || [];
    const ta = h(
      'textarea',
      {
        class: 'cw-in',
        rows: Math.max(3, opts.length),
        oninput: (e) => {
          q.options = e.target.value.split('\n').map((s) => s.trim());
          ctx.dirty();
        },
      },
      opts.join('\n')
    );
    const kids = [h('span', {}, 'Options (one per line)'), ta];
    if (opts.length) {
      const sel = h('select', {
        class: 'cw-in',
        onchange: (e) => {
          q.answer = +e.target.value;
          ctx.dirty();
        },
      });
      opts.forEach((o, i) =>
        sel.append(
          h(
            'option',
            { value: i, selected: q.answer === i },
            i + 1 + '. ' + o.replace(/<[^>]+>/g, '')
          )
        )
      );
      kids.push(
        h('small', {}, 'Correct option'),
        sel,
        h('small', {}, 'Options may contain HTML like <code>&lt;code&gt;</code>.')
      );
    }
    return h('div', { class: 'cw-f cw-wide' }, ...kids);
  }

  // ------------------------------------------------------------------ theory
  function theoryForm(b, ctx) {
    const box = h('div', { class: 'cw-grid' });
    box.append(
      field(
        'Title',
        input(b.title, (v) => {
          b.title = v;
          ctx.title();
        })
      )
    );
    box.append(
      field(
        'Description',
        area(
          b.desc,
          (v) => {
            b.desc = v;
          },
          2
        )
      )
    );
    box.append(htmlBlock('Intro (HTML)', b.intro, (v) => (b.intro = v), 3));
    box.append(h('h4', {}, 'Lessons'));
    box.append(
      list(
        'lesson',
        b.lessons,
        ctx,
        (l, i) => lessonForm(l, ctx),
        () => ({ title: 'New lesson', html: '<p></p>' }),
        '+ Add lesson'
      )
    );
    return box;
  }
  function lessonForm(l, ctx) {
    const box = h('div', {});
    box.append(
      field(
        'Title',
        input(l.title, (v) => (l.title = v))
      )
    );
    box.append(htmlBlock('HTML (the lesson body)', l.html, (v) => (l.html = v), 5));
    box.append(
      field(
        'Example code (runs in a live editor; leave empty for none)',
        area(
          l.example,
          (v) => {
            if (v && v.trim()) l.example = v;
            else delete l.example;
          },
          5
        )
      )
    );
    const hasQ = h('input', {
      type: 'checkbox',
      checked: !!l.q,
      onchange: (e) => {
        if (e.target.checked)
          l.q = { text: 'Question', options: ['Wrong', 'Right'], answer: 1, why: '' };
        else delete l.q;
        ctx.refresh();
      },
    });
    box.append(h('label', { class: 'cw-f cw-inline' }, hasQ, 'Has a check question'));
    if (l.q) box.append(questionForm(l.q, ctx));
    return box;
  }
  function questionForm(q, ctx) {
    const box = h('div', { class: 'cw-sub' });
    box.append(
      field(
        'Question text',
        input(q.text, (v) => (q.text = v))
      )
    );
    box.append(optionsEditor(q, ctx));
    box.append(
      field(
        'Why (explanation shown after answering)',
        input(q.why, (v) => (q.why = v))
      )
    );
    return box;
  }

  // ------------------------------------------------------------------ lab
  function filesForm(label, files, on, lang) {
    const box = h('div', { class: 'cw-sub' });
    box.append(h('h4', {}, label));
    const refresh = () => {
      box.innerHTML = '';
      box.append(h('h4', {}, label));
      render();
    };
    const render = () => {
      Object.keys(files).forEach((name, i, arr) => {
        const row = h('div', { class: 'cw-file' });
        let cur = name;
        const nameIn = input(name, (v) => {
          if (v && v !== cur && !(v in files)) {
            files[v] = files[cur];
            delete files[cur];
            cur = v;
            on();
          }
        });
        row.append(
          h(
            'div',
            { class: 'cw-filehead' },
            nameIn,
            h('span', { class: 'cw-sp' }),
            h(
              'button',
              {
                class: 'cw-x',
                disabled: arr.length <= 1,
                title: 'Delete file',
                onclick: () => {
                  QmlUI.confirm('Delete file ' + cur + '?', { ok: 'Delete', danger: true }).then(
                    (yes) => {
                      if (!yes) return;
                      delete files[cur];
                      refresh();
                      on();
                    }
                  );
                },
              },
              '\u2715'
            )
          )
        );
        row.append(
          area(
            files[cur],
            (v) => {
              files[cur] = v;
              on();
            },
            6
          )
        );
        box.append(row);
      });
      box.append(
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              let n = lang === 'rust' ? 'file.rs' : 'file.qml',
                i = 1;
              while (files[n])
                n = (lang === 'rust' ? 'file' : 'file') + ++i + (lang === 'rust' ? '.rs' : '.qml');
              files[n] = '';
              refresh();
              on();
            },
          },
          '+ Add file'
        )
      );
    };
    render();
    return box;
  }
  function labForm(b, ctx) {
    const rust = FB.isRust(b, ctx.draft);
    const box = h('div', { class: 'cw-grid' });
    box.append(
      field(
        'Title',
        input(b.title, (v) => {
          b.title = v;
          ctx.title();
        })
      )
    );
    box.append(
      field(
        'Description',
        area(b.desc, (v) => (b.desc = v), 2)
      )
    );
    box.append(htmlBlock('Instructions (desc2, HTML)', b.desc2, (v) => (b.desc2 = v), 4));
    const langBox = h('select', {
      class: 'cw-in',
      onchange: (e) => {
        if (e.target.value) b.lang = e.target.value;
        else delete b.lang;
        ctx.refresh();
      },
    });
    ['(course default)', 'qml', 'js', 'rust'].forEach((o, i) =>
      langBox.append(
        h('option', { value: i ? o : '', selected: (b.lang || '') === (i ? o : '') }, o)
      )
    );
    box.append(field('Code language', langBox, 'Override the course language for this lab.'));
    box.append(filesForm('Starter files', b.files, () => {}, rust ? 'rust' : 'qml'));
    box.append(filesForm('Solution files', b.solution, () => {}, rust ? 'rust' : 'qml'));
    box.append(
      h('h4', {}, 'Tests (each test = a user story + steps; starter must fail, solution must pass)')
    );
    box.append(
      list(
        'test',
        b.tests,
        ctx,
        (t, i) => testForm(t, ctx, rust),
        () => ({ story: 'New story', steps: [{ op: 'noErrors' }] }),
        '+ Add test'
      )
    );
    return box;
  }
  function testForm(t, ctx, rust) {
    const box = h('div', {});
    box.append(
      field(
        'Story (HTML)',
        input(t.story, (v) => (t.story = v))
      )
    );
    if (t.run) {
      box.append(
        h(
          'div',
          { class: 'cw-note' },
          'This test is hand-written code (run function) and cannot be edited or exported here.'
        )
      );
      return box;
    }
    t.steps = t.steps || [];
    const steps = h('div', { class: 'cw-steps' });
    t.steps.forEach((s, i) => {
      const ops = FB.opsFor(rust ? 'rust' : 'qml');
      const sel = h('select', {
        class: 'cw-in',
        onchange: (e) => {
          t.steps[i] = FB.defaultStep(e.target.value);
          ctx.refresh();
        },
      });
      ops.forEach((o) => sel.append(h('option', { value: o, selected: s.op === o }, o)));
      const row = h('div', { class: 'cw-step' }, sel);
      (FB.ops[s.op] || []).forEach(([p, ty, opt]) => {
        const v = s[p];
        row.append(
          h('input', {
            class: 'cw-in sm',
            placeholder: p + (opt ? ' (optional)' : ''),
            value: v == null ? '' : String(v),
            oninput: (e) => {
              const val = e.target.value;
              if (val === '' && opt) delete s[p];
              else
                s[p] =
                  ty === 'number' || (p === 'value' && ty !== 'text')
                    ? coerce(val)
                    : p === 'value'
                      ? coerce(val)
                      : ty === 'number'
                        ? coerce(val)
                        : val;
              ctx.dirty();
            },
          })
        );
      });
      row.append(
        h(
          'button',
          {
            class: 'cw-x',
            title: 'Remove step',
            onclick: () => {
              t.steps.splice(i, 1);
              ctx.refresh();
            },
          },
          '\u2715'
        )
      );
      steps.append(row);
    });
    const addSel = h('select', {
      class: 'cw-in',
      onchange: (e) => {
        if (e.target.value) {
          t.steps.push(FB.defaultStep(e.target.value));
          e.target.value = '';
          ctx.refresh();
        }
      },
    });
    addSel.append(h('option', { value: '' }, '+ Add step…'));
    FB.opsFor(rust ? 'rust' : 'qml').forEach((o) => addSel.append(h('option', { value: o }, o)));
    steps.append(addSel);
    box.append(steps);
    box.append(
      h(
        'small',
        {},
        'eq/near/rgbBelow read a property of an item id; "value" keeps its type (number, true/false or text).'
      )
    );
    return box;
  }
  FB.defaultStep = function (op) {
    const s = { op };
    for (const [p, , opt] of OPS[op] || [])
      if (!opt)
        s[p] =
          p === 'value' ? '' : p === 'n' || p === 'value' || p === 'max' || p === 'ms' ? 0 : '';
    return s;
  };

  // ------------------------------------------------------------------ quiz
  function quizForm(b, ctx) {
    const box = h('div', { class: 'cw-grid' });
    box.append(
      field(
        'Title',
        input(b.title, (v) => {
          b.title = v;
          ctx.title();
        })
      )
    );
    box.append(
      field(
        'Description',
        area(b.desc, (v) => (b.desc = v), 2)
      )
    );
    box.append(
      field(
        'Intro (HTML, optional)',
        area(b.intro, (v) => (b.intro = v), 2)
      )
    );
    box.append(h('h4', {}, 'Questions'));
    box.append(
      list(
        'question',
        b.questions,
        ctx,
        (q, i) => questionBigForm(q, ctx),
        () => ({ text: 'New question', options: ['Wrong', 'Right'], answer: 1, why: '' }),
        '+ Add question'
      )
    );
    return box;
  }
  function questionBigForm(q, ctx) {
    const box = h('div', {});
    box.append(
      field(
        'Question text',
        input(q.text, (v) => (q.text = v))
      )
    );
    box.append(optionsEditor(q, ctx));
    box.append(
      field(
        'Why',
        input(q.why, (v) => (q.why = v))
      )
    );
    return box;
  }

  // ------------------------------------------------------------------ review
  function reviewForm(b, ctx) {
    const box = h('div', { class: 'cw-grid' });
    box.append(
      field(
        'Title',
        input(b.title, (v) => {
          b.title = v;
          ctx.title();
        })
      )
    );
    box.append(
      field(
        'Description',
        area(b.desc, (v) => (b.desc = v), 2)
      )
    );
    box.append(htmlBlock('HTML (the cheat sheet)', b.html, (v) => (b.html = v), 8));
    return box;
  }

  FB.blockForm = function (block, ctx) {
    if (block.type === 'theory') return theoryForm(block, ctx);
    if (block.type === 'lab') return labForm(block, ctx);
    if (block.type === 'quiz') return quizForm(block, ctx);
    if (block.type === 'review') return reviewForm(block, ctx);
    return h('p', {}, 'Unknown block type: ' + block.type);
  };
  FB.newBlock = function (type, courseId, moduleId) {
    const id = moduleId + '-b' + Math.random().toString(36).slice(2, 6);
    void courseId;
    if (type === 'theory')
      return {
        id,
        type,
        title: 'New theory',
        desc: '',
        intro: '',
        lessons: [{ title: 'Lesson', html: '<p></p>' }],
      };
    if (type === 'lab')
      return {
        id,
        type,
        title: 'New lab',
        desc: '',
        desc2: '',
        files: { 'main.qml': 'import QtQuick\n\nRectangle {\n}\n' },
        solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n}\n' },
        tests: [{ story: 'It works', steps: [{ op: 'noErrors' }] }],
      };
    if (type === 'quiz')
      return {
        id,
        type,
        title: 'New quiz',
        desc: '',
        questions: [{ text: 'Question', options: ['Wrong', 'Right'], answer: 1, why: '' }],
      };
    return { id, type: 'review', title: 'New review', desc: '', html: '<ul><li></li></ul>' };
  };

  // ------------------------------------------------------------------ translations
  // Empty fields are removed so they fall back to English (QmlI18n.loc merges per key).
  const setKey = (o, k, v) => {
    const s = String(v);
    if (s.trim() === '') delete o[k];
    else o[k] = s;
  };
  function trField(label, obj, key, big) {
    const ctl = big
      ? area(obj[key], (v) => setKey(obj, key, v), 4)
      : input(obj[key], (v) => setKey(obj, key, v));
    return h('label', { class: 'cw-f' + (big ? ' cw-wide' : '') }, h('span', {}, label), ctl);
  }
  FB.trForm = function (block, tr, ctx) {
    const box = h('div', { class: 'cw-grid' });
    box.append(
      h(
        'p',
        { class: 'cw-note' },
        'Leave a field empty to fall back to English. Code and test steps are never translated.'
      )
    );
    box.append(trField('Title', tr, 'title'));
    box.append(trField('Description', tr, 'desc', true));
    if (block.type === 'theory') {
      box.append(trField('Intro (HTML)', tr, 'intro', true));
      block.lessons.forEach((l, i) => {
        tr.lessons = tr.lessons || [];
        const o = (tr.lessons[i] = tr.lessons[i] || {});
        box.append(h('h4', {}, 'Lesson ' + (i + 1) + ': ' + l.title));
        box.append(trField('Lesson title', o, 'title'));
        box.append(trField('Lesson HTML', o, 'html', true));
        if (l.q) {
          o.q = o.q || {};
          box.append(trField('Question', o.q, 'text'));
          box.append(trField('Why', o.q, 'why'));
        }
      });
    } else if (block.type === 'quiz') {
      block.questions.forEach((q, i) => {
        tr.questions = tr.questions || [];
        const o = (tr.questions[i] = tr.questions[i] || {});
        box.append(h('h4', {}, 'Question ' + (i + 1)));
        box.append(trField('Text', o, 'text'));
        box.append(trField('Why', o, 'why'));
      });
    } else if (block.type === 'review') {
      box.append(trField('HTML', tr, 'html', true));
    } else if (block.type === 'lab') {
      box.append(trField('Instructions (desc2)', tr, 'desc2', true));
      block.tests.forEach((t, i) => {
        tr.stories = tr.stories || [];
        const o = { story: tr.stories[i] || '' };
        box.append(
          h(
            'label',
            { class: 'cw-f cw-wide' },
            h('span', {}, 'Story ' + (i + 1)),
            input(o.story, (v) => {
              if (String(v).trim() === '') delete tr.stories[i];
              else tr.stories[i] = v;
              ctx.dirty();
            })
          )
        );
      });
    }
    return box;
  };
})();
