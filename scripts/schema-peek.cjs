// Dev aid: print property shapes of named OpenAPI schemas. Usage: node scripts/schema-peek.cjs <spec> Name...
const [spec, ...names] = process.argv.slice(2);
const s = require(require('path').resolve(spec)).components.schemas;
for (const n of names) {
  const x = s[n];
  if (!x) { console.log(n, 'MISSING'); continue; }
  const props = Object.entries(x.properties || {}).map(([k, v]) => {
    const t = v.type ? (v.type === 'array' ? `${(v.items.$ref || v.items.type || '').split('/').pop()}[]` : v.type) : (v.$ref || 'obj').split('/').pop();
    return `${k}:${t}${v.format ? '(' + v.format + ')' : ''}${v.enum ? '=' + v.enum.join('|') : ''}`;
  });
  console.log(`${n} {${props.join(', ')}}${x.required ? ' req=' + x.required.join(',') : ''}`);
}
