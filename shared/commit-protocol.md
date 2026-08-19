# The commit protocol

The working skills commit their own output. `plan`, `develop`, `iterate`, and
`complete` each run `ultraship commit <checkpoint>` at the points below, so the
roadmap, the contract, every finished task, every recorded plan change, and the
immutable release record land as separate, readable commits instead of one
undifferentiated working tree at the end.

Skills read this file rather than restating it. The checkpoint list here and the
registry in `lib/commit.mjs` are the same list; change both together.

## The policy decides whether anything happens

`commit_policy` in `.ultraship/ultraship.yaml` is `checkpoint` or `off`.

- **Absent** means `checkpoint` for a workspace created by 2.0 or later, and
  `off` for one carried over from 1.x. Only `ultraship init` ever writes the
  field, so an absent value identifies a workspace that predates the protocol.
- `ultraship migrate` writes `off` into any workspace that omits it. An existing
  project therefore never starts committing without being asked.

When the policy is `off`, every checkpoint is a no-op that exits 0. So are a
directory that is not a git repository, a machine with no `git` on `PATH`, a
checkpoint whose paths hold no change, and a checkpoint whose paths the project
gitignores — a workspace that keeps `.ultraship/` local-only is the usual case,
and the ignored paths are dropped rather than staged. **Call the checkpoints
unconditionally.**
Do not check the policy first and do not branch on it — the command already does,
and a skill that guesses will guess wrong.

## The checkpoints

| Checkpoint | Run it | Stages | Subject |
| --- | --- | --- | --- |
| `plan-roadmap` | after `roadmap.yaml` is written | `roadmap.yaml`, `views/` | `chore(plan): update the <product> roadmap` |
| `plan-contract` | after the release contract is written and validated | `releases/<version>.yaml`, `lifecycle.yaml`, `views/` | `chore(plan): specify <product> <version>` |
| `develop-tasks` | after `active.yaml` and `tasks.yaml` are generated | `active.yaml`, `tasks.yaml`, `lifecycle.yaml`, `views/` | `chore(develop): plan tasks for <product> <version>` |
| `develop-task` | each time a task reaches `done` with its evidence recorded | `tasks.yaml` and that task's own `files` | `chore(develop): <task summary>`, with `Task: <id>` in the body |
| `develop-checkpoint` | after a checkpoint file is written | `checkpoints/`, `tasks.yaml` | `chore(develop): checkpoint <product> <version>` |
| `iterate` | after the iteration record and every affected canonical file are written | `iterations/`, the whole product directory, `views/` | `chore(iterate): record plan change for <product> <version>` |
| `complete-release` | last, after the record, `releases.lock`, and the `version_files` bumps | `releases/<version>.yaml`, `releases.lock`, the product directory, `views/`, every declared version file | `chore(release): <product> <version>` |

`develop-task` is the only checkpoint that needs an argument:

```bash
ultraship commit develop-task --task US-CLIENT-TRACKER-0.1.0-T04
```

It stages the task's implementation and its recorded evidence in one commit, which
is what makes a single task reviewable and revertible on its own.

`complete-release` runs **last**. Everything the release record depends on —
the record itself, its lock entry, and every file listed in `version_files` —
must already be written, or the shipped commit is internally inconsistent.

## What the command will not do

`ultraship commit` stages and commits. It never pushes, never creates a branch,
and never creates a tag: `lib/commit.mjs` permits exactly five git subcommands
(`rev-parse`, `status`, `add`, `check-ignore`, `commit`) and refuses any other, so
nothing it does can leave the machine. Pushing, tagging, and opening a pull request stay the
developer's own authorized steps.

It never runs `git add -A`. Each checkpoint stages an explicit path list derived
from canonical state, and the commit carries a pathspec, so a developer's
unrelated working changes are never swept into an UltraShip commit even when they
were already staged.

The message carries no co-author line and no tool-attribution trailer.

## Reading the result

Every checkpoint prints JSON. `committed` says whether a commit was made,
`reason` says why not when it was not, `staged` lists exactly what went in, and
`sha` is the resulting commit.

```json
{
  "product": "client-tracker",
  "version": "0.1.0",
  "checkpoint": "develop-task",
  "policy": "checkpoint",
  "committed": true,
  "staged": ["src/invoice.mjs", ".ultraship/products/client-tracker/execution/tasks.yaml"],
  "subject": "chore(develop): Create the invoices table",
  "sha": "…"
}
```

`staged` lists what the checkpoint may actually stage, which is its declared
paths minus anything the project gitignores.

Read `staged` when a task's `files` list is uncertain. A task whose implementation
is missing from the commit had an incomplete `files` list, and the JSON makes that
visible rather than silent.
