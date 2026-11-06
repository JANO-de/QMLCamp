// Copy to planner/modules/<id>.js, rename, list it in modules/index.js.
// Rules: id /^[a-z][a-z0-9-]*$/ and unused; sanitize() returns a NEW whitelisted object (caps on every
// string/array, an `id` on every object inside arrays); never trust `data`.
// render(el, api) is used from P1 on; until then only data hooks run.
/*
PlannerModules.register({
  id: 'example',
  kind: 'block',                 // 'block' | 'widget' | 'both'
  name: 'Example',
  icon: '\u2605',
  category: 'Organise',
  defaults: () => ({ text: '' }),
  sanitize: (d, c) => ({ text: c.str(d && d.text, 500) }),   // c = {strict, str, arr, num, uid, safeUrl, fmt}
  stats: (d) => ({ total: 0, done: 0 }),
  toMarkdown: (d) => d.text,
  size: { w: 320, h: 240, min: [220, 120] },
});
*/
