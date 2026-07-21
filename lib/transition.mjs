// The only sanctioned way to change a product's lifecycle state. Skills call
// this rather than editing lifecycle.yaml, because a single snapshot of that
// file carries no record of the previous state — validate cannot catch an
// illegal move. State is per product, so a transition names the product it
// moves (defaulting to the workspace's active product).
import { existsSync } from 'node:fs';
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { TRANSITIONS, allowedFrom, canTransition, nextCommand } from './state.mjs';

const INTERRUPTIBLE = new Set(['BLOCKED', 'PAUSED']);

export function transition(root, to, product) {
  if (!(to in TRANSITIONS)) {
    throw new Error(
      `"${to}" is not an UltraShip state. Valid states: ${Object.keys(TRANSITIONS).join(', ')}`,
    );
  }

  const p = paths(root);
  const id = product ?? readYaml(p.workspace).active_product;
  if (!id) {
    throw new Error(
      'No active product to transition. Run "ultraship product add <id> <name>" first.',
    );
  }

  const path = p.lifecycle(id);
  if (!existsSync(path)) {
    throw new Error(
      `Product "${id}" has no lifecycle.yaml. If this is a 0.1.0 workspace, run "ultraship migrate".`,
    );
  }

  const lifecycle = readYaml(path);
  const from = lifecycle.state;

  if (!canTransition(from, to)) {
    throw new Error(
      `Cannot move ${id} from ${from} to ${to}. Legal next states: ${allowedFrom(from).join(', ') || 'none'}`,
    );
  }

  // Interrupting active work records where to come back to; resuming clears it.
  lifecycle.resumes_to = INTERRUPTIBLE.has(to) && !INTERRUPTIBLE.has(from) ? from : null;
  lifecycle.state = to;
  writeYaml(path, lifecycle);

  return { product: id, from, to, next_command: nextCommand(to) };
}
