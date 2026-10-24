// =============================================================================
//  Sync: users + cross-device save. Loaded first on QMLCamp, GENLearn, Planner.
//  GitHub Pages is static, so the "server" is the user's own private GitHub gist
//  (file qmlcamp-sync.json). User = GitHub account, signed in with a token
//  (classic PAT, scope "gist"). Synced localStorage keys are watched; every
//  change is pushed (debounced) and flushed when the page is hidden/closed.
//  Other devices pull on open, on focus and every 60 s.
// =============================================================================
(function () {
'use strict';
if (window.QmlSync) return;
var LS = window.localStorage, KEYS = ['qmlcamp.v1', 'qmlcamp.courses.v1', 'qmlcamp-planner-v1', 'qmlcamp-home-v1', 'genlearn.v1', 'genlearn.courses.v1'];
var CFG = 'qmlcamp-sync-v1', META = 'qmlcamp-sync-meta-v1', FILE = 'qmlcamp-sync.json', DESC = 'QMLCamp sync data', API = 'https://api.github.com';
var setRaw = Storage.prototype.setItem, delRaw = Storage.prototype.removeItem;
var cfg = readJ(CFG, null), meta = readJ(META, {}), ready = false, applying = false, dirty = {}, timer = 0, busy = false, again = false;
var remote = { keys: {} }, status = cfg ? 'idle' : 'off', msg = '', changedRemote = false, btn, dlg;

function readJ(k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function writeJ(k, v) { try { setRaw.call(LS, k, JSON.stringify(v)); } catch (e) {} }
function isKey(k) { return KEYS.indexOf(k) >= 0; }

// ---- watch writes (must be installed before the apps run)
Storage.prototype.setItem = function (k, v) {
  setRaw.call(this, k, v);
  if (this === LS && cfg && !applying && isKey(k) && ready) touch(k);
};
Storage.prototype.removeItem = function (k) {
  delRaw.call(this, k);
  if (this === LS && cfg && !applying && isKey(k) && ready) touch(k);
};
function touch(k) { meta[k] = Date.now(); dirty[k] = 1; writeJ(META, meta); setStatus('pending'); clearTimeout(timer); timer = setTimeout(sync, 1500); }

// ---- merge helpers (used only the first time a device meets remote data)
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function idArr(a) { return Array.isArray(a) && a.length && a.every(function (x) { return isObj(x) && x.id != null; }); }
function merge(older, newer) {
  if (isObj(older) && isObj(newer)) { var o = {}; Object.keys(older).concat(Object.keys(newer)).forEach(function (k) { o[k] = k in newer ? (k in older ? merge(older[k], newer[k]) : newer[k]) : older[k]; }); return o; }
  if (idArr(older) && idArr(newer)) {
    var m = {}, out = [];
    older.forEach(function (x) { m[x.id] = x; out.push(x.id); });
    newer.forEach(function (x) { if (!(x.id in m)) out.push(x.id); m[x.id] = x.id in m ? merge(m[x.id], x) : x; });
    return out.map(function (id) { return m[id]; });
  }
  return newer;
}
function mergeStr(oldS, newS) { try { return JSON.stringify(merge(JSON.parse(oldS), JSON.parse(newS))); } catch (e) { return newS; } }

// ---- GitHub
function gh(path, opt) {
  opt = opt || {};
  return fetch(API + path, { method: opt.method || 'GET', body: opt.body, keepalive: !!opt.keepalive, headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, cache: 'no-store' })
    .then(function (r) { if (r.status === 401) { var e = new Error('Token rejected (401). Sign in again.'); e.auth = 1; throw e; } if (!r.ok) throw new Error('GitHub error ' + r.status); return r.json(); });
}
function findGist() {
  if (cfg.gist) return Promise.resolve(cfg.gist);
  function page(n) {
    return gh('/gists?per_page=100&page=' + n).then(function (l) {
      for (var i = 0; i < l.length; i++) if (l[i].files && l[i].files[FILE]) return l[i].id;
      return l.length === 100 && n < 10 ? page(n + 1) : null;
    });
  }
  return page(1).then(function (id) {
    if (id) return id;
    var f = {}; f[FILE] = { content: JSON.stringify({ v: 1, keys: {} }) };
    return gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: f }) }).then(function (g) { return g.id; });
  }).then(function (id) { cfg.gist = id; writeJ(CFG, cfg); return id; });
}
function fetchRemote(id) {
  return gh('/gists/' + id).then(function (g) {
    var f = g.files && g.files[FILE];
    if (!f) return { keys: {} };
    var p = f.truncated ? fetch(f.raw_url, { cache: 'no-store' }).then(function (r) { return r.text(); }) : Promise.resolve(f.content);
    return p.then(function (t) { try { var j = JSON.parse(t); return j && isObj(j.keys) ? j : { keys: {} }; } catch (e) { return { keys: {} }; } });
  });
}
function payload() { var f = {}; f[FILE] = { content: JSON.stringify({ v: 1, at: new Date().toISOString(), keys: remote.keys }) }; return JSON.stringify({ files: f }); }

