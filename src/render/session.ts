// One replay page per session (v2 design): compact tiles, sticky checkpoints, decision details,
// detail panels and GitHub links (Pro), folded conversation.
import { createHash } from 'node:crypto';
import type { Checkpoint, CommitRef, DecisionPoint, SessionModel } from '../types.ts';
import type { PullRequest } from '../types.ts';
import { activeMinutes } from '../shared.ts';
import { esc, page } from './html.ts';
import { clientBundle } from './client-bundle.ts';
import { proNote } from './pro-link.ts';
import { fmtDate, fmtDateTime, fmtTime, shortTitle } from './format.ts';
import { tapeHtml } from './tape.ts';
import { peekAttr } from './peek.ts';
import { fmtTok, modelBar, modelLabel } from './models.ts';
import { totalIn, sessionFamily } from '../usage.ts';
import { agentChip } from './brand.ts';
import { RISKY_LABEL } from '../risky.ts';

export interface SessionCtx {
  projectName: string;
  webUrl?: string;
  prs?: PullRequest[];
  pro?: boolean;
  theme?: 'auto' | 'light' | 'dark';
  /** The transcript is gone: 'cleanup' = Claude Code's own cleanup, 'disk' = deleted some other way. */
  sourceGone?: 'cleanup' | 'disk';
}

const TOOL_CLIP = 1500;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + `\n… [${s.length - n} more characters not shown]` : s);
export const n = (x: number) => x.toLocaleString('en');
export const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`);
export const pctClass = (p: number) => (p >= 98 ? 'good' : p >= 85 ? 'warn' : 'bad');
export const plusMinus = (a: number, r: number) => `<span class="plus">+${n(a)}</span> <span class="minus">−${n(r)}</span>`;

const commitPeek = (c: CommitRef) => peekAttr({
  h: c.subject, s: `Commit ${c.hash.slice(0, 7)} · ${fmtDateTime(c.at)}`,
  r: [['Lines', `+${c.added} −${c.removed}`], ['Files', c.files.length || undefined]], g: 'Opens on GitHub ↗',
});
export const prPeek = (p: { number: number; url: string } & Partial<PullRequest>) => peekAttr({
  h: p.title ?? `Pull request #${p.number}`, s: `Pull request #${p.number}${p.mergedAt ? ' · merged' : p.state ? ` · ${p.state.toLowerCase()}` : ''}`,
  r: [['Branch', p.branch], ['Merged', p.mergedAt ? fmtDate(p.mergedAt) : undefined], ['Lines', p.additions !== undefined ? `+${p.additions} −${p.deletions ?? 0}` : undefined]],
  g: 'Opens on GitHub ↗',
});

export function commitLink(c: CommitRef, ctx: SessionCtx, label = c.hash.slice(0, 7)): string {
  return ctx.pro && ctx.webUrl
    ? `<a class="mono" href="${esc(`${ctx.webUrl}/commit/${c.hash}`)}" rel="noreferrer"${commitPeek(c)}>${esc(label)} ↗</a>`
    : `<span class="mono">${esc(label)}</span>`;
}

