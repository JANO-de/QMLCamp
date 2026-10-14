// Module 2: Bindings & JavaScript
window.QMLCAMP.modules.push({
  id: 'm2', title: 'Bindings & JavaScript',
  desc: 'Reactive bindings, JavaScript expressions, functions, Qt.binding and loops.',
  blocks: [
    { id: 'm2-t1', type: 'theory', title: 'Bindings', desc: 'Binding vs assignment, expressions, dependencies.',
      lessons: [
        { title: 'A binding is a relationship', html: '<p><code>width: parent.width / 2</code> is not a one-time calculation. It is a <b>binding</b>: QML remembers the dependencies (<code>parent.width</code>) and re-evaluates whenever they change. Click the box to change the parent size.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: outer\n  width: 200; height: 80; color: "#2a2a40"\n  Rectangle {\n    width: outer.width / 2\n    height: outer.height\n    color: "gold"\n  }\n  MouseArea {\n    anchors.fill: parent\n    onClicked: outer.width += 40\n  }\n}\n',
          q: { text: 'After <code>outer.width</code> changes, the gold rectangle...', options: ['Keeps its old width', 'Is re-evaluated and gets the new half width', 'Raises an error', 'Disappears'], answer: 1, why: 'Bindings re-evaluate when a dependency changes.' } },
        { title: 'Expressions', html: '<p>The right side of a binding is a JavaScript expression: arithmetic, <code>?:</code>, string concatenation, <code>Math.max()</code>, template literals.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: r\n  property int n: 3\n  width: 260; height: 60; color: n > 5 ? "tomato" : "teal"\n  Text {\n    anchors.centerIn: parent; color: "white"\n    text: "n = " + n + (n % 2 === 0 ? " (even)" : " (odd)")\n  }\n  MouseArea { anchors.fill: parent; onClicked: r.n++ }\n}\n',
          q: { text: 'What does <code>n % 2 === 0</code> test?', options: ['Whether n is zero', 'Whether n is even', 'Whether n is below 2', 'Whether n is a string'], answer: 1, why: '<code>%</code> is the remainder.' } },
        { title: 'Assignment breaks a binding', html: '<p>Writing <code>box.width = 50</code> in JavaScript <b>replaces</b> the binding with a fixed value. Prefer to change the inputs the binding depends on, or use <code>Qt.binding()</code> to restore a binding (next block).</p>',
          q: { text: 'What happens to <code>width: parent.width / 2</code> after JS runs <code>width = 50</code>?', options: ['Nothing, the binding stays', 'The binding is replaced by the fixed value 50', 'QML errors', 'width becomes read-only'], answer: 1, why: 'An imperative assignment removes the binding.' } }
      ] },
    { id: 'm2-l1', type: 'lab', title: 'Responsive box', desc: 'Make sizes depend on other values.',
      desc2: '<p>A <code>frame</code> has a changing size. Make the inner <code>fill</code> follow it with bindings.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: frame\n  property int size: 200\n  width: size; height: size / 2\n  color: "#2a2a40"\n\n  Rectangle {\n    id: fill\n    color: "gold"\n    // TODO: bind width to 3/4 of frame.width, height to frame.height\n    width: 150; height: 100\n  }\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: frame\n  property int size: 200\n  width: size; height: size / 2\n  color: "#2a2a40"\n\n  Rectangle {\n    id: fill\n    color: "gold"\n    width: frame.width * 0.75\n    height: frame.height\n  }\n}\n' },
      tests: [
        { story: '<code>fill.width</code> is 75% of <code>frame.width</code>.', run: t => { t.noErrors(); t.near(t.find('fill').width, 150, 'fill.width at size 200'); } },
        { story: '<code>fill.height</code> equals <code>frame.height</code>.', run: t => { t.near(t.find('fill').height, t.find('frame').height, 'fill.height'); } },
        { story: 'When <code>size</code> becomes 400, <code>fill</code> follows (width 300, height 200).', run: t => { t.find('frame').size = 400; t.near(t.find('fill').width, 300, 'fill.width after resize'); t.near(t.find('fill').height, 200, 'fill.height after resize'); } },
        { story: 'You used bindings: do not write fixed numbers for <code>fill</code>.', run: t => { const n = t.nodes('Rectangle').find(x => t.bindingOf(x, 'color') && /gold/.test(t.bindingOf(x, 'color'))); t.expect(n && t.isBound(n, 'width') && t.isBound(n, 'height'), 'width and height must be expressions that use frame'); } }
      ] },
    { id: 'm2-q1', type: 'quiz', title: 'Practice test: bindings', desc: '70% to pass.',
      questions: [
        { text: 'What is a binding?', options: ['A one-time calculation', 'An expression that re-evaluates when its dependencies change', 'A type of signal', 'A file import'], answer: 1, why: 'Bindings are reactive.' },
        { text: 'Which is a binding?', options: ['<code>x: 10</code>', '<code>x: parent.width - 10</code>', '<code>x: "10"</code>', 'None of them'], answer: 1, why: 'It depends on another property.' },
        { text: 'What does <code>a ? b : c</code> do?', options: ['Compares a and b', 'Returns b if a is truthy, else c', 'Assigns a to b', 'Throws'], answer: 1, why: 'The ternary operator.' },
        { text: 'What breaks a binding?', options: ['Reading the property', 'Assigning the property from JavaScript', 'Adding an id', 'Using anchors'], answer: 1, why: 'Assignment replaces it.' }
      ] },
    { id: 'm2-t2', type: 'theory', title: 'Functions and JavaScript', desc: 'Functions, var, loops, Qt.binding.',
      lessons: [
        { title: 'Functions', html: '<p>Declare a function inside any object: <code>function name(args) { ... }</code>. Call it from bindings or handlers. A binding that calls a function still tracks the properties the function reads.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: r\n  property int celsius: 20\n  width: 240; height: 60; color: "#1b1b32"\n  function toF(c) { return c * 9 / 5 + 32 }\n  Text { anchors.centerIn: parent; color: "white"; text: celsius + " C = " + toF(celsius) + " F" }\n  MouseArea { anchors.fill: parent; onClicked: r.celsius += 5 }\n}\n',
          q: { text: 'Where can <code>function toF(c)</code> be called from?', options: ['Only from the same object', 'From bindings and handlers within scope', 'Only from C++', 'Only from onCompleted'], answer: 1, why: 'Functions are normal JS callable in scope.' } },
        { title: 'var, loops, arrays', html: '<p>Inside functions use <code>var</code>, <code>let</code>, <code>const</code>, <code>for</code> loops and arrays. <code>console.log()</code> prints to the console.</p>',
          example: 'import QtQuick\n\nItem {\n  function sum(n) {\n    var s = 0\n    for (var i = 1; i <= n; i++) s += i\n    return s\n  }\n  Component.onCompleted: console.log("sum(10) =", sum(10))\n}\n',
          q: { text: 'What does <code>sum(4)</code> return in the example?', options: ['4', '10', '24', '16'], answer: 1, why: '1+2+3+4 = 10.' } },
        { title: 'Qt.binding()', html: '<p>After assignment replaced a binding, you can restore one with <code>property = Qt.binding(function() { return other.width / 2 })</code>.</p>',
          q: { text: 'What does <code>Qt.binding()</code> do?', options: ['Creates a signal', 'Assigns a re-evaluating expression from JavaScript', 'Imports a module', 'Deletes a property'], answer: 1, why: 'It creates a binding from imperative code.' } }
      ] },
    { id: 'm2-l2', type: 'lab', title: 'Temperature converter', desc: 'A function, a property and a click handler.',
      desc2: '<p>Show a Celsius value and its Fahrenheit value. Clicking the box adds 10 degrees.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: conv\n  width: 260; height: 80; color: "#1b1b32"\n  // TODO: property int celsius, function toF(c), Text id: out, MouseArea\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: conv\n  property int celsius: 0\n  width: 260; height: 80; color: "#1b1b32"\n  function toF(c) { return c * 9 / 5 + 32 }\n  Text {\n    id: out\n    anchors.centerIn: parent\n    color: "white"\n    text: conv.celsius + " C = " + conv.toF(conv.celsius) + " F"\n  }\n  MouseArea {\n    id: area\n    anchors.fill: parent\n    onClicked: conv.celsius += 10\n  }\n}\n' },
      tests: [
        { story: '<code>conv</code> declares a property <code>celsius</code> that starts at 0.', run: t => { t.noErrors(); t.expect(t.declares('main.qml', 'celsius'), 'declare property int celsius'); t.eq(t.find('conv').celsius, 0, 'celsius'); } },
        { story: 'A function <code>toF</code> converts 100 to 212.', run: t => { t.eq(t.find('conv').toF(100), 212, 'toF(100)'); t.eq(t.find('conv').toF(0), 32, 'toF(0)'); } },
        { story: 'The <code>Text</code> <code>out</code> shows both values, e.g. <code>0 C = 32 F</code>.', run: t => { const s = String(t.find('out').text); t.expect(s.includes('0') && s.includes('32'), 'text should include 0 and 32, got "' + s + '"'); } },
        { story: 'Clicking increases <code>celsius</code> by 10 and the text updates.', run: t => { t.click('conv'); t.eq(t.find('conv').celsius, 10, 'celsius after click'); const s = String(t.find('out').text); t.expect(s.includes('10') && s.includes('50'), 'text should show 10 and 50, got "' + s + '"'); } }
      ] },
    { id: 'm2-r', type: 'review', title: 'Review: Bindings & JavaScript', desc: 'Cheat sheet.',
      html: '<h2>Bindings & JavaScript: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Example</th></tr><tr><td>Binding</td><td><code>width: parent.width / 2</code></td></tr><tr><td>Ternary</td><td><code>color: ok ? "green" : "red"</code></td></tr><tr><td>Function</td><td><code>function f(x) { return x * 2 }</code></td></tr><tr><td>Loop</td><td><code>for (var i = 0; i &lt; n; i++) { ... }</code></td></tr><tr><td>Restore binding</td><td><code>w = Qt.binding(function() { return a.width })</code></td></tr><tr><td>Log</td><td><code>console.log("x", x)</code></td></tr></table>' }
  ]
});
