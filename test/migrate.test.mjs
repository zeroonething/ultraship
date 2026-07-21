import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, FRAMEWORK_VERSION } from '../lib/init.mjs';
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
