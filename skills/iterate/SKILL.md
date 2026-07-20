---
name: iterate
description: Use when implementation evidence, user feedback, or resource pressure shows the plan should change - records the change with its evidence and updates every affected canonical file
---

# /ultraship:iterate

Adapt the plan when evidence shows the current assumptions, scope, architecture,
ordering, or implementation should change.

This is UltraShip's adaptive-planning mechanism. Using it is not an admission of
failure — refusing to use it and quietly building the wrong thing is.

**Read first:** `shared/skill-contract.md`, `shared/state-model.md`.

## Runs when

Any active state: `DEVELOPING`, `COMPLETING`, `PLANNING`, `BRAINSTORMED`,
`PLANNED`, `RELEASED`, `BLOCKED`, or `PAUSED`.

Invoked with no specific change requested, perform a release-fit and assumption
review instead, and record nothing unless something actually changed.

## What this skill owns

- `.ultraship/iterations/<id>.yaml`
- Amendments to `product.yaml`, `roadmap.yaml`, release contracts, and
  `execution/tasks.yaml` — but only for versions that have not shipped.

## Permitted

Split, merge, or reorder tasks. Change implementation strategy. Reduce optional
scope. Adopt the fallback scope. Defer functionality. Split one planned release
into two complete releases. Combine compatible future releases. Reorder
releases. Add a corrective patch version. Revise acceptance criteria,
requirements, architecture, or dependencies. Change the release mode. Revise
resource assumptions.

## Prohibited

- **Rewriting what a released version contained.** Released records are immutable:
  each is pinned by SHA-256 and `ultraship validate` will fail on any edit.
  Corrections require a new version.
  This is not a technicality: a release record is a historical claim about what
  shipped, and editing it makes every past claim untrustworthy.
- Hiding a change, or making one with no record.
- Copying a canonical fact into a second file.
- Lowering a completion gate to finish faster. **Scope may shrink; completeness
  may not.**
- Turning an incomplete implementation into a "release" through wording.
- Creating a version with no real user or operational outcome.

## Under resource pressure

When the release will not fit, work down this list in order and stop at the first
step that succeeds:

1. Remove optional scope.
2. Adopt the `fallback_scope` the contract already records.
3. Simplify the implementation.
4. Reduce agent or model overhead.
5. Defer non-critical optimization.
6. Split the release into two complete releases.
7. Pause with a safe checkpoint.

Never reach for: required correctness, security-critical controls, essential
tests, release evidence, or necessary deployment validation. Those are not
scope — they are what makes the remaining scope a release.

## The iteration record

Write `.ultraship/iterations/US-<PRODUCT>-<VERSION>-I<NN>.yaml`:

```yaml
id: US-CLIENT-TRACKER-0.1.0-I01
timestamp: 2026-07-21T11:30:00Z
category:
  - release-level
trigger: The invoice state machine is larger than the contract assumed.
evidence:
  - Three unhandled states surfaced while writing the paid transition.
before:
  scope:
    - Create invoice
    - Mark paid
    - Partial payments
  assumptions:
    - Payment is binary.
  implementation: Single boolean paid column.
change:
  summary: Adopt the fallback scope; defer partial payments to 0.2.0.
  added: []
  removed:
    - Partial payments
  deferred:
    - Partial payments
  replaced: []
impact:
  products:
    - client-tracker
  versions:
    - 0.1.0
    - 0.2.0
  tasks:
    - US-CLIENT-TRACKER-0.1.0-T04
  dependencies: []
  resource_effect: Removes roughly a third of the remaining implementation work.
versioning:
  previous_target: 0.1.0
  new_target: 0.1.0
  consequence: no-version-change
approval:
  source: user
  reference: Confirmed in session 2026-07-21.
canonical_updates:
  - products/client-tracker/releases/0.1.0.yaml
  - products/client-tracker/roadmap.yaml
```

`category` is one or more of: `task-level`, `implementation-level`,
`release-level`, `product-level`, `portfolio-level`, `architecture-level`,
`dependency-level`, `resource-level`, `post-release`.

`approval.source` is `user` or `agent`. Prefer `user`. Use `agent` only for
changes that touch neither scope, version, nor product truth — reordering two
tasks, for example — and be aware the record makes that visible.

`evidence` must be something observed, not something assumed. "This felt hard"
is not evidence. "Three unhandled states surfaced" is.

## Versioning consequences

| Situation | `consequence` | Effect |
| --- | --- | --- |
| Implementation corrected before release | `no-version-change` | Target stays. |
| Backward-compatible fix after release | `patch-bump` | `0.4.0` → `0.4.1` |
| New backward-compatible functionality | `minor-bump` | `0.4.0` → `0.5.0` |
| Breaking the public contract | `major-bump` | `1.4.0` → `2.0.0` |
| One release becomes two | `release-split` | `0.5.0` shrinks; the remainder becomes `0.6.0` |
| Two releases become one | `release-merge` | Roadmap collapses two entries. |
| Order changes | `reorder` | Roadmap resequences. |

Use `ultraship semver next <current> <bump>` for the arithmetic.

## Deferred work needs a destination

Anything deferred goes somewhere canonical — normally a later entry in
`roadmap.yaml`. Deferred work with no destination is not deferred; it is
forgotten, and the record you wrote makes that a lie.

## Process

1. Run `ultraship state`.
2. Establish the trigger and gather the evidence.
3. Classify the change and determine its version consequence.
4. Present the proposed change and get explicit approval for anything touching
   scope, version, or product truth.
5. Run `ultraship transition ITERATING` if the state permits it.
6. Write the iteration record.
7. Update every affected canonical file. Update each fact in its owning file
   only.
8. Give deferred work a canonical destination.
9. Run `ultraship transition DEVELOPING` when the contract is executable again.
10. Run `ultraship validate` and `ultraship views`.

## Done when

- The change, the reason, and the evidence are recorded.
- Affected canonical files are updated, each fact in one place.
- The version consequence is resolved.
- Deferred work has a destination.
- The active release is executable again.
- `ultraship validate` exits 0.
