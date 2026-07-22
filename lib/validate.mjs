import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { readYaml } from './yaml.mjs';
import { validate as checkSchema } from './schema.mjs';
import { load } from './schemas.mjs';
import { paths } from './paths.mjs';
import { compare, isValid } from './semver.mjs';
import { verifyLock } from './lock.mjs';

const RELEASED_REQUIRED = ['delivered', 'evidence', 'immutable', 'mode', 'released_at'];

function relPath(root, path) {
  return relative(root, path) || basename(path);
}

/** Read a dot-path (numeric segments index arrays) out of a parsed JSON object. */
function readKeyPath(obj, keyPath) {
  let cur = obj;
  for (const seg of String(keyPath).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[/^\d+$/.test(seg) ? Number(seg) : seg];
  }
  return cur;
}

/** Read and schema-check one file. Returns the parsed document, or null on failure. */
function checkFile(root, path, schemaName, errors) {
  if (!existsSync(path)) return null;
  const label = relPath(root, path);

  let doc;
  try {
    doc = readYaml(path);
  } catch (err) {
    errors.push(`${label}: could not parse — ${err.message}`);
    return null;
  }

  for (const error of checkSchema(load(schemaName), doc, label)) errors.push(error);
  return doc;
}

function checkRelease(root, p, product, version, errors) {
  const path = p.release(product, version);
  const label = relPath(root, path);
  const release = checkFile(root, path, 'release', errors);
  if (!release) return null;

  if (release.version !== version) {
    errors.push(`${label}: declares version ${release.version} but is filed as ${version}.`);
  }

  if (release.status === 'released') {
    const missing = RELEASED_REQUIRED.filter((key) => release[key] === undefined).sort();
    if (missing.length) {
      errors.push(`${label}: status is "released" but missing: ${missing.join(', ')}.`);
    }
  } else if (release.immutable !== undefined) {
    errors.push(
      `${label}: status is "${release.status}" but it is marked immutable. Only released records are immutable.`,
    );
  }
  return release;
}

function checkLifecycle(root, p, product, errors) {
  const path = p.lifecycle(product);
  if (!existsSync(path)) return; // a product may exist before its lifecycle starts
  const doc = checkFile(root, path, 'lifecycle', errors);
  if (doc && doc.product !== product) {
    errors.push(
      `${relPath(root, path)}: declares product ${doc.product} but is filed under ${product}.`,
    );
  }
}

function checkRoadmap(root, p, product, errors) {
  const path = p.roadmap(product);
  const label = relPath(root, path);
  const roadmap = checkFile(root, path, 'roadmap', errors);
  if (!roadmap?.versions) return roadmap;

  const seen = new Set();
  let previous = null;
  for (const entry of roadmap.versions) {
    if (!isValid(entry.version)) continue; // the schema already reported this
    if (seen.has(entry.version)) {
      errors.push(`${label}: version ${entry.version} appears more than once.`);
    }
    seen.add(entry.version);

    if (previous && compare(previous, entry.version) >= 0) {
      errors.push(
        `${label}: versions are not in ascending SemVer order (${previous} precedes ${entry.version}).`,
      );
    }
    previous = entry.version;

    if (entry.detail === 'specified' && !existsSync(p.release(product, entry.version))) {
      errors.push(
        `${label}: ${entry.version} is marked "specified" but has no release file at releases/${entry.version}.yaml.`,
      );
    }
  }
  return roadmap;
}

/** Roadmap status and release-record status must agree, in both directions. */
function checkStatusCoherence(root, p, product, roadmap, releases, errors) {
  const label = relPath(root, p.roadmap(product));
  const roadmapStatus = new Map((roadmap?.versions ?? []).map((e) => [e.version, e.status]));

  for (const [version, doc] of releases) {
    if (doc?.status !== 'released') continue;
    const rs = roadmapStatus.get(version);
    if (rs !== 'released') {
      errors.push(
        `${label}: ${version} has a released release record but its roadmap entry is ${rs ? `"${rs}"` : 'missing'}. A released version must be marked released in the roadmap.`,
      );
    }
  }

  for (const [version, status] of roadmapStatus) {
    if (status !== 'released') continue;
    // A missing record is governed by the specified-detail rule above: genesis and
    // outline versions may be released in the roadmap with no contract file. Only an
    // existing record that disagrees is a contradiction.
    const doc = releases.get(version);
    if (doc && doc.status !== 'released') {
      errors.push(
        `${label}: ${version} is marked released in the roadmap but its release record status is "${doc.status}". A released roadmap entry needs a released record.`,
      );
    }
  }
}

