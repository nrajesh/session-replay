// The one way Free pages mention Pro: a short line with a link to the public README.
import { esc } from './html.ts';

export const PRO_URL = 'https://github.com/nrajesh/session-replay#pro';

export function proNote(text = ''): string {
  return `<p class="pro-note no-print">${text ? `<span>${esc(text)}</span> ` : ''}<a href="${PRO_URL}" target="_blank" rel="noreferrer">Pro is coming soon ↗</a></p>`;
}
