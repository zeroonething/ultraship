# Changelog

All notable changes to UltraShip are recorded here. This project follows
[Semantic Versioning](https://semver.org/).

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
