# Vendored dependencies

UltraShip ships with zero install-time dependencies so the plugin works the
moment its repository is cloned, with no `npm install` step.

## yaml 2.9.0

Source: https://www.npmjs.com/package/yaml
License: ISC (see `yaml/LICENSE`)
Obtained with: `npm pack yaml@2.9.0`

Removed after extraction: `browser/`, source maps. Nothing was edited.

To upgrade, repeat the `npm pack` steps and run `npm test`.
