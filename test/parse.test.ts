import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSession } from '../src/parse.ts';
import { fixture } from './helpers.ts';

test('parseSession reads metadata, counts and turns from a transcript', async () => {
  const s = await parseSession(fixture('basic.fixture.jsonl'), []);
  assert.equal(s.id, 'basic.fixture');
  assert.equal(s.title, 'Dark mode toggle');
  assert.equal(s.cwd, '/tmp/demo');
  assert.equal(s.branch, 'main');
  assert.equal(s.entrypoint, 'claude-vscode');
  assert.equal(s.start, '2026-05-01T10:00:00.000Z');
  assert.equal(s.end, '2026-05-01T10:06:00.000Z');
  assert.deepEqual(s.prs, [{ number: 12, url: 'https://github.com/acme/demo/pull/12' }]);
  assert.equal(s.userPromptCount, 2);
  assert.equal(s.firstPrompt, 'Add a dark mode toggle to the settings page');
  assert.deepEqual(s.toolCounts, { Bash: 2, Edit: 1 });
  assert.equal(s.costUSD, 1.25);
  assert.equal(s.linesAdded, 10);
  assert.equal(s.linesRemoved, 3);
  assert.equal(s.warnings.length, 1);
  assert.match(s.warnings[0], /unreadable line/);
});

test('turns exclude thinking, meta and system messages', async () => {
  const s = await parseSession(fixture('basic.fixture.jsonl'), []);
  const text = s.turns.map((t) => t.text).join('\n');
  assert.ok(!text.includes('secret reasoning'));
  assert.ok(!text.includes('Base directory for this skill'));
  assert.ok(!text.includes('task-notification'));
  assert.ok(!text.includes('ide_opened_file'));
  const users = s.turns.filter((t) => t.role === 'user').map((t) => t.text);
  assert.deepEqual(users, ['Add a dark mode toggle to the settings page', 'yes, go ahead and open a PR']);
  const tools = s.turns.filter((t) => t.role === 'tool');
  assert.equal(tools.length, 3);
  assert.equal(tools[0].tool, 'Bash');
  assert.match(tools[0].text, /ls src/);
  assert.match(tools[0].text, /settings\.ts/);
});

test('title falls back to the first prompt when no ai-title exists', async () => {
  const { writeFileSync } = await import('node:fs');
  const { tempDir } = await import('./helpers.ts');
  const f = tempDir() + '/abc.jsonl';
  writeFileSync(f, JSON.stringify({ type: 'user', timestamp: '2026-05-01T10:00:00Z', origin: { kind: 'human' }, message: { content: 'x'.repeat(200) } }) + '\n');
  const s = await parseSession(f, []);
  assert.equal(s.title, 'x'.repeat(80) + '…');
  assert.equal(s.id, 'abc');
});

test('a manual rename wins over a later ai-title', async () => {
  const { writeFileSync } = await import('node:fs');
  const { tempDir } = await import('./helpers.ts');
  const f = tempDir() + '/renamed.jsonl';
  writeFileSync(f, [
    JSON.stringify({ type: 'user', timestamp: '2026-05-01T10:00:00Z', origin: { kind: 'human' }, message: { content: 'hello' } }),
    JSON.stringify({ type: 'ai-title', aiTitle: 'Purpose of product type' }),
    JSON.stringify({ type: 'custom-title', customTitle: 'Woo removal and Admin polish' }),
    JSON.stringify({ type: 'ai-title', aiTitle: 'Purpose of product type' }),
  ].join('\n') + '\n');
  const s = await parseSession(f, []);
  assert.equal(s.title, 'Woo removal and Admin polish');
});