// ---- sync = pull, merge per key, push what is newer locally
function sync() {
  if (!cfg) return Promise.resolve();
  if (busy) { again = true; return Promise.resolve(); }
  busy = true; clearTimeout(timer); setStatus('syncing');
  return findGist().then(fetchRemote).then(function (r) {
    remote = r; var changed = [], push = false;
    KEYS.forEach(function (k) {
      var rk = r.keys[k], lv = LS.getItem(k), lt = meta[k] || 0;
      if (rk && typeof rk.v === 'string' || (rk && rk.v === null)) {
        if (!lt && lv != null && rk.v != null && lv !== rk.v) {          // first meeting: union
          var mv = mergeStr(rk.v, lv); if (mv !== rk.v) push = true;
          if (mv !== lv) { applying = true; setRaw.call(LS, k, mv); applying = false; changed.push(k); }
          meta[k] = Math.max(rk.t || 0, Date.now()); r.keys[k] = { t: meta[k], v: mv }; if (mv !== rk.v) push = true;
        } else if ((rk.t || 0) > lt) {                                     // remote newer
          applying = true; if (rk.v === null) delRaw.call(LS, k); else setRaw.call(LS, k, rk.v); applying = false;
          meta[k] = rk.t || 0; changed.push(k);
        } else if (lt > (rk.t || 0)) { r.keys[k] = { t: lt, v: lv }; push = true; }
      } else if (lv != null) { meta[k] = lt || Date.now(); r.keys[k] = { t: meta[k], v: lv }; push = true; }
    });
    dirty = {}; writeJ(META, meta);
    var done = push ? gh('/gists/' + cfg.gist, { method: 'PATCH', body: payload() }) : Promise.resolve();
    return done.then(function () {
      setStatus('ok'); cfg.last = Date.now(); writeJ(CFG, cfg);
      if (changed.length) onRemoteChange(changed);
    });
  }).catch(function (e) { setStatus(e.auth ? 'auth' : 'error', e.message || 'Offline'); })
    .then(function () { busy = false; ready = true; if (again) { again = false; sync(); } });
}
function onRemoteChange(keys) {
  changedRemote = true;
  var first = !sessionStorage.getItem('qmlcamp-sync-reload') || Date.now() - +sessionStorage.getItem('qmlcamp-sync-reload') > 15000;
  if (!window.__qmlSyncLive && first) { sessionStorage.setItem('qmlcamp-sync-reload', String(Date.now())); location.reload(); return; }
  banner();
}
function banner() {
  if (document.getElementById('qs-banner')) return;
  var b = document.createElement('div'); b.id = 'qs-banner'; b.className = 'qs-banner';
  b.innerHTML = 'Newer data from another device. <button type="button">Reload</button>';
  b.querySelector('button').onclick = function () { location.reload(); };
  document.body.appendChild(b);
}

// flush on close / hide (keepalive so it survives the page)
function flush() {
  if (!cfg || !cfg.gist || !Object.keys(dirty).length) return;
  Object.keys(dirty).forEach(function (k) { var v = LS.getItem(k); remote.keys[k] = { t: meta[k], v: v }; });
  dirty = {};
  var body = payload();
  try { gh('/gists/' + cfg.gist, { method: 'PATCH', body: body, keepalive: body.length < 60000 }).catch(function () { dirty = {}; KEYS.forEach(function (k) { dirty[k] = 1; }); }); } catch (e) {}
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') flush();
  else if (cfg) { window.__qmlSyncLive = true; sync(); }
});
setInterval(function () { if (cfg && document.visibilityState === 'visible') { window.__qmlSyncLive = true; sync(); } }, 60000);

// ---- sign in / out
function signIn(token) {
  token = String(token || '').trim();
  if (!token) return Promise.reject(new Error('Paste a token.'));
  var prev = cfg; cfg = { token: token };
  return gh('/user').then(function (u) {
    cfg.user = u.login;
    if (prev && prev.user && prev.user !== u.login) wipeLocal();
    writeJ(CFG, cfg); ready = false; return sync();
  }).then(function () { if (status === 'error' || status === 'auth') throw new Error(msg); }).catch(function (e) { if (!cfg || !cfg.user) cfg = prev; throw e; });
}
function wipeLocal() { applying = true; KEYS.forEach(function (k) { delRaw.call(LS, k); }); applying = false; meta = {}; writeJ(META, meta); }
function signOut() {
  var p = cfg && Object.keys(dirty).length ? sync() : Promise.resolve();
  return p.then(function () { delRaw.call(LS, CFG); delRaw.call(LS, META); cfg = null; status = 'off'; wipeLocal(); render(); });
}

