import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readClaudeHistory, writeClaudeHistory } from '../src/claudehistory.ts';
import { tempDir } from './helpers.ts';

const settings = () => join(tempDir(), 'settings.json');

test('a missing file reads as the Claude Code default of 30 days', () => {
  assert.deepEqual(readClaudeHistory(settings()), { days: 30, explicit: false });
});

test('an explicit value is read back', () => {
  const p = settings();
  writeFileSync(p, JSON.stringify({ cleanupPeriodDays: 3650 }));
  assert.deepEqual(readClaudeHistory(p), { days: 3650, explicit: true });
});

test('an invalid file reads as the default instead of throwing', () => {
  const p = settings();
  writeFileSync(p, '{ nope');
  assert.deepEqual(readClaudeHistory(p), { days: 30, explicit: false });
});

test('writing keeps every other key and saves a backup first', () => {
  const p = settings();
  writeFileSync(p, JSON.stringify({ model: 'opus', hooks: { SessionEnd: [] }, cleanupPeriodDays: 30 }));
  const r = writeClaudeHistory(p, 120);
  assert.ok(r.backup && existsSync(r.backup));
  assert.equal(JSON.parse(readFileSync(r.backup!, 'utf8')).cleanupPeriodDays, 30);
  const after = JSON.parse(readFileSync(p, 'utf8'));
  assert.deepEqual(after, { model: 'opus', hooks: { SessionEnd: [] }, cleanupPeriodDays: 120 });
});

test('writing creates the file when it does not exist, without a backup', () => {
  const p = settings();
  const r = writeClaudeHistory(p, 90);
  assert.equal(r.backup, undefined);
  assert.equal(JSON.parse(readFileSync(p, 'utf8')).cleanupPeriodDays, 90);
});

test('writing refuses an invalid file and leaves it untouched', () => {
  const p = settings();
  writeFileSync(p, '{ nope');
  assert.throws(() => writeClaudeHistory(p, 90), /not valid JSON/);
  assert.equal(readFileSync(p, 'utf8'), '{ nope');
  assert.equal(readdirSync(join(p, '..')).length, 1);
});

test('writing refuses days outside 1 to 3650', () => {
  const p = settings();
  for (const bad of [0, -1, 3651, 1.5, NaN]) assert.throws(() => writeClaudeHistory(p, bad), /whole number/);
  assert.equal(existsSync(p), false);
});
