---
name: plan
description: Use after brainstorming to turn an approved product definition into a SemVer roadmap of complete releases and a fully specified contract for the first version
---

# /ultraship:plan

Convert an approved product definition into small, complete, independently
releasable versions.

**Read first:** `shared/skill-contract.md`, `shared/release-contract.md`,
`shared/commit-protocol.md`.

## Runs when

The workspace state is `BRAINSTORMED` or `PLANNING`.

If the state is `UNINITIALIZED` or `BRAINSTORMING`, stop and route to
`/ultraship:brainstorm`. There is no approved product to plan against.

If the state is `PLANNED` or later, **stop**. A roadmap already exists, and a
second one is competing truth. Route to `/ultraship:iterate`, which amends the
roadmap with a traceable record.

`RELEASED` is the exception: after a version ships, running `plan` to specify the
next version is the expected path.

## What this skill owns

- `.ultraship/products/<id>/roadmap.yaml`
- `.ultraship/products/<id>/releases/<version>.yaml`

## What this skill does not own

Do not edit `product.yaml`. If planning reveals the product definition is wrong,
stop and route to `/ultraship:iterate`. Do not write `execution/tasks.yaml` —
tasks are generated just in time by `/ultraship:develop`, and tasks written now
will be stale before they are executed.

## The planning unit is a release, not a layer

A version must deliver a coherent outcome a real user or operator can reach.

**Invalid roadmap.** Every entry here is a technical layer, and the user gets
nothing until the last one:

```text
0.1.0 — create the repository
0.2.0 — add the database
0.3.0 — add the API
0.4.0 — add the interface
```

**Valid roadmap.** Each entry is usable on its own:

```text
0.1.0 — one user completes one real workflow end to end
0.2.0 — the user can repeat and manage that workflow
0.3.0 — the workflow supports collaboration
0.4.0 — the product integrates with one external system
```

The repository, database, API, interface, tests, and deployment that `0.1.0`
needs are all part of `0.1.0`.

Test every version against this: can you write `outcome.user_can` without
describing internals? If not, the version is a layer. Merge it into the version
that uses it.

## Rolling-wave detail

Plan near-term work precisely and distant work lightly. Each roadmap entry
carries a detail level:

- `specified` — a full release contract exists at `releases/<version>.yaml`.
- `outline` — the outcome is decided; the contract is not written.
- `hypothesis` — a direction worth recording, not a commitment.

Only the current version starts as `specified`. False precision about version
0.7.0 is waste: it will be rewritten before anyone builds it.

## Version numbers

Use `ultraship semver next <current> <bump>` rather than doing the arithmetic
yourself. `bump` is `major`, `minor`, `patch`, `release`, or a pre-release
identifier such as `rc`.

Early products start at `0.1.0`. Breaking the public contract is a major bump;
new backward-compatible functionality is minor; backward-compatible fixes are
patch.

Tasks and iterations never receive version numbers. They use IDs:
`US-<PRODUCT>-<VERSION>-T<NUMBER>` and `US-<PRODUCT>-<VERSION>-I<NUMBER>`.

## Fallback scope

Every non-trivial release records `scope.fallback_scope`: the smallest still
complete version of itself.

```yaml
scope:
  included:
    - email sign-in
    - Google sign-in
  excluded:
    - single sign-on
  fallback_scope:
    - email sign-in
```

Decide this now, while there is no pressure. It exists so `/ultraship:iterate`
never has to invent an emergency plan late in a release. The fallback must still
deliver a coherent outcome — it is a smaller release, not a broken one.

## Process

1. Run `ultraship state`. Confirm the state permits this skill.
2. Read `product.yaml`. The `mvp_boundary` decides what `0.1.0` contains.
3. Run `ultraship transition PLANNING`.
4. Draft the roadmap: three to six versions is usually right. Present it and get
   agreement on the outcomes before writing contracts.
5. Write `roadmap.yaml`. Versions ascend; each entry has an outcome. Then run
   `ultraship commit plan-roadmap`.
6. Write the full contract for the first version at
   `releases/<version>.yaml`. Every field in `shared/release-contract.md` is
   required — including `delivery.rollback` and `delivery.target_mode`, which are
   part of the release, not an afterthought.
7. Run `ultraship transition PLANNED`, then `ultraship validate` and
   `ultraship views`. Then run `ultraship commit plan-contract`.
8. Report the roadmap and recommend `/ultraship:develop <product> <version>`.

Call both checkpoints unconditionally. `shared/commit-protocol.md` defines what
each one stages, and the command is a no-op that exits 0 whenever the workspace's
`commit_policy` is `off` or there is nothing to commit.

## Choosing the completion mode

`delivery.target_mode` is decided now, before development starts:
`release-ready`, `staging-deployed`, `production-deployed`, or `published`.

Ask the user. Do not assume production access exists. If credentials are not
available, `release-ready` is the honest target and the release is still complete.

## Guardrails

- Never plan a version that is only infrastructure.
- Never write `specified` detail for a version with no contract file — validation
  will reject it, and rightly.
- Never assign a version number to a task.
- Never omit deployment, testing, or migration work from a release's scope
  because it is inconvenient to estimate.
- Never promise an exact inference cost or duration. Use
  `resource_profile.complexity` and `uncertainty`, which are qualitative.

## Done when

- Every planned version states an outcome a user can reach.
- The first version has a complete, valid contract.
- Fallback scope exists for anything non-trivial.
- Versions ascend and SemVer validates.
- `ultraship validate` exits 0.
