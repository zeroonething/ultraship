import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { addProduct } from '../lib/product.mjs';
import { transition } from '../lib/transition.mjs';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));

// A transition moves a product's lifecycle, so every scratch workspace has one
// registered and active product sitting at UNINITIALIZED.
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-transition-'));
  const { root } = init(dir);
  addProduct(root, 'client-tracker');
  return { dir, root, p: paths(root), id: 'client-tracker' };
}

function run(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('a legal transition is written to the product lifecycle', () => {
  const { dir, root, p, id } = scratch();
  try {
    const result = transition(root, 'BRAINSTORMING');
    assert.deepEqual(result, {
      product: id,
      from: 'UNINITIALIZED',
      to: 'BRAINSTORMING',
      next_command: '/ultraship:brainstorm',
    });
    assert.equal(readYaml(p.lifecycle(id)).state, 'BRAINSTORMING');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an illegal transition throws and leaves the state untouched', () => {
  const { dir, root, p, id } = scratch();
  try {
    assert.throws(
      () => transition(root, 'RELEASED'),
      /Cannot move client-tracker from UNINITIALIZED to RELEASED\. Legal next states: BRAINSTORMING/,
    );
    assert.equal(readYaml(p.lifecycle(id)).state, 'UNINITIALIZED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a released version cannot be reopened', () => {
  const { dir, root, p, id } = scratch();
  try {
    const lifecycle = readYaml(p.lifecycle(id));
    lifecycle.state = 'RELEASED';
    writeYaml(p.lifecycle(id), lifecycle);

    assert.throws(() => transition(root, 'COMPLETING'), /Cannot move client-tracker from RELEASED to COMPLETING/);
    assert.equal(readYaml(p.lifecycle(id)).state, 'RELEASED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a transition with no active product asks for one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-transition-'));
  try {
    const { root } = init(dir);
    assert.throws(() => transition(root, 'BRAINSTORMING'), /No active product to transition/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unknown target state is rejected by name', () => {
  const { dir, root } = scratch();
  try {
    assert.throws(() => transition(root, 'SHIPPING'), /"SHIPPING" is not an UltraShip state/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('entering PAUSED records where to resume, and resuming clears it', () => {
  const { dir, root, p, id } = scratch();
  try {
    transition(root, 'BRAINSTORMING');
    transition(root, 'PAUSED');
    assert.equal(readYaml(p.lifecycle(id)).resumes_to, 'BRAINSTORMING');

    transition(root, 'BRAINSTORMING');
    assert.equal(readYaml(p.lifecycle(id)).resumes_to, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI reports the move as JSON and exits 0', () => {
  const { dir, id } = scratch();
  try {
    const { code, stdout } = run(['transition', 'BRAINSTORMING'], dir);
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(stdout), {
      product: id,
      from: 'UNINITIALIZED',
      to: 'BRAINSTORMING',
      next_command: '/ultraship:brainstorm',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 and names the legal states on an illegal move', () => {
  const { dir } = scratch();
  try {
    const { code, stderr } = run(['transition', 'RELEASED'], dir);
    assert.equal(code, 1);
    assert.match(stderr, /Legal next states: BRAINSTORMING/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI requires a target state', () => {
  const { dir } = scratch();
  try {
    const { code, stderr } = run(['transition'], dir);
    assert.equal(code, 1);
    assert.match(stderr, /Usage: ultraship transition <STATE>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the lifecycle still validates after a transition', () => {
  const { dir } = scratch();
  try {
    assert.equal(run(['transition', 'BRAINSTORMING'], dir).code, 0);
    assert.equal(run(['validate'], dir).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A product sitting at COMPLETING with an active 0.1.0 release and a roadmap
// entry for it — the exact state complete is in just before it ships.
function readyToRelease() {
  const { dir, root, p, id } = scratch();
  const lifecycle = readYaml(p.lifecycle(id));
  lifecycle.state = 'COMPLETING';
  writeYaml(p.lifecycle(id), lifecycle);
  writeYaml(p.roadmap(id), {
    product: id, status: 'active',
    versions: [{ version: '0.1.0', outcome: 'A user does the thing.', detail: 'specified', status: 'planned' }],
  });
  mkdirSync(p.releases(id), { recursive: true });
  writeYaml(p.release(id, '0.1.0'), { product: id, version: '0.1.0', status: 'released' });
  mkdirSync(join(p.productDir(id), 'execution'), { recursive: true });
  writeYaml(p.active(id), {
    product: id, version: '0.1.0', execution_state: 'COMPLETING', checkpoint: null, blockers: [],
    release_fit: { assessment: 'high', reasons: [], major_cost_drivers: [], recommended_scope_change: null },
  });
  return { dir, root, p, id };
}

test('releasing marks the roadmap version released and archives the execution pointer', () => {
  const { dir, root, p, id } = readyToRelease();
  try {
    const result = transition(root, 'RELEASED');
    assert.equal(result.finalized.released_version, '0.1.0');
    assert.equal(result.finalized.roadmap_updated, true);

    // The roadmap now records the release itself — no hand edit needed.
    const entry = readYaml(p.roadmap(id)).versions.find((v) => v.version === '0.1.0');
    assert.equal(entry.status, 'released');

    // The live pointer is gone and archived, so nothing still reads DEVELOPING.
    assert.equal(existsSync(p.active(id)), false);
    assert.equal(readYaml(p.archivedActive(id, '0.1.0')).version, '0.1.0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('releasing with no execution pointer is a best-effort no-op, not a failure', () => {
  const { dir, root, p, id } = scratch();
  try {
    const lifecycle = readYaml(p.lifecycle(id));
    lifecycle.state = 'COMPLETING';
    writeYaml(p.lifecycle(id), lifecycle);
    const result = transition(root, 'RELEASED');
    assert.equal(result.to, 'RELEASED');
    assert.equal(result.finalized.released_version, null);
    assert.equal(result.finalized.archived, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a named product can be transitioned while another stays put', () => {
  const { dir, root, p } = scratch();
  try {
    addProduct(root, 'second');
    // active_product is now "second"; move the first one by name.
    transition(root, 'BRAINSTORMING', 'client-tracker');
    assert.equal(readYaml(p.lifecycle('client-tracker')).state, 'BRAINSTORMING');
    assert.equal(readYaml(p.lifecycle('second')).state, 'UNINITIALIZED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
