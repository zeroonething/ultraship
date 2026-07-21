// User-supplied constraints on the active release: time, budget, capacity. They
// live on the execution pointer (active.yaml) because they are inputs to the
// release-fit assessment, which lives there too. The framework never measures
// them — source is always user-estimate, so a value here is never mistaken for a
// figure UltraShip observed.
import { existsSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

const FIELDS = ['time', 'budget', 'capacity'];

function activePath(root, product) {
  const p = paths(root);
  const id = product ?? readYaml(p.workspace).active_product;
  if (!id) {
    throw new Error('No active product. Run "ultraship product add <id>" first.');
  }
  const path = p.active(id);
  if (!existsSync(path)) {
    throw new Error(
      `Product "${id}" has no active release. Run /ultraship:develop to start one before recording constraints.`,
    );
  }
  return { id, path };
}

/** Record one or more constraints on the active release. Unset fields stay as-is. */
export function setConstraints(root, values, product) {
  const { id, path } = activePath(root, product);
  const active = readYaml(path);
  const constraints = active.constraints ?? { source: 'user-estimate' };
  for (const field of FIELDS) {
    if (field in values && values[field] !== undefined) constraints[field] = values[field];
  }
  constraints.source = 'user-estimate';
  active.constraints = constraints;
  writeYaml(path, active);
  return { product: id, constraints };
}

/** Read the recorded constraints, or null if none were recorded. */
export function showConstraints(root, product) {
  const { id, path } = activePath(root, product);
  const active = readYaml(path);
  return { product: id, constraints: active.constraints ?? null };
}
