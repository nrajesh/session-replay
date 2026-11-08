import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, search, normalize, editDistance } from '../src/client/search.js';

const docs = [
  { id: 'a', fields: { title: 'Ledger-safe renames and deletes', decisions: 'Delete them', commits: 'fix: deduplication dialog', prompts: 'merge vendors safely', files: 'src/providers/LocalDataProvider.ts' } },
  { id: 'b', fields: { title: 'Café menu poster', decisions: '', commits: '', prompts: 'make a poster', files: '' } },
  { id: 'c', fields: { title: 'Merge conflicts in vendors list', decisions: '', commits: '', prompts: 'resolve merge', files: '' } },
  { id: 'd', fields: { title: 'Stock prices sheet', decisions: '', commits: 'feat: vendors import', prompts: '', files: '' } },
];
const idx = buildIndex(docs);
const ids = (q: string) => search(idx, q).map((r) => r.id);

test('normalize folds case and accents', () => {
  assert.equal(normalize('Café ÜBER'), 'cafe uber');
});

test('edit distance with a bound', () => {
  assert.equal(editDistance('ledgr', 'ledger', 2), 1);
  assert.equal(editDistance('teh', 'the', 2), 1);
  assert.ok(editDistance('abc', 'xyz12', 1) > 1);
});

test('prefix match: dedup finds deduplication', () => {
  assert.deepEqual(ids('dedup'), ['a']);
});

test('typo tolerance: ledgr finds ledger', () => {
  assert.equal(ids('ledgr')[0], 'a');
});

test('accent-insensitive: cafe finds Café', () => {
  assert.deepEqual(ids('cafe'), ['b']);
});

test('multi-word: docs matching every word rank first, title weighs most', () => {
  const r = ids('merge vendors');
  assert.equal(r[0], 'c');
  assert.ok(r.includes('a'));
  assert.ok(!r.includes('b'));
});

test('partial matches are returned when nothing matches every word', () => {
  assert.deepEqual(ids('poster zzzzqqq'), ['b']);
});

test('snippet shows the matched text', () => {
  const [r] = search(idx, 'providers');
  assert.match(r.snippet, /LocalDataProvider/);
  assert.ok(r.terms.includes('providers'));
});

test('empty or punctuation-only query returns nothing', () => {
  assert.deepEqual(search(idx, ''), []);
  assert.deepEqual(search(idx, '  ?? '), []);
});

test('question filler words are ignored when real words remain', () => {
  const idx2 = buildIndex([
    { id: 'x', fields: { title: 'Offsite backups feature', decisions: '', commits: '', prompts: 'which sessions are these', files: '' } },
    { id: 'y', fields: { title: 'Menu poster', decisions: '', commits: '', prompts: 'which sessions', files: '' } },
  ]);
  assert.deepEqual(search(idx2, 'Which sessions touched backups?').map((r) => r.id), ['x']);
  // A query made only of filler still searches rather than going empty.
  assert.ok(search(idx2, 'which sessions').length > 0);
});

test('filler words can be switched off (checkpoint search treats "you" as a real word)', () => {
  const i = buildIndex([
    { id: 'a', fields: { title: '2 decisions · you', decisions: '', commits: '', prompts: '', files: '' } },
    { id: 'b', fields: { title: 'Finding · AI agent', decisions: '', commits: '', prompts: '', files: '' } },
  ]);
  assert.deepEqual(search(i, 'decisions · you', 200, { filler: false }).map((r) => r.id), ['a']);
});

test('"what did I decide in each" does not drown the topic word', () => {
  const i = buildIndex([
    { id: 'backup', fields: { title: 'Offsite backups', decisions: '', commits: '', prompts: '', files: '' } },
    { id: 'other', fields: { title: 'Menu poster', decisions: 'each poster decided later', commits: '', prompts: 'what I decided in each', files: '' } },
  ]);
  assert.deepEqual(search(i, 'Which sessions touched backups, and what did I decide in each?').map((r) => r.id), ['backup']);
});
