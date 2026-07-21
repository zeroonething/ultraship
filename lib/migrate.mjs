// One-time migration from the 0.1.0 single-workspace-state model to per-product
// lifecycles. A 0.1.0 workspace carries state, resumes_to, and blockers on the
// workspace itself; this moves them onto the active product's lifecycle and
// strips them from the workspace so it matches the current schema. Idempotent:
// a workspace with no legacy fields is a no-op.
import { existsSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

export function migrate(root) {
  const p = paths(root);
  const workspace = readYaml(p.workspace);

  const hadLegacy = ['state', 'resumes_to', 'blockers'].some((key) => key in workspace);
  if (!hadLegacy) return { migrated: false, reason: 'already per-product', product: null, lifecycle: null };

  const product = workspace.active_product ?? null;
  let lifecycle = null;

  // A fresh 0.1.0 workspace has no active product to hold the state; its state
  // was UNINITIALIZED, which is what an absent lifecycle already reads as.
  if (product && workspace.state) {
    const path = p.lifecycle(product);
    if (!existsSync(path)) {
      writeYaml(path, {
        product,
        state: workspace.state,
        resumes_to: workspace.resumes_to ?? null,
        blockers: workspace.blockers ?? [],
      });
      lifecycle = path;
    }
  }

  delete workspace.state;
  delete workspace.resumes_to;
  delete workspace.blockers;
  writeYaml(p.workspace, workspace);

  return { migrated: true, product, lifecycle };
}
