# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

UltraShip is a **Claude Code plugin**: a rapid-development framework that turns ideas into
shippable Minimum Complete Releases through five skills (`brainstorm → plan → develop →
iterate → complete`). It has two halves that never mix:

1. **Skills** (`skills/*/SKILL.md`) — Markdown instructions the *agent* follows. No code runs;
   these tell Claude how to drive each lifecycle phase.
2. **The `ultraship` CLI** (`bin/ultraship.mjs` + `lib/*.mjs`) — a deterministic Node state
   engine. It reads and checks workspace state, and **never calls a model and never touches the
   network** (`README.md:50`). Skills invoke it for every fact they need; it is the referee.

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
`validate`, `deploy`, `migrate`, `semver`, `lock`, `constraints`, `product`, `init`, `views`).

**Workspace state lives in `.ultraship/` in the user's repo**, not here — except that this repo
**dogfoods itself**: `.ultraship/products/ultraship/` is UltraShip's own live product state,
managed by its own CLI. `lib/paths.mjs` is the single source of truth for every path inside a
workspace; never hardcode a `.ultraship/...` path, derive it from `paths(root)`.

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

## The public contract (this matters most)

UltraShip 1.0 has a **frozen, enumerated public contract**: the ten CLI commands, the skills,
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
- **`ponytail:` comments mark deliberate simplifications** with their upgrade seam (e.g. the ajv
  seam in `lib/schema.mjs`). Respect the seam; don't pre-build past it.
- Skills in `skills/` share prose contracts in `shared/` (`principles.md`, `state-model.md`,
  `release-contract.md`, `skill-contract.md`). Behavior described there is the contract the CLI
  enforces — change both together.
