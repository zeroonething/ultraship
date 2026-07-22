import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, FRAMEWORK_VERSION } from '../lib/init.mjs';
import { findRoot, requireRoot, paths, DIR } from '../lib/paths.mjs';
import { readYaml } from '../lib/yaml.mjs';

function scratch() {
  return mkdtempSync(join(tmpdir(), 'ultraship-init-'));
}

test('init scaffolds the canonical tree', () => {
  const dir = scratch();
  try {
    const { root, created } = init(dir);
    assert.equal(root, join(dir, DIR));
    for (const rel of ['ultraship.yaml', 'workspace.yaml', 'products', 'decisions',
      'questions', 'iterations', 'checkpoints', 'views']) {
      assert.ok(existsSync(join(root, rel)), `${rel} should exist`);
    }
    assert.ok(created.length >= 8);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init writes a config whose resource profile is entirely unknown', () => {
  const dir = scratch();
  try {
    const { root } = init(dir);
    const config = readYaml(join(root, 'ultraship.yaml'));
    assert.equal(config.schema_version, 1);
    assert.equal(config.framework_version, FRAMEWORK_VERSION);
    assert.equal(config.resource_profile.telemetry.source, 'unknown');
    assert.equal(config.resource_profile.available.token_budget, null);
    assert.equal(config.resource_profile.available.monetary_budget_usd, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init derives a workspace id from the directory and starts UNINITIALIZED', () => {
  const dir = scratch();
  const project = join(dir, 'Freelance Tools');
  mkdirSync(project);
  try {
    const { root } = init(project);
    const workspace = readYaml(join(root, 'workspace.yaml'));
    assert.equal(workspace.id, 'freelance-tools');
    assert.equal(workspace.name, 'Freelance Tools');
    // Lifecycle state is per product; the workspace itself carries none.
    assert.ok(!('state' in workspace), 'workspace no longer carries a lifecycle state');
    assert.equal(workspace.active_product, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init refuses to overwrite an existing workspace', () => {
  const dir = scratch();
  try {
    init(dir);
    assert.throws(() => init(dir), /already initialized/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('empty directories survive git via .gitkeep', () => {
  const dir = scratch();
  try {
    const { root } = init(dir);
    assert.ok(existsSync(join(root, 'products', '.gitkeep')));
    assert.ok(existsSync(join(root, 'iterations', '.gitkeep')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findRoot walks up from a nested directory', () => {
  const dir = scratch();
  try {
    init(dir);
    const nested = join(dir, 'src', 'deep');
    mkdirSync(nested, { recursive: true });
    assert.equal(findRoot(nested), join(dir, DIR));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init scaffolds a project .gitignore that ignores the evidence output', () => {
  const dir = scratch();
  try {
    init(dir);
    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8');
    assert.match(gitignore, /\.ultraship\/products\/\*\/evidence\//);
    assert.match(gitignore, /node_modules/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init appends to an existing .gitignore without clobbering or duplicating', () => {
  const dir = scratch();
  try {
    writeFileSync(join(dir, '.gitignore'), 'dist/\n.env\n', 'utf8');
    init(dir);
    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8');
    assert.match(gitignore, /dist\//); // original preserved
    assert.match(gitignore, /\.env/);
    assert.match(gitignore, /\.ultraship\/products\/\*\/evidence\//); // appended
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init does not duplicate an evidence ignore already present', () => {
  const dir = scratch();
  try {
    writeFileSync(join(dir, '.gitignore'), '.ultraship/products/*/evidence/\n', 'utf8');
    init(dir);
    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8');
    const count = (gitignore.match(/\.ultraship\/products\/\*\/evidence\//g) || []).length;
    assert.equal(count, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findRoot returns null outside a workspace, requireRoot throws', () => {
  const dir = scratch();
  try {
    assert.equal(findRoot(dir), null);
    assert.throws(() => requireRoot(dir), /No \.ultraship workspace found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('paths builds product-scoped locations', () => {
  const p = paths('/w/.ultraship');
  assert.equal(p.product('billing'), '/w/.ultraship/products/billing/product.yaml');
  assert.equal(p.release('billing', '0.4.0'), '/w/.ultraship/products/billing/releases/0.4.0.yaml');
  assert.equal(p.tasks('billing'), '/w/.ultraship/products/billing/execution/tasks.yaml');
  assert.equal(p.evidence('billing', '0.4.0'), '/w/.ultraship/products/billing/evidence/0.4.0');
  assert.equal(p.lock, '/w/.ultraship/releases.lock');
});
