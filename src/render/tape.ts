// The session as a cassette tape: an overview of when things happened, between two reels. Used by local and cloud sessions.
// Positions follow active time when activity spans are given, so idle hours and overnight gaps do not squeeze the work
// into corners; collapsed gaps show as small breaks. Marks that would overlap are grouped into one, with a count.
// Reels are buttons (left = previous, right = next) and turn anticlockwise going back, clockwise going forward.
// Left/Right arrows visit every item one by one from anywhere on the page (unless you are typing); Home/End too while
// the tape has focus. Once you scroll past it, the tape docks under the top bar, dimmed until you point at it.
import { esc } from './html.ts';
import { dayKey, fmtDate, fmtTime } from './format.ts';
import { peekAttr, type Peek } from './peek.ts';

export interface TapeMark {
  at: string;
  /** "you" (amber) or "agent" (blue); commits sit in an outlined box. */
  who: 'you' | 'agent';
  commit?: boolean;
  title: string;
  /** Screen-reader label for this item. */
  label: string;
  peek?: Peek;
  /** Session checkpoint index (opens that checkpoint) or an in-page link such as "#cm-0" (cloud commit rows). */
  cp?: number;
  href?: string;
}

/** Marks closer than this (percent of the track) share one group, so nothing overlaps. */
const GROUP_GAP = 2.4;
/** Idle stretches longer than this are collapsed when placing marks by active time. */
const COLLAPSE_MS = 2 * 3600_000;

/** Maps a time to 0..100 along the tape: by active time when spans are given, else by the clock. */
function axis(start: string, end: string, spans?: [string, string][]): { pos: (at: string) => number; gaps: number[] } {
  const t0 = Date.parse(start), t1 = Date.parse(end);
  const clock = (at: string) => (t1 > t0 ? ((Date.parse(at) - t0) / (t1 - t0)) * 100 : 50);
  const list = (spans ?? []).map(([a, b]) => [Date.parse(a), Date.parse(b)] as const).filter(([a, b]) => b >= a).sort((x, y) => x[0] - y[0]);
  if (!list.length || !(t1 > t0)) return { pos: clock, gaps: [] };
  // Segments along the tape: active spans keep their length; idle gaps keep theirs only when short.
  const segs: { from: number; to: number; len: number }[] = [];
  let cursor = t0;
  for (const [a, b] of list) {
    if (a > cursor) segs.push({ from: cursor, to: a, len: a - cursor > COLLAPSE_MS ? 0 : a - cursor });
    if (b > cursor) segs.push({ from: Math.max(a, cursor), to: b, len: b - Math.max(a, cursor) });
    cursor = Math.max(cursor, b);
  }
  if (t1 > cursor) segs.push({ from: cursor, to: t1, len: t1 - cursor > COLLAPSE_MS ? 0 : t1 - cursor });
  const total = segs.reduce((n, s) => n + s.len, 0);
  if (!total) return { pos: clock, gaps: [] };
  const at = (t: number) => {
    let acc = 0;
    for (const s of segs) {
      if (t <= s.to) return ((acc + (s.to > s.from ? ((t - s.from) / (s.to - s.from)) * s.len : 0)) / total) * 100;
      acc += s.len;
    }
    return 100;
  };
  const gaps: number[] = [];
  let acc = 0;
  for (const s of segs) { if (s.len === 0 && acc > 0 && acc < total) gaps.push((acc / total) * 100); acc += s.len; }
  return { pos: (iso: string) => at(Date.parse(iso)), gaps };
}

/** A risky action along the tape: a small outlined diamond that links to its row on the page. */
export interface TapeRisk { at: string; label: string; href: string; peek?: Peek }

