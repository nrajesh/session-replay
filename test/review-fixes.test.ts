// Regression tests for the final-review findings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { monthsBetween } from '../src/client/calendar.js';
import { redact } from '../src/redact.ts';
import { installHook } from '../src/hook.ts';
import { parseSession } from '../src/parse.ts';
import { indexData } from '../src/render/indexes.ts';
import { emptySession } from '../src/parse.ts';
import { makeTree, tempDir } from './helpers.ts';
import type { GitRunner } from '../src/git.ts';

const noGit: GitRunner = async () => null;
const quiet = () => {};
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';
const line = (o: object) => JSON.stringify(o) + '\n';

test('#1 a transcript without timestamps is skipped and cannot break the calendar', async () => {
  const root = makeTree({
    [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U2}.jsonl`]: { text: line({ type: 'summary', summary: 'x', leafUuid: 'y' }) },
  });
  const out = tempDir('sr-out-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r.processed, 1);
  assert.equal(r.emptySessions, 1);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.ok(!html.includes('"day":""'));
  assert.deepEqual(monthsBetween('', '2026-05-01'), []);
  assert.deepEqual(monthsBetween('2026-05-01', 'garbage'), []);
});

test('#2 common password and credential forms are redacted', () => {
  const p = (...x: string[]) => x.join('');
  for (const s of [p('DB_PASS', 'WORD=', 'hunter2xyz'), p('POSTGRES_PASS', 'WORD: ', 's3cretpw'), p('{"pass', 'word": "', 'abc12345"}'), p('Authorization: Basic ', 'dXNlcjpwYXNzd29yZA==')]) {
    const out = redact(s);
    assert.match(out, /\[REDACTED:/, s);
    for (const v of ['hunter2xyz', 's3cretpw', 'abc12345', 'dXNlcjpwYXNzd29yZA']) assert.ok(!out.includes(v), out);
  }
});

test('#3 install-hook repairs a hook whose command changed (e.g. after a Node upgrade)', () => {
  const f = join(tempDir(), 'settings.json');
  installHook(f, '"/old/node" "/x/session-replay/src/cli.ts" hook');
  const r = installHook(f, '"/new/node" "/x/session-replay/src/cli.ts" hook');
  assert.equal(r.changed, true);
  const cmds = JSON.parse(readFileSync(f, 'utf8')).hooks.SessionEnd.flatMap((m: any) => m.hooks.map((h: any) => h.command));
  assert.deepEqual(cmds, ['"/new/node" "/x/session-replay/src/cli.ts" hook']);
});

test('#4 a question still open when the session ended is kept with no answer', async () => {
  const f = join(tempDir(), 'open.jsonl');
  writeFileSync(f, line({ type: 'user', timestamp: '2026-05-01T10:00:00Z', origin: { kind: 'human' }, message: { content: 'start' } }) +
    line({ type: 'assistant', timestamp: '2026-05-01T10:01:00Z', message: { content: [{ type: 'tool_use', id: 'q', name: 'AskUserQuestion', input: { questions: [{ question: 'Ship it?', options: [{ label: 'Yes' }] }] } }] } }));
  const s = await parseSession(f, []);
  const exact = s.decisions.filter((d) => d.exact);
  assert.equal(exact.length, 1);
  assert.equal(exact[0].notes, 'no answer recorded');
});

test('#5 a resumed session shows up on every day it was active', () => {
  const { turns, ...rest } = emptySession('/x/s.jsonl');
  void turns;
  const s = { ...rest, id: 's', projectName: 'demo', projectKey: 'demo', projectSlug: 'demo', title: 't', prompts: [],
    start: '2026-05-04T10:00:00', end: '2026-05-06T15:00:00',
    activity: [['2026-05-04T10:00:00', '2026-05-04T11:00:00'], ['2026-05-06T14:00:00', '2026-05-06T15:00:00']] as [string, string][],
    commits: [{ hash: 'abc1234', at: '2026-05-06T14:30:00', subject: 'feat', files: [], added: 0, removed: 0, via: ['window' as const] }] };
  const d = indexData([{ name: 'demo', slug: 'demo', sessions: [s], milestones: [] }], 'all');
  assert.deepEqual(d.sessions[0].days, ['2026-05-04', '2026-05-06']);
});

test('#6 a session without a working folder joins its sibling project instead of splitting it', async () => {
  const root = makeTree({
    [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U2}.jsonl`]: 'ask.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U3}.jsonl`]: { text: line({ type: 'user', timestamp: '2026-05-01T10:00:00Z', origin: { kind: 'human' }, message: { content: 'no cwd here' } }) },
  });
  const out = tempDir('sr-out-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.deepEqual(r.perProject, { demo: 3 });
  assert.ok(readFileSync(join(out, 'demo', 'index.html'), 'utf8').length > 0);
});
