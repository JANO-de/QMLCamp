// =============================================================================
//  Test kit: the `t` object handed to every lab test.  Tests THROW to fail.
// =============================================================================
(function (G) {
  'use strict';
  class Fail extends Error {
    constructor(m) {
      super(m);
      this.name = 'Fail';
    }
  }

  function makeKit(rt, files) {
    const o = (x) => {
      const r = rt.objOf(x);
      if (!r)
        throw new Fail(
          typeof x === 'string' ? 'There is no item with id "' + x + '"' : 'Item not found'
        );
      return r;
    };
    const walk = (node, f) => {
      f(node);
      for (const m of node.members) {
        if (m.kind === 'child' || m.kind === 'objval' || m.kind === 'component') walk(m.node, f);
        else if (m.kind === 'objlist') m.nodes.forEach((n) => walk(n, f));
      }
    };
    const rgb = (c) => {
      const d = document.createElement('canvas').getContext('2d');
      d.fillStyle = '#000';
      d.fillStyle = String(c);
      const h = d.fillStyle;
      if (h[0] === '#')
        return [
          parseInt(h.slice(1, 3), 16),
          parseInt(h.slice(3, 5), 16),
          parseInt(h.slice(5, 7), 16),
        ];
      return h
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
    };
    const t = {
      rt,
      files,
      fail: (m) => {
        throw new Fail(m);
      },
      expect(cond, msg) {
        if (!cond) throw new Fail(msg || 'Expectation failed');
      },
      eq(actual, expected, msg) {
        if (actual !== expected)
          throw new Fail(
            (msg || 'Values differ') +
              ' (expected ' +
              JSON.stringify(expected) +
              ', got ' +
              JSON.stringify(actual) +
              ')'
          );
      },
      near(actual, expected, msg, tol = 1.5) {
        if (typeof actual !== 'number' || Math.abs(actual - expected) > tol)
          throw new Fail(
            (msg || 'Numbers differ') + ' (expected about ' + expected + ', got ' + actual + ')'
          );
      },
      noErrors() {
        if (rt.errors.length) {
          const e = rt.errors[0];
          throw new Fail(
            'Fix the QML error first: ' +
              (e.file ? e.file + ':' : '') +
              (e.line ? e.line + ': ' : '') +
              e.message
          );
        }
      },
      get root() {
        return rt.root ? rt.root.proxy : null;
      },
      get logs() {
        return rt.logs;
      },
      find(id) {
        const r = rt.find(id);
        if (!r) throw new Fail('There is no item with id "' + id + '" in main.qml');
        return r;
      },
      has(id) {
        return !!rt.find(id);
      },
      all(type) {
        return rt.findAll(type);
      },
      count(type) {
        return rt.findAll(type).length;
      },
      rgb,
      shown(x) {
        return rt.isShown(o(x));
      },
      click(x, px, py) {
        const r = o(x);
        if (!rt.isShown(r)) throw new Fail('That item is not visible, so it cannot be clicked');
        let ma = r.base === 'MouseArea' ? r : null;
        if (!ma) {
          const stack = [r];
          while (stack.length && !ma) {
            const n = stack.shift();
            if (n.base === 'MouseArea') ma = n;
            else (n.get('children') || []).forEach((c) => stack.push(rt.unwrap(c)));
          }
        }
        if (!ma) throw new Fail('No MouseArea found to click on that item');
        if (!ma.get('enabled')) throw new Fail('The MouseArea is disabled');
        const w = ma.get('width') || 0,
          h = ma.get('height') || 0;
        if (w <= 0 || h <= 0)
          throw new Fail('The MouseArea has no size (width/height is 0), so it cannot be clicked');
        const X = px === undefined ? w / 2 : px,
          Y = py === undefined ? h / 2 : py;
        ma.sim.enter();
        ma.sim.press(X, Y);
        ma.sim.release(X, Y);
      },
      press(x) {
        const m = o(x);
        m.sim.press(1, 1);
      },
      release(x) {
        const m = o(x);
        m.sim.release(1, 1);
      },
      hover(x, on = true) {
        const m = o(x);
        if (on) m.sim.enter();
        else m.sim.leave();
      },
      advance(ms) {
        rt.advance(ms);
      },
      single(name) {
        return rt.getSingleton(name).proxy;
      },
      ipc(target, fn, ...a) {
        const h = rt.ipc[target];
        if (!h) throw new Fail('No IpcHandler with target "' + target + '"');
        const f = h.methods.get(fn);
        if (!f) throw new Fail('IpcHandler "' + target + '" has no function ' + fn + '()');
        return f(...a);
      },
      get screens() {
        return rt.screens;
      },
      get detached() {
        return rt.detached;
      },
      attached(id, name) {
        return (o(id).attached || {})[name];
      },
      rows(id) {
        const m = o(id);
        return m.rows ? m.rows.map((r) => Object.assign({}, r)) : [];
      },
      scroll(x, dy) {
        const v = o(x);
        v.set('contentY', Math.max(0, (v.get('contentY') || 0) + dy));
      },
      behaviorMs(x, prop) {
        return o(x).behaviors[prop] || 0;
      },
      // ---- static checks on the source
      source(f) {
        return files[f || 'main.qml'] || '';
      },
      nodes(type, f) {
        const d = rt.docs[f || 'main.qml'];
        const r = [];
        if (d)
          walk(d.root, (n) => {
            if (!type || n.type === type) r.push(n);
          });
        return r;
      },
      uses(type, f) {
        return t.nodes(type, f).length > 0;
      },
      bindingOf(node, name) {
        const m = node.members.find((x) => x.kind === 'bind' && x.name === name);
        return m ? m.expr : null;
      },
      declares(f, name) {
        const d = rt.docs[f || 'main.qml'];
        let ok = false;
        if (d)
          walk(d.root, (n) => {
            if (n.members.some((m) => m.kind === 'decl' && m.name === name)) ok = true;
          });
        return ok;
      },
      isBound(node, name) {
        const e = t.bindingOf(node, name);
        return e !== null && !/^-?[\d.]+$/.test(e.trim()) && !/^(['"]).*\1$/.test(e.trim());
      },
    };
    return t;
  }

  // Compile a data-only test (an array of steps) into the run(t) function labs expect.
  // Nothing here is eval'd: each op maps to a fixed kit call, so an exported course file
  // stays pure data. Ops for QML/JS: noErrors, has, count, eq, near, rgbBelow, uses,
  // declares, sourceHas, click, advance. For Rust: noErrors, sourceHas, outHas.
  function stepsToRun(steps) {
    return function (t) {
      for (const s of steps || []) {
        switch (s && s.op) {
          case 'noErrors':
            t.noErrors();
            break;
          case 'has':
            t.expect(t.has(s.id), 'There is no item with id "' + s.id + '"');
            break;
          case 'count': {
            const n = t.count(s.type);
            t.eq(n, s.n, 'Found ' + n + ' nodes of type ' + s.type + ' (expected ' + s.n + ')');
            break;
          }
          case 'eq':
            t.eq(t.find(s.id)[s.prop], s.value, s.id + '.' + s.prop);
            break;
          case 'near':
            t.near(t.find(s.id)[s.prop], s.value, s.id + '.' + s.prop, s.tol);
            break;
          case 'rgbBelow': {
            const c = t.rgb(t.find(s.id)[s.prop || 'color']);
            t.expect(
              c.every((v) => v < s.max),
              s.id + ' colour is not dark enough'
            );
            break;
          }
          case 'uses':
            t.expect(t.uses(s.type), 'The file does not use a ' + s.type);
            break;
          case 'declares':
            t.expect(t.declares(null, s.name), 'The root object does not declare ' + s.name);
            break;
          case 'sourceHas':
            t.expect(t.source(s.file).includes(s.text), 'The source is missing: ' + s.text);
            break;
          case 'outHas':
            t.expect(String(t.out).includes(s.text), 'The output is missing: ' + s.text);
            break;
          case 'click':
            t.click(s.id, s.px, s.py);
            break;
          case 'advance':
            t.advance(s.ms);
            break;
          default:
            t.fail('Unknown test step: ' + JSON.stringify(s));
        }
      }
    };
  }
  G.QmlTestKit = { makeKit, Fail, stepsToRun };
})(window);
