# The UltraShip skill contract

Every UltraShip skill follows these seven steps. Skills read this file rather
than restating it.

1. **Learn the situation.** Run `ultraship state`. It returns the workspace
   state, the active product and version, the legal next transitions, and the
   recommended next command as JSON. One process, no repository scan. Do not
   read `.ultraship/` file by file to work out what `state` already told you.

2. **Check you are allowed to run.** Compare the workspace state against the
   states this skill accepts. If the skill does not apply, say so, name the
   command that does, and stop. Rerouting rules live in `state-model.md`.

3. **Do the work.** Interact with the user wherever the skill requires
   approval. Never approve on the user's behalf.

4. **Write canonical YAML.** Write only the files this skill owns. Ownership is
   listed per skill and enforced by the schemas: a fact belongs to exactly one
   file, and writing it elsewhere fails validation.

5. **Move the state.** Run `ultraship transition <STATE>`. Never write `state:`
   into `workspace.yaml` yourself — the transition table is what makes an
   illegal move impossible, and editing the file bypasses it.

6. **Prove it.** Run `ultraship validate`. On a non-zero exit, fix the state and
   run it again. Never continue with invalid canonical state, and never report
   success without having seen the command exit 0. Then run `ultraship views`.

7. **Hand off.** Tell the user what changed, where it was written, and the exact
   next command.

## Resource honesty

UltraShip 0.1.0 has no provider telemetry. You therefore **never invent** token
counts, costs, percentages, or time remaining.

Release fit is qualitative only: `high`, `probable`, `uncertain`, `unlikely`,
recorded with written reasons. Unknown capacity stays `null`. Telemetry source
is `unknown` unless the user supplied an estimate, in which case it is
`user-estimate`.

## Stopping conditions

Stop and ask rather than guess when:

- the workspace state does not permit this skill;
- a required canonical file is missing or fails validation;
- the user's answer would change scope, version, or product truth;
- an external dependency, credential, or approval is unavailable.

Recording a blocker and pausing is a success. Manufacturing completion is not.
