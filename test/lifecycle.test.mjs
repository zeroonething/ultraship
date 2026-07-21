import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { recordRelease } from '../lib/lock.mjs';

const CLI = fileURLToPath(new URL('../bin/ultraship.mjs', import.meta.url));

function run(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, json: stdout.trim() ? JSON.parse(stdout) : null };
  } catch (err) {
    return { code: err.status, json: null, stderr: err.stderr ?? '' };
  }
}

// Move the active product's lifecycle through the real CLI; the transition
// table refuses an illegal move, so a bad step fails loudly here.
function move(dir, state) {
  const r = run(['transition', state], dir);
  assert.equal(r.code, 0, r.stderr);
  return r;
}

test('a product walks from an empty directory to an immutable release', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-lifecycle-'));
  try {
    // UNINITIALIZED
    assert.equal(run(['init'], dir).code, 0);
    const p = paths(join(dir, '.ultraship'));
    assert.equal(run(['validate'], dir).code, 0);

    let snap = run(['state'], dir).json;
    assert.equal(snap.workspace.state, 'UNINITIALIZED');
    assert.equal(snap.next_command, '/ultraship:brainstorm');

    // Registering a product creates its lifecycle and makes it active.
    assert.equal(run(['product', 'add', 'client-tracker', 'Client Tracker'], dir).code, 0);

    // BRAINSTORMING -> BRAINSTORMED: a product definition appears.
    move(dir, 'BRAINSTORMING');
    mkdirSync(p.releases('client-tracker'), { recursive: true });
    mkdirSync(join(p.productDir('client-tracker'), 'execution'), { recursive: true });
    writeYaml(p.product('client-tracker'), {
      id: 'client-tracker', name: 'Client Tracker', classification: 'independent-product',
      vision: 'Freelancers stop losing invoices in email threads.',
      users: ['solo freelancer'], problems: ['Invoices scatter across email.'],
      outcomes: ['One place for every unpaid invoice.'],
      requirements: ['Record a client', 'Record an invoice'], constraints: ['Single user'],
      public_contract: 'Web UI only.', deployment_context: 'Self-hosted.',
      success_measures: ['A real invoice is settled.'], non_goals: ['payroll'],
      assumptions: [], mvp_boundary: 'One freelancer records one invoice and marks it paid.',
    });
    const workspace = readYaml(p.workspace);
    workspace.vision = 'Everything a solo freelancer needs to get paid.';
    writeYaml(p.workspace, workspace);
    move(dir, 'BRAINSTORMED');
    assert.equal(run(['validate'], dir).code, 0);

    // PLANNING -> PLANNED: roadmap and a release contract.
    move(dir, 'PLANNING');
    writeYaml(p.roadmap('client-tracker'), {
      product: 'client-tracker', status: 'active',
      versions: [
        { version: '0.1.0', outcome: 'Record one invoice and mark it paid.', detail: 'specified', status: 'planned' },
        { version: '0.2.0', outcome: 'Manage recurring invoices.', detail: 'outline', status: 'planned' },
      ],
    });
    const criterion = 'A freelancer records an invoice and marks it paid.';
    writeYaml(p.release('client-tracker', '0.1.0'), {
      product: 'client-tracker', version: '0.1.0', status: 'planned', release_type: 'minor',
      outcome: {
        user_can: 'Record one invoice and mark it paid.',
        business_value: 'Proves the tracking loop is worth using.',
        evidence_of_value: 'A real unpaid invoice is settled.',
      },
      scope: { included: ['Create invoice', 'Mark paid'], excluded: ['Recurring invoices'], fallback_scope: ['Create invoice'] },
      acceptance: { functional: [criterion], non_functional: [], operational: [] },
      delivery: {
        target_mode: 'release-ready', environment: 'local', deployment_method: 'manual start',
        migrations: [], observability: [], rollback: 'Restore the database file.',
      },
      dependencies: { products: [], services: [], human_approvals: [] },
      resource_profile: {
        complexity: 'small', uncertainty: 'low',
        likely_cost_drivers: [], preferred_tools: [], constraints: [],
      },
      risks: [], open_questions: [],
    });
    move(dir, 'PLANNED');
    assert.equal(run(['validate'], dir).code, 0);

    // DEVELOPING: execution state appears.
    move(dir, 'DEVELOPING');
    writeYaml(p.active('client-tracker'), {
      product: 'client-tracker', version: '0.1.0', execution_state: 'DEVELOPING',
      checkpoint: null, blockers: [],
      release_fit: {
        assessment: 'probable',
        reasons: ['Two workflows against one new schema.'],
        major_cost_drivers: ['First-time schema design'],
        recommended_scope_change: null,
      },
    });
    writeYaml(p.tasks('client-tracker'), {
      product: 'client-tracker', version: '0.1.0',
      tasks: [{
        id: 'US-CLIENT-TRACKER-0.1.0-T01', summary: 'Create the invoice table.',
        why_required: 'Every acceptance criterion reads or writes an invoice.',
        status: 'done', depends_on: [], acceptance_criteria: [criterion],
        files: ['db/0001-invoices.sql'], evidence: ['npm test — 12 passing'],
      }],
    });
    assert.equal(run(['validate'], dir).code, 0);

    snap = run(['state'], dir).json;
    assert.equal(snap.active.version, '0.1.0');
    assert.equal(snap.active.release_fit, 'probable');
    assert.deepEqual(snap.released_versions, []);

    // COMPLETING, first attempt: gates fail, the record stays mutable.
    move(dir, 'COMPLETING');
    const partial = readYaml(p.release('client-tracker', '0.1.0'));
    partial.status = 'released';
    partial.immutable = true;
    writeYaml(p.release('client-tracker', '0.1.0'), partial);

    const failed = run(['validate'], dir);
    assert.equal(failed.code, 1, 'a release with no evidence must not validate');

    // Back to DEVELOPING, then complete properly.
    const reverted = readYaml(p.release('client-tracker', '0.1.0'));
    reverted.status = 'planned';
    delete reverted.immutable;
    writeYaml(p.release('client-tracker', '0.1.0'), reverted);
    move(dir, 'DEVELOPING');
    assert.equal(run(['validate'], dir).code, 0);

    move(dir, 'COMPLETING');
    const record = readYaml(p.release('client-tracker', '0.1.0'));
    Object.assign(record, {
      status: 'released',
      released_at: '2026-07-21T09:00:00Z',
      mode: 'release-ready',
      delivered: 'A freelancer records an invoice and marks it paid.',
      evidence: {
        tests: ['npm test — 12 passing'], builds: ['npm run build — exit 0'],
        reviews: [], deployments: [], health_checks: [],
      },
      known_limitations: ['Single user only.'],
      supersedes: null,
      next_recommended_version: '0.2.0',
      immutable: true,
    });
    writeYaml(p.release('client-tracker', '0.1.0'), record);
    recordRelease(join(dir, '.ultraship'), 'client-tracker', '0.1.0');
    move(dir, 'RELEASED');

    assert.equal(run(['validate'], dir).code, 0);
    snap = run(['state'], dir).json;
    assert.equal(snap.workspace.state, 'RELEASED');
    assert.deepEqual(snap.released_versions, ['0.1.0']);
    assert.deepEqual(snap.allowed_transitions, ['PLANNING', 'DEVELOPING']);

    // The released record is now immutable in practice, not just in principle.
    const tampered = readYaml(p.release('client-tracker', '0.1.0'));
    tampered.known_limitations = [];
    writeYaml(p.release('client-tracker', '0.1.0'), tampered);
    const tamperCheck = run(['validate'], dir);
    assert.equal(tamperCheck.code, 1);

    // Restore and confirm views render the finished release.
    writeYaml(p.release('client-tracker', '0.1.0'), record);
    assert.equal(run(['validate'], dir).code, 0);
    assert.equal(run(['views'], dir).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
