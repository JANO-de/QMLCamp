// custom/x-demo.js — small QMLCamp course created to show the custom/ format.
// It is listed in custom/index.js. Copy it as a starting point for your own course.
(function () {
  'use strict';
  window.QMLCAMP = window.QMLCAMP || {};
  (window.QMLCAMP.courses = window.QMLCAMP.courses || []).push({
    id: 'x-demo',
    title: 'Custom course demo',
    desc: 'A tiny QML course living in custom/: one module with a theory, a lab, a quiz and a review block.',
    lang: 'qml',
    custom: 'file',
    modules: [
      {
        id: 'x-demo-m1',
        title: 'Build a badge',
        desc: 'A rounded label you can drop into any interface.',
        blocks: [
          {
            id: 'x-demo-m1-t1', type: 'theory', title: 'Rounded rectangles', desc: 'radius, size and colour.',
            intro: 'A <b>Rectangle</b> with a <b>radius</b> becomes a pill. Its children are drawn on top of it.',
            lessons: [
              {
                title: 'Radius and children',
                html: '<p>The <code>radius</code> property rounds the corners. A child <code>Text</code> positioned with <code>anchors.centerIn: parent</code> lands in the middle.</p>',
                example: 'import QtQuick\n\nRectangle {\n  width: 120; height: 40; radius: 8\n  color: "#1b1b32"\n  Text { text: "Hello"; color: "white"; anchors.centerIn: parent }\n}\n',
                q: {
                  text: 'Which property rounds the corners of a Rectangle?',
                  options: ['corner', 'rounding', 'radius', 'border'],
                  answer: 2,
                  why: '<code>radius</code> takes a number of pixels.'
                }
              }
            ]
          },
          {
            id: 'x-demo-m1-l1', type: 'lab', title: 'Badge', desc: 'Build a rounded badge with a label.',
            desc2: '<p>Give the root rectangle the id <code>badge</code>, make it 120x40 with <code>radius</code> 8 and a dark colour, and add a <code>Text</code> with id <code>label</code> that says <code>Hello</code>.</p>',
            files: {
              'main.qml': 'import QtQuick\n\nRectangle {\n  // TODO: id: badge, 120x40, radius 8, dark colour\n  // TODO: a Text with id: label saying "Hello"\n}\n'
            },
            solution: {
              'main.qml': 'import QtQuick\n\nRectangle {\n  id: badge\n  width: 120; height: 40; radius: 8\n  color: "#1b1b32"\n  Text {\n    id: label\n    text: "Hello"\n    color: "white"\n    anchors.centerIn: parent\n  }\n}\n'
            },
            tests: [
              { story: 'The root rectangle has <code>id: badge</code>.', steps: [{ op: 'noErrors' }, { op: 'has', id: 'badge' }] },
              { story: '<code>badge</code> is 120 wide, 40 tall and rounded with radius 8.', steps: [{ op: 'eq', id: 'badge', prop: 'width', value: 120 }, { op: 'eq', id: 'badge', prop: 'height', value: 40 }, { op: 'eq', id: 'badge', prop: 'radius', value: 8 }] },
              { story: 'A <code>Text</code> with <code>id: label</code> shows <code>Hello</code>.', steps: [{ op: 'eq', id: 'label', prop: 'text', value: 'Hello' }] },
              { story: 'The badge background is dark (every RGB channel below 100).', steps: [{ op: 'rgbBelow', id: 'badge', prop: 'color', max: 100 }] }
            ]
          },
          {
            id: 'x-demo-m1-q1', type: 'quiz', title: 'Practice test: rounded rectangles', desc: 'Two quick questions (70% to pass).',
            questions: [
              { text: 'What does <code>anchors.centerIn: parent</code> do?', options: ['Makes the item cover the parent', 'Centers the item inside the parent', 'Deletes the parent', 'Changes the colour'], answer: 1, why: 'It places the item at the centre of its parent.' },
              { text: 'Which value type is <code>radius</code>?', options: ['string', 'bool', 'number', 'color'], answer: 2, why: 'It is a number of pixels.' }
            ]
          },
          {
            id: 'x-demo-m1-r', type: 'review', title: 'Review: badge', desc: 'Cheat sheet.',
            html: '<ul><li><code>radius: 8</code> rounds a <code>Rectangle</code>.</li><li><code>anchors.centerIn: parent</code> centres a child.</li><li>Children are drawn on top of the parent.</li></ul>'
          }
        ]
      }
    ]
  });
})();
