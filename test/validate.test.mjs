import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { recordRelease } from '../lib/lock.mjs';
import { validateWorkspace } from '../lib/validate.mjs';

const CONTRACT = {
  product: 'client-tracker',
  version: '0.1.0',
  status: 'planned',
  release_type: 'minor',
  outcome: {
    user_can: 'Record one invoice and mark it paid.',
    business_value: 'Proves the tracking loop.',
    evidence_of_value: 'A real invoice is settled.',
  },
  scope: { included: ['Create invoice'], excluded: ['Recurring invoices'], fallback_scope: ['Create invoice'] },
  acceptance: {
    functional: ['A freelancer marks an invoice paid.'],
    non_functional: [],
    operational: [],
  },
  delivery: {
    target_mode: 'release-ready', environment: 'local', deployment_method: 'manual',
    migrations: [], observability: [], rollback: 'Restore the database file.',
  },
  dependencies: { products: [], services: [], human_approvals: [] },
  resource_profile: {
    complexity: 'small', uncertainty: 'low',
    likely_cost_drivers: [], preferred_tools: [], constraints: [],
  },
  risks: [],
  open_questions: [],
};

const PRODUCT = {
  id: 'client-tracker', name: 'Client Tracker', classification: 'independent-product',
  vision: 'Freelancers stop losing invoices.', users: ['freelancer'],
  problems: ['Invoices scatter across email.'], outcomes: ['One place for unpaid invoices.'],
  requirements: ['Record an invoice'], constraints: ['Single user'],
  public_contract: 'Web UI only.', deployment_context: 'Self-hosted.',
  success_measures: ['One invoice settled.'], non_goals: ['payroll'],
  assumptions: [], mvp_boundary: 'One invoice recorded and paid.',
};

const ROADMAP = {
  product: 'client-tracker',
  status: 'active',
  versions: [
    { version: '0.1.0', outcome: 'Record one invoice and mark it paid.', detail: 'specified', status: 'planned' },
    { version: '0.2.0', outcome: 'Manage recurring invoices.', detail: 'outline', status: 'planned' },
  ],
};

function buildWorkspace(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-validate-'));
  const { root } = init(dir);
  const p = paths(root);

  const workspace = readYaml(p.workspace);
  workspace.state = 'DEVELOPING';
  workspace.active_product = 'client-tracker';
  writeYaml(p.workspace, { ...workspace, ...(overrides.workspace ?? {}) });

  mkdirSync(p.releases('client-tracker'), { recursive: true });
  mkdirSync(join(p.productDir('client-tracker'), 'execution'), { recursive: true });
  writeYaml(p.product('client-tracker'), { ...PRODUCT, ...(overrides.product ?? {}) });
  writeYaml(p.roadmap('client-tracker'), overrides.roadmap ?? ROADMAP);
  writeYaml(p.release('client-tracker', overrides.releaseVersion ?? '0.1.0'), {
    ...CONTRACT, ...(overrides.release ?? {}),
  });

  return { dir, root, p };
}

