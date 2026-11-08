// What the archive holds and for how long: pruning by age, forgetting one session, and spotting sources that disappeared.
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { writeFileAtomic } from './fsutil.ts';
import type { State, StateEntry } from './state.ts';
import type { SessionSummary } from './types.ts';
import { readCacheJson, removeCacheJson } from './zjson.ts';

const DAY = 86_400_000;

export interface ArchivedSession { key: string; id: string; projectSlug: string; end: string }

function loadStateFile(out: string): State | undefined {
  try { return JSON.parse(readFileSync(join(out, '.state.json'), 'utf8')) as State; } catch { return undefined; }
}

/** Does the transcript still exist? Codex may keep only a compressed copy (`.zst`) of its rollout. */
export const sourceExists = (stateKey: string): boolean => existsSync(stateKey) || existsSync(stateKey + '.zst');

/** Sessions whose last activity is older than `days` days. `days` of 0 keeps everything. */
export function sessionsOlderThan(out: string, days: number, now = Date.now()): ArchivedSession[] {
  if (!(days > 0)) return [];
  const st = loadStateFile(out);
  const cutoff = now - days * DAY;
  const found: ArchivedSession[] = [];
  for (const [key, e] of Object.entries(st?.sessions ?? {})) {
    if (e.empty) continue;
    const sum = readCacheJson<SessionSummary>(join(out, '.cache', `${e.id}.summary.json`));
    const last = Date.parse(sum?.end || sum?.start || '');
    if (Number.isFinite(last) && last < cutoff) found.push({ key, id: e.id, projectSlug: e.projectSlug, end: sum?.end || sum?.start || '' });
  }
  return found;
}

/** Deletes one session's cache and page. The project folder goes too when no session page is left in it. */
function removeSession(out: string, e: Pick<StateEntry, 'id' | 'projectSlug'>): void {
  removeCacheJson(join(out, '.cache', `${e.id}.json`));
  removeCacheJson(join(out, '.cache', `${e.id}.summary.json`));
  const root = resolve(out);
  const dir = resolve(root, e.projectSlug || '.');
  if (!e.projectSlug || !/^[\w.-]+$/.test(e.projectSlug) || !dir.startsWith(root + sep)) return;
  rmSync(join(dir, `${e.id}.html`), { force: true });
  try {
    if (!readdirSync(dir).some((f) => f.endsWith('.html') && f !== 'index.html')) rmSync(dir, { recursive: true, force: true });
  } catch {}
}

/** Removes sessions older than `days` days from the archive. Returns how many were removed. */
export function pruneArchive(out: string, days: number, now = Date.now()): number {
  const old = sessionsOlderThan(out, days, now);
  if (!old.length) return 0;
  const st = loadStateFile(out)!;
  for (const s of old) {
    removeSession(out, s);
    delete st.sessions[s.key];
  }
  writeFileAtomic(join(out, '.state.json'), JSON.stringify(st));
  return old.length;
}

/** Removes one session whose transcript is gone. A session whose transcript still exists is left alone (the next build would add it back). */
export function forgetSession(out: string, id: string): boolean {
  const st = loadStateFile(out);
  const hit = Object.entries(st?.sessions ?? {}).find(([, e]) => e.id === id && !e.empty);
  if (!st || !hit || sourceExists(hit[0])) return false;
  removeSession(out, hit[1]);
  delete st.sessions[hit[0]];
  writeFileAtomic(join(out, '.state.json'), JSON.stringify(st));
  return true;
}

/**
 * Why an archived session has no transcript any more, or undefined when it still has one.
 * 'cleanup': Claude Code's own cleanup (older than its keep period). 'disk': anything else. Nobody claims to know who deleted it.
 */
export function sourceGone(stateKey: string, agent: string | undefined, claudeDays: number, lastActivity: string, now = Date.now(), exists: (key: string) => boolean = sourceExists): 'cleanup' | 'disk' | undefined {
  if (exists(stateKey)) return undefined;
  const last = Date.parse(lastActivity);
  return agent === 'claude-code' && Number.isFinite(last) && now - last > claudeDays * DAY ? 'cleanup' : 'disk';
}
