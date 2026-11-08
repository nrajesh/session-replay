import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOverallIndex, renderProjectIndex, renderProjectsPage, renderUsage, renderCloudSession, indexData, monthCards, usageData } from '../src/render/indexes.ts';
import { emptySession } from '../src/parse.ts';
import type { SessionSummary } from '../src/types.ts';
import type { ProjectPage, SiteInfo } from '../src/render/index.ts';

function summary(id: string, project: string, start: string, extra: Partial<SessionSummary> = {}): SessionSummary {
  const { turns, ...rest } = emptySession(`/x/${id}.jsonl`);
  void turns;
  return { ...rest, id, projectName: project, projectKey: project, projectSlug: project, title: `Title ${id}`, start, end: start, prompts: ['merge vendors </script>'],
    activity: [[start, new Date(Date.parse(start) + 30 * 60000).toISOString()]], ...extra };
}

const demo: ProjectPage = {
  name: 'demo', slug: 'demo', repoPath: '/r/demo', webUrl: 'https://github.com/acme/demo',
  sessions: [summary('s1', 'demo', '2026-05-01T10:00:00.000Z', {
    costUSD: 2, prs: [{ number: 7, url: 'u7' }],
    commits: [{ hash: 'abc1234def', at: '2026-05-01T10:20:00.000Z', subject: 'feat: ledger names', files: ['src/a.ts'], added: 10, removed: 2, via: ['window'] }],
    decisions: [{ kind: 'ask', exact: true, at: '2026-05-01T10:10:00.000Z', question: 'Block duplicates?', options: [], chosen: ['Yes'] }],
  })],
  milestones: [{ at: '2026-04-01T00:00:00.000Z', kind: 'tag', label: 'v1.0.0', hash: 'x' }, { at: '2026-05-02T00:00:00.000Z', kind: 'pr', label: 'PR #7', hash: 'y' }, { at: '2026-05-02T00:00:00.000Z', kind: 'pr', label: 'PR #8', hash: 'z' }],
  prs: [{ number: 7, title: 'Ledger names', branch: 'feat', mergedAt: '2026-05-02T00:00:00Z', url: 'u7', state: 'MERGED', body: '' }],
  cloud: [{ branch: 'claude/gallant-1', title: 'Cloud work', start: '2026-05-03T09:00:00.000Z', end: '2026-05-03T10:00:00.000Z', commits: [], link: 'https://claude.ai/code/session_x', pr: undefined }],
};
const other: ProjectPage = { name: 'other', slug: 'other', sessions: [summary('s2', 'other', '2026-06-01T15:00:00.000Z', { costUSD: 1 })], milestones: [] };
const site = (pro: boolean): SiteInfo => ({ generatedAt: '2026-06-03T00:00:00.000Z', emptyProjects: ['budget-it'], unreadable: [], pro });

test('index data: one row per session plus cloud sessions in pro', () => {
  const free = indexData([demo, other], 'all', false);
  assert.equal(free.sessions.length, 2);
  const s1 = free.sessions.find((s: any) => s.id === 's1')!;
  assert.equal(s1.href, 'demo/s1.html');
  assert.equal(s1.active, 30);
  assert.equal(s1.added, 10);
  assert.deepEqual(s1.events.map((e: any) => e.type), ['start', 'decision', 'commit']);
  const pro = indexData([demo, other], 'all', true);
  const cloud = pro.sessions.find((s: any) => s.kind === 'cloud')!;
  assert.equal(cloud.title, 'Cloud work');
  assert.equal(cloud.href, 'demo/branch-claude-gallant-1.html');
});

