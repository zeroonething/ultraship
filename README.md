# UltraShip

[![CI](https://github.com/zeroonething/ultraship/actions/workflows/ci.yml/badge.svg)](https://github.com/zeroonething/ultraship/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-2.2.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Ship at inference speed.**

UltraShip is an AI-assisted rapid development framework for transforming vague
ideas into complete, production-ready software through adaptive planning,
Minimum Complete Releases, and resource-aware agent execution.

It provides five lifecycle skills:

- `/ultraship:brainstorm`
- `/ultraship:plan`
- `/ultraship:develop`
- `/ultraship:iterate`
- `/ultraship:complete`

…and `/ultraship:subagent`, which any of them can call to run independent work in
parallel. It is off unless you ask for it — see
[Parallel work](#parallel-work-when-you-ask-for-it).

UltraShip plans and builds one complete product version at a time. Every release
must deliver a real outcome, remain deployable or publishable, and preserve one
canonical source of truth.

**Build small. Adapt fast. Ship often.**

## Install

```
/plugin marketplace add zeroonething/ultraship
/plugin install ultraship
```

Requires Node 20 or newer. There is nothing else to install — the one dependency
is vendored.

## The workflow

Run these in order. Each one tells you the next.

```
/ultraship:brainstorm     idea        → product.yaml
/ultraship:plan           product     → roadmap + release contract
/ultraship:develop        contract    → working vertical slices
/ultraship:iterate        evidence    → recorded plan change
/ultraship:complete       gates pass  → immutable release
```

`iterate` runs whenever evidence says the plan is wrong — zero times or many.
`complete` may reject a release and send it back.

## The state engine

Project state lives in `.ultraship/` in your own repository. The `ultraship`
command reads and checks it. It never calls a model and never touches the network.

| Command | What it does |
| --- | --- |
| `ultraship init` | Scaffold `.ultraship/` and a project `.gitignore` (ignoring transient deploy evidence) in the current directory. |
| `ultraship state` | Print the active product's state, active release, every product's state, and legal next steps as JSON. |
| `ultraship transition <STATE> [product]` | Move a product's lifecycle to a new state, refusing any move the state model forbids. Defaults to the active product. |
| `ultraship product add <id> [name]` | Register a new product with its own lifecycle and make it active. |
| `ultraship product use <id>` | Switch which product is active. |
| `ultraship migrate` | Move a 0.1.0 workspace's single state onto its active product's lifecycle, and bring `framework_version` up to the installed release. Run once per upgrade. |
| `ultraship constraints set [--time T] [--budget B] [--capacity C]` | Record your real limits on the active release, as user estimates, so develop and iterate assess release fit against them. `ultraship constraints show` prints them. |
| `ultraship deploy [product] [version]` | Run the declared `delivery_hooks` command for the release's target mode, capture its output as evidence, and exit non-zero if it fails so completion refuses the deployed mode. No hook declared → nothing to run. |
| `ultraship commit <checkpoint> [product] [version] [--task ID]` | Commit the working skills' own output at one checkpoint. Stages only that checkpoint's declared paths, never pushes, branches, or tags. Governed by `commit_policy`; a no-op when it is `off`. |
| `ultraship wave [product] [version]` | Print the tasks that may run concurrently right now — every dependency `done`, declared `files` disjoint from the rest of the wave and from anything in progress — plus the reason each held task was excluded. Computes only; it dispatches nothing. |
| `ultraship validate` | Check every canonical file against its schema and the cross-file rules. |
| `ultraship semver next <version> <bump>` | Compute the next version. `bump` is `major`, `minor`, `patch`, `release`, or a pre-release identifier. |
| `ultraship views` | Regenerate the readable Markdown summaries in `.ultraship/views/`. |

Requires Node 20 or newer. There is nothing to install: the one dependency is
vendored.

## Several products in one workspace

One workspace can hold several independent products, each on its own lifecycle
and release track. Register each with `ultraship product add <id>`, switch
between them with `ultraship product use <id>`, and every skill acts on the
active product. Because lifecycle state is per product, one product can be in
development while another is planned or released — their states never compete.

Upgrading a workspace? Run `ultraship migrate` once. From 0.1.0 it moves the
single workspace state onto the active product's lifecycle; on any upgrade it
also brings `framework_version` up to the installed release. It leaves the rest
untouched.

## Constraints and release fit

UltraShip never invents a cost, a token count, or a duration — it has no way to
measure them. But you know your own limits. Record them on the active release:

```
ultraship constraints set --time "ship by Friday" --budget "$20 of plan credit" --capacity "half a day"
```

They are stored as `user-estimate`, never as measured figures, and surface in
`ultraship state` and the active-releases view. `/ultraship:develop` and
`/ultraship:iterate` assess release fit against them: when the scope no longer
fits your recorded limits, they cite the constraint and recommend the release's
fallback scope rather than guessing. When a version ships, `ultraship transition
RELEASED` marks it released in the roadmap and archives its execution pointer, so
no shipped version keeps reading as in development.

## Release integrity

`ultraship validate` mechanically enforces the invariants a completed release
must satisfy, instead of leaving them for an agent to remember. Beyond the
schema and cross-file checks, it fails and names the contradiction when:

- a version with a released release record is not marked released in the roadmap
  (or a released roadmap entry points at a record still `planned`);
- an execution pointer in `active.yaml` still references a version whose release
  record is already released — a shipped version must hold no execution pointer;
- a declared version-bearing file disagrees with the release version.

The third check is opt-in. Declare the files outside `.ultraship/` that carry
your project's version in `ultraship.yaml`, and validate holds them to the
greatest released version so it can never drift across manifests again:

```yaml
version_files:
  - path: package.json
    key: version
  - path: .claude-plugin/plugin.json
    key: version
  - path: .claude-plugin/marketplace.json
    key: plugins.0.version
```

`path` is relative to the project root; `key` is a dot-path into the parsed
JSON, where a numeric segment indexes an array. Omit `version_files` entirely and
the check is skipped — the workspace behaves exactly as before.

## Deploy and publish hooks

A `published`, `staging-deployed`, or `production-deployed` release is only
honest if the deployment actually ran. Declare the command that reaches each
mode under `delivery_hooks` in `ultraship.yaml`:

```yaml
delivery_hooks:
  published:
    # Source the release notes from your CHANGELOG's top section, not
    # --generate-notes (which only lists merged PR titles).
    deploy: gh release create v$VERSION --title "MyApp $VERSION" --notes "$(awk '/^## \[/{n++} n==1' CHANGELOG.md)"
    smoke: gh release view v$VERSION --json tagName -q .tagName
```

`/ultraship:complete` runs `ultraship deploy`, which executes the command for the
release's `target_mode` — exporting `VERSION`, `PRODUCT`, and `MODE` — captures
its stdout, stderr, and exit code under
`.ultraship/products/<id>/evidence/<version>/`, and records the command and exit
as a deployment evidence entry. An optional `smoke` command runs after a
successful deploy and becomes a health-check entry.

The exit code is the gate: if the command fails, `ultraship deploy` exits
non-zero, completion refuses the deployed mode, and the release stays
`release-ready`. The command is your project's own tooling — the `ultraship` CLI
itself opens no network connection. Omit `delivery_hooks` and deployment is
manual and recorded by hand, exactly as before.

## Commits at every checkpoint

The four working skills commit their own output. `plan` commits the roadmap and
then the contract; `develop` commits the task set and then every task the moment
it is done, with its evidence and its own files in the same commit; `iterate`
commits the plan change with every file it touched; `complete` commits the
immutable record with its lock entry and version bumps. Each message is a
Conventional Commits subject derived from canonical state.

The result is a git history that is a second, independent view of the release —
reviewable per task, revertible per task, and resumable after an interruption
instead of one undifferentiated working tree at the end.

```yaml
# .ultraship/ultraship.yaml
commit_policy: checkpoint    # or: off
```

`checkpoint` is the default for a workspace created by 2.0 or later. Set `off` and
nothing ever commits. **A workspace carried over from 1.x is pinned to `off` by
`ultraship migrate`**, so upgrading never starts committing without you asking.

The command stages and commits, and nothing else. It never pushes, never creates
a branch, and never creates a tag — `lib/commit.mjs` permits exactly four git
subcommands and refuses any other, so nothing it does can leave your machine.
Pushing, tagging, and opening a pull request stay yours. It never runs
`git add -A` either: each checkpoint stages an explicit path list, and the commit
carries a pathspec, so your unrelated working changes are never swept in even if
you had already staged them.

The checkpoints, what each stages, and its message format are in
[shared/commit-protocol.md](shared/commit-protocol.md).

## Parallel work, when you ask for it

`/ultraship:subagent` fans independent work out to concurrent agents. **It never
runs on its own.** Three signals turn it on, and any one is enough:

1. You invoke `/ultraship:subagent` yourself.
2. You tell the running skill to use subagents for this flow.
3. You recorded the preference — `allow_parallel_agents: true` in
   `.ultraship/ultraship.yaml`, or an instruction in your `CLAUDE.md`,
   `AGENTS.md`, or memory. This is how you make it your default.

An in-session instruction always wins, in both directions: asking for subagents
overrides a recorded `false`, and asking to stop overrides a recorded `true`.
With none of the three present, every skill runs exactly as it did on 2.0.

When it is on, `/ultraship:develop` asks the CLI which tasks are safe to run at
once rather than guessing:

```bash
ultraship wave
```

A task joins the wave only when every dependency is already `done` and its
declared `files` are disjoint from the rest of the wave and from anything in
progress. Every excluded task comes back with the reason. Each agent returns its
evidence and the files it really changed; the calling skill records that, commits
each finished task through the existing `develop-task` checkpoint, and computes
the next wave. A subagent never writes canonical state, transitions, commits, or
deploys.

The full contract is [shared/subagent-protocol.md](shared/subagent-protocol.md).

## Stability and the public contract

UltraShip 2.0 has a frozen, enumerated public contract: the twelve CLI commands,
the skills, and the ten `.ultraship/` schemas. **Changing any of them is a major
version.** Additive, backward-compatible changes are minor; fixes are patch. The
full surface is enumerated in [docs/CONTRACT.md](docs/CONTRACT.md).

What you can rely on:

- A `2.x` release never breaks a `2.x` workspace — `ultraship validate` still
  exits 0 after an upgrade within 2.x.
- `ultraship migrate` carries any workspace, back to the pre-1.0 releases, up to
  the installed version with no manual edits. It is forward-only and idempotent;
  run it once after upgrading.
- The canonical state schemas are unchanged from 1.x, so `schema_version` stays
  `1`: a 1.x workspace's *data* is still valid data on 2.0. What changed in 2.0 is
  behaviour — the skills now commit — and `migrate` pins any pre-2.0 workspace to
  `commit_policy: off` so that behaviour is opt-in for them.
- Released records stay immutable — a correction is a new version, never an edit.

How change is announced and deprecated is documented in
[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md): a contract item is deprecated in a
minor release, kept working for at least one more minor, and only removed in a
major release with a `migrate` step.

## Principles

1. Every release must work.
2. Every release must be independently releasable.
3. Every version must deliver a real outcome.
4. Build the smallest complete vertical slice.
5. The first useful version is an MVP; every version is a Minimum Complete Release.
6. Plan near-term work precisely and distant work lightly.
7. Implementation evidence may change the plan.
8. Changes must be explicit and traceable.
9. Released versions are immutable.
10. Every fact has one canonical owner.
11. Scope may shrink; completeness may not.
12. Verification is part of development, not an afterthought.
13. Deployment or publication is part of the release contract.
14. Inference, time, and money are engineering resources.
15. Use expensive reasoning only where it creates value.
16. Protect capacity for testing and release.
17. Do not optimize for token consumption.
18. Optimize for verified shipped value.
19. Pause safely rather than manufacture completion.
20. Ship, observe, learn, and adapt.

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) — it
explains the two halves (skills vs the deterministic CLI), the local test loop,
and how a change maps to a SemVer bump. For anything security-related, follow
[`SECURITY.md`](SECURITY.md) rather than opening a public issue. Participation is
governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

The one dependency (the npm `yaml` package) is vendored, and `vendor/` is never
edited: upgrading means re-vendoring per
[`vendor/README.md`](vendor/README.md) and rerunning `npm test`, and an advisory
naming a vendored package is answered by re-vendoring the fixed upstream release.
`vendor/` is excluded from this repository's code scanning so the scanner stays on
code this project can fix; [`SECURITY.md`](SECURITY.md) holds the full policy and
records how that exclusion is currently carried.

UltraShip is built with UltraShip. To ship your contribution the way the project
ships itself — through the five lifecycle skills — see
[Contributing with UltraShip](docs/CONTRIBUTING-WITH-ULTRASHIP.md).

## License

MIT. See `LICENSE` and `NOTICE`.

UltraShip builds on skills from [Superpowers](https://github.com/obra/superpowers)
by Jesse Vincent, used under the MIT License. UltraShip is an independent project
and is not affiliated with or approved by Superpowers or its authors.
