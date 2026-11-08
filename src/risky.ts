// Risky actions: destructive commands an AI agent ran, found in the commands recorded in its transcript.
// This reads what happened; it does not judge intent. Routine clean-ups (node_modules, dist, temp folders) are not flagged.
import type { SessionModel } from './types.ts';
import { hidePaths, hideUser, redact } from './redact.ts';

export type RiskyKind = 'delete-files' | 'reset-hard' | 'force-push' | 'delete-branch' | 'discard-changes' | 'drop-data';
export interface RiskyAction { at: string; kind: RiskyKind; command: string; /** what it hit: files, branch, database statement */ target?: string }
export interface Finding { kind: RiskyKind; target: string }

export const RISKY_LABEL: Record<RiskyKind, string> = {
  'delete-files': 'Deleted files',
  'reset-hard': 'Hard reset',
  'force-push': 'Force push',
  'delete-branch': 'Deleted branch',
  'discard-changes': 'Discarded changes',
  'drop-data': 'Dropped data',
};

/** Drops here-document bodies (`cat <<'EOF' ... EOF`): they are text, not commands. */
export function stripHeredocs(line: string): string {
  const lines = line.split('\n');
  const out: string[] = [];
  let end: string | undefined, dash = false;
  for (const l of lines) {
    if (end !== undefined) {
      if ((dash ? l.trim() : l) === end) end = undefined;
      continue;
    }
    out.push(l);
    const m = /<<(-?)\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_][\w]*))/.exec(l);
    if (m) { dash = m[1] === '-'; end = m[2] ?? m[3] ?? m[4]; }
  }
  return out.join('\n');
}

/** Splits a shell line into commands on unquoted && || ; | & and newlines, each as words with quotes removed. */
export function splitCommands(input: string): string[][] {
  const line = stripHeredocs(input);
  const out: string[][] = [];
  let words: string[] = [], word = '', has = false, q = '';
  const endWord = () => { if (has) words.push(word); word = ''; has = false; };
  const endCmd = () => { endWord(); if (words.length) out.push(words); words = []; };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = ''; else if (c === '\\' && q === '"' && i + 1 < line.length) word += line[++i]; else word += c; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (c === '\\' && i + 1 < line.length) { word += line[++i]; has = true; continue; }
    // 2>&1 and >&2 are redirects, not the end of a command
    if (c === '&' && /[<>]$/.test(word)) { word += c; has = true; continue; }
    if (c === ';' || c === '|' || c === '&' || c === '\n') { endCmd(); continue; }
    if (/\s/.test(c)) { endWord(); continue; }
    word += c; has = true;
  }
  endCmd();
  return out;
}

// Folders that tools rebuild on demand, and scratch space. Deleting these is normal work, not a risk.
const ROUTINE_DIRS = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.turbo', '.cache', '.parcel-cache', 'coverage', '__pycache__', 'target', '.venv', 'venv', 'tmp', '.medusa', '.svelte-kit', '.output', '.vite', '.expo', '.gradle', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox', 'DerivedData']);
const SCRATCH = /^(?:\/private)?\/(?:tmp|var\/folders)\/|\/scratchpad(?:\/|$)|\/\.claude\/worktrees\/|^\$\{?TMPDIR\b/;
/** True for a rm target that is routine clean-up: a build folder (at any depth) or scratch space. */
export function isRoutineTarget(t: string): boolean {
  if (SCRATCH.test(t)) return true;
  const parts = t.replace(/\/+$/, '').split('/').filter((x) => x && x !== '.' && x !== '*');
  return parts.length > 0 && ROUTINE_DIRS.has(parts[parts.length - 1]);
}
const DB_CLIENT = /^(?:psql|mysql|mariadb|sqlite3?|sqlcmd|sqlplus|mongosh|duckdb|clickhouse-client|bq|dropdb)$/;
const DROP = /\b(?:drop\s+(?:table|database|schema)|truncate\s+table)\b/i;

const flagsOf = (w: string[]) => w.filter((x) => x.startsWith('-') && x !== '-');
const shortFlag = (w: string[], ch: string) => flagsOf(w).some((f) => /^-[a-zA-Z]+$/.test(f) && f.includes(ch));

function gitSub(w: string[]): { sub: string; rest: string[] } {
  let i = 1;
  while (i < w.length && w[i].startsWith('-')) i += w[i] === '-C' || w[i] === '-c' || w[i] === '--git-dir' || w[i] === '--work-tree' ? 2 : 1;
  return { sub: w[i] ?? '', rest: w.slice(i + 1) };
}

/** Drops redirects (2>/dev/null, > file, 2>&1) so they are not read as targets. */
function withoutRedirects(a: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < a.length; i++) {
    if (/^\d*(?:>>?|<|&>)[&\w./-]+/.test(a[i]) || /^\d*&?>>?$|^<$/.test(a[i]) && ++i >= 0) continue;
    out.push(a[i]);
  }
  return out;
}

