// The only sanctioned way to change workspace state. Skills call this rather
// than editing workspace.yaml, because a single snapshot of that file carries
// no record of the previous state — validate cannot catch an illegal move.
import { readYaml, writeYaml } from './yaml.mjs';
import { paths } from './paths.mjs';
import { TRANSITIONS, allowedFrom, canTransition, nextCommand } from './state.mjs';

const INTERRUPTIBLE = new Set(['BLOCKED', 'PAUSED']);

export function transition(root, to) {
  if (!(to in TRANSITIONS)) {
    throw new Error(
      `"${to}" is not an UltraShip state. Valid states: ${Object.keys(TRANSITIONS).join(', ')}`,
    );
  }

  const p = paths(root);
  const workspace = readYaml(p.workspace);
  const from = workspace.state;

  if (!canTransition(from, to)) {
    throw new Error(
      `Cannot move from ${from} to ${to}. Legal next states: ${allowedFrom(from).join(', ') || 'none'}`,
    );
  }

  // Interrupting active work records where to come back to; resuming clears it.
  workspace.resumes_to = INTERRUPTIBLE.has(to) && !INTERRUPTIBLE.has(from) ? from : null;
  workspace.state = to;
  writeYaml(p.workspace, workspace);

  return { from, to, next_command: nextCommand(to) };
}
