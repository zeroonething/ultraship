<!--
Generated from canonical UltraShip state. Do not edit directly.
Run `ultraship views` to regenerate.
-->
# Active releases

## ultraship 2.2.0

**Execution state:** DEVELOPING
**Release fit:** high
**Target mode:** published
**Outcome:** Trust UltraShip's GitHub security tab, because every open code-scanning alert is either fixed in the repository or ruled out of scope in writing. The one real defect CodeQL found in UltraShip's own code is fixed: `cell()` in lib/views.mjs escaped a pipe to `\|` without first escaping a backslash, so a canonical value containing `\|` rendered as a literal backslash followed by a cell-terminating pipe and broke the generated Markdown table. It is fixed at its single site — the only Markdown-emitting function in lib/ — and the existing views test, whose assertion was too weak to catch it, is strengthened with a backslash-bearing fixture. The CI workflow declares an explicit least-privilege `permissions: contents: read` instead of inheriting whatever the repository or organisation default happens to be. Code scanning moves off GitHub's default setup onto a checked-in `.github/workflows/codeql.yml` with a `.github/codeql/codeql-config.yml` that excludes `vendor/`, because default setup accepts no path filter and UltraShip ships a verbatim copy of the `yaml` package it does not own and must not patch. The rule for third-party code — excluded from scanning, tracked by version, upgraded rather than patched when an advisory names it — is written into CONTRIBUTING and SECURITY, and CLAUDE.md gains the same rule so an agent working in this repository does not reintroduce the pattern.



_Canonical sources: products/<id>/execution/active.yaml, products/<id>/releases/<version>.yaml_
