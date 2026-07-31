# The subagent protocol

`/ultraship:subagent` is the one place UltraShip fans work out to concurrent
agents. Every skill that wants parallel work calls it and reads this file; none
of them restates a dispatch recipe of its own.

Nothing here runs by default. With no activation signal present, every skill
behaves exactly as it did before this protocol existed.

## Activation

Three signals turn it on. Any one is enough.

1. **Direct invocation.** The developer runs `/ultraship:subagent`, with or
   without a running skill around it.
2. **In-session instruction.** The developer tells the running skill to use
   subagents — "run these in parallel", "use subagents for this release". It
   applies to the current flow and is not written anywhere.
3. **Recorded preference.** `allow_parallel_agents: true` under
   `resource_profile.preferences` in `.ultraship/ultraship.yaml`, or an
   instruction in the project's own instruction files (`CLAUDE.md`, `AGENTS.md`)
   or memory that says to use subagents for this developer's work. This is how a
   developer makes parallel work their default.

### Precedence

Read top to bottom and stop at the first match.

| Signal | Decides |
| --- | --- |
| An explicit in-session instruction, either way | Wins outright, including "no subagents for this" against a recorded `true`, and including "use subagents" against a recorded `false` |
| A recorded instruction in project instructions or memory | Applies when the session said nothing |
| `allow_parallel_agents` in `.ultraship/ultraship.yaml` | Applies when neither of the above spoke |
| None of the above | Sequential. Dispatch nothing. |

The developer is always the higher authority. A recorded `false` never overrules
someone asking for parallel work in the moment, and a recorded `true` never
overrules someone asking for it to stop.

### Announce before dispatching

Before the first agent starts, say which signal matched and how many agents are
about to run:

> Parallel work is on — `allow_parallel_agents: true` in `.ultraship/ultraship.yaml`.
> Dispatching 3 agents: T01, T02, T06.

Parallel execution is never a surprise. A developer who did not expect it gets
one line in which to stop it.

## Two dispatch modes

**Wave mode** — used by `develop`, where the work is tasks. The set of tasks that
may run at once is computed by the CLI, never by an agent:

```bash
ultraship wave [product] [version]
```

It returns the tasks whose status is `todo`, whose every `depends_on` id is
already `done`, and whose declared `files` are disjoint from every other task in
the wave and every task in progress — plus, for every task it held back, the
reason. Ties break by ascending task id, so the same task set always yields the
same wave. A task declaring no `files` carries no proof of independence and runs
alone.

**Brief mode** — used by `plan`, `brainstorm`, `iterate`, and `complete`, where
the work is investigation rather than tasks. The calling skill writes the briefs
itself and is responsible for their independence. Brief-mode agents read; they do
not write project files.

## The brief

Every dispatched agent receives, in its own words but with nothing omitted:

- **The one job.** For wave mode, the task's `summary` and `why_required`. For
  brief mode, the question to answer.
- **The acceptance criteria** it must satisfy, verbatim from the task.
- **The files it may touch** — the task's declared `files`, and nothing else.
  Brief-mode agents get no write scope at all.
- **The prohibitions below**, stated, not assumed.
- **What to return**, in the shape below.

## The return

An agent returns text, in this order:

1. **Status** — `done` or `blocked`, and if blocked, what blocked it.
2. **Evidence** — the commands it ran and what they printed. Test counts come
   from a run the agent actually saw, never from an expectation.
3. **Files changed** — the real list, whether or not it matches the brief.

The calling skill compares that list against the task's declared `files`. A file
outside the declared list means the disjointness the wave rested on was never
true, so the calling skill **halts and reports** rather than computing another
wave. It does not quietly widen the list.

## The four prohibitions

A subagent never:

1. **Writes any file under `.ultraship/`.** Canonical state has one owner, and it
   is the calling skill.
2. **Runs `ultraship transition`.** Lifecycle moves belong to the skill that owns
   the phase.
3. **Runs `ultraship commit`.** The calling skill commits each finished task
   through the checkpoints in `shared/commit-protocol.md`, so the commit lands
   with the evidence already recorded.
4. **Runs `ultraship deploy`.** Deployment is a release decision, not a task.

An agent that believes it needs one of these is describing a plan change. It
returns `blocked` with the reason, and the developer decides.

Beyond the four: no agent marks its own task `done`, and none pushes, branches,
or tags — outward-facing git stays the developer's authorized step, exactly as
`shared/commit-protocol.md` already requires.

## Recording and committing

The calling skill, never the agent:

- writes each returned evidence into that task's `evidence` in `tasks.yaml`, in
  ascending task-id order rather than the order results arrived, so two identical
  runs produce identical canonical state;
- sets each finished task's `status` to `done`;
- runs `ultraship commit develop-task --task <id>` per finished task;
- recomputes the wave and repeats.

## Honesty

UltraShip has no provider telemetry. Report no token count, no dollar figure, and
no time saved for parallel execution — none of it is measured, and a number here
would be fiction with a decimal point. Say how many agents ran. That is a fact.

If the host agent tool cannot dispatch concurrent subagents, say so plainly and
run sequentially. Never fabricate a dispatch that did not happen.
