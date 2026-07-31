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
| 2.0.0 | A developer's lifecycle work commits itself by default. Plan, develop, iterate, and complete each run ultraship commit at defined checkpoints, so the roadmap, the contract, every finished task, every recorded plan change, and the immutable release record land as separate, readable, conventionally-formatted commits instead of one undifferentiated blob at the end. A developer who does not want the framework touching git sets commit_policy to off, and any workspace upgraded from 1.x has that written for it by ultraship migrate, so no existing project changes behaviour without asking. This is the 2.0 public contract. | specified | released |
| 2.1.0 | A developer asks for parallel work and gets it, on their own terms. A sixth skill, /ultraship:subagent, is the one place UltraShip fans work out to concurrent agents, and the workflow skills call it instead of each inventing a dispatch recipe: develop hands it a wave of tasks that ultraship wave proved independent — dependencies satisfied, declared files disjoint — and plan hands it independent research briefs. It never runs on its own: it activates only when the developer invokes it directly, tells the running skill to use subagents, or has recorded that preference in their project instructions, memory, or the allow_parallel_agents flag, which is how they make it their default. Every subagent returns evidence and files changed and writes no canonical state, so the calling skill stays the single owner of tasks.yaml, of the transitions, and of the commits — parallel execution changes how fast the release is built, never who is allowed to say what is true about it. | specified | released |


_Canonical sources: products/<id>/roadmap.yaml_
