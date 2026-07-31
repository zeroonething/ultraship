<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Release history

## ultraship

| Version | Released | Mode | Delivered |
| --- | --- | --- | --- |
| 2.2.0 | 2026-08-01T00:00:00Z | release-ready | Every code-scanning alert on this repository is now either fixed in the code or ruled out of scope in writing. `cell()` in lib/views.mjs escaped a pipe without first escaping a backslash, so a canonical value containing `\\\|` rendered as a literal backslash beside a live cell-terminating pipe and broke the generated Markdown table; it now escapes both meta-characters in one pass, at the only Markdown-emitting site in lib/, and the views test that was too weak to catch it asserts the exact rendered escape. The CI workflow declares `permissions: contents: read`. The four remaining findings are inside vendor/yaml, a verbatim copy of npm yaml 2.9.0 — the newest published stable, whose upstream main carries those exact regexes unchanged and against which no advisory exists — so they are dismissed, each dismissal carrying the same comment naming the directory and pointing at SECURITY.md. The mechanism is not the one this release planned: a checked-in CodeQL config with paths-ignore for vendor/ was written, pushed, and refused by the platform, because GitHub will not process an advanced configuration while default setup is enabled and default setup here is enforced organisation-wide. Those two files were removed rather than shipped failing, and SECURITY.md records the refusal, the trade-off a dismissal carries, and the three steps to the stronger mechanism if the constraint ever lifts. The vendored-code policy — excluded from scanning, tracked by pinned version, answered by re-vendoring and never by patching — is written into SECURITY.md, CONTRIBUTING.md, and CLAUDE.md. CLAUDE.md, README.md, docs/CONTRACT.md, and docs/CONTRIBUTING-WITH-ULTRASHIP.md were audited against the repository and corrected, which found four drifts nobody had reported: "five skills" and "ten CLI commands" against a real 13 and 12, a 2.0.0 README badge, SECURITY.md promising fixes against the latest 1.x, and CONTRACT.md claiming migrate carries workspaces "to 2.0". No command, skill, schema, or canonical field changed. |
| 2.1.0 | 2026-07-31T00:00:00Z | release-ready | UltraShip fans work out to concurrent agents, and only when asked. A sixth skill, `/ultraship:subagent`, is the single place that happens; `shared/subagent-protocol.md` is the single contract behind it, and all five workflow skills reference it rather than restating a dispatch recipe. Three signals activate it — invoking the skill directly, telling the running skill to use subagents in this session, or recording the preference in project instructions, memory, or `allow_parallel_agents` — resolved by a written precedence table in which an in-session instruction wins in both directions. With none of them present nothing dispatches and every skill behaves exactly as it did on 2.0.0. The twelfth CLI command, `ultraship wave`, decides which tasks may run at once: status `todo`, every dependency `done`, and declared `files` disjoint from the rest of the wave and from anything in progress, ties broken by ascending task id so the same task set always yields the same wave. It reports the reason it held every other task, including named dependency cycles and dependency ids that match no task. It computes and never dispatches — a test asserts the module references no `child_process`, `fetch`, `http`, `spawn`, or `exec` — so the CLI still calls no model and touches no network. Develop consumes waves, records each returned evidence against its own task, commits each finished task through the existing `develop-task` checkpoint, and halts rather than computing another wave when an agent returns a file outside that task's declared list. A subagent writes no canonical state, transitions, commits, or deploys. Nothing was removed, renamed, or reshaped: a 2.0.0 workspace's data is valid data here, and `schema_version` stays `1`. This release was built in four CLI-computed waves of its own. |
| 2.0.0 | 2026-07-31T00:00:00Z | release-ready | The UltraShip lifecycle commits its own work. Four skills — plan, develop, iterate, and complete — call the eleventh CLI command, `ultraship commit <checkpoint>`, at the seven checkpoints defined in shared/commit-protocol.md. The roadmap, the contract, the generated task set, every finished task with its own files and its recorded evidence, every pause point, every plan change, and the immutable release record each land as a separate conventional commit whose subject is derived from canonical state. The command is local only — ALLOWED_GIT permits exactly rev-parse, status, add, and commit, so push, branch, and tag are unreachable by construction — and it stages only the explicit paths a checkpoint declares, with a pathspec on the commit, so a developer's unrelated staged work is never swept in. The new optional `commit_policy` defaults to `checkpoint`, which is the breaking change; `ultraship migrate` writes `off` into any workspace that omits the field, and an unmigrated workspace recording a pre-2.0 framework_version resolves to `off` as well, so no existing project starts committing without being asked. Nothing was removed or renamed and the ten state schemas are unchanged, so a 1.x workspace's data is still valid data. This release was developed and completed using the feature it ships. |
| 1.1.0 | 2026-07-22T00:00:00Z | release-ready | An outside developer can go from wanting to help to a merged contribution. CONTRIBUTING.md explains the two halves, the local test loop, and the SemVer classification that decides the bump; CODE_OF_CONDUCT.md and SECURITY.md set the terms of participation and a private disclosure channel; GitHub pull-request and issue templates prompt for the classification and test evidence; a CI workflow runs npm test and ultraship validate on every push and pull request across Node 20 and 22; and docs/CONTRIBUTING-WITH-ULTRASHIP.md shows a contributor how to drive their own change through the five skills, using this release as the worked example. The README links all of it. No CLI command, skill, or schema changed. |
| 1.0.0 | 2026-07-22T07:00:00Z | release-ready | The UltraShip public contract — ten CLI commands, the workflow and supporting skills, and the ten .ultraship schemas — is enumerated and frozen at 1.0 in docs/CONTRACT.md; changing any of it is a major version. Any pre-1.0 workspace migrates to 1.0 with ultraship migrate and validates, proven by a compatibility matrix over every pre-1.0 release; a deprecation and compatibility policy is documented; init keeps a workspace clean after a release; and product.yaml's public contract was reconciled to reality. |
| 0.5.1 | 2026-07-22T05:00:00Z | release-ready | The publish hook sources release notes from the CHANGELOG instead of --generate-notes, completion writes the changelog before running the hook, and the README and complete skill recommend the CHANGELOG-sourced pattern. The live v0.5.0 release notes were corrected to match. |
| 0.5.0 | 2026-07-22T04:00:00Z | release-ready | A project declares its deploy or publish command per target mode under delivery_hooks, and ultraship deploy runs the command for the release's target_mode, captures its stdout, stderr, and exit code as evidence, runs an optional smoke command on success, and exits non-zero so completion refuses the deployed mode when the command fails. This workspace declares and exercised its own GitHub-release publish hook. |
| 0.4.0 | 2026-07-22T00:00:00Z | release-ready | ultraship validate mechanically enforces three release-integrity invariants — a released record must be marked released in the roadmap, no shipped version may hold an execution pointer, and every declared version-bearing file must match the release version — so a completion cannot silently ship contradictory state. This workspace declares its own version files and validates clean. |
| 0.3.0 | 2026-07-21T20:00:00Z | release-ready | A developer records real limits on a release — time, budget, capacity — with `ultraship constraints set`, stored as user estimates and surfaced in state and views; develop and iterate ground release fit in them and recommend the fallback scope when the work no longer fits. Shipping a version now finalizes its state: `transition RELEASED` marks it released in the roadmap and archives the execution pointer, so no shipped release still reads DEVELOPING. `migrate` and `init` keep framework_version honest. |
| 0.2.0 | 2026-07-21T18:30:00Z | release-ready | A developer registers several independent products in one workspace and runs each on its own lifecycle and release track, selecting the active product, without their states competing. Registration, selection, per-product transitions, migration from 0.1.0, and cross-product views all work. |
| 0.1.0 | 2026-07-20T00:00:00Z | release-ready | The single-product idea-to-immutable-release loop across the five skills, with local canonical state and an immutability lock. |

