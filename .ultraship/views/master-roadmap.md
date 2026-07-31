<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Master roadmap

## ultraship

| Version | Outcome | Detail | Status |
| --- | --- | --- | --- |
| 0.1.0 | One developer takes one product from a vague idea to an immutable release record, entirely in local canonical state, using the five skills. | outline | released |
| 0.2.0 | A developer runs several independent products from one workspace, each on its own lifecycle and release track, with no product's state competing with another's. | specified | released |
| 0.3.0 | A developer supplies real constraints — time, budget, capacity — and gets release-fit guidance and adaptive scope recommendations grounded in them. | specified | released |
| 0.4.0 | A developer trusts that a completed release is internally consistent, because UltraShip mechanically enforces the invariants a release must satisfy — roadmap and release status agree, no shipped version still holds an execution pointer, and the project's version-bearing files all match the release version — so a completion cannot silently ship contradictory state. | specified | released |
| 0.5.0 | A developer declares their project's deploy or publish command per target mode, and /ultraship:complete runs it, captures its real output, and records verified deployment evidence — so a release reaches staging-deployed, production-deployed, or published with proof from the actual command, and honestly stays release-ready when the command fails. | specified | released |
| 0.5.1 | A publish hook produces a real release: the GitHub release notes come from the project's CHANGELOG instead of a bare auto-generated list of merged pull-request titles. | specified | released |
| 1.0.0 | A developer relies on UltraShip for real projects: every CLI command, skill, and .ultraship schema is enumerated and frozen as the 1.0 public contract — changing any needs a major bump; any pre-1.0 workspace upgrades with ultraship migrate and keeps working; and a written deprecation policy plus a compatibility test matrix guarantee nothing breaks underneath them without warning and a major version. | specified | released |
| 1.1.0 | An outside developer goes from wanting to help to a merged contribution: a CONTRIBUTING guide explains the two-halves architecture, the frozen public contract and the SemVer rule for changing it, and how to run the tests; a code of conduct and security policy set expectations; GitHub pull-request and issue templates guide submissions; CI runs the test suite on every pull request; and the guide shows contributors how to drive their own change through UltraShip's five skills as a Minimum Complete Release. | specified | released |
| 1.2.0 | A developer opts in to a commit policy and their lifecycle work commits itself: plan, develop, iterate, and complete each run ultraship commit at defined checkpoints, so the roadmap, the contract, every finished task, every recorded plan change, and the immutable release record land as separate, readable, conventionally-formatted commits instead of one undifferentiated blob at the end — and a completion refuses to ship while canonical state is still uncommitted. | specified | planned |
| 1.3.0 | A developer's release finishes in fewer wall-clock passes because /ultraship:develop dispatches the tasks whose dependencies are already satisfied and whose files do not overlap to parallel subagents in one wave, records each returned evidence against its task, commits each completed task, and then computes the next wave — with the existing allow_parallel_agents preference deciding whether any of it happens. | outline | planned |


_Canonical sources: products/<id>/roadmap.yaml_
