# AGENTS.md

This file is the single source of agent guidance for this repository — Claude Code, Codex,
Cursor, Copilot, Gemini CLI, and anything else following the AGENTS.md convention. `CLAUDE.md`
is a one-line pointer here; never duplicate guidance into it.

## What this is

UltraShip is a **Claude Code plugin**: a rapid-development framework that turns ideas into
shippable Minimum Complete Releases through five lifecycle skills (`brainstorm → plan →
develop → iterate → complete`). Eight supporting skills sit beside them — `using-ultraship`,
`subagent`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`,
`requesting-code-review`, `receiving-code-review`, `using-git-worktrees` — which move no state
and write no canonical file; `subagent` (added in 2.1) has its own contract in
`shared/subagent-protocol.md`. It has two halves that never mix:

1. **Skills** (`skills/*/SKILL.md`) — Markdown instructions the *agent* follows. No code runs;
   these tell Claude how to drive each lifecycle phase and each supporting discipline.
2. **The `ultraship` CLI** (`bin/ultraship.mjs` + `lib/*.mjs`) — a deterministic Node state
   engine. It reads and checks workspace state, and **never calls a model and never touches the
   network** (`README.md:60`). Skills invoke it for every fact they need; it is the referee.

## Commands

```bash
npm test                                    # full suite (node --test on test/*.test.mjs), Node 20+
node --test test/validate.test.mjs          # one test file
node --test --test-name-pattern="migrate"   # tests matching a name
node bin/ultraship.mjs state                # run the CLI against this repo's own workspace
node bin/ultraship.mjs validate             # check every canonical file + cross-file rules
```

No build step, no lint config, no install step — the one dependency (`yaml`) is vendored under
`vendor/`. Every CLI command prints JSON to stdout, diagnostics to stderr, and returns an exit
code (`bin/ultraship.mjs:2`). `validate` and `deploy` exit non-zero on failure; that exit code
*is* the gate skills rely on.

## Architecture

**The CLI is a thin dispatcher over `lib/`.** `bin/ultraship.mjs` maps each command to one
`lib/*.mjs` module — the real logic lives there, one concern per file (`state`, `transition`,
`validate`, `deploy`, `migrate`, `semver`, `lock`, `constraints`, `product`, `init`, `views`,
`commit`, `wave`).

**Workspace state lives in `.ultraship/` in the user's repo**, not here — except that this repo
**dogfoods itself**: `.ultraship/products/ultraship/` is UltraShip's own live product state,
managed by its own CLI. That workspace is gitignored and local-only: it is never pushed, so a
fresh clone has none of it and CI cannot run `ultraship validate` — run it yourself.
`lib/paths.mjs` is the single source of truth for every path inside a workspace; never
hardcode a `.ultraship/...` path, derive it from `paths(root)`.

**One state per product, changed only through the transition table.** `lib/state.mjs` holds the
frozen `TRANSITIONS` map (`UNINITIALIZED → BRAINSTORMING → … → RELEASED`); `transition` refuses
any move the table forbids. `RELEASED` is a one-way door — it moves forward into the next
version, never back into the shipped version's cycle. `snapshot(root)` is the one cheap call
that gives a skill everything it needs before acting (current state, active release, allowed
transitions, next command). The same table is mirrored for humans in `shared/state-model.md`;
keep them in sync.

**Released records are immutable by mechanism, not instruction.** `lib/lock.mjs` pins each
released file's SHA-256 in `.ultraship/releases.lock`; `validate` fails if a released file
changes. Corrections require a new version, never an edit. Re-recording an existing key throws.

**Everything canonical is schema-checked.** JSON Schemas live in `schemas/*.schema.json`;
`lib/schema.mjs` is a **hand-rolled interpreter for the subset those schemas use** (type,
required, properties, enum, const, pattern, items, minItems — no `$ref`/`allOf`/`oneOf`/format).
If a schema ever needs more, swap this module for ajv — the `validate()` signature is the
designed seam. Same pattern for YAML: **all reads/writes go through `lib/yaml.mjs`**, so
swapping the vendored parser touches exactly one file.

**`views` are derived, never authoritative.** `lib/views.mjs` regenerates the Markdown files in
`.ultraship/views/` from canonical YAML. Never hand-edit a view; change the source and rerun.

## The test suite enforces the docs, not only the code

Most of `test/` is not unit tests — it is a **coupling guard between code, prose, and manifests**.
Expect a change in one place to fail a test in a file you never touched:

- `shared.test.mjs` — the prose in `shared/` is checked against the code: every state and legal
  move, all four completion modes, all twenty principles, every checkpoint the registry defines,
  all seven skill-contract steps.
- `skills.test.mjs` — every skill has a `SKILL.md`, frontmatter `name` matches its directory (so
  `/ultraship:<dir>` resolves), every referenced sibling file exists, no `superpowers` namespace
  survives, `NOTICE` lists every inherited skill.
- `install.test.mjs` — the README must document **every** CLI command and **every** shipped skill,
  the CHANGELOG must record this release, and no AI attribution may appear anywhere in the tree.
- `packaging.test.mjs` — `package.json`, `.claude-plugin/`, `.codex-plugin/`, and every harness
  manifest must declare one identical version; runtime dependencies must stay at zero.
- `harness.test.mjs` — each hook branch, the Codex action mapping covering every action the skill
  bodies use, and the workflows keeping least privilege with every action pinned by SHA.
- `compat.test.mjs` — every historical `schema_version` (and an absent one) migrates to current
  and then validates.

So: add a command → update the README. Add a principle → update `shared/principles.md`. Add a
skill → update `NOTICE` and the README. Bump the version → bump every manifest. `npm test` is the
gate that catches all of it.

## The session hook bootstraps per harness

`hooks/hooks.json` registers `hooks/session-start` on `startup|clear|compact`; the script inlines
`skills/using-ultraship/SKILL.md` into the session. It picks the output field **by environment
variable** and must emit exactly one — `additional_context` for Cursor (`CURSOR_PLUGIN_ROOT`),
nested `hookSpecificOutput.additionalContext` for Claude Code, top-level `additionalContext` for
Copilot CLI and the SDK default — because Claude Code reads both forms without deduplication.
`harness.test.mjs` pins every branch.

## The public contract (this matters most)

UltraShip 2.x has a **frozen, enumerated public contract**: the twelve CLI commands, the skills,
and the ten `.ultraship/` schemas (`docs/CONTRACT.md`). **Changing any of them is a major
version.** Additive backward-compatible changes are minor; fixes are patch. Before altering a
command's flags/output, a skill's behavior, or a schema, know which SemVer bump it forces and
whether it needs a `migrate` step and a deprecation window (`docs/COMPATIBILITY.md`).

- `ultraship migrate` (`lib/migrate.mjs`) must stay **forward-only and idempotent** — it carries
  any workspace up to the installed version with no manual edits.
- `version_files` in `ultraship.yaml` lists manifests outside `.ultraship/` that carry the
  project version; `validate` holds them all to the greatest released version. When you bump the
  release, every declared file (`package.json`, `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`) must match or `validate` fails.

## Conventions

- **ESM only** (`"type": "module"`), `.mjs`, Node 20+ stdlib. Vendoring over new dependencies —
  keep the zero-install guarantee.
- **`vendor/` is never edited.** It is unmodified third-party code (currently npm `yaml` 2.9.0);
  upgrading means re-vendoring with `npm pack` and rerunning `npm test`, never patching in place
  (`vendor/README.md`). `vendor/` is excluded from this repository's code scanning for exactly
  that reason. An advisory naming a vendored package is answered by re-vendoring the fixed
  upstream release; `SECURITY.md` holds the full policy and records how the exclusion is
  currently carried.
- **`ponytail:` comments mark deliberate simplifications** with their upgrade seam (e.g. the ajv
  seam in `lib/schema.mjs`). Respect the seam; don't pre-build past it.
- **A harness port adds an entry point, a bootstrap where the harness needs one, and a
  mapping — and never edits a skill body.** Skill bodies name actions ("invoke the CLI",
  "create an isolated workspace"), not tools; that is what lets one body run everywhere.
  The per-harness answer lives in `skills/using-ultraship/references/<harness>-tools.md`.
  Entry points and bootstraps (`.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`,
  `hooks/`) are distribution artifacts outside the frozen contract, so a harness changing
  its own manifest format is a patch or minor release, never a major one
  (`docs/CONTRACT.md`). Releases are cut by `.github/workflows/release.yml` from a pushed
  tag; the procedure is `docs/RELEASING.md`.
- Skills in `skills/` share prose contracts in `shared/` (`principles.md`, `state-model.md`,
  `release-contract.md`, `skill-contract.md`, `commit-protocol.md`, `subagent-protocol.md`).
  Behavior described there is the contract the CLI enforces — change both together.
