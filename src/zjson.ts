// Cache JSON is stored gzip-compressed (`name.json.gz`). Old plain `name.json` files still read, and the next write replaces them.
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { writeFileAtomic } from './fsutil.ts';

const mtime = (f: string) => { try { return statSync(f).mtimeMs; } catch { return -1; } };

/** Writes `file`.gz and removes a plain twin, so an id never exists in both forms. */
export function writeCacheJson(file: string, value: unknown): void {
  writeFileAtomic(file + '.gz', gzipSync(JSON.stringify(value)));
  try { unlinkSync(file); } catch {}
}

/** Reads the newer of `file`.gz and a plain `file`; undefined when neither can be read. */
export function readCacheJson<T>(file: string): T | undefined {
  const gz = file + '.gz';
  const order = mtime(file) > mtime(gz) ? [file, gz] : [gz, file];
  for (const f of order) {
    try {
      const raw = readFileSync(f);
      return JSON.parse((f.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')) as T;
    } catch {}
  }
  return undefined;
}

/** Compresses a plain cache file left by an older version. Returns true when it converted one. */
export function compressPlain(file: string): boolean {
  if (!existsSync(file)) return false;
  const value = readCacheJson(file);
  if (value === undefined) return false;
  writeCacheJson(file, value);
  return true;
}

export const cacheExists = (file: string): boolean => existsSync(file) || existsSync(file + '.gz');

export function removeCacheJson(file: string): void {
  for (const f of [file, file + '.gz']) {
    try { unlinkSync(f); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
}

/** Disk use of the archive folder and of its `.cache` part, in bytes. */
export function archiveBytes(out: string): { total: number; cache: number } {
  const size = (dir: string): number => {
    let n = 0;
    try {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) n += size(p);
        else if (e.isFile()) n += statSync(p).size;
      }
    } catch {}
    return n;
  };
  return { total: size(out), cache: size(join(out, '.cache')) };
}
