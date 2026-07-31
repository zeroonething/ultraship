---
name: develop
description: Use to implement the active release contract as complete vertical slices - assesses release fit, generates just-in-time tasks, tracks acceptance evidence, and recommends iteration when the plan stops fitting
---

# /ultraship:develop

Implement the active release contract as the smallest complete vertical slice.

**Read first:** `shared/skill-contract.md`, `shared/release-contract.md`,
`shared/commit-protocol.md`, `shared/subagent-protocol.md`.

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

If the user has recorded constraints — `ultraship state` reports them under
`active.constraints`, or they set them with `ultraship constraints set` — the
assessment must be grounded in them, not made in a vacuum. Name at least one
recorded constraint in `reasons`, and when the scope does not fit the recorded
limits, set `recommended_scope_change` to the release's `fallback_scope` rather
than leaving it null. The constraints are `user-estimate` figures; cite them as
the user's own estimates, never as anything the framework measured.

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

Once `active.yaml` and `tasks.yaml` are written:

```bash
ultraship commit develop-tasks
```

`why_required` is not decoration. If you cannot say why the release fails
without this task, the task is not release work — drop it.

`files` is not decoration either. It is what the task's commit stages, so a task
whose `files` list is incomplete produces a commit missing part of its own
implementation. The command reports what it staged; read it.

Every string in `acceptance_criteria` must appear verbatim in the contract's
`acceptance` lists. Validation enforces this, so inventing a criterion here fails
the build rather than quietly widening scope.

## Parallel work, only when it is asked for

By default this skill builds one task at a time. Nothing below happens unless the
developer asked for it — directly, in this session, or by recording the
preference. `shared/subagent-protocol.md` holds the three signals and the order
they resolve in; read it there rather than guessing here.

When one of them does speak, invoke `/ultraship:subagent` and work in waves:

```bash
ultraship wave
```

That returns the tasks that are provably safe to run at once — every dependency
already `done`, declared `files` disjoint from the rest of the wave and from
anything in progress — and the reason it held each of the others. Dispatch that
set and nothing else. **Do not work out a "probably independent" set yourself;**
the command exists so no one has to.

For each returned result:

1. Write its evidence into that task's `evidence` in `tasks.yaml` and set its
   `status` to `done`. Do this in ascending task-id order, not the order the
   results arrived, so two identical runs produce identical canonical state.
2. Run the same per-task checkpoint a sequential run uses:
   `ultraship commit develop-task --task <id>`.
3. Then run `ultraship wave` again for the next wave.

Recording, status, and commits stay here. A subagent does none of them.

**Check what came back.** Each agent reports the files it actually changed. If a
returned file was not in that task's declared `files`, the disjointness the wave
rested on was never true. Halt, report it, and do not compute another wave — a
wrong `files` list is a real defect, and quietly widening it is how two agents end
up editing one file.

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

## Commit each task as it finishes

The moment a task reaches `done` with its evidence recorded in `tasks.yaml`, run:

```bash
ultraship commit develop-task --task <task-id>
```

That stages the task's own `files` alongside `tasks.yaml`, so its implementation
and its evidence land in one commit — reviewable and revertible on its own, and
safe to leave behind if the run is interrupted. Do it per task, not once at the
end; a single commit for a whole release is the habit this replaces.

Call it unconditionally. `shared/commit-protocol.md` defines every checkpoint,
and the command is a no-op that exits 0 when the workspace's `commit_policy` is
`off`, when there is no git repository, or when nothing under those paths changed.

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

Then run `ultraship commit develop-checkpoint`, so the pause point is in the
history the next session reads.

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
