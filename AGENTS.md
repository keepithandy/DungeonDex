# AGENTS.md

## Project

DungeonDex is a mobile-first dark fantasy browser roguelite / idle dungeon crawler by Northline Studio.

This file is the first-read operating contract for Codex, Claude, ChatGPT, and other repo agents.

## Core Workflow Rules

- Keep all changes small, focused, and versioned.
- Do not rewrite the project unless the user explicitly asks.
- Preserve save data compatibility.
- Prefer targeted fixes, contract helpers, and smoke coverage over large refactors.
- Do not remove systems unless the user explicitly asks.
- Do not change the public game direction away from DungeonDex.
- Do not introduce external dependencies unless explicitly approved.
- Do not expose API keys, secrets, private tokens, or credentials.
- Do not include `node_modules` or unrelated lockfile noise unless required by the explicit task.

## Required Agent Reading Order

Before planning or editing, read:

1. `AGENTS.md`
2. `VERSION.md`
3. `DUNGEONDEX_CURRENT_NOTES.md`
4. `docs/CURRENT_ARCHITECTURE.md` if present
5. `docs/PATCH_TEMPLATE.md` before writing a patch plan
6. `docs/RELEASE_CHECKLIST.md` before version labels, release notes, cache labels, or public-facing package changes

## Version Authority

- Always check `VERSION.md` before changing any version number.
- `VERSION.md` is the source of truth for the current public version, current development target, and hotfix naming.
- Do not trust old release notes, old zip filenames, cached build labels, package names, old patch logs, or historical comments as the current version.
- Do not bump the version unless the user explicitly asks.
- Before changing version labels, search for all version strings in:
  - `VERSION.md`
  - `index.html`
  - `app.js`
  - `styles.css`
  - `manifest.json`
  - `sw.js`
  - `patch-log.md`
  - release notes
  - smoke-test notes
  - current notes
- Report every relevant version string found before editing.
- Keep the visible player-facing label short, for example: `DungeonDex v1.21.1`.

## Patch Types

Classify every task before editing.

### Docs-only

Allowed:
- README
- CHANGELOG
- VERSION notes
- current notes
- docs files

Rules:
- Do not edit runtime JavaScript, CSS, service worker, or save logic unless explicitly requested.

### Smoke-only

Allowed:
- smoke tests
- test fixtures
- test documentation

Rules:
- Do not change runtime behavior.
- Do not modify player-facing behavior.
- Use smoke coverage to lock expected behavior.

### Contract/helper

Allowed:
- read-only helpers
- copy model helpers
- metadata helpers
- contract functions
- non-mutating preview logic

Rules:
- Helpers must not mutate game state unless explicitly requested.
- Helpers must not wire into live gameplay unless activation is explicitly requested.
- Prefer explicit return objects over hidden side effects.

### Activation

Allowed only when the user explicitly requests activation.

Rules:
- State what behavior is being activated.
- State what behavior remains locked.
- Add or update smoke coverage.
- Preserve save compatibility.
- Include rollback/risk notes.

### Release-label / cache-label

Allowed:
- version labels
- public labels
- service worker/cache labels
- release notes
- package notes

Rules:
- Verify all public/runtime/cache labels match the requested version.
- Do not change gameplay behavior.

## Permanent Gameplay Guardrails

- `Enter Dungeon` / `Continue Run` remains the only active dungeon entry path unless the user explicitly requests a new playable entry system.
- Revisit remains locked, read-only, and planning-only unless the user explicitly requests activation.
- Do not add Revisit entry, start, begin, claim, complete, unlock, reward, progression, currency, combat, economy, or farming behavior unless explicitly requested.
- Trophy Echo remains the first planned Revisit lane.
- Famous Gear Memory remains the second planned Revisit lane.
- Rival Trace remains named rival elite memory only.
- Preserve debt, gear, combat, monster, economy, Elite Board, contract, trophy, Famous Gear, Talent, and save-progression behavior unless the patch scope explicitly targets one of those systems.
- No monster affixes, hidden statuses, or new combat complexity unless explicitly requested.

## Talent System Guardrails

DungeonDex has an active Talent foundation. Do not treat the entire Talent system as nonexistent or fully inert.

Known allowed Talent foundation may include:
- Talent point earning where already implemented.
- Talent point spending where already implemented.
- Learned node state where already implemented.
- Read-only or copy-only passive helper behavior where already implemented.
- Existing smoke coverage for Talent earning, spending, learned state, and copy-only passive behavior.

Rules:
- Do not add new Talent currencies unless explicitly requested.
- Do not add new branches unless explicitly requested.
- Do not add new gameplay bonuses unless explicitly requested.
- Do not change Talent earning rates, spending costs, unlock rules, save schema, or learned-state behavior unless explicitly requested.
- Talent passive effects must remain copy-only/read-only unless the issue explicitly says activation is allowed.
- Hunter Board Clarity is allowed only as existing copy-only behavior unless the issue explicitly changes it.
- Debt Collector clarity must not set `liveRendererWired: true` unless the issue explicitly unlocks renderer activation.
- Do not activate Debt Collector clarity live rendering unless explicitly requested.
- When changing Talent code, verify that existing earning/spending/learned-state smoke expectations still pass.

## Revisit Guardrails

- Revisit helpers may exist internally.
- Do not re-export Revisit helpers unless the issue explicitly asks for it.
- Do not unlock Revisit behavior.
- Do not add Revisit rewards, claim loops, progression, or farming.
- Revisit planning copy may be edited only when the patch scope allows copy/docs changes.

## UI / Design Direction

- Mobile-first.
- Compact panels.
- One-hand friendly.
- Dark fantasy tone.
- Ember, dungeon, town, wardens, trophies, loot, contracts, debt, elites, and descent identity.
- Avoid clutter.
- Prefer cleaner CSS/layout improvements before adding new UI systems.
- Do not add dead UI buttons or labels that imply behavior not yet implemented.

## Code Rules

- Check for broken references before finishing.
- Avoid duplicate functions.
- Avoid dead buttons.
- Avoid UI labels that do not connect to real behavior.
- Keep file edits minimal.
- Explain exactly what changed.
- Prefer contract/smoke coverage over repeated manual audit text when a behavior needs to stay locked.
- Preserve classic script-load ordering unless the issue explicitly targets script architecture.
- Do not modernize architecture, convert modules, add build tooling, or refactor file structure unless explicitly requested.

## Testing Before Final Response

After any code change, report:

1. Files edited.
2. What changed.
3. What was intentionally not changed.
4. Checks or smoke tests run.
5. Checks not run and why.
6. Risks or follow-up checks.
7. Suggested next issue, if obvious.

## Required Final Report Format

Use this format after completing repo work:

```text
Summary:
- ...

Files changed:
- ...

Behavior changed:
- ...

Behavior intentionally not changed:
- ...

Checks run:
- ...

Checks not run:
- ...

Risks:
- ...

Suggested next issue:
- ...
```

## Preferred Output Style

- Be concise.
- Be direct about bugs, risks, and uncertainty.
- Include git commands when useful.
- Do not hide skipped checks.
- Do not claim a check passed unless it was actually run.
- Do not claim behavior changed unless the patch actually changed runtime behavior.
