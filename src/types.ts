// Shared data model. Everything rendered comes from a SessionModel.
import type { RiskyAction } from './risky.ts';

export interface DecisionOption {
  label: string;
  description?: string;
  recommended: boolean;
}

export interface DecisionPoint {
  /** 'ask' = AskUserQuestion (exact); others are best-effort readings of free text. */
  kind: 'ask' | 'instruction' | 'approval' | 'rejection';
  exact: boolean;
  at: string;
  header?: string;
  question: string;
  options: DecisionOption[];
  chosen: string[];
  other?: string;
  notes?: string;
  quote?: string;
}

export interface TestRun {
  at: string;
  runner: string;
  passed: number;
  failed: number;
  total: number;
  /** Names of failing tests, when the runner printed them (first few only). */
  failures?: string[];
}

export interface CommitRef {
  hash: string;
  at: string;
  subject: string;
  files: string[];
  added: number;
  removed: number;
  via: ('window' | 'output')[];
}

/** Tokens one model used; input counts fresh and cached prompt tokens, output counts replies. */
export interface ModelUse {
  model: string;
  messages: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** Approximate share of the session's reported cost (see usage.ts). Absent when it can't be split. */
  cost?: number;
  /** Copilot-reported AI credits or weighted request cost. These are not USD. */
  aiCredits?: number;
  premiumRequestCost?: number;
}

export interface ProviderUsage {
  aiCredits?: number;
  premiumRequestCost?: number;
  models?: Record<string, { aiCredits?: number; premiumRequestCost?: number }>;
}

/** One assistant reply: [time, model, input, output, cacheRead, cacheWrite]. Dropped once summarised. */
export type UsageEvent = [string, string, number, number, number, number];

export interface Checkpoint {
  at: string;
  commit?: CommitRef;
  title: string;
  tag: 'Decision' | 'Finding';
  who: 'you' | 'agent';
  decisions: DecisionPoint[];
  /** Models used between the previous checkpoint and this one. */
  models?: ModelUse[];
}

export interface Turn {
  at: string;
  role: 'user' | 'assistant' | 'tool';
  text: string;
  tool?: string;
}

export type SessionAgent = 'claude-code' | 'codex' | 'copilot';

export interface SessionModel {
  id: string;
  agent: SessionAgent;
  /** Source-native thread/session identifier; may differ from the archive page ID. */
  sourceSessionId?: string;
  file: string;
  projectKey: string;
  projectName: string;
  repoPath?: string;
  cwd?: string;
  branch?: string;
  title: string;
  firstPrompt?: string;
  start: string;
  end: string;
  entrypoint?: string;
  prs: { number: number; url: string }[];
  decisions: DecisionPoint[];
  tests: TestRun[];
  commitHashesInOutput: string[];
  commits: CommitRef[];
  checkpoints: Checkpoint[];
  turns: Turn[];
  userPromptCount: number;
  toolCounts: Record<string, number>;
  costUSD?: number;
  /** Per-model token use for the whole session, biggest first. */
  models?: ModelUse[];
  usageEvents?: UsageEvent[];
  providerUsage?: ProviderUsage;
  linesAdded?: number;
  linesRemoved?: number;
  subagentCount: number;
  /** Stretches of activity (gaps over 30 min split them). */
  activity: [string, string][];
  /** Files the AI agent edited or wrote (absolute paths). */
  editedFiles: string[];
  /** When git commit/merge-like commands were run. */
  gitCommandTimes: string[];
  /** Destructive commands the agent ran. Absent on sessions saved before this was checked; an empty list means checked and none found. */
  riskyActions?: RiskyAction[];
  warnings: string[];
}

/** Everything the index pages need about a session (no full conversation). */
export type SessionSummary = Omit<SessionModel, 'turns'> & {
  prompts: string[];
  projectSlug: string;
  /** Set at build time when the transcript is gone: 'cleanup' = Claude Code's own cleanup, 'disk' = deleted some other way. */
  sourceGone?: 'cleanup' | 'disk';
};

/** A merged or open pull request (Pro: read with `gh`). */
export interface PullRequest {
  number: number;
  title: string;
  branch: string;
  mergedAt: string | null;
  createdAt?: string;
  url: string;
  state: string;
  body: string;
  additions?: number;
  deletions?: number;
  /** GitHub login of the PR's author. */
  author?: string;
}

/** Work done by Claude in the cloud on a claude/* branch (Pro). */
export interface CloudSession {
  branch: string;
  title: string;
  start: string;
  end: string;
  commits: CommitRef[];
  link?: string;
  pr?: PullRequest;
  /** PR body text (from pr.body, now rendered on the detail page). */
  prBody?: string;
  /** File-level diff stats from the PR (path, added, removed). */
  prFiles?: { path: string; added: number; removed: number }[];
  /** Commits on the branch that are NOT from a Claude session (manual work). */
  manualCommits?: CommitRef[];
  /** PR review comments (captures "you" feedback). */
  prComments?: { user: string; body: string; createdAt: string }[];
  /** CI check statuses for the PR. */
  prChecks?: { name: string; status: string }[];
}

/** One commit by one author (Pro: People on the Usage page). */
export interface AuthorCommit { at: string; name: string; email: string; added: number; removed: number }
