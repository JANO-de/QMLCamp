// custom/_template-qmlcamp.js — template for a QMLCamp (programming) course.
//
// This file is NOT a course by itself: it stores a complete example in
// window.FORGE_TEMPLATE_QMLCAMP. The "Create from template" button in the course
// creator reads it, fills in your id and title, and downloads a ready custom/<id>.js.
//
// To write a course by hand instead, copy the object below into your own file,
// change the ids and content, then list the file in custom/index.js:
//   { engine: 'qmlcamp', id: 'x-my-course', file: 'custom/x-my-course.js' }
//
// Formato (same schema as the built-in courses):
//   course  { id, title, desc, lang: 'qml'|'js'|'rust', modules: [ module ] }
//   module  { id, title, desc, blocks: [ block ] }
//   block   theory | lab | quiz | review
//     theory { id, type:'theory', title, desc, intro?, lessons:[{ title, html, example?, q? }] }
//            lesson.q = { text, options:[...], answer:<index>, why }
//     lab    { id, type:'lab', title, desc, desc2?, files:{name:code}, solution:{name:code},
//              tests:[{ story, steps:[ step ] }] }
//     quiz   { id, type:'quiz', title, desc, questions:[{ text, options, answer, why }] }
//     review { id, type:'review', title, desc, html }
//
// Test steps (data only; no code runs from them). Every known step:
//   { op:'noErrors' }
//   { op:'has', id }
//   { op:'count', type, n }
//   { op:'eq', id, prop, value }
//   { op:'near', id, prop, value, tol? }      // tol defaults to 1.5
//   { op:'rgbBelow', id, prop, max }          // every RGB channel of a colour < max
//   { op:'uses', type }                       // the file declares a node of that type
//   { op:'declares', name }                   // the file declares a property
//   { op:'sourceHas', text }                  // the source contains that text
//   { op:'click', id }                        // click a MouseArea inside that item
//   { op:'advance', ms }                      // advance animations/timers
// For Rust courses the available steps are: noErrors, sourceHas, outHas.
//
// Arrays in steps and options must stay in order. Progress keys use the course id,
// so a custom course id must start with 'x-'.
window.FORGE_TEMPLATE_QMLCAMP = {
  id: 'x-my-course',
  title: 'My QML course',
  desc: 'One module: a theory, a lab, a quiz and a review block.',
  lang: 'qml',
  modules: [
    {
      id: 'x-my-course-m1',
      title: 'First module',
      desc: 'What this module is about.',
      blocks: [
        {
          id: 'x-my-course-m1-t1', type: 'theory', title: 'A theory lesson', desc: 'Short description.',
          intro: 'Intro shown under the title. HTML is allowed.',
          lessons: [
            {
              title: 'A lesson',
              html: '<p>Explain the idea here. You can use <b>bold</b>, <code>code</code> and live examples.</p>',
              example: 'import QtQuick\n\nRectangle {\n  width: 120; height: 40\n  color: "tomato"\n}\n',
              q: { text: 'A question about the lesson.', options: ['Wrong', 'Right', 'Wrong too'], answer: 1, why: 'Why 1 is right.' }
            }
          ]
        },
        {
          id: 'x-my-course-m1-l1', type: 'lab', title: 'A lab', desc: 'Short description.',
          desc2: '<p>What the learner must build.</p>',
          files: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: box\n  // TODO: finish me\n}\n' },
          solution: { 'main.qml': 'import QtQuick\n\nRectangle {\n  id: box\n  width: 100; height: 100\n  color: "tomato"\n}\n' },
          tests: [
            { story: 'There is a <code>box</code> with no errors.', steps: [{ op: 'noErrors' }, { op: 'has', id: 'box' }] },
            { story: '<code>box</code> is 100 wide and 100 tall.', steps: [{ op: 'eq', id: 'box', prop: 'width', value: 100 }, { op: 'eq', id: 'box', prop: 'height', value: 100 }] }
          ]
        },
        {
          id: 'x-my-course-m1-q1', type: 'quiz', title: 'Practice test', desc: '70% to pass.',
          questions: [
            { text: 'A quiz question.', options: ['Wrong', 'Right', 'Wrong too'], answer: 1, why: 'The reason.' }
          ]
        },
        {
          id: 'x-my-course-m1-r', type: 'review', title: 'Review', desc: 'Cheat sheet.',
          html: '<ul><li>Key point one.</li><li>Key point two.</li></ul>'
        }
      ]
    }
  ]
};
