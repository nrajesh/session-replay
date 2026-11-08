import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, utimesSync, appendFileSync, chmodSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { makeTree, tempDir } from './helpers.ts';
import type { GitRunner } from '../src/git.ts';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';
const U4 = '44444444-4444-4444-8444-444444444444';
const noGit: GitRunner = async () => null;
const quiet = () => {};

function tree() {
  return makeTree({
    [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U2}.jsonl`]: 'ask.fixture.jsonl',
    [`-Users-me-GitHub-other/${U3}.jsonl`]: 'tests.fixture.jsonl',
    [`-Users-me-GitHub-gone/vercel-plugin/skill-injections.jsonl`]: { text: '{}\n' },
    [`-Users-me-GitHub-demo--claude-worktrees-x/notes.txt`]: { text: 'x' },
  });
}

test('first build processes everything and writes pages; second build skips all', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  const r1 = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r1.processed, 3);
  assert.equal(r1.skipped, 0);
  assert.ok(existsSync(join(out, 'index.html')));
  assert.ok(existsSync(join(out, 'demo', 'index.html')));
  assert.ok(existsSync(join(out, 'demo', `${U1}.html`)));
  assert.deepEqual(r1.emptyProjects, ['gone']);
  const r2 = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r2.processed, 0);
  assert.equal(r2.skipped, 3);
  assert.deepEqual(r2.perProject, { demo: 2, other: 1 });
});

test('project exclusions also filter unchanged cached sessions from every generated index', async () => {
  const root = tree();
  const out = tempDir('sr-out-filtered-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });

  const report = await build({ projectsRoot: root, out, exclude: ['DEMO'], run: noGit, log: quiet });
  assert.equal(report.processed, 0);
  assert.deepEqual(report.perProject, { other: 1 });
  assert.doesNotMatch(readFileSync(join(out, 'projects.html'), 'utf8'), /data-project-name="demo"/);
  assert.doesNotMatch(readFileSync(join(out, 'index.html'), 'utf8'), new RegExp(U1));
  assert.doesNotMatch(readFileSync(join(out, 'usage.html'), 'utf8'), new RegExp(U1));
});



test('a render version change refreshes pages without reprocessing sessions', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });

  const page = join(out, 'demo', `${U1}.html`);
  writeFileSync(page, 'stale page');
  const statePath = join(out, '.state.json');
  const state = JSON.parse(readFileSync(statePath, 'utf8')) as { renderKey?: string };
  state.renderKey = 'previous-render-version|free|auto';
  writeFileSync(statePath, JSON.stringify(state));

  const report = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(report.processed, 0);
  assert.match(readFileSync(page, 'utf8'), /<!doctype html>/i);
});

test('a changed session is the only one reprocessed', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  const f = join(root, '-Users-me-GitHub-demo', `${U1}.jsonl`);
  appendFileSync(f, '\n');
  utimesSync(f, new Date(), new Date(Date.now() + 5000));
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r.processed, 1);
});

test('--project and --since filter what gets processed', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet, project: 'OTHER' });
  assert.equal(r.processed, 1);
  const old = join(root, '-Users-me-GitHub-demo', `${U2}.jsonl`);
  utimesSync(old, new Date('2026-01-01'), new Date('2026-01-01'));
  const out2 = tempDir('sr-out-');
  const r2 = await build({ projectsRoot: root, out: out2, run: noGit, log: quiet, since: '2026-02-01' });
  assert.equal(r2.processed, 2);
});

test('--only processes a single transcript', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet, only: join(root, '-Users-me-GitHub-other', `${U3}.jsonl`) });
  assert.equal(r.processed, 1);
  assert.ok(existsSync(join(out, 'index.html')));
});

test('an unreadable transcript is reported and the rest still build', async () => {
  const root = tree();
  const out = tempDir('sr-out-');
  const bad = join(root, '-Users-me-GitHub-demo', `${U2}.jsonl`);
  chmodSync(bad, 0o000);
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  chmodSync(bad, 0o644);
  assert.equal(r.processed, 2);
  assert.equal(r.unreadable.length, 1);
  assert.match(r.unreadable[0].file, new RegExp(U2));
});

test('cached models are redacted', async () => {
  const root = makeTree({ [`-Users-me-GitHub-demo/${U1}.jsonl`]: { text: JSON.stringify({ type: 'user', timestamp: '2026-05-01T10:00:00Z', cwd: '/nowhere/demo', origin: { kind: 'human' }, message: { content: 'use key ' + 'sk-ant-' + 'api03-' + 'Z'.repeat(40) } }) + '\n' } });
  const out = tempDir('sr-out-');
  await build({ projectsRoot: root, out, run: noGit, log: quiet });
  const cacheDir = join(out, '.cache');
  assert.ok(readdirSync(cacheDir).some((f) => f.endsWith('.json.gz')), 'session cache is compressed');
  for (const f of readdirSync(cacheDir)) {
    const raw = readFileSync(join(cacheDir, f));
    assert.ok(!(f.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8').includes('Z'.repeat(40)), f);
  }
  assert.ok(!readFileSync(join(out, 'demo', `${U1}.html`), 'utf8').includes('Z'.repeat(40)));
});



test('temp and scratch folders are not reported as empty projects; legal page is written', async () => {
  const root = makeTree({
    [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl',
    [`-private-tmp/notes.txt`]: { text: 'x' },
    [`-private-var-folders-pd-abc-T-sr-out/notes.txt`]: { text: 'x' },
    [`-Users-me-Library-Application-Support-Claude-scratch-workspaces-1234/notes.txt`]: { text: 'x' },
    [`-Users-me-GitHub-old-project/notes.txt`]: { text: 'x' },
  });
  const out = tempDir('sr-out-scratch-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.deepEqual(r.emptyProjects, ['old-project']);
  assert.match(readFileSync(join(out, 'legal.html'), 'utf8'), /id="privacy"/);
});

test('Codex or Copilot logs copied into the Claude Code folder are skipped, not shown', async () => {
  const codex = [
    '{"type":"session_meta","timestamp":"2026-05-01T10:00:00.000Z","payload":{"id":"c1","cwd":"/tmp/codex-demo"}}',
    '{"type":"response_item","timestamp":"2026-05-01T10:00:01.000Z","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Fix the build"}]}}',
  ].join('\n') + '\n';
  const copilot = [
    '{"type":"session.start","data":{"sessionId":"c2","version":1},"id":"e1","timestamp":"2026-05-01T10:00:00.000Z","parentId":null}',
    '{"type":"user.message","data":{"content":"Add an export button","messageId":"m1"},"id":"e2","timestamp":"2026-05-01T10:00:01.000Z","parentId":"e1"}',
  ].join('\n') + '\n';
  const root = makeTree({
    [`-tmp-copied/${U1}.jsonl`]: { text: codex },
    [`-tmp-copied/${U2}.jsonl`]: { text: copilot },
  });
  const out = tempDir('sr-out-');
  const r = await build({ projectsRoot: root, out, run: noGit, log: quiet });
  assert.equal(r.processed, 0);
  assert.deepEqual(r.perProject, {});
  assert.equal(existsSync(join(out, 'index.html')), true);
});
