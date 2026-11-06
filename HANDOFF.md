# HANDOFF — Planner → Canvas (Obsidian-style)

Status: **spec only, no code written yet.** Everything below was derived from the user's request and from reading the repo (`QMLCamp.zip`, last commit `37ea86d`). Nothing here has been run or tested.

## 1. Goal (user's words, condensed)

- The Planner **starts as a canvas**, inspired by Obsidian Canvas.
- **Tabs under the Planner site tab = categories** for plans.
- **Plans are cards** on the canvas. Cards can be **arranged freely**.
- Any **block inside a card** can be **connected to any block in another card**; the connection shows an **arrow pointing at the target**.
- The user can **create many new types of modules** for plans (blocks inside cards).
- The user can add **widgets to the canvas**: drawings, calendars, tasks/todos, kanbans, "and lots of other things".

## 2. Interpretation (confirm with the user if wrong)

Hierarchy: `Category (tab = one canvas)` → `Card (= one plan, or a widget)` → `Block/module (inside a plan card)`.

1. A category tab owns one infinite canvas with its own pan/zoom.
2. Each existing plan becomes a **plan card** (title, tags, blocks stacked inside). Existing 6 block types become the first modules.
3. **Widget cards** are canvas items whose whole body is one widget (drawing, calendar, kanban…). They share the same drag/resize/connect behaviour as plan cards.
4. Connections: v1 only **within the same category**. A `card-link` module can jump to a card in another category.
5. The old vertical timeline is kept as an optional **List view** of the selected card (cheap to keep: it already exists). Open question Q1.

## 3. Current architecture (what exists today)

Plain HTML/CSS/JS, **no build step, no CDN** (only Google Fonts, with fallback), must work from `file://` and offline. Do not break that.

| Piece | Where | Notes |
|---|---|---|
| Planner UI | `planner/index.html`, `planner.js` (1334 lines, single IIFE), `planner.css` (842) | Site tabs `<nav class="tabs">`: QMLCamp / GENLearn / Planner |
| Data | `localStorage['qmlcamp-planner-v1']` = `{plans:[{id,title,tags[],blocks[]}], current}` | Block types: `tasks note links list time milestone` (`TYPES`, `ORDER`) |
| Sanitising | `cleanBlock`, `cleanPlan` | Whitelist rebuild: **unknown fields are dropped** (see risk R1) |
| Modes | `editing` flag | Reading mode by default, edit mode by button. Keep this idea |
| Extras | "Next up" (`nextUp`, `jumpNext`), undo toasts (`undoable`), tags, `templates.js` (`PLANNER_TEMPLATES`, `seed:true`), export JSON / Markdown (`toMd`), import (`importFile`) | Preserve all |
| Deep links | `planner/index.html#plan=<id>` | Used by the home widgets in `js/app.js` |
| Home widgets | `js/app.js` ~L227-430: `PLAN_KEY='qmlcamp-planner-v1'`, `readPlans`, `blockDone`, `planStats` | Reads `plans[].blocks[]` directly. **Must be updated together with the data change** |
| Sync | `js/sync.js` `KEYS=[…,'qmlcamp-planner-v1',…]`, Supabase `user_data.data jsonb` (one row per user, all keys) | First sign-in merges by `id` (arrays of objects merge by `id`); later last-write-wins per key |
| UI helpers | `js/ui.js` replaces alert/confirm/prompt with dialogs/toasts | Reuse, never call native dialogs |
| Theme | CSS vars `--bg --card --edge --rose/butter/sage/sky/lav/peach`, light+dark via `prefers-color-scheme` | Colours are the 6 names in `COLORS` |

## 4. Data model v2

New storage key **`qmlcamp-planner-v2`** (see R1 for why not reuse v1). Add it to `KEYS` in `js/sync.js`.

```jsonc
{
  "v": 2,
  "current": "<categoryId>",
  "categories": [{
    "id": "c1", "name": "Uni", "color": "sky", "order": 0,
    "view": { "x": 0, "y": 0, "zoom": 1 },
    "cards": [{
      "id": "k1", "kind": "plan",            // "plan" | "widget" | "frame"(group) | "text"
      "x": 120, "y": 80, "w": 340, "h": null, // h:null = auto height; w resizable
      "z": 3, "color": "lav", "collapsed": false,
      "title": "Bases de datos", "tags": [{"id":"t1","name":"E/R","color":"sky"}],
      "blocks": [{ "id":"b1", "type":"tasks", "label":"", "title":"", "exam":false, "tags":[], "data":{…} }],
      "widget": null                          // for kind:"widget": { "type":"kanban", "data":{…} }
    }],
    "edges": [{
      "id": "e1",
      "from": { "card":"k1", "block":"b1", "side":"right" },   // block optional -> card edge
      "to":   { "card":"k2", "block":"b7", "side":"left"  },
      "label": "", "color": "sage", "style": "curve",           // curve | straight | step
      "arrow": "end"                                            // end | both | none
    }]
  }]
}
```

