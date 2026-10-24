// =============================================================================
//  Rust interpreter standard library (builtin functions and methods) + runner API + highlighter
// =============================================================================
(function (G) {
  'use strict';
  const R = G.RustCore;
  const {
    Runner,
    RustError,
    Panic,
    Chr,
    Flt,
    Tup,
    Sv,
    Ev,
    Ref,
    Rng,
    Iter,
    RMap,
    RSet,
    Clo,
    Fn,
    Fmtr,
    Entry,
    UNIT,
    dv,
    isNum,
    isObjLike,
    typeName,
    ordV,
    some,
    NONE,
    ok,
    errV,
    mkOpt,
    strLen,
  } = R;
  class Dflt {}
  const P = Runner.prototype;
  const INT_RANGE = {
    i8: [-128, 127],
    i16: [-32768, 32767],
    i32: [-2147483648, 2147483647],
    u8: [0, 255],
    u16: [0, 65535],
    u32: [0, 4294967295],
    i64: [-9223372036854775808, 9223372036854775807],
    u64: [0, 18446744073709551615],
    usize: [0, 18446744073709551615],
    isize: [-9223372036854775808, 9223372036854775807],
  };
  const head = (t) => {
    t = (t || '').replace(/^<|>$/g, '').trim();
    const m = t.match(/^&?\s*([A-Za-z_0-9]+)/);
    return m ? m[1] : '';
  };
  const roundAway = (x) => (x < 0 ? -Math.round(-x) : Math.round(x));
  const INTS = /^(i|u)(8|16|32|64|128|size)$/;

  P.hintOf = function () {
    return (
      (this.curTurbo && this.curTurbo.trim()) ||
      this.hint ||
      this.retStack[this.retStack.length - 1] ||
      ''
    );
  };
  P.unwrapTy = function (t) {
    t = (t || '').replace(/^<|>$/g, '');
    return t;
  };

  // ---------------------------------------------------------------- builtin paths: Type::name, consts, std functions
  P.builtinPath = function (segs, n) {
    const last = segs[segs.length - 1],
      ty = segs.length > 1 ? segs[segs.length - 2] : '';
    const self = this;
    const line = n ? n.line : 0;
    const disp = (v) => self.disp(v, line);
    switch (ty + '::' + last) {
      case 'String::new':
        return () => '';
      case 'String::from':
        return (a) => (typeof dv(a[0]) === 'string' ? dv(a[0]) : self.disp(a[0], line));
      case 'String::with_capacity':
        return () => '';
      case 'String::from_utf8':
        return (a) => ok(new TextDecoder().decode(new Uint8Array(dv(a[0]))));
      case 'String::from_utf8_lossy':
        return (a) => new TextDecoder().decode(new Uint8Array(dv(a[0])));
      case 'Vec::new':
      case 'Vec::with_capacity':
        return () => [];
      case 'Vec::from':
        return (a) => self.toArr(a[0]).slice();
      case 'HashMap::new':
      case 'HashMap::with_capacity':
        return () => new RMap(false);
      case 'BTreeMap::new':
        return () => new RMap(true);
      case 'HashSet::new':
      case 'HashSet::with_capacity':
        return () => new RSet(false);
      case 'BTreeSet::new':
        return () => new RSet(true);
      case 'Box::new':
      case 'Rc::new':
      case 'Arc::new':
        return (a) => a[0];
      case 'consts::PI':
        return new Flt(Math.PI);
      case 'consts::E':
        return new Flt(Math.E);
      case 'consts::TAU':
        return new Flt(2 * Math.PI);
      case 'consts::SQRT_2':
        return new Flt(Math.SQRT2);
      case 'f64::MAX':
      case 'f32::MAX':
        return new Flt(Number.MAX_VALUE);
      case 'f64::MIN':
      case 'f32::MIN':
        return new Flt(-Number.MAX_VALUE);
      case 'f64::INFINITY':
      case 'f32::INFINITY':
        return new Flt(Infinity);
      case 'f64::NEG_INFINITY':
      case 'f32::NEG_INFINITY':
        return new Flt(-Infinity);
      case 'f64::NAN':
      case 'f32::NAN':
        return new Flt(NaN);
      case 'f64::EPSILON':
      case 'f32::EPSILON':
        return new Flt(Number.EPSILON);
      case 'f64::from':
      case 'f32::from':
        return (a) => {
          const v = dv(a[0]);
          return v instanceof Flt ? v : new Flt(Number(v));
        };
      case 'char::from':
        return (a) => {
          const v = dv(a[0]);
          return v instanceof Chr ? v : new Chr(String.fromCodePoint(v));
        };
      case 'char::from_u32':
        return (a) => mkOpt(new Chr(String.fromCodePoint(dv(a[0]))));
      case 'char::from_digit':
        return (a) => {
          const d = dv(a[0]),
            r = dv(a[1]);
          return d < r ? some(new Chr(d.toString(r))) : NONE();
        };
      case 'cmp::max':
        return (a) => (self.cmp(a[0], a[1]) > 0 ? a[0] : self.cmp(a[0], a[1]) === 0 ? a[1] : a[1]);
      case 'cmp::min':
        return (a) => (self.cmp(a[0], a[1]) <= 0 ? a[0] : a[1]);
      case 'mem::swap':
        return (a) => {
          const x = a[0],
            y = a[1];
          if (x instanceof Ref && y instanceof Ref) {
            const t = x.get();
            x.set(y.get());
            y.set(t);
          } else {
            const cx = self.clone(x),
              cy = self.clone(y);
            self.replaceInPlace(dv(x), cy, line);
            self.replaceInPlace(dv(y), cx, line);
          }
          return UNIT;
        };
      case 'mem::replace':
        return (a) => {
          const x = a[0];
          if (x instanceof Ref) {
            const o = x.get();
            x.set(a[1]);
            return o;
          }
          const o = self.clone(x);
          self.replaceInPlace(dv(x), a[1], line);
          return o;
        };
      case 'mem::take':
        return (a) => {
          const x = a[0];
          if (x instanceof Ref) {
            const o = x.get();
            x.set(typeof o === 'string' ? '' : isNum(o) ? 0 : o);
            return o;
          }
          const o = self.clone(x);
          self.replaceInPlace(
            dv(x),
            Array.isArray(dv(x)) ? [] : dv(x) instanceof RMap ? new RMap() : self.clone(x),
            line
          );
          return o;
        };
      case 'process::exit':
        return () => {
          throw new Panic('process::exit is not supported in this playground', line);
        };
      case 'Default::default':
        return () => self.defaultForType(self.hintOf());
      case 'io::stdin':
        return () => {
          throw new RustError('stdin is not available in this playground', line);
        };
    }
    if (INT_RANGE[ty]) {
      if (last === 'MAX') return INT_RANGE[ty][1];
      if (last === 'MIN') return INT_RANGE[ty][0];
      if (last === 'from')
        return (a) => (dv(a[0]) instanceof Chr ? dv(a[0]).c.codePointAt(0) : dv(a[0]));
      if (last === 'default') return () => 0;
      if (last === 'from_str_radix')
        return (a) => {
          const s = dv(a[0]),
            r = dv(a[1]);
          const x = parseInt(s, r);
          return Number.isNaN(x) || !/^[0-9a-zA-Z+-]+$/.test(s)
            ? errV(self.parseErr('int'))
            : ok(x);
        };
    }
    if (ty === 'f64' && last === 'default') return () => new Flt(0);
    if (ty === 'String' && last === 'default') return () => '';
    if (ty === 'Vec' && last === 'default') return () => [];
    if (segs.length === 1) {
      if (last === 'max') return (a) => (self.cmp(a[0], a[1]) > 0 ? a[0] : a[1]);
      if (last === 'min') return (a) => (self.cmp(a[0], a[1]) <= 0 ? a[0] : a[1]);
      if (last === 'drop') return () => UNIT;
      if (last === 'swap') return P.builtinPath.call(this, ['mem', 'swap'], n);
    }
    if (
      ty &&
      ([
        'char',
        'str',
        'String',
        'bool',
        'f64',
        'f32',
        'Vec',
        'Option',
        'Result',
        'ToString',
        'Clone',
        'Iterator',
        'u8',
      ].includes(ty) ||
        INT_RANGE[ty] ||
        ty === 'i128' ||
        ty === 'u128')
    )
      return (a) =>
        self.builtinMethod(
          dv(a[0]),
          last,
          a.slice(1),
          { line, e: null, name: last, args: [] },
          null,
          a[0]
        );
    return undefined;
  };
  P.parseErr = function (kind) {
    return kind === 'int'
      ? new Sv('ParseIntError', {
          kind: new Ev('IntErrorKind', 'InvalidDigit', []),
          msg: 'invalid digit found in string',
        })
      : new Sv('ParseFloatError', { msg: 'invalid float literal' });
  };
  Object.defineProperty(Sv.prototype, 'toString', {
    value() {
      return this.t;
    },
  });

  // ---------------------------------------------------------------- builtin methods
  const STR_MUT = new Set([
    'push_str',
    'push',
    'clear',
    'insert',
    'insert_str',
    'pop',
    'remove',
    'truncate',
    'retain',
  ]);
  const VEC_MUT = new Set([
    'push',
    'pop',
    'insert',
    'remove',
    'clear',
    'sort',
    'sort_by',
    'sort_by_key',
    'sort_unstable',
    'sort_unstable_by',
    'sort_unstable_by_key',
    'reverse',
    'truncate',
    'extend',
    'extend_from_slice',
    'dedup',
    'retain',
    'swap',
    'append',
    'drain',
    'iter_mut',
    'get_mut',
    'last_mut',
    'first_mut',
    'resize',
    'fill',
    'swap_remove',
    'push_back',
    'push_front',
    'pop_front',
    'pop_back',
    'values_mut',
  ]);
  const MAP_MUT = new Set([
    'insert',
    'remove',
    'clear',
    'entry',
    'get_mut',
    'values_mut',
    'iter_mut',
    'retain',
    'extend',
  ]);

  P.builtinMethod = function (v, name, args, node, env, rv) {
    const self = this,
      line = node.line;
    const call = (f, ...a) => self.callValue(f, a, line);
    const truthy = (x) => dv(x) === true;
    const arg = (i) => dv(args[i]);
    const noMethod = () => {
      throw new RustError(
        'no method named `' +
          name +
          '` found for ' +
          (v instanceof Ev && v.en === 'Option' ? 'enum `Option`' : 'type `' + typeName(v) + '`') +
          ' in the current scope',
        line,
        'E0599'
      );
    };
    if (v instanceof Dflt) {
      const nv =
        name === 'push' || name === 'extend' || name === 'len'
          ? []
          : name === 'push_str'
            ? ''
            : name === 'insert' && args.length === 2
              ? new RMap()
              : name === 'insert'
                ? new RSet()
                : 0;
      if (rv instanceof Ref) rv.set(nv);
      v = nv;
    }
    // ---- universal methods
    switch (name) {
      case 'clone':
      case 'to_owned':
      case 'cloned':
      case 'copied':
        if (!(v instanceof Iter) && !(v instanceof Ev && v.en === 'Option' && name.endsWith('ed')))
          return self.clone(v);
        break;
      case 'borrow':
      case 'borrow_mut':
      case 'as_ref':
      case 'as_mut':
      case 'as_str':
      case 'as_slice':
      case 'as_deref':
      case 'by_ref':
      case 'to_vec_':
        if (!(v instanceof Iter)) return rv instanceof Ref ? rv : v;
        break;
      case 'eq':
        return self.eq(v, args[0]);
      case 'ne':
        return !self.eq(v, args[0]);
      case 'lt':
        return self.cmp(v, args[0]) < 0;
      case 'le':
        return self.cmp(v, args[0]) <= 0;
      case 'gt':
        return self.cmp(v, args[0]) > 0;
      case 'ge':
        return self.cmp(v, args[0]) >= 0;
      case 'cmp':
        return ordV(self.cmp(v, args[0]));
      case 'partial_cmp':
      case 'total_cmp': {
        const r = ordV(self.cmp(v, args[0]));
        return name === 'partial_cmp' ? some(r) : r;
      }
      case 'to_string':
        if (!(v instanceof Chr && false)) {
          if (Array.isArray(v) && v.every((x) => x instanceof Chr))
            return v.map((x) => x.c).join('');
          return self.disp(v, line);
        }
        break;
      case 'into':
      case 'into_owned':
      case 'to_owned_': {
        const h = head(self.hintOf());
        if (h === 'f64' || h === 'f32') return isNum(v) ? new Flt(v) : v;
        if (h === 'String' && v instanceof Chr) return v.c;
        return v;
      }
      case 'try_into':
        return ok(v);
      case 'hash':
        return UNIT;
    }
    if (node.e && MAP_MUT.has(name) && (v instanceof RMap || v instanceof RSet))
      self.chkMutRoot(node.e, env, 'borrow', line);
    else if (node.e && VEC_MUT.has(name) && Array.isArray(v))
      self.chkMutRoot(node.e, env, 'borrow', line);
    else if (node.e && STR_MUT.has(name) && typeof v === 'string')
      self.chkMutRoot(node.e, env, 'borrow', line);

    // ---- numbers
    if (isNum(v)) {
      switch (name) {
        case 'abs':
          return Math.abs(v);
        case 'pow':
          return Math.pow(v, arg(0));
        case 'min':
          return Math.min(v, arg(0));
        case 'max':
          return Math.max(v, arg(0));
        case 'clamp':
          return Math.min(Math.max(v, arg(0)), arg(1));
        case 'signum':
          return Math.sign(v);
        case 'is_positive':
          return v > 0;
        case 'is_negative':
          return v < 0;
        case 'rem_euclid':
          return ((v % arg(0)) + arg(0)) % arg(0);
        case 'div_euclid':
          return Math.floor(v / arg(0));
        case 'abs_diff':
          return Math.abs(v - arg(0));
        case 'checked_add':
          return mkOpt(v + arg(0));
        case 'checked_sub': {
          const r = v - arg(0);
          return r < 0 && /^u/.test(self.hint) ? NONE() : some(r);
        }
        case 'checked_mul':
          return some(v * arg(0));
        case 'checked_div':
          return arg(0) === 0 ? NONE() : some(Math.trunc(v / arg(0)));
        case 'checked_rem':
          return arg(0) === 0 ? NONE() : some(v % arg(0));
        case 'saturating_sub':
          return Math.max(0, v - arg(0));
        case 'saturating_add':
          return v + arg(0);
        case 'wrapping_add':
          return v + arg(0);
        case 'wrapping_sub':
          return v - arg(0);
        case 'wrapping_mul':
          return v * arg(0);
        case 'is_power_of_two':
          return v > 0 && (v & (v - 1)) === 0;
        case 'count_ones':
          return v.toString(2).split('1').length - 1;
        case 'sqrt':
        case 'powi':
        case 'powf':
        case 'floor':
        case 'ceil':
        case 'round':
          throw new RustError(
            'no method named `' +
              name +
              '` found for type `{integer}` in the current scope\n  = help: `' +
              name +
              '` is a float method: convert first with `as f64`',
            line,
            'E0599'
          );
        case 'is_ascii_digit':
          return v >= 48 && v <= 57;
        case 'is_ascii_alphabetic':
          return /[A-Za-z]/.test(String.fromCharCode(v));
      }
      return noMethod();
    }
    if (v instanceof Flt) {
      const x = v.v,
        F = (y) => new Flt(y);
      switch (name) {
        case 'sqrt':
          return F(Math.sqrt(x));
        case 'abs':
          return F(Math.abs(x));
        case 'powi':
        case 'powf':
          return F(Math.pow(x, isNum(arg(0)) ? arg(0) : arg(0).v));
        case 'floor':
          return F(Math.floor(x));
        case 'ceil':
          return F(Math.ceil(x));
        case 'round':
          return F(roundAway(x));
        case 'trunc':
          return F(Math.trunc(x));
        case 'fract':
          return F(x - Math.trunc(x));
        case 'min':
          return F(Math.min(x, arg(0).v));
        case 'max':
          return F(Math.max(x, arg(0).v));
        case 'clamp':
          return F(Math.min(Math.max(x, arg(0).v), arg(1).v));
        case 'signum':
          return F(Math.sign(x) || 1);
        case 'sin':
          return F(Math.sin(x));
        case 'cos':
          return F(Math.cos(x));
        case 'tan':
          return F(Math.tan(x));
        case 'atan2':
          return F(Math.atan2(x, arg(0).v));
        case 'atan':
          return F(Math.atan(x));
        case 'ln':
          return F(Math.log(x));
        case 'log10':
          return F(Math.log10(x));
        case 'log2':
          return F(Math.log2(x));
        case 'log':
          return F(Math.log(x) / Math.log(arg(0).v));
        case 'exp':
          return F(Math.exp(x));
        case 'is_nan':
          return Number.isNaN(x);
        case 'is_finite':
          return Number.isFinite(x);
        case 'is_infinite':
          return !Number.isFinite(x) && !Number.isNaN(x);
        case 'is_sign_negative':
          return x < 0;
        case 'is_sign_positive':
          return x >= 0;
        case 'to_degrees':
          return F((x * 180) / Math.PI);
        case 'to_radians':
          return F((x * Math.PI) / 180);
        case 'hypot':
          return F(Math.hypot(x, arg(0).v));
        case 'cbrt':
          return F(Math.cbrt(x));
        case 'rem_euclid':
          return F(((x % arg(0).v) + arg(0).v) % arg(0).v);
        case 'mul_add':
          return F(x * arg(0).v + arg(1).v);
      }
      return noMethod();
    }
    if (typeof v === 'boolean') {
      if (name === 'then') return v ? some(call(args[0])) : NONE();
      if (name === 'then_some') return v ? some(args[0]) : NONE();
      if (name === 'not') return !v;
      return noMethod();
    }
    if (v instanceof Chr) {
      const c = v.c;
      switch (name) {
        case 'is_alphabetic':
          return /\p{L}/u.test(c);
        case 'is_numeric':
          return /\p{N}/u.test(c);
        case 'is_alphanumeric':
          return /[\p{L}\p{N}]/u.test(c);
        case 'is_whitespace':
          return /\s/.test(c);
        case 'is_uppercase':
          return /\p{Lu}/u.test(c);
        case 'is_lowercase':
          return /\p{Ll}/u.test(c);
        case 'is_ascii_digit':
          return /[0-9]/.test(c);
        case 'is_ascii_alphabetic':
          return /[A-Za-z]/.test(c);
        case 'is_ascii_alphanumeric':
          return /[A-Za-z0-9]/.test(c);
        case 'is_ascii_uppercase':
          return /[A-Z]/.test(c);
        case 'is_ascii_lowercase':
          return /[a-z]/.test(c);
        case 'is_ascii_punctuation':
          return /[!-\/:-@\[-`{-~]/.test(c);
        case 'is_ascii':
          return c.charCodeAt(0) < 128;
        case 'is_digit':
          return !Number.isNaN(parseInt(c, arg(0))) && parseInt(c, arg(0)) < arg(0);
        case 'to_ascii_uppercase':
          return new Chr(c.toUpperCase());
        case 'to_ascii_lowercase':
          return new Chr(c.toLowerCase());
        case 'to_uppercase':
          return [...c.toUpperCase()].map((x) => new Chr(x));
        case 'to_lowercase':
          return [...c.toLowerCase()].map((x) => new Chr(x));
        case 'to_digit': {
          const d = parseInt(c, arg(0));
          return Number.isNaN(d) ? NONE() : some(d);
        }
        case 'len_utf8':
          return strLen(c);
      }
      return noMethod();
    }
    if (typeof v === 'string') return self.strMethod(v, name, args, node, env, rv);
    if (v instanceof Ev) return self.evMethod(v, name, args, node, env, rv);
    if (v instanceof Fmtr) {
      if (name === 'write_str') {
        v.buf += arg(0);
        return ok(UNIT);
      }
      if (name === 'pad') {
        v.buf += arg(0);
        return ok(UNIT);
      }
      return noMethod();
    }
    if (v instanceof Entry) return self.entryMethod(v, name, args, node);
    if (v instanceof Sv) {
      if (v.t === 'ParseIntError' && name === 'kind') return v.f.kind;
      return noMethod();
    }
    if (v instanceof RMap) return self.mapMethod(v, name, args, node);
    if (v instanceof RSet) return self.setMethod(v, name, args, node);
    if (Array.isArray(v)) {
      const r = self.vecMethod(v, name, args, node, env, rv);
      if (r !== undefined) return r;
    }
    if (v instanceof Tup) {
      if (name === 'clone') return self.clone(v);
      return noMethod();
    }
    if (v instanceof Rng) {
      if (name === 'contains') {
        const x = arg(0);
        return self.cmp(x, v.a) >= 0 && (v.incl ? self.cmp(x, v.b) <= 0 : self.cmp(x, v.b) < 0);
      }
      if (name === 'len') return Math.max(0, (v.incl ? v.b + 1 : v.b) - v.a);
      if (name === 'is_empty') return (v.incl ? v.b + 1 : v.b) <= v.a;
      if (name === 'start') return v.a;
      if (name === 'end') return v.b;
    }
    if (v instanceof Clo || v instanceof Fn) {
      if (name === 'call') return call(v, ...args);
      return noMethod();
    }
    return self.iterMethod(v, name, args, node, env, rv);
  };

  // ---------------------------------------------------------------- strings
  P.strMethod = function (s, name, args, node, env, rv) {
    const self = this,
      line = node.line;
    const arg = (i) => dv(args[i]);
    const call = (f, ...a) => self.callValue(f, a, line);
    const setS = (ns) => {
      const pl = self.place(node.e, env, true);
      pl.set(ns);
    };
    const pat = (p) => {
      p = dv(p);
      if (p instanceof Chr) return (c) => c === p.c;
      if (typeof p === 'string') return null;
      if (Array.isArray(p)) return (c) => p.some((x) => x.c === c);
      return (c) => dv(call(p, new Chr(c))) === true;
    };
    const splitBy = (str, p) => {
      p = dv(p);
      if (typeof p === 'string') return p === '' ? ['', ...[...str], ''] : str.split(p);
      const f = pat(p);
      const out = [];
      let cur = '';
      for (const ch of str) {
        if (f(ch)) {
          out.push(cur);
          cur = '';
        } else cur += ch;
      }
      out.push(cur);
      return out;
    };
    switch (name) {
      case 'len':
        return strLen(s);
      case 'is_empty':
        return s.length === 0;
      case 'push_str':
        setS(s + arg(0));
        return UNIT;
      case 'push':
        setS(s + arg(0).c);
        return UNIT;
      case 'clear':
        setS('');
        return UNIT;
      case 'pop': {
        if (!s.length) return NONE();
        const a = [...s];
        const c = a.pop();
        setS(a.join(''));
        return some(new Chr(c));
      }
      case 'insert': {
        const a = [...s];
        a.splice(arg(0), 0, arg(1).c);
        setS(a.join(''));
        return UNIT;
      }
      case 'insert_str': {
        const a = [...s];
        a.splice(arg(0), 0, arg(1));
        setS(a.join(''));
        return UNIT;
      }
      case 'remove': {
        const a = [...s];
        const c = a.splice(arg(0), 1)[0];
        setS(a.join(''));
        return new Chr(c);
      }
      case 'truncate':
        setS([...s].slice(0, arg(0)).join(''));
        return UNIT;
      case 'chars':
        return new Iter([...s].map((c) => new Chr(c)));
      case 'bytes':
        return new Iter([...new TextEncoder().encode(s)]);
      case 'as_bytes':
      case 'into_bytes':
        return [...new TextEncoder().encode(s)];
      case 'char_indices':
        return new Iter([...s].map((c, i) => new Tup([i, new Chr(c)])));
      case 'to_uppercase':
      case 'to_ascii_uppercase':
        return s.toUpperCase();
      case 'to_lowercase':
      case 'to_ascii_lowercase':
        return s.toLowerCase();
      case 'trim':
        return s.trim();
      case 'trim_start':
        return s.trimStart();
      case 'trim_end':
        return s.trimEnd();
      case 'trim_matches':
      case 'trim_start_matches':
      case 'trim_end_matches': {
        const p = arg(0);
        const f = typeof p === 'string' ? null : pat(p);
        let a = [...s];
        const m = (i) => (f ? f(a[i]) : false);
        if (typeof p === 'string') {
          let r = s;
          if (name !== 'trim_end_matches') while (p && r.startsWith(p)) r = r.slice(p.length);
          if (name !== 'trim_start_matches') while (p && r.endsWith(p)) r = r.slice(0, -p.length);
          return r;
        }
        if (name !== 'trim_end_matches') while (a.length && m(0)) a.shift();
        if (name !== 'trim_start_matches') while (a.length && m(a.length - 1)) a.pop();
        return a.join('');
      }
      case 'split':
        return new Iter(splitBy(s, args[0]));
      case 'rsplit':
        return new Iter(splitBy(s, args[0]).reverse());
      case 'splitn': {
        const parts = splitBy(s, args[1]);
        const n = arg(0);
        return new Iter(
          parts.length <= n
            ? parts
            : [
                ...parts.slice(0, n - 1),
                parts.slice(n - 1).join(typeof arg(1) === 'string' ? arg(1) : arg(1).c || ''),
              ]
        );
      }
      case 'split_whitespace':
      case 'split_ascii_whitespace':
        return new Iter(s.split(/\s+/).filter((x) => x.length));
      case 'lines':
        return new Iter(s.split(/\r?\n/).filter((x, i, a) => !(i === a.length - 1 && x === '')));
      case 'split_once': {
        const p = arg(0);
        const f = typeof p === 'string' ? null : pat(p);
        if (f) {
          const a = [...s];
          const i = a.findIndex(f);
          return i < 0 ? NONE() : some(new Tup([a.slice(0, i).join(''), a.slice(i + 1).join('')]));
        }
        const i = s.indexOf(p);
        return i < 0 ? NONE() : some(new Tup([s.slice(0, i), s.slice(i + p.length)]));
      }
      case 'split_at':
        return new Tup([s.slice(0, arg(0)), s.slice(arg(0))]);
      case 'contains': {
        const p = arg(0);
        return typeof p === 'string' ? s.includes(p) : [...s].some(pat(p));
      }
      case 'starts_with': {
        const p = arg(0);
        return typeof p === 'string' ? s.startsWith(p) : s.length > 0 && pat(p)([...s][0]);
      }
      case 'ends_with': {
        const p = arg(0);
        return typeof p === 'string' ? s.endsWith(p) : s.length > 0 && pat(p)([...s].pop());
      }
      case 'strip_prefix': {
        const p = arg(0);
        const q = p instanceof Chr ? p.c : p;
        return s.startsWith(q) ? some(s.slice(q.length)) : NONE();
      }
      case 'strip_suffix': {
        const p = arg(0);
        const q = p instanceof Chr ? p.c : p;
        return s.endsWith(q) ? some(s.slice(0, s.length - q.length)) : NONE();
      }
      case 'find': {
        const p = arg(0);
        if (typeof p === 'string') {
          const i = s.indexOf(p);
          return i < 0 ? NONE() : some(i);
        }
        const a = [...s];
        const i = a.findIndex(pat(p));
        return i < 0 ? NONE() : some(i);
      }
      case 'rfind': {
        const p = arg(0);
        const q = p instanceof Chr ? p.c : p;
        const i = s.lastIndexOf(q);
        return i < 0 ? NONE() : some(i);
      }
      case 'replace': {
        const p = arg(0);
        return typeof p === 'string'
          ? s.split(p).join(arg(1))
          : [...s].map((c) => (pat(p)(c) ? arg(1) : c)).join('');
      }
      case 'replacen': {
        let r = s,
          n = arg(2);
        const p = arg(0);
        const q = p instanceof Chr ? p.c : p;
        let out = '',
          i = 0;
        while (n-- > 0) {
          const j = r.indexOf(q, i);
          if (j < 0) break;
          out += r.slice(i, j) + arg(1);
          i = j + q.length;
        }
        return out + r.slice(i);
      }
      case 'repeat':
        return s.repeat(arg(0));
      case 'eq_ignore_ascii_case':
        return s.toLowerCase() === arg(0).toLowerCase();
      case 'get': {
        const i = arg(0);
        if (i instanceof Rng) {
          const b = i.b === Infinity ? s.length : i.incl ? i.b + 1 : i.b;
          return i.a <= b && b <= s.length ? some(s.slice(i.a, b)) : NONE();
        }
        return NONE();
      }
      case 'parse': {
        const t = self.hintOf();
        const h = t;
        const f = /f(32|64)/.test(h);
        const iN = INTS.test(head(h)) || /(?:^|[<(])(i|u)(8|16|32|64|128|size)\b/.test(h);
        const str = s;
        if (f || (!iN && /^[+-]?(\d+\.\d*|\.\d+|\d+[eE][+-]?\d+)$/.test(str))) {
          if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(str) || /^[+-]?(inf|NaN)$/.test(str))
            return ok(new Flt(parseFloat(str)));
          return errV(self.parseErr('float'));
        }
        if (/^bool/.test(head(h)) || /<bool/.test(h))
          return str === 'true'
            ? ok(true)
            : str === 'false'
              ? ok(false)
              : errV(new Sv('ParseBoolError', {}));
        if (/char/.test(h) && [...str].length === 1) return ok(new Chr(str));
        if (/^[+-]?\d+$/.test(str)) {
          const x = parseInt(str, 10);
          const mt = h.match(/(?:^|[<(])((?:i|u)(?:8|16|32|64|128|size))\b/);
          if (mt && INT_RANGE[mt[1]] && (x < INT_RANGE[mt[1]][0] || x > INT_RANGE[mt[1]][1]))
            return errV(
              new Sv('ParseIntError', {
                kind: new Ev('IntErrorKind', x < 0 ? 'NegOverflow' : 'PosOverflow', []),
                msg:
                  x < 0
                    ? 'number too small to fit in target type'
                    : 'number too large to fit in target type',
              })
            );
          if (mt && mt[1][0] === 'u' && /^-/.test(str)) return errV(self.parseErr('int'));
          return ok(x);
        }
        if (str === '')
          return errV(
            new Sv('ParseIntError', {
              kind: new Ev('IntErrorKind', 'Empty', []),
              msg: 'cannot parse integer from empty string',
            })
          );
        return errV(self.parseErr('int'));
      }
      case 'chars_':
        break;
      case 'concat':
        break;
      case 'is_char_boundary':
        return true;
      case 'capacity':
        return s.length;
      case 'iter':
        break;
    }
    if (name === 'into_iter') return new Iter([...s].map((c) => new Chr(c)));
    throw new RustError(
      'no method named `' + name + '` found for type `&str`/`String` in the current scope',
      line,
      'E0599'
    );
  };

  // ---------------------------------------------------------------- Option / Result / Ordering
  P.evMethod = function (v, name, args, node, env, rv) {
    const self = this,
      line = node.line;
    const call = (f, ...a) => self.callValue(f, a, line);
    const arg = (i) => dv(args[i]);
    if (v.en === 'Ordering') {
      switch (name) {
        case 'reverse':
          return ordV(v.v === 'Less' ? 1 : v.v === 'Greater' ? -1 : 0);
        case 'then':
          return v.v === 'Equal' ? arg(0) : v;
        case 'then_with':
          return v.v === 'Equal' ? call(args[0]) : v;
        case 'is_lt':
          return v.v === 'Less';
        case 'is_gt':
          return v.v === 'Greater';
        case 'is_eq':
          return v.v === 'Equal';
        case 'is_le':
          return v.v !== 'Greater';
        case 'is_ge':
          return v.v !== 'Less';
      }
    }
    if (v.en === 'Option') {
      const isS = v.v === 'Some',
        x = isS ? v.f[0] : undefined;
      switch (name) {
        case 'is_some':
          return isS;
        case 'is_none':
          return !isS;
        case 'is_some_and':
          return isS && dv(call(args[0], x)) === true;
        case 'is_none_or':
          return !isS || dv(call(args[0], x)) === true;
        case 'unwrap':
          if (isS) return x;
          throw new Panic('called `Option::unwrap()` on a `None` value', line);
        case 'expect':
          if (isS) return x;
          throw new Panic(arg(0), line);
        case 'unwrap_or':
          return isS ? x : args[0];
        case 'unwrap_or_else':
          return isS ? x : call(args[0]);
        case 'unwrap_or_default':
          return isS ? x : self.defaultForType(self.hintOf());
        case 'map':
          return isS ? some(call(args[0], x)) : v;
        case 'map_or':
          return isS ? call(args[1], x) : args[0];
        case 'map_or_else':
          return isS ? call(args[1], x) : call(args[0]);
        case 'and_then':
          return isS ? call(args[0], x) : v;
        case 'and':
          return isS ? args[0] : v;
        case 'or':
          return isS ? v : args[0];
        case 'or_else':
          return isS ? v : call(args[0]);
        case 'xor': {
          const o = arg(0);
          return isS && o.v === 'None' ? v : !isS && o.v === 'Some' ? o : NONE();
        }
        case 'filter':
          return isS && dv(call(args[0], x)) === true ? v : NONE();
        case 'ok_or':
          return isS ? ok(x) : errV(args[0]);
        case 'ok_or_else':
          return isS ? ok(x) : errV(call(args[0]));
        case 'cloned':
        case 'copied':
          return isS ? some(self.clone(x)) : v;
        case 'take': {
          const old = new Ev('Option', v.v, v.f);
          const nv = NONE();
          self.replaceInPlace(v, nv, line);
          return old;
        }
        case 'replace': {
          const old = new Ev('Option', v.v, v.f);
          self.replaceInPlace(v, some(args[0]), line);
          return old;
        }
        case 'insert': {
          self.replaceInPlace(v, some(args[0]), line);
          return v.f[0];
        }
        case 'get_or_insert':
        case 'get_or_insert_with': {
          if (!isS)
            self.replaceInPlace(v, some(name === 'get_or_insert' ? args[0] : call(args[0])), line);
          return v.f[0];
        }
        case 'iter':
        case 'into_iter':
          return new Iter(isS ? [x] : []);
        case 'flatten':
          return isS ? x : v;
        case 'zip': {
          const o = arg(0);
          return isS && o.v === 'Some' ? some(new Tup([x, o.f[0]])) : NONE();
        }
        case 'unwrap_unchecked':
          return x;
      }
    } else if (v.en === 'Result') {
      const isO = v.v === 'Ok',
        x = v.f[0];
      switch (name) {
        case 'is_ok':
          return isO;
        case 'is_err':
          return !isO;
        case 'is_ok_and':
          return isO && dv(call(args[0], x)) === true;
        case 'is_err_and':
          return !isO && dv(call(args[0], x)) === true;
        case 'unwrap':
          if (isO) return x;
          throw new Panic('called `Result::unwrap()` on an `Err` value: ' + self.dbg(x), line);
        case 'expect':
          if (isO) return x;
          throw new Panic(arg(0) + ': ' + self.dbg(x), line);
        case 'unwrap_err':
          if (!isO) return x;
          throw new Panic('called `Result::unwrap_err()` on an `Ok` value: ' + self.dbg(x), line);
        case 'expect_err':
          if (!isO) return x;
          throw new Panic(arg(0) + ': ' + self.dbg(x), line);
        case 'unwrap_or':
          return isO ? x : args[0];
        case 'unwrap_or_else':
          return isO ? x : call(args[0], x);
        case 'unwrap_or_default':
          return isO ? x : self.defaultForType(self.hintOf());
        case 'map':
          return isO ? ok(call(args[0], x)) : v;
        case 'map_err':
          return isO ? v : errV(call(args[0], x));
        case 'map_or':
          return isO ? call(args[1], x) : args[0];
        case 'and_then':
          return isO ? call(args[0], x) : v;
        case 'or_else':
          return isO ? v : call(args[0], x);
        case 'and':
          return isO ? args[0] : v;
        case 'or':
          return isO ? v : args[0];
        case 'ok':
          return isO ? some(x) : NONE();
        case 'err':
          return isO ? NONE() : some(x);
        case 'iter':
        case 'into_iter':
          return new Iter(isO ? [x] : []);
        case 'cloned':
        case 'copied':
          return isO ? ok(self.clone(x)) : v;
      }
    }
    const um = self.findMethod(v.en, name);
    if (um) return self.callFn(um, args, v, line);
    throw new RustError(
      'no method named `' + name + '` found for enum `' + v.en + '` in the current scope',
      line,
      'E0599'
    );
  };

  // ---------------------------------------------------------------- Vec
  P.vecMethod = function (a, name, args, node, env, rv) {
    const self = this,
      line = node.line;
    const arg = (i) => dv(args[i]);
    const call = (f, ...x) => self.callValue(f, x, line);
    const noFloat = () => {
      if (a.some((x) => dv(x) instanceof Flt))
        throw new RustError(
          'the trait bound `f64: Ord` is not satisfied\n  = help: f64 only has PartialOrd. Use `sort_by(|a, b| a.partial_cmp(b).unwrap())`',
          line,
          'E0277'
        );
    };
    const ordN = (r) => {
      r = dv(r);
      return r.v === 'Less' ? -1 : r.v === 'Greater' ? 1 : 0;
    };
    switch (name) {
      case 'len':
        return a.length;
      case 'is_empty':
        return a.length === 0;
      case 'capacity':
        return a.length;
      case 'push':
        a.push(args[0]);
        return UNIT;
      case 'pop':
        return a.length ? some(a.pop()) : NONE();
      case 'insert': {
        const i = arg(0);
        if (i > a.length)
          throw new Panic(
            'insertion index (is ' + i + ') should be <= len (is ' + a.length + ')',
            line
          );
        a.splice(i, 0, args[1]);
        return UNIT;
      }
      case 'remove': {
        const i = arg(0);
        if (i >= a.length)
          throw new Panic(
            'removal index (is ' + i + ') should be < len (is ' + a.length + ')',
            line
          );
        return a.splice(i, 1)[0];
      }
      case 'swap_remove': {
        const i = arg(0);
        const x = a[i];
        a[i] = a[a.length - 1];
        a.pop();
        return x;
      }
      case 'clear':
        a.length = 0;
        return UNIT;
      case 'truncate':
        a.length = Math.min(a.length, arg(0));
        return UNIT;
      case 'contains':
        return a.some((x) => self.eq(x, args[0]));
      case 'first':
        return a.length ? some(a[0]) : NONE();
      case 'last':
        return a.length ? some(a[a.length - 1]) : NONE();
      case 'first_mut':
        return a.length ? some(self.elemRef(a, 0)) : NONE();
      case 'last_mut':
        return a.length ? some(self.elemRef(a, a.length - 1)) : NONE();
      case 'get': {
        const i = arg(0);
        if (i instanceof Rng) {
          const b = i.b === Infinity ? a.length : i.incl ? i.b + 1 : i.b;
          return i.a <= b && b <= a.length ? some(a.slice(i.a, b)) : NONE();
        }
        return i >= 0 && i < a.length ? some(a[i]) : NONE();
      }
      case 'get_mut': {
        const i = arg(0);
        return i >= 0 && i < a.length ? some(self.elemRef(a, i)) : NONE();
      }
      case 'iter':
      case 'into_iter':
      case 'drain_':
        return new Iter(a.slice());
      case 'iter_mut':
        return new Iter(a.map((x, i) => self.elemRef(a, i)));
      case 'extend':
      case 'extend_from_slice':
      case 'append': {
        const src = self.toArr(args[0]);
        a.push(...src.map((x) => self.clone(x)));
        if (name === 'append') {
          const o = dv(args[0]);
          if (Array.isArray(o)) o.length = 0;
        }
        return UNIT;
      }
      case 'reverse':
        a.reverse();
        return UNIT;
      case 'swap': {
        const i = arg(0),
          j = arg(1);
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
        return UNIT;
      }
      case 'sort':
      case 'sort_unstable': {
        noFloat();
        a.sort((x, y) => self.cmp(x, y));
        return UNIT;
      }
      case 'sort_by':
      case 'sort_unstable_by':
        a.sort((x, y) => ordN(call(args[0], x, y)));
        return UNIT;
      case 'sort_by_key':
      case 'sort_unstable_by_key':
        a.sort((x, y) => self.cmp(call(args[0], x), call(args[0], y)));
        return UNIT;
      case 'dedup': {
        for (let i = a.length - 1; i > 0; i--) if (self.eq(a[i], a[i - 1])) a.splice(i, 1);
        return UNIT;
      }
      case 'retain': {
        const keep = a.filter((x) => dv(call(args[0], x)) === true);
        a.length = 0;
        a.push(...keep);
        return UNIT;
      }
      case 'drain': {
        const r = arg(0);
        const s = r.a,
          e = r.b === Infinity ? a.length : r.incl ? r.b + 1 : r.b;
        return new Iter(a.splice(s, e - s));
      }
      case 'join': {
        const sep = args.length ? arg(0) : '';
        return a.map((x) => self.disp(x, line)).join(sep);
      }
      case 'concat':
        return a.length && Array.isArray(dv(a[0]))
          ? [].concat(...a.map(dv))
          : a.map((x) => dv(x)).join('');
      case 'to_vec':
        return self.clone(a);
      case 'into_boxed_slice':
      case 'into_vec':
        return a;
      case 'split_at':
        return new Tup([a.slice(0, arg(0)), a.slice(arg(0))]);
      case 'split_first':
        return a.length ? some(new Tup([a[0], a.slice(1)])) : NONE();
      case 'split_last':
        return a.length ? some(new Tup([a[a.length - 1], a.slice(0, -1)])) : NONE();
      case 'windows': {
        const n = arg(0),
          out = [];
        for (let i = 0; i + n <= a.length; i++) out.push(a.slice(i, i + n));
        return new Iter(out);
      }
      case 'chunks': {
        const n = arg(0),
          out = [];
        for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
        return new Iter(out);
      }
      case 'resize': {
        const n = arg(0);
        while (a.length > n) a.pop();
        while (a.length < n) a.push(self.clone(args[1]));
        return UNIT;
      }
      case 'fill':
        for (let i = 0; i < a.length; i++) a[i] = self.clone(args[0]);
        return UNIT;
      case 'binary_search': {
        let lo = 0,
          hi = a.length;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          const c = self.cmp(a[m], args[0]);
          if (c === 0) return ok(m);
          if (c < 0) lo = m + 1;
          else hi = m;
        }
        return errV(lo);
      }
      case 'starts_with': {
        const p = arg(0);
        return p.every((x, i) => i < a.length && self.eq(a[i], x));
      }
      case 'ends_with': {
        const p = arg(0);
        return p.every((x, i) => self.eq(a[a.length - p.length + i], x));
      }
      case 'rotate_left': {
        const k = arg(0);
        a.push(...a.splice(0, k));
        return UNIT;
      }
      case 'rotate_right': {
        const k = arg(0);
        a.unshift(...a.splice(a.length - k, k));
        return UNIT;
      }
      case 'push_back':
        a.push(args[0]);
        return UNIT;
      case 'pop_front':
        return a.length ? some(a.shift()) : NONE();
      case 'push_front':
        a.unshift(args[0]);
        return UNIT;
      case 'pop_back':
        return a.length ? some(a.pop()) : NONE();
    }
    return undefined === self.iterMethod
      ? undefined
      : self.iterMethod(a, name, args, node, env, rv);
  };

  // ---------------------------------------------------------------- iterators (eager)
  P.iterMethod = function (v, name, args, node, env, rv) {
    const self = this,
      line = node.line;
    const call = (f, ...x) => self.callValue(f, x, line);
    const arg = (i) => dv(args[i]);
    const hint = () => head(self.hintOf());
    if (v instanceof Iter) {
      if (name === 'next') return v.i < v.a.length ? some(v.a[v.i++]) : NONE();
      if (name === 'peek') return v.i < v.a.length ? some(v.a[v.i]) : NONE();
      if (name === 'next_back') return v.i < v.a.length ? some(v.a.pop()) : NONE();
      if (name === 'peekable' || name === 'iter' || name === 'into_iter' || name === 'by_ref')
        return v;
      if (name === 'next_if') {
        if (v.i < v.a.length && dv(call(args[0], v.a[v.i])) === true) return some(v.a[v.i++]);
        return NONE();
      }
      if (name === 'len') return v.a.length - v.i;
    }
    const noM = () => {
      throw new RustError(
        'no method named `' + name + '` found for type `' + typeName(v) + '` in the current scope',
        line,
        'E0599'
      );
    };
    let items;
    try {
      items = self.toArr(v, line);
    } catch (e) {
      if (e instanceof RustError && /is not an iterator/.test(e.message)) return noM();
      throw e;
    }
    const I = (x) => new Iter(x);
    switch (name) {
      case 'iter':
      case 'into_iter':
        return I(items);
      case 'peekable':
        return I(items);
      case 'map':
        return I(items.map((x) => call(args[0], x)));
      case 'filter':
        return I(items.filter((x) => dv(call(args[0], x)) === true));
      case 'filter_map':
        return I(
          items
            .map((x) => call(args[0], x))
            .filter((o) => dv(o).v === 'Some')
            .map((o) => dv(o).f[0])
        );
      case 'flat_map':
        return I([].concat(...items.map((x) => self.toArr(call(args[0], x), line))));
      case 'flatten':
        return I([].concat(...items.map((x) => self.toArr(x, line))));
      case 'enumerate':
        return I(items.map((x, i) => new Tup([i, x])));
      case 'zip': {
        const o = self.toArr(args[0], line);
        return I(
          items.slice(0, Math.min(items.length, o.length)).map((x, i) => new Tup([x, o[i]]))
        );
      }
      case 'rev':
        return I(items.slice().reverse());
      case 'skip':
        return I(items.slice(arg(0)));
      case 'take':
        return I(items.slice(0, arg(0)));
      case 'step_by':
        return I(items.filter((x, i) => i % arg(0) === 0));
      case 'chain':
        return I(items.concat(self.toArr(args[0], line)));
      case 'cloned':
      case 'copied':
        return I(items.map((x) => self.clone(x)));
      case 'by_ref':
        return I(items);
      case 'take_while': {
        const o = [];
        for (const x of items) {
          if (dv(call(args[0], x)) !== true) break;
          o.push(x);
        }
        return I(o);
      }
      case 'skip_while': {
        let i = 0;
        while (i < items.length && dv(call(args[0], items[i])) === true) i++;
        return I(items.slice(i));
      }
      case 'inspect':
        items.forEach((x) => call(args[0], x));
        return I(items);
      case 'sum':
      case 'product': {
        const isF = items.some((x) => dv(x) instanceof Flt) || /^f(32|64)$/.test(hint());
        const mul = name === 'product';
        if (isF)
          return new Flt(
            items.reduce(
              (s, x) => {
                const y = dv(x);
                return mul ? s * y.v : s + y.v;
              },
              mul ? 1 : 0
            )
          );
        return items.reduce((s, x) => (mul ? s * dv(x) : s + dv(x)), mul ? 1 : 0);
      }
      case 'count':
        return items.length;
      case 'last':
        return items.length ? some(items[items.length - 1]) : NONE();
      case 'nth':
        return arg(0) < items.length ? some(items[arg(0)]) : NONE();
      case 'min':
      case 'max': {
        if (items.some((x) => dv(x) instanceof Flt))
          throw new RustError(
            'the trait bound `f64: Ord` is not satisfied\n  = help: use `.fold(f64::MAX, f64::min)` or `.max_by(|a, b| a.partial_cmp(b).unwrap())`',
            line,
            'E0277'
          );
        if (!items.length) return NONE();
        let b = items[0];
        for (const x of items) {
          const c = self.cmp(x, b);
          if (name === 'max' ? c >= 0 : c < 0) b = x;
        }
        return some(b);
      }
      case 'min_by_key':
      case 'max_by_key': {
        if (!items.length) return NONE();
        let b = items[0],
          bk = call(args[0], b);
        for (const x of items.slice(1)) {
          const k = call(args[0], x);
          const c = self.cmp(k, bk);
          if (name === 'max_by_key' ? c >= 0 : c < 0) {
            b = x;
            bk = k;
          }
        }
        return some(b);
      }
      case 'min_by':
      case 'max_by': {
        if (!items.length) return NONE();
        let b = items[0];
        for (const x of items.slice(1)) {
          const r = dv(call(args[0], x, b)).v;
          const c = r === 'Less' ? -1 : r === 'Greater' ? 1 : 0;
          if (name === 'max_by' ? c >= 0 : c < 0) b = x;
        }
        return some(b);
      }
      case 'fold': {
        let acc = args[0];
        for (const x of items) acc = call(args[1], acc, x);
        return acc;
      }
      case 'reduce': {
        if (!items.length) return NONE();
        let acc = items[0];
        for (const x of items.slice(1)) acc = call(args[0], acc, x);
        return some(acc);
      }
      case 'any':
        return items.some((x) => dv(call(args[0], x)) === true);
      case 'all':
        return items.every((x) => dv(call(args[0], x)) === true);
      case 'find': {
        for (const x of items) if (dv(call(args[0], x)) === true) return some(x);
        return NONE();
      }
      case 'find_map': {
        for (const x of items) {
          const o = dv(call(args[0], x));
          if (o.v === 'Some') return o;
        }
        return NONE();
      }
      case 'position': {
        const i = items.findIndex((x) => dv(call(args[0], x)) === true);
        return i < 0 ? NONE() : some(i);
      }
      case 'for_each':
        items.forEach((x) => call(args[0], x));
        return UNIT;
      case 'unzip':
        return new Tup([items.map((x) => dv(x).a[0]), items.map((x) => dv(x).a[1])]);
      case 'partition': {
        const y = [],
          n = [];
        for (const x of items) (dv(call(args[0], x)) === true ? y : n).push(x);
        return new Tup([y, n]);
      }
      case 'collect': {
        const h = head(self.hintOf());
        if (h === 'String') return items.map((x) => self.disp(x, line)).join('');
        if (h === 'HashMap' || h === 'BTreeMap') {
          const m = new RMap(h === 'BTreeMap');
          for (const t of items) {
            const p = dv(t).a;
            m.m.set(self.key(p[0]), [p[0], p[1]]);
          }
          return m;
        }
        if (h === 'HashSet' || h === 'BTreeSet') {
          const s = new RSet(h === 'BTreeSet');
          for (const x of items) s.m.set(self.key(x), dv(x));
          return s;
        }
        if (h === 'Result') {
          const out = [];
          for (const x of items) {
            const r = dv(x);
            if (r.v === 'Err') return r;
            out.push(r.f[0]);
          }
          return ok(out);
        }
        if (h === 'Option') {
          const out = [];
          for (const x of items) {
            const r = dv(x);
            if (r.v === 'None') return r;
            out.push(r.f[0]);
          }
          return some(out);
        }
        return items;
      }
      case 'to_vec':
        return items;
      case 'len':
        return items.length;
      case 'is_empty':
        return items.length === 0;
      case 'contains':
        return items.some((x) => self.eq(x, args[0]));
      case 'sorted':
        break;
    }
    return noM();
  };

  // ---------------------------------------------------------------- HashMap / HashSet / Entry
  P.mapMethod = function (m, name, args, node) {
    const self = this,
      line = node.line;
    const arg = (i) => dv(args[i]);
    const call = (f, ...x) => self.callValue(f, x, line);
    const slot = (k) => {
      const e = m.m.get(k);
      const v = e[1];
      return isObjLike(v)
        ? v
        : new Ref(
            () => e[1],
            (x) => {
              e[1] = x;
            }
          );
    };
    switch (name) {
      case 'new':
        return m;
      case 'insert': {
        const k = self.key(args[0]);
        const old = m.m.get(k);
        m.m.set(k, [dv(args[0]), args[1]]);
        return old ? some(old[1]) : NONE();
      }
      case 'get': {
        const e = m.m.get(self.key(args[0]));
        return e ? some(e[1]) : NONE();
      }
      case 'get_mut': {
        const k = self.key(args[0]);
        return m.m.has(k) ? some(slot(k)) : NONE();
      }
      case 'contains_key':
        return m.m.has(self.key(args[0]));
      case 'remove': {
        const k = self.key(args[0]);
        const e = m.m.get(k);
        m.m.delete(k);
        return e ? some(e[1]) : NONE();
      }
      case 'len':
        return m.m.size;
      case 'is_empty':
        return m.m.size === 0;
      case 'clear':
        m.m.clear();
        return UNIT;
      case 'keys':
      case 'into_keys':
        return new Iter(self.mapEntries(m).map((e) => e[0]));
      case 'values':
      case 'into_values':
        return new Iter(self.mapEntries(m).map((e) => e[1]));
      case 'values_mut':
        return new Iter(
          self.mapEntries(m).map((e) =>
            isObjLike(e[1])
              ? e[1]
              : new Ref(
                  () => e[1],
                  (x) => {
                    e[1] = x;
                  }
                )
          )
        );
      case 'iter':
      case 'into_iter':
        return new Iter(self.mapEntries(m).map((e) => new Tup([e[0], e[1]])));
      case 'iter_mut':
        return new Iter(
          self.mapEntries(m).map(
            (e) =>
              new Tup([
                e[0],
                isObjLike(e[1])
                  ? e[1]
                  : new Ref(
                      () => e[1],
                      (x) => {
                        e[1] = x;
                      }
                    ),
              ])
          )
        );
      case 'entry':
        return new Entry(m, args[0]);
      case 'extend': {
        for (const t of self.toArr(args[0])) {
          const p = dv(t).a;
          m.m.set(self.key(p[0]), [dv(p[0]), p[1]]);
        }
        return UNIT;
      }
      case 'retain': {
        for (const [k, e] of [...m.m])
          if (
            dv(
              call(
                args[0],
                e[0],
                isObjLike(e[1])
                  ? e[1]
                  : new Ref(
                      () => e[1],
                      (x) => {
                        e[1] = x;
                      }
                    )
              )
            ) !== true
          )
            m.m.delete(k);
        return UNIT;
      }
      case 'first_key_value': {
        const es = self.mapEntries(m);
        return es.length ? some(new Tup([es[0][0], es[0][1]])) : NONE();
      }
      case 'last_key_value': {
        const es = self.mapEntries(m);
        return es.length ? some(new Tup([es[es.length - 1][0], es[es.length - 1][1]])) : NONE();
      }
    }
    throw new RustError(
      'no method named `' + name + '` found for struct `HashMap` in the current scope',
      line,
      'E0599'
    );
  };
  P.entryMethod = function (en, name, args, node) {
    const self = this,
      line = node.line;
    const call = (f, ...x) => self.callValue(f, x, line);
    const m = en.map,
      k = self.key(en.key);
    const slot = () => {
      const e = m.m.get(k);
      const v = e[1];
      return isObjLike(v) && !(v instanceof Dflt)
        ? v
        : new Ref(
            () => e[1],
            (x) => {
              e[1] = x;
            }
          );
    };
    switch (name) {
      case 'or_insert':
        if (!m.m.has(k)) m.m.set(k, [dv(en.key), args[0]]);
        return slot();
      case 'or_insert_with':
        if (!m.m.has(k)) m.m.set(k, [dv(en.key), call(args[0])]);
        return slot();
      case 'or_default':
        if (!m.m.has(k))
          m.m.set(k, [dv(en.key), self.hintOf() ? self.defaultForType(self.hintOf()) : new Dflt()]);
        return slot();
      case 'and_modify':
        if (m.m.has(k)) call(args[0], slot());
        return en;
      case 'key':
        return en.key;
    }
    throw new RustError('no method named `' + name + '` found for struct `Entry`', line, 'E0599');
  };
  P.setMethod = function (s, name, args, node) {
    const self = this,
      line = node.line;
    const arg = (i) => dv(args[i]);
    switch (name) {
      case 'insert': {
        const k = self.key(args[0]);
        if (s.m.has(k)) return false;
        s.m.set(k, dv(args[0]));
        return true;
      }
      case 'contains':
        return s.m.has(self.key(args[0]));
      case 'remove': {
        const k = self.key(args[0]);
        return s.m.delete(k);
      }
      case 'len':
        return s.m.size;
      case 'is_empty':
        return s.m.size === 0;
      case 'clear':
        s.m.clear();
        return UNIT;
      case 'iter':
      case 'into_iter':
        return new Iter(self.setItems(s));
      case 'extend': {
        for (const x of self.toArr(args[0])) s.m.set(self.key(x), dv(x));
        return UNIT;
      }
      case 'union': {
        const o = arg(0);
        const r = new RSet(s.sorted);
        for (const x of self.setItems(s)) r.m.set(self.key(x), x);
        for (const x of self.setItems(o)) r.m.set(self.key(x), x);
        return new Iter(self.setItems(r));
      }
      case 'intersection': {
        const o = arg(0);
        return new Iter(self.setItems(s).filter((x) => o.m.has(self.key(x))));
      }
      case 'difference': {
        const o = arg(0);
        return new Iter(self.setItems(s).filter((x) => !o.m.has(self.key(x))));
      }
      case 'is_subset': {
        const o = arg(0);
        return self.setItems(s).every((x) => o.m.has(self.key(x)));
      }
    }
    throw new RustError(
      'no method named `' + name + '` found for struct `HashSet` in the current scope',
      line,
      'E0599'
    );
  };

  // dynamic default placeholder (HashMap entry().or_default() without a known type)
  const origBinop = P.binop;
  P.binop = function (op, a, b, line) {
    a = dv(a);
    b = dv(b);
    if (a instanceof Dflt) a = b instanceof Flt ? new Flt(0) : typeof b === 'string' ? '' : 0;
    return origBinop.call(this, op, a, b, line);
  };
  const origDisp = P.disp;
  P.disp = function (v, line) {
    v = dv(v);
    if (v instanceof Dflt) return '0';
    return origDisp.call(this, v, line);
  };

  // ---------------------------------------------------------------- run API
  const where = (e) => (e.line ? '\n  --> main.rs:' + e.line : '');
  function fmtErr(e) {
    if (e instanceof R.Panic)
      return "thread 'main' panicked at main.rs:" + e.line + ':\n' + e.message;
    if (e instanceof R.RustError)
      return 'error' + (e.code ? '[' + e.code + ']' : '') + ': ' + e.message + where(e);
    if (e instanceof R.Ret) return 'error: `return` used outside of a function';
    if (e instanceof R.Ctl) return 'error: `' + e.kind + '` outside of a loop';
    if (e instanceof RangeError) return 'error: stack overflow: the program recursed too deeply';
    return 'internal error in the Rust playground: ' + ((e && e.message) || e);
  }
  function runProgram(src) {
    let runner = null,
      error = null;
    try {
      runner = new Runner(src);
      runner.runMain();
    } catch (e) {
      error = fmtErr(e);
      if (e instanceof R.RustError || e instanceof R.Panic) error = fmtErr(e);
    }
    return { out: runner ? runner.out : '', errOut: runner ? runner.errOut : '', error, runner };
  }
  function makeRustKit(src, Fail) {
    let cached = null;
    const toRust = (x) => {
      if (x && x.__f !== undefined) return new Flt(x.__f);
      if (Array.isArray(x)) return x.map(toRust);
      if (typeof x === 'object' && x && x.__tup) return new Tup(x.__tup.map(toRust));
      if (typeof x === 'string' && x.length === 1 && false) return new Chr(x);
      return x;
    };
    const parse = () => {
      if (!cached) cached = runProgram(src);
      return cached;
    };
    let calls = null;
    const callRunner = () => {
      if (!calls) {
        try {
          calls = new Runner(src);
        } catch (e) {
          throw new Fail(fmtErr(e));
        }
      }
      return calls;
    };
    const t = {
      src,
      fail: (m) => {
        throw new Fail(m);
      },
      expect(c, m) {
        if (!c) throw new Fail(m || 'Expectation failed');
      },
      eq(a, b, m) {
        if (a !== b)
          throw new Fail(
            (m || 'Values differ') +
              ' (expected ' +
              JSON.stringify(b) +
              ', got ' +
              JSON.stringify(a) +
              ')'
          );
      },
      run: parse,
      get out() {
        return parse().out;
      },
      get lines() {
        return parse().out.replace(/\n$/, '').split('\n');
      },
      noErrors() {
        const r = parse();
        if (r.error) throw new Fail(r.error);
      },
      expectError(re, m) {
        const r = parse();
        if (!r.error) throw new Fail(m || 'Expected the program to be rejected, but it ran fine');
        if (!re.test(r.error)) throw new Fail((m || 'Wrong error') + ': ' + r.error.split('\n')[0]);
      },
      f: (x) => ({ __f: x }),
      tup: (...a) => ({ __tup: a }),
      call(name, ...args) {
        const r = callRunner();
        try {
          return r.callByName(name, args.map(toRust));
        } catch (e) {
          throw new Fail(fmtErr(e));
        }
      },
      show(v) {
        const r = callRunner();
        return r.dbg(v);
      },
      disp(v) {
        return callRunner().disp(v, 0);
      },
      source() {
        return src;
      },
      uses(re) {
        return re.test(src.replace(/\/\/[^\n]*/g, ''));
      },
    };
    return t;
  }
  const RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\\n])'|r#*"[\s\S]*?"#*)|\b(as|break|const|continue|crate|else|enum|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|use|where|while|dyn|unsafe)\b|\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Result|Box|HashMap|HashSet|Some|None|Ok|Err)\b|\b(\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?(?:i8|i16|i32|i64|usize|u8|u16|u32|u64|f32|f64)?)\b|\b([a-z_][A-Za-z0-9_]*!)/g;
  function highlightRust(src) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
  G.RustLib = { runProgram, makeRustKit, highlightRust, fmtErr };
})(typeof window !== 'undefined' ? window : globalThis);
