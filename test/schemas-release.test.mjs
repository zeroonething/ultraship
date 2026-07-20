import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/schema.mjs';
import { load, SCHEMA_NAMES } from '../lib/schemas.mjs';

const contract = {
  product: 'client-tracker',
  version: '0.1.0',
  status: 'planned',
  release_type: 'minor',
  outcome: {
    user_can: 'Record one invoice against one client and mark it paid.',
    business_value: 'Proves the core tracking loop is worth using.',
    evidence_of_value: 'A real unpaid invoice is recorded and settled.',
  },
  scope: {
    included: ['Create client', 'Create invoice', 'Mark invoice paid'],
    excluded: ['Recurring invoices', 'Multi-user access'],
    fallback_scope: ['Create client', 'Create invoice'],
  },
  acceptance: {
    functional: ['A freelancer creates a client and an invoice, then marks it paid.'],
    non_functional: ['Page loads in under two seconds on a local database.'],
    operational: ['The database file is backed up by a documented command.'],
  },
  delivery: {
    target_mode: 'release-ready',
    environment: 'local single-tenant',
    deployment_method: 'documented manual start',
    migrations: ['0001-create-clients-and-invoices'],
    observability: ['Application log to stdout'],
    rollback: 'Restore the database file from the documented backup.',
  },
  dependencies: { products: [], services: [], human_approvals: [] },
  resource_profile: {
    complexity: 'medium',
    uncertainty: 'medium',
    likely_cost_drivers: ['First-time schema design'],
    preferred_tools: [],
    constraints: [],
  },
  risks: ['Invoice state machine may be larger than it looks.'],
  open_questions: [],
};

test('release.yaml accepts a planned contract', () => {
  assert.deepEqual(validate(load('release'), contract), []);
});

test('release.yaml accepts a released record', () => {
  const released = {
    ...contract,
    status: 'released',
    released_at: '2026-07-21T09:00:00Z',
    mode: 'release-ready',
    delivered: 'A freelancer records an invoice and marks it paid.',
    evidence: {
      tests: ['npm test — 47 passing'],
      builds: ['npm run build — exit 0'],
      reviews: [],
      deployments: [],
      health_checks: [],
    },
    known_limitations: ['Single user only.'],
    supersedes: null,
    next_recommended_version: '0.2.0',
    immutable: true,
  };
  assert.deepEqual(validate(load('release'), released), []);
});

test('release.yaml rejects a target mode outside the four completion modes', () => {
  const bad = { ...contract, delivery: { ...contract.delivery, target_mode: 'shipped-ish' } };
  assert.match(validate(load('release'), bad)[0], /target_mode: expected one of/);
});

test('release.yaml rejects a contract with no user outcome', () => {
  const bad = { ...contract, outcome: { business_value: 'x', evidence_of_value: 'y' } };
  assert.match(validate(load('release'), bad)[0], /missing required property "user_can"/);
});

test('release.yaml rejects a non-SemVer version', () => {
  const bad = { ...contract, version: '0.1' };
  assert.match(validate(load('release'), bad)[0], /does not match/);
});

test('release.yaml rejects immutable set to false on a released record', () => {
  const bad = { ...contract, status: 'released', immutable: false };
  assert.match(validate(load('release'), bad).join('\n'), /immutable: expected true/);
});

test('active.yaml accepts an execution pointer with a qualitative fit', () => {
  assert.deepEqual(validate(load('active'), {
    product: 'client-tracker',
    version: '0.1.0',
    execution_state: 'DEVELOPING',
    checkpoint: null,
    blockers: [],
    release_fit: {
      assessment: 'probable',
      reasons: ['Scope is three workflows against one new schema.'],
      major_cost_drivers: ['First-time schema design'],
      recommended_scope_change: null,
    },
  }), []);
});

test('active.yaml rejects a numeric release fit, which would be fabricated', () => {
  const errors = validate(load('active'), {
    product: 'p', version: '0.1.0', execution_state: 'DEVELOPING', checkpoint: null,
    blockers: [],
    release_fit: {
      assessment: '73%', reasons: [], major_cost_drivers: [], recommended_scope_change: null,
    },
  });
  assert.match(errors[0], /assessment: expected one of high, probable, uncertain, unlikely/);
});

