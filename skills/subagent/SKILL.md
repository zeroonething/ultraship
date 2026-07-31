---
name: subagent
description: Use when a developer asks for parallel work, or when a workflow skill has independent work to fan out - resolves whether parallel execution is authorised, computes the tasks that are provably safe to run at once, dispatches them, and hands every result back to the calling skill to record
---

# /ultraship:subagent

Fan independent work out to concurrent agents, on the developer's terms.

**Read first:** `shared/subagent-protocol.md`. It is the contract — activation,
precedence, the brief, the return shape, and the four prohibitions all live
there, and this skill does not restate them.

**Invocation:** `/ultraship:subagent [product] [version]`, or a call from
`plan`, `develop`, `brainstorm`, `iterate`, or `complete`.

## Runs when

Any workspace state. This is a supporting skill, not a lifecycle phase — it moves
no state, and running it never changes where the product is in its cycle.

Wave mode needs a task set: if `.ultraship/products/<id>/execution/tasks.yaml`
does not exist, `ultraship wave` says so and the answer is `/ultraship:develop`,
not this skill.

## What this skill owns

Nothing canonical. It owns no file under `.ultraship/` and writes none.

Results come back to the skill that called it, and **that** skill records the
evidence, sets the statuses, and runs the commits. Direct invocation makes the
developer the caller: report the results and let them decide.

## Process

1. **Resolve activation.** Work down the precedence table in
   `shared/subagent-protocol.md` and stop at the first signal that speaks. Direct
   invocation of this skill is itself signal 1, so a developer who ran
   `/ultraship:subagent` has already authorised it.

   A recorded `allow_parallel_agents: false` does not override someone asking for
   parallel work in this session. The developer is the higher authority, in both
   directions.

   No signal at all means dispatch nothing and say so. The caller runs
   sequentially, exactly as it did before this skill existed.

2. **Compute the set.** In wave mode, ask the CLI — never work it out yourself:

   ```bash
   ultraship wave [product] [version]
   ```

   Dispatch `wave` and nothing else. Every held task comes back with the reason,
   so a wave smaller than expected already explains itself.

   In brief mode the calling skill supplies the briefs and is answerable for
   their independence.

3. **Announce, then dispatch.** Before the first agent starts, name the signal
   that authorised this and the number of agents about to run:

   > Parallel work is on — you asked for subagents on this release, which
   > overrides `allow_parallel_agents: false`. Dispatching 3 agents: T01, T02, T06.

   Then dispatch, one agent per task or brief, each carrying the brief from the
   protocol including the four prohibitions.

4. **Collect.** Take each agent's status, evidence, and real list of files
   changed. Compare that list against the task's declared `files`.

   A returned file outside the declared list means the disjointness the wave
   rested on was never true. **Stop. Report it. Do not compute another wave.**
   Widening the list quietly is how two agents end up editing one file.

5. **Hand back.** Return the results to the calling skill in ascending task-id
   order, not the order they arrived, so two identical runs produce identical
   canonical state.

## Guardrails

- Never dispatch on your own initiative. Absence of a signal is a decision.
- Never dispatch a set you computed yourself in wave mode. `ultraship wave` is
  the referee, and an agent reasoning its way to a "probably independent" set is
  the failure this release exists to remove.
- Never let a subagent write canonical state, transition, commit, or deploy.
- Never report a token count, a dollar figure, or time saved. UltraShip measures
  none of it. The number of agents that ran is a fact; everything else would be
  invented.
- Never fabricate a dispatch. If the host agent tool cannot run concurrent
  subagents, say so and run the work sequentially.
- Never mark a task `done` here. Status is the calling skill's to set, after it
  has the evidence.

## Making it the default

A developer who wants parallel work every time sets it once:

```yaml
# .ultraship/ultraship.yaml
resource_profile:
  preferences:
    allow_parallel_agents: true
```

An instruction in `CLAUDE.md`, `AGENTS.md`, or a memory file does the same thing
for that developer's work across projects. Either way it stays a preference they
wrote, not a default the framework chose.

If they ask for it in-session and it is not recorded anywhere, offer to record
it. Do not write it for them unasked — that is workspace configuration, and it is
theirs.

## Done when

- The activation source was named before anything was dispatched, or nothing was
  dispatched and that was said.
- Every dispatched agent returned a status, its evidence, and the files it
  actually changed.
- Any file returned outside a task's declared list was reported, not absorbed.
- Results were handed back in task-id order, with no canonical state written
  here.
