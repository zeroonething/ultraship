---
name: brainstorm
description: Use when starting a new UltraShip workspace or turning a vague product idea into a canonical product definition - runs structured discovery and writes product.yaml only after explicit approval
---

# /ultraship:brainstorm

Turn a vague idea into one approved, canonical product definition with enough
clarity to plan complete releases.

**Read first:** `shared/skill-contract.md`, `shared/state-model.md`.

## Runs when

The workspace state is `UNINITIALIZED` or `BRAINSTORMING`.

If `.ultraship/` does not exist, run `ultraship init` first.

If the state is `BRAINSTORMED` or later, **stop**. The workspace already has a
product definition, and writing a second one creates competing truth. Say so and
route the user to `/ultraship:iterate`, which amends the existing definition with
a traceable record.

## What this skill owns

- `.ultraship/products/<product-id>/product.yaml`
- `vision` and `active_product` in `.ultraship/workspace.yaml`

## What this skill does not own

Do not write `roadmap.yaml`, any file under `releases/`, `execution/active.yaml`,
or `execution/tasks.yaml`. Versions and release contracts belong to
`/ultraship:plan`. Writing them here fails validation, because each fact has
exactly one owning file.

Do not write implementation code.

## Process

1. Run `ultraship state`. Confirm the state permits this skill.
2. If the repository already contains a project, inspect it before asking
   questions the code answers. Do not scan the whole repository — look at the
   README, the package manifest, and the top-level directory names.
3. Run `ultraship transition BRAINSTORMING`.
4. Ask questions one at a time. Prefer multiple choice. Never ask something the
   user has already told you.
5. Draft the product definition and present it for approval.
6. Only after explicit approval, write `product.yaml`.
7. Run `ultraship transition BRAINSTORMED`, then `ultraship validate` and
   `ultraship views`.
8. Report what was written and recommend `/ultraship:plan`.

## What to uncover

Ask until you can answer all of these. Adapt the order to the conversation.

- Who is the user? Name a specific person, not a category.
- What problem do they have, in their words?
- What is the real outcome they want?
- What is the primary workflow, start to finish?
- What do they do today instead?
- What must the first useful version prove?
- What data does the product own?
- What external systems does it need?
- What security or privacy obligations apply?
- Where will it be deployed and who operates it?
- What does success look like, concretely?
- What is explicitly out of scope?
- What assumptions are still unverified?

## Classification

Classify the idea as exactly one of:

`independent-product`, `related-product`, `platform`, `shared-service`,
`shared-library`, `feature`, `experiment`, `proof-of-concept`, `internal-tool`,
`unknown`.

`unknown` is a legitimate answer and must be recorded as one. Never guess a
classification to make the file look finished — record the open question instead.

UltraShip 0.1.0 manages one product per workspace. If the user describes several,
help them pick the one to build first, record the others as open questions, and
say plainly that multi-product portfolios arrive in 0.2.0.

## The MVP boundary

`mvp_boundary` is the single sentence that decides what the first release
contains. Write it as one user completing one real workflow end to end.

Good: "One freelancer records one invoice against one client and marks it paid."

Bad: "Core invoicing functionality." That is a category, not a boundary, and it
will not tell `plan` where to stop.

## Writing product.yaml

```yaml
id: client-tracker
name: Client Tracker
classification: independent-product
vision: >
  Freelancers stop losing invoices in email threads.
users:
  - solo freelancer
problems:
  - Invoices are tracked across scattered email threads.
outcomes:
  - A freelancer sees every unpaid invoice in one place.
requirements:
  - Record a client
  - Record an invoice against a client
constraints:
  - Single user, no collaboration in the first release
public_contract: Web UI only. No public API yet.
deployment_context: Single-tenant, self-hosted.
success_measures:
  - A real unpaid invoice is recorded and settled.
non_goals:
  - payroll
  - tax filing
assumptions:
  - Users already have client email addresses.
mvp_boundary: One freelancer records one invoice and marks it paid.
```

`id` is lower-case, starts with a letter, and uses hyphens.

## Guardrails

- Never invent a requirement. If you inferred it, record it under `assumptions`
  and confirm it.
- Never merge distinct problems to make the document tidier.
- Never finalize a high-impact decision the user has not seen.
- `non_goals` is as important as `requirements`. An empty `non_goals` usually
  means the boundary has not been found yet.

## Done when

- Every idea has a classification.
- The product has a user, a problem, and a desired outcome.
- `mvp_boundary` names one workflow.
- Assumptions and open questions are visible.
- The user approved the definition.
- `ultraship validate` exits 0.
