#!/usr/bin/env node
// Thin dispatcher. Every command returns a process exit code and prints its
// machine-readable result to stdout; diagnostics go to stderr.
import { readFileSync } from 'node:fs';
import { next as semverNext } from '../lib/semver.mjs';
import { init } from '../lib/init.mjs';
import { requireRoot } from '../lib/paths.mjs';
import { snapshot } from '../lib/state.mjs';
import { transition } from '../lib/transition.mjs';
import { addProduct, useProduct } from '../lib/product.mjs';
import { migrate } from '../lib/migrate.mjs';
import { setConstraints, showConstraints } from '../lib/constraints.mjs';
import { deploy } from '../lib/deploy.mjs';
import { validateWorkspace } from '../lib/validate.mjs';
import { renderViews } from '../lib/views.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function out(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message) {
  process.stderr.write(`ultraship: ${message}\n`);
  return 1;
}

const COMMANDS = {
  init() {
    const { root, created } = init(process.cwd());
    out({ root, created: created.length });
    return 0;
  },

  state() {
    out(snapshot(requireRoot(process.cwd())));
    return 0;
  },

  transition(argv) {
    const [to, product] = argv;
    if (!to) return fail('Usage: ultraship transition <STATE> [product]');
    out(transition(requireRoot(process.cwd()), to, product));
    return 0;
  },

  product(argv) {
    const [sub, id, ...rest] = argv;
    const root = requireRoot(process.cwd());
    if (sub === 'add') {
      if (!id) return fail('Usage: ultraship product add <id> [name]');
      out(addProduct(root, id, rest.join(' ') || undefined));
      return 0;
    }
    if (sub === 'use') {
      if (!id) return fail('Usage: ultraship product use <id>');
      out(useProduct(root, id));
      return 0;
    }
    return fail('Usage: ultraship product <add|use> <id> [name]');
  },

  migrate() {
    out(migrate(requireRoot(process.cwd())));
    return 0;
  },

  constraints(argv) {
    const [sub, ...rest] = argv;
    const root = requireRoot(process.cwd());
    if (sub === 'show' || sub === undefined) {
      out(showConstraints(root));
      return 0;
    }
    if (sub === 'set') {
      const values = {};
      for (let i = 0; i < rest.length; i += 1) {
        const field = { '--time': 'time', '--budget': 'budget', '--capacity': 'capacity' }[rest[i]];
        if (!field) return fail(`Unknown flag "${rest[i]}". Use --time, --budget, or --capacity.`);
        values[field] = rest[i + 1] ?? null;
        i += 1;
      }
      if (!Object.keys(values).length) {
        return fail('Usage: ultraship constraints set [--time T] [--budget B] [--capacity C]');
      }
      out(setConstraints(root, values));
      return 0;
    }
    return fail('Usage: ultraship constraints <set|show> [--time T] [--budget B] [--capacity C]');
  },

  deploy(argv) {
    const [product, version] = argv;
    const result = deploy(requireRoot(process.cwd()), { product, version });
    out(result);
    return result.ok ? 0 : 1;
  },

  validate() {
    const result = validateWorkspace(requireRoot(process.cwd()));
    out(result);
    return result.ok ? 0 : 1;
  },

  views() {
    out({ written: renderViews(requireRoot(process.cwd())) });
    return 0;
  },

  semver(argv) {
    const [sub, version, bump] = argv;
    if (sub !== 'next') return fail('Usage: ultraship semver next <version> <bump>');
    if (!version || !bump) return fail('Usage: ultraship semver next <version> <bump>');
    out({ previous: version, bump, next: semverNext(version, bump) });
    return 0;
  },
};

function usage() {
  return fail(
    `Usage: ultraship <command> [args]\n\nCommands:\n  ${Object.keys(COMMANDS).sort().join('\n  ')}`,
  );
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command) return usage();
  if (command === '--version' || command === '-v') {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }
  if (command === '--help' || command === '-h') return usage();

  const handler = COMMANDS[command];
  if (!handler) {
    return fail(
      `Unknown command "${command}". Valid commands: ${Object.keys(COMMANDS).sort().join(', ')}`,
    );
  }

  try {
    return await handler(rest);
  } catch (err) {
    return fail(err.message);
  }
}

process.exitCode = await main(process.argv.slice(2));
