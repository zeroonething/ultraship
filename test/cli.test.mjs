import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

function run(args, cwd = process.cwd()) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('semver next prints the bumped version as JSON', () => {
  const { code, stdout } = run(['semver', 'next', '0.4.0', 'minor']);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout), { previous: '0.4.0', bump: 'minor', next: '0.5.0' });
});

test('semver next on a bad version exits 1 with the reason on stderr', () => {
  const { code, stderr } = run(['semver', 'next', 'v1', 'minor']);
  assert.equal(code, 1);
  assert.match(stderr, /Not a valid SemVer version: v1/);
});

test('no arguments prints usage and exits 1', () => {
  const { code, stderr } = run([]);
  assert.equal(code, 1);
  assert.match(stderr, /Usage: ultraship <command>/);
});

test('an unknown command names the valid ones', () => {
  const { code, stderr } = run(['frobnicate']);
  assert.equal(code, 1);
  assert.match(stderr, /Unknown command "frobnicate"/);
  assert.match(stderr, /semver/);
});

test('--version prints the framework version', () => {
  const { code, stdout } = run(['--version']);
  assert.equal(code, 0);
  assert.equal(stdout.trim(), PKG_VERSION);
});
