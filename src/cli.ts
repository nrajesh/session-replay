#!/usr/bin/env node
// session-replay command line. Run `node src/cli.ts help` for usage.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { openSync, statSync, truncateSync, existsSync, readFileSync, mkdirSync, realpathSync } from 'node:fs';
import { build, type BuildReport } from './build.ts';
import { withLock } from './lock.ts';
import { readClaudeHistory } from './claudehistory.ts';
import { forgetSession } from './archive.ts';
import { loadState } from './state.ts';
import { loadConfig, setConfigValue, configPath } from './config.ts';
import { isPro } from './edition.ts';
import { setExtraRedactions } from './redact.ts';

const USAGE = `Usage: session-replay <command> [options]

Commands
  build              Update replay pages (only changed sessions are re-read)
    --project NAME   only this project (e.g. shop)
    --since DATE     only sessions active since DATE (YYYY-MM-DD)
    --force          re-read everything, even unchanged sessions
    --out DIR        output folder (default: configured output folder)
  forget ID          Remove a session from the archive after its original file is gone
  config             Show settings (Claude folder, output folder, archive days…)
  config set K V     Change one setting, e.g. config set projectsDir ~/work/.claude/projects
  status             Show where pages are and how many sessions they hold
  hook               (used by Claude Code itself; reads the session from stdin)

Open the index.html path shown by build or status in your browser.`;

export interface Parsed { cmd: string; opts: Record<string, string | boolean>; rest: string[] }

export function parseArgs(argv: string[]): Parsed {
  const [cmd = 'help', ...rest] = argv;
  const opts: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) {
      if (cmd !== 'config' && cmd !== 'forget') throw new Error(`Unexpected argument: ${a}`);
      positional.push(a);
      continue;
    }
    const key = a.slice(2);
    if (key === 'force' || key === 'quiet') opts[key] = true;
    else {
      const v = rest[++i];
      if (v === undefined) throw new Error(`--${key} needs a value`);
      opts[key] = v;
    }
  }
  if (typeof opts.since === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(opts.since)) throw new Error('--since must be a date like YYYY-MM-DD');
  return { cmd, opts, rest: positional };
}

export { DEFAULT_OUT } from './config.ts';
const claudeDir = () => process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
const cfg = () => loadConfig();
const projectRoots = (c = cfg()) => [c.projectsDir];
const outDir = (o?: string | boolean) => (typeof o === 'string' ? o : cfg().outDir);
const settingsPath = (o?: string | boolean) => (typeof o === 'string' ? o : join(claudeDir(), 'settings.json'));

function printReport(r: BuildReport) {
  const lines = [
    `${r.processed} session${r.processed === 1 ? '' : 's'} processed, ${r.skipped} unchanged.`,
    '',
    'Sessions per project:',
    ...Object.entries(r.perProject).sort().map(([p, n]) => `  ${p.padEnd(28)} ${n}`),
  ];
  if (r.emptySessions) lines.push('', `${r.emptySessions} transcript${r.emptySessions === 1 ? '' : 's'} had no messages and were skipped.`);
  if (r.emptyProjects.length) lines.push('', `No sessions left on disk for: ${r.emptyProjects.join(', ')}`);
  if (r.githubWarnings.length) lines.push('', ...r.githubWarnings.map((w) => `Warning: ${w}`));
  if (r.unreadable.length) lines.push('', 'Could not read:', ...r.unreadable.map((u) => `  ${u.file} (${u.reason})`));
  lines.push('', `Pages: ${join(r.out, 'index.html')}`);
  console.log(lines.join('\n'));
}

async function readStdin(timeoutMs: number): Promise<string> {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const done = () => resolve(data);
    const t = setTimeout(done, timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => { clearTimeout(t); done(); });
    process.stdin.on('error', () => { clearTimeout(t); done(); });
  });
}

/** Called by Claude Code hooks: start a background build and return at once. */
async function runHook() {
  const raw = await readStdin(1000);
  let event: { hook_event_name?: unknown; transcript_path?: unknown } | undefined;
  try {
    event = JSON.parse(raw);
  } catch {}
  const transcript = event?.transcript_path;
  const hookEvent = event?.hook_event_name;
  if (typeof transcript !== 'string' || !existsSync(transcript)) return;
  const out = outDir();
  if (hookEvent === 'SessionStart' && existsSync(join(out, 'index.html'))) return;
  if (hookEvent !== 'SessionStart' && hookEvent !== 'SessionEnd') return;
  // SessionStart bootstraps the index once; SessionEnd catches up on missed events
  // (crash, chat left open) and processes the session that just ended.
  mkdirSync(out, { recursive: true });
  const log = join(out, '.log');
  try {
    if (statSync(log).size > 1_000_000) truncateSync(log, 0);
  } catch {}
  const fd = openSync(log, 'a');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'build', '--quiet', '--out', out], {
    detached: true,
    stdio: ['ignore', fd, fd],
  });
  child.on('error', (e) => {
    try { console.error(`Session Replay hook could not start the background build: ${e.message}`); } catch {}
  });
  child.unref();
}

