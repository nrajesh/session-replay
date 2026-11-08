// Turns a session's commits and decisions into an ordered list of checkpoints.
import type { Checkpoint, CommitRef, DecisionPoint, SessionModel } from './types.ts';

const byTime = <T extends { at: string }>(a: T, b: T) => a.at.localeCompare(b.at);
const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function checkpoint(at: string, title: string, decisions: DecisionPoint[], commit?: Checkpoint['commit']): Checkpoint {
  return { at, title, commit, decisions, tag: decisions.length ? 'Decision' : 'Finding', who: decisions.length ? 'you' : 'agent' };
}

export function buildCheckpoints(s: SessionModel): Checkpoint[] {
  const decisions = [...s.decisions].sort(byTime);
  const commits = [...s.commits].sort(byTime);
  const out: Checkpoint[] = [];
  let i = 0;
  if (commits.length) {
    for (const c of commits) {
      const group: DecisionPoint[] = [];
      while (i < decisions.length && decisions[i].at <= c.at) group.push(decisions[i++]);
      out.push(checkpoint(c.at, c.subject || c.hash.slice(0, 7), group, c));
    }
    const rest = decisions.slice(i);
    if (rest.length) out.push(checkpoint(rest[rest.length - 1].at, 'After the last commit', rest));
    return out;
  }
  let pending: DecisionPoint[] = [];
  while (i < decisions.length) {
    const d = decisions[i];
    if (!d.exact) {
      pending.push(d);
      i++;
      continue;
    }
    const group = [...pending];
    pending = [];
    while (i < decisions.length && decisions[i].exact && decisions[i].at === d.at) group.push(decisions[i++]);
    out.push(checkpoint(d.at, clip(d.header && d.question.length > 90 ? d.header : d.question), group));
  }
  if (pending.length) out.push(checkpoint(pending[pending.length - 1].at, 'Instructions and approvals', pending));
  return out;
}

const GAP_MS = 30 * 60_000;
const MARGIN_MS = 5 * 60_000;

/** Group timestamps into stretches of activity; a gap over 30 minutes starts a new stretch. */
export function activeSpans(times: string[]): [string, string][] {
  const sorted = times.filter((t) => !Number.isNaN(Date.parse(t))).sort();
  const out: [string, string][] = [];
  for (const t of sorted) {
    const last = out[out.length - 1];
    if (last && Date.parse(t) - Date.parse(last[1]) <= GAP_MS) last[1] = t;
    else out.push([t, t]);
  }
  return out;
}

/**
 * Keep commits that this session made. Hashes printed in its own output always count.
 * A commit found only by time must fall in a stretch of activity and either follow one of
 * the session's commit/merge commands (within 5 minutes) or touch a file the session edited.
 * This stops long-open or parallel sessions from claiming each other's commits.
 */
export function attributeCommits(s: SessionModel, commits: CommitRef[]): CommitRef[] {
  const spans = s.activity.map(([a, b]) => [Date.parse(a) - MARGIN_MS, Date.parse(b) + MARGIN_MS]);
  const cmds = s.gitCommandTimes.map((t) => Date.parse(t));
  return commits.filter((c) => {
    if (c.via.includes('output')) return true;
    const t = Date.parse(c.at);
    if (!spans.some(([a, b]) => t >= a && t <= b)) return false;
    if (cmds.some((x) => t >= x - 30_000 && t <= x + MARGIN_MS)) return true;
    return c.files.some((f) => s.editedFiles.some((e) => e === f || e.endsWith('/' + f)));
  });
}
