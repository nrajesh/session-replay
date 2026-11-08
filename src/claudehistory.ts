// Claude Code deletes sessions after `cleanupPeriodDays` in its own settings file (30 days when unset).
// Session Replay reads that value for Settings and changes it only when the user confirms.
import { existsSync, readFileSync } from 'node:fs';
import { writeFileAtomic } from './fsutil.ts';
import { backup } from './hook.ts';

export const CLAUDE_DEFAULT_DAYS = 30;
export const CLAUDE_MAX_DAYS = 3650;

/** How long Claude Code keeps sessions. Unreadable or missing files read as its default. */
export function readClaudeHistory(path: string): { days: number; explicit: boolean } {
  try {
    const days = JSON.parse(readFileSync(path, 'utf8'))?.cleanupPeriodDays;
    if (Number.isInteger(days) && days > 0) return { days, explicit: true };
  } catch {}
  return { days: CLAUDE_DEFAULT_DAYS, explicit: false };
}

/** Sets cleanupPeriodDays, keeping every other key. Saves a backup first; refuses a file that is not valid JSON. */
export function writeClaudeHistory(path: string, days: number): { backup?: string } {
  if (!Number.isInteger(days) || days < 1 || days > CLAUDE_MAX_DAYS) throw new Error(`Days must be a whole number from 1 to ${CLAUDE_MAX_DAYS}.`);
  let settings: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      settings = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error(`${path} is not valid JSON. Fix it, then try again.`);
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error(`${path} is not valid JSON. Fix it, then try again.`);
  }
  const saved = backup(path);
  settings.cleanupPeriodDays = days;
  writeFileAtomic(path, JSON.stringify(settings, null, 2) + '\n');
  return { backup: saved };
}
