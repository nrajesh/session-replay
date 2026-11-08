import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/redact.ts';

// Fake secrets assembled at runtime so no secret-shaped literal sits in the repo.
const r = (...p: string[]) => p.join('');

const cases: [string, string][] = [
  [r('key ', 'sk-ant-api03-', 'A'.repeat(40)), 'anthropic-key'],
  [r('sk-', 'proj-', 'b'.repeat(40)), 'openai-key'],
  [r('gh', 'p_', 'c'.repeat(36)), 'github-token'],
  [r('github', '_pat_', '1'.repeat(22), '_', 'd'.repeat(59)), 'github-token'],
  [r('AK', 'IA', 'ABCDEFGHIJKLMNOP'), 'aws-key'],
  [r('xo', 'xb-', '1234567890-', 'abcdefghij'), 'slack-token'],
  [r('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJ', 'zdWIiOiIxMjM0In0', '.', 'abcDEF123_-xyz'), 'jwt'],
  [r('Authorization: Bearer ', 'e'.repeat(30)), 'bearer'],
  [r('-----BEGIN RSA ', 'PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----'), 'private-key'],
  [r('pass', 'word=', 'hunter2hunter'), 'password'],
  [r('API_', 'TOKEN: "', 'f'.repeat(24), '"'), 'secret'],
  [r('https://user:', 's3cretpw', '@example.com/x'), 'url-credentials'],
  [r('STRIPE_WEBHOOK_', 'SECRET=', 'whsec_', 'ab12cd'), 'secret'],
  [r('NTFY_', 'TOKEN=', 'tk_', 'd19x'), 'secret'],
  [r('key ', 'whsec_', 'ab12cd34'), 'prefixed-secret'],
  [r('use ', 'sk_test_', '51UMab'), 'prefixed-secret'],
];

for (const [input, kind] of cases) {
  test(`redacts ${kind}`, () => {
    const out = redact(`before ${input} after`);
    assert.match(out, new RegExp(`\\[REDACTED:${kind}\\]`), out);
    assert.match(out, /^before /);
    assert.match(out, / after$/);
  });
}

test('names of secrets without values are left alone', () => {
  const s = 'Set TOKEN: RAILWAY_TOKEN and API_KEY= WOO_STORE_URL';
  assert.equal(redact(s), s);
});

test('leaves commit hashes, UUIDs and ordinary words alone', () => {
  const s = 'commit 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b session 11111111-2222-4333-8444-555555555555 password policy tokens';
  assert.equal(redact(s), s);
});
