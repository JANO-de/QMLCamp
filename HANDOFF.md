# Handoff

## Projects and facts
QMLCamp: A {{.Name}} project. Repo /home/jano/Proyectos/QMLCamp. Spec in AGENTS.md.

<<<<<<< HEAD
## TODO (approved; do in order; mark [x]; ask before changing the list)
1. [x] Confirm this copy is the newest; merge anything the other copy has that this one lacks (translations m1 to m8, `js1.js`). Done: this repo is the newest. All other copies found (Trash `qmlcamp(1)`, Trash `qmlcamp-site[.2]`, MyNixOS deploy) are older or byte-identical; the only older one lacks i18n/`js1.js`, so nothing to merge.
2. [x] Rust: rebuild `rust.js` against `rust-lib.js` (lexer, parser, evaluator with ownership/borrow errors, traits, generics, `?`, iterators, closures, collections, `Rc/RefCell`, overflow panics); verify with sample programs. `rust-lib.js` is not in this repo yet; the user must add it. Done: `rust-lib.js` added; `rust.js` rewritten (~1050 lines) and verified with 90+ sample programs (node + headless Chromium), incl. ownership/borrow errors (E0382/E0499/E0502, NLL approximation), traits, generics, `?`, iterators, closures, HashMap/HashSet, `Rc`/`RefCell`, overflow/div0 panics. Known limit: `String` is a JS primitive so move-of-`String` is not enforced.
3. [x] Rust course (modules, labs, quizzes) passing `#/verify`; translate welcome/UI strings if new keys were added. Done: `content/rust1.js` added (course id `rust`, `lang:'rust'`, modules r1–r3, 3 labs). `js/app.js` made language-aware (`blockLang`, rust branch in `playground`/`runTests`/`viewLab`/`viewTheory`/`viewVerify`), `js/editor.js` gained an optional highlighter arg, `index.html` loads `js/rust.js`, `js/rust-lib.js`, `content/rust1.js`, `css/style.css` got `.rustout`, `js/i18n.js` got `output`/`errors` keys (en/es/de/ja). `#/verify` now 27/27 (24 QML+JS, 3 Rust). Fixed `rust-lib.js` kit: `out`/`lines` are getters (added an `out()` method first, then the getter overrode it — reverted to getters only).
4. [x] Language switcher: finish untranslated block text (es, de, ja), one module per delivery. Done: `content/i18n/js1.js` (JS course j1–j3) and `content/i18n/rust1.js` (Rust course r1–r3) added; module titles/descs added to `content/i18n/modules.js` (j1–j3) and inside `rust1.js` (r1–r3); both scripts wired into `index.html` after `m8.js`. Coverage checker: all block/lesson/question/story keys present and array lengths equal for es/de/ja on all three courses. Rendered j1–j3 and r1–r3 blocks in headless Chromium at es/de/ja; `#/verify` still 27/27.
5. [ ] Course creator: build new courses for both engines (QMLCamp + GENLearn) from UI and from code, full feature parity, custom/ folder, export/import, verify, docs.

## Current state
- Modules 1 to 8 done, 27 labs (20 QML + 4 JS + 3 Rust) passed `#/verify` on this repo, headless Chromium (Playwright), no page errors.
- i18n files m1 to m8 and `modules.js` are present, plus `content/i18n/js1.js` (JavaScript course j1–j3) and `content/i18n/rust1.js` (Rust course r1–r3, which also carries the Rust module titles).
- `tools/harness.html` is missing from the repo (not needed for `#/verify`).
- Rust: `rust-lib.js`, `rust.js` and `content/rust1.js` are in the repo and wired into `index.html`; the Rust course page, lab run and `#/verify` all work in headless Chromium.
- `AGENTS.md` added (progress-bar output rule + verification commands).
- Course creator (QMLCamp) scaffolded: `custom/index.js`, demos, templates, `js/custom.js`, `js/creator-blocks.js`, `js/creator.js`, `css/creator.css`, `js/testkit.js` (`stepsToRun` + export), `js/app.js` hooks (install, route `#/creator`, welcome/viewCourse badges/actions, progress includes courses, `QMLCampCore`, `ForgeCustom.boot`), `js/i18n.js` has `newCourse`, `index.html` loads creator scripts. GENLearn: multi-course foundation + `genlearn/creator.js`, `genlearn/creator.css`, `genlearn/index.html` loads them; app refactor planned; verified 27/27. Certain details (GENLearn full rewrite, runtime injection for new custom scripts under file://) not yet exercised.

## Where the conversation stopped
TODO 4 done: all block text for the JavaScript course (j1–j3) and Rust course (r1–r3) is translated into es/de/ja and verified in headless Chromium; `#/verify` 27/27. TODO 5 started: QMLCamp creator UI scaffolded and wired; GENLearn creator files added; `stepsToRun` added. README "Creating courses" missing. GENLearn app.js still single-course hardcoded; `genlearn/index.html` does not yet load `creator.js`, `creator.css` or `custom/` in the minimal form. `#/verify` baseline still 27/27 (no creator labs yet). `nix build .#default` not run.

## Open questions
- Is `tools/harness.html` needed for `#/verify`? No — verify passes 27/27 without it.
- Does the other QMLCamp copy differ from this one? Only Trash `qmlcamp(1)` differs, and it is older (no i18n/`js1.js`). All i18n copies are byte-identical to this repo.
- GENLearn routing: should we make `genlearn/index.html#/c/<id>` and `#/creator` work and keep `#/german` as alias? (must not break existing internal links). Yes — planned.
- For custom scripts loaded dynamically under `file://`, when a `.js` file is broken/syntax-error we get `load` event but no registration; `ForgeCustom` already detects this by re-checking manifest ids. Is this acceptable? Yes, empirically.
- Shall we require creator-made courses to be exportable-only (`exportable()`) before Preview/Verify in UI? Currently warned; keep that constraint unless steps are rewritten.
- `tools/harness.html` not in repo; `#/verify` needs no harness. Ignore.

(Only this last block changed.)
=======
## TODO
1. [ ] Set up development environment
2. [ ] Write core functionality
3. [ ] Add tests
4. [ ] Document API
5. [ ] Deploy to production

## Current state
Initial commit.

## Where the conversation started
Project created via Forge wizard.

## Open questions
- None yet.
>>>>>>> e13a51577b3c63223ff7de99c8a6b3a05c94239f
