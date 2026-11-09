---
name: replay
description: Build a private replay page for a Claude Code session, showing the user's prompts, decisions, tests and commits in order. Use when they ask to replay, review or summarise a past session, to see what happened in a session, or to list their recent sessions.
---

Session Replay turns one Claude Code session into a single web page the user opens in their browser. This
skill holds instructions and a page template only. You do the work with your own tools, in Claude Code, on
the user's computer.

## 1. Use the full edition if it is already there

Check once whether the user has the separate full edition installed:

```sh
command -v session-replay
```

If that prints a path, run `session-replay build`, give the user the link from the last line of its output
(`Pages: …/index.html`), and stop. Otherwise carry on below. Do not install anything.

## 2. Find the session

Transcripts are JSON Lines files, one per session:

```
<config>/projects/<project folder>/<session id>.jsonl
```

`<config>` is `$CLAUDE_CONFIG_DIR` when that is set, otherwise `~/.claude`. The project folder is the
project's full path with every `/` replaced by `-`.

- **"This project" or no project named:** look in the folder that matches the current working directory.
- **"My recent sessions":** list the newest ten files across all project folders with their dates and the
  first thing the user asked in each, and let the user pick. Read only enough of each file to get that first prompt.
- **A session id or a date:** match it against the file names and file dates.

If there is more than one candidate, ask which one. Never guess between sessions.

## 3. Read an outline, not the whole file

Transcripts are large and most of each line is tool output. Do not open one with Read. Take the outline
described in [references/transcript-format.md](references/transcript-format.md), which keeps the user's
prompts, a short note of each thing Claude did, and the end of each result. Work through a long session in
slices.

## 4. Work out the replay

From the outline, build these:

- **Checkpoints.** One for each real prompt from the user, in order. For each: the time, the prompt in the
  user's own words, two or three plain sentences on what Claude then did, the files changed, any test run with
  its result, and any commit made.
- **Decisions.** The prompts where the user chose between options, changed direction, approved or refused
  something. Quote them.
- **Tests.** Each test run, with pass and fail counts when the output shows them.
- **Commits.** Each commit made during the session, with its short hash and subject. To confirm them, run
  `git log --oneline --since=<start> --until=<end>` in the session's project folder. Only read from git.
  Never change the repository.
- **Totals.** Start time, end time, number of prompts, files changed, test runs and commits.

Keep to what the transcript shows. If something is unclear, leave it out instead of guessing.

## 5. Hide secrets

Before writing anything, replace API keys, tokens, passwords, private keys and connection strings with
`[hidden]`. This covers anything that looks like a credential, including values after names such as
`TOKEN=`, `SECRET=`, `PASSWORD=`, `Authorization:` and long random strings.

## 6. Write the page

Fill in the template from [references/page-template.md](references/page-template.md) and write one file:

```
~/.local/share/session-replay/skill-pages/<date>-<project>-<first 8 characters of the session id>.html
```

Use `$XDG_DATA_HOME/session-replay/skill-pages/` instead when `XDG_DATA_HOME` is set. Escape `&`, `<` and
`>` in everything you take from the transcript. The page must stay a single file with no scripts and
nothing loaded from the internet.

## 7. Tell the user

Reply in two or three short sentences: which session it was, the totals, and the full path of the page. On
a Mac, offer to open it with `open "<that path>"`.

Do not paste transcript contents into the conversation beyond the short list in step 2. The page is where
the user reads them.
