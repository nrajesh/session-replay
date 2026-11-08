// Orchestrates a build: find transcripts, (re)process changed ones, write pages and indexes.
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { listSessionFiles, listProjectDirs } from './discover.ts';
import { parseSession } from './parse.ts';
import { resolveProject, commitsForSession, projectMilestones, projectNameFromDir, defaultRunner, type GitRunner, type Milestone } from './git.ts';
import { buildCheckpoints, attributeCommits } from './link.ts';
import { summarizeUsage } from './usage.ts';
import { redact } from './redact.ts';
import { loadState, saveState, signature, RISK_VERSION } from './state.ts';
import { writeFileAtomic } from './fsutil.ts';
import { pruneArchive, sourceGone } from './archive.ts';
import { CLAUDE_DEFAULT_DAYS } from './claudehistory.ts';
import { cacheExists, compressPlain, readCacheJson, removeCacheJson, writeCacheJson } from './zjson.ts';
import { renderSession, renderCloudSession, renderProjectIndex, renderOverallIndex, renderProjectsPage, renderUsage, renderLegal, type ProjectPage, type SiteInfo } from './render/index.ts';
import type { SessionModel, SessionSummary } from './types.ts';

export interface BuildOptions {
  projectsRoot: string;
  out: string;
  project?: string;
  since?: string;
  force?: boolean;
  only?: string;
  include?: string[];
  /** Pro edition: GitHub links, PR titles, cloud sessions, People and Ask notes. */
  pro?: boolean;
  theme?: 'auto' | 'light' | 'dark';
  exclude?: string[];
  /** Days to keep sessions in the archive (0 = forever). Older sessions are removed at the start of a build. */
  archiveDays?: number;
  /** How long Claude Code keeps its own transcripts; tells its cleanup apart from other deletions. */
  claudeHistoryDays?: number;
  run?: GitRunner;
  log?: (s: string) => void;
}

export interface BuildReport {
  processed: number;
  skipped: number;
  perProject: Record<string, number>;
  emptyProjects: string[];
  unreadable: { file: string; reason: string }[];
  /** Transcripts with no timestamped messages (nothing to show). */
  emptySessions: number;
  warnings: number;
  /** Mapped GitHub accounts that could not be used (the active account was used instead). */
  githubWarnings: string[];
  out: string;
}

export function redactDeep<T>(v: T): T {
  if (typeof v === 'string') return redact(v) as T;
  if (Array.isArray(v)) return v.map(redactDeep) as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = redactDeep(x);
    return o as T;
  }
  return v;
}

export interface MemoryNote { file: string; name: string; description: string; type: string; body: string }

const MEMORY_MAX_FILES = 40;
const MEMORY_MAX_CHARS = 4000;
const RENDER_VERSION = 97;


export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

const shortHash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 6);

function toSummary(m: SessionModel, projectSlug: string): SessionSummary {
  const { turns, ...rest } = m;
  const prompts = turns.filter((t) => t.role === 'user').map((t) => t.text.slice(0, 600));
  return { ...rest, prompts, projectSlug };
}

function readJson<T>(f: string): T | undefined {
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as T;
  } catch {
    return undefined;
  }
}


/** Temp and app-scratch folders (e.g. /private/tmp, /var/folders, Claude scratch workspaces) are not projects. */
/** One transcript to read: Claude Code here; Pro adds Codex and Copilot. */
interface SourceFile {
  agent: SessionModel['agent'];
  file: string;
  sessionId: string;
  projectDir: string;
  subagentFiles: string[];
  stateKey?: string;
  extraFiles?: string[];
}

function isScratchDir(dir: string): boolean {
  return /^-(private-)?(tmp|var-folders)(-|$)|-Library-Application-Support-|-scratch-workspaces-/.test(dir);
}

