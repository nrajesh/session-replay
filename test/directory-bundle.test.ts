// Guards the bundle submitted to Anthropic's directory (directory/). From publishers that are not Verified,
// the directory takes only documents and images: no programs, no hooks, no bin/, no local servers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundle = fileURLToPath(new URL('../directory/', import.meta.url));
const ALLOWED = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);
const TEXT = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(bundle);
const rel = (p: string) => relative(bundle, p);

test('directory bundle holds only documents and images', () => {
  const refused = files.filter((p) => !(ALLOWED.has(extname(p).toLowerCase()) || basename(p) === 'LICENSE')).map(rel);
  assert.deepEqual(refused, []);
});

test('directory bundle has no program entry points', () => {
  for (const name of ['bin', 'hooks', 'agents', 'commands', '.mcp.json', '.lsp.json', 'package.json', 'settings.json']) {
    assert.ok(!existsSync(join(bundle, name)), `${name} must not be in the directory bundle`);
  }
  const manifest = JSON.parse(readFileSync(join(bundle, '.claude-plugin/plugin.json'), 'utf8'));
  for (const key of ['hooks', 'mcpServers', 'lspServers', 'commands', 'agents', 'userConfig', 'settings', 'dependencies']) {
    assert.ok(!(key in manifest), `plugin.json must not set ${key}`);
  }
  for (const p of files.filter((f) => TEXT.has(extname(f).toLowerCase()))) {
    assert.ok(!readFileSync(p, 'utf8').startsWith('#!'), `${rel(p)} must not start with #!`);
    assert.ok(statSync(p).size < 256 * 1024, `${rel(p)} is too large`);
    assert.equal(statSync(p).mode & 0o111, 0, `${rel(p)} must not be executable`);
  }
});

test('each skill declares only a name and a description', () => {
  const skills = files.filter((p) => basename(p) === 'SKILL.md');
  assert.ok(skills.length > 0);
  for (const p of skills) {
    const m = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(p, 'utf8'));
    assert.ok(m, `${rel(p)} needs front matter`);
    const keys = m[1].split('\n').filter((l) => /^\S/.test(l)).map((l) => l.split(':')[0]);
    assert.deepEqual(keys.sort(), ['description', 'name'], rel(p));
  }
});

test('skills never tell Claude to download, install or run fetched code', () => {
  const risky = /\b(curl|wget|npx|bunx|uvx|pipx|pip3? install|npm (i|install|exec)|pnpm (dlx|add|install)|yarn (dlx|add)|brew install|git clone|plugin (marketplace add|install)|sudo|eval|base64)\b/i;
  for (const p of files.filter((f) => f.includes(`${join('directory', 'skills')}`) && extname(f) === '.md')) {
    const hit = readFileSync(p, 'utf8').split('\n').find((l) => risky.test(l));
    assert.equal(hit, undefined, `${rel(p)}: ${hit}`);
  }
});

test('directory bundle has what a listing needs', () => {
  const manifest = JSON.parse(readFileSync(join(bundle, '.claude-plugin/plugin.json'), 'utf8'));
  const full = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, full.name);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  for (const key of ['description', 'author', 'license', 'homepage', 'repository']) assert.ok(manifest[key], key);
  assert.ok(existsSync(join(bundle, 'LICENSE')));
  assert.ok(existsSync(join(bundle, manifest.icon)));
  const prose = readFileSync(join(bundle, 'README.md'), 'utf8').replace(/```[\s\S]*?```/g, '');
  assert.ok(prose.split(/\s+/).filter(Boolean).length >= 40, 'README needs at least 40 words outside code blocks');
  assert.doesNotMatch(prose, /!\[[^\]]*\]\(|<img\b|<picture\b/, 'README must not embed images');
});

test('page template is one file with no scripts and nothing loaded from the internet', () => {
  const md = readFileSync(join(bundle, 'skills/replay/references/page-template.md'), 'utf8');
  const html = /```html\n([\s\S]*?)\n```/.exec(md)?.[1] ?? '';
  assert.match(html, /^<!doctype html>/);
  assert.doesNotMatch(html, /<script\b|<link\b|<iframe\b|\bon\w+=|https?:\/\/|@import|url\(/i);
});
