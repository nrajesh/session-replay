// Hover cards ("peeks"): hover or keyboard-focus a link to see what is behind it, Apture-style.
// Any element with data-peek='{"h":…}' gets one. Payload: h heading, s subheading, a agent family + b its label,
// q a quote, r [[label, value]] facts, g a hint about where the link goes. Built with textContent, never innerHTML.
import { esc } from './html.ts';
import type { AgentFamily } from '../usage.ts';

export interface Peek { h: string; s?: string; a?: AgentFamily; b?: string; q?: string; r?: [string, string | number | undefined | null][]; g?: string }

/** ` data-peek="…"` for a server-rendered element; empty facts are dropped. */
export function peekAttr(p: Peek): string {
  const r = (p.r ?? []).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]);
  return ` data-peek="${esc(JSON.stringify({ ...p, r: r.length ? r : undefined }))}"`;
}

/** WCAG 1.4.13: dismissible (Esc), hoverable (pointer can move onto the card), persistent until you leave. Mouse and keyboard only. */
export const PEEK_JS = `
(function(){
  var card=document.createElement('div');card.className='peek';card.id='sr-peek';card.setAttribute('role','tooltip');card.hidden=true;document.body.appendChild(card);
  var cur=null,showT=0,hideT=0;
  function el(tag,cls,text){var x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x;}
  function render(d){card.textContent='';var top=el('div','peek-top');
    if(d.a){var p=el('span','agent ag-'+d.a);p.appendChild(el('i'));p.appendChild(document.createTextNode(d.b||''));top.appendChild(p);}
    if(d.s)top.appendChild(el('span','peek-s',d.s));if(top.childNodes.length)card.appendChild(top);
    if(d.h)card.appendChild(el('div','peek-h',d.h));if(d.q)card.appendChild(el('p','peek-q',d.q));
    if(d.r&&d.r.length){var dl=el('dl','peek-r');d.r.forEach(function(r){dl.appendChild(el('dt',null,r[0]));dl.appendChild(el('dd',null,r[1]));});card.appendChild(dl);}
    if(d.g)card.appendChild(el('div','peek-go',d.g));}
  function place(t){var r=t.getBoundingClientRect(),w=card.offsetWidth,h=card.offsetHeight,x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+8;
    if(y+h>innerHeight-8&&r.top-h-8>8)y=r.top-h-8;card.style.left=x+'px';card.style.top=y+'px';}
  function show(t){clearTimeout(hideT);var d;try{d=JSON.parse(t.getAttribute('data-peek'));}catch(e){return;}
    if(cur&&cur!==t)cur.removeAttribute('aria-describedby');cur=t;render(d);card.hidden=false;card.classList.remove('on');place(t);
    requestAnimationFrame(function(){card.classList.add('on');});t.setAttribute('aria-describedby','sr-peek');}
  function hide(){clearTimeout(showT);clearTimeout(hideT);if(cur)cur.removeAttribute('aria-describedby');cur=null;card.classList.remove('on');card.hidden=true;}
  function later(){clearTimeout(hideT);hideT=setTimeout(hide,160);}
  function target(e){return e.target.closest&&e.target.closest('[data-peek]');}
  document.addEventListener('pointerover',function(e){if(e.pointerType==='touch')return;var t=target(e);
    if(!t){if(cur&&!card.contains(e.target))later();return;}
    if(t===cur){clearTimeout(hideT);return;}clearTimeout(showT);showT=setTimeout(function(){show(t);},cur?80:300);});
  document.addEventListener('pointerout',function(e){var t=target(e);if(t&&!t.contains(e.relatedTarget)){clearTimeout(showT);if(t===cur)later();}});
  card.addEventListener('pointerenter',function(){clearTimeout(hideT);});card.addEventListener('pointerleave',later);
  document.addEventListener('focusin',function(e){var t=target(e);if(t&&t.matches(':focus-visible'))show(t);else if(cur)hide();});
  document.addEventListener('focusout',function(e){if(e.target===cur)later();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&cur)hide();});
  addEventListener('scroll',function(){if(cur)hide();},{passive:true,capture:true});
  document.addEventListener('pointerdown',function(e){if(cur&&!card.contains(e.target))hide();},true);
})();`;
