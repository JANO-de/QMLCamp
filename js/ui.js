// =============================================================================
//  QmlUI: small in-page replacements for the browser's alert / confirm / prompt,
//  plus toasts (short messages, optionally with an Undo button).
//  Shared by QMLCamp, GENLearn and Planner. Loaded before every other script.
//
//    QmlUI.toast('Saved', { label: 'Undo', onClick: fn, ms: 6000 })
//    QmlUI.confirm('Delete it?', { ok: 'Delete', danger: true })  -> Promise<boolean>
//    QmlUI.alert('Something happened')                            -> Promise<void>
//    QmlUI.prompt('Plan name', 'New plan')                        -> Promise<string|null>
//
//  Why: the native popups interrupt reading, cannot be styled, look bad on phones
//  and are sometimes blocked. These are real <dialog> elements, so Esc closes them,
//  focus is trapped inside, and screen readers announce them.
//  The colours are copied from the page itself, so they follow light/dark mode.
// =============================================================================
(function (G) {
  'use strict';

  var CSS =
    'dialog.qui{border:1px solid var(--qui-line);border-radius:12px;padding:20px 22px;max-width:min(92vw,460px);width:100%;' +
    'background:var(--qui-bg);color:var(--qui-fg);box-shadow:0 12px 40px rgba(0,0,0,.35);font:inherit}' +
    'dialog.qui::backdrop{background:rgba(0,0,0,.45)}' +
    'dialog.qui h2{font-size:17px;margin:0 0 8px}' +
    'dialog.qui p{margin:0 0 14px;white-space:pre-wrap;line-height:1.5;overflow-wrap:anywhere}' +
    'dialog.qui input{width:100%;box-sizing:border-box;font:inherit;padding:10px;margin:0 0 14px;border-radius:8px;' +
    'border:1px solid var(--qui-line);background:transparent;color:inherit}' +
    '.qui-row{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}' +
    '.qui-row button{font:inherit;color:inherit;background:transparent;border:1px solid var(--qui-line);border-radius:8px;' +
    'padding:10px 16px;min-height:44px;cursor:pointer}' +
    '.qui-row button.main{background:var(--qui-fg);color:var(--qui-bg);border-color:var(--qui-fg)}' +
    '.qui-row button.danger{background:#c0392b;border-color:#c0392b;color:#fff}' +
    'dialog.qui :focus-visible,.qui-toast :focus-visible{outline:3px solid #4c9ffe;outline-offset:2px}' +
    '.qui-toasts{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);' +
    'z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:center;width:max-content;max-width:92vw;pointer-events:none}' +
    '.qui-toast{pointer-events:auto;display:flex;gap:14px;align-items:center;background:var(--qui-fg);color:var(--qui-bg);' +
    'padding:10px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.3);font-size:14px;line-height:1.4}' +
    '.qui-toast button{font:inherit;font-weight:600;color:inherit;background:transparent;border:0;text-decoration:underline;' +
    'cursor:pointer;padding:6px 4px;min-height:36px}';

  var styled = false;
  function addStyle() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Copy the page's own colours (so dark pages get dark dialogs).
  function themeVars(el) {
    var cs = getComputedStyle(document.body);
    var fg = cs.color || '#111';
    var bg = cs.backgroundColor;
    if (!bg || bg === 'transparent' || /rgba\(.*,\s*0\)$/.test(bg)) {
      bg = getComputedStyle(document.documentElement).backgroundColor;
    }
    if (!bg || bg === 'transparent' || /rgba\(.*,\s*0\)$/.test(bg)) bg = '#fff';
    el.style.setProperty('--qui-fg', fg);
    el.style.setProperty('--qui-bg', bg);
    el.style.setProperty('--qui-line', 'color-mix(in srgb, ' + fg + ' 30%, transparent)');
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // Generic dialog. buttons: [{ text, value, cls }]; resolves with the clicked value
  // (or `cancel` when closed with Esc / backdrop).
  function open(opts) {
    addStyle();
    return new Promise(function (resolve) {
      var dlg = el('dialog', { class: 'qui', 'aria-labelledby': 'qui-msg' });
      themeVars(dlg);
      if (opts.title) dlg.appendChild(el('h2', {}, opts.title));
      dlg.appendChild(el('p', { id: 'qui-msg' }, opts.text));
      var input = null;
      if (opts.input) {
        input = el('input', { type: 'text', 'aria-label': opts.text });
        input.value = opts.input.value || '';
        dlg.appendChild(input);
      }
      var row = el('div', { class: 'qui-row' });
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        if (dlg.open) dlg.close();
        dlg.remove();
        resolve(v);
      }
      opts.buttons.forEach(function (b) {
        var btn = el('button', { type: 'button', class: b.cls || '' }, b.text);
        btn.addEventListener('click', function () {
          finish(input && b.value === true ? input.value : b.value);
        });
        row.appendChild(btn);
      });
      dlg.appendChild(row);
      dlg.addEventListener('cancel', function (e) {
        e.preventDefault();
        finish(opts.cancel);
      });
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) finish(opts.cancel);
      });
      if (input)
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            finish(input.value);
          }
        });
      document.body.appendChild(dlg);
      if (dlg.showModal) dlg.showModal();
      else dlg.setAttribute('open', '');
      (input || row.lastChild).focus();
      if (input) input.select();
    });
  }

  var UI = {
    confirm: function (text, o) {
      o = o || {};
      return open({
        text: text,
        title: o.title,
        cancel: false,
        buttons: [
          { text: o.cancel || 'Cancel', value: false },
          { text: o.ok || 'OK', value: true, cls: o.danger ? 'danger' : 'main' },
        ],
      });
    },
    alert: function (text, o) {
      o = o || {};
      return open({
        text: text,
        title: o.title,
        cancel: undefined,
        buttons: [{ text: o.ok || 'OK', value: undefined, cls: 'main' }],
      });
    },
    prompt: function (text, def, o) {
      o = o || {};
      return open({
        text: text,
        title: o.title,
        cancel: null,
        input: { value: def || '' },
        buttons: [
          { text: 'Cancel', value: null },
          { text: o.ok || 'OK', value: true, cls: 'main' },
        ],
      });
    },
    toast: function (text, o) {
      o = o || {};
      addStyle();
      var box = document.querySelector('.qui-toasts');
      if (!box) {
        box = el('div', { class: 'qui-toasts' });
        document.body.appendChild(box);
      }
      var t = el('div', { class: 'qui-toast', role: 'status' });
      themeVars(t);
      t.appendChild(el('span', {}, text));
      var timer;
      function close() {
        clearTimeout(timer);
        t.remove();
      }
      if (o.label) {
        var b = el('button', { type: 'button' }, o.label);
        b.addEventListener('click', function () {
          close();
          if (o.onClick) o.onClick();
        });
        t.appendChild(b);
      }
      box.appendChild(t);
      timer = setTimeout(close, o.ms || (o.label ? 7000 : 4200));
      return close;
    },
  };
  G.QmlUI = UI;
})(window);
