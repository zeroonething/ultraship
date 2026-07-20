import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { writeYaml } from '../lib/yaml.mjs';
import { hashFile, readLock, recordRelease, verifyLock } from '../lib/lock.mjs';

function workspaceWithRelease(version = '0.1.0') {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-lock-'));
  const { root } = init(dir);
  const p = paths(root);
  mkdirSync(p.releases('client-tracker'), { recursive: true });
  writeYaml(p.release('client-tracker', version), {
    product: 'client-tracker',
    version,
    status: 'released',
    immutable: true,
    delivered: 'A freelancer records an invoice and marks it paid.',
  });
  return { dir, root, p };
}

test('hashFile returns a stable prefixed sha256', () => {
  const { dir, p } = workspaceWithRelease();
  try {
    const hash = hashFile(p.release('client-tracker', '0.1.0'));
    assert.match(hash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(hash, hashFile(p.release('client-tracker', '0.1.0')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an empty lock reads as an empty releases map', () => {
  const { dir, root } = workspaceWithRelease();
  try {
    assert.deepEqual(readLock(root), { releases: {} });
    assert.deepEqual(verifyLock(root), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recordRelease pins the record and verification passes', () => {
  const { dir, root } = workspaceWithRelease();
  try {
    const hash = recordRelease(root, 'client-tracker', '0.1.0');
    assert.equal(readLock(root).releases['client-tracker/0.1.0'], hash);
    assert.deepEqual(verifyLock(root), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('editing a released record is detected', () => {
  const { dir, root, p } = workspaceWithRelease();
  try {
    recordRelease(root, 'client-tracker', '0.1.0');
    appendFileSync(p.release('client-tracker', '0.1.0'), 'known_limitations: []\n');

    const violations = verifyLock(root);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /client-tracker\/0\.1\.0/);
    assert.match(violations[0], /has been modified since release/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('deleting a released record is detected', () => {
  const { dir, root, p } = workspaceWithRelease();
  try {
    recordRelease(root, 'client-tracker', '0.1.0');
    unlinkSync(p.release('client-tracker', '0.1.0'));

    const violations = verifyLock(root);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /is missing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recording the same version twice throws rather than repinning', () => {
  const { dir, root } = workspaceWithRelease();
  try {
    recordRelease(root, 'client-tracker', '0.1.0');
    assert.throws(
      () => recordRelease(root, 'client-tracker', '0.1.0'),
      /already released and immutable/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recording a version with no release file throws', () => {
  const { dir, root } = workspaceWithRelease();
  try {
    assert.throws(() => recordRelease(root, 'client-tracker', '9.9.9'), /No release file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('multiple releases are pinned independently', () => {
  const { dir, root, p } = workspaceWithRelease();
  try {
    writeYaml(p.release('client-tracker', '0.2.0'), {
      product: 'client-tracker', version: '0.2.0', status: 'released', immutable: true,
    });
    recordRelease(root, 'client-tracker', '0.1.0');
    recordRelease(root, 'client-tracker', '0.2.0');
    assert.equal(Object.keys(readLock(root).releases).length, 2);
    assert.deepEqual(verifyLock(root), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
