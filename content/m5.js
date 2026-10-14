// =============================================================================
//  Module 5: States, Transitions & Animation
//  Blocks: Theory A -> Lab A -> Quiz -> Theory B -> Lab B -> Review
// =============================================================================
window.QMLCAMP.modules.push({
  id: 'm5', title: 'States & Animation',
  desc: 'Describe UI states with State and PropertyChanges, then animate with Behavior, Transition and NumberAnimation.',
  blocks: [
    { id: 'm5-t1', type: 'theory', title: 'States', desc: 'State, PropertyChanges, state, when.',
      lessons: [
        { title: 'What a state is',
          html: '<p>A <b>state</b> is a named bundle of property changes. Every item has a <code>state</code> property. The default (base) state has the empty name <code>""</code>. You list the extra states in the <code>states</code> property.</p><pre><code>states: [\n  State { name: "on"; PropertyChanges { target: box; color: "gold" } }\n]</code></pre>',
          example: `import QtQuick

Rectangle {
  id: room
  width: 200; height: 100; color: "#222"
  Rectangle { id: box; width: 50; height: 50; color: "gray" }
  MouseArea {
    anchors.fill: parent
    onClicked: room.state = room.state === "on" ? "" : "on"
  }
  states: [
    State { name: "on"; PropertyChanges { target: box; color: "gold"; x: 120 } }
  ]
}
`,
          q: { text: 'What is the name of the default (base) state?', options: ['<code>"default"</code>', 'The empty string <code>""</code>', '<code>"base"</code>', '<code>"idle"</code>'], answer: 1, why: 'The base state has an empty name, so <code>state = ""</code> goes back to it.' } },
        { title: 'PropertyChanges',
          html: '<p><code>PropertyChanges</code> says <i>which</i> object changes (<code>target:</code>, an id) and then lists the properties with their new values. When the item leaves the state, QML <b>restores</b> the old values, even if they were bindings. That restoring is what makes states handy.</p>',
          example: `import QtQuick

Rectangle {
  id: card
  property int n: 1
  width: 220; height: 80; color: "teal"
  Text { id: label; anchors.centerIn: parent; text: "n = " + card.n; color: "white" }
  MouseArea { anchors.fill: parent; onPressed: card.state = "big"; onReleased: card.state = "" }
  states: State { name: "big" }
}
`,
          q: { text: 'An item leaves a state. What happens to the properties that state changed?', options: ['They keep the state values', 'They are restored to their previous value or binding', 'They become undefined', 'QML throws an error'], answer: 1, why: 'Leaving a state undoes its PropertyChanges.' } },
        { title: 'Switching: assign or when',
          html: '<p>Two ways to pick a state. Assign it from a handler: <code>onClicked: room.state = "on"</code>. Or let a condition decide with <code>when:</code> inside the State: the state is active while the expression is true.</p><pre><code>State { name: "hot"; when: sensor.temp &gt; 30\n  PropertyChanges { target: bar; color: "red" } }</code></pre>',
          example: `import QtQuick

Rectangle {
  id: r
  property bool hot: false
  width: 200; height: 80; color: "steelblue"
  MouseArea { anchors.fill: parent; onClicked: r.hot = !r.hot }
  states: [
    State { name: "hot"; when: r.hot; PropertyChanges { target: r; color: "crimson" } }
  ]
}
`,
          q: { text: 'What does <code>when: mouse.pressed</code> inside a State do?', options: ['Runs code once at startup', 'Makes that state active while the expression is true', 'Delays the state by one click', 'Names the state "pressed"'], answer: 1, why: 'The state is active while its <code>when</code> is true.' } }
      ] },
    { id: 'm5-l1', type: 'lab', title: 'Light switch', desc: 'Toggle a room between two states.',
      desc2: '<p>Click the room to switch the light on and off, using <b>states</b> (not by assigning colors in the handler).</p>',
      files: { 'main.qml': `import QtQuick

Rectangle {
  id: room
  width: 300; height: 200
  color: "#222222"

  Rectangle {
    id: bulb
    width: 60; height: 60; radius: 30
    anchors.centerIn: parent
    color: "gray"
  }

  MouseArea {
    id: switchArea
    anchors.fill: parent
    // TODO: toggle room.state between "" and "on"
  }

  // TODO: add states: a State named "on"
}
` },
      solution: { 'main.qml': `import QtQuick

Rectangle {
  id: room
  width: 300; height: 200
  color: "#222222"

  Rectangle {
    id: bulb
    width: 60; height: 60; radius: 30
    anchors.centerIn: parent
    color: "gray"
  }

  MouseArea {
    id: switchArea
    anchors.fill: parent
    onClicked: room.state = room.state === "on" ? "" : "on"
  }

  states: [
    State {
      name: "on"
      PropertyChanges { target: bulb; color: "gold" }
      PropertyChanges { target: room; color: "#fff3c4" }
    }
  ]
}
` },
      tests: [
        { story: 'The file declares a <code>State</code> named <code>"on"</code>.', run: t => { t.expect(t.nodes('State').some(n => /^["']on["']$/.test(t.bindingOf(n, 'name') || '')), 'No State with name "on" found in states'); } },
        { story: 'A <code>PropertyChanges</code> with <code>target: bulb</code> changes the bulb color.', run: t => { t.expect(t.nodes('PropertyChanges').some(n => t.bindingOf(n, 'target') === 'bulb' && t.bindingOf(n, 'color') !== null), 'Add PropertyChanges { target: bulb; color: ... } inside the State'); } },
        { story: 'At the start <code>room.state</code> is <code>""</code> and the bulb is gray.', run: t => { t.noErrors(); t.eq(t.find('room').state, '', 'room.state'); t.eq(t.rgb(t.find('bulb').color).join(','), t.rgb('gray').join(','), 'bulb color'); } },
        { story: 'Clicking the room makes <code>state</code> equal <code>"on"</code> and turns the bulb yellow.', run: t => { t.noErrors(); t.click('switchArea'); t.eq(t.find('room').state, 'on', 'room.state'); const c = t.rgb(t.find('bulb').color); t.expect(c[0] > 200 && c[1] > 170 && c[2] < 120, 'The bulb should be yellow in state "on" (got rgb ' + c.join(',') + ')'); } },
        { story: 'In state <code>"on"</code> the room background is lighter than at the start.', run: t => { t.click('switchArea'); const c = t.rgb(t.find('room').color); t.expect((c[0] + c[1] + c[2]) / 3 > 100, 'Also change room.color in the "on" state'); } },
        { story: 'Clicking again returns to <code>""</code>, and the bulb is gray again (restored).', run: t => { t.click('switchArea'); t.click('switchArea'); t.eq(t.find('room').state, '', 'room.state'); t.eq(t.rgb(t.find('bulb').color).join(','), t.rgb('gray').join(','), 'bulb color after leaving the state'); } }
      ] },
    { id: 'm5-q', type: 'quiz', title: 'Practice test: States', desc: 'Seven questions on states.',
      questions: [
        { text: 'Which property of an item holds the list of its extra states?', options: ['<code>modes</code>', '<code>states</code>', '<code>stateList</code>', '<code>transitions</code>'], answer: 1, why: '<code>states: [ State { ... } ]</code>.' },
        { text: 'Which line puts the item back into its base state?', options: ['<code>item.state = ""</code>', '<code>item.state = null</code>', '<code>item.state = "base"</code>', '<code>item.reset()</code>'], answer: 0, why: 'The base state has the empty name.' },
        { text: 'Which property is required in a <code>PropertyChanges</code>?', options: ['<code>name</code>', '<code>target</code>', '<code>when</code>', '<code>from</code>'], answer: 1, why: 'target says which object changes.' },
        { text: 'What does <code>when: ma.pressed</code> in a State do?', options: ['The state is active while <code>ma.pressed</code> is true', 'It runs once', 'It renames the state', 'It is a syntax error'], answer: 0, why: 'when is a condition for the state.' },
        { text: 'A state sets <code>box.color: "red"</code>. The box had <code>color: parent.color</code> before. After leaving the state the color is…', options: ['"red" forever', 'bound to <code>parent.color</code> again', 'undefined', 'black'], answer: 1, why: 'The old binding is restored.' },
        { text: 'A <code>State</code> without a <code>name</code>…', options: ['Is the base state', 'Is an error: a State needs a name', 'Is named "default"', 'Is ignored silently'], answer: 1, why: 'Every State needs a name.' },
        { text: 'Which is the right place to write <code>PropertyChanges</code>?', options: ['Inside a <code>State</code>', 'At the top of the file', 'Inside <code>Component.onCompleted</code>', 'Inside <code>signal</code>'], answer: 0, why: 'PropertyChanges describe a State.' }
      ] },
    { id: 'm5-t2', type: 'theory', title: 'Animation', desc: 'Behavior, NumberAnimation, ColorAnimation, Transition.',
      lessons: [
        { title: 'Behavior',
          html: '<p>A <code>Behavior on x</code> animates <b>every</b> change of that property, no matter what causes it: a binding, a handler, a state.</p><pre><code>Behavior on x { NumberAnimation { duration: 200 } }</code></pre>',
          example: `import QtQuick

Rectangle {
  width: 300; height: 80; color: "#222"
  Rectangle {
    id: dot
    width: 40; height: 40; radius: 20; color: "gold"; y: 20
    Behavior on x { NumberAnimation { duration: 400 } }
  }
  MouseArea { anchors.fill: parent; onClicked: dot.x = dot.x > 100 ? 10 : 240 }
}
`,
          q: { text: 'When does <code>Behavior on x</code> animate?', options: ['Only when a State changes', 'Whenever <code>x</code> changes, whatever the cause', 'Only at startup', 'Only on mouse clicks'], answer: 1, why: 'A Behavior wraps the property itself.' } },
        { title: 'NumberAnimation and ColorAnimation',
          html: '<p><code>NumberAnimation</code> animates numbers (x, width, opacity, rotation). <code>ColorAnimation</code> animates colors. <code>duration</code> is in <b>milliseconds</b>. Real Qt also has <code>easing.type</code> (for example <code>Easing.OutCubic</code>); the course sandbox always animates linearly.</p>',
          example: `import QtQuick

Rectangle {
  id: r
  width: 160; height: 80; color: "steelblue"
  Behavior on color { ColorAnimation { duration: 500 } }
  Behavior on width { NumberAnimation { duration: 300 } }
  MouseArea { anchors.fill: parent; onClicked: { r.color = "tomato"; r.width = 280 } }
}
`,
          q: { text: 'Which animation type fits a <code>color</code> property?', options: ['<code>NumberAnimation</code>', '<code>ColorAnimation</code>', '<code>TextAnimation</code>', '<code>RotationAnimation</code>'], answer: 1, why: 'ColorAnimation interpolates colors.' } },
        { title: 'Transition',
          html: '<p>A <code>Transition</code> animates what a <b>state change</b> does. List it in <code>transitions</code>; the animations inside say which properties and how long. In the sandbox a Transition animates the properties that a state changes.</p><pre><code>transitions: [\n  Transition { NumberAnimation { properties: "x,y"; duration: 300 } }\n]</code></pre>',
          example: `import QtQuick

Rectangle {
  id: stage
  width: 300; height: 80; color: "#222"
  Rectangle { id: ball; width: 40; height: 40; radius: 20; color: "tomato"; y: 20 }
  MouseArea { anchors.fill: parent; onClicked: stage.state = stage.state === "right" ? "" : "right" }
  states: State { name: "right"; PropertyChanges { target: ball; x: 240 } }
  transitions: Transition { NumberAnimation { properties: "x"; duration: 500 } }
}
`,
          q: { text: 'What is the difference between <code>Behavior</code> and <code>Transition</code>?', options: ['None', 'Behavior animates one property whenever it changes; Transition animates the changes of a state switch', 'Transition only works on Text', 'Behavior only works with <code>when</code>'], answer: 1, why: 'Behavior is per property; Transition is per state change.' } }
      ] },
    { id: 'm5-l2', type: 'lab', title: 'Toggle switch', desc: 'A smooth on/off switch with Behavior.',
      desc2: '<p>Build the classic switch: the knob slides and the track changes color. Use <b>bindings</b> for the values and <b>Behavior</b> for the motion.</p>',
      files: { 'main.qml': `import QtQuick

Rectangle {
  id: track
  property bool on: false
  width: 120; height: 50; radius: 25
  color: "#777777"

  Rectangle {
    id: knob
    width: 40; height: 40; radius: 20
    y: 5
    color: "white"
    // TODO: x = 5 when off, track.width - width - 5 when on
    // TODO: Behavior on x
  }

  MouseArea {
    anchors.fill: parent
    // TODO: toggle track.on
  }
}
` },
      solution: { 'main.qml': `import QtQuick

Rectangle {
  id: track
  property bool on: false
  width: 120; height: 50; radius: 25
  color: on ? "#4cd964" : "#777777"
  Behavior on color { ColorAnimation { duration: 200 } }

  Rectangle {
    id: knob
    width: 40; height: 40; radius: 20
    y: 5
    color: "white"
    x: track.on ? track.width - width - 5 : 5
    Behavior on x { NumberAnimation { duration: 200 } }
  }

  MouseArea {
    anchors.fill: parent
    onClicked: track.on = !track.on
  }
}
` },
      tests: [
        { story: '<code>track.on</code> starts <code>false</code> and the knob sits at <code>x = 5</code>.', run: t => { t.noErrors(); t.eq(t.find('track').on, false, 'track.on'); t.eq(t.find('knob').x, 5, 'knob.x'); } },
        { story: 'Clicking turns <code>on</code> true and moves the knob to the right end (<code>x = 75</code>).', run: t => { t.noErrors(); t.click('track'); t.eq(t.find('track').on, true, 'track.on'); t.near(t.find('knob').x, 75, 'knob.x'); } },
        { story: 'Clicking again moves the knob back to <code>x = 5</code>.', run: t => { t.click('track'); t.click('track'); t.near(t.find('knob').x, 5, 'knob.x'); } },
        { story: 'The knob\'s <code>x</code> is a <b>binding</b> that uses <code>track.on</code> (not assigned in the click handler).', run: t => { const k = t.nodes('Rectangle').find(n => n.members.some(m => m.kind === 'id' && m.value === 'knob')); t.expect(k && t.isBound(k, 'x') && /\bon\b/.test(t.bindingOf(k, 'x')), 'Write x: track.on ? ... : ... on the knob'); } },
        { story: 'The knob has a <code>Behavior on x</code> with a <code>duration</code> between 100 and 500 ms.', run: t => { const d = t.behaviorMs('knob', 'x'); t.expect(d >= 100 && d <= 500, 'Add Behavior on x { NumberAnimation { duration: 200 } } (found ' + d + ' ms)'); } },
        { story: 'When on, the track turns green (green clearly above red) and has a <code>Behavior on color</code>.', run: t => { t.click('track'); const c = t.rgb(t.find('track').color); t.expect(c[1] > c[0] + 40, 'The track should be green when on (got rgb ' + c.join(',') + ')'); t.expect(t.behaviorMs('track', 'color') > 0, 'Add Behavior on color { ColorAnimation { duration: 200 } } to the track'); } }
      ] },
    { id: 'm5-r', type: 'review', title: 'Review: States & Animation', desc: 'Cheat sheet.',
      html: '<h2>States & Animation: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Base state</td><td><code>state: ""</code></td></tr><tr><td>Define a state</td><td><code>states: [ State { name: "on"; PropertyChanges { target: box; color: "gold" } } ]</code></td></tr><tr><td>Switch</td><td><code>item.state = "on"</code> or <code>when: condition</code> in the State</td></tr><tr><td>Animate a property</td><td><code>Behavior on x { NumberAnimation { duration: 200 } }</code></td></tr><tr><td>Animate colors</td><td><code>ColorAnimation</code></td></tr><tr><td>Animate a state change</td><td><code>transitions: [ Transition { NumberAnimation { properties: "x"; duration: 300 } } ]</code></td></tr></table><p>Sandbox note: easing curves are ignored (everything is linear). Next: models and views, Quickshell, and the final project.</p>' }
  ]
});
