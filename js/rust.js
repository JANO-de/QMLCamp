// =============================================================================
//  RustCore: lexer, parser and evaluator for the Rust playground.
//  Pairs with rust-lib.js (standard library, Runner API, highlighter), which
//  reads window.RustCore from this file.  Integers are plain JS numbers;
//  floats are Flt, chars are Chr, structs Sv, enums Ev, references Ref.
// =============================================================================
(function (G) {
'use strict';

// ------------------------------------------------------------------ values
class Chr { constructor(c) { this.c = c; } }
class Flt { constructor(v) { this.v = v; } }
class Tup { constructor(a) { this.a = a; } }
class Sv { constructor(t, f) { this.t = t; this.f = f; } }
class Ev { constructor(en, v, f, a) { this.en = en; this.v = v; this.f = f || []; this.a = a || null; } }
class Ref { constructor(g, s) { this.g = g; this.s = s; this.mut = false; } get() { return this.g(); } set(x) { this.s(x); } }
class Rng { constructor(a, b, incl) { this.a = a; this.b = b; this.incl = !!incl; } }
class Iter { constructor(a) { this.a = a || []; this.i = 0; } }
class RMap { constructor(sorted) { this.m = new Map(); this.sorted = !!sorted; } }
class RSet { constructor(sorted) { this.m = new Map(); this.sorted = !!sorted; } }
class Fmtr { constructor() { this.buf = ''; } }
class Entry { constructor(map, key) { this.map = map; this.key = key; } }
class Clo { constructor(params, body, env, name) { this.params = params; this.body = body; this.env = env; this.name = name || null; } }
class CellV { constructor(v) { this.v = v; } }
class Fn { constructor(def) { Object.assign(this, def); } }
class Dflt { }
const UNIT = { unit: true };

// ------------------------------------------------------------------ errors
class RustError extends Error { constructor(m, line, code) { super(m); this.name = 'RustError'; this.line = line || 0; this.code = code || null; } }
class Panic extends Error { constructor(m, line) { super(m); this.name = 'Panic'; this.line = line || 0; } }
class Ret { constructor(v) { this.v = v; } }
class Ctl { constructor(kind, label, value) { this.kind = kind; this.label = label === undefined ? null : label; this.value = value; } }

// ------------------------------------------------------------------ helpers
const dv = x => (x instanceof Ref ? x.get() : x);
const isNum = x => typeof x === 'number';
const isObjLike = x => x !== null && typeof x === 'object' && !(x instanceof Chr) && !(x instanceof Flt) && !(x instanceof Ref) && x !== UNIT;
function typeName(v) {
  if (typeof v === 'number') return 'i32';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'String';
  if (v instanceof Chr) return 'char';
  if (v instanceof Flt) return 'f64';
  if (v instanceof Tup) return 'tuple';
  if (Array.isArray(v)) return 'Vec';
  if (v instanceof RMap) return 'HashMap';
  if (v instanceof RSet) return 'HashSet';
  if (v instanceof Sv) return v.t;
  if (v instanceof Ev) return v.en;
  if (v instanceof Rng) return 'Range';
  if (v instanceof Iter) return 'Iter';
  if (v instanceof Clo) return 'closure';
  if (v instanceof CellV) return 'RefCell';
  if (v instanceof Fn) return 'fn';
  if (v === UNIT) return '()';
  if (v instanceof Ref) return '&';
  return typeof v;
}
const ordV = n => new Ev('Ordering', n < 0 ? 'Less' : n > 0 ? 'Greater' : 'Equal', []);
const some = x => new Ev('Option', 'Some', [x]);
const NONE = () => new Ev('Option', 'None', []);
const ok = x => new Ev('Result', 'Ok', [x]);
const errV = x => new Ev('Result', 'Err', [x]);
const mkOpt = x => (x === null || x === undefined ? NONE() : some(x));
const strLen = s => new TextEncoder().encode(s).length;
const INT_RANGE = { i8: [-128, 127], i16: [-32768, 32767], i32: [-2147483648, 2147483647], u8: [0, 255], u16: [0, 65535], u32: [0, 4294967295], i64: [-9223372036854775808, 9223372036854775807], u64: [0, 18446744073709551615], usize: [0, 18446744073709551615], isize: [-9223372036854775808, 9223372036854775807] };
const isIntTy = t => !!(t && INT_RANGE[t]);
const floatStr = x => { if (Number.isNaN(x)) return 'NaN'; if (x === Infinity) return 'inf'; if (x === -Infinity) return '-inf'; return Number.isInteger(x) ? x.toFixed(1) : String(x); };
const escChar = c => { const m = { '\n': '\\n', '\t': '\\t', '\r': '\\r', '\\': '\\\\', "'": "\\'", '"': '\\"', '\0': '\\0' }; return m[c] !== undefined ? m[c] : c; };
const escStr = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\0/g, '\\0');

// ------------------------------------------------------------------ tokenizer
const KEYWORDS = new Set(['as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'use', 'where', 'while', 'dyn', 'unsafe', 'async', 'await', 'box']);
const PUNCTS = ['<<=', '>>=', '..=', '...', '::', '->', '=>', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '..'];
const SINGLE = '(){}[]<>+-*/%=&|^!~.,;:#@?$_';
function tokenize(src) {
  const T = []; let i = 0, line = 1; const n = src.length;
  const bad = m => { throw new RustError(m, line); };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { let d = 1; i += 2; while (i < n && d > 0) { if (src[i] === '\n') line++; else if (src[i] === '/' && src[i + 1] === '*') { d++; i++; } else if (src[i] === '*' && src[i + 1] === '/') { d--; i++; } i++; } continue; }
    if (c === 'r' && (src[i + 1] === '"' || src[i + 1] === '#')) {
      let h = 0, j = i + 1; while (src[j] === '#') { h++; j++; }
      if (src[j] === '"') { j++; const close = '"' + '#'.repeat(h); const end = src.indexOf(close, j); if (end < 0) bad('unterminated raw string'); const s = src.slice(j, end); for (let k = j; k < end; k++) if (src[k] === '\n') line++; T.push({ t: 'str', v: s, line }); i = end + close.length; continue; }
      let k = j; while (k < n && /[A-Za-z0-9_]/.test(src[k])) k++;
      T.push({ t: 'id', v: src.slice(i, k), line }); i = k; continue;
    }
    if (/[A-Za-z_]/.test(c)) { let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++; const w = src.slice(i, j); T.push({ t: KEYWORDS.has(w) ? 'kw' : 'id', v: w, line }); i = j; continue; }
    if (/[0-9]/.test(c)) {
      let j, kind, value;
      if (c === '0' && /[xXbBoO]/.test(src[i + 1] || '')) {
        const radix = src[i + 1].toLowerCase() === 'x' ? 16 : src[i + 1].toLowerCase() === 'b' ? 2 : 8;
        j = i + 2; while (j < n && (radix === 16 ? /[0-9a-fA-F_]/.test(src[j]) : /[0-9_]/.test(src[j]))) j++;
        kind = 'int'; value = parseInt(src.slice(i, j).replace(/_/g, ''), radix);
      } else {
        j = i; while (j < n && /[0-9_]/.test(src[j])) j++;
        let isF = false;
        if (src[j] === '.' && src[j + 1] !== '.' && !/[A-Za-z_]/.test(src[j + 1] || '')) { isF = true; j++; while (j < n && /[0-9_]/.test(src[j])) j++; }
        if (/[eE]/.test(src[j] || '')) { let k = j + 1; if (/[+-]/.test(src[k] || '')) k++; if (/[0-9]/.test(src[k] || '')) { isF = true; j = k; while (j < n && /[0-9_]/.test(src[j])) j++; } }
        const ns = src.slice(i, j).replace(/_/g, '');
        kind = isF ? 'float' : 'int'; value = isF ? parseFloat(ns) : parseInt(ns, 10);
      }
      let k = j; while (k < n && /[A-Za-z0-9]/.test(src[k])) k++;
      T.push({ t: 'num', v: value, kind, suffix: src.slice(j, k), line }); i = k; continue;
    }
    if (c === "'") {
      if (src[i + 1] === '\\') {
        let j = i + 2, val; const e = src[j];
        if (e === 'x') { val = String.fromCharCode(parseInt(src.slice(j + 1, j + 3), 16)); j += 3; }
        else if (e === 'u') { const end = src.indexOf('}', j); val = String.fromCodePoint(parseInt(src.slice(j + 2, end), 16)); j = end + 1; }
        else { const m = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' }; val = m[e] !== undefined ? m[e] : e; j += 1; }
        if (src[j] !== "'") bad('unterminated character literal');
        T.push({ t: 'char', v: val, line }); i = j + 1; continue;
      }
      if (src[i + 2] === "'" && src[i + 1] !== ' ') { T.push({ t: 'char', v: src[i + 1], line }); i += 3; continue; }
      let j = i + 1; if (src[j] === '_') j++; else while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      T.push({ t: 'life', v: src.slice(i + 1, j), line }); i = j; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\') {
          const e = src[j + 1];
          if (e === 'n') s += '\n'; else if (e === 't') s += '\t'; else if (e === 'r') s += '\r'; else if (e === '\\') s += '\\'; else if (e === '"') s += '"'; else if (e === "'") s += "'"; else if (e === '0') s += '\0';
          else if (e === 'x') { s += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16)); j += 2; }
          else if (e === 'u') { const end = src.indexOf('}', j); s += String.fromCodePoint(parseInt(src.slice(j + 3, end), 16)); j = end - 1; }
          else s += e;
          j += 2;
        } else { if (src[j] === '\n') line++; s += src[j]; j++; }
      }
      if (src[j] !== '"') bad('unterminated string literal');
      T.push({ t: 'str', v: s, line }); i = j + 1; continue;
    }
    let matched = null;
    for (const p of PUNCTS) if (src.startsWith(p, i)) { matched = p; break; }
    if (matched) { T.push({ t: 'p', v: matched, line }); i += matched.length; continue; }
    if (SINGLE.includes(c)) { T.push({ t: 'p', v: c, line }); i++; continue; }
    bad('unexpected character `' + c + '`');
  }
  T.push({ t: 'eof', v: '', line });
  return T;
}

// ------------------------------------------------------------------ parser
class Parser {
  constructor(src) { this.T = Array.isArray(src) ? src.slice() : tokenize(src); if (!this.T.length || this.T[this.T.length - 1].t !== 'eof') this.T.push({ t: 'eof', v: '', line: this.T.length ? this.T[this.T.length - 1].line : 1 }); this.i = 0; this.noStruct = false; this.noOr = false; }
  peek(k) { return this.T[this.i + (k || 0)] || this.T[this.T.length - 1]; }
  next() { return this.T[this.i++]; }
  at(v) { const t = this.peek(); return t.t === 'p' && t.v === v; }
  atKw(v) { const t = this.peek(); return t.t === 'kw' && t.v === v; }
  atId(v) { const t = this.peek(); return t.t === 'id' && (v === undefined || t.v === v); }
  eat(v) { if (this.at(v)) { this.i++; return true; } return false; }
  eatKw(v) { if (this.atKw(v)) { this.i++; return true; } return false; }
  expect(v) { if (!this.eat(v)) this.err('expected `' + v + '`'); }
  expectKw(v) { if (!this.eatKw(v)) this.err('expected `' + v + '`'); }
  ident() { const t = this.peek(); if (t.t !== 'id' && t.t !== 'kw') this.err('expected identifier'); this.i++; return t.v; }
  err(m) { const t = this.peek(); throw new RustError(m + ', found ' + (t.t === 'eof' ? 'end of input' : '`' + t.v + '`'), t.line, 'E0000'); }
  skipAttrs() { while (this.at('#')) { this.i++; if (this.eat('!')) { } this.expect('['); let d = 1; while (d > 0 && this.peek().t !== 'eof') { const t = this.next().v; if (t === '[') d++; else if (t === ']') d--; } } }
  expectGt() {
    const t = this.peek();
    if (t.t === 'p' && t.v === '>') { this.i++; return; }
    if (t.t === 'p' && t.v === '>>') { t.v = '>'; return; }
    if (t.t === 'p' && t.v === '>=') { t.v = '='; return; }
    if (t.t === 'p' && t.v === '>>=') { t.v = '>='; return; }
    this.err('expected `>`');
  }
  lt() { return this.at('<') || (this.peek().t === 'p' && (this.peek().v === '<<' || this.peek().v === '<=')); }
  eatLt() { const t = this.peek(); if (t.t === 'p' && t.v === '<') { this.i++; return true; } if (t.t === 'p' && t.v === '<<') { t.v = '<'; return true; } if (t.t === 'p' && t.v === '<=') { t.v = '='; return true; } return false; }

