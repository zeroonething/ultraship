// Which tasks may run at the same time, decided here rather than by an agent.
//
// A wave is the set of tasks that are provably independent right now: every
// dependency already `done`, and declared `files` disjoint from every task
// already admitted and every task in progress. The rule is a pure function over
// tasks.yaml, so the same task set always yields the same wave — a skill that
// dispatches subagents reads this, it does not reason its way to it.
//
// This module decides nothing about *how* work is dispatched and dispatches
// nothing itself. See shared/subagent-protocol.md.
import { existsSync } from 'node:fs';
import { readYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

/** Tasks whose depends_on chain never terminates, mapped to the reason naming the cycle. */
function findCycles(tasks, byId) {
  const VISITING = 0;
  const DONE = 1;
  const state = new Map();
  const inCycle = new Map();
  const stack = [];

  function visit(id) {
    if (!byId.has(id) || state.get(id) === DONE) return;
    if (state.get(id) === VISITING) {
      const path = [...stack.slice(stack.indexOf(id)), id];
      const reason = `in a dependency cycle: ${path.join(' -> ')}`;
      for (const member of path) if (!inCycle.has(member)) inCycle.set(member, reason);
      return;
    }
    state.set(id, VISITING);
    stack.push(id);
    for (const dep of byId.get(id).depends_on ?? []) visit(dep);
    stack.pop();
    state.set(id, DONE);
  }

  for (const task of tasks) visit(task.id);
  return inCycle;
}

/**
 * The set of tasks that may be dispatched concurrently right now.
 *
 * Returns `{ product, version, wave, excluded, remaining }`, where every task
 * not in `wave` appears in `excluded` with the reason it was held. Throws when
 * there is no active product, no task set, or the requested version is not the
 * one the task set holds.
 */
export function wave(root, product, version) {
  const p = paths(root);
  const id = product ?? readYaml(p.workspace).active_product;
  if (!id) {
    throw new Error('No active product. Run "ultraship product add <id>" first.');
  }

  const tasksPath = p.tasks(id);
  if (!existsSync(tasksPath)) {
    throw new Error(
      `Product "${id}" has no task set. Run /ultraship:develop to generate one before computing a wave.`,
    );
  }

  const doc = readYaml(tasksPath);
  if (version && doc.version !== version) {
    throw new Error(
      `Product "${id}" has tasks for ${doc.version}, not ${version}. A wave is scoped to one release.`,
    );
  }

  // Ascending id, so an unchanged task set always yields the same wave in the
  // same order however the file happens to be ordered.
  const tasks = [...(doc.tasks ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const cycles = findCycles(tasks, byId);

  // file -> the task holding it. Work already in progress claims first.
  const claimed = new Map();
  for (const task of tasks) {
    if (task.status !== 'in-progress') continue;
    for (const file of task.files ?? []) if (!claimed.has(file)) claimed.set(file, task.id);
  }

  const admitted = [];
  const excluded = [];
  // A task that declares no files carries no proof of independence, so it runs
  // alone rather than being treated as conflicting with nothing.
  let exclusive = null;

  for (const task of tasks) {
    if (task.status !== 'todo') {
      excluded.push({ id: task.id, reason: `status is ${task.status}` });
      continue;
    }
    if (cycles.has(task.id)) {
      excluded.push({ id: task.id, reason: cycles.get(task.id) });
      continue;
    }

    const unmet = (task.depends_on ?? []).filter((dep) => byId.get(dep)?.status !== 'done');
    if (unmet.length) {
      const named = unmet.map((dep) => (byId.has(dep) ? dep : `${dep} (no such task)`));
      excluded.push({ id: task.id, reason: `waiting on ${named.join(', ')}` });
      continue;
    }

    if (exclusive) {
      excluded.push({
        id: task.id,
        reason: `held behind ${exclusive}, which declares no files and must run alone`,
      });
      continue;
    }

    const files = task.files ?? [];
    if (files.length === 0) {
      if (admitted.length) {
        excluded.push({ id: task.id, reason: 'declares no files, so it must run alone' });
        continue;
      }
      exclusive = task.id;
      admitted.push(task.id);
      continue;
    }

    const clash = files.find((file) => claimed.has(file));
    if (clash) {
      excluded.push({ id: task.id, reason: `shares ${clash} with ${claimed.get(clash)}` });
      continue;
    }

    for (const file of files) claimed.set(file, task.id);
    admitted.push(task.id);
  }

  return {
    product: id,
    version: doc.version,
    wave: admitted,
    excluded,
    remaining: tasks.filter((task) => task.status !== 'done').length,
  };
}
