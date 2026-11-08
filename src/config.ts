// User settings: one JSON file with sensible defaults. Available in every edition.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './fsutil.ts';

export interface Config {
  projectsDir: string;
  outDir: string;
  /** Days Session Replay keeps in its archive (0 = forever). Older sources are skipped and older sessions removed. Old name: lookbackDays. */
  archiveDays: number;
  includeProjects: string[];
  excludeProjects: string[];
  theme: 'auto' | 'light' | 'dark';
  extraRedactions: string[];
  warnings: string[];
  path: string;
}

type Env = Record<string, string | undefined>;
const KEYS = [
  'projectsDir', 'outDir', 'archiveDays', 'lookbackDays', 'includeProjects', 'excludeProjects', 'theme', 'extraRedactions',
] as const;
type Key = (typeof KEYS)[number];

export const DEFAULT_OUT = fileURLToPath(new URL('../replays', import.meta.url));

export function configPath(env: Env = process.env): string {
  return env.SESSION_REPLAY_CONFIG ?? join(env.HOME ?? '', '.config', 'session-replay', 'config.json');
}


const expand = (p: string, env: Env) => (p === '~' ? env.HOME ?? '' : p.startsWith('~/') ? join(env.HOME ?? '', p.slice(2)) : p);
const defaultProjectsDir = (env: Env) => join(env.CLAUDE_CONFIG_DIR ?? join(env.HOME ?? '', '.claude'), 'projects');

function check(key: Key, v: unknown): string | null {
  switch (key) {
    case 'projectsDir': case 'outDir': return typeof v === 'string' && v ? null : 'must be a folder path';
    case 'archiveDays': case 'lookbackDays': return Number.isInteger(v) && (v as number) >= 0 ? null : 'must be a whole number of days (0 = all)';
    case 'theme': return ['auto', 'light', 'dark'].includes(v as string) ? null : 'must be auto, light or dark';
    default: return Array.isArray(v) && v.every((x) => typeof x === 'string') ? null : 'must be a list of text values';
  }
}

export function loadConfig(opts: { path?: string; env?: Env } = {}): Config {
  const env = opts.env ?? process.env;
  const path = opts.path ?? configPath(env);
  const c: Config = {
    projectsDir: defaultProjectsDir(env),
    outDir: DEFAULT_OUT, archiveDays: 0, includeProjects: [], excludeProjects: [], theme: 'auto', extraRedactions: [], warnings: [], path,
  };
  if (existsSync(path)) {
    let raw: Record<string, unknown> = {};
    let hasArchiveDays = false;
    let legacyDays: number | undefined;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      c.warnings.push(`${path} is not valid JSON; using defaults`);
    }
    for (const [k, v] of Object.entries(raw)) {
      if (!(KEYS as readonly string[]).includes(k)) { c.warnings.push(`Unknown setting "${k}" ignored`); continue; }
      const err = check(k as Key, v);
      if (err) { c.warnings.push(`Setting "${k}" ${err}; using default`); continue; }
      if (k === 'lookbackDays') { legacyDays = v as number; continue; }
      if (k === 'archiveDays') hasArchiveDays = true;
      (c as any)[k] = typeof v === 'string' && (k === 'outDir' || k === 'projectsDir') ? expand(v, env) : v;
    }
    if (!hasArchiveDays && legacyDays !== undefined) c.archiveDays = legacyDays;
  }
  if (env.SESSION_REPLAY_PROJECTS) {
    c.projectsDir = env.SESSION_REPLAY_PROJECTS;
  }
  if (env.SESSION_REPLAY_OUT) c.outDir = env.SESSION_REPLAY_OUT;
  return c;
}


export function setConfigValue(path: string, key: string, value: string): void {
  if (key === 'lookbackDays') key = 'archiveDays';
  if (!(KEYS as readonly string[]).includes(key)) throw new Error(`Unknown setting "${key}". Settings: ${KEYS.join(', ')}`);
  let v: unknown = value;
  if (key === 'archiveDays') v = Number(value);
  else if (key.endsWith('Projects') || key === 'extraRedactions') v = value.split(',').map((s) => s.trim()).filter(Boolean);
  const err = check(key as Key, v);
  if (err) throw new Error(`"${key}" ${err}`);
  let cur: Record<string, unknown> = {};
  try { cur = JSON.parse(readFileSync(path, 'utf8')); } catch {}
  cur[key] = v;
  if (key === 'archiveDays') delete cur.lookbackDays;
  writeFileAtomic(path, JSON.stringify(cur, null, 2) + '\n');
}
