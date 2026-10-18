# QMLCamp

## Creating courses

You can create new courses in two ways:

1. With the in-browser creator (recommended)
   - Open `index.html#/creator` on QMLCamp. Pick QML/JS/Rust course.
   - Create blocks (theory, lab, quiz, review), write lab files and tests, save to this browser.
   - Use "Export .js" to download a self-contained course file for the `custom/` folder. It prints a `custom/index.js` manifest line to paste in.
   - Drop the file into `custom/`, add the manifest line to `custom/index.js` and reload.
   - Run `#/verify` after adding a lab to confirm `starter fails, solution passes`.

2. From code (schema)
   - Each custom file registers itself. Templates: `custom/_template-qmlcamp.js` and `custom/_template-genlearn.js` (sets `window.FORGE_TEMPLATE_*`).
   - QMLCamp labs can use step-tests (`steps` array) compiled by `QmlTestKit.stepsToRun`; legacy `run(t=>{...})` also works inside the file but cannot be exported from the UI.
   - Reserved IDs: `qml`, `js`, `rust`. Custom course IDs must match `/^x-[a-z0-9-]+$/`.

Notes:
- All UI strings are English-only in the creator. Translations for custom courses use `course.tr[lang][blockId]` (stored in the browser copy) and are merged into `QMLCAMP.tr` on load.
- Progress and courses can be exported/imported together from the Welcome screen (`qmlcamp-progress.json`).
- GENLearn has its own creator (`genlearn/index.html#/creator/new`) and multi-course data model. Existing `#/german` continues to work.
- Works from `file://` and offline. No build step, no CDN.


## Planner

`planner/index.html` (third site tab). Blank visual study planner: plans with tags, blocks (days/phases) and task checklists, progress bar, move/flag blocks. Stored in the browser (`localStorage`, key `qmlcamp-planner-v1`); use Export/Import (`qmlcamp-plans.json`) to back up or move plans. No build step, works from `file://`.
