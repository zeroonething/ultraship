import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { TRANSITIONS, canTransition, allowedFrom, nextCommand, snapshot } from '../lib/state.mjs';

function scratch() {
  return mkdtempSync(join(tmpdir(), 'ultraship-state-'));
}

test('the transition table covers every state in the model', () => {
  const states = [
    'UNINITIALIZED', 'BRAINSTORMING', 'BRAINSTORMED', 'PLANNING', 'PLANNED',
    'DEVELOPING', 'ITERATING', 'COMPLETING', 'RELEASED', 'BLOCKED', 'PAUSED',
  ];
  assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...states].sort());
});

test('the documented lifecycle transitions are permitted', () => {
  const legal = [
    ['UNINITIALIZED', 'BRAINSTORMING'],
    ['BRAINSTORMING', 'BRAINSTORMED'],
    ['BRAINSTORMED', 'PLANNING'],
    ['PLANNING', 'PLANNED'],
    ['PLANNED', 'DEVELOPING'],
    ['DEVELOPING', 'ITERATING'],
    ['ITERATING', 'DEVELOPING'],
    ['DEVELOPING', 'COMPLETING'],
    ['COMPLETING', 'RELEASED'],
    ['COMPLETING', 'DEVELOPING'],
    ['COMPLETING', 'ITERATING'],
    ['RELEASED', 'PLANNING'],
    ['RELEASED', 'DEVELOPING'],
  ];
  for (const [from, to] of legal) {
    assert.ok(canTransition(from, to), `${from} -> ${to} should be permitted`);
  }
});

test('a released version can never return to a mutable state for itself', () => {
  for (const to of ['BRAINSTORMING', 'COMPLETING', 'ITERATING', 'BRAINSTORMED', 'PLANNED']) {
    assert.equal(canTransition('RELEASED', to), false, `RELEASED -> ${to} must be refused`);
  }
});

test('skipping the lifecycle is refused', () => {
  assert.equal(canTransition('UNINITIALIZED', 'DEVELOPING'), false);
  assert.equal(canTransition('BRAINSTORMED', 'COMPLETING'), false);
  assert.equal(canTransition('PLANNED', 'RELEASED'), false);
});

test('any active state may become BLOCKED or PAUSED', () => {
  for (const from of ['BRAINSTORMING', 'PLANNING', 'DEVELOPING', 'ITERATING', 'COMPLETING']) {
    assert.ok(canTransition(from, 'BLOCKED'));
    assert.ok(canTransition(from, 'PAUSED'));
  }
});

test('BLOCKED and PAUSED resume into active states but not into RELEASED', () => {
  assert.ok(canTransition('PAUSED', 'DEVELOPING'));
  assert.ok(canTransition('BLOCKED', 'ITERATING'));
  assert.equal(canTransition('PAUSED', 'RELEASED'), false);
  assert.equal(canTransition('BLOCKED', 'RELEASED'), false);
});

test('an unknown state has no transitions rather than throwing', () => {
  assert.deepEqual(allowedFrom('SHIPPING'), []);
  assert.equal(canTransition('SHIPPING', 'DEVELOPING'), false);
});

test('nextCommand routes each state to its skill', () => {
  assert.equal(nextCommand('UNINITIALIZED'), '/ultraship:brainstorm');
  assert.equal(nextCommand('BRAINSTORMED'), '/ultraship:plan');
  assert.equal(nextCommand('PLANNED'), '/ultraship:develop');
  assert.equal(nextCommand('DEVELOPING'), '/ultraship:develop');
  assert.equal(nextCommand('ITERATING'), '/ultraship:iterate');
  assert.equal(nextCommand('COMPLETING'), '/ultraship:complete');
  assert.equal(nextCommand('RELEASED'), '/ultraship:plan');
});

test('snapshot of a fresh workspace reports no active release', () => {
  const dir = scratch();
  try {
    const { root } = init(dir);
    const snap = snapshot(root);
    assert.equal(snap.workspace.state, 'UNINITIALIZED');
    assert.equal(snap.active, null);
    assert.deepEqual(snap.products, []);
    assert.deepEqual(snap.released_versions, []);
    assert.deepEqual(snap.allowed_transitions, ['BRAINSTORMING']);
    assert.equal(snap.next_command, '/ultraship:brainstorm');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('snapshot reports the active release and released versions in order', () => {
  const dir = scratch();
  try {
    const { root } = init(dir);
    const p = paths(root);

    const workspace = readYaml(p.workspace);
    workspace.active_product = 'client-tracker';
    writeYaml(p.workspace, workspace);

    mkdirSync(p.releases('client-tracker'), { recursive: true });
    mkdirSync(join(p.productDir('client-tracker'), 'execution'), { recursive: true });
    writeYaml(p.lifecycle('client-tracker'), {
      product: 'client-tracker', state: 'DEVELOPING', resumes_to: null, blockers: [],
    });

    for (const [version, status] of [['0.1.0', 'released'], ['0.2.0', 'released'], ['0.10.0', 'active']]) {
      writeYaml(p.release('client-tracker', version), { product: 'client-tracker', version, status });
    }
    writeYaml(p.active('client-tracker'), {
      product: 'client-tracker',
      version: '0.10.0',
      execution_state: 'DEVELOPING',
      checkpoint: null,
      blockers: [],
      release_fit: { assessment: 'probable', reasons: [], major_cost_drivers: [], recommended_scope_change: null },
    });

    const snap = snapshot(root);
    assert.equal(snap.active.product, 'client-tracker');
    assert.equal(snap.active.version, '0.10.0');
    assert.equal(snap.active.release_status, 'active');
    assert.equal(snap.active.release_fit, 'probable');
    assert.deepEqual(snap.released_versions, ['0.1.0', '0.2.0']);
    assert.deepEqual(snap.products, [{ id: 'client-tracker', state: 'DEVELOPING' }]);
    assert.deepEqual(snap.allowed_transitions, ['ITERATING', 'COMPLETING', 'BLOCKED', 'PAUSED']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('snapshot surfaces the active product blockers', () => {
  const dir = scratch();
  try {
    const { root } = init(dir);
    const p = paths(root);
    const workspace = readYaml(p.workspace);
    workspace.active_product = 'client-tracker';
    writeYaml(p.workspace, workspace);
    mkdirSync(p.productDir('client-tracker'), { recursive: true });
    writeYaml(p.lifecycle('client-tracker'), {
      product: 'client-tracker',
      state: 'BLOCKED',
      resumes_to: 'DEVELOPING',
      blockers: [{ id: 'B1', summary: 'No staging credentials.', needs: 'Access from the owner.' }],
    });

    const snap = snapshot(root);
    assert.equal(snap.workspace.state, 'BLOCKED');
    assert.equal(snap.blockers.length, 1);
    assert.equal(snap.blockers[0].id, 'B1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
