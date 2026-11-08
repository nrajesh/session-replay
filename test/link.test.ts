import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckpoints } from '../src/link.ts';
import { emptySession } from '../src/parse.ts';
import type { CommitRef, DecisionPoint } from '../src/types.ts';

const commit = (hash: string, at: string, subject = 'c ' + hash): CommitRef => ({ hash, at, subject, files: [], added: 0, removed: 0, via: ['window'] });
const ask = (at: string, q = 'Q?'): DecisionPoint => ({ kind: 'ask', exact: true, at, question: q, options: [], chosen: ['A'] });
const said = (at: string, kind: DecisionPoint['kind'] = 'instruction'): DecisionPoint => ({ kind, exact: false, at, question: '', options: [], chosen: [], quote: 'do it' });

test('decisions attach to the next commit; commits without decisions are AI-agent findings', () => {
  const s = emptySession('/x/s.jsonl');
  s.decisions = [ask('2026-05-01T10:00:00Z')];
  s.commits = [commit('b', '2026-05-01T10:30:00Z'), commit('a', '2026-05-01T10:05:00Z')];
  const cps = buildCheckpoints(s);
  assert.deepEqual(cps.map((c) => [c.commit?.hash, c.tag, c.who, c.decisions.length]), [['a', 'Decision', 'you', 1], ['b', 'Finding', 'agent', 0]]);
  assert.equal(cps[0].title, 'c a');
});

test('decisions after the last commit get their own checkpoint', () => {
  const s = emptySession('/x/s.jsonl');
  s.commits = [commit('a', '2026-05-01T10:05:00Z')];
  s.decisions = [said('2026-05-01T11:00:00Z', 'approval')];
  const cps = buildCheckpoints(s);
  assert.equal(cps.length, 2);
  assert.equal(cps[1].commit, undefined);
  assert.equal(cps[1].title, 'After the last commit');
});

test('no commits: one checkpoint per question asked, free text joins the next one', () => {
  const s = emptySession('/x/s.jsonl');
  s.decisions = [said('2026-05-01T09:00:00Z'), ask('2026-05-01T10:00:00Z', 'First?'), ask('2026-05-01T10:00:00Z', 'Also?'), ask('2026-05-01T11:00:00Z', 'Second?'), said('2026-05-01T12:00:00Z')];
  const cps = buildCheckpoints(s);
  assert.deepEqual(cps.map((c) => [c.title, c.decisions.length]), [['First?', 3], ['Second?', 1], ['Instructions and approvals', 1]]);
});

test('no commits and no decisions: no checkpoints', () => {
  assert.deepEqual(buildCheckpoints(emptySession('/x/s.jsonl')), []);
});
