// ponytail: hand-rolled interpreter for the JSON Schema subset UltraShip's own
// schemas use — type, required, properties, additionalProperties, items, enum,
// const, pattern, minItems. No $ref, allOf, oneOf, or format. If a schema ever
// needs those, swap this module for ajv; the validate() signature is the seam.

const TYPE_CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number',
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  null: (v) => v === null,
};

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function check(schema, value, path, errors) {
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => TYPE_CHECKS[t]?.(value))) {
      errors.push(`${path}: expected ${types.join(' or ')}, got ${describe(value)}`);
      return;
    }
  }

  if (value === null || value === undefined) return;

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${path}: expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}`);
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }

  if (schema.pattern !== undefined && typeof value === 'string') {
    if (!new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} item(s), got ${value.length}`);
    }
    if (schema.items !== undefined) {
      value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
    }
  }

  if (TYPE_CHECKS.object(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) check(sub, value[key], `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}: unexpected property "${key}"`);
      }
    }
  }
}

/**
 * Validate `data` against `schema`.
 * @returns {string[]} human-readable errors; empty array means valid.
 */
export function validate(schema, data, rootPath = '$') {
  const errors = [];
  check(schema, data, rootPath, errors);
  return errors;
}
