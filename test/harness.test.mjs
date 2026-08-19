import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