### 2.2.0 known limitations

- mode is release-ready, not the contract's target_mode of published. Per the maintainer's release-after-merge convention the GitHub release is created from the main merge commit, so `ultraship deploy` is authorized only after this pull request merges. The record is pinned at completion time and cannot be amended afterwards, so the published mode reached post-merge is not reflected in evidence.deployments. This is the same shortfall 1.1.0, 2.0.0, and 2.1.0 recorded.

- Alerts 2 and 7 — the views escape and the workflow permissions — are fixed in code but were still open at completion time, because code scanning closes an alert only after re-analysing main, which happens after the merge. Alert 1, the same workflow-permissions rule from an earlier fix, reads state fixed, which is the precedent for how those two close. The release therefore cannot claim a zero open-alert count from its own evidence; it claims four dismissals it made and two fixes whose alerts close on the merge scan.

- The vendored exclusion is carried by per-alert dismissal, which is weaker than the checked-in path filter this release planned. A dismissal lives in GitHub's alert store, not in the diff, so no reviewer sees it in a pull request and a future maintainer could reverse it without meeting the reason. The comment on each alert and the section in SECURITY.md are the mitigation, and they are prose, not a mechanism.

- Adopting the stronger mechanism needs authority this release did not have — detaching the repository from the organisation security configuration requires a token with write:org. The steps are written into SECURITY.md so whoever holds that scope can carry them out; it is a repository-configuration change and needs no UltraShip release.

