import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { transition } from '../lib/transition.mjs';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-transition-'));
  const { root } = init(dir);
  return { dir, root, p: paths(root) };
}

function run(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('a legal transition is written to workspace.yaml', () => {
  const { dir, root, p } = scratch();
  try {
    const result = transition(root, 'BRAINSTORMING');
    assert.deepEqual(result, {
      from: 'UNINITIALIZED',
      to: 'BRAINSTORMING',
      next_command: '/ultraship:brainstorm',
    });
    assert.equal(readYaml(p.workspace).state, 'BRAINSTORMING');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an illegal transition throws and leaves the state untouched', () => {
  const { dir, root, p } = scratch();
  try {
    assert.throws(
      () => transition(root, 'RELEASED'),
      /Cannot move from UNINITIALIZED to RELEASED\. Legal next states: BRAINSTORMING/,
    );
    assert.equal(readYaml(p.workspace).state, 'UNINITIALIZED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a released version cannot be reopened', () => {
  const { dir, root, p } = scratch();
  try {
    const workspace = readYaml(p.workspace);
    workspace.state = 'RELEASED';
    writeYaml(p.workspace, workspace);

    assert.throws(() => transition(root, 'COMPLETING'), /Cannot move from RELEASED to COMPLETING/);
    assert.equal(readYaml(p.workspace).state, 'RELEASED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unknown target state is rejected by name', () => {
  const { dir, root } = scratch();
  try {
    assert.throws(() => transition(root, 'SHIPPING'), /"SHIPPING" is not an UltraShip state/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('entering PAUSED records where to resume, and resuming clears it', () => {
  const { dir, root, p } = scratch();
  try {
    transition(root, 'BRAINSTORMING');
    transition(root, 'PAUSED');
    assert.equal(readYaml(p.workspace).resumes_to, 'BRAINSTORMING');

    transition(root, 'BRAINSTORMING');
    assert.equal(readYaml(p.workspace).resumes_to, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI reports the move as JSON and exits 0', () => {
  const { dir } = scratch();
  try {
    const { code, stdout } = run(['transition', 'BRAINSTORMING'], dir);
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(stdout), {
      from: 'UNINITIALIZED',
      to: 'BRAINSTORMING',
      next_command: '/ultraship:brainstorm',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 and names the legal states on an illegal move', () => {
  const { dir } = scratch();
  try {
    const { code, stderr } = run(['transition', 'RELEASED'], dir);
    assert.equal(code, 1);
    assert.match(stderr, /Legal next states: BRAINSTORMING/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI requires a target state', () => {
  const { dir } = scratch();
  try {
    const { code, stderr } = run(['transition'], dir);
    assert.equal(code, 1);
    assert.match(stderr, /Usage: ultraship transition <STATE>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('workspace.yaml still validates after a transition', () => {
  const { dir } = scratch();
  try {
    assert.equal(run(['transition', 'BRAINSTORMING'], dir).code, 0);
    assert.equal(run(['validate'], dir).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
