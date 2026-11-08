---
name: build
description: Build or refresh your Session Replay pages from Claude Code sessions.
disable-model-invocation: true
---

Build or refresh the replay pages from your Claude Code sessions:

```sh
session-replay build
```

The first build can take a minute. Pages are written to
`${XDG_DATA_HOME:-$HOME/.local/share}/session-replay/replays/index.html`.
Open that file in a browser. After that, pages update by themselves when a Claude Code
session starts or ends. Run `session-replay status` to see where the pages are and how many
sessions they hold.
