// custom/_template-genlearn.js — template for a GENLearn (language) course.
//
// This file is NOT a course by itself: it stores a complete example in
// window.FORGE_TEMPLATE_GENLEARN. The "Create from template" button in the GENLearn
// course creator reads it, fills in your id and title, and downloads custom/<id>.js.
//
// To write a course by hand instead, copy the object below into your own file,
// change the ids and content, then list the file in custom/index.js:
//   { engine: 'genlearn', id: 'x-my-language', file: 'custom/x-my-language.js' }
//
// Formato (same schema as the built-in German course):
//   course { id, title, level, lang, units: [ unit ] }
//     id    must start with 'x-'; it namespaces the lesson ids so progress never clashes
//     title shown on the shelf and at the top of the course page
//     level a short label, e.g. 'A1', 'Beginner'
//     lang  BCP-47 speech tag used by the "hear it" buttons and the listening exercise,
//           e.g. 'de-DE', 'es-ES', 'fr-FR', 'ja-JP'
//   unit   { id, title, color, tips:[html,...], lessons:[ lesson ] }
//     color one of: rose, butter, sage, sky, lav
//     tips  short grammar notes, HTML allowed
//   lesson { id, title, words:[ [target, english, note?] ], sentences:[ [target, english] ] }
//     words      3 or more so the multiple-choice options have distractors
//     sentences  1 or more; each becomes a word-ordering exercise
// Exercises (multiple choice, matching, listening, typing, word order), XP, streak and
// progress are generated from this data by genlearn/engine.js.
window.FORGE_TEMPLATE_GENLEARN = {
  id: 'x-my-language',
  title: 'My language course',
  level: 'A1',
  lang: 'de-DE',
  units: [
    {
      id: 'x-my-language-u1',
      title: 'First unit',
      color: 'sky',
      tips: [
        'A short grammar note with <b>html</b> allowed.',
        'Another tip.'
      ],
      lessons: [
        {
          id: 'x-my-language-l1',
          title: 'First lesson',
          words: [
            ['word one', 'translation one'],
            ['word two', 'translation two'],
            ['word three', 'translation three'],
            ['word four', 'translation four']
          ],
          sentences: [
            ['A short sentence in the target language.', 'Its English translation.'],
            ['A second sentence.', 'A second translation.']
          ]
        }
      ]
    }
  ]
};
