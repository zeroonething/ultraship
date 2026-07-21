import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('the standard hooks file ships and is left for auto-loading', () => {
  assert.ok(existsSync(join(ROOT, 'hooks', 'hooks.json')));

  // Claude Code loads hooks/hooks.json automatically. Naming it again in
  // manifest.hooks registers it twice and the plugin fails to load with
  // "Duplicate hooks file detected". manifest.hooks is only for ADDITIONAL
  // hook files. Upstream superpowers ships this same file and omits the key.
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.ok(
    !('hooks' in plugin),
    'plugin.json must not declare the standard hooks/hooks.json path',
  );
});

test('the README documents every command the CLI exposes', () => {
  const cli = read('bin/ultraship.mjs');
  const readme = read('README.md');

  // Read only the COMMANDS object. Scanning the whole file would also match the
  // `if (` statements in main(), which sit at the same indent as the methods.
  const block = /const COMMANDS = \{\n([\s\S]*?)\n\};/.exec(cli);
  assert.ok(block, 'bin/ultraship.mjs must declare a COMMANDS object');
  const commands = [...block[1].matchAll(/^ {2}([a-z]+)\(/gm)].map((m) => m[1]);

  assert.deepEqual(
    [...commands].sort(),
    ['init', 'semver', 'state', 'transition', 'validate', 'views'],
    'the CLI exposes a command set the README was not written against',
  );
  for (const command of commands) {
    assert.match(readme, new RegExp(`ultraship ${command}`), `README omits ${command}`);
  }
});

test('the README documents every UltraShip skill that ships', () => {
  const readme = read('README.md');
  for (const name of ['brainstorm', 'plan', 'develop', 'iterate', 'complete']) {
    assert.match(readme, new RegExp(`/ultraship:${name}`), `README omits ${name}`);
  }
});

test('the README tells the user how to install the plugin', () => {
  const readme = read('README.md');
  assert.match(readme, /plugin marketplace add/);
  assert.match(readme, /zeroonething\/ultraship/);
});

test('the README no longer claims the skills are unbuilt', () => {
  assert.doesNotMatch(read('README.md'), /not built yet/i);
});

test('NOTICE lists every shipped skill under the right heading', () => {
  const notice = read('NOTICE');
  const shipped = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const name of shipped) {
    assert.match(notice, new RegExp(`skills/${name}`), `NOTICE omits skills/${name}`);
  }
});

test('the changelog records this release', () => {
  const changelog = read('CHANGELOG.md');
  assert.match(changelog, /`transition`/);
  assert.match(changelog, /brainstorm/);
});

test('no AI attribution appears anywhere in the shipped tree', () => {
  for (const file of ['README.md', 'CHANGELOG.md', 'NOTICE', 'bin/ultraship.mjs']) {
    const text = read(file);
    assert.doesNotMatch(text, /Co-Authored-By/i, `${file} carries an attribution trailer`);
    assert.doesNotMatch(text, /Generated with/i, `${file} carries a generation notice`);
  }
});
