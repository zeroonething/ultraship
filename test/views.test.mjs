import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../lib/init.mjs';
import { paths } from '../lib/paths.mjs';
import { readYaml, writeYaml } from '../lib/yaml.mjs';
import { NOTICE, renderViews } from '../lib/views.mjs';

function buildWorkspace() {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-views-'));
  const { root } = init(dir);
  const p = paths(root);

  const workspace = readYaml(p.workspace);
  workspace.state = 'DEVELOPING';
  workspace.name = 'Freelance Tools';
  workspace.vision = 'Everything a solo freelancer needs to get paid.';
  workspace.active_product = 'client-tracker';
  writeYaml(p.workspace, workspace);

  mkdirSync(p.releases('client-tracker'), { recursive: true });
  writeYaml(p.product('client-tracker'), {
    id: 'client-tracker', name: 'Client Tracker', classification: 'independent-product',
    vision: 'Freelancers stop losing invoices.', users: ['freelancer'],
    problems: ['Invoices scatter across email.'], outcomes: ['One place for unpaid invoices.'],
    requirements: [], constraints: [], public_contract: 'Web UI only.',
    deployment_context: 'Self-hosted.', success_measures: [], non_goals: ['payroll'],
    assumptions: [], mvp_boundary: 'One invoice recorded and paid.',
  });
  writeYaml(p.roadmap('client-tracker'), {
    product: 'client-tracker', status: 'active',
    versions: [
      { version: '0.1.0', outcome: 'Record one invoice and mark it paid.', detail: 'specified', status: 'released' },
      { version: '0.2.0', outcome: 'Manage recurring invoices.', detail: 'outline', status: 'active' },
    ],
  });
  writeYaml(p.release('client-tracker', '0.1.0'), {
    product: 'client-tracker', version: '0.1.0', status: 'released',
    mode: 'release-ready', released_at: '2026-07-21T09:00:00Z',
    delivered: 'A freelancer records an invoice and marks it paid.',
    known_limitations: ['Single user only.'],
  });
  writeYaml(p.release('client-tracker', '0.2.0'), {
    product: 'client-tracker', version: '0.2.0', status: 'active',
    outcome: { user_can: 'Manage recurring invoices.' },
    delivery: { target_mode: 'release-ready' },
  });

  return { dir, root, p };
}

const read = (p, name) => readFileSync(join(p.views, name), 'utf8');

test('renderViews writes all four views', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    const written = renderViews(root);
    assert.equal(written.length, 4);
    for (const name of ['workspace-brief.md', 'master-roadmap.md', 'active-releases.md', 'release-history.md']) {
      assert.ok(read(p, name).length > 0, `${name} should have content`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every view opens with the do-not-edit notice', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    renderViews(root);
    for (const name of ['workspace-brief.md', 'master-roadmap.md', 'active-releases.md', 'release-history.md']) {
      assert.ok(read(p, name).startsWith(NOTICE), `${name} must open with the notice`);
    }
    assert.match(NOTICE, /Do not edit directly/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every view names its canonical sources', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    renderViews(root);
    assert.match(read(p, 'workspace-brief.md'), /workspace\.yaml/);
    assert.match(read(p, 'master-roadmap.md'), /roadmap\.yaml/);
    assert.match(read(p, 'active-releases.md'), /active\.yaml/);
    assert.match(read(p, 'release-history.md'), /releases\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the roadmap view shows outcomes and detail levels', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    renderViews(root);
    const roadmap = read(p, 'master-roadmap.md');
    assert.match(roadmap, /0\.1\.0/);
    assert.match(roadmap, /Record one invoice and mark it paid\./);
    assert.match(roadmap, /outline/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release history lists only released versions, newest first', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    renderViews(root);
    const history = read(p, 'release-history.md');
    assert.match(history, /0\.1\.0/);
    assert.doesNotMatch(history, /^.*\| 0\.2\.0 \|/m);
    assert.match(history, /Single user only\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('views regenerate identically from unchanged state', () => {
  const { dir, root, p } = buildWorkspace();
  try {
    renderViews(root);
    const first = read(p, 'master-roadmap.md');
    renderViews(root);
    assert.equal(read(p, 'master-roadmap.md'), first);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a workspace with no products still renders without throwing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ultraship-views-empty-'));
  try {
    const { root } = init(dir);
    const written = renderViews(root);
    assert.equal(written.length, 4);
    assert.match(readFileSync(join(paths(root).views, 'master-roadmap.md'), 'utf8'), /No products/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
