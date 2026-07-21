import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { addProduct } from '../lib/product.mjs';
import { transition } from '../lib/transition.mjs';
import { setConstraints, showConstraints } from '../lib/constraints.mjs';
import { snapshot } from '../lib/state.mjs';
import { validate as checkSchema } from '../lib/schema.mjs';
import { load } from '../lib/schemas.mjs';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));
const ID = 'client-tracker';

// A workspace with one active release, so constraints have somewhere to land.
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-constraints-'));
  const { root } = init(dir);
  addProduct(root, ID);
  const p = paths(root);
  transition(root, 'BRAINSTORMING');
  mkdirSync(p.releases(ID), { recursive: true });
  writeYaml(p.release(ID, '0.1.0'), { product: ID, version: '0.1.0', status: 'active' });
  mkdirSync(join(p.productDir(ID), 'execution'), { recursive: true });
  writeYaml(p.active(ID), {
    product: ID, version: '0.1.0', execution_state: 'DEVELOPING',
    checkpoint: null, blockers: [],
    release_fit: { assessment: 'probable', reasons: [], major_cost_drivers: [], recommended_scope_change: null },
  });
  return { dir, root, p };
}

function run(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('setting constraints writes them to the active release, always as user-estimate', () => {
  const { dir, root, p } = scratch();
  try {
    setConstraints(root, { time: 'ship by Friday', budget: '$20' });
    const active = readYaml(p.active(ID));
    assert.equal(active.constraints.time, 'ship by Friday');
    assert.equal(active.constraints.budget, '$20');
    assert.equal(active.constraints.source, 'user-estimate');
    // The block still validates against the active schema.
    assert.deepEqual([...checkSchema(load('active'), active, 'active')], []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('setting one field leaves the others in place', () => {
  const { dir, root } = scratch();
  try {
    setConstraints(root, { time: 'Friday' });
    setConstraints(root, { capacity: 'half a day' });
    assert.deepEqual(showConstraints(root).constraints, {
      source: 'user-estimate', time: 'Friday', capacity: 'half a day',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('show returns null when nothing is recorded', () => {
  const { dir, root } = scratch();
  try {
    assert.equal(showConstraints(root).constraints, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recording constraints without an active release is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-constraints-'));
  try {
    const { root } = init(dir);
    addProduct(root, ID);
    assert.throws(() => setConstraints(root, { time: 'x' }), /no active release/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the snapshot surfaces recorded constraints so a skill can ground fit in them', () => {
  const { dir, root } = scratch();
  try {
    setConstraints(root, { capacity: 'half a day' });
    assert.equal(snapshot(root).active.constraints.capacity, 'half a day');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI sets and shows constraints and exits 0', () => {
  const { dir } = scratch();
  try {
    assert.equal(run(['constraints', 'set', '--time', 'Friday', '--budget', '$20'], dir).code, 0);
    const { code, stdout } = run(['constraints', 'show'], dir);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).constraints.time, 'Friday');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI rejects an unknown constraint flag', () => {
  const { dir } = scratch();
  try {
    const { code, stderr } = run(['constraints', 'set', '--cost', '5'], dir);
    assert.equal(code, 1);
    assert.match(stderr, /Unknown flag/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
