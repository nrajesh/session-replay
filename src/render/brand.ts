// Brand pieces shared by every page: the cassette logo, the favicon and the agent colour code.
import { readFileSync } from 'node:fs';
import { esc } from './html.ts';
import { FAMILY_LABEL, type AgentFamily } from '../usage.ts';

/** The cassette mark from docs/promo/logo.svg; `id` keeps gradient ids unique when inlined. */
export function logoSvg(size: number, id = 'sr'): string {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22355C"/><stop offset="1" stop-color="#0E1320"/></linearGradient><linearGradient id="${id}-edge" x1="6" y1="6" x2="114" y2="114" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8DBBFF"/><stop offset="1" stop-color="#FDE68A"/></linearGradient></defs><rect x="6" y="6" width="108" height="108" rx="30" fill="url(#${id}-bg)" stroke="url(#${id}-edge)" stroke-width="3.5"/><rect x="22" y="20.5" width="76" height="5" rx="2.5" fill="#8DBBFF"/><rect x="22" y="27.5" width="76" height="3" rx="1.5" fill="#FDE68A"/><rect x="20" y="38" width="80" height="34" rx="17" fill="#0B0F18" stroke="#8DBBFF" stroke-width="4"/><circle cx="37" cy="55" r="9" fill="none" stroke="#FDE68A" stroke-width="4"/><circle cx="83" cy="55" r="9" fill="none" stroke="#8DBBFF" stroke-width="4"/><path d="M53 55 L60 50.5 L60 59.5 Z M60 55 L67 50.5 L67 59.5 Z" fill="#FDE68A" stroke="#FDE68A" stroke-width="1" stroke-linejoin="round"/><path d="M38 100 L44 86 L76 86 L82 100" fill="none" stroke="#FDE68A" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/** Favicon as a data URI (allowed by the pages' img-src data: policy). */
export const FAVICON = `data:image/svg+xml,${encodeURIComponent(logoSvg(64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;

/** A labelled agent pill: coloured dot plus name, e.g. "● Claude Code". */
export function agentChip(family: AgentFamily, label: string = FAMILY_LABEL[family]): string {
  return `<span class="agent ag-${family}"><i aria-hidden="true"></i>${esc(label)}</span>`;
}

/** Overlapping agent dots, like the "Agent-agnostic" pill. */
export function agentStack(families: AgentFamily[]): string {
  const list = [...new Set(families)];
  if (!list.length) return '';
  return `<span class="ag-stack" role="img" aria-label="${esc(list.map((f) => FAMILY_LABEL[f]).join(', '))}" title="${esc(list.map((f) => FAMILY_LABEL[f]).join(' · '))}">${list.map((f) => `<i class="ag-${f}"></i>`).join('')}</span>`;
}

/** The colour key: every agent family with its dot and name. */
export function agentLegend(): string {
  return `<span class="agent-key" aria-label="Agent colours">${(['claude', 'openai', 'copilot', 'local'] as AgentFamily[]).map((f) => agentChip(f)).join('')}</span>`;
}

/** Owner, licence and links come from package.json, so renaming the GitHub repo is a one-file change. */
const PKG = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  } catch {
    return {};
  }
})();
const repo = String(PKG.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
export const PROJECT = {
  owner: String(PKG.author ?? 'Session Replay'),
  license: String(PKG.license ?? 'MIT'),
  repoUrl: /^https:\/\//.test(repo) ? repo : '',
  issuesUrl: String(PKG.bugs?.url ?? (repo ? `${repo}/issues` : '')),
};
