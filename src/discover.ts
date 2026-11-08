// Finds session transcripts under ~/.claude/projects without reading their contents.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface SessionFile {
  projectDir: string;
  sessionId: string;
  file: string;
  subagentFiles: string[];
}

export async function dirEntries(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function listProjectDirs(projectsRoot: string): Promise<string[]> {
  return (await dirEntries(projectsRoot)).filter((e) => e.isDirectory()).map((e) => e.name);
}

/** Sessions are `<projectDir>/<id>.jsonl`; subagents live in `<projectDir>/<id>/subagents/*.jsonl`. */
export async function listSessionFiles(projectsRoot: string): Promise<SessionFile[]> {
  const out: SessionFile[] = [];
  for (const projectDir of await listProjectDirs(projectsRoot)) {
    const pdir = join(projectsRoot, projectDir);
    for (const e of await dirEntries(pdir)) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const sessionId = e.name.slice(0, -'.jsonl'.length);
      const subDir = join(pdir, sessionId, 'subagents');
      const subagentFiles = (await dirEntries(subDir))
        .filter((s) => s.isFile() && s.name.endsWith('.jsonl'))
        .map((s) => join(subDir, s.name))
        .sort();
      out.push({ projectDir, sessionId, file: join(pdir, e.name), subagentFiles });
    }
  }
  return out;
}