test('overall page: Ask bar, date jump, project filter, no calendar grid, no network', () => {
  const html = renderOverallIndex([demo, other], site(false));
  assert.match(html, /id="ask-q"/);
  assert.match(html, /id="jump-year"/);
  assert.match(html, /id="jump-from"/);
  assert.match(html, /<option value="demo">demo<\/option>/);
  assert.match(html, /budget-it/);
  assert.ok(!html.includes('merge vendors </script>'));
  assert.ok(!/<(script|link|img|iframe)[^>]+(src|href)=["']?https?:/i.test(html));
});

test('month cards: PR titles in pro, same-day PRs grouped, cards link to the session', () => {
  const months = monthCards(demo, true);
  assert.deepEqual(months.map((m) => m.month), ['2026-05', '2026-04']);
  const may = months[0].cards;
  const pr = may.find((c) => c.kind === 'pr')!;
  assert.equal(pr.when, 'PR #7, #8');
  assert.match(pr.what, /Ledger names/);
  assert.equal(pr.href, 's1.html');
  assert.ok(may.some((c) => c.kind === 'cloud'));
  assert.ok(!monthCards(demo, false)[0].cards.some((c) => c.kind === 'cloud'));
});

test('project page renders month rows; projects page lists projects', () => {
  const projectHtml = renderProjectIndex(demo, site(true));
  assert.match(projectHtml, /What shipped, month by month/);
  assert.match(projectHtml, /<a href="https:\/\/github\.com\/acme\/demo" rel="noreferrer" class="btn sm">Open repository on GitHub ↗<\/a>/);
  assert.doesNotMatch(renderProjectIndex(demo, site(false)), /Open repository on GitHub/);
  const p = renderProjectsPage([demo, other], site(false));
  assert.match(p, /href="demo\/index.html"/);
  assert.match(p, /href="other\/index.html"/);
  assert.match(p, /class="project-card"/);
  assert.match(p, /id="project-search"/);
  assert.match(p, /data-project-name="demo"/);
  assert.match(p, /search\(idx,v,200,\{filler:false\}\)/);
  assert.match(p, /scrollbar-gutter:stable/);
});

test('shared shell provides keyboard-first navigation and screen-aware search actions', () => {
  const html = renderOverallIndex([demo, other], site(true));
  assert.match(html, /data-action="open-command"[^>]*aria-label="Find anything ⌘K"/);
  assert.match(html, /data-action="open-command"[^>]*aria-keyshortcuts="Control\+K Meta\+K"/);
  assert.match(html, /id="command-menu"[^]*?id="command-search"/);
  assert.match(html, /data-focus-target="ask-q"/);
  assert.match(html, /data-focus-target="project-search"/);
  assert.match(html, /function distance\(a,b,max\)/);
});

test('usage: monthly hours and cost per project (pro); free shows a locked teaser', () => {
  const u = usageData([demo, other]);
  assert.deepEqual(u.months.map((m) => [m.month, m.minutes, m.cost]), [['2026-05', 30, 2], ['2026-06', 30, 1]]);
  assert.equal(u.projects[0].name, 'demo');
  assert.match(renderUsage([demo, other], site(false)), /class="pro-note no-print"><a href="https:\/\/github\.com\/nrajesh\/session-replay#pro"/);
});

test('every inline script parses', () => {
  for (const html of [renderOverallIndex([demo, other], site(true)), renderProjectIndex(demo, site(false)), renderUsage([demo], site(true)), renderProjectsPage([demo], site(true))]) {
    for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
  }
});

test('every card is clickable: session if known, else GitHub; each PR number links to its PR', () => {
  const p = { ...demo, sessions: [], prs: [{ ...demo.prs![0], url: 'https://github.com/acme/demo/pull/7' }, { number: 8, title: 'Other', branch: 'b', mergedAt: null, url: 'https://github.com/acme/demo/pull/8', state: 'MERGED', body: '' }] };
  const pr = monthCards(p, true)[0].cards.find((c) => c.kind === 'pr')!;
  assert.equal(pr.href, 'https://github.com/acme/demo/pull/7');
  assert.deepEqual(pr.links, [{ label: '#7', href: 'https://github.com/acme/demo/pull/7' }, { label: '#8', href: 'https://github.com/acme/demo/pull/8' }]);
  const tag = monthCards(p, true).find((m) => m.month === '2026-04')!.cards[0];
  assert.equal(tag.href, 'https://github.com/acme/demo/commit/x');
  const html = renderProjectIndex(p, site(true));
  assert.ok(!/<(div|section) class="card k-(?!pr)/.test(html));
  assert.match(html, /<a href="https:\/\/github.com\/acme\/demo\/pull\/8"[^>]*>#8<\/a>/);
});

test('month label says local sessions and how much shipped', () => {
  const p = { ...demo, sessions: [] };
  const html = renderProjectIndex(p, site(true));
  assert.match(html, /No local sessions · 1 cloud · 2 PRs shipped/);
});

test('rows carry PR links so the table can link them', () => {
  const r = indexData([demo], 'all', true).sessions.find((x) => x.id === 's1')!;
  assert.deepEqual(r.prLinks, [{ n: 7, url: 'u7' }]);
});

test('cloud session GitHub buttons use the same compact styling as local PR pills', () => {
  const project: ProjectPage = {
    ...demo,
    cloud: [{
      ...demo.cloud![0],
      pr: { number: 259, title: 'Premium buttons', branch: 'claude/ui', mergedAt: null, url: 'https://github.com/acme/demo/pull/259', state: 'OPEN', body: '' },
    }],
  };
  const html = renderCloudSession(project, 0, site(true));
  assert.match(html, /class="btn sm">Open in GitHub ↗<\/a>/);
  assert.match(html, /class="btn sm pr">Pull Request #259 ↗<\/a>/);
  assert.doesNotMatch(html, /class="btn primary">Open in GitHub/);
});

test('date range sits above the search bar on every sessions page, same order everywhere', () => {
  for (const html of [renderOverallIndex([demo, other], site(true)), renderProjectIndex(demo, site(true))]) {
    const at = (s: string) => html.indexOf(s);
    assert.ok(at('id="jump-from"') > 0 && at('id="jump-from"') < at('id="ask-q"'));
    assert.ok(at('id="ask-q"') < at('id="jump-year"'));
    assert.ok(at('id="jump-year"') < at('id="strip"'));
  }
});

test('local and cloud have one colour pair used in legend, strip and table', () => {
  const html = renderOverallIndex([demo, other], site(true));
  assert.match(html, /class="sw local"/);
  assert.match(html, /class="sw cloud"/);
  assert.match(html, /--cloud:/);
  assert.match(html, /k-cloud/);
});

test('usage data carries per-session activity by day and hour so any range can be recomputed', () => {
  const u = usageData([demo, other]);
  const s = u.sessions.find((x) => x.id === 's1')!;
  assert.equal(s.parts.reduce((a: number, p: [string, number, number]) => a + p[2], 0), 30);
  assert.ok(s.parts.every((p: [string, number, number]) => /^\d{4}-\d\d-\d\d$/.test(p[0]) && p[1] >= 0 && p[1] < 24));
  assert.equal(s.cost, 2);
});





test('shared cards use consistent, theme-aware surface tokens', () => {
  const html = renderUsage([demo, other], site(false));
  assert.match(html, /--radius-card:14px/);
  assert.match(html, /--shadow-card:0 10px 28px rgba\(0,0,0,.2\)/);
  assert.match(html, /--shadow-card:0 10px 28px rgba\(20,24,32,.07\)/);
  assert.match(html, /\.panel,\.stat4,\.tile,\.settings-card,\.ask-card,\.local-card\{border-radius:var\(--radius-card\);box-shadow:var\(--shadow-card\)\}/);
});

test('local sessions are tagged like cloud ones', () => {
  const html = renderOverallIndex([demo, other], site(true));
  assert.match(html, /<span class="chip local">local<\/span>/);
  assert.match(html, /--local:/);
});

test('source is a pair of coloured toggles on Pro; what shipped is collapsed on the project page', () => {
  assert.doesNotMatch(renderProjectIndex(demo, site(false)), /data-source=/);
});



test('activity strip uses the same chart parts as Usage: gridlines, thin stacked bars, tooltip', () => {
  for (const html of [renderOverallIndex([demo, other], site(true)), renderProjectIndex(demo, site(true))]) {
    assert.match(html, /id="vz-tip"/);
    assert.match(html, /class="vz-plot"/);
    assert.match(html, /vz-stack/);
    assert.doesNotMatch(html, /strip-bars/);
  }
});





test('every page has a footer with terms, privacy and contact; the legal page explains both', async () => {
  const { renderLegal } = await import('../src/render/legal.ts');
  const html = renderOverallIndex([demo, other], site(true));
  assert.match(html, /<footer class="site-foot">/);
  assert.match(html, /href="legal.html#terms"/);
  assert.match(html, /href="legal.html#privacy"/);
  assert.match(html, /href="https:\/\/github.com\/[^"]+\/issues"[^>]*>Contact</);
  assert.match(renderProjectIndex(demo, site(true)), /href="..\/legal.html#privacy"/);
  const legal = renderLegal(site(true));
  assert.match(legal, /id="terms"/);
  assert.match(legal, /id="privacy"/);
  assert.match(html, /<details class="fold quiet"><summary>1 Claude Code project folder has no saved sessions/);
});





test('projects sharing a folder name are labelled owner/repo; unique names stay as they are', () => {
  const a: ProjectPage = { name: 'shop', slug: 'shop-aaaaaa', repoPath: '/w/a/shop', webUrl: 'https://github.com/acme/shop', sessions: [summary('a1', 'shop', '2026-05-01T10:00:00.000Z', { projectSlug: 'shop-aaaaaa' })], milestones: [] };
  const b: ProjectPage = { name: 'shop', slug: 'shop-bbbbbb', repoPath: '/w/b/shop', webUrl: 'https://github.com/nrajesh/shop', sessions: [summary('b1', 'shop', '2026-05-02T10:00:00.000Z', { projectSlug: 'shop-bbbbbb' })], milestones: [] };
  const c: ProjectPage = { name: 'shop', slug: 'shop-cccccc', repoPath: '/w/c/shop', sessions: [], milestones: [] };
  const d = indexData([a, b, other], 'all');
  assert.deepEqual(d.projects.map((p) => p.name), ['acme/shop', 'nrajesh/shop', 'other']);
  assert.deepEqual(d.sessions.map((r) => r.project).sort(), ['acme/shop', 'nrajesh/shop', 'other']);
  assert.equal(indexData([a, c], 'all').projects[1].name, 'c/shop');
  const html = renderOverallIndex([a, b], site(true));
  assert.match(html, /<option value="nrajesh\/shop">/);
});





test('Usage presets are all on when the archive is old enough, and the note is gone', () => {
  const old: ProjectPage = { name: 'old', slug: 'old', sessions: [summary('s0', 'old', '2024-01-10T10:00:00.000Z')], milestones: [] };
  const html = renderUsage([old, demo], site(true));
  assert.doesNotMatch(html, /aria-disabled="true"/);
  assert.doesNotMatch(html, /id="data-start"/);
});

test('search and calendar date boxes start at the first archived day', () => {
  assert.match(renderOverallIndex([demo, other], site(true)), /id="jump-from" min="2026-05-01"/);
  assert.match(renderProjectIndex(other, site(true)), /id="jump-to" min="2026-06-01"/);
});



test('every Usage chart panel has a PDF button, and Pro pages add CSV', () => {
  const free = renderUsage([demo, other], site(false));
  const panels = (h: string) => (h.match(/data-action="print-panel"/g) ?? []).length;
  assert.equal(panels(free), 1, 'the free chart');
  assert.doesNotMatch(free, /data-csv=/);
});

test('the free chart carries its numbers for the PDF, hidden on screen', () => {
  const free = renderUsage([demo, other], site(false));
  assert.match(free, /<div class="print-data"><h3>Data<\/h3><table><thead><tr><th>Month<\/th><th>Active hours<\/th><th>Sessions<\/th><th>Commits<\/th>/);
  assert.match(free, /\.print-data\{display:none\}/);
});
