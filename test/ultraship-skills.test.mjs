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

test('plan exists and is namespaced correctly', () => {
  assert.ok(existsSync(join(ROOT, 'skills', 'plan', 'SKILL.md')));
  assert.match(skill('plan'), /^name: plan$/m);
});

test('plan reads the shared release contract rather than restating it', () => {
  const doc = skill('plan');
  assert.match(doc, /shared\/release-contract\.md/);
  assert.match(doc, /shared\/skill-contract\.md/);
});

test('plan refuses to rerun after the roadmap exists', () => {
  const doc = skill('plan');
  assert.match(doc, /PLANNED/);
  assert.match(doc, /ultraship:iterate/);
});

test('plan rejects versions that are technical layers', () => {
  const doc = skill('plan');
  assert.match(doc, /user_can/);
  assert.match(doc, /technical layer/i);
  assert.match(doc, /Invalid roadmap/);
});

test('plan uses rolling-wave detail levels', () => {
  const doc = skill('plan');
  for (const level of ['specified', 'outline', 'hypothesis']) {
    assert.match(doc, new RegExp(level), `plan must document the ${level} detail level`);
  }
});

test('plan requires a fallback scope decided in advance', () => {
  const doc = skill('plan');
  assert.match(doc, /fallback_scope/);
  assert.match(doc, /emergency/i);
});

test('plan keeps SemVer off tasks and uses the CLI for version math', () => {
  const doc = skill('plan');
  assert.match(doc, /ultraship semver next/);
  assert.match(doc, /US-<PRODUCT>-<VERSION>-T<NUMBER>/);
});

test('develop exists and is namespaced correctly', () => {
  assert.ok(existsSync(join(ROOT, 'skills', 'develop', 'SKILL.md')));
  assert.match(skill('develop'), /^name: develop$/m);
});

test('develop records a qualitative release fit and never a number', () => {
  const doc = skill('develop');
  for (const level of ['high', 'probable', 'uncertain', 'unlikely']) {
    assert.match(doc, new RegExp(`\`${level}\``), `develop must document fit level ${level}`);
  }
  assert.match(doc, /never (invent|fabricate)/i);
  assert.match(doc, /percentage/i);
});

test('develop recommends iterate but never invokes it', () => {
  const doc = skill('develop');
  assert.match(doc, /ultraship:iterate/);
  assert.match(doc, /## When the plan stops fitting/);
  assert.match(doc, /Do not (invoke|run) .*iterate/i);
});

test('develop delegates implementation discipline to the TDD skill', () => {
  assert.match(skill('develop'), /ultraship:test-driven-development/);
});

test('develop builds vertical slices, not horizontal layers', () => {
  const doc = skill('develop');
  assert.match(doc, /vertical/i);
  assert.match(doc, /horizontal/i);
});

test('develop names the inference-efficient behaviours it must follow', () => {
  const doc = skill('develop');
  assert.match(doc, /ultraship state/);
  assert.match(doc, /repository-wide/i);
});

test('develop refuses to claim completion', () => {
  const doc = skill('develop');
  assert.match(doc, /ultraship:complete/);
  assert.match(doc, /## What this skill does not own/);
});

test('develop checkpoints instead of manufacturing completion', () => {
  const doc = skill('develop');
  assert.match(doc, /checkpoint/i);
  assert.match(doc, /remaining_acceptance/);
});
