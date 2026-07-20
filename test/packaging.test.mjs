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
  assert.equal(plugin.version, '0.1.0');
  assert.equal(plugin.license, 'MIT');
});

test('marketplace entry points at this plugin', () => {
  const market = readJson('.claude-plugin/marketplace.json');
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, 'ultraship');
  assert.equal(market.plugins[0].source, './');
});

test('package declares no runtime dependencies', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.name, 'ultraship');
});
