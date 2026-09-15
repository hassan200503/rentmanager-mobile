/**
 * Contract drift gate: every backend path the app calls must exist in the
 * committed OpenAPI snapshot (openapi/rentmanager.json) with the same method.
 * A renamed or removed endpoint fails CI here instead of failing on a phone.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'openapi/rentmanager.json'), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>;
};

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [full] : [];
  });
}

const CALL = /api\.(get|post|patch)(?:<[^>(]*>)?\(\s*(['`])(\/[^'`]*)\2/g;

function collectCalls() {
  const calls: { method: string; path: string; file: string }[] = [];
  for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'app'))]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(CALL)) {
      const normalised = m[3].replace(/\$\{[^}]+\}/g, '{param}');
      calls.push({ method: m[1], path: normalised, file: path.relative(root, file) });
    }
  }
  return calls;
}

function matchesSpec(method: string, callPath: string): boolean {
  const full = `/api/v1${callPath}`;
  return Object.entries(spec.paths).some(([specPath, ops]) => {
    if (!ops[method]) return false;
    const pattern = new RegExp(`^${specPath.replace(/\{[^}]+\}/g, '[^/]+')}$`);
    return pattern.test(full.replace(/\{param\}/g, 'x'));
  });
}

describe('API contract', () => {
  const calls = collectCalls();

  it('finds the app’s API calls', () => {
    expect(calls.length).toBeGreaterThan(15);
  });

  it('actually rejects paths and methods the backend does not have', () => {
    expect(matchesSpec('get', '/definitely-not-an-endpoint')).toBe(false);
    expect(matchesSpec('post', '/users/me/access')).toBe(false);
    expect(matchesSpec('get', '/maintenance/{param}/nope')).toBe(false);
  });

  it.each(collectCalls().map((c) => [`${c.method.toUpperCase()} ${c.path}`, c] as const))('%s exists in the backend contract', (_, c) => {
    expect(matchesSpec(c.method, c.path)).toBe(true);
  });
});
