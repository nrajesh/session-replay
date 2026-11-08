import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSession, emptySession } from '../src/parse.ts';
import { summarizeUsage, topModels, estimateCosts, isLocalModel, modelSource, shortModel } from '../src/usage.ts';
import { renderSession } from '../src/render/session.ts';
import type { UsageEvent } from '../src/types.ts';

const rec = (at: string, id: string, model: string, input: number, output: number, cacheRead = 0) =>
  JSON.stringify({ type: 'assistant', timestamp: at, message: { id, model, role: 'assistant', content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: input, output_tokens: output, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 } } });

test('parse counts each reply once, skips synthetic, keeps the model', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sr-usage-'));
  const f = join(dir, 's.jsonl');
  writeFileSync(f, [
    rec('2026-05-01T10:00:00.000Z', 'm1', 'claude-sonnet-5-5', 10, 100, 1000),
    rec('2026-05-01T10:00:00.100Z', 'm1', 'claude-sonnet-5-5', 10, 100, 1000), // same reply, second block
    rec('2026-05-01T10:05:00.000Z', 'm2', 'qwen3-coder', 50, 20),
    rec('2026-05-01T10:06:00.000Z', 'm3', '<synthetic>', 0, 0),
  ].join('\n'));
  const s = await parseSession(f, []);
  assert.equal(s.usageEvents?.length, 2);
  s.checkpoints = [{ at: '2026-05-01T10:01:00.000Z', title: 'a', tag: 'Finding', who: 'agent', decisions: [] }, { at: '2026-05-01T10:10:00.000Z', title: 'b', tag: 'Finding', who: 'agent', decisions: [] }];
  summarizeUsage(s);
  assert.equal(s.usageEvents, undefined);
  assert.deepEqual(s.models?.map((m) => [m.model, m.messages, m.input, m.output, m.cacheRead]), [['claude-sonnet-5-5', 1, 10, 100, 1000], ['qwen3-coder', 1, 50, 20, 0]]);
  assert.deepEqual(s.checkpoints[0].models?.map((m) => m.model), ['claude-sonnet-5-5']);
  assert.deepEqual(s.checkpoints[1].models?.map((m) => m.model), ['qwen3-coder']);
});

test('cost is split by token mix, local models are free, no cost means no split', () => {
  const s = emptySession('/x/a.jsonl');
  const ev = (model: string, i: number, o: number): UsageEvent => ['2026-05-01T10:00:00.000Z', model, i, o, 0, 0];
  s.usageEvents = [ev('claude-opus-5-5', 1000, 1000), ev('claude-sonnet-5-5', 1000, 1000), ev('llama3', 5000, 5000)];
  s.costUSD = 6;
  summarizeUsage(s);
  const by = Object.fromEntries(s.models!.map((m) => [m.model, m.cost!]));
  assert.equal(by['llama3'], 0);
  assert.ok(Math.abs(by['claude-opus-5-5'] + by['claude-sonnet-5-5'] - 6) < 1e-9);
  assert.ok(by['claude-opus-5-5'] > by['claude-sonnet-5-5'] * 4);
  estimateCosts(s.models!, undefined);
  assert.equal(s.models![0].cost, undefined);
});

test('topModels keeps three and folds the rest into other', () => {
  const mk = (model: string, n: number) => ({ model, messages: 1, input: n, output: 0, cacheRead: 0, cacheWrite: 0 });
  const top = topModels([mk('a', 50), mk('b', 20), mk('c', 15), mk('d', 10), mk('e', 5)]);
  assert.deepEqual(top.map((t) => [t.name, Math.round(t.share * 100)]), [['a', 50], ['b', 20], ['c', 15], ['other', 15]]);
  assert.equal(top[3].count, 2);
});

test('hosted agent model ids remain distinct and are not labelled local', () => {
  assert.equal(shortModel('copilot/gpt-6-luna'), 'gpt-6-luna');
  assert.equal(modelSource('copilot/gpt-6-luna'), 'Copilot');
  assert.equal(modelSource('codex/gpt-6-luna'), 'Codex');
  assert.equal(isLocalModel('qwen3-coder'), true);
  assert.equal(isLocalModel('copilot/gpt-6-luna'), false);
});