export async function main(argv: string[]): Promise<number> {
  let parsed: Parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    console.error((e as Error).message + '\n\n' + USAGE);
    return 2;
  }
  const { cmd, opts } = parsed;
  switch (cmd) {
    case 'build': {
      const c = cfg();
      for (const w of c.warnings) console.error(`Settings: ${w}`);
      let roots = projectRoots(c);
      let otherAgents = false;
      let folderKey = 'projectsDir';
      const missing = roots.filter((root) => !existsSync(root));
      if (missing.length && (missing.length < roots.length || !otherAgents)) {
        console.error(`Claude Code projects folder${missing.length === 1 ? '' : 's'} not found:\n${missing.map((root) => `  ${root}`).join('\n')}\nSet a valid folder with: session-replay config set ${folderKey} /path/to/.claude/projects`);
        return 1;
      }
      setExtraRedactions(c.extraRedactions);
      const since = (opts.since as string | undefined) ?? (c.archiveDays ? new Date(Date.now() - c.archiveDays * 86_400_000).toISOString().slice(0, 10) : undefined);
      const out = outDir(opts.out);
      const r = await withLock(out, () =>
        build({
          projectsRoot: roots[0], out,
          project: opts.project as string | undefined, since, include: c.includeProjects, exclude: c.excludeProjects,
          archiveDays: c.archiveDays, claudeHistoryDays: readClaudeHistory(settingsPath()).days,
          theme: c.theme,
          only: opts.only as string | undefined, force: !!opts.force,
          log: opts.quiet ? (s) => console.log(`${new Date().toISOString()} ${s}`) : () => {},
        }));
      if (!r) {
        console.error('Another build is still running; try again in a minute.');
        return 1;
      }
      if (opts.quiet) console.log(`${new Date().toISOString()} build done (${r.processed} processed)`);
      else printReport(r);
      return 0;
    }
    case 'forget': {
      const id = parsed.rest[0];
      if (!id || !/^[\w.-]{1,200}$/.test(id)) { console.error('Usage: session-replay forget <session id>'); return 2; }
      const out = outDir(opts.out);
      const done = await withLock(out, async () => forgetSession(out, id), { waitMs: 5000 });
      if (done === undefined) { console.error('Another build is still running; try again in a minute.'); return 1; }
      if (!done) { console.error('Nothing removed. The session is not in the archive, or its original file still exists.'); return 1; }
      console.log(`Removed ${id} from the archive. Run: session-replay build`);
      return 0;
    }
    case 'hook':
      try { await runHook(); } catch (e) {
        console.error(`Session Replay hook failed: ${(e as Error).message}`);
      }
      return 0;
    case 'status': {
      const out = outDir(opts.out);
      const st = loadState(out);
      let cleanup = 'default (30 days)';
      try {
        const s = JSON.parse(readFileSync(settingsPath(opts.settings), 'utf8'));
        if (s.cleanupPeriodDays) cleanup = `${s.cleanupPeriodDays} days`;
      } catch {}
      const lines = [
        `Pages:            ${join(out, 'index.html')}${existsSync(join(out, 'index.html')) ? '' : ' (not built yet: run build)'}`,
        `Sessions known:   ${Object.keys(st.sessions).length}`,
        'Automatic update: when a Claude Code session starts or ends',
        `History kept by Claude Code: ${cleanup}`,
        `Archive kept for: ${cfg().archiveDays ? `${cfg().archiveDays} days` : 'forever'}`,
        `Claude transcripts: ${projectRoots().join(', ')}`,
      ];
      console.log(lines.join('\n'));
      return 0;
    }
    case 'config': {
      const [sub, key, ...val] = parsed.rest;
      if (sub === 'set') {
        try {
          setConfigValue(configPath(), key ?? '', val.join(' '));
        } catch (e) {
          console.error((e as Error).message);
          return 2;
        }
        console.log(`Saved ${key} in ${configPath()}`);
        return 0;
      }
      const c = cfg();
      const { warnings, path, ...shown } = c;
      console.log(`Settings file: ${path}${existsSync(path) ? '' : ' (not created yet; defaults shown)'}\n`);
      for (const [k, v] of Object.entries(shown)) console.log(`  ${k.padEnd(18)} ${Array.isArray(v) ? v.join(', ') || '(none)' : v}`);
      for (const w of warnings) console.log(`\n  ! ${w}`);
      console.log('\nChange one with: session-replay config set <name> <value>');
      return 0;
    }
    case 'help':
    case '--help':
      console.log(USAGE);
      return 0;
    default:
      console.error(`Unknown command: ${cmd}\n\n${USAGE}`);
      return 2;
  }
}

/** True when this file is the program being run. Works on every Node 24 release, not only 24.2 and later. */
function isEntry(): boolean {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntry()) main(process.argv.slice(2)).then((code) => process.exit(code));
