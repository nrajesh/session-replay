import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, setConfigValue, dataHomeOut } from '../src/config.ts';
import { tempDir } from './helpers.ts';

test('defaults when no file exists', () => {
  const c = loadConfig({ path: join(tempDir(), 'none.json'), env: { HOME: '/h' } });
  assert.equal(c.projectsDir, '/h/.claude/projects');
  assert.equal(c.archiveDays, 0);
  assert.equal(c.theme, 'auto');
  assert.ok(c.outDir.endsWith('/replays'));
});

test('CLAUDE_CONFIG_DIR moves the default projects folder', () => {
  const c = loadConfig({ path: join(tempDir(), 'none.json'), env: { HOME: '/h', CLAUDE_CONFIG_DIR: '/x/claude' } });
  assert.equal(c.projectsDir, '/x/claude/projects');
});

test('file values override defaults, ~ expands, unknown keys and bad types are ignored with warnings', () => {
  const f = join(tempDir(), 'c.json');
  writeFileSync(f, JSON.stringify({ projectsDir: '~/elsewhere/projects', lookbackDays: 90, edition: 'pro', port: 'x', theme: 7, bogus: 1 }));
  const c = loadConfig({ path: f, env: { HOME: '/h' } });
  assert.equal(c.projectsDir, '/h/elsewhere/projects');
  assert.equal(c.archiveDays, 90);
  assert.match(c.warnings.join('\n'), /theme/);
  assert.match(c.warnings.join('\n'), /bogus/);
});

test('invalid JSON keeps defaults and warns', () => {
  const f = join(tempDir(), 'c.json');
  writeFileSync(f, '{ nope');
  const c = loadConfig({ path: f, env: { HOME: '/h' } });
  assert.match(c.warnings[0], /not valid JSON/);
});

test('env overrides beat the file', () => {
  const f = join(tempDir(), 'c.json');
  writeFileSync(f, JSON.stringify({ projectsDir: '/a', outDir: '/b' }));
  const c = loadConfig({ path: f, env: { HOME: '/h', SESSION_REPLAY_PROJECTS: '/p', SESSION_REPLAY_OUT: '/o' } });
  assert.equal(c.projectsDir, '/p');
  assert.equal(c.outDir, '/o');
});





test('set parses numbers, booleans and lists, and rejects unknown keys', () => {
  const f = join(tempDir(), 'sub', 'c.json');
  setConfigValue(f, 'archiveDays', '30');
  setConfigValue(f, 'excludeProjects', 'a, b');
  const saved = JSON.parse(readFileSync(f, 'utf8'));
  assert.equal(saved.archiveDays, 30);
  assert.deepEqual(saved.excludeProjects, ['a', 'b']);
  assert.throws(() => setConfigValue(f, 'nope', '1'), /Unknown setting/);
  assert.throws(() => setConfigValue(f, 'theme', 'purple'), /auto, light or dark/);
});





test('the old lookbackDays name still works, and archiveDays wins when both are set', () => {
  const f = join(tempDir(), 'c.json');
  writeFileSync(f, JSON.stringify({ lookbackDays: 45 }));
  assert.equal(loadConfig({ path: f, env: { HOME: '/h' } }).archiveDays, 45);
  writeFileSync(f, JSON.stringify({ lookbackDays: 45, archiveDays: 120 }));
  assert.equal(loadConfig({ path: f, env: { HOME: '/h' } }).archiveDays, 120);
  setConfigValue(f, 'lookbackDays', '7');
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { archiveDays: 7 });
});



test('free pages default to the user data folder, never the plugin folder', () => {
  assert.equal(dataHomeOut({ XDG_DATA_HOME: '/d', HOME: '/h' }), '/d/session-replay/replays');
  assert.equal(dataHomeOut({ HOME: '/h' }), '/h/.local/share/session-replay/replays');
});
