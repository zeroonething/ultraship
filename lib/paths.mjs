import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

export const DIR = '.ultraship';

/** Walk up from `from` looking for a .ultraship directory. */
export function findRoot(from = process.cwd()) {
  let current = resolve(from);
  for (;;) {
    const candidate = join(current, DIR);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function requireRoot(from = process.cwd()) {
  const root = findRoot(from);
  if (!root) {
    throw new Error(
      `No ${DIR} workspace found in ${resolve(from)} or any parent. Run "ultraship init" first.`,
    );
  }
  return root;
}

export function paths(root) {
  const productDir = (id) => join(root, 'products', id);
  return {
    root,
    config: join(root, 'ultraship.yaml'),
    workspace: join(root, 'workspace.yaml'),
    products: join(root, 'products'),
    decisions: join(root, 'decisions'),
    questions: join(root, 'questions'),
    iterations: join(root, 'iterations'),
    checkpoints: join(root, 'checkpoints'),
    views: join(root, 'views'),
    lock: join(root, 'releases.lock'),
    productDir,
    product: (id) => join(productDir(id), 'product.yaml'),
    lifecycle: (id) => join(productDir(id), 'lifecycle.yaml'),
    roadmap: (id) => join(productDir(id), 'roadmap.yaml'),
    releases: (id) => join(productDir(id), 'releases'),
    release: (id, version) => join(productDir(id), 'releases', `${version}.yaml`),
    active: (id) => join(productDir(id), 'execution', 'active.yaml'),
    archivedActive: (id, version) => join(productDir(id), 'execution', 'archive', `${version}.yaml`),
    tasks: (id) => join(productDir(id), 'execution', 'tasks.yaml'),
    evidence: (id, version) => join(productDir(id), 'evidence', version),
  };
}
