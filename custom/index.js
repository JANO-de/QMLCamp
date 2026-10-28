// Custom courses manifest.
//
// Every course file in this folder must be listed here. The page loads this file,
// then creates a <script> tag for each entry below. This works from file:// with no
// server and no build step: a course is just a script that registers itself.
//
// Fields per entry:
//   engine: 'qmlcamp' (programming: theory/lab/quiz/review) or 'genlearn' (languages)
//   id:     the course id inside the file; must start with 'x-' so it never clashes
//           with a built-in course or with its progress keys
//   file:   path to the course file, relative to the site root (index.html)
//
// A file that fails to load or does not register its id shows as a readable error
// card on the welcome page; it never stops the other courses from loading.
//
// Example:
//   { engine: 'qmlcamp', id: 'x-mycourse', file: 'custom/x-mycourse.js' }
window.CUSTOM_COURSES = [
  { engine: 'qmlcamp', id: 'x-demo', file: 'custom/x-demo.js' },
  { engine: 'genlearn', id: 'x-demo-lang', file: 'custom/x-demo-lang.js' },
  { engine: 'qmlcamp', id: 'x-qml-drills', file: 'custom/x-qml-drills.js' }
];
