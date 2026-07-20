// Views are generated readable summaries. They repeat canonical facts for
// human convenience and must never become a source of truth themselves.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { compare, isValid } from './semver.mjs';
import { snapshot } from './state.mjs';

export const NOTICE = [
  '<!--',
  'Generated from canonical UltraShip state. Do not edit directly.',
  'Run `ultraship views` to regenerate.',
  '-->',
  '',
].join('\n');

function sources(...files) {
  return `\n_Canonical sources: ${files.join(', ')}_\n`;
}

function listProducts(p) {
  if (!existsSync(p.products)) return [];
  return readdirSync(p.products, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readIfPresent(path) {
  if (!existsSync(path)) return null;
  try {
    return readYaml(path);
  } catch {
    return null;
  }
}

function releasesOf(p, product) {
  const dir = p.releases(product);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => basename(f, '.yaml'))
    .filter(isValid)
    .sort(compare)
    .map((version) => ({ version, doc: readIfPresent(p.release(product, version)) }))
    .filter((entry) => entry.doc !== null);
}

function workspaceBrief(root, p) {
  const snap = snapshot(root);
  const workspace = readYaml(p.workspace);
  const lines = [
    `# ${workspace.name}`,
    '',
    `**State:** ${snap.workspace.state}`,
    `**Next command:** \`${snap.next_command}\``,
    '',
    '## Vision',
    '',
    workspace.vision || '_Not yet defined._',
    '',
    '## Products',
    '',
  ];

  const products = listProducts(p);
  if (!products.length) {
    lines.push('_No products defined yet. Run `/ultraship:brainstorm`._');
  } else {
    lines.push('| Product | Classification | MVP boundary |', '| --- | --- | --- |');
    for (const id of products) {
      const doc = readIfPresent(p.product(id));
      lines.push(`| ${id} | ${doc?.classification ?? '—'} | ${doc?.mvp_boundary ?? '—'} |`);
    }
  }

  if (snap.blockers.length) {
    lines.push('', '## Blockers', '');
    for (const blocker of snap.blockers) lines.push(`- **${blocker.id}** — ${blocker.summary} (needs: ${blocker.needs})`);
  }

  lines.push(sources('workspace.yaml', 'products/<id>/product.yaml'));
  return lines.join('\n');
}

function masterRoadmap(root, p) {
  const lines = ['# Master roadmap', ''];
  const products = listProducts(p);

  if (!products.length) {
    lines.push('_No products defined yet._');
  } else {
    for (const id of products) {
      const roadmap = readIfPresent(p.roadmap(id));
      lines.push(`## ${id}`, '');
      if (!roadmap?.versions?.length) {
        lines.push('_No roadmap yet. Run `/ultraship:plan`._', '');
        continue;
      }
      lines.push('| Version | Outcome | Detail | Status |', '| --- | --- | --- | --- |');
      for (const entry of roadmap.versions) {
        lines.push(`| ${entry.version} | ${entry.outcome} | ${entry.detail} | ${entry.status} |`);
      }
      lines.push('');
    }
  }

  lines.push(sources('products/<id>/roadmap.yaml'));
  return lines.join('\n');
}

function activeReleases(root, p) {
  const lines = ['# Active releases', ''];
  let found = false;

  for (const id of listProducts(p)) {
    const active = readIfPresent(p.active(id));
    if (!active) continue;
    found = true;
    const release = readIfPresent(p.release(id, active.version));
    lines.push(
      `## ${id} ${active.version}`,
      '',
      `**Execution state:** ${active.execution_state}`,
      `**Release fit:** ${active.release_fit?.assessment ?? 'not assessed'}`,
      `**Target mode:** ${release?.delivery?.target_mode ?? '—'}`,
      `**Outcome:** ${release?.outcome?.user_can ?? '—'}`,
      '',
    );
    if (active.blockers?.length) {
      lines.push('**Blockers:**', '');
      for (const blocker of active.blockers) lines.push(`- ${blocker}`);
      lines.push('');
    }
  }

  if (!found) lines.push('_No release is currently active._', '');
  lines.push(sources('products/<id>/execution/active.yaml', 'products/<id>/releases/<version>.yaml'));
  return lines.join('\n');
}

function releaseHistory(root, p) {
  const lines = ['# Release history', ''];
  let found = false;

  for (const id of listProducts(p)) {
    const released = releasesOf(p, id)
      .filter((entry) => entry.doc.status === 'released')
      .reverse();
    if (!released.length) continue;
    found = true;

    lines.push(`## ${id}`, '', '| Version | Released | Mode | Delivered |', '| --- | --- | --- | --- |');
    for (const { version, doc } of released) {
      lines.push(`| ${version} | ${doc.released_at ?? '—'} | ${doc.mode ?? '—'} | ${doc.delivered ?? '—'} |`);
    }
    lines.push('');

    for (const { version, doc } of released) {
      if (!doc.known_limitations?.length) continue;
      lines.push(`### ${version} known limitations`, '');
      for (const limitation of doc.known_limitations) lines.push(`- ${limitation}`);
      lines.push('');
    }
  }

  if (!found) lines.push('_No versions have been released yet._', '');
  lines.push(sources('products/<id>/releases/<version>.yaml'));
  return lines.join('\n');
}

export function renderViews(root) {
  const p = paths(root);
  mkdirSync(p.views, { recursive: true });

  const files = {
    'workspace-brief.md': workspaceBrief(root, p),
    'master-roadmap.md': masterRoadmap(root, p),
    'active-releases.md': activeReleases(root, p),
    'release-history.md': releaseHistory(root, p),
  };

  const written = [];
  for (const [name, body] of Object.entries(files)) {
    const path = join(p.views, name);
    writeFileSync(path, `${NOTICE}${body}`, 'utf8');
    written.push(path);
  }
  return written;
}
