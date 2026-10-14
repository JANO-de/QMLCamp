// Module titles/descriptions (all modules). Block-level text is in m<N>.js here, added progressively.
(function () {
const T = window.QMLCAMP.tr;
T.es = Object.assign(T.es || {}, {
  m1: { title: 'Fundamentos de QML', desc: 'Qué es QML, cómo se construye un documento, objetos, propiedades, ids, anclas y posicionadores.' },
  m2: { title: 'Bindings y JavaScript', desc: 'Bindings reactivos, expresiones JavaScript, funciones, Qt.binding y bucles.' },
  m3: { title: 'Señales y manejadores', desc: 'Reaccionar a eventos: MouseArea, manejadores de cambio de propiedad, señales propias, Timer y Connections.' },
  m4: { title: 'Ámbito y componentes', desc: 'Reglas de ámbito, property alias, componentes reutilizables en archivos propios y delegados de Repeater.' },
  m5: { title: 'Estados y animación', desc: 'Describe estados de la interfaz con State y PropertyChanges y anímalos con Behavior, Transition y NumberAnimation.' },
  m6: { title: 'Modelos y vistas', desc: 'Separa los datos de la presentación: ListModel, Repeater y ListView con delegados.' },
  m7: { title: 'Quickshell', desc: 'Construye shells de escritorio reales: ShellRoot, PanelWindow, Variants, singletons, Process, SystemClock e IPC.' },
  m8: { title: 'Proyecto final: Dynamic Island', desc: 'Construye una Dynamic Island desde cero en cinco pasos y supera el examen final.' }
});
T.de = Object.assign(T.de || {}, {
  m1: { title: 'QML-Grundlagen', desc: 'Was QML ist, wie ein Dokument aufgebaut ist, Objekte, Eigenschaften, ids, Anker und Positionierer.' },
  m2: { title: 'Bindings und JavaScript', desc: 'Reaktive Bindings, JavaScript-Ausdrücke, Funktionen, Qt.binding und Schleifen.' },
  m3: { title: 'Signale und Handler', desc: 'Auf Ereignisse reagieren: MouseArea, Handler für Eigenschaftsänderungen, eigene Signale, Timer und Connections.' },
  m4: { title: 'Gültigkeitsbereich und Komponenten', desc: 'Scope-Regeln, property alias, wiederverwendbare Komponenten in eigenen Dateien und Repeater-Delegates.' },
  m5: { title: 'Zustände und Animation', desc: 'UI-Zustände mit State und PropertyChanges beschreiben und mit Behavior, Transition und NumberAnimation animieren.' },
  m6: { title: 'Modelle und Ansichten', desc: 'Daten von der Darstellung trennen: ListModel, Repeater und ListView mit Delegates.' },
  m7: { title: 'Quickshell', desc: 'Echte Desktop-Shells bauen: ShellRoot, PanelWindow, Variants, Singletons, Process, SystemClock und IPC.' },
  m8: { title: 'Abschlussprojekt: Dynamic Island', desc: 'Baue in fünf Schritten eine Dynamic Island von Grund auf und bestehe die Abschlussprüfung.' }
});
T.ja = Object.assign(T.ja || {}, {
  m1: { title: 'QMLの基本', desc: 'QMLとは何か、ドキュメントの構造、オブジェクト、プロパティ、id、アンカー、ポジショナー。' },
  m2: { title: 'バインディングとJavaScript', desc: 'リアクティブなバインディング、JavaScript式、関数、Qt.binding、ループ。' },
  m3: { title: 'シグナルとハンドラ', desc: 'イベントへの反応: MouseArea、プロパティ変更ハンドラ、独自シグナル、Timer、Connections。' },
  m4: { title: 'スコープとコンポーネント', desc: 'スコープの規則、property alias、別ファイルの再利用可能なコンポーネント、Repeaterのデリゲート。' },
  m5: { title: '状態とアニメーション', desc: 'StateとPropertyChangesでUIの状態を記述し、Behavior、Transition、NumberAnimationでアニメーションさせる。' },
  m6: { title: 'モデルとビュー', desc: 'データと表示を分離する: ListModel、Repeater、デリゲート付きListView。' },
  m7: { title: 'Quickshell', desc: '本物のデスクトップシェルを作る: ShellRoot、PanelWindow、Variants、シングルトン、Process、SystemClock、IPC。' },
  m8: { title: '最終プロジェクト: Dynamic Island', desc: '5つのステップでDynamic Islandをゼロから作り、最終試験に合格しましょう。' }
});
})();
