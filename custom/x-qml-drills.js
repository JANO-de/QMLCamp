// custom/x-qml-drills.js — QML drills: exercises only, no theory.
window.registerCourse?.({
  id: 'x-qml-drills',
  title: 'QML Drills (exercises only)',
  desc: 'Practice QML by fixing small tasks. Starter code is incomplete; make the tests pass.',
  lang: 'qml',
  modules: [
    {
      id: 'x-qml-drills-m1', title: 'Basics', desc: 'Rectangles, text, layouts.',
      blocks: [
        { id:'x-qml-drills-m1-l1', type:'lab', title:'Red box 100x50', desc:'Make a red Rectangle.',
          desc2:'<p>Create <code>box</code> 100 wide, 50 tall, red.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  // TODO\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100\n  height: 50\n  color: "red"\n}\n'},
          tests:[{story:'box exists, 100x50, red.',steps:[{op:'noErrors'},{op:'has',id:'box'},{op:'eq',id:'box',prop:'width',value:100},{op:'eq',id:'box',prop:'height',value:50}]}]
        },
        { id:'x-qml-drills-m1-l2', type:'lab', title:'Centered text', desc:'Center text in a window.',
          desc2:'<p>Text "Hi" centered in a 200x100 Rectangle.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 100\n  // TODO: add Text\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 100\n  Text {\n    id: t\n    anchors.centerIn: parent\n    text: "Hi"\n  }\n}\n'},
          tests:[{story:'Text exists and centered.',steps:[{op:'noErrors'},{op:'has',id:'t'},{op:'eq',id:'t',prop:'text',value:'Hi'}]}]
        },
        { id:'x-qml-drills-m1-l3', type:'lab', title:'Column of two boxes', desc:'Two rectangles in a Column.',
          desc2:'<p>Column with red and blue rectangles.</p>',
          files:{'main.qml':'import QtQuick\n\nColumn {\n  // TODO: two Rectangles\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nColumn {\n  Rectangle { width: 50; height: 50; color: "red" }\n  Rectangle { width: 50; height: 50; color: "blue" }\n}\n'},
          tests:[{story:'No errors.',steps:[{op:'noErrors'},{op:'count',type:'Rectangle',n:2}]}]
        },
        { id:'x-qml-drills-m1-l4', type:'lab', title:'Row with spacing', desc:'Row with 3 boxes spaced.',
          desc2:'<p>Row spacing 10, three 30x30 boxes.</p>',
          files:{'main.qml':'import QtQuick\n\nRow {\n  spacing: 0\n  // TODO\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRow {\n  spacing: 10\n  Rectangle { width: 30; height: 30; color: "red" }\n  Rectangle { width: 30; height: 30; color: "green" }\n  Rectangle { width: 30; height: 30; color: "blue" }\n}\n'},
          tests:[{story:'Row has 3 rectangles.',steps:[{op:'noErrors'},{op:'count',type:'Rectangle',n:3}]}]
        },
        { id:'x-qml-drills-m1-l5', type:'lab', title:'Click changes color', desc:'MouseArea toggles color.',
          desc2:'<p>Click box to toggle red/blue.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  MouseArea {\n    anchors.fill: parent\n    // TODO: onClicked toggle color\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  MouseArea {\n    anchors.fill: parent\n    onClicked: box.color = box.color === "red" ? "blue" : "red"\n  }\n}\n'},
          tests:[{story:'Click toggles color.',steps:[{op:'noErrors'},{op:'has',id:'box'},{op:'click',id:'box'}]}]
        }
      ]
    },
    {
      id: 'x-qml-drills-m2', title: 'Anchors', desc: 'Anchoring items.',
      blocks: [
        { id:'x-qml-drills-m2-l1', type:'lab', title:'Fill parent', desc:'Rectangle fills parent.',
          desc2:'<p>Inner rect fills outer.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    // TODO: anchors.fill: parent\n    color: "blue"\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    anchors.fill: parent\n    color: "blue"\n  }\n}\n'},
          tests:[{story:'inner fills parent.',steps:[{op:'noErrors'},{op:'has',id:'inner'}]}]
        },
        { id:'x-qml-drills-m2-l2', type:'lab', title:'Center in parent', desc:'Center a box.',
          desc2:'<p>Center inner in outer.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    width: 50; height: 50\n    // TODO\n    color: "red"\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    width: 50; height: 50\n    anchors.centerIn: parent\n    color: "red"\n  }\n}\n'},
          tests:[{story:'inner centered.',steps:[{op:'noErrors'},{op:'has',id:'inner'}]}]
        },
        { id:'x-qml-drills-m2-l3', type:'lab', title:'Margins', desc:'Anchored with margins.',
          desc2:'<p>Inner fills parent with 10px margins.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    anchors.fill: parent\n    // TODO: margins 10\n    color: "green"\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  width: 200; height: 200\n  Rectangle {\n    id: inner\n    anchors.fill: parent\n    anchors.margins: 10\n    color: "green"\n  }\n}\n'},
          tests:[{story:'inner has margins.',steps:[{op:'noErrors'},{op:'has',id:'inner'}]}]
        }
      ]
    },
    {
      id: 'x-qml-drills-m3', title: 'Repeater & Models', desc: 'Lists.',
      blocks: [
        { id:'x-qml-drills-m3-l1', type:'lab', title:'Repeater 5', desc:'Repeat 5 rectangles.',
          desc2:'<p>Repeater creates 5 boxes.</p>',
          files:{'main.qml':'import QtQuick\n\nColumn {\n  Repeater {\n    model: 0\n    // TODO\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nColumn {\n  Repeater {\n    model: 5\n    Rectangle { width: 20; height: 20; color: "blue" }\n  }\n}\n'},
          tests:[{story:'5 rectangles.',steps:[{op:'noErrors'},{op:'count',type:'Rectangle',n:5}]}]
        },
        { id:'x-qml-drills-m3-l2', type:'lab', title:'ListView model', desc:'ListView with 3 items.',
          desc2:'<p>ListView model: 3 strings.</p>',
          files:{'main.qml':'import QtQuick\n\nListView {\n  width: 200; height: 200\n  model: []\n  // TODO: delegate\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nListView {\n  width: 200; height: 200\n  model: ["a","b","c"]\n  delegate: Text { text: modelData }\n}\n'},
          tests:[{story:'ListView no errors.',steps:[{op:'noErrors'},{op:'uses',type:'ListView'}]}]
        }
      ]
    },
    {
      id: 'x-qml-drills-m4', title: 'States & Animations', desc: 'State changes.',
      blocks: [
        { id:'x-qml-drills-m4-l1', type:'lab', title:'Hover state', desc:'Change color on hover.',
          desc2:'<p>State "hovered" changes color.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  states: []\n  MouseArea { anchors.fill: parent; hoverEnabled: true }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  states: [ State { name: "hovered"; PropertyChanges { target: box; color: "blue" } } ]\n  MouseArea { anchors.fill: parent; hoverEnabled: true; onEntered: box.state="hovered"; onExited: box.state="" }\n}\n'},
          tests:[{story:'No errors.',steps:[{op:'noErrors'},{op:'has',id:'box'}]}]
        },
        { id:'x-qml-drills-m4-l2', type:'lab', title:'NumberAnimation', desc:'Animate width.',
          desc2:'<p>Animate width to 200 on click.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  MouseArea {\n    anchors.fill: parent\n    onClicked: // TODO animate\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "red"\n  MouseArea {\n    anchors.fill: parent\n    onClicked: anim.start()\n  }\n  NumberAnimation { id: anim; target: box; property: "width"; to: 200; duration: 300 }\n}\n'},
          tests:[{story:'No errors.',steps:[{op:'noErrors'},{op:'has',id:'box'}]}]
        }
      ]
    },
    {
      id: 'x-qml-drills-m5', title: 'Bindings & Signals', desc: 'Reactivity.',
      blocks: [
        { id:'x-qml-drills-m5-l1', type:'lab', title:'Binding', desc:'Bind height to width.',
          desc2:'<p>height = width.</p>',
          files:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100\n  // TODO: height: width\n  color: "green"\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nRectangle {\n  id: box\n  width: 100\n  height: width\n  color: "green"\n}\n'},
          tests:[{story:'height equals width.',steps:[{op:'noErrors'},{op:'eq',id:'box',prop:'height',value:100}]}]
        },
        { id:'x-qml-drills-m5-l2', type:'lab', title:'Signal', desc:'Emit custom signal.',
          desc2:'<p>Define signal clicked2 and emit on click.</p>',
          files:{'main.qml':'import QtQuick\n\nItem {\n  id: root\n  signal clicked2()\n  MouseArea {\n    anchors.fill: parent\n    // TODO: onClicked emit root.clicked2()\n  }\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nItem {\n  id: root\n  signal clicked2()\n  MouseArea {\n    anchors.fill: parent\n    onClicked: root.clicked2()\n  }\n}\n'},
          tests:[{story:'No errors.',steps:[{op:'noErrors'}]}]
        },
        { id:'x-qml-drills-m5-l3', type:'lab', title:'Timer', desc:'Timer fires after 100ms.',
          desc2:'<p>Timer running, interval 100.</p>',
          files:{'main.qml':'import QtQuick\n\nTimer {\n  id: t\n  // TODO: interval 100, running true\n}\n'},
          solution:{'main.qml':'import QtQuick\n\nTimer {\n  id: t\n  interval: 100\n  running: true\n  repeat: false\n}\n'},
          tests:[{story:'Timer configured.',steps:[{op:'noErrors'},{op:'has',id:'t'}]}]
        }
      ]
    }
  ]
});
window.CUSTOM_COURSES = window.CUSTOM_COURSES || [];
if (!window.CUSTOM_COURSES.some(c => c.id === 'x-qml-drills')) {
  window.CUSTOM_COURSES.push({ engine: 'qmlcamp', id: 'x-qml-drills', file: 'custom/x-qml-drills.js' });
}