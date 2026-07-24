# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.26.4.06 Mobile Interface Audit Closure`
* Current local package baseline: `v1.26.4.06 Mobile Interface Audit Closure`
* Current development target: `v1.26.4.06 Mobile Interface Audit Closure`
* Current build/cache label: `1.26.4.06-mobile-interface-audit-closure`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

## v1.26.4.06 - Mobile Interface Audit Closure

* Published the final mobile interface audit closure for GitHub issues #116–#125, including safe-area navigation clearance, exhaustive public control inventory coverage, and contrast-cascade enforcement.
* Preserved the v1.26.4.05 stability hardening set: repository-wide JavaScript syntax gating, single-owner forge/monster/startup presentation paths, escaped merchant stock rendering, and the 43/43 compact suite baseline.
* Verified the release with 43/43 compact checks, 21/21 interface/accessibility checks, 16/16 mobile-layout checks, 11/11 Enter Dungeon checks, and fresh touch/fine-pointer captures at 390×844, 430×932, and 768×1024.
* No combat, boss scaling, rewards, economy, upgrade values, save schema, progression, Revisit behavior, or dungeon entry changed.

## v1.26.4.05 - Stability Hardening

* Repaired the smoke helper and made the compact suite reject syntax errors across every tracked JavaScript and MJS file.
* Centralized Ashen Anvil heading ownership, monster cue ownership, and Lowfire Forge presentation ownership without changing their player-facing behavior.
* Added focused Lowfire Forge contract coverage for crafting, salvage, tempering, persistence, and the final Town controls.
* Removed duplicate startup scheduling for extensions already loaded directly by `index.html` while preserving classic script order and the remaining intentional dynamic loaders.
* Escaped merchant-stock fields before Town HTML rendering and added a hostile saved-stock regression fixture.
* Verified the resulting baseline with the 43/43 compact suite, including the 20-boss readiness matrix and 36,000 seeded combat fights.
* No combat, boss scaling, rewards, economy, upgrade values, save schema, progression, Revisit behavior, or dungeon entry changed.

---

## v1.26.4.04 - Boss Curve Release

* Promoted the recent combat-surface cleanup and post-Boss-2 boss smoothing work into the live mainline release.
* Boss 3 onward now follow a recoverable power ladder instead of the old 3,600+ PWR Boss 3 spike, while Boss 1 and Boss 2 keep their existing tuned ranges.
* Existing over-scaled active boss saves repair combat stats on reload while preserving current HP percentage and rewards.
* The full 20-boss combat matrix still requires every post-Boss-2 encounter to be beatable by its fully upgraded district fixture; all 18 currently pass.
* No normal-monster scaling, reward formulas, gear-upgrade values, progression, Revisit behavior, or dungeon entry changed.

---

## v1.26.4.01 - Combat CSS Authority Playtest

* Moved the existing four-column combat HUD and action-bar layout contract into the final visual-weight stylesheet so one loaded layer owns the play-test presentation.
* Standardized the existing four combat-action gaps at 6px while preserving the established Attack, Ashburst, Guard, and Extract controls and 46px minimum touch target.
* Removed the superseded cross-layer combat-bar declarations from the lore stylesheet without changing combat markup, math, timing, rewards, saves, or dungeon entry.
* Follow-up balance pass: Boss 3 onward now use a recoverable power ladder instead of the old 3,600+ PWR Boss 3 spike. Existing over-scaled active boss saves repair combat stats on reload while preserving current HP percentage and rewards.
* The full 20-boss combat matrix now requires every post-Boss-2 encounter to be beatable by its fully upgraded district fixture; all 18 currently pass.
* No new combat panels, controls, artwork, effects, dependencies, or gameplay systems were added.

---

## v1.26.4 - Mobile Interface + Release Hygiene

