# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.26.1 Public Readiness Sweep`
* Current local package baseline: `v1.26.1 Public Readiness Sweep`
* Current development target: `v1.26.1 Public Readiness Sweep`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

## v1.26.1 - Public Readiness Sweep

* Completed and closed the remaining GitHub issue queue without activating new gameplay systems.
* Finished the v1.26 player glossary, visual/lore/brand guidance, screenshot plan, asset provenance inventory, and player-copy audit.
* Moved focused smoke scripts into `tests/smoke/` while preserving the stable root compact runner.
* Updated release builders to include all three live stylesheets and aligned runtime, cache, documentation, and smoke labels to `1.26.1-public-readiness`.
* Preserved Trophy Echo as the only active Revisit lane.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt math, Talent behavior, gear, monster, or economy behavior changed.

---

## v1.26.0 - Trophy Echo Only Revisit

* Focused the active Revisit surface on Trophy Echo, available only from existing boss trophy or boss record history.
* Removed Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure from the active Revisit surface.
* Aligned current documentation, build, and cache labels to the v1.26.0 baseline.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Elite Board, Spark Writ, gear, monster, or economy behavior changed.

---

## v1.25.2 - Revisit No-op Stability + Version Alignment

* Disabled the unstable post-render Revisit relocation helper after mobile/Textastic lag and unresponsive button reports.
* Bumped the service-worker cache/build query to `1.25.2-revisit-noop-stability` so stale relocation assets are purged.
* Aligned runtime pointer, build-label guard, service-worker cache labels, README, changelog, current notes, agent instructions, and release templates to the new stability baseline.
* Left the source town renderer as the owner of the live Revisit panel until a future source-render placement patch is implemented.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit start/resolve/reward/history behavior, Echo activation, gear mechanics, or Relic collection behavior changed.

---

## v1.25.1 - Mobile Side Rail Toggle

* Replaced the mobile/touch side-rail hamburger/close control with a tiny `←` drawer button.
* Tightened the closed mobile rail to a narrow 28px strip and hides route tabs until the drawer is opened.
* Preserved desktop hover/focus side-rail behavior.
* Aligned runtime pointer, build-label guard, service-worker cache labels, README, changelog, current notes, and version authority to `v1.25.1`.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit, Echo, or Relic collection behavior changed.

---

## v1.25.0 - Visual Identity + Side Rail Release

* Added the first custom DungeonDex crest asset and decorative Hollow Stair gate visual to the live identity layer.
* Polished the Hollow Stair gate art for stronger arch, stair, and ember readability.
* Renamed player-facing Relic Forge copy to Lowfire Forge while preserving legacy filenames, globals, and save fields.
* Replaced the fixed bottom navigation with a left-side rail that expands on hover/focus and opens with a tap toggle on touch/mobile devices.
* Aligned visible runtime labels, build query strings, service-worker cache labels, and docs to `v1.25.0`.
* Added the crest and Hollow Stair SVG assets to the service-worker precache list.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt, Talent, Revisit, Echo, or Relic collection behavior changed.

---

## v1.23.8.09 - Build Label Alignment

* Aligned the visible browser title and build-label guard with the current runtime/cache version.
* Added smoke coverage that rejects mixed visible-build and cache-query labels.
* No gameplay, save, progression, economy, combat, Relic, Talent, Debt, or Revisit behavior changed.

---

## v1.23.8.08 - Town Mobile Screenshot Harness

* Added a narrow local screenshot helper that opens Town at 390px, 430px, and 768px widths for repeatable visual inspection.
* The helper reuses the existing Chrome/CDP smoke path, writes local PNGs under `archive/screenshots/town-mobile/`, and exits cleanly with browser guidance when no Chromium executable is available.
* Updated public version labels, build labels, and cache-busting labels to `v1.23.8.08`.

---

## v1.23.8.07 - Town Readability + Mobile Hierarchy Lock

