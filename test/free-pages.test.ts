import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOverallIndex, renderProjectIndex, renderUsage } from '../src/render/indexes.ts';
import { renderSession } from '../src/render/session.ts';
import { emptySession } from '../src/parse.ts';
import { PRO_URL, proNote } from '../src/render/pro-link.ts';
import type { ProjectPage, SiteInfo } from '../src/render/index.ts';
import type { SessionSummary } from '../src/types.ts';

const free: SiteInfo = { generatedAt: '2026-06-03T00:00:00.000Z', emptyProjects: [], unreadable: [], pro: false };
const s = { ...emptySession('/x/a.jsonl'), id: 'a', title: 'Fix login', start: '2026-06-01T10:00:00Z', end: '2026-06-01T11:00:00Z', prompts: [], projectSlug: 'demo', projectName: 'demo', projectKey: 'demo' } as unknown as SessionSummary;
const demo: ProjectPage = { name: 'demo', slug: 'demo', sessions: [s], milestones: [] };

test('Pro link points to the public README', () => {
  assert.equal(PRO_URL, 'https://github.com/nrajesh/session-replay#pro');
  assert.match(proNote('Charts you can click are in Pro.'), /^<p class="pro-note[^"]*"><span>Charts you can click are in Pro\.<\/span> <a href="https:\/\/github\.com\/nrajesh\/session-replay#pro"/);
});

test('free pages never tell people to switch Pro on with a command', () => {
  const pages = [renderUsage([demo], free), renderOverallIndex([demo], free), renderProjectIndex(demo, free)];
  for (const html of pages) assert.doesNotMatch(html, /config set edition/);
  assert.ok(renderUsage([demo], free).includes(PRO_URL));
});

test('free session page links to Pro once, under the hero', () => {
  const html = renderSession({ ...emptySession('/x/a.jsonl'), id: 'a', title: 'Fix login', start: '2026-06-01T10:00:00Z', end: '2026-06-01T11:00:00Z' }, { projectName: 'demo', pro: false });
  assert.equal(html.split(PRO_URL).length - 1, 1);
});

test('free index has a plain search box and no Excel buttons', () => {
  const html = renderOverallIndex([demo], free);
  assert.match(html, /<label for="ask-q" class="visually-hidden">Search sessions<\/label>/);
  assert.doesNotMatch(html, /id="ask-go"|id="export"|id="export-day"|Export Excel/);
});

test('free terms and privacy only describe what Free does', async () => {
  const { renderLegal } = await import('../src/render/legal.ts');
  const html = renderLegal(free);
  assert.match(html, /it stays there\.<\/p>/);
  const text = html.slice(html.indexOf('<article class="legal">'), html.indexOf('</article>'));
  assert.doesNotMatch(text, /\(Pro\)|press Ask|serve|uninstall-hook|Codex/);
  assert.match(text, /Uninstall the plugin to stop automatic updates/);
});
