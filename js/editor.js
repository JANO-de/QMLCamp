// =============================================================================
//  Tiny code editor: a <textarea> on top of a syntax-highlighted <pre>.
//  Tab = 2 spaces, Enter keeps the indent, Ctrl/Cmd+Enter runs.
// =============================================================================
(function (G) {
  'use strict';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(import|property|signal|function|component|enum|readonly|required|default|alias|on|true|false|null|undefined|return|if|else|for|const|let|var|int|real|string|bool|color|url)\b|\b([A-Z][A-Za-z0-9_.]*)(?=\s*\{)|\b(\d+(?:\.\d+)?)\b|(\b[a-z_][\w.]*)(?=\s*:)/g;
  function highlight(src) {
    let out = '',
      last = 0,
      m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 't' : m[5] ? 'n' : 'p';
      out += '<span class="h-' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last)) + '\n';
  }
  function createEditor(initial, onChange, onRun, hl) {
    const highlight = hl || G.QmlEditor.highlight;
    const wrap = document.createElement('div');
    wrap.className = 'ed';
    const pre = document.createElement('pre');
    pre.className = 'ed-hl';
    pre.setAttribute('aria-hidden', 'true');
    const ta = document.createElement('textarea');
    ta.className = 'ed-ta';
    ta.spellcheck = false;
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('autocomplete', 'off');
    ta.wrap = 'off';
    wrap.appendChild(pre);
    wrap.appendChild(ta);
    const sync = () => {
      pre.innerHTML = highlight(ta.value);
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    };
    ta.value = initial;
    sync();
    ta.addEventListener('input', () => {
      sync();
      onChange && onChange(ta.value);
    });
    ta.addEventListener('scroll', () => {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        ins('  ');
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onRun && onRun();
      } else if (e.key === 'Enter') {
        const v = ta.value,
          s = ta.selectionStart;
        const ls = v.lastIndexOf('\n', s - 1) + 1,
          indent = v.slice(ls, s).match(/^\s*/)[0];
        const extra = /\{\s*$/.test(v.slice(ls, s)) ? '  ' : '';
        e.preventDefault();
        ins('\n' + indent + extra);
      }
    });
    function ins(txt) {
      const s = ta.selectionStart,
        e = ta.selectionEnd;
      ta.setRangeText(txt, s, e, 'end');
      sync();
      onChange && onChange(ta.value);
    }
    return {
      el: wrap,
      get value() {
        return ta.value;
      },
      set value(v) {
        ta.value = v;
        sync();
      },
      focus: () => ta.focus(),
    };
  }
  G.QmlEditor = { createEditor, highlight, esc };
})(window);
