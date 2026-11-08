import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientBundle } from '../src/render/client-bundle.ts';



test('Excel export ships only with Pro', () => {
  const free = clientBundle(false);
  assert.doesNotMatch(free, /xlsx/i);
  assert.ok(free.includes('function search('));
  assert.doesNotThrow(() => new Function(free));
});
