// Resource lists. Channel links are YouTube searches on purpose: they cannot go stale
// the way hand-typed channel URLs do. Picks are written from memory and not checked live.
(function () {
  'use strict';
  const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const ch = (name, tags, why, q) => ({ name, tags, why, url: yt(q || name) });

  const channels = [
    ch('Ben Eater', ['eng'], 'Builds a working computer from logic chips on breadboards, one wire at a time.'),
    ch('GreatScott!', ['eng', 'diy', 'de'], 'DIY electronics projects with clear explanations. The creator is German.'),
    ch('EEVblog', ['eng'], 'Long, honest electrical engineering talk: teardowns, measurements, design advice.'),
    ch('ElectroBoom', ['eng'], 'Electronics lessons with slapstick. The theory underneath is solid.'),
    ch('Zach Star', ['eng'], 'Engineering and math explainers from an electrical engineering graduate.'),
    ch('Computerphile', ['eng'], 'Computer science topics explained by university researchers.'),
    ch('Jeff Geerling', ['eng', 'diy'], 'Raspberry Pi, homelab, and hardware experiments.'),
    ch('Look Mum No Computer', ['eng', 'diy', 'art'], 'Synths and odd electronics where engineering meets music.'),
    ch('Applied Science', ['eng', 'diy'], 'Home-lab experiments with real lab equipment.'),
    ch('MIT OpenCourseWare', ['mit'], 'Full university lectures from MIT, free to watch.'),
    ch('3Blue1Brown', ['mit'], 'Visual math explanations: linear algebra, calculus, neural networks.'),
    ch('Veritasium', ['mit'], 'Science and engineering stories with experiments.'),
    ch('Practical Engineering', ['mit', 'diy'], 'Civil engineering explained with tabletop demonstrations.'),
    ch('Stuff Made Here', ['diy'], 'Over-engineered builds, from a robotic backboard to a self-aiming bow.'),
    ch('Simone Giertz', ['diy', 'art'], 'Maker and inventor known for deliberately useless robots, now building real things.'),
    ch('Mark Rober', ['diy'], 'Former NASA engineer building big, funny, well-tested projects.'),
    ch('Nerdforge', ['diy', 'art'], 'Crafting and prop-making with a maker mindset.'),
    ch('Adam Savage’s Tested', ['diy', 'art'], 'Prop building, workshop tours, and maker culture.'),
    ch('Proko', ['art'], 'Figure drawing and anatomy lessons from the basics.'),
    ch('Adam Neely', ['art'], 'Music theory and music culture, funny and deep.'),
    ch('Game Maker’s Toolkit', ['game'], 'Why games work: design analysis with clear examples.'),
    ch('Extra Credits', ['game'], 'Game design and game history essays.'),
    ch('Matt Colville', ['dnd'], 'Running the Game: practical advice for Dungeon Masters.'),
    ch('Dungeon Dudes', ['dnd'], 'Character builds, rules explainers, and DM tips.'),
    ch('Critical Role', ['dnd'], 'A voice-actor group playing D&D, long-form storytelling.'),
    ch('Dimension 20', ['dnd'], 'Improv comedy actors running D&D campaigns.'),
    ch('Bob World Builder', ['dnd'], 'Worldbuilding and D&D lore explained for DMs.'),
    ch('Easy German', ['de'], 'Street interviews in German with German and English subtitles.'),
    ch('Learn German with Anja', ['de'], 'Structured German lessons from beginner level.'),
    ch('Deutsch mit Rieke', ['de'], 'Slow, clear German for learners, with explanations in German.'),
    ch('Nicos Weg Deutsche Welle', ['de'], 'A free A1 to B1 soap-opera course by Deutsche Welle.', 'Nicos Weg Deutsche Welle A1'),
    ch('Kurzgesagt Deutsch', ['de', 'mit'], 'Animated science explainers in German, good for later listening practice.'),
    ch('maiLab', ['de', 'mit'], 'Science explained in German by a chemist. For when you reach intermediate level.')
  ];

  // Searches for the “students from EE/CS careers” style: stable queries instead of guessed channels.
  const searches = [
    ['Day in the life of an electrical engineering student', 'EE student vlog day in the life'],
    ['Computer engineering student vlog', 'computer engineering student vlog'],
    ['MIT student projects and hackathons', 'MIT student project build'],
    ['How to Make (Almost) Anything lectures', 'MIT How to Make Almost Anything'],
    ['University electronics lab walkthroughs', 'university electronics lab project demo']
  ].map(([label, q]) => ({ label, url: yt(q) }));

  const sites = [
    { name: 'Deutsche Welle: Learn German', url: 'https://learngerman.dw.com', tags: ['de'], why: 'Free courses with video, exercises, and a level test from A1.' },
    { name: 'dict.cc', url: 'https://www.dict.cc', tags: ['de'], why: 'Fast German–English dictionary with audio.' },
    { name: 'Forvo', url: 'https://forvo.com', tags: ['de'], why: 'Native speakers saying words, for pronunciation checks.' },
    { name: 'Duden', url: 'https://www.duden.de', tags: ['de'], why: 'The reference dictionary for German spelling and grammar.' },
    { name: 'Anki', url: 'https://apps.ankiweb.net', tags: ['de', 'study'], why: 'Spaced repetition flashcards for any subject.' },
    { name: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', tags: ['mit', 'study'], why: 'Course notes, problem sets, and videos from MIT.' },
    { name: 'Falstad circuit simulator', url: 'https://www.falstad.com/circuit/', tags: ['eng'], why: 'Interactive circuit simulator in the browser: see current flow live.' },
    { name: 'Wokwi', url: 'https://wokwi.com', tags: ['eng', 'diy'], why: 'Simulate Arduino, ESP32, and Pi Pico projects in the browser.' },
    { name: 'The Nand Game', url: 'https://nandgame.com', tags: ['eng'], why: 'Build a computer from logic gates as a puzzle game.' },
    { name: 'Nand2Tetris', url: 'https://www.nand2tetris.org', tags: ['eng'], why: 'Free course: from logic gates to a running computer and software.' }
  ];

  const tagNames = {
    eng: 'Electronics and computing', mit: 'MIT and university', diy: 'DIY and maker', art: 'Art and music',
    game: 'Games', dnd: 'D&D', de: 'German'
  };

  window.GENLEARN = window.GENLEARN || {};
  window.GENLEARN.resources = { channels, searches, sites, tagNames };
  if (typeof module !== 'undefined') module.exports = window.GENLEARN.resources;
})();
