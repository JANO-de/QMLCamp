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
1. [ ] Confirm this copy is the newest; merge anything the other copy has that this one lacks (translations m1 to m8, `js1.js`).
2. [ ] Rust: rebuild `rust.js` against `rust-lib.js` (lexer, parser, evaluator with ownership/borrow errors, traits, generics, `?`, iterators, closures, collections, `Rc/RefCell`, overflow panics); verify with sample programs. `rust-lib.js` is not in this repo yet; the user must add it.
3. [ ] Rust course (modules, labs, quizzes) passing `#/verify`; translate welcome/UI strings if new keys were added.
4. [ ] Language switcher: finish untranslated block text (es, de, ja), one module per delivery.
5. [ ] Not requested yet (ask first): more courses, progress export/import.

## Current state
- Modules 1 to 8 done, 20 labs passed `#/verify` in the earlier copy. Not re-run on this repo.
- i18n files m1 to m8 and `modules.js` are present, plus `content/js1.js` (JavaScript course).
- `tools/harness.html` is missing from the repo.
- Rust: `rust-lib.js` and `rust.js` are not in the repo.

## Where the conversation stopped
Repo pushed with the whole site. Next: run `#/verify` on this copy, then TODO 1.

## Open questions
- Is `tools/harness.html` needed for `#/verify`?
- Does the other QMLCamp copy differ from this one?
