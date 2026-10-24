// =============================================================================
//  QML parser (course subset). Turns QML source into a plain AST.
//
//  document := { imports:[{module,line}], root: Node }
//  Node     := { type, line, onProp, members:[ Member ] }
//  Member kinds:
//    {kind:'id',      value}
//    {kind:'decl',    name, ptype, alias, readonly, isDefault}      property declaration
//    {kind:'bind',    name, expr, block, line}                      name: expression   (also handlers)
//    {kind:'objval',  name, node}                                   name: Type { ... }
//    {kind:'objlist', name, nodes}                                  name: [ Type {...}, ... ]
//    {kind:'child',   node}                                         nested object
//    {kind:'signal',  name, params:[names]}
//    {kind:'func',    name, params, body}
//    {kind:'component', name, node}                                 inline  component Foo: Type {}
//    {kind:'enum',    name, values:{A:0,...}}
// =============================================================================
(function (G) {
  'use strict';

  class QmlError extends Error {
    constructor(msg, line, file) {
      super(msg);
      this.name = 'QmlError';
      this.line = line || 0;
      this.file = file || '';
    }
  }

  function parse(src, file) {
    let i = 0,
      line = 1;
    const n = src.length;
    const err = (msg, ln) => {
      throw new QmlError(msg, ln || line, file);
    };
    const isStart = (c) => c !== undefined && /[A-Za-z_]/.test(c);
    const isId = (c) => c !== undefined && /[A-Za-z0-9_]/.test(c);
    const isUpper = (w) => /^[A-Z]/.test(w);

    function skipWs() {
      for (;;) {
        const c = src[i];
        if (c === '\n') {
          line++;
          i++;
        } else if (c === ' ' || c === '\t' || c === '\r') i++;
        else if (c === '/' && src[i + 1] === '/') {
          while (i < n && src[i] !== '\n') i++;
        } else if (c === '/' && src[i + 1] === '*') {
          i += 2;
          while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
            if (src[i] === '\n') line++;
            i++;
          }
          if (i >= n) err('Unterminated comment');
          i += 2;
        } else break;
      }
    }
    function peekIdent() {
      skipWs();
      if (!isStart(src[i])) return null;
      let j = i;
      while (isId(src[j])) j++;
      return src.slice(i, j);
    }
    function ident() {
      const w = peekIdent();
      if (!w) err(i >= n ? 'Unexpected end of file' : "Unexpected '" + src[i] + "'");
      i += w.length;
      return w;
    }
    function qualified() {
      let w = ident();
      while (src[i] === '.' && isStart(src[i + 1])) {
        i++;
        w += '.' + ident();
      }
      return w;
    }
    function expect(ch) {
      skipWs();
      if (src[i] !== ch)
        err(
          i >= n
            ? "Expected '" + ch + "' but the file ended (missing a closing brace?)"
            : "Expected '" + ch + "' but found '" + src[i] + "'"
        );
      i++;
    }
    const save = () => ({ i, line });
    const restore = (s) => {
      i = s.i;
      line = s.line;
    };

    // ---- scan JavaScript text -------------------------------------------------
    // Reads from i until the end of the expression/block. Strings, comments and
    // nested brackets are skipped correctly. Returns the raw text.
    function scanString(q) {
      i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') i++;
        if (src[i] === '\n') {
          if (q !== '`') err('Unterminated string');
          line++;
        }
        i++;
      }
      if (i >= n) err('Unterminated string');
      i++;
    }
    function scanBlock() {
      // at '{' ; returns inner text, consumes the '}'
      const start = ++i;
      let depth = 1;
      while (i < n) {
        const c = src[i];
        if (c === '"' || c === "'" || c === '`') {
          scanString(c);
          continue;
        }
        if (c === '/' && src[i + 1] === '/') {
          while (i < n && src[i] !== '\n') i++;
          continue;
        }
        if (c === '/' && src[i + 1] === '*') {
          i += 2;
          while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
            if (src[i] === '\n') line++;
            i++;
          }
          i += 2;
          continue;
        }
        if (c === '\n') line++;
        if (c === '{') depth++;
        else if (c === '}') {
          if (--depth === 0) {
            const t = src.slice(start, i);
            i++;
            return t;
          }
        }
        i++;
      }
      err("Missing '}' (a block was never closed)");
    }
    function scanExpr() {
      const start = i;
      let depth = 0;
      while (i < n) {
        const c = src[i];
        if (c === '"' || c === "'" || c === '`') {
          scanString(c);
          continue;
        }
        if (c === '/' && src[i + 1] === '/') {
          while (i < n && src[i] !== '\n') i++;
          continue;
        }
        if (c === '/' && src[i + 1] === '*') {
          i += 2;
          while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
            if (src[i] === '\n') line++;
            i++;
          }
          i += 2;
          continue;
        }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === '}') {
          if (depth === 0) break;
          depth--;
        } else if (c === ';' && depth === 0) break;
        else if (c === '\n' && depth <= 0) {
          // expression continues on the next line if this line ends with an operator
          // or the next one starts with one
          const before = src.slice(start, i).replace(/\s+$/, '');
          const rest = src.slice(i + 1).match(/^\s*(\S{1,2})/);
          const next = rest ? rest[1] : '';
          if (
            (/[+\-*/%&|?:,=<>(]$/.test(before) && !/(\+\+|--)$/.test(before)) ||
            /^(\?|:|\.|&&|\|\||\+|\*)/.test(next)
          ) {
            line++;
            i++;
            continue;
          }
          break;
        }
        if (c === '\n') line++;
        i++;
      }
      return src.slice(start, i).trim();
    }

    // ---- grammar ------------------------------------------------------------------
    function parseObject() {
      skipWs();
      const ln = line,
        type = qualified();
      skipWs();
      let onProp = null;
      if (peekIdent() === 'on') {
        i += 2;
        onProp = ident();
      }
      expect('{');
      const node = { type, line: ln, onProp, members: [] };
      parseMembers(node);
      expect('}');
      return node;
    }
    function parseMembers(node) {
      for (;;) {
        skipWs();
        if (i >= n) err("Expected '}' but the file ended (missing a closing brace?)");
        if (src[i] === '}') return;
        if (src[i] === ';') {
          i++;
          continue;
        }
        parseMember(node);
      }
    }
    function parseValue(node, name, ln) {
      skipWs();
      const c = src[i];
      if (name === 'id') {
        const v = ident();
        node.members.push({ kind: 'id', value: v, line: ln });
        return;
      }
      if (isStart(c)) {
        // Type { ... }  /  Type on x { ... }
        const s = save();
        const w = qualified();
        skipWs();
        if (isUpper(w) && (src[i] === '{' || peekIdent() === 'on')) {
          restore(s);
          node.members.push({ kind: 'objval', name, node: parseObject(), line: ln });
          return;
        }
        restore(s);
      }
      if (c === '[') {
        // [ Type {..}, Type {..} ]  or a JS array
        const s = save();
        i++;
        skipWs();
        let isObjs = false;
        if (src[i] === ']')
          isObjs =
            name === 'children' || name === 'data' || name === 'states' || name === 'transitions';
        else if (isStart(src[i])) {
          const s2 = save();
          const w = qualified();
          skipWs();
          isObjs = isUpper(w) && src[i] === '{';
          restore(s2);
        }
        if (isObjs) {
          const nodes = [];
          for (;;) {
            skipWs();
            if (src[i] === ']') {
              i++;
              break;
            }
            nodes.push(parseObject());
            skipWs();
            if (src[i] === ',') i++;
          }
          node.members.push({ kind: 'objlist', name, nodes, line: ln });
          return;
        }
        restore(s);
      }
      if (c === '{') {
        // JS block
        const body = scanBlock();
        node.members.push({ kind: 'bind', name, expr: body, block: true, line: ln });
        return;
      }
      const expr = scanExpr();
      if (!expr) err("Expected a value after '" + name + ":'", ln);
      node.members.push({ kind: 'bind', name, expr, block: false, line: ln });
    }
    function parseMember(node) {
      const ln = line,
        w = peekIdent();
      if (!w) err("Unexpected '" + src[i] + "'");
      if (w === 'property' || w === 'readonly' || w === 'required' || w === 'default') {
        let readonly = false,
          isDefault = false;
        for (;;) {
          const k = peekIdent();
          if (k === 'default') {
            isDefault = true;
            i += 7;
          } else if (k === 'readonly') {
            readonly = true;
            i += 8;
          } else if (k === 'required') {
            i += 8;
          } else break;
        }
        if (peekIdent() !== 'property') err("Expected 'property'");
        i += 8;
        let ptype = ident(),
          alias = false;
        if (ptype === 'alias') alias = true;
        if (src[i] === '<') {
          while (i < n && src[i] !== '>') i++;
          i++;
        }
        const name = ident();
        node.members.push({ kind: 'decl', name, ptype, alias, readonly, isDefault, line: ln });
        skipWs();
        if (src[i] === ':') {
          i++;
          parseValue(node, name, ln);
        }
        return;
      }
      if (w === 'signal') {
        i += 6;
        const name = ident();
        const params = [];
        skipWs();
        if (src[i] === '(') {
          i++;
          const s = i;
          while (i < n && src[i] !== ')') i++;
          src
            .slice(s, i)
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((p) => params.push(p.split(/\s+/).pop()));
          i++;
        }
        node.members.push({ kind: 'signal', name, params, line: ln });
        return;
      }
      if (w === 'function') {
        i += 8;
        const name = ident();
        expect('(');
        const s = i;
        while (i < n && src[i] !== ')') i++;
        const params = src
          .slice(s, i)
          .split(',')
          .map((x) => x.trim().split(/[\s:]+/)[0])
          .filter(Boolean);
        i++;
        skipWs();
        if (src[i] === ':') {
          i++;
          ident();
          skipWs();
        } // return type annotation
        if (src[i] !== '{') err("Expected '{' after function " + name + '()');
        const body = scanBlock();
        node.members.push({ kind: 'func', name, params, body, line: ln });
        return;
      }
      if (w === 'component') {
        const s = save();
        i += 9;
        skipWs();
        if (isStart(src[i])) {
          const name = ident();
          expect(':');
          node.members.push({ kind: 'component', name, node: parseObject(), line: ln });
          return;
        }
        restore(s);
      }
      if (w === 'enum') {
        i += 4;
        const name = ident();
        expect('{');
        const values = {};
        let next = 0;
        for (;;) {
          skipWs();
          if (src[i] === '}') {
            i++;
            break;
          }
          const k = ident();
          skipWs();
          if (src[i] === '=') {
            i++;
            skipWs();
            const m = src.slice(i).match(/^-?\d+/);
            if (!m) err('Enum values must be integers');
            next = parseInt(m[0]);
            i += m[0].length;
          }
          values[k] = next++;
          skipWs();
          if (src[i] === ',') i++;
        }
        node.members.push({ kind: 'enum', name, values, line: ln });
        return;
      }
      const s = save();
      const q = qualified();
      skipWs();
      if (src[i] === ':') {
        i++;
        parseValue(node, q, ln);
        return;
      }
      if (src[i] === '{' && !isUpper(q)) {
        // group property: anchors { fill: parent }
        i++;
        const tmp = { members: [] };
        parseMembers(tmp);
        expect('}');
        for (const m of tmp.members) {
          if (m.name !== undefined) m.name = q + '.' + m.name;
          node.members.push(m);
        }
        return;
      }
      if (isUpper(q) && (src[i] === '{' || peekIdent() === 'on')) {
        restore(s);
        node.members.push({ kind: 'child', node: parseObject(), line: ln });
        return;
      }
      err("Expected ':' after '" + q + "'", ln);
    }

    // ---- document -------------------------------------------------------------------
    const imports = [],
      pragmas = [];
    for (;;) {
      skipWs();
      if (peekIdent() === 'pragma') {
        i += 6;
        const w = ident();
        pragmas.push(w);
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (peekIdent() !== 'import') break;
      const ln = line;
      i += 6;
      const s = i;
      while (i < n && src[i] !== '\n' && src[i] !== ';') i++;
      const text = src.slice(s, i).trim();
      const m = text.match(/^(?:"([^"]*)"|([A-Za-z_][\w.]*))(?:\s+([\d.]+))?(?:\s+as\s+(\w+))?/);
      if (!m) err('Invalid import', ln);
      imports.push({
        module: m[1] !== undefined ? m[1] : m[2],
        path: m[1] !== undefined,
        version: m[3],
        as: m[4],
        line: ln,
      });
    }
    skipWs();
    if (i >= n) err('The document has no root object');
    const root = parseObject();
    skipWs();
    if (i < n) err('Only one root object is allowed per QML document');
    return { file: file || 'main.qml', imports, pragmas, root };
  }

  G.QmlParser = { parse, QmlError };
})(typeof window !== 'undefined' ? window : globalThis);
