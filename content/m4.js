// Module 4: Scope & Components
window.QMLCAMP.modules.push({
  id: 'm4', title: 'Scope & Components',
  desc: 'Scope rules, property alias, reusable components in their own files and Repeater delegates.',
  blocks: [
    { id: 'm4-t1', type: 'theory', title: 'Scope and alias', desc: 'Where names resolve, property alias, modularity.',
      lessons: [
        { title: 'Scope rules', html: '<p>A name in an expression is looked up in this order: <b>ids</b> in the file, the <b>object itself</b>, the <b>root object</b> of the file, then globals (<code>Qt</code>, <code>console</code>, <code>Math</code>). Use ids or explicit <code>parent.x</code> to avoid surprises.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: root\n  property string label: "root label"\n  width: 220; height: 60; color: "#2a2a40"\n  Text {\n    color: "white"\n    anchors.centerIn: parent\n    text: label        // not on Text: found on the root\n  }\n}\n',
          q: { text: 'In the example, why does <code>label</code> resolve inside <code>Text</code>?', options: ['Text has a property label', 'Names fall back to the root object of the file', 'It is a global', 'It is a bug'], answer: 1, why: 'The root object is in scope for every object in the file.' } },
        { title: 'property alias', html: '<p><code>property alias name: target.property</code> exposes an inner property under a new name. It is how a component hides its internals but lets users set what matters.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: box\n  property alias title: heading.text\n  width: 200; height: 50; color: "#1b1b32"\n  Text { id: heading; color: "white"; anchors.centerIn: parent; text: "x" }\n  Component.onCompleted: box.title = "Alias works"\n}\n',
          q: { text: 'What is the point of an alias?', options: ['It copies a value once', 'It exposes an inner property under a new name', 'It renames a type', 'It deletes an id'], answer: 1, why: 'Reading or writing the alias reads or writes the target.' } },
        { title: 'Why components', html: '<p>Any QML file whose name starts with a capital letter is a new type usable in other files of the same folder: <code>Button.qml</code> gives you <code>Button { }</code>. This is how you avoid copy-paste.</p>',
          q: { text: 'You save <code>Card.qml</code>. How do you use it from <code>main.qml</code> in the same folder?', options: ['<code>import Card</code>', '<code>Card { }</code>', '<code>include "Card.qml"</code>', '<code>new Card()</code>'], answer: 1, why: 'Files in the same directory are types automatically.' } }
      ] },
    { id: 'm4-l1', type: 'lab', title: 'ValueBox', desc: 'A reusable file component with aliases.',
      desc2: '<p>Create <code>ValueBox.qml</code>: a box with a caption and a value. Expose them as <code>caption</code> and <code>value</code> aliases. Use it twice in <code>main.qml</code>.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRow {\n  spacing: 10\n  // TODO: two ValueBox items: id: temp (caption "Temp", value "21") and id: hum (caption "Humidity", value "40")\n}\n', 'ValueBox.qml': 'import QtQuick\n\nRectangle {\n  width: 100; height: 60; color: "#2a2a40"\n  // TODO: Text id: cap, Text id: val, aliases caption and value\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRow {\n  spacing: 10\n  ValueBox { id: temp; caption: "Temp"; value: "21" }\n  ValueBox { id: hum; caption: "Humidity"; value: "40" }\n}\n', 'ValueBox.qml': 'import QtQuick\n\nRectangle {\n  property alias caption: cap.text\n  property alias value: val.text\n  width: 100; height: 60; color: "#2a2a40"\n  Text { id: cap; color: "#9d9db1"; x: 8; y: 6 }\n  Text { id: val; color: "white"; font.pixelSize: 22; x: 8; y: 28 }\n}\n' },
      tests: [
        { story: '<code>ValueBox.qml</code> declares the properties <code>caption</code> and <code>value</code>.', run: t => { t.expect(t.declares('ValueBox.qml', 'caption') && t.declares('ValueBox.qml', 'value'), 'declare both aliases in ValueBox.qml'); } },
        { story: '<code>main.qml</code> has two <code>ValueBox</code> items <code>temp</code> and <code>hum</code>.', run: t => { t.noErrors(); t.find('temp'); t.find('hum'); t.eq(t.count('ValueBox'), 2, 'ValueBox count'); } },
        { story: '<code>temp</code> has caption "Temp" and value "21".', run: t => { t.eq(t.find('temp').caption, 'Temp', 'temp.caption'); t.eq(t.find('temp').value, '21', 'temp.value'); } },
        { story: '<code>hum</code> shows "Humidity" and "40" without changing temp.', run: t => { t.eq(t.find('hum').caption, 'Humidity', 'hum.caption'); t.eq(t.find('hum').value, '40', 'hum.value'); t.eq(t.find('temp').value, '21', 'temp must stay 21'); } },
        { story: 'Changing <code>temp.value</code> from code updates it (alias is writable).', run: t => { t.find('temp').value = '99'; t.eq(t.find('temp').value, '99', 'temp.value after write'); } },
        { story: 'The two boxes sit side by side (the second has a larger x).', run: t => { t.expect(t.find('hum').x > t.find('temp').x, 'hum must be right of temp'); } }
      ] },
    { id: 'm4-q1', type: 'quiz', title: 'Practice test: scope and aliases', desc: '70% to pass.',
      questions: [
        { text: 'Which has the highest priority when a name is looked up?', options: ['Global objects', 'Ids in the file', 'The root object', 'The parent'], answer: 1, why: 'Ids first, then the object, then root, then globals.' },
        { text: 'A file named <code>Badge.qml</code> in the same folder gives you...', options: ['A type <code>Badge</code>', 'A module <code>Badge</code>', 'Nothing until compiled', 'An id'], answer: 0, why: '' },
        { text: 'An alias declared in a component...', options: ['Can be set by users of the component', 'Is always read-only', 'Must be a number', 'Cannot target a Text'], answer: 0, why: '' },
        { text: 'Why use components?', options: ['To avoid repeating code and hide internals', 'To make files bigger', 'Because QML requires it', 'To change the language'], answer: 0, why: '' }
      ] },
    { id: 'm4-t2', type: 'theory', title: 'Components and delegates', desc: 'File vs inline components, Repeater delegates.',
      lessons: [
        { title: 'Inline components', html: '<p>For small types you can declare them inside a file: <code>component Dot: Rectangle { width: 10; height: 10; radius: 5 }</code>, then use <code>Dot { }</code> in the same file.</p>',
          example: 'import QtQuick\n\nRow {\n  spacing: 6\n  component Dot: Rectangle { width: 14; height: 14; radius: 7; color: "gold" }\n  Dot {}\n  Dot { color: "tomato" }\n  Dot {}\n}\n',
          q: { text: 'When is an inline <code>component</code> a good fit?', options: ['For a small type used only in this file', 'For a huge reusable type', 'Never', 'Only for Timers'], answer: 0, why: 'Bigger types belong in their own file.' } },
        { title: 'Delegates with modelData', html: '<p>A <code>Repeater</code> over an array exposes <code>modelData</code> (the item) and <code>index</code>. Your own component can be the delegate.</p>',
          example: 'import QtQuick\n\nColumn {\n  spacing: 4\n  Repeater {\n    model: ["Wi-Fi", "Bluetooth", "Battery"]\n    Rectangle {\n      width: 140; height: 28; color: "#2a2a40"\n      Text { anchors.centerIn: parent; color: "white"; text: index + ": " + modelData }\n    }\n  }\n}\n',
          q: { text: 'With <code>model: ["a","b"]</code>, what is <code>modelData</code> in the second delegate?', options: ['"a"', '"b"', '1', 'undefined'], answer: 1, why: 'modelData is the array element; index is 1.' } }
      ] },
    { id: 'm4-l2', type: 'lab', title: 'Button + list + status', desc: 'A Button type, a Repeater and a status text.',
      desc2: '<p>Create <code>Button.qml</code> with a <code>text</code> property and a <code>clicked</code> signal. In <code>main.qml</code>, make three buttons from the array. Clicking one sets <code>status.text</code> to <code>Selected: &lt;name&gt;</code>.</p>',
      files: { 'main.qml': 'import QtQuick\n\nColumn {\n  spacing: 8\n  property var names: ["Wi-Fi", "Sound", "Battery"]\n  Text { id: status; color: "white"; text: "Nothing selected" }\n  // TODO: Repeater with model names, delegate Button\n}\n', 'Button.qml': 'import QtQuick\n\nRectangle {\n  id: root\n  width: 120; height: 32; color: "#2a2a40"\n  // TODO: property string text, signal clicked(), Text, MouseArea\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nColumn {\n  spacing: 8\n  property var names: ["Wi-Fi", "Sound", "Battery"]\n  Text { id: status; color: "white"; text: "Nothing selected" }\n  Repeater {\n    model: names\n    Button {\n      text: modelData\n      onClicked: status.text = "Selected: " + modelData\n    }\n  }\n}\n', 'Button.qml': 'import QtQuick\n\nRectangle {\n  id: root\n  property string text: ""\n  signal clicked()\n  width: 120; height: 32; color: "#2a2a40"\n  Text { anchors.centerIn: parent; color: "white"; text: root.text }\n  MouseArea { anchors.fill: parent; onClicked: root.clicked() }\n}\n' },
      tests: [
        { story: '<code>Button.qml</code> declares a <code>text</code> property and a <code>clicked</code> signal.', run: t => { t.expect(t.declares('Button.qml', 'text'), 'declare property string text'); t.expect(/signal\s+clicked/.test(t.source('Button.qml')), 'declare signal clicked()'); } },
        { story: 'Three <code>Button</code> items are created from the array with a Repeater.', run: t => { t.noErrors(); t.expect(t.uses('Repeater'), 'use a Repeater'); t.eq(t.count('Button'), 3, 'Button count'); } },
        { story: 'The buttons show the names Wi-Fi, Sound and Battery.', run: t => { const b = t.all('Button').map(x => x.text).sort(); t.eq(b.join(','), 'Battery,Sound,Wi-Fi', 'button texts'); } },
        { story: 'Initially <code>status.text</code> is "Nothing selected".', run: t => { t.eq(t.find('status').text, 'Nothing selected', 'status.text'); } },
        { story: 'Clicking the second button sets <code>status.text</code> to "Selected: Sound".', run: t => { t.click(t.all('Button')[1]); t.eq(t.find('status').text, 'Selected: Sound', 'status.text'); } },
        { story: 'Clicking the third button changes it to "Selected: Battery".', run: t => { t.click(t.all('Button')[2]); t.eq(t.find('status').text, 'Selected: Battery', 'status.text'); } }
      ] },
    { id: 'm4-r', type: 'review', title: 'Review: Scope & Components', desc: 'Cheat sheet.',
      html: '<h2>Scope & Components: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Scope order</td><td>ids, object, root, globals</td></tr><tr><td>Alias</td><td><code>property alias title: label.text</code></td></tr><tr><td>File component</td><td><code>Card.qml</code> then <code>Card { }</code></td></tr><tr><td>Inline component</td><td><code>component Dot: Rectangle { ... }</code></td></tr><tr><td>Delegate vars</td><td><code>index</code>, <code>modelData</code></td></tr></table><p>Next: states, transitions and animations, then models and views, Quickshell, and the final project.</p>' }
  ]
});
