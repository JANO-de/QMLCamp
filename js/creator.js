// =============================================================================
//  ForgeCreator: the QMLCamp course creator (route #/creator).
//  #/creator               engine picker (remembered in localStorage)
//  #/creator/new           a new QMLCamp course
//  #/creator/<id>          edit a stored course (built-in/file courses are read-only)
//  The editor works on a draft; Save writes it to localStorage in the same schema
//  as custom/ files, so Export and Import round-trip without changes.
// =============================================================================
(function () {
  'use strict';
  const FC = (window.ForgeCreator = {});
  const F = window.ForgeCustom;
  const h = (...a) => F.h(...a);
  const core = () => window.QMLCampCore;
  const ENGINE_KEY = 'forge.engine';
  const LANGS = ['es', 'de', 'ja'];

  let draft = null,
    idTouched = false,
    sel = { kind: 'course' },
    msg = '';
  const dirty = () => {
    FC.dirty = true;
  };
  const ctx = {
    get draft() {
      return draft;
    },
    refresh: render,
    dirty,
    title: () => {
      renderNav();
      dirty();
    },
  };

  function lastEngine() {
    try {
      return localStorage.getItem(ENGINE_KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function setEngine(e) {
    try {
      localStorage.setItem(ENGINE_KEY, e);
    } catch (e) {}
  }
  function go(hash) {
    location.hash = hash;
  }

  // ------------------------------------------------------------------ entry
  FC.view = function (tail) {
    const id = (tail.split('/')[1] || '').trim();
    if (!id) return enginePicker();
    if (id === 'new') return newDraft();
    openExisting(id);
  };

  function enginePicker() {
    const app = document.getElementById('app');
    document.getElementById('app').style.maxWidth = '900px';
    const last = lastEngine();
    const card = (engine, title, desc, href) =>
      h(
        'a',
        { class: 'card eng' + (last === engine ? ' last' : ''), href },
        h('h3', {}, title, last === engine ? h('span', { class: 'badge' }, 'last used') : null),
        h('p', {}, desc),
        h('span', { class: 'btn sm' }, 'Choose')
      );
    app.append(
      h(
        'div',
        { class: 'page' },
        h('div', { class: 'crumbs' }, h('a', { href: '#/' }, 'Welcome'), ' / Course creator'),
        h('h1', {}, 'Create a course'),
        h(
          'p',
          {},
          'Pick an engine. Both store courses in this browser; both can export a file for the custom/ folder.'
        ),
        h(
          'div',
          { class: 'mods' },
          card(
            'genlearn',
            'GENLearn',
            'Language learning: words and sentences with generated exercises, XP and speech.',
            '../genlearn/index.html#/creator/new'
          ),
          card(
            'qmlcamp',
            'QMLCamp',
            'Programming: theory lessons, labs with tests, practice tests and a review cheat sheet.',
            '#/creator/new'
          )
        )
      )
    );
  }

  function newDraft() {
    setEngine('qmlcamp');
    draft = { id: F.newId('my-course'), title: '', desc: '', lang: 'qml', modules: [] };
    idTouched = false;
    sel = { kind: 'course' };
    msg = '';
    render();
  }

  function openExisting(id) {
    const stored = F.storedList().find((c) => c.id === id);
    if (stored) {
      setEngine('qmlcamp');
      draft = stored;
      idTouched = true;
      sel = { kind: 'course' };
      msg = '';
      return render();
    }
    const course = window.QMLCAMP.courses.find((c) => c.id === id);
    const app = document.getElementById('app');
    app.append(
      h(
        'div',
        { class: 'page' },
        h(
          'div',
          { class: 'crumbs' },
          h('a', { href: '#/' }, 'Welcome'),
          ' / ',
          h('a', { href: '#/creator' }, 'Course creator')
        ),
        h('h1', {}, course ? course.title : id),
        h(
          'div',
          { class: 'card' },
          h(
            'p',
            {},
            course && course.custom === 'file'
              ? 'This course comes from a custom/ file and cannot be edited in the browser. Edit the file, or duplicate it to make an editable copy.'
              : 'This is a built-in course: it is read-only. Duplicate it to get an editable copy.'
          ),
          h(
            'div',
            { class: 'toolbar' },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  const nid = F.duplicateCourse(id);
                  if (nid) go('#/creator/' + nid);
                },
              },
              'Duplicate to edit'
            ),
            h('a', { class: 'btn ghost', href: '#/c/' + id }, 'Open the course')
          )
        )
      )
    );
  }

  // ------------------------------------------------------------------ editor shell
  function render() {
    const app = document.getElementById('app');
    app.style.maxWidth = '1300px';
    app.innerHTML = '';
    const errs = F.validate(draft);
    const page = h('div', { class: 'cw' });
    page.append(
      h(
        'div',
        { class: 'cw-top' },
        h(
          'div',
          { class: 'cw-toprow' },
          h('a', { class: 'btn sm ghost', href: '#/' }, '\u2190 Welcome'),
          h('h1', { style: 'flex:1' }, draft.title || draft.id),
          h('span', { class: 'badge' + (FC.dirty ? ' on' : '') }, FC.dirty ? 'unsaved' : 'saved')
        )
      ),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn sm', onclick: save }, 'Save'),
        h('button', { class: 'btn sm ghost', onclick: () => preview() }, 'Preview'),
        h('button', { class: 'btn sm ghost', onclick: () => showVerify() }, 'Run verify'),
        h('button', { class: 'btn sm ghost', onclick: () => exportCourse() }, 'Export .js'),
        h('button', { class: 'btn sm ghost', onclick: () => showImport() }, 'Import'),
        h('button', { class: 'btn sm ghost', onclick: () => template() }, 'Create from template'),
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              const nid = F.duplicateCourse(draft.id);
              if (nid) go('#/creator/' + nid);
              else alert('Save the course first.');
            },
          },
          'Duplicate'
        ),
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              if (confirm('Delete "' + (draft.title || draft.id) + '" from this browser?'))
                F.deleteCourse(draft.id);
            },
          },
          'Delete'
        )
      ),
      errs.length
        ? h(
            'div',
            { class: 'cw-errs' },
            h(
              'b',
              {},
              errs.length +
                ' problem' +
                (errs.length === 1 ? '' : 's') +
                ' before this course can be saved:'
            ),
            h(
              'ul',
              {},
              errs.slice(0, 8).map((x) => h('li', {}, x))
            )
          )
        : null,
      msg ? h('div', { class: 'cw-msg' }, msg) : null
    );
    const body = h('div', { class: 'cw-body' });
    body.append(renderNav());
    body.append(renderPanel());
    page.append(body);
    app.append(page);
  }

  function renderNav() {
    const nav = h('div', { class: 'cw-nav' });
    nav.append(
      h(
        'button',
        {
          class: 'cw-navitem' + (sel.kind === 'course' ? ' on' : ''),
          onclick: () => {
            sel = { kind: 'course' };
            render();
          },
        },
        'Course details'
      )
    );
    nav.append(
      h(
        'button',
        {
          class: 'cw-navitem' + (sel.kind === 'tr' ? ' on' : ''),
          onclick: () => {
            sel = { kind: 'tr', lang: LANGS[0], mi: 0, bi: 0 };
            render();
          },
        },
        'Translations (es/de/ja)'
      )
    );
    draft.modules.forEach((m, mi) => {
      const mrow = h(
        'div',
        { class: 'cw-mod' },
        h(
          'div',
          { class: 'cw-modhead' },
          h(
            'span',
            {
              class: 'cw-modtitle',
              onclick: () => {
                sel = { kind: 'module', mi };
                render();
              },
            },
            mi + 1 + '. ' + (m.title || '(untitled)')
          ),
          h('span', { class: 'cw-sp' }),
          h(
            'button',
            {
              class: 'cw-x',
              disabled: mi === 0,
              title: 'Move module up',
              onclick: () => {
                draft.modules.splice(mi - 1, 0, draft.modules.splice(mi, 1)[0]);
                sel = { kind: 'course' };
                render();
              },
            },
            '\u2191'
          ),
          h(
            'button',
            {
              class: 'cw-x',
              disabled: mi === draft.modules.length - 1,
              title: 'Move module down',
              onclick: () => {
                draft.modules.splice(mi + 1, 0, draft.modules.splice(mi, 1)[0]);
                sel = { kind: 'course' };
                render();
              },
            },
            '\u2193'
          ),
          h(
            'button',
            {
              class: 'cw-x',
              title: 'Delete module',
              onclick: () => {
                if (confirm('Delete this module and its blocks?')) {
                  draft.modules.splice(mi, 1);
                  sel = { kind: 'course' };
                  render();
                }
              },
            },
            '\u2715'
          )
        )
      );
      m.blocks.forEach((b, bi) => {
        mrow.append(
          h(
            'button',
            {
              class:
                'cw-navblock' +
                (sel.kind === 'block' && sel.mi === mi && sel.bi === bi ? ' on' : ''),
              onclick: () => {
                sel = { kind: 'block', mi, bi };
                render();
              },
            },
            h('span', { class: 'cw-tag t-' + b.type }, b.type),
            ' ',
            b.title || '(untitled)'
          )
        );
      });
      const addSel = h('select', {
        class: 'cw-in sm',
        onchange: (e) => {
          if (!e.target.value) return;
          m.blocks.push(window.ForgeBlocks.newBlock(e.target.value, draft.id, m.id));
          e.target.value = '';
          sel = { kind: 'block', mi, bi: m.blocks.length - 1 };
          render();
        },
      });
      addSel.append(h('option', { value: '' }, '+ Add block\u2026'));
      ['theory', 'lab', 'quiz', 'review'].forEach((t) =>
        addSel.append(h('option', { value: t }, t))
      );
      mrow.append(addSel);
      nav.append(mrow);
    });
    nav.append(
      h(
        'button',
        {
          class: 'btn sm ghost',
          onclick: () => {
            draft.modules.push({
              id: draft.id + '-m' + (draft.modules.length + 1),
              title: 'New module',
              desc: '',
              blocks: [],
            });
            render();
          },
        },
        '+ Add module'
      )
    );
    return nav;
  }

  function renderPanel() {
    const panel = h('div', { class: 'cw-panel' });
    if (sel.kind === 'course') return (coursePanel(panel), panel);
    if (sel.kind === 'tr') return (trPanel(panel), panel);
    if (sel.kind === 'block') return (blockPanel(panel), panel);
    if (sel.kind === 'module') return (modulePanel(panel), panel);
    return panel;
  }

  function coursePanel(panel) {
    panel.append(h('h2', {}, 'Course details'));
    panel.append(
      h(
        'label',
        { class: 'cw-f' },
        h('span', {}, 'Title'),
        h('input', {
          class: 'cw-in',
          value: draft.title,
          oninput: (e) => {
            draft.title = e.target.value;
            if (!idTouched) draft.id = F.newId(draft.title || 'my-course');
            renderNav();
            dirty();
          },
        })
      )
    );
    panel.append(
      h(
        'label',
        { class: 'cw-f' },
        h('span', {}, 'Id (must start with x-)'),
        h('input', {
          class: 'cw-in',
          value: draft.id,
          oninput: (e) => {
            idTouched = true;
            draft.id = e.target.value;
            dirty();
          },
        })
      )
    );
    panel.append(
      h(
        'label',
        { class: 'cw-f' },
        h('span', {}, 'Description'),
        h(
          'textarea',
          {
            class: 'cw-in',
            rows: 2,
            oninput: (e) => {
              draft.desc = e.target.value;
              dirty();
            },
          },
          draft.desc || ''
        )
      )
    );
    const lang = h('select', {
      class: 'cw-in',
      onchange: (e) => {
        draft.lang = e.target.value;
        dirty();
      },
    });
    ['qml', 'js', 'rust'].forEach((l) =>
      lang.append(
        h(
          'option',
          { value: l, selected: draft.lang === l },
          l === 'js' ? 'JavaScript (inside QML)' : l === 'qml' ? 'QML' : 'Rust'
        )
      )
    );
    panel.append(h('label', { class: 'cw-f' }, h('span', {}, 'Language of the code'), lang));
    if (!draft.modules.length)
      panel.append(
        h(
          'p',
          { class: 'cw-note' },
          'This course has no modules yet. Use "Add module" on the left, then add theory, lab, quiz or review blocks.'
        )
      );
  }

  function modulePanel(panel) {
    const m = draft.modules[sel.mi];
    panel.append(h('h2', {}, 'Module ' + (sel.mi + 1)));
    panel.append(
      h(
        'label',
        { class: 'cw-f' },
        h('span', {}, 'Title'),
        h('input', {
          class: 'cw-in',
          value: m.title,
          oninput: (e) => {
            m.title = e.target.value;
            renderNav();
            dirty();
          },
        })
      )
    );
    panel.append(
      h(
        'label',
        { class: 'cw-f' },
        h('span', {}, 'Description'),
        h(
          'textarea',
          {
            class: 'cw-in',
            rows: 2,
            oninput: (e) => {
              m.desc = e.target.value;
              dirty();
            },
          },
          m.desc || ''
        )
      )
    );
    panel.append(
      h(
        'p',
        { class: 'cw-note' },
        m.blocks.length + ' blocks. Click a block on the left to edit it.'
      )
    );
  }

  function blockPanel(panel) {
    const b = draft.modules[sel.mi].blocks[sel.bi];
    panel.append(
      h('h2', {}, b.type.charAt(0).toUpperCase() + b.type.slice(1) + ': ' + (b.title || ''))
    );
    const idField = h(
      'label',
      { class: 'cw-f' },
      h('span', {}, 'Block id'),
      h('input', {
        class: 'cw-in',
        value: b.id,
        oninput: (e) => {
          b.id = e.target.value;
          dirty();
        },
      })
    );
    panel.append(idField);
    panel.append(h('div', { class: 'cw-wide' }, window.ForgeBlocks.blockForm(b, ctx)));
  }

  // ------------------------------------------------------------------ translations
  function trPanel(panel) {
    panel.append(h('h2', {}, 'Translations'));
    const tabs = h(
      'div',
      { class: 'tabs' },
      LANGS.map((l) =>
        h(
          'button',
          {
            class: sel.lang === l ? 'on' : '',
            onclick: () => {
              sel = Object.assign({}, sel, { lang: l });
              render();
            },
          },
          l
        )
      )
    );
    panel.append(tabs);
    const picks = [];
    draft.modules.forEach((m, mi) => {
      picks.push({ mi, bi: null, title: 'Module ' + (mi + 1) + ': ' + m.title });
      m.blocks.forEach((b, bi) => picks.push({ mi, bi, title: '   ' + b.type + ': ' + b.title }));
    });
    const cur = picks.findIndex((p) => p.mi === sel.mi && p.bi === sel.bi);
    const list = h(
      'div',
      { class: 'cw-trlist' },
      picks.map((p, i) =>
        h(
          'button',
          {
            class: 'cw-navblock' + (i === cur ? ' on' : ''),
            onclick: () => {
              sel = { kind: 'tr', lang: sel.lang, mi: p.mi, bi: p.bi };
              render();
            },
          },
          p.title
        )
      )
    );
    panel.append(list);
    const target = picks[cur];
    if (!target) return;
    draft.tr = draft.tr || {};
    draft.tr[sel.lang] = draft.tr[sel.lang] || {};
    let id, block, obj;
    if (target.bi === null) {
      block = { type: 'module' };
      id = draft.modules[target.mi].id;
    } else {
      block = draft.modules[target.mi].blocks[target.bi];
      id = block.id;
    }
    obj = draft.tr[sel.lang][id] = draft.tr[sel.lang][id] || {};
    panel.append(
      h(
        'div',
        { class: 'cw-wide' },
        target.bi === null
          ? h(
              'div',
              { class: 'cw-grid' },
              h(
                'label',
                { class: 'cw-f' },
                h('span', {}, 'Module title'),
                h('input', {
                  class: 'cw-in',
                  value: obj.title || '',
                  oninput: (e) => setTr(obj, 'title', e.target.value),
                })
              ),
              h(
                'label',
                { class: 'cw-f' },
                h('span', {}, 'Module description'),
                h('input', {
                  class: 'cw-in',
                  value: obj.desc || '',
                  oninput: (e) => setTr(obj, 'desc', e.target.value),
                })
              )
            )
          : window.ForgeBlocks.trForm(block, obj, ctx)
      )
    );
  }
  const setTr = (o, k, v) => {
    if (String(v).trim() === '') delete o[k];
    else o[k] = v;
    dirty();
  };

  // ------------------------------------------------------------------ actions
  function save() {
    const r = F.saveCourse(draft);
    if (r.length) {
      msg = '\u26a0 ' + r[0];
      FC.dirty = true;
    } else {
      FC.dirty = false;
      msg = 'Saved to this browser as ' + draft.id + '.';
      draft = F.storedList().find((c) => c.id === draft.id) || draft;
    }
    render();
  }
  function preview() {
    const r = F.saveCourse(draft);
    if (r.length) {
      msg = '\u26a0 Fix the errors before previewing: ' + r[0];
      return render();
    }
    FC.dirty = false;
    go('#/c/' + draft.id);
  }
  function exportCourse() {
    const r = F.saveCourse(draft);
    if (r.length) {
      msg = '\u26a0 Fix the errors before exporting: ' + r[0];
      return render();
    }
    if (!F.exportable(draft)) {
      msg =
        '\u26a0 This course has hand-written tests (run functions) and cannot be exported from here.';
      return render();
    }
    F.exportCourse(draft);
    alert(
      'Downloaded ' +
        draft.id +
        '.js.\n\nPut it in custom/ and add this line to custom/index.js:\n\n' +
        F.manifestLine(draft)
    );
  }
  function template() {
    const tpl = window.FORGE_TEMPLATE_QMLCAMP;
    if (!tpl) {
      msg = '\u26a0 Template not loaded.';
      return render();
    }
    const c = F.reid(JSON.parse(JSON.stringify(tpl)), draft.id, draft.title || tpl.title);
    F.download(c.id + '.js', F.exportText(c, 'qmlcamp'));
    alert(
      'Downloaded a filled template ' +
        c.id +
        '.js.\n\nPut it in custom/ and add this line to custom/index.js:\n\n' +
        F.manifestLine(c)
    );
  }
  function showImport() {
    const input = h('input', {
      type: 'file',
      accept: '.js,.json,application/json,text/javascript',
      style: 'display:none',
      onchange: (e) => {
        if (e.target.files[0])
          F.importFile(e.target.files[0], (res) => {
            if (res.error) alert('Import failed: ' + res.error);
            else go('#/creator/' + res.id);
          });
        e.target.value = '';
      },
    });
    const existing = document.querySelector('.cw-float');
    if (existing) existing.remove();
    const box = h(
      'div',
      { class: 'cw-float' },
      h('h3', {}, 'Import a course'),
      h(
        'p',
        {},
        'Pick an exported .js file, or paste its contents (or a JSON course object) below.'
      ),
      input,
      h('button', { class: 'btn sm', onclick: () => input.click() }, 'Choose a file\u2026'),
      h('textarea', { class: 'cw-in', rows: 8, placeholder: 'Paste the course file or JSON here' }),
      h(
        'div',
        { class: 'toolbar' },
        h(
          'button',
          {
            class: 'btn sm',
            onclick: () => {
              const res = F.importCourse(box.querySelector('textarea').value);
              if (res.error) alert('Import failed: ' + res.error);
              else {
                box.remove();
                go('#/creator/' + res.id);
              }
            },
          },
          'Import pasted text'
        ),
        h('button', { class: 'btn sm ghost', onclick: () => box.remove() }, 'Cancel')
      )
    );
    document.getElementById('app').append(box);
  }

  // ------------------------------------------------------------------ verify
  function verifyLabs(course) {
    const c = core();
    const rows = [];
    const tmp = h('div', { style: 'position:absolute;left:-9999px;top:0' });
    document.body.append(tmp);
    for (const m of course.modules)
      for (const b of m.blocks) {
        if (b.type !== 'lab') continue;
        const rust = c.blockLang(b, course) === 'rust';
        let a, s;
        if (rust) {
          a = c.runTests(b, b.files, null);
          s = c.runTests(b, b.solution, null);
        } else {
          const rt = new window.QmlRuntime({ container: tmp });
          a = c.runTests(b, b.files, rt);
          s = c.runTests(b, b.solution, rt);
          rt.dispose();
        }
        rows.push({
          id: b.id,
          title: b.title,
          starterFails: a.some((r) => !r.ok),
          solutionPasses: s.every((r) => r.ok),
          bad: s
            .filter((r) => !r.ok)
            .map((r) => r.story.replace(/<[^>]+>/g, '') + ' \u2192 ' + r.why)
            .join(' | '),
        });
      }
    tmp.remove();
    return rows;
  }
  function showVerify() {
    const existing = document.querySelector('.cw-float');
    if (existing) existing.remove();
    let rows = [];
    try {
      rows = verifyLabs(draft);
    } catch (e) {
      rows = [];
    }
    const tbl = h(
      'table',
      { class: 'vt' },
      h(
        'tr',
        {},
        h('td', {}, 'Lab'),
        h('td', {}, 'Starter (should fail)'),
        h('td', {}, 'Solution (should pass)'),
        h('td', {}, 'Details')
      )
    );
    for (const r of rows)
      tbl.append(
        h(
          'tr',
          {},
          h('td', {}, r.id + ' ' + r.title),
          h(
            'td',
            { class: r.starterFails ? 'ok' : 'no' },
            r.starterFails ? 'fails \u2713' : 'PASSES (bad)'
          ),
          h(
            'td',
            { class: r.solutionPasses ? 'ok' : 'no' },
            r.solutionPasses ? 'passes \u2713' : 'FAILS'
          ),
          h('td', {}, r.bad)
        )
      );
    const ok = rows.length && rows.every((r) => r.starterFails && r.solutionPasses);
    document.getElementById('app').append(
      h(
        'div',
        { class: 'cw-float' },
        h('h3', {}, 'Run verify'),
        h(
          'p',
          {},
          rows.length
            ? ok
              ? 'All labs correct: every starter fails, every solution passes.'
              : 'Some labs need attention (red cells).'
            : 'This course has no labs to verify.'
        ),
        tbl,
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              const v = document.querySelector('.cw-float');
              if (v) v.remove();
            },
          },
          'Close'
        )
      )
    );
  }
})();
