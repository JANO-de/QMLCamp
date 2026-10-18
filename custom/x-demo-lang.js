// custom/x-demo-lang.js — small GENLearn course living in custom/, listed in custom/index.js.
// GENLearn courses are pure data: units -> lessons -> words and sentences. The engine
// generates the exercises, the XP and the streak from them. Copy this as a starting point.
(function () {
  'use strict';
  window.GENLEARN = window.GENLEARN || {};
  (window.GENLEARN.courses = window.GENLEARN.courses || []).push({
    id: 'x-demo-lang',
    title: 'Mini German',
    level: 'A1',
    lang: 'de-DE',
    custom: 'file',
    units: [
      {
        id: 'x-demo-lang-u1',
        title: 'Hello and thanks',
        color: 'rose',
        tips: [
          '<b>Hallo</b> works at any time of day.',
          '<b>Tschüss</b> is casual, <b>Auf Wiedersehen</b> is polite.'
        ],
        lessons: [
          {
            id: 'x-demo-lang-l1',
            title: 'Greetings',
            words: [
              ['Hallo', 'Hello'],
              ['Guten Morgen', 'Good morning'],
              ['Guten Tag', 'Good day'],
              ['Tschüss', 'Bye'],
              ['Auf Wiedersehen', 'Goodbye'],
              ['Danke', 'Thanks'],
              ['Bitte', 'Please'],
              ['Ja', 'Yes'],
              ['Nein', 'No']
            ],
            sentences: [
              ['Guten Morgen!', 'Good morning!'],
              ['Guten Tag!', 'Good day!'],
              ['Auf Wiedersehen!', 'Goodbye!'],
              ['Ja, bitte.', 'Yes, please.']
            ]
          }
        ]
      }
    ]
  });
})();
