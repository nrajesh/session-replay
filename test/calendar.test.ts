import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, monthsBetween, shiftMonth } from '../src/client/calendar.js';

test('month days list every day with its count', () => {
  const d = monthDays('2026-10', { '2026-10-27': 3 });
  assert.equal(d.length, 31);
  assert.deepEqual(d[26], { day: '2026-10-27', date: 27, count: 3 });
  assert.equal(monthDays('2026-02', {}).length, 28);
});

test('months between two days, inclusive; bad input gives none', () => {
  assert.deepEqual(monthsBetween('2026-04-10', '2026-06-01'), ['2026-04', '2026-05', '2026-06']);
  assert.deepEqual(monthsBetween('', '2026-05-01'), []);
});

test('shift month across years', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
});
