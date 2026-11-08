---
name: update
description: Update the user's Session Replay pages now and give them the link. Use when they ask to update, refresh, build or open their session replays, or to change a Session Replay setting.
---

Session Replay turns the user's Claude Code sessions into private web pages on their Mac. Pages already update by
themselves after every session; this skill updates them right now.

1. Run with the Bash tool:

   ```sh
   session-replay build
   ```

   If it says Node.js is missing or too old, pass that message on and stop. The first build can take a minute.

2. Reply in one or two short sentences: how many sessions were added or updated, and the pages link from the last
   line of the output (`Pages: …/index.html`). On a Mac, offer to open it with `open "<that path>"`.

Settings, only when the user asks for one:

- Where the pages are: `session-replay status`
- List settings: `session-replay config`
- Change one: `session-replay config set <name> <value>`
  (theme, archiveDays, includeProjects, excludeProjects, extraRedactions, projectsDir)
- Remove a session whose original transcript is gone: `session-replay forget <session id>`, then build again

Never paste transcript contents into the conversation; the pages are for the user to read in their browser.