  parseProgram() { const items = []; while (this.peek().t !== 'eof') { this.skipAttrs(); if (this.peek().t === 'eof') break; items.push(this.parseItem()); } return items; }

  parseItem() {
    this.skipAttrs();
    if (this.eatKw('pub')) { if (this.at('(')) { this.expect('('); this.ident(); this.expect(')'); } }
    if (this.atKw('fn')) return this.parseFn(false);
    if (this.atKw('struct')) return this.parseStruct();
    if (this.atKw('enum')) return this.parseEnum();
    if (this.atKw('trait')) return this.parseTrait();
    if (this.atKw('impl')) return this.parseImpl();
    if (this.atKw('const') || this.atKw('static')) return this.parseConst();
    if (this.atKw('type')) return this.parseTypeAlias();
    if (this.atKw('mod')) return this.parseMod();
    if (this.atKw('use')) return this.parseUse();
    if (this.atKw('extern')) { this.i++; if (this.atKw('crate')) { this.i++; this.ident(); this.eat(';'); return { k: 'skip' }; } }
    if (this.peek().t === 'id' && this.peek(1).t === 'p' && this.peek(1).v === '!') { this.parseMacro(); this.eat(';'); return { k: 'skip' }; }
    this.err('expected an item');
  }
  parseGenerics() {
    const g = { params: [] };
    if (this.lt()) {
      this.eatLt();
      while (!this.at('>') && !(this.peek().t === 'p' && /^>/.test(this.peek().v))) {
        if (this.peek().t === 'life') { this.i++; if (this.eat(':')) { while (!this.at(',') && !this.at('>')) this.i++; } }
        else if (this.eatKw('const')) { const n = this.ident(); this.expect(':'); this.parseType(); }
        else { const n = this.ident(); g.params.push(n); if (this.eat(':')) { while (!this.at(',') && !this.at('>') && !(this.peek().t === 'p' && /^>/.test(this.peek().v))) { if (this.at('?') || this.at('(')) { this.i++; continue; } this.i++; } } }
        if (!this.eat(',')) break;
      }
      this.expectGt();
    }
    this.parseWhere();
    return g;
  }
  parseWhere() { if (this.eatKw('where')) { let d = 0; while (this.peek().t !== 'eof') { const t = this.peek(); if (t.t === 'p' && (t.v === '{' || t.v === ';') && d === 0) break; if (t.t === 'p' && (t.v === '<' || t.v === '(' || t.v === '[')) d++; else if (t.t === 'p' && (t.v === '>' || t.v === ')' || t.v === ']')) d--; this.i++; } } }
  parseFn(isMethod) {
    this.expectKw('fn'); const name = this.ident();
    const generics = this.parseGenerics();
    this.expect('(');
    const params = []; let selfKind = null;
    while (!this.at(')')) {
      const selfAhead = (() => { let k = 0; if (this.peek(k).t === 'p' && this.peek(k).v === '&') { k++; if (this.peek(k).t === 'life') k++; if (this.peek(k).t === 'kw' && this.peek(k).v === 'mut') k++; } else if (this.peek(0).t === 'kw' && this.peek(0).v === 'mut') { k++; } return this.peek(k).t === 'kw' && this.peek(k).v === 'self'; })();
      if (selfAhead) {
        let mut = false, byRef = false, rmut = false;
        if (this.eat('&')) { byRef = true; if (this.peek().t === 'life') this.i++; if (this.eatKw('mut')) rmut = true; }
        else if (this.eatKw('mut')) mut = true;
        const s = this.next(); if (s.v !== 'self') this.err('expected self');
        selfKind = { byRef, mut: rmut || mut };
        if (this.eat(':')) this.parseType();
      } else {
        let mut = false; if (this.eatKw('mut')) mut = true;
        const pat = this.parsePat();
        let ty = null; if (this.eat(':')) ty = this.parseType();
        params.push({ pat, ty, mut });
      }
      if (!this.eat(',')) break;
    }
    this.expect(')');
    let ret = null; if (this.eat('->')) ret = this.parseType();
    this.parseWhere();
    if (this.at(';')) { this.i++; return { k: 'fn', name, generics, params, ret, body: null, selfKind, isMethod: !!isMethod }; }
    const body = this.parseBlock();
    return { k: 'fn', name, generics, params, ret, body, selfKind, isMethod: !!isMethod };
  }
  parseStruct() {
    this.expectKw('struct'); const name = this.ident(); const generics = this.parseGenerics();
    if (this.eat(';')) return { k: 'struct', name, generics, fields: [], tuple: false, unit: true };
    if (this.eat('(')) { const fields = []; while (!this.at(')')) { if (this.eatKw('pub')) { } fields.push(this.parseType()); if (!this.eat(',')) break; } this.expect(')'); this.parseWhere(); this.eat(';'); return { k: 'struct', name, generics, fields, tuple: true, unit: false }; }
    this.parseWhere(); this.expect('{'); const fields = [];
    while (!this.at('}')) { this.skipAttrs(); if (this.eatKw('pub')) if (this.at('(')) { this.expect('('); this.ident(); this.expect(')'); } const fn = this.ident(); this.expect(':'); fields.push({ name: fn, ty: this.parseType() }); if (!this.eat(',')) break; }
    this.expect('}'); return { k: 'struct', name, generics, fields, tuple: false, unit: false };
  }
  parseEnum() {
    this.expectKw('enum'); const name = this.ident(); const generics = this.parseGenerics(); this.parseWhere(); this.expect('{');
    const variants = [];
    while (!this.at('}')) {
      this.skipAttrs(); if (this.eatKw('pub')) { } const vn = this.ident();
      if (this.eat('(')) { const fields = []; while (!this.at(')')) { if (this.eatKw('pub')) { } fields.push(this.parseType()); if (!this.eat(',')) break; } this.expect(')'); variants.push({ name: vn, kind: 'tuple', fields }); }
      else if (this.eat('{')) { const fields = []; while (!this.at('}')) { this.skipAttrs(); if (this.eatKw('pub')) { } const fn = this.ident(); this.expect(':'); fields.push({ name: fn, ty: this.parseType() }); if (!this.eat(',')) break; } this.expect('}'); variants.push({ name: vn, kind: 'named', fields }); }
      else variants.push({ name: vn, kind: 'unit', fields: [] });
      if (this.eat('=')) this.parseExpr();
      if (!this.eat(',')) break;
    }
    this.expect('}'); return { k: 'enum', name, generics, variants };
  }
  parseTrait() {
    this.expectKw('trait'); const name = this.ident(); const generics = this.parseGenerics();
    const supertraits = []; if (this.eat(':')) { while (!this.at('{') && !this.atKw('where')) { if (this.peek().t === 'life' || this.peek().t === 'id' || (this.peek().t === 'kw' && this.peek().v === 'Self')) this.i++; if (this.at('+')) this.i++; else break; } }
    this.parseWhere(); this.expect('{'); const items = [];
    while (!this.at('}')) { this.skipAttrs(); if (this.eatKw('pub')) { } if (this.atKw('fn')) items.push(this.parseFn(true)); else if (this.atKw('type')) { this.i++; this.ident(); while (this.peek().t !== ';' && this.peek().t !== 'eof') this.i++; this.eat(';'); } else if (this.atKw('const')) { this.i++; this.ident(); while (this.peek().t !== ';' && this.peek().t !== 'eof') this.i++; this.eat(';'); } else this.err('expected trait item'); }
    this.expect('}'); return { k: 'trait', name, generics, supertraits, items };
  }
  parseImpl() {
    this.expectKw('impl'); const generics = this.parseGenerics();
    let trait = null; const first = this.parseType();
    let selfTy;
    if (this.eatKw('for')) { trait = first; selfTy = this.parseType(); } else selfTy = first;
    this.parseWhere(); this.expect('{'); const items = [];
    while (!this.at('}')) { this.skipAttrs(); if (this.eatKw('pub')) { } if (this.atKw('fn')) items.push(this.parseFn(true)); else if (this.atKw('const')) { this.i++; this.ident(); if (this.eat(':')) this.parseType(); if (this.eat('=')) this.parseExpr(); this.eat(';'); } else if (this.atKw('type')) { this.i++; this.ident(); if (this.eat('=')) this.parseType(); this.eat(';'); } else this.err('expected impl item'); }
    this.expect('}'); return { k: 'impl', generics, trait, selfTy, items };
  }
  parseConst() { const isStatic = this.eatKw('static'); if (!isStatic) this.expectKw('const'); let mut = false; if (isStatic && this.eatKw('mut')) mut = true; const name = this.ident(); this.expect(':'); const ty = this.parseType(); this.expect('='); const value = this.parseExpr(); this.expect(';'); return { k: 'const', name, ty, value, mut }; }
  parseTypeAlias() { this.expectKw('type'); const name = this.ident(); this.parseGenerics(); this.expect('='); const ty = this.parseType(); this.eat(';'); return { k: 'type', name, ty }; }
  parseMod() { this.expectKw('mod'); this.ident(); if (this.eat(';')) return { k: 'skip' }; this.expect('{'); const items = []; while (!this.at('}')) { this.skipAttrs(); if (this.at('}')) break; items.push(this.parseItem()); } this.expect('}'); return { k: 'mod', items }; }
  parseUse() { this.expectKw('use'); let d = 0; while (this.peek().t !== 'eof') { const t = this.peek(); if (t.t === 'p' && t.v === ';' && d === 0) break; if (t.t === 'p' && (t.v === '{' || t.v === '(' || t.v === '[')) d++; else if (t.t === 'p' && (t.v === '}' || t.v === ')' || t.v === ']')) d--; this.i++; } this.expect(';'); return { k: 'skip' }; }

