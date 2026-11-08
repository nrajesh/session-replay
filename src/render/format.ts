// Display formatting in the machine's local time zone.
const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const d = (iso: string) => new Date(iso);
const valid = (iso: string) => !!iso && !Number.isNaN(Date.parse(iso));

export const dayKey = (iso: string) => (valid(iso) ? `${d(iso).getFullYear()}-${pad(d(iso).getMonth() + 1)}-${pad(d(iso).getDate())}` : '');
export const fmtTime = (iso: string) => (valid(iso) ? `${pad(d(iso).getHours())}:${pad(d(iso).getMinutes())}` : '');
export const fmtDate = (iso: string) => (valid(iso) ? `${d(iso).getDate()} ${MONTHS[d(iso).getMonth()]} ${d(iso).getFullYear()}` : 'unknown date');
export const fmtDateTime = (iso: string) => (valid(iso) ? `${fmtDate(iso)}, ${fmtTime(iso)}` : 'unknown');

export function fmtDuration(start: string, end: string): string {
  if (!valid(start) || !valid(end)) return 'unknown';
  const mins = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h >= 48 ? `${Math.round(h / 24)} days` : `${h} h ${pad(mins % 60)} min`;
}

export const minutesBetween = (start: string, end: string) =>
  valid(start) && valid(end) ? Math.round((Date.parse(end) - Date.parse(start)) / 60000) : 0;

export function testsLabel(tests: { passed: number; total: number; failed: number; runner: string }[]): { text: string; pct?: number; sub?: string } {
  if (!tests.length) return { text: 'unknown' };
  const first = tests[0];
  const last = tests[tests.length - 1];
  const pct = last.total ? Math.round((last.passed / last.total) * 100) : undefined;
  const lastTxt = `${last.passed}/${last.total} passed${pct !== undefined ? ` · ${pct}%` : ''}`;
  const text = tests.length > 1 && (first.passed !== last.passed || first.total !== last.total) ? `${first.passed}/${first.total} → ${lastTxt}` : lastTxt;
  return { text, pct, sub: `last of ${tests.length} run${tests.length > 1 ? 's' : ''}, from ${last.runner} output` };
}

/**
 * A title short enough for a table row or page heading. Long first prompts (Copilot titles are often the whole
 * prompt) are cut at the first sentence that fits, else at a word boundary, with "…". The full text stays in search.
 */
export function shortTitle(title: string, max = 90): string {
  const one = title.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  const head = one.slice(0, max);
  const sentence = head.match(/^.{24,}?[.?!](?=\s)/);
  if (sentence) return sentence[0];
  const cut = head.lastIndexOf(' ');
  return `${(cut > max * 0.6 ? head.slice(0, cut) : head).replace(/[\s,;:–—-]+$/, '')}…`;
}
