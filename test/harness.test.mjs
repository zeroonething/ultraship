import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(ROOT, 'hooks', 'session-start');

// The hook picks one field per harness and emits only that one. Claude Code
// reads both `additional_context` and `hookSpecificOutput` without
// deduplicating, so emitting two fields injects the skill twice; emitting the
// wrong one injects it never, and the failure is silent in both directions.
// Every branch is exercised with the environment that selects it.
const run = (env) =>
  JSON.parse(
    execFileSync(HOOK, {
      encoding: 'utf8',
      // A bare env: the harness variables are the only signal the hook reads,
      // so an inherited CLAUDE_PLUGIN_ROOT would decide the branch for us.
      env: { PATH: process.env.PATH, ...env },
    }),
  );

test('Cursor gets additional_context and nothing else', () => {
  const out = run({ CURSOR_PLUGIN_ROOT: ROOT, CLAUDE_PLUGIN_ROOT: ROOT });
  assert.equal(typeof out.additional_context, 'string');
  assert.equal(out.hookSpecificOutput, undefined);
  assert.equal(out.additionalContext, undefined);
});

test('Claude Code gets the nested hookSpecificOutput and nothing else', () => {
  const out = run({ CLAUDE_PLUGIN_ROOT: ROOT });
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(typeof out.hookSpecificOutput.additionalContext, 'string');
  assert.equal(out.additional_context, undefined);
  assert.equal(out.additionalContext, undefined);
});

test('Copilot CLI gets top-level additionalContext even with CLAUDE_PLUGIN_ROOT set', () => {
  const out = run({ CLAUDE_PLUGIN_ROOT: ROOT, COPILOT_CLI: '1' });
  assert.equal(typeof out.additionalContext, 'string');
  assert.equal(out.hookSpecificOutput, undefined);
  assert.equal(out.additional_context, undefined);
});

test('an unknown harness gets the SDK-standard additionalContext', () => {
  const out = run({});
  assert.equal(typeof out.additionalContext, 'string');
  assert.equal(out.hookSpecificOutput, undefined);
  assert.equal(out.additional_context, undefined);
});

test('every branch injects the using-ultraship skill itself', () => {
  const field = (out) =>
    out.additional_context ?? out.additionalContext ?? out.hookSpecificOutput.additionalContext;

  for (const env of [
    { CURSOR_PLUGIN_ROOT: ROOT },
    { CLAUDE_PLUGIN_ROOT: ROOT },
    { CLAUDE_PLUGIN_ROOT: ROOT, COPILOT_CLI: '1' },
    {},
  ]) {
    const context = field(run(env));
    assert.match(context, /You have UltraShip\./);
    assert.match(context, /name: using-ultraship/);
    assert.doesNotMatch(context, /Error reading using-ultraship skill/);
  }
});

// The Codex mapping is the only thing standing between a Codex session and the
// first instruction of every lifecycle skill. Its own coverage list is the
// contract: an action listed there with no row is an action a skill will name
// and Codex will have no answer for.
const MAPPING = join(ROOT, 'skills', 'using-ultraship', 'references', 'codex-tools.md');

function mapping() {
  const text = readFileSync(MAPPING, 'utf8');
  const list = /## Coverage\n([\s\S]*?)\n## /.exec(text);
  assert.ok(list, 'codex-tools.md must carry a Coverage section');
  const actions = [...list[1].matchAll(/^- (.+)$/gm)].map((m) => m[1].trim());
  const rows = [...text.matchAll(/^\| ([^|]+?) \| .+ \|$/gm)]
    .map((m) => m[1].trim())
    .filter((cell) => cell !== 'Action' && !/^-+$/.test(cell));
  return { text, actions, rows };
}

test('the Codex mapping answers every action in its own coverage list', () => {
  const { actions, rows } = mapping();
  assert.ok(actions.length >= 8, `the coverage list is suspiciously short: ${actions.length}`);
  for (const action of actions) {
    assert.ok(rows.includes(action), `codex-tools.md lists "${action}" with no mapping row`);
  }
});

// The list itself is derived from what the skills actually name, so trimming an
// action out of the coverage list cannot hide a gap.
test('the coverage list names every action the skills provably use', () => {
  const skills = join(ROOT, 'skills');
  const bodies = readdirSync(skills)
    .map((name) => join(skills, name, 'SKILL.md'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const { actions } = mapping();

  const required = [
    [/\bultraship [a-z-]+/, 'run the ultraship CLI'],
    [/worktree/i, 'create an isolated workspace'],
    [/subagent/i, 'dispatch a subagent'],
    [/\btodo\b/i, 'track a todo'],
  ];
  for (const [signal, action] of required) {
    if (!signal.test(bodies)) continue;
    assert.ok(
      actions.includes(action),
      `the skills name ${signal} but codex-tools.md does not cover "${action}"`,
    );
  }
});

// The CLI is what no other skills framework has to map, and it is the action the
// skills name most. A mapping that does not say how to run it is the two-row file
// this one replaced.
test('the Codex mapping says how to run the CLI and where it lives', () => {
  const { text } = mapping();
  assert.match(text, /bin\/ultraship\.mjs/);
  assert.match(text, /~\/\.codex\/plugins\/cache/);
});
