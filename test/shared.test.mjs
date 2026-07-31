import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANSITIONS } from '../lib/state.mjs';
import { load } from '../lib/schemas.mjs';
import { CHECKPOINT_NAMES, ALLOWED_GIT } from '../lib/commit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(ROOT, 'shared', name), 'utf8');

test('the state model documents every state and its legal moves', () => {
  const doc = read('state-model.md');
  for (const [from, targets] of Object.entries(TRANSITIONS)) {
    assert.match(doc, new RegExp(`\\b${from}\\b`), `state-model.md omits ${from}`);
    for (const to of targets) {
      assert.match(
        doc,
        new RegExp(`${from}[^\\n]*${to}`),
        `state-model.md omits the ${from} -> ${to} move`,
      );
    }
  }
});

test('the state model states that released records never reopen', () => {
  const doc = read('state-model.md');
  assert.match(doc, /immutable/i);
  assert.match(doc, /ultraship transition/);
});

test('the release contract documents every top-level schema field', () => {
  const doc = read('release-contract.md');
  for (const field of load('release').required) {
    assert.match(doc, new RegExp(`\\b${field}\\b`), `release-contract.md omits ${field}`);
  }
});

test('the release contract documents all four completion modes', () => {
  const doc = read('release-contract.md');
  for (const mode of ['release-ready', 'staging-deployed', 'production-deployed', 'published']) {
    assert.match(doc, new RegExp(mode), `release-contract.md omits ${mode}`);
  }
});

test('all twenty principles are recorded', () => {
  const doc = read('principles.md');
  for (let n = 1; n <= 20; n += 1) {
    assert.match(doc, new RegExp(`^${n}\\. `, 'm'), `principles.md omits principle ${n}`);
  }
});

// The registry in lib/commit.mjs and the table here are the same list. If they
// drift, a skill calls a checkpoint that does not exist, or one exists that no
// skill runs.
test('the commit protocol documents every checkpoint the registry defines', () => {
  const doc = read('commit-protocol.md');
  for (const name of CHECKPOINT_NAMES) {
    assert.match(doc, new RegExp(`\`${name}\``), `commit-protocol.md omits ${name}`);
  }
  for (const verb of ALLOWED_GIT) {
    assert.match(doc, new RegExp(`\`${verb}\``), `commit-protocol.md omits the ${verb} verb`);
  }
});

test('the commit protocol states what the command will never do', () => {
  const doc = read('commit-protocol.md');
  assert.match(doc, /never pushes/i);
  assert.match(doc, /never creates a branch/i);
  assert.match(doc, /never creates a tag/i);
  assert.match(doc, /never runs `git add -A`/);
  assert.match(doc, /commit_policy/);
  assert.match(doc, /no-op/);
});

test('the skill contract lists all seven steps and forbids fabrication', () => {
  const doc = read('skill-contract.md');
  for (let n = 1; n <= 7; n += 1) {
    assert.match(doc, new RegExp(`^${n}\\. `, 'm'), `skill-contract.md omits step ${n}`);
  }
  assert.match(doc, /ultraship state/);
  assert.match(doc, /ultraship validate/);
  assert.match(doc, /ultraship transition/);
  assert.match(doc, /never (invent|fabricate)/i);
});
