# Changelog

All notable changes to UltraShip are recorded here. This project follows
[Semantic Versioning](https://semver.org/).

## [2.3.0] — 2026-08-19

Two harnesses, a CLI that resolves, and a release that cuts itself. UltraShip now
installs on Codex as well as Claude Code, and on both the `ultraship` command is
reachable from a documented install instead of a hand-written shell function. The
release procedure moves out of one machine's gitignored workspace file into a
reviewed workflow. No CLI command, skill behaviour, schema, or canonical field
changed, so a 2.2.0 workspace is valid on 2.3.0 with no migration beyond
`framework_version`.

### Added

- **Codex support.** `.codex-plugin/plugin.json` declares the skills directory,
  the session-start hook, and the `interface` block Codex requires;
  `.agents/plugins/marketplace.json` is the marketplace entry Codex installs
  through (`codex plugin marketplace add zeroonething/ultraship`, then
  `codex plugin add ultraship@ultraship`). Codex runs the same `hooks/hooks.json`
  and reads the same `hookSpecificOutput.additionalContext` field Claude Code
  does, so the existing hook serves both harnesses and no Codex-specific
  bootstrap ships.
- **A real Codex tool mapping.** `skills/using-ultraship/references/codex-tools.md`
  had no table rows. It now answers all eight actions the skills name — running
  the CLI, creating an isolated workspace, dispatching a subagent, loading a
  skill, tracking a todo, reading, writing, and running a command — with its own
  coverage list checked by test. The two actions no mapping in this repository
  covered are the two the skills name most: the CLI, invoked 61 times across 11
  commands, and isolated workspaces.
- **`.github/workflows/release.yml`.** Pushing a `v*` tag verifies the tag against
  every version manifest, runs `npm test` and a CLI smoke test, and creates the
  GitHub release with that version's CHANGELOG section as its body. A mismatched
  tag or a red suite stops the release instead of shipping through it.
  `permissions: contents: write` is scoped to this workflow alone, `ci.yml` stays
  at `contents: read`, and every action in both is pinned by commit SHA.
- **`docs/RELEASING.md`.** The release procedure end to end, including that the
  release is created exactly once and by one mechanism — the `published` delivery
  hook now verifies the workflow's release rather than creating a second one.
- **The porting rule**, in CLAUDE.md and CONTRIBUTING.md: a harness port adds an
  entry point, a bootstrap where the harness needs one, and a mapping, and never
  edits a skill body. docs/CONTRACT.md records that entry points and bootstraps
  are distribution artifacts outside the frozen contract, so a harness changing
  its own manifest format never forces a major bump.

### Fixed

- **`ultraship commit` failed in any repository that gitignores `.ultraship/`** —
  every repository since 2.2.0 made the workspace local-only, including this one.
  `git add` refuses an ignored path and fails the whole call, so a checkpoint with
  real work in it errored instead of committing. It now drops gitignored paths
  before staging, and reports `Every path under this checkpoint is gitignored.`
  when nothing remains, which is the documented no-op. `check-ignore` joins the
  git allowlist, which stays read-only apart from `add` and `commit`.
- **README claimed there was nothing else to install** while `ultraship state` was
  `command not found` on a fresh install. It now carries an install section per
  harness and documents how the CLI resolves, with an optional one-line `PATH`
  shim.

### Testing

- The session-start hook's per-harness output is covered across all four
  branches, which was untested logic deciding whether the skill is injected at
  all.
- Manifest versions, the Codex manifest's shape, the mapping's coverage list,
  both workflows' permissions and SHA pinning, and the release procedure are
  asserted. 274 tests at 2.2.0; 292 now.

## [2.2.0] — 2026-08-01

Security hygiene. Every open code-scanning alert on the repository is now either
fixed in the code or ruled out of scope in writing. One was a real defect in
UltraShip's own code; one was a workflow weakness; the remaining four are inside
the vendored `yaml` copy this project ships verbatim and must not patch, so they
are dismissed as out of scope and the reason is written down. No CLI command,
skill, schema, or canonical field changed.

### Fixed

- `cell()` in `lib/views.mjs` escaped `|` to `\|` without escaping backslashes
  first, so a canonical value containing `\|` rendered as a literal backslash
  beside a live cell-terminating pipe and broke the generated Markdown table. It
  now escapes both meta-characters in one pass (`.replace(/[\\|]/g, '\\$&')`).
  CodeQL rule `js/incomplete-sanitization`. `cell()` is the only Markdown-emitting
  function in `lib/`, so the fix has no sibling caller to repeat.
- `test/views.test.mjs` gained a fixture whose value carries a backslash
  immediately before a pipe and asserts the exact rendered escape sequence. The
  old assertion matched any escaped pipe, which the bug satisfied.

### Added

- The four `js/polynomial-redos` findings inside `vendor/yaml` are dismissed as
  out of scope, each dismissal carrying a comment that names the directory as an
  unmodified copy of npm `yaml` 2.9.0 and points at [SECURITY.md](SECURITY.md).
  [SECURITY.md](SECURITY.md) records why the exclusion is carried by dismissal
  rather than by a CodeQL config with `paths-ignore: vendor/` — GitHub refuses an
  advanced configuration while code-scanning default setup is enabled, and default
  setup on this repository is enforced by an organisation security configuration
  that cannot be modified here — and the steps to adopt the stronger mechanism if
  that ever changes.
- The vendored-code policy, written into [SECURITY.md](SECURITY.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md): `vendor/` is unmodified third-party code,
  excluded from this repository's scanning, tracked by pinned version, and
  answered by re-vendoring the fixed upstream release — never by editing a file
  under `vendor/`, which would fork the copy from its upstream and break the next
  re-vendor. The four `js/polynomial-redos` findings sit in `yaml` 2.9.0's own
  dist output; 2.9.0 is the newest published stable, upstream `main` carries those
  regexes unchanged, and no advisory covers them.

### Changed

- `.github/workflows/ci.yml` declares `permissions: contents: read`, so its
  `GITHUB_TOKEN` is least-privilege regardless of the repository or organisation
  default. CodeQL rule `actions/missing-workflow-permissions`.
- [CLAUDE.md](CLAUDE.md) audited and corrected. It still described five skills and
  ten CLI commands; the repository has thirteen skills and twelve commands. It also
  gained the vendoring and code-scanning rule, so an agent working here does not
  reintroduce the pattern.

### Compatibility

Nothing was removed or renamed and no canonical shape changed, so a 2.1.0
workspace passes `ultraship validate` on 2.2 unchanged and `schema_version` stays
`1`. `cell()` is a module-private helper the contract does not freeze. `ultraship
migrate` carries `framework_version` to 2.2.0 and adds no field.

## [2.1.0] — 2026-07-31

Parallel work, on your terms. A sixth skill, `/ultraship:subagent`, is the one
place UltraShip fans work out to concurrent agents, and the workflow skills call
it instead of each inventing a dispatch recipe of their own.

**It is off unless you ask.** Three signals turn it on: invoking
`/ultraship:subagent` directly, telling the running skill to use subagents for
this flow, or recording the preference — `allow_parallel_agents: true` in
`.ultraship/ultraship.yaml`, or an instruction in your `CLAUDE.md`, `AGENTS.md`,
or memory, which is how you make it your default. An in-session instruction wins
in both directions. With none of the three present, every skill behaves exactly
as it did on 2.0.

### Added

- `/ultraship:subagent`, a supporting skill. It moves no lifecycle state and
  writes no canonical file; the calling skill records the evidence, sets the
  statuses, and runs the commits.
- `shared/subagent-protocol.md` — the single contract behind it: the three
  activation paths and their precedence, the brief a dispatched agent receives,
  the return shape it owes, and the four things it may never do (write under
  `.ultraship/`, `transition`, `commit`, `deploy`).
- `ultraship wave [product] [version]`, the twelfth CLI command. It prints the
  tasks that may run concurrently right now — every dependency `done`, declared
  `files` disjoint from the rest of the wave and from anything in progress — and
  the reason it held each of the others. It computes; it dispatches nothing, so
  the CLI still calls no model and touches no network.
- `develop` computes waves, dispatches them, records each returned evidence
  against its own task, and commits each finished task through the existing
  `develop-task` checkpoint before computing the next wave. It halts and reports
  when an agent returns a file outside that task's declared `files`, because the
  disjointness the wave rested on was never true.
- `plan` can hand independent research briefs to the same skill. `brainstorm`,
  `iterate`, and `complete` reference the protocol too.

### Compatibility

Nothing was removed or renamed and no canonical shape changed, so a 2.0.0
workspace passes `ultraship validate` on 2.1 unchanged and `schema_version` stays
`1`. `ultraship migrate` carries `framework_version` to 2.1.0 and adds no field.

## [2.0.0] — 2026-07-31

The lifecycle commits its own work. `plan`, `develop`, `iterate`, and `complete`
now run `ultraship commit <checkpoint>` at defined points, so the roadmap, the
contract, every finished task with its evidence and its own files, every recorded
plan change, and the immutable release record land as separate, readable commits
instead of one undifferentiated working tree at the end. Git history becomes a
second, independent view of the same canonical truth — reviewable per task,
revertible per task, and resumable after any interruption.

### BREAKING CHANGE

The skills now write to your git repository. `commit_policy` defaults to
`checkpoint`, where 1.x never touched git at all. That is a change to a
documented skill workflow, which is a major version.

**Remedy: run `ultraship migrate`.** It writes `commit_policy: off` into any
workspace that omits the field, so an existing project keeps 1.x behaviour until
you opt in. Even unmigrated, a workspace recording a pre-2.0 `framework_version`
resolves to `off`, so nothing starts committing without being asked. To opt in,
set `commit_policy: checkpoint` in `.ultraship/ultraship.yaml`.

Nothing was removed or renamed. No 1.x command, skill, or schema field is gone,
so no deprecation window was owed. `schema_version` stays `1` — the canonical
state shapes did not break, and a 1.x workspace's data is valid data on 2.0.

### Added

- **`ultraship commit <checkpoint> [product] [version] [--task ID]`** — the
  eleventh CLI command. Stages only the paths its checkpoint declares, derives a
  Conventional Commits subject from canonical state, and commits. It never
  pushes, never creates a branch, and never creates a tag: `lib/commit.mjs`
  permits exactly four git subcommands (`rev-parse`, `status`, `add`, `commit`)
  and refuses any other, so nothing it does can leave the machine. It never runs
  `git add -A`, and the commit carries a pathspec, so unrelated staged work is
  never swept in. Policy `off`, no git repository, no `git` on `PATH`, and no
  change under the checkpoint's paths are all no-ops that exit 0.
- **`commit_policy`** — a new optional `ultraship.yaml` field, `off` or
  `checkpoint`.
- **[shared/commit-protocol.md](shared/commit-protocol.md)** — the seven
  checkpoints, what each stages, when to run it, and the message format. The four
  working skills reference it rather than restating a git recipe four times.
- **README badges** — CI status, Node version, version, and license.

### Changed

- `plan`, `develop`, `iterate`, and `complete` call the checkpoints they own.
  `develop` commits per task, the moment it is `done` with evidence recorded,
  rather than once at the end.
- `ultraship migrate` gained the `commit_policy` step, still forward-only and
  idempotent, still needing no hand edit.
- [docs/CONTRACT.md](docs/CONTRACT.md) is restated as the 2.0 contract with
  eleven commands; [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) records the
  break and the migrate step that absorbs it.

## [1.1.0] — 2026-07-22

Contributor-ready. 1.0 froze the public contract; 1.1 opens the front door so an
outside developer can act on it. The repository now explains how it is built, how
a change maps to a SemVer bump, and how to submit work in a mergeable shape — and
it does so in the project's own idiom, showing contributors how to drive their
change through UltraShip's own five skills. This release adds documentation,
GitHub templates, and one CI workflow only; no CLI command, skill, or schema
changed, so it is a clean minor and a 1.0 workspace needs no migration.

### Added

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — the contributor entry point: the two
  halves (agent-facing skills vs the deterministic CLI), the local test loop
  (Node 20+, no install, `npm test` and its single-file forms), the
  change-classification rule that decides the SemVer bump, and the pull-request
  workflow.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant 2.1.
- **[SECURITY.md](SECURITY.md)** — supported-version policy and private
  vulnerability disclosure through GitHub security advisories.
- **[docs/CONTRIBUTING-WITH-ULTRASHIP.md](docs/CONTRIBUTING-WITH-ULTRASHIP.md)** —
  a walkthrough of `brainstorm → plan → develop → iterate → complete` for a change
  to this repository, using the 1.1.0 release itself as the worked example.
- GitHub **pull-request and issue templates** (`.github/PULL_REQUEST_TEMPLATE.md`,
  `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`)
  that prompt for the SemVer classification and test evidence.
- A **CI workflow** (`.github/workflows/ci.yml`) running `npm test` and
  `ultraship validate` on every push and pull request across Node 20 and 22, with
  no install step so the zero-dependency guarantee holds in CI too.
- README **Contributing** section linking all of the above.

## [1.0.0] — 2026-07-22

The stable contract. Versions 0.1 through 0.5 built the capability; 1.0 makes it
dependable. The public surface — every CLI command, every skill, and every
`.ultraship/` schema — is enumerated and frozen, and changing any of it is now a
major version. Any pre-1.0 workspace upgrades with `ultraship migrate` and keeps
working, and a written deprecation policy backed by a compatibility test matrix
guarantees nothing breaks underneath a project without warning and a major bump.
The CLI still calls no model, opens no network connection of its own, and carries
zero runtime dependencies.

### Added

- **[docs/CONTRACT.md](docs/CONTRACT.md)** — the frozen 1.0 public contract: ten
  CLI commands, the workflow and supporting skills, and the ten canonical-state
  schemas, with the major-bump-to-change rule.
- **[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)** — the deprecation and
  compatibility policy: what each version level may change, the
  1.x-never-breaks-1.x guarantee, and the announce → overlap → remove path.
- A formalized workspace `schema_version` (the contract version, frozen at 1);
  `ultraship migrate` defaults an absent one to the baseline.
- A compatibility test matrix asserting a workspace from each pre-1.0 release
  migrates to 1.0 and validates.
- `ultraship init` scaffolds a project `.gitignore` (ignoring transient deploy
  evidence) so a workspace stays clean after a release.

### Changed

- The README documents the frozen contract and links the contract and
  compatibility policies.
- `product.yaml`'s public contract was reconciled to the real ten-command surface
  (iteration `US-ULTRASHIP-1.0.0-I01`).

### Notes

- No new features and no breaking change: 1.0 stabilizes the existing surface. A
  0.5.1 workspace migrates to 1.0 with no manual edits.

## [0.5.1] — 2026-07-22

Publish hooks now produce a real release. 0.5.0's dogfooded publish hook used
`gh release create --generate-notes`, so the release notes were a bare list of
merged pull-request titles. The hook now sources its notes from the CHANGELOG's
latest section, and completion writes the changelog before running the hook so
those notes exist when it reads them.

### Fixed

- The workspace's `delivery_hooks` publish hook sources release notes from the
  CHANGELOG (`--notes "$(awk '/^## \[/{n++} n==1' CHANGELOG.md)"`) instead of
  `--generate-notes`.
- `complete`'s Process writes release notes and the changelog **before**
  `ultraship deploy`, since a notes-sourcing hook must read the changelog first.
- The README `delivery_hooks` example and the `complete` deploy guidance
  recommend CHANGELOG-sourced notes and warn against `--generate-notes`.

No change to `lib/`, `bin/`, or the schemas.

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
