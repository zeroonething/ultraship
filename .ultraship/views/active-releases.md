<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Active releases

## ultraship 2.1.0

**Execution state:** DEVELOPING
**Release fit:** probable
**Target mode:** published
**Outcome:** Ask for parallel work and get it, on their own terms. A sixth skill, `/ultraship:subagent`, is the one place UltraShip fans work out to concurrent agents. A developer reaches it three ways: they invoke `/ultraship:subagent` directly, they tell the running skill to use subagents for this flow, or they record the preference once — in their project instructions, in a memory file, or as `allow_parallel_agents: true` — and every later run picks it up. Nothing is parallel by default; with none of the three present, every skill runs exactly as it does on 2.0.0. When it does activate, `/ultraship:develop` asks `ultraship wave` which tasks are provably independent — every dependency already `done`, declared `files` disjoint from every other task in the wave and from anything in progress — dispatches that wave, records each returned evidence against its task, commits each finished task through the existing `develop-task` checkpoint, and computes the next wave. `/ultraship:plan` uses the same skill for independent research briefs while drafting a roadmap or a contract. A subagent returns evidence and the files it actually changed and writes no canonical state, runs no transition, and makes no commit, so the calling skill remains the single owner of what is true about the release.



_Canonical sources: products/<id>/execution/active.yaml, products/<id>/releases/<version>.yaml_
