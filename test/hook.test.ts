import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { installHook, uninstallHook, isHookInstalled, hookCommand } from '../src/hook.ts';
import { withLock } from '../src/lock.ts';
import { tempDir } from './helpers.ts';

const CMD = '"/usr/local/bin/node" "/x/session-replay/src/cli.ts" hook';

test('install adds one SessionEnd entry, keeps other settings, and backs up', () => {
  const dir = tempDir();
  const f = join(dir, 'settings.json');
  const other = { type: 'command', command: 'echo bye' };
  writeFileSync(f, JSON.stringify({ model: 'opus', cleanupPeriodDays: 3650, hooks: { SessionEnd: [{ hooks: [other] }], Stop: [{ hooks: [other] }] } }, null, 2));
  const r1 = installHook(f, CMD);
  const r2 = installHook(f, CMD);
  assert.equal(r1.changed, true);
  assert.equal(r2.changed, false);
  const s = JSON.parse(readFileSync(f, 'utf8'));
  assert.equal(s.model, 'opus');
  assert.equal(s.cleanupPeriodDays, 3650);
  const cmds = s.hooks.SessionEnd.flatMap((m: any) => m.hooks.map((h: any) => h.command));
  assert.deepEqual(cmds.sort(), [CMD, 'echo bye'].sort());
  assert.ok(isHookInstalled(f));
  assert.ok(existsSync(r1.backup!));
  assert.equal(readdirSync(dir).filter((n) => n.startsWith('settings.json.bak-')).length, 1);
});

test('install creates settings when missing', () => {
  const f = join(tempDir(), 'settings.json');
  installHook(f, CMD);
  assert.ok(isHookInstalled(f));
});

test('uninstall removes only our hook and tidies empty groups', () => {
  const f = join(tempDir(), 'settings.json');
  writeFileSync(f, JSON.stringify({ hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: 'echo bye' }] }] } }));
  installHook(f, CMD);
  const r = uninstallHook(f);
  assert.equal(r.changed, true);
  const s = JSON.parse(readFileSync(f, 'utf8'));
  assert.deepEqual(s.hooks.SessionEnd, [{ hooks: [{ type: 'command', command: 'echo bye' }] }]);
  assert.equal(isHookInstalled(f), false);
  const f2 = join(tempDir(), 'settings.json');
  writeFileSync(f2, JSON.stringify({ theme: 'auto' }));
  installHook(f2, CMD);
  uninstallHook(f2);
  assert.deepEqual(JSON.parse(readFileSync(f2, 'utf8')), { theme: 'auto' });
});

test('invalid settings JSON is left untouched', () => {
  const f = join(tempDir(), 'settings.json');
  writeFileSync(f, '{ not json');
  assert.throws(() => installHook(f, CMD), /not valid JSON/);
  assert.equal(readFileSync(f, 'utf8'), '{ not json');
});

test('hook command uses absolute node and cli paths', () => {
  const c = hookCommand();
  assert.match(c, /^".+node[^"]*" ".+session-replay[^"]*\/src\/cli\.ts" hook$/);
});

