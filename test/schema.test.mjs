import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/schema.mjs';

const productSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'status'],
  properties: {
    id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
    status: { enum: ['active', 'archived'] },
    budget: { type: ['number', 'null'] },
    tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
    schema_version: { const: 1 },
  },
};

test('accepts a valid document', () => {
  const errors = validate(productSchema, {
    id: 'billing-portal',
    status: 'active',
    budget: null,
    tags: ['finance'],
    schema_version: 1,
  });
  assert.deepEqual(errors, []);
});

test('reports a missing required property by name', () => {
  const errors = validate(productSchema, { id: 'billing' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing required property "status"/);
});

test('rejects unexpected properties so facts cannot be duplicated', () => {
  const errors = validate(productSchema, { id: 'b', status: 'active', vision: 'x' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unexpected property "vision"/);
});

test('reports a wrong type with the path', () => {
  const errors = validate(productSchema, { id: 42, status: 'active' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\.id: expected string, got number/);
});

test('accepts either branch of a union type', () => {
  assert.deepEqual(validate(productSchema, { id: 'b', status: 'active', budget: 12 }), []);
  assert.deepEqual(validate(productSchema, { id: 'b', status: 'active', budget: null }), []);
});

test('rejects a value outside the enum', () => {
  const errors = validate(productSchema, { id: 'b', status: 'shipped' });
  assert.match(errors[0], /expected one of active, archived/);
});

test('rejects a string that fails the pattern', () => {
  const errors = validate(productSchema, { id: 'Billing Portal', status: 'active' });
  assert.match(errors[0], /does not match/);
});

test('rejects a const mismatch', () => {
  const errors = validate(productSchema, { id: 'b', status: 'active', schema_version: 2 });
  assert.match(errors[0], /expected 1, got 2/);
});

test('enforces minItems', () => {
  const errors = validate(productSchema, { id: 'b', status: 'active', tags: [] });
  assert.match(errors[0], /at least 1 item/);
});

test('reports the index of a bad array element', () => {
  const errors = validate(productSchema, { id: 'b', status: 'active', tags: ['ok', 7] });
  assert.match(errors[0], /\.tags\[1\]: expected string, got number/);
});

test('collects every error rather than stopping at the first', () => {
  const errors = validate(productSchema, { id: 42, status: 'shipped', extra: true });
  assert.equal(errors.length, 3);
});
