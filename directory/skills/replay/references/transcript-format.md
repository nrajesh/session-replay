# Reading a Claude Code transcript

A transcript is a JSON Lines file. Each line is one record. The records that matter have `type` set to
`user` or `assistant`.

| Field | Meaning |
|---|---|
| `timestamp` | When the record was written, in UTC |
| `sessionId`, `cwd`, `gitBranch` | The session, its project folder and its branch |
| `isMeta`, `isSidechain` | True for housekeeping and subagent records. Skip both. |
| `origin` | `human` for something the user typed. Anything else came from the system. It can be text or an object with a `kind`. |
| `message.content` | Either plain text, or a list of blocks |

Blocks in `message.content`:

| Block `type` | Where | Meaning |
|---|---|---|
| `text` | user, assistant | What was said |
| `tool_use` | assistant | Something Claude did. `name` is the tool, `input` holds the command or file path. |
| `tool_result` | user | What came back. A `user` record that holds one of these is not a prompt. |
| `thinking` | assistant | Leave it out of the page |

## Take an outline

Run this with the transcript's path in place of `FILE`. It prints one short line per record. A message
about the last line being unfinished is harmless: the session was still being written.

```sh
jq -c '
select(.type == "user" or .type == "assistant")
| select((.isSidechain // false) | not)
| select((.isMeta // false) | not)
| (.message.content) as $c
| {
    at: .timestamp,
    who: (if .type == "assistant" then "claude"
          elif ((.origin | if type == "object" then .kind else . end) // "human") != "human" then "system"
          elif ($c | type) == "array" and any($c[]; .type == "tool_result") then "result"
          else "you" end),
    text: ((if ($c | type) == "string" then $c
            else ([$c[]? | select(.type == "text") | .text] | join("\n")) end) | .[0:800]),
    did: [$c | arrays | .[] | select(.type == "tool_use")
          | "\(.name): \((.input.command // .input.file_path // .input.description // .input.pattern // "") | tostring | .[0:200])"],
    got: [$c | arrays | .[] | select(.type == "tool_result")
          | (.content | if type == "string" then . else ([.[]? | select(.type == "text") | .text] | join("\n")) end)
          | .[-300:]]
  }
| select(.text != "" or (.did | length) > 0 or (.got | length) > 0)
' FILE
```

In the output:

- `who` is `you` for a prompt the user typed, `claude` for Claude, `result` for what a tool returned, and
  `system` for anything the system added.
- `text` is the first 800 characters of what was said.
- `did` lists what Claude did, as `Tool: command or file`.
- `got` is the last 300 characters of each result, which is where test totals and commit lines appear.

For a long session, read the outline in slices by adding `| sed -n '1,300p'`, then `'301,600p'`, and so on.

If `jq` is not installed, search the file for `"type":"user"` with the content of each match limited to a
few hundred characters, and read only those parts. Tell the user the page will be less detailed.

## What counts as a real prompt

A `you` line is a real prompt unless its text, once the blocks below are removed, is empty or starts with
one of the listed markers.

Remove these blocks first: `<ide_opened_file>…</ide_opened_file>`, `<ide_selection>…</ide_selection>`,
`<ide_diagnostics>…</ide_diagnostics>`, `<system-reminder>…</system-reminder>`.

Then skip the line if what is left starts with any of: `<command-name>`, `<command-message>`,
`<command-args>`, `<local-command-std`, `<task-notification>`, `<bash-stdout>`, `<bash-stderr>`,
`[Request interrupted`, `Caveat: The messages below`.

## Spotting tests and commits

- **Commit:** a `did` entry that runs `git commit`, followed by a `got` entry such as
  `[main 1a2b3c4] feat: dark mode`. The seven or more characters after the branch name are the short hash.
- **Test run:** a `did` entry that runs a test command (`npm test`, `node --test`, `pytest`, `go test`,
  `cargo test`, `vitest`, `jest` and the like), followed by a `got` entry with pass and fail counts.
- **File changed:** a `did` entry from `Edit`, `Write`, `MultiEdit` or `NotebookEdit`. Count each path once.
