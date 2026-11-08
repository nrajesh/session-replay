import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPro, proAvailable } from '../src/edition.ts';
import { loadConfig } from '../src/config.ts';
import { tempDir } from './helpers.ts';

test('Pro needs both the Pro folder and the Pro setting', () => {
  assert.equal(isPro({ edition: 'pro' }, false), false);
  assert.equal(isPro({ edition: 'pro' }, true), true);
  assert.equal(isPro({ edition: 'free' }, true), false);
  assert.equal(isPro({}, true), false);
});

test('the Pro folder is missing outside the private repo', () => {
  assert.equal(proAvailable(new URL('file:///nonexistent-session-replay/')), false);
});

test('an old config with Pro settings loads and stays free without the Pro folder', () => {
  const dir = tempDir('sr-edition-');
  const path = join(dir, 'config.json');
  writeFileSync(path, '{"edition":"pro","askModel":"opus","localUrl":"http://127.0.0.1:1234/v1"}');
  const cfg = loadConfig({ path, env: { HOME: dir } });
  assert.equal(isPro(cfg, false), false);
});
