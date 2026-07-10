# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.25.2 Revisit No-op Stability + Version Alignment`
* Current local package baseline: `v1.25.2 Revisit No-op Stability + Version Alignment`
* Current development target: `v1.25.2 Revisit No-op Stability + Version Alignment`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

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