export async function build(opts: BuildOptions): Promise<BuildReport> {
  const run = opts.run ?? defaultRunner;
  const log = opts.log ?? ((s: string) => console.log(s));
  const out = opts.out;
  const cache = join(out, '.cache');
  if (opts.archiveDays) pruneArchive(out, opts.archiveDays);
  const state = loadState(out);
  const report: BuildReport = { processed: 0, skipped: 0, perProject: {}, emptyProjects: [], unreadable: [], emptySessions: 0, warnings: 0, githubWarnings: [], out };
  const sinceMs = opts.since ? Date.parse(opts.since) : undefined;
  const touchedProjects = new Set<string>();

  const projectRoots = [opts.projectsRoot];
  const files: SourceFile[] = (await Promise.all(projectRoots.map(listSessionFiles))).flat()
    .map((sf) => ({ agent: 'claude-code' as const, file: sf.file, sessionId: sf.sessionId, projectDir: sf.projectDir, subagentFiles: sf.subagentFiles }));
  for (const sf of files) {
    if (opts.only && sf.file !== opts.only) continue;
    const sig = signature([sf.file, ...sf.subagentFiles, ...(sf.extraFiles ?? [])]);
    const stateKey = sf.stateKey ?? sf.file;
    const prev = state.sessions[stateKey];
    if (sinceMs !== undefined && statSync(sf.file).mtimeMs < sinceMs) continue;
    if (opts.project && prev && !opts.force) {
      const sum = readCacheJson<SessionSummary>(join(cache, `${prev.id}.summary.json`));
      if (sum && sum.projectName.toLowerCase() !== opts.project.toLowerCase()) continue;
    }
    if (!opts.force && prev && prev.sig === sig && (prev.empty || (prev.rv === RISK_VERSION && cacheExists(join(cache, `${prev.id}.summary.json`))))) {
      if (prev.empty) {
        report.emptySessions++;
        continue;
      }
      report.skipped++;
      continue;
    }
    let model: SessionModel | undefined;
    try {
      model ??= await parseSession(sf.file, sf.subagentFiles);
    } catch (e) {
      report.unreadable.push({ file: sf.file, reason: (e as Error).message });
      continue;
    }
    if (!model.start || !model.turns.length) {
      state.sessions[stateKey] = { sig, id: model.id, projectSlug: '', empty: true };
      report.emptySessions++;
      continue;
    }
    // Sessions past the archive window are not kept, even when their transcript is still on disk.
    if (opts.archiveDays && Date.parse(model.end || model.start) < Date.now() - opts.archiveDays * 86_400_000) continue;
    let proj: Awaited<ReturnType<typeof resolveProject>> = await resolveProject(model.cwd, sf.projectDir, run);
    if (opts.project && proj.projectName.toLowerCase() !== opts.project.toLowerCase()) continue;
    const lname = proj.projectName.toLowerCase();
    if (opts.include?.length && !opts.include.some((p) => p.toLowerCase() === lname)) continue;
    if (opts.exclude?.some((p) => p.toLowerCase() === lname)) continue;
    model.projectKey = proj.projectKey;
    model.projectName = proj.projectName;
    model.repoPath = proj.repoPath;
    model.warnings.push(...proj.warnings);
    if (proj.repoPath) model.commits = attributeCommits(model, await commitsForSession(proj.repoPath, model.start, model.end, model.commitHashesInOutput, run));
    model.checkpoints = buildCheckpoints(model);
    summarizeUsage(model);
    model = redactDeep(model);
    const slug = slugify(model.projectName);
    writeCacheJson(join(cache, `${model.id}.json`), model);
    writeCacheJson(join(cache, `${model.id}.summary.json`), toSummary(model, slug));
    state.sessions[stateKey] = { sig, id: model.id, projectSlug: slug, rv: RISK_VERSION };
    touchedProjects.add(model.projectKey);
    report.processed++;
    report.warnings += model.warnings.length;
    log(`processed ${model.projectName} / ${model.title}`);
  }
  // Transcripts deleted from disk keep their pages (that history is the point), so state is not pruned.
  saveState(out, state);
  // Cache files from older versions are plain JSON; compress them once.
  for (const e of Object.values(state.sessions)) {
    if (e.empty) continue;
    compressPlain(join(cache, `${e.id}.json`));
    compressPlain(join(cache, `${e.id}.summary.json`));
  }

  // Gather every known session summary and settle project slugs (collisions get a short suffix).
  const summaries = Object.entries(state.sessions)
    .filter(([, e]) => !e.empty)
    .map(([key, e]) => {
      const s = readCacheJson<SessionSummary>(join(cache, `${e.id}.summary.json`));
      if (!s) return undefined;
      const gone = sourceGone(key, s.agent, opts.claudeHistoryDays ?? CLAUDE_DEFAULT_DAYS, s.end || s.start);
      if (gone) s.sourceGone = gone; else delete s.sourceGone;
      return s;
    })
    .filter((s): s is SessionSummary => !!s);
  const byFolder = new Map<string, SessionSummary>();
  for (const s of summaries) if (!s.projectKey.startsWith('dir:')) byFolder.set(dirname(s.file), s);
  for (const s of summaries) {
    const sib = s.projectKey.startsWith('dir:') ? byFolder.get(dirname(s.file)) : undefined;
    if (sib) Object.assign(s, { projectKey: sib.projectKey, projectName: sib.projectName, repoPath: sib.repoPath });
  }
  const projectIsIncluded = (name: string) => {
    const normalized = name.toLowerCase();
    return (!opts.include?.length || opts.include.some((p) => p.toLowerCase() === normalized))
      && !opts.exclude?.some((p) => p.toLowerCase() === normalized);
  };
  summaries.splice(0, summaries.length, ...summaries.filter((s) => projectIsIncluded(s.projectName)));
  const keysBySlug = new Map<string, Set<string>>();
  for (const s of summaries) {
    const base = slugify(s.projectName);
    if (!keysBySlug.has(base)) keysBySlug.set(base, new Set());
    keysBySlug.get(base)!.add(s.projectKey);
  }
  const slugFor = (s: SessionSummary) => {
    const base = slugify(s.projectName);
    return keysBySlug.get(base)!.size > 1 ? `${base}-${shortHash(s.projectKey)}` : base;
  };

  const projects = new Map<string, ProjectPage>();
  for (const s of summaries) {
    s.projectSlug = slugFor(s);
    let p = projects.get(s.projectKey);
    if (!p) projects.set(s.projectKey, (p = { name: s.projectName, slug: s.projectSlug, repoPath: s.repoPath, sessions: [], milestones: [] }));
    if (!p.repoPath && s.repoPath) p.repoPath = s.repoPath;
    p.sessions.push(s);
  }


  for (const p of projects.values()) {
    p.sessions.sort((a, b) => b.start.localeCompare(a.start));
    const mfile = join(cache, `milestones-${p.slug}.json`);
    let ms = readJson<Milestone[]>(mfile);
    if (p.repoPath && (!ms || touchedProjects.has(p.sessions[0].projectKey))) {
      ms = await projectMilestones(p.repoPath, run);
      writeFileAtomic(mfile, JSON.stringify(ms));
    }
    p.milestones = ms ?? [];
    report.perProject[p.name] = p.sessions.length;
  }
  const renderKey = `${RENDER_VERSION}|${opts.pro ? 'pro' : 'free'}|${opts.theme ?? 'auto'}`;
  const renderAll = state.renderKey !== renderKey;
  state.renderKey = renderKey;
  // Session pages: (re)render processed ones, and any whose page is missing (e.g. slug changed).
  for (const [file, e] of Object.entries(state.sessions)) {
    const sum = summaries.find((x) => x.id === e.id);
    if (!sum) continue;
    const page = join(out, sum.projectSlug, `${e.id}.html`);
    const changed = renderAll || touchedProjects.has(sum.projectKey) || !existsSync(page) || e.projectSlug !== sum.projectSlug || (e.gone ?? '') !== (sum.sourceGone ?? '');
    if (!changed) continue;
    const model = readCacheJson<SessionModel>(join(cache, `${e.id}.json`));
    if (!model) continue;
    const proj = projects.get(sum.projectKey);
    writeFileAtomic(page, renderSession(model, { projectName: sum.projectName, webUrl: proj?.webUrl, prs: proj?.prs, pro: !!opts.pro, theme: opts.theme, sourceGone: sum.sourceGone }));
    state.sessions[file].projectSlug = sum.projectSlug;
    if (sum.sourceGone) state.sessions[file].gone = sum.sourceGone; else delete state.sessions[file].gone;
  }
  saveState(out, state);

  const known = new Set([...projects.values()].map((p) => p.name.toLowerCase()));
  for (const root of projectRoots) {
    for (const dir of await listProjectDirs(root)) {
      if (dir.includes('--claude-worktrees-') || isScratchDir(dir)) continue;
      const hasSessions = readdirSync(join(root, dir)).some((n) => n.endsWith('.jsonl'));
      const name = projectNameFromDir(dir);
      if (!hasSessions && !known.has(name.toLowerCase())) report.emptyProjects.push(name);
    }
  }
  report.emptyProjects = [...new Set(report.emptyProjects)].sort();

  const site: SiteInfo = { generatedAt: new Date().toISOString(), emptyProjects: report.emptyProjects, unreadable: report.unreadable, pro: !!opts.pro, theme: opts.theme };
  const list = [...projects.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of list) writeFileAtomic(join(out, p.slug, 'index.html'), renderProjectIndex(p, site));
  writeFileAtomic(join(out, 'index.html'), renderOverallIndex(list, site));
  writeFileAtomic(join(out, 'projects.html'), renderProjectsPage(list, site));
  writeFileAtomic(join(out, 'usage.html'), renderUsage(list, site));
  writeFileAtomic(join(out, 'legal.html'), renderLegal(site));
  return report;
}
