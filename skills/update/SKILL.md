---
name: update
description: Build or update the user's Session Replay pages from their Claude Code sessions and give them the link. Use when they ask to update, refresh, build or open their session replays, or to change a Session Replay setting.
---

Session Replay turns the user's Claude Code sessions into private web pages on their Mac. Run these steps with the
Bash tool, one at a time.

1. Check Node.js with `node --version`. If it is missing or older than v24, stop and tell the user:
   "Session Replay needs Node.js 24 or newer. Install it with Homebrew (`brew install node`) or from the Node.js
   website, then ask me again."

2. Build the pages:

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" build
   ```

   The first build can take a minute. Later builds only read sessions that changed.

3. Reply in one or two short sentences: how many sessions were added or updated, and the pages link from the last
   line of the output (`Pages: …/index.html`). On a Mac, offer to open it with `open "<that path>"`.

Settings, only when the user asks for one:

- Show where the pages are: `node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" status`
- List settings: `node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" config`
- Change one: `node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" config set <name> <value>`
  (theme, archiveDays, includeProjects, excludeProjects, extraRedactions, projectsDir)
- Remove a session whose original transcript is gone: `node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" forget <session id>`,
  then build again

Never paste transcript contents into the conversation; the pages are for the user to read in their browser.
