// Runs a project's own deploy or publish command for a release's target mode and
// captures the result as evidence. The framework opens no network connection of
// its own — it spawns the command the project declared under delivery_hooks, and
// that command's behaviour (including any network access) is the project's. A
// non-zero exit means the deployed mode was not reached, so completion refuses it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readYaml } from './yaml.mjs';
import { paths } from './paths.mjs';

/** The declared { deploy, smoke } commands for a target mode, or null if none. */
export function resolveHooks(config, mode) {
  const hooks = config?.delivery_hooks?.[mode];
  if (!hooks?.deploy) return null;
  return { deploy: hooks.deploy, smoke: hooks.smoke ?? null };
}

/** Run one command through the shell, capturing stdout, stderr, and exit code. */
function runCommand(command, env) {
  const res = spawnSync(command, { shell: true, encoding: 'utf8', env: { ...process.env, ...env } });
  return {
    command,
    exit: res.status == null ? 1 : res.status, // null on signal or spawn error
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error ? res.error.message : null,
  };
}

function writeLog(dir, name, run) {
  const body = `$ ${run.command}\n--- exit ${run.exit} ---\n--- stdout ---\n${run.stdout}\n--- stderr ---\n${run.stderr}\n${run.error ? `--- error ---\n${run.error}\n` : ''}`;
  writeFileSync(join(dir, name), body, 'utf8');
}

/**
 * Deploy or publish a release by running its declared hook for the target mode.
 * Returns a structured result; `ok` is false when the command failed, so the
 * caller (complete / the CLI) refuses the deployed mode.
 */
export function deploy(root, { product, version } = {}) {
  const p = paths(root);
  const config = existsSync(p.config) ? readYaml(p.config) : {};
  const id = product ?? readYaml(p.workspace).active_product;
  if (!id) throw new Error('No active product to deploy. Run "ultraship product add <id>" first.');

  let ver = version;
  if (!ver && existsSync(p.active(id))) ver = readYaml(p.active(id)).version;
  if (!ver) throw new Error(`No version to deploy for "${id}". Pass a version or start a release.`);

  const releasePath = p.release(id, ver);
  if (!existsSync(releasePath)) throw new Error(`No release file at ${releasePath}.`);
  const mode = readYaml(releasePath)?.delivery?.target_mode;

  const hooks = resolveHooks(config, mode);
  if (!hooks) {
    return {
      product: id, version: ver, mode, ran: false, ok: true,
      reason: `No delivery_hooks command declared for mode "${mode}"; deploy manually and record the evidence by hand.`,
    };
  }

  const env = { VERSION: ver, PRODUCT: id, MODE: mode };
  const evidenceDir = p.evidence(id, ver);
  mkdirSync(evidenceDir, { recursive: true });

  const deployRun = runCommand(hooks.deploy, env);
  writeLog(evidenceDir, `deploy-${mode}.log`, deployRun);

  let smokeRun = null;
  if (deployRun.exit === 0 && hooks.smoke) {
    smokeRun = runCommand(hooks.smoke, env);
    writeLog(evidenceDir, `smoke-${mode}.log`, smokeRun);
  }

  const ok = deployRun.exit === 0 && (!smokeRun || smokeRun.exit === 0);
  return {
    product: id, version: ver, mode, ran: true, ok,
    deployment_evidence: `${hooks.deploy} — exit ${deployRun.exit}`,
    health_check_evidence: smokeRun ? `${hooks.smoke} — exit ${smokeRun.exit}` : null,
    evidence_dir: evidenceDir,
    deploy: { command: hooks.deploy, exit: deployRun.exit, error: deployRun.error },
    smoke: smokeRun ? { command: hooks.smoke, exit: smokeRun.exit, error: smokeRun.error } : null,
  };
}
