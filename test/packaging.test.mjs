import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

test('package declares no runtime dependencies', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.name, 'ultraship');
});
