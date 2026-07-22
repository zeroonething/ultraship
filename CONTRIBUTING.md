# Contributing to UltraShip

Thanks for wanting to improve UltraShip. This guide gets you from a clone to a
mergeable pull request. It is short on purpose — the deep detail lives in
[`CLAUDE.md`](CLAUDE.md), [`docs/CONTRACT.md`](docs/CONTRACT.md), and
[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md), and this guide points at them
rather than repeating them.

If you want to see UltraShip drive its own change, read
[Contributing with UltraShip](docs/CONTRIBUTING-WITH-ULTRASHIP.md) — the framework
used on itself.

## The two halves

UltraShip is a Claude Code plugin with two halves that never mix. Know which one
your change touches before you start:

1. **Skills** (`skills/*/SKILL.md`) — Markdown instructions the *agent* follows.
   No code runs here. These tell Claude how to drive each lifecycle phase
   (`brainstorm → plan → develop → iterate → complete`). Editing a skill changes
   agent behaviour, not program behaviour.
2. **The `ultraship` CLI** (`bin/ultraship.mjs` + `lib/*.mjs`) — a deterministic
   Node state engine. It reads and checks workspace state and **never calls a
   model and never touches the network**. Skills invoke it for every fact they
   need; it is the referee.

Shared prose contracts live in `shared/` (`principles.md`, `state-model.md`,
`release-contract.md`, `skill-contract.md`). Behaviour described there is what the
CLI enforces — if you change one, change both.

## Local development

No build step, no install step, no lint config. The one dependency (`yaml`) is
vendored under `vendor/`, so there is nothing to `npm install`.

Requirements: **Node 20 or newer**.

```bash
npm test                                    # full suite (node --test on test/*.test.mjs)
node --test test/validate.test.mjs          # one test file
node --test --test-name-pattern="migrate"   # tests matching a name

node bin/ultraship.mjs state                # run the CLI against this repo's own workspace
node bin/ultraship.mjs validate             # check every canonical file + cross-file rules
```

This repo **dogfoods itself**: `.ultraship/products/ultraship/` is UltraShip's own
live product state, managed by its own CLI. `ultraship validate` must exit `0`
before you open a pull request.

## Classify your change — it decides the version bump

UltraShip 1.0 has a **frozen, enumerated public contract**
([`docs/CONTRACT.md`](docs/CONTRACT.md)): the ten CLI commands, the skills, and
the ten `.ultraship/` schemas. Which part you touch decides the SemVer bump, and
the rules are stated in full in
[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md):

- **Major** — removing or changing the behaviour of a command, a skill's
  workflow, or a schema's shape. Only allowed for something deprecated in a prior
  minor, and it needs an `ultraship migrate` step.
- **Minor** — adding a command, an optional schema field, a skill, or a validate
  check that only rejects genuinely inconsistent state. Never breaks an existing
  `1.x` workspace.
- **Patch** — fixes only, no contract change.

If your change touches the contract, say which bump it forces in your pull
request and whether it needs a `migrate` step. If you are unsure, open an issue
first — it is cheaper than a rejected PR.

Conventions the CLI enforces, so don't fight them: released records are immutable
(a correction is a new version, never an edit); `lib/paths.mjs` is the only place
that knows `.ultraship/` paths; all YAML goes through `lib/yaml.mjs`; views are
derived, never hand-edited. `ponytail:` comments mark deliberate simplifications
with their upgrade seam — respect the seam, don't pre-build past it.

## Pull request workflow

1. Fork and branch from `main` (`feat/...`, `fix/...`, or `docs/...`).
2. Make the change. Add or update tests under `test/` for any CLI/`lib` behaviour
   — write the failing test first, watch it fail, then make it pass.
3. Run `npm test` and `node bin/ultraship.mjs validate`. Both must pass.
4. Open a pull request. Fill in the template: what changed, the SemVer
   classification, and the test evidence. CI runs `npm test` on every PR.
5. A maintainer reviews and merges. Please keep PRs small and single-purpose — one
   coherent change is far easier to review and release.

## Reporting bugs and requesting features

Use the issue templates under [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE).
For anything security-related, do **not** open a public issue — follow
[`SECURITY.md`](SECURITY.md).

By contributing you agree your work is licensed under the project's
[MIT License](LICENSE), and to uphold the
[Code of Conduct](CODE_OF_CONDUCT.md).
