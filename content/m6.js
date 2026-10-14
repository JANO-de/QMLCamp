// =============================================================================
//  Module 6: Models & Views
//  Blocks: Theory A -> Lab A -> Quiz -> Theory B -> Lab B -> Review
// =============================================================================
window.QMLCAMP.modules.push({
  id: 'm6', title: 'Models & Views',
  desc: 'Separate data from presentation: ListModel, Repeater and ListView with delegates.',
  blocks: [
    { id: 'm6-t1', type: 'theory', title: 'Models and Repeater', desc: 'model, delegate, roles, ListModel.',
      lessons: [
        { title: 'Data in one place, looks in another',
          html: '<p>A <b>model</b> is the data (a list of rows). A <b>delegate</b> is the template drawn for each row. A <code>Repeater</code> makes one delegate per row. The simplest model is a number or a JS array. Inside the delegate you get <code>index</code> and, for arrays of plain values, <code>modelData</code>.</p>',
          example: `import QtQuick

Row {
  spacing: 8
  Repeater {
    model: ["red", "gold", "teal"]
    Rectangle { width: 50; height: 50; color: modelData
      Text { anchors.centerIn: parent; text: index } }
  }
}
`,
          q: { text: 'In a Repeater over <code>["a","b","c"]</code>, what is <code>modelData</code> in the 2nd delegate?', options: ['<code>"a"</code>', '<code>"b"</code>', '<code>1</code>', '<code>undefined</code>'], answer: 1, why: 'modelData is the row value; <code>index</code> would be 1.' } },
        { title: 'ListModel and ListElement',
          html: '<p><code>ListModel</code> holds rows made of <code>ListElement</code>s. Every property of a ListElement is a <b>role</b>, and each role is available by name inside the delegate. Write <code>model.title</code> to be safe when a role name equals a property of the delegate (like <code>text</code>).</p>',
          example: `import QtQuick

Column {
  spacing: 4
  ListModel { id: people
    ListElement { name: "Ada"; year: 1815 }
    ListElement { name: "Linus"; year: 1969 } }
  Repeater { model: people
    Text { text: model.name + " (" + year + ")"; font.pixelSize: 18 } }
}
`,
          q: { text: 'Where do the names usable inside a delegate (like <code>name</code>, <code>year</code>) come from?', options: ['From the Repeater\'s properties', 'From the roles: the properties of each ListElement', 'From the id of the model', 'They must be declared with <code>property</code>'], answer: 1, why: 'Each ListElement property becomes a role.' } },
        { title: 'Changing a model',
          html: '<p>Change the model, not the views: <code>append(obj)</code>, <code>insert(i, obj)</code>, <code>remove(i)</code>, <code>clear()</code>, <code>set(i, obj)</code>, <code>setProperty(i, "role", v)</code>, <code>get(i)</code>. <code>count</code> is a property, so <code>"Tasks: " + model.count</code> updates by itself and every view redraws.</p>',
          example: `import QtQuick

Column {
  spacing: 6
  ListModel { id: m }
  Text { text: "rows: " + m.count }
  Repeater { model: m; Text { text: "item " + model.n } }
  Rectangle { width: 120; height: 30; color: "gold"
    Text { anchors.centerIn: parent; text: "append" }
    MouseArea { anchors.fill: parent; onClicked: m.append({ n: m.count + 1 }) } }
}
`,
          q: { text: 'Which line adds a row to a <code>ListModel</code> with id <code>m</code>?', options: ['<code>m.add({ n: 1 })</code>', '<code>m.append({ n: 1 })</code>', '<code>m.push({ n: 1 })</code>', '<code>m.count++</code>'], answer: 1, why: 'ListModel uses append, insert and remove.' } }
      ] },
    { id: 'm6-l1', type: 'lab', title: 'Task list', desc: 'Show a ListModel with a Repeater.',
      desc2: '<p>Build a small task list. The <b>data</b> lives in a <code>ListModel</code>; the screen is only a <code>Repeater</code> and a counter.</p>',
      files: { 'main.qml': `import QtQuick

Column {
  id: root
  spacing: 6

  ListModel {
    id: tasks
    ListElement { title: "Learn QML"; done: true }
    ListElement { title: "Build a widget"; done: false }
    // TODO: add a third task
  }

  // TODO: a Repeater with model: tasks, one Text per task
  //       (done tasks have opacity 0.5)

  Text { id: summary; text: "" }   // TODO: "Tasks: " + the number of tasks

  // TODO: a Rectangle button with a MouseArea (id: addArea)
  //       that appends { title: "New task", done: false }
}
` },
      solution: { 'main.qml': `import QtQuick

Column {
  id: root
  spacing: 6

  ListModel {
    id: tasks
    ListElement { title: "Learn QML"; done: true }
    ListElement { title: "Build a widget"; done: false }
    ListElement { title: "Ship it"; done: false }
  }

  Repeater {
    model: tasks
    Text { text: model.title; font.pixelSize: 18; opacity: model.done ? 0.5 : 1 }
  }

  Text { id: summary; text: "Tasks: " + tasks.count }

  Rectangle {
    width: 110; height: 30; color: "teal"
    Text { anchors.centerIn: parent; text: "Add task"; color: "white" }
    MouseArea {
      id: addArea
      anchors.fill: parent
      onClicked: tasks.append({ title: "New task", done: false })
    }
  }
}
` },
      tests: [
        { story: 'A <code>ListModel</code> with id <code>tasks</code> has at least 3 rows, each with <code>title</code> and <code>done</code>.', run: t => { t.noErrors(); const r = t.rows('tasks'); t.expect(r.length >= 3, 'tasks needs at least 3 ListElements (has ' + r.length + ')'); t.expect(r.every(x => 'title' in x && 'done' in x), 'Every ListElement needs title and done'); } },
        { story: 'A <code>Repeater</code> shows one <code>Text</code> per task, with the task\'s title.', run: t => { t.noErrors(); t.expect(t.uses('Repeater'), 'Use a Repeater'); const texts = t.all('Text').map(x => x.text); for (const r of t.rows('tasks')) t.expect(texts.includes(r.title), 'No Text shows "' + r.title + '"'); } },
        { story: 'Texts of <b>done</b> tasks have <code>opacity</code> 0.5, the others 1.', run: t => { t.noErrors(); const all = t.all('Text'); for (const r of t.rows('tasks')) { const x = all.find(a => a.text === r.title); t.expect(x, 'No Text shows "' + r.title + '"'); t.eq(x.opacity, r.done ? 0.5 : 1, 'opacity of "' + r.title + '"'); } } },
        { story: '<code>summary</code> shows <code>"Tasks: N"</code> using <code>tasks.count</code>.', run: t => { t.noErrors(); t.eq(t.find('summary').text, 'Tasks: ' + t.rows('tasks').length, 'summary text'); t.find('tasks').append({ title: 'extra', done: false }); t.eq(t.find('summary').text, 'Tasks: ' + t.rows('tasks').length, 'summary after append (it must follow tasks.count)'); } },
        { story: 'Clicking the MouseArea <code>addArea</code> appends a task titled "New task" and the Repeater shows it.', run: t => { t.noErrors(); const n = t.rows('tasks').length; t.click('addArea'); t.eq(t.rows('tasks').length, n + 1, 'rows after click'); t.expect(t.all('Text').some(x => x.text === 'New task'), 'The new task is not shown'); } }
      ] },
    { id: 'm6-q', type: 'quiz', title: 'Practice test: Models', desc: 'Seven questions on models and Repeater.',
      questions: [
        { text: 'What does a <b>delegate</b> describe?', options: ['The data of a row', 'How one row of the model is drawn', 'The sort order', 'The model\'s size'], answer: 1, why: 'The delegate is the per-row template.' },
        { text: '<code>Repeater { model: 4 }</code> creates…', options: ['4 delegates, with <code>index</code> 0 to 3', '1 delegate with index 4', '5 delegates', 'nothing, a model must be a ListModel'], answer: 0, why: 'A number is a model of that many rows.' },
        { text: 'What is a <b>role</b>?', options: ['A property name of the rows (like <code>title</code>) available in the delegate', 'A user permission', 'A kind of signal', 'The delegate\'s id'], answer: 0, why: 'Roles are the properties of each ListElement.' },
        { text: 'Why prefer <code>model.text</code> over <code>text</code> in a Text delegate?', options: ['It is faster', 'A bare <code>text</code> may mean the Text item\'s own property instead of the role', 'It is required by syntax', 'It works for arrays only'], answer: 1, why: 'Names can clash with the delegate\'s own properties.' },
        { text: 'Which expression stays up to date when rows are added to <code>tasks</code>?', options: ['<code>"Tasks: " + tasks.count</code>', '<code>"Tasks: 3"</code>', 'A value copied once in <code>Component.onCompleted</code>', 'None'], answer: 0, why: 'count is a property, so the binding re-runs.' },
        { text: 'A JS array model does <b>not</b> notify views when you <code>push</code> into it. What fixes that?', options: ['Assign a new array to the property', 'Call <code>model.refresh()</code>', 'Nothing can fix it', 'Use <code>Timer</code>'], answer: 0, why: 'Assigning a new value triggers the binding; ListModel notifies by itself.' },
        { text: 'Which call removes the first row of a ListModel <code>m</code>?', options: ['<code>m.remove(0)</code>', '<code>m.pop()</code>', '<code>m.delete(1)</code>', '<code>m.clear(0)</code>'], answer: 0, why: 'remove(index, count = 1).' }
      ] },
    { id: 'm6-t2', type: 'theory', title: 'ListView', desc: 'Scrolling lists, currentIndex, attached properties.',
      lessons: [
        { title: 'ListView',
          html: '<p><code>ListView</code> is a scrolling list: <code>model</code>, <code>delegate</code>, <code>spacing</code> and (almost always) <code>clip: true</code>. The delegate must have its own size: use <code>ListView.view.width</code> for the width. Scroll with the mouse wheel in the preview.</p>',
          example: `import QtQuick

Rectangle {
  width: 220; height: 160; color: "#1b1b32"
  ListView {
    anchors.fill: parent; anchors.margins: 8
    spacing: 4; clip: true
    model: 12
    delegate: Rectangle { width: ListView.view.width; height: 32; radius: 6; color: "#2e2e4a"
      Text { anchors.centerIn: parent; color: "white"; text: "Row " + index } }
  }
}
`,
          q: { text: 'Why does a ListView delegate need its own <code>width</code> and <code>height</code>?', options: ['The view does not size delegates for you', 'It is optional', 'Only for horizontal lists', 'Because of <code>clip</code>'], answer: 0, why: 'The view positions delegates but does not size them.' } },
        { title: 'currentIndex and attached properties',
          html: '<p>A ListView has a <code>currentIndex</code>. Inside a delegate, the attached properties <code>ListView.isCurrentItem</code> and <code>ListView.view</code> tell you if this row is the current one and give you the view. Set <code>list.currentIndex = index</code> from a click to select a row.</p>',
          example: `import QtQuick

ListView {
  id: list
  width: 220; height: 140; spacing: 4; clip: true
  model: ["Mail", "Music", "Maps", "Notes"]
  delegate: Rectangle { width: ListView.view.width; height: 30
    color: ListView.isCurrentItem ? "gold" : "lightgray"
    Text { anchors.centerIn: parent; text: modelData }
    MouseArea { anchors.fill: parent; onClicked: list.currentIndex = index } }
}
`,
          q: { text: 'What does <code>ListView.isCurrentItem</code> tell a delegate?', options: ['If it is the row at <code>currentIndex</code>', 'If the view is scrolling', 'If the model is empty', 'If it is visible'], answer: 0, why: 'It is true for the delegate at currentIndex.' } },
        { title: 'Repeater or ListView?',
          html: '<p><b>Repeater</b>: a few items inside a Row/Column; no scrolling; all delegates exist. <b>ListView</b>: many items; scrolls; real Qt only creates the delegates that are visible, so it scales to thousands of rows. Both read the same models.</p>',
          q: { text: 'You need a list of 5,000 messages that scrolls. Which one?', options: ['<code>Repeater</code> in a Column', '<code>ListView</code>', 'A <code>Row</code> of Texts', '<code>Timer</code>'], answer: 1, why: 'A ListView scrolls and only builds what is visible.' } }
      ] },
    { id: 'm6-l2', type: 'lab', title: 'Notification list', desc: 'A ListView with selection and removal.',
      desc2: '<p>Build a panel with a scrolling list of notifications. Click a row to select it, and a button dismisses the first one. Write the whole panel yourself; the model is given.</p>',
      files: { 'main.qml': `import QtQuick

Rectangle {
  id: panel
  width: 260; height: 220
  color: "#1b1b32"

  ListModel {
    id: notes
    ListElement { text: "Build finished" }
    ListElement { text: "New message" }
    ListElement { text: "Update available" }
  }

  // TODO: ListView (id: list): x 8, y 8, width panel.width - 16, height 150,
  //       spacing 6, clip true, model notes
  //       delegate: Rectangle 40 tall, as wide as the view, with the text,
  //       a different color when ListView.isCurrentItem,
  //       and a MouseArea that sets list.currentIndex = index

  // TODO: a button Rectangle at x 8, y 170, width 244, height 36
  //       with a MouseArea (id: dismissArea) that removes the first note
}
` },
      solution: { 'main.qml': `import QtQuick

Rectangle {
  id: panel
  width: 260; height: 220
  color: "#1b1b32"

  ListModel {
    id: notes
    ListElement { text: "Build finished" }
    ListElement { text: "New message" }
    ListElement { text: "Update available" }
  }

  ListView {
    id: list
    x: 8; y: 8
    width: panel.width - 16; height: 150
    spacing: 6; clip: true
    model: notes
    delegate: Rectangle {
      width: ListView.view.width; height: 40; radius: 6
      color: ListView.isCurrentItem ? "#4a6cf7" : "#2e2e4a"
      Text { anchors.centerIn: parent; text: model.text; color: "white" }
      MouseArea { anchors.fill: parent; onClicked: list.currentIndex = index }
    }
  }

  Rectangle {
    x: 8; y: 170; width: 244; height: 36; radius: 6; color: "#c0392b"
    Text { anchors.centerIn: parent; text: "Dismiss first"; color: "white" }
    MouseArea {
      id: dismissArea
      anchors.fill: parent
      onClicked: if (notes.count > 0) notes.remove(0)
    }
  }
}
` },
      tests: [
        { story: 'A <code>ListView</code> with id <code>list</code> is at x 8, y 8, size 244 x 150 (<code>panel.width - 16</code>), shows <code>notes</code> and clips.', run: t => { t.noErrors(); const l = t.find('list'); t.eq(l.x, 8, 'list.x'); t.eq(l.y, 8, 'list.y'); t.eq(l.width, 244, 'list.width'); t.eq(l.height, 150, 'list.height'); t.eq(l.count, 3, 'list.count'); t.eq(l.clip, true, 'list.clip'); } },
        { story: 'Delegates are 40 tall, as wide as the view, with 6 px spacing (rows at y 0, 46, 92).', run: t => { t.noErrors(); const l = t.find('list'), k = l.children; t.eq(k.length, 3, 'delegates'); t.eq(k.map(x => x.height).join(','), '40,40,40', 'delegate heights'); t.eq(k.map(x => x.y).join(','), '0,46,92', 'delegate y positions'); t.eq(k[0].width, l.width, 'delegate width'); t.near(l.contentHeight, 132, 'contentHeight'); } },
        { story: 'Each delegate shows its note text.', run: t => { t.noErrors(); const texts = t.all('Text').map(x => x.text); for (const r of t.rows('notes')) t.expect(texts.includes(r.text), 'No Text shows "' + r.text + '"'); } },
        { story: 'Clicking a row makes it the current item (<code>currentIndex</code>) and gives it a different color.', run: t => { t.noErrors(); const l = t.find('list'); t.click(l.children[1]); t.eq(l.currentIndex, 1, 'list.currentIndex'); const k = l.children; t.expect(k[1].color !== k[0].color && k[1].color !== k[2].color, 'The current row needs its own color (use ListView.isCurrentItem)'); } },
        { story: 'Clicking <code>dismissArea</code> removes the first note: the list now has 2 rows and starts with "New message".', run: t => { t.noErrors(); t.click('dismissArea'); t.eq(t.find('list').count, 2, 'list.count'); t.eq(t.rows('notes')[0].text, 'New message', 'first note'); t.expect(t.all('Text').some(x => x.text === 'New message'), 'The list does not show the remaining notes'); } }
      ] },
    { id: 'm6-r', type: 'review', title: 'Review: Models & Views', desc: 'Cheat sheet.',
      html: '<h2>Models & Views: cheat sheet</h2><table class="cs"><tr><th>Concept</th><th>Syntax</th></tr><tr><td>Number / array model</td><td><code>model: 3</code>, <code>model: ["a","b"]</code> then <code>index</code>, <code>modelData</code></td></tr><tr><td>ListModel</td><td><code>ListModel { id: m; ListElement { title: "A"; done: false } }</code></td></tr><tr><td>Roles in a delegate</td><td><code>model.title</code> (safe) or <code>title</code></td></tr><tr><td>Edit a model</td><td><code>m.append({...})</code>, <code>insert</code>, <code>remove(i)</code>, <code>clear()</code>, <code>set</code>, <code>setProperty</code>, <code>get(i)</code>, <code>m.count</code></td></tr><tr><td>Few items</td><td><code>Repeater { model: m; Delegate {} }</code> inside Row/Column</td></tr><tr><td>Scrolling list</td><td><code>ListView { model: m; delegate: Rectangle {...}; clip: true; spacing: 4 }</code></td></tr><tr><td>Selection</td><td><code>currentIndex</code>, <code>ListView.isCurrentItem</code>, <code>ListView.view</code></td></tr></table><p>Next: Quickshell, then the final Dynamic Island project.</p>' }
  ]
});
