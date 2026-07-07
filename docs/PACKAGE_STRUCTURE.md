# DungeonDex Package Structure

This document defines the intended repo layout so future patches keep files in the right place.

## Root files

Keep the root folder limited to files that must be easy to find or are loaded directly by the browser/runtime.

Allowed root files:

- `README.md` — public project entry point.
- `VERSION.md` — active version authority.
- `CHANGELOG.md` — permanent release history.
- `index.html` — browser entry point.
- `app.js` — runtime app entry.
- `sw.js` — service worker/cache entry.
- `smoke_compact_suite.mjs` — stable root smoke runner.

Do not add one-off planning notes, temporary summaries, or patch scratch files to the root.

## Runtime code

Runtime code belongs under `js/`.

- `js/systems/` — numbered runtime systems loaded by the app.
- `js/systems/README.md` — system-order notes and runtime ownership notes.

New runtime modules should follow the existing numbered system convention unless a separate architecture issue changes that rule.

## Documentation

Project documentation belongs under `docs/`.

Recommended subareas:

- `docs/status/` — current notes, checkpoints, and baseline status material.
- `docs/` root — durable planning, architecture, asset, issue, and release-process docs.

Current status notes live at:

- `docs/status/CURRENT_NOTES.md`

## Smoke tests and validation

The repo currently keeps individual smoke scripts at root because several scripts load runtime files relative to their own location and the compact runner expects those paths.

Current stable validation command:

```bash
node smoke_compact_suite.mjs
```

Focused checks may still be run from root, for example:

```bash
node smoke_merchant_gear_upgrades_v1238.mjs
node smoke_revisit_routes_v173.mjs
node smoke_journal_v1233.mjs
```

Future cleanup should migrate individual smoke files into a folder such as `tests/smoke/` only as a focused path-aware patch. That migration must update:

- `smoke_compact_suite.mjs`
- README smoke commands
- docs/status smoke target notes
- any smoke scripts that use `new URL('./js/...', import.meta.url)` or similar path-relative loading

Until then, do not move individual smoke scripts blindly.

## Assets

Public-facing asset notes and provenance belong in:

- `docs/ASSET_INVENTORY.md`

Actual asset files should eventually live under a dedicated runtime-safe asset folder, such as `assets/`, once the project has stable image/font/screenshot files to track.

## Cleanup rule

Before adding a new file, choose the folder by purpose:

| Purpose | Folder |
| --- | --- |
| Browser/runtime entry | root |
| Runtime system code | `js/systems/` |
| Durable docs/plans | `docs/` |
| Status/checkpoint notes | `docs/status/` |
| Future smoke tests | `tests/smoke/` after path migration |
| Future tooling | `tools/` |
| Future public assets | `assets/` |

If a file is temporary, do not commit it unless it is converted into durable documentation or a repeatable tool/check.
