# Security Policy

## Supported versions

UltraShip follows [Semantic Versioning](https://semver.org/). Security fixes are
released against the latest `2.x` release. Older `2.x` lines are not backported —
upgrade to the current `2.x`, which is always compatible with a `2.x` workspace
(see [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md)).

| Version | Supported |
| --- | --- |
| Latest `2.x` | ✅ |
| Older `2.x` | ⚠️ Upgrade to the latest `2.x` |
| `1.x` and earlier | ❌ |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through GitHub's private vulnerability reporting:
[open a security advisory](https://github.com/zeroonething/ultraship/security/advisories/new).
This keeps the report confidential until a fix is available.

Please include:

- What the vulnerability is and the impact you see.
- Steps to reproduce, or a proof of concept.
- The affected version or commit.

## What to expect

- We aim to acknowledge a report within a few days. This is a small project with
  a volunteer maintainer, so please be patient — there is no paid response SLA.
- If the report is accepted, a fix ships as a patch release and the advisory is
  published with credit to the reporter unless you ask otherwise.
- If it is declined, we will explain why.

## Scope

UltraShip's CLI never calls a model and never touches the network, and it stores
state only in `.ultraship/` inside your own repository. The most relevant classes
of issue are therefore ones that could corrupt canonical state, bypass the
released-record immutability guarantee, or cause the CLI to write outside its
workspace. Reports in those areas are especially valuable.

## Vendored dependencies

`vendor/` holds unmodified third-party code. Today that is the npm `yaml`
package, vendored at the exact published version to keep UltraShip's zero-install
guarantee. [`vendor/README.md`](vendor/README.md) documents the procedure:
`npm pack yaml@<version>`, drop `browser/` and the source maps, edit nothing.

That directory is excluded from this repository's code scanning, because scanning
code the project does not own and must not patch produces alerts nobody can act
on. It is tracked by pinned version instead.

When an advisory names a vendored package, the response is to re-vendor the fixed
upstream release and rerun `npm test`. Never edit a file under `vendor/`: a
patched vendored copy silently diverges from upstream and breaks the next
re-vendor.

### How the exclusion is currently carried

Each code-scanning alert raised inside `vendor/` is **dismissed** through the
code-scanning API, and every dismissal carries a comment naming `vendor/yaml` as
an unmodified copy of npm `yaml` 2.9.0 and pointing back at this policy.

It is a dismissal rather than a path filter because GitHub will not accept a
CodeQL advanced configuration on this repository while code-scanning default
setup is enabled: an advanced-configuration analysis uploads, and GitHub rejects
the SARIF with *"CodeQL analyses from advanced configurations cannot be processed
when the default setup is enabled"*. Default setup cannot be turned off here — the
repository is attached to an organisation security configuration that enforces it,
and the API refuses the change (`HTTP 422: Code scanning default setup cannot be
modified. This setting is controlled by organization administrators.`).

The trade-off is deliberate and worth stating: a dismissal lives in GitHub's alert
store, not in the repository's diff, so nothing about it is reviewable in a pull
request. That is precisely why the reason is written down here.

If the constraint ever lifts, the stronger mechanism is adopted in three steps:

1. Detach the repository from the organisation security configuration.
2. Disable code-scanning default setup on the repository.
3. Add a CodeQL workflow whose config carries `paths-ignore: vendor/`.

Report a vulnerability in UltraShip's own code through the process above. A
vulnerability in a vendored dependency should be reported upstream to that
package as well.
