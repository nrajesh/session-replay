import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riskyKinds, splitCommands, RISKY_LABEL, noteRisky } from '../src/risky.ts';
import { hidePaths, hideUser } from '../src/redact.ts';
import { emptySession } from '../src/parse.ts';

const kinds = (c: string) => riskyKinds(c);

test('splitCommands splits on unquoted operators only', () => {
  assert.deepEqual(splitCommands('cd x && rm -rf y; echo "a && b" | cat'), [['cd', 'x'], ['rm', '-rf', 'y'], ['echo', 'a && b'], ['cat']]);
  assert.deepEqual(splitCommands("git commit -m 'git reset --hard'"), [['git', 'commit', '-m', 'git reset --hard']]);
});

test('rm -rf is flagged in every spelling, except for build and temp folders', () => {
  for (const c of ['rm -rf src', 'rm -fr src', 'rm -Rf ~/work', 'rm -r -f data', 'rm --recursive --force data', 'sudo rm -rf /var/lib/x', 'cd a && rm -rf ./app/*'])
    assert.deepEqual(kinds(c), ['delete-files'], c);
  for (const c of ['rm -rf node_modules', 'rm -rf dist build', 'rm -rf ./.next', 'rm -rf /tmp/x', 'rm -rf coverage/*', 'rm file.txt', 'rm -r olddir', 'rm -f one.txt', 'rm -rf'])
    assert.deepEqual(kinds(c), [], c);
  assert.deepEqual(kinds('rm -rf node_modules src'), ['delete-files'], 'one risky target is enough');
});

test('git history rewrites and discards', () => {
  assert.deepEqual(kinds('git reset --hard HEAD~3'), ['reset-hard']);
  assert.deepEqual(kinds('git -C repo reset --hard'), ['reset-hard']);
  assert.deepEqual(kinds('git reset HEAD file'), []);
  assert.deepEqual(kinds('git clean -fd'), ['discard-changes']);
  assert.deepEqual(kinds('git checkout -- .'), ['discard-changes']);
  assert.deepEqual(kinds('git restore .'), ['discard-changes']);
  assert.deepEqual(kinds('git checkout main'), []);
  assert.deepEqual(kinds('git restore --staged file'), []);
});

test('force pushes and branch deletes, but not the safer force-with-lease', () => {
  assert.deepEqual(kinds('git push --force origin main'), ['force-push']);
  assert.deepEqual(kinds('git push -f'), ['force-push']);
  assert.deepEqual(kinds('git push origin +main'), ['force-push']);
  assert.deepEqual(kinds('git push --force-with-lease'), []);
  assert.deepEqual(kinds('git push origin main'), []);
  assert.deepEqual(kinds('git branch -D old'), ['delete-branch']);
  assert.deepEqual(kinds('git branch -d merged'), []);
  assert.deepEqual(kinds('git push origin --delete old'), ['delete-branch']);
  assert.deepEqual(kinds('git push origin :old'), ['delete-branch']);
});

test('dropped data in a database client, but not words in a commit message or echo', () => {
  assert.deepEqual(kinds('psql -c "DROP TABLE users;"'), ['drop-data']);
  assert.deepEqual(kinds('sqlite3 app.db "drop database x"'), ['drop-data']);
  assert.deepEqual(kinds('mysql -e "TRUNCATE TABLE logs"'), ['drop-data']);
  assert.deepEqual(kinds('git commit -m "docs: explain DROP TABLE and git reset --hard"'), []);
  assert.deepEqual(kinds('echo "rm -rf /"'), []);
});

test('a script passed to a shell is read too', () => {
  assert.deepEqual(kinds('bash -lc "git reset --hard"'), ['reset-hard']);
  assert.deepEqual(kinds("zsh -c 'cd x && rm -rf src'"), ['delete-files']);
  assert.deepEqual(kinds('bash script.sh'), []);
});

test('several risky steps in one command are all reported once', () => {
  assert.deepEqual(kinds('git reset --hard && git clean -fd && git push -f'), ['reset-hard', 'discard-changes', 'force-push']);
  assert.deepEqual(kinds('rm -rf a; rm -rf b'), ['delete-files']);
});

