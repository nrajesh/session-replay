// One stylesheet for every page. Brand language: the cassette logo's blue (#8DBBFF) and amber (#FDE68A)
// on deep navy, Righteous for the wordmark and headings, and one colour per AI agent family.
import { RIGHTEOUS_WOFF2 } from './fonts/righteous.ts';

// Agent colours: Claude orange, ChatGPT/Codex blue, Copilot green, local models yellow. `-ink` is the readable text shade.
// Checked with the dataviz palette validator: light passes every check; dark sits in the colour-blind "legal with labels" band,
// which holds because an agent colour always appears next to its name (pill text, legend, tooltip).
const AG_DARK = `--ag-claude:#F08A50;--ag-claude-ink:#F7B088;--ag-openai:#76ADFF;--ag-openai-ink:#A9CBFF;--ag-copilot:#4FCB86;--ag-copilot-ink:#86DFAA;--ag-local:#F3D45E;--ag-local-ink:#F7E08F;`;
const AG_LIGHT = `--ag-claude:#C2410C;--ag-claude-ink:#9A3412;--ag-openai:#2563EB;--ag-openai-ink:#1D4ED8;--ag-copilot:#15803D;--ag-copilot-ink:#166534;--ag-local:#B88A00;--ag-local-ink:#7A5A00;`;
const DARK = `--bg:#0B0D11;--bar:#0E1116;--surface:#13161C;--surface-2:#191D26;--border:#242934;--border-2:#323946;--border-3:#5A6272;--control:#5F6778;
  --text:#E6E8EC;--text-2:#C3C8D1;--muted:#A3A9B5;--link:#8DBBFF;--link-hover:#B9D5FF;
  --brand-blue:#8DBBFF;--brand-amber:#FDE68A;--brand-amber-ink:#FDE68A;--accent:#FDE68A;--on-accent:#1A1708;--glow-blue:rgba(42,95,208,.16);--glow-amber:rgba(184,137,42,.09);
  --you:#FDE68A;--you-bg:rgba(253,230,138,.13);--you-line:#3D3620;--agent:#8DBBFF;--agent-bg:rgba(141,187,255,.14);--v1:#A78BFA;--v2:#F472B6;--v3:#2DD4BF;--v4:#F87171;--v5:#818CF8;--v0:#5b6270;--on-you:#1A1708;--cloud:#7DD3FC;--cloud-ink:#7DD3FC;--cloud-bg:rgba(125,211,252,.14);--local:#FDE68A;--local-ink:#FDE68A;--local-bg:rgba(253,230,138,.14);
  ${AG_DARK}
  --pr:#D4A373;--pr-ink:#E2BC92;--ok:#6BD69A;--ok-bg:rgba(107,214,154,.14);--warn:#F5B26B;--bad:#FF8F8F;--bad-bg:rgba(255,143,143,.14);
  --quote:#F0E8CF;--mark:#5A4A1A;--shadow:0 24px 80px rgba(0,0,0,.55);--shadow-card:0 10px 28px rgba(0,0,0,.2);--scrim:rgba(7,8,11,.72);color-scheme:dark;`;
const LIGHT = `--bg:#F5F6F9;--bar:#FFFFFF;--surface:#FFFFFF;--surface-2:#EEF1F6;--border:#E1E4EA;--border-2:#CBD0D8;--border-3:#8A919E;--control:#8A919E;
  --text:#16181D;--text-2:#2F3440;--muted:#596170;--link:#1F5FCC;--link-hover:#163F88;
  --brand-blue:#3B7BE8;--brand-amber:#F5C542;--brand-amber-ink:#8F5B00;--accent:#F5C542;--on-accent:#1A1708;--glow-blue:rgba(59,123,232,.08);--glow-amber:rgba(245,197,66,.08);
  --you:#8A5A00;--you-bg:rgba(234,179,8,.15);--you-line:#EADFB0;--agent:#1F5FCC;--agent-bg:rgba(31,95,204,.10);--v1:#7C3AED;--v2:#DB2777;--v3:#0D9488;--v4:#DC2626;--v5:#4F46E5;--v0:#a7adb8;--on-you:#fff;--cloud:#0891B2;--cloud-ink:#0E6A85;--cloud-bg:rgba(56,189,248,.16);--local:#B88A00;--local-ink:#7A5A00;--local-bg:rgba(234,179,8,.16);
  ${AG_LIGHT}
  --pr:#A0673A;--pr-ink:#7A4A22;--ok:#1C7C47;--ok-bg:rgba(28,124,71,.10);--warn:#9A5200;--bad:#B42318;--bad-bg:rgba(180,35,24,.10);
  --quote:#3D2B12;--mark:#FFE58A;--shadow:0 24px 60px rgba(20,24,32,.18);--shadow-card:0 10px 28px rgba(20,24,32,.07);--scrim:rgba(20,24,32,.45);color-scheme:light;`;

