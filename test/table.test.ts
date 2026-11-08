import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewRows, pageSlice } from '../src/client/table.js';

const rows = [{ n: 'b', v: 2 }, { n: 'a', v: 10 }, { n: 'c', v: 1 }];
const cols = [{ key: 'n', label: 'Name' }, { key: 'v', label: 'Value', num: true }];

test('sorts numbers numerically and text alphabetically, both directions', () => {
  assert.deepEqual(viewRows(rows, cols, { key: 'v', dir: 1 }, null).map((r: any) => r.v), [1, 2, 10]);
  assert.deepEqual(viewRows(rows, cols, { key: 'v', dir: -1 }, null).map((r: any) => r.v), [10, 2, 1]);
  assert.deepEqual(viewRows(rows, cols, { key: 'n', dir: 1 }, null).map((r: any) => r.n), ['a', 'b', 'c']);
});

test('filter applies before sorting', () => {
  assert.deepEqual(viewRows(rows, cols, null, (r: any) => r.v > 1).map((r: any) => r.n), ['b', 'a']);
});

test('page slices for 10/20/50/100/all', () => {
  const many = Array.from({ length: 45 }, (_, i) => i);
  assert.deepEqual(pageSlice(many, 20, 2), { rows: many.slice(20, 40), page: 2, pages: 3 });
  assert.deepEqual(pageSlice(many, 20, 9).page, 3);
  assert.deepEqual(pageSlice(many, 'all', 1), { rows: many, page: 1, pages: 1 });
  assert.deepEqual(pageSlice([], 10, 1), { rows: [], page: 1, pages: 1 });
});
