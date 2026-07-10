# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.25.2 - Revisit No-op Stability + Version Alignment

## v1.25.2 Revisit No-op Stability + Version Alignment
- Disabled the unstable post-render Revisit relocation helper after mobile/Textastic lag and unresponsive button reports.
- Bumped the service-worker cache/build query to `1.25.2-revisit-noop-stability` so stale relocation assets are purged.
- Aligned runtime pointer, build-label guard, service-worker cache labels, README, changelog, current notes, agent instructions, and release templates to the stability baseline.
- The live town renderer remains the source owner of the Revisit panel until a future source-render placement patch moves it beside Elite Contracts safely.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit start/resolve/reward/history behavior, Echo activation, gear mechanics, or Relic collection behavior changed.

## v1.25.1 Mobile Side Rail Toggle
- Mobile/touch side rail now uses a tiny `←` drawer button instead of the larger hamburger/close control.
- Closed mobile/touch rail collapses to a narrow strip and hides route tabs until opened.
- Desktop hover/focus side-rail behavior remains unchanged.
- Runtime/cache/version authority labels are now `v1.25.1`.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit, Echo, or Relic collection behavior changed.

## v1.25.0 Visual Identity + Side Rail Release
- Added the first custom DungeonDex crest asset and the Hollow Stair gate Town visual.
- Polished the Hollow Stair gate art for clearer arch, stair, and ember readability.
- Renamed player-facing Relic Forge copy to Lowfire Forge while preserving legacy filenames, globals, and save fields.
- Replaced the fixed bottom navigation with a side rail that expands on hover/focus and opens by tap toggle on touch/mobile devices.
- Runtime/cache/version authority labels are now `v1.25.0`.
- Service-worker cache now includes the custom crest and Hollow Stair gate SVG assets.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit, Echo, or Relic collection behavior changed.

## v1.23.8.09 Build Label Alignment
- Visible browser/build labels now agree with the runtime, cache, and version authority.
- App wiring smoke now rejects mixed visible-build and cache-query labels.
- No gameplay mechanics changed.

## v1.23.8.08 Town Mobile Screenshot Harness
- Added a narrow local screenshot helper that captures Town at 390px, 430px, and 768px widths for repeatable visual inspection.
- The helper reuses the existing Chrome/CDP smoke path, writes local PNGs under `archive/screenshots/town-mobile/`, and exits cleanly with browser guidance when no Chromium executable is available.
- Runtime/cache/version authority labels are now `v1.23.8.08`.
- No gameplay mechanics changed.

## v1.23.8.07 Town Readability + Mobile Hierarchy Lock
- Town shell spacing, readable headings, and mobile action grouping now reinforce the existing hub hierarchy.
- Town runtime smoke now protects the final wrapper-chain shell classes, major section headings, and live Town access points.
- Runtime/cache/version authority labels are now `v1.23.8.07`.
- No gameplay mechanics changed.

## v1.23.8.06 Town Shell Identity Pass
- Town now presents a clearer hub shell with stronger sections, hierarchy, and world identity.
- Runtime/cache/version authority labels are now `v1.23.8.06`.
- No gameplay mechanics changed.

## v1.23.8.05 Release Audit + Gameplay Foundation Cleanup
- Runtime/cache/version authority labels were previously `v1.23.8.05`.

## v1.23.8.04 Gear Replacement Warning and Upgrade Ownership Clarity
- The gear detail compare note now explains that an upgraded equipped item keeps its tier if replaced.
- The note also clarifies that new gear equips at its own upgrade tier instead of inheriting the old item’s tier.
- Runtime/cache/version authority labels were previously `v1.23.8.04`.

## v1.23.8.01 Gear Section Polish
- Merchant Gear Upgrade money text no longer leaks raw `<span>` markup in the town or Gear-tab upgrade panels.
- Gear cards now support a read-only click-to-inspect detail modal.
- The modal summarizes visible equipped/inventory gear with source, slot, level, rarity, upgrade level, score, sell value, stats, summary, set, maker/theme, and memory labels when available.
- Gear inspection is display-only. It does not equip, sell, retire, buy upgrades, change costs, mutate state, or change save data.
- Runtime/cache/version authority labels are now `v1.23.8.01`.

## v1.23.8 Merchant Gear Upgrades
- Merchant Gear Upgrades are the active simple progression system.
- The Lowfire Market sells permanent upgrades for equipped weapon and armor pieces.
- Each eligible item stores `upgradeLevel` from `0` to `3` and persists it through save/reload.
- Upgrade costs are fixed at `50c`, `125c`, and `250c`.
- Weapon upgrades add flat Power. Armor upgrades add flat Guard and HP.
- Legacy progression save data remains compatibility-safe but no longer grants gameplay effects or active progression UI.
- `smoke_merchant_gear_upgrades_v1238.mjs` is the focused verification target for the current progression path.

## Open Issue Sweep Notes
- The current open issue set is grouped into playable/system completion, identity/documentation, visual/asset readiness, and smoke hardening tracks.
- `docs/OPEN_ISSUE_SWEEP.md` maps issues #36 through #51 to concrete repo surfaces and next actions.
- `docs/PLAYABLE_SYSTEMS_QUEUE.md` defines safe focused boundaries for Board Echo v1 and Debt Pressure v1.
- `docs/IP_LAYER_GUIDE.md` defines the current premise, glossary, visual identity direction, lore bible, factions/roles, copy rules, README direction, title/logo usage, screenshot plan, Revisit flavor direction, smoke copy targets, public roadmap categories, and loading/title copy.
- `docs/ASSET_INVENTORY.md` creates the first asset provenance scaffold.
- The sweep docs remain reference material only. The current runtime baseline is the merchant-upgrade patch described above.

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
- Duplicate records collapse by trophy identity across repeated awards, normalization, save/reload, and mixed legacy/modern trophy state.
- The read-only Boss Trophy summary reports count, trophy names, source names, latest trophy, legacy ID detection, duplicate-collapse status, and empty-state copy.
- The Guild Journal Boss Trophy section consumes the completed readable summary and remains read-only.
- `smoke_boss_trophy_v1.mjs` verifies persistence, duplicate safety, legacy compatibility, Journal integration, and adjacent-system neutrality.

## Current Revisit Lane Status
- Trophy Echo: live town memory lane tied to boss trophy or boss record history.
- Famous Gear Memory: live town archive lane tied to retired gear records.
- Rival Trace: live town archive trace tied to named rival elite history.