export function tapeHtml(o: { start: string; end: string; marks: TapeMark[]; current?: number; unit: string; activity?: [string, string][]; risks?: TapeRisk[]; key: { you: string; agent: string; commit?: string; risk?: string } }): string {
  const { marks } = o;
  if (!marks.length) return '';
  const { pos, gaps } = axis(o.start, o.end, o.activity);
  const xs = marks.map((m) => { const x = pos(m.at); return Math.min(100, Math.max(0, Number.isFinite(x) ? x : 50)); });
  const cur = o.current ?? marks.length - 1;
  // Greedy grouping along the track.
  const groups: number[][] = [];
  xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i).forEach(({ x, i }) => {
    const g = groups[groups.length - 1];
    if (g && x - xs[g[0]] < GROUP_GAP) g.push(i); else groups.push([i]);
  });
  const multiDay = dayKey(o.start) !== dayKey(o.end);
  const when = (iso: string) => (multiDay ? `${fmtDate(iso).replace(/ \d{4}$/, '')} ${fmtTime(iso)}` : fmtTime(iso));
  const key = [
    marks.some((m) => m.who === 'you') ? `<span class="k-you">${esc(o.key.you)}</span>` : '',
    marks.some((m) => m.who === 'agent') ? `<span class="k-agent">${esc(o.key.agent)}</span>` : '',
    o.key.commit && marks.some((m) => m.commit) ? `<span class="k-commit">${esc(o.key.commit)}</span>` : '',
    o.risks?.length && o.key.risk ? `<span class="k-risk">${esc(o.key.risk)}</span>` : '',
    groups.some((g) => g.length > 1) ? `<span class="k-group">Several close together</span>` : '',
    gaps.length ? `<span class="k-gap">Idle time left out</span>` : '',
  ].join('');
  const html = groups.map((g) => {
    const ms = g.map((i) => marks[i]);
    const you = ms.some((m) => m.who === 'you'), agent = ms.some((m) => m.who === 'agent');
    const cls = `tape-mark ${you && agent ? 'mixed' : you ? 'you' : 'agent'}${ms.some((m) => m.commit) ? ' commit' : ''}${g.length > 1 ? ' group' : ''}`;
    const x = (g.reduce((n, i) => n + xs[i], 0) / g.length).toFixed(2);
    const label = g.length === 1 ? ms[0].label : `${g.length} ${o.unit}s, ${fmtTime(ms[0].at)} to ${fmtTime(ms[ms.length - 1].at)}`;
    const peek: Peek | undefined = g.length === 1 ? ms[0].peek : {
      h: `${g.length} ${o.unit}s`, s: `${when(ms[0].at)} – ${fmtTime(ms[ms.length - 1].at)}`,
      r: [...ms.slice(0, 6).map((m) => [fmtTime(m.at), m.title] as [string, string]), ...(ms.length > 6 ? [['', `and ${ms.length - 6} more`] as [string, string]] : [])],
      g: 'Click to step through them; arrow keys visit each one',
    };
    return `<button type="button" class="${cls}" style="--x:${x}" data-items="${g.join(',')}" aria-current="${g.includes(cur)}" tabindex="${g.includes(cur) ? 0 : -1}" aria-label="${esc(label)}"${peek ? peekAttr(peek) : ''}>${g.length > 1 ? `<span class="tape-count" aria-hidden="true">${g.length}</span>` : ''}</button>`;
  }).join('');
  const items = marks.map((m, i) => ({ x: +xs[i].toFixed(2), cp: m.cp, h: m.href }));
  const riskHtml = (o.risks ?? []).map((r) => { const x = Math.min(100, Math.max(0, pos(r.at))); return `<a class="tape-risk" style="--x:${(Number.isFinite(x) ? x : 50).toFixed(2)}" href="${esc(r.href)}" aria-label="${esc(r.label)}"${r.peek ? peekAttr(r.peek) : ''}></a>`; }).join('');
  const gapHtml = gaps.map((x) => `<span class="tape-gap" aria-hidden="true" style="--x:${x.toFixed(2)}"></span>`).join('');
  return `<div class="tape-slot"><div class="tape" role="group" data-items="${esc(JSON.stringify(items))}" aria-label="${esc(`Timeline, ${marks.length} ${o.unit}${marks.length === 1 ? '' : 's'}. Left and right arrow keys move between them.`)}">
<button type="button" class="reel" data-step="-1" aria-label="Rewind to previous ${esc(o.unit)}"${cur === 0 ? ' disabled' : ''}></button>
<div class="tape-window"><div class="tape-track">${gapHtml}${html}${riskHtml}<span class="tape-head" aria-hidden="true" style="--x:${xs[cur].toFixed(2)}"></span></div><div class="tape-times" aria-hidden="true"><span>${esc(when(o.start))}</span><span>${esc(when(o.end))}</span></div></div>
<button type="button" class="reel" data-step="1" aria-label="Forward to next ${esc(o.unit)}"${cur === marks.length - 1 ? ' disabled' : ''}></button>
</div>
<p class="tape-key" aria-hidden="true">${key}</p></div>`;
}

