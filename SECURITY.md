# Security Policy

## Supported versions

UltraShip follows [Semantic Versioning](https://semver.org/). Security fixes are
released against the latest `1.x` release. Older `1.x` lines are not backported —
upgrade to the current `1.x`, which is always compatible with a `1.x` workspace
(see [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md)).

| Version | Supported |
| --- | --- |
| Latest `1.x` | ✅ |
| Older `1.x` | ⚠️ Upgrade to the latest `1.x` |
| `0.x` | ❌ |

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

That directory is excluded from this repository's code scanning —
[`.github/codeql/codeql-config.yml`](.github/codeql/codeql-config.yml) sets
`paths-ignore: vendor/` — because scanning code the project does not own and must
not patch produces alerts nobody can act on. It is tracked by pinned version
instead.

When an advisory names a vendored package, the response is to re-vendor the fixed
upstream release and rerun `npm test`. Never edit a file under `vendor/`: a
patched vendored copy silently diverges from upstream and breaks the next
re-vendor.

Report a vulnerability in UltraShip's own code through the process above. A
vulnerability in a vendored dependency should be reported upstream to that
package as well.