/** Escapes text and, for Pro with a GitHub repo, turns #123 into a styled button link to that issue or PR. */
export function txt(text: string, ctx: SessionCtx): string {
  const e = esc(text);
  if (!ctx.pro || !ctx.webUrl) return e;
  return e.replace(/(?<![\w&/#])#(\d{1,5})\b/g, (_m, num: string) => `<a href="${esc(`${ctx.webUrl}/issues/${num}`)}" rel="noreferrer" class="btn issue">#${num} ↗</a>`);
}

/** A file name linked to its diff in the commit that touched it (GitHub's #diff-<sha256 of path> anchor). */
export function fileLink(f: string, hash: string | undefined, ctx: SessionCtx): string {
  if (!ctx.pro || !ctx.webUrl || !hash) return esc(f);
  const anchor = createHash('sha256').update(f).digest('hex');
  return `<a href="${esc(`${ctx.webUrl}/commit/${hash}#diff-${anchor}`)}" rel="noreferrer">${esc(f)}</a>`;
}

const KIND_LABEL: Record<DecisionPoint['kind'], string> = { ask: 'Question', instruction: 'Instruction', approval: 'Approval', rejection: 'Pushback' };

export function decisionCard(d: DecisionPoint, i: number, ctx: SessionCtx): string {
  const head = `<div class="cp-sub"><span>Decision point ${i}${d.header ? ` · ${esc(d.header)}` : d.exact ? '' : ` · ${KIND_LABEL[d.kind]}`}</span>
${d.exact && d.notes === 'no answer recorded' ? '<span class="chip plain">No answer recorded</span>' : '<span class="chip you">Answered</span>'}${d.exact ? '' : '<span class="chip plain" title="Inferred from your message; may be inaccurate">best-effort</span>'}</div>`;
  const q = d.question ? `<p class="q">${txt(d.question, ctx)}</p>` : '';
  const opts = d.options.length
    ? `<ul class="options">${d.options.map((o) => {
        const chosen = d.chosen.includes(o.label);
        return `<li class="option${chosen ? ' chosen' : ''}">${esc(o.label)}${o.description ? `<span class="desc">${esc(o.description)}</span>` : ''}${o.recommended ? '<span class="tag rec">AI agent recommendation</span>' : ''}${chosen ? '<span class="tag ch">Chosen</span>' : ''}</li>`;
      }).join('')}</ul>`
    : '';
  const other = d.other ? `<blockquote><span class="muted">Your answer:</span> “${txt(d.other, ctx)}”</blockquote>` : '';
  const notes = d.notes && d.notes !== 'no answer recorded' ? `<blockquote>“${txt(d.notes, ctx)}”</blockquote>` : '';
  const quote = d.quote ? `<blockquote>”${txt(d.quote, ctx)}”</blockquote>` : '';
  const by = d.exact ? 'you' : 'agent';
  return `<section class="decision${d.exact ? ' exact' : ''}" data-by="${by}">${head}${q}${opts}${other}${notes}${quote}</section>`;
}

function testsIn(s: SessionModel, from: string, to: string) {
  return s.tests.filter((t) => t.at > from && t.at <= to);
}

function detail(s: SessionModel, c: Checkpoint, i: number, ctx: SessionCtx): string {
  const commit = c.commit;
  const prev = i > 0 ? s.checkpoints[i - 1].at : '';
  const runs = testsIn(s, prev, c.at);
  const last = runs[runs.length - 1];
  const mini = [
    last ? `<div class="tile"><span class="tile-label">Tests</span><span class="tile-value"><b>${n(last.total)}</b><span class="pct ${pctClass(last.total ? (last.passed / last.total) * 100 : 0)}">${last.total ? Math.round((last.passed / last.total) * 100) : 0}%</span></span></div>` : '',
    commit ? `<div class="tile"><span class="tile-label">Files</span><span class="tile-value"><b>${commit.files.length}</b>${plusMinus(commit.added, commit.removed)}</span></div>` : '',
    c.models?.length ? `<div class="tile"><span class="tile-label">${c.models.length > 1 ? 'Models' : 'Model'}</span><span class="tile-value"><b>${esc(modelLabel(c.models))}</b></span><span class="muted" style="font-size:12px">${fmtTok(c.models.reduce((a, u) => a + totalIn(u), 0))} in · ${fmtTok(c.models.reduce((a, u) => a + u.output, 0))} out</span>${c.models.length > 1 ? modelBar(c.models) : ''}</div>` : '',
    commit ? `<div class="tile"><span class="tile-label">Linked by</span><span class="tile-value">${commit.via.map((v) => (v === 'window' ? 'time and activity' : 'commit output')).join(' + ')}</span></div>` : '',
  ].join('');
  const files = commit?.files.length
    ? `<h3>Files in this checkpoint</h3><ul class="files">${commit.files.slice(0, 40).map((f) => `<li>${fileLink(f, commit.hash, ctx)}</li>`).join('')}${commit.files.length > 40 ? `<li>… and ${commit.files.length - 40} more</li>` : ''}</ul>`
    : '';
  return `<article class="panel cp-detail" id="cp-${i}"${i === s.checkpoints.length - 1 ? '' : ' hidden'}>
<div class="cp-head"><span>Checkpoint ${i + 1} of ${s.checkpoints.length} · ${esc(fmtDateTime(c.at))}</span>${commit ? `${commitLink(commit, ctx)}${plusMinus(commit.added, commit.removed)}` : ''}</div>
<h2>${txt(c.title, ctx)}</h2>
${c.decisions.length ? `<div class="cp-dec-filters"><button type="button" class="dfilter on" data-filter="all">All</button><button type="button" class="dfilter" data-filter="you">Asked by AI agent</button><button type="button" class="dfilter" data-filter="agent">From your messages</button></div>` : ''}
${c.decisions.map((d, k) => decisionCard(d, k + 1, ctx)).join('') || (c.decisions.length ? '' : `<p class="muted">No decision from you before this ${commit ? 'commit' : 'point'}; the AI agent proceeded on its own.</p>`)}
${mini ? `<div class="mini">${mini}</div>` : ''}
${files}
</article>`;
}

function conversation(s: SessionModel, ctx: SessionCtx): string {
  if (!s.turns.length) return '';
  const rows = s.turns.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => {
    const who = t.role === 'user' ? 'You' : t.role === 'assistant' ? 'AI agent' : esc(t.tool ?? 'Tool');
    const text = t.role === 'tool' ? clip(t.text, TOOL_CLIP) : t.text;
    return `<div class="turn ${t.role}" id="turn-${i}"><div class="cp-time">${esc(fmtTime(t.at))}</div><div class="who">${who}</div><div class="body">${t.role === 'tool' ? esc(text) : txt(text, ctx)}</div></div>`;
  }).join('\n');
  return `<details class="fold"><summary>Full conversation · ${s.turns.length} entries</summary><div class="fold-body">${rows}</div></details>`;
}

function tile(id: string, label: string, value: string, ctx: SessionCtx, extraClass = '', foot = ''): string {
  const inner = `<span class="tile-label">${esc(label)}</span><span class="tile-value">${value}</span>${foot}`;
  return ctx.pro
    ? `<button type="button" class="tile ${extraClass}" data-action="open-modal" data-target="m-${id}" aria-haspopup="dialog">${inner}</button>`
    : `<div class="tile ${extraClass}">${inner}</div>`;
}

/** The session tape: one mark per checkpoint. Marks select the checkpoint (data-cp) and peek at what happened. */
/** How many risky actions fall in each checkpoint: between the one before it and itself; later ones count for the last. */
function riskCheckpoint(s: SessionModel, at: string): number {
  const i = s.checkpoints.findIndex((c) => c.at >= at);
  return i < 0 ? s.checkpoints.length - 1 : i;
}
function risksPerCheckpoint(s: SessionModel): number[] {
  const n = s.checkpoints.map(() => 0);
  for (const a of s.riskyActions ?? []) {
    if (!n.length) break;
    n[riskCheckpoint(s, a.at)]++;
  }
  return n;
}

/** Always the same place and order in the hero: risk first, then the source. */
function riskChip(s: SessionModel): string {
  const n = s.riskyActions?.length;
  if (n) return `<a class="chip risk" href="#risky">${n} risky action${n === 1 ? '' : 's'}</a>`;
  if (n === 0) return `<span class="chip plain" tabindex="0"${peekAttr({ h: 'No risky actions', s: 'No destructive commands found in this session.' })}>No risky actions</span>`;
  return `<span class="chip plain" tabindex="0"${peekAttr({ h: 'Risks not checked', s: 'Rebuild the pages to check this session.' })}>Risks not checked</span>`;
}

function riskyPanel(s: SessionModel): string {
  const list = s.riskyActions ?? [];
  if (!list.length) return '';
  return `<section class="panel risky-panel" id="risky" aria-labelledby="risky-h"><h2 id="risky-h">Risky actions <span class="muted" style="font-weight:400">${list.length}</span></h2><p class="muted" style="margin:0;font-size:13px">Destructive commands the AI agent ran, newest first. Check them against what you expected.</p><ul class="risk-list">${list.map((a, i) => ({ a, i })).reverse().map(({ a, i }) => { const cp = riskCheckpoint(s, a.at); const c = s.checkpoints[cp]; return `<li id="risk-${i}"${cp >= 0 ? ` data-cp="${cp}"` : ''}><button type="button" class="risk-btn"${c ? ` aria-controls="cp-${cp}"` : ''}><span class="chip risk">${esc(RISKY_LABEL[a.kind])}</span><span class="mono muted">${a.at ? esc(fmtTime(a.at)) : ''}</span><span class="muted risk-in">${c ? `In checkpoint: ${esc(c.title.length > 70 ? c.title.slice(0, 70) + '…' : c.title)}` : ''}</span><code>${esc(a.command)}</code></button></li>`; }).join('')}</ul></section>`;
}

function tapeStrip(s: SessionModel): string {
  return tapeHtml({
    start: s.start, end: s.end, activity: s.activity, unit: 'checkpoint', key: { you: 'Your decisions', agent: 'AI agent on its own', commit: 'Commit', risk: 'Risky action' },
    risks: (s.riskyActions ?? []).map((a, i) => ({ a, i })).filter(({ a }) => a.at).map(({ a, i }) => ({
      at: a.at, href: `#risk-${i}`, label: `${fmtTime(a.at)}, risky action: ${RISKY_LABEL[a.kind]}`,
      peek: { h: RISKY_LABEL[a.kind], s: `${fmtTime(a.at)} · risky action`, q: a.command.length > 140 ? a.command.slice(0, 140) + '…' : a.command, g: 'Click to see it in the list and its checkpoint' },
    })),
    marks: s.checkpoints.map((c, i) => {
      const who = c.who === 'you' ? 'you' : 'agent';
      const what = c.commit ? 'commit' : c.decisions.length ? `${c.decisions.length} decision${c.decisions.length === 1 ? '' : 's'}` : c.tag;
      return {
        at: c.at, who, commit: !!c.commit,
        label: `${fmtTime(c.at)}, ${c.title}, ${what}, ${who === 'you' ? 'you' : 'AI agent'}`,
        cp: i, title: c.title, peek: {
          h: c.title, s: `${fmtTime(c.at)} · checkpoint ${i + 1} of ${s.checkpoints.length} · ${who === 'you' ? 'you' : 'AI agent'}`,
          q: c.decisions[0]?.quote ? (c.decisions[0].quote.length > 140 ? c.decisions[0].quote.slice(0, 140) + '…' : c.decisions[0].quote) : undefined,
          r: [['Decisions', c.decisions.length || undefined], ['Commit', c.commit ? (c.commit.subject === c.title ? c.commit.hash.slice(0, 7) : `${c.commit.hash.slice(0, 7)} ${c.commit.subject}`) : undefined],
            ['Lines', c.commit ? `+${c.commit.added} −${c.commit.removed}` : undefined], ['Files', c.commit?.files.length || undefined],
            ['Model', modelLabel(c.models) || undefined]],
          g: 'Click to open this checkpoint',
        },
      };
    }),
  });
}

/** Notice for a session whose transcript is gone. Pro pages get a two-step Remove button; free pages get the command. */
export function sourceGoneHtml(s: Pick<SessionModel, 'id'>, ctx: Pick<SessionCtx, 'sourceGone' | 'pro'>): { chip: string; notice: string } {
  if (!ctx.sourceGone) {
    const chip = `<span class="chip plain" tabindex="0"${peekAttr({ h: 'Source files intact', s: 'The original transcript is still on disk.' })}>Source files intact</span>`;
    return { chip, notice: '' };
  }
  const why = ctx.sourceGone === 'cleanup' ? 'Claude Code’s cleanup removed the original.' : 'The original was deleted from disk.';
  const chip = `<span class="chip plain gone" tabindex="0"${peekAttr({ h: 'Source removed', s: why, g: 'This copy stays in your archive' })}>Source removed</span>`;
  let action = `<span>To remove it, ask Claude to remove session <code>${esc(s.id)}</code> from Session Replay.</span>`;
  return { chip, notice: `<p class="warnline source-gone" id="source-gone"><span id="source-gone-text">${esc(why)} This copy stays in your archive.</span> ${action}</p>` };
}

/** One line at the top of a detail window when the transcript is gone, so the numbers read as the archived copy. */
export const goneNote = (ctx: Pick<SessionCtx, 'sourceGone'>) => ctx.sourceGone ? '<p class="warnline source-gone">Source removed. This is the archived copy.</p>' : '';


const SESSION_JS = `
(function(){
  var lis=[].slice.call(document.querySelectorAll('.cp-list li')).sort(function(a,b){return a.getAttribute('data-i')-b.getAttribute('data-i');});
  var btns=lis.map(function(li){return li.querySelector('.cp-btn');});
  var details=[].slice.call(document.querySelectorAll('.cp-detail'));
  // Keep the chosen checkpoint visible in the list: scroll the list only, never the page.
  function reveal(b){var box=b&&b.closest('.cp-list');if(!box)return;var bt=b.getBoundingClientRect(),xt=box.getBoundingClientRect();
    if(bt.top<xt.top+8||bt.bottom>xt.bottom-8){var d=(bt.top-xt.top)-(box.clientHeight-b.offsetHeight)/2;box.scrollTo({top:box.scrollTop+d,behavior:Math.abs(d)>box.clientHeight?'auto':'smooth'});}}
  function show(i,scroll){btns.forEach(function(b,j){b.setAttribute('aria-current',String(i===j));});reveal(btns[i]);
    if(window.SRTape)SRTape.select(i);
    details.forEach(function(d,j){d.hidden=j!==i;});
    var d=details[i];if(scroll&&d){var r=d.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight*0.6){if(d.scrollIntoView)d.scrollIntoView({behavior:'smooth',block:'start'});}}}
  window.SRShowCp=function(i){show(i,true);history.replaceState(null,'','#cp-'+i);};
  // Open a risky action: show its checkpoint (page stays put), mark the row, bring it into view and focus it.
  window.SRShowRisk=function(id,focus){var li=document.getElementById(id);if(!li)return;var cp=li.getAttribute('data-cp');
    if(cp!==null&&btns[+cp])show(+cp,false);
    document.querySelectorAll('.risk-list .tape-hit').forEach(function(x){x.classList.remove('tape-hit');});li.classList.add('tape-hit');
    var r=li.getBoundingClientRect();if(r.top<0||r.bottom>window.innerHeight)li.scrollIntoView({behavior:'smooth',block:'center'});
    var b=li.querySelector('.risk-btn');if(b)b.focus({preventScroll:true});history.replaceState(null,'','#'+id);};
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.risk-btn');if(!b)return;var li=b.closest('li');if(li)window.SRShowRisk(li.id);});
  btns.forEach(function(b,i){b.addEventListener('click',function(){show(i,true);history.replaceState(null,'','#cp-'+i);});});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-cp]');if(a){e.preventDefault();show(+a.getAttribute('data-cp'),true);}});
  var si=document.getElementById('cp-search');
  if(si){var idx=buildIndex(lis.map(function(li,i){return {id:i,fields:{title:li.getAttribute('data-hay')}};})),cnt=document.getElementById('cp-count'),total=lis.length;
    si.addEventListener('input',function(){var q=si.value.trim();
      if(!q){lis.forEach(function(li){li.classList.remove('dim');});cnt.textContent=total;return;}
      var hit={},first=-1;search(idx,q,200,{filler:false}).forEach(function(h){hit[h.id]=1;if(first<0||h.id>first)first=h.id;});
      lis.forEach(function(li,i){li.classList.toggle('dim',!hit[i]);});cnt.textContent=Object.keys(hit).length+' of '+total;
      if(first>=0)show(first,false);});}
  var m=location.hash.match(/^#cp-(\\d+)$/);if(m&&btns[+m[1]])show(+m[1],true);
  if(/^#risk-\\d+$/.test(location.hash))window.SRShowRisk(location.hash.slice(1));
  // Decision filters: modal (All/You/AI agent buttons)
  var dflts=document.querySelectorAll('.decision-filters .dfilter');
  dflts.forEach(function(b){b.addEventListener('click',function(){dflts.forEach(function(x){x.classList.remove('on');});b.classList.add('on');var f=b.getAttribute('data-filter');document.querySelectorAll('.decision-list .decision').forEach(function(d){d.style.display=f==='all'||d.getAttribute('data-by')===f?'':'none';});});});
  // Checkpoint-level decision filter (inline panels)
  var cflts=document.querySelectorAll('.cp-dec-filters .dfilter');
  cflts.forEach(function(b){b.addEventListener('click',function(){var ct=b.closest('.cp-detail');cflts.forEach(function(x){x.classList.remove('on');});b.classList.add('on');var f=b.getAttribute('data-filter');ct.querySelectorAll('.decision').forEach(function(d){d.style.display=f==='all'||d.getAttribute('data-by')===f?'':'none';});});});
})();`;

export function renderSession(s: SessionModel, ctx: SessionCtx): string {
  const sourceName = s.agent === 'codex' ? 'Codex' : s.agent === 'copilot' ? 'GitHub Copilot' : 'Claude Code';
  const files = new Set(s.commits.flatMap((c) => c.files));
  const added = s.commits.reduce((a, c) => a + c.added, 0);
  const removed = s.commits.reduce((a, c) => a + c.removed, 0);
  const active = activeMinutes(s.activity ?? []);
  const first = s.tests[0];
  const last = s.tests[s.tests.length - 1];
  const pct = last && last.total ? Math.round((last.passed / last.total) * 100) : undefined;
  const you = s.checkpoints.filter((c) => c.who === 'you').length;
  const youDecisions = s.decisions.filter((d) => d.exact).length;
  const agentDecisions = s.decisions.filter((d) => !d.exact).length;
  const prLabel = s.prs.length ? s.prs.map((p) => `#${p.number}`).join(' ') : 'no PR';
  const editedFileCount = s.commits.length ? files.size : s.editedFiles.length;
  const usageCredits = s.providerUsage?.aiCredits;
  const usageRequests = s.providerUsage?.premiumRequestCost;
  const extraCheckpointCount = s.checkpoints.filter((c) => !c.commit || !s.commits.some((commit) => commit.hash === c.commit!.hash)).length;

  const tiles = [
    tile('code', s.agent === 'codex' && s.linesAdded !== undefined && !s.commits.length ? 'Patch edits' : 'Code changed', s.commits.length
      ? `<span class="big">${files.size}</span><span class="muted">files</span>${plusMinus(added, removed)}`
      : s.linesAdded !== undefined ? `<span class="big">${editedFileCount || '—'}</span><span class="muted">${editedFileCount === 1 ? 'file' : 'files'}</span>${plusMinus(s.linesAdded, s.linesRemoved ?? 0)}` : '<span class="muted">unknown</span>', ctx),
    tile('tests', 'Tests', last
      ? `<span class="big">${n(last.total)}</span><span class="pct ${pctClass(pct ?? 0)}">${pct}%</span>${first && last.total !== first.total ? `<span class="muted">${last.total > first.total ? '+' : ''}${last.total - first.total}</span>` : ''}`
      : '<span class="muted">unknown</span>', ctx, last && pct !== undefined && pct >= 98 ? 'good' : ''),
    tile('decisions', 'Your decisions', `<span class="chip you" title="Questions the AI agent asked that you answered">${youDecisions} asked by AI agent</span><span class="chip said" title="Read from your messages, best-effort">${agentDecisions} from your messages</span>`, ctx),
    tile('commits', 'Commits', `<span class="big">${s.commits.length}</span><span class="muted">· ${esc(prLabel)}</span>${extraCheckpointCount ? `<span class="muted">+ ${extraCheckpointCount} standalone checkpoint${extraCheckpointCount === 1 ? '' : 's'}</span>` : ''}`, ctx),
    tile('cost', usageCredits !== undefined ? 'AI credits' : 'Cost', `<span class="big">${usageCredits !== undefined ? usageCredits.toFixed(2) : s.costUSD !== undefined ? '$' + s.costUSD.toFixed(2) : '—'}</span><span class="muted">${usageCredits !== undefined ? 'credits used' : `${s.userPromptCount} prompts`}</span>${usageRequests !== undefined ? `<span class="muted">${usageRequests} weighted requests</span>` : ''}`, ctx, '', s.models?.length ? `${modelBar(s.models)}<span class="muted" style="font-size:12px">${esc(modelLabel(s.models))}</span>` : ''),
  ].join('');

  const riskIn = risksPerCheckpoint(s);
  const list = s.checkpoints.length
    ? `<ol class="cp-list">${s.checkpoints.map((c, i) => ({ c, i })).reverse().map(({ c, i }) => {
        const who = c.who === 'you' ? 'you' : 'agent';
        const label = c.decisions.length > 1 ? `${c.decisions.length} decisions · ${c.who}` : `${c.tag} · ${c.who}`;
        const hay = [c.title, `${c.decisions.length ? `${c.decisions.length} decision${c.decisions.length === 1 ? '' : 's'} ` : ''}${c.who} ${c.tag}`, c.commit?.subject, ...(c.commit?.files ?? []), ...c.decisions.map((d) => [d.question, d.chosen.join(' '), d.other, d.quote, d.notes].filter(Boolean).join(' '))].filter(Boolean).join(' \n ');
        return `<li data-hay="${esc(hay)}" data-i="${i}"><button type="button" class="cp-btn" aria-current="${i === s.checkpoints.length - 1}" aria-controls="cp-${i}"><span class="cp-time">${esc(fmtTime(c.at))}</span><span><span class="cp-title">${esc(c.title)}</span><span class="cp-sub">${c.commit ? `<span class="mono">${esc(c.commit.hash.slice(0, 7))}</span>` : ''}${riskIn[i] ? `<span class="risk-flag">${riskIn[i]} risky</span>` : ''}<span class="${who}">${label}</span>${c.models?.length ? `<span class="muted">${esc(modelLabel(c.models))}</span>` : ''}</span></span></button></li>`;
      }).join('')}</ol>`
    : '<p class="empty">No commits or decisions recorded.</p>';

  const where = s.agent === 'codex' ? 'Codex'
    : s.agent === 'copilot' ? (s.entrypoint?.includes('vscode') ? 'VS Code' : 'Copilot')
      : s.entrypoint ? (s.entrypoint.includes('vscode') ? 'VS Code' : s.entrypoint.includes('desktop') ? 'Claude desktop' : s.entrypoint === 'cli' ? 'Terminal' : s.entrypoint) : '';
  const meta = [where, s.branch ? `branch ${s.branch}` : '', `${fmtDateTime(s.start)}–${fmtTime(s.end)}`, `${fmtMinutes(active)} active`, s.subagentCount ? `${s.subagentCount} subagents` : '', `session ${s.sourceSessionId ?? s.id.slice(0, 8)}`]
    .filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('');
  const warnings = s.warnings.length
    ? `<details class="fold warn"><summary>${s.warnings.length} note${s.warnings.length > 1 ? 's' : ''} about reading this session</summary><div class="fold-body"><ul>${s.warnings.slice(0, 50).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></details>`
    : '';
  const lede = s.firstPrompt && s.firstPrompt.trim() !== shortTitle(s.title) ? `<p class="lede">${txt(clip(s.firstPrompt, 400), ctx)}</p>` : '';

  const gone = sourceGoneHtml(s, ctx);
  let panels = '';
  const body = `<header class="page-hero session-hero">
<div class="hero-top"><p class="eyebrow"><span class="visually-hidden">AI agent session replay in </span><a href="index.html">${esc(ctx.projectName)}</a></p>${agentChip(sessionFamily(s.agent), sourceName)}<div class="hero-badges">${riskChip(s)}${gone.chip}</div></div>
<h1>${esc(shortTitle(s.title))}</h1>
${lede}
<div class="meta">${meta}</div>
${gone.notice}
${tapeStrip(s)}
</header>
<section class="tiles" aria-label="Session summary">${tiles}</section>
${riskyPanel(s)}
${ctx.pro ? '' : proNote('Detail panels and GitHub links are in Pro.')}
<section class="replay" aria-label="Checkpoints">
  <div class="panel cp-panel"><h2 style="margin:2px 6px 10px;font-size:15px">Checkpoints <span class="muted" style="font-weight:400" id="cp-count">${s.checkpoints.length}</span></h2>${s.checkpoints.length > 1 ? '<input type="search" id="cp-search" class="field" style="width:100%;margin:0 0 8px" placeholder="Search this session…" aria-label="Search checkpoints" autocomplete="off">' : ''}${list}</div>
  <div>${s.checkpoints.map((c, i) => detail(s, c, i, ctx)).join('')}</div>
</section>
${conversation(s, ctx)}
${warnings}
${panels}`;
  let forget = '';
  return page({
    title: `${s.title} · ${ctx.projectName}`, root: '../', nav: 'sessions', pro: ctx.pro, theme: ctx.theme,
    crumbs: [{ label: 'All sessions', href: '../index.html' }, { label: ctx.projectName, href: 'index.html' }, { label: fmtDate(s.start) }],
    body, script: clientBundle(!!ctx.pro) + SESSION_JS + forget,
  });
}
