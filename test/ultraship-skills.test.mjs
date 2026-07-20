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

test('iterate exists and is namespaced correctly', () => {
  assert.ok(existsSync(join(ROOT, 'skills', 'iterate', 'SKILL.md')));
  assert.match(skill('iterate'), /^name: iterate$/m);
});

test('iterate records an approval source for every change', () => {
  const doc = skill('iterate');
  assert.match(doc, /approval/);
  assert.match(doc, /source: user/);
});

test('iterate refuses to rewrite released records', () => {
  const doc = skill('iterate');
  assert.match(doc, /immutable/i);
  assert.match(doc, /new version/i);
  assert.match(doc, /## Prohibited/);
});

test('iterate refuses to lower completion gates', () => {
  const doc = skill('iterate');
  assert.match(doc, /gate/i);
  assert.match(doc, /Scope may shrink/i);
});

test('iterate documents the resource-pressure order', () => {
  const doc = skill('iterate');
  assert.match(doc, /fallback[_ ]scope/i);
  assert.match(doc, /split the release/i);
});

test('iterate documents its versioning consequences', () => {
  const doc = skill('iterate');
  for (const c of ['no-version-change', 'patch-bump', 'minor-bump', 'major-bump', 'release-split']) {
    assert.match(doc, new RegExp(c), `iterate must document the ${c} consequence`);
  }
});

test('iterate gives deferred work a canonical destination', () => {
  const doc = skill('iterate');
  assert.match(doc, /deferred/);
  assert.match(doc, /roadmap\.yaml/);
});

test('complete exists and is namespaced correctly', () => {
  assert.ok(existsSync(join(ROOT, 'skills', 'complete', 'SKILL.md')));
  assert.match(skill('complete'), /^name: complete$/m);
});

test('complete requires evidence rather than assertion', () => {
  const doc = skill('complete');
  assert.match(doc, /ultraship:verification-before-completion/);
  assert.match(doc, /looks good/i);
  assert.match(doc, /evidence/);
});

test('complete documents every gate category', () => {
  const doc = skill('complete');
  for (const gate of ['Product', 'Functional', 'Engineering', 'Security', 'Operational', 'Delivery', 'Truth']) {
    assert.match(doc, new RegExp(`### ${gate}`), `complete must document ${gate} gates`);
  }
});

test('complete refuses to claim a deployment it did not perform', () => {
  const doc = skill('complete');
  assert.match(doc, /credential/i);
  assert.match(doc, /release-ready/);
  assert.match(doc, /Never claim/i);
});

test('complete routes failures to the right skill', () => {
  const doc = skill('complete');
  assert.match(doc, /ultraship:develop/);
  assert.match(doc, /ultraship:iterate/);
  assert.match(doc, /## When a gate fails/);
});

test('complete records the release and pins it', () => {
  const doc = skill('complete');
  assert.match(doc, /releases\.lock/);
  assert.match(doc, /immutable: true/);
  assert.match(doc, /sha256|SHA-256/);
});

test('complete may fix blocking defects but not change scope', () => {
  const doc = skill('complete');
  assert.match(doc, /release-blocking/i);
  assert.match(doc, /scope/);
});

test('complete records known limitations rather than hiding them', () => {
  assert.match(skill('complete'), /known_limitations/);
});

test('all five UltraShip skills are present and namespaced', () => {
  for (const name of ['brainstorm', 'plan', 'develop', 'iterate', 'complete']) {
    assert.match(skill(name), new RegExp(`^name: ${name}$`, 'm'));
    assert.match(skill(name), /shared\/skill-contract\.md/);
  }
});
