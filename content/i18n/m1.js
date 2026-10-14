// Module 1 translations (es, de, ja). Code, identifiers and test logic stay untouched; only display text.
(function () {
const T = window.QMLCAMP.tr;
const add = (l, o) => { T[l] = Object.assign(T[l] || {}, o); };

add('es', {
 'm1-t1': { title: 'Objetos y propiedades', desc: 'Estructura del documento, tipos, propiedades, id y parent.',
  intro: 'QML es un lenguaje <b>declarativo</b>: describes <i>cómo se ve</i> la interfaz, no los pasos para dibujarla.',
  lessons: [
   { title: 'Qué es QML', html: '<p>Un archivo QML describe un árbol de <b>objetos</b>. Cada objeto tiene un <b>tipo</b> (como <code>Rectangle</code>) y <b>propiedades</b> (como <code>color</code>). Las llaves contienen las propiedades y los objetos hijos.</p><p>Quickshell, las aplicaciones Qt Quick y los widgets de Plasma se escriben así.</p>',
     q: { text: '¿Qué describe principalmente un archivo QML?', options: ['Una lista de pasos que el ordenador ejecuta en orden', 'Un árbol de objetos con propiedades', 'Solo el estilo CSS de una página', 'Un esquema de base de datos'], why: 'QML es declarativo: un árbol de objetos tipados y sus propiedades.' } },
   { title: 'Estructura del documento', html: '<p>Un archivo QML tiene primero los <b>imports</b> y después <b>un único objeto raíz</b>. Sin <code>import QtQuick</code>, tipos como <code>Rectangle</code> son desconocidos. Prueba a borrar el import de abajo y lee el error.</p>',
     q: { text: '¿Qué línea hace disponibles <code>Rectangle</code> y <code>Text</code>?', options: ['<code>include Rectangle</code>', '<code>import QtQuick</code>', '<code>using QtQuick</code>', 'Ninguna, siempre están disponibles'], why: 'Los tipos vienen de los módulos importados.' } },
   { title: 'Propiedades, id y parent', html: '<p>Asigna una propiedad con <code>nombre: valor</code>. Separa varias en una línea con <code>;</code>. Dale un <code>id</code> a un objeto para referirte a él desde otros sitios. Dentro de un hijo, <code>parent</code> es el objeto que lo contiene.</p>',
     q: { text: 'En el ejemplo, ¿qué es <code>parent.width</code> dentro del rectángulo dorado?', options: ['El ancho del rectángulo dorado', 'El ancho de <code>card</code>', 'El ancho de la ventana', 'Siempre 0'], why: '<code>parent</code> es el elemento que lo contiene, aquí <code>card</code>.' } }
  ] },
 'm1-l1': { title: 'Tarjeta de perfil', desc: 'Construye una tarjeta con nombre, cargo y avatar.',
  desc2: '<p>Construye una tarjeta de perfil. Edita <code>main.qml</code> hasta que pasen todas las historias de usuario.</p>',
  stories: ['Tu <code>Rectangle</code> raíz tiene <code>id: card</code>.', '<code>card</code> mide 260 de ancho y 120 de alto.', 'Hay un <code>Rectangle</code> redondo con <code>id: avatar</code> (60x60, <code>radius: 30</code>).', 'Un <code>Text</code> con <code>id: nameText</code> muestra un nombre no vacío.', 'Un <code>Text</code> con <code>id: roleText</code> muestra un cargo no vacío.', 'El fondo de la tarjeta es oscuro (todos los canales RGB por debajo de 100).'] },
 'm1-q1': { title: 'Test de práctica: objetos y propiedades', desc: 'Comprueba lo aprendido (70 % para aprobar).',
  questions: [
   { text: '¿Cuántos objetos raíz puede tener un archivo QML?', options: ['Cualquier número', 'Exactamente uno', 'Dos: uno visual y otro de lógica', 'Cero'], why: 'Un objeto raíz, con los hijos dentro.' },
   { text: '¿Qué línea fija el ancho en 100?', options: ['<code>width = 100</code>', '<code>width: 100</code>', '<code>set width 100</code>', '<code>width(100)</code>'], why: 'QML usa <code>nombre: valor</code>.' },
   { text: '¿Qué obtienes con <code>Rectangle { colour: "red" }</code>?', options: ['Un rectángulo rojo', 'Un error: propiedad inexistente', 'Un rectángulo azul', 'Nada, se ignora en silencio'], why: 'La propiedad es <code>color</code>; los nombres desconocidos son errores.' },
   { text: '¿Para qué sirve <code>id</code>?', options: ['Ordenar elementos', 'Referirse a un objeto desde otros puntos del archivo', 'Fijar el orden z', 'Nombrar el archivo'], why: 'Los ids permiten que otros objetos lo referencien.' },
   { text: '¿Qué palabra clave da acceso al elemento contenedor?', options: ['<code>owner</code>', '<code>this</code>', '<code>parent</code>', '<code>up</code>'], why: '<code>parent</code> es el padre visual.' }
  ] },
 'm1-t2': { title: 'Diseño: tipos, anclas, posicionadores', desc: 'Tipos de propiedad, anclas, Row, Column, Grid, Repeater.',
  lessons: [
   { title: 'Tipos de propiedad y propiedades propias', html: '<p>Las propiedades integradas tienen tipos: <code>int</code>, <code>real</code>, <code>string</code>, <code>bool</code>, <code>color</code>. Puedes declarar las tuyas con <code>property &lt;tipo&gt; nombre: valor</code>.</p>',
     q: { text: '¿Qué línea declara una nueva propiedad de tipo string?', options: ['<code>string name: "x"</code>', '<code>property string name: "x"</code>', '<code>var string name = "x"</code>', '<code>name: string "x"</code>'], why: '<code>property &lt;tipo&gt; &lt;nombre&gt;: &lt;valor&gt;</code>.' } },
   { title: 'Anclas', html: '<p>Las anclas unen un elemento a su padre o a sus hermanos: <code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.left</code>, <code>anchors.margins</code>.</p>',
     q: { text: '¿Qué hace <code>anchors.fill: parent</code>?', options: ['Centra el elemento', 'Hace que el elemento cubra a su padre', 'Oculta al padre', 'Rellena el elemento de color'], why: 'El elemento obtiene los mismos límites que el padre (menos los márgenes).' } },
   { title: 'Row, Column, Grid y Repeater', html: '<p><code>Row</code>, <code>Column</code> y <code>Grid</code> colocan a sus hijos automáticamente; usa <code>spacing</code> para los huecos. Un <code>Repeater</code> crea muchas copias a partir de un número o una lista; dentro, <code>index</code> es la posición.</p>',
     q: { text: 'Dentro de un delegado de Repeater con <code>model: 4</code>, ¿qué valores puede tomar <code>index</code>?', options: ['De 1 a 4', 'De 0 a 3', 'De 0 a 4', 'Solo 4'], why: 'Los índices empiezan en 0.' } }
  ] },
 'm1-l2': { title: 'Semáforo', desc: 'Construye un semáforo con Column y Repeater.',
  desc2: '<p>Construye un semáforo: una caja oscura con tres luces redondas apiladas en vertical.</p>',
  stories: ['La raíz <code>box</code> mide 60 de ancho y al menos 150 de alto.', 'Hay una <code>Column</code> con <code>id: lamps</code>.', 'La columna contiene 3 luces redondas (<code>radius</code> es la mitad del ancho).', 'Las luces están apiladas: cada una está más abajo que la anterior.', 'Las luces son roja, amarilla/dorada y verde, de arriba abajo.', 'Usaste un <code>Repeater</code> en vez de copiar y pegar tres rectángulos.'] },
 'm1-r': { title: 'Repaso: fundamentos de QML', desc: 'Chuleta.',
  html: '<h2>Fundamentos de QML: chuleta</h2><table class="cs"><tr><th>Concepto</th><th>Sintaxis</th></tr><tr><td>Import</td><td><code>import QtQuick</code></td></tr><tr><td>Objeto</td><td><code>Rectangle { width: 100 }</code></td></tr><tr><td>Propiedad propia</td><td><code>property string name: "x"</code></td></tr><tr><td>id / parent</td><td><code>id: box</code>, <code>parent.width</code></td></tr><tr><td>Anclas</td><td><code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.margins: 8</code></td></tr><tr><td>Posicionadores</td><td><code>Row</code>, <code>Column</code>, <code>Grid</code> con <code>spacing</code></td></tr><tr><td>Repeater</td><td><code>Repeater { model: 3; Rectangle { ... index ... } }</code></td></tr></table>' }
});

add('de', {
 'm1-t1': { title: 'Objekte und Eigenschaften', desc: 'Dokumentstruktur, Typen, Eigenschaften, id und parent.',
  intro: 'QML ist eine <b>deklarative</b> Sprache: Du beschreibst, <i>wie</i> die Oberfläche aussieht, nicht die Schritte, sie zu zeichnen.',
  lessons: [
   { title: 'Was QML ist', html: '<p>Eine QML-Datei beschreibt einen Baum aus <b>Objekten</b>. Jedes Objekt hat einen <b>Typ</b> (z. B. <code>Rectangle</code>) und <b>Eigenschaften</b> (z. B. <code>color</code>). In geschweiften Klammern stehen die Eigenschaften und Kindobjekte.</p><p>Quickshell, Qt-Quick-Apps und Plasma-Widgets werden alle so geschrieben.</p>',
     q: { text: 'Was beschreibt eine QML-Datei hauptsächlich?', options: ['Eine Liste von Schritten, die der Computer der Reihe nach ausführt', 'Einen Baum aus Objekten mit Eigenschaften', 'Nur das CSS-Styling einer Seite', 'Ein Datenbankschema'], why: 'QML ist deklarativ: ein Baum aus typisierten Objekten und ihren Eigenschaften.' } },
   { title: 'Dokumentstruktur', html: '<p>Eine QML-Datei hat zuerst die <b>Imports</b> und dann genau <b>ein Wurzelobjekt</b>. Ohne <code>import QtQuick</code> sind Typen wie <code>Rectangle</code> unbekannt. Lösche unten den Import und lies die Fehlermeldung.</p>',
     q: { text: 'Welche Zeile macht <code>Rectangle</code> und <code>Text</code> verfügbar?', options: ['<code>include Rectangle</code>', '<code>import QtQuick</code>', '<code>using QtQuick</code>', 'Keine, sie sind immer verfügbar'], why: 'Typen kommen aus importierten Modulen.' } },
   { title: 'Eigenschaften, id und parent', html: '<p>Setze eine Eigenschaft mit <code>name: wert</code>. Mehrere in einer Zeile trennst du mit <code>;</code>. Gib einem Objekt eine <code>id</code>, um es von anderer Stelle anzusprechen. In einem Kind ist <code>parent</code> das Objekt, das es enthält.</p>',
     q: { text: 'Was ist im Beispiel <code>parent.width</code> innerhalb des goldenen Rechtecks?', options: ['Die Breite des goldenen Rechtecks', 'Die Breite von <code>card</code>', 'Die Breite des Fensters', 'Immer 0'], why: '<code>parent</code> ist das Element, das es enthält, hier <code>card</code>.' } }
  ] },
 'm1-l1': { title: 'Profilkarte', desc: 'Baue eine Karte mit Name, Titel und Avatar.',
  desc2: '<p>Baue eine Profilkarte. Bearbeite <code>main.qml</code>, bis alle User Stories bestehen.</p>',
  stories: ['Dein Wurzel-<code>Rectangle</code> hat <code>id: card</code>.', '<code>card</code> ist 260 breit und 120 hoch.', 'Es gibt ein rundes <code>Rectangle</code> mit <code>id: avatar</code> (60x60, <code>radius: 30</code>).', 'Ein <code>Text</code> mit <code>id: nameText</code> zeigt einen nicht leeren Namen.', 'Ein <code>Text</code> mit <code>id: roleText</code> zeigt einen nicht leeren Titel.', 'Der Kartenhintergrund ist dunkel (alle RGB-Kanäle unter 100).'] },
 'm1-q1': { title: 'Übungstest: Objekte und Eigenschaften', desc: 'Prüfe, was du gelernt hast (70 % zum Bestehen).',
  questions: [
   { text: 'Wie viele Wurzelobjekte kann eine QML-Datei haben?', options: ['Beliebig viele', 'Genau eines', 'Zwei: ein visuelles und ein logisches', 'Null'], why: 'Ein Wurzelobjekt, die Kinder liegen darin.' },
   { text: 'Welche Zeile setzt die Breite auf 100?', options: ['<code>width = 100</code>', '<code>width: 100</code>', '<code>set width 100</code>', '<code>width(100)</code>'], why: 'QML verwendet <code>name: wert</code>.' },
   { text: 'Was ergibt <code>Rectangle { colour: "red" }</code>?', options: ['Ein rotes Rechteck', 'Einen Fehler: Eigenschaft existiert nicht', 'Ein blaues Rechteck', 'Nichts, es wird stillschweigend ignoriert'], why: 'Die Eigenschaft heißt <code>color</code>; unbekannte Namen sind Fehler.' },
   { text: 'Wofür wird <code>id</code> verwendet?', options: ['Zum Sortieren von Elementen', 'Um ein Objekt von anderen Stellen der Datei aus anzusprechen', 'Zum Setzen der z-Reihenfolge', 'Zum Benennen der Datei'], why: 'Mit ids können andere Objekte darauf verweisen.' },
   { text: 'Welches Schlüsselwort liefert das umgebende Element?', options: ['<code>owner</code>', '<code>this</code>', '<code>parent</code>', '<code>up</code>'], why: '<code>parent</code> ist das visuelle Elternelement.' }
  ] },
 'm1-t2': { title: 'Layout: Typen, Anker, Positionierer', desc: 'Eigenschaftstypen, Anker, Row, Column, Grid, Repeater.',
  lessons: [
   { title: 'Eigenschaftstypen und eigene Eigenschaften', html: '<p>Eingebaute Eigenschaften haben Typen: <code>int</code>, <code>real</code>, <code>string</code>, <code>bool</code>, <code>color</code>. Eigene deklarierst du mit <code>property &lt;Typ&gt; name: wert</code>.</p>',
     q: { text: 'Welche Zeile deklariert eine neue String-Eigenschaft?', options: ['<code>string name: "x"</code>', '<code>property string name: "x"</code>', '<code>var string name = "x"</code>', '<code>name: string "x"</code>'], why: '<code>property &lt;Typ&gt; &lt;Name&gt;: &lt;Wert&gt;</code>.' } },
   { title: 'Anker', html: '<p>Anker befestigen ein Element an seinem Elternelement oder an Geschwistern: <code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.left</code>, <code>anchors.margins</code>.</p>',
     q: { text: 'Was bewirkt <code>anchors.fill: parent</code>?', options: ['Zentriert das Element', 'Lässt das Element sein Elternelement ausfüllen', 'Blendet das Elternelement aus', 'Füllt das Element mit Farbe'], why: 'Das Element erhält dieselben Grenzen wie das Elternelement (abzüglich der Ränder).' } },
   { title: 'Row, Column, Grid und Repeater', html: '<p><code>Row</code>, <code>Column</code> und <code>Grid</code> platzieren Kinder automatisch; Abstände setzt du mit <code>spacing</code>. Ein <code>Repeater</code> erzeugt viele Kopien aus einer Zahl oder einem Array; darin ist <code>index</code> die Position.</p>',
     q: { text: 'Welche Werte kann <code>index</code> in einem Repeater-Delegate mit <code>model: 4</code> annehmen?', options: ['1 bis 4', '0 bis 3', '0 bis 4', 'Nur 4'], why: 'Indizes beginnen bei 0.' } }
  ] },
 'm1-l2': { title: 'Ampel', desc: 'Baue eine Ampel mit Column und Repeater.',
  desc2: '<p>Baue eine Ampel: ein dunkler Kasten mit drei runden Lampen, senkrecht gestapelt.</p>',
  stories: ['Die Wurzel <code>box</code> ist 60 breit und mindestens 150 hoch.', 'Es gibt eine <code>Column</code> mit <code>id: lamps</code>.', 'Die Spalte enthält 3 runde Lampen (<code>radius</code> ist die halbe Breite).', 'Die Lampen sind gestapelt: Jede liegt tiefer als die vorherige.', 'Die Lampen sind von oben nach unten rot, gelb/gold und grün.', 'Du hast einen <code>Repeater</code> benutzt, statt drei Rechtecke zu kopieren.'] },
 'm1-r': { title: 'Wiederholung: QML-Grundlagen', desc: 'Spickzettel.',
  html: '<h2>QML-Grundlagen: Spickzettel</h2><table class="cs"><tr><th>Konzept</th><th>Syntax</th></tr><tr><td>Import</td><td><code>import QtQuick</code></td></tr><tr><td>Objekt</td><td><code>Rectangle { width: 100 }</code></td></tr><tr><td>Eigene Eigenschaft</td><td><code>property string name: "x"</code></td></tr><tr><td>id / parent</td><td><code>id: box</code>, <code>parent.width</code></td></tr><tr><td>Anker</td><td><code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.margins: 8</code></td></tr><tr><td>Positionierer</td><td><code>Row</code>, <code>Column</code>, <code>Grid</code> mit <code>spacing</code></td></tr><tr><td>Repeater</td><td><code>Repeater { model: 3; Rectangle { ... index ... } }</code></td></tr></table>' }
});

add('ja', {
 'm1-t1': { title: 'オブジェクトとプロパティ', desc: 'ドキュメント構造、型、プロパティ、idとparent。',
  intro: 'QMLは<b>宣言型</b>言語です。描画の手順ではなく、インターフェースが<i>どう見えるか</i>を記述します。',
  lessons: [
   { title: 'QMLとは', html: '<p>QMLファイルは<b>オブジェクト</b>のツリーを記述します。各オブジェクトには<b>型</b>（<code>Rectangle</code>など）と<b>プロパティ</b>（<code>color</code>など）があります。波括弧の中にプロパティと子オブジェクトを書きます。</p><p>Quickshell、Qt Quickアプリ、Plasmaウィジェットはすべてこの形式で書かれています。</p>',
     q: { text: 'QMLファイルが主に記述するものは？', options: ['コンピュータが順番に実行する手順のリスト', 'プロパティを持つオブジェクトのツリー', 'ページのCSSスタイルだけ', 'データベーススキーマ'], why: 'QMLは宣言型で、型付きオブジェクトとそのプロパティのツリーを記述します。' } },
   { title: 'ドキュメント構造', html: '<p>QMLファイルは最初に<b>import</b>、続いてちょうど<b>1つのルートオブジェクト</b>を書きます。<code>import QtQuick</code>がないと<code>Rectangle</code>などの型は未知になります。下のimportを削除してエラーを読んでみましょう。</p>',
     q: { text: '<code>Rectangle</code>と<code>Text</code>を使えるようにする行はどれ？', options: ['<code>include Rectangle</code>', '<code>import QtQuick</code>', '<code>using QtQuick</code>', '不要、常に使える'], why: '型はインポートしたモジュールから来ます。' } },
   { title: 'プロパティ、idとparent', html: '<p>プロパティは<code>名前: 値</code>で設定します。1行に複数書くときは<code>;</code>で区切ります。<code>id</code>を付けると他の場所からそのオブジェクトを参照できます。子の中で<code>parent</code>はそれを含むオブジェクトです。</p>',
     q: { text: '例の金色の四角形の中で、<code>parent.width</code>は何ですか？', options: ['金色の四角形の幅', '<code>card</code>の幅', 'ウィンドウの幅', '常に0'], why: '<code>parent</code>はそれを含む要素、ここでは<code>card</code>です。' } }
  ] },
 'm1-l1': { title: 'プロフィールカード', desc: '名前、肩書き、アバターのあるカードを作ります。',
  desc2: '<p>プロフィールカードを作りましょう。すべてのユーザーストーリーに合格するまで<code>main.qml</code>を編集してください。</p>',
  stories: ['ルートの<code>Rectangle</code>に<code>id: card</code>がある。', '<code>card</code>は幅260、高さ120である。', '<code>id: avatar</code>を持つ丸い<code>Rectangle</code>がある（60x60、<code>radius: 30</code>）。', '<code>id: nameText</code>の<code>Text</code>が空でない名前を表示する。', '<code>id: roleText</code>の<code>Text</code>が空でない肩書きを表示する。', 'カードの背景が暗い（RGBの全チャンネルが100未満）。'] },
 'm1-q1': { title: '練習テスト: オブジェクトとプロパティ', desc: '学んだことを確認しましょう（70%で合格）。',
  questions: [
   { text: 'QMLファイルに置けるルートオブジェクトの数は？', options: ['いくつでも', 'ちょうど1つ', '2つ（見た目用とロジック用）', '0個'], why: 'ルートオブジェクトは1つで、子はその中に入ります。' },
   { text: '幅を100にする行はどれ？', options: ['<code>width = 100</code>', '<code>width: 100</code>', '<code>set width 100</code>', '<code>width(100)</code>'], why: 'QMLでは<code>名前: 値</code>を使います。' },
   { text: '<code>Rectangle { colour: "red" }</code>の結果は？', options: ['赤い四角形', 'エラー: 存在しないプロパティ', '青い四角形', '何も起きず、黙って無視される'], why: 'プロパティ名は<code>color</code>です。未知の名前はエラーになります。' },
   { text: '<code>id</code>は何のために使う？', options: ['項目の並べ替え', 'ファイル内の他の場所からオブジェクトを参照する', 'zオーダーの設定', 'ファイル名の指定'], why: 'idがあると他のオブジェクトから参照できます。' },
   { text: '含んでいる親の要素を得るキーワードは？', options: ['<code>owner</code>', '<code>this</code>', '<code>parent</code>', '<code>up</code>'], why: '<code>parent</code>は視覚的な親です。' }
  ] },
 'm1-t2': { title: 'レイアウト: 型、アンカー、ポジショナー', desc: 'プロパティの型、アンカー、Row、Column、Grid、Repeater。',
  lessons: [
   { title: 'プロパティの型と独自プロパティ', html: '<p>組み込みプロパティには型があります: <code>int</code>、<code>real</code>、<code>string</code>、<code>bool</code>、<code>color</code>。独自のプロパティは<code>property &lt;型&gt; 名前: 値</code>で宣言します。</p>',
     q: { text: '新しいstringプロパティを宣言する行はどれ？', options: ['<code>string name: "x"</code>', '<code>property string name: "x"</code>', '<code>var string name = "x"</code>', '<code>name: string "x"</code>'], why: '<code>property &lt;型&gt; &lt;名前&gt;: &lt;値&gt;</code>です。' } },
   { title: 'アンカー', html: '<p>アンカーは項目を親や兄弟に結び付けます: <code>anchors.fill: parent</code>、<code>anchors.centerIn: parent</code>、<code>anchors.left</code>、<code>anchors.margins</code>。</p>',
     q: { text: '<code>anchors.fill: parent</code>は何をする？', options: ['項目を中央に置く', '項目が親全体を覆うようにする', '親を非表示にする', '項目を色で塗りつぶす'], why: '項目は親と同じ範囲（マージンを除く）になります。' } },
   { title: 'Row、Column、GridとRepeater', html: '<p><code>Row</code>、<code>Column</code>、<code>Grid</code>は子を自動で配置します。間隔には<code>spacing</code>を使います。<code>Repeater</code>は数値や配列から多数のコピーを作り、その中で<code>index</code>は位置を表します。</p>',
     q: { text: '<code>model: 4</code>のRepeaterデリゲート内で、<code>index</code>が取る値は？', options: ['1から4', '0から3', '0から4', '4のみ'], why: 'インデックスは0から始まります。' } }
  ] },
 'm1-l2': { title: '信号機', desc: 'ColumnとRepeaterで信号機を作ります。',
  desc2: '<p>信号機を作りましょう。暗い箱の中に、3つの丸いランプを縦に並べます。</p>',
  stories: ['ルートの<code>box</code>は幅60、高さ150以上である。', '<code>id: lamps</code>の<code>Column</code>がある。', 'カラムに丸いランプが3つある（<code>radius</code>が幅の半分）。', 'ランプは縦に積まれている: 各ランプは前のものより下にある。', 'ランプは上から赤、黄/金、緑である。', '3つの四角形をコピペせず、<code>Repeater</code>を使った。'] },
 'm1-r': { title: '復習: QMLの基本', desc: 'チートシート。',
  html: '<h2>QMLの基本: チートシート</h2><table class="cs"><tr><th>概念</th><th>構文</th></tr><tr><td>Import</td><td><code>import QtQuick</code></td></tr><tr><td>オブジェクト</td><td><code>Rectangle { width: 100 }</code></td></tr><tr><td>独自プロパティ</td><td><code>property string name: "x"</code></td></tr><tr><td>id / parent</td><td><code>id: box</code>, <code>parent.width</code></td></tr><tr><td>アンカー</td><td><code>anchors.fill: parent</code>, <code>anchors.centerIn: parent</code>, <code>anchors.margins: 8</code></td></tr><tr><td>ポジショナー</td><td><code>spacing</code>付きの<code>Row</code>、<code>Column</code>、<code>Grid</code></td></tr><tr><td>Repeater</td><td><code>Repeater { model: 3; Rectangle { ... index ... } }</code></td></tr></table>' }
});
})();
