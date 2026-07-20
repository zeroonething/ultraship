import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = (name) => readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8');

test('brainstorm exists and is namespaced correctly', () => {
  assert.ok(existsSync(join(ROOT, 'skills', 'brainstorm', 'SKILL.md')));
  assert.match(skill('brainstorm'), /^name: brainstorm$/m);
});

test('brainstorm reads the shared contract rather than restating it', () => {
  const doc = skill('brainstorm');
  assert.match(doc, /shared\/skill-contract\.md/);
  assert.match(doc, /shared\/state-model\.md/);
});

test('brainstorm runs the full command contract', () => {
  const doc = skill('brainstorm');
  for (const cmd of ['ultraship state', 'ultraship transition', 'ultraship validate', 'ultraship views']) {
    assert.match(doc, new RegExp(cmd), `brainstorm must run ${cmd}`);
  }
});

test('brainstorm refuses to create a second competing product definition', () => {
  const doc = skill('brainstorm');
  assert.match(doc, /BRAINSTORMED/);
  assert.match(doc, /ultraship:iterate/);
  assert.match(doc, /competing/i);
});

test('brainstorm requires explicit approval before writing product truth', () => {
  const doc = skill('brainstorm');
  assert.match(doc, /approval/i);
  assert.match(doc, /product\.yaml/);
});

test('brainstorm declares what it must not write', () => {
  const doc = skill('brainstorm');
  assert.match(doc, /roadmap\.yaml/);
  assert.match(doc, /## What this skill does not own/);
});

test('brainstorm classifies every idea and never guesses', () => {
  const doc = skill('brainstorm');
  assert.match(doc, /independent-product/);
  assert.match(doc, /unknown/);
});
