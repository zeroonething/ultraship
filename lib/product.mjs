// Registering and selecting products. A workspace holds several independent
// products; each gets its own directory and its own lifecycle, and one is the
// active product that skills act on by default.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

const ID = /^[a-z][a-z0-9-]*$/;

function known(p) {
  if (!existsSync(p.products)) return [];
  return readdirSync(p.products, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function setActive(p, id) {
  const workspace = readYaml(p.workspace);
  workspace.active_product = id;
  writeYaml(p.workspace, workspace);
}

/**
 * Register a new product: its directory, a lifecycle at UNINITIALIZED, and the
 * active pointer. The product's definition (name, vision, ...) is written later
 * by brainstorm into product.yaml; this only creates the lifecycle so the
 * product can be transitioned. Registering one product never touches another's.
 */
export function addProduct(root, id, name) {
  if (!ID.test(id)) {
    throw new Error(`Product id "${id}" must be lowercase, start with a letter, and use only a-z, 0-9, and hyphens.`);
  }
  const p = paths(root);
  if (existsSync(p.productDir(id))) throw new Error(`Product "${id}" already exists.`);

  mkdirSync(p.productDir(id), { recursive: true });
  writeYaml(p.lifecycle(id), { product: id, state: 'UNINITIALIZED', resumes_to: null, blockers: [] });
  setActive(p, id);

  return { product: id, name: name ?? id, state: 'UNINITIALIZED', active: true };
}

/** Switch which product is active, so state, transition, develop, and complete act on it. */
export function useProduct(root, id) {
  const p = paths(root);
  if (!existsSync(p.productDir(id))) {
    const list = known(p);
    throw new Error(`No product "${id}". Known products: ${list.join(', ') || 'none'}.`);
  }
  setActive(p, id);
  return { active_product: id };
}
