import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, FRAMEWORK_VERSION, SCHEMA_VERSION } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { addProduct } from '../lib/product.mjs';
import { migrate } from '../lib/migrate.mjs';
import { transition } from '../lib/transition.mjs';
import { validateWorkspace } from '../lib/validate.mjs';

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-migrate-'));
  const { root } = init(dir);
  return { dir, root, p: paths(root) };
}

// A 0.1.0 workspace carried lifecycle state on the workspace itself. init writes
// the current shape, so a legacy workspace is reconstructed by hand.
function legacyWorkspace(p, state, active) {
  const workspace = readYaml(p.workspace);
  writeYaml(p.workspace, {
    id: workspace.id,
    name: workspace.name,
    state,
    resumes_to: null,
    vision: workspace.vision,
    constraints: workspace.constraints,
    active_product: active,
    blockers: [],
  });
}

test('migrate moves the workspace state onto the active product lifecycle', () => {
  const { dir, root, p } = scratch();
  try {
    addProduct(root, 'client-tracker'); // creates lifecycle at UNINITIALIZED, sets active
    // Simulate a 0.1.0 workspace: state on the workspace, no lifecycle file.
    rmSync(p.lifecycle('client-tracker'));
    legacyWorkspace(p, 'DEVELOPING', 'client-tracker');

    const result = migrate(root);
    assert.equal(result.migrated, true);
    assert.equal(result.product, 'client-tracker');

    const lifecycle = readYaml(p.lifecycle('client-tracker'));
    assert.equal(lifecycle.state, 'DEVELOPING');
    assert.equal(lifecycle.product, 'client-tracker');

    const workspace = readYaml(p.workspace);
    assert.ok(!('state' in workspace), 'legacy state field is stripped');
    assert.ok(!('blockers' in workspace));
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate is idempotent', () => {
  const { dir, root, p } = scratch();
  try {
    addProduct(root, 'client-tracker');
    rmSync(p.lifecycle('client-tracker'));
    legacyWorkspace(p, 'PLANNING', 'client-tracker');

    assert.equal(migrate(root).migrated, true);
    const second = migrate(root);
    assert.equal(second.migrated, false, 'a migrated workspace is a no-op');
    assert.equal(readYaml(p.lifecycle('client-tracker')).state, 'PLANNING');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate of a fresh 0.1.0 workspace strips state and writes no lifecycle', () => {
  const { dir, root, p } = scratch();
  try {
    legacyWorkspace(p, 'UNINITIALIZED', null);
    const result = migrate(root);
    assert.equal(result.migrated, true);
    assert.equal(result.lifecycle, null);
    assert.ok(!('state' in readYaml(p.workspace)));
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate brings a stale framework_version up to the installed release', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.framework_version = '0.1.0'; // as if the workspace was created by an older release
    writeYaml(p.config, config);

    const result = migrate(root);
    assert.equal(result.framework_version.from, '0.1.0');
    assert.equal(result.framework_version.to, FRAMEWORK_VERSION);
    assert.equal(result.framework_version.changed, true);
    assert.equal(readYaml(p.config).framework_version, FRAMEWORK_VERSION);

    // Idempotent: running again reports no change.
    assert.equal(migrate(root).framework_version.changed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('two products at different lifecycle points both validate', () => {
  const { dir, root, p } = scratch();
  try {
    addProduct(root, 'alpha');
    transition(root, 'BRAINSTORMING', 'alpha');
    transition(root, 'BRAINSTORMED', 'alpha');
    transition(root, 'PLANNING', 'alpha');

    addProduct(root, 'beta'); // active is now beta, still UNINITIALIZED

    assert.equal(readYaml(p.lifecycle('alpha')).state, 'PLANNING');
    assert.equal(readYaml(p.lifecycle('beta')).state, 'UNINITIALIZED');
    assert.equal(existsSync(p.lifecycle('alpha')), true);
    assert.equal(validateWorkspace(root).ok, true, 'a mixed-state workspace validates');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate defaults an absent schema_version to the baseline and validates', () => {
  const { dir, root, p } = scratch();
  try {
    // A hand-made or pre-versioned workspace with no schema_version.
    const config = readYaml(p.config);
    delete config.schema_version;
    writeYaml(p.config, config);

    const result = migrate(root);
    assert.equal(result.schema_version.changed, true);
    assert.equal(readYaml(p.config).schema_version, SCHEMA_VERSION);
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The 2.0 upgrade path. A 1.x workspace has no commit_policy, so migrate pins it
// to off: an existing project never starts committing without being asked.
test('migrate pins a 1.x workspace to commit_policy off and syncs framework_version', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.framework_version = '1.1.0';
    delete config.commit_policy; // as a 1.x release wrote it
    writeYaml(p.config, config);

    const result = migrate(root);
    assert.equal(result.commit_policy.from, null);
    assert.equal(result.commit_policy.to, 'off');
    assert.equal(result.commit_policy.changed, true);
    assert.equal(readYaml(p.config).commit_policy, 'off');
    assert.equal(readYaml(p.config).framework_version, FRAMEWORK_VERSION);
    assert.equal(validateWorkspace(root).ok, true);

    // Idempotent: a second run changes nothing and does not flip the policy on.
    assert.equal(migrate(root).commit_policy.changed, false);
    assert.equal(readYaml(p.config).commit_policy, 'off');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The 2.1 upgrade path. 2.1.0 added a command and a skill and changed no
// canonical shape, so there is nothing to carry forward but the version line —
// and nothing may be added to a workspace that already validates.
test('migrate carries a 2.0.0 workspace to the installed version and adds no field', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.framework_version = '2.0.0';
    config.commit_policy = 'checkpoint'; // as 2.0 init wrote it
    writeYaml(p.config, config);
    const before = Object.keys(readYaml(p.config)).sort();

    const result = migrate(root);
    assert.equal(result.framework_version.from, '2.0.0');
    assert.equal(result.framework_version.to, FRAMEWORK_VERSION);
    assert.equal(readYaml(p.config).framework_version, FRAMEWORK_VERSION);
    assert.equal(readYaml(p.config).commit_policy, 'checkpoint');
    assert.equal(readYaml(p.config).schema_version, SCHEMA_VERSION);
    assert.deepEqual(Object.keys(readYaml(p.config)).sort(), before);
    assert.equal(validateWorkspace(root).ok, true);

    // Idempotent: a second run changes nothing at all.
    const rerun = migrate(root);
    assert.equal(rerun.framework_version.changed, false);
    assert.equal(rerun.schema_version.changed, false);
    assert.equal(rerun.commit_policy.changed, false);
    assert.deepEqual(Object.keys(readYaml(p.config)).sort(), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A 2.0.0 workspace's data is valid data on 2.1: nothing was added or reshaped.
test('a 2.0.0-shaped workspace validates on 2.1 before any migration', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.framework_version = '2.0.0';
    writeYaml(p.config, config);
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate leaves an explicit commit_policy alone', () => {
  const { dir, root, p } = scratch();
  try {
    // init already wrote checkpoint; migrate must not downgrade it to off.
    assert.equal(readYaml(p.config).commit_policy, 'checkpoint');
    assert.equal(migrate(root).commit_policy.changed, false);
    assert.equal(readYaml(p.config).commit_policy, 'checkpoint');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A 1.x workspace's data is unchanged by 2.0; only the default behaviour differs.
test('a 1.x-shaped workspace still validates on 2.0 before any migration', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.framework_version = '1.1.0';
    delete config.commit_policy;
    writeYaml(p.config, config);
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate leaves a current workspace schema_version untouched (no manual edits)', () => {
  const { dir, root, p } = scratch();
  try {
    const before = readYaml(p.config).schema_version;
    const result = migrate(root);
    assert.equal(before, SCHEMA_VERSION);
    assert.equal(result.schema_version.changed, false);
    assert.equal(readYaml(p.config).schema_version, SCHEMA_VERSION);
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
