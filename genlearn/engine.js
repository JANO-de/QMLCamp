// Exercise generation and answer checking. Pure functions, no DOM.
(function () {
  'use strict';
  const GL = (window.GENLEARN = window.GENLEARN || {});

  const ARTICLES = /^(der|die|das|ein|eine|einen)\s+/i;

  // lowercase, strip punctuation, fold umlauts so "ae" == "ä" (but "a" != "ä")
  function norm(s) {
    return String(s)
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[.,!?;:"“”„]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  GL.norm = norm;

  function tokens(sentence) {
    return sentence
      .replace(/[.,!?]+$/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }
  GL.tokens = tokens;

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  GL.rng = mulberry;

  function shuffle(a, rnd) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  function pick(a, n, rnd) {
    return shuffle(a, rnd).slice(0, n);
  }

  function allWords(course) {
    const out = [];
    for (const u of course.units) for (const l of u.lessons) for (const w of l.words) out.push(w);
    return out;
  }
  function allSentences(course) {
    const out = [];
    for (const u of course.units)
      for (const l of u.lessons) for (const s of l.sentences) out.push(s);
    return out;
  }

  // distractors: prefer other words of the same lesson, then anywhere in the course
  function distract(correct, key, lesson, course, rnd, n) {
    const seen = new Set([correct]);
    const out = [];
    const take = (pool) => {
      for (const w of shuffle(pool, rnd)) {
        if (out.length >= n) return;
        const v = w[key];
        if (!seen.has(v)) {
          seen.add(v);
          out.push(v);
        }
      }
    };
    take(lesson.words);
    take(allWords(course));
    return out;
  }

  // Build a lesson as a list of exercises. opts.speech: true when audio is available.
  GL.buildLesson = function (course, lesson, seed, opts) {
    opts = opts || {};
    const rnd = mulberry(seed || 1);
    const words = lesson.words;
    const sents = lesson.sentences;
    const ex = [];
    let id = 0;
    const add = (e) => {
      e.id = ++id;
      ex.push(e);
    };

    const first = pick(words, Math.min(3, words.length), rnd);
    for (const w of first) {
      add({
        type: 'mc',
        dir: 'de-en',
        prompt: w[0],
        speak: w[0],
        answer: w[1],
        options: shuffle([w[1]].concat(distract(w[1], 1, lesson, course, rnd, 3)), rnd),
      });
    }

    const pairWords = pick(words, Math.min(5, words.length), rnd);
    add({ type: 'match', pairs: pairWords.map((w) => [w[0], w[1]]) });

    for (const w of pick(words, Math.min(2, words.length), rnd)) {
      add({
        type: 'mc',
        dir: 'en-de',
        prompt: w[1],
        answer: w[0],
        options: shuffle([w[0]].concat(distract(w[0], 0, lesson, course, rnd, 3)), rnd),
      });
    }

    if (opts.speech) {
      for (const w of pick(words, Math.min(2, words.length), rnd)) {
        add({
          type: 'listen',
          speak: w[0],
          answer: w[0],
          options: shuffle([w[0]].concat(distract(w[0], 0, lesson, course, rnd, 3)), rnd),
        });
      }
    } else {
      for (const w of pick(words, Math.min(2, words.length), rnd)) {
        add({
          type: 'mc',
          dir: 'de-en',
          prompt: w[0],
          speak: w[0],
          answer: w[1],
          options: shuffle([w[1]].concat(distract(w[1], 1, lesson, course, rnd, 3)), rnd),
        });
      }
    }

    const decoyPool = allSentences(course).flatMap((s) => tokens(s[0]));
    for (const s of shuffle(sents, rnd)) {
      const toks = tokens(s[0]);
      const have = new Set(toks.map(norm));
      const decoys = [];
      for (const t of shuffle(decoyPool, rnd)) {
        if (decoys.length >= 2) break;
        if (!have.has(norm(t)) && !decoys.some((d) => norm(d) === norm(t))) decoys.push(t);
      }
      add({
        type: 'build',
        prompt: s[1],
        answer: toks,
        display: s[0],
        speak: s[0],
        bank: shuffle(toks.concat(decoys), rnd),
      });
    }

    for (const w of pick(words, Math.min(3, words.length), rnd)) {
      const accepted = [w[0]];
      const bare = w[0].replace(ARTICLES, '');
      if (bare !== w[0]) accepted.push(bare);
      add({
        type: 'type',
        prompt: w[1],
        answer: w[0],
        accepted,
        bare: bare !== w[0] ? bare : null,
      });
    }
    return ex;
  };

  // response: mc/listen -> chosen string; build -> array of tokens; type -> string; match -> number of mistakes
  GL.check = function (e, response) {
    switch (e.type) {
      case 'mc':
      case 'listen':
        return { ok: response === e.answer, expected: e.answer };
      case 'build': {
        const got = (response || []).map(norm).join(' ');
        const want = e.answer.map(norm).join(' ');
        return { ok: got === want, expected: e.display };
      }
      case 'type': {
        const got = norm(response || '');
        if (!got) return { ok: false, expected: e.answer };
        const full = norm(e.answer);
        if (got === full) return { ok: true, expected: e.answer };
        if (e.bare && got === norm(e.bare))
          return {
            ok: true,
            expected: e.answer,
            note: 'Include the article next time: ' + e.answer,
          };
        return { ok: false, expected: e.answer };
      }
      case 'match':
        return { ok: response === 0, expected: '' };
    }
    return { ok: false, expected: '' };
  };

  // XP for a finished lesson
  GL.xpFor = function (correct, total) {
    return 10 + Math.max(0, correct);
  };

  if (typeof module !== 'undefined') module.exports = GL;
})();