/** Shared by every page. Session pages set window.SRShowCp(i) to open checkpoint i, and call SRTape.select(i) when one is chosen elsewhere. */
export const TAPE_JS = `
(function(){
  var tapes=[].slice.call(document.querySelectorAll('.tape'));
  tapes.forEach(function(tape){
    var items=JSON.parse(tape.getAttribute('data-items')||'[]'),marks=[].slice.call(tape.querySelectorAll('.tape-mark')),head=tape.querySelector('.tape-head'),reels=[].slice.call(tape.querySelectorAll('.reel')),busy=0;
    var groupOf=[];marks.forEach(function(m){m.getAttribute('data-items').split(',').forEach(function(i){groupOf[+i]=m;});});
    var cur=items.length-1;
    function select(i){if(i<0||i>=items.length)return;var d=i-cur;
      marks.forEach(function(m){var on=m===groupOf[i];m.setAttribute('aria-current',String(on));m.tabIndex=on?0:-1;});
      if(head)head.style.setProperty('--x',items[i].x);
      if(d){var s=Math.min(1.4,0.55+Math.abs(d)*0.08);tape.style.setProperty('--spin',s+'s');tape.classList.remove('fwd','rew');void tape.offsetWidth;tape.classList.add(d>0?'fwd':'rew','busy');
        clearTimeout(busy);busy=setTimeout(function(){tape.classList.remove('busy');},s*1000+700);}
      cur=i;reels[0].disabled=i===0;reels[1].disabled=i===items.length-1;}
    // Open item j: a session checkpoint, or scroll to an in-page row (keeping keyboard focus on the tape).
    function go(j,focus){if(j<0||j>=items.length)return;var it=items[j];
      if(it.cp!=null&&window.SRShowCp)window.SRShowCp(it.cp);
      else if(it.h&&it.h.charAt(0)==='#'){var t=document.getElementById(it.h.slice(1));if(t){t.scrollIntoView({behavior:'smooth',block:'center'});document.querySelectorAll('.tape-hit').forEach(function(x){x.classList.remove('tape-hit');});t.classList.add('tape-hit');}history.replaceState(null,'',it.h);}
      select(j);if(focus)groupOf[j].focus({preventScroll:true});}
    tape.srSelect=select;
    tape.srKey=function(k,focus){go(k==='ArrowRight'?cur+1:k==='ArrowLeft'?cur-1:k==='Home'?0:items.length-1,focus);};
    // A group steps through its items: the first click opens its first item, further clicks move along it.
    tape.querySelectorAll('.tape-risk').forEach(function(a){a.addEventListener('click',function(e){var h=a.getAttribute('href')||'';if(h.charAt(0)!=='#'||!window.SRShowRisk)return;e.preventDefault();window.SRShowRisk(h.slice(1));});});
    marks.forEach(function(m){m.addEventListener('click',function(){var g=m.getAttribute('data-items').split(',').map(Number),at=g.indexOf(cur);go(at<0||at===g.length-1?g[0]:g[at+1],true);});});
    reels.forEach(function(r){r.addEventListener('click',function(){go(cur+(+r.getAttribute('data-step')),false);});});
    var slot=tape.parentElement;
    if(slot&&slot.classList.contains('tape-slot')&&window.IntersectionObserver){
      new IntersectionObserver(function(es){var e=es[0],line=e.rootBounds?e.rootBounds.top:64;var past=!e.isIntersecting&&e.boundingClientRect.bottom<=line+1;
        if(past&&!slot.classList.contains('docked')){var bar=document.querySelector('.topbar'),b=bar&&getComputedStyle(bar).position==='sticky'?bar.getBoundingClientRect().bottom:0;slot.style.setProperty('--dock-top',Math.max(0,b)+'px');slot.style.height=slot.offsetHeight+'px';slot.classList.add('docked');}
        else if(!past&&slot.classList.contains('docked')){slot.classList.remove('docked');slot.style.height='';}},{rootMargin:'-64px 0px 0px 0px'}).observe(slot);}
  });
  document.addEventListener('keydown',function(e){var k=e.key,tape=tapes[0];
    if(!tape||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||!/^(ArrowLeft|ArrowRight|Home|End)$/.test(k))return;
    var a=document.activeElement,inTape=tape.contains(a);
    if(!inTape){if(k==='Home'||k==='End'||document.querySelector('dialog[open]'))return;
      if(a&&a!==document.body&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable||a.closest('.table-scroll,.vz,[role=listbox],[role=tablist]')))return;}
    e.preventDefault();tape.srKey(k,inTape);});
  window.SRTape={select:function(i){if(tapes[0]&&tapes[0].srSelect)tapes[0].srSelect(i);}};
})();`;
