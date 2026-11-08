import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { cacheExists, writeCacheJson } from '../src/zjson.ts';
import { makeTree, tempDir } from './helpers.ts';
import type { GitRunner } from '../src/git.ts';

const U1 = '11111111-1111-4111-8111-111111111111';
const noGit: GitRunner = async () => null;
const quiet = () => {};
const project = () => makeTree({ [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl' });

test('a session whose transcript disappeared stays, marked Source removed, with the reason', async () => {
  const root = project();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet, pro: true });
  assert.doesNotMatch(readFileSync(join(out, 'demo', `${U1}.html`), 'utf8'), /Source removed/);
  rmSync(join(root, '-Users-me-GitHub-demo', `${U1}.jsonl`));
  await build({ projectsRoot: root, out, run: noGit, log: quiet, pro: true, claudeHistoryDays: 30 });
  const page = readFileSync(join(out, 'demo', `${U1}.html`), 'utf8');
  assert.match(page, /Source removed/);
  assert.match(page, /Claude Code’s cleanup removed the original/);
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /Source removed/);
});

test('a recent loss with a long Claude Code period says deleted from disk; free pages show the command instead of a button', async () => {
  const root = project();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  rmSync(join(root, '-Users-me-GitHub-demo', `${U1}.jsonl`));
  await build({ projectsRoot: root, out, run: noGit, log: quiet, claudeHistoryDays: 3650 });
  const page = readFileSync(join(out, 'demo', `${U1}.html`), 'utf8');
  assert.match(page, /deleted from disk/);
  assert.match(page, new RegExp(`remove session <code>${U1}</code> from Session Replay`));
  assert.doesNotMatch(page, /id="forget-session"/);
});

test('archiveDays removes sessions past the window and does not bring them back from a transcript that still exists', async () => {
  const root = project();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.ok(cacheExists(join(out, '.cache', `${U1}.json`)));
  await build({ projectsRoot: root, out, run: noGit, log: quiet, archiveDays: 30 });
  assert.equal(cacheExists(join(out, '.cache', `${U1}.json`)), false);
  assert.equal(existsSync(join(out, 'demo', `${U1}.html`)), false);
  assert.deepEqual(JSON.parse(readFileSync(join(out, '.state.json'), 'utf8')).sessions, {});
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.ok(cacheExists(join(out, '.cache', `${U1}.json`)), 'with 0 days (keep everything) it is archived again');
});

// ---- the app: Settings page and API ----

test('a build compresses plain cache files left by an older version, even for unchanged sessions', async () => {
  const root = project();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  const { gunzipSync } = await import('node:zlib');
  for (const name of [`${U1}.json`, `${U1}.summary.json`]) writeFileSync(join(out, '.cache', name), gunzipSync(readFileSync(join(out, '.cache', name + '.gz'))));
  rmSync(join(out, '.cache', `${U1}.json.gz`));
  rmSync(join(out, '.cache', `${U1}.summary.json.gz`));
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(existsSync(join(out, '.cache', `${U1}.json`)), false);
  assert.equal(existsSync(join(out, '.cache', `${U1}.json.gz`)), true);
  assert.equal(existsSync(join(out, '.cache', `${U1}.summary.json.gz`)), true);
});

test('a newer state version keeps sessions whose transcript is gone, and re-reads the ones that still exist', async () => {
  const U2 = '22222222-2222-4222-8222-222222222222';
  const root = makeTree({ [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl', [`-Users-me-GitHub-demo/${U2}.jsonl`]: 'ask.fixture.jsonl' });
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  rmSync(join(root, '-Users-me-GitHub-demo', `${U2}.jsonl`));
  const st = JSON.parse(readFileSync(join(out, '.state.json'), 'utf8'));
  st.version = 1;
  writeFileSync(join(out, '.state.json'), JSON.stringify(st));
  const { loadState, MODEL_VERSION } = await import('../src/state.ts');
  const loaded = loadState(out);
  assert.equal(loaded.version, MODEL_VERSION);
  assert.equal(Object.keys(loaded.sessions).length, 2, 'both sessions stay, including the one whose file is gone');
  assert.ok(Object.values(loaded.sessions).every((e) => e.sig === ''), 'every entry is marked to be re-read when its file exists');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r.processed, 1, 'only the session that still exists is re-read');
  assert.equal(Object.keys(JSON.parse(readFileSync(join(out, '.state.json'), 'utf8')).sessions).length, 2);
  assert.ok(existsSync(join(out, 'demo', `${U2}.html`)));
});
