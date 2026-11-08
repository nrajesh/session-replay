// Reads test-runner summary lines from command output. Unknown formats return null; nothing is estimated.
import type { TestRun } from './types.ts';

const ANSI = /\u001b\[[0-9;]*m/g;
const count = (s: string, word: string) => {
  const m = s.match(new RegExp(`(\\d+) ${word}`));
  return m ? Number(m[1]) : 0;
};

interface Hit { index: number; runner: string; passed: number; failed: number; total: number }

function lastMatch(re: RegExp, text: string): RegExpExecArray | null {
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  re.lastIndex = 0;
  while ((m = re.exec(text))) last = m;
  return last;
}

function failureNames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/^[ \t]*(?:●|×|✗|✖)[ \t]+(.+?)(?: \([\d.]+ ?m?s\))?[ \t]*$/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^[ \t]*FAIL[ \t]+(\S+ > .+?)[ \t]*$/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^not ok \d+ - (.+?)(?: #.*)?$/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^FAILED (\S+::\S+)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^--- FAIL: (\S+)/gm)) names.add(m[1]);
  return [...names].map((n) => n.trim().slice(0, 140)).filter(Boolean).slice(0, 8);
}

export function parseTestSummary(output: string, at: string): TestRun | null {
  const text = output.replace(ANSI, '');
  const hits: Hit[] = [];

  const jest = lastMatch(/Tests:[ \t]+([^\n]*?)(\d+) total/g, text);
  if (jest) hits.push({ index: jest.index, runner: 'jest', passed: count(jest[1], 'passed'), failed: count(jest[1], 'failed'), total: Number(jest[2]) });

  const vitest = lastMatch(/(?:^|\n)[ \t]*Tests[ \t]+((?:\d+ \w+[ \t]*\|?[ \t]*)+)\((\d+)\)/g, text);
  if (vitest) hits.push({ index: vitest.index, runner: 'vitest', passed: count(vitest[1], 'passed'), failed: count(vitest[1], 'failed'), total: Number(vitest[2]) });

  const nodePass = lastMatch(/(?:^|\n)(?:#|ℹ) pass (\d+)/g, text);
  if (nodePass) {
    const fail = lastMatch(/(?:^|\n)(?:#|ℹ) fail (\d+)/g, text);
    const tests = lastMatch(/(?:^|\n)(?:#|ℹ) tests (\d+)/g, text);
    const passed = Number(nodePass[1]);
    const failed = fail ? Number(fail[1]) : 0;
    hits.push({ index: nodePass.index, runner: 'node', passed, failed, total: tests ? Number(tests[1]) : passed + failed });
  }

  const pytest = lastMatch(/=+ ([^=\n]*?\d+ (?:passed|failed)[^=\n]*?) in [\d.]+s\b[^\n]*=+/g, text);
  if (pytest) {
    const passed = count(pytest[1], 'passed');
    const failed = count(pytest[1], 'failed') + count(pytest[1], 'errors?');
    hits.push({ index: pytest.index, runner: 'pytest', passed, failed, total: passed + failed + count(pytest[1], 'skipped') });
  }

  if (!hits.length) {
    const ok = text.match(/^ok[ \t]+\S+/gm)?.length ?? 0;
    const fail = text.match(/^FAIL[ \t]+\S+[ \t]/gm)?.length ?? 0;
    if (ok + fail > 0) hits.push({ index: 0, runner: 'go', passed: ok, failed: fail, total: ok + fail });
  }

  if (!hits.length) return null;
  const h = hits.reduce((a, b) => (b.index > a.index ? b : a));
  if (h.total <= 0 && h.passed + h.failed <= 0) return null;
  const run: TestRun = { at, runner: h.runner, passed: h.passed, failed: h.failed, total: h.total };
  if (h.failed > 0) {
    const failures = failureNames(text);
    if (failures.length) run.failures = failures;
  }
  return run;
}

/** Hashes of commits created or pushed, as printed by git. Mere mentions of hashes are ignored. */
export function commitHashesFromOutput(output: string): string[] {
  const found = new Set<string>();
  for (const m of output.matchAll(/^\[[^\]\n]*? (?:\(root-commit\) )?([0-9a-f]{7,40})\]/gm)) found.add(m[1]);
  for (const m of output.matchAll(/^\s*\+?[0-9a-f]{7,40}\.{2,3}([0-9a-f]{7,40})\s+\S+ -> \S+/gm)) found.add(m[1]);
  return [...found];
}
