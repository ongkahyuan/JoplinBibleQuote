# AGENTS.md

## Build
```bash
npm run dist
```
Builds plugin to `dist/`, creates `.jpl` archive in `publish/`. Runs 3 webpack steps in sequence.

## Version bump
```bash
npm run updateVersion
```
Bumps patch version in both `package.json` and `src/manifest.json`.

## Architecture
- Entry: `src/index.ts` registers settings and markdown-it content script
- `src/markdownItPlugin.ts` — extra script compiled separately (defined in `plugin.config.json`)
- `api/` — Joplin API types, aliased as `api` in webpack

## No tests
No test framework configured.

## Style
Prettier: single quotes, 2-space tabs. Run `npx prettier --write .` if needed.
