// Test helpers: build a throwaway ~/.claude/projects-like tree from synthetic fixtures.
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

export function tempDir(prefix = 'sr-'): string {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

/** files: relative path inside the tree -> fixture name or literal content ({text}) */
export function makeTree(files: Record<string, string | { text: string }>): string {
  const root = tempDir('sr-projects-');
  for (const [rel, src] of Object.entries(files)) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (typeof src === 'string') copyFileSync(fixture(src), dest);
    else writeFileSync(dest, src.text);
  }
  return root;
}
