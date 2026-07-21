import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/schema.mjs';
import { load } from '../lib/schemas.mjs';

test('ultraship.yaml accepts an all-unknown resource profile', () => {
  const errors = validate(load('ultraship'), {
    schema_version: 1,
    framework_version: '0.1.0',
    resource_profile: {
      provider_tool: null,
      billing_mode: null,
      model_policy: 'auto',
      available: {
        time_minutes: null,
        token_budget: null,
        monetary_budget_usd: null,
        human_review_minutes: null,
      },
      preferences: {
        minimize_cost: true,
        allow_additional_spend: false,
        allow_model_routing: true,
        allow_parallel_agents: false,
      },
      telemetry: { source: 'unknown', confidence: 'low' },
    },
  });
  assert.deepEqual(errors, []);
});

test('ultraship.yaml rejects a fabricated telemetry source', () => {
  const doc = {
    schema_version: 1,
    framework_version: '0.1.0',
    resource_profile: {
      provider_tool: null, billing_mode: null, model_policy: 'auto',
      available: { time_minutes: null, token_budget: null, monetary_budget_usd: null, human_review_minutes: null },
      preferences: { minimize_cost: true, allow_additional_spend: false, allow_model_routing: true, allow_parallel_agents: false },
      telemetry: { source: 'measured-by-agent', confidence: 'high' },
    },
  };
  const errors = validate(load('ultraship'), doc);
  assert.match(errors[0], /telemetry\.source: expected one of/);
});

test('workspace.yaml accepts a freshly initialized workspace', () => {
  const errors = validate(load('workspace'), {
    id: 'freelance-tools',
    name: 'Freelance Tools',
    vision: '',
    constraints: [],
    active_product: null,
  });
  assert.deepEqual(errors, []);
});

test('workspace.yaml rejects a lifecycle state written onto it', () => {
  const errors = validate(load('workspace'), {
    id: 'w', name: 'W', vision: '', constraints: [], active_product: null,
    state: 'DEVELOPING',
  });
  assert.match(errors[0], /unexpected property "state"/);
});

test('lifecycle.yaml accepts a product mid-development', () => {
  const errors = validate(load('lifecycle'), {
    product: 'client-tracker', state: 'DEVELOPING', resumes_to: null, blockers: [],
  });
  assert.deepEqual(errors, []);
});

test('lifecycle.yaml rejects a state outside the state model', () => {
  const errors = validate(load('lifecycle'), {
    product: 'client-tracker', state: 'SHIPPING', resumes_to: null, blockers: [],
  });
  assert.match(errors[0], /state: expected one of/);
});

test('product.yaml accepts a complete definition', () => {
  const errors = validate(load('product'), {
    id: 'client-tracker',
    name: 'Client Tracker',
    classification: 'independent-product',
    vision: 'Freelancers stop losing invoices in email threads.',
    users: ['solo freelancer'],
    problems: ['Invoices are tracked across scattered email threads.'],
    outcomes: ['A freelancer sees every unpaid invoice in one place.'],
    requirements: ['Record a client', 'Record an invoice against a client'],
    constraints: ['Single user, no collaboration in 0.1.0'],
    public_contract: 'Web UI only. No public API in 0.1.0.',
    deployment_context: 'Single-tenant, self-hosted.',
    success_measures: ['A real invoice is recorded and marked paid.'],
    non_goals: ['payroll', 'tax filing'],
    assumptions: ['Users already have client email addresses.'],
    mvp_boundary: 'One freelancer records one invoice and marks it paid.',
  });
  assert.deepEqual(errors, []);
});

test('product.yaml rejects an unclassified product', () => {
  const errors = validate(load('product'), {
    id: 'x', name: 'X', classification: 'maybe-a-product', vision: '', users: [],
    problems: [], outcomes: [], requirements: [], constraints: [],
    public_contract: '', deployment_context: '', success_measures: [],
    non_goals: [], assumptions: [], mvp_boundary: '',
  });
  assert.match(errors[0], /classification: expected one of/);
});

test('product.yaml refuses a vision written into it twice under another name', () => {
  const errors = validate(load('product'), {
    id: 'x', name: 'X', classification: 'independent-product', vision: 'a',
    users: [], problems: [], outcomes: [], requirements: [], constraints: [],
    public_contract: '', deployment_context: '', success_measures: [],
    non_goals: [], assumptions: [], mvp_boundary: '',
    roadmap: ['0.1.0'],
  });
  assert.match(errors[0], /unexpected property "roadmap"/);
});

test('roadmap.yaml accepts rolling-wave detail levels', () => {
  const errors = validate(load('roadmap'), {
    product: 'client-tracker',
    status: 'active',
    versions: [
      { version: '0.1.0', outcome: 'A freelancer records one invoice and marks it paid.', detail: 'specified', status: 'planned' },
      { version: '0.2.0', outcome: 'The freelancer manages recurring invoices.', detail: 'outline', status: 'planned' },
      { version: '0.3.0', outcome: 'Clients can view their own invoices.', detail: 'hypothesis', status: 'planned' },
    ],
  });
  assert.deepEqual(errors, []);
});

test('roadmap.yaml rejects a version that is a technical layer, not an outcome', () => {
  const errors = validate(load('roadmap'), {
    product: 'p', status: 'active',
    versions: [{ version: '0.1.0', detail: 'specified', status: 'planned' }],
  });
  assert.match(errors[0], /missing required property "outcome"/);
});

test('roadmap.yaml rejects a non-SemVer version', () => {
  const errors = validate(load('roadmap'), {
    product: 'p', status: 'active',
    versions: [{ version: 'v1', outcome: 'x', detail: 'specified', status: 'planned' }],
  });
  assert.match(errors[0], /does not match/);
});

test('every declared schema name loads', () => {
  for (const name of ['ultraship', 'workspace', 'product', 'roadmap']) {
    const schema = load(name);
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
  }
});

test('load throws a clear error for an unknown schema', () => {
  assert.throws(() => load('nonsense'), /Unknown schema "nonsense"/);
});
