# The release contract

One file, `.ultraship/products/<id>/releases/<version>.yaml`, owns a version
across its whole life. `plan` writes the contract. `complete` adds the record.

## Contract fields, written by plan

| Field | Meaning |
| --- | --- |
| `product` | The product id. Matches the directory. |
| `version` | SemVer. Must equal the filename. |
| `status` | `planned`, `active`, `released`, or `superseded`. |
| `release_type` | `major`, `minor`, or `patch`. |
| `outcome` | `user_can`, `business_value`, `evidence_of_value`. |
| `scope` | `included`, `excluded`, `fallback_scope`. |
| `acceptance` | `functional`, `non_functional`, `operational`. |
| `delivery` | `target_mode`, `environment`, `deployment_method`, `migrations`, `observability`, `rollback`. |
| `dependencies` | `products`, `services`, `human_approvals`. |
| `resource_profile` | `complexity`, `uncertainty`, `likely_cost_drivers`, `preferred_tools`, `constraints`. |
| `risks` | What could make this release fail. |
| `open_questions` | What is still unresolved. |

## What makes a contract valid

`outcome.user_can` must name something a real user or operator can do. A version
whose outcome is "the database layer exists" is a technical layer, not a
Minimum Complete Release. If you cannot write `user_can` without describing
internals, the version is wrong, not the sentence.

`scope.fallback_scope` is the smallest still-complete version of this release,
decided now. It exists so that `iterate` never has to invent an emergency plan
under pressure. It must still deliver a coherent outcome.

Every acceptance criterion must be checkable. "Works well" is not a criterion.

## Completion modes

`delivery.target_mode` is chosen before development starts:

- `release-ready` — built, tested, documented, packaged, ready for an authorized
  deployment or publication.
- `staging-deployed` — deployed to staging and verified there.
- `production-deployed` — deployed to production and verified.
- `published` — published to its registry or distribution channel and verified.

Never claim a deployed mode when credentials or permissions were unavailable.
Record what actually happened and stay at `release-ready`.

## Record fields, written by complete

`released_at`, `mode`, `delivered`, `evidence` (`tests`, `builds`, `reviews`,
`deployments`, `health_checks`), `known_limitations`, `supersedes`,
`next_recommended_version`, and `immutable: true`.

`ultraship validate` requires all of these once `status` is `released`, and
rejects `immutable` on any record that is not.
