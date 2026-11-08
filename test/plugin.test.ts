import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeTree, tempDir } from './helpers.ts';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));


test('Claude marketplace entry and plugin manifest agree', () => {
  const marketplace = readJson('../.claude-plugin/marketplace.json');
  const plugin = readJson('../.claude-plugin/plugin.json');
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, plugin.name);
  assert.equal(marketplace.plugins[0].source, '.');
});

test('plugin registers start/end hooks and ships its executable', () => {
  const hooks = readJson('../hooks/hooks.json').hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['SessionEnd', 'SessionStart']);
  for (const event of Object.values(hooks) as { hooks: { command: string; timeout: number }[] }[][]) {
    assert.equal(event[0].hooks[0].timeout, 10);
    assert.match(event[0].hooks[0].command, /CLAUDE_PLUGIN_ROOT.*bin\/session-replay/);
  }
  const executable = statSync(new URL('../bin/session-replay', import.meta.url));
  assert.ok((executable.mode & 0o111) !== 0, 'plugin command must be executable');
});



test('plugin CLI writes its default pages in the user data directory', () => {
  const home = tempDir('sr-plugin-home-');
  const data = join(home, 'data');
  const projects = join(home, 'projects');
  mkdirSync(projects);
  const result = spawnSync(fileURLToPath(new URL('../bin/session-replay', import.meta.url)), ['build'], {
    env: { ...process.env, HOME: home, XDG_DATA_HOME: data, SESSION_REPLAY_PROJECTS: projects, SESSION_REPLAY_COPILOT_SESSIONS: join(home, 'no-copilot') },
    encoding: 'utf8',
  });


  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(data, 'session-replay', 'replays', 'index.html')));
});

test('launcher says how to get Node.js when it is missing or too old', () => {
  const bin = fileURLToPath(new URL('../bin/session-replay', import.meta.url));
  const empty = tempDir('sr-no-node-');
  const none = spawnSync('/bin/sh', [bin, 'status'], { env: { PATH: empty, HOME: empty }, encoding: 'utf8' });
  assert.notEqual(none.status, 0);
  assert.equal(none.stderr.trim(), 'Session Replay needs Node.js 24 or newer, and it was not found. Install it with Homebrew (brew install node) or from the Node.js website, then start a new Claude Code session.');

  const old = tempDir('sr-old-node-');
  writeFileSync(join(old, 'node'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo v22.0.0; else echo 22; fi\n');
  chmodSync(join(old, 'node'), 0o755);
  const r = spawnSync('/bin/sh', [bin, 'status'], { env: { PATH: `${old}:/usr/bin:/bin`, HOME: old }, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.equal(r.stderr.trim(), 'Session Replay needs Node.js 24 or newer (found v22.0.0). Install it with Homebrew (brew install node) or from the Node.js website, then start a new Claude Code session.');
});
