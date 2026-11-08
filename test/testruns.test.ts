import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTestSummary, commitHashesFromOutput } from '../src/testruns.ts';
import { parseSession } from '../src/parse.ts';
import { fixture } from './helpers.ts';

const AT = '2026-05-03T12:00:00Z';
const pick = (o: string) => {
  const r = parseTestSummary(o, AT);
  return r && { runner: r.runner, passed: r.passed, failed: r.failed, total: r.total };
};

test('jest summaries', () => {
  assert.deepEqual(pick('Test Suites: 1 failed\nTests:       2 failed, 241 passed, 243 total\nTime: 3s'), { runner: 'jest', passed: 241, failed: 2, total: 243 });
  assert.deepEqual(pick('Tests:       3 skipped, 40 passed, 43 total'), { runner: 'jest', passed: 40, failed: 0, total: 43 });
  assert.deepEqual(pick('Tests:       5 failed, 5 total'), { runner: 'jest', passed: 0, failed: 5, total: 5 });
});

test('vitest summaries, with ANSI colour codes', () => {
  assert.deepEqual(pick(' Test Files  4 passed (4)\n      Tests  36 passed (36)'), { runner: 'vitest', passed: 36, failed: 0, total: 36 });
  assert.deepEqual(pick('\u001b[2m      Tests \u001b[22m \u001b[31m1 failed\u001b[39m | \u001b[32m35 passed\u001b[39m (36)'), { runner: 'vitest', passed: 35, failed: 1, total: 36 });
  assert.deepEqual(pick('      Tests  30 passed | 2 skipped (32)'), { runner: 'vitest', passed: 30, failed: 0, total: 32 });
});

test('node:test, pytest and go summaries', () => {
  assert.deepEqual(pick('# tests 36\n# suites 0\n# pass 35\n# fail 1'), { runner: 'node', passed: 35, failed: 1, total: 36 });
  assert.deepEqual(pick('ℹ tests 12\nℹ pass 12\nℹ fail 0'), { runner: 'node', passed: 12, failed: 0, total: 12 });
  assert.deepEqual(pick('==== 3 failed, 40 passed in 2.10s ===='), { runner: 'pytest', passed: 40, failed: 3, total: 43 });
  assert.deepEqual(pick('ok  \texample.com/a\t0.1s\nFAIL\texample.com/b\t0.2s\nok  \texample.com/c\t(cached)'), { runner: 'go', passed: 2, failed: 1, total: 3 });
});

test('takes the last summary; prose is not a summary', () => {
  assert.equal(pick('Tests:       1 failed, 9 passed, 10 total\n...\nTests:       10 passed, 10 total')!.passed, 10);
  assert.equal(pick('I ran 5 tests and they passed'), null);
  assert.equal(pick(''), null);
});

test('commit hashes come from git commit and push output only', () => {
  assert.deepEqual(commitHashesFromOutput('[main 1a2b3c4] feat: x\n 1 file changed'), ['1a2b3c4']);
  assert.deepEqual(commitHashesFromOutput('[feat/a-b (root-commit) 9f8e7d6] init'), ['9f8e7d6']);
  assert.deepEqual(commitHashesFromOutput('To github.com:a/b.git\n   abc1234..def5678  main -> main'), ['def5678']);
  assert.deepEqual(commitHashesFromOutput('id 11111111-2222-3333 and deadbeef in prose'), []);
});

test('parseSession records test runs and commit hashes from tool output', async () => {
  const s = await parseSession(fixture('basic.fixture.jsonl'), []);
  assert.deepEqual(s.commitHashesInOutput, ['1a2b3c4']);
  const t = await parseSession(fixture('tests.fixture.jsonl'), []);
  assert.deepEqual(t.tests.map((r) => [r.passed, r.total]), [[7, 9], [9, 9]]);
});

test('names of failing tests are kept (few, short) when the runner prints them', () => {
  const jest = parseTestSummary('FAIL src/a.test.ts\n  ● merges › keeps budgets\n  ● merges › drops empty\nTests:       2 failed, 8 passed, 10 total', AT)!;
  assert.deepEqual(jest.failures, ['merges › keeps budgets', 'merges › drops empty']);
  const node = parseTestSummary('not ok 3 - parses dates\n# tests 5\n# pass 4\n# fail 1', AT)!;
  assert.deepEqual(node.failures, ['parses dates']);
  const py = parseTestSummary('FAILED tests/test_a.py::test_x - assert 1 == 2\n==== 1 failed, 4 passed in 0.5s ====', AT)!;
  assert.deepEqual(py.failures, ['tests/test_a.py::test_x']);
  assert.equal(parseTestSummary('Tests:       10 passed, 10 total', AT)!.failures, undefined);
});

test('failing names from node spec output (decimal ms) and vitest FAIL lines', () => {
  const node = parseTestSummary('✖ parses dates (0.45ms)\nℹ tests 5\nℹ pass 4\nℹ fail 1', AT)!;
  assert.deepEqual(node.failures, ['parses dates']);
  const vt = parseTestSummary(' FAIL  src/a.test.ts > merges > keeps budgets\n      Tests  1 failed | 4 passed (5)', AT)!;
  assert.deepEqual(vt.failures, ['src/a.test.ts > merges > keeps budgets']);
});
