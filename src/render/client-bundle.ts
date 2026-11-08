// Inlines the browser modules in src/client/ into one <script> body (no network, no build step).
// Pro adds its own browser modules from src/pro/client/.
import { readFileSync } from 'node:fs';

const MODULES = ['../client/search.js', '../client/table.js', '../client/calendar.js'];
const cached = new Map<boolean, string>();

export function clientBundle(pro: boolean): string {
  const hit = cached.get(pro);
  if (hit) return hit;
  const files = [...MODULES];
  const src = files.map((m) => readFileSync(new URL(m, import.meta.url), 'utf8').replace(/^export\s+/gm, '')).join('\n');
  const out = src.replace(/<\/script/gi, '<\\/script');
  cached.set(pro, out);
  return out;
}