test('noteRisky records time, kind and a clipped command, once per kind per call', () => {
  const s = emptySession('/x/s.jsonl');
  assert.equal(s.riskyActions?.length, 0, 'a scanned session starts with an empty list');
  noteRisky(s, '2026-10-01T10:00:00.000Z', 'git reset --hard && git clean -fd ' + 'x'.repeat(400));
  noteRisky(s, '2026-10-01T10:05:00.000Z', 'ls');
  noteRisky(s, '', 'git push -f');
  assert.equal(s.riskyActions!.length, 3, 'a missing time is kept as empty text, never dropped');
  assert.deepEqual(s.riskyActions!.map((a) => a.kind), ['reset-hard', 'discard-changes', 'force-push']);
  assert.ok(s.riskyActions![0].command.length <= 241);
  assert.ok(Object.keys(RISKY_LABEL).length === 6);
});

// ---- found while reading real transcripts ----
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSession } from '../src/parse.ts';
import { redactDeep } from '../src/build.ts';
import { tempDir } from './helpers.ts';

const jl = (...recs: object[]) => recs.map((r) => JSON.stringify(r)).join('\n') + '\n';

test('Claude Code Bash commands are scanned, with the time they ran', async () => {
  const f = join(tempDir(), 's.jsonl');
  writeFileSync(f, jl(
    { type: 'user', sessionId: 's', cwd: '/tmp/demo', timestamp: '2026-05-01T10:00:00.000Z', origin: { kind: 'human' }, message: { role: 'user', content: 'clean up' } },
    { type: 'assistant', timestamp: '2026-05-01T10:00:05.000Z', message: { role: 'assistant', model: 'claude-opus-4-1', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'git reset --hard HEAD~1 && rm -rf node_modules' } }] } },
    { type: 'assistant', timestamp: '2026-05-01T10:00:09.000Z', message: { role: 'assistant', model: 'claude-opus-4-1', content: [{ type: 'tool_use', id: 't2', name: 'Bash', input: { command: 'git push --force origin main' } }, { type: 'tool_use', id: 't3', name: 'Read', input: { file_path: '/x', command: 'rm -rf /' } }] } },
  ));
  const s = await parseSession(f, []);
  assert.deepEqual(s.riskyActions!.map((a) => [a.at, a.kind]), [['2026-05-01T10:00:05.000Z', 'reset-hard'], ['2026-05-01T10:00:09.000Z', 'force-push']]);
});

test('a Claude Code session with only safe commands has an empty list, not a missing one', async () => {
  const f = join(tempDir(), 's.jsonl');
  writeFileSync(f, jl(
    { type: 'user', sessionId: 's', cwd: '/tmp/demo', timestamp: '2026-05-01T10:00:00.000Z', origin: { kind: 'human' }, message: { role: 'user', content: 'hi' } },
    { type: 'assistant', timestamp: '2026-05-01T10:00:05.000Z', message: { role: 'assistant', model: 'claude-opus-4-1', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }] } },
  ));
  assert.deepEqual((await parseSession(f, [])).riskyActions, []);
});



test('secrets in a risky command are redacted with the rest of the session', () => {
  const s = emptySession('/x/s.jsonl');
  noteRisky(s, '2026-05-01T10:00:00.000Z', 'git push --force https://user:hunter2pass@github.com/a/b.git');
  const clean = redactDeep(s);
  assert.doesNotMatch(clean.riskyActions![0].command, /hunter2pass/);
});

test('here-document bodies are text, not commands', () => {
  const commit = "git commit -q -F - <<'EOF'\nclean up\n\ngit branch -D old\nrm -rf /data\nEOF";
  assert.deepEqual(riskyKinds(commit), []);
  assert.deepEqual(riskyKinds("cat > a.md <<'DOC'\nrm -rf /x\nDOC\nrm -rf /x"), ['delete-files'], 'a command after the body still counts');
  assert.deepEqual(riskyKinds("python3 - <<EOF\nprint('git reset --hard')\nEOF"), []);
  assert.deepEqual(riskyKinds("cat <<-EOF\n\tgit push --force\n\tEOF\ngit push -f"), ['force-push'], '<<- allows an indented end marker');
});

