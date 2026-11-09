// Index pages (v2 design): All sessions (Ask bar, date jump, activity strip, day view, table),
// Projects list, Project page (what shipped, month by month), Usage (Pro).
import { modelLabel } from './models.ts';
import { shortModel, totalIn, topModels, modelFamily, sessionFamily, type AgentFamily } from '../usage.ts';
import { agentStack } from './brand.ts';
import type { SessionSummary } from '../types.ts';
import type { ProjectPage, SiteInfo } from './index.ts';
import type { CloudSession } from '../types.ts';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}
import { esc, page } from './html.ts';
import { clientBundle } from './client-bundle.ts';
import { proNote } from './pro-link.ts';
import { RISKY_LABEL } from '../risky.ts';
import { dayKey, fmtDate, fmtTime, shortTitle } from './format.ts';
import { tapeHtml } from './tape.ts';
import { peekAttr } from './peek.ts';
import { activeMinutes } from '../shared.ts';
import { fmtMinutes, pctClass } from './session.ts';

const MAX_PROMPT_TEXT = 20_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

function decisionText(d: SessionSummary['decisions'][number]): string {
  return [d.question, d.chosen.join(', '), d.other, d.quote, d.notes].filter(Boolean).join(' ');
}

/** Project names, with owner/repo (or the parent folder) added when two projects share a folder name. */
export function projectLabels(projects: ProjectPage[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const p of projects) count.set(p.name, (count.get(p.name) ?? 0) + 1);
  const label = (p: ProjectPage) => {
    if ((count.get(p.name) ?? 0) < 2) return p.name;
    const repo = p.webUrl?.match(/github\.com\/([^/]+\/[^/]+)$/)?.[1];
    return repo ?? (p.repoPath ? p.repoPath.split('/').slice(-2).join('/') : p.name);
  };
  return new Map(projects.map((p) => [p.slug, label(p)]));
}

function sessionRow(s: SessionSummary, mode: 'all' | 'project', label = s.projectName) {
  const you = s.checkpoints.filter((c) => c.who === 'you').length;
  const last = s.tests[s.tests.length - 1];
  const events: { at: string; type: string; text: string; exact?: boolean }[] = [{ at: s.start, type: 'start', text: s.title }];
  for (const d of s.decisions) events.push({ at: d.at, type: 'decision', text: d.exact ? `${d.question} → ${d.chosen.join(', ') || d.other || 'no answer'}` : `“${d.quote ?? ''}”`, exact: d.exact });
  for (const c of s.commits) events.push({ at: c.at, type: 'commit', text: `${c.hash.slice(0, 7)} ${c.subject}` });
  events.sort((a, b) => a.at.localeCompare(b.at));
  const prompts = s.prompts.join('\n').slice(0, MAX_PROMPT_TEXT);
  return {
    id: s.id, kind: 'local', agent: s.agent ?? 'claude-code', project: label, gone: s.sourceGone ?? '', risk: s.riskyActions?.length ?? 0,
    href: mode === 'all' ? `${s.projectSlug}/${s.id}.html` : `${s.id}.html`,
    title: s.title, short: shortTitle(s.title), start: s.start, end: s.end, day: dayKey(s.start),
    days: [...new Set([...events.map((e) => dayKey(e.at)), ...(s.activity ?? []).flat().map(dayKey)])].filter(Boolean).sort(),
    active: activeMinutes(s.activity ?? []),
    commits: s.commits.length, added: s.commits.reduce((a, c) => a + c.added, 0), removed: s.commits.reduce((a, c) => a + c.removed, 0),
    you, agentCheckpoints: s.checkpoints.length - you, decisions: s.decisions.length,
    testsPct: last && last.total ? Math.round((last.passed / last.total) * 100) : null, testsTotal: last?.total ?? null,
    cost: s.costUSD ?? null, model: modelLabel(s.models), prs: s.prs.map((p) => `#${p.number}`).join(' '), prLinks: s.prs.map((p) => ({ n: p.number, url: p.url })), branch: s.branch ?? '',
    events,
    search: {
      title: s.title,
      decisions: s.decisions.map(decisionText).join('\n'),
      commits: s.commits.map((c) => `${c.hash.slice(0, 7)} ${c.subject}`).join('\n'),
      prompts,
      files: [...new Set(s.commits.flatMap((c) => c.files))].slice(0, 300).join(' '),
    },
  };
}

function cloudRowSlug(c: CloudSession): string {
  return c.pr ? `pr-${c.pr.number}` : `branch-${slugify(c.branch)}`;
}

function cloudRows(p: ProjectPage, mode: 'all' | 'project', label = p.name) {
  return (p.cloud ?? []).map((c, i) => {
    const slug = cloudRowSlug(c);
    return {
      id: `cloud-${p.slug}-${i}`, kind: 'cloud', project: label,
      href: mode === 'all' ? `${p.slug}/${slug}.html` : `${slug}.html`,
      title: c.title, short: shortTitle(c.title), start: c.start, end: c.end, day: dayKey(c.start), days: [...new Set([c.start, c.end, ...c.commits.map((x) => x.at)].map(dayKey))].filter(Boolean).sort(),
      active: null, commits: c.commits.length, added: c.commits.reduce((a, x) => a + x.added, 0) || c.pr?.additions || 0, removed: c.commits.reduce((a, x) => a + x.removed, 0) || c.pr?.deletions || 0,
      you: null, agentCheckpoints: null, decisions: null, testsPct: null, testsTotal: null, cost: null, model: '', prs: c.pr ? `#${c.pr.number}` : '', prLinks: c.pr ? [{ n: c.pr.number, url: c.pr.url }] : [], branch: c.branch,
      prCommentsCount: c.prComments?.length ?? 0, manualCommitsCount: c.manualCommits?.length ?? 0, prChecks: c.prChecks,
      events: [{ at: c.start, type: 'start', text: `Cloud session · ${c.title}` }, ...c.commits.map((x) => ({ at: x.at, type: 'commit', text: `${x.hash.slice(0, 7)} ${x.subject}` }))],
      search: { title: c.title, decisions: '', commits: c.commits.map((x) => x.subject).join('\n'), prompts: c.pr?.body ?? '', files: [...new Set(c.commits.flatMap((x) => x.files))].join(' ') },
      cloudLink: c.link ?? c.pr?.url ?? (p.webUrl ? `${p.webUrl}/tree/${c.branch}` : ''),
    };
  });
}

export function indexData(projects: ProjectPage[], mode: 'all' | 'project', pro = false) {
  const labels = projectLabels(projects);
  return {
    mode, pro,
    projects: projects.map((p) => ({ name: labels.get(p.slug) ?? p.name, slug: p.slug, count: p.sessions.length })),
    sessions: projects.flatMap((p) => [...p.sessions.map((s) => sessionRow(s, mode, labels.get(p.slug))), ...(pro ? cloudRows(p, mode, labels.get(p.slug)) : [])])
      .filter((r) => r.start).sort((a, b) => b.start.localeCompare(a.start)),
  };
}

// ---------- Project page: what shipped, month by month ----------

export interface Card { kind: 'tag' | 'version' | 'pr' | 'cloud'; at: string; when: string; what: string; sub: string; href?: string; links?: { label: string; href: string }[]; linkPeeks?: string[]; peek?: string }

