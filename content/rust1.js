// =============================================================================
//  Course: Rust for Beginners. Modules r1..r3. Labs are .rs files and run on the
//  in-page Rust core (js/rust.js + js/rust-lib.js). English content (falls back).
// =============================================================================
(function () {
  const Q = a => a.join('\n') + '\n';
  const mods = [];

  // ------------------------------------------------------------------ Module r1
  mods.push({
    id: 'r1', title: 'Rust Basics', desc: 'Functions, variables, integer and float types, and printing.',
    blocks: [
      { id: 'r1-t1', type: 'theory', title: 'Your first Rust program', desc: 'fn main, printing, variables and types.',
        lessons: [
          { title: 'fn main and println!', html: '<p>Every program starts at <code>fn main()</code>. <code>println!</code> is a macro (the <code>!</code> is the tell) that prints a line. <code>{}</code> is a placeholder filled by the values you pass after the string.</p>',
            example: Q(['fn main() {', '    let name = "Ada";', '    let n = 3;', '    println!("Hello, {}! You have {} items.", name, n);', '}']),
            q: { text: 'What does the example print?', options: ['Hello, {}! You have {} items.', 'Hello, Ada! You have 3 items.', 'Hello! 3', 'An error'], answer: 1, why: '<code>{}</code> is replaced in order by <code>name</code> then <code>n</code>.' } },
          { title: 'let, mutability and types', html: '<p><code>let</code> binds a value. Bindings are <b>immutable</b> unless you write <code>mut</code>. Rust infers most types, but you can annotate: <code>let n: i32 = 5;</code>. Course integers: <code>i32</code>, <code>u32</code>, <code>i64</code>, <code>usize</code> (a length). Floats: <code>f64</code>. Reassign with <code>=</code> only if the binding is <code>mut</code>.</p>',
            example: Q(['fn main() {', '    let mut count: i32 = 0;', '    count = count + 2;', '    let price: f64 = 2.5;', '    println!("{} and {}", count, price);', '}']),
            q: { text: 'Which line lets you change <code>x</code> afterwards?', options: ['let x = 1', 'let mut x = 1', 'const x = 1', 'fn x = 1'], answer: 1, why: '<code>mut</code> makes a binding reassignable.' } },
          { title: 'Functions and return values', html: '<p>A function is <code>fn name(param: Type) -&gt; ReturnType { ... }</code>. The <b>last expression</b> (with no semicolon) is the return value. Adding a semicolon turns it into a statement that returns <code>()</code>, so drop the semicolon to return a value. Types must match: an <code>i32</code> function cannot return an <code>f64</code>.</p>',
            example: Q(['fn double(x: i32) -> i32 {', '    x * 2', '}', '', 'fn main() {', '    println!("{}", double(21));', '}']),
            q: { text: 'Why is there no semicolon after <code>x * 2</code>?', options: ['Style', 'To make it the return value of the function', 'It would be a syntax error', 'Because x is immutable'], answer: 1, why: 'The final expression is returned.' } }
        ] },
      { id: 'r1-l1', type: 'lab', lang: 'rust', title: 'Celsius to Fahrenheit', desc: 'Write a function and call it from main.',
        desc2: '<p>Finish <code>c_to_f(c)</code>: it should return <code>c * 9.0 / 5.0 + 32.0</code>. Then <code>main</code> prints <code>c_to_f(100.0)</code> with one decimal, which is <code>212.0</code>.</p>',
        files: { 'main.rs': Q(['// Convert Celsius to Fahrenheit.', 'fn c_to_f(c: f64) -> f64 {', '    // TODO: return c * 9.0 / 5.0 + 32.0', '    0.0', '}', '', 'fn main() {', '    // TODO: print c_to_f(100.0) with {:.1}', '    println!("{:.1}", 0.0);', '}']) },
        solution: { 'main.rs': Q(['fn c_to_f(c: f64) -> f64 {', '    c * 9.0 / 5.0 + 32.0', '}', '', 'fn main() {', '    println!("{:.1}", c_to_f(100.0));', '}']) },
        tests: [
          { story: 'The program runs without errors.', run: t => { t.noErrors(); } },
          { story: '<code>c_to_f(100.0)</code> is <code>212.0</code> and <code>c_to_f(0.0)</code> is <code>32.0</code>.', run: t => { t.expect(String(t.disp(t.call('c_to_f', t.f(100)))) === '212', 'c_to_f(100) should be 212'); t.expect(String(t.disp(t.call('c_to_f', t.f(0)))) === '32', 'c_to_f(0) should be 32'); } },
          { story: 'The program prints <code>212.0</code>.', run: t => { t.eq(t.out, '212.0\n', 'output'); } }
        ] },
      { id: 'r1-q1', type: 'quiz', title: 'Practice test: Rust basics', desc: '70% to pass.',
        questions: [
          { text: 'Which is the entry point of a Rust program?', options: ['fn start()', 'fn main()', 'void main()', 'begin {}'], answer: 1, why: '<code>fn main()</code> runs first.' },
          { text: 'What does <code>!</code> in <code>println!</code> mean?', options: ['It is a mistake', 'It is a macro', 'It negates the result', 'It is required for printing'], answer: 1, why: 'The <code>!</code> marks a macro call.' },
          { text: 'Which makes a binding reassignable?', options: ['let x = 1', 'let mut x = 1', 'var x = 1', 'const x = 1'], answer: 1, why: 'Use <code>mut</code>.' },
          { text: 'What does <code>fn f() -&gt; i32 { 5; }</code> fail to do?', options: ['Nothing', 'Return an i32 (the semicolon makes the body return ())', 'Compile at all', 'Take an argument'], answer: 1, why: 'A trailing semicolon discards the value.' },
          { text: 'Which is a floating point type?', options: ['i32', 'usize', 'f64', 'bool'], answer: 2, why: '<code>f64</code> is a 64-bit float.' }
        ] },
      { id: 'r1-r', type: 'review', title: 'Review: Rust basics', desc: 'Cheat sheet.',
        html: '<h3>Programs</h3><ul><li><code>fn main()</code> is the entry point.</li><li><code>println!("{} {:?}", a, b)</code> formats; <code>{:.1}</code> sets float precision.</li></ul><h3>Bindings</h3><ul><li><code>let x = 1;</code> immutable, <code>let mut x = 1;</code> mutable.</li><li>Annotate with <code>let n: i32 = 5;</code>; common types <code>i32 u32 i64 usize f64 bool</code>.</li></ul><h3>Functions</h3><ul><li><code>fn add(a: i32, b: i32) -&gt; i32 { a + b }</code></li><li>The last expression (no semicolon) is the return value.</li></ul>' }
    ]
  });

  // ------------------------------------------------------------------ Module r2
  mods.push({
    id: 'r2', title: 'Control Flow and Collections', desc: 'if, loops, vectors and iterators.',
    blocks: [
      { id: 'r2-t1', type: 'theory', title: 'Decisions and repetition', desc: 'if/else, loop, while, for, ranges.',
        lessons: [
          { title: 'if / else', html: '<p><code>if cond { } else { }</code>. Conditions are <code>bool</code> (no truthiness like JavaScript). Comparison is <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>; combine with <code>&amp;&amp;</code> and <code>||</code>. <code>if</code> is an expression, so it can produce a value: <code>let m = if a &gt; b { a } else { b };</code> (both branches must have the same type).</p>',
            example: Q(['fn max(a: i32, b: i32) -> i32 {', '    if a > b { a } else { b }', '}', '', 'fn main() {', '    println!("{}", max(3, 7));', '}']),
            q: { text: 'What is <code>max(3, 7)</code>?', options: ['3', '7', 'true', 'An error'], answer: 1, why: 'The <code>else</code> branch returns 7.' } },
          { title: 'loop, while, for', html: '<p><code>loop { }</code> repeats until <code>break</code>; <code>break value</code> returns a value from it. <code>while cond { }</code> checks first. <code>for x in 1..=5 { }</code> iterates a range (inclusive with <code>..=</code>, exclusive with <code>..</code>). <code>continue</code> skips to the next turn.</p>',
            example: Q(['fn main() {', '    let mut total = 0;', '    for n in 1..=5 {', '        if n % 2 == 0 { continue; }', '        total += n;', '    }', '    println!("{}", total);', '}']),
            q: { text: 'What does the example print?', options: ['15', '9', '6', '5'], answer: 1, why: 'Only odd numbers 1 + 3 + 5 = 9.' } },
          { title: 'Vec and iterators', html: '<p><code>Vec&lt;T&gt;</code> is a growable list: <code>vec![1, 2, 3]</code>, <code>push</code>, <code>len</code>, indexing <code>v[0]</code>. Iterate with <code>for x in &amp;v</code>. Iterator methods chain: <code>v.iter().filter(|x| **x % 2 == 0).sum()</code>, <code>map</code>, <code>sum</code>, <code>collect::&lt;Vec&lt;i32&gt;&gt;()</code>. Pass a slice to a function with <code>fn f(v: &amp;[i32])</code> and call <code>f(&amp;v)</code>.</p>',
            example: Q(['fn sum(v: &[i32]) -> i32 {', '    v.iter().sum()', '}', '', 'fn main() {', '    let v = vec![1, 2, 3, 4];', '    println!("{}", sum(&v));', '}']),
            q: { text: 'What does <code>sum(&amp;v)</code> return?', options: ['[1, 2, 3, 4]', '10', '4', 'An error'], answer: 1, why: '<code>iter().sum()</code> adds the elements.' } }
        ] },
      { id: 'r2-l1', type: 'lab', lang: 'rust', title: 'Sum of evens', desc: 'Use an iterator to add the even numbers.',
        desc2: '<p>Finish <code>sum_even(v)</code> so it returns the sum of the even numbers in the slice. For <code>[1, 2, 3, 4, 5, 6]</code> the answer is <code>12</code>. Use <code>v.iter()</code> with <code>filter</code> and <code>sum</code>.</p>',
        files: { 'main.rs': Q(['fn sum_even(v: &[i32]) -> i32 {', '    // TODO: sum the even numbers', '    0', '}', '', 'fn main() {', '    let v = vec![1, 2, 3, 4, 5, 6];', '    println!("{}", sum_even(&v));', '}']) },
        solution: { 'main.rs': Q(['fn sum_even(v: &[i32]) -> i32 {', '    v.iter().filter(|x| *x % 2 == 0).sum()', '}', '', 'fn main() {', '    let v = vec![1, 2, 3, 4, 5, 6];', '    println!("{}", sum_even(&v));', '}']) },
        tests: [
          { story: 'The program runs without errors.', run: t => { t.noErrors(); } },
          { story: '<code>sum_even([2, 4, 6])</code> is 12 and odd-only input gives 0.', run: t => { t.eq(t.call('sum_even', [2, 4, 6]), 12, 'sum_even([2, 4, 6])'); t.eq(t.call('sum_even', [1, 3, 5]), 0, 'sum_even([1, 3, 5])'); } },
          { story: 'The program prints <code>12</code>.', run: t => { t.eq(t.out, '12\n', 'output'); } }
        ] },
      { id: 'r2-q1', type: 'quiz', title: 'Practice test: control flow', desc: '70% to pass.',
        questions: [
          { text: 'What does <code>for n in 1..=3</code> iterate?', options: ['1, 2', '1, 2, 3', '0, 1, 2', '2, 3'], answer: 1, why: '<code>..=</code> includes the end.' },
          { text: 'Which keyword leaves a loop early?', options: ['continue', 'return', 'break', 'stop'], answer: 2, why: '<code>break</code> exits the loop.' },
          { text: 'What is <code>if a &gt; b { a } else { b }</code> as an expression?', options: ['()', 'the larger value', 'a bool', 'an error'], answer: 1, why: 'It evaluates to the branch chosen.' },
          { text: 'How do you call <code>fn f(v: &amp;[i32])</code> on a Vec <code>v</code>?', options: ['f(v)', 'f(&v)', 'f(*v)', 'f[v]'], answer: 1, why: 'Pass a reference to the vector.' },
          { text: 'What does <code>v.iter().sum()</code> do?', options: ['Sorts v', 'Adds all elements', 'Counts elements', 'Copies v'], answer: 1, why: '<code>sum</code> folds with addition.' }
        ] },
      { id: 'r2-r', type: 'review', title: 'Review: control flow', desc: 'Cheat sheet.',
        html: '<h3>Branch and loop</h3><ul><li><code>if c { } else if c2 { } else { }</code>; conditions are <code>bool</code>.</li><li><code>loop</code> / <code>while</code> / <code>for x in 1..=n</code>; <code>break</code>, <code>continue</code>.</li></ul><h3>Vectors</h3><ul><li><code>vec![1, 2, 3]</code>, <code>push</code>, <code>len</code>, <code>v[i]</code>.</li><li><code>v.iter().filter(|x| *x % 2 == 0).sum()</code>, <code>map</code>, <code>collect()</code>.</li><li>Slices: <code>fn f(v: &amp;[i32])</code>, call <code>f(&amp;v)</code>.</li></ul>' }
    ]
  });

  // ------------------------------------------------------------------ Module r3
  mods.push({
    id: 'r3', title: 'Ownership and Structs', desc: 'Move, borrow, and your own types with impl.',
    blocks: [
      { id: 'r3-t1', type: 'theory', title: 'Ownership and structs', desc: 'Moves, references, structs with fields and methods.',
        lessons: [
          { title: 'Ownership and borrowing', html: '<p>Each value has one <b>owner</b>. Assigning a non-<code>Copy</code> value (like a <code>Vec</code> or <code>String</code>) <b>moves</b> it; using it afterwards is an error. Read-only access without taking ownership uses a reference <code>&amp;v</code>; to change through a reference use <code>&amp;mut v</code> on a <code>mut</code> variable. You may have many shared <code>&amp;</code> references, or one <code>&amp;mut</code>, but not both at once.</p>',
            example: Q(['fn len(v: &Vec<i32>) -> usize {', '    v.len()', '}', '', 'fn main() {', '    let v = vec![10, 20, 30];', '    println!("{}", len(&v));', '    println!("{}", v.len());',
              '}']),
            q: { text: 'Why does <code>println!("{}", v.len())</code> still work after <code>len(&amp;v)</code>?', options: ['Vec is Copy', 'The call only borrowed <code>v</code>', 'It does not work', 'Because len returns usize'], answer: 1, why: 'A shared reference does not move the value.' } },
          { title: 'Structs', html: '<p>Define your own type: <code>struct Point { x: i32, y: i32 }</code>. Build it with <code>Point { x: 1, y: 2 }</code>. Read fields with <code>p.x</code>. Group functions with <code>impl Name { ... }</code>. A method takes <code>&amp;self</code> or <code>&amp;mut self</code>; an associated function (no self) is called as <code>Name::new(...)</code>.</p>',
            example: Q(['struct Point { x: i32, y: i32 }', '', 'impl Point {', '    fn sum(&self) -> i32 { self.x + self.y }', '    fn new(x: i32, y: i32) -> Point { Point { x, y } }', '}', '', 'fn main() {', '    let p = Point::new(2, 3);', '    println!("{}", p.sum());', '}']),
            q: { text: 'How do you call the associated function <code>new</code>?', options: ['p.new(...)', 'Point::new(...)', 'new::Point(...)', 'impl::new(...)'], answer: 1, why: 'Associated functions use <code>Type::name</code>.' } },
          { title: '&self, &mut self, and Debug', html: '<p><code>fn value(&amp;self)</code> reads; <code>fn bump(&amp;mut self)</code> changes; the caller needs <code>let mut c = ...</code>. To print a whole struct or vector with <code>{:?}</code>, derive Debug: <code>#[derive(Debug)]</code> above the struct (tuples and primitives already implement it).</p>',
            example: Q(['#[derive(Debug)]', 'struct Counter { n: i32 }', '', 'impl Counter {', '    fn bump(&mut self) { self.n += 1; }', '}', '', 'fn main() {', '    let mut c = Counter { n: 0 };', '    c.bump(); c.bump();', '    println!("{:?}", c);', '}']),
            q: { text: 'What does the example print?', options: ['Counter { n: 0 }', 'Counter { n: 2 }', '2', 'An error'], answer: 1, why: 'Two <code>bump</code> calls make <code>n</code> equal 2.' } }
        ] },
      { id: 'r3-l1', type: 'lab', lang: 'rust', title: 'A Counter type', desc: 'A struct with an impl and a mutating method.',
        desc2: '<p>Complete <code>Counter::new()</code> (starts at 0) and <code>inc(&amp;mut self)</code> (adds one). <code>main</code> creates a counter, calls <code>inc</code> three times and prints <code>get()</code>, which should be <code>3</code>.</p>',
        files: { 'main.rs': Q(['struct Counter { n: i32 }', '', 'impl Counter {', '    fn new() -> Counter {', '        // TODO: start at 0', '        Counter { n: -1 }', '    }', '    fn inc(&mut self) {', '        // TODO: add one to n', '    }', '    fn get(&self) -> i32 { self.n }', '}', '', 'fn main() {', '    let mut c = Counter::new();', '    c.inc(); c.inc(); c.inc();', '    println!("{}", c.get());', '}']) },
        solution: { 'main.rs': Q(['struct Counter { n: i32 }', '', 'impl Counter {', '    fn new() -> Counter {', '        Counter { n: 0 }', '    }', '    fn inc(&mut self) {', '        self.n += 1;', '    }', '    fn get(&self) -> i32 { self.n }', '}', '', 'fn main() {', '    let mut c = Counter::new();', '    c.inc(); c.inc(); c.inc();', '    println!("{}", c.get());', '}']) },
        tests: [
          { story: 'The program runs without errors.', run: t => { t.noErrors(); } },
          { story: 'After three <code>inc</code> calls the counter reads 3 (the program prints <code>3</code>).', run: t => { t.eq(t.out, '3\n', 'output'); } },
          { story: 'It uses a <code>&amp;mut self</code> method (no rewriting main into globals).', run: t => { t.expect(t.uses(/fn\s+inc\s*\(\s*&mut\s+self/), 'inc should take &mut self'); } }
        ] },
      { id: 'r3-q1', type: 'quiz', title: 'Practice test: ownership and structs', desc: '70% to pass.',
        questions: [
          { text: 'What happens when you assign a <code>Vec</code> to a new variable?', options: ['It is copied', 'It is moved; the old name cannot be used', 'Both names share it', 'It throws'], answer: 1, why: 'Vec is not Copy.' },
          { text: 'Which reference lets a method change the struct?', options: ['&self', 'self', '&mut self', 'mut &self'], answer: 2, why: '<code>&amp;mut self</code> allows mutation.' },
          { text: 'How many <code>&amp;mut</code> references may exist at once?', options: ['Any number', 'One', 'Two', 'Zero'], answer: 1, why: 'At most one mutable borrow at a time.' },
          { text: 'How do you build <code>struct P { x: i32 }</code> with x = 5?', options: ['P(5)', 'P { x: 5 }', 'new P { x: 5 }', 'P[x = 5]'], answer: 1, why: 'Struct literal syntax.' },
          { text: 'What enables <code>{:?}</code> on your struct?', options: ['#[derive(Debug)]', 'fn main()', 'impl Display', 'Nothing, it always works'], answer: 0, why: 'Derive Debug to print with <code>{:?}</code>.' }
        ] },
      { id: 'r3-r', type: 'review', title: 'Review: ownership and structs', desc: 'Cheat sheet.',
        html: '<h3>Ownership</h3><ul><li>One owner; assignment of <code>Vec</code>/<code>String</code> <b>moves</b>.</li><li><code>&amp;v</code> borrows read-only; <code>&amp;mut v</code> borrows mutably (one at a time).</li></ul><h3>Types</h3><ul><li><code>struct Point { x: i32, y: i32 }</code>; build <code>Point { x: 1, y: 2 }</code>; read <code>p.x</code>.</li><li><code>impl Point { fn new(..) -&gt; Point {..} fn sum(&amp;self) -&gt; i32 {..} }</code>; call <code>Point::new(..)</code>, <code>p.sum()</code>.</li><li><code>#[derive(Debug)]</code> then <code>println!("{:?}", p)</code>.</li></ul>' }
    ]
  });

  window.QMLCAMP.courses = window.QMLCAMP.courses || [];
  if (!window.QMLCAMP.courses.some(c => c.id === 'rust')) {
    window.QMLCAMP.courses.push({ id: 'rust', lang: 'rust', title: 'Rust for Beginners', desc: 'Learn Rust with bite-sized theory, labs and practice tests. Your code runs right in the page.', intro: 'A hands-on introduction to Rust: <b>Theory → Lab → Practice test → Review</b> in three modules. No install needed — the labs run on an in-page Rust core.', modules: mods, upcoming: [] });
  }
})();
