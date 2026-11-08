// A simple lock file so two builds (e.g. two sessions ending together) never overlap.
import { mkdirSync, openSync, closeSync, writeSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function tryAcquire(file: string): boolean {
  try {
    const fd = openSync(file, 'wx');
    writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
    closeSync(fd);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
  try {
    const held = JSON.parse(readFileSync(file, 'utf8')) as { pid: number; at: number };
    if (!alive(held.pid)) unlinkSync(file);
  } catch {
    try { unlinkSync(file); } catch {}
  }
  return false;
}

export async function withLock<T>(out: string, fn: () => Promise<T>, opts: { pollMs?: number; waitMs?: number } = {}): Promise<T | undefined> {
  mkdirSync(out, { recursive: true });
  const file = join(out, '.lock');
  const deadline = Date.now() + (opts.waitMs ?? 120_000);
  while (!tryAcquire(file)) {
    if (Date.now() > deadline) return undefined;
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 500));
  }
  try {
    return await fn();
  } finally {
    try { unlinkSync(file); } catch {}
  }
}
