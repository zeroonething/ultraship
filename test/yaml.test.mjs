import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify, readYaml, writeYaml } from '../lib/yaml.mjs';

test('parses a nested mapping', () => {
  const doc = parse('product: billing\nversions:\n  - 0.1.0\n  - 0.2.0\n');
  assert.deepEqual(doc, { product: 'billing', versions: ['0.1.0', '0.2.0'] });
});

test('round-trips prose, nulls, and empty collections', () => {
  const value = {
    vision: 'Freelancers lose hours\nchasing invoices.',
    budget_usd: null,
    non_goals: [],
    nested: { a: 1, b: [true, false] },
  };
  assert.deepEqual(parse(stringify(value)), value);
});

test('writes and reads a file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-yaml-'));
  try {
    const file = join(dir, 'product.yaml');
    writeYaml(file, { id: 'billing', users: ['freelancer'] });
    assert.deepEqual(readYaml(file), { id: 'billing', users: ['freelancer'] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parse throws with a useful message on malformed input', () => {
  assert.throws(() => parse('a:\n  - b\n c: d\n'), /./);
});
