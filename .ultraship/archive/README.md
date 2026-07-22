# UltraShip — archived pre-1.0 planning material

This branch exists only to preserve the early planning and specification
documents that seeded UltraShip 0.1.0. They are historical, not canonical.

The living project is on `main`: canonical state under `.ultraship/`, the frozen
public contract in `docs/CONTRACT.md`, and the compatibility policy in
`docs/COMPATIBILITY.md`. A pointer to this archive lives on `main` at
`.ultraship/archive/pre-1.0-planning.md`.

## Contents

- `specification/UltraShip-Product-and-Implementation-Specification.md` — the
  original product, methodology, and implementation specification (v0.1.0).
- `specs/2026-07-20-ultraship-0.1.0-design.md` — the 0.1.0 design spec.
- `plans/2026-07-20-ultraship-0.1.0-part1-state-engine.md` — 0.1.0 build plan, part 1.
- `plans/2026-07-21-ultraship-0.1.0-part2-skills.md` — 0.1.0 build plan, part 2.

## Reconstructed workspace files

`products/ultraship/` reconstructs, in the normal `.ultraship` layout, the
release contracts and execution records for 0.1.0 and 0.2.0 as if the project had
been tracked with UltraShip from the start. They are derived from the planning
documents above — the original canonical files were not preserved for these
versions — so they are a **historical reference, not enforced canonical state**:
no immutability lock backs them and `ultraship validate` is not run against this
branch.

- `products/ultraship/releases/0.1.0.yaml`, `0.2.0.yaml` — reconstructed release contracts and records.
- `products/ultraship/execution/0.1.0-tasks.yaml`, `0.2.0-tasks.yaml` — reconstructed execution task records.
