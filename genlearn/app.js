(function () {
  'use strict';
  const G = window.GENLEARN;
  if (!G) {
    console.error('GENLEARN global missing');
    return;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
    );

  // ---- courses: built-in German + custom data files + courses saved by the creator
  const KEY = 'genlearn.v1',
    KEY_C = 'genlearn.courses.v1';
  const courses = [];
  const addCourse = (c) => {
    if (c && c.id && !courses.some((x) => x.id === c.id)) courses.push(c);
  };
  if (G.german) addCourse(Object.assign({ engine: 'genlearn' }, G.german));
  (G.courses || []).forEach(addCourse);
  try {
    JSON.parse(localStorage.getItem(KEY_C) || '[]').forEach(addCourse);
  } catch (e) {}
  let course = courses[0] || null;

  // ---- progress
  let mem = null;
  function load() {
    if (mem) return mem;
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {}
    return (mem = Object.assign(
      { xp: 0, streak: 0, last: '', done: {}, cDone: {}, cFiles: {} },
      s || {}
    ));
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(mem));
    } catch (e) {}
  };
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function liveStreak() {
    const st = load(),
      n = new Date();
    return st.last === dayKey(n) || st.last === dayKey(new Date(n - 864e5)) ? st.streak : 0;
  }
  function bumpStreak() {
    const st = load(),
      n = new Date();
    if (st.last === dayKey(n)) return;
    st.streak = st.last === dayKey(new Date(n - 864e5)) ? st.streak + 1 : 1;
    st.last = dayKey(n);
  }

  const flatOf = (c) => {
    const f = [];
    ((c && c.units) || []).forEach((u) =>
      (u.lessons || []).forEach((l) => f.push({ unit: u, lesson: l }))
    );
    return f;
  };
  const isDone = (id) => !!load().done[id];
  const doneCount = (c) => flatOf(c).filter((x) => isDone(x.lesson.id)).length;
  const nextLesson = (c) => {
    const f = flatOf(c);
    return f.find((x) => !isDone(x.lesson.id)) || f[f.length - 1];
  };
  function findLesson(id) {
    for (const c of courses) {
      const f = flatOf(c).find((x) => x.lesson.id === id);
      if (f) return Object.assign({ course: c }, f);
    }
    return null;
  }

  // ---- speech
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const pre = () => ((course && course.lang) || 'de').split('-')[0].toLowerCase();
  const speechReady = () =>
    !!synth && synth.getVoices().some((v) => v.lang.toLowerCase().indexOf(pre()) === 0);
  function say(t) {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = (course && course.lang) || 'de-DE';
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => x.lang.toLowerCase().indexOf(pre()) === 0);
    if (v) u.voice = v;
    synth.speak(u);
  }
  const sayBtn = (t) =>
    speechReady()
      ? '<button class="say" data-say="' + esc(t) + '" aria-label="Hear it">&#9658;</button>'
      : '';
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-say]');
    if (s) say(s.getAttribute('data-say'));
  });

  // ---- router
  const view = $('#view'),
    nav = $('#nav'),
    playerEl = $('#player');
  const route = () => (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  const COLORS = ['rose', 'butter', 'sage', 'sky', 'lav'];
  function render() {
    const r = route();
    if (r[0] === 'lesson') {
      const f = findLesson(r[1]);
      if (f) {
        course = f.course;
        startLesson(f);
        return;
      }
      location.hash = '#/';
      return;
    }
    closePlayer();
    if (r[0] === 'c' || r[0] === 'german') {
      course = courses.find((x) => x.id === (r[0] === 'c' ? r[1] : 'de')) || courses[0] || course;
    }
    const page = r[0] === 'c' || r[0] === 'german' ? 'c:' + (course && course.id) : r[0] || 'home';
    const links = [['home', '#/', 'Home']].concat(
      courses.slice(0, 4).map((c) => ['c:' + c.id, '#/c/' + c.id, c.title]),
      [['resources', '#/resources', 'Resources']]
    );
    nav.innerHTML = links
      .map(
        ([k, h, t]) =>
          '<a href="' +
          h +
          '"' +
          (k === page ? ' class="on" aria-current="page"' : '') +
          '>' +
          esc(t) +
          '</a>'
      )
      .join('');
    if (r[0] === 'creator' && window.GENLearnCreator) {
      window.GENLearnCreator.view(location.hash.replace('#/creator', ''));
      return;
    }
    if (page === 'resources') viewResources();
    else if (page.indexOf('c:') === 0) viewCourse();
    else viewHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  function viewHome() {
    const h = new Date().getHours(),
      de = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend',
      en = h < 12 ? 'Good morning' : h < 18 ? 'Good day' : 'Good evening';
    const st = load(),
      c = course,
      f = flatOf(c),
      nx = nextLesson(c),
      n = doneCount(c);
    view.innerHTML =
      '<div class="hero"><div class="greet"><div class="phrase">' +
      de +
      '.</div><p class="gloss">' +
      en +
      '. ' +
      sayBtn(de) +
      '</p>' +
      (nx
        ? '<div class="row"><a class="btn" href="#/lesson/' +
          nx.lesson.id +
          '">' +
          (n > 0 ? 'Continue: ' : 'Start: ') +
          esc(nx.lesson.title) +
          '</a><a class="btn alt" href="#/c/' +
          c.id +
          '">See course</a><a class="btn alt" href="#/creator/new">New course</a></div>'
        : '') +
      '</div>' +
      '<aside class="panel" aria-label="Progress"><h3>Today</h3><div class="stats"><div class="stat"><b>' +
      liveStreak() +
      '</b><span>day streak</span></div><div class="stat"><b>' +
      st.xp +
      '</b><span>XP</span></div><div class="stat"><b>' +
      n +
      '/' +
      f.length +
      '</b><span>lessons</span></div></div></aside></div>' +
      '<section class="block"><h2>Courses</h2><div class="shelf">' +
      courses
        .map(
          (x, i) =>
            '<a class="topic" style="--c:var(--' +
            COLORS[i % 5] +
            ')" href="#/c/' +
            x.id +
            '"><h3>' +
            esc(x.title) +
            '</h3><small>' +
            doneCount(x) +
            ' of ' +
            flatOf(x).length +
            ' lessons</small></a>'
        )
        .join('') +
      '</div></section>';
  }

  function viewCourse() {
    if (!course) {
      viewHome();
      return;
    }
    const nx = nextLesson(course),
      f = flatOf(course);
    let idx = 0;
    view.innerHTML =
      '<h2>' +
      esc(course.title) +
      '</h2><p class="mut">' +
      doneCount(course) +
      ' of ' +
      f.length +
      ' lessons done.</p>' +
      (course.units || [])
        .map(
          (u, ui) =>
            '<section class="unit c-' +
            (u.color || COLORS[ui % 5]) +
            '" style="--c:var(--' +
            (u.color || COLORS[ui % 5]) +
            ')"><div class="unit-head"><h3>' +
            esc(u.title) +
            '</h3><span>' +
            (u.lessons || []).length +
            ' lessons</span></div>' +
            (u.tips
              ? '<details class="tips"><summary>Tips</summary><ul>' +
                u.tips.map((t) => '<li>' + t + '</li>').join('') +
                '</ul></details>'
              : '') +
            '<ol class="toc">' +
            (u.lessons || [])
              .map((l) => {
                idx++;
                const d = isDone(l.id),
                  rec = load().done[l.id],
                  isN = nx && nx.lesson.id === l.id && !d;
                return (
                  '<li><button class="' +
                  (d ? 'done' : '') +
                  (isN ? ' next' : '') +
                  '" data-lesson="' +
                  l.id +
                  '"><span class="no">' +
                  (d ? '&#10003;' : idx) +
                  '</span><span class="name">' +
                  esc(l.title) +
                  '</span><span class="lead"></span><span class="sub">' +
                  (d
                    ? 'best ' + Math.round(((rec && rec.best) || 0) * 100) + '%'
                    : isN
                      ? 'up next'
                      : (l.words ? l.words.length : '-') + ' words') +
                  '</span></button></li>'
                );
              })
              .join('') +
            '</ol></section>'
        )
        .join('');
    view.querySelectorAll('[data-lesson]').forEach((b) =>
      b.addEventListener('click', () => {
        location.hash = '#/lesson/' + b.dataset.lesson;
      })
    );
  }

  function viewResources() {
    view.innerHTML =
      '<h2>Resources</h2><p class="note">Electronics and maker channels live next to the QMLCamp lists.</p><div class="row"><a class="btn alt" href="../index.html#/resources" target="_blank" rel="noopener">Open QMLCamp resources</a></div>';
  }

  // ---- lesson player
  let L = null;
  function closePlayer() {
    playerEl.hidden = true;
    playerEl.innerHTML = '';
    document.body.style.overflow = '';
    L = null;
    if (synth) synth.cancel();
  }
  function startLesson(f) {
    const queue = G.buildLesson(course, f.lesson, Date.now() & 0xffff, { speech: speechReady() });
    L = {
      unit: f.unit,
      lesson: f.lesson,
      queue,
      total: queue.length,
      i: 0,
      phase: 'intro',
      first: 0,
      sel: null,
      built: [],
      mistakes: 0,
      matched: 0,
      pick: null,
      answered: false,
      retried: {},
    };
    playerEl.hidden = false;
    document.body.style.overflow = 'hidden';
    draw();
  }
  const cur = () => L.queue[L.i];
  function draw() {
    const pct =
      L.phase === 'done' ? 100 : L.phase === 'intro' ? 0 : Math.round((L.i / L.queue.length) * 100);
    playerEl.innerHTML =
      '<div class="player"><div class="ptop"><button class="x" id="quit" aria-label="Close lesson">&times;</button><div class="bar" role="progressbar" aria-valuenow="' +
      pct +
      '" aria-valuemin="0" aria-valuemax="100"><i style="width:' +
      pct +
      '%"></i></div></div><div class="pmain"><div class="stage" id="stage"></div></div><div class="pfoot" id="foot"><div class="in" id="footin"></div></div></div>';
    $('#quit').onclick = () => {
      location.hash = '#/c/' + course.id;
    };
    stage();
  }
  function foot(kind, msg, label, enabled, fn) {
    $('#foot').className = 'pfoot' + (kind ? ' ' + kind : '');
    $('#footin').innerHTML =
      '<div class="msg">' +
      (msg || '') +
      '</div><button class="btn" id="act"' +
      (enabled ? '' : ' disabled') +
      '>' +
      label +
      '</button>';
    $('#act').onclick = fn;
  }
  function stage() {
    const st = $('#stage');
    if (L.phase === 'intro') {
      st.innerHTML =
        '<div class="intro"><h2>New words</h2>' +
        L.lesson.words
          .map(
            (w) =>
              '<div class="w"><b>' +
              esc(w[0]) +
              '</b><span class="mut">' +
              esc(w[1]) +
              '</span>' +
              sayBtn(w[0]) +
              '</div>'
          )
          .join('') +
        '</div>';
      return foot('', '', 'Start', true, () => {
        L.phase = 'ex';
        L.i = 0;
        draw();
      });
    }
    if (L.phase === 'done') return done();
    const e = cur();
    L.sel = null;
    L.built = [];
    L.mistakes = 0;
    L.matched = 0;
    L.pick = null;
    L.answered = false;
    if (e.type === 'mc' || e.type === 'listen') {
      st.innerHTML =
        '<h2>' +
        (e.type === 'listen'
          ? 'Tap what you hear'
          : e.dir === 'en-de'
            ? 'How do you say this?'
            : 'What does this mean?') +
        '</h2><div class="q-de">' +
        (e.type === 'listen' ? '' : esc(e.prompt)) +
        sayBtn(e.speak || e.prompt || '') +
        '</div><div class="opts">' +
        e.options
          .map(
            (o, i) =>
              '<button class="opt" data-o="' +
              i +
              '"><kbd>' +
              (i + 1) +
              '</kbd>' +
              esc(o) +
              '</button>'
          )
          .join('') +
        '</div>';
      st.querySelectorAll('.opt').forEach(
        (b) =>
          (b.onclick = () => {
            if (L.answered) return;
            L.sel = e.options[b.dataset.o];
            st.querySelectorAll('.opt').forEach((x) => x.classList.toggle('sel', x === b));
            foot('', '', 'Check', true, check);
          })
      );
    } else if (e.type === 'match') {
      const left = e.pairs.map((p) => p[0]),
        right = G.rng((L.i + 7) * 31)() > 0 ? e.pairs.map((p) => p[1]).sort() : [];
      st.innerHTML =
        '<h2>Match the pairs</h2><div class="match">' +
        left
          .map(
            (l, i) =>
              '<button class="opt" data-s="l" data-v="' +
              esc(l) +
              '">' +
              esc(l) +
              '</button><button class="opt" data-s="r" data-v="' +
              esc(right[i]) +
              '">' +
              esc(right[i]) +
              '</button>'
          )
          .join('') +
        '</div>';
      st.querySelectorAll('.opt').forEach(
        (b) =>
          (b.onclick = () => {
            if (L.answered || b.classList.contains('gone')) return;
            if (!L.pick || L.pick.dataset.s === b.dataset.s) {
              if (L.pick) L.pick.classList.remove('sel');
              L.pick = b;
              b.classList.add('sel');
              return;
            }
            const a = L.pick.dataset.s === 'l' ? L.pick : b,
              z = a === b ? L.pick : b,
              ok = e.pairs.some((p) => p[0] === a.dataset.v && p[1] === z.dataset.v);
            L.pick.classList.remove('sel');
            if (ok) {
              a.classList.add('gone');
              z.classList.add('gone');
              if (++L.matched === e.pairs.length) {
                L.answered = true;
                verdict(L.mistakes === 0, e, '');
              }
            } else {
              L.mistakes++;
              [a, z].forEach((x) => {
                x.classList.add('wrong', 'shake');
                setTimeout(() => x.classList.remove('wrong', 'shake'), 400);
              });
            }
            L.pick = null;
          })
      );
      return foot('', '', 'Check', false, () => {});
    } else if (e.type === 'build') {
      st.innerHTML =
        '<h2>Build this sentence</h2><div class="q-de">' +
        esc(e.prompt) +
        '</div><div class="slots" id="slots"></div><div class="bank" id="bank"></div>';
      const redraw = () => {
        $('#slots').innerHTML = L.built
          .map((i, k) => '<button class="tile" data-k="' + k + '">' + esc(e.bank[i]) + '</button>')
          .join('');
        $('#bank').innerHTML = e.bank
          .map(
            (t, i) =>
              '<button class="tile' +
              (L.built.indexOf(i) >= 0 ? ' used' : '') +
              '" data-i="' +
              i +
              '">' +
              esc(t) +
              '</button>'
          )
          .join('');
        $('#slots')
          .querySelectorAll('.tile')
          .forEach(
            (b) =>
              (b.onclick = () => {
                if (!L.answered) {
                  L.built.splice(+b.dataset.k, 1);
                  redraw();
                }
              })
          );
        $('#bank')
          .querySelectorAll('.tile')
          .forEach(
            (b) =>
              (b.onclick = () => {
                if (!L.answered && L.built.indexOf(+b.dataset.i) < 0) {
                  L.built.push(+b.dataset.i);
                  redraw();
                }
              })
          );
        foot('', '', 'Check', L.built.length > 0, check);
      };
      redraw();
    } else {
      st.innerHTML =
        '<h2>Type it in German</h2><div class="q-de">' +
        esc(e.prompt) +
        '</div><input class="typebox" id="tb" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"><div class="special">' +
        ['ä', 'ö', 'ü', 'ß']
          .map(
            (c) =>
              '<button type="button" data-ch="' +
              c +
              '" aria-label="Insert ' +
              c +
              '">' +
              c +
              '</button>'
          )
          .join('') +
        '</div>';
      const tb = $('#tb');
      tb.focus();
      st.querySelectorAll('[data-ch]').forEach(
        (b) =>
          (b.onclick = () => {
            tb.value += b.dataset.ch;
            tb.focus();
            foot('', '', 'Check', true, check);
          })
      );
      tb.oninput = () => foot('', '', 'Check', tb.value.trim().length > 0, check);
      tb.onkeydown = (ev) => {
        if (ev.key === 'Enter' && tb.value.trim() && !L.answered) check();
      };
    }
    if (e.type !== 'match') foot('', '', 'Check', false, check);
  }
  function check() {
    const e = cur();
    if (L.answered) return;
    const resp =
      e.type === 'build'
        ? L.built.map((i) => e.bank[i])
        : e.type === 'type'
          ? $('#tb').value
          : L.sel;
    const r = G.check(e, resp);
    L.answered = true;
    if (e.type === 'mc' || e.type === 'listen')
      $('#stage')
        .querySelectorAll('.opt')
        .forEach((b) => {
          const v = e.options[b.dataset.o];
          b.classList.remove('sel');
          if (v === e.answer) b.classList.add('right');
          else if (v === resp) b.classList.add('wrong');
        });
    verdict(r.ok, e, r.expected, r.note);
  }
  function verdict(ok, e, expected, note) {
    if (ok && !L.retried[e.id]) L.first++;
    if (!ok && !L.retried[e.id]) {
      L.retried[e.id] = 1;
      L.queue.push(Object.assign({}, e));
    }
    const msg = ok
      ? '<b>' + (note ? 'Correct' : 'Richtig!') + '</b>' + (note ? esc(note) : '')
      : '<b>Not quite</b>' +
        (expected ? 'Answer: ' + esc(expected) : 'Try those pairs again later.');
    foot(ok ? 'ok' : 'bad', msg, L.i === L.queue.length - 1 ? 'Finish' : 'Continue', true, next);
    $('#act').focus();
  }
  function next() {
    if (L.i < L.queue.length - 1) {
      L.i++;
      draw();
    } else {
      L.phase = 'done';
      draw();
    }
  }
  function done() {
    const st = load(),
      acc = L.first / L.total,
      prev = st.done[L.lesson.id],
      xp = G.xpFor(L.first, L.total);
    st.done[L.lesson.id] = {
      best: Math.max(prev ? prev.best : 0, acc),
      n: (prev ? prev.n : 0) + 1,
    };
    st.xp += xp;
    bumpStreak();
    save();
    const f = flatOf(course),
      at = f.findIndex((x) => x.lesson.id === L.lesson.id),
      nx = f[at + 1];
    $('#stage').innerHTML =
      '<div class="done-card"><div class="big">Lesson done</div><p class="mut">' +
      esc(L.lesson.title) +
      '</p><p>+' +
      xp +
      ' XP, ' +
      Math.round(acc * 100) +
      '% right first time</p></div>';
    foot('ok', '', nx ? 'Next lesson' : 'Back to course', true, () => {
      location.hash = nx ? '#/lesson/' + nx.lesson.id : '#/c/' + course.id;
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!L || L.phase !== 'ex' || e.target.tagName === 'INPUT') return;
    const c = cur();
    if (!c) return;
    if (/^[1-4]$/.test(e.key) && (c.type === 'mc' || c.type === 'listen') && !L.answered) {
      const b = $('#stage').querySelectorAll('.opt')[+e.key - 1];
      if (b) b.click();
    } else if (e.key === 'Enter') {
      const a = $('#act');
      if (a && !a.disabled) a.click();
    }
  });
  render();
})();
