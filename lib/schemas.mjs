import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');

// Canonical file types in UltraShip 0.1.0. registry, relationships, and
// release-bundle belong to 0.2.0's multi-product work and are deliberately absent.
export const SCHEMA_NAMES = [
  'ultraship',
  'workspace',
  'product',
  'roadmap',
  'release',
  'active',
  'tasks',
  'iteration',
  'checkpoint',
];

const cache = new Map();

export function load(name) {
  if (cache.has(name)) return cache.get(name);
  const path = join(SCHEMA_DIR, `${name}.schema.json`);
  if (!existsSync(path)) throw new Error(`Unknown schema "${name}" (looked in ${path})`);
  const schema = JSON.parse(readFileSync(path, 'utf8'));
  cache.set(name, schema);
  return schema;
}
