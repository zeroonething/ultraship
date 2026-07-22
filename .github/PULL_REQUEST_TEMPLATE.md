<!--
Thanks for contributing to UltraShip! Please read CONTRIBUTING.md first.
Keep pull requests small and single-purpose.
-->

## What changed

<!-- One or two sentences. What does this PR do and why? -->

## SemVer classification

<!-- Which half does this touch, and what bump does it force?
     See docs/CONTRACT.md and docs/COMPATIBILITY.md. -->

- [ ] **Patch** — a fix, no public-contract change.
- [ ] **Minor** — additive (new command, optional schema field, skill, or a
      validate check that only rejects genuinely inconsistent state).
- [ ] **Major** — removes or changes the behaviour of a command, a skill's
      workflow, or a schema's shape.
- [ ] **None of the above** — docs, tests, or internal-only change.

If this is a **major** change: does it include an `ultraship migrate` step and a
deprecation of what it replaces? <!-- yes / no / n-a -->

## Test evidence

<!-- Paste the relevant output. Both must pass before review. -->

- [ ] `npm test` passes
- [ ] `node bin/ultraship.mjs validate` exits 0

```
<!-- paste npm test / validate output here -->
```

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md).
- [ ] New or changed CLI/`lib` behaviour has tests.
- [ ] I did not hand-edit generated views or released records.
- [ ] The change is single-purpose.
