# The UltraShip 1.0 public contract

This is the frozen public surface of UltraShip 1.0. **Changing any item listed
here is a major version.** Backward-compatible additions (a new command, a new
optional field, a new skill) are a minor version; backward-compatible fixes are a
patch. Anything not listed here — internal module layout, private helpers, log
wording — is not part of the contract and may change in any release.

The workspace declares which contract it is on through `schema_version` in
`.ultraship/ultraship.yaml`. UltraShip 1.0 is `schema_version: 1`.

## CLI commands (10)

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
| `ultraship deploy [product] [version]` | Run the declared `delivery_hooks` command for the release's target mode, capture its output as evidence, and exit non-zero if it fails. |
| `ultraship validate` | Check every canonical file against its schema and the cross-file integrity rules. Exit non-zero on any violation. |
| `ultraship views` | Regenerate the readable Markdown summaries in `.ultraship/views/`. |
| `ultraship semver next <version> <bump>` | Compute the next version. |

## Skills

The five core skills define the workflow:

`brainstorm` → `plan` → `develop` → `iterate` → `complete`.

Supporting skills: `using-ultraship`, `systematic-debugging`,
`test-driven-development`, `verification-before-completion`,
`requesting-code-review`, `receiving-code-review`, `using-git-worktrees`.

## Canonical state schemas (10)

Every file under `.ultraship/` is validated against one of these. A fact belongs
to exactly one file; writing it elsewhere fails validation.

| Schema | Owns |
| --- | --- |
| `ultraship.schema.json` | Framework config: `schema_version`, `framework_version`, resource profile, optional `version_files` and `delivery_hooks`. |
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

- A 1.x release never breaks a 1.x workspace. `ultraship validate` on a workspace
  written by any 1.x release still exits 0 on a later 1.x release.
- `ultraship migrate` carries any pre-1.0 workspace to 1.0 with no manual edits.
- Released records are immutable; a change requires a new version.

See [COMPATIBILITY.md](COMPATIBILITY.md) for how change is announced and deprecated.