export const CSS = `
@font-face{font-family:'Righteous';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${RIGHTEOUS_WOFF2}) format('woff2')}
:root{${LIGHT}--radius-card:14px;--radius-control:9px;--mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;--sans:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--display:'Righteous',var(--sans)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
body{min-height:100vh;background:radial-gradient(1100px 620px at -8% -18%,var(--glow-blue),transparent 62%),radial-gradient(900px 560px at 108% 112%,var(--glow-amber),transparent 60%),var(--bg);background-attachment:fixed}
html{scrollbar-gutter:stable}
html:focus-within{scroll-behavior:smooth}
button,input,select,textarea{font:inherit;color:inherit}
button,a,input,select,summary,label{touch-action:manipulation}
h1,h2,h3{text-wrap:balance}p,li,.lede,.page-intro{text-wrap:pretty}
.skip-link{position:absolute;left:12px;top:-60px;z-index:100;padding:10px 14px;border-radius:var(--radius-control);background:var(--accent);color:var(--on-accent);font-weight:600;text-decoration:none}.skip-link:focus-visible{top:12px}#main:focus:not(:focus-visible){outline:none}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--link);outline-offset:2px}
/* backwards, not both: a lingering transform on .wrap makes Chromium mis-paint the sticky checkpoint panel. */
.wrap{animation:page-enter .24s ease-out backwards}
@keyframes page-enter{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
a{color:var(--link)}a:hover{color:var(--link-hover)}
mark{background:var(--mark);color:inherit;border-radius:2px}
.mono,code,pre{font-family:var(--mono)}
.muted{color:var(--muted)}
.plus{color:var(--ok);font-family:var(--mono);font-size:12px}.minus{color:var(--bad);font-family:var(--mono);font-size:12px}
.topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:12px 32px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bar) 90%,transparent);backdrop-filter:blur(16px)}
.brand{display:inline-flex;align-items:center;gap:10px;color:var(--text);text-decoration:none}
.brand .logo{flex:none;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--brand-blue) 30%,transparent));transition:transform .2s ease}
.brand:hover .logo{transform:rotate(-4deg) scale(1.04)}
.wordmark{font:400 19px/1 var(--display);letter-spacing:-.005em;white-space:nowrap}.wordmark b{font-weight:400;color:var(--brand-amber-ink)}
h1,h2,.big,.stat4 .v,.project-card-heading strong,.project-glyph{font-family:var(--display);font-weight:400;font-synthesis:none;letter-spacing:.003em}
.nav{display:flex;gap:4px;flex-wrap:wrap}
.nav a{padding:6px 12px;border-radius:999px;color:var(--muted);text-decoration:none}
.nav a{transition:background-color .16s ease,color .16s ease}
.nav a[aria-current="page"]{background:color-mix(in srgb,var(--brand-blue) 14%,transparent);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--brand-blue) 32%,transparent)}
.nav a:hover{color:var(--text)}
.top-actions{margin-left:auto;display:flex;gap:8px;align-items:center}
.quick-open{gap:9px;color:var(--muted)}
.quick-open>span:first-child{font-size:20px;line-height:1}
kbd{display:inline-flex;align-items:center;justify-content:center;min-height:20px;padding:0 6px;border:1px solid var(--border-2);border-radius:5px;background:var(--surface);color:var(--muted);font:11px/1 var(--mono);white-space:nowrap}
.btn{min-height:36px;padding:0 14px;border-radius:var(--radius-control);border:1px solid var(--border-2);background:var(--surface-2);color:var(--text);font:inherit;font-weight:500;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:transform .15s ease,border-color .15s ease,background-color .15s ease,color .15s ease,box-shadow .2s ease}
.btn:hover{border-color:var(--link);color:var(--link-hover);transform:translateY(-1px);box-shadow:0 3px 12px rgba(0,0,0,.18)}
.btn:active{transform:translateY(0) scale(.98)}
.btn:focus-visible{outline:2px solid var(--link);outline-offset:2px}
.btn.sm{min-height:24px;padding:2px 9px;border-radius:6px;font-size:12px}
.btn.sm:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 2px 8px rgba(0,0,0,.15)}
.btn.pr:hover{border-color:var(--ok);color:var(--ok)}
.btn.issue:hover{border-color:var(--you);color:var(--you)}
.btn.icon{width:36px;padding:0;justify-content:center}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}
.btn.primary:hover{filter:brightness(1.05);border-color:var(--accent);color:var(--on-accent);box-shadow:0 4px 16px color-mix(in srgb,var(--accent) 40%,transparent)}
.pr-list{list-style:none;margin:4px 0 12px;padding:0;display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px}
.pro{display:inline-block;padding:0 7px;border:1px solid var(--border-3);border-radius:999px;font-size:12px;color:var(--muted);font-weight:500;vertical-align:middle;line-height:16px}
.wrap{max-width:1440px;margin:0 auto;padding:28px 40px 72px}
@media (max-width:700px){.wrap{padding:18px 16px 48px}.topbar{padding:10px 16px;gap:8px}.quick-open{width:36px;padding:0;justify-content:center}.quick-open-label,.quick-open kbd{display:none}}
.crumbs{color:var(--muted);font-size:13px}
.crumbs a{color:var(--link)}
.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:6px 0 24px}
.page-heading h1{margin:0}
.eyebrow{margin:0 0 6px;color:var(--brand-amber-ink);font:600 14px/1.4 var(--sans)}
.eyebrow a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}.eyebrow a:hover{color:var(--text)}
.page-intro{margin:7px 0 0;color:var(--muted);font-size:14px}
.heading-count{display:inline-flex;align-items:center;gap:9px;padding:6px 13px 6px 8px;border:1px solid color-mix(in srgb,var(--brand-blue) 40%,var(--border));border-radius:999px;background:color-mix(in srgb,var(--brand-blue) 9%,var(--surface));color:var(--text-2);font-size:12px;font-weight:600;white-space:nowrap}
.heading-count:not(:has(.ag-stack)){padding-left:13px}
.page-hero{margin:8px 0 20px;padding:22px 24px;border-radius:var(--radius-card);background:linear-gradient(125deg,color-mix(in srgb,var(--surface) 92%,var(--brand-blue) 8%),var(--surface) 55%,color-mix(in srgb,var(--surface) 95%,var(--brand-amber) 5%)) padding-box,linear-gradient(135deg,color-mix(in srgb,var(--brand-blue) 60%,var(--border)),var(--border) 42%,var(--border) 58%,color-mix(in srgb,var(--brand-amber) 60%,var(--border))) border-box;box-shadow:var(--shadow-card)}
.hero-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin:0 0 6px}.hero-top .eyebrow{margin:0}
.session-hero .hero-top{display:grid;grid-template-columns:1fr auto 1fr}.hero-badges{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
@media(max-width:700px){.session-hero .hero-top{grid-template-columns:1fr auto}.hero-badges{grid-column:1/-1;justify-content:flex-start}}
.page-hero h1{margin:0;max-width:1100px}
.page-hero .meta{margin-top:10px}
.page-hero .lede{margin-top:10px}
h1{margin:6px 0 6px;font-size:28px;line-height:1.2;max-width:1000px}
.page-hero h1{font-size:25px;line-height:1.25}
h2{font-size:19px;margin:28px 0 12px}
h3{font-size:14px;margin:0 0 8px}
.meta{display:flex;flex-wrap:wrap;gap:4px 20px;color:var(--muted);font-size:13px;margin-top:10px}
.lede{color:var(--muted);margin:0;max-width:78ch;white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word}
.tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:20px 0 24px}
@media (max-width:1100px){.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:560px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tile{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:inherit;text-align:left;font:inherit;min-width:0;overflow-wrap:break-word;word-break:break-word}
button.tile{cursor:pointer}button.tile:hover{border-color:var(--border-3)}
.tile.good{border-color:var(--ok);background:var(--ok-bg)}
.tile-label{color:var(--muted);font-size:13px}
.tile-value{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;overflow-wrap:break-word;word-break:break-word}
.big{font-size:23px}
.pct{padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600}
.pct.good{background:var(--ok-bg);color:var(--ok)}.pct.warn{background:var(--you-bg);color:var(--warn)}.pct.bad{background:var(--bad-bg);color:var(--bad)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.dot.good{background:var(--ok)}.dot.warn{background:var(--warn)}.dot.bad{background:var(--bad)}.dot.none{background:var(--border-3)}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;font-size:12.5px;line-height:18px;font-weight:500;white-space:nowrap;border:1px solid transparent}
.chip.you{color:var(--you);background:var(--you-bg)}.chip.said{color:var(--you);background:transparent;border-color:color-mix(in srgb,var(--you) 55%,transparent);border-style:dashed}.chip.agent{color:var(--agent);background:var(--agent-bg)}
.rank .chip.risk+.muted{margin-left:8px}
.chip.risk{color:var(--bad);background:var(--bad-bg);border-color:color-mix(in srgb,var(--bad) 45%,transparent);text-decoration:none}a.chip.risk:hover{background:var(--bad);color:#fff}
.risky-panel h2{margin:0 0 4px;font-size:16px}.risk-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}.risk-list li{border:1px solid var(--border);border-radius:8px;background:var(--surface)}.risk-list li:target,.risk-list li.tape-hit{outline:2px solid var(--bad)}.risk-btn{display:grid;grid-template-columns:auto auto 1fr;gap:4px 12px;align-items:baseline;width:100%;padding:8px 10px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}.risk-btn:hover{background:var(--surface-2)}.risk-btn:focus-visible{outline:2px solid var(--link);outline-offset:-2px}.risk-in{font-size:13px;overflow-wrap:anywhere}.risk-list code{grid-column:1/-1;overflow-wrap:anywhere;font:13px/1.45 var(--mono);color:var(--text)}
.cp-sub .risk-flag{color:var(--bad);font-weight:600}
.chip.ok{color:var(--ok);background:var(--ok-bg)}.chip.plain{color:var(--muted);border-color:var(--border-3)}.chip.cloud{color:var(--cloud-ink);background:var(--cloud-bg);border-color:var(--cloud)}.chip.local{color:var(--local-ink);background:var(--local-bg);border-color:var(--local)}
.replay{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:900px){.replay{grid-template-columns:1fr}}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;min-width:0;overflow-wrap:break-word;word-break:break-word}
.cp-panel{position:sticky;top:12px}
@media (max-width:900px){.cp-panel{position:static}}
.cp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 120px);overflow:auto}
.cp-btn{width:100%;text-align:left;display:grid;grid-template-columns:44px 1fr;gap:8px;padding:10px;border-radius:8px;border:1px solid transparent;background:none;color:inherit;font:inherit;cursor:pointer}
.cp-btn:hover{background:var(--surface-2)}
.cp-btn[aria-current="true"]{background:color-mix(in srgb,var(--brand-blue) 14%,transparent);border-color:color-mix(in srgb,var(--brand-blue) 55%,transparent);box-shadow:inset 3px 0 0 var(--brand-blue)}
.cp-time{font-family:var(--mono);color:var(--muted);font-size:12px;padding-top:1px}
.cp-title{display:block;font-weight:500;overflow-wrap:anywhere}
.cp-sub{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;align-items:center;font-size:12px;color:var(--muted)}
.cp-sub .you{color:var(--you)}.cp-sub .agent{color:var(--agent)}
.cp-detail{padding:20px;scroll-margin-top:12px;overflow-wrap:break-word;word-break:break-word}
.cp-detail[hidden]{display:none}
.cp-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--muted);font-size:12px}
.cp-detail h2{margin:6px 0 4px;font-size:20px}
.decision{border:1px solid var(--border);border-radius:10px;padding:14px;margin:12px 0;overflow-wrap:break-word;word-break:break-word}
.decision.exact{border-color:var(--you-line);background:color-mix(in srgb,var(--you) 6%,transparent)}
.decision .q{font-weight:500;margin:8px 0 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.decision-filters{display:flex;gap:6px;margin:8px 0 12px;padding:0 4px;flex-wrap:wrap}
.dfilter{padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px;font-family:var(--sans);transition:background .15s,border-color .15s,color .15s}
.dfilter.on,.dfilter:hover{background:var(--surface-2);color:var(--text);border-color:var(--border-2)}
.dfilter.on{background:color-mix(in srgb,var(--you) 15%,transparent);color:var(--text);border-color:var(--you);font-weight:600;box-shadow:0 0 0 1px var(--you)}
.options{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:0;padding:0;list-style:none;overflow-wrap:break-word;word-break:break-word}
.option{padding:10px 12px;border-radius:8px;border:1px solid var(--border-2);overflow-wrap:break-word;word-break:break-word}
.option.chosen{border-color:var(--you);background:var(--you-bg)}
.option .desc{display:block;color:var(--muted);font-size:12px;margin-top:2px;overflow-wrap:break-word;word-break:break-word}
.option .tag{display:block;font-size:12px;margin-top:2px}
.option .tag.rec{color:var(--agent)}.option .tag.ch{color:var(--you)}
blockquote{margin:10px 0 0;padding-left:12px;border-left:3px solid var(--you);color:var(--quote);white-space:pre-wrap;overflow-wrap:anywhere}
.mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0;overflow-wrap:break-word;word-break:break-word}
@media (max-width:600px){.mini{grid-template-columns:1fr}}
.files{margin:0;padding:0;list-style:none;font-family:var(--mono);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}
.files li{overflow-wrap:anywhere}
details.fold{margin-top:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
details.fold>summary{padding:14px 16px;font-weight:600;cursor:pointer}
details.fold.warn>summary{font-weight:500;color:var(--muted);font-size:13px;padding:10px 16px}
.fold-body{max-height:70vh;overflow:auto;border-top:1px solid var(--border);padding:0 16px}
details.warn .fold-body{max-height:40vh}
.turn{display:grid;grid-template-columns:52px 84px 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--border)}
.turn:first-child{border-top:0}
@media (max-width:640px){.turn{grid-template-columns:1fr}}
.turn .who{font-size:12px;font-weight:600;min-width:0;overflow-wrap:anywhere}
.turn.user .who{color:var(--you)}.turn.assistant .who{color:var(--agent)}.turn.tool .who{color:var(--muted)}
.turn .body{white-space:pre-wrap;overflow-wrap:break-word;min-width:0;max-width:90ch;line-height:1.6}
.turn.tool .body{font-family:var(--mono);font-size:12px;color:var(--muted);max-height:240px;overflow:auto}
dialog{border:1px solid var(--border-2);border-radius:16px;background:var(--surface);color:var(--text);padding:0;width:min(820px,calc(100vw - 32px));max-height:calc(100vh - 64px);box-shadow:var(--shadow)}
dialog::backdrop{background:var(--scrim);backdrop-filter:blur(2px)}
dialog,.command-menu ul,.tag-options{overscroll-behavior:contain}
.command-menu{position:fixed;inset:12vh 0 auto;width:min(600px,calc(100vw - 28px));max-height:min(76vh,680px);padding:12px;border-color:var(--border-2);border-radius:18px}
.command-menu[open]{animation:menu-enter .16s ease-out both}
@keyframes menu-enter{from{opacity:0;transform:translateY(-6px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
.command-menu h2{margin:4px 8px 12px;font-size:14px;color:var(--muted)}
.command-menu>input{width:100%;height:48px;padding:0 14px;border:1px solid var(--control);border-radius:11px;outline:none;background:var(--bg);color:var(--text);font:inherit;font-size:15px}
.command-menu>input:focus{border-color:var(--link);box-shadow:0 0 0 3px color-mix(in srgb,var(--link) 14%,transparent)}
.command-menu ul{display:flex;flex-direction:column;gap:3px;max-height:calc(76vh - 130px);overflow:auto;margin:10px 0 0;padding:0;list-style:none}
.command-menu li>a,.command-menu li>button{display:flex;width:100%;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text);text-align:left;text-decoration:none;font:inherit;cursor:pointer}
.command-menu li>a:hover,.command-menu li>button:hover,.command-menu li>a:focus-visible,.command-menu li>button:focus-visible{border-color:var(--border);background:var(--surface-2);outline:none}
.command-menu [data-command][hidden]{display:none}
.command-hint{color:var(--muted);font-size:13px}
.command-hint kbd{float:right}
.command-status{margin:8px 8px 2px;color:var(--muted);font-size:12px}
.m-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface)}
.m-head h2{margin:0;font-size:20px;flex:1}
.m-body{padding:18px 22px 22px;line-height:1.55}
.bars{display:flex;gap:3px;align-items:flex-end;height:90px;padding:6px 0;border-bottom:1px solid var(--border)}
.bars span{flex:1;min-width:3px;border-radius:2px;background:var(--ok)}
.bars span.fail{background:var(--warn)}
table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.5}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--border);vertical-align:top;overflow-wrap:break-word}
th{position:sticky;top:0;background:var(--surface-2);color:var(--text-2);font-size:13px;font-weight:600;white-space:nowrap}
tbody tr{transition:background-color .12s ease}tbody tr:hover{background:color-mix(in srgb,var(--brand-blue) 5%,transparent)}
td.num,td .mono,td .model-name{white-space:nowrap}
th button{all:unset;cursor:pointer;display:inline-flex;gap:4px;align-items:center}
th button:focus-visible{outline:2px solid var(--link);outline-offset:2px}
th[aria-sort="ascending"] button::after{content:"▲";font-size:10px}
th[aria-sort="descending"] button::after{content:"▼";font-size:10px}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
td .dt{display:flex;flex-direction:column;white-space:nowrap;font-variant-numeric:tabular-nums}td .dt .muted{font-size:13px}
td .plus,td .minus{font-family:inherit;font-size:13px;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:none}
td .sub{margin-top:4px;color:var(--muted);font-size:13px;line-height:1.6}
.table-scroll{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
.project-browser{display:flex;align-items:center;gap:14px;margin:0 0 16px}
.project-search{display:flex;align-items:center;gap:10px;width:min(100%,520px);min-height:44px;padding:0 12px;border:1px solid var(--control);border-radius:var(--radius-control);background:var(--surface);color:var(--muted);transition:border-color .15s,box-shadow .15s}
.project-search:focus-within{border-color:var(--link);box-shadow:0 0 0 3px color-mix(in srgb,var(--link) 14%,transparent)}
.project-search>span:first-child{font-size:20px;line-height:1}
.project-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font:inherit}
.project-search input::placeholder{color:var(--muted)}
.project-browser>p{margin:0;font-size:12px}
.project-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
.project-card{display:flex;flex-direction:column;gap:20px;min-width:0;padding:18px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);color:inherit;text-decoration:none;box-shadow:var(--shadow-card);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.project-card:hover{transform:translateY(-3px);border-color:var(--border-3);box-shadow:0 16px 36px color-mix(in srgb,var(--text) 12%,transparent)}
.project-card:focus-visible{outline:2px solid var(--link);outline-offset:3px}
.project-card[hidden]{display:none}
.project-card-top{display:flex;align-items:center;gap:12px}
.project-glyph{display:grid;place-items:center;flex:0 0 40px;height:40px;border:1.5px solid transparent;border-radius:12px;background:linear-gradient(145deg,#22355C,#0E1320) padding-box,linear-gradient(135deg,#8DBBFF,#FDE68A) border-box;color:#FDE68A;font-size:19px;box-shadow:0 0 14px color-mix(in srgb,#8DBBFF 22%,transparent)}
.project-agents{display:inline-flex;align-items:center;gap:8px}
.project-card-heading{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}
.project-card-heading strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
.project-card-heading .muted{font-size:12px}
.project-arrow{color:var(--muted);transition:transform .18s ease}
.project-card:hover .project-arrow{transform:translate(2px,-2px);color:var(--link)}
.project-card-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:13px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.project-card-stats>span{display:flex;flex-direction:column;gap:3px;min-width:0}
.project-card-stats strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;font-variant-numeric:tabular-nums}
.project-card-stats small{color:var(--muted);font-size:12px}
.project-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}
.project-health{display:inline-flex;align-items:center;color:var(--muted);font-size:12px}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0 12px}
.field{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 10px;border:1px solid var(--control);border-radius:8px;background:var(--surface);color:var(--text)}
.field:focus-within,.jump:focus-within{border-color:var(--link);box-shadow:0 0 0 3px color-mix(in srgb,var(--link) 16%,transparent)}
select{background-color:var(--surface);color:var(--text)}
.field select,.field input{background:none;border:0;color:var(--text);font:inherit;min-height:34px;outline:none}
.field .lbl{color:var(--muted);font-size:13px}
.jump{display:inline-flex;align-items:stretch;border:1px solid var(--control);border-radius:8px;background:var(--surface);overflow:hidden}
.jump>*{border:0;border-right:1px solid var(--border-2);background:none;color:var(--text);font:inherit;padding:0 10px;min-height:36px}
.jump>*:last-child{border-right:0}
.jump button{cursor:pointer;transition:background-color .15s ease,color .15s ease}
.jump button[aria-pressed="true"]{background:color-mix(in srgb,var(--brand-blue) 34%,var(--surface));color:var(--text);font-weight:700;box-shadow:inset 0 -3px 0 var(--link)}
.jump button:disabled{opacity:.4;cursor:not-allowed}.jump button:disabled:hover{background:none;color:inherit}
.jump button.is-off{opacity:.55;cursor:not-allowed}.jump button.is-off:hover{background:none;color:inherit}
.jump button:hover{background:var(--surface-2);color:var(--link)}
.ask{border:1px solid var(--border-2);border-radius:14px;background:var(--surface);padding:16px}
.ask-row{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 6px 0 14px;border:1px solid var(--control);border-radius:10px;background:var(--bg)}
.ask-row input{flex:1;background:none;border:0;color:var(--text);font:inherit;font-size:15px;outline:none;min-width:0}
.ask-hints{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:12px;align-items:center}
.ask-hints button{padding:4px 10px;border:1px solid var(--border-2);border-radius:999px;background:none;color:var(--text-2);font:inherit;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease,transform .15s ease}
.ask-hints button:hover{background:var(--surface-2);border-color:var(--link);color:var(--link);transform:translateY(-1px)}
.ask-note{margin:10px 0 0;color:var(--muted);font-size:12px;overflow-wrap:break-word;word-break:break-word}
.answer{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;white-space:pre-wrap;overflow-wrap:anywhere}
.strip{border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:14px 16px;margin-bottom:16px}
.strip-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;color:var(--muted);font-size:12px;margin-bottom:8px}
.dayview{border:1px solid var(--you-line);border-radius:12px;background:color-mix(in srgb,var(--you) 5%,transparent);padding:14px 16px;margin-bottom:16px}
.dayview[hidden]{display:none}
.dayview-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dayview-head h2{margin:0;font-size:16px;flex:1}
.day-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px}
.day-list li{display:grid;grid-template-columns:52px 120px 1fr;gap:8px;overflow-wrap:break-word;word-break:break-word}
@media (max-width:640px){.day-list li{grid-template-columns:52px 1fr}.day-list .proj{display:none}}
.pager{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px;color:var(--muted);font-size:13px}
.pager select{min-height:32px;padding:0 6px;background:var(--surface);border:1px solid var(--control);border-radius:6px;color:var(--text);font:inherit}
.months{display:grid;grid-template-columns:120px minmax(0,1fr);border-top:1px solid var(--border);overflow-wrap:break-word;word-break:break-word}
.months>div{padding:12px 0;border-bottom:1px solid var(--border);overflow-wrap:break-word;word-break:break-word}
@media (max-width:640px){.months{grid-template-columns:1fr}}
.cards{display:flex;flex-wrap:wrap;gap:8px}
.card{display:block;min-width:220px;max-width:340px;padding:10px 12px;border-radius:10px;color:inherit;text-decoration:none;border:1px solid var(--border-2)}
.card.k-pr{border-color:color-mix(in srgb,var(--pr) 45%,var(--border));background:color-mix(in srgb,var(--pr) 12%,transparent)}
.card.k-tag,.card.k-version{border-color:color-mix(in srgb,var(--ok) 40%,var(--border));background:var(--ok-bg)}
.card.k-cloud{border-style:dashed;border-color:var(--cloud)}
.card .when{font-size:12px}.card .when a{color:inherit}.card-main{display:block;color:inherit;text-decoration:none}.card-main:hover .what,a.card:hover .what{text-decoration:underline}.card.k-pr .when{color:var(--pr-ink)}.card.k-cloud .when{color:var(--cloud-ink)}.card.k-tag .when,.card.k-version .when{color:var(--ok)}
.card .what{font-weight:600;overflow-wrap:break-word;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card .sub{color:var(--muted);font-size:12px;overflow-wrap:break-word;word-break:break-word}
.stats4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:20px}
@media (max-width:900px){.stats4{grid-template-columns:repeat(2,minmax(0,1fr))}}
.stat4{padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow-wrap:break-word;word-break:break-word}
.stat4 .v{font-size:26px;overflow-wrap:break-word;word-break:break-word}
.usage-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px}
.usage-grid>.panel{display:flex;flex-direction:column}
.gh-row{display:flex;flex-wrap:wrap;gap:10px}
@media (max-width:900px){.usage-grid{grid-template-columns:1fr}}
.chart{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:14px;align-items:end;height:260px;border-bottom:1px solid var(--border-2);padding:0 8px}
.chart .col{display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.chart .col .lab{text-align:center;font-size:12px;color:var(--muted);overflow-wrap:break-word;word-break:break-word}
.chart .col span.seg:first-of-type{border-radius:4px 4px 0 0}
.chart-axis{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:14px;padding:6px 8px 0;color:var(--muted);font-size:12px;text-align:center;overflow-wrap:break-word;word-break:break-word}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--muted);overflow-wrap:break-word;word-break:break-word}
.mbar{display:flex;gap:2px;height:6px;margin-top:6px;border-radius:3px;overflow:hidden}.mbar span{display:block;min-width:2px;overflow-wrap:break-word;word-break:break-word}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle;overflow-wrap:break-word;word-break:break-word}
.hbar{height:6px;border-radius:3px;background:var(--border);margin-top:4px;overflow-wrap:break-word;word-break:break-word}
.hbar span{display:block;height:6px;border-radius:3px;overflow-wrap:break-word;word-break:break-word}
.locked{border:1px dashed var(--border-3);border-radius:12px;padding:20px;color:var(--muted);overflow-wrap:break-word;word-break:break-word}
.empty{color:var(--muted);padding:16px;text-align:center;overflow-wrap:break-word;word-break:break-word}
.warnline{color:var(--muted);font-size:13px;overflow-wrap:break-word;word-break:break-word}
.pro-note{margin:8px 0;color:var(--muted);font-size:13px}.pro-note a{color:var(--brand-amber-ink);font-weight:600;text-underline-offset:3px}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media print{
  :root{${LIGHT}}
  .topbar .top-actions,.pager,.toolbar,.ask,.strip,.no-print{display:none!important}
  .wrap{padding:0;max-width:none}
  .table-scroll,.fold-body,.turn.tool .body,.cp-list{overflow:visible;max-height:none}
  .cp-panel{position:static}
  th{position:static}
  .replay,.usage-grid{grid-template-columns:1fr}
  a{color:inherit;text-decoration:none}
  .panel,.decision,.tile,tr,.card{break-inside:avoid}
}
.cp-list li.dim{opacity:.38}
.sw.local{background:var(--local)}.sw.cloud{background:var(--cloud)}
.kdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}.kdot.local{background:var(--ag,var(--local))}.kdot.cloud{background:var(--cloud)}
/* Agent colour code, shared by every page: a family class sets --ag (dot/fill) and --ag-ink (text). */
.ag-claude{--ag:var(--ag-claude);--ag-ink:var(--ag-claude-ink)}.ag-openai{--ag:var(--ag-openai);--ag-ink:var(--ag-openai-ink)}.ag-copilot{--ag:var(--ag-copilot);--ag-ink:var(--ag-copilot-ink)}.ag-local{--ag:var(--ag-local);--ag-ink:var(--ag-local-ink)}
.agent{display:inline-flex;align-items:center;gap:6px;padding:2px 9px 2px 7px;border:1px solid color-mix(in srgb,var(--ag) 42%,transparent);border-radius:999px;background:color-mix(in srgb,var(--ag) 12%,transparent);color:var(--ag-ink);font-size:12.5px;font-weight:600;line-height:18px;white-space:nowrap;vertical-align:middle}
.agent i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ag);box-shadow:0 0 0 2px color-mix(in srgb,var(--ag) 22%,transparent)}
.ag-stack{display:inline-flex;align-items:center;vertical-align:middle}.ag-stack i{width:14px;height:14px;border-radius:50%;background:var(--ag);border:2px solid var(--surface);margin-left:-6px}.ag-stack i:first-child{margin-left:0}
.heading-count .ag-stack i{border-color:color-mix(in srgb,var(--brand-blue) 9%,var(--surface))}
.agent-key{display:flex;flex-wrap:wrap;gap:6px}
.range{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;margin:0 0 10px}
.failing{margin:4px 0 0;padding-left:18px;font-size:12px;color:var(--muted)}
.answer ul{margin:6px 0;padding-left:20px}.answer p{margin:6px 0}.answer code{font-family:var(--mono);font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;overflow-wrap:break-word;word-break:break-word}.chips:empty{display:none}.chips .chip button{border:0;background:none;color:inherit;cursor:pointer;padding:0 0 0 4px}
.mention{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;background:var(--surface);margin-top:4px;overflow:hidden}
.mention[hidden]{display:none}.mention button{text-align:left;border:0;background:none;color:inherit;font:inherit;padding:8px 12px;cursor:pointer;overflow-wrap:break-word;word-break:break-word}.mention button:hover{background:var(--surface-2)}
.stat4{display:block;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer}.stat4:hover,.stat4:focus-visible{border-color:var(--border-2);background:var(--surface-2)}
.mini-bars{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:3px;align-items:end;height:60px;border-bottom:1px solid var(--border-2)}
.mini-bars span{background:var(--border-2);border-radius:2px 2px 0 0;overflow-wrap:break-word;word-break:break-word}.mini-bars span.peak{background:var(--you)}
.mini-axis{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:3px;font-size:12px;color:var(--muted);text-align:center;padding-top:3px;overflow-wrap:break-word;word-break:break-word}.mini-axis.hours{display:flex;justify-content:space-between}
.toggles{display:inline-flex;gap:6px}
.toggle{min-height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--border-2);background:none;color:var(--muted);font:inherit;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;overflow-wrap:break-word;word-break:break-word}
.toggle::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--border-2)}
.toggle .n{font-size:12px;opacity:.8}
.toggle.local[aria-pressed="true"]{color:var(--local-ink);background:var(--local-bg);border-color:var(--local)}.toggle.local[aria-pressed="true"]::before{background:var(--local)}
.toggle.cloud[aria-pressed="true"]{color:var(--cloud-ink);background:var(--cloud-bg);border-color:var(--cloud)}.toggle.cloud[aria-pressed="true"]::before{background:var(--cloud)}
.toggle:disabled{opacity:.45;cursor:default}
.fold.shipped{margin:12px 0;overflow-wrap:break-word;word-break:break-word}
.notes{margin:12px 0 0;padding-left:18px;color:var(--muted);font-size:13px;display:flex;flex-direction:column;gap:2px}
.chart .col{cursor:pointer}.chart .col.dim,.hbar-row.dim{opacity:.35}.chart .seg{cursor:pointer}
.hbar-row{cursor:pointer}.filterbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px;min-height:36px}
.mini-bars span.peak{background:var(--you)}
.proj-toggles{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.toggle.proj[aria-pressed="true"]{color:var(--text);border-color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.toggle.proj[aria-pressed="true"]::before{background:var(--c)}
.vz-plot{position:relative;height:240px;margin-left:46px}
.usage-chart-panel{width:100%}
.usage-chart-panel>.vz{display:flex;flex:1;flex-direction:column;min-height:320px}
.usage-chart-panel>.vz .vz-plot{flex:1;height:auto;min-height:260px}
.vz-grid{position:absolute;left:0;right:0;border-top:1px solid var(--border);height:0}
.vz-grid span{position:absolute;left:-46px;width:40px;text-align:right;top:-9px;font-size:12px;color:var(--muted);white-space:nowrap;word-break:normal;overflow:visible}
.vz-grid:first-child{border-top-color:var(--border-2)}
.vz-bars{position:absolute;inset:0;display:grid}
.vz-col{display:flex;align-items:flex-end;justify-content:center;height:100%;border-radius:4px}
.vz-col:focus-visible{outline:2px solid var(--link);outline-offset:-2px}
.vz-col:hover,.vz-col:focus-visible{background:color-mix(in srgb,var(--text) 6%,transparent)}
.vz-stack{width:min(24px,70%);display:flex;flex-direction:column-reverse;gap:2px}
.vz-seg{display:block;min-height:2px}
.vz-stack>.vz-seg:last-child{border-radius:4px 4px 0 0}
.vz-peak{position:absolute;transform:translate(-50%,-4px);font-size:12px;color:var(--text-2);pointer-events:none;margin-bottom:2px;white-space:nowrap;overflow-wrap:normal;word-break:normal}
.vz-x{display:grid;margin:6px 0 0 46px;font-size:12px;color:var(--muted);text-align:center}
.vz-x span{white-space:nowrap;overflow:visible}
.vz-tip{position:fixed;z-index:50;min-width:170px;padding:10px 12px;border:1px solid var(--border-2);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow);font-size:13px;line-height:1.5;pointer-events:none;overflow-wrap:break-word;word-break:break-word}
.vz-tip[hidden]{display:none}.vz-tip .t-h{color:var(--muted)}.vz-tip .t-tot{font-size:15px;font-weight:600;margin:2px 0 6px}
.vz-tip .t-r{display:flex;align-items:center;gap:6px;overflow-wrap:break-word;word-break:break-word}.vz-tip .t-r .muted{margin-left:auto;padding-left:12px}
.by-project li.dim{opacity:.45}.toggle.proj[aria-pressed="false"]{opacity:.6;border-style:dashed}
.by-project li{overflow-wrap:break-word;word-break:break-word}
.strip .vz-plot{height:120px}.strip-title{color:var(--text-2);font-weight:600;overflow-wrap:break-word;word-break:break-word}.strip-note{margin:8px 0 0;color:var(--muted);font-size:12px;overflow-wrap:break-word;word-break:break-word}
button.vz-col{border:0;padding:0;background:none;color:inherit;cursor:pointer;font:inherit}
button.vz-col:disabled{cursor:default}button.vz-col:disabled:hover{background:none}
button.vz-col[aria-pressed="true"]{background:color-mix(in srgb,var(--you) 20%,transparent);box-shadow:inset 0 0 0 1px var(--you)}
.answer .err{color:var(--bad);margin:6px 0;overflow-wrap:break-word;word-break:break-word}
.thinking{display:inline-flex;align-items:center;gap:8px;color:var(--text-2);overflow-wrap:break-word;word-break:break-word}
.spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--border-2);border-top-color:var(--you);animation:spin .8s linear infinite}
.dots i{font-style:normal;animation:blink 1.2s infinite;opacity:.15}.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}
#ask-secs{font-variant-numeric:tabular-nums;min-width:4ch}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:.15}30%{opacity:1}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.spinner,.dots i{animation:none}.dots i{opacity:1}.wrap{animation:none}}
.thinking-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;overflow-wrap:break-word;word-break:break-word}.thinking-row .btn{margin-left:auto;min-height:30px}
.btn.stop{color:var(--bad);border-color:var(--bad);background:var(--bad-bg)}.btn.stop:hover{background:var(--bad);color:#fff;border-color:var(--bad)}.btn.stop:disabled{opacity:.6;cursor:default}
#ask-tok{font-variant-numeric:tabular-nums}
.settings-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px}.settings-head h1{margin:0}.settings-location{max-width:min(420px,50%);color:var(--muted);font-size:12px}.settings-location summary,.settings-help summary{cursor:pointer}.settings-location code{display:block;margin-top:8px;overflow-wrap:anywhere}
.settings-nav{position:sticky;top:68px;z-index:10;display:flex;gap:4px;overflow-x:auto;margin:0 0 16px;padding:6px;border:1px solid var(--border);border-radius:var(--radius-control);background:color-mix(in srgb,var(--bar) 94%,transparent);backdrop-filter:blur(12px)}
.settings-nav a{flex:0 0 auto;padding:7px 12px;border-radius:7px;color:var(--muted);text-decoration:none}.settings-nav a:hover,.settings-nav a:focus-visible{background:var(--surface-2);color:var(--text)}.settings-nav a:focus-visible{outline:2px solid var(--link);outline-offset:1px}
.settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:14px}.settings-2col{grid-template-columns:repeat(2,minmax(0,1fr))}.settings-card{min-width:0;scroll-margin-top:135px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:18px;overflow-wrap:anywhere}
.settings-card[hidden]{display:none}.settings-card:focus{outline:2px solid var(--link);outline-offset:3px}.settings-card h2{margin:0 0 14px;font-size:15px}
.settings-card label{display:block;margin:12px 0 5px;font-weight:600}.settings-card label:first-of-type{margin-top:0}
.settings-card .field{display:block;width:100%;max-width:100%;min-width:0;margin:0 0 5px}
.settings-card select.field{appearance:auto;text-overflow:ellipsis}
.settings-card .field[type="number"]{width:100%;max-width:170px}.settings-card .field.compact-number{display:inline-block;width:120px}
.settings-card textarea.field{min-height:74px;padding:8px 10px;resize:vertical;line-height:1.45}
.settings-card input:focus-visible,.settings-card select:focus-visible,.settings-card textarea:focus-visible{outline:2px solid var(--link);outline-offset:2px}
.field-note{display:block;margin:4px 0 12px;color:var(--muted);font-size:13px;line-height:1.5}.field-error{color:var(--bad)!important}.field-suffix{margin-left:8px;color:var(--muted);font-size:12px}
.tag-picker{position:relative;min-width:0;margin:0 0 5px}
.tag-list{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-height:40px;width:100%;padding:5px 8px;border:1px solid var(--control);border-radius:var(--radius-control);background:var(--surface);transition:border-color .15s,box-shadow .15s}
.tag-list:focus-within{border-color:var(--link);box-shadow:0 0 0 3px color-mix(in srgb,var(--link) 14%,transparent)}
.tag-pill{display:inline-flex;align-items:center;gap:5px;max-width:min(100%,300px);padding:3px 6px 3px 9px;border:1px solid var(--border-2);border-radius:999px;background:var(--surface-2);color:var(--text);font-size:13px;line-height:1.4}
.tag-pill-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag-pill button{display:grid;place-items:center;flex:0 0 20px;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);font:inherit;font-size:16px;line-height:1;cursor:pointer}
.tag-pill button:hover,.tag-pill button:focus-visible{background:var(--bad-bg);color:var(--bad);outline:0}
.tag-entry{flex:1 1 120px;min-width:80px;width:0;height:28px;padding:0;border:0;outline:0;background:transparent;color:var(--text);font:inherit}
.tag-options{position:absolute;top:calc(100% + 4px);left:0;z-index:30;width:100%;max-height:220px;overflow:auto;margin:0;padding:4px;list-style:none;border:1px solid var(--border-2);border-radius:var(--radius-control);background:var(--surface);box-shadow:var(--shadow)}
.tag-options[hidden]{display:none}
.tag-options [role="option"]{padding:8px 10px;border-radius:6px;color:var(--text);font-size:13px;overflow-wrap:anywhere;cursor:pointer}
.tag-options [role="option"]:hover,.tag-options [role="option"][aria-selected="true"]{background:var(--surface-2);color:var(--link)}
.settings-help ul{margin:8px 0 0;padding-left:22px;display:grid;gap:7px}.settings-help li{padding-left:2px}
.settings-help code,.field-note code{padding:2px 5px;border:1px solid var(--border);border-radius:5px;background:var(--surface-2);color:var(--text);font:12px/1.5 var(--mono);overflow-wrap:anywhere}
.settings-check{display:flex!important;align-items:center;gap:9px;min-height:38px;cursor:pointer}.settings-check input{width:17px;height:17px;accent-color:var(--link)}
.settings-help{margin:4px 0 8px;color:var(--muted);font-size:13px}.settings-help p{margin:8px 0 0;overflow-wrap:anywhere}.settings-help a{color:var(--link)}
.settings-actions{position:sticky;bottom:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px -4px 0;padding:12px 16px;border-top:1px solid var(--border);background:var(--bg);box-shadow:0 -8px 16px -8px color-mix(in srgb,var(--text) 14%,transparent)}
.settings-actions .field-note{margin:0;min-height:1.5em;color:var(--text)}.settings-actions .btn{flex:0 0 auto}
#settings [hidden]{display:none!important}
@media (max-width:800px){.settings-2col{grid-template-columns:minmax(0,1fr)}.settings-nav{top:58px}.settings-location{max-width:48%}}
@media (max-width:480px){.settings-head{align-items:flex-start;flex-direction:column;gap:8px}.settings-location{max-width:100%}.settings-card{padding:15px}.settings-actions{align-items:flex-start;flex-direction:column}.settings-actions .btn{width:100%;justify-content:center}}
/* Ask + Local Model side-by-side */
.ask-local-pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.ask-card,.local-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;overflow-wrap:break-word;word-break:break-word}
.panel,.stat4,.tile,.settings-card,.ask-card,.local-card{border-radius:var(--radius-card);box-shadow:var(--shadow-card)}
button.tile,.stat4{transition:transform .18s ease,border-color .18s ease,background-color .18s ease,box-shadow .18s ease}
button.tile:hover,.stat4:hover{transform:translateY(-2px);box-shadow:0 14px 30px color-mix(in srgb,var(--text) 10%,transparent)}
button.tile:focus-visible,.stat4:focus-visible{outline:2px solid var(--link);outline-offset:2px}
@media (max-width:700px){.page-heading{align-items:flex-start}.heading-count{margin-top:4px}.project-grid{grid-template-columns:1fr}.project-browser{align-items:flex-start;flex-direction:column;gap:8px}}
@media print{.topbar{position:static;backdrop-filter:none}.quick-open,.command-menu{display:none!important}}
/* Session tape: the replay as a cassette. Its own colours per theme (dark window in dark mode, light window in light mode). */
:root{--tape-bg:#F3F6FB;--tape-line:rgba(31,95,204,.18);--tape-you:#A86B00;--tape-agent:#2563EB;--tape-head:#16181D;--tape-commit:#2F3440;--tape-mid:#C9D3E3;--tape-shadow:inset 0 1px 3px rgba(20,24,32,.08),0 6px 18px rgba(20,24,32,.06)}
:root[data-theme="dark"]{--tape-bg:#0B0F18;--tape-line:rgba(141,187,255,.22);--tape-you:#FDE68A;--tape-agent:#8DBBFF;--tape-head:#fff;--tape-commit:#E6E8EC;--tape-mid:#4A5A7A;--tape-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 8px 24px rgba(8,12,24,.35)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--tape-bg:#0B0F18;--tape-line:rgba(141,187,255,.22);--tape-you:#FDE68A;--tape-agent:#8DBBFF;--tape-head:#fff;--tape-commit:#E6E8EC;--tape-mid:#4A5A7A;--tape-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 8px 24px rgba(8,12,24,.35)}}
.tape{display:flex;align-items:center;gap:14px;margin:22px 0 0}
.reel{position:relative;flex:none;width:46px;height:46px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;--c:var(--tape-you)}
.reel:last-child{--c:var(--tape-agent)}
.reel::before{content:"";position:absolute;inset:0;border-radius:50%;border:3px solid var(--c);background:repeating-conic-gradient(from -9deg,var(--c) 0 18deg,transparent 18deg 120deg);-webkit-mask:radial-gradient(circle,transparent 0 52%,#000 53%);mask:radial-gradient(circle,transparent 0 52%,#000 53%);transition:transform .2s ease}
.reel:hover:not(:disabled)::before{transform:scale(1.06)}
.reel:disabled{cursor:default;opacity:.45}
.reel:focus-visible{outline:2px solid var(--link);outline-offset:3px}
/* Going forward turns the reels clockwise; going back rewinds them anticlockwise. */
.tape.fwd .reel::before{animation:reel-fwd var(--spin,.8s) cubic-bezier(.2,.7,.2,1)}
.tape.rew .reel::before{animation:reel-rew var(--spin,.8s) cubic-bezier(.2,.7,.2,1)}
@keyframes reel-fwd{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes reel-rew{from{transform:rotate(0)}to{transform:rotate(-360deg)}}
.tape-window{flex:1;min-width:0}
.tape-track{position:relative;height:46px;container-type:inline-size;border:2px solid transparent;border-radius:23px;background:linear-gradient(var(--tape-bg),var(--tape-bg)) padding-box,linear-gradient(90deg,var(--tape-you),var(--tape-mid) 50%,var(--tape-agent)) border-box;box-shadow:var(--tape-shadow)}
.tape-track::before{content:"";position:absolute;left:18px;right:18px;top:50%;height:1px;background:var(--tape-line)}
.tape-mark{position:absolute;top:0;bottom:0;left:calc(20px + (100% - 40px) * var(--x) / 100);width:24px;margin-left:-12px;padding:0;border:0;border-radius:6px;background:none;cursor:pointer;--m:var(--tape-agent)}
.tape-mark.you{--m:var(--tape-you)}
/* Groups: one mark for several close together; amber-over-blue when both kinds are inside; the count sits on top. */
.tape-mark.mixed{--m:var(--tape-agent)}.tape-mark.mixed::before{background:linear-gradient(var(--tape-you) 50%,var(--tape-agent) 50%)}
.tape-mark.group::before{width:5px;margin-left:-2.5px}
.tape-count{position:absolute;left:50%;top:1px;transform:translateX(-50%);padding:0 3px;border-radius:4px;background:var(--tape-bg);color:var(--tape-commit);font:600 9.5px/11px var(--mono);pointer-events:none}
.tape-mark.commit .tape-count{top:-1px}
.tape-gap{position:absolute;top:30%;bottom:30%;left:calc(20px + (100% - 40px) * var(--x) / 100);width:5px;margin-left:-2.5px;border-left:1.5px solid var(--tape-line);border-right:1.5px solid var(--tape-line);transform:skewX(-18deg);pointer-events:none}
.tape-mark::before{content:"";position:absolute;left:50%;top:50%;width:4px;height:16px;margin:-8px 0 0 -2px;border-radius:2px;background:var(--m);transition:transform .15s ease,box-shadow .15s ease}
.tape-mark.commit::after{content:"";box-sizing:border-box;position:absolute;left:50%;top:50%;width:12px;height:26px;margin:-13px 0 0 -6px;border:1.5px solid var(--tape-commit);border-radius:3px;background:none}
.tape-risk{position:absolute;top:-5px;left:calc(20px + (100% - 40px) * var(--x) / 100);width:10px;height:10px;margin-left:-5px;box-sizing:border-box;border:2px solid var(--bad);background:var(--tape-bg);border-radius:2px;transform:rotate(45deg);z-index:2}.tape-risk:hover{background:var(--bad)}.tape-risk:focus-visible{outline:2px solid var(--link);outline-offset:3px}
.tape-mark:hover::before{transform:scaleX(1.5)}
.tape-mark[aria-current="true"]::before{box-shadow:0 0 12px color-mix(in srgb,var(--m) 80%,transparent)}
.tape-mark.commit[aria-current="true"]::after{border-color:var(--m)}
/* One shape per mark: focus rings the bar (or the commit box) instead of drawing another rectangle. */
.tape-mark:focus-visible{outline:none}.tape-mark:focus-visible::before{outline:2px solid var(--link);outline-offset:3px}
.tape-mark.commit:focus-visible::before{outline:none}.tape-mark.commit:focus-visible::after{border:2px solid var(--link)}
.tape-head{position:absolute;left:0;top:-7px;bottom:-7px;width:2px;margin-left:-1px;border-radius:1px;background:var(--tape-head);box-shadow:0 0 10px color-mix(in srgb,var(--tape-head) 45%,transparent);pointer-events:none;transform:translateX(calc(20px + (100cqw - 40px) * var(--x) / 100));transition:transform var(--spin,.45s) cubic-bezier(.2,.7,.2,1)}
.tape-times{display:flex;justify-content:space-between;margin:6px 14px 0;color:var(--muted);font:12px/1 var(--mono)}
.tape-key{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0 0 60px;color:var(--muted);font-size:13px}
.tape-key span{display:inline-flex;align-items:center;gap:8px;--m:var(--tape-you)}.tape-key .k-agent{--m:var(--tape-agent)}.tape-key .k-commit{--m:var(--tape-commit)}
.tape-key span::before{content:"";width:16px;height:22px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--border);background:linear-gradient(var(--m),var(--m)) 50% 70%/3px 9px no-repeat,var(--tape-bg)}
.tape-key .k-group::before{content:"3";display:inline-grid;place-items:start center;color:var(--tape-commit);font:600 9.5px/12px var(--mono);background:linear-gradient(var(--tape-you) 50%,var(--tape-agent) 50%) 50% 80%/5px 9px no-repeat,var(--tape-bg)}
.tape-key .k-risk::before{width:9px;height:9px;margin:0 3px;border:2px solid var(--bad);border-radius:2px;background:var(--tape-bg);box-shadow:none;transform:rotate(45deg)}
.tape-key .k-gap::before{background:linear-gradient(90deg,transparent 5px,var(--tape-line) 5px 6.5px,transparent 6.5px 9.5px,var(--tape-line) 9.5px 11px,transparent 11px) center/100% 10px no-repeat,var(--tape-bg)}
.tape-key .k-commit::before{background:var(--tape-bg);box-shadow:inset 0 0 0 1px var(--border),inset 0 0 0 4px var(--tape-bg),inset 0 0 0 5.5px var(--tape-commit)}
/* Docked: once scrolled past, the same tape pins as a slim solid strip under the top bar. Its contents rest dimmed
   and come forward on hover, focus or while the reels turn. Content you jump to is kept clear of it (scroll margins). */
.tape-slot.docked .tape{position:fixed;z-index:15;top:var(--dock-top,61px);left:0;right:0;margin:0;padding:5px max(16px,calc((100vw - 1100px) / 2));gap:10px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bar) 94%,transparent);backdrop-filter:blur(14px);box-shadow:0 8px 20px color-mix(in srgb,var(--bg) 60%,transparent);animation:dock-in .22s ease-out}
.tape-slot.docked .tape>*{opacity:.55;filter:saturate(.7);transition:opacity .2s ease,filter .2s ease}
.tape-slot.docked .tape:hover>*,.tape-slot.docked .tape:focus-within>*,.tape-slot.docked .tape.busy>*{opacity:1;filter:none}
.tape-slot.docked .tape-track{height:30px}.tape-slot.docked .reel{width:30px;height:30px}.tape-slot.docked .reel::before{border-width:2px}.tape-slot.docked .tape-times,.tape-slot.docked .tape-count{display:none}
.tape-slot.docked .tape-mark::before{height:12px;margin-top:-6px}.tape-slot.docked .tape-mark.commit::after{width:12px;height:20px;margin:-10px 0 0 -6px}
.tape-slot.docked .tape-head{top:-4px;bottom:-4px}
.cp-detail{scroll-margin-top:80px}html:has(.tape-slot.docked){scroll-padding-top:120px}html:has(.tape-slot.docked) .cp-detail,html:has(.tape-slot.docked) tr{scroll-margin-top:140px}
@keyframes dock-in{from{opacity:0;transform:translateY(-10px)}}
@media print{.tape-slot{height:auto!important}.tape-slot.docked .tape{position:static;background:none;box-shadow:none;border:0;padding:0}.tape-slot.docked .tape>*{opacity:1;filter:none}}
@media print{.tape{break-inside:avoid}.tape-head{display:none}}
/* Phones: one compact, non-sticky bar; nav scrolls sideways; headings stack; the day strip scrolls so each day stays a 24px target. */
@media (max-width:700px){
  .topbar{position:static;display:grid;grid-template-columns:1fr auto;gap:8px 10px;padding:10px 16px 8px}
  .topbar .nav{grid-column:1/-1;grid-row:2;flex-wrap:nowrap;overflow-x:auto;margin:0 -16px;padding:0 16px 2px;scrollbar-width:none}
  .top-actions{gap:6px}.top-actions [data-action="print"]{display:none}
  .wordmark{font-size:18px}
  .page-heading{flex-direction:column;align-items:flex-start;gap:12px}
  h1{font-size:25px}.page-hero h1{font-size:22px}.page-hero{padding:18px 16px}
  .lede{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
  .strip .vz{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:4px}.strip .vz>*{min-width:820px}
  .reel{width:34px;height:34px}.reel::before{border-width:2px}.tape{gap:8px}.tape-key{margin-left:0}
  .settings-nav{top:0}
}
/* Session titles in tables: two lines at most; the hover card has the full text. */
.row-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:62ch;overflow-wrap:break-word}
tr:target td,tr.tape-hit td{background:color-mix(in srgb,var(--brand-amber) 14%,transparent)}
.cloud-hero .hero-top .chip{font-weight:600}
/* Hover cards (peek): what is behind a link, before you open it. */
.peek{position:fixed;z-index:60;width:max-content;max-width:min(380px,calc(100vw - 16px));padding:14px 16px;border:1px solid transparent;border-radius:14px;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,color-mix(in srgb,var(--brand-blue) 65%,var(--border)),var(--border-2) 45%,color-mix(in srgb,var(--brand-amber) 65%,var(--border))) border-box;box-shadow:var(--shadow);color:var(--text);font-size:13px;line-height:1.5;opacity:0;transform:translateY(4px) scale(.985);transform-origin:top left;transition:opacity .14s ease,transform .14s ease}
.peek.on{opacity:1;transform:none}
.peek[hidden]{display:none}
.peek-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 6px;color:var(--muted);font-size:12px}
.peek-h{font-size:14.5px;font-weight:650;line-height:1.35;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.peek-q{margin:8px 0 0;padding-left:10px;border-left:2px solid var(--you);color:var(--text-2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.peek-r{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 14px;margin:10px 0 0;padding-top:10px;border-top:1px solid var(--border)}
.peek-r dt{color:var(--muted)}.peek-r dd{margin:0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.peek-go{margin-top:10px;color:var(--brand-amber-ink);font-size:12px;font-weight:600}
@media (hover:none){.peek{display:none}}
/* Legal dialog */
.inline-field{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.inline-field .field{margin:0}
.confirm{width:min(440px,calc(100vw - 32px));padding:20px 22px}.confirm h2{margin:0 0 10px;font-size:19px}.confirm p{margin:0 0 8px}.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.legal-modal .m-head .btn.sm{margin-left:auto}.legal-modal .m-head h2{flex:none}.legal-modal .m-body{max-height:calc(100vh - 160px);overflow:auto}
.legal-modal .legal h2{font-size:17px;margin:18px 0 8px}.legal-modal .legal section:first-child h2{margin-top:0}
/* What shipped key: tiny cards that look like the real ones */
.shipped-key .lg{display:inline-block;width:20px;height:13px;margin-right:6px;border-radius:4px;vertical-align:-2px}
.lg-pr{background:color-mix(in srgb,var(--pr) 12%,transparent);border:1px solid color-mix(in srgb,var(--pr) 45%,var(--border))}
.lg-rel{background:var(--ok-bg);border:1px solid color-mix(in srgb,var(--ok) 40%,var(--border))}
.lg-cloud{border:1px dashed var(--cloud)}
/* Usage: every bar, model and project row is a button that filters the page */
.mini-bars button{display:block;min-width:0;padding:0;border:0;border-radius:2px 2px 0 0;background:var(--border-2);cursor:pointer;transition:background-color .15s ease,opacity .15s ease}
.mini-bars button:hover:not(:disabled){background:var(--text-2)}.mini-bars button.peak{background:var(--you)}
.mini-bars button[aria-pressed="true"]{background:var(--brand-blue);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand-blue) 35%,transparent)}
.mini-bars button.dim{opacity:.35}.mini-bars button:disabled{cursor:default}
.mini-bars button:focus-visible{outline:2px solid var(--link);outline-offset:2px}
.mini-axis small{display:block;color:var(--text-2);font-size:12px;font-variant-numeric:tabular-nums}
.hrow{display:block;width:100%;padding:6px 8px;margin:-6px -8px;box-sizing:content-box;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.hrow:hover{background:var(--surface-2)}.hrow:focus-visible{outline:2px solid var(--link);outline-offset:0}
.mrow{display:flex;justify-content:space-between;gap:8px}.mrow[aria-pressed="true"]{background:color-mix(in srgb,var(--brand-blue) 14%,transparent)}.mrow[data-dim]{opacity:.45}
#model-bar span{cursor:pointer}#model-bar span.dim{opacity:.3}
.picks{gap:8px;margin:-4px 0 12px;font-size:13px}.picks[hidden]{display:none}.picks .chip button{border:0;background:none;color:inherit;cursor:pointer;padding:0 0 0 4px}
/* Date links read as metadata: grey with a dotted underline; the hover card says what is on that day. */
a.date-link{color:var(--muted);text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px}a.date-link:hover{color:var(--text)}
.ans-date{margin-left:6px;color:var(--muted);font-size:12.5px;white-space:nowrap}.ans-date::before{content:"· "}
.ask-kbd{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:12px;white-space:nowrap}
@media (max-width:700px){.ask-kbd{display:none}}
/* Keep the controls in reach while scrolling */
.sticky-head{position:sticky;top:61px;z-index:12;margin:0 -12px 8px;padding:10px 12px 4px;border-radius:0 0 12px 12px;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(14px)}
.filter-dock{position:fixed;z-index:14;left:0;right:0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:8px max(16px,calc((100vw - 1360px) / 2));border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bar) 95%,transparent);backdrop-filter:blur(14px);box-shadow:0 8px 20px color-mix(in srgb,var(--bg) 60%,transparent);animation:dock-in .22s ease-out}
.filter-dock[hidden]{display:none}
.ask-row.docked-row{position:fixed;z-index:15;top:calc(var(--dock-top) + 8px);left:var(--dock-l);width:var(--dock-rw);min-height:40px;margin:0;background:var(--bg)}
.ask-row.docked-row .ask-kbd{display:none}
#controls.docked-ctl{position:fixed;z-index:15;top:calc(var(--dock-top) + 8px + var(--dock-ct));left:var(--dock-cl);right:var(--dock-r);margin:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
/* Docked filters keep their normal shape: nothing shrinks or wraps; a tight row scrolls sideways instead. */
#controls.docked-ctl>*{flex:none}#controls.docked-ctl>span[style*="flex:1"]{flex:1 1 0;min-width:8px}#controls.docked-ctl .toggle,#controls.docked-ctl .btn,#controls.docked-ctl .field{white-space:nowrap}#controls.docked-ctl #export{display:none}
@media (max-width:700px){.sticky-head{top:0;margin:0 -16px 8px;padding:8px 16px 4px}#controls.docked-ctl{position:static;overflow:visible;flex-wrap:wrap}}
@media print{.sticky-head{position:static}.filter-dock{display:none}}
/* Usage tabs */
.tabs{display:flex;gap:4px;overflow-x:auto;margin:2px 0 6px;scrollbar-width:none}
.tabs [role=tab]{flex:none;padding:7px 14px;border:1px solid transparent;border-radius:999px;background:none;color:var(--muted);font:inherit;font-weight:600;cursor:pointer}
.tabs [role=tab]:hover{color:var(--text);background:var(--surface-2)}
.tabs [role=tab][aria-selected="true"]{color:var(--text);background:color-mix(in srgb,var(--brand-blue) 14%,transparent);border-color:color-mix(in srgb,var(--brand-blue) 40%,transparent)}
.tabs [role=tab]:focus-visible{outline:2px solid var(--link);outline-offset:1px}
.tabpanel[hidden]{display:none}
.stat4.static{cursor:default}.stat4.static:hover{transform:none;background:var(--surface);border-color:var(--border)}
/* Labelled bar charts: value on top, label below, hover card on each */
.sbars{display:flex;align-items:flex-end;gap:6px;min-height:190px;padding-top:6px;overflow-x:auto}
.sb{flex:1 1 0;min-width:30px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;border-radius:6px;outline-offset:2px}
.sb:hover,.sb:focus-visible{background:color-mix(in srgb,var(--text) 5%,transparent)}.sb:focus-visible{outline:2px solid var(--link)}
.sb-v{font-size:12px;color:var(--text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.sb-bar{display:flex;flex-direction:column-reverse;gap:2px;width:min(28px,70%)}.sb-bar i{display:block;min-height:2px}.sb-bar i:last-child{border-radius:4px 4px 0 0}
.sb-l{font-size:12px;color:var(--muted);white-space:nowrap}
.rank{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.locked-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.locked-card{display:flex;flex-direction:column;gap:4px;padding:16px;border:1px dashed var(--border-3);border-radius:var(--radius-card);background:color-mix(in srgb,var(--surface) 60%,transparent)}
.date-range{gap:6px}.date-range input{min-height:34px;width:9.5em}
.sbars{position:relative;gap:0}.sb{padding:0 3px}
.sb-line{position:absolute;left:0;right:0;bottom:19px;height:140px;pointer-events:none}
.sb-line svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.sb-line polyline{fill:none;stroke-width:2.5;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.sb-pt{position:absolute;width:9px;height:9px;margin:0 0 -4.5px -4.5px;border-radius:50%;box-shadow:0 0 0 2px var(--surface)}
.sb-pt b{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;color:var(--ok);white-space:nowrap}
.key-bar,.key-line{display:inline-block;width:14px;margin:0 6px 0 2px;vertical-align:middle}.key-bar{height:10px;border-radius:2px;background:color-mix(in srgb,var(--ok) 35%,var(--surface-2))}.key-line{height:3px;border-radius:2px;background:var(--ok);margin-left:12px}
.pdot{display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;vertical-align:1px}.pdots{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:3px;font-size:12.5px;color:var(--text-2)}
.rank .hrow .pdot{margin-right:6px}.rank li:has(>.pdot){display:grid;grid-template-columns:auto 1fr;align-items:baseline}
.usage-notes{margin-top:16px}
.hrow[data-dim]{opacity:.55}.hrow[aria-pressed="true"]{background:color-mix(in srgb,var(--brand-blue) 14%,transparent)}
/* Dropdowns: one sleek style everywhere (custom chevron, same height and focus ring as inputs). */
select,.field select,.jump select,.pager select,.settings-card select.field{-webkit-appearance:none;appearance:none;padding-right:30px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%238A919E' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.settings-card select.field{min-height:40px;padding-left:12px;border-radius:var(--radius-control)}
select:hover{border-color:var(--border-3)}
option,optgroup{background:var(--surface);color:var(--text)}
.project-find{margin:0 0 10px;align-self:flex-start}.project-find[hidden]{display:none}.project-pick input{width:11em}.project-find input{width:15em}.project-pick input::-webkit-calendar-picker-indicator,.project-find input::-webkit-calendar-picker-indicator{opacity:.5}
.settings-pair{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:0 12px}
.err-fix{margin:4px 0 6px}
/* Arriving from a fix link: the target Settings card is outlined briefly. */
.settings-card:target{outline:2px solid var(--brand-blue);outline-offset:3px;animation:target-in 1.6s ease-out}
@keyframes target-in{0%{box-shadow:0 0 0 8px color-mix(in srgb,var(--brand-blue) 25%,transparent)}100%{box-shadow:var(--shadow-card)}}
.saved-answer{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 10px;padding:8px 10px;border:1px dashed var(--border-3);border-radius:var(--radius-control);font-size:13px}.saved-answer .muted{flex:1 1 260px}
.ask-saved{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:8px 0 0;font-size:13px}.ask-saved[hidden]{display:none}
.saved-q{display:inline-flex;align-items:baseline;gap:6px;min-height:28px;padding:3px 10px;border:1px solid color-mix(in srgb,var(--brand-blue) 40%,var(--border));border-radius:999px;background:color-mix(in srgb,var(--brand-blue) 8%,transparent);color:var(--text);font:inherit;cursor:pointer}
.saved-q:hover{border-color:var(--brand-blue)}.saved-q:focus-visible{outline:2px solid var(--link);outline-offset:2px}.saved-q .muted{font-size:12px}
.saved-clear{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:8px 0 4px}.saved-clear .field-note{margin:0;flex:1 1 220px}
/* Logo edge: blue-to-amber gradient border on the brand surfaces (hero, Ask, quick navigation). */
.page-hero{border:1px solid transparent}
.ask,.command-menu{border:1px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,color-mix(in srgb,var(--brand-blue) 60%,var(--border)),var(--border) 42%,var(--border) 58%,color-mix(in srgb,var(--brand-amber) 60%,var(--border))) border-box}
.ask-row:focus-within{border-color:var(--brand-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand-blue) 14%,transparent)}
/* @-mention menu: the keyboard-selected option */
.mention button[aria-selected=true]{background:var(--surface-2);box-shadow:inset 3px 0 0 var(--brand-blue)}
.btn[hidden]{display:none}
/* AI answers: agent names in their colour, dates and times, and the question's own words */
.answer{line-height:1.7}.answer>p{margin:0 0 10px}.answer>ul{margin:10px 0 12px;padding-left:22px}.answer li{margin:0 0 8px;padding-left:2px}.answer li::marker{color:var(--muted)}
.answer .agent{padding:1px 8px;font-size:.92em;line-height:1.35;vertical-align:baseline;white-space:nowrap}
.answer .when{display:inline-block;padding:0 6px;border:1px solid var(--border-2);border-radius:6px;background:var(--surface-2);color:var(--text);font-size:.92em;font-weight:600;line-height:1.45;font-variant-numeric:tabular-nums;white-space:nowrap}
.answer button.agent{font-family:inherit;cursor:pointer;transition:background-color .15s ease,box-shadow .15s ease}
.answer button.agent:hover{background:color-mix(in srgb,var(--ag) 24%,transparent)}
.answer button.agent[aria-pressed=true]{background:color-mix(in srgb,var(--ag) 30%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--ag) 45%,transparent)}
.answer a.when{text-decoration:none;cursor:pointer}.answer a.when:hover,.answer a.when:focus-visible{border-color:var(--link);color:var(--link)}
.answer a .when{color:var(--link);border-color:color-mix(in srgb,var(--link) 40%,var(--border-2))}.answer a:has(.when){text-decoration:none}.answer a:hover .when{border-color:var(--link)}
.answer mark{padding:1px 3px;border-radius:3px;background:color-mix(in srgb,var(--brand-amber) 38%,transparent)}
.answer strong{font-weight:650}
details.fold.quiet{border:0;background:none;margin-top:12px}
details.fold.quiet>summary{padding:4px 0;font-weight:500;font-size:12px;color:var(--muted)}
details.fold.quiet .fold-body{border:0;padding:0}
/* Footer */
.site-foot{max-width:1440px;margin:0 auto;padding:18px 40px 28px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 20px;color:var(--muted);font-size:12px}
.site-foot nav{display:flex;flex-wrap:wrap;gap:4px 18px}
.site-foot a{color:var(--muted);text-decoration:none}.site-foot a:hover,.site-foot a:focus-visible{color:var(--link);text-decoration:underline}
@media (max-width:700px){.site-foot{padding:16px}}
.legal{max-width:760px}.legal section{margin:0 0 28px;scroll-margin-top:80px}.legal h2{margin:0 0 10px;font-size:20px}.legal li{margin:0 0 8px}.legal p,.legal li{color:var(--text-2);line-height:1.6}
@media print{.site-foot{display:none}}
/* Update now */
.update-btn .update-icon{flex:none}
.update-btn.busy{cursor:progress;opacity:1}.update-btn.busy .update-icon{animation:sr-spin .9s linear infinite;color:var(--link)}
.update-btn.done{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 45%,var(--border-2))}
@keyframes sr-spin{to{transform:rotate(360deg)}}
.update-bar{position:fixed;left:50%;bottom:22px;z-index:30;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(680px,calc(100vw - 32px));padding:10px 12px 10px 16px;border:1px solid var(--border-2);border-radius:12px;background:var(--surface);box-shadow:var(--shadow-card);font-size:13px}
.update-bar[hidden]{display:none}
.update-bar.busy{border-color:color-mix(in srgb,var(--brand-blue) 55%,var(--border-2))}
.update-bar.ok{border-color:color-mix(in srgb,var(--ok) 45%,var(--border-2))}.update-bar .update-ok{color:var(--ok);font-weight:700}
.update-bar.err{border-color:color-mix(in srgb,var(--bad) 55%,var(--border-2));color:var(--bad)}
.update-bar .spinner{flex:none}.update-secs{color:var(--muted);font-variant-numeric:tabular-nums;min-width:3ch}
.update-bar .btn{min-height:30px;padding:0 12px}
.update-bar-x{display:grid;place-items:center;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:none;color:var(--muted);cursor:pointer}.update-bar-x:hover{background:var(--surface-2);color:var(--text)}
@media print{.update-bar{display:none!important}}
@media (max-width:1000px){.update-btn{width:36px;padding:0;justify-content:center}.update-btn .update-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
@media print{body{background:#fff}.page-hero{border-color:var(--border);background:none}}
.progress{display:flex;align-items:center;gap:10px;margin:8px 0;padding:10px 12px;border:1px solid color-mix(in srgb,var(--brand-blue) 45%,var(--border));background:color-mix(in srgb,var(--brand-blue) 10%,var(--surface));border-radius:10px}.progress[hidden]{display:none}
.progress-body{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}.progress-track{display:block;height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden}
.progress-track i{display:block;height:100%;width:0;background:var(--brand-blue);border-radius:3px;transition:width .9s linear}.progress.indeterminate .progress-track i{width:35%;animation:sr-slide 1.4s ease-in-out infinite}
.spin{width:16px;height:16px;flex:none;border:2px solid color-mix(in srgb,var(--brand-blue) 30%,transparent);border-top-color:var(--brand-blue);border-radius:50%;animation:sr-spin .9s linear infinite}
@keyframes sr-spin{to{transform:rotate(360deg)}}@keyframes sr-slide{0%{margin-left:-35%}100%{margin-left:100%}}
@media(prefers-reduced-motion:reduce){.spin,.progress.indeterminate .progress-track i{animation:none}.progress-track i{transition:none}}
.panel:has(>.chart-actions){position:relative}.panel:has(>.chart-actions)>h2:first-of-type{padding-right:128px}
.chart-actions{position:absolute;top:10px;right:10px;display:flex;gap:6px}
@media print{body[data-print-panel] :is(.topbar,.sticky-head,.stats4,.site-foot,.update-bar,.skip-link,.page-heading,.locked-grid,.warnline,h2.locked-h){display:none!important}body[data-print-panel] .panel:not(.print-this){display:none!important}body[data-print-panel] .print-this .chart-actions{display:none}body[data-print-panel] .print-this::before{content:attr(data-print-caption);display:block;margin:0 0 8px;color:var(--muted);font-size:13px}body[data-print-panel] details.fold:not(.print-this *){display:none!important}body[data-print-panel] .print-this .print-data{display:block;margin-top:14px}.chart-actions{display:none}}
.print-data{display:none}.print-data h3{font-size:13px;margin:0 0 6px}.print-data table{width:100%;border-collapse:collapse;font-size:12px}.print-data th,.print-data td{padding:3px 6px;border-bottom:1px solid var(--border);text-align:right}.print-data th:first-child,.print-data td:first-child{text-align:left}.print-data thead{display:table-header-group}.print-data tr{break-inside:avoid}
.rank .hrow .kbar{display:flex;gap:2px;height:8px;margin-top:6px;border-radius:4px;overflow:hidden;background:var(--surface-2)}.kbar i{display:block;min-width:2px}
.rank .hrow .chip.risk+.muted{margin-left:8px}
.kind-fold{margin-top:8px}.kind-fold>summary{padding:10px 14px}.kind-fold .fold-body{max-height:40vh;padding:0 14px 8px}
.risky-panel,.risk-list li{scroll-margin-top:130px}html:has(.tape-slot.docked) :is(.risky-panel,.risk-list li){scroll-margin-top:12px}
`;
