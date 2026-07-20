import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');

const INHERITED = [
  'using-ultraship',
  'test-driven-development',
  'systematic-debugging',
  'verification-before-completion',
  'using-git-worktrees',
  'requesting-code-review',
  'receiving-code-review',
];

function skillDirs() {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function frontmatter(name) {
  const text = readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, `${name}/SKILL.md must open with YAML frontmatter`);
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2];
  }
  return { fields, body: text.slice(match[0].length), text };
}

test('every inherited skill is present', () => {
  const present = skillDirs();
  for (const name of INHERITED) {
    assert.ok(present.includes(name), `skills/${name} is missing`);
  }
});

test('every skill has a SKILL.md with name and description', () => {
  for (const name of skillDirs()) {
    assert.ok(existsSync(join(SKILLS, name, 'SKILL.md')), `${name} needs a SKILL.md`);
    const { fields } = frontmatter(name);
    assert.ok(fields.name, `${name} frontmatter needs a name`);
    assert.ok(fields.description, `${name} frontmatter needs a description`);
  }
});

test('frontmatter name matches the directory, so /ultraship:<dir> resolves', () => {
  for (const name of skillDirs()) {
    const { fields } = frontmatter(name);
    assert.equal(fields.name, name, `${name}/SKILL.md declares name: ${fields.name}`);
  }
});

test('no skill still references the superpowers namespace', () => {
  for (const name of skillDirs()) {
    for (const file of readdirSync(join(SKILLS, name), { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) continue;
      const path = join(file.parentPath ?? file.path, file.name);
      const text = readFileSync(path, 'utf8');
      assert.doesNotMatch(
        text,
        /superpowers:/,
        `${path} still points at the superpowers namespace`,
      );
    }
  }
});

test('the dispatcher points at UltraShip skills', () => {
  const { text } = frontmatter('using-ultraship');
  assert.match(text, /ultraship:brainstorm/);
  assert.match(text, /ultraship:systematic-debugging/);
});

test('every referenced sibling file exists', () => {
  for (const name of skillDirs()) {
    const dir = join(SKILLS, name);
    const { text } = frontmatter(name);
    for (const match of text.matchAll(/\]\((\.\/)?([a-zA-Z0-9._/-]+\.(?:md|ts|sh))\)/g)) {
      const target = join(dir, match[2]);
      assert.ok(existsSync(target), `${name}/SKILL.md links to missing ${match[2]}`);
    }
  }
});

test('the session hook injects the dispatcher and is executable', () => {
  const hook = readFileSync(join(ROOT, 'hooks', 'session-start'), 'utf8');
  assert.match(hook, /skills\/using-ultraship\/SKILL\.md/);
  assert.match(hook, /You have UltraShip/);

  // Stale branding must go, but the upstream issue URL stays: it cites the
  // bash 5.3 heredoc bug this file works around, and provenance for a real
  // fix is worth more than a clean grep.
  assert.doesNotMatch(hook, /superpowers:/);
  assert.doesNotMatch(hook, /using-superpowers/);
  assert.doesNotMatch(hook, /You have superpowers/i);

  const config = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8'));
  assert.equal(config.hooks.SessionStart[0].hooks[0].type, 'command');
  assert.match(config.hooks.SessionStart[0].hooks[0].command, /run-hook\.cmd" session-start/);
});

test('NOTICE lists every inherited skill actually shipped', () => {
  const notice = readFileSync(join(ROOT, 'NOTICE'), 'utf8');
  for (const name of INHERITED) {
    assert.match(notice, new RegExp(`skills/${name}/`), `NOTICE omits skills/${name}/`);
  }
});
