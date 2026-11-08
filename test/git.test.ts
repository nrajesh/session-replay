import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProject, commitsForSession, projectMilestones, projectNameFromDir, type GitRunner } from '../src/git.ts';
import { tempDir } from './helpers.ts';

const US = '\x1f';
function fakeGit(table: Record<string, string>, calls: string[] = []): GitRunner {
  return async (cwd, args) => {
    const key = `${cwd} :: ${args.join(' ')}`;
    calls.push(key);
    for (const [k, v] of Object.entries(table)) if (key === k || (k.endsWith('*') && key.startsWith(k.slice(0, -1)))) return v;
    return null;
  };
}

test('worktree path that no longer exists maps to its main repo by path', async () => {
  const root = tempDir();
  const repo = join(root, 'shop');
  mkdirSync(repo);
  const run = fakeGit({ [`${repo} :: rev-parse --path-format=absolute --git-common-dir`]: `${repo}/.git\n` });
  const p = await resolveProject(join(repo, '.claude/worktrees/stock-prices-sheet'), 'dir', run);
  assert.equal(p.repoPath, repo);
  assert.equal(p.projectName, 'shop');
  assert.equal(p.projectKey, repo.toLowerCase());
});

test('existing worktree resolves through git common dir', async () => {
  const root = tempDir();
  const wt = join(root, 'repo-wt');
  mkdirSync(wt);
  const run = fakeGit({ [`${wt} :: rev-parse --path-format=absolute --git-common-dir`]: `${root}/Main/.git\n` });
  const p = await resolveProject(wt, 'dir', run);
  assert.equal(p.repoPath, `${root}/Main`);
  assert.equal(p.projectName, 'Main');
});

test('paths that differ only in case share one project key', async () => {
  const run = fakeGit({});
  const a = await resolveProject('/nowhere/Github/demo', 'd', run);
  const b = await resolveProject('/nowhere/GitHub/demo', 'd', run);
  assert.equal(a.projectKey, b.projectKey);
  assert.equal(a.repoPath, undefined);
  assert.match(a.warnings.join(), /repo not found/);
});

test('no cwd falls back to the encoded folder name', async () => {
  const p = await resolveProject(undefined, '-Users-me-GitHub-budget-it', fakeGit({}));
  assert.equal(p.projectName, 'budget-it');
  assert.equal(projectNameFromDir('-Users-me-budget-agent'), 'budget-agent');
});

test('commits found by time window and by output are merged, unknown hashes dropped', async () => {
  const R = '/r';
  const run = fakeGit({
    [`${R} :: config user.email`]: 'me@x\n',
    [`${R} :: log --all --since=2026-05-01T09:55:00.000Z --until=2026-05-01T11:05:00.000Z --format=%H${US}%cI${US}%ce${US}%s`]:
      [`aaaaaaa1111${US}2026-05-01T10:10:00+00:00${US}me@x${US}feat: one`,
       `bbbbbbb2222${US}2026-05-01T10:40:00+00:00${US}other@y${US}someone else`,
       `ccccccc3333${US}2026-05-01T10:50:00+00:00${US}me@x${US}fix: two`].join('\n'),
    [`${R} :: rev-parse --verify --quiet ccccccc^{commit}`]: 'ccccccc3333\n',
    [`${R} :: rev-parse --verify --quiet ddddddd^{commit}`]: 'ddddddd4444\n',
    [`${R} :: show -s --format=%H${US}%cI${US}%s ddddddd4444`]: `ddddddd4444${US}2026-05-01T12:00:00+00:00${US}late push`,
    [`${R} :: show --numstat --format=%x1e%H aaaaaaa1111 ccccccc3333 ddddddd4444`]:
      '\x1eaaaaaaa1111\n\n3\t1\tsrc/a.ts\n-\t-\timg.png\n\x1eccccccc3333\n\n2\t2\tsrc/b.ts\n\x1eddddddd4444\n\n1\t0\tREADME.md\n',
  });
  const commits = await commitsForSession(R, '2026-05-01T10:00:00.000Z', '2026-05-01T11:00:00.000Z', ['ccccccc', 'ddddddd', 'eeeeeee'], run);
  assert.deepEqual(commits.map((c) => c.hash), ['aaaaaaa1111', 'ccccccc3333', 'ddddddd4444']);
  assert.deepEqual(commits[1].via, ['window', 'output']);
  assert.deepEqual(commits[2].via, ['output']);
  assert.deepEqual(commits[0].files, ['src/a.ts', 'img.png']);
  assert.equal(commits[0].added, 3);
  assert.equal(commits[0].removed, 1);
});

test('git failure yields no commits rather than an error', async () => {
  assert.deepEqual(await commitsForSession('/r', '2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z', ['abc1234'], fakeGit({})), []);
});

test('milestones: tags, merged PRs and package.json version bumps', async () => {
  const R = '/r';
  const run = fakeGit({
    [`${R} :: for-each-ref refs/tags --format=%(refname:short)${US}%(creatordate:iso-strict)${US}%(objectname)`]: `v1.0.0${US}2026-04-01T10:00:00+00:00${US}t1\n`,
    [`${R} :: log --all --format=%H${US}%cI${US}%s`]: [
      `h3${US}2026-04-20T10:00:00+00:00${US}Merge pull request #7 from a/b`,
      `h2${US}2026-04-10T10:00:00+00:00${US}feat: thing (#5)`,
      `h1${US}2026-04-05T10:00:00+00:00${US}chore: nothing`].join('\n'),
    [`${R} :: log --all --format=%H${US}%cI -G"version" -- package.json`]: `v2${US}2026-04-15T00:00:00+00:00\nv1${US}2026-04-02T00:00:00+00:00\n`,
    [`${R} :: show v1:package.json`]: '{"version":"1.0.0"}',
    [`${R} :: show v2:package.json`]: '{"version":"1.1.0"}',
  });
  const ms = await projectMilestones(R, run);
  assert.deepEqual(ms.map((m) => `${m.kind}:${m.label}`), ['tag:v1.0.0', 'version:1.0.0', 'pr:PR #5', 'version:1.1.0', 'pr:PR #7']);
});