  parseBlock() {
    this.expect('{'); const stmts = []; let tail = null;
    while (!this.at('}')) {
      if (this.eat(';')) continue;
      this.skipAttrs();
      if (this.atKw('let')) { stmts.push(this.parseLet()); continue; }
      if (this.isItemStart()) { stmts.push({ k: 'item', item: this.parseItem() }); continue; }
      const e = this.parseExpr();
      if (this.eat(';')) { stmts.push({ k: 'expr', e, semi: true }); continue; }
      if (this.at('}')) { tail = e; break; }
      if (this.endsBlockExpr(e)) { stmts.push({ k: 'expr', e, semi: false }); continue; }
      this.err('expected `;`');
    }
    this.expect('}'); return { k: 'block', stmts, tail };
  }
  isItemStart() { const t = this.peek(); if (t.t !== 'kw') return false; return ['fn', 'struct', 'enum', 'trait', 'impl', 'const', 'static', 'type', 'use', 'mod'].includes(t.v) && !(t.v === 'self'); }
  endsBlockExpr(e) { return e && (e.k === 'if' || e.k === 'iflet' || e.k === 'match' || e.k === 'loop' || e.k === 'while' || e.k === 'whilelet' || e.k === 'for' || e.k === 'block' || e.k === 'unsafe'); }
  parseLet() {
    this.expectKw('let'); let mut = false; if (this.eatKw('mut')) mut = true;
    const pat = this.parsePat(); let ty = null; if (this.eat(':')) ty = this.parseType();
    let value = null; if (this.eat('=')) value = this.parseExpr();
    let els = null; if (this.eatKw('else')) els = this.parseBlock();
    this.expect(';'); return { k: 'let', pat, ty, value, mut, els };
  }
  parseExpr() { return this.parseAssign(); }
  parseAssign() {
    const left = this.parseRange();
    const t = this.peek();
    if (t.t === 'p' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(t.v)) {
      this.i++; const value = this.parseAssign(); return { k: 'assign', op: t.v, target: left, value };
    }
    return left;
  }
  parseRange() {
    if (this.at('..') || this.at('..=')) { const op = this.next().v; const b = (this.at(',') || this.at(')') || this.at(']') || this.at('}') || this.at(';')) ? null : this.parseOr(); return { k: 'range', a: null, b, incl: op === '..=' }; }
    let a = this.parseOr();
    if (this.at('..') || this.at('..=')) { const op = this.next().v; const b = (this.at(',') || this.at(')') || this.at(']') || this.at('}') || this.at(';')) ? null : this.parseOr(); return { k: 'range', a, b, incl: op === '..=' }; }
    return a;
  }
  binL(ops, next) { let l = next.call(this); for (;;) { const t = this.peek(); if (t.t === 'p' && ops.includes(t.v)) { this.i++; const r = next.call(this); l = { k: 'bin', op: t.v, l, r }; } else if (t.t === 'kw' && t.v === 'as') { this.i++; const ty = this.parseType(); l = { k: 'cast', e: l, ty }; } else break; } return l; }
  parseOr() { return this.binL(['||'], this.parseAnd); }
  parseAnd() { return this.binL(['&&'], this.parseCmp); }
  parseCmp() { return this.binL(['==', '!=', '<', '>', '<=', '>='], this.parseBitOr); }
  parseBitOr() { return this.binL(['|'], this.parseBitXor); }
  parseBitXor() { return this.binL(['^'], this.parseBitAnd); }
  parseBitAnd() { return this.binL(['&'], this.parseShift); }
  parseShift() { return this.binL(['<<', '>>'], this.parseAdd); }
  parseAdd() { return this.binL(['+', '-'], this.parseMul); }
  parseMul() { return this.binL(['*', '/', '%'], this.parseUnary); }
  parseUnary() {
    if (this.at('-') || this.at('!') || this.at('*')) { const op = this.next().v; return { k: 'un', op, e: this.parseUnary() }; }
    if (this.at('&')) {
      this.i++; let mut = false; if (this.peek().t === 'life') this.i++; if (this.eatKw('mut')) mut = true;
      return { k: 'ref', mut, e: this.parseUnary() };
    }
    if (this.atKw('move')) { this.i++; return this.parseClosure(true); }
    if (this.at('|') || this.at('||')) return this.parseClosure(false);
    return this.parsePostfix();
  }
  parseClosure(move) {
    const savedNoOr = this.noOr; this.noOr = true;
    const params = [];
    if (this.at('||')) { this.i++; }
    else { this.expect('|'); while (!this.at('|')) { let mut = false; if (this.eatKw('mut')) mut = true; const pat = this.parsePatNoOr(); let ty = null; if (this.eat(':')) ty = this.parseType(); params.push({ pat, ty, mut }); if (!this.eat(',')) break; } this.expect('|'); }
    this.noOr = savedNoOr;
    let ret = null; if (this.eat('->')) ret = this.parseType();
    let body;
    if (this.at('{')) body = this.parseBlock(); else body = this.parseExpr();
    return { k: 'closure', params, body, ret, move };
  }
  parsePostfix() {
    let e = this.parseAtom();
    for (;;) {
      if (this.at('.')) {
        this.i++;
        if (this.peek().t === 'num') { const idx = this.next().v; e = { k: 'field', obj: e, name: null, index: idx }; continue; }
        let name = this.ident(); let turbo = null;
        if (this.at('::')) { this.i += 1; if (this.lt()) turbo = this.parseGenericArgs(); }
        if (this.at('(')) { const args = this.parseArgs(); e = { k: 'method', recv: e, name, args, turbo }; }
        else e = { k: 'field', obj: e, name, index: null };
        continue;
      }
      if (this.at('(')) { const args = this.parseArgs(); e = { k: 'call', callee: e, args, turbo: null }; continue; }
      if (this.at('[')) { this.i++; const idx = this.parseExpr(); this.expect(']'); e = { k: 'index', obj: e, index: idx }; continue; }
      if (this.at('?')) { this.i++; e = { k: 'try', e }; continue; }
      break;
    }
    return e;
  }
  parseArgs() { this.expect('('); const args = []; while (!this.at(')')) { args.push(this.parseExpr()); if (!this.eat(',')) break; } this.expect(')'); return args; }
  parseGenericArgs() {
    this.eatLt(); const parts = [];
    while (!this.at('>') && !(this.peek().t === 'p' && /^>/.test(this.peek().v))) { parts.push(this.parseType()); if (!this.eat(',')) break; }
    this.expectGt(); return parts.join(', ');
  }
  parseAtom() {
    const t = this.peek();
    if (t.t === 'num') { this.i++; return { k: 'lit', kind: t.kind, v: t.v, suffix: t.suffix || '' }; }
    if (t.t === 'str') { this.i++; return { k: 'lit', kind: 'str', v: t.v }; }
    if (t.t === 'char') { this.i++; return { k: 'lit', kind: 'char', v: t.v }; }
    if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) { this.i++; return { k: 'lit', kind: 'bool', v: t.v === 'true' }; }
    if (this.at('(')) { this.i++; if (this.at(')')) { this.i++; return { k: 'tuple', items: [] }; } const first = this.parseExpr(); if (this.at(',')) { const items = [first]; while (this.eat(',')) { if (this.at(')')) break; items.push(this.parseExpr()); } this.expect(')'); return { k: 'tuple', items }; } this.expect(')'); return first; }
    if (this.at('[')) { this.i++; const items = []; if (!this.at(']')) { items.push(this.parseExpr()); if (this.eat(';')) { const count = this.parseExpr(); this.expect(']'); return { k: 'repeat', value: items[0], count }; } while (this.eat(',')) { if (this.at(']')) break; items.push(this.parseExpr()); } } this.expect(']'); return { k: 'array', items }; }
    if (this.at('{')) return this.parseBlock();
    if (this.atKw('if')) return this.parseIf();
    if (this.atKw('match')) return this.parseMatch();
    if (this.atKw('loop')) { this.i++; const body = this.parseBlock(); return { k: 'loop', body, label: null }; }
    if (this.atKw('while')) { this.i++; if (this.eatKw('let')) { const pat = this.parsePat(); this.expect('='); const s0 = this.noStruct; this.noStruct = true; const value = this.parseExpr(); this.noStruct = s0; const body = this.parseBlock(); return { k: 'whilelet', pat, value, body, label: null }; } const s = this.noStruct; this.noStruct = true; const cond = this.parseExpr(); this.noStruct = s; const body = this.parseBlock(); return { k: 'while', cond, body, label: null }; }
    if (this.atKw('for')) { this.i++; const pat = this.parsePat(); this.expectKw('in'); const s = this.noStruct; this.noStruct = true; const iter = this.parseExpr(); this.noStruct = s; const body = this.parseBlock(); return { k: 'for', pat, iter, body, label: null }; }
    if (this.atKw('return')) { this.i++; const v = this.exprEnds() ? null : this.parseExpr(); return { k: 'return', value: v }; }
    if (this.atKw('break')) { this.i++; const label = this.peek().t === 'life' ? this.next().v : null; const v = this.exprEnds() ? null : this.parseExpr(); return { k: 'break', value: v, label }; }
    if (this.atKw('continue')) { this.i++; const label = this.peek().t === 'life' ? this.next().v : null; return { k: 'continue', label }; }
    if (this.atKw('unsafe')) { this.i++; const body = this.parseBlock(); return { k: 'block', stmts: body.stmts, tail: body.tail, unsafe: true }; }
    if (this.atKw('move')) { this.i++; return this.parseClosure(true); }
    if (this.at('|') || this.at('||')) return this.parseClosure(false);
    if (this.at('::')) { this.i += 1; return this.parsePath(true); }
    if (t.t === 'id' || (t.t === 'kw' && (t.v === 'self' || t.v === 'Self' || t.v === 'crate' || t.v === 'super')) || (t.t === 'life' && this.isLabeled())) {
      if (t.t === 'id' && this.peek(1).t === 'p' && this.peek(1).v === '!') { return this.parseMacro(); }
      return this.parsePath(false);
    }
    this.err('expected an expression');
  }
  isLabeled() { return false; }
  exprEnds() { const t = this.peek(); return t.t === 'p' && [')', ']', '}', ',', ';'].includes(t.v); }
  parsePath(leading) {
    const segs = [];
    const readSeg = () => { const n = this.ident(); let args = null; if (this.at('::') && this.peek(1).t === 'p' && /^</.test(this.peek(1).v)) { this.i += 1; if (this.lt()) args = this.parseGenericArgs(); } segs.push({ name: n, args }); };
    readSeg();
    while (this.at('::')) {
      const save = this.i; this.i += 1;
      if (this.at('<')) { const args = this.parseGenericArgs(); segs[segs.length - 1].args = args; continue; }
      if (this.at('{')) { this.i -= 1; break; }
      if (this.at('(')) { this.i -= 1; break; }
      readSeg();
    }
    if (this.at('{') && !this.noStruct) { this.expect('{'); const fields = []; let rest = null; while (!this.at('}')) { if (this.at('..')) { this.i++; rest = this.parseExpr(); break; } const fn = this.ident(); if (this.at(':')) { this.i++; fields.push({ name: fn, value: this.parseExpr() }); } else fields.push({ name: fn, value: { k: 'path', segs: [{ name: fn, args: null }], leading: false }, shorthand: true }); if (!this.eat(',')) break; } this.expect('}'); return { k: 'structlit', path: segs, fields, rest }; }
    if (this.at('(')) { const args = this.parseArgs(); return { k: 'call', callee: { k: 'path', segs, leading: !!leading }, args, turbo: null }; }
    return { k: 'path', segs, leading: !!leading };
  }
  parseIf() {
    this.expectKw('if'); const s = this.noStruct; this.noStruct = true;
    if (this.eatKw('let')) {
      const pat = this.parsePat(); this.expect('='); const value = this.parseExpr(); this.noStruct = s; const then = this.parseBlock();
      let els = null; if (this.eatKw('else')) { els = this.atKw('if') ? this.parseIf() : this.parseBlock(); }
      return { k: 'iflet', pat, value, then, els };
    }
    const cond = this.parseExpr(); this.noStruct = s; const then = this.parseBlock();
    let els = null; if (this.eatKw('else')) { els = this.atKw('if') ? this.parseIf() : this.parseBlock(); }
    return { k: 'if', cond, then, els };
  }
  parseMatch() {
    this.expectKw('match'); const s = this.noStruct; this.noStruct = true; const scrut = this.parseExpr(); this.noStruct = s; this.expect('{'); const arms = [];
    while (!this.at('}')) { this.skipAttrs(); const pat = this.parsePat(); let guard = null; if (this.eatKw('if')) guard = this.parseExpr(); this.expect('=>'); const body = this.at('{') ? this.parseBlock() : this.parseExpr(); arms.push({ pat, guard, body }); if (!this.eat(',')) { if (this.at('}')) break; } }
    this.expect('}'); return { k: 'match', scrut, arms };
  }

  parseType() {
    if (this.eat('&')) { let s = '&'; if (this.peek().t === 'life') this.i++; if (this.eatKw('mut')) s += 'mut '; return s + this.parseType(); }
    const t = this.peek();
    if (t.t === 'kw' && t.v === 'fn') { this.i++; this.expect('('); const ps = []; while (!this.at(')')) { ps.push(this.parseType()); if (!this.eat(',')) break; } this.expect(')'); let r = ''; if (this.eat('->')) r = ' -> ' + this.parseType(); return 'fn(' + ps.join(', ') + ')' + r; }
    if (this.eat('(')) { const items = []; if (!this.at(')')) { items.push(this.parseType()); while (this.eat(',')) { if (this.at(')')) break; items.push(this.parseType()); } } this.expect(')'); return items.length === 0 ? '()' : '(' + items.join(', ') + (items.length === 1 ? ',' : '') + ')'; }
    if (this.eat('[')) { const el = this.parseType(); if (this.eat(';')) { const n = this.parseExpr(); this.expect(']'); return '[' + el + '; ' + (n.k === 'lit' ? n.v : '_') + ']'; } this.expect(']'); return '[' + el + ']'; }
    if (this.atKw('impl') || this.atKw('dyn')) { this.i++; let s = 'impl '; s += this.ident(); if (this.lt()) s += '<' + this.parseGenericArgs() + '>'; while (this.eat('+')) { s += ' + ' + this.ident(); if (this.lt()) s += '<' + this.parseGenericArgs() + '>'; } return s; }
    if (this.at('_')) { this.i++; return '_'; }
    if (this.at('!')) { this.i++; return '!'; }
    if (this.at('*')) { this.i++; let s = '*'; if (this.eatKw('const')) s += 'const '; if (this.eatKw('mut')) s += 'mut '; return s + this.parseType(); }
    let s = '';
    if (this.at('::')) { this.i += 1; s = '::'; }
    s += this.ident();
    for (;;) {
      if (this.lt()) s += '<' + this.parseGenericArgs() + '>';
      if (this.at('::')) { this.i += 1; s += '::' + this.ident(); continue; }
      break;
    }
    return s;
  }
  parsePat() { const first = this.parsePatNoOr(); if (this.at('|') && !this.noOr) { const items = [first]; while (this.eat('|')) items.push(this.parsePatNoOr()); return { p: 'or', items }; } return first; }
  parsePatNoOr() {
    if (this.eat('_')) return { p: 'wild' };
    if (this.at('&')) { this.i++; const mut = this.eatKw('mut'); return { p: 'ref', mut, sub: this.parsePatNoOr() }; }
    if (this.atKw('ref')) { this.i++; const mut = this.eatKw('mut'); return { p: 'bind', name: this.ident(), mut, byRef: true }; }
    if (this.atKw('mut')) { this.i++; const name = this.ident(); let sub = null; if (this.eat('@')) sub = this.parsePatNoOr(); return { p: 'bind', name, mut: true, sub }; }
    const t = this.peek();
    if (t.t === 'num' || t.t === 'str' || t.t === 'char' || (t.t === 'kw' && (t.v === 'true' || t.v === 'false'))) return { p: 'lit', lit: this.parseAtom() };
    if (this.at('-')) return { p: 'lit', lit: this.parseUnary() };
    if (this.at('(')) { this.i++; const items = []; let rest = false; while (!this.at(')')) { if (this.at('..')) { this.i++; rest = true; if (!this.eat(',')) break; continue; } items.push(this.parsePat()); if (!this.eat(',')) break; } this.expect(')'); return { p: 'tuple', items, rest }; }
    if (this.at('[')) { this.i++; const items = []; let rest = false; while (!this.at(']')) { if (this.at('..')) { this.i++; rest = true; if (!this.eat(',')) break; continue; } items.push(this.parsePat()); if (!this.eat(',')) break; } this.expect(']'); return { p: 'slice', items, rest }; }
    const segs = [this.ident()]; let hadCC = false;
    while (this.at('::')) { this.i += 1; if (this.at('{') || this.at('(') || this.at('<')) break; segs.push(this.ident()); hadCC = true; }
    if (this.at('{')) { this.expect('{'); const fields = []; let rest = false; while (!this.at('}')) { if (this.at('..')) { this.i++; rest = true; if (!this.eat(',')) break; continue; } const fn = this.ident(); let sub; if (this.eat(':')) sub = this.parsePat(); else sub = { p: 'bind', name: fn, mut: false }; fields.push({ name: fn, pat: sub }); if (!this.eat(',')) break; } this.expect('}'); return { p: 'struct', segs, fields, rest }; }
    if (this.at('(')) { this.i++; const items = []; let rest = false; while (!this.at(')')) { if (this.at('..')) { this.i++; rest = true; if (!this.eat(',')) break; continue; } items.push(this.parsePat()); if (!this.eat(',')) break; } this.expect(')'); return { p: 'tstruct', segs, items, rest }; }
    if (this.at('..') || this.at('..=')) { const op = this.next().v; const b = this.parsePatNoOr(); return { p: 'range', a: { p: 'path', segs }, b, incl: op === '..=' }; }
    if (segs.length === 1 && !hadCC && /^[a-z_]/.test(segs[0])) return { p: 'bind', name: segs[0], mut: false };
    return { p: 'path', segs };
  }
  parseMacro() {
    const name = this.ident(); this.expect('!'); const open = this.peek();
    let close; if (open.v === '(') close = ')'; else if (open.v === '[') close = ']'; else if (open.v === '{') close = '}'; else this.err('expected macro delimiter');
    this.i++; const toks = []; let d = 0;
    while (this.peek().t !== 'eof') { const t = this.peek(); if (t.t === 'p' && d === 0 && t.v === close) break; if (t.t === 'p' && ['(', '[', '{'].includes(t.v)) d++; if (t.t === 'p' && [')', ']', '}'].includes(t.v)) d--; toks.push(this.next()); }
    this.expect(close); return { k: 'macro', name, toks, line: open.line };
  }
}