test('a well-formed workspace validates', () => {
  const { dir, root } = buildWorkspace();
  try {
    const result = validateWorkspace(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.ok(result.checked >= 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a schema violation names the file and the field', () => {
  const { dir, root } = buildWorkspace({ product: { classification: 'maybe' } });
  try {
    const { ok, errors } = validateWorkspace(root);
    assert.equal(ok, false);
    assert.match(errors.join('\n'), /product\.yaml/);
    assert.match(errors.join('\n'), /classification: expected one of/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a fact written into the wrong file is rejected', () => {
  const { dir, root } = buildWorkspace({ roadmap: { ...ROADMAP, vision: 'copied from product' } });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /unexpected property "vision"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a release whose version disagrees with its filename is rejected', () => {
  const { dir, root } = buildWorkspace({ release: { version: '0.9.0' } });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /declares version 0\.9\.0 but is filed as 0\.1\.0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a released record missing its evidence is rejected', () => {
  const { dir, root } = buildWorkspace({
    release: { status: 'released', immutable: true, mode: 'release-ready' },
  });
  try {
    const { errors } = validateWorkspace(root);
    const joined = errors.join('\n');
    assert.match(joined, /status is "released" but missing: delivered, evidence, released_at/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unreleased record claiming immutability is rejected', () => {
  const { dir, root } = buildWorkspace({ release: { immutable: true } });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /status is "planned" but it is marked immutable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a specified roadmap version with no release file is rejected', () => {
  const { dir, root } = buildWorkspace({
    roadmap: {
      product: 'client-tracker', status: 'active',
      versions: [
        { version: '0.1.0', outcome: 'a', detail: 'specified', status: 'planned' },
        { version: '0.2.0', outcome: 'b', detail: 'specified', status: 'planned' },
      ],
    },
  });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /0\.2\.0 is marked "specified" but has no release file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an out-of-order roadmap is rejected', () => {
  const { dir, root } = buildWorkspace({
    roadmap: {
      product: 'client-tracker', status: 'active',
      versions: [
        { version: '0.2.0', outcome: 'b', detail: 'outline', status: 'planned' },
        { version: '0.1.0', outcome: 'a', detail: 'specified', status: 'planned' },
      ],
    },
  });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /not in ascending SemVer order/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a duplicated roadmap version is rejected', () => {
  const { dir, root } = buildWorkspace({
    roadmap: {
      product: 'client-tracker', status: 'active',
      versions: [
        { version: '0.1.0', outcome: 'a', detail: 'specified', status: 'planned' },
        { version: '0.1.0', outcome: 'a again', detail: 'outline', status: 'planned' },
      ],
    },
  });
  try {
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /appears more than once/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an active_product with no product directory is rejected', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    const workspace = readYaml(p.workspace);
    workspace.active_product = 'ghost';
    writeYaml(p.workspace, workspace);
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /active_product "ghost" has no product directory/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an active.yaml pointing at a nonexistent release is rejected', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    writeYaml(p.active('client-tracker'), {
      product: 'client-tracker', version: '0.9.0', execution_state: 'DEVELOPING',
      checkpoint: null, blockers: [],
      release_fit: { assessment: 'probable', reasons: [], major_cost_drivers: [], recommended_scope_change: null },
    });
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /active release 0\.9\.0 has no release file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a task citing an acceptance criterion absent from the contract is rejected', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    writeYaml(p.tasks('client-tracker'), {
      product: 'client-tracker', version: '0.1.0',
      tasks: [{
        id: 'US-CLIENT-TRACKER-0.1.0-T01', summary: 'Build it', why_required: 'Needed',
        status: 'todo', depends_on: [],
        acceptance_criteria: ['A freelancer exports a PDF.'],
        files: [], evidence: [],
      }],
    });
    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /cites an acceptance criterion absent from release 0\.1\.0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an edited released record fails validation', () => {
  const { dir, root, p } = buildWorkspace({
    release: {
      status: 'released', immutable: true, mode: 'release-ready',
      released_at: '2026-07-21T09:00:00Z', delivered: 'Invoice recorded and paid.',
      evidence: { tests: ['npm test'], builds: [], reviews: [], deployments: [], health_checks: [] },
      known_limitations: [], supersedes: null, next_recommended_version: '0.2.0',
    },
  });
  try {
    recordRelease(root, 'client-tracker', '0.1.0');
    assert.deepEqual(validateWorkspace(root).errors, []);

    const record = readYaml(p.release('client-tracker', '0.1.0'));
    record.known_limitations = ['Quietly added later.'];
    writeYaml(p.release('client-tracker', '0.1.0'), record);

    const { errors } = validateWorkspace(root);
    assert.match(errors.join('\n'), /has been modified since release/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unparseable YAML is reported against its file rather than crashing', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    writeFileSync(p.roadmap('client-tracker'), 'versions:\n  - a\n b: c\n', 'utf8');
    const { ok, errors } = validateWorkspace(root);
    assert.equal(ok, false);
    assert.match(errors.join('\n'), /roadmap\.yaml: could not parse/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
