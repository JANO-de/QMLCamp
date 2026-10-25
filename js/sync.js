// =============================================================================
//  Sync: users + cross-device save. Loaded first on QMLCamp, GENLearn, Planner.
//  Synced localStorage keys are watched; every change is pushed (debounced) and
//  flushed when the page is hidden/closed. Other devices pull on open, on focus
//  and every 60 s.
//
//  Accounts (e-mail + password) and storage live on a Supabase project; fill in
//  js/sync-config.js (see supabase/README.md). There is no other sign-in method.
// =============================================================================
(function () {
  'use strict';
  if (window.QmlSync) return;
  var LS = window.localStorage,
    KEYS = [
      'qmlcamp.v1',
      'qmlcamp.courses.v1',
      'qmlcamp-planner-v1',
      'qmlcamp-home-v1',
      'genlearn.v1',
      'genlearn.courses.v1',
    ];
  var CFG = 'qmlcamp-sync-v1',
    META = 'qmlcamp-sync-meta-v1';
  var SB = window.QML_SYNC_CONFIG || {},
    SB_URL = String(SB.supabaseUrl || '').replace(/\/+$/, ''),
    SB_KEY = SB.supabaseAnonKey || '',
    SB_MAIL = String(SB.emailDomain || '').trim(),
    // Without emailDomain people sign in with their real e-mail address.
    EMAIL_MODE = !SB_MAIL,
    CONFIGURED = !!(SB_URL && SB_KEY),
    signupMode = false, // account dialog: false = Sign in form, true = Create account form
    view = '', // '' | 'forgot': sub-view of the account dialog
    recovery = null; // set when the page was opened from a password-reset e-mail link
  var setRaw = Storage.prototype.setItem,
    delRaw = Storage.prototype.removeItem;
  // Sessions from older versions (GitHub token) are ignored: only account sessions are valid.
  var cfg = (function (c) {
      return c && c.backend === 'supabase' ? c : null;
    })(readJ(CFG, null)),
    meta = readJ(META, {}),
    ready = false,
    applying = false,
    dirty = {},
    timer = 0,
    busy = false,
    again = false;
  var remote = { keys: {} },
    status = cfg ? 'idle' : 'off',
    msg = '',
    changedRemote = false,
    btn,
    dlg;

  function readJ(k, d) {
    try {
      var v = JSON.parse(LS.getItem(k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  }
  function writeJ(k, v) {
    try {
      setRaw.call(LS, k, JSON.stringify(v));
    } catch (e) {}
  }
  function isKey(k) {
    return KEYS.indexOf(k) >= 0;
  }

  // ---- password-reset link: Supabase opens the site as  <site>#access_token=...&type=recovery
  // Take the token out of the address right away so the apps' routers never see it.
  (function () {
    var p = new URLSearchParams(location.hash.slice(1));
    if (p.get('type') === 'recovery' && p.get('access_token')) {
      recovery = { token: p.get('access_token') };
      history.replaceState(null, '', location.pathname + location.search + '#/');
    }
  })();

  // ---- watch writes (must be installed before the apps run)
  Storage.prototype.setItem = function (k, v) {
    setRaw.call(this, k, v);
    if (this === LS && cfg && !applying && isKey(k) && ready) touch(k);
  };
  Storage.prototype.removeItem = function (k) {
    delRaw.call(this, k);
    if (this === LS && cfg && !applying && isKey(k) && ready) touch(k);
  };
  function touch(k) {
    meta[k] = Date.now();
    dirty[k] = 1;
    writeJ(META, meta);
    setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(sync, 1500);
  }

  // ---- merge helpers (used only the first time a device meets remote data)
  function isObj(x) {
    return x && typeof x === 'object' && !Array.isArray(x);
  }
  function idArr(a) {
    return (
      Array.isArray(a) &&
      a.length &&
      a.every(function (x) {
        return isObj(x) && x.id != null;
      })
    );
  }
  function merge(older, newer) {
    if (isObj(older) && isObj(newer)) {
      var o = {};
      Object.keys(older)
        .concat(Object.keys(newer))
        .forEach(function (k) {
          o[k] = k in newer ? (k in older ? merge(older[k], newer[k]) : newer[k]) : older[k];
        });
      return o;
    }
    if (idArr(older) && idArr(newer)) {
      var m = {},
        out = [];
      older.forEach(function (x) {
        m[x.id] = x;
        out.push(x.id);
      });
      newer.forEach(function (x) {
        if (!(x.id in m)) out.push(x.id);
        m[x.id] = x.id in m ? merge(m[x.id], x) : x;
      });
      return out.map(function (id) {
        return m[id];
      });
    }
    return newer;
  }
  function mergeStr(oldS, newS) {
    try {
      return JSON.stringify(merge(JSON.parse(oldS), JSON.parse(newS)));
    } catch (e) {
      return newS;
    }
  }

  // What we store remotely: { v, at, keys: { storageKey: { t: time, v: text|null } } }
  function snapshot() {
    return { v: 1, at: new Date().toISOString(), keys: remote.keys };
  }
  // ---- backend: Supabase (username + password)
  // Plain REST calls, no SDK. A username is turned into a private e-mail address
  // (username@SB_MAIL) because Supabase Auth identifies users by e-mail. Each user's
  // data is ONE row of table user_data; row-level security (supabase/setup.sql)
  // lets a user read and write only their own row. The anon key is public by design.
  var refreshing = null;
  function sbError(r, j) {
    var m = j.error_description || j.msg || j.message || j.error || 'Server error ' + r.status;
    if (/invalid login/i.test(m)) m = 'Wrong username or password.';
    else if (/already (been )?registered/i.test(m))
      m = EMAIL_MODE ? 'That e-mail address already has an account.' : 'That username is taken.';
    else if (/email address .* is invalid/i.test(m))
      m =
        'The server rejected the e-mail domain "' +
        SB_MAIL +
        '". Set emailDomain in js/sync-config.js to a domain that has MX records (see supabase/README.md).';
    else if (/rate limit/i.test(m)) m = 'Too many attempts. Wait a minute and try again.';
    var e = new Error(m);
    if (r.status === 401) e.auth = 1;
    return e;
  }
  function sbCall(path, method, token, body, extra, keepalive) {
    var headers = Object.assign(
      {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + (token || SB_KEY),
        'Content-Type': 'application/json',
      },
      extra || {}
    );
    return fetch(SB_URL + path, {
      method: method,
      headers: headers,
      body: body,
      keepalive: !!keepalive,
      cache: 'no-store',
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = t ? JSON.parse(t) : {};
        } catch (e) {}
        if (!r.ok) throw sbError(r, j || {});
        return j;
      });
    });
  }
  function sbAuth(path, body) {
    return sbCall(path, 'POST', null, JSON.stringify(body));
  }
  function saveSession(s) {
    cfg.access = s.access_token;
    cfg.refresh = s.refresh_token || cfg.refresh;
    cfg.exp = Date.now() + (s.expires_in || 3600) * 1000;
    cfg.uid = (s.user && s.user.id) || cfg.uid;
    writeJ(CFG, cfg);
  }
  // A valid access token; renews it with the refresh token when it is about to expire.
  function sbToken() {
    if (cfg.access && cfg.exp - Date.now() > 60000) return Promise.resolve(cfg.access);
    if (!refreshing)
      refreshing = sbAuth('/auth/v1/token?grant_type=refresh_token', {
        refresh_token: cfg.refresh,
      }).then(
        function (s) {
          saveSession(s);
          refreshing = null;
          return cfg.access;
        },
        function (e) {
          refreshing = null;
          var er = new Error('Session expired. Sign in again.');
          er.auth = 1;
          throw er;
        }
      );
    return refreshing;
  }
  var sbBackend = {
    canFlush: function () {
      return !!cfg.uid;
    },
    pull: function () {
      return sbToken().then(function (tok) {
        return sbCall(
          '/rest/v1/user_data?select=data&user_id=eq.' + encodeURIComponent(cfg.uid),
          'GET',
          tok
        ).then(function (rows) {
          var d = rows && rows[0] && rows[0].data;
          return d && isObj(d.keys) ? d : { keys: {} };
        });
      });
    },
    push: function (keepalive) {
      var body = JSON.stringify([{ user_id: cfg.uid, data: snapshot() }]);
      // While the page is closing we cannot wait for a token refresh.
      var tok =
        keepalive && cfg.exp - Date.now() <= 5000
          ? Promise.reject(new Error('Token expired'))
          : sbToken();
      return tok.then(function (t) {
        return sbCall(
          '/rest/v1/user_data?on_conflict=user_id',
          'POST',
          t,
          body,
          { Prefer: 'resolution=merge-duplicates,return=minimal' },
          keepalive && body.length < 60000
        );
      });
    },
  };
  function be() {
    return sbBackend;
  }

  // ---- sync = pull, merge per key, push what is newer locally
  function sync() {
    if (!cfg) return Promise.resolve();
    if (busy) {
      again = true;
      return Promise.resolve();
    }
    busy = true;
    clearTimeout(timer);
    setStatus('syncing');
    return be()
      .pull()
      .then(function (r) {
        remote = r;
        var changed = [],
          push = false;
        KEYS.forEach(function (k) {
          var rk = r.keys[k],
            lv = LS.getItem(k),
            lt = meta[k] || 0;
          if ((rk && typeof rk.v === 'string') || (rk && rk.v === null)) {
            if (!lt && lv != null && rk.v != null && lv !== rk.v) {
              // first meeting: union
              var mv = mergeStr(rk.v, lv);
              if (mv !== rk.v) push = true;
              if (mv !== lv) {
                applying = true;
                setRaw.call(LS, k, mv);
                applying = false;
                changed.push(k);
              }
              meta[k] = Math.max(rk.t || 0, Date.now());
              r.keys[k] = { t: meta[k], v: mv };
              if (mv !== rk.v) push = true;
            } else if ((rk.t || 0) > lt) {
              // remote newer
              applying = true;
              if (rk.v === null) delRaw.call(LS, k);
              else setRaw.call(LS, k, rk.v);
              applying = false;
              meta[k] = rk.t || 0;
              changed.push(k);
            } else if (lt > (rk.t || 0)) {
              r.keys[k] = { t: lt, v: lv };
              push = true;
            }
          } else if (lv != null) {
            meta[k] = lt || Date.now();
            r.keys[k] = { t: meta[k], v: lv };
            push = true;
          }
        });
        dirty = {};
        writeJ(META, meta);
        var done = push ? be().push(false) : Promise.resolve();
        return done.then(function () {
          setStatus('ok');
          cfg.last = Date.now();
          writeJ(CFG, cfg);
          if (changed.length) onRemoteChange(changed);
        });
      })
      .catch(function (e) {
        setStatus(e.auth ? 'auth' : 'error', e.message || 'Offline');
      })
      .then(function () {
        busy = false;
        ready = true;
        if (again) {
          again = false;
          sync();
        }
      });
  }
  function onRemoteChange(keys) {
    changedRemote = true;
    var first =
      !sessionStorage.getItem('qmlcamp-sync-reload') ||
      Date.now() - +sessionStorage.getItem('qmlcamp-sync-reload') > 15000;
    if (!window.__qmlSyncLive && first) {
      sessionStorage.setItem('qmlcamp-sync-reload', String(Date.now()));
      sessionStorage.setItem(
        'qmlcamp-sync-notice',
        'Loaded your latest progress from your account.'
      );
      location.reload();
      return;
    }
    banner();
  }
  // Another device saved newer data while this page was open: offer a reload (never forced).
  var bannerShown = false;
  function banner() {
    if (bannerShown) return;
    bannerShown = true;
    QmlUI.toast('Newer progress from another device is available.', {
      label: 'Reload',
      ms: 600000,
      onClick: function () {
        location.reload();
      },
    });
  }

  // flush on close / hide (keepalive so it survives the page)
  function flush() {
    if (!cfg || !be().canFlush() || !Object.keys(dirty).length) return;
    Object.keys(dirty).forEach(function (k) {
      var v = LS.getItem(k);
      remote.keys[k] = { t: meta[k], v: v };
    });
    dirty = {};
    try {
      be()
        .push(true)
        .catch(function () {
          // Not sent: the local timestamps are newer, so the next sync pushes it.
          dirty = {};
          KEYS.forEach(function (k) {
            dirty[k] = 1;
          });
        });
    } catch (e) {}
  }
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
    else if (cfg) {
      window.__qmlSyncLive = true;
      sync();
    }
  });
  setInterval(function () {
    if (cfg && document.visibilityState === 'visible') {
      window.__qmlSyncLive = true;
      sync();
    }
  }, 60000);

  // ---- sign in / out
  // Username + password sign-in or sign-up (supabase backend).
  function signInAccount(id, password, create) {
    var u = String(id || '')
      .trim()
      .toLowerCase();
    var email = u;
    if (EMAIL_MODE) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u))
        return Promise.reject(new Error('Enter a valid e-mail address.'));
    } else {
      if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(u))
        return Promise.reject(
          new Error('Username: 3 to 32 characters, letters, digits, - and _ only.')
        );
      email = u + '@' + SB_MAIL;
    }
    if (String(password || '').length < 8)
      return Promise.reject(new Error('The password needs at least 8 characters.'));
    var prev = cfg;
    return sbAuth(create ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', {
      email: email,
      password: password,
    })
      .then(function (sess) {
        if (!sess.access_token)
          throw new Error(
            EMAIL_MODE
              ? 'Almost done: open the confirmation e-mail we sent you, then sign in here.'
              : 'The server wants e-mail confirmation. Turn off "Confirm email" in Supabase (Authentication > Providers > Email).'
          );
        if (prev && (prev.user !== u || prev.backend !== 'supabase')) wipeLocal();
        cfg = { backend: 'supabase', user: u };
        saveSession(sess);
        ready = false;
        return sync();
      })
      .then(function () {
        if (status === 'error' || status === 'auth') throw new Error(msg);
      });
  }
  // Password reset, step 1: Supabase e-mails a link that opens this site (see "Site URL").
  function sendReset(email) {
    email = String(email || '')
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return Promise.reject(new Error('Enter a valid e-mail address.'));
    return sbAuth('/auth/v1/recover', { email: email });
  }
  // Password reset, step 2: the link brought a temporary token; use it to set the new password.
  function setNewPassword(password) {
    if (String(password || '').length < 8)
      return Promise.reject(new Error('The password needs at least 8 characters.'));
    return sbCall('/auth/v1/user', 'PUT', recovery.token, JSON.stringify({ password: password }));
  }
  function wipeLocal() {
    applying = true;
    KEYS.forEach(function (k) {
      delRaw.call(LS, k);
    });
    applying = false;
    meta = {};
    writeJ(META, meta);
  }
  function signOut() {
    var p = cfg && Object.keys(dirty).length ? sync() : Promise.resolve();
    return p.then(function () {
      delRaw.call(LS, CFG);
      delRaw.call(LS, META);
      cfg = null;
      status = 'off';
      wipeLocal();
      render();
    });
  }

  // ---- UI
  function setStatus(s, m) {
    status = s;
    msg = m || '';
    render();
  }
  // Text of the top-bar button: always says what is happening, in plain words.
  function label() {
    if (!cfg) return 'Sign in to sync';
    return (
      {
        idle: '\u2713 Saved',
        ok: '\u2713 Saved',
        pending: 'Saving\u2026',
        syncing: '\u21BB Syncing\u2026',
        error: '\u26A0 Offline, will retry',
        auth: '\u26A0 Sign in again',
      }[status] || 'Sync'
    );
  }
  function render() {
    if (btn) {
      btn.textContent = label();
      btn.title = (cfg && cfg.user ? cfg.user + ': ' : '') + (msg || '');
      btn.setAttribute(
        'aria-label',
        (cfg && cfg.user ? 'Sync, signed in as ' + cfg.user + '. ' : '') + label()
      );
    }
    // "Sign in to keep your progress" cards on the pages disappear once signed in.
    Array.prototype.forEach.call(document.querySelectorAll('.qs-promo'), function (e) {
      e.hidden = !!cfg;
    });
    if (dlg && dlg.open) fillDlg();
  }
  // Live help under the form: says exactly what is still missing; the main button stays
  // disabled until the form can succeed.
  function refreshForm() {
    var u = dlg.querySelector('[data-f="user"]'),
      p = dlg.querySelector('[data-f="pass"]'),
      go = dlg.querySelector('.qs-main'),
      hint = dlg.querySelector('.qs-hint');
    if (!u || !p || !go || !hint) return;
    var name = u.value.trim();
    var uOk = EMAIL_MODE
      ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(name)
      : /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/.test(name);
    var pOk = p.value.length >= 8;
    if (signupMode) {
      var miss = [];
      if (!uOk)
        miss.push(
          EMAIL_MODE ? 'a valid e-mail address' : 'a username (3 to 32 letters, digits, - or _)'
        );
      if (!pOk) miss.push('a password with 8+ characters (' + p.value.length + '/8)');
      hint.textContent = miss.length
        ? 'Still needed: ' + miss.join(' and ') + '.'
        : '\u2713 Looks good.';
      go.disabled = !(uOk && pOk);
    } else {
      hint.textContent = '';
      go.disabled = !(name && p.value);
    }
  }
  function fillDlg() {
    var box = dlg.querySelector('.qs-body');
    if (cfg && cfg.user) {
      box.innerHTML =
        '<p>Signed in as <b></b>. Progress, courses and plans save automatically to <span class="qs-w"></span> and open on any device.</p><p class="qs-s"></p><div class="qs-row"><button type="button" data-a="now">Sync now</button><button type="button" data-a="out">Sign out</button><button type="button" data-a="close">Close</button></div>';
      box.querySelector('b').textContent = cfg.user;
      box.querySelector('.qs-w').textContent = 'your account on the server';
      box.querySelector('.qs-s').textContent =
        {
          ok: 'Up to date.',
          pending: 'Saving\u2026',
          syncing: 'Syncing\u2026',
          error: 'Offline or server error; changes are kept and sent later. ' + msg,
          auth: msg,
          idle: '',
        }[status] || '';
    } else if (recovery) {
      box.innerHTML =
        '<p>Choose a new password for your account.</p><input data-f="newpass" type="password" autocomplete="new-password" placeholder="new password (8+ characters)" aria-label="New password"><p class="qs-s"></p><div class="qs-row"><button type="button" data-a="setpass">Save password</button><button type="button" data-a="close">Close</button></div>';
    } else if (CONFIGURED && view === 'forgot') {
      box.innerHTML =
        '<p>Enter your e-mail address and we send you a link to choose a new password.</p><input data-f="user" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="e-mail" aria-label="E-mail"><p class="qs-s"></p><div class="qs-row"><button type="button" data-a="sendreset">Send link</button><button type="button" data-a="back">Back</button></div>';
    } else if (CONFIGURED) {
      var who = EMAIL_MODE ? 'e-mail' : 'username';
      box.innerHTML =
        '<h2 class="qs-h">' +
        (signupMode ? 'Create your account' : 'Sign in') +
        '</h2><p>' +
        (signupMode
          ? 'One account keeps your progress, courses and plans on every device.'
          : 'Welcome back. Sign in to load your progress on this device.') +
        '</p><label class="qs-l">' +
        (EMAIL_MODE ? 'E-mail address' : 'Username') +
        '<input data-f="user" type="' +
        (EMAIL_MODE ? 'email' : 'text') +
        '" autocomplete="' +
        (EMAIL_MODE ? 'email' : 'username') +
        '" autocapitalize="off" spellcheck="false" placeholder="' +
        who +
        '"></label><label class="qs-l">Password<input data-f="pass" type="password" autocomplete="' +
        (signupMode ? 'new-password' : 'current-password') +
        '" placeholder="8 or more characters"></label><label class="qs-show"><input type="checkbox" data-a="showpass"> Show password</label><p class="qs-hint" aria-live="polite"></p><p class="qs-s" aria-live="polite"></p><div class="qs-row"><button type="button" class="qs-main" data-a="' +
        (signupMode ? 'signup' : 'login') +
        '">' +
        (signupMode ? 'Create account' : 'Sign in') +
        '</button><button type="button" data-a="close">Close</button></div><p class="qs-alt">' +
        (signupMode
          ? 'Already have an account? <a href="#" data-a="togglesignup">Sign in</a>'
          : 'New here? <a href="#" data-a="togglesignup">Create an account</a>') +
        '</p>' +
        (EMAIL_MODE && !signupMode
          ? '<p class="qs-alt"><a href="#" data-a="forgot">Forgot password?</a></p>'
          : '');
    } else {
      // Not configured: say so plainly instead of offering anything else.
      box.innerHTML =
        '<h2 class="qs-h">Accounts are not set up yet</h2><p>This site has no account server configured. The site owner needs to fill in <b>js/sync-config.js</b> (steps in supabase/README.md) and publish it. If you are the owner and just did that, hard-refresh this page (Ctrl+Shift+R).</p><div class="qs-row"><button type="button" data-a="close">Close</button></div>';
    }
    refreshForm();
  }
  function openDialog() {
    fillDlg();
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  }
  function buildUI() {
    var st = document.createElement('style');
    st.textContent =
      '.qs-btn{margin:0 0 6px auto;align-self:center;font:600 13px/1.4 inherit;font-family:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:4px 10px;cursor:pointer;opacity:.85}.qs-btn:hover{opacity:1}' +
      '.qs-dlg{border:1px solid currentColor;border-radius:10px;padding:16px 20px;max-width:420px;font:15px/1.5 system-ui,sans-serif;background:Canvas;color:CanvasText}.qs-dlg input{width:100%;box-sizing:border-box;padding:6px;margin:6px 0;font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px}' +
      '.qs-row{display:flex;gap:8px;flex-wrap:wrap}.qs-row button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:4px 12px;cursor:pointer}.qs-s{min-height:1.4em;opacity:.8}.qs-alt{font-size:13px;margin:10px 0 0}' +
      '.qs-dlg{width:min(92vw,420px);max-height:90vh;overflow:auto;box-sizing:border-box}.qs-h{font-size:18px;margin:0 0 6px}' +
      '.qs-l{display:block;font-size:13px;margin:10px 0 0}.qs-l input{display:block;padding:10px;font-size:16px}' +
      '.qs-show{display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0}.qs-show input{width:auto;margin:0}' +
      '.qs-hint{font-size:13px;min-height:1.3em;margin:4px 0}' +
      '.qs-row button{min-height:44px;padding:8px 16px;border-radius:8px}.qs-row .qs-main{background:currentColor}.qs-row .qs-main{color:Canvas;mix-blend-mode:normal}' +
      '.qs-row button:disabled{opacity:.45;cursor:not-allowed}.qs-btn{min-height:36px}' +
      '.qs-btn:focus-visible,.qs-dlg :focus-visible{outline:3px solid #4c9ffe;outline-offset:2px}' +
      '.qs-promo{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 14px;margin:12px 0;border:1px solid currentColor;border-radius:10px;font-size:14px}.qs-promo button{font:inherit;font-weight:600;min-height:40px;padding:6px 14px;border-radius:8px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer}' +
      '.qs-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;padding:8px 14px;border-radius:8px;background:Canvas;color:CanvasText;border:1px solid currentColor;font:14px system-ui,sans-serif}.qs-banner button{margin-left:8px;font:inherit}';
    document.head.appendChild(st);
    var nav = document.querySelector('nav[aria-label="Sites"]');
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qs-btn';
    if (nav) nav.appendChild(btn);
    else {
      btn.style.cssText += ';position:fixed;top:6px;right:8px;z-index:9999';
      document.body.appendChild(btn);
    }
    dlg = document.createElement('dialog');
    dlg.className = 'qs-dlg';
    dlg.innerHTML = '<div class="qs-body"></div>';
    document.body.appendChild(dlg);
    btn.onclick = openDialog;
    // After an automatic reload (new data arrived) say why the page just refreshed.
    var notice = sessionStorage.getItem('qmlcamp-sync-notice');
    if (notice) {
      sessionStorage.removeItem('qmlcamp-sync-notice');
      QmlUI.toast(notice);
    }
    dlg.addEventListener('input', refreshForm);
    dlg.addEventListener('keydown', function (e) {
      // Enter in a field presses the main button (if it is enabled).
      if (e.key === 'Enter' && e.target.matches && e.target.matches('input[data-f]')) {
        var go = dlg.querySelector('.qs-main, [data-a="sendreset"], [data-a="setpass"]');
        if (go && !go.disabled) {
          e.preventDefault();
          go.click();
        }
      }
    });
    dlg.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a'),
        s = dlg.querySelector('.qs-s');
      function field(n) {
        var i = dlg.querySelector('[data-f="' + n + '"]');
        return i ? i.value : '';
      }
      function done() {
        window.__qmlSyncLive = false;
        fillDlg();
      }
      function fail(er) {
        s.textContent = er.message || 'Failed';
      }
      if (a === 'showpass') {
        // (a checkbox: the click handler runs after the state changed)
        dlg.querySelector('[data-f="pass"]').type = e.target.checked ? 'text' : 'password';
        return;
      } else if (a === 'togglesignup') {
        e.preventDefault();
        signupMode = !signupMode;
        fillDlg();
      } else if (a === 'forgot' || a === 'back') {
        e.preventDefault();
        view = a === 'forgot' ? 'forgot' : '';
        fillDlg();
      } else if (a === 'sendreset') {
        s.textContent = 'Sending\u2026';
        sendReset(field('user'))
          .then(function () {
            s.textContent =
              'If that address has an account, a link is on its way. Check your inbox.';
          })
          .catch(fail);
      } else if (a === 'setpass') {
        s.textContent = 'Saving\u2026';
        setNewPassword(field('newpass'))
          .then(function () {
            recovery = null;
            view = '';
            fillDlg();
            dlg.querySelector('.qs-s').textContent =
              'Password changed. Sign in with the new password.';
          })
          .catch(fail);
      } else if (a === 'close') dlg.close();
      else if (a === 'now') {
        window.__qmlSyncLive = true;
        sync();
      } else if (a === 'out') {
        QmlUI.confirm(
          'Sign out of ' +
            (cfg && cfg.user) +
            '?\n\nThe copy of your progress on THIS device is removed. Everything stays safe in your account, and you get it back when you sign in again.',
          { ok: 'Sign out', danger: true }
        ).then(function (yes) {
          if (yes)
            signOut().then(function () {
              fillDlg();
            });
        });
      } else if (a === 'login' || a === 'signup') {
        s.textContent = a === 'signup' ? 'Creating account\u2026' : 'Signing in\u2026';
        signInAccount(field('user'), field('pass'), a === 'signup')
          .then(done)
          .catch(fail);
      }
    });
    render();
    if (recovery) {
      fillDlg();
      dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();

  window.QmlSync = {
    sync: sync,
    signInAccount: signInAccount,
    signOut: signOut,
    // A small "Sign in to keep your progress on every device" card; hides itself once signed in.
    promo: function (text, buttonText) {
      var d = document.createElement('div');
      d.className = 'qs-promo';
      d.hidden = !!cfg;
      var t = document.createElement('span');
      t.textContent = text;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = buttonText;
      b.onclick = function () {
        if (dlg) openDialog();
      };
      d.append(t, b);
      return d;
    },
    open: function () {
      if (dlg) openDialog();
    },
    keys: KEYS,
    status: function () {
      return status;
    },
  };
  if (cfg) sync();
  else ready = true;
})();
