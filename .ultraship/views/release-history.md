<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Release history

## ultraship

| Version | Released | Mode | Delivered |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-22T07:00:00Z | release-ready | The UltraShip public contract — ten CLI commands, the workflow and supporting skills, and the ten .ultraship schemas — is enumerated and frozen at 1.0 in docs/CONTRACT.md; changing any of it is a major version. Any pre-1.0 workspace migrates to 1.0 with ultraship migrate and validates, proven by a compatibility matrix over every pre-1.0 release; a deprecation and compatibility policy is documented; init keeps a workspace clean after a release; and product.yaml's public contract was reconciled to reality. |
| 0.5.1 | 2026-07-22T05:00:00Z | release-ready | The publish hook sources release notes from the CHANGELOG instead of --generate-notes, completion writes the changelog before running the hook, and the README and complete skill recommend the CHANGELOG-sourced pattern. The live v0.5.0 release notes were corrected to match. |
| 0.5.0 | 2026-07-22T04:00:00Z | release-ready | A project declares its deploy or publish command per target mode under delivery_hooks, and ultraship deploy runs the command for the release's target_mode, captures its stdout, stderr, and exit code as evidence, runs an optional smoke command on success, and exits non-zero so completion refuses the deployed mode when the command fails. This workspace declares and exercised its own GitHub-release publish hook. |
| 0.4.0 | 2026-07-22T00:00:00Z | release-ready | ultraship validate mechanically enforces three release-integrity invariants — a released record must be marked released in the roadmap, no shipped version may hold an execution pointer, and every declared version-bearing file must match the release version — so a completion cannot silently ship contradictory state. This workspace declares its own version files and validates clean. |
| 0.3.0 | 2026-07-21T20:00:00Z | release-ready | A developer records real limits on a release — time, budget, capacity — with `ultraship constraints set`, stored as user estimates and surfaced in state and views; develop and iterate ground release fit in them and recommend the fallback scope when the work no longer fits. Shipping a version now finalizes its state: `transition RELEASED` marks it released in the roadmap and archives the execution pointer, so no shipped release still reads DEVELOPING. `migrate` and `init` keep framework_version honest. |
| 0.2.0 | 2026-07-21T18:30:00Z | release-ready | A developer registers several independent products in one workspace and runs each on its own lifecycle and release track, selecting the active product, without their states competing. Registration, selection, per-product transitions, migration from 0.1.0, and cross-product views all work. |
| 0.1.0 | 2026-07-20T00:00:00Z | release-ready | The single-product idea-to-immutable-release loop across the five skills, with local canonical state and an immutability lock. |

### 1.0.0 known limitations

- mode is release-ready, not published. By the release-after-merge workflow, the durable GitHub release is created from the main merge commit after this PR merges, via the CHANGELOG-sourced publish hook; the marketplace reinstall verified to report 1.0.0 remains the developer's authorized step.
- schema_version is frozen at 1 because every change through 0.5 was additive; the compatibility matrix therefore exercises the 0.1.0 legacy shape and the additive-config shapes, since there is only one schema_version to migrate to.
- The compatibility fixtures are constructed per version's feature set rather than committed as separate near-duplicate trees; a future genuinely-distinct schema_version would add a committed fixture and a migration step.

### 0.5.1 known limitations

- mode is release-ready, not published. Per the release-after-merge workflow, the durable GitHub release is created from the main merge commit after this PR merges, via the CHANGELOG-sourced publish hook; the marketplace reinstall verified to report 0.5.1 remains the developer's authorized step.
- The awk notes extraction assumes a "## [version]" CHANGELOG heading style; projects with another changelog format declare a different hook.

### 0.5.0 known limitations

- mode is release-ready, not published. By choice, the durable public GitHub release is (re)created from the main merge commit after the PR merges, via the same delivery_hooks publish hook — not from the unmerged branch. The hook is proven (it ran exit 0 during completion); the marketplace reinstall verified to report 0.5.0 remains the developer's authorized step.
- delivery_hooks version substitution uses the shell's own environment expansion ($VERSION); a project on a shell without it would need to inline the version. The vendored path assumes a POSIX shell.
- Captured hook output is stored verbatim under evidence/<version>/, so a hook that prints secrets would write them into the repository; hooks must not print secrets.

### 0.4.0 known limitations

- mode is release-ready, not published. The marketplace publish, the v0.4.0 git tag push to zeroonething/ultraship, and the plugin reinstall verified to report 0.4.0 are the developer's authorized human steps and were not performed by the agent.
- Version-file location is a JSON dot-path only; non-JSON version carriers (README badges, plain-text files) cannot yet be declared. Deferred as an additive extension.
- The version-file check compares against the greatest released version; it does not verify a workspace mid-release whose files are intentionally ahead until the record is written.

### 0.3.0 known limitations

- Marketplace publish is pending. v0.3.0 goes live when the PR merges, the v0.3.0 tag is live on main, and the plugin is reinstalled. Achieved mode is release-ready, not the intended published, until then.
- Constraints are free text. The framework cannot observe units, so it stores and echoes them without interpreting or comparing them numerically.
- No provider telemetry. Release fit stays qualitative unless the user supplies estimates, which are recorded as user-estimate and never rendered as measured.

### 0.2.0 known limitations

- Not yet published to the zeroonething marketplace; tagging v0.2.0 and the plugin reinstall remain. Achieved mode is release-ready, not the intended published.
- No coordinated cross-product releases or shared capabilities, by design for a solo developer with independent projects.
- No provider telemetry; release fit stays qualitative until resource-aware execution in 0.3.0.

### 0.1.0 known limitations

- Reconstructed from the archived planning docs; the original 0.1.0 shipped before release contracts were tracked, so the completion evidence here is not preserved and this file is a historical reference, not the enforced immutable record.
- Single product only; multi-product workspaces arrive in 0.2.0.


_Canonical sources: products/<id>/releases/<version>.yaml_