* Implemented GitHub #116 by keeping mobile navigation above documented safe-area/browser-control boundaries while preserving route order and destinations.
* Implemented #117 and #119 by clarifying the rest-cost hierarchy and consolidating equivalent Town presentation tokens without changing costs, actions, or Town structure.
* Implemented #118 by protecting the established mobile combat-control placement without changing combat actions, timing, or math.
* Implemented #120 and #123 by hardening Journal/Archive wrapping and improving status, rarity, and disabled-state contrast/non-color cues without changing record data or rarity meaning.
* Implemented #121 and #122 by adding focus return, modal-only scroll locking, safe-area/stacking protection, keyboard-operable gear inspection, stable upgraded/duplicate-name gear lookup, and safer touch-target sizing/spacing without changing underlying action semantics.
* Implemented #124 with an exact-path asset provenance/usage manifest, an explicit Northline Studio asset-policy link, and a release checklist gate for untracked or undocumented assets.
* Implemented #125 with one documented `VERSION.md` authority flow for semantic/build-cache labels and field-level mismatch reporting.
* Fixed the closed desktop-pointer side rail so its discoverable rail no longer covers Town content at narrow widths.
* Hardened the Town screenshot helper to apply realistic touch profiles before page initialization and verify touch media state before capture.
* Preserved the upstream v1.26.3.02 Town runtime cleanup: the canonical wallet renderer remains, while obsolete systems 20, 26, and 27 stay retired from source loading and service-worker precache.
* Local verification completed with the 41/41 compact suite, 14/14 mobile-layout contract smoke, 19/19 interface/accessibility smoke, 11/11 dungeon-entry runtime smoke, and inspected touch and fine-pointer captures at 390×844, 430×932, and 768×1024.
* Corrected intro Roadmap copy so only the live Trophy Echo lane is described as available; Famous Gear Memory and Rival Trace remain locked, with no Revisit behavior change.
* Real-device/Textastic drawer tapping and keyboard interaction remain handoff checks; the local touch-emulation captures and behavioral fixtures do not replace physical-device validation.
* No itch/package builder was run and no release package was created for this work.
* Preserved save compatibility, combat/player/monster/boss math, rewards, economy, Merchant Gear Upgrade costs/caps/effects, dungeon entry, Talent, Debt, progression, and Trophy Echo-only Revisit behavior.

---

## v1.26.3.02 - Town Runtime Layer Cleanup

* Consolidated the Town currency strip under one runtime owner while preserving Coin, Spark, Shards, Ember, and Favor output.
* Removed the redundant Spark Source pill from canonical Lowfire Board markup and retired its CSS-only cleanup layer.
* Removed obsolete Town currency and inert interface cleanup runtime files from public loading and service-worker precache.
* Preserved all currency values, prices, rewards, progression, combat, saves, Revisit behavior, and dungeon entry.

---

## v1.26.3.01 - Boss Scaling Matrix Smoke Hardening

* Locked deterministic min/mid/max combat snapshots for all 20 named bosses and the D40, D90, and D800 scaling boundaries.
* Locked the legal pre-boss fixture summaries and 180 combat summaries from 36,000 seeded real fights against silent drift.
* Added hard combat-metric integrity checks, retained the explicit Boss 2 650-850 PWR contract, and made the compact suite surface the provisional audit result.
* Preserved all gameplay scaling, combat, rewards, drops, gear, progression, and save behavior.

---

## v1.26.3 - Boss 2 Readiness + Scaling Audit

* Corrected Boss 2's raw-depth-30 power spike from 994-1,239 PWR to 676-842 PWR.
* Added a one-time repair for pre-patch saved Boss 2 combat stats without changing rewards or save schema.
* Added an overmatched warning that directs players to The Ashen Anvil.
* Preserved normal monster scaling, general combat math, rewards, gear upgrade values, the public DevTools gate, and the Trophy Echo-only Revisit surface.

---

## v1.26.2 - Public Runtime Hygiene + Devtools Gate

* Added a single explicit public-runtime devtools gate so internal overlay, scenario, balance-report, and Reset-hold helpers do not load in normal hosted sessions.
* Kept intentional local development access through localhost, `file:` review, and an explicit `?devtools=1` / `?dev=1` query override.
* Removed devtools-only files from the public service-worker precache manifest and added smoke coverage for the new runtime gate.
* Preserved Trophy Echo as the only active Revisit lane.
* No combat, save, rewards, drops, scaling, dungeon entry, Debt math, Talent behavior, gear, monster, or economy behavior changed.

---

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
