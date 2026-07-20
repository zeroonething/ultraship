# Changelog

All notable changes to UltraShip are recorded here. This project follows
[Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/aakashpawar1999/ultraship/releases/tag/v0.1.0
