import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const readJson = (p) => JSON.parse(read(p));

test('LICENSE preserves both copyright holders', () => {
  const license = read('LICENSE');
  assert.match(license, /Copyright \(c\) 2025 Jesse Vincent/);
  assert.match(license, /Copyright \(c\) 2026 Aakash Pawar/);
  assert.match(license, /MIT License/);
});

test('NOTICE credits upstream without claiming endorsement', () => {
  const notice = read('NOTICE');
  assert.match(notice, /obra\/superpowers/);
  assert.doesNotMatch(notice, /endorse/i);
});

test('plugin manifest declares the ultraship plugin', () => {
  const plugin = readJson('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'ultraship');
  assert.equal(plugin.license, 'MIT');
});

test('marketplace entry points at this plugin', () => {
  const market = readJson('.claude-plugin/marketplace.json');
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, 'ultraship');
  assert.equal(market.plugins[0].source, './');
});

// The version lives in three files. If they drift, the marketplace advertises a
// version the code is not, and a reinstall silently keeps the old plugin — the
// exact failure that shipped in 0.3.0's first cut.
test('package, plugin, and marketplace declare one and the same version', () => {
  const version = readJson('package.json').version;
  assert.equal(readJson('.claude-plugin/plugin.json').version, version);
  assert.equal(readJson('.claude-plugin/marketplace.json').plugins[0].version, version);
});

// A second harness is a second place the version can go stale. The Codex
// manifest is declared in version_files for the same reason the Claude Code one
// is: a manifest advertising a version the code is not means a reinstall
// silently keeps the old plugin.
test('every harness manifest in the tree carries the package version', () => {
  const version = readJson('package.json').version;
  assert.equal(readJson('.codex-plugin/plugin.json').version, version);
});

// Codex ingests this manifest. It requires the interface block, and it resolves
// `skills` and `hooks` as paths inside the install root — a path naming
// something absent installs a plugin with no skills and no session hook.
test('the Codex manifest declares what Codex ingests and names paths that exist', () => {
  const plugin = readJson('.codex-plugin/plugin.json');
  assert.equal(plugin.name, 'ultraship');
  assert.equal(plugin.license, 'MIT');
  assert.equal(plugin.skills, './skills/');
  // Codex runs SessionStart hooks and reads the same
  // hookSpecificOutput.additionalContext field Claude Code reads, so the one
  // hook file serves both harnesses and is declared, not omitted.
  assert.equal(plugin.hooks, './hooks/hooks.json');
  for (const path of [plugin.skills, plugin.hooks]) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} does not exist`);
  }
  for (const field of [
    'displayName', 'shortDescription', 'longDescription', 'developerName', 'category',
  ]) {
    assert.equal(typeof plugin.interface[field], 'string', `interface.${field} is required`);
    assert.ok(plugin.interface[field].length, `interface.${field} must not be empty`);
  }
  // Codex shows at most three starter prompts and truncates each at 128 chars.
  assert.ok(Array.isArray(plugin.interface.defaultPrompt));
  assert.ok(plugin.interface.defaultPrompt.length <= 3);
  for (const prompt of plugin.interface.defaultPrompt) assert.ok(prompt.length <= 128);
});

// Codex installs from a marketplace, never from a bare repository: `codex plugin
// marketplace add` reads this file, and only then does `codex plugin add` work.
test('the Codex marketplace entry points at this repository', () => {
  const market = readJson('.agents/plugins/marketplace.json');
  assert.equal(market.plugins.length, 1);
  const entry = market.plugins[0];
  assert.equal(entry.name, readJson('.codex-plugin/plugin.json').name);
  assert.match(entry.source.url, /zeroonething\/ultraship/);
  assert.equal(entry.policy.installation, 'AVAILABLE');
  assert.ok(entry.category);
});

test('package declares no runtime dependencies', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.name, 'ultraship');
});