// ------------------------------------------------------------------ environment
class Env {
  constructor(parent) { this.vars = new Map(); this.parent = parent || null; }
  declare(name, rec) { this.vars.set(name, rec); }
  lookup(name) { let e = this; while (e) { if (e.vars.has(name)) return e.vars.get(name); e = e.parent; } return null; }
}

// ------------------------------------------------------------------ runner + evaluator
const baseType = t => { t = String(t || ''); t = t.replace(/^&\s*(mut\s+)?/, '').replace(/^dyn\s+/, '').replace(/^impl\s+/, ''); const i = t.indexOf('<'); return (i < 0 ? t : t.slice(0, i)).trim(); };
const head = t => { t = (t || '').replace(/^<|>$/g, '').trim(); const m = t.match(/^&?\s*(?:mut\s+)?([A-Za-z_0-9]+)/); return m ? m[1] : ''; };

class Runner {
  constructor(src) {
    this.src = src; this.out = ''; this.errOut = '';
    this.fns = new Map(); this.types = new Map(); this.impls = new Map(); this.traits = new Map(); this.consts = new Map();
    this.global = new Env(null);
    this.hint = ''; this.curTurbo = ''; this.retStack = [];
    this.borrows = new Map(); this.usedRefs = new WeakSet();
    const p = new Parser(src); this.items = p.parseProgram(); this._collect(this.items);
  }
  _collect(items) {
    for (const it of items) {
      if (!it) continue;
      if (it.k === 'mod') this._collect(it.items);
      else if (it.k === 'fn') this.fns.set(it.name, it);
      else if (it.k === 'struct') this.types.set(it.name, { kind: 'struct', def: it });
      else if (it.k === 'enum') this.types.set(it.name, { kind: 'enum', def: it });
      else if (it.k === 'trait') this.traits.set(it.name, it);
      else if (it.k === 'const') { if (!this.consts.has(it.name)) this.consts.set(it.name, { def: it, value: undefined }); }
      else if (it.k === 'impl') this._regImpl(it);
    }
  }
  _regImpl(it) {
    const tn = baseType(it.selfTy);
    if (!this.impls.has(tn)) this.impls.set(tn, new Map());
    const m = this.impls.get(tn);
    for (const x of it.items) if (x.k === 'fn') m.set(x.name, x);
    if (it.trait) { const tr = this.traits.get(baseType(it.trait)); if (tr) for (const x of tr.items) if (x.k === 'fn' && x.body && !m.has(x.name)) m.set(x.name, x); }
  }
  findMethod(tn, name) { const m = this.impls.get(tn); return m && m.has(name) ? m.get(name) : null; }
  runMain() { this.borrows = new Map(); this.usedRefs = new WeakSet(); const m = this.fns.get('main'); if (m) this._callFn(m, [], null, 0); }
  callByName(name, args) { const f = this.fns.get(name); if (!f) throw new RustError('cannot find function `' + name + '` in this scope', 0, 'E0425'); return this._callFn(f, args, null, 0); }

