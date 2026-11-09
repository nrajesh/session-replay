# Session Replay

Turn a Claude Code session into a private replay page. See your prompts, the decisions you made, the tests that ran and the commits that came out of it, in order, on one page you can keep.

This is the edition listed in Anthropic's directory. It contains instructions and a page template, and no program of its own. Claude builds each page with its own tools when you ask.

## Use it

In Claude Code, ask in your own words, or type `/session-replay:replay`. For example:

- "Replay my last session in this project"
- "Show my recent sessions"
- "Make a replay page for yesterday's session on the billing fix"

Claude finds the session, builds the page and tells you where it is:

```
~/.local/share/session-replay/skill-pages/
```

Open the page in any browser. Save it as a PDF from the browser's print dialog if you want a copy to share.

## What you get

- **A timeline of checkpoints.** One for each thing you asked, with what Claude did next.
- **Your decisions.** The moments you chose, approved or changed direction, in your own words.
- **Tests and commits.** Each test run with its result, and each commit with its hash and subject.
- **Totals.** Prompts, files changed, test runs and commits for the session.
- **Secrets hidden.** API keys, tokens and passwords are replaced with `[hidden]` before the page is written.

## Where it works

Claude Code only. Session transcripts are files on your computer, so chat and Cowork have nothing to read.

## What it reads, writes and runs

- **Reads** your Claude Code transcripts in `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR/projects`), only for the session you ask about, plus the first prompt of recent sessions when you ask for a list.
- **Runs** `jq` to take a short outline of the transcript, and `git log` in the session's project folder to confirm commits. Both only read. Nothing is installed or downloaded.
- **Writes** one web page per session to `~/.local/share/session-replay/skill-pages/` (or `$XDG_DATA_HOME/session-replay/skill-pages/`). Delete that folder to remove everything.
- **Sends** nothing to any service of ours. There are no accounts, analytics or network calls. Claude reads the outline to write the page, so that text goes to your Claude model in the same way as any other file Claude reads for you.
- **Pages** are single files with no scripts, and they load nothing from the internet.

## The full edition

A separate full edition builds pages for every session by itself and adds search across all your projects, a calendar and usage totals. It is a program that runs on your computer, so it is not part of this listing. It is free and open source in the [Session Replay repository](https://github.com/nrajesh/session-replay). If it is already installed, this skill uses it.

## Feedback

Found a bug or have an idea? Open an [issue](https://github.com/nrajesh/session-replay/issues).

## Licence

MIT. See [LICENSE](LICENSE).
