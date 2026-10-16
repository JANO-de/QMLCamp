// German A1 course data. words: [german, english, note?]. sentences: [german, english].
// Nouns carry their article so gender is learned together with the word.
(function () {
  'use strict';
  const units = [
    {
      id: 'u1', title: 'Hello and thanks', color: 'rose',
      tips: [
        'Germans say <b>Guten Tag</b> (good day) from morning until late afternoon and <b>Guten Abend</b> in the evening. <b>Hallo</b> works anytime.',
        '<b>Tschüss</b> is casual, <b>Auf Wiedersehen</b> is polite.',
        '<b>Bitte</b> means both “please” and “you are welcome”.'
      ],
      lessons: [
        { id: 'l1', title: 'Greetings',
          words: [['Hallo', 'Hello'], ['Guten Morgen', 'Good morning'], ['Guten Tag', 'Good day'], ['Guten Abend', 'Good evening'], ['Gute Nacht', 'Good night'], ['Tschüss', 'Bye'], ['Auf Wiedersehen', 'Goodbye']],
          sentences: [['Guten Morgen!', 'Good morning!'], ['Guten Tag!', 'Good day!'], ['Gute Nacht!', 'Good night!'], ['Auf Wiedersehen!', 'Goodbye!']] },
        { id: 'l2', title: 'Politeness',
          words: [['Bitte', 'Please'], ['Danke', 'Thanks'], ['Danke schön', 'Thank you very much'], ['Entschuldigung', 'Excuse me'], ['Ja', 'Yes'], ['Nein', 'No'], ['Gern geschehen', 'You are welcome']],
          sentences: [['Danke schön!', 'Thank you very much!'], ['Ja, bitte.', 'Yes, please.'], ['Nein, danke.', 'No, thank you.'], ['Entschuldigung!', 'Excuse me!']] }
      ]
    },
    {
      id: 'u2', title: 'About you', color: 'butter',
      tips: [
        '<b>ich bin</b> (I am), <b>du bist</b> (you are). The verb <b>sein</b> (to be) is irregular, learn it by heart.',
        '<b>du</b> is for friends and people your age, <b>Sie</b> is the formal “you”.',
        '<b>heißen</b> means “to be called”: <b>Ich heiße Max.</b>'
      ],
      lessons: [
        { id: 'l3', title: 'I am, you are',
          words: [['ich', 'I'], ['du', 'you'], ['ich bin', 'I am'], ['du bist', 'you are'], ['gut', 'good'], ['müde', 'tired'], ['und', 'and'], ['Wie geht’s?', 'How are you?']],
          sentences: [['Ich bin Anna.', 'I am Anna.'], ['Du bist müde.', 'You are tired.'], ['Wie geht’s?', 'How are you?'], ['Mir geht’s gut.', 'I am doing well.'], ['Und dir?', 'And you?']] },
        { id: 'l4', title: 'Name and origin',
          words: [['wie', 'how'], ['wo', 'where'], ['woher', 'where from'], ['heißen', 'to be called'], ['kommen', 'to come'], ['wohnen', 'to live'], ['aus', 'from'], ['Deutschland', 'Germany'], ['Spanien', 'Spain']],
          sentences: [['Wie heißt du?', 'What is your name?'], ['Ich heiße Max.', 'My name is Max.'], ['Woher kommst du?', 'Where are you from?'], ['Ich komme aus Spanien.', 'I come from Spain.'], ['Ich wohne in Berlin.', 'I live in Berlin.']] }
      ]
    },
    {
      id: 'u3', title: 'Numbers', color: 'sage',
      tips: [
        'Count: <b>null, eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun, zehn</b>.',
        'To say your age, use “years old”: <b>Ich bin zwanzig Jahre alt.</b>',
        '<b>ü</b> sounds like saying “ee” with rounded lips: <b>fünf</b>.'
      ],
      lessons: [
        { id: 'l5', title: '0 to 5',
          words: [['null', 'zero'], ['eins', 'one'], ['zwei', 'two'], ['drei', 'three'], ['vier', 'four'], ['fünf', 'five'], ['ich habe', 'I have']],
          sentences: [['Eins, zwei, drei.', 'One, two, three.'], ['Ich habe fünf Euro.', 'I have five euros.'], ['Ich habe zwei Katzen.', 'I have two cats.'], ['Vier und eins ist fünf.', 'Four and one is five.']] },
        { id: 'l6', title: '6 to 20',
          words: [['sechs', 'six'], ['sieben', 'seven'], ['acht', 'eight'], ['neun', 'nine'], ['zehn', 'ten'], ['zwanzig', 'twenty'], ['alt', 'old'], ['die Jahre', 'the years']],
          sentences: [['Ich bin zwanzig.', 'I am twenty.'], ['Wie alt bist du?', 'How old are you?'], ['Ich bin zehn Jahre alt.', 'I am ten years old.'], ['Sechs und vier ist zehn.', 'Six and four is ten.']] }
      ]
    },
    {
      id: 'u4', title: 'Food and drink', color: 'sky',
      tips: [
        'Every noun has a gender: <b>der</b> (masculine), <b>die</b> (feminine), <b>das</b> (neuter). Learn each noun with its article.',
        'All nouns are written with a capital letter: <b>das Wasser</b>.',
        '<b>Ich möchte…</b> (I would like…) is the polite way to order. With a masculine noun, <b>ein</b> becomes <b>einen</b>: <b>einen Kaffee</b>.'
      ],
      lessons: [
        { id: 'l7', title: 'Drinks',
          words: [['das Wasser', 'the water'], ['der Kaffee', 'the coffee'], ['der Tee', 'the tea'], ['die Milch', 'the milk'], ['der Saft', 'the juice'], ['trinken', 'to drink'], ['ich möchte', 'I would like']],
          sentences: [['Ich trinke Wasser.', 'I drink water.'], ['Ich trinke Kaffee.', 'I drink coffee.'], ['Möchtest du Tee?', 'Would you like tea?'], ['Ich möchte einen Kaffee, bitte.', 'I would like a coffee, please.']] },
        { id: 'l8', title: 'Food',
          words: [['das Brot', 'the bread'], ['der Apfel', 'the apple'], ['der Käse', 'the cheese'], ['das Ei', 'the egg'], ['die Suppe', 'the soup'], ['essen', 'to eat'], ['heiß', 'hot']],
          sentences: [['Ich esse Brot.', 'I eat bread.'], ['Ich esse einen Apfel.', 'I eat an apple.'], ['Das Brot ist gut.', 'The bread is good.'], ['Die Suppe ist heiß.', 'The soup is hot.']] }
      ]
    },
    {
      id: 'u5', title: 'People', color: 'lav',
      tips: [
        '<b>mein</b> (my) changes with the noun: <b>mein Vater</b> (der), <b>meine Mutter</b> (die).',
        'Many jobs and roles have a feminine form ending in <b>-in</b>: <b>der Freund</b>, <b>die Freundin</b>.',
        '<b>er</b> = he, <b>sie</b> = she, <b>es</b> = it. <b>sie</b> can also mean “they”.'
      ],
      lessons: [
        { id: 'l9', title: 'Family',
          words: [['die Mutter', 'the mother'], ['der Vater', 'the father'], ['der Bruder', 'the brother'], ['die Schwester', 'the sister'], ['die Eltern', 'the parents'], ['die Familie', 'the family'], ['groß', 'big']],
          sentences: [['Das ist meine Mutter.', 'This is my mother.'], ['Das ist mein Vater.', 'This is my father.'], ['Ich habe eine Schwester.', 'I have a sister.'], ['Meine Familie ist groß.', 'My family is big.']] },
        { id: 'l10', title: 'Friends',
          words: [['der Freund', 'the friend (male)'], ['die Freundin', 'the friend (female)'], ['der Mann', 'the man'], ['die Frau', 'the woman'], ['das Kind', 'the child'], ['er', 'he'], ['sie', 'she'], ['wer', 'who']],
          sentences: [['Er ist mein Freund.', 'He is my friend.'], ['Sie ist meine Freundin.', 'She is my friend.'], ['Ich bin Student.', 'I am a student.'], ['Wer ist das?', 'Who is that?']] }
      ]
    },
    {
      id: 'u6', title: 'Days and colors', color: 'rose',
      tips: [
        'Days of the week are masculine and capitalized: <b>der Montag</b>. “On Monday” is <b>am Montag</b>.',
        '<b>heute</b> = today, <b>morgen</b> = tomorrow (and <b>der Morgen</b> = the morning).',
        'Colors are written in lowercase when they describe something: <b>der Apfel ist rot</b>.'
      ],
      lessons: [
        { id: 'l11', title: 'Days',
          words: [['Montag', 'Monday'], ['Dienstag', 'Tuesday'], ['Mittwoch', 'Wednesday'], ['Donnerstag', 'Thursday'], ['Freitag', 'Friday'], ['Samstag', 'Saturday'], ['Sonntag', 'Sunday'], ['heute', 'today'], ['morgen', 'tomorrow']],
          sentences: [['Heute ist Montag.', 'Today is Monday.'], ['Morgen ist Dienstag.', 'Tomorrow is Tuesday.'], ['Heute ist Freitag.', 'Today is Friday.'], ['Morgen ist Samstag.', 'Tomorrow is Saturday.']] },
        { id: 'l12', title: 'Colors',
          words: [['rot', 'red'], ['blau', 'blue'], ['grün', 'green'], ['gelb', 'yellow'], ['schwarz', 'black'], ['weiß', 'white']],
          sentences: [['Der Apfel ist rot.', 'The apple is red.'], ['Das Wasser ist blau.', 'The water is blue.'], ['Die Milch ist weiß.', 'The milk is white.'], ['Der Kaffee ist schwarz.', 'The coffee is black.']] }
      ]
    },
    {
      id: 'u7', title: 'Tech and games', color: 'butter',
      tips: [
        'Many tech words are close to English: <b>der Computer</b>, <b>die Batterie</b>, <b>das Kabel</b>.',
        '<b>ich baue</b> = I build, <b>ich spiele</b> = I play. Most verbs end in <b>-e</b> after <b>ich</b>.',
        '<b>der Würfel</b> is a die (dice); the plural is <b>die Würfel</b>.'
      ],
      lessons: [
        { id: 'l13', title: 'Electronics',
          words: [['der Computer', 'the computer'], ['das Kabel', 'the cable'], ['die Batterie', 'the battery'], ['der Strom', 'the current'], ['die Spannung', 'the voltage'], ['der Widerstand', 'the resistor'], ['die Schaltung', 'the circuit'], ['bauen', 'to build']],
          sentences: [['Ich baue eine Schaltung.', 'I build a circuit.'], ['Der Computer ist neu.', 'The computer is new.'], ['Die Batterie ist leer.', 'The battery is empty.'], ['Das Kabel ist lang.', 'The cable is long.']] },
        { id: 'l14', title: 'Games and fantasy',
          words: [['das Spiel', 'the game'], ['der Würfel', 'the die'], ['der Drache', 'the dragon'], ['das Schwert', 'the sword'], ['der Zauberer', 'the wizard'], ['der Held', 'the hero'], ['die Karte', 'the map'], ['spielen', 'to play']],
          sentences: [['Ich spiele ein Spiel.', 'I play a game.'], ['Der Drache ist groß.', 'The dragon is big.'], ['Ich habe einen Würfel.', 'I have a die.'], ['Der Held hat ein Schwert.', 'The hero has a sword.']] }
      ]
    }
  ];
  window.GENLEARN = window.GENLEARN || {};
  window.GENLEARN.german = { id: 'de', title: 'German', level: 'A1', lang: 'de-DE', units };
  if (typeof module !== 'undefined') module.exports = window.GENLEARN.german;
})();