test('scratch folders and build output are routine, variables are resolved', () => {
  assert.deepEqual(riskyKinds('S=/private/tmp/claude-501/-Users-me-app/abc/scratchpad; rm -rf $S/profile'), []);
  assert.deepEqual(riskyKinds('D=/tmp/x && rm -rf "${D}/out"'), []);
  assert.deepEqual(riskyKinds('rm -rf apps/storefront/.next ../other/.medusa /tmp/cdp-*'), []);
  assert.deepEqual(riskyKinds('rm -rf apps/web/src'), ['delete-files']);
  assert.deepEqual(riskyKinds('rm -rf replays/*.html'), ['delete-files']);
  assert.deepEqual(riskyKinds('R=/Users/me/data; rm -rf $R'), ['delete-files'], 'a variable that points at real data still counts');
  assert.deepEqual(riskyKinds('rm -rf $UNKNOWN/x'), ['delete-files'], 'an unknown variable is not assumed safe');
});

test('stored commands hide the computer user name and mask secrets', () => {
  const s: any = {};
  noteRisky(s, '2026-01-01T00:00:00Z', 'cd /Users/alex/GitHub/app && rm -rf src/old # /private/tmp/claude-501/-Users-alex-GitHub-app/x token=abcdefghijklmnop1234');
  const c = s.riskyActions[0].command;
  assert.doesNotMatch(c, /alex/);
  assert.match(c, /^cd ~\/GitHub\/app/);
  assert.match(c, /-Users-~-GitHub-app/);
  assert.doesNotMatch(c, /abcdefghijklmnop1234/);
  assert.equal(hidePaths('/home/alex/x and C:\\Users\\Alex\\y'), '~/x and ~\\y');
});

test('each risky action says what it hit', () => {
  const t = (c: string) => { const s: any = {}; noteRisky(s, '2026-01-01T00:00:00Z', c); return s.riskyActions.map((a: any) => [a.kind, a.target]); };
  assert.deepEqual(t('rm -rf apps/web/src docs/old node_modules'), [['delete-files', 'apps/web/src docs/old']]);
  assert.deepEqual(t('git branch -D feat/a feat/b'), [['delete-branch', 'feat/a feat/b']]);
  assert.deepEqual(t('git push origin --delete old-branch'), [['delete-branch', 'origin old-branch']]);
  assert.deepEqual(t('git push --force origin main'), [['force-push', 'origin main']]);
  assert.deepEqual(t('git reset --hard HEAD~2'), [['reset-hard', 'HEAD~2']]);
  assert.deepEqual(t('git checkout -- .'), [['discard-changes', '.']]);
  assert.deepEqual(t("psql -c 'DROP DATABASE IF EXISTS shop_test'"), [['drop-data', 'DROP DATABASE IF EXISTS shop_test']]);
  assert.deepEqual(t('rm -rf /Users/alex/data/x'), [['delete-files', '~/data/x']]);
  assert.deepEqual(t('git push -f origin a && git push origin --delete b'), [['force-push', 'origin a'], ['delete-branch', 'origin b']]);
});

test('redirects are not targets and do not end a command', () => {
  const t = (c: string) => { const s: any = {}; noteRisky(s, '2026-01-01T00:00:00Z', c); return s.riskyActions.map((a: any) => [a.kind, a.target]); };
  assert.deepEqual(t('rm -rf src/old 2>/dev/null; echo done'), [['delete-files', 'src/old']]);
  assert.deepEqual(t('rm -rf src/old > /dev/null 2>&1'), [['delete-files', 'src/old']]);
  assert.deepEqual(t('git branch -D old 2>&1 | tail -1'), [['delete-branch', 'old']]);
  assert.deepEqual(splitCommands('a 2>&1 && b'), [['a', '2>&1'], ['b']]);
});

test('a user name used as a login is hidden too, but not inside longer words', () => {
  assert.equal(hideUser("psql -U alex -h localhost -d db -c 'DROP DATABASE x'", 'alex'), "psql -U [user] -h localhost -d db -c 'DROP DATABASE x'");
  assert.equal(hideUser('postgres://alex@localhost/db user=alex --username alex', 'alex'), 'postgres://[user]@localhost/db user=[user] --username [user]');
  assert.equal(hideUser('git push alex2 my-alex-repo xalex', 'alex'), 'git push alex2 my-alex-repo xalex', 'only the whole name');
  assert.equal(hideUser('cd /x && ls', 'me'), 'cd /x && ls', 'very short names are left alone');
  assert.equal(hideUser('a.b c', 'a.b'), '[user] c', 'dots in a name are literal');
});
