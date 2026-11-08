import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readClaudeHistory } from '../src/claudehistory.ts';
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