Rules:
- **Every object in every array has an `id`** (cards, blocks, edges, tasks, columns…). The sync merge keys arrays by `id`.
- Block payload moves from flat fields (`tasks`, `text`, `links`…) to `data`, owned by its module's `sanitize()`. The migration maps v1 fields into `data`.
- Edge endpoints reference `block` ids. If a block is deleted the edge **falls back to the card** (do not delete silently). If the card is deleted its edges are removed (with Undo).
- Edges live in the category and reference cards by id (so moving cards never rewrites edges).
- Size guards: max 40 categories, 300 cards/category, 200 blocks/card, 1000 edges/category. Strings capped as today.

### Migration v1 → v2 (one-time, non-destructive)
1. On load, if `v2` is absent and `v1` exists: create category **"Plans"**, turn each v1 plan into a plan card laid out in a grid (3 columns, 360 px pitch), keep `current` → open that card focused.
2. **Never delete or rewrite v1.** Keep it as backup until the user confirms (Settings → "Remove old data").
3. First run with neither key: seed from `templates.js` as today (seed templates become cards in a default category).
4. Update `js/app.js` home widget to read v2 (fallback v1): plan list = all `kind:"plan"` cards, `planStats` counts tasks in their blocks via module `stats()` (see §6), links become `planner/index.html#cat=<id>&card=<id>`; keep `#plan=<id>` working (find the card by id).

## 5. Canvas engine (core)

- **Rendering:** one `world` div with `transform: translate(x,y) scale(z)`; cards are absolutely positioned DOM elements (text, inputs and a11y come free); edges in **one SVG layer** under the cards inside the same world. Drawing widgets use their own `<canvas>`/SVG inside the card.
- **Interaction (Pointer Events, so mouse + touch + pen):**
  - Pan: drag on empty space / space+drag / two-finger; zoom: wheel/pinch, 0.2–3×, zoom-to-cursor; "fit all", "reset zoom" buttons.
  - Cards: drag by header, resize by corner/edges (min 220×80), multi-select (shift-click / marquee), delete, duplicate, z-order (bring to front), colour, collapse.
  - Snap to a 10 px grid (toggle), alignment guides optional.
  - Add card: double-click empty canvas, toolbar "+", or drag from a palette. Cards can be dropped from the palette at the cursor.
  - **Undo/redo** (Ctrl+Z / Ctrl+Shift+Z): reuse the `undoable` idea but as a real history stack of model patches (cap 100).
  - Minimap (optional), search box that centres on a card/block (nice-to-have).
- **Modes:** *View* (default on load): pan/zoom, tick tasks, +/- time, follow links, toggle collapse. *Edit*: move/resize/connect/edit text/add blocks. Same philosophy as today's reading/edit split. A brand-new empty card opens in edit mode.
- **Performance:** only re-render the touched card; batch edge recalculation in `requestAnimationFrame`; cull cards fully outside the viewport when >150 cards; debounce `save()` (≈300 ms, plus `visibilitychange`/`pagehide`).

## 6. Connections (the key feature)

- Every block row inside a plan card shows a **port** (small dot) on both sides in Edit mode (hover/focus in View mode). Drag from a port to any other block's port **or onto any card** (card-level edge). Dropping on empty canvas offers "new card here" (quick-create).
- Edge anchor = the block's DOM rect, converted to world coordinates; if the block is scrolled out of an inner scroll area or the card is collapsed, **clamp to the card edge** at the nearest point. Recompute on card move/resize/collapse/block reorder/zoom.
- Render: SVG path (bezier by default), **arrowhead (marker) at the target**, optional label (click to edit), colour, style, double-arrow. Hit area ≥ 12 px stroke for touch. Click edge → select → delete / change style. Highlight edges of the selected card or block.
- Prevent duplicates (same from+to) and self-loops on the same block; allow card↔card and block↔block in the same card.
- A11y/keyboard: a "Connect…" action on the block menu opens a picker (list of cards/blocks) so connections do not require dragging.
- Export keeps edges (see §9).

