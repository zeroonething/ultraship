<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Release history

## ultraship

| Version | Released | Mode | Delivered |
| --- | --- | --- | --- |
| 0.3.0 | 2026-07-21T20:00:00Z | release-ready | A developer records real limits on a release — time, budget, capacity — with `ultraship constraints set`, stored as user estimates and surfaced in state and views; develop and iterate ground release fit in them and recommend the fallback scope when the work no longer fits. Shipping a version now finalizes its state: `transition RELEASED` marks it released in the roadmap and archives the execution pointer, so no shipped release still reads DEVELOPING. `migrate` and `init` keep framework_version honest. |
| 0.2.0 | 2026-07-21T18:30:00Z | release-ready | A developer registers several independent products in one workspace and runs each on its own lifecycle and release track, selecting the active product, without their states competing. Registration, selection, per-product transitions, migration from 0.1.0, and cross-product views all work. |

### 0.3.0 known limitations

- Marketplace publish is pending. v0.3.0 goes live when the PR merges, the v0.3.0 tag is live on main, and the plugin is reinstalled. Achieved mode is release-ready, not the intended published, until then.
- Constraints are free text. The framework cannot observe units, so it stores and echoes them without interpreting or comparing them numerically.
- No provider telemetry. Release fit stays qualitative unless the user supplies estimates, which are recorded as user-estimate and never rendered as measured.

### 0.2.0 known limitations

- Not yet published to the zeroonething marketplace; tagging v0.2.0 and the plugin reinstall remain. Achieved mode is release-ready, not the intended published.
- No coordinated cross-product releases or shared capabilities, by design for a solo developer with independent projects.
- No provider telemetry; release fit stays qualitative until resource-aware execution in 0.3.0.


_Canonical sources: products/<id>/releases/<version>.yaml_
