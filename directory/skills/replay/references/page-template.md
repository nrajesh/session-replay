# The replay page

Write the page from the template below. Replace each `{{…}}` slot, repeat the marked blocks as often as
needed, and remove a section that has nothing in it. Keep the styles exactly as they are. Add no scripts and
no links to files on the internet.

## Slots

| Slot | What goes in it |
|---|---|
| `{{title}}` | The first real prompt, shortened to about 70 characters |
| `{{project}}` | The last part of the session's project folder |
| `{{branch}}` | The git branch, or leave the whole item out |
| `{{date}}` | The start date, such as 9 November 2026, in the user's local time |
| `{{start}}`, `{{end}}` | Start and end times, such as 14:05 |
| `{{prompts}}`, `{{files}}`, `{{tests}}`, `{{commits}}` | The totals |
| `{{time}}` | The time of one checkpoint |
| `{{prompt}}` | The user's prompt, in their words |
| `{{summary}}` | Two or three plain sentences on what Claude did next |
| `{{path}}` | One changed file, relative to the project folder |
| `{{test}}` | One test run, such as `npm test: 42 passed, 1 failed` |
| `{{hash}}`, `{{subject}}` | One commit |
| `{{decision}}` | One decision, quoted from the user's prompt |
| `{{session id}}` | The full session id |

Use the class `fail` on a test line with failures, and `pass` on one without.

## Template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{title}} · Session Replay</title>
<style>
:root{--bg:#faf8f5;--card:#fff;--ink:#1f1b16;--soft:#6b6259;--line:#e6e0d8;--accent:#c2410c;--pass:#15803d;--fail:#b91c1c}
@media (prefers-color-scheme:dark){:root{--bg:#161412;--card:#1f1c19;--ink:#f1ece6;--soft:#a79d92;--line:#35302b;--accent:#f08a50;--pass:#4fcb86;--fail:#f87171}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:820px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 8px}
h2{font-size:1.05rem;margin:40px 0 12px;color:var(--soft);text-transform:uppercase;letter-spacing:.06em}
.meta{color:var(--soft);margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:24px 0 0;padding:0;list-style:none}
.tiles li{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.tiles b{display:block;font-size:1.5rem}
.tiles span{color:var(--soft);font-size:.85rem}
.tape{list-style:none;margin:0;padding:0;border-left:2px solid var(--line)}
.tape>li{position:relative;margin:0 0 16px 20px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.tape>li::before{content:"";position:absolute;left:-27px;top:20px;width:10px;height:10px;border-radius:50%;background:var(--accent)}
time{color:var(--soft);font-size:.85rem}
.prompt{margin:4px 0 8px;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
.summary{margin:0 0 8px}
details{margin-top:8px}
summary{cursor:pointer;color:var(--soft)}
details ul,.plain{margin:8px 0 0;padding-left:20px}
code{font:.88em ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
.pass{color:var(--pass)}
.fail{color:var(--fail)}
blockquote{margin:0 0 10px;padding:8px 14px;border-left:3px solid var(--accent);background:var(--card);border-radius:0 8px 8px 0;white-space:pre-wrap;overflow-wrap:anywhere}
footer{margin-top:48px;color:var(--soft);font-size:.85rem}
@media print{body{background:#fff}.tape>li,.tiles li{break-inside:avoid}}
</style>
</head>
<body>
<main>
<header>
<h1>{{title}}</h1>
<ul class="meta">
<li>{{project}}</li>
<li>Branch <code>{{branch}}</code></li>
<li>{{date}}, {{start}} to {{end}}</li>
</ul>
<ul class="tiles">
<li><b>{{prompts}}</b><span>prompts</span></li>
<li><b>{{files}}</b><span>files changed</span></li>
<li><b>{{tests}}</b><span>test runs</span></li>
<li><b>{{commits}}</b><span>commits</span></li>
</ul>
</header>

<h2>Replay</h2>
<ol class="tape">
<!-- repeat for each checkpoint -->
<li>
<time>{{time}}</time>
<p class="prompt">{{prompt}}</p>
<p class="summary">{{summary}}</p>
<details>
<summary>Files, tests and commits</summary>
<ul>
<li><code>{{path}}</code></li>
<li class="pass">{{test}}</li>
<li>Commit <code>{{hash}}</code> {{subject}}</li>
</ul>
</details>
</li>
<!-- end repeat -->
</ol>

<h2>Decisions you made</h2>
<!-- repeat for each decision -->
<blockquote>{{decision}}</blockquote>
<!-- end repeat -->

<h2>Commits</h2>
<ul class="plain">
<!-- repeat for each commit -->
<li><code>{{hash}}</code> {{subject}}</li>
<!-- end repeat -->
</ul>

<footer>Session <code>{{session id}}</code>. Made with Session Replay. This page is a file on your computer and loads nothing from the internet.</footer>
</main>
</body>
</html>
```