export function monthCards(p: ProjectPage, pro: boolean): { month: string; sessions: number; cards: Card[] }[] {
  const sessionFor = (pr: number | null, hash: string) =>
    p.sessions.find((s) => (pr !== null && s.prs.some((x) => x.number === pr)) || s.commits.some((c) => c.hash === hash));
  const cards: Card[] = [];
  const prsByDay = new Map<string, { nums: number[]; at: string; hash: string }>();
  for (const m of p.milestones) {
    if (m.kind === 'pr') {
      const day = dayKey(m.at);
      const e = prsByDay.get(day) ?? { nums: [], at: m.at, hash: m.hash };
      e.nums.push(Number(m.label.replace(/\D/g, '')));
      prsByDay.set(day, e);
    } else {
      const s = sessionFor(null, m.hash);
      const gh = pro && p.webUrl && m.hash ? `${p.webUrl}/commit/${m.hash}` : undefined;
      cards.push({ kind: m.kind, at: m.at, when: `${fmtDate(m.at)} · ${m.kind === 'tag' ? 'release' : 'version'}`, what: m.label, sub: s ? s.title : '', href: s ? `${s.id}.html` : gh,
        peek: peekAttr({ h: `${m.kind === 'tag' ? 'Release' : 'Version'} ${m.label}`, s: fmtDate(m.at), r: [['Commit', m.hash ? m.hash.slice(0, 7) : undefined], ['Session', s?.title]], g: s ? 'Click to open the replay' : gh ? 'Opens on GitHub ↗' : undefined }) });
    }
  }
  for (const [, e] of prsByDay) {
    e.nums.sort((a, b) => a - b);
    const titles = pro ? e.nums.map((n) => p.prs?.find((x) => x.number === n)?.title).filter(Boolean) as string[] : [];
    const s = sessionFor(e.nums[0], e.hash);
    const prUrl = (n: number) => p.prs?.find((x) => x.number === n)?.url || (p.webUrl ? `${p.webUrl}/pull/${n}` : '');
    const prPeek = (n: number) => { const pr = p.prs?.find((x) => x.number === n);
      return peekAttr({ h: pr?.title ?? `Pull request #${n}`, s: `Pull request #${n}${pr?.mergedAt ? ` · merged ${fmtDate(pr.mergedAt)}` : pr?.state ? ` · ${pr.state.toLowerCase()}` : ''}`,
        r: [['Branch', pr?.branch], ['Lines', pr?.additions !== undefined ? `+${pr.additions.toLocaleString('en')} −${(pr.deletions ?? 0).toLocaleString('en')}` : undefined]], g: 'Opens on GitHub ↗' }); };
    const linked = pro ? e.nums.filter((n) => prUrl(n)) : [];
    const links = linked.map((n) => ({ label: `#${n}`, href: prUrl(n) }));
    cards.push({ links, linkPeeks: linked.map(prPeek),
      kind: 'pr', at: e.at, when: `PR #${e.nums.join(', #')}`,
      what: titles.length ? titles.join(' · ') : e.nums.length > 1 ? `${e.nums.length} pull requests` : 'Pull request',
      sub: `${fmtDate(e.at)}${s ? ` · ${s.title}` : ' · no local session'}`, href: s ? `${s.id}.html` : links[0]?.href || undefined,
      peek: e.nums.length > 1 && titles.length
        ? peekAttr({ h: `${e.nums.length} pull requests merged ${fmtDate(e.at)}`, r: e.nums.map((n, i) => [`#${n}`, titles[i]] as [string, string]), g: s ? `Click to open the replay: ${shortTitle(s.title, 60)}` : undefined })
        : e.nums.length === 1 ? prPeek(e.nums[0]) : undefined,
    });
  }
  if (pro) for (const c of p.cloud ?? []) cards.push({ kind: 'cloud', at: c.start, when: `${fmtDate(c.start)} · cloud session`, what: c.title, sub: `${c.commits.length} commits${c.pr ? ` · PR #${c.pr.number}` : ''}`, href: c.link ?? c.pr?.url,
    peek: peekAttr({ h: c.title, s: `Cloud session · ${fmtDate(c.start)}`, r: [['Branch', c.branch], ['Commits', c.commits.length], ['PR', c.pr ? `#${c.pr.number} ${c.pr.title}` : undefined]], g: c.link || c.pr ? 'Opens on GitHub ↗' : undefined }) });
  const byMonth = new Map<string, Card[]>();
  for (const c of cards) {
    const m = dayKey(c.at).slice(0, 7);
    if (!m) continue;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(c);
  }
  for (const s of p.sessions) { const m = dayKey(s.start).slice(0, 7); if (m && !byMonth.has(m)) byMonth.set(m, []); }
  return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, cs]) => ({
    month, sessions: p.sessions.filter((s) => dayKey(s.start).startsWith(month)).length, cards: cs.sort((a, b) => b.at.localeCompare(a.at)),
  }));
}

/** A whole card is one link; grouped PRs get their own small links (no nested anchors). */
function cardHtml(c: Card): string {
  const ext = c.href?.startsWith('https:') ? ' rel="noreferrer"' : '';
  const when = c.links && c.links.length > 1
    ? `<div class="when">PR ${c.links.map((l, i) => `<a href="${esc(l.href)}" rel="noreferrer"${c.linkPeeks?.[i] ?? ''}>${esc(l.label)}</a>`).join(', ')}</div>`
    : `<div class="when">${esc(c.when)}</div>`;
  const body = `<div class="what">${esc(c.what)}</div>${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}`;
  if (c.links && c.links.length > 1) return `<section class="card k-${c.kind}">${when}${c.href ? `<a class="card-main" href="${esc(c.href)}"${ext}${c.peek ?? ''}>${body}</a>` : body}</section>`;
  return c.href ? `<a class="card k-${c.kind}" href="${esc(c.href)}"${ext}${c.peek ?? ''}>${when}${body}</a>` : `<section class="card k-${c.kind}"${c.peek ? ` tabindex="0"${c.peek}` : ''}>${when}${body}</section>`;
}

