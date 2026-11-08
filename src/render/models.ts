// Shared bits for showing which models a session used: token counts, a share bar and a short list.
import type { ModelUse } from '../types.ts';
import { esc } from './html.ts';
import { agentChip } from './brand.ts';
import { shortModel, topModels, modelFamily, totalIn, type AgentFamily } from '../usage.ts';

export function fmtTok(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)}M`;
}
export const fmtPct = (x: number) => (x > 0 && x < 0.01 ? '<1%' : `${Math.round(x * 100)}%`);
export const fmtCost = (x: number) => `~$${x < 10 ? x.toFixed(2) : Math.round(x).toLocaleString('en')}`;
const fmtCredits = (x: number) => x < 0.01 ? x.toFixed(4) : x.toFixed(2);

/** Each model takes its agent family's colour; a family's second and third models get lighter shades. "other" is grey. */
export function modelColors(names: string[]): string[] {
  const seen: Partial<Record<AgentFamily, number>> = {};
  return names.map((n) => {
    if (n === 'other') return 'var(--v0)';
    const f = modelFamily(n), k = seen[f] = (seen[f] ?? -1) + 1;
    return k === 0 ? `var(--ag-${f})` : `color-mix(in srgb,var(--ag-${f}) ${k === 1 ? 62 : 38}%,var(--surface))`;
  });
}
const SOURCE_LABEL: Record<AgentFamily, string> = { claude: 'Claude', openai: 'Codex', copilot: 'Copilot', local: 'local' };

/** A thin stacked bar: top 3 models and the rest. */
export function modelBar(models: ModelUse[] | undefined): string {
  const top = topModels(models ?? []);
  if (!top.length) return '';
  const colors = modelColors(top.map((m) => m.name));
  return `<div class="mbar" role="img" aria-label="${esc(top.map((m) => `${shortModel(m.name)} ${fmtPct(m.share)}`).join(', '))}">${top.map((m, i) => `<span style="flex:${m.share.toFixed(4)} 1 0;background:${colors[i]}" title="${esc(shortModel(m.name))} ${fmtPct(m.share)}"></span>`).join('')}</div>`;
}

/** "sonnet-5-5 82%" for one model, or "sonnet-5-5 82% + 2 more" when several were used. */
export function modelLabel(models: ModelUse[] | undefined): string {
  const top = topModels(models ?? [], 1);
  if (!top.length) return '';
  const n = (models ?? []).length;
  return n === 1 ? shortModel(top[0].name) : `${shortModel(top[0].name)} ${fmtPct(top[0].share)} + ${n - 1} more`;
}

/** A table of every model: share, tokens in and out, and approximate cost. */
export function modelTable(models: ModelUse[] | undefined): string {
  const list = models ?? [];
  const hasCredits = list.some((m) => m.aiCredits !== undefined);
  const hasPremiumRequests = list.some((m) => m.premiumRequestCost !== undefined);
  const all = topModels(list, list.length);
  const colors = modelColors(all.map((m) => m.name));
  const rows = all.map((m, i) => {
    const u = list.find((x) => x.model === m.name)!;
    const family = modelFamily(m.name);
    return `<tr><td><span class="sw" style="background:${colors[i]}"></span>${esc(shortModel(m.name))} ${agentChip(family, SOURCE_LABEL[family])}</td><td class="num">${fmtPct(m.share)}</td><td class="num">${fmtTok(totalIn(u))}</td><td class="num">${fmtTok(u.output)}</td>${hasCredits ? `<td class="num">${m.aiCredits !== undefined ? fmtCredits(m.aiCredits) : '—'}</td>` : ''}${hasPremiumRequests ? `<td class="num">${m.premiumRequestCost !== undefined ? fmtCredits(m.premiumRequestCost) : '—'}</td>` : ''}<td class="num">${m.cost !== undefined ? fmtCost(m.cost) : '—'}</td></tr>`;
  });
  return `<table><thead><tr><th>Model</th><th class="num">Share</th><th class="num">Tokens in</th><th class="num">Tokens out</th>${hasCredits ? '<th class="num">AI credits</th>' : ''}${hasPremiumRequests ? '<th class="num">Weighted requests</th>' : ''}<th class="num">USD estimate</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
