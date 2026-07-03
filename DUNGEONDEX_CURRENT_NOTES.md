# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.23.2 - Famous Gear Memory Revisit

## v1.23.2 Famous Gear Memory Revisit
- Famous Gear Memory is now the second live Revisit lane after Trophy Echo.
- The lane starts and resolves from town using retired gear archive history.
- Completion records archive history under `player.revisitState.famousGear` with deterministic completed keys and a last-result summary.
- The item stays retired. This patch does not return gear rewards, open a combat path, change economy math, change Talent values, or alter main dungeon progression.
- Added a focused state-shape patch in `js/systems/35_revisit_famous_gear_memory_state_patch.js` so older saves or fixtures that omit `player.revisitState.famousGear` repair before Famous Gear start/resolve actions use the lane.
- Build labels, runtime pointer, service worker cache labels, README, CHANGELOG, and VERSION.md now target v1.23.2.
- `smoke_revisit_routes_v173.mjs` is the primary smoke target for this patch.

## Current Revisit Lane Status
- Trophy Echo: live town memory lane tied to boss trophy or boss record history.
- Famous Gear Memory: live town archive lane tied to retired gear records.
- Rival Trace: live/scaffolded archive trace lane tied to named rival elite history.
- Debt Pressure: locked/planned.
- Board Echo: locked/planned.

## Protected Systems
- Enter Dungeon / Continue Run remains the primary dungeon path.
- Talent spend remains controlled around `hunter_board_clarity` unless a separate issue expands it.
- Gear stat math, monster scaling, economy rewards, and dungeon progression should stay outside Revisit memory patches unless explicitly scoped.
- Service worker/cache labels must stay aligned with the visible build label.

## Smoke Targets
- Primary for this patch: `node smoke_revisit_routes_v173.mjs`
- Useful adjacent checks:
  - `node smoke_talent_passive_framework_v1232.mjs`
  - `node smoke_debt_collector_v169.mjs`

## Recent Historical Notes

### v1.23.1 Trophy Echo Prototype Stabilization
- Trophy Echo became the first live Revisit lane.
- It appears in town, locks against missing boss history, opens from boss trophy history, starts a short active memory, resolves in town, and records completion history plus Memory Marks in save data.

### v1.23.2 Talent Passive Framework Completion
- The Talent API exposes a canonical passive inventory for known nodes.
- `hunter_board_clarity` remains the controlled spend path and live copy-only renderer effect.
- `debt_collector_clarity` remains guarded until a separate issue authorizes live panel activation.
- Placeholder passives remain preview-only with no combat, economy, reward, Revisit, or progression effects.
