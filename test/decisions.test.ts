import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askDecision, classifyPrompt } from '../src/decisions.ts';
import { parseSession } from '../src/parse.ts';
import { fixture } from './helpers.ts';

const AT = '2026-05-02T09:00:00Z';

test('ask: recommended option flagged and suffix removed; chosen label exact', () => {
  const input = { questions: [{ question: 'Q?', header: 'H', multiSelect: false, options: [{ label: 'A (Recommended)', description: 'd' }, { label: 'B' }] }] };
  const [d] = askDecision(input, { answers: { 'Q?': 'B' } }, AT);
  assert.equal(d.kind, 'ask');
  assert.equal(d.exact, true);
  assert.equal(d.header, 'H');
  assert.deepEqual(d.options, [{ label: 'A', description: 'd', recommended: true }, { label: 'B', description: undefined, recommended: false }]);
  assert.deepEqual(d.chosen, ['B']);
  assert.equal(d.other, undefined);
});

test('ask: picking the recommended label (with suffix) counts as chosen', () => {
  const input = { questions: [{ question: 'Q?', options: [{ label: 'A (Recommended)' }, { label: 'B' }] }] };
  assert.deepEqual(askDecision(input, { answers: { 'Q?': 'A (Recommended)' } }, AT)[0].chosen, ['A']);
});

test('ask: free-text answer becomes other', () => {
  const input = { questions: [{ question: 'Q?', options: [{ label: 'A' }, { label: 'B' }] }] };
  const [d] = askDecision(input, { answers: { 'Q?': 'Neither, do C' } }, AT);
  assert.deepEqual(d.chosen, []);
  assert.equal(d.other, 'Neither, do C');
});

test('ask: multiSelect comma list and array answers', () => {
  const input = { questions: [{ question: 'Q?', multiSelect: true, options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] }] };
  assert.deepEqual(askDecision(input, { answers: { 'Q?': 'A, C' } }, AT)[0].chosen, ['A', 'C']);
  const [d] = askDecision(input, { answers: { 'Q?': ['B', 'my own'] } }, AT);
  assert.deepEqual(d.chosen, ['B']);
  assert.equal(d.other, 'my own');
});

test('ask: no result recorded means no answer', () => {
  const input = { questions: [{ question: 'Q?', options: [{ label: 'A' }] }] };
  const [d] = askDecision(input, undefined, AT);
  assert.deepEqual(d.chosen, []);
  assert.equal(d.notes, 'no answer recorded');
});

test('ask: annotation notes are kept', () => {
  const input = { questions: [{ question: 'Q?', options: [{ label: 'A' }] }] };
  const [d] = askDecision(input, { answers: { 'Q?': 'A' }, annotations: { 'Q?': { notes: 'because' } } }, AT);
  assert.equal(d.notes, 'because');
});

test('classifyPrompt: approval, rejection, instruction, question', () => {
  assert.equal(classifyPrompt('yes go ahead', AT)?.kind, 'approval');
  assert.equal(classifyPrompt('LGTM', AT)?.kind, 'approval');
  assert.equal(classifyPrompt('no, use X instead', AT)?.kind, 'rejection');
  assert.equal(classifyPrompt("don't touch the schema", AT)?.kind, 'rejection');
  assert.equal(classifyPrompt('please add a dark mode', AT)?.kind, 'instruction');
  assert.equal(classifyPrompt('can you fix the login bug?', AT)?.kind, 'instruction');
  assert.equal(classifyPrompt('why does this fail?', AT), null);
  assert.equal(classifyPrompt('hmm', AT), null);
  const d = classifyPrompt('please add a dark mode', AT)!;
  assert.equal(d.exact, false);
  assert.equal(d.quote, 'please add a dark mode');
  assert.equal(classifyPrompt('x '.repeat(400) + 'please add', AT)!.quote!.length <= 401, true);
});

test('classifyPrompt: approval carries what Claude proposed as the question', () => {
  const d = classifyPrompt('yes', AT, 'Long preamble.\n\nShall I delete the old branch?')!;
  assert.equal(d.question, 'Shall I delete the old branch?');
});

test('parseSession collects exact and best-effort decisions in order', async () => {
  const s = await parseSession(fixture('ask.fixture.jsonl'), []);
  const exact = s.decisions.filter((d) => d.exact);
  assert.equal(exact.length, 4);
  assert.deepEqual(exact[0].chosen, ['Delete them']);
  assert.equal(exact[0].notes, 'Saner to delete them.');
  assert.equal(exact[1].other, 'Ledgers are like different books for the human, block it');
  assert.deepEqual(exact[2].chosen, ['Lint', 'Tests']);
  assert.equal(exact[3].notes, 'no answer recorded');
  const loose = s.decisions.filter((d) => !d.exact);
  assert.deepEqual(loose.map((d) => d.kind), ['instruction', 'approval']);
  assert.equal(loose[1].question, 'Plan: delete merged budgets and block duplicate names. Shall I proceed?');
});
