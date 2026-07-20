import { existsSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
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
  if (!release) return;

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
}

function checkRoadmap(root, p, product, errors) {
  const path = p.roadmap(product);
  const label = relPath(root, path);
  const roadmap = checkFile(root, path, 'roadmap', errors);
  if (!roadmap?.versions) return;

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
}

function checkExecution(root, p, product, errors) {
  const activePath = p.active(product);
  const active = checkFile(root, activePath, 'active', errors);
  if (active && !existsSync(p.release(product, active.version))) {
    errors.push(
      `${relPath(root, activePath)}: active release ${active.version} has no release file.`,
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

export function validateWorkspace(root) {
  const p = paths(root);
  const errors = [];
  let checked = 0;

  checkFile(root, p.config, 'ultraship', errors);
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

  for (const product of products) {
    checkFile(root, p.product(product), 'product', errors);
    checkRoadmap(root, p, product, errors);
    checkExecution(root, p, product, errors);
    checked += 4;

    const releasesDir = p.releases(product);
    if (existsSync(releasesDir)) {
      for (const file of readdirSync(releasesDir).filter((f) => f.endsWith('.yaml'))) {
        checkRelease(root, p, product, basename(file, '.yaml'), errors);
        checked += 1;
      }
    }
  }

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
