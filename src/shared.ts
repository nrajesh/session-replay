// Small helpers used by every edition: active time from spans, and a readable session title.

export function activeMinutes(spans: [string, string][]): number {
  return Math.round(spans.reduce((a, [s, e]) => a + Math.max(0, Date.parse(e) - Date.parse(s)), 0) / 60000);
}

/** AI title if present; otherwise the first sentence or line of the first prompt, cut at a word boundary. */
export function niceTitle(aiTitle: string, firstPrompt: string, max = 80): string {
  if (aiTitle.trim()) return aiTitle.trim();
  const first = (firstPrompt.split(/\n|(?<=[.!?:])\s/)[0] ?? '').replace(/[:\s]+$/, '').replace(/\s+/g, ' ').trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max).replace(/[\s,;:-]+$/, '') + '…';
}
