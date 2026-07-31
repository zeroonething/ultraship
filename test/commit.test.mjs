import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { addProduct } from '../lib/product.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import {
  commitCheckpoint, resolvePolicy, ALLOWED_GIT, CHECKPOINT_NAMES, POLICY_FLOOR, SUBJECT_LIMIT,
} from '../lib/commit.mjs';

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { exit: res.status, out: (res.stdout ?? '').trim() };
}

/** A scratch project with a git repository, an initialized workspace, and a product. */
function scratch({ repo = true, product = 'client-tracker' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-commit-'));
  if (repo) {
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'Test');
  }
  const { root } = init(dir);
  if (product) addProduct(root, product);
  const p = paths(root);
  if (repo) {
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'initial');
  }
  return { dir, root, p, product };
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

test('an explicit policy wins and an absent one follows the recorded framework version', () => {
  assert.equal(resolvePolicy({ commit_policy: 'off', framework_version: '2.0.0' }), 'off');
  assert.equal(resolvePolicy({ commit_policy: 'checkpoint', framework_version: '1.1.0' }), 'checkpoint');
  // Absent: on for a workspace this release created, off for one carried over.
  assert.equal(resolvePolicy({ framework_version: POLICY_FLOOR }), 'checkpoint');
  assert.equal(resolvePolicy({ framework_version: '2.4.1' }), 'checkpoint');
  assert.equal(resolvePolicy({ framework_version: '1.1.0' }), 'off');
  assert.equal(resolvePolicy({}), 'off');
  assert.equal(resolvePolicy(null), 'off');
});

test('push, branch, and tag are structurally unreachable', () => {
  for (const forbidden of ['push', 'branch', 'tag', 'remote', 'fetch', 'clone', 'reset']) {
    assert.ok(!ALLOWED_GIT.includes(forbidden), `${forbidden} must not be allowed`);
  }
  assert.deepEqual([...ALLOWED_GIT].sort(), ['add', 'commit', 'rev-parse', 'status']);
});

test('commit_policy off is a no-op that still exits successfully', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    config.commit_policy = 'off';
    writeYaml(p.config, config);

    const before = git(dir, 'rev-parse', 'HEAD').out;
    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, false);
    assert.equal(result.policy, 'off');
    assert.match(result.reason, /commit_policy is "off"/);
    assert.notEqual(result.ok, false, 'a no-op is not a failure');
    assert.equal(git(dir, 'rev-parse', 'HEAD').out, before, 'HEAD did not move');
  } finally {
    cleanup(dir);
  }
});

test('a workspace carried over from 1.x does not commit without being asked', () => {
  const { dir, root, p } = scratch();
  try {
    const config = readYaml(p.config);
    delete config.commit_policy; // as a 1.x release wrote it
    config.framework_version = '1.1.0';
    writeYaml(p.config, config);

    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, false);
    assert.equal(result.policy, 'off');
  } finally {
    cleanup(dir);
  }
});

test('no change under the checkpoint paths is a no-op', () => {
  const { dir, root } = scratch();
  try {
    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, false);
    assert.match(result.reason, /No change under this checkpoint/);
  } finally {
    cleanup(dir);
  }
});

test('a directory that is not a git repository is a no-op', () => {
  const { dir, root, p } = scratch({ repo: false });
  try {
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [{ version: '0.1.0', outcome: 'A user does one real thing.', detail: 'outline', status: 'planned' }],
    });
    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, false);
    assert.match(result.reason, /is not a git repository/);
  } finally {
    cleanup(dir);
  }
});

test('git missing from PATH is a no-op, not a failure', () => {
  const { dir, root, p } = scratch();
  const realPath = process.env.PATH;
  try {
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [{ version: '0.1.0', outcome: 'A user does one real thing.', detail: 'outline', status: 'planned' }],
    });
    process.env.PATH = join(dir, 'no-such-bin');
    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, false);
    assert.match(result.reason, /git is not available on PATH/);
  } finally {
    process.env.PATH = realPath;
    cleanup(dir);
  }
});

