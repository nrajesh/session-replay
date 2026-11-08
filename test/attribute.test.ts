import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeCommits, activeSpans } from '../src/link.ts';
import { emptySession, parseSession } from '../src/parse.ts';
import { fixture } from './helpers.ts';
import type { CommitRef } from '../src/types.ts';

const c = (hash: string, at: string, files: string[] = [], via: CommitRef['via'] = ['window']): CommitRef => ({ hash, at, subject: hash, files, added: 0, removed: 0, via });

test('activity spans break on gaps longer than 30 minutes', () => {
  assert.deepEqual(activeSpans(['2026-05-01T10:00:00Z', '2026-05-01T10:20:00Z', '2026-05-01T12:00:00Z', '2026-05-01T12:10:00Z']),
    [['2026-05-01T10:00:00Z', '2026-05-01T10:20:00Z'], ['2026-05-01T12:00:00Z', '2026-05-01T12:10:00Z']]);
});

test('window commits need activity plus a commit command or an edited file', () => {
  const s = emptySession('/x/s.jsonl');
  s.repoPath = '/r';
  s.activity = [['2026-05-01T10:00:00.000Z', '2026-05-01T11:00:00.000Z']];
  s.gitCommandTimes = ['2026-05-01T10:30:00.000Z'];
  s.editedFiles = ['/r/src/a.ts'];
  const kept = attributeCommits(s, [
    c('byCommand', '2026-05-01T10:30:40.000Z'),
    c('byFile', '2026-05-01T10:45:00.000Z', ['src/a.ts']),
    c('stranger', '2026-05-01T10:50:00.000Z', ['src/zzz.ts']),
    c('idleGap', '2026-05-03T09:00:00.000Z', ['src/a.ts']),
    c('fromOutput', '2026-05-03T09:00:00.000Z', [], ['output']),
  ]);
  assert.deepEqual(kept.map((k) => k.hash), ['byCommand', 'byFile', 'fromOutput']);
});

test('parser records edited files, git commit command times and activity', async () => {
  const s = await parseSession(fixture('basic.fixture.jsonl'), []);
  assert.deepEqual(s.editedFiles, ['/tmp/demo/src/settings.ts']);
  assert.deepEqual(s.gitCommandTimes, ['2026-05-01T10:02:00.000Z']);
  assert.equal(s.activity.length, 1);
});
