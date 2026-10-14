// UI strings + language state. Content overrides live in content/i18n/<module>.js as
// QMLCAMP.tr[lang][blockOrModuleId] = {title,desc,intro,desc2,html,lessons:[{title,html,q:{text,options,why}}],questions:[{text,options,why}],stories:[...]}
// Code, QML identifiers, tests and engine errors are never translated. Missing keys fall back to English.
(function () {
'use strict';
const LANGS = [['en', 'English'], ['ja', '日本語'], ['es', 'Español'], ['de', 'Deutsch']];
const S = {
en: {
  tag: 'learn by building, offline', overall: '{c}: {d} of {n} blocks complete', module: 'Module', language: 'Language',
  theory: 'Theory', lab: 'Lab', quiz: 'Quiz', review: 'Review',
  welcome: 'Welcome to QMLCamp', welcomeP: 'Learn by building. Pick a course, or carry on where you stopped. Everything runs offline in your browser.',
  leftOff: 'Where you left off', cont: 'Continue: ', start: 'Start: ', courses: 'Courses', course: 'Course', allModules: 'All modules',
  modsDone: '{m} modules, {d} of {n} blocks complete', saved: 'Progress is saved in this browser, per course. ', selfCheck: 'Self-check all labs',
  savedShort: 'Progress is saved in this browser. ', selfCheckLong: 'Self-check all labs', selfCheckNote: ' (runs every reference solution through its tests).',
  courseIntro: 'Learn the whole QML language the freeCodeCamp way: <b>Theory → Lab → Practice test → Theory → Lab → Review</b>. Labs run a real (mini) QML engine in your browser and check your code with tests, offline. The course ends in a final project: your own Dynamic Island.',
  welcomeCrumb: 'Welcome', blocksDone: '{d} of {n} blocks complete', comingNext: 'coming next', contBtn: 'Continue', startBtn: 'Start',
  next: 'Next: ', backToModule: 'Back to module', tryIt: 'Try it: edit the code, the preview updates live', noErrors: 'No errors.',
  pickFirst: 'Pick an answer first.', passed: 'Passed. ', notPassed: 'Not passed. ', checkAnswer: 'Check answer', stPassed: 'Passed', stNot: 'Not Passed', stRead: 'Read',
  allPassed: 'All questions passed.', passAll: 'Pass every question to finish this block.', continueArrow: 'Continue →',
  quizIntro: 'Answer every question. You need at least 70% to pass.', correct: 'Correct. ', notQuite: 'Not quite. ', quizPass: '— passed!', quizFail: '— review the theory and try again.', submit: 'Submit answers',
  markReviewed: 'Mark as reviewed', labCrumb: 'Lab', stories: 'User stories', runTests: 'Run the Tests (Ctrl+Enter runs the preview)', reset: 'Reset', resetAsk: 'Reset the code to the starting point?',
  stuck: 'Stuck? Show the reference solution', loadSol: 'Load solution into editor', preview: 'Preview', console: 'Console',
  labOk: 'Congratulations, your code passes. Lab complete!', labPart: '{p} of {n} tests pass. Keep going.',
  courseTitle: 'QML Foundations', courseDesc: 'Learn the whole QML language and build a Quickshell Dynamic Island.',
  expBtn: 'Export progress', impBtn: 'Import progress', expDone: 'Progress exported.', impOk: 'Imported: {n} blocks complete. Merged with this browser.', impBad: 'Not a valid QMLCamp progress file.',
},
es: {
  tag: 'aprende construyendo, sin conexión', overall: '{c}: {d} de {n} bloques completados', module: 'Módulo', language: 'Idioma',
  theory: 'Teoría', lab: 'Laboratorio', quiz: 'Test', review: 'Repaso',
  welcome: 'Bienvenido a QMLCamp', welcomeP: 'Aprende construyendo. Elige un curso o sigue por donde lo dejaste. Todo funciona sin conexión en tu navegador.',
  leftOff: 'Por donde ibas', cont: 'Continuar: ', start: 'Empezar: ', courses: 'Cursos', course: 'Curso', allModules: 'Todos los módulos',
  modsDone: '{m} módulos, {d} de {n} bloques completados', saved: 'El progreso se guarda en este navegador, por curso. ', selfCheck: 'Autocomprobar todos los laboratorios',
  savedShort: 'El progreso se guarda en este navegador. ', selfCheckLong: 'Autocomprobar todos los laboratorios', selfCheckNote: ' (pasa cada solución de referencia por sus tests).',
  courseIntro: 'Aprende todo el lenguaje QML al estilo freeCodeCamp: <b>Teoría → Laboratorio → Test de práctica → Teoría → Laboratorio → Repaso</b>. Los laboratorios ejecutan un mini motor QML real en tu navegador y comprueban tu código con tests, sin conexión. El curso termina con un proyecto final: tu propia Dynamic Island.',
  welcomeCrumb: 'Bienvenida', blocksDone: '{d} de {n} bloques completados', comingNext: 'próximamente', contBtn: 'Continuar', startBtn: 'Empezar',
  next: 'Siguiente: ', backToModule: 'Volver al módulo', tryIt: 'Pruébalo: edita el código y la vista previa se actualiza al instante', noErrors: 'Sin errores.',
  pickFirst: 'Elige primero una respuesta.', passed: 'Superada. ', notPassed: 'No superada. ', checkAnswer: 'Comprobar respuesta', stPassed: 'Superada', stNot: 'No superada', stRead: 'Leído',
  allPassed: 'Todas las preguntas superadas.', passAll: 'Supera todas las preguntas para terminar este bloque.', continueArrow: 'Continuar →',
  quizIntro: 'Responde a todas las preguntas. Necesitas al menos un 70 % para aprobar.', correct: 'Correcto. ', notQuite: 'No del todo. ', quizPass: '— ¡aprobado!', quizFail: '— repasa la teoría e inténtalo de nuevo.', submit: 'Enviar respuestas',
  markReviewed: 'Marcar como repasado', labCrumb: 'Laboratorio', stories: 'Historias de usuario', runTests: 'Ejecutar los tests (Ctrl+Enter ejecuta la vista previa)', reset: 'Reiniciar', resetAsk: '¿Volver el código al punto de partida?',
  stuck: '¿Atascado? Mostrar la solución de referencia', loadSol: 'Cargar la solución en el editor', preview: 'Vista previa', console: 'Consola',
  labOk: '¡Enhorabuena, tu código pasa! Laboratorio completado.', labPart: 'Pasan {p} de {n} tests. ¡Sigue así!',
  courseTitle: 'Fundamentos de QML', courseDesc: 'Aprende todo el lenguaje QML y construye una Dynamic Island de Quickshell.',
  expBtn: 'Exportar progreso', impBtn: 'Importar progreso', expDone: 'Progreso exportado.', impOk: 'Importado: {n} bloques completados. Combinado con este navegador.', impBad: 'No es un archivo de progreso de QMLCamp válido.',
},
de: {
  tag: 'durch Bauen lernen, offline', overall: '{c}: {d} von {n} Blöcken abgeschlossen', module: 'Modul', language: 'Sprache',
  theory: 'Theorie', lab: 'Labor', quiz: 'Quiz', review: 'Wiederholung',
  welcome: 'Willkommen bei QMLCamp', welcomeP: 'Lerne durch Bauen. Wähle einen Kurs oder mach dort weiter, wo du aufgehört hast. Alles läuft offline in deinem Browser.',
  leftOff: 'Hier warst du stehengeblieben', cont: 'Weiter: ', start: 'Start: ', courses: 'Kurse', course: 'Kurs', allModules: 'Alle Module',
  modsDone: '{m} Module, {d} von {n} Blöcken abgeschlossen', saved: 'Der Fortschritt wird pro Kurs in diesem Browser gespeichert. ', selfCheck: 'Alle Labore selbst prüfen',
  savedShort: 'Der Fortschritt wird in diesem Browser gespeichert. ', selfCheckLong: 'Alle Labore selbst prüfen', selfCheckNote: ' (lässt jede Referenzlösung durch ihre Tests laufen).',
  courseIntro: 'Lerne die ganze Sprache QML nach freeCodeCamp-Art: <b>Theorie → Labor → Übungstest → Theorie → Labor → Wiederholung</b>. Die Labore führen eine echte (Mini-)QML-Engine in deinem Browser aus und prüfen deinen Code offline mit Tests. Der Kurs endet mit einem Abschlussprojekt: deine eigene Dynamic Island.',
  welcomeCrumb: 'Willkommen', blocksDone: '{d} von {n} Blöcken abgeschlossen', comingNext: 'als Nächstes', contBtn: 'Weiter', startBtn: 'Start',
  next: 'Weiter: ', backToModule: 'Zurück zum Modul', tryIt: 'Probier es aus: Ändere den Code, die Vorschau aktualisiert sich live', noErrors: 'Keine Fehler.',
  pickFirst: 'Wähle zuerst eine Antwort.', passed: 'Bestanden. ', notPassed: 'Nicht bestanden. ', checkAnswer: 'Antwort prüfen', stPassed: 'Bestanden', stNot: 'Nicht bestanden', stRead: 'Gelesen',
  allPassed: 'Alle Fragen bestanden.', passAll: 'Beantworte alle Fragen richtig, um diesen Block abzuschließen.', continueArrow: 'Weiter →',
  quizIntro: 'Beantworte alle Fragen. Zum Bestehen brauchst du mindestens 70 %.', correct: 'Richtig. ', notQuite: 'Nicht ganz. ', quizPass: '— bestanden!', quizFail: '— wiederhole die Theorie und versuche es erneut.', submit: 'Antworten abgeben',
  markReviewed: 'Als wiederholt markieren', labCrumb: 'Labor', stories: 'User Stories', runTests: 'Tests ausführen (Strg+Enter startet die Vorschau)', reset: 'Zurücksetzen', resetAsk: 'Code auf den Anfangszustand zurücksetzen?',
  stuck: 'Hängst du fest? Referenzlösung anzeigen', loadSol: 'Lösung in den Editor laden', preview: 'Vorschau', console: 'Konsole',
  labOk: 'Glückwunsch, dein Code besteht! Labor abgeschlossen.', labPart: '{p} von {n} Tests bestanden. Weiter so!',
  courseTitle: 'QML-Grundlagen', courseDesc: 'Lerne die ganze Sprache QML und baue eine Quickshell Dynamic Island.',
  expBtn: 'Fortschritt exportieren', impBtn: 'Fortschritt importieren', expDone: 'Fortschritt exportiert.', impOk: 'Importiert: {n} Blöcke abgeschlossen. Mit diesem Browser zusammengeführt.', impBad: 'Keine gültige QMLCamp-Fortschrittsdatei.',
},
ja: {
  tag: '作って学ぶ・オフライン対応', overall: '{c}: {n}ブロック中{d}ブロック完了', module: 'モジュール', language: '言語',
  theory: '理論', lab: 'ラボ', quiz: 'クイズ', review: '復習',
  welcome: 'QMLCampへようこそ', welcomeP: '作りながら学びましょう。コースを選ぶか、前回の続きから再開できます。すべてブラウザ上でオフラインで動作します。',
  leftOff: '前回の続き', cont: '続ける: ', start: '開始: ', courses: 'コース', course: 'コース', allModules: 'すべてのモジュール',
  modsDone: '{m}モジュール、{n}ブロック中{d}ブロック完了', saved: '進捗はコースごとにこのブラウザへ保存されます。', selfCheck: '全ラボをセルフチェック',
  savedShort: '進捗はこのブラウザに保存されます。', selfCheckLong: '全ラボをセルフチェック', selfCheckNote: '（各模範解答をテストにかけます）。',
  courseIntro: 'freeCodeCamp方式でQML言語を丸ごと学びます: <b>理論 → ラボ → 練習テスト → 理論 → ラボ → 復習</b>。ラボではブラウザ上で本物の（ミニ）QMLエンジンが動き、オフラインのままテストでコードを確認します。コースの最後は最終プロジェクト、あなた自身のDynamic Islandです。',
  welcomeCrumb: 'ようこそ', blocksDone: '{n}ブロック中{d}ブロック完了', comingNext: '近日公開', contBtn: '続ける', startBtn: '開始',
  next: '次へ: ', backToModule: 'モジュールに戻る', tryIt: '試してみよう: コードを編集するとプレビューが即座に更新されます', noErrors: 'エラーなし。',
  pickFirst: '先に答えを選んでください。', passed: '合格。', notPassed: '不合格。', checkAnswer: '答えを確認', stPassed: '合格', stNot: '未合格', stRead: '読了',
  allPassed: 'すべての問題に合格しました。', passAll: 'このブロックを終えるには、すべての問題に正解してください。', continueArrow: '続ける →',
  quizIntro: 'すべての問題に答えてください。合格には70%以上が必要です。', correct: '正解。', notQuite: '惜しい。', quizPass: '— 合格！', quizFail: '— 理論を見直してもう一度挑戦しましょう。', submit: '回答を送信',
  markReviewed: '復習済みにする', labCrumb: 'ラボ', stories: 'ユーザーストーリー', runTests: 'テストを実行（Ctrl+Enterでプレビュー実行）', reset: 'リセット', resetAsk: 'コードを初期状態に戻しますか？',
  stuck: '行き詰まったら: 模範解答を表示', loadSol: '解答をエディタに読み込む', preview: 'プレビュー', console: 'コンソール',
  labOk: 'おめでとうございます、コードが合格しました！ラボ完了。', labPart: '{n}件中{p}件のテストに合格。その調子！',
  courseTitle: 'QML基礎', courseDesc: 'QML言語のすべてを学び、Quickshell Dynamic Islandを作ります。',
  expBtn: '進捗をエクスポート', impBtn: '進捗をインポート', expDone: '進捗をエクスポートしました。', impOk: 'インポート完了: {n} ブロック完了。このブラウザの進捗と統合しました。', impBad: '有効な QMLCamp の進捗ファイルではありません。',
}
};
const KEY = 'qmlcamp.lang';
let lang = 'en';
try { const s = localStorage.getItem(KEY); if (s && S[s]) lang = s; else { const n = (navigator.language || 'en').slice(0, 2); if (S[n]) lang = n; } } catch (e) {}
const I = {
  LANGS, get lang() { return lang; },
  set(l) { if (!S[l]) return; lang = l; try { localStorage.setItem(KEY, l); } catch (e) {} document.documentElement.lang = l === 'es' ? 'es-ES' : l; },
  t(k, v) { let s = (S[lang] && S[lang][k]) || S.en[k] || k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; },
  // localized view of a block/module/course: English object merged with the override for the current language
  loc(o) {
    const ov = lang !== 'en' && window.QMLCAMP.tr && window.QMLCAMP.tr[lang] && window.QMLCAMP.tr[lang][o.id];
    if (!ov) return o;
    const r = Object.assign({}, o);
    for (const k of ['title', 'desc', 'intro', 'desc2', 'html']) if (ov[k] !== undefined) r[k] = ov[k];
    const mq = (q, x) => x ? Object.assign({}, q, x) : q;
    if (o.lessons && ov.lessons) r.lessons = o.lessons.map((l, i) => { const x = ov.lessons[i]; return x ? Object.assign({}, l, x, { q: l.q ? mq(l.q, x.q) : l.q }) : l; });
    if (o.questions && ov.questions) r.questions = o.questions.map((q, i) => mq(q, ov.questions[i]));
    if (o.tests && ov.stories) r.stories = o.tests.map((t, i) => ov.stories[i] || t.story);
    return r;
  }
};
document.documentElement.lang = lang === 'es' ? 'es-ES' : lang;
window.QmlI18n = I;
})();
