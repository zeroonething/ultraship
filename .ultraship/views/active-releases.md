<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Active releases

## ultraship 2.0.0

**Execution state:** DEVELOPING
**Release fit:** high
**Target mode:** published
**Outcome:** Run the UltraShip lifecycle and have it commit its own work as it goes, without configuring anything. Plan commits the roadmap and then the release contract; develop commits the generated task set, then every task the moment it reaches `done` with its evidence and its own declared files, and every checkpoint file; iterate commits the iteration record together with every canonical file the change touched; complete commits the captured evidence and then the immutable release record with its lock entry and version-file bumps. Each commit carries a single conventional-format message derived from canonical state, not invented by the agent. The command is local-only — it stages and commits, and never pushes, branches, or tags, so the developer keeps every outward-facing step. A developer who does not want the framework touching git sets `commit_policy` to `off`, and any workspace upgraded from 1.x has exactly that written for it by `ultraship migrate`, so no existing project starts committing without being asked.



_Canonical sources: products/<id>/execution/active.yaml, products/<id>/releases/<version>.yaml_