* Refined Town section spacing, heading hierarchy, and mobile action grouping around the existing hub shell.
* Extended the Town runtime smoke to verify shell identity survives the full Town wrapper chain, readable section labels remain present, and core Town navigation/actions remain available.
* Updated public version labels, build labels, and cache-busting labels to `v1.23.8.07`.

---

## v1.23.8.06 - Town Shell Identity Pass

* Improved the Town shell with clearer semantic grouping for the district header, market, forge, contract board, gear hub, archive, and journal surfaces.
* Added small hub-oriented copy and layout hooks to strengthen Town readability without changing any gameplay actions or rules.
* Updated public version labels, build labels, and cache-busting labels to `v1.23.8.06`.

---

## v1.23.8.05 - Release Audit + Gameplay Foundation Cleanup

* Aligned public version labels, cache-busting labels, and runtime title labels to `v1.23.8.05`.
* Kept combat math, loot, economy, save compatibility, progression rules, dungeon entry, and Revisit behavior unchanged.

---

## v1.23.8.04 - Gear Replacement Warning and Upgrade Ownership Clarity

* The gear detail compare note now explains that an upgraded equipped item keeps its tier if replaced.
* The note also clarifies that new gear equips at its own upgrade tier instead of inheriting the old item’s tier.
* Runtime/cache/version authority labels were previously `v1.23.8.04`.
* Clarified that new gear equips at its own upgrade tier and does not inherit the equipped item’s upgrade level.
* Kept replacement behavior, upgrade math, costs, caps, save fields, and all combat/progression rules unchanged.

---

## v1.23.8.03 - Gear Upgrade Identity and Loot Comparison Clarity

* Added shared display-only gear-name formatting so upgraded equipped weapon and armor pieces show their upgrade tier in gear-facing surfaces.
* Clarified loot comparison and gear detail copy so equipped upgrade bonuses are shown as part of the comparison/readout.
* Kept Merchant Gear Upgrade math, prices, caps, save fields, and replacement behavior unchanged.
* Extended focused smoke coverage for gear identity and loot comparison clarity while keeping the compact suite green.

---

## v1.23.8.02 - Merchant Gear Upgrade Clarity and Smoke Hardening

* Aligned visible runtime labels, build query strings, and service-worker cache labels to `v1.23.8.02`.
* Clarified Merchant Gear Upgrade player-facing copy for equipped weapon and armor tiers, current bonuses, and next-cost/maxed states.
* Extended merchant-upgrade smoke coverage to verify persisted clarity text and direct Town merchant renderer HTML output.
* Updated the itch package helper and release-facing docs to match the active `docs/status/CURRENT_NOTES.md` notes path and current package baseline.
* No upgrade costs, upgrade effects, upgrade caps, save fields, combat math, HP logic, reward tables, debt behavior, Revisit activation, or dungeon-entry rules changed.

---

## v1.23.8.01 - Gear Section Polish

* Fixed escaped `formatMoney()` markup leaking into the Merchant Gear Upgrades panels.
* Added a read-only click-to-inspect gear detail modal for visible equipped and inventory gear cards.
* Added modal styling for a compact dark overlay with rarity, slot, level, upgrade, stat, sell-value, and summary details.
* Added a Gear-tab money text cleanup extension so upgrade cards display `50c` instead of raw `<span>` markup.
* Bumped runtime/cache/version authority labels to `v1.23.8.01`.
* No purchase costs, stat math, inventory mutation, equip behavior, selling behavior, monster scaling, rewards, debt behavior, Revisit behavior, or dungeon-entry rules changed.

---

## v1.23.8 - Merchant Gear Upgrades

