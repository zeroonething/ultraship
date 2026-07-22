# Changelog

All notable changes to UltraShip are recorded here. This project follows
[Semantic Versioning](https://semver.org/).

## [0.5.0] — 2026-07-22

Deployment and publication are now backed by a command that actually ran. A
`published`, `staging-deployed`, or `production-deployed` release used to be an
honour system — completion told the agent to "achieve the mode or record what
happened," but nothing ran the deployment or checked it. Projects now declare
the command that reaches each mode, and completion runs it, captures the real
output as evidence, and refuses the deployed mode if it fails. The CLI still
calls no model, opens no network connection of its own, and carries zero runtime
dependencies.

### Added

- `ultraship deploy [product] [version]` runs the declared command for the
  release's `target_mode`, exporting `VERSION`, `PRODUCT`, and `MODE`, captures
  its stdout, stderr, and exit code under `evidence/<version>/`, and runs an
  optional post-deploy smoke command on success. A non-zero exit makes the
  command exit non-zero so completion refuses the deployed mode.
- An optional `delivery_hooks` block on `ultraship.yaml`: per target mode, a
  `deploy` command and an optional `smoke` command.
- This workspace dogfoods it, declaring its own GitHub-release publish hook — and
  0.5.0 itself was published through that hook.

### Changed

- `complete` runs `ultraship deploy` for the target mode, folds the captured
  deployment and health-check evidence into the record, and gates the mode on
  the exit code rather than trusting a hand-typed claim.
- The README documents the `delivery_hooks` declaration and how completion runs
  and gates it.

### Notes

- The framework opens no network connection of its own; it spawns the project's
  declared command, whose behaviour is the project's. Absent a `delivery_hooks`
  block, completion behaves exactly as in 0.4.0 — the block is additive and no
  schema field became required.

## [0.4.0] — 2026-07-22

Release integrity is now mechanically enforced. `ultraship validate` checks the
invariants a completed release must satisfy instead of leaving them for an agent
to remember: roadmap and release-record status must agree, no shipped version may
still hold an execution pointer, and every declared version-bearing file must
carry the release version. The two defects found while dogfooding 0.2.0 and
0.3.0 — a roadmap left at "planned" with a stale `DEVELOPING` pointer, and plugin
manifests left a version behind the code — now fail validation instead of
slipping through. The CLI still calls no model, touches no network, and carries
zero runtime dependencies.

### Added

- Three integrity checks in `ultraship validate`: released-record ↔ roadmap
  status coherence, no execution pointer on an already-released version, and
  declared-version-file coherence — each failing with a named contradiction.
- An optional `version_files` block on `ultraship.yaml` declaring the files
  outside `.ultraship/` that carry the project's version. Each is held to the
  greatest released version. `path` is project-root-relative; `key` is a JSON
  dot-path where a numeric segment indexes an array.
- This workspace dogfoods the check, declaring `package.json` and both
  `.claude-plugin` manifests.

### Changed

- `complete` leans on `ultraship validate` for the three invariants rather than
  instructing the agent to hand-check them, and reminds the operator to bump the
  declared version files before `transition RELEASED`.
- The README documents the version-file declaration and the three checks.

### Notes

- The version-file check tolerates a released roadmap entry that has no release
  record at all (a genesis or outline version), which stays governed by the
  existing specified-detail rule. Absent a `version_files` block, a workspace
  behaves exactly as in 0.3.0 — the checks are additive, no schema field became
  required.

## [0.3.0] — 2026-07-21

Release fit grounded in real constraints. A developer records the actual limits
on a release — a deadline, a budget, remaining subscription capacity — and
`develop` and `iterate` assess fit against them and recommend the fallback scope
when the work no longer fits, instead of guessing. The figures are stored as
user estimates and never rendered as measured; the framework still calls no
model and touches no network. This release also fixes three state-hygiene gaps
found while dogfooding 0.2.0.

### Added

- `ultraship constraints set [--time T] [--budget B] [--capacity C]` and
  `ultraship constraints show` record the user's real limits on the active
  release. Stored on the execution pointer, always tagged `user-estimate`.
- An optional `constraints` block on the active-execution schema.
- `ultraship state` and the active-releases view surface recorded constraints
  with their `user-estimate` source.

### Changed

- `develop` and `iterate` ground release fit in recorded constraints: the
  assessment names a constraint and recommends `fallback_scope` when the scope
  exceeds the recorded limits. With no constraints recorded, fit is assessed
  qualitatively exactly as before — the block is additive.
- `ultraship transition RELEASED` now finalizes a shipped version's state: it
  marks the version `released` in `roadmap.yaml` and archives the execution
  pointer to `execution/archive/<version>.yaml`, so no shipped release keeps
  reading `execution_state: DEVELOPING`. `complete` no longer hand-edits either.
- `ultraship migrate` brings `ultraship.yaml`'s `framework_version` up to the
  installed release; `ultraship init` records the installed version rather than
  a literal.

### Known limitations

- Constraints are free text — the framework cannot observe units, so it stores
  and echoes them without interpreting or comparing them numerically.
- No provider telemetry. Fit remains qualitative; only user-supplied estimates
  ground it.

## [0.2.0] — 2026-07-21

Several independent products from one workspace. Each product runs on its own
lifecycle and release track, so one can be in development while another is
planned or released — their states never compete. Release bundles, shared
capabilities, and cross-product dependency validation are deliberately out of
scope for a solo developer with independent projects.

### Added

- Per-product `lifecycle.yaml` (new schema) owning each product's state,
  resume target, and blockers.
- `ultraship product add <id> [name]` and `ultraship product use <id>` to
  register and select products.
- `ultraship migrate` to move a 0.1.0 workspace's single state onto its active
  product's lifecycle. Idempotent.
- `ultraship transition <STATE> [product]` now targets a named product,
  defaulting to the active one.
- Workspace-brief view gains per-product State and Latest release columns.

### Changed

- Lifecycle state moved off `workspace.yaml` onto each product. `ultraship state`
  reports the active product's state and every product's state.
- `brainstorm` registers products through `ultraship product add`.

### Migration

- A workspace created by 0.1.0 must run `ultraship migrate` once. It moves the
  single workspace state onto the active product's lifecycle and strips the
  legacy fields; nothing else changes.

### Known limitations

- No coordinated cross-product releases or shared capabilities by design.
- `release-ready`/`published` are the exercised completion modes; staging and
  production deployment hooks arrive in 0.4.0.
- No provider telemetry; resource-aware execution arrives in 0.3.0.

## [0.1.0] — 2026-07-21

Single-product release workflow. A user can install UltraShip, turn a vague idea
into a canonical product definition, receive a SemVer roadmap of complete
outcomes, develop against a release contract, change the plan with a traceable
record, and complete a release whose record cannot afterwards be silently edited.

### Added

- `ultraship` CLI with `init`, `state`, `transition`, `validate`, `semver`, and `views`.
- Nine JSON Schemas covering the canonical files of a single-product workspace.
- SHA-256 pinning of released records, so edits to a released version fail validation.
- Generated Markdown views derived from canonical state.
- The five skills: `/ultraship:brainstorm`, `plan`, `develop`, `iterate`, `complete`.
- Six engineering skills inherited from Superpowers, plus the session hook.
- Shared reference documents for the state model, release contract, skill contract, and principles.

### Known limitations

- Single product per workspace. Multi-product portfolios arrive in 0.2.0.
- `release-ready` is the only completion mode exercised end to end. The other
  three modes are defined and validated, but deployment hooks arrive in 0.4.0.
- No provider telemetry. Release fit is qualitative by design; resource-aware
  execution arrives in 0.3.0.
- Claude Code is the only supported agent tool. Codex and OpenCode adapters are
  not built.

[0.2.0]: https://github.com/zeroonething/ultraship/releases/tag/v0.2.0
[0.1.0]: https://github.com/zeroonething/ultraship/releases/tag/v0.1.0
