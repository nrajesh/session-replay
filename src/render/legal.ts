// Terms of use and privacy notice: one plain-language page, linked from every footer.
import { esc, page } from './html.ts';
import { PROJECT } from './brand.ts';
import type { SiteInfo } from './index.ts';

/** The terms and privacy text. `prefix` keeps ids unique when it is also embedded in a page's legal dialog. */
export function legalArticle(year: number, prefix = '', pro = false): string {
  const contact = PROJECT.issuesUrl
    ? `<a href="${esc(PROJECT.issuesUrl)}" target="_blank" rel="noopener noreferrer">GitHub issues</a>`
    : 'the project’s issue tracker';
  let others = '<li><strong>Other services.</strong> When you use Claude Code with Session Replay, its terms apply.</li>';
  let summaries = '<li><strong>Decisions can be wrong.</strong> Best-effort decisions are read from your messages. Check the linked session before relying on them.</li>';
  let proPrivacy = '';
  let removing = '<li><strong>Removing everything.</strong> Delete the pages folder to remove all pages and caches. Nothing else is kept.</li>';
  return `<article class="legal">
<section id="${prefix}terms" aria-labelledby="${prefix}terms-title">
<h2 id="${prefix}terms-title">Terms of use</h2>
<p>Session Replay is open-source software released under the ${esc(PROJECT.license)} licence. You may use, copy, change and share it under that licence.</p>
<ul>
<li><strong>No warranty.</strong> The software is provided “as is”. The authors are not liable for any loss or damage from using it.</li>
<li><strong>Your content is yours.</strong> Session transcripts, code and commits shown in these pages belong to you or to whoever owns them. Session Replay claims no rights to them.</li>
${others}
${summaries}
</ul>
</section>
<section id="${prefix}privacy" aria-labelledby="${prefix}privacy-title">
<h2 id="${prefix}privacy-title">Privacy</h2>
<ul>
<li><strong>Stays on your computer.</strong> Session Replay reads agent transcripts and Git history from your disk and writes these pages to a local folder. There are no accounts, analytics or tracking. The pages load nothing from the internet.</li>
${proPrivacy}${removing}
</ul>
</section>
<section id="${prefix}contact" aria-labelledby="${prefix}contact-title">
<h2 id="${prefix}contact-title">Copyright and contact</h2>
<p>© ${year} ${esc(PROJECT.owner)}. Questions, bugs and requests: ${contact}.</p>
</section>
</article>`;
}

export function renderLegal(site: SiteInfo): string {
  let short = 'Short version: this is your archive, on your computer, and it stays there.';
  const body = `<header class="page-heading"><div><h1>Terms and privacy</h1><p class="page-intro">${short}</p></div></header>
${legalArticle(new Date(site.generatedAt).getFullYear(), '', !!site.pro)}`;
  return page({ legalPage: true, title: 'Terms and privacy · Session Replay', root: '', pro: site.pro, theme: site.theme, body });
}
