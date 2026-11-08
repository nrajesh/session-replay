// Installs/removes the user-level SessionEnd hook in ~/.claude/settings.json.
import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { writeFileAtomic } from './fsutil.ts';
import { fileURLToPath } from 'node:url';

const MARK = 'session-replay';

export function hookCommand(): string {
  const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
  return `"${process.execPath}" "${cli}" hook`;
}

function load(path: string): any {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} is not valid JSON; leaving it untouched`);
  }
}

const ours = (h: any) => typeof h?.command === 'string' && h.command.includes(MARK) && /\bhook$/.test(h.command.trim());

export function isHookInstalled(path: string): boolean {
  try {
    return (load(path).hooks?.SessionEnd ?? []).some((m: any) => (m.hooks ?? []).some(ours));
  } catch {
    return false;
  }
}

export function backup(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const b = `${path}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(path, b);
  return b;
}

export function installHook(path: string, command = hookCommand()): { changed: boolean; backup?: string } {
  const s = load(path);
  const existing = (s.hooks?.SessionEnd ?? []).flatMap((m: any) => (m.hooks ?? []).filter(ours));
  if (existing.length === 1 && existing[0].command === command) return { changed: false };
  const b = backup(path);
  s.hooks ??= {};
  s.hooks.SessionEnd = (s.hooks.SessionEnd ?? [])
    .map((m: any) => ({ ...m, hooks: (m.hooks ?? []).filter((h: any) => !ours(h)) }))
    .filter((m: any) => m.hooks.length);
  s.hooks.SessionEnd.push({ hooks: [{ type: 'command', command, timeout: 10 }] });
  writeFileAtomic(path, JSON.stringify(s, null, 2) + '\n');
  return { changed: true, backup: b };
}

export function uninstallHook(path: string): { changed: boolean; backup?: string } {
  if (!isHookInstalled(path)) return { changed: false };
  const s = load(path);
  const b = backup(path);
  s.hooks.SessionEnd = s.hooks.SessionEnd
    .map((m: any) => ({ ...m, hooks: (m.hooks ?? []).filter((h: any) => !ours(h)) }))
    .filter((m: any) => m.hooks.length);
  if (!s.hooks.SessionEnd.length) delete s.hooks.SessionEnd;
  if (!Object.keys(s.hooks).length) delete s.hooks;
  writeFileAtomic(path, JSON.stringify(s, null, 2) + '\n');
  return { changed: true, backup: b };
}