// ---- UI
function setStatus(s, m) { status = s; msg = m || ''; render(); }
function label() {
  if (!cfg) return 'Sign in to sync';
  var n = cfg.user || 'user';
  return { idle: n, ok: '\u25CF ' + n + ' \u2713', pending: '\u25CF ' + n + ' \u2026', syncing: '\u21BB ' + n, error: '\u26A0 ' + n + ' (offline)', auth: '\u26A0 sign in again' }[status] || n;
}
function render() { if (btn) { btn.textContent = label(); btn.title = msg || ''; } if (dlg && dlg.open) fillDlg(); }
function fillDlg() {
  var box = dlg.querySelector('.qs-body');
  if (cfg && cfg.user) {
    box.innerHTML = '<p>Signed in as <b></b>. Progress, courses and plans save automatically to your private gist and open on any device.</p><p class="qs-s"></p><div class="qs-row"><button type="button" data-a="now">Sync now</button><button type="button" data-a="out">Sign out</button><button type="button" data-a="close">Close</button></div>';
    box.querySelector('b').textContent = cfg.user;
    box.querySelector('.qs-s').textContent = ({ ok: 'Up to date.', pending: 'Saving\u2026', syncing: 'Syncing\u2026', error: 'Offline or GitHub error; changes are kept and sent later. ' + msg, auth: msg, idle: '' })[status] || '';
  } else {
    box.innerHTML = '<p>Create a token (classic, scope <b>gist</b> only), paste it here. Your data lives in a private gist in your GitHub account.</p><p><a target="_blank" rel="noopener" href="https://github.com/settings/tokens/new?scopes=gist&description=QMLCamp%20sync">Create token</a></p><input type="password" autocomplete="off" placeholder="ghp_\u2026" aria-label="GitHub token"><p class="qs-s"></p><div class="qs-row"><button type="button" data-a="in">Sign in</button><button type="button" data-a="close">Close</button></div>';
  }
}
function buildUI() {
  var st = document.createElement('style');
  st.textContent = '.qs-btn{margin:0 0 6px auto;align-self:center;font:600 13px/1.4 inherit;font-family:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:4px 10px;cursor:pointer;opacity:.85}.qs-btn:hover{opacity:1}'
    + '.qs-dlg{border:1px solid currentColor;border-radius:10px;padding:16px 20px;max-width:420px;font:15px/1.5 system-ui,sans-serif;background:Canvas;color:CanvasText}.qs-dlg input{width:100%;box-sizing:border-box;padding:6px;margin:6px 0;font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px}'
    + '.qs-row{display:flex;gap:8px;flex-wrap:wrap}.qs-row button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:4px 12px;cursor:pointer}.qs-s{min-height:1.4em;opacity:.8}'
    + '.qs-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;padding:8px 14px;border-radius:8px;background:Canvas;color:CanvasText;border:1px solid currentColor;font:14px system-ui,sans-serif}.qs-banner button{margin-left:8px;font:inherit}';
  document.head.appendChild(st);
  var nav = document.querySelector('nav[aria-label="Sites"]');
  btn = document.createElement('button'); btn.type = 'button'; btn.className = 'qs-btn';
  if (nav) nav.appendChild(btn); else { btn.style.cssText += ';position:fixed;top:6px;right:8px;z-index:9999'; document.body.appendChild(btn); }
  dlg = document.createElement('dialog'); dlg.className = 'qs-dlg'; dlg.innerHTML = '<div class="qs-body"></div>'; document.body.appendChild(dlg);
  btn.onclick = function () { fillDlg(); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); };
  dlg.addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-a'), s = dlg.querySelector('.qs-s');
    if (a === 'close') dlg.close();
    else if (a === 'now') { window.__qmlSyncLive = true; sync(); }
    else if (a === 'out') { if (confirm('Sign out? The local copy on this device is removed; your data stays in your account.')) signOut().then(function () { fillDlg(); }); }
    else if (a === 'in') { s.textContent = 'Signing in\u2026'; signIn(dlg.querySelector('input').value).then(function () { window.__qmlSyncLive = false; fillDlg(); }).catch(function (er) { s.textContent = er.message || 'Failed'; }); }
  });
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI); else buildUI();

window.QmlSync = { sync: sync, signIn: signIn, signOut: signOut, keys: KEYS, status: function () { return status; } };
if (cfg) sync(); else ready = true;
})();
