import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, isValid, compare, next } from '../lib/semver.mjs';

test('parses a release version', () => {
  assert.deepEqual(parse('0.4.0'), { major: 0, minor: 4, patch: 0, prerelease: null });
});

test('parses a pre-release version', () => {
  assert.deepEqual(parse('1.2.3-rc.4'), { major: 1, minor: 2, patch: 3, prerelease: 'rc.4' });
});

test('rejects malformed versions', () => {
  for (const bad of ['v1.0.0', '1.0', '1.0.0.0', '01.0.0', '', 'latest']) {
    assert.equal(parse(bad), null, `${bad} should not parse`);
    assert.equal(isValid(bad), false);
  }
});

test('orders versions, with pre-releases below their release', () => {
  assert.equal(compare('0.1.0', '0.2.0'), -1);
  assert.equal(compare('1.0.0', '0.9.9'), 1);
  assert.equal(compare('0.4.0', '0.4.0'), 0);
  assert.equal(compare('0.4.0-rc.1', '0.4.0'), -1);
  assert.equal(compare('0.4.0', '0.4.0-rc.1'), 1);
  assert.equal(compare('0.4.0-rc.1', '0.4.0-rc.2'), -1);
  assert.equal(compare('0.4.0-beta.1', '0.4.0-rc.1'), -1);
});

test('sorts a roadmap into release order', () => {
  const sorted = ['0.2.0', '0.1.0', '1.0.0', '0.10.0'].sort(compare);
  assert.deepEqual(sorted, ['0.1.0', '0.2.0', '0.10.0', '1.0.0']);
});

test('bumps major, minor, and patch', () => {
  assert.equal(next('0.4.0', 'major'), '1.0.0');
  assert.equal(next('0.4.0', 'minor'), '0.5.0');
  assert.equal(next('0.4.0', 'patch'), '0.4.1');
  assert.equal(next('1.4.7', 'major'), '2.0.0');
});

test('starts and increments a pre-release series', () => {
  assert.equal(next('0.4.0', 'rc'), '0.4.0-rc.1');
  assert.equal(next('0.4.0-rc.1', 'rc'), '0.4.0-rc.2');
  assert.equal(next('0.4.0-rc.9', 'rc'), '0.4.0-rc.10');
});

test('switching pre-release identifier restarts the counter', () => {
  assert.equal(next('0.4.0-rc.1', 'beta'), '0.4.0-beta.1');
});

test('release promotes a pre-release to its final version', () => {
  assert.equal(next('0.4.0-rc.3', 'release'), '0.4.0');
});

test('release on a final version throws', () => {
  assert.throws(() => next('0.4.0', 'release'), /already a final release/);
});

test('patch on a pre-release throws and names the fix', () => {
  assert.throws(() => next('0.4.0-rc.1', 'patch'), /use "release"/);
});

test('an unparseable version throws', () => {
  assert.throws(() => next('v1', 'minor'), /Not a valid SemVer version: v1/);
});

test('an unknown bump keyword is treated as a pre-release identifier', () => {
  assert.equal(next('0.4.0', 'dev'), '0.4.0-dev.1');
});
