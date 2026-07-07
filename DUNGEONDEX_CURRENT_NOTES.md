# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.23.8 - Board Echo Minimal Playable Activation

## v1.23.7 Rival Trace Result Detail Polish
- Rival Trace now exposes a clearer read-only Guild Journal completed-result detail line.
- Modern Rival Trace history records, active trace records, elite rival records, legacy string history entries, and `rival_trace:*` completed keys still summarize into one readable display model.
- Duplicate Rival Trace display records still collapse by canonical trace identity.
- The Guild Journal Rival Traces row now includes rival name, route/status, completed state, memory key/id, flavor summary, and last completed label in read-only copy.
- `smoke_rival_trace_memory_v1.mjs` now verifies the completed-result detail appears after a Rival Trace completion, along with the existing empty state, duplicate collapse, legacy key detection, string-history compatibility, JSON reload stability, Journal rendering, and Famous Gear compatibility.
- The compact smoke suite remains the branch verification target.

## v1.23.6 Rival Trace Memory v1 Completion
- Rival Trace now has a read-only Guild Journal summary helper.
- Modern Rival Trace history records, active trace records, elite rival records, legacy string history entries, and `rival_trace:*` completed keys summarize into one readable display model.
- Duplicate Rival Trace display records collapse by canonical trace identity.
- The Guild Journal Rival Traces row consumes the readable summary and remains read-only.
- `smoke_rival_trace_memory_v1.mjs` verifies empty state, duplicate collapse, legacy key detection, string-history compatibility, JSON reload stability, Journal rendering, and Famous Gear compatibility.
- The compact smoke suite passed 20/20 for this branch before final label alignment.

## v1.23.5 Famous Gear Memory v1 Completion
- Famous Gear Memory v1 records retired gear archive memories as durable, readable progression memory records.
- Legacy string entries and partial records normalize into one canonical duplicate-safe record list.
- Duplicate records collapse by completion/record identity across repeated normalization, save/reload, and mixed legacy/modern state.
- The read-only Famous Gear summary reports count, readable names, source labels, latest memory, legacy detection, duplicate-collapse status, duplicate safety, and empty-state copy.
- The Guild Journal Famous Gear section consumes the readable summary and remains read-only.
- `smoke_famous_gear_memory_v1.mjs` verifies duplicate collapse, reload persistence, summary output, and Journal rendering.

## v1.23.4 Boss Trophy v1 Completion
- Boss Trophy v1 records earned boss trophies as durable, readable progression memory records.
- Modern records and legacy trophy IDs normalize into one canonical duplicate-safe record list.
- Duplicate records collapse by trophy identity across repeated awards, normalization, save/reload, and mixed legacy/modern state.
- The read-only Boss Trophy summary reports count, trophy names, source names, latest trophy, legacy ID detection, duplicate-collapse status, and empty-state copy.
- The Guild Journal Boss Trophy section consumes the readable summary and remains read-only.
- `smoke_boss_trophy_v1.mjs` verifies persistence, duplicate safety, legacy compatibility, Journal integration, and adjacent-system neutrality.

## v1.23.3 Guild Journal / Memory Board
- The Archive surface now includes a read-only Guild Journal summary band for boss trophies, Revisit memories, Debt status, Talent memory, and boss progress.
- The Journal only reads existing state and shows safe copy when records are missing or malformed.
- The Journal does not add buttons, rewards, spending, borrowing, repayment, or Revisit activation.
- `smoke_journal_v1233.mjs` verifies the read-only summary model and archive-panel render contract.

## v1.23.2 Revisit v1 Closeout
- Trophy Echo, Famous Gear Memory, and Rival Trace are the current live Revisit lanes.
- All three lanes start and resolve from town.
- All three lanes record completion history under `player.revisitState` and persist through save/reload.
- Trophy Echo remains tied to boss trophy or boss record history.
- Famous Gear Memory remains tied to retired gear archive records and never returns the retired item as loot.
- Rival Trace remains tied to named rival elite history and does not create a new hunt, combat path, board mission, reward loop, or progression shortcut.
- Debt Pressure and Board Echo remain locked/planned.
- `smoke_revisit_routes_v173.mjs` is the primary Revisit v1 verification smoke.

## Current Revisit Lane Status
- Trophy Echo: live town memory lane tied to boss trophy or boss record history.
- Famous Gear Memory: live town archive lane tied to retired gear records.
- Rival Trace: live town archive trace lane tied to named rival elite history.
- Debt Pressure: locked/planned.
- Board Echo: locked/planned.

## Protected Systems
- Enter Dungeon / Continue Run remains the primary dungeon path.
- Talent spend remains controlled around `hunter_board_clarity` unless a separate issue expands it.
- Gear stat math, monster scaling, economy rewards, and dungeon progression should stay outside Revisit memory patches unless explicitly scoped.
- Service worker/cache labels must stay aligned with the visible build label.

## Smoke Targets
- Compact smoke suite: `node smoke_compact_suite.mjs`
- Rival Trace memory v1 verification: `node smoke_rival_trace_memory_v1.mjs`
- Primary Revisit v1 verification: `node smoke_revisit_routes_v173.mjs`
- Useful adjacent checks:
  - `node smoke_journal_v1233.mjs`
  - `node smoke_famous_gear_memory_v1.mjs`
  - `node smoke_boss_trophy_v1.mjs`
  - `node smoke_talent_passive_framework_v1232.mjs`
  - `node smoke_debt_collector_v169.mjs`

## Recent Historical Notes

### v1.23.2 Famous Gear Memory Revisit
- Famous Gear Memory became the second live Revisit lane after Trophy Echo.
- It appears in town, locks against missing retired gear history, opens from retired gear archive history, starts a safe archive memory, resolves in town, and records completion history.
- The item stays retired. This patch does not return gear rewards, open a combat path, change economy math, change Talent values, or alter main dungeon progression.

### v1.23.1 Trophy Echo Prototype Stabilization
- Trophy Echo became the first live Revisit lane.
- It appears in town, locks against missing boss history, opens from boss trophy history, starts a short active memory, resolves in town, and records completion history plus Memory Marks in save data.

### v1.23.2 Talent Passive Framework Completion
- The Talent API exposes a canonical passive inventory for known nodes.
- `hunter_board_clarity` remains the controlled spend path and live copy-only renderer effect.
- `debt_collector_clarity` remains guarded until a separate issue authorizes live panel activation.
- Placeholder passives remain preview-only with no combat, economy, reward, Revisit, or progression effects.
