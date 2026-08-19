# UltraShip on Codex

UltraShip's skills name actions, never tools. This file is the mapping from every
action they name to what Codex offers for it. Two of those actions are UltraShip's
alone: no other skills framework ships a binary, and the lifecycle skills invoke
`ultraship` 61 times across 11 commands — starting with the first instruction of
every one of them.

## Coverage

Every action below must have a row in the mapping table. A test fails when one
does not.

- run the ultraship CLI
- create an isolated workspace
- dispatch a subagent
- load another skill
- track a todo
- read a file
- write a file
- run a command

## Mapping

| Action | On Codex |
| --- | --- |
| run the ultraship CLI | `node "$ULTRASHIP_ROOT/bin/ultraship.mjs" <command>`, where `$ULTRASHIP_ROOT` is the install root — see [Locating the CLI](#locating-the-cli). If the developer installed the optional PATH shim, plain `ultraship <command>` works and is preferred. |
| create an isolated workspace | `git worktree add ../<name> -b <branch>` run through the shell, after the [environment detection](#environment-detection) below. Codex has no worktree tool; the plain git command is the tool. In a sandbox that blocks it, see [Codex App finishing](#codex-app-finishing). |
| dispatch a subagent | `spawn_agent`, then `wait_agent`, then `close_agent`. Requires `multi_agent` — see [Enabling subagents](#enabling-subagents). Always close every agent you spawned. |
| load another skill | Codex discovers skills natively and loads them by name from the plugin's `skills/` directory. There is no separate Skill tool call to make. |
| track a todo | `update_plan`. One plan step per checklist item, the same granularity the skill's checklist uses. |
| read a file | The shell: `cat`, `sed -n '<range>p'`, `rg`. Codex has no dedicated read tool. |
| write a file | `apply_patch`. Prefer it over shell redirection so the change is reviewable. |
| run a command | The shell, which is sandboxed and read-only by default. A command that writes outside the workspace, or reaches the network, needs the developer's approval or a sandbox change. |

## Locating the CLI

The CLI ships inside the install artifact, so it is always next to the skills that
call it. Codex installs a plugin to:

```
~/.codex/plugins/cache/<marketplace>/<plugin>/<version>
```

That root holds the whole repository — `bin/`, `lib/`, and the vendored `yaml`
parser — so the CLI runs from it with no install step and no network:

```bash
ULTRASHIP_ROOT=$(printf '%s\n' ~/.codex/plugins/cache/*/ultraship/* | sort -V | tail -1)
node "$ULTRASHIP_ROOT/bin/ultraship.mjs" state
```

Hook commands receive `CLAUDE_PLUGIN_ROOT`, which points at the same place; the
shell a skill runs in does not, which is why the path is derived above rather than
read from the environment.

Node 20 or newer is the only requirement. The CLI calls no model and touches no
network.

## Enabling subagents

Add to `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

This enables `spawn_agent`, `wait_agent`, and `close_agent`, which
`/ultraship:subagent` needs. Without it, UltraShip runs one task at a time, which
is its default anyway — parallel work happens only when the developer asks for it.

## Environment Detection

Skills that create worktrees or finish branches should detect their
environment with read-only git commands before proceeding:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → already in a linked worktree (skip creation)
- `BRANCH` empty → detached HEAD (cannot branch/push/PR from sandbox)

See `using-git-worktrees` Step 0 and `finishing-a-development-branch`
Step 1 for how each skill uses these signals.

## Codex App Finishing

When the sandbox blocks branch/push operations (detached HEAD in an
externally managed worktree), the agent commits all work and informs
the user to use the App's native controls:

- **"Create branch"** — names the branch, then commit/push/PR via App UI
- **"Hand off to local"** — transfers work to the user's local checkout

The agent can still run tests, stage files, and output suggested branch
names, commit messages, and PR descriptions for the user to copy.

`ultraship commit` is safe in any of these situations: it stages and commits
only, never pushes, branches, or tags, and it is a no-op that exits 0 when the
workspace is gitignored or the policy is `off`.
