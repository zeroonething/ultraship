# UltraShip

**Ship at inference speed.**

UltraShip is an AI-assisted rapid development framework for transforming vague
ideas into complete, production-ready software through adaptive planning,
Minimum Complete Releases, and resource-aware agent execution.

It provides five skills:

- `/ultraship:brainstorm`
- `/ultraship:plan`
- `/ultraship:develop`
- `/ultraship:iterate`
- `/ultraship:complete`

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
| `ultraship init` | Scaffold `.ultraship/` in the current directory. |
| `ultraship state` | Print the active product's state, active release, every product's state, and legal next steps as JSON. |
| `ultraship transition <STATE> [product]` | Move a product's lifecycle to a new state, refusing any move the state model forbids. Defaults to the active product. |
| `ultraship product add <id> [name]` | Register a new product with its own lifecycle and make it active. |
| `ultraship product use <id>` | Switch which product is active. |
| `ultraship migrate` | Move a 0.1.0 workspace's single state onto its active product's lifecycle, and bring `framework_version` up to the installed release. Run once per upgrade. |
| `ultraship constraints set [--time T] [--budget B] [--capacity C]` | Record your real limits on the active release, as user estimates, so develop and iterate assess release fit against them. `ultraship constraints show` prints them. |
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

## License

MIT. See `LICENSE` and `NOTICE`.

UltraShip builds on skills from [Superpowers](https://github.com/obra/superpowers)
by Jesse Vincent, used under the MIT License. UltraShip is an independent project
and is not affiliated with or approved by Superpowers or its authors.
