# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.26.2 - Public Runtime Hygiene + Devtools Gate

## v1.26.2 Public Runtime Hygiene + Devtools Gate
- Public runtime now keeps internal DevTools, scenario presets, balance reports, and DevKit Reset-hold helpers behind one explicit devtools gate.
- Devtools stay available for intentional local development on localhost, direct `file:` review, or an explicit `?devtools=1` / `?dev=1` query.
- Public service-worker precache no longer includes devtools-only runtime files.
- Trophy Echo remains the only active Revisit lane.
- Build/cache labels now use `1.26.2-public-runtime-hygiene`.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt math, Talent behavior, gear, monster, or economy behavior changed.

## v1.26.1 Public Readiness Sweep
- The GitHub issue queue was completed before this patch was prepared.
- Trophy Echo remains the only active Revisit lane.
- Focused smoke scripts now live under `tests/smoke/`; `smoke_compact_suite.mjs` remains the stable root runner.
- Player-facing copy, identity/lore guidance, screenshot planning, and asset provenance records were completed and reviewed.
- Release builders now package `styles.css`, `styles_lore_layer.css`, and `styles_visual_weight.css`.
- Build/cache labels now use `1.26.1-public-readiness`.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt math, Talent behavior, gear, monster, or economy behavior changed.

## v1.26.0 Trophy Echo Only Revisit
- Revisit is now a focused Trophy Echo-only player-facing system.
- The Revisit panel remains housed in the Lowfire Board between Warden Objectives and the Lowfire Elite Board.
- Trophy Echo stays available from boss trophy or boss record history only.
- The locked Revisit state now points only to Trophy Echo requirements: defeat a boss and create boss trophy/boss record history.
- Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure are removed from the active Revisit surface for this release.
- Build/cache labels now use `1.26.0-trophy-echo-only`.
- No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Elite Board, Spark Writ, gear, monster, or economy behavior changed.

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
- The note also clarifies that new gear equips at its own upgrade tier instead of inheriting the equipped item’s upgrade level.
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
- `tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs` is the focused verification target for the current progression path.

## Open Issue Sweep Notes
- Current runtime baseline is v1.26.2 Public Runtime Hygiene + Devtools Gate.
- Existing sweep docs remain reference material only and may include older Revisit planning language.
- Treat Trophy Echo as the only active Revisit lane unless a future focused issue explicitly reintroduces another lane.
