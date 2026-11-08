// Streams one transcript (plus its subagent transcripts) into a SessionModel.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename } from 'node:path';
import { noteRisky } from './risky.ts';
import type { SessionAgent, SessionModel, Turn, UsageEvent } from './types.ts';
import { askDecision, classifyPrompt } from './decisions.ts';
import { parseTestSummary, commitHashesFromOutput } from './testruns.ts';
import { activeSpans } from './link.ts';
import { niceTitle } from './shared.ts';

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const GIT_WRITE = /\bgit\b[^\n|;&]*?\b(commit|merge|cherry-pick|revert|rebase|am|pull)\b|\bgh\s+pr\s+merge\b/;

const MAX_TOOL_TEXT = 4000;

export async function* readJsonl(file: string, warnings: string[]): AsyncGenerator<any> {
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    n++;
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      warnings.push(`unreadable line ${n} in ${basename(file)}`);
    }
  }
}

const NOISE_BLOCKS = /<(ide_opened_file|ide_selection|system-reminder|ide_diagnostics)>[\s\S]*?<\/\1>/g;
const SYSTEM_PREFIX = /^(<command-name>|<command-message>|<command-args>|<local-command-std|<task-notification>|<bash-stdout>|<bash-stderr>|\[Request interrupted|Caveat: The messages below)/;

/** Text of a genuine human prompt, or null if the record is not one. */
export function humanPromptText(rec: any): string | null {
  if (rec.type !== 'user' || rec.isMeta || rec.isSidechain) return null;
  const kind = typeof rec.origin === 'object' ? rec.origin?.kind : rec.origin;
  if (kind && kind !== 'human') return null;
  const c = rec.message?.content;
  let parts: string[];
  if (typeof c === 'string') parts = [c];
  else if (Array.isArray(c)) {
    if (c.some((b: any) => b?.type === 'tool_result')) return null;
    parts = c.filter((b: any) => b?.type === 'text').map((b: any) => String(b.text ?? ''));
  } else return null;
  const text = parts
    .map((p) => p.replace(NOISE_BLOCKS, '').trim())
    .filter((p) => p && !SYSTEM_PREFIX.test(p))
    .join('\n\n')
    .trim();
  return text || null;
}

export function toolResultText(block: any): string {
  const c = block?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n');
  return '';
}

function describeToolUse(name: string, input: any): string {
  if (!input || typeof input !== 'object') return '';
  if (name === 'Bash') return `$ ${input.command ?? ''}`;
  if (input.file_path) return String(input.file_path);
  if (name === 'AskUserQuestion') return (input.questions ?? []).map((q: any) => q.question).join('\n');
  if (input.description) return String(input.description);
  if (input.prompt) return String(input.prompt).slice(0, 300);
  if (input.pattern) return String(input.pattern);
  if (input.url) return String(input.url);
  if (input.query) return String(input.query);
  return JSON.stringify(input).slice(0, 300);
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + `\n… [${s.length - n} more characters]` : s);

interface Pending { name: string; input: any; turn?: Turn; at: string }

const usageIndex = new WeakMap<SessionModel, Map<string, number>>();

/** One API reply is written as several records that repeat its usage, so count each message id once. */
function noteUsage(s: SessionModel, rec: any, at: string | undefined) {
  const m = rec.message;
  const u = m?.usage;
  if (!at || !u || typeof m.model !== 'string' || m.model.startsWith('<')) return;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const ev: UsageEvent = [at, m.model, num(u.input_tokens), num(u.output_tokens), num(u.cache_read_input_tokens), num(u.cache_creation_input_tokens)];
  const events = (s.usageEvents ??= []);
  const seen = usageIndex.get(s) ?? usageIndex.set(s, new Map()).get(s)!;
  const id = typeof m.id === 'string' ? m.id : '';
  const at0 = id ? seen.get(id) : undefined;
  if (at0 !== undefined) events[at0] = ev;
  else {
    if (id) seen.set(id, events.length);
    events.push(ev);
  }
}

async function scanFile(file: string, s: SessionModel, main: boolean, times: string[]) {
  const pending = new Map<string, Pending>();
  let customTitle = '';
  let lastAssistantText = '';
  for await (const rec of readJsonl(file, s.warnings)) {
    if (rec.type?.startsWith?.('api-request')) continue; // duplicate copies of messages
    const at: string | undefined = typeof rec.timestamp === 'string' ? rec.timestamp : undefined;
    if (at && (rec.type === 'user' || rec.type === 'assistant')) times.push(at);
    if (main && at) {
      if (!s.start || at < s.start) s.start = at;
      if (!s.end || at > s.end) s.end = at;
    }
    if (main) {
      if (!s.cwd && rec.cwd) s.cwd = rec.cwd;
      if (rec.gitBranch && rec.gitBranch !== 'HEAD') s.branch = rec.gitBranch;
      if (!s.entrypoint && rec.entrypoint) s.entrypoint = rec.entrypoint;
      // A manual /rename is written as its own record; later ai-title records must not override it.
      if (rec.type === 'custom-title' && rec.customTitle) customTitle = String(rec.customTitle);
      if (rec.type === 'ai-title' && rec.aiTitle && !customTitle) s.title = String(rec.aiTitle);
      if (rec.type === 'pr-link' && rec.prNumber && !s.prs.some((p) => p.number === rec.prNumber && p.url === rec.prUrl)) {
        s.prs.push({ number: Number(rec.prNumber), url: String(rec.prUrl ?? '') });
      }
      if (rec.type === 'cost-state') {
        if (typeof rec.totalCostUSD === 'number') s.costUSD = rec.totalCostUSD;
        if (typeof rec.totalLinesAdded === 'number') s.linesAdded = rec.totalLinesAdded;
        if (typeof rec.totalLinesRemoved === 'number') s.linesRemoved = rec.totalLinesRemoved;
      }
    }
    const content = rec.message?.content;
    if (rec.type === 'assistant') noteUsage(s, rec, at);
    if (rec.type === 'assistant' && Array.isArray(content)) {
      for (const b of content) {
        if (b?.type === 'text' && b.text?.trim()) {
          lastAssistantText = b.text;
          if (main) s.turns.push({ at: at ?? '', role: 'assistant', text: b.text });
        } else if (b?.type === 'tool_use') {
          const name = String(b.name ?? 'tool');
          s.toolCounts[name] = (s.toolCounts[name] ?? 0) + 1;
          const p: Pending = { name, input: b.input, at: at ?? '' };
          if (main) {
            p.turn = { at: at ?? '', role: 'tool', tool: name, text: clip(describeToolUse(name, b.input), MAX_TOOL_TEXT) };
            s.turns.push(p.turn);
          }
          if (b.id) pending.set(b.id, p);
          const fp = b.input?.file_path ?? b.input?.notebook_path;
          if (EDIT_TOOLS.has(name) && typeof fp === 'string' && !s.editedFiles.includes(fp)) s.editedFiles.push(fp);
          if (name === 'Bash' && at && GIT_WRITE.test(String(b.input?.command ?? ''))) s.gitCommandTimes.push(at);
          if (name === 'Bash') noteRisky(s, at, String(b.input?.command ?? ''));
        }
      }
    } else if (rec.type === 'user') {
      if (Array.isArray(content)) {
        for (const b of content) {
          if (b?.type !== 'tool_result') continue;
          const p = pending.get(b.tool_use_id);
          if (!p) continue;
          pending.delete(b.tool_use_id);
          const out = toolResultText(b);
          if (p.turn && out) p.turn.text = clip(`${p.turn.text}\n${out}`, MAX_TOOL_TEXT);
          if (p.name === 'Bash' && out) {
            const run = parseTestSummary(out, at ?? p.at);
            if (run) s.tests.push(run);
            for (const h of commitHashesFromOutput(out)) if (!s.commitHashesInOutput.includes(h)) s.commitHashesInOutput.push(h);
          }
          if (main && p.name === 'AskUserQuestion') {
            const result = b.is_error ? undefined : rec.toolUseResult;
            s.decisions.push(...askDecision(p.input, result, at ?? p.at));
          }
        }
      }
      if (main) {
        const text = humanPromptText(rec);
        if (text) {
          s.userPromptCount++;
          if (!s.firstPrompt) s.firstPrompt = text;
          s.turns.push({ at: at ?? '', role: 'user', text });
          const d = classifyPrompt(text, at ?? '', lastAssistantText);
          if (d) s.decisions.push(d);
        }
      }
    }
  }
  if (main) {
    if (customTitle) s.title = customTitle;
    for (const p of pending.values()) if (p.name === 'AskUserQuestion') s.decisions.push(...askDecision(p.input, undefined, p.at));
  }
}

export function emptySession(file: string, agent: SessionAgent = 'claude-code', id?: string): SessionModel {
  return {
    id: id ?? basename(file).replace(/\.jsonl$/, ''), agent, file, projectKey: '', projectName: '', title: '',
    start: '', end: '', prs: [], decisions: [], tests: [], commitHashesInOutput: [], commits: [],
    checkpoints: [], turns: [], userPromptCount: 0, toolCounts: {}, subagentCount: 0, activity: [], editedFiles: [], gitCommandTimes: [], riskyActions: [], warnings: [],
  };
}

export async function parseSession(file: string, subagentFiles: string[]): Promise<SessionModel> {
  const s = emptySession(file);
  const times: string[] = [];
  await scanFile(file, s, true, times);
  for (const f of subagentFiles) await scanFile(f, s, false, times);
  s.activity = activeSpans(times);
  s.gitCommandTimes.sort();
  s.subagentCount = subagentFiles.length;
  s.tests.sort((a, b) => a.at.localeCompare(b.at));
  s.title = niceTitle(s.title, s.firstPrompt ?? '') || s.id.slice(0, 8);
  return s;
}