* Merchant Gear Upgrades are now the active simple progression system in the Lowfire Market.
* Equipped weapon and armor items carry persistent `upgradeLevel` values from `+0` to `+3`.
* Merchant upgrade costs are fixed at `50c`, `125c`, and `250c`.
* Weapon upgrades add flat Power; armor upgrades add flat Guard and HP.
* Legacy progression save data remains compatibility-safe but no longer drives gameplay or the active progression UI.
* The Gear surface and Guild Journal now summarize merchant upgrades.
* `smoke_merchant_gear_upgrades_v1238.mjs` is the focused smoke target for the current progression path.
* Public/runtime/cache labels remain `v1.23.8`.
* No monster scaling, boss scaling, debt behavior, reward tables, Revisit lane activation, or dungeon-entry rules changed.

---

## v1.23.7 - Rival Trace Result Detail Polish

* Added clearer read-only Rival Trace completed-result detail in the Guild Journal.
* Rival Trace result detail now surfaces rival name, route/status, completed state, memory key/id, short flavor summary, and last completed label when available.
* The Guild Journal Rival Traces row now includes the completed-result detail while staying read-only.
* Extended `smoke_rival_trace_memory_v1.mjs` to prove the completed-result detail appears after Rival Trace completion.
* Bumped public/runtime/cache labels to `v1.23.7` with build query `1.23.7-rival-trace-result-detail-polish`.
* No combat, HP, XP, monster scaling, boss scaling, rewards, currency, item drops, item stats, Debt, Famous Gear behavior, route mechanics, or dungeon-entry behavior changed.

---

## v1.23.6 - Rival Trace Memory v1 Completion

* Added a read-only Rival Trace summary helper for the Guild Journal.
* Rival Trace memory copy now collapses duplicate records by canonical trace identity for display.
* Legacy `rival_trace:*` completed keys and string history entries are detected and surfaced safely.
* The Guild Journal Rival Traces row now consumes the readable summary helper while staying read-only.
* Added `smoke_rival_trace_memory_v1.mjs` for empty state, duplicate collapse, legacy key detection, string-history compatibility, JSON reload stability, Journal rendering, and Famous Gear compatibility.
* Bumped public/runtime/cache labels to `v1.23.6` with build query `1.23.6-rival-trace-memory-v1-completion`.
* No combat, HP, XP, monster scaling, boss scaling, rewards, currency, item drops, item stats, Debt, Boss Trophy, Famous Gear behavior, route mechanics, or dungeon-entry behavior changed.

---

## v1.23.5 - Famous Gear Memory v1 Completion

* Completed Famous Gear Memory v1 as a player-facing progression memory system.
* Famous Gear history normalization accepts legacy string entries and partial records, dedupes by canonical completion/record identity, and preserves readable record fields.
* Added a read-only Famous Gear summary helper for counts, readable names, source labels, latest memory, legacy detection, duplicate-collapse reporting, duplicate safety, and safe empty-state copy.
* The Guild Journal Famous Gear section now consumes the completed readable summary helper while staying read-only.
* Added `smoke_famous_gear_memory_v1.mjs` for Famous Gear persistence, duplicate safety, reload compatibility, Journal integration, and protected-system neutrality.
* Bumped public/runtime/cache labels to `v1.23.5` with build query `1.23.5-famous-gear-memory-v1-completion`.

---

## v1.23.4 - Boss Trophy v1 Completion

* Completed Boss Trophy v1 as a player-facing progression memory system.
* Boss Trophy state now normalizes modern records and legacy trophy IDs into a stable readable record shape without deleting valid trophy data.
* Duplicate Boss Trophy records collapse by canonical trophy identity across repeated award calls, repair passes, save/reload, and mixed legacy/modern trophy state.
* Added a read-only Boss Trophy summary helper for counts, trophy names, source names, latest trophy, legacy ID detection, duplicate-collapse reporting, and safe empty-state copy.
* The Guild Journal Boss Trophy section now consumes the completed readable summary helper while staying read-only.
* Added `smoke_boss_trophy_v1.mjs` for Boss Trophy persistence, duplicate safety, legacy compatibility, Journal integration, and protected-system neutrality.

---

## v1.23.3 - Guild Journal / Memory Board

* Added the read-only Guild Journal / Memory Board to the Archive surface.