## 7. Module system (the "create many new types" requirement)

Today types are hard-coded in `TYPES/ORDER` and the `if/else` ladders in `cleanBlock`, `bodyEl`, `blockEl`, `toMd`. Replace with a **registry** so adding a module = adding one file. Follow the repo's existing pattern (`custom/index.js` manifest + `window.*` registration).

```js
PlannerModules.register({
  id: 'kanban',                // /^[a-z][a-z0-9-]*$/; builtins reserved
  kind: 'widget',              // 'block' (inside plan cards) | 'widget' (whole card) | 'both'
  name: 'Kanban', icon: '▦', category: 'Organise',
  defaults() { return { columns: [...] } },
  sanitize(data, ctx) { return cleanData },      // whitelist + caps, returns a new object
  render(el, api)   { /* edit+view DOM, api.get()/api.set(patch)/api.mode */ },
  toMarkdown(data)  { return '...' },            // for export
  stats(data)       { return { total: 0, done: 0 } },   // feeds progress bars + home widget
  nextUp(data)      { return null },             // optional: feeds "Next up"
  ports: 'block' | 'items',    // block-level port (default) or per-item ports (e.g. kanban cards)
  size: { w: 320, h: 240, min: [220, 120] }
});
```

- Files: `planner/modules/<id>.js` plus `planner/modules/index.js` manifest (list of file names loaded by `index.html`), plus a `_template-module.js`. Unknown module ids found in data (module file removed) render as a **"missing module" placeholder that keeps the data untouched** (never drop it in sanitize).
- Optional: in-app "Module maker" (define a block as fields: text / number / checkbox / select / date / list) saved as data, so the user can create types without code. Phase 5 / nice-to-have.

### Initial module catalogue

**Blocks (inside plan cards)** — port the 6 existing ones unchanged in behaviour: `tasks`, `note`, `links`, `list`, `time`, `milestone`. New: `heading`, `markdown-note` (headings, bold, lists, checkboxes, `[[card]]` links), `date/countdown` (key dates), `progress` (auto from other blocks/cards), `table`, `code`, `quote`, `image` (data-URL, size-capped), `rating`, `habit-row`, `card-link` (jump to card/category), `divider`, `file-ref` (just a name/URL).

**Widgets (canvas cards)**: `drawing` (freehand pen/eraser/colours/shapes/text, undo, pressure optional), `calendar` (month/week, events, shows milestone/key-date blocks from other cards by link), `todo` (list with due date, priority, filters, per-item ports), `kanban` (columns, drag items between columns, per-item ports, WIP limit optional), `timeline/gantt-lite`, `sticky-note`, `text` (free text, markdown), `frame` (labelled group; moving it moves the cards inside), `pomodoro/timer`, `habit-tracker`, `counter`, `table/sheet-lite` (cells, sum row), `flashcards`, `image`, `embed-progress` (shows QMLCamp/GENLearn progress read from their keys), `weekly-planner`, `goal/OKR`, `mind-map`, `quote/inspiration`, `weather-free?` (skip: needs network).

Implementation order inside the catalogue: `sticky-note`, `todo`, `kanban`, `calendar`, `drawing`, then the rest.

## 8. Categories (tabs under the Planner tab)

- A second tab bar directly under the site `<nav class="tabs">`: one tab per category + "＋". Rename (double-click), recolour, reorder (drag), delete (confirm + Undo), duplicate. Horizontally scrollable on phones.
- Per-category state remembered: view (x,y,zoom), selection cleared on switch, last edited mode = View.
- Hash routing: `#cat=<id>` and `#cat=<id>&card=<id>` (centre + highlight card); keep `#plan=<id>` as alias.
- Optional: "All" tab showing cards of every category (read-only overview) — nice-to-have.

## 9. Import / export

- Keep: export one card (plan) / all, as JSON; one plan as Markdown; import sanitises and **never overwrites** existing data (new ids on collision, remap edges).
- Add: export/import a **whole category** (cards + edges); **export as Obsidian `.canvas`** (JSON Canvas: `nodes[{id,type:'text',x,y,width,height,color,text}]`, `edges[{id,fromNode,toNode,fromSide,toSide,toEnd:'arrow'}]`; blocks flattened to Markdown text) and import a `.canvas` file (text/file/group nodes → note cards/frames). Lossy by nature; say so in the UI.
- Import must accept v1 files (`{plans:[…]}` / array / single plan) and v2 files.

## 10. Sync & storage constraints

