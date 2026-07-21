// One-time migration from the 0.1.0 single-workspace-state model to per-product
// lifecycles. A 0.1.0 workspace carries state, resumes_to, and blockers on the
// workspace itself; this moves them onto the active product's lifecycle and
// strips them from the workspace so it matches the current schema. Idempotent:
// a workspace with no legacy fields is a no-op.
import { existsSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { FRAMEWORK_VERSION } from './init.mjs';

// Bring ultraship.yaml's recorded framework_version up to the installed one.
// migrate is the documented post-upgrade command, so this is where a stale
// version — left from whenever the workspace was created — gets corrected.
function syncFrameworkVersion(p) {
  const config = readYaml(p.config);
  if (config.framework_version === FRAMEWORK_VERSION) return { from: config.framework_version, to: config.framework_version, changed: false };
  const from = config.framework_version;
  config.framework_version = FRAMEWORK_VERSION;
  writeYaml(p.config, config);
  return { from, to: FRAMEWORK_VERSION, changed: true };
}

export function migrate(root) {
  const p = paths(root);
  const framework_version = syncFrameworkVersion(p);
  const workspace = readYaml(p.workspace);

  const hadLegacy = ['state', 'resumes_to', 'blockers'].some((key) => key in workspace);
  if (!hadLegacy) return { migrated: false, reason: 'already per-product', product: null, lifecycle: null, framework_version };

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

  return { migrated: true, product, lifecycle, framework_version };
}