- Excluding vendor/ by any mechanism is a permanent blind spot. A future vendored dependency with a real vulnerability would not be flagged in this repository, and the only defences are the pinned version and the stated duty to re-vendor on an advisory. The four findings excluded here were each checked against the advisory database first; nothing guarantees the next maintainer does the same.

- The non-table Markdown in lib/views.mjs — the list items and bold lines that interpolate free text without cell() — is still unescaped. A pipe is harmless outside a table row, so this was excluded rather than fixed, but a newline in a free-text field can still break a bold line.

- CI is red on the pull request at completion time, by design: validate holds version_files to the greatest released version until this record exists. The green run on the merge commit is confirmed after the merge, not at release time.


### 2.1.0 known limitations

- mode is release-ready, not the contract's target_mode of published. Per the maintainer's release-after-merge convention the GitHub release is created from the main merge commit, so `ultraship deploy` — which runs the declared published hook — is authorized only after this pull request merges. The record is pinned at completion time and cannot be amended afterwards, so the published mode reached post-merge is not reflected in evidence.deployments. This is the same shortfall 1.1.0 and 2.0.0 recorded.
- The parallel path is verified by construction and by the wave command's tests, not by a run in which real concurrent subagents were dispatched. This release was built by a single agent consuming CLI-computed waves sequentially, so the wave rule, the per-task commits, and the halt-on-undeclared-file rule are all exercised, while genuine concurrency is not. Nothing in the framework can test an agent host's dispatch, which is why that half is a prose contract.
- Activation, the brief, the return shape, and the four prohibitions are prose an agent must follow. `ultraship wave` mechanically decides what may run at once, but nothing mechanically prevents a subagent from writing canonical state. The commit protocol limits the blast radius — each task commit stages only that task's declared files — but the prohibitions themselves are honoured, not enforced.
- The disjointness proof is only as good as each task's declared `files`. This release hit that gap twice on its own task set — T06 declared lib/migrate.mjs it never changed, and T08 declared the version files while changing NOTICE and test/install.test.mjs — both corrected in the record. Under real concurrency the second would have halted the run, which is the designed behaviour, but nothing detects a wrong list before dispatch.
- No cap on concurrent agents is defined. The open question was resolved by deferring it, because a cap belongs with the resource preferences and adding one would need the schema change this release excluded.
- An in-session activation is never persisted. The skill offers to record it and will not write `allow_parallel_agents` unasked, so a developer who wants it permanently edits one line themselves.
- The CI workflow is verified by running its exact steps locally; its green run on GitHub Actions is confirmed after the branch is pushed, not at release time.

### 2.0.0 known limitations

- mode is release-ready, not published, even though the contract's target_mode is published. Per the maintainer's release-after-merge convention the GitHub release is created from the main merge commit, so `ultraship deploy` — which runs the declared published hook — is authorized only after this pull request merges. The record is pinned at completion time and cannot be amended afterwards, so the published mode reached post-merge is not reflected in evidence.deployments. This is the same shortfall 1.1.0 recorded.
- This repository sets `commit_policy` explicitly rather than relying on the absent-field default, because its workspace recorded a pre-2.0 framework_version throughout development and an absent field would therefore have resolved to `off`. The default-on path is covered by tests rather than by this repository's own configuration.
- The CI workflow is verified by running its exact steps locally; its green run on GitHub Actions is confirmed after the branch is pushed, not at release time.
- A task whose `files` list in tasks.yaml is incomplete still produces a commit missing part of its implementation. The command reports what it staged so the gap is visible, but nothing detects it automatically.
- No checkpoint commits the raw deploy evidence under `.ultraship/products/*/evidence/`, which is gitignored by design. The evidence that ships is what the release record states.
- The first completion attempt was unwound. Running complete-release for real surfaced a defect — the version was derived only from active.yaml, which `transition RELEASED` archives before the checkpoint runs — so the record and its lock entry were rolled back, the defect fixed under T02, and completion redone. Nothing had been pushed or published at that point.

### 1.1.0 known limitations

- mode is release-ready, not published. Per the release-after-merge workflow, the durable GitHub release and any plugin-marketplace re-publish are the maintainer's authorized steps after this pull request merges to main; the publish delivery_hook is defined for the published mode only, so ultraship deploy had nothing to run for release-ready.
- The CI workflow is verified by inspection and by running its exact steps locally (npm test, ultraship validate); it first executes on GitHub Actions once the branch is pushed, so its green run on GitHub is confirmed post-merge, not at release time.
- The code of conduct and security policy commit a solo maintainer to enforcement and disclosure response with no SLA; both are deliberately minimal and honest about response expectations rather than promising a timeline.

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