- `js/sync.js` pushes **all keys in one jsonb row**; large canvases (especially drawings and images) make every sync heavier. Caps: ≤ 150 KB per drawing (store strokes as quantised integer polylines, simplified), ≤ 200 KB per image (downscale before data-URL), total planner ≤ ~2 MB with a visible usage meter and a warning near the `localStorage` 5 MB limit. If this becomes a problem the escalation is IndexedDB for binary payloads (out of scope for v1).
- Add `qmlcamp-planner-v2` to `KEYS`. Check `merge()` in `sync.js` (L99-146) against the new arrays: arrays of **objects with `id`** merge by id; arrays of **numbers** (stroke points) are replaced wholesale, so keep strokes as objects `{id, pts:[…]}`.
- Keep the "saved/failed" notice (`saveFailed`) behaviour.

## 11. Non-functional requirements

- Vanilla JS, no build, no CDN, offline, `file://`. ES5-ish style of `planner.js` is fine; new files may use modern syntax that `js/app.js` already uses (it uses `const`/arrow functions).
- Split the code: `planner/core/{model,store,migrate,history}.js`, `canvas.js` (pan/zoom/cards), `edges.js`, `registry.js`, `modules/*.js`, `ui-*.js`. `planner.js` shrinks to boot code. Keep global names under `window.Planner*`.
- **Styling:** keep the pastel/ink palette already used (`--rose --butter --sage --sky --lav --peach`), light and dark; soft backgrounds that don't strain the eyes (user preference: pastel colours and easy-on-the-eyes page colours for anything generated). Canvas background = dotted grid.
- **Touch/mobile first-class:** pointer events, large hit areas, pinch zoom, bottom toolbar on small screens, no hover-only controls.
- **A11y:** every control keyboard reachable; cards focusable (arrow keys move the selected card by grid step, Enter = edit); edges have an accessible list ("Connections" panel per card); respect `prefers-reduced-motion`.
- i18n: Planner UI strings are English only today; keep them in one `STR` object so later translation is possible.
- Security: continue `safeUrl` (http/https only), never inject user text as HTML (`textContent` / `h()` helper), sanitise imports (`strict`).

## 12. Phases & acceptance criteria

**P0 — Foundations (no visible change).** Registry + `model/store/migrate`, v2 key, migration from v1, `sync.js` KEYS, `app.js` home widget on v2, `selftest.html` (pure assertions for sanitize, migration, edge dedupe).
*Done when:* existing plans survive migration (same titles/tags/blocks/ticks), home widget shows the same stats, v1 untouched.

**P1 — Canvas + categories.** Category tabs, pan/zoom, plan cards with existing 6 blocks, drag/resize/z-order, edit/view modes, persistence, Next-up and undo preserved, List view of a card.
*Done when:* user can create categories, add/move/resize cards, reload and find the same layout; works with touch.

**P2 — Connections.** Ports, drag-to-connect (block↔block, card↔card), arrowheads, labels, styles, fallback to card, delete/undo, keyboard connect picker.
*Done when:* moving/resizing/collapsing cards keeps arrows attached to the right block; deleting a block keeps a card-level edge.

**P3 — Module system + new blocks.** Manifest loader, `_template-module.js`, missing-module placeholder, new block catalogue, export/Markdown per module.

**P4 — Widgets.** `sticky-note`, `todo`, `kanban`, `calendar`, `drawing`, then the rest of §7; per-item ports for todo/kanban.

**P5 — Polish.** Minimap, search, multi-select, frames, `.canvas` import/export, usage meter, module maker (optional), README + this file updated, cross-category jump links.

## 13. Risks

- **R1 — Old code drops new data.** `cleanPlan` rebuilds from a whitelist; any device/tab still running the old JS against a shared key would erase `categories`/`cards`. Hence the **new key** and keeping v1 intact. Service-worker/browser caching of old JS is the same risk: bump a visible version string in the footer.
- **R2 — Sync size** (see §10) and last-write-wins per key: two devices editing the same canvas overwrite each other. Mitigation later: per-category keys (needs `sync.js` to support key prefixes).
- **R3 — Anchoring arrows to DOM blocks** inside transformed/scrolling containers is the fiddliest part; do it with `getBoundingClientRect()` ÷ zoom relative to the world origin, and test at zoom 0.2/1/3.
- **R4 — Drawing widget on touch** (palm rejection, scroll vs draw): decide with `touch-action` and a pen-only toggle.
- **R5 — Scope.** The catalogue in §7 is large; ship P0-P2 first, add modules incrementally.

