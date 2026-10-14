// =============================================================================
//  Module 7: Quickshell
//  Blocks: Theory A -> Lab A -> Quiz -> Theory B -> Lab B -> Review
//  The sandbox simulates Quickshell: two 360x200 screens, fake commands, a virtual clock.
// =============================================================================
window.QMLCAMP.modules.push({
  id: 'm7', title: 'Quickshell',
  desc: 'Build real desktop shells: ShellRoot, PanelWindow, Variants, singletons, Process, SystemClock and IPC.',
  blocks: [
    { id: 'm7-t1', type: 'theory', title: 'Shell structure', desc: 'ShellRoot, PanelWindow, anchors, Variants.',
      lessons: [
        { title: 'What Quickshell is',
          html: '<p><b>Quickshell</b> is a toolkit for building desktop shells (bars, docks, launchers, lock screens) with QML on Wayland. It loads a <code>shell.qml</code>, whose root is usually a <code>ShellRoot</code> that holds the windows. Save the file and the shell reloads live. In this course <code>main.qml</code> plays the role of <code>shell.qml</code>. The preview draws two small <b>screens</b>.</p><p>Quickshell types live in modules: <code>import Quickshell</code>, <code>import Quickshell.Io</code>, <code>import Quickshell.Wayland</code>.</p>',
          example: `import Quickshell
import QtQuick

ShellRoot {
  PanelWindow {
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"
    Text { anchors.centerIn: parent; text: "hello shell"; color: "white" }
  }
}
`,
          q: { text: 'What is usually the root object of a Quickshell <code>shell.qml</code>?', options: ['<code>Window</code>', '<code>ShellRoot</code>', '<code>Item</code> sized to the screen', '<code>Singleton</code>'], answer: 1, why: 'ShellRoot holds the shell\'s windows.' } },
        { title: 'PanelWindow and its anchors',
          html: '<p>A <code>PanelWindow</code> is a window drawn by the compositor at the screen edge. Its <code>anchors</code> are <b>booleans</b> (not item lines like in module 1): which screen edges it sticks to. Two opposite edges stretch it across; no edge on an axis centers it. Use <code>implicitWidth</code>/<code>implicitHeight</code> for the free axis, <code>margins.top</code> etc. for gaps, and <code>exclusiveZone</code> to reserve space so other windows do not cover the bar.</p>',
          example: `import Quickshell
import QtQuick

ShellRoot {
  PanelWindow {
    anchors { bottom: true; left: true; right: true }
    margins { left: 40; right: 40; bottom: 8 }
    implicitHeight: 36
    exclusiveZone: 36
    color: "#2e2e4a"
    Text { anchors.centerIn: parent; text: "floating dock"; color: "white" }
  }
}
`,
          q: { text: '<code>anchors { top: true; left: true; right: true }</code> with <code>implicitHeight: 28</code> gives…', options: ['A 28 px bar across the top', 'A 28 px square in the corner', 'A bar at the bottom', 'A centered window'], answer: 0, why: 'Left + right stretch the width; top pins it up; height comes from implicitHeight.' } },
        { title: 'One window per screen: Variants',
          html: '<p>Screens come and go, so shells create windows from a model: <code>Variants { model: Quickshell.screens; PanelWindow { ... } }</code> makes one window per screen. In the delegate, <code>modelData</code> is the screen; assign it with <code>screen: modelData</code>. Declare it as <code>required property var modelData</code>.</p>',
          example: `import Quickshell
import QtQuick

ShellRoot {
  Variants {
    model: Quickshell.screens
    PanelWindow {
      required property var modelData
      screen: modelData
      anchors { top: true; left: true; right: true }
      implicitHeight: 24
      color: "#4a2a5a"
      Text { anchors.centerIn: parent; text: modelData.name; color: "white" }
    }
  }
}
`,
          q: { text: 'What makes a bar appear on <b>every</b> monitor?', options: ['<code>Variants { model: Quickshell.screens; PanelWindow { screen: modelData } }</code>', 'Setting <code>width</code> very large', 'Using two <code>ShellRoot</code>s', 'It always does, nothing needed'], answer: 0, why: 'Variants creates one delegate per screen.' } }
      ] },
    { id: 'm7-l1', type: 'lab', title: 'Bar on every screen', desc: 'Variants, PanelWindow, anchors, exclusiveZone.',
      desc2: '<p>Create a dark top bar on <b>each</b> screen, 28 px high, showing the name of its screen. The bar must reserve its space.</p>',
      files: { 'main.qml': `import Quickshell
import QtQuick

ShellRoot {
  // TODO: Variants over Quickshell.screens that makes one PanelWindow per screen:
  //   - screen: modelData
  //   - anchored to top, left and right; implicitHeight 28; exclusiveZone 28
  //   - dark color
  //   - a white Text centered in the bar with the screen's name
}
` },
      solution: { 'main.qml': `import Quickshell
import QtQuick

ShellRoot {
  Variants {
    model: Quickshell.screens
    PanelWindow {
      required property var modelData
      screen: modelData
      anchors { top: true; left: true; right: true }
      implicitHeight: 28
      exclusiveZone: 28
      color: "#1b1b32"
      Text { anchors.centerIn: parent; text: modelData.name; color: "white" }
    }
  }
}
` },
      tests: [
        { story: 'A <code>Variants</code> over <code>Quickshell.screens</code> creates one <code>PanelWindow</code> for each screen.', run: t => { t.noErrors(); t.expect(t.uses('Variants'), 'Use Variants'); t.eq(t.count('PanelWindow'), t.screens.length, 'number of PanelWindows'); } },
        { story: 'Every bar is anchored top, left and right (not bottom), 28 px high, and fills its screen\'s width at the top edge.', run: t => { t.noErrors(); const w = t.all('PanelWindow'); t.expect(w.length > 0, 'No PanelWindow yet'); for (const b of w) { t.expect(b.anchors.top === true && b.anchors.left === true && b.anchors.right === true, 'Anchor top, left and right'); t.expect(b.anchors.bottom !== true, 'Do not anchor the bottom'); t.eq(b.height, 28, 'bar height'); t.eq(b.width, 360, 'bar width (the screen is 360 wide)'); t.eq(b.x + ',' + b.y, '0,0', 'bar position'); } } },
        { story: 'Every bar reserves its height with <code>exclusiveZone: 28</code>.', run: t => { t.noErrors(); const w = t.all('PanelWindow'); t.expect(w.length > 0, 'No PanelWindow yet'); for (const b of w) t.eq(b.exclusiveZone, 28, 'exclusiveZone'); } },
        { story: 'Each bar belongs to its own screen (<code>screen: modelData</code>) and shows that screen\'s name in a <code>Text</code>.', run: t => { t.noErrors(); const names = t.all('PanelWindow').map(b => b.screen && b.screen.name).sort(); t.eq(names.join(','), t.screens.map(s => s.name).sort().join(','), 'screens of the bars'); const texts = t.all('Text').map(x => x.text); for (const s of t.screens) t.expect(texts.includes(s.name), 'No Text shows "' + s.name + '"'); } },
        { story: 'The bars have a dark background color.', run: t => { t.noErrors(); const w = t.all('PanelWindow'); t.expect(w.length > 0, 'No PanelWindow yet'); for (const b of w) { const c = t.rgb(b.color); t.expect((c[0] + c[1] + c[2]) / 3 < 100, 'Use a dark color (got ' + b.color + ')'); } } }
      ] },
    { id: 'm7-q', type: 'quiz', title: 'Practice test: Shell structure', desc: 'Seven questions on windows and screens.',
      questions: [
        { text: 'Which import gives you <code>PanelWindow</code>?', options: ['<code>import QtQuick</code>', '<code>import Quickshell</code>', '<code>import Quickshell.Io</code>', '<code>import Quickshell.Wayland</code>'], answer: 1, why: 'PanelWindow, ShellRoot and Variants are in Quickshell.' },
        { text: 'In a <code>PanelWindow</code>, what type are the <code>anchors</code> values?', options: ['Item lines like <code>parent.left</code>', 'Booleans like <code>top: true</code>', 'Numbers in pixels', 'Strings like <code>"top"</code>'], answer: 1, why: 'They say which screen edges the window sticks to.' },
        { text: 'A PanelWindow anchored only to <code>left</code>, with <code>implicitWidth: 60</code>, is…', options: ['A 60 px column on the left, centered vertically unless it also stretches', 'A full-width bar', 'Hidden', 'An error'], answer: 0, why: 'An axis with no (or one) anchor is not stretched.' },
        { text: 'What does <code>exclusiveZone: 28</code> do?', options: ['Makes the window 28 px wide', 'Reserves 28 px so other windows do not cover the bar', 'Blocks mouse input', 'Sets the layer'], answer: 1, why: 'It pushes tiled windows away from that edge.' },
        { text: 'Inside a <code>Variants</code> delegate, what is <code>modelData</code> for <code>model: Quickshell.screens</code>?', options: ['The screen of this delegate', 'The number of screens', 'The window', 'Always the first screen'], answer: 0, why: 'There is one delegate per screen.' },
        { text: 'Where do <code>margins { left: 40 }</code> apply?', options: ['They move the window away from the anchored edge', 'They add padding inside the window', 'They resize children', 'They change <code>exclusiveZone</code>'], answer: 0, why: 'margins are the gap to the screen edge.' },
        { text: 'You forget <code>import Quickshell</code>. What happens?', options: ['Everything works', '<code>ShellRoot is not a type</code>', 'Only colors break', 'The shell runs but empty'], answer: 1, why: 'Types are only known after their module is imported.' }
      ] },
    { id: 'm7-t2', type: 'theory', title: 'Services and IPC', desc: 'Singleton, SystemClock, Process, IpcHandler.',
      lessons: [
        { title: 'Singletons: shared state',
          html: '<p>Shell state (time, volume, battery) belongs in one place. A <b>singleton</b> is a file whose first line is <code>pragma Singleton</code> and whose root is <code>Singleton { }</code>. Use it from any file by its <b>file name</b>: <code>Clock.time</code>. You never write <code>Clock { }</code>.</p>',
          example: { 'main.qml': `import QtQuick
import Quickshell

ShellRoot {
  PanelWindow {
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"
    Text { anchors.centerIn: parent; color: "white"; text: Greeter.message }
  }
}
`, 'Greeter.qml': `pragma Singleton
import QtQuick
import Quickshell

Singleton {
  property string name: "world"
  readonly property string message: "Hello, " + name + "!"
}
` },
          q: { text: 'What must be the very first line of a singleton file?', options: ['<code>import Quickshell</code>', '<code>pragma Singleton</code>', '<code>Singleton {</code>', '<code>id: root</code>'], answer: 1, why: 'The pragma marks the file as a singleton.' } },
        { title: 'SystemClock and Process',
          html: '<p><code>SystemClock</code> exposes <code>hours</code>, <code>minutes</code> and <code>seconds</code> and updates itself. <code>Process</code> (from <code>Quickshell.Io</code>) runs a command given as an <b>array</b>: <code>command: ["date", "+%H:%M"]</code>. Read the output with a <code>StdioCollector</code> in <code>stdout</code>; <code>onStreamFinished</code> fires when it is complete. Sandbox note: commands are simulated (<code>date</code>, <code>whoami</code>, <code>hostname</code>, <code>uname</code>, <code>nproc</code>, <code>echo</code>, <code>seq</code>), and they finish after a short delay.</p>',
          example: `import QtQuick
import Quickshell
import Quickshell.Io

ShellRoot {
  PanelWindow {
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"
    Text { id: who; anchors.centerIn: parent; color: "white"; text: "..." }
    Process {
      command: ["whoami"]
      running: true
      stdout: StdioCollector { onStreamFinished: who.text = "user: " + text.trim() }
    }
  }
}
`,
          q: { text: 'How do you give a <code>Process</code> its command?', options: ['<code>command: "date +%H:%M"</code>', '<code>command: ["date", "+%H:%M"]</code>', '<code>run: "date"</code>', '<code>exec { date }</code>'], answer: 1, why: 'The command is an array of strings: program first, then its arguments.' } },
        { title: 'IpcHandler: control the shell from outside',
          html: '<p>An <code>IpcHandler</code> exposes functions to the command line. <code>IpcHandler { target: "bar"; function toggle(): void { ... } }</code> is called with <code>qs ipc call bar toggle</code> (in your dynisland: <code>dynisland ipc bar toggle</code>). That is how key bindings in the compositor talk to the shell.</p>',
          example: `import QtQuick
import Quickshell
import Quickshell.Io

ShellRoot {
  PanelWindow {
    id: bar
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"
  }
  IpcHandler {
    target: "bar"
    function toggle(): void { bar.visible = !bar.visible }
  }
}
`,
          q: { text: 'What does an <code>IpcHandler</code> do?', options: ['Draws a window', 'Lets command-line tools call functions inside the shell', 'Reads files', 'Starts the shell'], answer: 1, why: 'target + functions form a small command-line API.' } }
      ] },
    { id: 'm7-l2', type: 'lab', title: 'Clock service', desc: 'A singleton, a Process and an IpcHandler.',
      desc2: '<p>Three files work together: a <b>singleton</b> <code>Clock.qml</code>, a bar in <code>main.qml</code> that shows it, a <code>Process</code> that shows the user name, and an <b>IPC</b> function that hides the bar.</p>',
      files: { 'main.qml': `import QtQuick
import Quickshell
import Quickshell.Io

ShellRoot {
  PanelWindow {
    id: bar
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"

    Text {
      id: clockLabel
      anchors { left: parent.left; leftMargin: 8; verticalCenter: parent.verticalCenter }
      color: "white"
      text: ""          // TODO: show Clock.time
    }
    Text {
      id: userLabel
      anchors { right: parent.right; rightMargin: 8; verticalCenter: parent.verticalCenter }
      color: "#9fb4ff"
      text: "?"
    }
  }

  // TODO: a Process running ["whoami"] whose stdout StdioCollector
  //       puts the trimmed text into userLabel

  // TODO: an IpcHandler with target "bar" and a function toggle()
  //       that flips bar.visible
}
`, 'Clock.qml': `pragma Singleton
import QtQuick
import Quickshell

Singleton {
  id: clock
  // TODO: a SystemClock (id: sc) and
  //       readonly property string time: "HH:MM" with two digits each
}
` },
      solution: { 'main.qml': `import QtQuick
import Quickshell
import Quickshell.Io

ShellRoot {
  PanelWindow {
    id: bar
    anchors { top: true; left: true; right: true }
    implicitHeight: 28
    color: "#1b1b32"

    Text {
      id: clockLabel
      anchors { left: parent.left; leftMargin: 8; verticalCenter: parent.verticalCenter }
      color: "white"
      text: Clock.time
    }
    Text {
      id: userLabel
      anchors { right: parent.right; rightMargin: 8; verticalCenter: parent.verticalCenter }
      color: "#9fb4ff"
      text: "?"
    }
  }

  Process {
    command: ["whoami"]
    running: true
    stdout: StdioCollector { onStreamFinished: userLabel.text = text.trim() }
  }

  IpcHandler {
    target: "bar"
    function toggle(): void { bar.visible = !bar.visible }
  }
}
`, 'Clock.qml': `pragma Singleton
import QtQuick
import Quickshell

Singleton {
  id: clock
  function pad(n) { return (n < 10 ? "0" : "") + n }
  readonly property string time: pad(sc.hours) + ":" + pad(sc.minutes)
  SystemClock { id: sc; precision: SystemClock.Seconds }
}
` },
      tests: [
        { story: '<code>Clock.qml</code> is a singleton: it starts with <code>pragma Singleton</code> and its root is <code>Singleton</code>.', run: t => { const d = t.rt.docs['Clock.qml']; t.expect(d && d.pragmas.includes('Singleton'), 'Add "pragma Singleton" as the first line of Clock.qml'); t.eq(d.root.type, 'Singleton', 'root type of Clock.qml'); } },
        { story: '<code>Clock.time</code> is <code>"12:00"</code> at the start and <code>"12:01"</code> after 61 seconds (two digits each).', run: t => { t.noErrors(); t.eq(t.single('Clock').time, '12:00', 'Clock.time at start'); t.advance(61000); t.eq(t.single('Clock').time, '12:01', 'Clock.time after 61 s'); } },
        { story: 'The bar\'s <code>clockLabel</code> shows <code>Clock.time</code> and keeps following it.', run: t => { t.noErrors(); t.eq(t.find('clockLabel').text, '12:00', 'clockLabel at start'); t.advance(60000); t.eq(t.find('clockLabel').text, '12:01', 'clockLabel a minute later'); } },
        { story: 'A <code>Process</code> runs <code>whoami</code>; once it finishes, <code>userLabel</code> shows <code>jano</code>.', run: t => { t.noErrors(); t.advance(100); t.eq(t.find('userLabel').text, 'jano', 'userLabel after the command finished'); } },
        { story: 'An <code>IpcHandler</code> with target <code>"bar"</code> has <code>toggle()</code>, which hides and shows the bar.', run: t => { t.noErrors(); t.eq(t.find('bar').visible, true, 'bar.visible at start'); t.ipc('bar', 'toggle'); t.eq(t.find('bar').visible, false, 'bar.visible after toggle()'); t.ipc('bar', 'toggle'); t.eq(t.find('bar').visible, true, 'bar.visible after the second toggle()'); } }
      ] },
    { id: 'm7-r', type: 'review', title: 'Review: Quickshell', desc: 'Cheat sheet.',
      html: '<h2>Quickshell: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Imports</td><td><code>import Quickshell</code>, <code>Quickshell.Io</code> (Process, IpcHandler), <code>Quickshell.Wayland</code> (WlrLayershell)</td></tr><tr><td>Root</td><td><code>ShellRoot { PanelWindow { ... } }</code></td></tr><tr><td>Edge window</td><td><code>PanelWindow { anchors { top: true; left: true; right: true }; implicitHeight: 28; exclusiveZone: 28 }</code></td></tr><tr><td>Gaps</td><td><code>margins { left: 40; bottom: 8 }</code></td></tr><tr><td>Per screen</td><td><code>Variants { model: Quickshell.screens; PanelWindow { required property var modelData; screen: modelData } }</code></td></tr><tr><td>Layer</td><td><code>WlrLayershell.layer: WlrLayer.Overlay</code>, <code>WlrLayershell.namespace: "name"</code></td></tr><tr><td>Singleton</td><td>file with <code>pragma Singleton</code> + <code>Singleton { }</code>, used as <code>Name.property</code></td></tr><tr><td>Time</td><td><code>SystemClock { id: sc }</code> then <code>sc.hours</code>, <code>sc.minutes</code></td></tr><tr><td>Commands</td><td><code>Process { command: ["date"]; running: true; stdout: StdioCollector { onStreamFinished: ... text } }</code></td></tr><tr><td>Fire and forget</td><td><code>Quickshell.execDetached(["notify-send", "hi"])</code></td></tr><tr><td>Remote control</td><td><code>IpcHandler { target: "bar"; function toggle(): void {...} }</code> then <code>qs ipc call bar toggle</code></td></tr><tr><td>On demand</td><td><code>LazyLoader { active: cond; PanelWindow {...} }</code></td></tr></table><p>Sandbox notes: two fake 360x200 screens, a virtual clock starting at 12:00:00, simulated commands. Next: the final project, your own Dynamic Island.</p>' }
  ]
});
