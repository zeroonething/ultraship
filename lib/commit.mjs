// Commits the working skills' own output at the checkpoints defined in
// shared/commit-protocol.md. Local only: it stages and commits, and the allowed
// subcommand list below makes push, branch, and tag structurally unreachable, so
// nothing this module does can leave the machine. Every checkpoint stages an
// explicit path list derived from canonical state — never `git add -A`, so a
// developer's unrelated working changes are never swept into an UltraShip commit.
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { compare, isValid } from './semver.mjs';

// The release that introduced committing. A workspace recording an older
// framework_version and no explicit policy predates the feature, so it stays off.
export const POLICY_FLOOR = '2.0.0';

// git is a local tool here. Anything that could reach the network, move a ref, or
// rewrite history is absent by construction, and runGit refuses an unlisted verb
// rather than trusting every caller to remember.
export const ALLOWED_GIT = Object.freeze(['rev-parse', 'status', 'add', 'check-ignore', 'commit']);

/**
 * The effective policy for a workspace config. An explicit value always wins.
 * Absent means `checkpoint` for a workspace created by 2.0 or later and `off` for
 * one carried over from 1.x, so upgrading without migrating never starts commits.
 */
export function resolvePolicy(config) {
  if (config?.commit_policy) return config.commit_policy;
  const recorded = config?.framework_version;
  return isValid(recorded) && compare(recorded, POLICY_FLOOR) >= 0 ? 'checkpoint' : 'off';
}

/**
 * The greatest version filed under releases/. `complete-release` runs after
 * `transition RELEASED` has archived the execution pointer, so active.yaml is
 * gone by then and the version has to come from the records themselves.
 */
function latestRelease(p, product) {
  const dir = p.releases(product);
  if (!existsSync(dir)) return null;
  const versions = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => basename(f, '.yaml'))
    .filter(isValid)
    .sort(compare);
  return versions.at(-1) ?? null;
}

function runGit(args, cwd) {
  if (!ALLOWED_GIT.includes(args[0])) {
    throw new Error(`ultraship commit refuses the git subcommand "${args[0]}".`);
  }
  // No shell: arguments are passed through verbatim, so a path can never be
  // reinterpreted as a command.
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    exit: res.status == null ? 1 : res.status,
    stdout: (res.stdout ?? '').trim(),
    stderr: (res.stderr ?? '').trim(),
    spawnError: res.error ? res.error.message : null,
  };
}

// Conventional Commits keeps the subject readable in a one-line log.
export const SUBJECT_LIMIT = 72;

/**
 * Fit `text` into what is left of the subject after `prefix`, as one line with no
 * trailing period. The budget is the whole subject, not the fragment — a summary
 * measured on its own produces a subject far past the limit once prefixed.
 */
function subjectify(prefix, text) {
  const one = String(text).replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  const room = SUBJECT_LIMIT - prefix.length;
  return `${prefix}${one.length > room ? `${one.slice(0, Math.max(room - 1, 0))}…` : one}`;
}

/**
 * The checkpoint registry. Each entry returns the absolute paths it stages and
 * the Conventional Commits subject, both derived from canonical state so the
 * message is never invented by the agent.
 */
const CHECKPOINTS = {
  'plan-roadmap': (p, c) => ({
    paths: [p.roadmap(c.product), p.views],
    subject: `chore(plan): update the ${c.product} roadmap`,
  }),
  'plan-contract': (p, c) => ({
    paths: [p.release(c.product, c.version), p.lifecycle(c.product), p.views],
    subject: `chore(plan): specify ${c.product} ${c.version}`,
  }),
  'develop-tasks': (p, c) => ({
    paths: [p.active(c.product), p.tasks(c.product), p.lifecycle(c.product), p.views],
    subject: `chore(develop): plan tasks for ${c.product} ${c.version}`,
  }),
  // The one checkpoint that also carries the project's own source: a task commit
  // holds its implementation and its recorded evidence together, which is what
  // makes it reviewable and revertible on its own.
  'develop-task': (p, c) => {
    if (!c.task) throw new Error('The develop-task checkpoint needs --task <id>.');
    const doc = existsSync(p.tasks(c.product)) ? readYaml(p.tasks(c.product)) : null;
    const task = (doc?.tasks ?? []).find((t) => t.id === c.task);
    if (!task) throw new Error(`No task "${c.task}" in ${p.tasks(c.product)}.`);
    const projectRoot = dirname(p.root);
    return {
      paths: [p.tasks(c.product), ...(task.files ?? []).map((f) => `${projectRoot}/${f}`)],
      // The id goes in a trailer, not the subject: prefixed by the type and a
      // full US-PRODUCT-VERSION-Tnn key there is no room left to say what the
      // task actually did, which is the only thing a one-line log is good for.
      subject: subjectify('chore(develop): ', task.summary),
      body: `Task: ${task.id}`,
    };
  },
  'develop-checkpoint': (p, c) => ({
    paths: [p.checkpoints, p.tasks(c.product)],
    subject: `chore(develop): checkpoint ${c.product} ${c.version}`,
  }),
  // iterate may touch any canonical file the plan change affects, so the whole
  // product directory is in scope alongside the iteration record itself.
  iterate: (p, c) => ({
    paths: [p.iterations, p.productDir(c.product), p.views],
    subject: `chore(iterate): record plan change for ${c.product} ${c.version}`,
  }),
  // Runs last in complete, once the record, the lock, and every declared
  // version-bearing file are written, so the shipped commit is self-consistent.
  'complete-release': (p, c) => ({
    paths: [
      p.release(c.product, c.version), p.lock, p.lifecycle(c.product),
      p.productDir(c.product), p.views,
      ...(c.versionFiles ?? []),
    ],
    subject: `chore(release): ${c.product} ${c.version}`,
  }),
};

