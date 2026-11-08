// Which edition runs. Pro needs the Pro code (src/pro/, never in the public repo) and the Pro setting.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PRO_DIR = new URL('./pro/', import.meta.url);

export function proAvailable(dir: URL = PRO_DIR): boolean {
  return existsSync(fileURLToPath(dir));
}

export function isPro(c: object, available = proAvailable()): boolean {
  return available && (c as { edition?: unknown }).edition === 'pro';
}