test('tasks.yaml accepts task IDs in the US- form and rejects SemVer as a task ID', () => {
  assert.deepEqual(validate(load('tasks'), {
    product: 'client-tracker',
    version: '0.1.0',
    tasks: [{
      id: 'US-CLIENT-TRACKER-0.1.0-T01',
      summary: 'Create the clients table and its migration.',
      why_required: 'Every acceptance criterion reads or writes a client.',
      status: 'todo',
      depends_on: [],
      acceptance_criteria: ['A freelancer creates a client and an invoice, then marks it paid.'],
      files: ['db/migrations/0001-create-clients-and-invoices.sql'],
      evidence: [],
    }],
  }), []);

  const bad = validate(load('tasks'), {
    product: 'p', version: '0.1.0',
    tasks: [{
      id: '0.1.1', summary: 's', why_required: 'w', status: 'todo',
      depends_on: [], acceptance_criteria: [], files: [], evidence: [],
    }],
  });
  assert.match(bad[0], /does not match/);
});

test('iteration.yaml accepts a recorded scope reduction', () => {
  assert.deepEqual(validate(load('iteration'), {
    id: 'US-CLIENT-TRACKER-0.1.0-I01',
    timestamp: '2026-07-21T11:30:00Z',
    category: ['release-level'],
    trigger: 'Invoice state machine is larger than planned.',
    evidence: ['Three unhandled states surfaced while writing the paid transition.'],
    before: {
      scope: ['Create client', 'Create invoice', 'Mark invoice paid', 'Partial payments'],
      assumptions: ['Payment is binary.'],
      implementation: 'Single boolean paid column.',
    },
    change: {
      summary: 'Adopt fallback scope; defer partial payments to 0.2.0.',
      added: [],
      removed: ['Partial payments'],
      deferred: ['Partial payments'],
      replaced: [],
    },
    impact: {
      products: ['client-tracker'],
      versions: ['0.1.0', '0.2.0'],
      tasks: ['US-CLIENT-TRACKER-0.1.0-T04'],
      dependencies: [],
      resource_effect: 'Removes roughly a third of the remaining implementation work.',
    },
    versioning: {
      previous_target: '0.1.0',
      new_target: '0.1.0',
      consequence: 'no-version-change',
    },
    approval: { source: 'user', reference: 'Confirmed in session 2026-07-21.' },
    canonical_updates: ['products/client-tracker/releases/0.1.0.yaml'],
  }), []);
});

test('iteration.yaml rejects an approval source that is not recorded', () => {
  const errors = validate(load('iteration'), {
    id: 'US-P-0.1.0-I01', timestamp: '', category: ['task-level'], trigger: '', evidence: [],
    before: { scope: [], assumptions: [], implementation: '' },
    change: { summary: '', added: [], removed: [], deferred: [], replaced: [] },
    impact: { products: [], versions: [], tasks: [], dependencies: [], resource_effect: '' },
    versioning: { previous_target: '0.1.0', new_target: '0.1.0', consequence: 'no-version-change' },
    approval: { source: 'nobody', reference: '' },
    canonical_updates: [],
  });
  assert.match(errors[0], /approval\.source: expected one of user, agent/);
});

test('checkpoint.yaml accepts a safe continuation record', () => {
  assert.deepEqual(validate(load('checkpoint'), {
    product: 'client-tracker',
    version: '0.1.0',
    timestamp: '2026-07-21T16:00:00Z',
    reason: 'capacity',
    repository_state: 'passing',
    completed_acceptance: ['A freelancer creates a client.'],
    remaining_acceptance: ['A freelancer marks an invoice paid.'],
    active_hypotheses: [],
    next_task: 'US-CLIENT-TRACKER-0.1.0-T04',
    required_context: ['db/migrations/0001-create-clients-and-invoices.sql'],
  }), []);
});

test('every declared schema exists on disk and forbids additional properties', () => {
  assert.equal(SCHEMA_NAMES.length, 9);
  for (const name of SCHEMA_NAMES) {
    assert.equal(load(name).additionalProperties, false, `${name} must forbid extra properties`);
  }
});
