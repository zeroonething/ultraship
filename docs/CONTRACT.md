# The UltraShip 2.0 public contract

This is the frozen public surface of UltraShip 2.0, as extended by 2.1.
**Changing any item listed
here is a major version.** Backward-compatible additions (a new command, a new
optional field, a new skill) are a minor version; backward-compatible fixes are a
patch. Anything not listed here — internal module layout, private helpers, log
wording — is not part of the contract and may change in any release.

The workspace declares which canonical-state shape it is on through
`schema_version` in `.ultraship/ultraship.yaml`. It is still `1`: the ten state
schemas did not break in 2.0, so a 1.x workspace's data is valid data here. The
2.0 break is behavioural, not structural — see
[COMPATIBILITY.md](COMPATIBILITY.md).

## CLI commands (12)

Each command reads and checks local canonical state. None calls a model or
touches the network.

| Command | Purpose |
| --- | --- |
| `ultraship init` | Scaffold `.ultraship/` and a project `.gitignore` in the current directory. |
| `ultraship state` | Print the active product's state, active release, every product's state, and legal next steps as JSON. |
| `ultraship transition <STATE> [product]` | Move a product's lifecycle to a new state, refusing any move the state model forbids. |
| `ultraship product <add\|use> <id> [name]` | Register a new product or switch which product is active. |
| `ultraship migrate` | Bring a workspace up to the current schema and framework version. Idempotent. |
| `ultraship constraints <set\|show> [--time T] [--budget B] [--capacity C]` | Record or print the user's real limits on the active release, as user estimates. |
| `ultraship commit <checkpoint> [product] [version] [--task ID]` | Commit the working skills' own output at one checkpoint, staging only that checkpoint's declared paths. Local only: never pushes, branches, or tags. A no-op when `commit_policy` is `off`. |
| `ultraship wave [product] [version]` | Print the tasks that may run concurrently right now — every dependency `done`, declared `files` disjoint — and the reason each held task was excluded. Computes only; it dispatches nothing. |
| `ultraship deploy [product] [version]` | Run the declared `delivery_hooks` command for the release's target mode, capture its output as evidence, and exit non-zero if it fails. |
| `ultraship validate` | Check every canonical file against its schema and the cross-file integrity rules. Exit non-zero on any violation. |
| `ultraship views` | Regenerate the readable Markdown summaries in `.ultraship/views/`. |
| `ultraship semver next <version> <bump>` | Compute the next version. |

## Skills

The five core skills define the workflow:

`brainstorm` → `plan` → `develop` → `iterate` → `complete`.

Supporting skills: `using-ultraship`, `subagent`, `systematic-debugging`,
`test-driven-development`, `verification-before-completion`,
`requesting-code-review`, `receiving-code-review`, `using-git-worktrees`.

`subagent` (added in 2.1) is the one place UltraShip fans work out to concurrent
agents. It is a supporting skill, not a lifecycle phase: it moves no state and
writes no canonical file, and it runs only when the developer asks for it —
directly, in-session, or by recording the preference. See
[shared/subagent-protocol.md](../shared/subagent-protocol.md).

## Canonical state schemas (10)

Every file under `.ultraship/` is validated against one of these. A fact belongs
to exactly one file; writing it elsewhere fails validation.

| Schema | Owns |
| --- | --- |
| `ultraship.schema.json` | Framework config: `schema_version`, `framework_version`, resource profile, optional `commit_policy`, `version_files`, and `delivery_hooks`. |
| `workspace.schema.json` | Workspace identity and the active product. |
| `product.schema.json` | A product's canonical definition. |
| `lifecycle.schema.json` | A product's lifecycle state. |
| `roadmap.schema.json` | Planned versions, their order, outcomes, and status. |
| `release.schema.json` | One version's contract and, once shipped, its immutable record. |
| `active.schema.json` | The execution pointer: active version, state, constraints, release fit. |
| `tasks.schema.json` | Just-in-time tasks for the active release. |
| `iteration.schema.json` | A recorded plan change with its evidence and approval. |
| `checkpoint.schema.json` | A safe pause point. |

## What is guaranteed

- A 2.x release never breaks a 2.x workspace. `ultraship validate` on a workspace
  written by any 2.x release still exits 0 on a later 2.x release.
- `ultraship migrate` carries any earlier workspace, back to the pre-1.0 releases,
  to the installed version with no manual edits — including pinning
  `commit_policy` to `off` so a 1.x project does not start committing without
  being asked.
- Released records are immutable; a change requires a new version.

See [COMPATIBILITY.md](COMPATIBILITY.md) for how change is announced and deprecated.