test('the default policy commits the checkpoint and reports its SHA', () => {
  const { dir, root, p } = scratch();
  try {
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [{ version: '0.1.0', outcome: 'A user does one real thing.', detail: 'outline', status: 'planned' }],
    });

    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, true);
    assert.equal(result.policy, 'checkpoint');
    assert.match(result.sha, /^[0-9a-f]{40}$/);
    assert.equal(result.subject, 'chore(plan): update the client-tracker roadmap');
    assert.equal(git(dir, 'log', '-1', '--pretty=%s').out, result.subject);
  } finally {
    cleanup(dir);
  }
});

test('a commit carries no co-author or tool-attribution trailer', () => {
  const { dir, root, p } = scratch();
  try {
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [{ version: '0.1.0', outcome: 'A user does one real thing.', detail: 'outline', status: 'planned' }],
    });
    commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    const body = git(dir, 'log', '-1', '--pretty=%B').out;
    assert.doesNotMatch(body, /Co-Authored-By/i);
    assert.doesNotMatch(body, /Generated with/i);
    assert.doesNotMatch(body, /Claude/i);
  } finally {
    cleanup(dir);
  }
});

test('a checkpoint commits only its declared paths, leaving unrelated work alone', () => {
  const { dir, root, p } = scratch();
  try {
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [{ version: '0.1.0', outcome: 'A user does one real thing.', detail: 'outline', status: 'planned' }],
    });
    // The developer's own unrelated change, already staged.
    writeFileSync(join(dir, 'notes.txt'), 'my own work in progress\n', 'utf8');
    git(dir, 'add', 'notes.txt');

    const result = commitCheckpoint(root, { checkpoint: 'plan-roadmap' });
    assert.equal(result.committed, true);

    const files = git(dir, 'show', '--name-only', '--pretty=', 'HEAD').out.split('\n');
    assert.ok(files.some((f) => f.endsWith('roadmap.yaml')), 'the roadmap is in the commit');
    assert.ok(!files.includes('notes.txt'), 'the unrelated staged file is not');
    assert.match(git(dir, 'status', '--porcelain', 'notes.txt').out, /notes\.txt/);
  } finally {
    cleanup(dir);
  }
});

test('the develop-task checkpoint commits a task with its own files', () => {
  const { dir, root, p } = scratch();
  try {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'invoice.mjs'), 'export const invoice = 1;\n', 'utf8');
    writeFileSync(join(dir, 'src', 'unrelated.mjs'), 'export const other = 2;\n', 'utf8');
    mkdirSync(join(root, 'products', 'client-tracker', 'execution'), { recursive: true });
    writeYaml(p.tasks('client-tracker'), {
      product: 'client-tracker',
      version: '0.1.0',
      tasks: [{
        id: 'US-CLIENT-TRACKER-0.1.0-T01',
        summary: 'Create the invoices table.',
        why_required: 'Every acceptance criterion reads or writes an invoice.',
        status: 'done',
        depends_on: [],
        acceptance_criteria: [],
        files: ['src/invoice.mjs'],
        evidence: [],
      }],
    });

    const result = commitCheckpoint(root, {
      checkpoint: 'develop-task', task: 'US-CLIENT-TRACKER-0.1.0-T01',
    });
    assert.equal(result.committed, true);
    assert.equal(result.subject, 'chore(develop): Create the invoices table');
    // The task id is greppable in a trailer rather than eating the subject line.
    assert.match(git(dir, 'log', '-1', '--pretty=%b').out, /^Task: US-CLIENT-TRACKER-0\.1\.0-T01$/m);
    const files = git(dir, 'show', '--name-only', '--pretty=', 'HEAD').out.split('\n');
    assert.ok(files.includes('src/invoice.mjs'), 'the task\'s own file is committed with it');
    assert.ok(files.some((f) => f.endsWith('tasks.yaml')), 'the recorded evidence rides along');
    assert.ok(!files.includes('src/unrelated.mjs'), 'a file the task does not declare is not');
  } finally {
    cleanup(dir);
  }
});

