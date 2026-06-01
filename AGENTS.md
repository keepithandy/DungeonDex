# AGENTS.md

## Project
DungeonDex is a mobile-first dark fantasy browser roguelite / idle dungeon crawler by Northline Studio.

## Current Workflow Rules
- Keep changes small, focused, and versioned.
- Do not rewrite the whole project unless explicitly asked.
- Preserve existing save data compatibility whenever possible.
- Prefer targeted fixes over large refactors.
- Do not remove systems unless the user directly asks.
- Do not change the public game direction away from DungeonDex.

## Versioning
- Use short player-facing build labels only.
- The visible game label should look like: DungeonDex v1.4.2
- Do not use long internal pass names inside the visible game title.
- Long names belong only in release notes, smoke-test notes, patch logs, or internal comments.

## UI / Design Direction
- Mobile-first.
- Compact panels.
- One-hand friendly.
- Dark fantasy, ember, dungeon, town, wardens, trophies, loot, and descent identity.
- Avoid clutter.
- Prefer cleaner CSS/layout improvements before adding new UI systems.

## Code Rules
- Check for broken references before finishing.
- Avoid duplicate functions.
- Avoid dead buttons or UI labels that do not connect to real behavior.
- Keep file edits minimal and explain exactly what changed.
- Do not introduce external dependencies unless explicitly approved.
- Do not expose API keys or secrets.
- Do not include node_modules or lockfile noise unless required.

## Testing Before Final Response
After any code change, report:
1. Files edited.
2. What changed.
3. What was intentionally not changed.
4. Basic smoke-test steps.
5. Any risks or follow-up checks.

## Preferred Output Style
- Give concise implementation notes.
- Include git commands when useful.
- Be direct about bugs, risks, or uncertainty.

## Version Authority
- Always check VERSION.md before changing any version number.
- VERSION.md is the source of truth for the current public version, current development target, and hotfix naming.
- Do not trust old release notes, old zip filenames, cached build labels, package names, or patch-log history as the current version.
- Do not bump the version unless the user explicitly asks.
- Before changing version labels, search for all version strings in:
  - index.html
  - app.js
  - styles.css
  - manifest.json
  - sw.js
  - patch-log.md
  - release notes
  - smoke-test notes
- Report every version string found before editing.
- Keep the visible player-facing label short, for example: DungeonDex v1.4.2

## Version Authority
- Always check VERSION.md before changing DungeonDex version numbers.
- VERSION.md overrides old release notes, old zip names, stale patch logs, and cached build labels.
- Do not change version labels unless the user explicitly asks.
