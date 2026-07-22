# Contributing with UltraShip

UltraShip is built with UltraShip. This repo **dogfoods itself**:
`.ultraship/products/ultraship/` is UltraShip's own live product state, and every
release since `0.1.0` was planned, developed, and recorded through the five
skills. You can contribute the same way — and it is the most honest way to learn
the framework.

This guide walks the lifecycle for a change *to this repository*, using a real
example: the `1.1.0` contributor-readiness release that added the very file you
are reading.

> **Not every change needs the full lifecycle.** A one-line typo fix or a small
> bug fix is a normal fork-branch-PR (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
> Reach for the skills when your change is a *coherent new outcome* — a feature, a
> new command, a documentation set like this one — that deserves to be a Minimum
> Complete Release with its own version.

## The five skills

`brainstorm → plan → develop → iterate → complete`. Each is a Claude Code skill
you invoke with `/ultraship:<skill>`. The deterministic `ultraship` CLI is the
referee underneath them — it holds the state, and it refuses any move the
lifecycle forbids.

Check where you are at any time:

```bash
node bin/ultraship.mjs state
```

### 1. `/ultraship:brainstorm` — is the idea a real product change?

Run this only when starting a brand-new workspace or reshaping the product
definition itself. For a contribution to an existing, already-defined product
like UltraShip, you usually **skip straight to plan** — `product.yaml` already
exists and brainstorm would compete with it. If your idea changes what UltraShip
*is* (its vision, users, or non-goals), that is a `product.yaml` change and is
owned by `/ultraship:iterate`, not a fresh brainstorm.

### 2. `/ultraship:plan` — turn the idea into a versioned contract

From the `RELEASED` state, planning the next version is the expected path. Plan:

- picks the SemVer bump (`ultraship semver next 1.0.0 minor` → `1.1.0` — additive
  contributor docs never break the frozen contract, so it is a **minor**);
- adds an entry to `roadmap.yaml` whose **outcome names something a user can
  reach** ("an outside developer goes from wanting to help to a merged
  contribution"), not a technical layer;
- writes the full release contract at `releases/1.1.0.yaml` — scope, acceptance
  criteria, delivery mode, `fallback_scope`, and risks.

The key discipline: every acceptance criterion is checkable, and the version
delivers a coherent outcome on its own. Plan ends by running
`ultraship validate` and `ultraship views`.

### 3. `/ultraship:develop` — build the smallest complete slice

Develop assesses **release fit** (recorded in `execution/active.yaml`), then
generates just-in-time **tasks** in `execution/tasks.yaml` — each tied to an
acceptance criterion that appears *verbatim* in the contract. For `1.1.0` the
tasks were: write `CONTRIBUTING.md`, add the code of conduct and security policy,
add the GitHub templates, add the CI workflow, write this guide, and link it all
from the README.

Rules develop enforces on you:

- Build **vertically** — one complete path at a time, not every backend task
  before any workflow works.
- Use `/ultraship:test-driven-development` for CLI/`lib` changes: write the
  failing test, watch it fail, make it pass. (Pure-docs changes like this release
  have no runnable logic, so the check is `npm test` staying green plus
  `ultraship validate`.)
- Record acceptance **evidence** against each task as you finish it.
- Never mark anything `released` or `immutable` — that is complete's job.

Develop ends with `ultraship validate` exiting `0` and a recommendation to run
complete.

### 4. `/ultraship:iterate` — when the plan turns out wrong

If, while building, you discover the scope, acceptance criteria, or an assumption
is wrong, **stop** — do not silently shrink the release. Iterate records the
change with its evidence and an approval source (you), and updates every affected
canonical file. This is the only skill allowed to edit `product.yaml`,
`roadmap.yaml`, and a contract's scope. Every non-trivial release also carries a
`fallback_scope` decided during plan, so iterate never has to invent an emergency
plan under pressure.

### 5. `/ultraship:complete` — prove it and make it immutable

Complete runs the applicable gates, stores the evidence, writes the release
record, and pins each released file's SHA-256 in `.ultraship/releases.lock` so it
can never be silently edited afterwards. A correction is a **new version**, never
an edit. If the gates fail, complete sends you back to develop or iterate — it
will not manufacture completion.

## The repository conventions complete assumes

The maintainer runs this project with a specific flow. Follow it so your
contribution lands cleanly:

- **Branch, commit, tag, PR yourself.** Work on a `feat/…`, `fix/…`, or `docs/…`
  branch — never commit the release straight to `main`. Open a PR; the maintainer
  reviews and merges.
- **Release after merge.** The GitHub release and any plugin re-publish happen
  from the `main` merge commit *after* the PR merges, not from the branch.
- **Keep the repo clean after a release.** `git status` must be empty; deploy
  evidence under `.ultraship/products/*/evidence/` is gitignored.
- **No AI attribution** in commit messages or PR bodies.

## A note on the dogfooded workspace

Because `.ultraship/` here is real state, running the lifecycle **moves this
repository's state** (for example, from `RELEASED` to `PLANNING` to `DEVELOPING`).
That is expected for a genuine feature contribution. But if your change is
*documentation-only or a small fix that is not a new version*, do **not** run the
lifecycle or commit competing canonical state — just make the change on a branch
and open a PR. Only reach for the skills when you are genuinely shipping a new
Minimum Complete Release.