function checkExecution(root, p, product, releases, errors) {
  const activePath = p.active(product);
  const active = checkFile(root, activePath, 'active', errors);
  if (active && !existsSync(p.release(product, active.version))) {
    errors.push(
      `${relPath(root, activePath)}: active release ${active.version} has no release file.`,
    );
  }
  if (active && releases.get(active.version)?.status === 'released') {
    errors.push(
      `${relPath(root, activePath)}: execution pointer references version ${active.version} whose release record is already released. A shipped version must not hold an execution pointer.`,
    );
  }

  const tasksPath = p.tasks(product);
  const tasks = checkFile(root, tasksPath, 'tasks', errors);
  if (!tasks?.tasks) return;

  const releasePath = p.release(product, tasks.version);
  if (!existsSync(releasePath)) return;

  let release;
  try {
    release = readYaml(releasePath);
  } catch {
    return; // already reported by checkRelease
  }
  const criteria = new Set([
    ...(release.acceptance?.functional ?? []),
    ...(release.acceptance?.non_functional ?? []),
    ...(release.acceptance?.operational ?? []),
  ]);

  for (const task of tasks.tasks) {
    for (const criterion of task.acceptance_criteria ?? []) {
      if (!criteria.has(criterion)) {
        errors.push(
          `${relPath(root, tasksPath)}: task ${task.id} cites an acceptance criterion absent from release ${tasks.version}: "${criterion}".`,
        );
      }
    }
  }
}

/**
 * Every declared version-bearing file must carry the current release version —
 * the greatest released version in the workspace. Skipped when nothing is
 * declared or nothing has been released yet.
 */
function checkVersionFiles(root, p, config, referenceVersion, errors) {
  const files = config?.version_files;
  if (!files?.length || !referenceVersion) return;
  const projectRoot = dirname(root);

  for (const entry of files) {
    const filePath = join(projectRoot, entry.path);
    if (!existsSync(filePath)) {
      errors.push(`ultraship.yaml: declared version file ${entry.path} does not exist.`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (err) {
      errors.push(`${entry.path}: could not parse as JSON — ${err.message}`);
      continue;
    }
    const found = readKeyPath(data, entry.key);
    if (found === undefined) {
      errors.push(`${entry.path}: no value at key "${entry.key}".`);
    } else if (found !== referenceVersion) {
      errors.push(
        `${entry.path}: version ${JSON.stringify(found)} at "${entry.key}" disagrees with the release version ${referenceVersion}.`,
      );
    }
  }
}

export function validateWorkspace(root) {
  const p = paths(root);
  const errors = [];
  let checked = 0;

  const config = checkFile(root, p.config, 'ultraship', errors);
  const workspace = checkFile(root, p.workspace, 'workspace', errors);
  checked += 2;

  const products = existsSync(p.products)
    ? readdirSync(p.products, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
    : [];

  if (workspace?.active_product && !products.includes(workspace.active_product)) {
    errors.push(
      `workspace.yaml: active_product "${workspace.active_product}" has no product directory.`,
    );
  }

  let referenceVersion = null; // greatest released version across the workspace

  for (const product of products) {
    checkFile(root, p.product(product), 'product', errors);
    checkLifecycle(root, p, product, errors);
    const roadmap = checkRoadmap(root, p, product, errors);
    checked += 4;

    const releases = new Map();
    const releasesDir = p.releases(product);
    if (existsSync(releasesDir)) {
      for (const file of readdirSync(releasesDir).filter((f) => f.endsWith('.yaml'))) {
        const version = basename(file, '.yaml');
        const doc = checkRelease(root, p, product, version, errors);
        if (doc) releases.set(version, doc);
        checked += 1;
      }
    }

    for (const [version, doc] of releases) {
      if (doc.status === 'released' && isValid(version)
        && (!referenceVersion || compare(version, referenceVersion) > 0)) {
        referenceVersion = version;
      }
    }

    checkExecution(root, p, product, releases, errors);
    checkStatusCoherence(root, p, product, roadmap, releases, errors);
    checked += 2;
  }

  checkVersionFiles(root, p, config, referenceVersion, errors);

  for (const [dir, schemaName] of [[p.iterations, 'iteration'], [p.checkpoints, 'checkpoint']]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
      checkFile(root, join(dir, file), schemaName, errors);
      checked += 1;
    }
  }

  for (const violation of verifyLock(root)) errors.push(violation);

  return { ok: errors.length === 0, errors, checked };
}
