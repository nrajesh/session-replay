import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listSessionFiles, listProjectDirs } from '../src/discover.ts';
import { makeTree } from './helpers.ts';
import { fixture } from './helpers.ts';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

test('lists top-level session files and attaches subagent transcripts', async () => {
  const root = makeTree({
    [`-Users-me-GitHub-demo/${U1}.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U1}/subagents/agent-a1.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/${U2}.jsonl`]: 'basic.fixture.jsonl',
    [`-Users-me-GitHub-demo/vercel-plugin/skill-injections.jsonl`]: { text: '{}\n' },
    [`-Users-me-GitHub-empty/vercel-plugin/skill-injections.jsonl`]: { text: '{}\n' },
    [`-Users-me-GitHub-demo/memory/notes.md`]: { text: 'x' },
  });
  const files = await listSessionFiles(root);
  assert.equal(files.length, 2);
  const s1 = files.find((f) => f.sessionId === U1)!;
  assert.equal(s1.projectDir, '-Users-me-GitHub-demo');
  assert.equal(s1.subagentFiles.length, 1);
  assert.match(s1.subagentFiles[0], /agent-a1\.jsonl$/);
  assert.deepEqual((await listProjectDirs(root)).sort(), ['-Users-me-GitHub-demo', '-Users-me-GitHub-empty']);
});

test('missing projects root yields no sessions', async () => {
  assert.deepEqual(await listSessionFiles('/nonexistent/path/xyz'), []);
});
