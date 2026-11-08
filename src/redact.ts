import { userInfo, homedir } from 'node:os';
import { basename } from 'node:path';
// Best-effort removal of obvious secrets before anything is written to a page.
const RULES: [string, RegExp, string?][] = [
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g],
  ['url-credentials', /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@\/]+:[^\s@\/]+@/gi, '$1[REDACTED:url-credentials]@'],
  ['anthropic-key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['openai-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/g],
  ['aws-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['google-key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['stripe-key', /\b[rs]k_(?:live|test)_[A-Za-z0-9]{20,}/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
  ['bearer', /\b(Bearer\s+)[A-Za-z0-9._~+\/=-]{20,}/g, '$1[REDACTED:bearer]'],
  ['basic-auth', /\b(Basic\s+)[A-Za-z0-9+\/=]{12,}/g, '$1[REDACTED:basic-auth]'],
  ['password', /((?:\b|_)(?:password|passwd|pwd)["']?)(\s*[=:]\s*)["']?[^\s"',;]{6,}["']?/gi, '$1$2[REDACTED:password]'],
  // NAME_TOKEN=value: any value of 16+ chars, or 6+ chars containing a digit (catches shortened values like `whsec_ab12…`).
  ['secret', /\b([A-Za-z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|ACCESS[_-]?KEY|PRIVATE[_-]?KEY|PASS(?:WORD|WD)?|PWD|CREDENTIALS?)[A-Za-z0-9_]*)(["']?\s*[=:]\s*)["']?(?:[A-Za-z0-9_\-.\/+=]{16,}|(?=[A-Za-z_\-.\/+=]*\d)[A-Za-z0-9_\-.\/+=]{6,})["']?/gi, '$1$2[REDACTED:secret]'],
  // Well-known secret prefixes, even when shortened in tool output.
  ['prefixed-secret', /\b(?:whsec|sk_(?:test|live)|rk_(?:test|live)|pk_live|glpat|shpat|shpss|npm|tk)_(?=[A-Za-z]*\d)[A-Za-z0-9]{4,}/g],
];

let EXTRA: RegExp[] = [];
/** Extra patterns from settings (regex strings). Invalid ones are skipped. */
export function setExtraRedactions(patterns: string[]): void {
  EXTRA = [];
  for (const p of patterns) {
    try { EXTRA.push(new RegExp(p, 'g')); } catch {}
  }
}

export function redact(s: string): string {
  if (!s) return s;
  let out = s;
  for (const [kind, re, repl] of RULES) out = out.replace(re, repl ?? `[REDACTED:${kind}]`);
  for (const re of EXTRA) out = out.replace(re, '[REDACTED:custom]');
  return out;
}

/** The name this computer knows you by, for hiding it in text. */
export function machineUser(): string {
  try { return userInfo().username; } catch { return basename(homedir()); }
}

/**
 * Hides the computer's user name wherever it stands alone: `psql -U name`, `user=name`, `name@host`, `--username name`.
 * Names under 3 characters are left alone, since they would match ordinary words.
 */
export function hideUser(s: string, user: string = machineUser()): string {
  if (!s || user.length < 3) return s;
  const esc = user.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return s.replace(new RegExp(`(^|[^\\w.-])${esc}(?![\\w-])`, 'g'), '$1[user]');
}

/** Hides the computer's user name in paths: /Users/name and /home/name become ~, and Claude's folder form -Users-name- loses the name. */
export function hidePaths(s: string): string {
  if (!s) return s;
  return s
    .replace(/(^|[^\w.-])\/(?:Users|home)\/[^/\s'"`)\]}:;,]+/g, '$1~')
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s'"]+/g, '~')
    .replace(/-(Users|home)-[^-\s/'"]+-/g, "-$1-~-");
}