export const CHECKPOINT_NAMES = Object.freeze(Object.keys(CHECKPOINTS));

/**
 * Commit one checkpoint. Never throws for an ordinary "nothing to do" condition —
 * the policy being off, no git repository, no git on PATH, or no change under the
 * checkpoint's paths all return committed:false and exit 0, because a spurious
 * failure here would block every skill.
 */
export function commitCheckpoint(root, { checkpoint, product, version, task } = {}) {
  const p = paths(root);
  const build = CHECKPOINTS[checkpoint];
  if (!build) {
    throw new Error(`Unknown checkpoint "${checkpoint}". Valid: ${CHECKPOINT_NAMES.join(', ')}.`);
  }

  const config = existsSync(p.config) ? readYaml(p.config) : {};
  const policy = resolvePolicy(config);
  const id = product ?? (existsSync(p.workspace) ? readYaml(p.workspace).active_product : null);
  if (!id) throw new Error('No active product to commit. Run "ultraship product add <id>" first.');

  let ver = version;
  if (!ver && existsSync(p.active(id))) ver = readYaml(p.active(id)).version;
  if (!ver) ver = latestRelease(p, id);

  const base ={ product: id, version: ver ?? null, checkpoint, policy, committed: false, staged: [] };
  if (policy !== 'checkpoint') {
    return { ...base, reason: `commit_policy is "${policy}"; nothing was committed.` };
  }

  const projectRoot = dirname(p.root);
  const probe = runGit(['rev-parse', '--git-dir'], projectRoot);
  if (probe.spawnError) return { ...base, reason: 'git is not available on PATH.' };
  if (probe.exit !== 0) return { ...base, reason: `${projectRoot} is not a git repository.` };

  const versionFiles = (config.version_files ?? []).map((f) => `${projectRoot}/${f.path}`);
  const { paths: wanted, subject, body } = build(p, { product: id, version: ver, task, versionFiles });
  // A subject is derived from canonical state, so a missing fact must fail loudly
  // rather than ship a commit reading "ultraship undefined".
  if (/\b(undefined|null)\b/.test(subject)) {
    throw new Error(
      `The ${checkpoint} checkpoint could not derive a version from canonical state. Pass it: ultraship commit ${checkpoint} ${id} <version>.`,
    );
  }

  // A path that does not exist yet is simply not part of this checkpoint.
  const staged = [...new Set(wanted.filter((path) => existsSync(path)))]
    .map((path) => relative(projectRoot, path))
    .sort();
  if (!staged.length) return { ...base, reason: 'None of this checkpoint\'s paths exist yet.' };

  // `git add` refuses an ignored path and fails the whole call, so one gitignored
  // path would fail a checkpoint that has real work in it. Every workspace ignores
  // `.ultraship/` since it became local-only, which is every checkpoint. Drop the
  // ignored paths first: a path the project told git to ignore is a path this
  // command may not stage, and that is a no-op, not an error.
  const ignore = runGit(['check-ignore', '--', ...staged], projectRoot);
  // check-ignore exits 1 when nothing matched, which is not a failure. Anything
  // above that is, and staging blind after it would fail on the ignored path.
  if (ignore.exit > 1) return { ...base, staged, reason: `git check-ignore failed — ${ignore.stderr}` };
  const ignored = new Set(ignore.stdout.split('\n').filter(Boolean));
  const stageable = staged.filter((path) => !ignored.has(path));
  if (!stageable.length) {
    return { ...base, staged, reason: 'Every path under this checkpoint is gitignored.' };
  }

  const status = runGit(['status', '--porcelain', '--', ...stageable], projectRoot);
  if (status.exit !== 0) return { ...base, staged: stageable, reason: `git status failed — ${status.stderr}` };
  if (!status.stdout) return { ...base, staged: stageable, reason: 'No change under this checkpoint\'s paths.' };

  const add = runGit(['add', '--', ...stageable], projectRoot);
  if (add.exit !== 0) {
    return { ...base, staged: stageable, ok: false, reason: `git add failed — ${add.stderr}` };
  }

  // The pathspec on commit is deliberate: it commits exactly these paths even if
  // the developer already had something unrelated staged in the index.
  const message = body ? ['-m', subject, '-m', body] : ['-m', subject];
  const commit = runGit(['commit', '--only', ...message, '--', ...stageable], projectRoot);
  if (commit.exit !== 0) {
    return { ...base, staged: stageable, ok: false, subject, reason: `git commit failed — ${commit.stderr || commit.stdout}` };
  }

  const sha = runGit(['rev-parse', 'HEAD'], projectRoot);
  return { ...base, committed: true, ok: true, subject, sha: sha.stdout || null, staged: stageable };
}
