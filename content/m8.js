// =============================================================================
//  Module 8: Final Project - build a Dynamic Island
//  Blocks: Theory -> Step 1..5 (labs) -> Quiz -> Final exam (lab) -> Review
//  Each step starts from the finished code of the previous one. The QML sources below carry
//  //#Sn markers: lines of step n are removed (and replaced by a TODO) in the starter.
// =============================================================================
(function () {
  // ---- marker processing ------------------------------------------------------------
  function build(src, step, solved) {
    const out = []; let cur = null;
    for (const line of src.split('\n')) {
      const m = line.match(/^(\s*)\/\/#S(\d+)(?: "(.*)")?\s*$/);
      if (m) { cur = { n: +m[2], todo: m[3] || '', ind: m[1] }; continue; }
      if (/^\s*\/\/#end\s*$/.test(line)) {
        if (cur && cur.n === step && !solved) cur.todo.split('|').forEach((t, i) => out.push(cur.ind + (i ? '//       ' : '// TODO: ') + t));
        cur = null; continue;
      }
      if (!cur || cur.n < step || (cur.n === step && solved)) out.push(line);
    }
    return out.join('\n');
  }
  const files = (srcs, step, solved) => { const o = {}; for (const k of Object.keys(srcs)) o[k] = build(srcs[k], step, solved); return o; };

  // ---- the project sources ----------------------------------------------------------
  const MAIN_A = `import QtQuick
import Quickshell
//#S3
import Quickshell.Io
//#end

ShellRoot {
  //#S1 "PanelWindow (id: win): anchored top, left and right, implicitHeight 150, exclusiveZone 0,|color 'transparent'. Inside it: Island { id: island }"
  PanelWindow {
    id: win
    anchors { top: true; left: true; right: true }
    implicitHeight: 150
    exclusiveZone: 0
    color: "transparent"

    Island { id: island }
  }
  //#end

  //#S3 "IpcHandler with target 'osd' and a function volume(v: int) that calls Store.showVolume(v)"
  IpcHandler {
    target: "osd"
    function volume(v: int): void { Store.showVolume(v) }
  }
  //#end

  //#S4 "IpcHandler with target 'notify': push(app: string, text: string) calls Store.notify(app, text),|and clear() calls Store.clearAll()"
  IpcHandler {
    target: "notify"
    function push(app: string, text: string): void { Store.notify(app, text) }
    function clear(): void { Store.clearAll() }
  }
  //#end
}
`;
  const MAIN_B = `import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland

ShellRoot {
  Variants {
    model: Quickshell.screens

    PanelWindow {
      id: win
      required property var modelData
      screen: modelData
      anchors { top: true; left: true; right: true }
      implicitHeight: 150
      exclusiveZone: 0
      color: "transparent"
      mask: Region { item: island }
      WlrLayershell.layer: WlrLayer.Overlay
      WlrLayershell.namespace: "island"

      Island { id: island }
    }
  }

  IpcHandler {
    target: "osd"
    function volume(v: int): void { Store.showVolume(v) }
  }

  IpcHandler {
    target: "notify"
    function push(app: string, text: string): void { Store.notify(app, text) }
    function clear(): void { Store.clearAll() }
  }
}
`;
  const STORE = `pragma Singleton
import QtQuick
import Quickshell

Singleton {
  id: store

  //#S1 "a SystemClock (id: sc, precision SystemClock.Seconds) and|readonly property string time: 'HH:MM' with two digits each (write a pad() helper)"
  function pad(n) { return (n < 10 ? "0" : "") + n }
  readonly property string time: pad(sc.hours) + ":" + pad(sc.minutes)
  SystemClock { id: sc; precision: SystemClock.Seconds }
  //#end

  //#S2 "property string mode: 'idle' (the modes are idle, osd, notify, expanded)|function toggleExpanded(): expanded -> idle, anything else -> expanded"
  property string mode: "idle"
  function toggleExpanded() { mode = mode === "expanded" ? "idle" : "expanded" }
  //#end

  //#S3 "property int volume: 40, and a Timer (id: osdTimer, interval 1500) that goes back to idle when mode is osd|function showVolume(v): clamp v to 0..100; unless mode is expanded: mode = 'osd' and osdTimer.restart()"
  property int volume: 40
  Timer {
    id: osdTimer
    interval: 1500
    onTriggered: { if (store.mode === "osd") store.mode = "idle" }
  }
  function showVolume(v) {
    volume = Math.max(0, Math.min(100, v))
    if (mode !== "expanded") { mode = "osd"; osdTimer.restart() }
  }
  //#end

  //#S4 "readonly property var notes: notesModel, with ListModel { id: notesModel } (roles app and text)|a Timer noteTimer (3000 ms): back to idle when mode is notify|notify(app, text): insert at index 0, keep at most 4 rows, unless expanded: mode = 'notify' + restart the timer|dismiss(i): remove row i; if no rows are left and mode is expanded, mode = 'idle'|clearAll(): clear the model; if mode is expanded, mode = 'idle'"
  readonly property var notes: notesModel
  ListModel { id: notesModel }
  Timer {
    id: noteTimer
    interval: 3000
    onTriggered: { if (store.mode === "notify") store.mode = "idle" }
  }
  function notify(app, text) {
    notesModel.insert(0, { app: app, text: text })
    while (notesModel.count > 4) notesModel.remove(notesModel.count - 1)
    if (mode !== "expanded") { mode = "notify"; noteTimer.restart() }
  }
  function dismiss(i) {
    notesModel.remove(i)
    if (notesModel.count === 0 && mode === "expanded") mode = "idle"
  }
  function clearAll() {
    notesModel.clear()
    if (mode === "expanded") mode = "idle"
  }
  //#end
}
`;
  const ISLAND = `import QtQuick

Rectangle {
  id: pill
  anchors.horizontalCenter: parent.horizontalCenter
  y: 8
  width: 120; height: 28
  radius: Math.min(height / 2, 20)
  color: "black"

  //#S2 "states: a State for osd (220 x 44), notify (300 x 56) and expanded (320 x 130), each with|when: Store.mode === '...' and a PropertyChanges on this pill (width and height)|Behavior on width and Behavior on height, each with a NumberAnimation of 250 ms"
  states: [
    State { name: "osd"; when: Store.mode === "osd"; PropertyChanges { target: pill; width: 220; height: 44 } },
    State { name: "notify"; when: Store.mode === "notify"; PropertyChanges { target: pill; width: 300; height: 56 } },
    State { name: "expanded"; when: Store.mode === "expanded"; PropertyChanges { target: pill; width: 320; height: 130 } }
  ]
  Behavior on width { NumberAnimation { duration: 250 } }
  Behavior on height { NumberAnimation { duration: 250 } }
  //#end

  Text {
    id: timeLabel
    anchors.centerIn: parent
    color: "white"
    text: Store.time
    //#S2 "show the label only while Store.mode is idle"
    visible: Store.mode === "idle"
    //#end
  }

  //#S3 "OSD content, shown only while Store.mode === 'osd': an Item filling the pill with|a Text 'Volume ' + Store.volume at x: 16 (vertically centered), and a track Rectangle|(80 x 6, radius 3, color '#444444', right margin 16, vertically centered) holding a fill Rectangle|(height of the track, radius 3, color '#4cd964', width: track width * Store.volume / 100)"
  Item {
    anchors.fill: parent
    visible: Store.mode === "osd"
    Text {
      x: 16
      anchors.verticalCenter: parent.verticalCenter
      color: "white"
      text: "Volume " + Store.volume
    }
    Rectangle {
      width: 80; height: 6; radius: 3
      color: "#444444"
      anchors.right: parent.right
      anchors.rightMargin: 16
      anchors.verticalCenter: parent.verticalCenter
      Rectangle {
        height: parent.height; radius: 3
        color: "#4cd964"
        width: parent.width * Store.volume / 100
      }
    }
  }
  //#end

  //#S4 "idle badge: a gold Text '● ' + Store.notes.count, visible only in idle mode with at least one note, at the right edge|notify content: a Column (visible only in notify mode, centered) with two Texts: the app (color '#9fb4ff') and the text|of the newest note (Store.notes.get(0)); guard with Store.notes.count > 0|expanded list: a ListView (visible only in expanded mode, x: 10, y: 34, width: parent.width - 20, height: parent.height - 44,|clip, spacing 4, model Store.notes). Delegate: Rectangle (width ListView.view.width, height 28, radius 6, color '#222222') with a white Text|model.app + ': ' + model.text, and a MouseArea (28 x 28, anchors.right: parent.right) that calls Store.dismiss(index)"
  Text {
    visible: Store.mode === "idle" && Store.notes.count > 0
    anchors.verticalCenter: parent.verticalCenter
    anchors.right: parent.right
    anchors.rightMargin: 8
    color: "gold"
    text: "● " + Store.notes.count
  }
  Column {
    visible: Store.mode === "notify"
    anchors.centerIn: parent
    Text { color: "#9fb4ff"; text: Store.notes.count > 0 ? Store.notes.get(0).app : "" }
    Text { color: "white"; text: Store.notes.count > 0 ? Store.notes.get(0).text : "" }
  }
  ListView {
    visible: Store.mode === "expanded"
    x: 10; y: 34
    width: parent.width - 20
    height: parent.height - 44
    clip: true
    spacing: 4
    model: Store.notes
    delegate: Rectangle {
      width: ListView.view.width; height: 28; radius: 6
      color: "#222222"
      Text {
        x: 8
        anchors.verticalCenter: parent.verticalCenter
        color: "white"
        text: model.app + ": " + model.text
      }
      MouseArea {
        width: 28; height: 28
        anchors.right: parent.right
        onClicked: Store.dismiss(index)
      }
    }
  }
  //#end

  //#S2 "a MouseArea along the top edge (anchors top, left, right; height 28) whose onClicked calls Store.toggleExpanded()|(keep it LAST in the file so it sits on top, but small so list rows below stay clickable)"
  MouseArea {
    anchors.top: parent.top
    anchors.left: parent.left
    anchors.right: parent.right
    height: 28
    onClicked: Store.toggleExpanded()
  }
  //#end
}
`;
  const A = { 'main.qml': MAIN_A, 'Store.qml': STORE, 'Island.qml': ISLAND };
  const B = { 'main.qml': MAIN_B, 'Store.qml': STORE, 'Island.qml': ISLAND };

  // ---- test helpers -----------------------------------------------------------------
  const S = t => t.single('Store');
  const isTransparent = c => String(c).toLowerCase() === 'transparent' || /^#00[0-9a-f]{6}$/i.test(String(c));
  const goMode = (t, m) => { S(t).mode = m; t.advance(400); };
  const dismissAreas = t => t.all('MouseArea').filter(m => m.width === 28 && m.height === 28 && t.shown(m));
  const textsShown = t => t.all('Text').filter(x => t.shown(x)).map(x => x.text);
  const SIZES = { idle: [120, 28], osd: [220, 44], notify: [300, 56], expanded: [320, 130] };

  const stepIntro = (n, what, extra) => '<p><b>Step ' + n + ' of 5.</b> ' + what + '</p><p>The code on the right is your finished work from the previous step. Look for the <code>// TODO</code> comments (they list what to write) and make the tests pass.</p>' + (extra || '');

  window.QMLCAMP.modules.push({
    id: 'm8', title: 'Final Project: Dynamic Island',
    desc: 'Build a Dynamic Island from scratch in five steps, then pass the final exam.',
    blocks: [
      { id: 'm8-t1', type: 'theory', title: 'Plan the island', desc: 'Modes, one source of truth, morphing, click-through.',
        lessons: [
          { title: 'Modes and one source of truth',
            html: `<p>A Dynamic Island is one small shape with several <b>modes</b>: <i>idle</i> (clock), <i>osd</i> (volume), <i>notify</i> (a message), <i>expanded</i> (a list). The trick that keeps the code simple: <b>one</b> place stores the state, and the visuals only <i>read</i> it.</p><ul><li><b>Store</b> (a <code>Singleton</code>): <code>mode</code>, <code>volume</code>, the notification model, and functions like <code>showVolume(v)</code>. Timers that return to idle live here too.</li><li><b>Island</b> (a component): looks only. Sizes and visibility are bindings on <code>Store.mode</code>.</li><li><b>main.qml</b>: windows and <code>IpcHandler</code>s. IPC only calls Store functions; it never touches visuals.</li></ul><p>The real Quickshell docs are at <code>quickshell.org/docs</code>; the same pattern runs your dynisland.</p>`,
            example: `import QtQuick

Rectangle {
  width: 280; height: 120; color: "#1b1b32"

  QtObject {
    id: store
    property string mode: "idle"
    function next() {
      var order = ["idle", "osd", "notify"]
      mode = order[(order.indexOf(mode) + 1) % order.length]
    }
  }

  Text { x: 12; y: 12; color: "white"; text: "mode: " + store.mode }
  Text { x: 12; y: 40; color: "#9fb4ff"; text: store.mode === "idle" ? "12:00" : store.mode === "osd" ? "Volume 40" : "Mail: hi" }
  MouseArea { anchors.fill: parent; onClicked: store.next() }
}
`,
            q: { text: 'Why do the timers that go back to <code>idle</code> live in the <code>Store</code> and not in the visual component?', options: ['Visual components cannot contain a Timer', 'Behaviour belongs with the state; every screen\'s island then shows the same mode', 'Timers only run inside singletons', 'It makes the code shorter in every case'], answer: 1, why: 'State and its rules live in one place; each island is a view of it.' } },
          { title: 'Morphing: states plus Behavior',
            html: `<p>Each mode is a <code>State</code> with <code>when: Store.mode === "osd"</code> and a <code>PropertyChanges</code> that sets <code>width</code> and <code>height</code>. A <code>Behavior on width</code> and <code>Behavior on height</code> animate every change, so the shape morphs. Make the <code>radius</code> follow with <code>Math.min(height / 2, 20)</code>: a pill when small, rounded rectangle when big.</p><p>Only the visuals of the <b>current</b> mode should show: give each content block <code>visible: Store.mode === "..."</code>.</p>`,
            example: `import QtQuick

Rectangle {
  width: 300; height: 110; color: "#1b1b32"

  QtObject { id: store; property string mode: "idle" }

  Rectangle {
    id: pill
    anchors.horizontalCenter: parent.horizontalCenter
    y: 10
    width: 100; height: 28
    radius: Math.min(height / 2, 20)
    color: "black"
    states: [
      State { name: "big"; when: store.mode === "big"; PropertyChanges { target: pill; width: 260; height: 80 } }
    ]
    Behavior on width { NumberAnimation { duration: 250 } }
    Behavior on height { NumberAnimation { duration: 250 } }
    Text { anchors.centerIn: parent; color: "white"; text: store.mode }
  }
  MouseArea { anchors.fill: parent; onClicked: store.mode = store.mode === "idle" ? "big" : "idle" }
}
`,
            q: { text: 'What makes the pill <b>animate</b> to its new size when the state changes?', options: ['The <code>State</code> itself', '<code>Behavior on width</code> / <code>Behavior on height</code>', 'The <code>radius</code> binding', 'The <code>when</code> condition'], answer: 1, why: 'A State changes the values; a Behavior animates any change of a property.' } },
          { title: 'Windows: click-through, layer, space',
            html: `<p>The island floats over other windows, so the <code>PanelWindow</code> is bigger than the pill (room to grow) but must not block clicks around it:</p><ul><li><code>exclusiveZone: 0</code>: reserve <b>no</b> screen space (windows tile underneath).</li><li><code>color: "transparent"</code>: only the pill is drawn.</li><li><code>mask: Region { item: island }</code>: only the pill area receives input; the rest of the window is click-through.</li><li><code>WlrLayershell.layer: WlrLayer.Overlay</code> and a <code>namespace</code>: draw above everything, name it for compositor rules.</li><li><code>Variants</code> over <code>Quickshell.screens</code>: one island per screen, all reading the same Store.</li></ul>`,
            example: `import Quickshell
import QtQuick

ShellRoot {
  PanelWindow {
    anchors { top: true; left: true; right: true }
    implicitHeight: 100
    exclusiveZone: 0
    color: "transparent"
    mask: Region { item: pill }

    Rectangle {
      id: pill
      anchors.horizontalCenter: parent.horizontalCenter
      y: 8; width: 120; height: 28; radius: 14
      color: "black"
      Text { anchors.centerIn: parent; text: "idle"; color: "white" }
    }
  }
}
`,
            q: { text: 'What does <code>mask: Region { item: island }</code> do?', options: ['Hides the island', 'Only the island area receives mouse input; clicks elsewhere in the window pass through', 'Rounds the corners of the window', 'Makes the window reserve space'], answer: 1, why: 'The mask is the input region of the window.' } }
        ] },

      { id: 'm8-l1', type: 'lab', title: 'Step 1: Shell and idle pill', desc: 'Window, Store clock, the idle pill.',
        desc2: stepIntro(1, 'Create the window, a <code>Store</code> singleton with the clock, and the idle pill showing the time.', '<p>Files: <code>main.qml</code> (the window), <code>Store.qml</code> (singleton), <code>Island.qml</code> (the pill: 120 x 28, round, black, centered at the top, <code>y: 8</code>, a white <code>Text</code> with the time).</p>'),
        files: files(A, 1, false), solution: files(A, 1, true),
        tests: [
          { story: '<code>Store.qml</code> is a singleton and <code>Store.time</code> is <code>"12:00"</code>, then <code>"12:01"</code> after 61 seconds.', run: t => { const d = t.rt.docs['Store.qml']; t.expect(d && d.pragmas.includes('Singleton'), 'Start Store.qml with pragma Singleton'); t.eq(d.root.type, 'Singleton', 'root type of Store.qml'); t.noErrors(); t.eq(S(t).time, '12:00', 'Store.time at the start'); t.advance(61000); t.eq(S(t).time, '12:01', 'Store.time after 61 s'); } },
          { story: 'One <code>PanelWindow</code> <code>win</code> anchored top, left and right (not bottom), 150 high, as wide as the screen.', run: t => { t.noErrors(); const w = t.find('win'); t.expect(w.anchors.top === true && w.anchors.left === true && w.anchors.right === true && w.anchors.bottom !== true, 'Anchor top, left and right only'); t.eq(w.height, 150, 'win.height'); t.eq(w.width, 360, 'win.width'); t.eq(t.count('PanelWindow'), 1, 'number of windows'); } },
          { story: 'The window reserves no space (<code>exclusiveZone: 0</code>) and is <b>transparent</b>.', run: t => { const w = t.find('win'); t.eq(w.exclusiveZone, 0, 'exclusiveZone'); t.expect(isTransparent(w.color), 'win.color should be "transparent" (got ' + w.color + ')'); } },
          { story: 'The pill (<code>island</code>) is 120 x 28, black, has round ends (radius 14), is centered horizontally and sits 8 px from the top.', run: t => { const i = t.find('island'); t.eq(i.width + 'x' + i.height, '120x28', 'pill size'); t.near(i.radius, 14, 'pill radius'); t.near(i.x, 120, 'pill x (centered in the 360 px window)'); t.eq(i.y, 8, 'pill y'); const c = t.rgb(i.color); t.expect(c[0] + c[1] + c[2] < 60, 'The pill should be black (got ' + i.color + ')'); } },
          { story: 'A white <code>Text</code> in the middle of the pill shows <code>Store.time</code> and keeps following it.', run: t => { const lab = t.all('Text').find(x => /^\d\d:\d\d$/.test(x.text)); t.expect(lab, 'No Text shows the time (e.g. "12:00")'); t.near(t.rgb(lab.color)[0], 255, 'time color red channel', 5); t.near(lab.x + lab.width / 2, 60, 'label center x inside the pill', 4); t.near(lab.y + lab.height / 2, 14, 'label center y inside the pill', 4); t.advance(60000); t.expect(t.all('Text').some(x => x.text === '12:01'), 'The label should now show 12:01'); } }
        ] },

      { id: 'm8-l2', type: 'lab', title: 'Step 2: Modes and morphing', desc: 'States, Behavior, a click to expand.',
        desc2: stepIntro(2, 'Add the <code>mode</code> to the Store and make the pill morph between idle, osd, notify and expanded. A click on the pill toggles expanded.', '<table class="cs"><tr><th>mode</th><th>size</th></tr><tr><td>idle</td><td>120 x 28</td></tr><tr><td>osd</td><td>220 x 44</td></tr><tr><td>notify</td><td>300 x 56</td></tr><tr><td>expanded</td><td>320 x 130</td></tr></table>'),
        files: files(A, 2, false), solution: files(A, 2, true),
        tests: [
          { story: '<code>Store.mode</code> starts as <code>"idle"</code> and the pill is 120 x 28.', run: t => { t.noErrors(); t.eq(S(t).mode, 'idle', 'Store.mode'); const i = t.find('island'); t.eq(i.width + 'x' + i.height, '120x28', 'idle size'); } },
          { story: 'Each mode has its size: osd 220 x 44, notify 300 x 56, expanded 320 x 130; back to idle gives 120 x 28 again.', run: t => { t.noErrors(); for (const m of ['osd', 'notify', 'expanded', 'idle']) { goMode(t, m); const i = t.find('island'); t.eq(i.width + 'x' + i.height, SIZES[m].join('x'), 'size in mode ' + m); } } },
          { story: 'The pill is built with <b>states</b> (3 or more <code>State</code>) and animated with <code>Behavior on width</code> and <code>Behavior on height</code> (100 to 400 ms).', run: t => { t.expect(t.nodes('State', 'Island.qml').length >= 3, 'Use three State objects (osd, notify, expanded)'); t.expect(t.behaviorMs('island', 'width') >= 100 && t.behaviorMs('island', 'width') <= 400, 'Behavior on width should last 100-400 ms (got ' + t.behaviorMs('island', 'width') + ')'); t.expect(t.behaviorMs('island', 'height') >= 100 && t.behaviorMs('island', 'height') <= 400, 'Behavior on height should last 100-400 ms (got ' + t.behaviorMs('island', 'height') + ')'); } },
          { story: 'The corners follow the size: <code>radius</code> is half the height, but never more than 20.', run: t => { goMode(t, 'idle'); t.near(t.find('island').radius, 14, 'idle radius'); goMode(t, 'expanded'); t.near(t.find('island').radius, 20, 'expanded radius'); goMode(t, 'osd'); t.near(t.find('island').radius, 20, 'osd radius'); } },
          { story: 'The time label is shown only in idle mode.', run: t => { const lab = t.all('Text').find(x => /^\d\d:\d\d$/.test(x.text)); t.expect(lab, 'No Text shows the time'); t.expect(t.shown(lab), 'The time should show in idle'); goMode(t, 'expanded'); t.expect(!t.shown(lab), 'The time should be hidden in expanded mode'); } },
          { story: 'Clicking the pill expands it; clicking again collapses it. <code>Store.toggleExpanded()</code> does the switching.', run: t => { t.click('island'); t.eq(S(t).mode, 'expanded', 'mode after the first click'); t.advance(400); t.eq(t.find('island').height, 130, 'height when expanded'); t.click('island'); t.eq(S(t).mode, 'idle', 'mode after the second click'); } }
        ] },

      { id: 'm8-l3', type: 'lab', title: 'Step 3: Volume OSD over IPC', desc: 'IpcHandler, Timer, a progress bar.',
        desc2: stepIntro(3, 'A volume OSD: <code>qs ipc call osd volume 70</code> shows the OSD for 1.5 seconds. Calling it again <b>restarts</b> the timer.', '<p>While the island is <b>expanded</b>, a volume change updates <code>Store.volume</code> but does not leave the expanded mode.</p>'),
        files: files(A, 3, false), solution: files(A, 3, true),
        tests: [
          { story: 'An <code>IpcHandler</code> with target <code>"osd"</code> has <code>volume(v)</code>. <code>volume(70)</code> sets <code>Store.volume</code> to 70 and the mode to <code>"osd"</code>; the pill becomes 220 x 44.', run: t => { t.noErrors(); t.eq(S(t).volume, 40, 'Store.volume at the start'); t.ipc('osd', 'volume', 70); t.eq(S(t).volume, 70, 'Store.volume'); t.eq(S(t).mode, 'osd', 'Store.mode'); t.advance(300); const i = t.find('island'); t.eq(i.width + 'x' + i.height, '220x44', 'OSD size'); } },
          { story: 'The values are clamped to 0..100.', run: t => { t.ipc('osd', 'volume', 150); t.eq(S(t).volume, 100, 'volume(150)'); t.ipc('osd', 'volume', -20); t.eq(S(t).volume, 0, 'volume(-20)'); } },
          { story: 'The OSD shows <code>Volume 70</code> and a green bar (<code>#4cd964</code>) that is 70 % of the 80 px track (56 px). Both are hidden outside the osd mode.', run: t => { const fills = () => t.all('Rectangle').filter(r => t.rgb(r.color).join(',') === '76,217,100'); t.expect(fills().every(f => !t.shown(f)), 'The green bar must be hidden in idle mode'); t.expect(!t.all('Text').some(x => /^Volume/.test(x.text) && t.shown(x)), 'The Volume text must be hidden in idle mode'); t.ipc('osd', 'volume', 70); t.advance(300); t.expect(t.all('Text').some(x => x.text === 'Volume 70' && t.shown(x)), 'A Text should show "Volume 70"'); const f = fills().filter(r => t.shown(r)); t.eq(f.length, 1, 'number of visible green bars'); t.near(f[0].width, 56, 'bar width for 70 %'); t.eq(f[0].height, 6, 'bar height'); } },
          { story: 'After 1.5 seconds without a new call, the island goes back to <b>idle</b>.', run: t => { t.ipc('osd', 'volume', 30); t.advance(1400); t.eq(S(t).mode, 'osd', 'mode after 1.4 s'); t.advance(200); t.eq(S(t).mode, 'idle', 'mode after 1.6 s'); } },
          { story: 'A second call <b>restarts</b> the timer: after calls at 0 s and 1 s the OSD is still there at 2 s and gone at 2.6 s.', run: t => { t.ipc('osd', 'volume', 10); t.advance(1000); t.ipc('osd', 'volume', 20); t.advance(1000); t.eq(S(t).mode, 'osd', 'mode at 2.0 s'); t.advance(600); t.eq(S(t).mode, 'idle', 'mode at 2.6 s'); } },
          { story: 'While expanded, <code>volume()</code> updates the value but keeps the island expanded.', run: t => { S(t).mode = 'expanded'; t.ipc('osd', 'volume', 55); t.eq(S(t).volume, 55, 'Store.volume'); t.eq(S(t).mode, 'expanded', 'Store.mode'); t.advance(2000); t.eq(S(t).mode, 'expanded', 'mode after the timer'); } }
        ] },

      { id: 'm8-l4', type: 'lab', title: 'Step 4: Notifications', desc: 'ListModel in the Store, notify mode, expanded list.',
        desc2: stepIntro(4, 'Notifications: <code>qs ipc call notify push Mail "Hello"</code> shows the newest one for 3 seconds. The expanded island lists them and each row can be dismissed. Finish the Store, the three visual blocks and the second IPC handler.'),
        files: files(A, 4, false), solution: files(A, 4, true),
        tests: [
          { story: '<code>notify push</code> adds a row (newest first), the mode becomes <code>"notify"</code> and the pill is 300 x 56 showing the app and the text.', run: t => { t.noErrors(); t.ipc('notify', 'push', 'Mail', 'Hello'); t.eq(S(t).notes.count, 1, 'Store.notes.count'); t.eq(S(t).mode, 'notify', 'Store.mode'); t.advance(300); const i = t.find('island'); t.eq(i.width + 'x' + i.height, '300x56', 'notify size'); const tx = textsShown(t); t.expect(tx.includes('Mail') && tx.includes('Hello'), 'The island should show "Mail" and "Hello" (shown: ' + tx.join(' | ') + ')'); } },
          { story: 'After 3 seconds the island returns to idle and shows the badge <code>● 1</code>.', run: t => { t.ipc('notify', 'push', 'Mail', 'Hello'); t.advance(2900); t.eq(S(t).mode, 'notify', 'mode after 2.9 s'); t.advance(200); t.eq(S(t).mode, 'idle', 'mode after 3.1 s'); t.expect(textsShown(t).includes('● 1'), 'The idle pill should show a badge "● 1"'); } },
          { story: 'The model keeps the <b>newest first</b> and at most <b>4</b> notifications.', run: t => { for (let n = 1; n <= 6; n++) t.ipc('notify', 'push', 'App', 'msg ' + n); t.eq(S(t).notes.count, 4, 'Store.notes.count'); t.eq(S(t).notes.get(0).text, 'msg 6', 'newest row'); t.eq(S(t).notes.get(3).text, 'msg 3', 'oldest row kept'); } },
          { story: 'Expanded mode lists every notification as <code>app: text</code> (hidden in other modes).', run: t => { t.ipc('notify', 'push', 'Mail', 'One'); t.ipc('notify', 'push', 'Chat', 'Two'); t.advance(3200); t.expect(!textsShown(t).includes('Chat: Two'), 'The list must be hidden while idle'); goMode(t, 'expanded'); const tx = textsShown(t); t.expect(tx.includes('Chat: Two') && tx.includes('Mail: One'), 'Rows "Chat: Two" and "Mail: One" should show (shown: ' + tx.join(' | ') + ')'); } },
          { story: 'A new notification while expanded is added to the list but does not leave the expanded mode.', run: t => { goMode(t, 'expanded'); t.ipc('notify', 'push', 'Mail', 'Late'); t.eq(S(t).mode, 'expanded', 'mode'); t.eq(S(t).notes.count, 1, 'count'); t.advance(3500); t.eq(S(t).mode, 'expanded', 'mode after the timer'); } },
          { story: 'The dismiss area of a row removes <b>that</b> row (the indexes stay right after the first removal). Removing the last row closes the expanded island.', run: t => { for (const x of ['A', 'B', 'C']) t.ipc('notify', 'push', 'App', x); goMode(t, 'expanded'); let d = dismissAreas(t); t.eq(d.length, 3, 'visible dismiss areas'); t.click(d[1]); t.eq([0, 1].map(i => S(t).notes.get(i).text).join(','), 'C,A', 'rows after dismissing the middle one'); d = dismissAreas(t); t.click(d[0]); t.eq(S(t).notes.get(0).text, 'A', 'row after dismissing the first one'); d = dismissAreas(t); t.click(d[0]); t.eq(S(t).notes.count, 0, 'count'); t.eq(S(t).mode, 'idle', 'mode when the list is empty'); } },
          { story: '<code>notify clear</code> removes all notifications and leaves expanded mode.', run: t => { t.ipc('notify', 'push', 'A', '1'); t.ipc('notify', 'push', 'B', '2'); goMode(t, 'expanded'); t.ipc('notify', 'clear'); t.eq(S(t).notes.count, 0, 'count'); t.eq(S(t).mode, 'idle', 'mode'); } }
        ] },

      { id: 'm8-l5', type: 'lab', title: 'Step 5: Every screen, click-through, overlay', desc: 'Variants, mask, layer shell.',
        desc2: stepIntro(5, 'Finish the shell: one island on <b>every screen</b> (all showing the same Store), click-through outside the pill, and the window on the overlay layer.', '<p>Rewrite <code>main.qml</code>: wrap the window in a <code>Variants</code> over <code>Quickshell.screens</code> (<code>required property var modelData</code>, <code>screen: modelData</code>), add <code>mask: Region { item: island }</code>, <code>WlrLayershell.layer: WlrLayer.Overlay</code>, <code>WlrLayershell.namespace: "island"</code>, and <code>import Quickshell.Wayland</code>. Keep both <code>IpcHandler</code>s. <code>Island.qml</code> and <code>Store.qml</code> stay as they are.</p>'),
        files: Object.assign(files(A, 5, true), { 'main.qml': build(MAIN_A, 5, true).replace(/\n\s*\/\/ TODO[^\n]*/g, '') }), solution: files(B, 5, true),
        tests: [
          { story: 'A <code>Variants</code> over <code>Quickshell.screens</code> makes one window <b>and</b> one <code>Island</code> per screen (2 screens in the sandbox).', run: t => { t.noErrors(); t.expect(t.uses('Variants'), 'Use Variants'); t.eq(t.count('PanelWindow'), t.screens.length, 'number of windows'); t.eq(t.nodes('Island').length >= 1 && t.all('Island').length, t.screens.length, 'number of islands'); t.eq(t.all('PanelWindow').map(w => w.screen && w.screen.name).sort().join(','), t.screens.map(s => s.name).sort().join(','), 'screens of the windows'); } },
          { story: 'Each window is anchored top, left and right, 150 high, reserves no space and is transparent.', run: t => { for (const w of t.all('PanelWindow')) { t.expect(w.anchors.top === true && w.anchors.left === true && w.anchors.right === true && w.anchors.bottom !== true, 'Anchor top, left and right'); t.eq(w.height, 150, 'height'); t.eq(w.exclusiveZone, 0, 'exclusiveZone'); t.expect(isTransparent(w.color), 'color should be transparent'); } } },
          { story: 'Each window is on the <b>Overlay</b> layer with the namespace <code>"island"</code>.', run: t => { t.expect(t.all('PanelWindow').length > 0, 'No windows yet'); for (const w of t.all('PanelWindow')) { t.eq(t.attached(w, 'layer'), 3, 'WlrLayershell.layer (WlrLayer.Overlay)'); t.eq(t.attached(w, 'namespace'), 'island', 'WlrLayershell.namespace'); } } },
          { story: 'Each window\'s input <code>mask</code> is a <code>Region</code> around its own island, and it <b>follows</b> the island when it grows.', run: t => { t.expect(t.all('PanelWindow').length > 0, 'No windows yet'); for (const w of t.all('PanelWindow')) { t.expect(w.mask && w.mask.item, 'Set mask: Region { item: island }'); t.eq(w.mask.item.width, 120, 'masked item width when idle'); } goMode(t, 'expanded'); for (const w of t.all('PanelWindow')) t.eq(w.mask.item.width + 'x' + w.mask.item.height, '320x130', 'masked item when expanded'); } },
          { story: 'All islands share the Store: an IPC call changes every screen, and every pill is centered.', run: t => { t.ipc('osd', 'volume', 80); t.advance(300); const pills = t.all('PanelWindow').map(w => w.mask.item); t.eq(pills.length, 2, 'pills'); for (const p of pills) { t.eq(p.width + 'x' + p.height, '220x44', 'OSD size on every screen'); t.near(p.x, (360 - 220) / 2, 'pill x'); } } },
          { story: 'The IPC handlers still work: <code>notify push</code> shows the notification on every screen.', run: t => { t.ipc('notify', 'push', 'Mail', 'Hello'); t.advance(300); t.eq(textsShown(t).filter(x => x === 'Hello').length, 2, 'screens showing "Hello"'); } }
        ] },

      { id: 'm8-q', type: 'quiz', title: 'Practice test: Island design', desc: 'Eight questions before the final exam.',
        questions: [
          { text: 'Why is the <code>PanelWindow</code> taller than the idle pill?', options: ['A window must be at least 150 px', 'There must be room for the island to grow without resizing the window', 'exclusiveZone requires it', 'Transparent windows need extra height'], answer: 1, why: 'Resizing a layer-shell window is expensive and flickers; resize the pill inside it.' },
          { text: 'The island must not push other windows down. Which setting is responsible?', options: ['<code>exclusiveZone: 0</code>', '<code>exclusiveZone: 150</code>', '<code>color: "transparent"</code>', '<code>mask</code>'], answer: 0, why: 'exclusiveZone is the space the window reserves.' },
          { text: 'What is the job of <code>mask: Region { item: island }</code>?', options: ['Makes the island invisible', 'Limits input to the island; the rest of the window is click-through', 'Clips drawing to the island', 'Animates the island'], answer: 1, why: 'It defines the input region.' },
          { text: 'A single <code>Store</code> singleton is shared by all screens. What is the benefit?', options: ['Faster rendering', 'Every screen\'s island shows the same mode and data without extra code', 'It avoids Variants', 'It removes the need for IPC'], answer: 1, why: 'One source of truth.' },
          { text: 'You call <code>osdTimer.restart()</code> on every volume call. Why?', options: ['To hide the OSD at once', 'So repeated changes keep the OSD open for 1.5 s after the <b>last</b> one', 'To reset the volume', 'Timers must be restarted to run'], answer: 1, why: 'restart() resets the countdown.' },
          { text: 'A <code>State</code> sets <code>width: 220</code>. What animates the change?', options: ['<code>Behavior on width</code>', '<code>PropertyChanges</code>', 'The <code>when</code> expression', 'Nothing, it cannot be animated'], answer: 0, why: 'A Behavior animates every change of that property.' },
          { text: 'Inside the notification delegate you want the app name. What is safest?', options: ['<code>model.app</code>', '<code>app</code>', '<code>parent.app</code>', '<code>ListView.app</code>'], answer: 0, why: '<code>model.role</code> cannot be hidden by item properties.' },
          { text: 'Which call from a shell does the island handle with an <code>IpcHandler</code>?', options: ['<code>qs ipc call osd volume 70</code>', '<code>qs run osd</code>', '<code>qs osd.volume = 70</code>', '<code>qs kill osd</code>'], answer: 0, why: '<code>qs ipc call TARGET FUNCTION ARGS</code>.' }
        ] },

      { id: 'm8-x', type: 'lab', title: 'Final exam: Battery island', desc: 'Certification: build a new island from the specification only.',
        desc2: `<p><b>Final exam.</b> No TODOs, no hints in the code. Build a <b>battery island</b> from this specification. Every checklist item is one test; you pass when all are green.</p>
<h3>Files</h3><p><code>main.qml</code> (shell), <code>Power.qml</code> (singleton), <code>Pill.qml</code> (the pill).</p>
<h3>Power.qml</h3><ul><li><code>property int battery</code> (80), <code>property bool charging</code> (false), <code>property bool open</code> (false).</li><li><code>readonly property string mode</code>: <code>"expanded"</code> when <code>open</code>; otherwise <code>"alert"</code> when <code>battery &lt;= 20</code> and not charging; otherwise <code>"idle"</code>.</li><li><code>readonly property var devices</code>: a <code>ListModel</code> with roles <code>name</code> and <code>level</code>: Laptop 80, Mouse 55, Keyboard 12.</li><li><code>function setBattery(p)</code>: clamp to 0..100.</li></ul>
<h3>main.qml</h3><ul><li><code>Variants</code> over <code>Quickshell.screens</code>: a <code>PanelWindow</code> per screen, anchored top, left, right; <code>implicitHeight: 140</code>; <code>exclusiveZone: 0</code>; transparent.</li><li>Overlay layer, namespace <code>"power"</code>; <code>mask: Region { item: pill }</code> where <code>Pill { id: pill }</code> is inside the window.</li><li><code>IpcHandler</code> target <code>"power"</code>: <code>level(p: int)</code> calls <code>Power.setBattery(p)</code>; <code>plug(value: bool)</code> sets <code>Power.charging</code>; <code>toggle()</code> flips <code>Power.open</code>.</li></ul>
<h3>Pill.qml</h3><ul><li>Rectangle, centered at the top, <code>y: 6</code>, black. Sizes: idle 100 x 26, alert 240 x 48, expanded 300 x 120, chosen with <b>states</b> on <code>Power.mode</code>, animated with <code>Behavior</code> on width and height (150 to 400 ms). <code>radius: Math.min(height / 2, 18)</code>.</li><li>Idle: white text <code>Power.battery + "%"</code> (e.g. <code>80%</code>). Alert: text <code>Low battery: 15%</code>. Each only in its own mode.</li><li>Expanded: a <code>ListView</code> over <code>Power.devices</code> with rows like <code>Mouse: 55%</code>; rows with level 20 or less are <code>#ff5555</code>, others white. Only in expanded mode.</li><li>A <code>MouseArea</code> along the top (height 26) toggles <code>Power.open</code>.</li></ul>`,
        files: { 'main.qml': 'import QtQuick\nimport Quickshell\nimport Quickshell.Io\nimport Quickshell.Wayland\n\nShellRoot {\n  // your code\n}\n', 'Power.qml': 'pragma Singleton\nimport QtQuick\nimport Quickshell\n\nSingleton {\n  // your code\n}\n', 'Pill.qml': 'import QtQuick\n\nRectangle {\n  // your code\n}\n' },
        solution: {
          'main.qml': `import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland

ShellRoot {
  Variants {
    model: Quickshell.screens
    PanelWindow {
      required property var modelData
      screen: modelData
      anchors { top: true; left: true; right: true }
      implicitHeight: 140
      exclusiveZone: 0
      color: "transparent"
      mask: Region { item: pill }
      WlrLayershell.layer: WlrLayer.Overlay
      WlrLayershell.namespace: "power"

      Pill { id: pill }
    }
  }

  IpcHandler {
    target: "power"
    function level(p: int): void { Power.setBattery(p) }
    function plug(value: bool): void { Power.charging = value }
    function toggle(): void { Power.open = !Power.open }
  }
}
`,
          'Power.qml': `pragma Singleton
import QtQuick
import Quickshell

Singleton {
  id: power
  property int battery: 80
  property bool charging: false
  property bool open: false
  readonly property string mode: open ? "expanded" : (battery <= 20 && !charging ? "alert" : "idle")
  readonly property var devices: deviceModel

  ListModel {
    id: deviceModel
    ListElement { name: "Laptop"; level: 80 }
    ListElement { name: "Mouse"; level: 55 }
    ListElement { name: "Keyboard"; level: 12 }
  }

  function setBattery(p) { battery = Math.max(0, Math.min(100, p)) }
}
`,
          'Pill.qml': `import QtQuick

Rectangle {
  id: pill
  anchors.horizontalCenter: parent.horizontalCenter
  y: 6
  width: 100; height: 26
  radius: Math.min(height / 2, 18)
  color: "black"

  states: [
    State { name: "alert"; when: Power.mode === "alert"; PropertyChanges { target: pill; width: 240; height: 48 } },
    State { name: "expanded"; when: Power.mode === "expanded"; PropertyChanges { target: pill; width: 300; height: 120 } }
  ]
  Behavior on width { NumberAnimation { duration: 200 } }
  Behavior on height { NumberAnimation { duration: 200 } }

  Text {
    anchors.centerIn: parent
    color: "white"
    visible: Power.mode === "idle"
    text: Power.battery + "%"
  }
  Text {
    anchors.centerIn: parent
    color: "#ff5555"
    visible: Power.mode === "alert"
    text: "Low battery: " + Power.battery + "%"
  }
  ListView {
    visible: Power.mode === "expanded"
    x: 12; y: 32
    width: parent.width - 24
    height: parent.height - 40
    spacing: 4
    model: Power.devices
    delegate: Text {
      color: model.level <= 20 ? "#ff5555" : "white"
      text: model.name + ": " + model.level + "%"
    }
  }
  MouseArea {
    anchors.top: parent.top
    anchors.left: parent.left
    anchors.right: parent.right
    height: 26
    onClicked: Power.open = !Power.open
  }
}
`
        },
        tests: [
          { story: '<b>Singleton:</b> <code>Power.qml</code> starts with <code>pragma Singleton</code> and its root is <code>Singleton</code>; defaults are battery 80, charging false, open false, mode <code>"idle"</code>.', run: t => { const d = t.rt.docs['Power.qml']; t.expect(d && d.pragmas.includes('Singleton'), 'Start Power.qml with pragma Singleton'); t.eq(d.root.type, 'Singleton', 'root type'); t.noErrors(); const P = t.single('Power'); t.eq(P.battery, 80, 'battery'); t.eq(P.charging, false, 'charging'); t.eq(P.open, false, 'open'); t.eq(P.mode, 'idle', 'mode'); t.eq(P.devices.count, 3, 'devices.count'); } },
          { story: '<b>Windows:</b> one <code>PanelWindow</code> per screen from <code>Variants</code>, anchored top, left, right (not bottom), 140 high, <code>exclusiveZone: 0</code>, transparent.', run: t => { t.noErrors(); t.expect(t.uses('Variants'), 'Use Variants over Quickshell.screens'); const w = t.all('PanelWindow'); t.eq(w.length, t.screens.length, 'number of windows'); for (const x of w) { t.expect(x.anchors.top === true && x.anchors.left === true && x.anchors.right === true && x.anchors.bottom !== true, 'Anchor top, left and right'); t.eq(x.height, 140, 'height'); t.eq(x.exclusiveZone, 0, 'exclusiveZone'); t.expect(isTransparent(x.color), 'color must be transparent'); } } },
          { story: '<b>Layer:</b> every window is on the Overlay layer with the namespace <code>"power"</code>.', run: t => { t.expect(t.all('PanelWindow').length > 0, 'No windows yet'); for (const w of t.all('PanelWindow')) { t.eq(t.attached(w, 'layer'), 3, 'WlrLayershell.layer'); t.eq(t.attached(w, 'namespace'), 'power', 'WlrLayershell.namespace'); } } },
          { story: '<b>Mask:</b> every window has <code>mask: Region { item: pill }</code> where the pill is its own <code>Pill</code>, 100 x 26 when idle, centered, <code>y: 6</code>.', run: t => { t.noErrors(); t.expect(t.all('PanelWindow').length > 0, 'No windows yet'); for (const w of t.all('PanelWindow')) { t.expect(w.mask && w.mask.item, 'Set mask: Region { item: pill }'); const p = w.mask.item; t.eq(p.width + 'x' + p.height, '100x26', 'idle size'); t.near(p.x, 130, 'pill x'); t.eq(p.y, 6, 'pill y'); t.near(p.radius, 13, 'idle radius'); } t.eq(t.all('Pill').length, t.screens.length, 'number of Pill items'); } },
          { story: '<b>Idle:</b> the text <code>80%</code> shows on every screen; no alert text is visible.', run: t => { t.eq(textsShown(t).filter(x => x === '80%').length, 2, 'screens showing "80%"'); t.expect(!textsShown(t).some(x => /^Low battery/.test(x)), 'No "Low battery" text in idle'); } },
          { story: '<b>IPC:</b> <code>power level</code> sets the battery (clamped to 0..100) and the idle text follows.', run: t => { t.ipc('power', 'level', 55); t.eq(t.single('Power').battery, 55, 'battery after level(55)'); t.expect(textsShown(t).includes('55%'), 'The idle text should show 55%'); t.ipc('power', 'level', 150); t.eq(t.single('Power').battery, 100, 'level(150)'); t.ipc('power', 'level', -3); t.eq(t.single('Power').battery, 0, 'level(-3)'); } },
          { story: '<b>Alert:</b> at 15 % the mode is <code>"alert"</code>, the pill is 240 x 48 with radius 18, and the text <code>Low battery: 15%</code> replaces the idle text.', run: t => { t.ipc('power', 'level', 15); t.eq(t.single('Power').mode, 'alert', 'Power.mode'); t.advance(500); const tx = textsShown(t); t.expect(tx.includes('Low battery: 15%'), 'Alert text missing (shown: ' + tx.join(' | ') + ')'); t.expect(!tx.includes('15%'), 'The idle text must be hidden in alert'); for (const w of t.all('PanelWindow')) { const p = w.mask.item; t.eq(p.width + 'x' + p.height, '240x48', 'alert size'); t.near(p.radius, 18, 'alert radius'); } } },
          { story: '<b>Boundary:</b> 20 % is an alert, 21 % is not.', run: t => { t.ipc('power', 'level', 20); t.eq(t.single('Power').mode, 'alert', 'mode at 20 %'); t.ipc('power', 'level', 21); t.eq(t.single('Power').mode, 'idle', 'mode at 21 %'); } },
          { story: '<b>Charging</b> cancels the alert; unplugging brings it back.', run: t => { t.ipc('power', 'level', 10); t.ipc('power', 'plug', true); t.eq(t.single('Power').charging, true, 'charging'); t.eq(t.single('Power').mode, 'idle', 'mode while charging'); t.ipc('power', 'plug', false); t.eq(t.single('Power').mode, 'alert', 'mode after unplugging'); } },
          { story: '<b>Expanded:</b> <code>power toggle</code> opens a 300 x 120 pill (it wins over alert) with the rows <code>Laptop: 80%</code>, <code>Mouse: 55%</code>, <code>Keyboard: 12%</code>; toggling again closes it.', run: t => { t.ipc('power', 'level', 10); t.ipc('power', 'toggle'); t.eq(t.single('Power').mode, 'expanded', 'mode'); t.advance(500); const tx = textsShown(t); for (const r of ['Laptop: 80%', 'Mouse: 55%', 'Keyboard: 12%']) t.expect(tx.includes(r), 'Row "' + r + '" should show (shown: ' + tx.join(' | ') + ')'); for (const w of t.all('PanelWindow')) { const p = w.mask.item; t.eq(p.width + 'x' + p.height, '300x120', 'expanded size'); t.near(p.radius, 18, 'expanded radius'); } t.ipc('power', 'toggle'); t.eq(t.single('Power').mode, 'alert', 'mode after closing'); } },
          { story: '<b>Colors:</b> rows with level 20 or less are <code>#ff5555</code> (Keyboard), the others white.', run: t => { t.ipc('power', 'toggle'); t.advance(100); const row = n => t.all('Text').find(x => x.text === n && t.shown(x)); const kb = row('Keyboard: 12%'), mo = row('Mouse: 55%'); t.expect(kb && mo, 'The device rows must be visible when expanded'); t.eq(t.rgb(kb.color).join(','), '255,85,85', 'Keyboard row color'); t.eq(t.rgb(mo.color).join(','), '255,255,255', 'Mouse row color'); } },
          { story: '<b>Click:</b> clicking the pill expands it, clicking again collapses it.', run: t => { const p = t.all('PanelWindow')[0].mask.item; t.click(p); t.eq(t.single('Power').open, true, 'open after the first click'); t.click(p); t.eq(t.single('Power').open, false, 'open after the second click'); } },
          { story: '<b>Motion:</b> the pill uses <code>State</code>s and <code>Behavior</code> on width and height (150 to 400 ms).', run: t => { t.expect(t.nodes('State', 'Pill.qml').length >= 2, 'Use State objects for alert and expanded'); const p = t.all('PanelWindow')[0].mask.item; for (const n of ['width', 'height']) { const ms = t.behaviorMs(p, n); t.expect(ms >= 150 && ms <= 400, 'Behavior on ' + n + ' should last 150-400 ms (got ' + ms + ')'); } } }
        ] },

      { id: 'm8-r', type: 'review', title: 'Review: Island project', desc: 'The architecture, a checklist and what to do next.',
        html: `<h2>You built a Dynamic Island</h2>
<table class="cs"><tr><th>Piece</th><th>Rule</th></tr>
<tr><td><code>Store</code> (Singleton)</td><td>All state and its rules: mode, data, models, timers. Functions are the only way to change it.</td></tr>
<tr><td><code>Island</code> (component)</td><td>Looks only. <code>states</code> + <code>when</code> pick the size, <code>Behavior</code> animates, <code>visible</code> picks the content.</td></tr>
<tr><td><code>main.qml</code></td><td><code>Variants</code> over screens, <code>PanelWindow</code> settings, <code>IpcHandler</code>s that call Store functions.</td></tr>
<tr><td>Window</td><td>Taller than the pill; <code>exclusiveZone: 0</code>; transparent; <code>mask</code> on the pill; Overlay layer; a namespace.</td></tr>
<tr><td>Lists</td><td><code>ListModel</code> in the Store, <code>ListView</code> + delegate in the island, <code>model.role</code> and <code>index</code>.</td></tr>
<tr><td>Timers</td><td><code>restart()</code> on every trigger so only the last event counts.</td></tr></table>
<h3>Certification checklist</h3>
<ul><li>I can explain why state lives in a singleton.</li><li>I can build modes with states and animate them with Behavior.</li><li>I can make a window click-through with a mask and keep it from reserving space.</li><li>I can add IPC functions and call them from a terminal.</li><li>I can show a model with a ListView and remove rows by index.</li></ul>
<p><b>Next:</b> try the ideas in your real shell. Ideas: a media mode (track title via <code>Process</code>), a tray list from <code>Quickshell.Services.SystemTray</code>, workspaces from a <code>Process</code> that prints niri events with a <code>SplitParser</code>. The sandbox does not run those, the real Quickshell docs at <code>quickshell.org/docs</code> do.</p>` }
    ]
  });
})();
