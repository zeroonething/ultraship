// Released records are immutable. Instruction alone cannot enforce that, so we
// pin each released file's SHA-256 and let `ultraship validate` catch edits.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

export function hashFile(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

export function readLock(root) {
  const path = paths(root).lock;
  if (!existsSync(path)) return { releases: {} };
  const lock = readYaml(path);
  return { releases: lock?.releases ?? {} };
}

function writeLock(root, lock) {
  writeYaml(paths(root).lock, lock);
}

export function recordRelease(root, product, version) {
  const p = paths(root);
  const releasePath = p.release(product, version);
  if (!existsSync(releasePath)) {
    throw new Error(`No release file at ${releasePath}; cannot record a release that does not exist.`);
  }

  const lock = readLock(root);
  const key = `${product}/${version}`;
  if (lock.releases[key]) {
    throw new Error(
      `${key} is already released and immutable. Corrections require a new version.`,
    );
  }

  const hash = hashFile(releasePath);
  lock.releases[key] = hash;
  writeLock(root, lock);
  return hash;
}

export function verifyLock(root) {
  const p = paths(root);
  const { releases } = readLock(root);
  const violations = [];

  for (const [key, expected] of Object.entries(releases)) {
    const [product, version] = key.split('/');
    const releasePath = p.release(product, version);
    if (!existsSync(releasePath)) {
      violations.push(`${key}: released record is missing (expected ${releasePath}).`);
      continue;
    }
    const actual = hashFile(releasePath);
    if (actual !== expected) {
      violations.push(
        `${key}: released record has been modified since release. Corrections require a new version, not an edit.`,
      );
    }
  }

  return violations;
}
