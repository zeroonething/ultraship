---
name: develop
description: Use to implement the active release contract as complete vertical slices - assesses release fit, generates just-in-time tasks, tracks acceptance evidence, and recommends iteration when the plan stops fitting
---

# /ultraship:develop

Implement the active release contract as the smallest complete vertical slice.

**Read first:** `shared/skill-contract.md`, `shared/release-contract.md`.

**Invocation:** `/ultraship:develop [product] [version]`. With no arguments, use
the single active release. If more than one candidate exists, ask.

## Runs when

The workspace state is `PLANNED`, `DEVELOPING`, `ITERATING`, or `RELEASED`
(starting the next version).

If the state is `BRAINSTORMED` or earlier, stop and route to `/ultraship:plan`.
There is no release contract to build against.

## What this skill owns

- `.ultraship/products/<id>/execution/active.yaml`
- `.ultraship/products/<id>/execution/tasks.yaml`
- `.ultraship/checkpoints/<timestamp>-<product>-<version>.yaml`
- The project's own source, tests, configuration, and documentation, in their
  normal locations.

## What this skill does not own

Do not edit `product.yaml`, `roadmap.yaml`, or the release contract's scope and
acceptance criteria. Those belong to `/ultraship:iterate`.

Do not mark anything released, and do not write `status: released` or
`immutable`. Completion is `/ultraship:complete`'s job and it is evidence-based.

## Release fit gate

Before writing code, assess whether this release can be completed with the
resources available. Consider scope size, repository condition, existing test
coverage, architectural uncertainty, deployment requirements, external
dependencies, and anything the user told you about their time or budget.

Record it in `active.yaml`:

```yaml
release_fit:
  assessment: probable
  reasons:
    - Two workflows against one new schema.
    - The deployment path already exists.
  major_cost_drivers:
    - First-time schema design
  recommended_scope_change: null
```

`assessment` is one of `high`, `probable`, `uncertain`, `unlikely`. It is
qualitative because UltraShip 0.1.0 has no provider telemetry — **never invent** a
percentage, a token count, a cost, or a time estimate you did not measure. A
number here would be fiction with a decimal point.

If the assessment is `unlikely`, say so before spending the effort, and
recommend `/ultraship:iterate` to reduce scope or split the release.

## Just-in-time tasks

Generate tasks for the active release only. Each task must be small,
independently verifiable, ordered by dependency, and tied to acceptance criteria
the contract actually contains.

```yaml
product: client-tracker
version: 0.1.0
tasks:
  - id: US-CLIENT-TRACKER-0.1.0-T01
    summary: Create the invoices table and its migration.
    why_required: Every acceptance criterion reads or writes an invoice.
    status: todo
    depends_on: []
    acceptance_criteria:
      - A freelancer records an invoice and marks it paid.
    files:
      - db/migrations/0001-invoices.sql
    evidence: []
```

`why_required` is not decoration. If you cannot say why the release fails
without this task, the task is not release work — drop it.

Every string in `acceptance_criteria` must appear verbatim in the contract's
`acceptance` lists. Validation enforces this, so inventing a criterion here fails
the build rather than quietly widening scope.

## Build vertically

Implement one complete path at a time:

```text
user action → interface → application logic → data → integration → tests → deployment path
```

Do not finish every backend task before any real workflow works. A horizontal
layer cannot be demonstrated, cannot be tested end to end, and cannot be shipped
if the release runs short.

Use `ultraship:test-driven-development` for implementation. Write the failing
test, watch it fail, then make it pass.

Use `ultraship:systematic-debugging` when something breaks. Find the root cause
before proposing a fix.

## Working efficiently

Inference, time, and money are engineering resources. Prefer:

- `ultraship state` over reading `.ultraship/` file by file.
- Targeted searches over repository-wide scans. A repository-wide read before
  every task is the most expensive habit available and it rarely helps.
- Reading a file once and remembering it over re-reading it each turn.
- Focused tests during implementation; the full suite at meaningful checkpoints.
- The project's existing scripts and conventions over new ones.
- Stopping exploration once you have what the task needs.

Avoid speculative refactors, abstractions with one caller, and improvements
unrelated to the release. They cost real resources and deliver none of it to the
user.

## When the plan stops fitting

Implementation evidence may prove the plan wrong. That is expected and is a
first-class outcome, not a failure.

When scope, architecture, ordering, acceptance criteria, or assumptions need to
change: **stop, state the evidence, and recommend `/ultraship:iterate`.**

Do not invoke `/ultraship:iterate` yourself, and do not quietly reduce scope. A
plan change needs an approval source recorded against it, and only the user can
be that source. Silently shrinking a release and reporting success is the exact
failure the framework exists to prevent.

Say it plainly:

> The invoice state machine has three states the contract did not anticipate.
> Finishing partial payments as specified is now `unlikely`. The contract already
> records a fallback scope that drops it. Run `/ultraship:iterate` and I will
> record the change and update the contract.

## Checkpoints

Checkpoint when a major task completes, an unknown surfaces, a dependency
blocks, scope grows, or capacity runs short.

When work cannot finish now, leave the repository passing if you can and write
`.ultraship/checkpoints/<timestamp>-<product>-<version>.yaml`:

```yaml
product: client-tracker
version: 0.1.0
timestamp: 2026-07-21T16:00:00Z
reason: capacity
repository_state: passing
completed_acceptance:
  - A freelancer creates a client.
remaining_acceptance:
  - A freelancer marks an invoice paid.
active_hypotheses: []
next_task: US-CLIENT-TRACKER-0.1.0-T04
required_context:
  - db/migrations/0001-invoices.sql
```

Pausing safely is a success. Do not label the version complete.

## Scope freeze

Once the release reaches its completion phase, no new feature enters, no
speculative refactor begins, and optional improvements are deferred. Only
release-critical changes remain. This is decided by the state of the release, not
by a usage percentage.

## Done when

- Every included requirement is implemented.
- Relevant automated tests pass, and you have seen them pass.
- Unresolved issues are visible in `tasks.yaml`, not hidden.
- The production or publication path exists.
- Migrations are ready.
- Acceptance evidence is recorded against tasks.
- `ultraship validate` exits 0.

Then recommend `/ultraship:complete <product> <version>`.
