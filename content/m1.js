// =============================================================================
//  Module 1: QML Basics
//  Blocks: Theory A -> Lab A -> Quiz -> Theory B -> Lab B -> Review
// =============================================================================
window.QMLCAMP.upcoming = [];
window.QMLCAMP.modules.push({
  id: 'm1', title: 'QML Basics',
  desc: 'What QML is, how a document is built, objects, properties, ids, anchors and positioners.',
  blocks: [
    { id: 'm1-t1', type: 'theory', title: 'Objects and properties', desc: 'Document structure, types, properties, id and parent.',
      intro: 'QML is a <b>declarative</b> language: you describe <i>what</i> the interface looks like, not the steps to draw it.',
      lessons: [
        { title: 'What QML is', html: '<p>A QML file describes a tree of <b>objects</b>. Each object has a <b>type</b> (like <code>Rectangle</code>) and <b>properties</b> (like <code>color</code>). Curly braces hold the properties and child objects.</p><p>Quickshell, Qt Quick apps and Plasma widgets are all written this way.</p>',
          example: 'import QtQuick\n\nRectangle {\n  width: 200\n  height: 100\n  color: "tomato"\n}\n',
          q: { text: 'What does a QML file mainly describe?', options: ['A list of steps the computer runs in order', 'A tree of objects with properties', 'Only the CSS styling of a page', 'A database schema'], answer: 1, why: 'QML is declarative: a tree of typed objects and their properties.' } },
        { title: 'Document structure', html: '<p>A QML file has <b>imports</b> first, then exactly <b>one root object</b>. Without <code>import QtQuick</code>, types like <code>Rectangle</code> are unknown. Try deleting the import below and read the error.</p>',
          example: 'import QtQuick\n\nRectangle {\n  width: 220; height: 80\n  color: "#2a2a40"\n  Text {\n    text: "Hello QML"\n    color: "white"\n    anchors.centerIn: parent\n  }\n}\n',
          q: { text: 'Which line makes <code>Rectangle</code> and <code>Text</code> available?', options: ['<code>include Rectangle</code>', '<code>import QtQuick</code>', '<code>using QtQuick</code>', 'Nothing, they are always available'], answer: 1, why: 'Types come from imported modules.' } },
        { title: 'Properties, id and parent', html: '<p>Set a property with <code>name: value</code>. Separate several on one line with <code>;</code>. Give an object an <code>id</code> to refer to it from elsewhere. Inside a child, <code>parent</code> is the object that contains it.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: card\n  width: 240; height: 120\n  color: "#1b1b32"\n  Rectangle {\n    width: parent.width / 2\n    height: parent.height\n    color: "gold"\n  }\n}\n',
          q: { text: 'In the example, what is <code>parent.width</code> inside the gold rectangle?', options: ['The width of the gold rectangle', 'The width of <code>card</code>', 'The width of the window', 'Always 0'], answer: 1, why: '<code>parent</code> is the item that contains it, here <code>card</code>.' } }
      ] },
    { id: 'm1-l1', type: 'lab', title: 'Profile card', desc: 'Build a card with a name, a title and an avatar.',
      desc2: '<p>Build a profile card. Edit <code>main.qml</code> until all user stories pass.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  // TODO: id: card, width 260, height 120, dark background\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: card\n  width: 260; height: 120\n  color: "#1b1b32"\n  Rectangle {\n    id: avatar\n    width: 60; height: 60; radius: 30\n    x: 12; y: 30\n    color: "gold"\n  }\n  Text {\n    id: nameText\n    text: "Ada Lovelace"\n    color: "white"\n    font.pixelSize: 20\n    x: 84; y: 36\n  }\n  Text {\n    id: roleText\n    text: "Programmer"\n    color: "#9d9db1"\n    x: 84; y: 66\n  }\n}\n' },
      tests: [
        { story: 'Your root <code>Rectangle</code> has <code>id: card</code>.', run: t => { t.noErrors(); t.find('card'); } },
        { story: '<code>card</code> is 260 wide and 120 tall.', run: t => { t.noErrors(); t.eq(t.find('card').width, 260, 'width'); t.eq(t.find('card').height, 120, 'height'); } },
        { story: 'There is a round <code>Rectangle</code> with <code>id: avatar</code> (60x60, <code>radius: 30</code>).', run: t => { const a = t.find('avatar'); t.eq(a.width, 60, 'avatar width'); t.eq(a.height, 60, 'avatar height'); t.eq(a.radius, 30, 'avatar radius'); } },
        { story: 'A <code>Text</code> with <code>id: nameText</code> shows a non-empty name.', run: t => { t.expect(String(t.find('nameText').text).length > 0, 'nameText.text is empty'); } },
        { story: 'A <code>Text</code> with <code>id: roleText</code> shows a non-empty title.', run: t => { t.expect(String(t.find('roleText').text).length > 0, 'roleText.text is empty'); } },
        { story: 'The card background is dark (all RGB channels below 100).', run: t => { const c = t.rgb(t.find('card').color); t.expect(c.every(v => v < 100), 'card.color is not dark'); } }
      ] },
    { id: 'm1-q1', type: 'quiz', title: 'Practice test: objects and properties', desc: 'Check what you learned (70% to pass).',
      questions: [
        { text: 'How many root objects can a QML file have?', options: ['Any number', 'Exactly one', 'Two: one visual and one logic', 'Zero'], answer: 1, why: 'One root object, with children inside it.' },
        { text: 'Which line sets the width to 100?', options: ['<code>width = 100</code>', '<code>width: 100</code>', '<code>set width 100</code>', '<code>width(100)</code>'], answer: 1, why: 'QML uses <code>name: value</code>.' },
        { text: 'What do you get from <code>Rectangle { colour: "red" }</code>?', options: ['A red rectangle', 'An error: non-existent property', 'A blue rectangle', 'Nothing, silently ignored'], answer: 1, why: 'The property is <code>color</code>; unknown names are errors.' },
        { text: 'What is <code>id</code> used for?', options: ['Sorting items', 'Referring to an object from other places in the file', 'Setting the z order', 'Naming the file'], answer: 1, why: 'ids let other objects reference this one.' },
        { text: 'Which keyword gives you the containing item?', options: ['<code>owner</code>', '<code>this</code>', '<code>parent</code>', '<code>up</code>'], answer: 2, why: '<code>parent</code> is the visual parent.' }
      ] },
    { id: 'm1-t2', type: 'theory', title: 'Layout: types, anchors, positioners', desc: 'Property types, anchors, Row, Column, Grid, Repeater.',
      lessons: [
        { title: 'Property types and custom properties', html: '<p>Built-in properties have types: <code>int</code>, <code>real</code>, <code>string</code>, <code>bool</code>, <code>color</code>. You can declare your own with <code>property &lt;type&gt; name: value</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  property string label: "Hi"\n  property color accent: "gold"\n  width: 200; height: 60; color: accent\n  Text { text: label; anchors.centerIn: parent }\n}\n',
          q: { text: 'Which line declares a new string property?', options: ['<code>string name: "x"</code>', '<code>property string name: "x"</code>', '<code>var string name = "x"</code>', '<code>name: string "x"</code>'], answer: 1, why: '<code>property &lt;type&gt; &lt;name&gt;: &lt;value&gt;</code>.' } },
        { title: 'Anchors', html: '<p>Anchors attach an item to its parent or siblings: <code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.left</code>, <code>anchors.margins</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  width: 240; height: 120; color: "#2a2a40"\n  Rectangle {\n    anchors.fill: parent\n    anchors.margins: 12\n    color: "teal"\n  }\n}\n',
          q: { text: 'What does <code>anchors.fill: parent</code> do?', options: ['Centers the item', 'Makes the item cover its parent', 'Hides the parent', 'Fills the item with color'], answer: 1, why: 'The item gets the same bounds as the parent (minus margins).' } },
        { title: 'Row, Column, Grid and Repeater', html: '<p><code>Row</code>, <code>Column</code> and <code>Grid</code> place children automatically; use <code>spacing</code> for gaps. A <code>Repeater</code> creates many copies from a number or an array; inside, <code>index</code> is the position.</p>',
          example: 'import QtQuick\n\nRow {\n  spacing: 6\n  Repeater {\n    model: 5\n    Rectangle {\n      width: 30; height: 30 + index * 10\n      color: "orange"\n    }\n  }\n}\n',
          q: { text: 'Inside a Repeater delegate with <code>model: 4</code>, what values can <code>index</code> take?', options: ['1 to 4', '0 to 3', '0 to 4', 'Only 4'], answer: 1, why: 'Indexes start at 0.' } }
      ] },
    { id: 'm1-l2', type: 'lab', title: 'Traffic light', desc: 'Build a traffic light with Column and Repeater.',
      desc2: '<p>Build a traffic light: a dark box with three round lamps stacked vertically.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: box\n  color: "#222"\n  // TODO: width 60, then a Column with id: lamps and 3 circles\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: box\n  color: "#222"\n  width: 60; height: 180\n  Column {\n    id: lamps\n    anchors.centerIn: parent\n    spacing: 10\n    Repeater {\n      model: 3\n      Rectangle {\n        width: 40; height: 40; radius: 20\n        color: index === 0 ? "red" : index === 1 ? "gold" : "green"\n      }\n    }\n  }\n}\n' },
      tests: [
        { story: 'The root <code>box</code> is 60 wide and at least 150 tall.', run: t => { t.noErrors(); t.eq(t.find('box').width, 60, 'box.width'); t.expect(t.find('box').height >= 150, 'box.height must be at least 150'); } },
        { story: 'There is a <code>Column</code> with <code>id: lamps</code>.', run: t => { t.noErrors(); t.expect(t.find('lamps').spacing !== undefined, 'lamps must be a Column'); } },
        { story: 'The column contains 3 round lamps (<code>radius</code> is half the width).', run: t => { const l = t.all('Rectangle').filter(r => r.width === 40 || (r.width > 0 && r.width < 60 && r.radius * 2 === r.width)); t.eq(l.length, 3, 'number of lamps'); } },
        { story: 'The lamps are stacked: each one is lower than the previous.', run: t => { const l = t.all('Rectangle').filter(r => r.radius > 0).sort((a, b) => a.y - b.y); t.eq(l.length, 3, 'lamps'); t.expect(l[0].y < l[1].y && l[1].y < l[2].y, 'lamps do not stack'); } },
        { story: 'The lamps are red, yellow/gold and green, from top to bottom.', run: t => { const l = t.all('Rectangle').filter(r => r.radius > 0).sort((a, b) => a.y - b.y); t.eq(l.length, 3, 'lamps'); const c = l.map(x => t.rgb(x.color)); t.expect(c[0][0] > 180 && c[0][1] < 90, 'top lamp not red'); t.expect(c[1][0] > 180 && c[1][1] > 150, 'middle lamp not yellow'); t.expect(c[2][1] > 100 && c[2][0] < 90, 'bottom lamp not green'); } },
        { story: 'You used a <code>Repeater</code> instead of copy-pasting three rectangles.', run: t => { t.expect(t.uses('Repeater'), 'use a Repeater'); } }
      ] },
    { id: 'm1-r', type: 'review', title: 'Review: QML Basics', desc: 'Cheat sheet.',
      html: '<h2>QML Basics: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Import</td><td><code>import QtQuick</code></td></tr><tr><td>Object</td><td><code>Rectangle { width: 100 }</code></td></tr><tr><td>Custom property</td><td><code>property string name: "x"</code></td></tr><tr><td>id / parent</td><td><code>id: box</code>, <code>parent.width</code></td></tr><tr><td>Anchors</td><td><code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.margins: 8</code></td></tr><tr><td>Positioners</td><td><code>Row</code>, <code>Column</code>, <code>Grid</code> with <code>spacing</code></td></tr><tr><td>Repeater</td><td><code>Repeater { model: 3; Rectangle { ... index ... } }</code></td></tr></table>' }
  ]
});
