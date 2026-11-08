import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveBytes, cacheExists, readCacheJson, removeCacheJson, writeCacheJson } from '../src/zjson.ts';
import { tempDir } from './helpers.ts';

test('writes gzip, reads it back, and leaves no plain file', () => {
  const f = join(tempDir(), 's.json');
  writeCacheJson(f, { a: 1, text: 'x'.repeat(5000) });
  assert.equal(existsSync(f), false);
  assert.ok(readFileSync(f + '.gz').length < 500);
  assert.deepEqual(readCacheJson(f), { a: 1, text: 'x'.repeat(5000) });
  assert.equal(cacheExists(f), true);
});

test('reads an old plain file when no gzip exists', () => {
  const f = join(tempDir(), 's.json');
  writeFileSync(f, JSON.stringify({ old: true }));
  assert.deepEqual(readCacheJson(f), { old: true });
  assert.equal(cacheExists(f), true);
});

test('writing replaces the plain twin, so an id is never listed twice', () => {
  const f = join(tempDir(), 's.json');
  writeFileSync(f, JSON.stringify({ v: 1 }));
  writeCacheJson(f, { v: 2 });
  assert.equal(existsSync(f), false);
  assert.deepEqual(readCacheJson(f), { v: 2 });
});

test('the newer file wins if both exist', () => {
  const f = join(tempDir(), 's.json');
  writeCacheJson(f, { v: 'gz' });
  writeFileSync(f, JSON.stringify({ v: 'plain' }));
  utimesSync(f + '.gz', new Date(2020, 1, 1), new Date(2020, 1, 1));
  assert.deepEqual(readCacheJson(f), { v: 'plain' });
});

test('missing or corrupt files read as undefined', () => {
  const d = tempDir();
  assert.equal(readCacheJson(join(d, 'none.json')), undefined);
  assert.equal(cacheExists(join(d, 'none.json')), false);
  writeFileSync(join(d, 'bad.json.gz'), 'not gzip');
  assert.equal(readCacheJson(join(d, 'bad.json')), undefined);
});

test('removeCacheJson deletes both forms and ignores missing files', () => {
  const f = join(tempDir(), 's.json');
  writeCacheJson(f, { a: 1 });
  writeFileSync(f, '{}');
  removeCacheJson(f);
  removeCacheJson(f);
  assert.equal(cacheExists(f), false);
});

test('archiveBytes counts the whole archive and the cache folder', () => {
  const out = tempDir();
  mkdirSync(join(out, '.cache'));
  writeFileSync(join(out, '.cache', 'a.json'), 'x'.repeat(100));
  writeFileSync(join(out, 'index.html'), 'y'.repeat(50));
  mkdirSync(join(out, 'proj'));
  writeFileSync(join(out, 'proj', 'p.html'), 'z'.repeat(10));
  assert.deepEqual(archiveBytes(out), { total: 160, cache: 100 });
  assert.deepEqual(archiveBytes(join(out, 'missing')), { total: 0, cache: 0 });
});

test('compressPlain converts an old plain file once and leaves nothing behind', async () => {
  const { compressPlain } = await import('../src/zjson.ts');
  const f = join(tempDir(), 's.json');
  writeFileSync(f, JSON.stringify({ old: true }));
  assert.equal(compressPlain(f), true);
  assert.equal(existsSync(f), false);
  assert.deepEqual(readCacheJson(f), { old: true });
  assert.equal(compressPlain(f), false);
});
