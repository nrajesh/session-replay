// Claude Code deletes sessions after `cleanupPeriodDays` in its own settings file (30 days when unset).
// Session Replay reads that value for Settings and changes it only when the user confirms.
import { readFileSync } from 'node:fs';

export const CLAUDE_DEFAULT_DAYS = 30;

/** How long Claude Code keeps sessions. Unreadable or missing files read as its default. */
export function readClaudeHistory(path: string): { days: number; explicit: boolean } {
  try {
    const days = JSON.parse(readFileSync(path, 'utf8'))?.cleanupPeriodDays;
    if (Number.isInteger(days) && days > 0) return { days, explicit: true };
  } catch {}
  return { days: CLAUDE_DEFAULT_DAYS, explicit: false };
}

