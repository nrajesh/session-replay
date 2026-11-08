// Guards the privacy promise: real transcripts and generated pages never enter git.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const FIXTURE = /^test\/fixtures\/(.+\/)?[^/]+\.fixture\.jsonl$/;
// Hand-written pages that ship with the repo: the explainer video's source uses made-up demo data, not transcripts.
const AUTHORED_PAGES = new Set(['docs/promo/explainer.html']);

function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

export function privacyViolations(paths: string[]): string[] {
  return paths.filter((p) => !AUTHORED_PAGES.has(p) && (
    (p.endsWith('.jsonl') && !FIXTURE.test(p)) ||
    /\.(html?|xlsx?|pdf)$/i.test(p) ||
    /(^|\/)(SessionReplays|replays)(\/|$)/.test(p) ||
    /(^|\/)\.cache\//.test(p)));
}

test('violation rules catch transcripts and generated pages', () => {
  assert.deepEqual(
    privacyViolations(['a.jsonl', 'test/fixtures/x.fixture.jsonl', 'test/fixtures/p/y.fixture.jsonl', 'x/page.html', 'SessionReplays/i.txt', 'replays/.state.json', 'r.xlsx', 'src/a.ts', 'docs/promo/explainer.html', 'docs/promo/other.html']),
    ['a.jsonl', 'x/page.html', 'SessionReplays/i.txt', 'replays/.state.json', 'r.xlsx', 'docs/promo/other.html']);
});

test('no transcript or generated page is tracked or addable', () => {
  assert.deepEqual(privacyViolations(trackedFiles()), []);
});

test('fixtures are small and marked synthetic', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.jsonl') ? [p] : [];
  });
  for (const f of walk(join(root, 'test/fixtures'))) {
    assert.ok(statSync(f).size < 20_000, `${f} too large for a synthetic fixture`);
    const first = readFileSync(f, 'utf8').split('\n')[0];
    assert.match(first, /"synthetic":true/, `${f} first line must carry "synthetic":true`);
  }
});
