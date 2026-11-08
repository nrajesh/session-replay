// Remembers which transcripts were already processed, so only changed ones are re-read.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomic } from './fsutil.ts';

/** Bump when the model or page format changes so every session is rebuilt once. */
export const MODEL_VERSION = 8;

/** Bump when a new check reads more from transcripts (sessions with a transcript are read again once). */
export const RISK_VERSION = 6;

export interface StateEntry { sig: string; id: string; projectSlug: string; empty?: boolean; /** RISK_VERSION the session was read with */ rv?: number; /** sourceGone value the page was last rendered with */ gone?: string }
export interface State { version: number; sessions: Record<string, StateEntry>; renderKey?: string }

export function loadState(out: string): State {
  try {
    const s = JSON.parse(readFileSync(join(out, '.state.json'), 'utf8')) as State;
    if (s.version === MODEL_VERSION && s.sessions) return s;
    // A newer format never drops the archive: sessions whose transcript is gone are the only copy left.
    // Every entry is marked to be re-read when its file still exists; the rest stay as saved.
    if (s.sessions && typeof s.sessions === 'object') {
      for (const e of Object.values(s.sessions)) e.sig = '';
      return { ...s, version: MODEL_VERSION, renderKey: undefined };
    }
  } catch {}
  return { version: MODEL_VERSION, sessions: {} };
}

export function saveState(out: string, s: State): void {
  writeFileAtomic(join(out, '.state.json'), JSON.stringify(s));
}

export function signature(files: string[]): string {
  return files
    .map((f) => {
      if (!existsSync(f)) return `${f}:missing`;
      const st = statSync(f);
      return `${st.size}:${Math.floor(st.mtimeMs)}`;
    })
    .join('|');
}
