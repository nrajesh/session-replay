// HTML helpers shared by every page. Pages are self-contained: inline CSS and JS only.
import { CSS } from './style.ts';
import { FAVICON, PROJECT, logoSvg } from './brand.ts';
import { legalArticle } from './legal.ts';
import { PEEK_JS } from './peek.ts';
import { TAPE_JS } from './tape.ts';

/** Footer Terms/Privacy open as a dialog; modifier-clicks and the dialog's "Open as page" still use legal.html. */
const LEGAL_JS = `
(function(){var d=document.getElementById('legal-modal');if(!d||!d.showModal)return;
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-legal]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;
    e.preventDefault();d.showModal();var t=document.getElementById('m-'+a.getAttribute('data-legal'));var b=d.querySelector('.m-body');if(t&&b)b.scrollTop=t.offsetTop-b.offsetTop-8;});})();`;

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** JSON safe to place inside <script>: no '<', so it can never close the tag. */
export function jsonForScript(v: unknown): string {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export interface Crumb { label: string; href?: string }

export interface PageOpts {
  /** The standalone legal page itself: no legal dialog (it would repeat the page). */
  legalPage?: boolean;
  title: string;
  body: string;
  /** Path back to the output root from this page: '' or '../'. */
  root: string;
  nav?: 'sessions' | 'projects' | 'usage' | 'clouds';
  crumbs?: Crumb[];
  script?: string;
  data?: unknown;
  pro?: boolean;
  theme?: 'auto' | 'light' | 'dark';
}

const COMMON_JS = `
(function(){
  var root=document.documentElement;
  try{var t=localStorage.getItem('sr-theme');if(t)root.setAttribute('data-theme',t);}catch(e){}
  function label(){var b=document.querySelector('[data-action=theme]');if(!b)return;var t=root.getAttribute('data-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');b.setAttribute('aria-label','Theme: '+t+' (click for '+(t==='dark'?'light':'dark')+')');b.title='Theme: '+t;}
  label();
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-action]');if(!b)return;
    var a=b.getAttribute('data-action');
    if(a==='theme'){var cur=root.getAttribute('data-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var next=cur==='dark'?'light':'dark';
      root.setAttribute('data-theme',next);
      try{localStorage.setItem('sr-theme',next);}catch(e){} label();}
    if(a==='print'){window.print();}
    if(a==='print-panel'){var pn=b.closest('.panel');if(pn){var cap=document.querySelector('h1');pn.setAttribute('data-print-caption',((cap?cap.textContent:'Session Replay')+' · '+(document.getElementById('range-note')?document.getElementById('range-note').textContent.trim():'')).replace(/ · $/,''));pn.classList.add('print-this');document.body.setAttribute('data-print-panel','1');document.dispatchEvent(new CustomEvent('sr-before-print',{detail:pn}));
      var undo=function(){[].forEach.call(pn.querySelectorAll('[data-temp]'),function(t){t.remove();});pn.classList.remove('print-this');document.body.removeAttribute('data-print-panel');window.removeEventListener('afterprint',undo);};window.addEventListener('afterprint',undo);window.print();}}
    if(a==='open-command'){var cd=document.getElementById('command-menu');if(cd&&cd.showModal){cd.showModal();var ci=cd.querySelector('input');if(ci)ci.focus();}}
    if(a==='open-modal'){var d=document.getElementById(b.getAttribute('data-target'));if(d&&d.showModal)d.showModal();}
    if(a==='close-modal'){var d2=b.closest('dialog');if(d2)d2.close();}
  });
  document.addEventListener('click',function(e){if(e.target.tagName==='DIALOG')e.target.close();});
  var cmd=document.getElementById('command-menu');
  if(cmd){var input=cmd.querySelector('input'),items=[].slice.call(cmd.querySelectorAll('[data-command]')),status=cmd.querySelector('[data-command-status]');
    items.forEach(function(x){var id=x.getAttribute('data-focus-target');if(id&&!document.getElementById(id))x.setAttribute('data-unavailable','');});
    function distance(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;var prev=Array.from({length:b.length+1},function(_,i){return i;});for(var i=1;i<=a.length;i++){var cur=[i],min=i;for(var j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));min=Math.min(min,cur[j]);}if(min>max)return max+1;prev=cur;}return prev[b.length];}
    function matches(text,q){if(!q)return true;var words=q.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().split(/[^\\p{L}\\p{N}]+/u).filter(Boolean),hay=text.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();return words.every(function(w){if(hay.indexOf(w)>=0)return true;var limit=w.length>=8?2:1;return hay.split(/[^\\p{L}\\p{N}]+/u).some(function(t){return t.length>=4&&distance(w,t,limit)<=limit;});});}
    function filter(){var q=input.value.trim(),visible=0;items.forEach(function(x){var show=!x.hasAttribute('data-unavailable')&&matches(x.textContent,q);x.hidden=!show;if(show)visible++;});status.textContent=visible?visible+' destinations':'No matches';}
    input.addEventListener('input',filter);filter();
    cmd.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-focus-target]');if(!b)return;var target=document.getElementById(b.getAttribute('data-focus-target'));cmd.close();if(target){target.focus();target.scrollIntoView({behavior:'smooth',block:'center'});}});
    cmd.addEventListener('close',function(){input.value='';filter();});
    document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!cmd.open)cmd.showModal();input.focus();}else if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){var search=document.getElementById('project-search')||document.getElementById('ask-q')||document.getElementById('cp-search');if(search){e.preventDefault();search.focus();}}});
  }
})();`;

/** The same small footer on every page: copyright, terms, privacy and where to get help. */
export function siteFooter(root: string, now = new Date()): string {
  const out = ' target="_blank" rel="noopener noreferrer"';
  const links = [
    `<a href="${root}legal.html#terms" data-legal="terms">Terms</a>`,
    `<a href="${root}legal.html#privacy" data-legal="privacy">Privacy</a>`,
    PROJECT.issuesUrl ? `<a href="${esc(PROJECT.issuesUrl)}"${out}>Contact</a>` : '',
    PROJECT.repoUrl ? `<a href="${esc(PROJECT.repoUrl)}"${out}>GitHub</a>` : '',
  ].filter(Boolean);
  return `<footer class="site-foot"><span>© ${now.getFullYear()} ${esc(PROJECT.owner)} · Session Replay is open source under the ${esc(PROJECT.license)} licence</span><nav aria-label="Legal and contact">${links.join('')}</nav></footer>`;
}


const THEME_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>';

export function page(o: PageOpts): string {
  const crumbs = o.crumbs?.length
    ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs.map((c) => (c.href ? `<a href="${esc(c.href)}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`)).join(' / ')}</nav>`
    : '';
  const navLink = (key: PageOpts['nav'], href: string, label: string) =>
    `<a href="${o.root}${href}"${o.nav === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const data = o.data === undefined ? '' : `<script id="sr-data" type="application/json">${jsonForScript(o.data)}</script>`;
  const themeAttr = o.theme && o.theme !== 'auto' ? ` data-theme="${o.theme}"` : '';
  let appButtons = '', updateBar = '', appCommands = '';
  return `<!doctype html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'">
<title>${esc(o.title)}</title>
<link rel="icon" href="${FAVICON}">
<meta name="theme-color" content="#0B0D11" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F5F6F9" media="(prefers-color-scheme: light)">
<style>${CSS}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="${o.root}index.html" aria-label="Session Replay home">${logoSvg(30)}<span class="wordmark">Session <b>Replay</b></span></a>
  <nav class="nav" aria-label="Primary">${navLink('sessions', 'index.html', 'Sessions')}${navLink('projects', 'projects.html', 'Projects')}${navLink('usage', 'usage.html', 'Usage')}</nav>
  <div class="top-actions">
    <button type="button" class="btn quick-open" data-action="open-command" aria-label="Find anything ⌘K" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K"><span aria-hidden="true">⌕</span><span class="quick-open-label">Find anything</span><kbd>⌘K</kbd></button>
${appButtons}    <button type="button" class="btn" data-action="print" title="Print or save as PDF">Save PDF</button>
    <button type="button" class="btn icon" data-action="theme" aria-label="Theme">${THEME_ICON}</button>
  </div>
</header>
${updateBar}<main class="wrap" id="main" tabindex="-1">
${crumbs}
${o.body}
</main>
${siteFooter(o.root)}
${o.legalPage ? '' : `<dialog id="legal-modal" class="legal-modal" aria-labelledby="legal-modal-title"><div class="m-head"><h2 id="legal-modal-title">Terms and privacy</h2><a class="btn sm" href="${o.root}legal.html">Open as page</a><button type="button" class="btn icon" data-action="close-modal" aria-label="Close">✕</button></div><div class="m-body">${legalArticle(new Date().getFullYear(), 'm-', !!o.pro)}</div></dialog>`}
<dialog class="command-menu" id="command-menu" aria-labelledby="command-menu-title">
  <h2 id="command-menu-title">Quick navigation</h2>
  <label class="visually-hidden" for="command-search">Search destinations and actions</label>
  <input id="command-search" type="search" autocomplete="off" placeholder="Search pages and actions…" aria-controls="command-items">
  <ul id="command-items">
    <li><a href="${o.root}index.html" data-command><span>All sessions</span><span class="command-hint">Search your archive</span></a></li>
    <li><a href="${o.root}projects.html" data-command><span>Projects</span><span class="command-hint">Project activity</span></a></li>
    <li><a href="${o.root}usage.html" data-command><span>Usage</span><span class="command-hint">Time and activity</span></a></li>
${appCommands}    <li><button type="button" data-command data-focus-target="project-search"><span>Filter projects</span><span class="command-hint">Project list <kbd>/</kbd></span></button></li>
    <li><button type="button" data-command data-focus-target="ask-q"><span>Search sessions</span><span class="command-hint">Prompts, decisions, commits, files <kbd>/</kbd></span></button></li>
    <li><button type="button" data-command data-focus-target="cp-search"><span>Search checkpoints</span><span class="command-hint">This session <kbd>/</kbd></span></button></li>
  </ul>
  <p class="command-status" data-command-status aria-live="polite"></p>
</dialog>
${data}
<script>${COMMON_JS}${PEEK_JS}${TAPE_JS}${LEGAL_JS}</script>
${o.script ? `<script>${o.script}</script>` : ''}
</body>
</html>`;
}
