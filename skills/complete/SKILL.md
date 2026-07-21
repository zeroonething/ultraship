---
name: complete
description: Use when a release claims to satisfy its contract - runs the applicable completion gates, stores evidence, produces the release record, and makes it immutable, or returns the release to develop or iterate
---

# /ultraship:complete

Verify, package, deploy or publish as authorized, record, and close one version.

Completion is evidence-based. A release is not complete because it feels
complete. It is complete because commands were run and their output was seen.

**Read first:** `shared/skill-contract.md`, `shared/release-contract.md`.

**Invocation:** `/ultraship:complete [product] [version]`.

## Runs when

The workspace state is `DEVELOPING` or `COMPLETING`.

If implementation has not happened, report the unmet gates and route to
`/ultraship:develop`. Do not begin a completion attempt that cannot succeed.

## What this skill owns

- The completion half of `releases/<version>.yaml`
- `.ultraship/products/<id>/evidence/<version>/`
- `.ultraship/releases.lock`
- `CHANGELOG.md` and release notes in their normal locations

## What this skill does not own

Scope, acceptance criteria, and requirements. If a gate fails because the
contract is wrong rather than the code, stop and route to `/ultraship:iterate`.

You may fix release-blocking defects in the code directly. You may not change
what the release promised in order to make it pass.

## Completion gates

Build the applicable checklist from the contract, the product type, and the
target mode. Run the narrowest reliable check first, then widen.

### Product gates
- The intended user or operational outcome actually works.
- Everything in `scope.included` is present.
- Everything in `scope.excluded` is still absent.
- No placeholder or fake behaviour is presented as real.

### Functional gates
- Every acceptance criterion passes.
- Critical workflows pass end to end.
- Error behaviour is validated, not assumed.
- Edge cases appropriate to the release's risk are covered.

### Engineering gates
- Automated tests pass.
- Static analysis passes where configured.
- The build succeeds.
- Dependencies resolve.
- Migrations apply, and roll back if that is claimed.

### Security gates
- Required security checks pass.
- No secrets are committed. Check, do not assume.
- Permissions match what the product definition says.
- Sensitive data handling matches the product definition.

### Operational gates
- Configuration is present.
- Health checks work.
- Logging and observability exist as the contract describes.
- Rollback or recovery is documented and plausible.

### Delivery gates
- The target artifact is produced.
- Deployment or publication succeeded, where authorized.
- Post-deployment smoke tests pass.
- The version is tagged.
- Release notes exist and the changelog is updated.

### Truth gates
- Canonical state is updated.
- Evidence is stored.
- Known limitations are recorded.
- The released record is pinned.

## Evidence, not assertion

Use `ultraship:verification-before-completion` before claiming anything passed.

Every evidence entry names the command and its result. "Looks good", "should
work", and "tests pass" without output are not evidence — they are assertions
wearing evidence's clothes.

```yaml
evidence:
  tests:
    - npm test — 112 passing, 0 failing
  builds:
    - npm run build — exit 0
  reviews: []
  deployments: []
  health_checks: []
```

Store fuller command output under
`.ultraship/products/<id>/evidence/<version>/`.

## Honesty about deployment

`delivery.target_mode` states the intended mode. Achieve it or record what
actually happened.

**Never claim** `production-deployed` or `published` when credentials,
permissions, or access were unavailable. Record `mode: release-ready`, note the
missing access under `known_limitations`, and tell the user what remains. A
release-ready artifact is a complete release. A fabricated deployment is a lie
that someone will discover during an incident.

## When a gate fails

Do not mark the release complete. Then:

1. Name the exact gate that failed.
2. Classify it: implementation defect, or contract defect.
3. Preserve the evidence of the failure.
4. Implementation defect → fix it here if it is release-blocking and small,
   otherwise return to `/ultraship:develop`.
5. Contract, scope, or requirement defect → route to `/ultraship:iterate`.
6. External dependency unavailable → pause safely with a checkpoint and record
   the blocker.

A failed completion attempt is a normal outcome. The release stays mutable and
the record stays unwritten.

## Recording the release

Once every applicable gate passes, add the completion half of the contract:

```yaml
status: released
released_at: 2026-07-21T09:00:00Z
mode: release-ready
delivered: A freelancer records an invoice and marks it paid.
evidence:
  tests:
    - npm test — 112 passing, 0 failing
  builds:
    - npm run build — exit 0
  reviews: []
  deployments: []
  health_checks: []
known_limitations:
  - Single user only.
supersedes: null
next_recommended_version: 0.2.0
immutable: true
```

`known_limitations` is where honesty lives. Every real release has them. An
empty list on a first release usually means they were not looked for.

Then pin the record. Its SHA-256 goes into `.ultraship/releases.lock`, and
`ultraship validate` fails afterwards if the file changes. This is what makes
`immutable: true` a fact rather than a wish. Corrections require a new version.

Finally, run `ultraship transition RELEASED`, then `ultraship validate` and
`ultraship views`.

`ultraship transition RELEASED` finalizes the shipped version's state itself: it
marks the version `released` in `roadmap.yaml` and archives the execution pointer
to `execution/archive/<version>.yaml`, so no shipped version keeps reading
`execution_state: DEVELOPING`. Do not hand-edit the roadmap status or the active
pointer to match — the transition already did, and a manual edit only competes
with it.

## Process

1. Run `ultraship state`; confirm the release and its target mode.
2. Run `ultraship transition COMPLETING`.
3. Build the gate checklist from the contract.
4. Run the narrowest reliable validation, then widen.
5. Fix release-blocking defects; route scope changes to `/ultraship:iterate`.
6. Produce the artifact.
7. Deploy or publish, if authorized.
8. Verify the target environment.
9. Write release notes and update the changelog.
10. Write the completion record and pin it.
11. Run `ultraship transition RELEASED`, `ultraship validate`, `ultraship views`.
12. Recommend the next version.

## Done when

- Every applicable gate passed, and you saw it pass.
- Evidence is stored and cites real command output.
- The target mode was achieved, or the shortfall is recorded.
- The release record is written and pinned.
- Known limitations are honest.
- `ultraship validate` exits 0.