test('a long task summary is truncated to keep the whole subject readable', () => {
  const { dir, root, p } = scratch();
  try {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'a.mjs'), 'export const a = 1;\n', 'utf8');
    mkdirSync(join(root, 'products', 'client-tracker', 'execution'), { recursive: true });
    writeYaml(p.tasks('client-tracker'), {
      product: 'client-tracker',
      version: '0.1.0',
      tasks: [{
        id: 'US-CLIENT-TRACKER-0.1.0-T01',
        summary: 'Implement the invoice ledger, its migration, the reconciliation pass, and every report the finance team asked for last quarter.',
        why_required: 'Needed.',
        status: 'done',
        depends_on: [],
        acceptance_criteria: [],
        files: ['src/a.mjs'],
        evidence: [],
      }],
    });

    const result = commitCheckpoint(root, {
      checkpoint: 'develop-task', task: 'US-CLIENT-TRACKER-0.1.0-T01',
    });
    assert.equal(result.committed, true);
    assert.ok(
      result.subject.length <= SUBJECT_LIMIT,
      `subject is ${result.subject.length} chars, over the ${SUBJECT_LIMIT} limit: ${result.subject}`,
    );
    assert.match(result.subject, /…$/);
  } finally {
    cleanup(dir);
  }
});

test('develop-task refuses without a task id and rejects an unknown one', () => {
  const { dir, root, p } = scratch();
  try {
    mkdirSync(join(root, 'products', 'client-tracker', 'execution'), { recursive: true });
    writeYaml(p.tasks('client-tracker'), { product: 'client-tracker', version: '0.1.0', tasks: [] });
    assert.throws(
      () => commitCheckpoint(root, { checkpoint: 'develop-task' }),
      /needs --task/,
    );
    assert.throws(
      () => commitCheckpoint(root, { checkpoint: 'develop-task', task: 'US-NOPE-0.1.0-T09' }),
      /No task "US-NOPE-0.1.0-T09"/,
    );
  } finally {
    cleanup(dir);
  }
});

// complete-release runs after transition RELEASED archived the execution
// pointer, so the version cannot come from active.yaml at that point.
test('complete-release derives its version from the release records', () => {
  const { dir, root, p } = scratch();
  try {
    mkdirSync(join(root, 'products', 'client-tracker', 'releases'), { recursive: true });
    for (const v of ['0.1.0', '0.2.0', '0.10.0']) {
      writeYaml(p.release('client-tracker', v), { product: 'client-tracker', version: v });
    }
    const result = commitCheckpoint(root, { checkpoint: 'complete-release' });
    assert.equal(result.version, '0.10.0', 'SemVer order, not lexical');
    assert.equal(result.subject, 'chore(release): client-tracker 0.10.0');
  } finally {
    cleanup(dir);
  }
});

test('a subject that cannot name its version fails loudly instead of committing', () => {
  const { dir, root } = scratch();
  try {
    // No active pointer and no release records: nothing to derive a version from.
    assert.throws(
      () => commitCheckpoint(root, { checkpoint: 'complete-release' }),
      /could not derive a version from canonical state/,
    );
  } finally {
    cleanup(dir);
  }
});

test('an unknown checkpoint names the valid ones', () => {
  const { dir, root } = scratch();
  try {
    assert.throws(
      () => commitCheckpoint(root, { checkpoint: 'whenever' }),
      /Unknown checkpoint "whenever"/,
    );
    assert.ok(CHECKPOINT_NAMES.includes('complete-release'));
    assert.equal(CHECKPOINT_NAMES.length, 7);
  } finally {
    cleanup(dir);
  }
});
