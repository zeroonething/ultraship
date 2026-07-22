import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { deploy, resolveHooks } from '../lib/deploy.mjs';

const RELEASE = {
  product: 'demo', version: '0.1.0', status: 'planned', release_type: 'minor',
  delivery: { target_mode: 'published' },
};

/** A workspace with a demo product at 0.1.0 and the given delivery_hooks (or none). */
function build(hooks) {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-deploy-'));
  const { root } = init(dir);
  const p = paths(root);

  const workspace = readYaml(p.workspace);
  workspace.active_product = 'demo';
  writeYaml(p.workspace, workspace);

  const config = readYaml(p.config);
  if (hooks) config.delivery_hooks = hooks;
  writeYaml(p.config, config);

  mkdirSync(p.releases('demo'), { recursive: true });
  mkdirSync(join(p.productDir('demo'), 'execution'), { recursive: true });
  writeYaml(p.release('demo', '0.1.0'), RELEASE);

  return { dir, root, p };
}

test('resolveHooks returns the commands for a mode, or null when undeclared', () => {
  const config = { delivery_hooks: { published: { deploy: 'echo go', smoke: 'echo ok' } } };
  assert.deepEqual(resolveHooks(config, 'published'), { deploy: 'echo go', smoke: 'echo ok' });
  assert.equal(resolveHooks(config, 'staging-deployed'), null);
  assert.equal(resolveHooks({}, 'published'), null);
});

test('deploy runs the declared command, captures output, and records a deployment evidence entry', () => {
  const { dir, root, p } = build({ published: { deploy: "printf 'shipped-it\\n'" } });
  try {
    const result = deploy(root, { version: '0.1.0' });
    assert.equal(result.ran, true);
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'published');
    assert.match(result.deployment_evidence, /printf .* — exit 0/);
    const log = readFileSync(join(p.evidence('demo', '0.1.0'), 'deploy-published.log'), 'utf8');
    assert.match(log, /shipped-it/); // captured verbatim
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a non-zero hook exit makes deploy fail and claim no success', () => {
  const { dir, root } = build({ published: { deploy: 'exit 3' } });
  try {
    const result = deploy(root, { version: '0.1.0' });
    assert.equal(result.ran, true);
    assert.equal(result.ok, false);
    assert.match(result.deployment_evidence, /exit 3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a declared smoke command runs after a successful deploy and is recorded as a health check', () => {
  const { dir, root, p } = build({ published: { deploy: 'true', smoke: "printf 'healthy\\n'" } });
  try {
    const result = deploy(root, { version: '0.1.0' });
    assert.equal(result.ok, true);
    assert.match(result.health_check_evidence, /exit 0/);
    const log = readFileSync(join(p.evidence('demo', '0.1.0'), 'smoke-published.log'), 'utf8');
    assert.match(log, /healthy/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('smoke does not run when the deploy failed, and the deployed mode is refused', () => {
  const { dir, root, p } = build({ published: { deploy: 'exit 1', smoke: "printf 'healthy\\n'" } });
  try {
    const result = deploy(root, { version: '0.1.0' });
    assert.equal(result.ok, false);
    assert.equal(result.health_check_evidence, null);
    assert.equal(existsSync(join(p.evidence('demo', '0.1.0'), 'smoke-published.log')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('with no delivery_hooks the deploy is a no-op success, preserving manual completion', () => {
  const { dir, root } = build(null);
  try {
    const result = deploy(root, { version: '0.1.0' });
    assert.equal(result.ran, false);
    assert.equal(result.ok, true);
    assert.match(result.reason, /manually/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
