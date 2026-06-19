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
- Treat this file as the first-read operating contract for Codex, Claude, and other repo agents.

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
- Keep the visible player-facing label short, for example: DungeonDex v1.4.2.

## Permanent Gameplay Guardrails
- Enter Dungeon / Continue Run remains the only active dungeon entry path unless the user explicitly requests a new playable entry system.
- Revisit remains locked, read-only, and planning-only unless the user explicitly requests activation.
- Do not add Revisit entry, start, begin, claim, complete, unlock, reward, progression, currency, combat, economy, or farming behavior unless explicitly requested.
- Trophy Echo remains the first planned Revisit lane; Famous Gear Memory remains the second planned lane; Rival Trace remains named rival elite memory only.
- Talent systems remain inert/locked/read-only unless the user explicitly requests activation.
- Do not add talent earning, spending, unlocks, learned nodes, passive bonuses, active bonuses, new branches, or new currencies unless explicitly requested.
- Preserve debt, gear, combat, monster, economy, Elite Board, contract, trophy, Famous Gear, and save-progression behavior unless the patch scope explicitly targets one of those systems.
- No monster affixes, hidden statuses, or new combat complexity unless explicitly requested.

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
- Prefer contract/smoke coverage over repeated manual audit text when a behavior needs to stay locked.

## Required Agent Reading Order
1. Read AGENTS.md.
2. Read VERSION.md.
3. Read DUNGEONDEX_CURRENT_NOTES.md.
4. Read docs/CURRENT_ARCHITECTURE.md if present.
5. Read docs/PATCH_TEMPLATE.md before writing a patch plan.
6. Read docs/RELEASE_CHECKLIST.md before version labels, release notes, or public-facing package changes.

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
