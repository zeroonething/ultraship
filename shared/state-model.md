# The UltraShip state model

The workspace is always in exactly one state, recorded in
`.ultraship/workspace.yaml`. Skills change it only through
`ultraship transition <STATE>`, which refuses any move this table forbids.

| From | May move to |
| --- | --- |
| `UNINITIALIZED` | `BRAINSTORMING` |
| `BRAINSTORMING` | `BRAINSTORMED`, `BLOCKED`, `PAUSED` |
| `BRAINSTORMED` | `PLANNING` |
| `PLANNING` | `PLANNED`, `BLOCKED`, `PAUSED` |
| `PLANNED` | `DEVELOPING` |
| `DEVELOPING` | `ITERATING`, `COMPLETING`, `BLOCKED`, `PAUSED` |
| `ITERATING` | `DEVELOPING`, `BLOCKED`, `PAUSED` |
| `COMPLETING` | `RELEASED`, `DEVELOPING`, `ITERATING`, `BLOCKED`, `PAUSED` |
| `RELEASED` | `PLANNING`, `DEVELOPING` |
| `BLOCKED` | `BRAINSTORMING`, `PLANNING`, `DEVELOPING`, `ITERATING`, `COMPLETING`, `PAUSED` |
| `PAUSED` | `BRAINSTORMING`, `PLANNING`, `DEVELOPING`, `ITERATING`, `COMPLETING`, `BLOCKED` |

## Released is a one-way door

`RELEASED` moves forward into the next version's planning or development. It
never returns to `COMPLETING` or `ITERATING` for the version just shipped.

A released record is immutable in practice, not merely by instruction: its
SHA-256 is pinned in `.ultraship/releases.lock`, and `ultraship validate` fails
if the file changes. Corrections require a new version.

## Interruptions

`BLOCKED` means external requirements prevent safe progress. `PAUSED` means work
stopped deliberately with a checkpoint. Entering either records the state to
resume into as `resumes_to`; leaving clears it. Neither may move to `RELEASED` —
a version cannot ship from an interrupted state.

## Command rerouting

| The user runs | While the state is | Do this instead |
| --- | --- | --- |
| `/ultraship:brainstorm` | `BRAINSTORMED` or later | Refuse; a second product definition is competing truth. Offer `/ultraship:iterate`. |
| `/ultraship:plan` | `PLANNED` or later | Refuse; offer `/ultraship:iterate` to amend the roadmap. |
| `/ultraship:develop` | `BRAINSTORMED` or earlier | Route to `/ultraship:plan`; there is no release contract to build against. |
| `/ultraship:complete` | before implementation | Report the unmet gates and route to `/ultraship:develop`. |
| `/ultraship:iterate` | with no change requested | Perform a release-fit and assumption review, and record nothing unless something changed. |
