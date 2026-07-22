import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { writeYaml } from './yaml.mjs';
import { DIR, paths } from './paths.mjs';

// The installed framework version, so a fresh workspace records what actually
// created it rather than a literal that goes stale on the next release.
export const FRAMEWORK_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

// The canonical-state schema version — the workspace-level contract version.
// Frozen at 1 for UltraShip 1.0: every change through 0.5 was additive, so the
// schema shape never broke. A future breaking shape change bumps this and adds a
// migration step. migrate defaults an absent value to this baseline.
export const SCHEMA_VERSION = 1;

const EMPTY_DIRS = ['products', 'decisions', 'questions', 'iterations', 'checkpoints', 'views'];

// Deploy/publish hook output lands under evidence/; the immutable release record
// already carries the command and exit, so the fuller logs are local audit and
// must not be tracked, or the tree goes dirty after every release.
const EVIDENCE_IGNORE = '.ultraship/products/*/evidence/';

/**
 * Ensure the project-root .gitignore ignores the evidence output. Appends to an
 * existing file without clobbering or duplicating; creates a sensible one if
 * absent. Returns the path if the file was created, else null.
 */
function ensureGitignore(base) {
  const path = join(base, '.gitignore');
  if (existsSync(path)) {
    const body = readFileSync(path, 'utf8');
    if (body.split('\n').some((line) => line.trim() === EVIDENCE_IGNORE)) return null;
    const sep = body.endsWith('\n') || body === '' ? '' : '\n';
    writeFileSync(path, `${body}${sep}\n# UltraShip: transient deploy/publish hook output\n${EVIDENCE_IGNORE}\n`);
    return null;
  }
  writeFileSync(path, `node_modules/\n.DS_Store\n\n# UltraShip: transient deploy/publish hook output\n${EVIDENCE_IGNORE}\n`);
  return path;
}

export function slugify(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `workspace-${slug || 'unnamed'}`;
}

export function init(cwd = process.cwd()) {
  const base = resolve(cwd);
  const root = join(base, DIR);
  if (existsSync(root)) {
    throw new Error(`${root} already initialized. Use /ultraship:iterate to change it.`);
  }

  const created = [];
  mkdirSync(root, { recursive: true });
  created.push(root);

  for (const dir of EMPTY_DIRS) {
    const full = join(root, dir);
    mkdirSync(full, { recursive: true });
    // Git does not track empty directories; the skills expect these to exist.
    writeFileSync(join(full, '.gitkeep'), '', 'utf8');
    created.push(full);
  }

  const p = paths(root);
  const name = basename(base);

  writeYaml(p.config, {
    schema_version: SCHEMA_VERSION,
    framework_version: FRAMEWORK_VERSION,
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
      // Unknown stays unknown. There is no provider telemetry in 0.1.0.
      telemetry: { source: 'unknown', confidence: 'low' },
    },
  });
  created.push(p.config);

  // Lifecycle state is per product; a fresh workspace has no products and so no
  // state of its own. It reads as UNINITIALIZED until the first product is added.
  writeYaml(p.workspace, {
    id: slugify(name),
    name,
    vision: '',
    constraints: [],
    active_product: null,
  });
  created.push(p.workspace);

  const gitignore = ensureGitignore(base);
  if (gitignore) created.push(gitignore);

  return { root, created };
}
