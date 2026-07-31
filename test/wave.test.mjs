import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { writeYaml } from '../lib/yaml.mjs';
import { addProduct } from '../lib/product.mjs';
import { wave } from '../lib/wave.mjs';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));
const ID = 'client-tracker';

function task(n, over = {}) {
  const id = `US-CLIENT-TRACKER-0.1.0-T0${n}`;
  return {
    id,
    summary: `Task ${n}.`,
    why_required: 'Required.',
    status: 'todo',
    depends_on: [],
    acceptance_criteria: [],
    files: [`src/f${n}.mjs`],
    evidence: [],
    ...over,
  };
}

/** A workspace with one product and a task set written straight to tasks.yaml. */
function scratch(tasks, version = '0.1.0') {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-wave-'));
  const { root } = init(dir);
  addProduct(root, ID);
  const p = paths(root);
  mkdirSync(join(p.productDir(ID), 'execution'), { recursive: true });
  if (tasks) writeYaml(p.tasks(ID), { product: ID, version, tasks });
  return { dir, root, p };
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

function reason(result, id) {
  return result.excluded.find((e) => e.id === id)?.reason;
}

test('dispatches every independent todo task in one wave', () => {
  const { dir, root } = scratch([task(1), task(2), task(3)]);
  const result = wave(root);
  assert.deepEqual(result.wave, [
    'US-CLIENT-TRACKER-0.1.0-T01',
    'US-CLIENT-TRACKER-0.1.0-T02',
    'US-CLIENT-TRACKER-0.1.0-T03',
  ]);
  assert.deepEqual(result.excluded, []);
  assert.equal(result.product, ID);
  assert.equal(result.version, '0.1.0');
  rmSync(dir, { recursive: true, force: true });
});

test('holds a task whose dependency is not done, and names the dependency', () => {
  const { dir, root } = scratch([
    task(1),
    task(2, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T01'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, ['US-CLIENT-TRACKER-0.1.0-T01']);
  assert.match(reason(result, 'US-CLIENT-TRACKER-0.1.0-T02'), /waiting on US-CLIENT-TRACKER-0\.1\.0-T01/);
  rmSync(dir, { recursive: true, force: true });
});

test('admits a task once every dependency is done', () => {
  const { dir, root } = scratch([
    task(1, { status: 'done' }),
    task(2, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T01'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, ['US-CLIENT-TRACKER-0.1.0-T02']);
  assert.equal(reason(result, 'US-CLIENT-TRACKER-0.1.0-T01'), 'status is done');
  rmSync(dir, { recursive: true, force: true });
});

test('a dependency that is deferred or blocked is not done, so the dependant is held', () => {
  const { dir, root } = scratch([
    task(1, { status: 'deferred' }),
    task(2, { status: 'blocked' }),
    task(3, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T01', 'US-CLIENT-TRACKER-0.1.0-T02'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, []);
  assert.equal(reason(result, 'US-CLIENT-TRACKER-0.1.0-T01'), 'status is deferred');
  assert.match(reason(result, 'US-CLIENT-TRACKER-0.1.0-T03'), /waiting on .*T01, .*T02/);
  rmSync(dir, { recursive: true, force: true });
});

test('names a dependency id that matches no task rather than treating it as met', () => {
  const { dir, root } = scratch([task(1, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T99'] })]);
  const result = wave(root);
  assert.deepEqual(result.wave, []);
  assert.match(reason(result, 'US-CLIENT-TRACKER-0.1.0-T01'), /T99 \(no such task\)/);
  rmSync(dir, { recursive: true, force: true });
});

test('holds a task that shares a declared file with one already in the wave', () => {
  const { dir, root } = scratch([
    task(1, { files: ['lib/shared.mjs', 'lib/one.mjs'] }),
    task(2, { files: ['lib/two.mjs'] }),
    task(3, { files: ['lib/shared.mjs'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, ['US-CLIENT-TRACKER-0.1.0-T01', 'US-CLIENT-TRACKER-0.1.0-T02']);
  assert.equal(
    reason(result, 'US-CLIENT-TRACKER-0.1.0-T03'),
    'shares lib/shared.mjs with US-CLIENT-TRACKER-0.1.0-T01',
  );
  rmSync(dir, { recursive: true, force: true });
});

test('a task in progress holds its files against the whole wave', () => {
  const { dir, root } = scratch([
    task(1, { status: 'in-progress', files: ['lib/shared.mjs'] }),
    task(2, { files: ['lib/shared.mjs'] }),
    task(3, { files: ['lib/free.mjs'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, ['US-CLIENT-TRACKER-0.1.0-T03']);
  assert.equal(
    reason(result, 'US-CLIENT-TRACKER-0.1.0-T02'),
    'shares lib/shared.mjs with US-CLIENT-TRACKER-0.1.0-T01',
  );
  rmSync(dir, { recursive: true, force: true });
});

test('a task declaring no files runs alone, and is skipped when the wave is not empty', () => {
  const { dir, root } = scratch([task(1), task(2, { files: [] })]);
  const first = wave(root);
  assert.deepEqual(first.wave, ['US-CLIENT-TRACKER-0.1.0-T01']);
  assert.match(reason(first, 'US-CLIENT-TRACKER-0.1.0-T02'), /declares no files/);

  const { dir: dir2, root: root2 } = scratch([task(1, { files: [] }), task(2)]);
  const second = wave(root2);
  assert.deepEqual(second.wave, ['US-CLIENT-TRACKER-0.1.0-T01']);
  assert.match(reason(second, 'US-CLIENT-TRACKER-0.1.0-T02'), /must run alone/);
  rmSync(dir, { recursive: true, force: true });
  rmSync(dir2, { recursive: true, force: true });
});

test('reports a dependency cycle instead of silently returning nothing', () => {
  const { dir, root } = scratch([
    task(1, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T02'] }),
    task(2, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T01'] }),
  ]);
  const result = wave(root);
  assert.deepEqual(result.wave, []);
  assert.match(reason(result, 'US-CLIENT-TRACKER-0.1.0-T01'), /dependency cycle/);
  assert.match(reason(result, 'US-CLIENT-TRACKER-0.1.0-T02'), /dependency cycle/);
  rmSync(dir, { recursive: true, force: true });
});

test('returns an empty wave with a reason per task when every task is blocked', () => {
  const { dir, root } = scratch([task(1, { status: 'blocked' }), task(2, { status: 'blocked' })]);
  const result = wave(root);
  assert.deepEqual(result.wave, []);
  assert.equal(result.excluded.length, 2);
  assert.equal(result.remaining, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('returns an empty wave and no remaining work when every task is done', () => {
  const { dir, root } = scratch([task(1, { status: 'done' }), task(2, { status: 'done' })]);
  const result = wave(root);
  assert.deepEqual(result.wave, []);
  assert.equal(result.remaining, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('the same unchanged task set yields the same wave in the same order', () => {
  const shuffled = [task(3), task(1), task(2)];
  const { dir, root } = scratch(shuffled);
  const first = wave(root);
  const second = wave(root);
  assert.deepEqual(first.wave, second.wave);
  assert.deepEqual(first.wave, [
    'US-CLIENT-TRACKER-0.1.0-T01',
    'US-CLIENT-TRACKER-0.1.0-T02',
    'US-CLIENT-TRACKER-0.1.0-T03',
  ]);
  rmSync(dir, { recursive: true, force: true });
});

test('the CLI prints the wave as JSON and exits 0', () => {
  const { dir } = scratch([task(1), task(2, { depends_on: ['US-CLIENT-TRACKER-0.1.0-T01'] })]);
  const result = run(['wave'], dir);
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.wave, ['US-CLIENT-TRACKER-0.1.0-T01']);
  assert.equal(payload.excluded.length, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('the CLI exits non-zero when the product has no task set', () => {
  const { dir } = scratch(null);
  const result = run(['wave'], dir);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /task set/);
  rmSync(dir, { recursive: true, force: true });
});

test('the CLI exits non-zero when the requested version is not the active task set', () => {
  const { dir } = scratch([task(1)]);
  const result = run(['wave', ID, '9.9.9'], dir);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /9\.9\.9/);
  rmSync(dir, { recursive: true, force: true });
});

test('the CLI accepts an explicit product and matching version', () => {
  const { dir } = scratch([task(1)]);
  const result = run(['wave', ID, '0.1.0'], dir);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout).wave, ['US-CLIENT-TRACKER-0.1.0-T01']);
  rmSync(dir, { recursive: true, force: true });
});

test('the wave module never dispatches anything itself', async () => {
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../lib/wave.mjs', import.meta.url), 'utf8'));
  for (const forbidden of ['child_process', 'fetch', 'http', 'spawn', 'exec']) {
    assert.ok(!source.includes(forbidden), `lib/wave.mjs must not reference ${forbidden}`);
  }
});
