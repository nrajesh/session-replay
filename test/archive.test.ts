import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { forgetSession, pruneArchive, sessionsOlderThan, sourceGone } from '../src/archive.ts';
import { cacheExists, writeCacheJson } from '../src/zjson.ts';
import { tempDir } from './helpers.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-04T12:00:00Z');
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

/** An archive with sessions {id, daysAgo, source file on disk or not}. */
function archive(list: { id: string; daysAgo: number; slug?: string; source?: boolean }[]) {
  const out = tempDir('sr-arch-');
  const src = tempDir('sr-src-');
  const sessions: Record<string, unknown> = {};
  mkdirSync(join(out, '.cache'));
  for (const s of list) {
    const slug = s.slug ?? 'demo';
    const key = join(src, `${s.id}.jsonl`);
    if (s.source) writeFileSync(key, '{}');
    sessions[key] = { sig: 'x', id: s.id, projectSlug: slug };
    writeCacheJson(join(out, '.cache', `${s.id}.json`), { id: s.id });
    writeCacheJson(join(out, '.cache', `${s.id}.summary.json`), { id: s.id, start: ago(s.daysAgo + 0.1), end: ago(s.daysAgo), projectSlug: slug });
    mkdirSync(join(out, slug), { recursive: true });
    writeFileSync(join(out, slug, `${s.id}.html`), 'page');
    writeFileSync(join(out, slug, 'index.html'), 'project');
  }
  writeFileSync(join(out, '.state.json'), JSON.stringify({ version: 8, sessions }));
  return { out, src, key: (id: string) => join(src, `${id}.jsonl`) };
}
const state = (out: string) => JSON.parse(readFileSync(join(out, '.state.json'), 'utf8')).sessions;

test('sessionsOlderThan lists only sessions whose last activity is past the window', () => {
  const a = archive([{ id: 'old', daysAgo: 200 }, { id: 'mid', daysAgo: 100 }, { id: 'new', daysAgo: 2 }]);
  assert.deepEqual(sessionsOlderThan(a.out, 120, NOW).map((s) => s.id), ['old']);
  assert.deepEqual(sessionsOlderThan(a.out, 0, NOW), [], '0 keeps everything');
});

test('pruneArchive removes cache, page and state entry, and nothing else', () => {
  const a = archive([{ id: 'old', daysAgo: 200 }, { id: 'new', daysAgo: 2 }]);
  assert.equal(pruneArchive(a.out, 120, NOW), 1);
  assert.equal(cacheExists(join(a.out, '.cache', 'old.json')), false);
  assert.equal(cacheExists(join(a.out, '.cache', 'old.summary.json')), false);
  assert.equal(existsSync(join(a.out, 'demo', 'old.html')), false);
  assert.equal(existsSync(join(a.out, 'demo', 'new.html')), true);
  assert.deepEqual(Object.values(state(a.out)).map((e: any) => e.id), ['new']);
});

test('pruneArchive with 0 days removes nothing', () => {
  const a = archive([{ id: 'old', daysAgo: 900 }]);
  assert.equal(pruneArchive(a.out, 0, NOW), 0);
  assert.equal(cacheExists(join(a.out, '.cache', 'old.json')), true);
});

test('pruneArchive drops a project folder once its last session page is gone', () => {
  const a = archive([{ id: 'old', daysAgo: 200, slug: 'gone' }, { id: 'new', daysAgo: 2, slug: 'kept' }]);
  pruneArchive(a.out, 120, NOW);
  assert.equal(existsSync(join(a.out, 'gone')), false);
  assert.equal(existsSync(join(a.out, 'kept', 'index.html')), true);
});

test('a project slug that would leave the archive folder is never touched', () => {
  const a = archive([{ id: 'old', daysAgo: 200 }]);
  const victim = tempDir('sr-victim-');
  writeFileSync(join(victim, 'old.html'), 'precious');
  const st = JSON.parse(readFileSync(join(a.out, '.state.json'), 'utf8'));
  (Object.values(st.sessions)[0] as any).projectSlug = join('..', '..', victim);
  writeFileSync(join(a.out, '.state.json'), JSON.stringify(st));
  pruneArchive(a.out, 120, NOW);
  assert.equal(existsSync(join(victim, 'old.html')), true);
});

test('forgetSession removes a session whose source is gone, and refuses one that still exists', () => {
  const a = archive([{ id: 'gone', daysAgo: 5 }, { id: 'here', daysAgo: 5, source: true }]);
  assert.equal(forgetSession(a.out, 'here'), false);
  assert.equal(cacheExists(join(a.out, '.cache', 'here.json')), true);
  assert.equal(forgetSession(a.out, 'gone'), true);
  assert.equal(cacheExists(join(a.out, '.cache', 'gone.json')), false);
  assert.equal(forgetSession(a.out, 'unknown'), false);
});

test('sourceGone tells Claude Code cleanup from other deletions', () => {
  const missing = () => false, present = () => true;
  assert.equal(sourceGone('/s/a.jsonl', 'claude-code', 30, ago(45), NOW, present), undefined);
  assert.equal(sourceGone('/s/a.jsonl', 'claude-code', 30, ago(45), NOW, missing), 'cleanup');
  assert.equal(sourceGone('/s/a.jsonl', 'claude-code', 30, ago(5), NOW, missing), 'disk');
  assert.equal(sourceGone('/s/a.jsonl', 'codex', 30, ago(400), NOW, missing), 'disk');
  assert.equal(sourceGone('/s/a.jsonl', 'copilot', 30, ago(400), NOW, missing), 'disk');
});