function findingsOf(words: string[], vars: Record<string, string> = {}): Finding[] {
  let w = words;
  while (w[0] === 'sudo' || w[0] === 'env' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0] ?? '')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(w[0]);
    if (m) vars[m[1]] = expand(m[2], vars);
    w = w.slice(1);
  }
  w = w.map((x) => expand(x, vars));
  const cmd = w[0] ?? '';
  const found: Finding[] = [];
  const add = (kind: RiskyKind, target: string[]) => found.push({ kind, target: target.join(' ') });
  const plain = (a: string[]) => withoutRedirects(a).filter((x) => !x.startsWith('-') && x !== '--');
  // bash -lc "rm -rf x": look inside the script
  if (/^(?:ba|z|da)?sh$/.test(cmd)) {
    const i = w.findIndex((x, n) => n > 0 && /^-[a-zA-Z]*c$/.test(x));
    if (i > 0 && w[i + 1]) return riskyFindings(w[i + 1], vars);
  }
  if (cmd === 'rm') {
    const recursive = shortFlag(w, 'r') || shortFlag(w, 'R') || w.includes('--recursive');
    const force = shortFlag(w, 'f') || w.includes('--force');
    const targets = withoutRedirects(w.slice(1)).filter((x) => !x.startsWith('-'));
    if (recursive && force && targets.length && !targets.every(isRoutineTarget)) add('delete-files', targets.filter((t) => !isRoutineTarget(t)));
  } else if (cmd === 'git') {
    const { sub, rest } = gitSub(w);
    const flags = flagsOf(rest);
    if (sub === 'reset' && flags.includes('--hard')) add('reset-hard', plain(rest));
    else if (sub === 'push') {
      if (flags.includes('--force') || shortFlag(rest, 'f') || rest.some((x) => /^\+[^\s]/.test(x))) add('force-push', plain(rest));
      if (flags.includes('--delete') || shortFlag(rest, 'd') || rest.some((x) => /^:[^\s:]+$/.test(x))) add('delete-branch', plain(rest));
    }
    else if (sub === 'branch' && (flags.includes('-D') || (flags.includes('--delete') && flags.includes('--force')))) add('delete-branch', plain(rest));
    else if (sub === 'clean' && (shortFlag(rest, 'f') || flags.includes('--force'))) add('discard-changes', plain(rest));
    else if (sub === 'checkout' && (shortFlag(rest, 'f') || rest.includes('.') || (rest[0] === '--' && rest[1] === '.'))) add('discard-changes', plain(rest));
    else if (sub === 'restore' && rest.includes('.') && !flags.includes('--staged')) add('discard-changes', plain(rest));
  }
  if (DB_CLIENT.test(cmd) && DROP.test(words.join(' '))) add('drop-data', [words.join(' ').match(/\b(?:drop\s+(?:table|database|schema)(?:\s+if\s+exists)?|truncate\s+table)\s+["'`]?[\w.-]+/i)?.[0].replace(/\s+/g, ' ') ?? 'statement']);
  return found;
}

/** Replaces $NAME and ${NAME} with values assigned earlier on the same line (S=/tmp/x; rm -rf $S/y). */
function expand(word: string, vars: Record<string, string>): string {
  return word.replace(/\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g, (m, a, b) => vars[a ?? b] ?? m);
}

/** Every risky action in a shell command line with what it hit, in the order they appear. */
export function riskyFindings(command: string, vars: Record<string, string> = {}): Finding[] {
  const out: Finding[] = [];
  for (const words of splitCommands(command)) for (const f of findingsOf(words, vars)) if (!out.some((o) => o.kind === f.kind && o.target === f.target)) out.push(f);
  return out;
}

/** The kinds of risky action in a shell command line, each once, in the order they appear. */
export function riskyKinds(command: string, vars: Record<string, string> = {}): RiskyKind[] {
  const out: RiskyKind[] = [];
  for (const f of riskyFindings(command, vars)) if (!out.includes(f.kind)) out.push(f.kind);
  return out;
}

const CLIP = 240;
const clipTarget = (t: string) => { const x = redact(hideUser(hidePaths(t))); return x.length > 100 ? x.slice(0, 100) + '…' : x; };
/** What is stored and shown: secrets masked and the computer's user name hidden. */
export const shownCommand = (c: string) => { const t = redact(hideUser(hidePaths(c))); return t.length > CLIP ? t.slice(0, CLIP) + '…' : t; };

/** Records risky actions found in `command` on the session. A session that was scanned always has a list, even an empty one. */
export function noteRisky(s: Pick<SessionModel, 'riskyActions'>, at: string | undefined, command: string): void {
  const list = (s.riskyActions ??= []);
  const found = riskyFindings(command);
  // one entry per kind per command; several targets of one kind are joined
  for (const kind of new Set(found.map((f) => f.kind))) {
    const target = found.filter((f) => f.kind === kind).map((f) => f.target).filter(Boolean).join(' ');
    list.push({ at: at ?? '', kind, command: shownCommand(command), ...(target ? { target: clipTarget(target) } : {}) });
  }
}
