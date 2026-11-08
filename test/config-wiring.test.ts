import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { redact, setExtraRedactions } from '../src/redact.ts';
import { makeTree, tempDir } from './helpers.ts';

const cli = new URL('../src/cli.ts', import.meta.url).pathname;
const U1 = '11111111-1111-4111-8111-111111111111';
const U3 = '33333333-3333-4333-8333-333333333333';

test('excludeProjects and includeProjects filter by project name', async () => {
  const root = makeTree({ [`-a/${U1}.jsonl`]: 'basic.fixture.jsonl', [`-b/${U3}.jsonl`]: 'tests.fixture.jsonl' });
  const r1 = await build({ projectsRoot: root, out: tempDir(), run: async () => null, log: () => {}, exclude: ['OTHER'] });
  assert.deepEqual(Object.keys(r1.perProject), ['demo']);
  const r2 = await build({ projectsRoot: root, out: tempDir(), run: async () => null, log: () => {}, include: ['other'] });
  assert.deepEqual(Object.keys(r2.perProject), ['other']);
});

test('extra redaction patterns from settings are applied', () => {
  setExtraRedactions(['ACME-[0-9]{4}']);
  assert.equal(redact('id ACME-1234 ok'), 'id [REDACTED:custom] ok');
  setExtraRedactions(['(bad']);
  assert.equal(redact('x (bad'), 'x (bad');
  setExtraRedactions([]);
});

test('cli reads the projects folder and output folder from the settings file', () => {
  const root = makeTree({ [`-a/${U1}.jsonl`]: 'basic.fixture.jsonl' });
  const out = tempDir();
  const cfg = join(tempDir(), 'config.json');
  writeFileSync(cfg, JSON.stringify({ projectsDir: root, outDir: out }));
  const env = { ...process.env, SESSION_REPLAY_CONFIG: cfg, SESSION_REPLAY_COPILOT_SESSIONS: join(tempDir(), 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(tempDir(), 'no-codex') };
  delete (env as any).SESSION_REPLAY_PROJECTS; delete (env as any).SESSION_REPLAY_OUT;
  const r = spawnSync(process.execPath, [cli, 'build'], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(out, 'index.html')));
  const s = spawnSync(process.execPath, [cli, 'config', 'set', 'lookbackDays', '14'], { env, encoding: 'utf8' });
  assert.equal(s.status, 0, s.stderr);
  const show = spawnSync(process.execPath, [cli, 'config'], { env, encoding: 'utf8' });
  assert.match(show.stdout, /archiveDays\s+14/);
  assert.match(show.stdout, new RegExp(`projectsDir\\s+${root}`));
});

test('a missing projects folder gets a helpful message', () => {
  const cfg = join(tempDir(), 'config.json');
  writeFileSync(cfg, JSON.stringify({ projectsDir: '/nowhere/projects', outDir: tempDir() }));
  const env = { ...process.env, SESSION_REPLAY_CONFIG: cfg, SESSION_REPLAY_COPILOT_SESSIONS: join(tempDir(), 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(tempDir(), 'no-codex') };
  delete (env as any).SESSION_REPLAY_PROJECTS; delete (env as any).SESSION_REPLAY_OUT;
  const r = spawnSync(process.execPath, [cli, 'build'], { env, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /config set projectsDir/);
});
