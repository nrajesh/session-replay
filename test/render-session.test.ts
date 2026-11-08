import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSession } from '../src/render/session.ts';
import { jsonForScript, esc } from '../src/render/html.ts';
import { emptySession } from '../src/parse.ts';
import type { SessionModel } from '../src/types.ts';

function model(): SessionModel {
  const s = emptySession('/x/abc.jsonl');
  Object.assign(s, {
    projectName: 'demo', title: 'Make merges safe', start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T10:30:00.000Z',
    activity: [['2026-05-02T09:00:00.000Z', '2026-05-02T09:45:00.000Z']],
    branch: 'main', entrypoint: 'claude-vscode', firstPrompt: 'Make merging safe', costUSD: 1.5,
    prs: [{ number: 7, url: 'https://github.com/acme/demo/pull/7' }],
    tests: [{ at: '2026-05-02T09:05:00.000Z', runner: 'jest', passed: 7, failed: 2, total: 9 }, { at: '2026-05-02T09:40:00.000Z', runner: 'jest', passed: 9, failed: 0, total: 9 }],
  });
  const exact = { kind: 'ask' as const, exact: true, at: '2026-05-02T09:10:00.000Z', header: 'Merges', question: 'What happens to budgets?',
    options: [{ label: 'Move', recommended: true }, { label: 'Delete', recommended: false }], chosen: ['Delete'], notes: 'Saner to delete.' };
  const loose = { kind: 'approval' as const, exact: false, at: '2026-05-02T09:20:00.000Z', question: 'Shall I proceed?', options: [], chosen: [], quote: 'yes go ahead' };
  const commit = { hash: 'abcdef1234567', at: '2026-05-02T09:30:00.000Z', subject: 'fix: clean up merges', files: ['src/a.ts'], added: 5, removed: 1, via: ['window' as const] };
  s.decisions = [exact, loose];
  s.commits = [commit];
  s.checkpoints = [{ at: commit.at, commit, title: commit.subject, tag: 'Decision', who: 'you', decisions: [exact, loose] }];
  s.turns = [{ at: s.start, role: 'user', text: 'evil </script><img src=x onerror=alert(1)>' }, { at: s.start, role: 'tool', tool: 'Bash', text: '$ ls\n' + 'y'.repeat(5000) }];
  return s;
}
const free = { projectName: 'demo' };
const pro = { projectName: 'demo', pro: true, webUrl: 'https://github.com/acme/demo', prs: [{ number: 7, title: 'Safer merges', branch: 'x', mergedAt: null, url: 'https://github.com/acme/demo/pull/7', state: 'MERGED', body: '' }] };

test('session page shows compact stats, checkpoint and decision details', () => {
  const html = renderSession(model(), free);
  assert.match(html, /Make merges safe/);
  assert.match(html, /What happens to budgets\?/);
  assert.match(html, /AI agent recommendation/);
  assert.match(html, /Saner to delete\./);
  assert.match(html, /best-effort/);
  assert.match(html, /45 min active/);
  assert.match(html, /<span class="big">9<\/span><span class="pct good">100%<\/span>/);
  assert.match(html, /<span class="plus">\+5<\/span>\s*<span class="minus">−1<\/span>/);
});

test('Codex replay identifies its source, speaker, and citation anchors', () => {
  const s = model();
  s.agent = 'codex';
  s.turns = [{ at: s.start, role: 'assistant', text: 'Saved Codex answer' }];
  const html = renderSession(s, free);
  assert.match(html, /AI agent session replay/);
  assert.match(html, /Codex/);
  assert.match(html, /<div class="who">AI agent<\/div>/);
  assert.match(html, /id="turn-0"/);
});

test('assistant and legacy checkpoint labels render as AI agent', () => {
  const s = model();
  s.turns = [{ at: s.start, role: 'assistant', text: 'An agent response.' }];
  Object.assign(s.checkpoints[0], { who: 'Claude' });
  const html = renderSession(s, pro);
  assert.match(html, /<div class="who">AI agent<\/div>/);
  assert.doesNotMatch(html, />Claude(?:<|’)/);
});

test('unknown tests say unknown', () => {
  const m = model();
  m.tests = [];
  assert.match(renderSession(m, free), /Tests<\/span>\s*<span class="tile-value"><span class="muted">unknown/);
});

test('header has navigation and the theme switch; theme setting is applied', () => {
  const html = renderSession(model(), { ...free, theme: 'dark' as const });
  assert.match(html, /<html lang="en" data-theme="dark">/);
  for (const t of ['Sessions', 'Projects', 'Usage']) assert.match(html, new RegExp(`>${t}[ <]`));
  assert.match(html, /data-action="theme"/);
});

test('free edition: tiles are plain, no detail panels or GitHub links', () => {
  const html = renderSession(model(), free);
  assert.doesNotMatch(html, /<dialog id="m-/);
  assert.ok(!html.includes('/commit/'));
});





test('transcript text is escaped and long tool output is clipped', () => {
  const html = renderSession(model(), pro);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('y'.repeat(2500)));
});