function monthSummary(m: { sessions: number; cards: Card[] }, pro = true): string {
  const prs = m.cards.filter((c) => c.kind === 'pr').reduce((a, c) => a + Math.max(1, c.links?.length || (c.when.match(/#\d+/g) ?? []).length), 0);
  const rel = m.cards.filter((c) => c.kind === 'tag' || c.kind === 'version').length;
  const cloud = m.cards.filter((c) => c.kind === 'cloud').length;
  const shipped = [prs ? `${prs} PR${prs === 1 ? '' : 's'}` : '', rel ? `${rel} release${rel === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
  const kind = pro ? 'local ' : '';
  return [m.sessions ? `${m.sessions} ${kind}session${m.sessions === 1 ? '' : 's'}` : `No ${kind}sessions`, cloud ? `${cloud} cloud` : '', shipped ? `${shipped} shipped` : ''].filter(Boolean).join(' · ');
}

function monthRows(p: ProjectPage, pro: boolean): string {
  const months = monthCards(p, pro);
  if (!months.length) return '<p class="empty">Nothing recorded yet.</p>';
  return `<div class="months">${months.map((m) => `<div><div style="font-weight:600">${esc(monthLabel(m.month))}</div><div class="muted" style="font-size:12px">${monthSummary(m, pro)}</div></div>
<div>${m.cards.length ? `<div class="cards">${m.cards.map(cardHtml).join('')}</div>` : '<span class="muted">Nothing shipped.</span>'}</div>`).join('')}</div>`;
}

// ---------- Usage ----------

/** Activity spans split into [local day, hour of day, minutes] buckets. */
export function activityParts(spans: [string, string][]): [string, number, number][] {
  const buckets = new Map<string, number>();
  for (const [a, b] of spans) {
    let cur = Date.parse(a);
    const end = Date.parse(b);
    if (Number.isNaN(cur) || Number.isNaN(end)) continue;
    while (cur < end) {
      const d = new Date(cur);
      const next = Math.min(end, new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime());
      const k = `${dayKey(d.toISOString())}|${d.getHours()}`;
      buckets.set(k, (buckets.get(k) ?? 0) + (next - cur) / 60000);
      cur = next;
    }
  }
  return [...buckets].map(([k, m]) => [k.split('|')[0], Number(k.split('|')[1]), Math.round(m * 10) / 10] as [string, number, number]).sort((x, y) => x[0].localeCompare(y[0]) || x[1] - y[1]);
}

/** Each commit goes to the model that used the most tokens in its checkpoint: [model, commits, added, removed]. */
function commitsByModel(s: SessionSummary): [string, number, number, number][] {
  const by = new Map<string, [string, number, number, number]>();
  for (const c of s.checkpoints) {
    if (!c.commit) continue;
    const top = topModels(c.models ?? [], 1)[0];
    const name = top ? shortModel(top.name) : 'unknown';
    const e = by.get(name) ?? [name, 0, 0, 0];
    e[1]++; e[2] += c.commit.added; e[3] += c.commit.removed;
    by.set(name, e);
  }
  return [...by.values()];
}

export function usageData(
  projects: ProjectPage[],
) {
  const months = new Map<string, { month: string; minutes: number; cost: number; sessions: number; commits: number; added: number; removed: number; byProject: Record<string, number> }>();
  const per = new Map<string, { name: string; minutes: number; cost: number; sessions: number }>();
  const days = new Map<string, { day: string; minutes: number; sessions: number }>();
  const families: Record<string, AgentFamily> = {};
  const sessions: { id: string; title: string; project: string; href: string; day: string; mins: number; cost: number; commits: number; added: number; removed: number; parts: [string, number, number][]; models: [string, number, number, number | null][]; cm: [string, number, number, number][]; ag: AgentFamily; gone: string; rk: [string, string, string][]; rs: number; cp: number; yc: number; tp: [number, number] | null; pr: [number, number | null][]; cr: number; ti: number }[] = [];
  for (const p of projects) for (const s of p.sessions) {
    const m = dayKey(s.start).slice(0, 7);
    if (!m) continue;
    const mins = activeMinutes(s.activity ?? []);
    const added = s.commits.reduce((a, c) => a + c.added, 0);
    const removed = s.commits.reduce((a, c) => a + c.removed, 0);
    sessions.push({ id: s.id, title: s.title, project: p.name, href: `${p.slug}/${s.id}.html`, day: dayKey(s.start), mins, cost: s.costUSD ?? 0, commits: s.commits.length, added, removed, parts: activityParts(s.activity ?? []),
      models: (s.models ?? []).map((u) => { families[shortModel(u.model)] ??= modelFamily(u.model); return [shortModel(u.model), totalIn(u), u.output, u.cost ?? null] as [string, number, number, number | null]; }),
      cm: commitsByModel(s),
      // For the Pro tabs: agent family, checkpoints (and how many carry your decisions), latest tests,
      // merged PRs with hours from session start to merge, and cache-read vs total input tokens.
      gone: s.sourceGone ?? '', rk: (s.riskyActions ?? []).map((a) => [dayKey(a.at) || dayKey(s.start), a.kind, a.target ?? ''] as [string, string, string]), rs: s.riskyActions ? 1 : 0,
      ag: sessionFamily(s.agent), cp: s.checkpoints.length, yc: s.checkpoints.filter((c) => c.who === 'you').length,
      tp: (() => { const t = s.tests[s.tests.length - 1]; return t && t.total ? [t.passed, t.total] as [number, number] : null; })(),
      pr: s.prs.map((x) => { const m = p.prs?.find((y) => y.number === x.number)?.mergedAt; const h = m ? (Date.parse(m) - Date.parse(s.start)) / 3600_000 : NaN; return [x.number, Number.isFinite(h) && h >= 0 ? Math.round(h * 10) / 10 : null] as [number, number | null]; }),
      cr: (s.models ?? []).reduce((a, u) => a + u.cacheRead, 0), ti: (s.models ?? []).reduce((a, u) => a + totalIn(u), 0) });
    const e = months.get(m) ?? { month: m, minutes: 0, cost: 0, sessions: 0, commits: 0, added: 0, removed: 0, byProject: {} };
    e.minutes += mins; e.cost += s.costUSD ?? 0; e.sessions++; e.commits += s.commits.length;
    e.added += added; e.removed += removed;
    e.byProject[p.name] = (e.byProject[p.name] ?? 0) + mins;
    months.set(m, e);
    const q = per.get(p.name) ?? { name: p.name, minutes: 0, cost: 0, sessions: 0 };
    q.minutes += mins; q.cost += s.costUSD ?? 0; q.sessions++;
    per.set(p.name, q);
    const d = days.get(dayKey(s.start)) ?? { day: dayKey(s.start), minutes: 0, sessions: 0 };
    d.minutes += mins; d.sessions++;
    days.set(d.day, d);
  }
  return {
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    projects: [...per.values()].sort((a, b) => b.minutes - a.minutes),
    busiest: [...days.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 5),
    sessions,
    families,
    riskLabels: RISKY_LABEL,
  };
}

/** Free edition: the basics from your own data, and a preview of what each Pro tab adds. */
function freeUsage(projects: ProjectPage[]): string {
  const u = usageData(projects);
  const mins = u.sessions.reduce((a, x) => a + x.mins, 0), commits = u.sessions.reduce((a, x) => a + x.commits, 0);
  const months = u.months.slice(-12), max = Math.max(1, ...months.map((m) => m.minutes));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bars = months.map((m) => { const h = Math.round(m.minutes / 6) / 10, label = `${MON[+m.month.slice(5, 7) - 1]} ${m.month.slice(0, 4)}`;
    return `<div class="sb" tabindex="0" role="img" aria-label="${esc(`${label}: ${h} hours, ${m.sessions} sessions`)}"${peekAttr({ h: label, s: `${h} h active`, r: [['Sessions', m.sessions], ['Commits', m.commits]] })}><span class="sb-v">${h} h</span><span class="sb-bar" style="height:${Math.max(3, Math.round(m.minutes / max * 140))}px"><i style="flex:1;background:var(--brand-blue)"></i></span><span class="sb-l">${MON[+m.month.slice(5, 7) - 1]}</span></div>`; }).join('');
  const t = (label: string, v: string, sub: string) => `<div class="stat4 static"><div class="muted" style="font-size:12px">${label}</div><div class="v">${esc(v)}</div><div class="muted" style="font-size:12px">${esc(sub)}</div></div>`;
  // Not shown on screen: the numbers behind the chart, added under it when you save the chart as PDF.
  const printData = months.length ? `<div class="print-data"><h3>Data</h3><table><thead><tr><th>Month</th><th>Active hours</th><th>Sessions</th><th>Commits</th></tr></thead><tbody>${months.map((m) => `<tr><td>${MON[+m.month.slice(5, 7) - 1]} ${m.month.slice(0, 4)}</td><td>${Math.round(m.minutes / 6) / 10}</td><td>${m.sessions}</td><td>${m.commits}</td></tr>`).join('')}</tbody></table></div>` : '';
  const locked = USAGE_TABS.map(([, label, hint]) => `<div class="locked-card"><strong>${label}</strong><span class="muted">${esc(hint)}</span></div>`).join('');
  return `<header class="page-heading"><div><h1>Usage</h1><p class="page-intro">Your totals and active hours per month.</p></div></header>
<section class="stats4">${t('Active hours', `${Math.round(mins / 60)} h`, 'all time')}${t('Sessions', String(u.sessions.length), `${u.projects.length} projects`)}${t('Commits', String(commits), 'linked to sessions')}${t('Projects', String(u.projects.length), u.projects[0] ? `most time: ${u.projects[0].name}` : '')}</section>
<div class="panel">${chartActions('Active hours per month')}<h2 style="margin:0 0 12px;font-size:16px">Active hours per month</h2><div class="sbars">${bars || '<p class="muted">No sessions yet.</p>'}</div>${printData}</div>
<h2>In Pro</h2><div class="locked-grid">${locked}<div class="locked-card"><strong>Click to filter</strong><span class="muted">Every bar, model and project narrows the whole page</span></div></div>
${proNote()}`;
}

export const USAGE_TABS: [string, string, string][] = [
  ['overview', 'Overview', 'Time, cost, projects, when you work and models'],
  ['agents', 'Agents', 'Which AI agents you use, and how that changes'],
  ['people', 'People', 'Who committed: commits, lines and merged PRs per person'],
  ['risks', 'Risky actions', 'Destructive commands AI agents ran, by agent and kind'],
  ['steering', 'Steering', 'How often your decisions shape the work'],
  ['efficiency', 'Efficiency', 'Cost per commit and per merged PR, cache savings'],
  ['quality', 'Quality', 'Test pass rate and time to merge'],
  ['focus', 'Focus', 'Streaks, session length and project switching'],
];

/** Export buttons for a chart panel: PDF on every edition, CSV on Pro (the script behind it only exists on Pro pages). */
export function chartActions(title: string, csv?: { ids: string; name: string }): string {
  return `<div class="chart-actions" role="group" aria-label="Export ${esc(title)}"><button type="button" class="btn sm" data-action="print-panel" aria-label="PDF: ${esc(title)}">PDF</button>${csv ? `<button type="button" class="btn sm" data-csv="${csv.ids}" data-name="${csv.name}" aria-label="CSV: ${esc(title)}">CSV</button>` : ''}</div>`;
}

export function renderUsage(projects: ProjectPage[], site: SiteInfo): string {
  return page({ title: 'Usage · Session replays', root: '', nav: 'usage', theme: site.theme, pro: false, body: freeUsage(projects) });
}

// ---------- All sessions / project sessions ----------

const INDEX_JS = `
(function(){
  var D=JSON.parse(document.getElementById('sr-data').textContent);
  var rows=D.sessions, all=D.mode==='all';
  var idx=buildIndex(rows.map(function(r){return {id:r.id,fields:r.search};}));
  var st={q:'',src:{local:true,cloud:true},project:'',agent:'',day:'',lastDay:'',from:'',to:'',hits:null,month:'',cited:null,refs:[]};
  var pad=function(n){return String(n).padStart(2,'0');};
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(iso){var d=new Date(iso);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();}
  function ft(iso){var d=new Date(iso);return pad(d.getHours())+':'+pad(d.getMinutes());}
  function dur(m){return m==null?'—':m<60?m+' min':Math.floor(m/60)+' h '+pad(m%60);}
  var AGENT={codex:['openai','Codex'],copilot:['copilot','GitHub Copilot']};
  function peekObj(r){var ag=r.kind==='cloud'?null:(AGENT[r.agent]||['claude','Claude Code']);
    var facts=[['Active',r.active?dur(r.active):''],['Decisions',r.decisions?String(r.decisions):''],['Commits',r.commits?r.commits+'  (+'+(r.added||0).toLocaleString('en')+' −'+(r.removed||0).toLocaleString('en')+')':''],['Tests',r.testsPct!=null?r.testsPct+'% passing':''],['Model',r.model||''],['Cost',r.cost!=null?'$'+r.cost.toFixed(2):''],['Branch',r.branch||''],['PRs',r.prs||'']].filter(function(x){return x[1];});
    return {h:r.title,s:(r.kind==='cloud'?'Cloud session · ':'')+r.project+' · '+fd(r.start)+' '+ft(r.start),a:ag?ag[0]:undefined,b:ag?ag[1]:undefined,r:facts,g:r.kind==='cloud'?'Opens the cloud session':'Click to open the replay'};}
  function peek(r){return ' data-peek="'+e(JSON.stringify(peekObj(r)))+'"';}
  // Links inside an AI answer get the same hover card as the table; links whose text is a date read as grey metadata.
  var DATE_TEXT=/^(\\d{1,2} [A-Z][a-z]{2}( \\d{4})?|\\d{4}-\\d{2}-\\d{2})/;
  function enhanceLinks(box){[].forEach.call(box.querySelectorAll('a[href]'),function(a){var h=a.getAttribute('href').replace(/^\\//,'').replace(/^\\.\\.\\//,'').replace(/#.*$/,'');
    var r=rows.find(function(x){return x.href===h||h.slice(-x.href.length-1)==='/'+x.href;});
    if(r&&!a.hasAttribute('data-peek'))a.setAttribute('data-peek',JSON.stringify(peekObj(r)));
    var blk=a.closest('li,p')||box,seen=blk.srDates||(blk.srDates={});
    if(r&&!a.classList.contains('when')&&!seen[r.id]){seen[r.id]=1;var dt=document.createElement('span');dt.className='ans-date';dt.textContent=fd(r.start);var last=a;while(last.nextElementSibling&&last.nextElementSibling.tagName==='A'&&last.nextSibling===last.nextElementSibling||last.nextSibling&&/^\\s*,\\s*$/.test(last.nextSibling.textContent||'')&&last.nextSibling.nextSibling&&last.nextSibling.nextSibling.tagName==='A')last=last.nextSibling.tagName==='A'?last.nextSibling:last.nextSibling.nextSibling;last.after(dt);}
    if(!r&&a.href.indexOf('https://github.com/')===0&&/\\/(commit|pull)\\//.test(a.href)&&!a.hasAttribute('data-peek')){var pm=a.href.match(/\\/(commit|pull)\\/([\\w]+)/);a.setAttribute('data-peek',JSON.stringify({h:pm[1]==='pull'?'Pull request #'+pm[2]:'Commit '+pm[2].slice(0,7),g:'Opens on GitHub ↗'}));}
    if(DATE_TEXT.test(a.textContent.trim()))a.classList.add('date-link');});}
  function e(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function hl(text,terms){var out=e(text);(terms||[]).forEach(function(t){if(t.length<3)return;
    out=out.replace(new RegExp('('+t.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&')+')(?![^<]*>)','gi'),'<mark>$1</mark>');});return out;}
  function pc(p){return p>=98?'good':p>=85?'warn':'bad';}
  var cols=[{key:'start',label:'Date',render:function(r){return '<span class="dt"><span>'+e(fd(r.start))+'</span><span class="muted">'+e(ft(r.start))+'</span></span>';}}];
  if(all)cols.push({key:'project',label:'Project',render:function(r){return e(r.project);}});
  cols.push(
    {key:'title',label:'Session',render:function(r){var h=st.hits&&st.hits[r.id];
      var sub=[];if(r.kind==='cloud')sub.push('<span class="chip cloud">cloud</span>');else if(D.pro)sub.push('<span class="chip local">local</span>');
      if(r.kind!=='cloud')sub.push(r.agent==='codex'?'<span class="agent ag-openai"><i></i>Codex</span>':r.agent==='copilot'?'<span class="agent ag-copilot"><i></i>GitHub Copilot</span>':'<span class="agent ag-claude"><i></i>Claude Code</span>');
      if(r.risk)sub.push('<span class="chip risk" title="Destructive commands the AI agent ran">'+r.risk+' risky</span>');
      if(r.gone)sub.push('<span class="chip plain" title="The original session file is gone. This copy stays in your archive.">Source removed</span>');
      if(r.decisions!=null)sub.push(r.decisions+' decision'+(r.decisions===1?'':'s'));else if(r.kind==='cloud')sub.push('<span class="chip plain">decisions N/A</span>');
      if(r.prs)sub.push('PR '+(D.pro&&r.prLinks&&r.prLinks.length?r.prLinks.map(function(p){return p.url.indexOf('https://github.com/')===0?'<a href="'+e(p.url)+'" rel="noreferrer" data-peek="'+e(JSON.stringify({h:'Pull request #'+p.n,s:r.project,g:'Opens on GitHub ↗'}))+'">#'+p.n+'</a>':'#'+p.n;}).join(' '):e(r.prs)));
      if(r.prCommentsCount&&r.prCommentsCount>0)sub.push('<span class="chip cloud" title="PR comments">'+r.prCommentsCount+' comments</span>');
      if(r.manualCommitsCount&&r.manualCommitsCount>0)sub.push('<span class="chip plain" title="Commits not linked to an archived session">'+r.manualCommitsCount+' manual</span>');
      if(r.prChecks&&r.prChecks.length){var last=r.prChecks[r.prChecks.length-1],dot=last.status==='success'||last.status==='completed'?'ok':last.status==='failure'||last.status==='error'?'bad':'warn';sub.push('<span class="dot '+dot+'" title="CI: '+e(last.status)+'"></span>'+last.status);
      }
      var ext=r.kind==='cloud'?' rel="noreferrer"':'';
      var ag=r.kind==='cloud'?'':' ag-'+(r.agent==='codex'?'openai':r.agent==='copilot'?'copilot':'claude');
      return '<a class="row-title" href="'+e(r.href)+'"'+ext+peek(r)+'><span class="kdot '+r.kind+ag+'" aria-hidden="true"></span>'+e(r.short||r.title)+'</a>'+(sub.length?'<div class="sub">'+sub.join(' · ')+'</div>':'')+(h&&h.snippet?'<div class="sub">'+hl(h.snippet,h.terms)+'</div>':'');}},
    {key:'active',label:'Active',num:true,render:function(r){return e(dur(r.active));}},
    {key:'commits',label:'Commits',num:true,render:function(r){return r.commits+(r.added||r.removed?' <span class="plus">+'+r.added.toLocaleString('en')+'</span> <span class="minus">−'+r.removed.toLocaleString('en')+'</span>':'');}},
    {key:'testsPct',label:'Tests',num:true,render:function(r){return r.testsPct==null?'<span class="muted">unknown</span>':'<span class="dot '+pc(r.testsPct)+'"></span>'+r.testsPct+'%';}},
    {key:'model',label:'Model',render:function(r){return r.model?'<span class="muted model-name">'+e(r.model)+'</span>':'<span class="muted">—</span>';}},
    {key:'cost',label:'Cost',num:true,render:function(r){return r.cost==null?'<span class="muted">—</span>':'$'+r.cost.toFixed(2);}});
  var table=mountTable(document.getElementById('sessions'),rows,cols,{sort:{key:'start',dir:-1},caption:'Sessions',emptyText:'No sessions match these filters.'});
  function visible(r){return (!st.project||r.project===st.project)&&st.src[r.kind];}
  function inRange(r){return !st.from&&!st.to||(r.days||[]).some(function(d){return (!st.from||d>=st.from)&&(!st.to||d<=st.to);});}
  function matches(r){return visible(r)&&inRange(r)&&(!st.agent||r.agent===st.agent)&&(!st.hits||st.hits[r.id])&&(!st.cited||st.cited[r.id]);}
  function narrowed(){return !!(st.hits||st.cited||st.agent||st.from||st.to);}
  function dayCounts(){var c={};rows.forEach(function(r){if(!visible(r))return;(r.days||[]).forEach(function(d){c[d]=(c[d]||0)+1;});});return c;}
  function dayMinutes(){var c={};rows.forEach(function(r){if(!visible(r))return;var ds=r.days||[];ds.forEach(function(d){c[d]=(c[d]||0)+Math.max(10,(r.active||30)/Math.max(1,ds.length));});});return c;}
  var allDays=Object.keys(dayCounts()).filter(function(d){return /^\\d{4}-\\d{2}-\\d{2}$/.test(d);}).sort();
  var months=allDays.length?monthsBetween(allDays[0],allDays[allDays.length-1]):[];
  st.month=months[months.length-1]||'';
  var ys=document.getElementById('jump-year'),ms=document.getElementById('jump-month'),df=document.getElementById('jump-from'),dt=document.getElementById('jump-to');
  var years=[];months.forEach(function(m){var y=m.slice(0,4);if(years.indexOf(y)<0)years.push(y);});
  ys.innerHTML=years.slice().reverse().map(function(y){return '<option>'+y+'</option>';}).join('');
  ms.innerHTML=MONTH_NAMES.map(function(n,i){return '<option value="'+pad(i+1)+'">'+n+'</option>';}).join('');
  if(allDays.length){df.min=dt.min=allDays[0];df.max=dt.max=allDays[allDays.length-1];}
  var prevB=document.getElementById('jump-prev'),nextB=document.getElementById('jump-next');
  // Only months that have sessions can be picked, so the year, month and arrow controls never go past the archive.
  function syncJump(){var y=ys.value;[].forEach.call(ms.options,function(o){o.disabled=months.indexOf(y+'-'+o.value)<0;});var i=months.indexOf(st.month);prevB.disabled=i<=0;nextB.disabled=i<0||i>=months.length-1;}
  function setMonth(m){if(!m||months.indexOf(m)<0)return;st.month=m;ys.value=m.slice(0,4);ms.value=m.slice(5,7);syncJump();drawStrip();}
  ys.onchange=function(){var y=ys.value,m=y+'-'+ms.value;if(months.indexOf(m)<0){var inYear=months.filter(function(x){return x.slice(0,4)===y;});m=inYear.filter(function(x){return x>=y+'-'+ms.value;})[0]||inYear[inYear.length-1];}setMonth(m);};
  ms.onchange=function(){setMonth(ys.value+'-'+ms.value);};
  prevB.onclick=function(){setMonth(shiftMonth(st.month,-1));};
  nextB.onclick=function(){setMonth(shiftMonth(st.month,1));};
  function range(){st.from=df.value;st.to=dt.value;if(st.from&&st.to&&st.from>st.to){var x=st.from;st.from=st.to;st.to=x;df.value=st.from;dt.value=st.to;}st.day='';if(st.from)setMonth(st.from.slice(0,7));apply();}
  df.onchange=dt.onchange=range;
  var tipData={};
  function drawStrip(){
    var box=document.getElementById('strip');if(!st.month){box.innerHTML='<p class="empty">No sessions yet.</p>';return;}
    var tot={},ml={},mc={},hm={};
    rows.forEach(function(r){if(!visible(r))return;var ok=matches(r),ds=r.days||[];
      ds.forEach(function(d){tot[d]=(tot[d]||0)+1;if(!ok)return;if(r.kind==='cloud')mc[d]=(mc[d]||0)+1;else ml[d]=(ml[d]||0)+1;hm[d]=(hm[d]||0)+Math.max(10,(r.active||30)/Math.max(1,ds.length));});});
    var days=monthDays(st.month,tot),max=1;days.forEach(function(d){max=Math.max(max,tot[d.day]||0);});
    var step=[1,2,5,10,20,50,100].filter(function(x){return max/x<=4;})[0]||200,top=Math.ceil(max/step)*step;
    var hit=0,hitm=0;days.forEach(function(d){hit+=(ml[d.day]||0)+(mc[d.day]||0);hitm+=hm[d.day]||0;});
    var hasCloud=rows.some(function(r){return r.kind==='cloud'&&visible(r);});
    var name=MONTH_NAMES[+st.month.slice(5,7)-1]+' '+st.month.slice(0,4);
    tipData={};
    var cols=days.map(function(d){var t=tot[d.day]||0,l=ml[d.day]||0,c=mc[d.day]||0,rest=t-l-c;
      tipData[d.day]={l:l,c:c,rest:rest,t:t,m:hm[d.day]||0};
      var seg=function(n,col){return n?'<span class="vz-seg" style="flex:'+n+' 1 0;background:'+col+'"></span>':'';};
      var stack=t?'<div class="vz-stack" style="height:'+(t/top*100)+'%">'+seg(l,'var(--local)')+seg(c,'var(--cloud)')+seg(rest,'var(--border-2)')+'</div>':'';
      var off=!t||(narrowed()&&!(l+c));
      return '<button type="button" class="vz-col" '+(off?'disabled ':'')+'aria-pressed="'+(st.day===d.day)+'" data-day="'+d.day+'" aria-label="'+d.day+': '+(l+c)+' session'+((l+c)===1?'':'s')+'">'+stack+'</button>';}).join('');
    var ticks='';for(var v=0;v<=top;v+=step)ticks+='<div class="vz-grid" style="bottom:'+(v/top*100)+'%"><span>'+v+'</span></div>';
    var labels=days.map(function(d,i){return '<span>'+(i%7===0?(+d.day.slice(8)):'')+'</span>';}).join('');
    box.innerHTML='<div class="strip-head"><span class="strip-title">'+name+'</span><span>'+hit+' session'+(hit===1?'':'s')+' · '+Math.round(hitm/60)+' h active'+(narrowed()?' · grey = other sessions':'')+'</span></div>'+
      '<div class="vz"><div class="vz-plot">'+ticks+'<div class="vz-bars" style="grid-template-columns:repeat('+days.length+',minmax(0,1fr))">'+cols+'</div></div>'+
      '<div class="vz-x" style="grid-template-columns:repeat('+days.length+',minmax(0,1fr))">'+labels+'</div></div>'+
      '<p class="strip-note">Sessions per day'+(hasCloud?' · <span class="sw local"></span>local <span class="sw cloud"></span>cloud':'')+' · click a day for the day view</p>';
    box.querySelectorAll('[data-day]').forEach(function(b){b.onclick=function(){pick(b.getAttribute('data-day'));};});
  }
  (function(){var box=document.getElementById('strip'),tip=document.getElementById('vz-tip');
    function show(b,x,y){var d=b.getAttribute('data-day'),t=tipData[d];if(!t)return;
      tip.innerHTML='<div class="t-h">'+e(fd(d+'T12:00:00'))+'</div><div class="t-tot">'+(t.l+t.c)+' session'+((t.l+t.c)===1?'':'s')+'</div>'+
        (t.l?'<div class="t-r"><span class="sw local"></span>local<span class="muted">'+t.l+'</span></div>':'')+(t.c?'<div class="t-r"><span class="sw cloud"></span>cloud<span class="muted">'+t.c+'</span></div>':'')+
        (t.rest?'<div class="t-r"><span class="sw" style="background:var(--border-2)"></span>other (not matching)<span class="muted">'+t.rest+'</span></div>':'')+
        (t.m?'<div class="t-r muted">'+Math.round(t.m/6)/10+' h active</div>':'');
      tip.hidden=false;var w=tip.offsetWidth,h=tip.offsetHeight;
      tip.style.left=Math.max(8,Math.min(window.innerWidth-w-8,x+14))+'px';tip.style.top=Math.max(8,Math.min(window.innerHeight-h-8,y-h-10))+'px';}
    box.addEventListener('pointermove',function(ev){var b=ev.target.closest&&ev.target.closest('.vz-col');if(b)show(b,ev.clientX,ev.clientY);else tip.hidden=true;});
    box.addEventListener('pointerleave',function(){tip.hidden=true;});})();
  function apply(){
    st.hits=null;
    if(st.q){st.hits={};search(idx,st.q).forEach(function(h,i){h.rank=i;st.hits[h.id]=h;});}
    var list=rows.filter(function(r){return matches(r)&&(!st.day||(r.days||[]).indexOf(st.day)>=0);});
    if(narrowed()&&!st.day){var inM=false,last='';rows.forEach(function(r){if(!matches(r))return;(r.days||[]).forEach(function(d){if(d.slice(0,7)===st.month)inM=true;if(d>last)last=d;});});if(!inM&&last&&!st.from&&!st.to&&months.indexOf(last.slice(0,7))>=0){st.month=last.slice(0,7);ys.value=st.month.slice(0,4);ms.value=st.month.slice(5,7);}}
    if(st.hits)list.sort(function(a,b){return st.hits[a.id].rank-st.hits[b.id].rank;});
    table.setRows(list);
    var parts=[list.length+' of '+rows.length+' sessions'];if(st.cited)parts.push('cited in the answer');else if(st.q)parts.push('matching “'+st.q+'”');if(st.agent)parts.push('from '+AGENT_NAME[st.agent]);if(st.project)parts.push('in '+st.project);if(!(st.src.local&&st.src.cloud))parts.push('('+(st.src.local?'local':'cloud')+' only)');if(st.from||st.to)parts.push((st.from?'from '+fd(st.from+'T12:00:00'):'')+(st.to?' to '+fd(st.to+'T12:00:00'):''));if(st.day)parts.push('on '+fd(st.day+'T12:00:00'));
    document.getElementById('status').textContent=parts.join(' ');
    drawDay();drawStrip();
  }
  function dayEvents(){var out=[];rows.forEach(function(r){if(!visible(r))return;
      r.events.forEach(function(ev){var d=new Date(ev.at),k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());if(k===st.day)out.push({ev:ev,r:r});});});
    out.sort(function(a,b){return a.ev.at.localeCompare(b.ev.at);});return out;}
  var LABEL={start:'Session started',commit:'Commit',decision:'Decision'};
  function drawDay(){
    var box=document.getElementById('day-view');box.hidden=false;
    if(!st.day){
      // Summary view when no day is selected
      var rows_=rows.filter(matches),tot=rows_.length,tc=0,tm=0,tn=0,local=0,cloud=0;
      rows_.forEach(function(r){tc+=r.commits||0;tm+=r.active||0;
        if(r.kind==='cloud')cloud++;else local++;
        if(r.testsPct!=null)tn++;});
      document.getElementById('day-title').textContent=MONTH_NAMES[+st.month.slice(5,7)-1]+' '+st.month.slice(0,4)+(all&&!st.project?' · all projects':st.project?' · '+st.project:'');
      document.getElementById('day-sum').textContent=tot+' session'+(tot===1?'':'s')+' · '+Math.round(tm/60)+' h active · '+tc+' commit'+(tc===1?'':'s')+(D.pro?' · '+local+' local · '+cloud+' cloud':'')+(tn?' · '+tn+' tested':(cloud?' · (cloud sessions have no test data)':''));
      document.getElementById('day-list').innerHTML='';
      dayButtons();
      return;
    }
    st.lastDay=st.day;dayButtons();
    var evs=dayEvents(),s={},c=0,dn=0;evs.forEach(function(x){s[x.r.id]=1;if(x.ev.type==='commit')c++;if(x.ev.type==='decision')dn++;});
    document.getElementById('day-title').textContent=new Date(st.day+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'})+(all&&!st.project?' · all projects':st.project?' · '+st.project:'');
    document.getElementById('day-sum').textContent=(function(n,w){return n+' '+w+(n===1?'':'s');})(Object.keys(s).length,'session')+' · '+c+' commit'+(c===1?'':'s')+' · '+dn+' decision'+(dn===1?'':'s');
    document.getElementById('day-list').innerHTML=evs.length?evs.map(function(x){var ev=x.ev,r=x.r;
      var tag=ev.type==='decision'?'<span style="color:var(--you)">'+(ev.exact?'You decided':'You said · best-effort')+'</span> · ':ev.type==='commit'?'<span style="color:var(--agent)">Commit</span> ':'Session started · ';
      return '<li><span class="cp-time">'+e(ft(ev.at))+'</span><span class="proj muted">'+e(r.project)+'</span><span>'+tag+'<a href="'+e(r.href)+'"'+peek(r)+'>'+e(ev.type==='start'?(r.short||r.title):ev.text)+'</a></span></li>';}).join(''):'<li class="empty">Nothing recorded on this day.</li>';
  }
  function dayButtons(){var t=document.getElementById('clear-day'),x=document.getElementById('export-day');
    if(x)x.hidden=!st.day;
    var reopen=!st.day&&st.lastDay&&visibleDay(st.lastDay);
    t.hidden=!st.day&&!reopen;
    t.textContent=st.day?'Close':'Expand';
    t.setAttribute('aria-expanded',String(!!st.day));
    t.title=st.day?'Collapse this day into the month summary':reopen?'Show '+fd(st.lastDay+'T12:00:00')+' again':'';}
  function visibleDay(d){return rows.some(function(r){return matches(r)&&(r.days||[]).indexOf(d)>=0;});}
  function pick(day){st.day=st.day===day?'':day;apply();var dv=document.getElementById('day-view');if(dv.scrollIntoView)dv.scrollIntoView({behavior:'smooth',block:'nearest'});}
  var q=document.getElementById('ask-q'),timer;
  q.addEventListener('input',function(){if(!q.value.trim()&&typeof dropAnswer==='function')dropAnswer();clearTimeout(timer);timer=setTimeout(function(){st.q=q.value.trim();st.cited=null;apply();},120);});
  var ps=document.getElementById('project');
  if(ps)ps.addEventListener('change',function(){st.project=ps.value;apply();});
  var pq=document.getElementById('project-q');
  if(pq&&ps){pq.addEventListener('input',function(){var v=pq.value.trim().toLowerCase(),m=[].find.call(ps.options,function(o){return o.value&&o.value.toLowerCase()===v;});
      if(!v||m){ps.value=m?m.value:'';ps.dispatchEvent(new Event('change'));}});
    pq.addEventListener('keydown',function(e){if(e.key==='Escape'&&pq.value){pq.value='';ps.value='';ps.dispatchEvent(new Event('change'));}});
    document.getElementById('clear').addEventListener('click',function(){pq.value='';});}
  var tg=[].slice.call(document.querySelectorAll('[data-source]'));
  function drawToggles(){tg.forEach(function(b){var k=b.getAttribute('data-source'),n=rows.filter(function(r){return r.kind===k;}).length;
    b.innerHTML=b.textContent.replace(/ \\d+$/,'')+' <span class="n">'+n+'</span>';b.setAttribute('aria-pressed',String(!!st.src[k]));b.disabled=!n;});}
  tg.forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-source');
    st.src[k]=!st.src[k];
    tg.forEach(function(b2){b2.classList.toggle('on',!!st.src[b2.getAttribute('data-source')]);});
    drawToggles();apply();});});
  drawToggles();
  document.getElementById('clear').addEventListener('click',function(){if(typeof dropAnswer==='function')dropAnswer();st.q='';st.src={local:true,cloud:true};drawToggles();st.project='';st.day='';st.agent='';st.lastDay='';st.from='';st.to='';df.value='';dt.value='';st.cited=null;st.refs=[];q.value='';if(ps)ps.value='';
    apply();});
  document.getElementById('clear-dates').addEventListener('click',function(){st.from=st.to='';df.value=dt.value='';st.day='';apply();});
  document.getElementById('clear-day').addEventListener('click',function(){if(st.day)st.day='';else if(st.lastDay){st.day=st.lastDay;if(st.day.slice(0,7)!==st.month)setMonth(st.day.slice(0,7));}apply();});
  if(months.length)setMonth(st.month);
  var m=location.hash.match(/^#day=(\\d{4}-\\d{2}-\\d{2})$/);if(m){setMonth(m[1].slice(0,7));st.day=m[1];}
  var mr=location.hash.match(/^#from=(\\d{4}-\\d{2}-\\d{2})&to=(\\d{4}-\\d{2}-\\d{2})$/);if(mr){df.value=mr[1];dt.value=mr[2];st.from=mr[1];st.to=mr[2];setMonth(mr[1].slice(0,7));}
  window.addEventListener('hashchange',function(){var h=location.hash.match(/^#day=(\\d{4}-\\d{2}-\\d{2})$/);if(h){setMonth(h[1].slice(0,7));pick(h[1]);}});
  apply();

  // Once you scroll past them, the search box and the filter row dock under the top bar. They are pinned in place
  // (position: fixed) rather than moved, so keyboard focus, typed text and open suggestions survive the scroll.
  (function(){var row=document.querySelector('.ask .ask-row'),ctl=document.getElementById('controls'),root=document.documentElement;if(!row||!ctl||!window.IntersectionObserver)return;
    var dock=document.createElement('div');dock.className='filter-dock';dock.setAttribute('aria-hidden','true');dock.hidden=true;document.body.appendChild(dock);
    var ph=[row,ctl].map(function(el){var p=document.createElement('div');p.className='dock-ph';el.parentNode.insertBefore(p,el);return p;}),on=false;
    var sentinel=document.createElement('div');ctl.parentNode.insertBefore(sentinel,ctl.nextSibling);
    function layout(){var bar=document.querySelector('.topbar'),top=bar&&getComputedStyle(bar).position==='sticky'?bar.getBoundingClientRect().bottom:0,
        vw=root.clientWidth,side=Math.max(16,(vw-1360)/2),wide=vw>=1400,rw=wide?Math.min(400,vw*0.28):Math.min(720,vw-2*side),rh=row.offsetHeight,ch=vw<=700?-8:ctl.offsetHeight;
      root.style.setProperty('--dock-top',top+'px');root.style.setProperty('--dock-l',side+'px');root.style.setProperty('--dock-rw',rw+'px');
      root.style.setProperty('--dock-cl',(wide?side+rw+14:side)+'px');root.style.setProperty('--dock-r',side+'px');root.style.setProperty('--dock-ct',(wide?0:rh+8)+'px');
      dock.style.top=top+'px';dock.style.height=(wide?Math.max(rh,ch):rh+8+ch)+16+'px';}
    function set(d){if(d===on)return;on=d;
      if(d){ph[0].style.height=row.offsetHeight+'px';ph[1].style.height=ctl.offsetHeight+'px';layout();}
      else{ph[0].style.height='';ph[1].style.height='';}
      row.classList.toggle('docked-row',d);ctl.classList.toggle('docked-ctl',d);dock.hidden=!d;}
    addEventListener('resize',function(){if(on)layout();});
    // Docked once the marker is above the line under the top bar (rootBounds.top): comparing with 0 missed wheel scrolls.
    new IntersectionObserver(function(es){var e=es[0],line=e.rootBounds?e.rootBounds.top:64;set(!e.isIntersecting&&e.boundingClientRect.bottom<=line+1);},{rootMargin:'-64px 0px 0px 0px'}).observe(sentinel);})();
})();`;

/** The earliest session day (YYYY-MM-DD) in the archive, so date controls never offer days it cannot show. */
export function firstDay(projects: ProjectPage[]): string {
  return projects.flatMap((p) => p.sessions.map((s) => dayKey(s.start))).filter(Boolean).sort()[0] ?? '';
}

function rangeRow(first = ''): string {
  const min = first ? ` min="${esc(first)}"` : '';
  return `<div class="range no-print" role="group" aria-label="Date range">
<label class="field"><span class="lbl">From</span><input type="date" id="jump-from"${min}></label><label class="field"><span class="lbl">To</span><input type="date" id="jump-to"${min}></label><button type="button" class="btn" id="clear-dates">Clear dates</button><span class="muted" style="font-size:12px;align-self:center">Filters dates and search.</span></div>`;
}

/** Search box for every edition. Pro turns it into the Ask box. */
function askBar(pro: boolean, first = ''): string {
  let html = searchBar(first);
  return html;
}

function searchBar(first: string): string {
  return `${rangeRow(first)}<section class="ask no-print" aria-label="Search">
<div class="ask-row"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
<label for="ask-q" class="visually-hidden">Search sessions</label>
<input id="ask-q" type="search" autocomplete="off" placeholder="Search prompts, decisions, commits and files…"></div>
<p class="ask-note">Results update as you type, typos and all.</p>
</section>`;
}


function controls(projects: ProjectPage[] | null, pro: boolean): string {
  const labels = projects ? projectLabels(projects) : new Map<string, string>();
  // Project filter with type-ahead: a search box with suggestions; the hidden select keeps the existing filter logic.
  const select = projects ? `<label class="field project-pick"><span class="lbl">Project</span><input id="project-q" type="search" list="project-names" placeholder="All projects" autocomplete="off" spellcheck="false" aria-label="Project: type to filter, empty for all"><datalist id="project-names">${projects.map((p) => `<option value="${esc(labels.get(p.slug) ?? p.name)}"></option>`).join('')}</datalist><select id="project" hidden aria-hidden="true" tabindex="-1"><option value="">All projects</option>${projects.map((p) => `<option value="${esc(labels.get(p.slug) ?? p.name)}">${esc(labels.get(p.slug) ?? p.name)}</option>`).join('')}</select></label>` : '';
  let source = '';
  let exportAll = '', exportDay = '';
  return `<div class="toolbar" id="controls">${select}${source}
<div class="jump" role="group" aria-label="Jump to month"><button type="button" id="jump-prev" aria-label="Previous month">‹</button><select id="jump-year" aria-label="Year"></select><select id="jump-month" aria-label="Month"></select><button type="button" id="jump-next" aria-label="Next month">›</button></div>

<span style="flex:1"></span>
<button type="button" class="btn" id="clear">Clear filters</button>
${exportAll}</div>
<div id="strip" class="strip"></div>
<div class="vz-tip" id="vz-tip" role="tooltip" hidden></div>
<section id="day-view" class="dayview" hidden><div class="dayview-head"><h2 id="day-title"></h2><span class="muted" id="day-sum" style="font-size:12px"></span>
${exportDay}<button type="button" class="btn no-print" id="clear-day">Close</button></div><ul id="day-list" class="day-list"></ul></section>
<p id="status" class="muted" aria-live="polite" style="margin:0 0 8px"></p>
<div id="sessions"></div>`;
}

function siteNotes(site: SiteInfo): string {
  const parts: string[] = [];
  if (site.emptyProjects.length) {
    const n = site.emptyProjects.length;
    parts.push(`<details class="fold quiet"><summary>${n} Claude Code project folder${n > 1 ? 's have' : ' has'} no saved sessions</summary><div class="fold-body"><p class="warnline">Claude Code keeps a folder per project in ~/.claude/projects but deletes old transcripts (after 30 days by default). These folders are empty now, so there is nothing to show: ${site.emptyProjects.map(esc).join(', ')}.</p></div></details>`);
  }
  if (site.unreadable.length) parts.push(`<details class="fold warn"><summary>${site.unreadable.length} transcript${site.unreadable.length > 1 ? 's' : ''} could not be read</summary><div class="fold-body"><ul>${site.unreadable.map((u) => `<li><span class="mono">${esc(u.file)}</span>: ${esc(u.reason)}</li>`).join('')}</ul></div></details>`);
  parts.push(`<p class="warnline">Built ${esc(fmtDate(site.generatedAt))} from local transcripts${site.pro ? ' and your Git/GitHub history' : ''}. Nothing leaves this computer${site.pro ? ' unless you press Ask' : ''}.</p>`);
  return parts.join('\n');
}

/** Agent families seen across these projects' sessions: the agent that ran each session plus any local models it called. */
function families(projects: ProjectPage[]): AgentFamily[] {
  const out = new Set<AgentFamily>();
  for (const p of projects) for (const s of p.sessions) {
    out.add(sessionFamily(s.agent));
    for (const m of s.models ?? []) if (modelFamily(m.model) === 'local') out.add('local');
  }
  return (['claude', 'openai', 'copilot', 'local'] as AgentFamily[]).filter((f) => out.has(f));
}

export function renderOverallIndex(projects: ProjectPage[], site: SiteInfo): string {
  const data = indexData(projects, 'all', !!site.pro);
  const local = projects.reduce((a, p) => a + p.sessions.length, 0);
  const cloud = data.sessions.length - local;
  const days = data.sessions.map((s) => s.day).filter(Boolean).sort();
  const body = `<header class="page-heading"><div><h1>All sessions</h1><p class="page-intro">Find the prompt, decision, commit or file you need.</p></div><span class="heading-count">${agentStack(families(projects))}${local} ${site.pro ? 'local' : `session${local === 1 ? '' : 's'}`}${cloud ? ` · ${cloud} cloud` : ''}</span></header>
<div class="meta" style="margin:0 0 16px"><span>${projects.length} projects</span>${days.length ? `<span>${esc(fmtDate(days[0] + 'T12:00:00'))} – ${esc(fmtDate(days[days.length - 1] + 'T12:00:00'))}</span>` : ''}</div>
${askBar(!!site.pro, days[0] ?? '')}
${controls(projects, !!site.pro)}
${siteNotes(site)}`;
  return page({ title: 'Session replays', root: '', nav: 'sessions', pro: site.pro, theme: site.theme, body, data, script: clientBundle(!!site.pro) + INDEX_JS });
}

/** Key for "What shipped": each swatch is a tiny card styled like the real ones, and only kinds that appear are listed. */
function shippedLegend(p: ProjectPage, pro: boolean): string {
  const kinds = new Set(monthCards(p, pro).flatMap((m) => m.cards.map((c) => c.kind)));
  const items = [kinds.has('pr') ? '<span><i class="lg lg-pr"></i>merged PR</span>' : '', kinds.has('tag') || kinds.has('version') ? '<span><i class="lg lg-rel"></i>release / version</span>' : '', kinds.has('cloud') ? '<span><i class="lg lg-cloud"></i>cloud session</span>' : ''].join('');
  return items ? `<span class="legend shipped-key">${items}</span>` : '';
}

export function renderProjectIndex(p: ProjectPage, site: SiteInfo): string {
  const data = indexData([p], 'project', !!site.pro);
  const active = p.sessions.reduce((a, s) => a + activeMinutes(s.activity ?? []), 0);
  const commits = p.sessions.reduce((a, s) => a + s.commits.length, 0);
  const body = `<header class="page-heading"><div><h1>${esc(p.name)}</h1><p class="page-intro">${p.sessions.length} sessions · ${esc(fmtMinutes(active))} active · ${commits} commits</p></div>${p.sessions.length || (p.cloud?.length && site.pro) ? `<span class="heading-count">${agentStack(families([p]))}${p.cloud?.length && site.pro ? `${p.cloud.length} cloud session${p.cloud.length === 1 ? '' : 's'}` : `${p.sessions.length} sessions`}</span>` : ''}</header>
<div class="meta" style="margin:0 0 8px">${p.webUrl && site.pro ? `<a href="${esc(p.webUrl)}" rel="noreferrer" class="btn sm">Open repository on GitHub ↗</a>` : p.repoPath ? `<span class="mono">${esc(p.repoPath)}</span>` : '<span>repository not found on this computer</span>'}</div>
<details class="fold shipped"><summary>What shipped, month by month</summary><div class="fold-body" style="max-height:none"><div class="toolbar" style="margin-top:0"><span style="flex:1"></span>${shippedLegend(p, !!site.pro)}</div>
${monthRows(p, !!site.pro)}
${site.pro ? '' : proNote('PR titles and cloud sessions are in Pro.')}</div></details>
<h2>Sessions</h2>
${askBar(!!site.pro, firstDay([p]))}
${controls(null, !!site.pro)}`;
  return page({ title: `${p.name} · Session replays`, root: '../', nav: 'projects', pro: site.pro, theme: site.theme,
    crumbs: [{ label: 'Projects', href: '../projects.html' }, { label: p.name }], body, data, script: clientBundle(!!site.pro) + INDEX_JS });
}

export function renderProjectsPage(projects: ProjectPage[], site: SiteInfo): string {
  const labels = projectLabels(projects);
  const cards = projects.map((p) => {
    const active = p.sessions.reduce((a, s) => a + activeMinutes(s.activity ?? []), 0);
    const last = p.sessions.map((s) => s.start).sort().pop() ?? '';
    const commits = p.sessions.reduce((a, s) => a + s.commits.length, 0);
    const tests = p.sessions.map((s) => s.tests[s.tests.length - 1]).filter(Boolean).pop();
    const pct = tests && tests.total ? Math.round((tests.passed / tests.total) * 100) : null;
    const updated = last ? `Updated ${fmtDate(last)}` : 'No local sessions yet';
    const testSummary = pct === null ? 'No test results' : `${pct}% latest tests passing`;
    return `<a class="project-card" href="${esc(p.slug)}/index.html" data-project-card data-project-name="${esc((labels.get(p.slug) ?? p.name).toLowerCase())}">
  <span class="project-card-top"><span class="project-glyph" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="project-card-heading"><strong>${esc(labels.get(p.slug) ?? p.name)}</strong><span class="muted">${esc(updated)}</span></span><span class="project-arrow" aria-hidden="true">↗</span></span>
  <span class="project-card-stats"><span><strong>${p.sessions.length}</strong><small>sessions</small></span><span><strong>${esc(fmtMinutes(active))}</strong><small>active</small></span><span><strong>${commits}</strong><small>commits</small></span></span>
  <span class="project-card-foot"><span class="project-health"><span class="dot ${pct === null ? 'none' : pctClass(pct)}"></span>${esc(testSummary)}</span><span class="project-agents">${p.cloud?.length && site.pro ? `<span class="chip cloud">${p.cloud.length} cloud</span>` : ''}${agentStack(families([p]))}</span></span>
</a>`;
  }).join('');
  const body = `<header class="page-heading"><div><h1>Projects</h1><p class="page-intro">Your coding sessions, by project.</p></div><span class="heading-count">${projects.length} project${projects.length === 1 ? '' : 's'}</span></header>
<div class="project-browser"><label class="project-search"><span aria-hidden="true">⌕</span><span class="visually-hidden">Filter projects</span><input id="project-search" type="search" placeholder="Filter projects…" autocomplete="off"><kbd>/</kbd></label><p class="muted" id="project-count" aria-live="polite">${projects.length} project${projects.length === 1 ? '' : 's'}</p></div>
<section class="project-grid" aria-label="Projects">${cards || '<p class="empty">No projects yet.</p>'}</section><p id="project-empty" class="empty" hidden>No projects match that name.</p>
${siteNotes(site)}`;
  const script = `(function(){var q=document.getElementById('project-search'),cards=[].slice.call(document.querySelectorAll('[data-project-card]')),count=document.getElementById('project-count'),empty=document.getElementById('project-empty'),idx=buildIndex(cards.map(function(c,i){return{id:String(i),fields:{title:c.getAttribute('data-project-name'),decisions:'',commits:'',prompts:'',files:''}};}));function apply(){var v=q.value.trim(),hits=v?new Set(search(idx,v,200,{filler:false}).map(function(h){return h.id;})):null,n=0;cards.forEach(function(c,i){var show=!hits||hits.has(String(i));c.hidden=!show;if(show)n++;});count.textContent=n+' project'+(n===1?'':'s');empty.hidden=n>0;}q.addEventListener('input',apply);})();`;
  return page({ title: 'Projects · Session replays', root: '', nav: 'projects', pro: site.pro, theme: site.theme, body, script: clientBundle(!!site.pro) + script });
}

// ---------- Cloud session detail page ----------

export function renderCloudSession(p: ProjectPage, cloudIndex: number, site: SiteInfo): string {
  const c = (p.cloud ?? [])[cloudIndex];
  if (!c) {
    return page({ title: 'Cloud session not found · Session replays', root: '../', nav: 'clouds', theme: site.theme,
      body: `<h1>Not found</h1><p class="empty">This cloud session page does not exist.</p>` });
  }
  const ghLink = c.link ?? c.pr?.url ?? (p.webUrl ? `${p.webUrl}/tree/${c.branch}` : '');
  // Each linked commit points to the local session that made it, with a hover card.
  const bySha = new Map(p.sessions.flatMap((s) => s.commits.map((x) => [x.hash, s] as const)));
  const sessionLink = (hash: string, text: string) => {
    const s = bySha.get(hash);
    return s ? `<a href="${esc(s.id)}.html"${peekAttr({ h: s.title, s: `Local session · ${fmtDate(s.start)} ${fmtTime(s.start)}`, r: [['Decisions', s.decisions.length || undefined], ['Commits', s.commits.length || undefined], ['Branch', s.branch]], g: 'Click to open the replay' })}>${esc(text)}</a>` : esc(text);
  };
  const tapeMarks = [...c.commits.map((x, i) => ({ x, who: 'agent' as const, id: `cm-${i}` })), ...(c.manualCommits ?? []).map((x, i) => ({ x, who: 'you' as const, id: `mc-${i}` }))]
    .sort((a, b) => a.x.at.localeCompare(b.x.at));
  const tape = tapeHtml({
    start: c.start, end: c.end, unit: 'commit', key: { you: 'Your commit', agent: 'Agent commit' },
    marks: tapeMarks.map(({ x, who, id }) => ({
      at: x.at, who, href: `#${id}`, title: x.subject,
      label: `${fmtTime(x.at)}, ${x.subject}, ${who === 'you' ? 'manual commit' : 'from an agent session'}`,
      peek: { h: x.subject, s: `${x.hash.slice(0, 7)} · ${fmtDate(x.at)} ${fmtTime(x.at)}`, r: [['Lines', `+${x.added} −${x.removed}`], ['Files', x.files.length || undefined], ['Made by', who === 'you' ? 'you (manual)' : 'an AI agent session']], g: 'Click to jump to the commit' },
    })),
  });
  const commitRows = c.commits.map((cm, i) => `<tr id="cm-${i}"><td class="mono">${esc(cm.hash.slice(0, 7))}</td><td>${sessionLink(cm.hash, cm.subject)}</td><td class="mono muted">${esc(fmtDate(cm.at))}</td><td class="num">${cm.added + cm.removed ? `<span class="plus">+${cm.added}</span> <span class="minus">−${cm.removed}</span>` : '—'}</td></tr>`).join('');
  const prLink = c.pr ? `<tr><td class="mono">#${c.pr.number}</td><td colspan="3">${esc(c.pr.title)}</td><td><a href="${esc(c.pr.url)}" rel="noreferrer" class="btn sm pr">View on GitHub ↗</a></td></tr>` : '';

  // PR body as collapsible section.
  const prBodyHtml = c.prBody ? `<details class="fold" style="margin:0 0 12px"><summary>PR description</summary><div class="fold-body"><pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.5">${esc(c.prBody)}</pre></div></details>` : '';

  // File stats table from PR diff.
  let fileStatsHtml = '';
  if (c.prFiles && c.prFiles.length) {
    const fileRows = c.prFiles.map((f) => `<tr><td class="mono">${esc(f.path)}</td><td class="num">${f.added ? `<span class="plus">+${f.added.toLocaleString('en')}</span>` : '—'}</td><td class="num">${f.removed ? `<span class="minus">−${f.removed.toLocaleString('en')}</span>` : '—'}</td></tr>`).join('');
    fileStatsHtml = `<div class="panel" style="margin-bottom:20px"><h2 style="margin:0 0 12px">File changes (${c.prFiles.length})</h2>
<table><thead><tr><th style="text-align:left">File</th><th class="num">Added</th><th class="num">Removed</th></tr></thead><tbody>${fileRows}</tbody></table></div>`;
  }

  // Commits that cannot be linked to an archived local session.
  let manualHtml = '';
  if (c.manualCommits && c.manualCommits.length) {
    const mRows = c.manualCommits.map((cm, i) => `<tr id="mc-${i}"><td class="mono">${esc(cm.hash.slice(0, 7))}</td><td>${esc(cm.subject)}</td><td class="mono muted">${esc(fmtDate(cm.at))}</td></tr>`).join('');
    manualHtml = `<div class="panel" style="margin-bottom:20px"><h2 style="margin:0 0 12px">Manual commits (${c.manualCommits.length})</h2>
<table><thead><tr><th>Commit</th><th>Message</th><th>Date</th></tr></thead><tbody>${mRows}</tbody></table></div>`;
  }

  // PR checks / CI status.
  let checksHtml = '';
  if (c.prChecks && c.prChecks.length) {
    const checkRows = c.prChecks.map((ch) => {
      const dot = ch.status === 'success' || ch.status === 'completed' ? 'ok' : ch.status === 'failure' || ch.status === 'error' ? 'bad' : 'warn';
      return `<tr><td>${esc(ch.name)}</td><td><span class="dot ${dot}"></span> ${esc(ch.status)}</td></tr>`;
    }).join('');
    checksHtml = `<div class="panel" style="margin-bottom:20px"><h2 style="margin:0 0 12px">CI checks (${c.prChecks.length})</h2>
<table><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody>${checkRows}</tbody></table></div>`;
  }

  // PR comments (captures "you" feedback).
  let commentsHtml = '';
  if (c.prComments && c.prComments.length) {
    const commentRows = c.prComments.map((cm) => `<tr><td class="mono">${esc(cm.user)}</td><td class="mono muted">${esc(fmtDate(cm.createdAt))}</td><td>${esc(cm.body.slice(0, 200))}</td></tr>`).join('');
    commentsHtml = `<div class="panel" style="margin-bottom:20px"><h2 style="margin:0 0 12px">PR comments (${c.prComments.length})</h2>
<table><thead><tr><th>User</th><th>Date</th><th>Comment</th></tr></thead><tbody>${commentRows}</tbody></table></div>`;
  }

  const body = `<header class="page-hero cloud-hero">
<div class="hero-top"><p class="eyebrow"><a href="index.html">${esc(p.name)}</a></p><span class="chip cloud">Cloud session${c.pr ? ` · PR #${c.pr.number}` : ''}</span></div>
<h1>${esc(shortTitle(c.title))}</h1>
<div class="meta" style="margin:10px 0 0">
  <span>Branch: <span class="mono">${esc(c.branch)}</span></span>
  <span>${esc(fmtDate(c.start))} – ${esc(fmtDate(c.end))}</span>
  <span>${c.commits.length} commit${c.commits.length === 1 ? '' : 's'}</span>
  ${c.prComments && c.prComments.length ? `<span>${c.prComments.length} comment${c.prComments.length === 1 ? '' : 's'} on PR</span>` : ''}
  ${c.manualCommits && c.manualCommits.length ? `<span>${c.manualCommits.length} manual commit${c.manualCommits.length === 1 ? '' : 's'}</span>` : ''}
</div>
${tape}</header>
<div class="panel" style="margin-bottom:20px">
  <h2 style="margin:0 0 12px">GitHub</h2>
  <div class="gh-row">${ghLink ? `<a href="${esc(ghLink)}" rel="noreferrer" class="btn sm">Open in GitHub ↗</a>` : ''}${c.pr ? `<a href="${esc(c.pr.url)}" rel="noreferrer" class="btn sm pr">Pull Request #${c.pr.number} ↗</a>` : ''}</div>
  ${!ghLink && !c.pr ? '<p class="muted">No GitHub link available.</p>' : ''}
</div>
${prBodyHtml}
${c.pr ? `<div class="panel" style="margin-bottom:20px"><h2 style="margin:0 0 12px">Pull request</h2><table><tbody>${prLink}</tbody></table></div>` : ''}
${fileStatsHtml}
${manualHtml}
${checksHtml}
${commentsHtml}
<div class="panel"><h2 style="margin:0 0 12px">Commits linked to local sessions (${c.commits.length})</h2>
<table><thead><tr><th>Commit</th><th>Message</th><th>Date</th><th class="num">Lines</th></tr></thead><tbody>${commitRows || '<tr><td colspan="4" class="empty">No commits linked.</td></tr>'}</tbody></table></div>`;
  return page({ title: `Cloud: ${c.title} · Session replays`, root: '../', nav: 'clouds', theme: site.theme,
    crumbs: [{ label: 'All sessions', href: '../index.html' }, { label: p.name, href: 'index.html' }, { label: c.title }],
    body });
}
