// Sole import point for YAML in UltraShip. Everything else imports from here,
// so swapping the vendored parser touches exactly one file.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YAML = require('../vendor/yaml/dist/index.js');

export function parse(text) {
  return YAML.parse(text);
}

export function stringify(value) {
  return YAML.stringify(value, { lineWidth: 100, nullStr: 'null' });
}

export function readYaml(path) {
  return parse(readFileSync(path, 'utf8'));
}

export function writeYaml(path, value) {
  writeFileSync(path, stringify(value), 'utf8');
}