## 14. Open questions (assumed defaults so work is not blocked)

- Q1: Keep the old vertical timeline as "List view"? *Assumed yes (cheap).*
- Q2: Can connections cross categories? *Assumed no in v1; `card-link` jumps instead.*
- Q3: One canvas per category vs. one canvas with category filters? *Assumed one canvas per category (tabs).*
- Q4: Should the home-page widget show cards from all categories? *Assumed yes, with the category name as a badge.*
- Q5: Is an in-app module maker wanted, or are code modules enough? *Assumed code modules first; maker in P5.*

## 15. Test plan (manual + `selftest.html`)

1. Fresh profile → seed template appears as cards in a default category.
2. Profile with v1 data → migrate, compare counts of plans/blocks/tasks done; v1 key still present.
3. Create 3 categories, 10 cards each, reload, switch tabs: layout/view restored.
4. Connect block→block across cards, move/resize/collapse/delete both ends; arrows stay correct; Undo/Redo.
5. Zoom 0.2/1/3 and pan on desktop and on a phone (touch): hit targets and arrows.
6. Import v1 JSON, v2 JSON, `.canvas`; export all three; re-import without duplicates/overwrite.
7. Sign in/out with sync configured: data round-trips; check merge on a second device.
8. Offline + `file://`: loads without network (fonts fall back).
9. Fill `localStorage` near quota: notice shown, no data loss.

## 16. Working rules for the next session

- Do the phases in order; after each phase update **this file** (progress log below) and the README "Planner" section.
- Deliver only changed files (relative paths from the repo root) and state **what was not tested**.
- Never run destructive migrations; never delete user data keys.

## 17. Progress log

| Date | Phase | Notes |
|---|---|---|
| 2026-11-06 | Handoff written | Repo analysed, no code changed, nothing executed |
| 2026-11-06 | P1 | Canvas + categories. `planner/core/history.js`, `planner/ui-{kit,card,list}.js`, `planner/canvas.js`; `planner/planner.js` is the app controller (categories, canvas/list modes, undo, import/export, `#cat=&card=` routing); builtin modules gained `render()`/`reset()`; `PlannerModel.reid/newCard/newCategory`; `PlannerStore.load({persist:true})` at boot writes v2 and leaves v1 byte-identical; cover cards + list view; selftest 36 assertions. |
| 2026-11-06 | P2 | Connections (card-level). `planner/core/model.js` keeps `card.icon` (8 chars); `planner/ui-card.js` icon picker + 4 side ports in edit mode; `planner/canvas.js` rewritten: bounded `board`, SVG link layer sized to the board (so lines are real hit targets), ports, drag-to-connect, curve/straight/step, end/both/no arrow, labels, edge selection; `planner/planner.js` `addEdge/updateEdge/deleteEdge`, edge toolbar, "Link to…" menu; `planner/planner.css` P2 styles; selftest 37 assertions. Node: `node run-selftest.js` 37/0; Chromium CDP smoke test passes (drag link, move/resize keeps it, edge click+Delete+Undo, icon, reload persistence, no exceptions). |
| 2026-11-06 | P3 | Module system extensions: manifest loader in `planner/index.html` (loads `PLANNER_MODULE_FILES`), added block modules `heading`, `markdown-note`, `date-countdown`, `progress`, `table`, `code`, `quote`, `image`, `rating`, `habit-row`, `card-link`, `divider`, `file-ref` and widgets/blocks `sticky-note`, `todo`, `kanban`, `calendar`, `drawing`. Missing-module placeholder already supported by model/UI. Styles added for new modules. |

### P2 notes for the next session

- Links are **card-level** (`from/to = {card, side}`), matching cover cards; block ends are still accepted by the model and fall back to the card. Ports exist only when `PlannerApp.editing`; invisible ports are `pointer-events: none` so they cannot steal clicks.
- The SVG layer is positioned/sized to `board` bounds and its `<g>` is translated by `-x0,-y0`; path coordinates stay in world units. Do not shrink it to 1×1 or pointer hit-testing stops working.
- Edge editing: select a line (click), then Style / Arrow / Link colour / Label / Swap / Delete link in the toolbar. Delete/Backspace also removes the selected link while the canvas has focus. Every edit is one undo step.
- `app.selectedEdge` is cleared by `render()` if the edge no longer exists; category switches clear it.
- Untested: pinch zoom with links at 0.2×/3×, touch port drag, long labels overlapping, Firefox/Safari, sync round-trip of `icon`/edges.
