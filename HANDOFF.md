# Handoff: QMLCamp

## Projects and facts
- Offline course site, vanilla JS, no build step, no CDN. Repo: github.com/JANO-de/QMLCamp (branch main).
- Files: `index.html`, `css/style.css`, `js/{i18n,parser,runtime,testkit,editor,app}.js`, `content/m1..m8.js`, `content/js1.js`, `content/i18n/{m1..m8,modules}.js`.
- Routes: `#/` welcome, `#/c/<course>`, `#/m/<module>`, `#/b/<block>`, `#/verify` (every lab starter must fail, every solution must pass).
- Block pattern per module: Theory, Lab, Quiz, Theory, Lab, Review. Schema: `window.QMLCAMP.modules.push({id,title,desc,blocks:[...]})`.
  - theory `{id,type:'theory',title,desc,lessons:[{title,html,example,q:{text,options,answer,why}}]}`
  - lab `{id,type:'lab',title,desc,desc2,files:{'main.qml':...},solution:{...},tests:[{story,run:t=>{...}}]}`
  - quiz `{id,type:'quiz',title,desc,questions:[...]}`
  - review `{id,type:'review',title,desc,html}`
- Test kit `t`: find/has/all/count/click/hover/advance/eq/near/expect/noErrors/rgb/nodes/bindingOf/isBound/declares/behaviorMs/source (throw to fail).
- i18n: `QMLCAMP.tr[lang][id] = {title,desc,intro,desc2,html,lessons:[{title,html,q:{text,options,why}}],questions:[...],stories:[...]}`. Languages en, ja, es (es-ES), de. Never translate code, identifiers, test strings or engine errors. Array lengths and order equal English. Missing keys fall back to English.
- Headless check on NixOS: `chromium --headless`, or Playwright with `playwright-driver.browsers` + `PLAYWRIGHT_BROWSERS_PATH`. `rg` may be missing; use grep.

## TODO (approved; do in order; mark [x]; ask before changing the list)
1. [x] Confirm this copy is the newest; merge anything the other copy has that this one lacks (translations m1 to m8, `js1.js`). Done: this repo is the newest. All other copies found (Trash `qmlcamp(1)`, Trash `qmlcamp-site[.2]`, MyNixOS deploy) are older or byte-identical; the only older one lacks i18n/`js1.js`, so nothing to merge.
2. [x] Rust: rebuild `rust.js` against `rust-lib.js` (lexer, parser, evaluator with ownership/borrow errors, traits, generics, `?`, iterators, closures, collections, `Rc/RefCell`, overflow panics); verify with sample programs. `rust-lib.js` is not in this repo yet; the user must add it. Done: `rust-lib.js` added; `rust.js` rewritten (~1050 lines) and verified with 90+ sample programs (node + headless Chromium), incl. ownership/borrow errors (E0382/E0499/E0502, NLL approximation), traits, generics, `?`, iterators, closures, HashMap/HashSet, `Rc`/`RefCell`, overflow/div0 panics. Known limit: `String` is a JS primitive so move-of-`String` is not enforced.
3. [x] Rust course (modules, labs, quizzes) passing `#/verify`; translate welcome/UI strings if new keys were added. Done: `content/rust1.js` added (course id `rust`, `lang:'rust'`, modules r1–r3, 3 labs). `js/app.js` made language-aware (`blockLang`, rust branch in `playground`/`runTests`/`viewLab`/`viewTheory`/`viewVerify`), `js/editor.js` gained an optional highlighter arg, `index.html` loads `js/rust.js`, `js/rust-lib.js`, `content/rust1.js`, `css/style.css` got `.rustout`, `js/i18n.js` got `output`/`errors` keys (en/es/de/ja). `#/verify` now 27/27 (24 QML+JS, 3 Rust). Fixed `rust-lib.js` kit: `out`/`lines` are getters (added an `out()` method first, then the getter overrode it — reverted to getters only).
4. [ ] Language switcher: finish untranslated block text (es, de, ja), one module per delivery.
5. [ ] Not requested yet (ask first): more courses, progress export/import.

## Current state
- Modules 1 to 8 done, 27 labs (20 QML + 4 JS + 3 Rust) passed `#/verify` on this repo, headless Chromium (Playwright), no page errors.
- i18n files m1 to m8 and `modules.js` are present, plus `content/js1.js` (JavaScript course) and `content/rust1.js` (Rust course).
- `tools/harness.html` is missing from the repo (not needed for `#/verify`).
- Rust: `rust-lib.js`, `rust.js` and `content/rust1.js` are in the repo and wired into `index.html`; the Rust course page, lab run and `#/verify` all work in headless Chromium.
- `AGENTS.md` added (progress-bar output rule + verification commands).

## Where the conversation stopped
TODO 3 done (Rust course passing `#/verify`, 27/27). Next: TODO 4 (finish es/de/ja block text, one module per delivery).

## Open questions
- Is `tools/harness.html` needed for `#/verify`? No — verify passes 27/27 without it.
- Does the other QMLCamp copy differ from this one? Only Trash `qmlcamp(1)` differs, and it is older (no i18n/`js1.js`). All i18n copies are byte-identical to this repo.