  // ---------------------------------------------------------------- expressions
  ev(e, env) {
    switch (e.k) {
      case 'lit': return this._lit(e);
      case 'tuple': return e.items.length ? new Tup(e.items.map(x => dv(this.ev(x, env)))) : UNIT;
      case 'array': return e.items.map(x => dv(this.ev(x, env)));
      case 'repeat': { const v = dv(this.ev(e.value, env)); const n = dv(this.ev(e.count, env)); const a = []; for (let i = 0; i < n; i++) a.push(this.clone(v)); return a; }
      case 'path': return this.evalPath(e, env);
      case 'bin': {
        if (e.op === '&&') { if (dv(this.ev(e.l, env)) !== true) return false; return dv(this.ev(e.r, env)) === true; }
        if (e.op === '||') { if (dv(this.ev(e.l, env)) === true) return true; return dv(this.ev(e.r, env)) === true; }
        const saveB = this.hint;
        if (!isIntTy(head(this.hintOf())) && e.l && e.l.k === 'path' && e.l.segs.length === 1) { const rec = env.lookup(e.l.segs[0].name); if (rec && rec.ty && isIntTy(head(rec.ty))) this.hint = rec.ty; }
        const r = this.binop(e.op, this.ev(e.l, env), this.ev(e.r, env), 0);
        this.hint = saveB; return r;
      }
      case 'assign': return this.evalAssign(e, env);
      case 'un':
        if (e.op === '*') return dv(this.ev(e.e, env));
        if (e.op === '-') { const v = dv(this.ev(e.e, env)); return v instanceof Flt ? new Flt(-v.v) : -v; }
        if (e.op === '!') return dv(this.ev(e.e, env)) !== true;
        break;
      case 'ref': { if (e.e.k === 'index' && e.e.obj) { const oo = dv(this.ev(e.e.obj, env)); const ii = dv(this.ev(e.e.index, env)); if (oo instanceof Rng) { } if (Array.isArray(oo) && ii instanceof Rng) return this._sliceRange(oo, ii); } const pl = this.place(e.e, env, true); pl.mut = !!e.mut; const rn = this._rootName(e.e); if (rn) { pl.__root = rn; this._addBorrow(pl, env); } return pl; }
      case 'field': return this.evalField(e, env);
      case 'index': return this.evalIndex(e, env);
      case 'method': return this.evalMethod(e, env);
      case 'call': return this.evalCall(e, env);
      case 'structlit': return this.evalStruct(e, env);
      case 'block': return this.evalBlock(e, env);
      case 'if': { const c = this.ev(e.cond, env); if (dv(c) === true) return this.ev(e.then, env); return e.els ? this.ev(e.els, env) : UNIT; }
      case 'iflet': { const v = this.ev(e.value, env); const be = new Env(env); if (this.matchPat(e.pat, v, be)) return this.ev(e.then, be); return e.els ? this.ev(e.els, env) : UNIT; }
      case 'whilelet': { for (;;) { const v = this.ev(e.value, env); const be = new Env(env); if (!this.matchPat(e.pat, v, be)) break; try { this.ev(e.body, be); } catch (c) { if (c instanceof Ctl) { if (c.kind === 'break') return c.value === undefined ? UNIT : c.value; if (c.kind === 'continue') continue; } throw c; } } return UNIT; }
      case 'match': return this.evalMatch(e, env);
      case 'loop': for (;;) { try { this.ev(e.body, env); } catch (c) { if (c instanceof Ctl) { if (c.kind === 'break') return c.value === undefined ? UNIT : c.value; if (c.kind === 'continue') continue; } throw c; } }
      case 'while': while (dv(this.ev(e.cond, env)) === true) { try { this.ev(e.body, env); } catch (c) { if (c instanceof Ctl) { if (c.kind === 'break') return c.value === undefined ? UNIT : c.value; if (c.kind === 'continue') continue; } throw c; } } return UNIT;
      case 'for': { const arr = this.toArr(dv(this.ev(e.iter, env)), 0); for (const item of arr) { const be = new Env(env); this.bindPat(e.pat, item, be, false); try { this.ev(e.body, be); } catch (c) { if (c instanceof Ctl) { if (c.kind === 'break') return c.value === undefined ? UNIT : c.value; if (c.kind === 'continue') continue; } throw c; } } return UNIT; }
      case 'return': throw new Ret(e.value ? this.ev(e.value, env) : UNIT);
      case 'break': throw new Ctl('break', e.label, e.value ? this.ev(e.value, env) : undefined);
      case 'continue': throw new Ctl('continue', e.label);
      case 'try': { const v = dv(this.ev(e.e, env)); if (v instanceof Ev && v.en === 'Result') { if (v.v === 'Err') throw new Ret(v); return v.f[0]; } if (v instanceof Ev && v.en === 'Option') { if (v.v === 'None') throw new Ret(NONE()); return v.f[0]; } throw new RustError('the `?` operator can only be used on `Option` or `Result`', 0, 'E0277'); }
      case 'cast': return this.evalCast(dv(this.ev(e.e, env)), e.ty);
      case 'closure': return new Clo(e.params, e.body, env);
      case 'range': { const a = e.a === null ? 0 : dv(this.ev(e.a, env)); const b = e.b === null ? Infinity : dv(this.ev(e.b, env)); return new Rng(a, b, e.incl); }
      case 'macro': return this.evalMacro(e, env);
    }
    throw new RustError('cannot evaluate expression `' + e.k + '`', 0, 'E0000');
  }
  _lit(e) {
    if (e.kind === 'int') { const ty = isIntTy(e.suffix) ? e.suffix : (isIntTy(head(this.hintOf())) ? head(this.hintOf()) : 'i32'); const r = INT_RANGE[ty]; if (r && (e.v < r[0] || e.v > r[1])) throw new RustError('literal out of range for `' + ty + '`', 0, 'E0080'); return e.v; }
    if (e.kind === 'float') return new Flt(e.v);
    if (e.kind === 'str') return e.v;
    if (e.kind === 'char') return new Chr(e.v);
    return e.v;
  }
  evalPath(e, env) {
    const segs = e.segs;
    if (segs.length === 1) {
      const n = segs[0].name;
      const rec = env.lookup(n);
      if (rec) { if (rec.moved) throw new RustError('use of moved value: `' + n + '`', 0, 'E0382'); if (rec.value instanceof Ref) this.usedRefs.add(rec.value); return dv(rec.value); }
      const c = this.consts.get(n);
      if (c) { if (c.value === undefined) c.value = this.ev(c.def.value, this.global); return c.value; }
      const f = this.fns.get(n); if (f) return new Fn(this._fnDef(f));
      const td = this.types.get(n);
      if (td && td.kind === 'struct' && td.def.unit) return new Sv(n, {});
      if (n === 'None') return NONE();
      throw new RustError('cannot find value `' + n + '` in this scope', 0, 'E0425');
    }
    const names = segs.map(s => s.name);
    const ty2 = names[names.length - 2], last = names[names.length - 1];
    const td = this.types.get(ty2);
    if (td && td.kind === 'enum') { const v = td.def.variants.find(x => x.name === last); if (v && v.kind === 'unit') return new Ev(ty2, last, []); }
    if (ty2 === 'Option' && last === 'None') return NONE();
    const bp = this.builtinPath(names, { line: 0 });
    if (bp !== undefined) return typeof bp === 'function' ? new Fn({ name: last, builtin: bp }) : bp;
    const m = this.findMethod(ty2, last);
    if (m) return new Fn(this._fnDef(m));
    throw new RustError('cannot find value `' + names.join('::') + '` in this scope', 0, 'E0425');
  }
  evalField(e, env) {
    const o = dv(this.ev(e.obj, env));
    const k = e.index !== null ? e.index : e.name;
    if (o instanceof Sv) { if (e.index !== null) return dv(o.f[k]); return dv(o.f instanceof Array ? o.f[k] : o.f[k]); }
    if (o instanceof Ev) return dv(o.f[k]);
    if (o instanceof Tup) return dv(o.a[k]);
    if (e.index !== null) throw new RustError('no field `' + k + '` on type `' + typeName(o) + '`', 0, 'E0609');
    if (o instanceof Rng) { if (e.name === 'start') return o.a; if (e.name === 'end') return o.b; }
    throw new RustError('no field `' + k + '` on type `' + typeName(o) + '`', 0, 'E0609');
  }
  evalIndex(e, env) {
    const o = dv(this.ev(e.obj, env));
    const i = dv(this.ev(e.index, env));
    if (Array.isArray(o)) { if (i instanceof Rng) return this._sliceRange(o, i); if (i < 0 || i >= o.length) throw new Panic('index out of bounds: the len is ' + o.length + ' but the index is ' + i, 0); return dv(o[i]); }
    if (typeof o === 'string') { if (i instanceof Rng) { const a = [...o]; const [s, en] = this._rangeBounds(i, a.length); return a.slice(s, en).join(''); } throw new RustError('the type `str` cannot be indexed by `{integer}`', 0, 'E0277'); }
    if (o instanceof RMap) { const k = this.key(i); if (!o.m.has(k)) throw new Panic('called `Option::unwrap()` on a `None` value', 0); return dv(o.m.get(k)[1]); }
    throw new RustError('the type `' + typeName(o) + '` cannot be indexed', 0, 'E0608');
  }
  _rangeBounds(r, len) { const s = Math.max(0, r.a); const e = r.b === Infinity ? len : (r.incl ? r.b + 1 : r.b); if (s > e || e > len) throw new Panic('range end index ' + e + ' out of range for slice of length ' + len, 0); return [s, e]; }
  _sliceRange(a, r) { const [s, e] = this._rangeBounds(r, a.length); return a.slice(s, e); }
  evalAssign(e, env) {
    if (e.op === '=') { const v = this.evForMove(e.value, env); this._chkAssign(e.target, env, 0); this.place(e.target, env, true).set(v); return UNIT; }
    const pl = this.place(e.target, env, true); const cur = dv(pl.get()); const rhs = dv(this.ev(e.value, env));
    pl.set(this.binop(e.op.slice(0, -1), cur, rhs, 0)); return UNIT;
  }
  evForMove(expr, env) {
    const v = this.ev(expr, env);
    if (expr.k === 'path' && expr.segs.length === 1) {
      const n = expr.segs[0].name; const rec = env.lookup(n);
      if (rec && !this.isCopy(v)) rec.moved = true;
    }
    if (expr.k === 'macro' && expr.name === 'drop') return UNIT;
    return v;
  }
  isCopy(v) { v = dv(v); if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || v instanceof Chr || v instanceof Flt || v === UNIT) return true; if (v instanceof Tup) return v.a.every(x => this.isCopy(x)); return false; }
  evalCast(v, ty) { ty = ty.trim(); const base = head(ty); if (base === 'f64' || base === 'f32') return new Flt(v instanceof Flt ? v.v : Number(v)); if (base === 'char') { if (typeof v === 'number') return new Chr(String.fromCodePoint(v)); return v; } if (isIntTy(base)) { let n = v instanceof Flt ? Math.trunc(v.v) : (v instanceof Chr ? v.c.codePointAt(0) : (typeof v === 'boolean' ? (v ? 1 : 0) : v)); return this._wrapInt(n, base); } if (base === 'usize' || base === 'isize') return v; return v; }
  _wrapInt(n, ty) { const r = INT_RANGE[ty]; if (!r) return n; const bits = Math.log2(r[1] + 1) | 0; const mod = Math.pow(2, bits); n = Math.trunc(n); n = ((n % mod) + mod) % mod; if (r[0] < 0 && n > r[1]) n -= mod; return n; }
  evalBlock(blk, env) {
    const e = new Env(env); let val = UNIT;
    for (const s of blk.stmts) {
      if (s.k === 'let') this.execLet(s, e);
      else if (s.k === 'item') this._execItemLocal(s.item, e);
      else if (s.k === 'expr') { const v = this.ev(s.e, e); if (!s.semi) val = v; }
      this._releaseUsed();
    }
    if (blk.tail) val = this.ev(blk.tail, e);
    this._releaseBorrowsOf(e);
    return val;
  }
  evalMatch(e, env) {
    const v = dv(this.ev(e.scrut, env));
    for (const arm of e.arms) { const be = new Env(env); if (this.matchPat(arm.pat, v, be)) { if (arm.guard && dv(this.ev(arm.guard, be)) !== true) continue; return this.ev(arm.body, be); } }
    throw new RustError('non-exhaustive patterns: `_` not covered', 0, 'E0004');
  }

  // ---------------------------------------------------------------- calls / methods / places
  _fnDef(f) { return f; }
  _args(list, env) { return (list || []).map(a => this._markRefUsed(this.evForMove(a, env))); }
  _namedFromArray(def, a) { return Array.isArray(a) ? a : a; }
  callValue(f, args, line) { f = dv(f); if (f instanceof Clo) return this._callClo(f, args, line); if (f instanceof Fn) return this._callFn(f, args, null, line); if (typeof f === 'function') return f(args); throw new RustError('expected function, found `' + typeName(f) + '`', line, 'E0618'); }
  _callClo(c, args, line) { const env = new Env(c.env); const ps = c.params || []; for (let i = 0; i < ps.length; i++) this.bindPat(ps[i].pat, i < args.length ? args[i] : UNIT, env, ps[i].mut); try { if (c.body && c.body.k === 'block') return this.evalBlock(c.body, env); return this.ev(c.body, env); } catch (e) { if (e instanceof Ret) return e.v; throw e; } }
  callFn(def, args, selfVal, line) { return this._callFn(def, args, selfVal, line); }
  _callFn(def, args, selfVal, line) {
    if (def.builtin) return def.builtin(args);
    const env = new Env(def.env || this.global);
    if (selfVal !== undefined && selfVal !== null && def.selfKind) env.declare('self', { value: selfVal, mut: !!(def.selfKind && def.selfKind.mut), moved: false });
    const params = def.params || [];
    for (let i = 0; i < params.length; i++) { this.bindPat(params[i].pat, i < args.length ? args[i] : UNIT, env, params[i].mut); if (params[i].ty && params[i].pat.p === 'bind') { const r = env.lookup(params[i].pat.name); if (r) r.ty = params[i].ty; } }
    const pushed = def.ret ? (this.retStack.push(def.ret), true) : false;
    try { if (!def.body) return UNIT; if (def.body.k === 'block') return this.evalBlock(def.body, env); return this.ev(def.body, env); }
    catch (e) { if (e instanceof Ret) return e.v; throw e; }
    finally { if (pushed) this.retStack.pop(); }
  }
  evalCall(e, env) {
    const c = e.callee;
    if (c && c.k === 'path') {
      const segs = c.segs;
      if (segs.length === 1) {
        const n = segs[0].name; const rec = env.lookup(n);
        if (rec) return this.callValue(dv(rec.value), this._args(e.args, env), e.line || 0);
        const f = this.fns.get(n); if (f) return this._callFn(f, this._args(e.args, env), null, e.line || 0);
        const cst = this.consts.get(n);
        if (cst) { const fv = cst.value === undefined ? (cst.value = this.ev(cst.def.value, this.global)) : cst.value; return this.callValue(fv, this._args(e.args, env), e.line || 0); }
        const td = this.types.get(n);
        if (td && td.kind === 'struct') { const a = this._args(e.args, env); return new Sv(n, td.def.tuple ? a : a); }
        if (n === 'Some') return some(this._args(e.args, env)[0]);
        if (n === 'Ok') return ok(this._args(e.args, env)[0]);
        if (n === 'Err') return errV(this._args(e.args, env)[0]);
        throw new RustError('cannot find function `' + n + '` in this scope', e.line || 0, 'E0425');
      }
      const names = segs.map(s => s.name), last = names[names.length - 1], ty2 = names[names.length - 2];
      const td = this.types.get(ty2);
      if (td && td.kind === 'enum') { const v = td.def.variants.find(x => x.name === last); if (v) { const a = this._args(e.args, env); return new Ev(ty2, last, v.kind === 'tuple' ? a : []); } }
      if (ty2 === 'Option') { const a = this._args(e.args, env); if (last === 'Some') return some(a[0]); if (last === 'None') return NONE(); }
      if (ty2 === 'Result') { const a = this._args(e.args, env); if (last === 'Ok') return ok(a[0]); if (last === 'Err') return errV(a[0]); }
      const m = this.findMethod(ty2, last); if (m) return this._callFn(m, this._args(e.args, env), null, e.line || 0);
      const bp = this.builtinPath(names, { line: e.line || 0 });
      if (bp !== undefined) { if (typeof bp === 'function') return bp(this._args(e.args, env)); return bp; }
      const a = this._args(e.args, env);
      if ((last === 'clone' || last === 'from') && ['Rc', 'Arc', 'RefCell', 'Cell', 'Box'].includes(ty2)) return dv(a[0]);
      if (last === 'new' && ['RefCell', 'Cell'].includes(ty2)) return new CellV(dv(a[0]));
      if (last === 'new' && ['Rc', 'Arc', 'Box'].includes(ty2)) return dv(a[0]);
      throw new RustError('no function or associated item named `' + last + '` found for type `' + ty2 + '`', e.line || 0, 'E0599');
    }
    const fv = dv(this.ev(c, env));
    return this.callValue(fv, this._args(e.args, env), e.line || 0);
  }
  evalMethod(e, env) {
    const recv = this.ev(e.recv, env); const base = dv(recv); const name = e.name; const tn = typeName(base);
    const saveT = this.curTurbo; if (e.turbo) this.curTurbo = e.turbo;
    try {
      const m = this.findMethod(tn, name);
      if (m) return this._callFn(m, this._args(e.args, env), recv, e.line || 0);
      if (base instanceof CellV) {
        const ca = this._args(e.args, env);
        if (name === 'borrow') return dv(base.v);
        if (name === 'borrow_mut') return new Ref(() => base.v, x => { base.v = x; });
        if (name === 'try_borrow' || name === 'try_borrow_mut') return ok(name === 'borrow' ? dv(base.v) : new Ref(() => base.v, x => { base.v = x; }));
        if (name === 'get') return dv(base.v);
        if (name === 'set') { base.v = dv(ca[0]); return UNIT; }
        if (name === 'replace') { const o = dv(base.v); base.v = dv(ca[0]); return o; }
        if (name === 'into_inner' || name === 'take') { const o = dv(base.v); base.v = UNIT; return o; }
      }
      if (name === 'borrow' || name === 'borrow_mut') return dv(recv);
      if (name === 'try_borrow' || name === 'try_borrow_mut') return ok(dv(recv));
      return this.builtinMethod(base, name, this._args(e.args, env), { line: e.line || 0, e: e.recv, name, args: e.args }, env, recv);
    } finally { this.curTurbo = saveT; }
  }
  evalStruct(e, env) {
    const names = e.path.map(s => s.name), last = names[names.length - 1], ty2 = names[names.length - 2];
    const fields = {};
    for (const f of e.fields) fields[f.name] = dv(this.ev(f.value, env));
    if (e.rest) { const r = dv(this.ev(e.rest, env)); const src = r instanceof Sv ? r.f : (r instanceof Ev && r.f && !Array.isArray(r.f) ? r.f : null); if (src) for (const k in src) if (!(k in fields)) fields[k] = dv(src[k]); }
    const td = this.types.get(ty2);
    if (td && td.kind === 'enum') return new Ev(ty2, last, fields);
    return new Sv(last, fields);
  }
  place(e, env, mutable) {
    if (e.k === 'path' && e.segs.length === 1) {
      const n = e.segs[0].name; const rec = env.lookup(n);
      if (rec) return new Ref(() => rec.value, x => { rec.value = x; });
      if (this.consts.has(n)) throw new RustError('cannot assign to constant `' + n + '`', 0, 'E0394');
      throw new RustError('cannot find value `' + n + '` in this scope', 0, 'E0425');
    }
    if (e.k === 'un' && e.op === '*') {
      let r;
      if (e.e.k === 'path' && e.e.segs.length === 1) { const rec = env.lookup(e.e.segs[0].name); r = rec ? rec.value : this.ev(e.e, env); }
      else r = this.ev(e.e, env);
      if (r instanceof Ref) return r;
      const cell = { v: r };
      return new Ref(() => cell.v, x => { cell.v = x; });
    }
    if (e.k === 'field') { const objp = this.place(e.obj, env, true); const k = e.index !== null ? e.index : e.name;
      return new Ref(() => { const c = dv(objp.get()); if (c instanceof Sv) return dv(c.f[k]); if (c instanceof Tup) return dv(c.a[k]); if (c instanceof Ev) return dv(c.f[k]); return dv(c[k]); },
        x => { const c = dv(objp.get()); if (c instanceof Sv) c.f[k] = x; else if (c instanceof Tup) c.a[k] = x; else if (c instanceof Ev) c.f[k] = x; else c[k] = x; }); }
    if (e.k === 'index') { const objp = this.place(e.obj, env, true); const o = dv(objp.get()); const i = dv(this.ev(e.index, env));
      if (Array.isArray(o)) { if (i < 0 || i >= o.length) throw new Panic('index out of bounds: the len is ' + o.length + ' but the index is ' + i, 0); return new Ref(() => dv(o[i]), x => { o[i] = x; }); }
      if (o instanceof RMap) { const kk = this.key(i); if (!o.m.has(kk)) throw new Panic('no entry found for key', 0); return new Ref(() => dv(o.m.get(kk)[1]), x => { o.m.get(kk)[1] = x; }); }
      throw new RustError('cannot assign through this index', 0, 'E0000'); }
    const v = this.ev(e, env); const cell = { v };
    return new Ref(() => cell.v, x => { cell.v = x; });
  }
  _chkAssign(target, env, line) {
    if (target.k === 'path' && target.segs.length === 1) { const rec = env.lookup(target.segs[0].name); if (rec && !rec.mut && !(rec.value instanceof Ref)) throw new RustError('cannot assign twice to immutable variable `' + target.segs[0].name + '`', line, 'E0384'); }
  }

  // ---------------------------------------------------------------- statements / patterns
  execLet(s, env) {
    if (!s.value) { const v = s.ty ? this.defaultForType(s.ty) : UNIT; this.bindPat(s.pat, v, env, s.mut); if (s.ty && s.pat.p === 'bind') { const r = env.lookup(s.pat.name); if (r) r.ty = s.ty; } return; }
    const saveH = this.hint; if (s.ty) this.hint = s.ty;
    let v;
    if (s.els) { v = this.evForMove(s.value, env); const be = new Env(env); if (!this.matchPat(s.pat, v, be)) { this.evalBlock(s.els, env); this.hint = saveH; return; } for (const [k, val] of be.vars) env.declare(k, val); this.hint = saveH; return; }
    v = this.evForMove(s.value, env);
    if (s.ty && isIntTy(head(s.ty)) && typeof v === 'number') v = this._wrapToType(v, head(s.ty));
    this.hint = saveH;
    this.bindPat(s.pat, v, env, s.mut);
    if (s.ty && s.pat.p === 'bind') { const r = env.lookup(s.pat.name); if (r) r.ty = s.ty; }
  }
  _execItemLocal(item, env) { if (item.k === 'const') { if (!this.consts.has(item.name)) this.consts.set(item.name, { def: item, value: undefined }); } else this._collect([item]); }
  bindPat(pat, v, env, mut) {
    switch (pat.p) {
      case 'wild': return;
      case 'bind': { env.declare(pat.name, { value: v, mut: !!(mut || pat.mut), moved: false }); if (pat.sub) this.bindPat(pat.sub, dv(v), env, mut); return; }
      case 'ref': this.bindPat(pat.sub, dv(v), env, mut || pat.mut); return;
      case 'tuple': { const x = dv(v); const a = x instanceof Tup ? x.a : (Array.isArray(x) ? x : []); (pat.items || []).forEach((p, i) => this.bindPat(p, a[i], env, mut)); return; }
      case 'slice': { const x = dv(v); const a = Array.isArray(x) ? x : []; (pat.items || []).forEach((p, i) => this.bindPat(p, a[i], env, mut)); return; }
      case 'struct': { const x = dv(v); const f = (x instanceof Ev || x instanceof Sv) ? (x.f || {}) : {}; for (const fl of pat.fields) this.bindPat(fl.pat, f[fl.name], env, mut); return; }
      case 'tstruct': { const x = dv(v); const f = (x.f || []); (pat.items || []).forEach((p, i) => this.bindPat(p, f[i], env, mut)); return; }
      case 'or': if (pat.items[0]) this.bindPat(pat.items[0], v, env, mut); return;
      default: return;
    }
  }
  matchPat(pat, v, env) {
    v = dv(v);
    switch (pat.p) {
      case 'wild': return true;
      case 'bind': { env.declare(pat.name, { value: v, mut: pat.mut, moved: false }); return pat.sub ? this.matchPat(pat.sub, v, env) : true; }
      case 'ref': return this.matchPat(pat.sub, v, env);
      case 'lit': return this.eq(this.ev(pat.lit, new Env(null)), v);
      case 'tuple': { if (!(v instanceof Tup)) return false; return (pat.items || []).every((p, i) => this.matchPat(p, v.a[i], env)); }
      case 'slice': { if (!Array.isArray(v)) return false; if (!pat.rest && (pat.items || []).length !== v.length) return false; return (pat.items || []).every((p, i) => this.matchPat(p, v[i], env)); }
      case 'struct': { const last = pat.segs[pat.segs.length - 1]; if (v instanceof Ev) { if (v.v !== last) return false; const f = v.f || {}; return pat.fields.every(fl => this.matchPat(fl.pat, f[fl.name], env)); } if (!(v instanceof Sv) || v.t !== last) return false; return pat.fields.every(fl => this.matchPat(fl.pat, v.f[fl.name], env)); }
      case 'tstruct': { if (!(v instanceof Ev) || v.v !== pat.segs[pat.segs.length - 1]) return false; return (pat.items || []).every((p, i) => this.matchPat(p, v.f[i], env)); }
      case 'path': { const last = pat.segs[pat.segs.length - 1]; if (v instanceof Ev) return v.v === last; if (v instanceof Sv) return v.t === last; return false; }
      case 'or': { for (const sub of pat.items) { const be = new Env(env); if (this.matchPat(sub, v, be)) { for (const [k, val] of be.vars) env.declare(k, val); return true; } } return false; }
      case 'range': { const a = dv(this.ev(pat.a, new Env(null))), b = dv(this.ev(pat.b, new Env(null))); return v >= a && (pat.incl ? v <= b : v < b); }
    }
    return false;
  }

  // ---------------------------------------------------------------- operators
  binop(op, a, b, line) {
    a = dv(a); b = dv(b);
    if (op === '+' && typeof a === 'string') return a + (typeof b === 'string' ? b : this.disp(b, line));
    if (op === '+' && typeof b === 'string') return this.disp(a, line) + b;
    const fa = a instanceof Flt, fb = b instanceof Flt;
    if (fa || fb) { const x = fa ? a.v : a, y = fb ? b.v : b; const F = z => new Flt(z);
      switch (op) { case '+': return F(x + y); case '-': return F(x - y); case '*': return F(x * y); case '/': return F(x / y); case '%': return F(x % y);
        case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; case '==': return x === y; case '!=': return x !== y; case '&&': return x && y; case '||': return x || y; } }
    switch (op) {
      case '+': return this._ck(a + b, 'add', line);
      case '-': return this._ck(a - b, 'subtract', line);
      case '*': return this._ck(a * b, 'multiply', line);
      case '/': if (b === 0) throw new Panic('attempt to divide by zero', line); return Math.trunc(a / b);
      case '%': if (b === 0) throw new Panic('attempt to calculate the remainder with a divisor of zero', line); return a % b;
      case '&': return a & b; case '|': return a | b; case '^': return a ^ b;
      case '<<': return this._wrapToType(a << b, this._intTy()); case '>>': return a >> b;
      case '==': return this.eq(a, b); case '!=': return !this.eq(a, b);
      case '<': return this.cmp(a, b) < 0; case '>': return this.cmp(a, b) > 0; case '<=': return this.cmp(a, b) <= 0; case '>=': return this.cmp(a, b) >= 0;
    }
    throw new RustError('unsupported operator `' + op + '`', line, 'E0000');
  }
  _intTy() { const h = head(this.hintOf()); return isIntTy(h) ? h : 'i32'; }
  _ck(n, verb, line) { const r = INT_RANGE[this._intTy()]; if (r && (n < r[0] || n > r[1])) throw new Panic('attempt to ' + verb + ' with overflow', line); return n; }
  _wrapToType(n, ty) { if (!isIntTy(ty)) return n; const r = INT_RANGE[ty]; if (n >= r[0] && n <= r[1]) return n; return this._wrapInt(n, ty); }

  // ---------------------------------------------------------------- helpers (lib calls many)
  _wrapInt(n, ty) { const r = INT_RANGE[ty]; if (!r) return n; let v = n % (r[1]-r[0]+1); if (v < 0) v += (r[1]-r[0]+1); if (ty[0] === 'i') v -= (r[1]-r[0]+1 >= 256 ? 128 : 0); if (v > r[1]) v = r[0] + ((v - r[1]) - 1); return v; } // rough; Rust panics on overflow in other ops; fine
  _wrapInt(n, ty) { // simple: clamp to range via panics already; but keep cheap
    const r = INT_RANGE[ty]; if (!r) return n; if (n >= r[0] && n <= r[1]) return n; // compute 2s? just throw if unchecked; return n
    // wrap
    let m = (r[1] - r[0] + 1); let v = ((n - r[0]) % m + m) % m + r[0]; return v;
  }
  defaultForType(ty) { const h = head(ty); if (isIntTy(h)) return 0; if (h === 'f32' || h === 'f64') return new Flt(0.0); if (h === 'char') return new Chr(' '); if (h === 'bool') return false; if (h === 'str') return ''; if (h === 'String') return ''; if (h === 'Vec') return []; if (h === 'HashMap' || h === 'BTreeMap') return new RMap(); if (h === 'HashSet' || h === 'BTreeSet') return new RSet(); if (h === 'RefCell') return UNIT; if (h === 'Cell') return UNIT; if (h === 'Option') return NONE(); if (h === 'Result') return ok(UNIT); if (h === '()') return UNIT; // tuple
    if (ty && ty.t === 'tuple') return new Tup((ty.elems || []).map(x => this.defaultForType(x)));
    return UNIT;
  }
  eq(a, b) {
    a = dv(a); b = dv(b);
    if (typeof a !== typeof b) {
      if ((a instanceof Flt) && typeof b === 'number') return Math.abs(a.v - b) < 1e-18;
      if ((b instanceof Flt) && typeof a === 'number') return Math.abs(a - b.v) < 1e-18;
      return false;
    }
    if (a instanceof Flt && b instanceof Flt) return Math.abs(a.v - b.v) < 1e-18;
    if (a instanceof Chr) return b instanceof Chr && a.c === b.c;
    if (a instanceof Tup) return b instanceof Tup && a.a.length === b.a.length && a.a.every((x, i) => this.eq(x, b.a[i]));
    if (a instanceof Sv) return b instanceof Sv && a.t === b.t && this._objEq(a.f, b.f);
    if (a instanceof Ev) return b instanceof Ev && a.en === b.en && a.v === b.v && this._objEq(a.f, b.f);
    if (a instanceof Ref) return b instanceof Ref && this.eq(a.get(), b.get());
    if (a instanceof Rng) return a.a === b.a && a.b === b.b && a.incl === b.incl;
    if (a instanceof Iter) return false;
    if (a instanceof RMap) return b instanceof RMap && a.m.size === b.m.size && [...a.m.keys()].every(k => b.m.has(k) && this.eq(a.m.get(k)[1], b.m.get(k)[1]));
    if (a instanceof RSet) { if (!(b instanceof RSet) || a.s.size !== b.s.size) return false; for (const v of a.s) if (!b.s.has(this._setKey(v))) return false; return true; }
    if (a instanceof Clo || a instanceof Fn) return a === b;
    return a === b;
  }
  _objEq(x, y) { if (x === y) return true; if (!x || !y) return x === y; const k = Object.keys(x); if (k.length !== Object.keys(y).length) return false; return k.every(kk => kk in y && this.eq(x[kk], y[kk])); }
  cmp(a, b) {
    a = dv(a); b = dv(b);
    if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : (a > b ? 1 : 0);
    if (a instanceof Flt && b instanceof Flt) return a.v < b.v ? -1 : (a.v > b.v ? 1 : 0);
    if (a instanceof Chr && b instanceof Chr) return a.c < b.c ? -1 : (a.c > b.c ? 1 : 0);
    if (Array.isArray(a) && Array.isArray(b)) { let n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) { const c = this.cmp(a[i], b[i]); if (c !== 0) return c; } return a.length - b.length; }
    if (a instanceof Tup && b instanceof Tup) { let n = Math.min(a.a.length, b.a.length); for (let i = 0; i < n; i++) { const c = this.cmp(a.a[i], b.a[i]); if (c !== 0) return c; } return a.a.length - b.a.length; }
    if (a instanceof Sv && b instanceof Sv && a.t === b.t) { const ka = Object.keys(a.f).sort(), kb = Object.keys(b.f).sort(); for (let i = 0; i < ka.length && i < kb.length; i++) { const c = this.cmp(a.f[ka[i]], b.f[kb[i]]); if (c !== 0) return c; } return ka.length - kb.length; }
    if (a instanceof Ev && b instanceof Ev && a.en === b.en && a.v === b.v) return this.cmp(a.f, b.f);
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : (a > b ? 1 : 0);
    throw new RustError('cannot compare `'+typeName(a)+'` and `'+typeName(b)+'`', 0, 'E0369');
  }
  key(v) {
    v = dv(v);
    if (typeof v === 'number') return 'n:' + v;
    if (v instanceof Flt) return 'f:' + v.v;
    if (v instanceof Chr) return 'c:' + v.c;
    if (v instanceof Tup) return 't:' + v.a.map(x => this.key(x)).join('|');
    if (v instanceof Sv) { const kk = Object.keys(v.f).sort(); return 's:' + v.t + '|' + kk.map(x => x + ':' + this.key(v.f[x])).join(';'); }
    if (v instanceof Ev) { if (Array.isArray(v.f)) return 'e:' + v.en + '|' + v.v + '|' + v.f.map(x => this.key(x)).join(';'); const kk = Object.keys(v.f || {}).sort(); return 'e:' + v.en + '|' + v.v + '|' + kk.map(x => x + ':' + this.key(v.f[x])).join(';'); }
    if (v === UNIT) return 'unit';
    if (Array.isArray(v)) return 'a:' + v.map(x => this.key(x)).join(',');
    if (typeof v === 'string') return 'str:' + v;
    if (v instanceof RMap) { const e = [...v.m.values()].map(([k1, val1]) => this.key(k1) + '=' + this.key(val1)).sort().join(';'); return 'map:' + e; }
    if (v instanceof RSet) { const e = [...v.s].map(k => k).sort().join(';'); return 'set:' + e; }
    if (v instanceof Ref) return 'ref:' + this.key(v.get());
    return 'o:' + String(v);
  }
  _setKey(v) { return this.key(v); }

  clone(v) {
    v = dv(v);
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || v instanceof Flt || v instanceof Chr || v === UNIT) return v;
    if (Array.isArray(v)) return v.map(x => this.clone(x));
    if (v instanceof Tup) return new Tup(v.a.map(x => this.clone(x)));
    if (v instanceof Sv) { const f = {}; for (const k in v.f) f[k] = this.clone(v.f[k]); return new Sv(v.t, f); }
    if (v instanceof Ev) { let f; if (Array.isArray(v.f)) f = v.f.map(x => this.clone(x)); else { f = {}; if (v.f) for (const k in v.f) f[k] = this.clone(v.f[k]); } return new Ev(v.en, v.v, f); }
    if (v instanceof Ref) return v; // shared
    if (v instanceof Rng) return new Rng(v.a, v.b, v.incl);
    if (v instanceof Iter) return v;
    if (v instanceof RMap) { const m = new Map(); for (const [kk, [k1, v1]] of v.m) m.set(kk, [this.clone(k1), this.clone(v1)]); return new RMap(m); }
    if (v instanceof RSet) { const s = new Set(); for (const kk of v.s) s.add(kk); return new RSet(s); }
    if (v instanceof Clo) return v;
    if (v instanceof CellV) return v;
    if (v instanceof Fn) return v;
    return v;
  }
  toArr(it) {
    it = dv(it);
    if (Array.isArray(it)) return it;
    if (it instanceof Rng) { const r = []; const s = it.a, e = it.b, incl = it.incl; for (let i = s; incl ? i <= e : i < e; i++) r.push(i); return r; }
    if (it instanceof RMap) return [...it.m.values()].map(([k, v]) => v);
    if (it instanceof RSet) return [...it.s].map(k => this._fromSetKey(k));
    if (it instanceof Iter) return it.a;
    throw new RustError('`'+typeName(it)+'` is not an iterator', 0, 'E0277');
  }
  _fromSetKey(k) { return k; } // key is the value identity
  replaceInPlace(a, b) { for (const k in a) delete a[k]; Object.assign(a, b); return a; }
  elemRef(coll, k, mut) { coll = dv(coll); if (Array.isArray(coll)) { const i = dv(k); if (i < 0 || i >= coll.length) throw new Panic('index out of bounds', 0); return new Ref(() => coll[i], x => { coll[i] = x; }); } if (coll instanceof RMap) { const kk = this.key(dv(k)); if (!coll.m.has(kk)) { const nk = dv(k); coll.m.set(kk, [nk, UNIT]); } return new Ref(() => coll.m.get(kk)[1], x => { const nk = dv(k); coll.m.set(kk, [nk, x]); }); } throw new RustError('cannot index into `'+typeName(coll)+'`', 0, 'E0618'); }
  mapEntries(m) { return [...dv(m).m.values()]; }
  setItems(s) { return [...dv(s).m.values()]; }
  _rootName(e) { if (!e) return null; if (e.k === 'path' && e.segs && e.segs.length === 1) return e.segs[0].name; if (e.k === 'field' || e.k === 'index') return this._rootName(e.obj); if (e.k === 'un' && e.op === '*') return this._rootName(e.e); return null; }
  _markRefUsed(v) { if (v instanceof Ref) this.usedRefs.add(v); return v; }
  _addBorrow(ref, env) { const rn = ref.__root; if (!rn) return; let s = this.borrows.get(rn); if (!s) { s = new Set(); this.borrows.set(rn, s); } s.add(ref); if (env) (env.__borrows || (env.__borrows = [])).push(ref); }
  _releaseBorrowsOf(env) { if (!env || !env.__borrows) return; for (const r of env.__borrows) { const s = this.borrows.get(r.__root); if (s) { s.delete(r); if (!s.size) this.borrows.delete(r.__root); } } env.__borrows = null; }
  _releaseUsed() { for (const [n, s] of [...this.borrows]) { for (const r of [...s]) if (this.usedRefs.has(r)) s.delete(r); if (!s.size) this.borrows.delete(n); } }
  chkMutRoot(node, env, kind, line) {
    const expr = node && node.e ? node.e : node; const rn = this._rootName(expr); if (!rn) return;
    const s = this.borrows.get(rn); if (!s || !s.size) return;
    let mut = false; for (const r of s) if (r.mut) { mut = true; break; }
    throw new RustError(mut ? 'cannot borrow `' + rn + '` as mutable more than once at a time' : 'cannot borrow `' + rn + '` as mutable because it is also borrowed as immutable', line, mut ? 'E0499' : 'E0502');
  }

  // ---------------------------------------------------------------- format/macros/others
  _fmtDebug(v) {
    v = dv(v);
    if (v === UNIT) return '()';
    if (typeof v === 'number') return String(v);
    if (v instanceof Flt) { const s = String(v.v); return s.includes('.') || s.includes('e') || !isFinite(v.v) ? s : s + '.0'; }
    if (v instanceof Chr) return "'" + this._escChar(v.c) + "'";
    if (typeof v === 'string') return '"' + this._escStr(v) + '"';
    if (Array.isArray(v)) return '[' + v.map(x => this._fmtDebug(x)).join(', ') + ']';
    if (v instanceof Tup) return '(' + v.a.map(x => this._fmtDebug(x)).join(', ') + ')';
    if (v instanceof Sv) { const ks = Object.keys(v.f); return v.t + ' { ' + ks.map(k => k + ': ' + this._fmtDebug(v.f[k])).join(', ') + ' }'; }
    if (v instanceof Ev) { const f = v.f; let p = v.v; if (Array.isArray(f)) { if (f.length) p += '(' + f.map(x => this._fmtDebug(x)).join(', ') + ')'; } else if (f) { const ks = Object.keys(f); if (ks.length) p += ' { ' + ks.map(k => k + ': ' + this._fmtDebug(f[k])).join(', ') + ' }'; } return p; }
    if (v instanceof Ref) return '&' + (v.mut ? 'mut ' : '') + this._fmtDebug(v.get());
    if (v instanceof CellV) return this._fmtDebug(v.v);
    if (v instanceof Rng) return v.a + (v.incl ? '..=' : '..') + v.b;
    if (v instanceof RMap) { const es = [...v.m.values()].map(([k, val]) => this._fmtDebug(k) + ': ' + this._fmtDebug(val)); return '{' + es.join(', ') + '}'; }
    if (v instanceof RSet) { const es = [...v.m.values()].map(k => this._fromSetKey(k)).map(x => this._fmtDebug(x)); return '{' + es.join(', ') + '}'; }
    if (v instanceof Clo) return '<closure>';
    if (v instanceof Fn) return '<fn>';
    return String(v);
  }
  _fmtDisp(v, spec) {
    v = dv(v);
    spec = spec || '';
    const prec = spec.match(/\.(\d+)/);
    if (prec && (v instanceof Flt || typeof v === 'number')) { const x = v instanceof Flt ? v.v : v; return x.toFixed(Number(prec[1])); }
    if (spec.includes('b')) return (v instanceof Flt ? v.v : Number(v)).toString(2);
    if (spec.includes('o')) return (v instanceof Flt ? v.v : Number(v)).toString(8);
    if (spec.includes('x')) return (v instanceof Flt ? v.v : Number(v)).toString(16);
    if (spec.includes('e')) return Number(v instanceof Flt ? v.v : v).toExponential();
    if (v === UNIT) return '()';
    if (typeof v === 'number') return String(v);
    if (v instanceof Flt) { if (Number.isNaN(v.v)) return 'NaN'; if (!isFinite(v.v)) return v.v > 0 ? 'inf' : '-inf'; return String(v.v); }
    if (v instanceof Chr) return escChar(v.c);
    if (typeof v === 'string') return v;
    if (v instanceof Ref) return this._fmtDisp(v.get(), spec);
    if (v instanceof CellV) return this._fmtDisp(v.v, spec);
    return this._fmtDebug(v);
  }
  _fmtVal(v) { return this._fmtDebug(v); }
  _fmtMacro(args, quote) {
    if (!args.length) return '';
    if (typeof args[0] !== 'string') { const spec = this._fmtDisp(args[0]); return [spec].concat(args.slice(1).map(a => ' ' + this._fmtVal(a))).join(''); }
    const specStr = args[0];
    let j = 1;
    const s = specStr.replace(/\{([^{}]*)\}/g, (whole, inner) => {
      const colon = inner.indexOf(':');
      const nameOrArg = colon < 0 ? inner : inner.slice(0, colon);
      const spec = colon < 0 ? '' : inner.slice(colon + 1);
      let v;
      if (/^\d+$/.test(nameOrArg)) v = args[1 + Number(nameOrArg)];
      else v = args[j++];
      if (v === undefined) return '';
      if (spec.includes('?')) return this._fmtDebug(v);
      return this._fmtDisp(v, spec);
    });
    return s;
  }
  dbg(v) { this.out += '[dbg] ' + this._fmtDebug(v) + '\n'; return v; }
  disp(v, line) { return this._fmtDisp(v); }
  _escChar(c) { return escChar(c); }
  _escStr(s) { return escStr(s); }
  toString() { return ''; }


  _firstMacroExpr(m, env) { try { const p = new Parser(m.toks || []); return p.parseExpr(); } catch (e) { return { k: 'lit', v: null }; } }
  evalMacro(m, env) {
    const name = m.name, toks = m.toks || [];
    if (name === 'drop') { this.ev(this._firstMacroExpr(m, env), env); return UNIT; }
    if (name === 'dbg') { const v = this.ev(this._firstMacroExpr(m, env), env); return this.dbg(v); }
    if (name === 'println' || name === 'print' || name === 'eprintln' || name === 'eprint' || name === 'format') {
      const isStr = toks.length && toks[0].t === 'str';
      const args = [];
      let spec = '';
      if (isStr) { spec = toks[0].v; const rest = toks.slice(1); if (rest.length && rest[0].t === 'comma') rest.splice(0, 1); this._macroArgs(rest, env, args); }
      else this._macroArgs(toks, env, args);
      const s = this._fmtMacro([spec].concat(args), name === 'format');
      if (name === 'println') this.out += s + '\n';
      else if (name === 'print') this.out += s;
      else if (name === 'eprintln') this.errOut += s + '\n';
      else if (name === 'eprint') this.errOut += s;
      else return s;
      return UNIT;
    }
    if (name === 'vec') { const args = []; this._macroArgsWithSemi(toks, env, args); return args; }
    if (name === 'panic') { const args = []; this._macroArgs(toks, env, args); const spec = toks.length && toks[0].t === 'str' ? toks[0].v : (args.length ? null : 'explicit panic'); const msg = this._fmtMacro(spec === null ? args : [spec].concat(args), false); throw new Panic(msg || 'explicit panic', m.line || 0); }
    if (name === 'assert' || name === 'debug_assert') { const args = []; this._macroArgs(toks, env, args); if (!args[0]) throw new Panic(args[1] !== undefined ? this._fmtVal(args[1]) : 'assertion failed', m.line || 0); return UNIT; }
    if (name === 'assert_eq' || name === 'assert_ne' || name === 'debug_assert_eq' || name === 'debug_assert_ne') {
      const args = []; this._macroArgs(toks, env, args);
      const okv = name.indexOf('_ne') === -1 ? this.eq(args[0], args[1]) : !this.eq(args[0], args[1]);
      if (!okv) throw new Panic('assertion failed: `(left == right)` left: `' + this._fmtVal(args[0]) + '`, right: `' + this._fmtVal(args[1]) + '`', m.line || 0);
      return UNIT;
    }
    if (name === 'write' || name === 'writeln') { return ok(UNIT); }
    if (name === 'matches') { return true; }
    if (name === 'todo' || name === 'unimplemented') { const args = []; this._macroArgs(toks, env, args); throw new Panic(args.length ? this._fmtVal(args[0]) : 'not yet implemented', m.line || 0); }
    if (name === 'unreachable') { const args = []; this._macroArgs(toks, env, args); throw new Panic(args.length ? this._fmtVal(args[0]) : 'unreachable', m.line || 0); }
    return UNIT;
  }
  _macroArgs(toks, env, out) { for (const e of this._parseMacroArgs(toks)) out.push(this._markRefUsed(this.ev(e, env))); }
  _macroArgsWithSemi(toks, env, out) { this._macroArgs(toks, env, out); }
  _parseMacroArgs(toks) { const p = new Parser(toks); const list = []; while (!p.at('eof')) { if (p.at(',')) { p.i++; continue; } try { list.push(p.parseExpr()); } catch (e) { break; } } return list; }

  // ---------------------------------------------------------------- close
}

// ---------------------------------------------------------------- IIFE end + export
var RustCore = { Runner, RustError, Panic, Ret, Ctl, Chr, Flt, Tup, Sv, Ev, Ref, Rng, Iter, RMap, RSet, Clo, Fn, Fmtr, Entry, UNIT, dv, isNum, isObjLike, typeName, ordV, some, NONE, ok, errV, mkOpt, strLen };
if (typeof G !== "undefined") G.RustCore = RustCore; globalThis.RustCore = RustCore; if (typeof window !== "undefined") window.RustCore = RustCore;
})(); // end RustCore IIFE
