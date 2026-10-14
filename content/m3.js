// Module 3: Signals & Handlers
window.QMLCAMP.modules.push({
  id: 'm3', title: 'Signals & Handlers',
  desc: 'Reacting to events: MouseArea, property change handlers, custom signals, Timer and Connections.',
  blocks: [
    { id: 'm3-t1', type: 'theory', title: 'Handlers', desc: 'onClicked, onXChanged, Component.onCompleted.',
      lessons: [
        { title: 'Signals and handlers', html: '<p>A <b>signal</b> announces that something happened. A <b>handler</b> is code that runs in response: <code>on</code> + signal name with a capital letter. <code>MouseArea</code> has <code>clicked</code>, so the handler is <code>onClicked</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  width: 160; height: 80; color: "teal"\n  MouseArea {\n    anchors.fill: parent\n    onClicked: parent.color = "orange"\n  }\n}\n',
          q: { text: 'Which handler belongs to the signal <code>pressed</code>?', options: ['<code>pressed:</code>', '<code>onPressed:</code>', '<code>onpressed:</code>', '<code>handlePressed:</code>'], answer: 1, why: '<code>on</code> + capitalized signal name.' } },
        { title: 'Property change handlers', html: '<p>Every property has an automatic signal <code>xChanged</code>, so you can write <code>onWidthChanged: ...</code> or <code>onCountChanged: ...</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: r\n  property int count: 0\n  width: 200; height: 60; color: "#2a2a40"\n  onCountChanged: console.log("count is now", count)\n  MouseArea { anchors.fill: parent; onClicked: r.count++ }\n}\n',
          q: { text: 'When does <code>onCountChanged</code> run?', options: ['Only at startup', 'Each time <code>count</code> changes', 'Never automatically', 'Every frame'], answer: 1, why: 'Property changes emit a signal.' } },
        { title: 'Component.onCompleted', html: '<p><code>Component.onCompleted</code> runs once when the object has finished being created. Good for one-time setup.</p>',
          example: 'import QtQuick\n\nItem {\n  Component.onCompleted: console.log("ready")\n}\n',
          q: { text: 'How often does <code>Component.onCompleted</code> run per object?', options: ['Once', 'Every second', 'Every click', 'Never'], answer: 0, why: 'Once, after creation.' } }
      ] },
    { id: 'm3-l1', type: 'lab', title: 'Counter button', desc: 'A counter with a click handler.',
      desc2: '<p>Build a counter button. Each click adds 1 and the label shows the count.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: btn\n  width: 160; height: 60; color: "#2a2a40"\n  // TODO: property int count, Text id: label, MouseArea\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: btn\n  property int count: 0\n  width: 160; height: 60; color: "#2a2a40"\n  Text {\n    id: label\n    anchors.centerIn: parent\n    color: "white"\n    text: "Clicks: " + btn.count\n  }\n  MouseArea {\n    anchors.fill: parent\n    onClicked: btn.count++\n  }\n}\n' },
      tests: [
        { story: '<code>btn</code> has an int property <code>count</code> starting at 0.', run: t => { t.noErrors(); t.eq(t.find('btn').count, 0, 'count'); } },
        { story: 'The <code>Text</code> <code>label</code> shows the count (<code>Clicks: 0</code>).', run: t => { t.expect(String(t.find('label').text).includes('0'), 'label should contain 0'); } },
        { story: 'There is a <code>MouseArea</code> filling the button.', run: t => { t.expect(t.count('MouseArea') >= 1, 'add a MouseArea'); } },
        { story: 'Three clicks make <code>count</code> 3 and the label shows it.', run: t => { t.click('btn'); t.click('btn'); t.click('btn'); t.eq(t.find('btn').count, 3, 'count'); t.expect(String(t.find('label').text).includes('3'), 'label should contain 3'); } },
        { story: 'The label is a binding (it updates by itself, no manual assignment).', run: t => { const n = t.nodes('Text').find(x => true); t.expect(n && t.isBound(n, 'text'), 'make Text.text a binding that uses count'); } }
      ] },
    { id: 'm3-q1', type: 'quiz', title: 'Practice test: handlers', desc: '70% to pass.',
      questions: [
        { text: 'The handler for the <code>clicked</code> signal is...', options: ['<code>clicked</code>', '<code>onClicked</code>', '<code>onclicked</code>', '<code>whenClicked</code>'], answer: 1, why: '' },
        { text: 'The handler for changes of the property <code>value</code> is...', options: ['<code>onValueChanged</code>', '<code>valueChanged</code>', '<code>onChangeValue</code>', '<code>changedValue</code>'], answer: 0, why: '' },
        { text: 'What does <code>count++</code> do?', options: ['Adds 1 to count', 'Doubles count', 'Declares count', 'Nothing'], answer: 0, why: '' },
        { text: 'Which runs once after an object is created?', options: ['<code>Component.onCompleted</code>', '<code>onChanged</code>', '<code>onClicked</code>', '<code>onTriggered</code>'], answer: 0, why: '' }
      ] },
    { id: 'm3-t2', type: 'theory', title: 'Custom signals, Timer, Connections', desc: 'Declare signals, run code on a schedule, listen to other objects.',
      lessons: [
        { title: 'Custom signals', html: '<p>Declare with <code>signal name(type arg)</code> and fire it by calling it like a function: <code>name(5)</code>. The handler is <code>onName</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: r\n  signal hit(int power)\n  onHit: console.log("hit with", power)\n  width: 160; height: 60; color: "tomato"\n  MouseArea { anchors.fill: parent; onClicked: r.hit(7) }\n}\n',
          q: { text: 'How do you emit <code>signal hit(int power)</code>?', options: ['<code>emit hit(7)</code>', '<code>hit(7)</code>', '<code>fire hit 7</code>', '<code>onHit(7)</code>'], answer: 1, why: 'Call it like a function.' } },
        { title: 'Timer', html: '<p><code>Timer</code> has <code>interval</code> (ms), <code>running</code>, <code>repeat</code> and the signal <code>triggered</code>.</p>',
          example: 'import QtQuick\n\nRectangle {\n  id: r\n  property int ticks: 0\n  width: 200; height: 60; color: "#2a2a40"\n  Text { anchors.centerIn: parent; color: "white"; text: "ticks: " + r.ticks }\n  Timer { interval: 1000; running: true; repeat: true; onTriggered: r.ticks++ }\n}\n',
          q: { text: 'Without <code>repeat: true</code>, a Timer fires...', options: ['Once', 'Never', 'Every interval', 'Twice'], answer: 0, why: '' } },
        { title: 'Connections', html: '<p><code>Connections { target: other; function onSomething() { ... } }</code> lets you handle signals of an object that is not the one you are writing in.</p>',
          q: { text: 'When do you need <code>Connections</code>?', options: ['To handle signals of another object', 'To import a module', 'To create a Timer', 'To define an id'], answer: 0, why: '' } }
      ] },
    { id: 'm3-l2', type: 'lab', title: 'Stopwatch', desc: 'Timer, counter and a custom signal.',
      desc2: '<p>Build a stopwatch: a Timer counts seconds; at every 60 seconds a signal <code>minuteElapsed</code> is emitted.</p>',
      files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: watch\n  width: 200; height: 80; color: "#1b1b32"\n  // TODO: property int seconds, property int minutes,\n  //       signal minuteElapsed, Timer id: tick (1000 ms, repeat)\n}\n' },
      solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: watch\n  property int seconds: 0\n  property int minutes: 0\n  signal minuteElapsed()\n  width: 200; height: 80; color: "#1b1b32"\n  onMinuteElapsed: minutes++\n  Text { anchors.centerIn: parent; color: "white"; text: watch.minutes + ":" + watch.seconds }\n  Timer {\n    id: tick\n    interval: 1000; running: true; repeat: true\n    onTriggered: {\n      watch.seconds++\n      if (watch.seconds === 60) { watch.seconds = 0; watch.minuteElapsed() }\n    }\n  }\n}\n' },
      tests: [
        { story: '<code>watch</code> declares <code>seconds</code>, <code>minutes</code> and a signal <code>minuteElapsed</code>.', run: t => { t.noErrors(); t.expect(t.declares('main.qml', 'seconds') && t.declares('main.qml', 'minutes'), 'declare both properties'); t.eq(t.find('watch').seconds, 0, 'seconds'); } },
        { story: 'A <code>Timer</code> with <code>id: tick</code> runs and repeats every 1000 ms.', run: t => { const k = t.find('tick'); t.eq(k.interval, 1000, 'interval'); t.eq(k.running, true, 'running'); t.eq(k.repeat, true, 'repeat'); } },
        { story: 'After 3 seconds <code>seconds</code> is 3.', run: t => { t.advance(3000); t.eq(t.find('watch').seconds, 3, 'seconds'); } },
        { story: 'After 60 seconds <code>seconds</code> is back to 0 and <code>minutes</code> is 1.', run: t => { t.advance(60000); t.eq(t.find('watch').seconds, 0, 'seconds'); t.eq(t.find('watch').minutes, 1, 'minutes'); } },
        { story: 'After 125 seconds it shows 2 minutes and 5 seconds.', run: t => { t.advance(125000); t.eq(t.find('watch').minutes, 2, 'minutes'); t.eq(t.find('watch').seconds, 5, 'seconds'); } }
      ] },
    { id: 'm3-r', type: 'review', title: 'Review: Signals & Handlers', desc: 'Cheat sheet.',
      html: '<h2>Signals & Handlers: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Handler</td><td><code>onClicked: ...</code></td></tr><tr><td>Property change</td><td><code>onCountChanged: ...</code></td></tr><tr><td>Run once</td><td><code>Component.onCompleted: ...</code></td></tr><tr><td>Custom signal</td><td><code>signal done(int n)</code> then <code>done(3)</code></td></tr><tr><td>Timer</td><td><code>Timer { interval: 1000; running: true; repeat: true; onTriggered: ... }</code></td></tr><tr><td>Other object</td><td><code>Connections { target: obj; function onFoo() { } }</code></td></tr></table>' }
  ]
});
