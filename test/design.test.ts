// Guards the measurable parts of docs/DESIGN.md so later changes cannot quietly break them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSS } from '../src/render/style.ts';

const block = (re: RegExp) => { const m = CSS.match(re); assert.ok(m, `missing token block ${re}`); return Object.fromEntries([...m[1].matchAll(/--([\w-]+):([^;]+);/g)].map((x) => [x[1], x[2].trim()])); };
const LIGHT = block(/:root\{(--bg[^}]*)\}/);
const DARK = block(/:root\[data-theme="dark"\]\{([^}]*)\}/);

type RGB = [number, number, number];
const hex = (h: string): RGB => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB; };
const rgba = (v: string): [number, number, number, number] => { if (v.startsWith('#')) return [...hex(v), 1]; const p = v.match(/rgba?\(([^)]+)\)/)![1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
const over = (fg: [number, number, number, number], bg: RGB): RGB => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3])) as RGB;
const mix = (a: RGB, b: RGB, p: number): RGB => a.map((c, i) => c * p + b[i] * (1 - p)) as RGB;
const lum = (c: RGB) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [name, t] of [['light', LIGHT], ['dark', DARK]] as const) {
  const c = (k: string) => { assert.ok(t[k], `${name} theme is missing --${k}`); return rgba(t[k]); };
  const solid = (k: string) => c(k).slice(0, 3) as RGB;
  const surf = solid('surface');

  test(`${name} theme: text meets WCAG AA contrast (4.5:1)`, () => {
    const pairs: [string, RGB, RGB][] = [
      ['text on surface', solid('text'), surf], ['muted on surface', solid('muted'), surf], ['muted on surface-2', solid('muted'), solid('surface-2')],
      ['muted on bg', solid('muted'), solid('bg')], ['link on surface', solid('link'), surf], ['brand amber ink (wordmark, labels)', solid('brand-amber-ink'), solid('bar')],
      ['you on you-bg', solid('you'), over(c('you-bg'), surf)], ['agent on agent-bg', solid('agent'), over(c('agent-bg'), surf)],
      ['ok on ok-bg', solid('ok'), over(c('ok-bg'), surf)], ['bad on bad-bg', solid('bad'), over(c('bad-bg'), surf)],
      ['primary button', solid('on-accent'), solid('accent')], ['PR card ink', solid('pr-ink'), mix(solid('pr'), surf, 0.12)],
      ...['claude', 'openai', 'copilot', 'local'].map((f) => [`${f} pill text`, solid(`ag-${f}-ink`), mix(solid(`ag-${f}`), surf, 0.12)] as [string, RGB, RGB]),
    ];
    for (const [label, fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${name}: ${label} is ${ratio(fg, bg).toFixed(2)}:1, needs 4.5:1`);
  });

  test(`${name} theme: chart marks, agent colours and input borders meet 3:1`, () => {
    const marks = ['ag-claude', 'ag-openai', 'ag-copilot', 'ag-local', 'v1', 'v2', 'v3', 'v4', 'v5', 'local', 'cloud', 'control'];
    for (const k of marks) assert.ok(ratio(solid(k), surf) >= 3, `${name}: --${k} is ${ratio(solid(k), surf).toFixed(2)}:1 against the surface, needs 3:1`);
  });
}

test('the display font is embedded and kept to headings, wordmark and big numbers', () => {
  assert.match(CSS, /@font-face\{font-family:'Righteous'[^}]*src:url\(data:font\/woff2;base64,/);
  assert.match(CSS, /--display:'Righteous'/);
  assert.doesNotMatch(CSS, /(html|body),?[^{]*\{[^}]*font:[^;}]*var\(--display\)/, 'body text must not use the display face');
});

test('labels are sentence case and nothing is smaller than 12px (kbd hints, tape counts and sort arrows excepted)', () => {
  assert.doesNotMatch(CSS, /\.eyebrow\{[^}]*text-transform:uppercase/);
  const small = [...CSS.matchAll(/([^{}]+)\{[^}]*font(?:-size)?:[^;}]*?\b(\d+(?:\.\d+)?)px/g)]
    .filter((m) => Number(m[2]) < 12 && !/kbd|tape-count|k-group|th\[aria-sort/.test(m[1]));
  assert.deepEqual(small.map((m) => `${m[1].trim()} ${m[2]}px`), []);
});
