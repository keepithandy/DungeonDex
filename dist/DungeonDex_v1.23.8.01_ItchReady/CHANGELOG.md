# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.23.8.01 Gear Section Polish`
* Current local package baseline: `v1.23.8.01 Gear Section Polish`
* Current development target: `v1.23.8.01 Gear Section Polish`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

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
* Added a read-only Boss Trophy summary helper for counts, trophy names, source names, latest trophy, legacy detection, duplicate-collapse reporting, and safe empty-state copy.
* The Guild Journal Boss Trophy section now consumes the completed readable summary helper while staying read-only.
* Added `smoke_boss_trophy_v1.mjs` for Boss Trophy persistence, duplicate safety, legacy compatibility, Journal integration, and protected-system neutrality.

---

## v1.23.3 - Guild Journal / Memory Board

* Added the read-only Guild Journal / Memory Board to the Archive surface.