test('hook with bad stdin exits 0 quickly and builds nothing', () => {
  const out = tempDir('sr-out-');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [new URL('../src/cli.ts', import.meta.url).pathname, 'hook'], {
    input: 'garbage', env: { ...process.env, SESSION_REPLAY_OUT: out, SESSION_REPLAY_PROJECTS: tempDir() }, encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.ok(Date.now() - t0 < 3000);
  assert.ok(!existsSync(join(out, 'index.html')));
});

test('withLock runs critical sections one at a time', async () => {
  const out = tempDir();
  const order: string[] = [];
  const slow = (name: string) => withLock(out, async () => {
    order.push(`${name}:in`);
    await new Promise((r) => setTimeout(r, 150));
    order.push(`${name}:out`);
  }, { pollMs: 20 });
  await Promise.all([slow('a'), slow('b')]);
  assert.deepEqual(order, ['a:in', 'a:out', 'b:in', 'b:out']);
});

test('a stale lock (dead process) is taken over', async () => {
  const out = tempDir();
  writeFileSync(join(out, '.lock'), JSON.stringify({ pid: 999999, at: Date.now() }));
  let ran = false;
  await withLock(out, async () => { ran = true; }, { pollMs: 20, waitMs: 500 });
  assert.ok(ran);
  assert.ok(!existsSync(join(out, '.lock')));
});

test('an old lock from a live process is not stolen', async () => {
  const out = tempDir();
  writeFileSync(join(out, '.lock'), JSON.stringify({ pid: process.pid, at: 1 }));
  let ran = false;
  const result = await withLock(out, async () => { ran = true; }, { pollMs: 10, waitMs: 30 });
  assert.equal(result, undefined);
  assert.equal(ran, false);
});

test('hook returns at once and runs an incremental build in the background', async () => {
  const { makeTree } = await import('./helpers.ts');
  const root = makeTree({ '-Users-me-GitHub-demo/11111111-1111-4111-8111-111111111111.jsonl': 'basic.fixture.jsonl' });
  const out = tempDir('sr-out-');
  const config = join(tempDir(), 'config.json');
  writeFileSync(config, '{"edition":"free"}');
  const transcript = join(root, '-Users-me-GitHub-demo/11111111-1111-4111-8111-111111111111.jsonl');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [new URL('../src/cli.ts', import.meta.url).pathname, 'hook'], {
    input: JSON.stringify({ session_id: 'x', transcript_path: transcript, hook_event_name: 'SessionEnd' }),
    env: { ...process.env, SESSION_REPLAY_CONFIG: config, SESSION_REPLAY_EDITION: 'free', SESSION_REPLAY_OUT: out, SESSION_REPLAY_PROJECTS: root, SESSION_REPLAY_COPILOT_SESSIONS: join(out, 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(out, 'no-codex') }, encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.ok(Date.now() - t0 < 3000, 'hook must not wait for the build');
  const page = join(out, 'demo', '11111111-1111-4111-8111-111111111111.html');
  for (let i = 0; i < 100 && !existsSync(page); i++) await new Promise((res) => setTimeout(res, 100));
  assert.ok(existsSync(page), readFileSync(join(out, '.log'), 'utf8'));
});

test('SessionStart builds the initial index once and ignores later starts', async () => {
  const { makeTree } = await import('./helpers.ts');
  const root = makeTree({ '-Users-me-GitHub-demo/11111111-1111-4111-8111-111111111111.jsonl': 'basic.fixture.jsonl' });
  const out = tempDir('sr-out-');
  const config = join(tempDir(), 'config.json');
  writeFileSync(config, '{"edition":"free"}');
  const transcript = join(root, '-Users-me-GitHub-demo/11111111-1111-4111-8111-111111111111.jsonl');
  const runHook = () => spawnSync(process.execPath, [new URL('../src/cli.ts', import.meta.url).pathname, 'hook'], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', transcript_path: transcript }),
    env: { ...process.env, SESSION_REPLAY_CONFIG: config, SESSION_REPLAY_EDITION: 'free', SESSION_REPLAY_OUT: out, SESSION_REPLAY_PROJECTS: root, SESSION_REPLAY_COPILOT_SESSIONS: join(out, 'no-copilot'), SESSION_REPLAY_CODEX_SESSIONS: join(out, 'no-codex') }, encoding: 'utf8',
  });

  assert.equal(runHook().status, 0);
  const page = join(out, 'demo', '11111111-1111-4111-8111-111111111111.html');
  for (let i = 0; i < 100 && !existsSync(page); i++) await new Promise((res) => setTimeout(res, 100));
  assert.ok(existsSync(page));
  const log = readFileSync(join(out, '.log'), 'utf8');
  assert.equal(runHook().status, 0);
  await new Promise((res) => setTimeout(res, 100));
  assert.equal(readFileSync(join(out, '.log'), 'utf8'), log);
});
