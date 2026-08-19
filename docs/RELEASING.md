# Releasing UltraShip

The procedure below is the whole release. It is written here rather than living
in one person's habit and one machine's gitignored workspace file, because
`.ultraship/` is local-only: it is absent from every fresh clone and invisible in
every pull request.

Only the last step is automated. `.github/workflows/release.yml` reacts to a tag;
it never creates one, never merges anything, and never pushes.

## The order

1. **Complete the release.** Run `/ultraship:complete <product> <version>`. It
   runs the completion gates, stores the evidence, writes the release record, and
   pins every released file's SHA-256 in `.ultraship/releases.lock`. Corrections
   after this point require a new version — the record is immutable by mechanism.
2. **Bump the version manifests.** Every file in `version_files` reads the new
   version: `package.json`, `.claude-plugin/plugin.json`,
   `.claude-plugin/marketplace.json`, and `.codex-plugin/plugin.json`.
   `ultraship validate` fails if one of them drifts, and so does the release
   workflow.
3. **Write the CHANGELOG section.** `## [<version>] — <date>`. The workflow
   publishes this section verbatim as the release body and fails if it is
   missing, so an unwritten section stops the release rather than shipping a
   blank one.
4. **Merge the branch into `develop`,** through a pull request. CI must be green.
5. **Merge `develop` into `main`.**
6. **Push the tag from `main`:**

   ```bash
   git checkout main && git pull
   git tag v<version> && git push origin v<version>
   ```

7. **The workflow cuts the release.** The tag fires `release.yml`, which:
   - refuses the release if the tag disagrees with any version manifest;
   - runs `npm test` and a CLI smoke test — `ultraship init` then
     `ultraship validate` in a scratch directory — and refuses on either failure;
   - creates the GitHub release named `UltraShip <version>` with that version's
     CHANGELOG section as its body.

   Nobody runs a release command. `workflow_dispatch` re-runs it without a second
   tag if something needs another attempt.

8. **Verify, and leave the tree clean.** After the run finishes:

   ```bash
   ultraship deploy   # verifies the release the workflow created
   git status         # must be empty
   ```

## The release is created once, by one mechanism

The workflow creates the release. The `published` delivery hooks in
`.ultraship/ultraship.yaml` only *verify* one that already exists — they must
never create it, or a release is either duplicated or the second attempt fails:

```yaml
delivery_hooks:
  published:
    deploy: gh release view v$VERSION --json url -q .url
    smoke: gh release view v$VERSION --json tagName -q .tagName
```

Because the record is sealed in step 1 and the release is cut in step 7, the
completion mode is `release-ready`, not `published`. That ordering is deliberate:
the record describes what was built and verified, and the tag is pushed from a
merge commit that already contains it. Step 8 is the verification that the
publish actually happened, and its output is transient evidence, not part of the
immutable record.

## If the release fails

- **Tag/manifest mismatch or a red suite** — nothing is published. Fix the tree
  on a branch, merge it forward, delete and re-push the tag, or re-run the
  workflow with `workflow_dispatch`.
- **A defect found after publishing** — a new patch version. Released records are
  immutable and a shipped release is never edited.

## What this repository will not automate

Tagging, merging, and pushing stay the developer's own authorized steps.
`ultraship commit` permits five git subcommands — `rev-parse`, `status`, `add`,
`check-ignore`, `commit` — and refuses every other, so nothing the framework runs
can leave the machine.
