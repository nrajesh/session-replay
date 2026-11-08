// Read-only git access: repo resolution, commits made during a session, version milestones.
import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import type { CommitRef } from './types.ts';

export type GitRunner = (cwd: string, args: string[]) => Promise<string | null>;

export const defaultRunner: GitRunner = (cwd, args) =>
  new Promise((resolve) => {
    execFile('git', ['--no-optional-locks', ...args], { cwd, timeout: 10_000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => resolve(err ? null : stdout));
  });

const US = '\x1f';
const WORKTREE = /\/\.claude\/worktrees\/[^/]+.*$/;

export interface ProjectInfo { projectKey: string; projectName: string; repoPath?: string; warnings: string[] }

export function projectNameFromDir(dir: string): string {
  return dir.replace(/^-Users-[^-]+-/, '').replace(/^(GitHub|Github|github)-/, '') || dir;
}

function realCase(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    return p;
  }
}

async function gitTopLevel(dir: string, run: GitRunner): Promise<string | undefined> {
  if (!existsSync(dir)) return undefined;
  const out = await run(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const common = out?.trim();
  if (!common) return undefined;
  return common.endsWith('/.git') ? dirname(common) : common.replace(/\/\.git\/?$/, '');
}

export async function resolveProject(cwd: string | undefined, projectDir: string, run: GitRunner): Promise<ProjectInfo> {
  if (!cwd) {
    const name = projectNameFromDir(projectDir);
    return { projectKey: `dir:${projectDir.toLowerCase()}`, projectName: name, warnings: ['no working folder recorded'] };
  }
  const candidates = [cwd, cwd.replace(WORKTREE, '')].filter((v, i, a) => a.indexOf(v) === i);
  for (const c of candidates) {
    const top = await gitTopLevel(c, run);
    if (top) {
      const repoPath = realCase(top);
      return { projectKey: repoPath.toLowerCase(), projectName: basename(repoPath), repoPath, warnings: [] };
    }
  }
  const guess = realCase(cwd.replace(WORKTREE, ''));
  return { projectKey: guess.toLowerCase(), projectName: basename(guess), warnings: [`repo not found for ${cwd}`] };
}

const shift = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();

export async function commitsForSession(repo: string, start: string, end: string, hashes: string[], run: GitRunner): Promise<CommitRef[]> {
  if (!start || !end) return [];
  const byHash = new Map<string, CommitRef>();
  const me = (await run(repo, ['config', 'user.email']))?.trim().toLowerCase();
  const log = await run(repo, ['log', '--all', `--since=${shift(start, -5)}`, `--until=${shift(end, 5)}`, `--format=%H${US}%cI${US}%ce${US}%s`]);
  for (const line of (log ?? '').split('\n')) {
    const [hash, at, email, ...rest] = line.split(US);
    if (!hash || !at) continue;
    if (me && email?.toLowerCase() !== me) continue;
    byHash.set(hash, { hash, at: new Date(at).toISOString(), subject: rest.join(US), files: [], added: 0, removed: 0, via: ['window'] });
  }
  for (const short of hashes) {
    const full = (await run(repo, ['rev-parse', '--verify', '--quiet', `${short}^{commit}`]))?.trim();
    if (!full) continue;
    const known = byHash.get(full);
    if (known) {
      if (!known.via.includes('output')) known.via.push('output');
      continue;
    }
    const info = await run(repo, ['show', '-s', `--format=%H${US}%cI${US}%s`, full]);
    const [hash, at, ...rest] = (info ?? '').trim().split(US);
    if (!hash || !at) continue;
    byHash.set(hash, { hash, at: new Date(at).toISOString(), subject: rest.join(US), files: [], added: 0, removed: 0, via: ['output'] });
  }
  const commits = [...byHash.values()].sort((a, b) => a.at.localeCompare(b.at));
  if (commits.length) {
    const stat = await run(repo, ['show', '--numstat', '--format=%x1e%H', ...commits.map((c) => c.hash)]);
    for (const chunk of (stat ?? '').split('\x1e').slice(1)) {
      const [hash, ...lines] = chunk.split('\n');
      const c = byHash.get(hash.trim());
      if (!c) continue;
      for (const l of lines) {
        const m = l.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
        if (!m) continue;
        c.files.push(m[3]);
        if (m[1] !== '-') c.added += Number(m[1]);
        if (m[2] !== '-') c.removed += Number(m[2]);
      }
    }
  }
  return commits;
}

export interface Milestone { at: string; kind: 'tag' | 'pr' | 'version'; label: string; hash: string }

export async function projectMilestones(repo: string, run: GitRunner): Promise<Milestone[]> {
  const out: Milestone[] = [];
  const tags = await run(repo, ['for-each-ref', 'refs/tags', `--format=%(refname:short)${US}%(creatordate:iso-strict)${US}%(objectname)`]);
  for (const l of (tags ?? '').split('\n')) {
    const [name, at, hash] = l.split(US);
    if (name && at) out.push({ at: new Date(at).toISOString(), kind: 'tag', label: name, hash: hash ?? '' });
  }
  const seenPr = new Map<string, Milestone>();
  const log = await run(repo, ['log', '--all', `--format=%H${US}%cI${US}%s`]);
  for (const l of (log ?? '').split('\n')) {
    const [hash, at, ...rest] = l.split(US);
    const subject = rest.join(US);
    const m = subject.match(/\(#(\d+)\)\s*$/) ?? subject.match(/^Merge pull request #(\d+)/);
    if (!hash || !at || !m) continue;
    const ms: Milestone = { at: new Date(at).toISOString(), kind: 'pr', label: `PR #${m[1]}`, hash };
    const prev = seenPr.get(m[1]);
    if (!prev || ms.at < prev.at) seenPr.set(m[1], ms);
  }
  out.push(...seenPr.values());
  const bumps = await run(repo, ['log', '--all', `--format=%H${US}%cI`, '-G"version"', '--', 'package.json']);
  const versionCommits = (bumps ?? '').split('\n').map((l) => l.split(US)).filter((p) => p[0] && p[1]).reverse().slice(-200);
  let last = '';
  for (const [hash, at] of versionCommits) {
    const pkg = await run(repo, ['show', `${hash}:package.json`]);
    let v = '';
    try {
      v = String(JSON.parse(pkg ?? '').version ?? '');
    } catch {
      continue;
    }
    if (v && v !== last) out.push({ at: new Date(at).toISOString(), kind: 'version', label: v, hash });
    if (v) last = v;
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
