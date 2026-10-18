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

`planner/index.html` (third site tab). Visual study planner: plans with tags and a timeline of blocks. Block types: Tasks (checklist, drives the progress bar), Note, Links (http/https only), List, Time (logged vs target minutes) and Milestone. Any block can be flagged as a key date.

- Templates menu / first run: `planner/templates.js` (`window.PLANNER_TEMPLATES`). Entries with `seed: true` are added the first time the Planner opens.
- Export: this plan or all plans as `.json`, or one plan as Markdown. Import: `.json` (single plan, `{plans:[...]}` or an array); imported plans are sanitised and never overwrite existing ones.
- Stored in the browser (`localStorage`, key `qmlcamp-planner-v1`). No build step, works from `file://`. QMLCamp and Planner use the Bricolage Grotesque font from Google Fonts when online and fall back to system fonts offline.

## Planner modes and home widgets

- The Planner always opens a plan in **reading mode** (plain text, no fields). Only task checkboxes and the time +/− buttons stay live so you can track progress. Press **Edit plan** to change titles, tags and blocks; **Done editing** goes back. Switching plans, reloading and importing all return to reading mode; a brand-new blank plan opens in edit mode. `planner/index.html#plan=<id>` opens a specific plan.
- The QMLCamp welcome page shows widgets: where you left off, overall progress, GENLearn stats and a **study plan viewer**. The plan selector in that widget picks which Planner plan is shown; the choice is stored in `qmlcamp-home-v1`.
- GENLearn uses a paper-notebook look (`genlearn/genlearn.css`), with light and dark (night desk) variants that follow the system setting.
