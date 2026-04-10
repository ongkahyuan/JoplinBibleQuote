# Joplin Bible Quote Plugin

## Build Commands

- `npm run dist` — Build the plugin. Runs three webpack passes: compile TypeScript → compile extra scripts → create .jpl archive
- `npm run updateVersion` — Bump patch version in both `package.json` and `src/manifest.json`
- `npm run update` — Update plugin framework (Yeoman generator). Preserves `/src` and README.md but **overwrites `webpack.config.js`**

## Architecture

- Entry point: `src/index.ts` — calls `bibleQuote.init()`
- Content script (markdown fence renderer): `src/markdownItPlugin.ts` — parses ` ```bible ` blocks
- Extra scripts defined in `plugin.config.json` under `extraScripts[]`
- Type declarations: `api/` directory (Joplin plugin API types)
- Bible data: OSIS XML format

## Style

- Prettier: printWidth 120, single quotes, trailing commas (es5), 2-space tabs
- No ESLint config found
- `webpack.config.js` is auto-generated; custom changes go in a separate file and are required in

## Version Management

- `package.json` and `src/manifest.json` must stay in sync (both version + manifest_version)
- Use `npm run updateVersion` to bump both at once

## PR Conventions

- Base PRs on `dev` branch
- Small, trackable commits preferred
