# Compatibility and deprecation policy

UltraShip follows [Semantic Versioning](https://semver.org/). The public
contract it applies to is enumerated in [CONTRACT.md](CONTRACT.md): the CLI
commands, the skills, and the `.ultraship/` schemas. This document states how
that contract is allowed to change and how change is announced.

## What each version level may change

- **Major (`X.0.0`)** — may remove or change the behaviour of a contract item: a
  command, a command's meaning, a skill's workflow, or a schema's shape. A major
  release is the only place a documented guarantee may break, and only for items
  that were deprecated in a prior minor release.
- **Minor (`X.Y.0`)** — may add: a new command, a new optional schema field, a
  new skill, a new validate check that only rejects genuinely inconsistent state.
  A minor release never breaks a workspace written by an earlier release of the
  same major.
- **Patch (`X.Y.Z`)** — fixes only. No contract change.

## What changed in 2.0

**The break is one default.** In 1.x the skills never touched git. In 2.0 they
commit their own output at the checkpoints in
[shared/commit-protocol.md](../shared/commit-protocol.md), and `commit_policy`
defaults to `checkpoint`. That is a change to a documented skill workflow, which
is a major version and nothing less.

**`ultraship migrate` absorbs it.** Only `ultraship init` ever writes
`commit_policy`, so a workspace that omits the field predates the protocol.
`migrate` writes `off` into any such workspace, and the effective policy for an
unmigrated one is decided by the `framework_version` it recorded — pre-2.0 reads
as `off`. An existing project therefore never starts committing without being
asked, whether or not it migrates promptly.

**Nothing was removed or renamed.** No 1.x command, skill, or schema field is
gone, so no item required the deprecation window below. `ultraship commit` is an
addition, `commit_policy` is a new optional field, and `schema_version` stays `1`
because the canonical state shapes did not break — a 1.x workspace's data is
still valid data.

The remedy, if you want the 1.x behaviour: run `ultraship migrate`, or set
`commit_policy: off` in `.ultraship/ultraship.yaml` by hand.

## The compatibility guarantee

- A workspace written by any `2.x` release passes `ultraship validate` on any
  later `2.x` release. Optional fields a newer release adds are absent, not
  invalid, in an older workspace.
- A workspace written by a `1.x` release also passes `ultraship validate` on
  `2.x` unchanged. Only its behaviour differs, and `migrate` pins that.
- `ultraship migrate` is forward-only and idempotent. It carries a workspace from
  any earlier version to the installed one and is safe to run repeatedly. It never
  requires a hand edit of canonical state.
- Released records are immutable, pinned by SHA in `.ultraship/releases.lock`. A
  correction is a new version, never an edit.

## How a change is deprecated

A contract item is never removed without warning. The path is:

1. **Announce.** The item is marked deprecated in the CHANGELOG and its
   documentation in the minor release that introduces the replacement. It keeps
   working unchanged.
2. **Overlap.** The deprecated item and its replacement both work for at least
   one full minor release, so a project can migrate on its own schedule.
3. **Remove.** The item is removed only in the next major release, with a
   `ultraship migrate` step that upgrades any workspace still using it.

A new optional schema field is not a deprecation: older workspaces simply omit
it, and `migrate` fills a default where one is needed.

## Reporting a break

A `2.x` release that breaks a `2.x` workspace is a bug, not a contract change.
Report it against the tag that introduced it; the fix is a patch, and the
workspace behaviour is restored.
