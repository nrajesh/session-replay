import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { makeTree, tempDir } from './helpers.ts';
import { parseArgs } from '../src/cli.ts';

const cli = new URL('../src/cli.ts', import.meta.url).pathname;

test('parseArgs reads command and options', () => {
  assert.deepEqual(parseArgs(['build', '--project', 'shop', '--since', '2026-05-01', '--force']), { cmd: 'build', opts: { project: 'shop', since: '2026-05-01', force: true }, rest: [] });
  assert.throws(() => parseArgs(['build', '--since', 'last week']), /YYYY-MM-DD/);
});

test('build command writes pages and prints a plain-English report', () => {
  const root = makeTree({ '-Users-me-GitHub-demo/11111111-1111-4111-8111-111111111111.jsonl': 'basic.fixture.jsonl' });
  const out = tempDir('sr-out-');
  const r = spawnSync(process.execPath, [cli, 'build', '--out', out], { env: { ...process.env, SESSION_REPLAY_PROJECTS: root, SESSION_REPLAY_COPILOT_SESSIONS: join(tempDir(), 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(tempDir(), 'no-codex') }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 session processed/);
  assert.match(r.stdout, /demo\s+1/);
  assert.ok(existsSync(join(out, 'index.html')));
});

test('unknown command prints help and fails', () => {
  const r = spawnSync(process.execPath, [cli, 'frobnicate'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /Usage/);
});



test('forget removes a session whose original file is gone, and refuses one that still exists', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const root = makeTree({ [`-Users-me-GitHub-demo/${id}.jsonl`]: 'basic.fixture.jsonl' });
  const out = tempDir('sr-out-');
  const env = { ...process.env, SESSION_REPLAY_PROJECTS: root, SESSION_REPLAY_CONFIG: join(tempDir(), 'none.json'), SESSION_REPLAY_COPILOT_SESSIONS: join(tempDir(), 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(tempDir(), 'no-codex') };
  assert.equal(spawnSync(process.execPath, [cli, 'build', '--out', out], { env, encoding: 'utf8' }).status, 0);
  const still = spawnSync(process.execPath, [cli, 'forget', id, '--out', out], { env, encoding: 'utf8' });
  assert.equal(still.status, 1);
  assert.match(still.stderr, /original file still exists/);
  rmSync(join(root, '-Users-me-GitHub-demo', `${id}.jsonl`));
  const gone = spawnSync(process.execPath, [cli, 'forget', id, '--out', out], { env, encoding: 'utf8' });
  assert.equal(gone.status, 0, gone.stderr);
  assert.match(gone.stdout, /Removed/);
  assert.equal(existsSync(join(out, 'demo', `${id}.html`)), false);
  assert.equal(spawnSync(process.execPath, [cli, 'forget', '../x', '--out', out], { env, encoding: 'utf8' }).status, 2);
});

test('the CLI starts on every Node 24 release (import.meta.main only exists from 24.2)', () => {
  const src = readFileSync(new URL('../src/cli.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /import\.meta\.main/);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../src/cli.ts', import.meta.url)), 'help'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^Usage: session-replay/);
});