test('page loads nothing from the network', () => {
  const html = renderSession(model(), pro);
  assert.ok(!/<(script|link|img|iframe)[^>]+(src|href)=["']?https?:/i.test(html));
  assert.ok(!/@import|url\(\s*["']?https?:/i.test(html));
});

test('collapsible sections keep their header in view: content scrolls in a box below it', () => {
  const m = model();
  m.warnings = ['unreadable line 3 in x.jsonl'];
  const html = renderSession(m, free);
  assert.match(html, /<details class="fold"><summary>Full conversation · 2 entries<\/summary><div class="fold-body">/);
  assert.match(html, /<details class="fold warn"><summary>1 note about reading this session<\/summary><div class="fold-body">/);
});

test('inline scripts parse', () => {
  for (const html of [renderSession(model(), free), renderSession(model(), pro)]) {
    for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
  }
});

test('jsonForScript cannot close the script tag', () => {
  const s = jsonForScript({ a: '</script><b>' });
  assert.ok(!s.includes('<'));
  assert.deepEqual(JSON.parse(s), { a: '</script><b>' });
  assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});





test('theme button flips between light and dark in one click (auto resolves to what is showing)', () => {
  const html = renderSession(model(), free);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /cur==='auto'\?'dark'/);
});

test('checkpoints can be searched on the session page; greyed ones are marked, not removed', () => {
  const m = model();
  m.checkpoints.push({ ...m.checkpoints[0], title: 'docs: readme', decisions: [] });
  const html = renderSession(m, free);
  assert.match(html, /id="cp-search"/);
  assert.match(html, /<li data-hay="[^"]*clean up merges/);
  assert.match(html, /classList\.toggle\('dim'/);
});



test('checkpoint search text includes the label shown on the card (decisions · you)', () => {
  const html = renderSession(model(), free);
  assert.match(html, /<li data-hay="[^"]*2 decisions you/);
  assert.match(html, /search\(idx,q,200,\{filler:false\}\)/);
});

test('risky actions show on the tape, in the checkpoint list, as a chip and as a list; none means nothing extra', () => {
  const s = model();
  const none = renderSession(s, free);
  assert.doesNotMatch(none, /id="risky"|class="tape-risk"|class="chip risk"|class="k-risk"/);
  s.riskyActions = [
    { at: '2026-05-02T09:08:00.000Z', kind: 'reset-hard', command: 'git reset --hard HEAD~2' },
    { at: '2026-05-02T10:00:00.000Z', kind: 'force-push', command: 'git push --force origin <main>' },
  ];
  const html = renderSession(s, free);
  assert.match(html, /<a class="chip risk" href="#risky">2 risky actions<\/a>/);
  assert.match(html, /<section class="panel risky-panel" id="risky"/);
  assert.match(html, /<li id="risk-0" data-cp="0"><button type="button" class="risk-btn" aria-controls="cp-0"><span class="chip risk">Hard reset<\/span>/);
  assert.ok(html.indexOf('id="risk-1"') < html.indexOf('id="risk-0"'), 'newest risky action first');
  assert.match(html, /<code>git push --force origin &lt;main&gt;<\/code>/, 'commands are escaped');
  assert.equal((html.match(/class="tape-risk"/g) ?? []).length, 2);
  assert.match(html, /class="tape-risk" style="--x:[\d.]+" href="#risk-1" aria-label="[^"]*risky action: Force push"/);
  assert.match(html, /class="k-risk">Risky action</);
  assert.match(html, /<span class="risk-flag">2 risky<\/span>/, 'both fall in the only checkpoint');
  s.riskyActions = [s.riskyActions[0]];
  assert.match(renderSession(s, free), /1 risky action</);
});

test('the hero always shows the risk chip, then the source chip, in the same place', () => {
  const s = model();
  const hero = (h: string) => h.match(/<div class="hero-badges">([\s\S]*?)<\/div><\/div>/)![1];
  s.riskyActions = undefined;
  let h = hero(renderSession(s, free));
  assert.match(h, /^<span class="chip plain"[^>]*>Risks not checked<\/span><span class="chip plain"[^>]*>Source files intact<\/span>$/);
  s.riskyActions = [];
  h = hero(renderSession(s, free));
  assert.match(h, /^<span class="chip plain"[^>]*>No risky actions<\/span><span class="chip plain"[^>]*>Source files intact<\/span>$/);
  s.riskyActions = [{ at: s.start, kind: 'force-push', command: 'git push --force' }];
  h = hero(renderSession(s, { ...free, sourceGone: 'disk' }));
  assert.match(h, /^<a class="chip risk" href="#risky">1 risky action<\/a><span class="chip plain gone"[^>]*>Source removed<\/span>$/);
});
