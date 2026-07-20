import { existsSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
import { readYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { compare, isValid } from './semver.mjs';

const INTERRUPTIBLE = ['BLOCKED', 'PAUSED'];

// A released version never returns to a mutable state. It moves forward into
// planning or development of the NEXT version, never back into its own cycle.
export const TRANSITIONS = Object.freeze({
  UNINITIALIZED: ['BRAINSTORMING'],
  BRAINSTORMING: ['BRAINSTORMED', ...INTERRUPTIBLE],
  BRAINSTORMED: ['PLANNING'],
  PLANNING: ['PLANNED', ...INTERRUPTIBLE],
  PLANNED: ['DEVELOPING'],
  DEVELOPING: ['ITERATING', 'COMPLETING', ...INTERRUPTIBLE],
  ITERATING: ['DEVELOPING', ...INTERRUPTIBLE],
  COMPLETING: ['RELEASED', 'DEVELOPING', 'ITERATING', ...INTERRUPTIBLE],
  RELEASED: ['PLANNING', 'DEVELOPING'],
  BLOCKED: ['BRAINSTORMING', 'PLANNING', 'DEVELOPING', 'ITERATING', 'COMPLETING', 'PAUSED'],
  PAUSED: ['BRAINSTORMING', 'PLANNING', 'DEVELOPING', 'ITERATING', 'COMPLETING', 'BLOCKED'],
});

const NEXT_COMMAND = Object.freeze({
  UNINITIALIZED: '/ultraship:brainstorm',
  BRAINSTORMING: '/ultraship:brainstorm',
  BRAINSTORMED: '/ultraship:plan',
  PLANNING: '/ultraship:plan',
  PLANNED: '/ultraship:develop',
  DEVELOPING: '/ultraship:develop',
  ITERATING: '/ultraship:iterate',
  COMPLETING: '/ultraship:complete',
  RELEASED: '/ultraship:plan',
  BLOCKED: '/ultraship:iterate',
  PAUSED: '/ultraship:develop',
});

export function allowedFrom(state) {
  return TRANSITIONS[state] ?? [];
}

export function canTransition(from, to) {
  return allowedFrom(from).includes(to);
}

export function nextCommand(state) {
  return NEXT_COMMAND[state] ?? '/ultraship:brainstorm';
}

function listProducts(p) {
  if (!existsSync(p.products)) return [];
  return readdirSync(p.products, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function releasedVersions(p, product) {
  const dir = p.releases(product);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => basename(f, '.yaml'))
    .filter(isValid)
    .filter((version) => {
      try {
        return readYaml(p.release(product, version)).status === 'released';
      } catch {
        return false;
      }
    })
    .sort(compare);
}

function activeFor(p, product) {
  const activePath = p.active(product);
  if (!existsSync(activePath)) return null;
  const active = readYaml(activePath);
  let releaseStatus = null;
  const releasePath = p.release(product, active.version);
  if (existsSync(releasePath)) releaseStatus = readYaml(releasePath).status ?? null;
  return {
    product: active.product,
    version: active.version,
    execution_state: active.execution_state,
    release_status: releaseStatus,
    release_fit: active.release_fit?.assessment ?? null,
    checkpoint: active.checkpoint ?? null,
  };
}

/** One cheap call that tells a skill everything it needs before acting. */
export function snapshot(root) {
  const p = paths(root);
  const workspace = readYaml(p.workspace);
  const product = workspace.active_product;

  return {
    workspace: { id: workspace.id, name: workspace.name, state: workspace.state },
    active: product ? activeFor(p, product) : null,
    allowed_transitions: allowedFrom(workspace.state),
    next_command: nextCommand(workspace.state),
    released_versions: product ? releasedVersions(p, product) : [],
    blockers: workspace.blockers ?? [],
    products: listProducts(p),
  };
}
