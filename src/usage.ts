// Which models a session used, and how many tokens each took (whole session and per checkpoint).
import type { ModelUse, SessionModel, UsageEvent } from './types.ts';

/** List prices in dollars per million tokens [input, output]; only their ratios matter (see estimateCosts). */
const PRICES: [RegExp, [number, number]][] = [[/opus/i, [15, 75]], [/sonnet/i, [3, 15]], [/haiku/i, [1, 5]]];

export const shortModel = (m: string) => m.replace(/^(?:codex|copilot)\//i, '').replace(/^claude-/, '').replace(/-\d{8}$/, '');
export const modelSource = (m: string) => /^codex\//i.test(m) ? 'Codex' : /^copilot\//i.test(m) ? 'Copilot' : '';
export const isLocalModel = (m: string) => !isClaude(m) && !modelSource(m);
/** Claude model names used for list-price estimates. Other providers are left unpriced unless supported. */
export const isClaude = (m: string) => /^claude/i.test(m);
/** Which agent family a model belongs to; drives the shared colour code (Claude orange, ChatGPT blue, Copilot green, local yellow). */
export type AgentFamily = 'claude' | 'openai' | 'copilot' | 'local';
export const modelFamily = (m: string): AgentFamily => /^copilot\//i.test(m) ? 'copilot' : /^codex\//i.test(m) ? 'openai' : isClaude(m) ? 'claude' : 'local';
export const sessionFamily = (agent: string | undefined): AgentFamily => agent === 'codex' ? 'openai' : agent === 'copilot' ? 'copilot' : 'claude';
export const FAMILY_LABEL: Record<AgentFamily, string> = { claude: 'Claude', openai: 'ChatGPT', copilot: 'Copilot', local: 'Local model' };
export const totalIn = (u: ModelUse) => u.input + u.cacheRead + u.cacheWrite;
export const totalTokens = (u: ModelUse) => totalIn(u) + u.output;

export function aggregate(events: UsageEvent[]): ModelUse[] {
  const by = new Map<string, ModelUse>();
  for (const [, model, input, output, cacheRead, cacheWrite] of events) {
    const u = by.get(model) ?? { model, messages: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    u.messages++; u.input += input; u.output += output; u.cacheRead += cacheRead; u.cacheWrite += cacheWrite;
    by.set(model, u);
  }
  return [...by.values()].sort((a, b) => totalTokens(b) - totalTokens(a));
}

function weight(u: ModelUse): number {
  const p = PRICES.find(([re]) => re.test(u.model))?.[1];
  return p ? ((u.input + u.cacheWrite * 1.25 + u.cacheRead * 0.1) * p[0] + u.output * p[1]) / 1e6 : 0;
}

/**
 * Claude Code reports one cost per session, not per model. Split it by each model's tokens at
 * list-price ratios (cache reads at a tenth, writes at 1.25x). Non-Claude models count as free.
 * With several Claude models the split is approximate, so the pages show it with a "~".
 */
export function estimateCosts(models: ModelUse[], total: number | undefined): void {
  const sum = models.reduce((a, u) => a + weight(u), 0);
  for (const u of models) {
    if (total === undefined || !sum) delete u.cost;
    else u.cost = total * (weight(u) / sum);
  }
}

/** Fills session.models and each checkpoint's models, then drops the raw per-message events. */
export function summarizeUsage(s: SessionModel): void {
  const events = (s.usageEvents ?? []).slice().sort((a, b) => a[0].localeCompare(b[0]));
  delete s.usageEvents;
  s.models = aggregate(events);
  for (const model of s.models) {
    const provider = s.providerUsage?.models?.[model.model];
    if (provider?.aiCredits !== undefined) model.aiCredits = provider.aiCredits;
    if (provider?.premiumRequestCost !== undefined) model.premiumRequestCost = provider.premiumRequestCost;
  }
  estimateCosts(s.models, s.costUSD);
  let prev = '';
  for (const c of s.checkpoints) {
    c.models = aggregate(events.filter((e) => e[0] > prev && e[0] <= c.at));
    prev = c.at;
  }
}

export interface ModelShare { name: string; share: number; input: number; output: number; cost?: number; aiCredits?: number; premiumRequestCost?: number; count?: number }

/** Top models by tokens, the rest folded into one "other" entry, each with its share of all tokens. */
export function topModels(models: ModelUse[], n = 3): ModelShare[] {
  const total = models.reduce((a, u) => a + totalTokens(u), 0);
  if (!total) return [];
  const sorted = [...models].sort((a, b) => totalTokens(b) - totalTokens(a));
  const cost = (us: ModelUse[]) => (us.some((u) => u.cost !== undefined) ? us.reduce((a, u) => a + (u.cost ?? 0), 0) : undefined);
  const one = (name: string, us: ModelUse[]): ModelShare => ({
    name, share: us.reduce((a, u) => a + totalTokens(u), 0) / total,
    input: us.reduce((a, u) => a + totalIn(u), 0), output: us.reduce((a, u) => a + u.output, 0), cost: cost(us),
    aiCredits: us.some((u) => u.aiCredits !== undefined) ? us.reduce((a, u) => a + (u.aiCredits ?? 0), 0) : undefined,
    premiumRequestCost: us.some((u) => u.premiumRequestCost !== undefined) ? us.reduce((a, u) => a + (u.premiumRequestCost ?? 0), 0) : undefined,
  });
  const out = sorted.slice(0, n).map((u) => one(u.model, [u]));
  const rest = sorted.slice(n);
  if (rest.length) out.push({ ...one('other', rest), count: rest.length });
  return out;
}
