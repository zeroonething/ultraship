// Compatibility matrix: a workspace created by each pre-1.0 release must migrate
// to 1.0 and validate. schema_version stayed 1 through 0.5 (every change was
// additive), so the shapes differ only by the 0.1.0 legacy workspace-state layout
// and by which optional config blocks are present. Each version's representative
// shape is built, migrated, and validated — proving the migration-safety
// guarantee against the real historical shapes rather than asserting it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, FRAMEWORK_VERSION, SCHEMA_VERSION } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { addProduct } from '../lib/product.mjs';
import { migrate } from '../lib/migrate.mjs';
import { validateWorkspace } from '../lib/validate.mjs';

// Each entry mutates a fresh workspace into the shape a given release produced.
const VERSIONS = {
  '0.1.0': (p) => {
    // Legacy single-workspace-state model: state on the workspace, no lifecycle,
    // no schema_version.
    const config = readYaml(p.config);
    delete config.schema_version;
    config.framework_version = '0.1.0';
    writeYaml(p.config, config);
    rmSync(p.lifecycle('demo'));
    const ws = readYaml(p.workspace);
    writeYaml(p.workspace, { ...ws, state: 'DEVELOPING', resumes_to: null, blockers: [] });
  },
  '0.2.0': (p) => setFramework(p, '0.2.0'),
  '0.3.0': (p) => setFramework(p, '0.3.0'),
  '0.4.0': (p) => {
    setFramework(p, '0.4.0');
    addConfig(p, { version_files: [{ path: 'package.json', key: 'version' }] });
  },
  '0.5.0': (p) => {
    setFramework(p, '0.5.0');
    addConfig(p, { delivery_hooks: { published: { deploy: 'echo publish' } } });
  },
  '0.5.1': (p) => {
    setFramework(p, '0.5.1');
    addConfig(p, { delivery_hooks: { published: { deploy: 'echo publish', smoke: 'echo ok' } } });
  },
};

function setFramework(p, v) {
  const config = readYaml(p.config);
  config.framework_version = v;
  writeYaml(p.config, config);
}

function addConfig(p, extra) {
  writeYaml(p.config, { ...readYaml(p.config), ...extra });
}

function workspaceAt(version) {
  const dir = mkdtempSync(join(tmpdir(), `ultraship-compat-${version}-`));
  const { root } = init(dir);
  const p = paths(root);
  addProduct(root, 'demo');
  VERSIONS[version](p);
  return { dir, root, p };
}

for (const version of Object.keys(VERSIONS)) {
  test(`a ${version} workspace migrates to 1.0 and validates`, () => {
    const { dir, root, p } = workspaceAt(version);
    try {
      const result = migrate(root);

      const config = readYaml(p.config);
      assert.equal(config.schema_version, SCHEMA_VERSION, 'schema_version is the 1.0 baseline');
      assert.equal(config.framework_version, FRAMEWORK_VERSION, 'framework_version is the installed release');
      assert.equal(result.framework_version.to, FRAMEWORK_VERSION);

      const { ok, errors } = validateWorkspace(root);
      assert.equal(ok, true, `migrated ${version} workspace should validate: ${errors.join('; ')}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('an absent schema_version migrates to the current one (every historical version reaches current)', () => {
  const { dir, root, p } = workspaceAt('0.1.0'); // 0.1.0 had no schema_version
  try {
    assert.equal(readYaml(p.config).schema_version, undefined);
    migrate(root);
    assert.equal(readYaml(p.config).schema_version, SCHEMA_VERSION);
    assert.equal(validateWorkspace(root).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
