# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.23.8 Merchant Gear Upgrades`
* Current local package baseline: `v1.23.8 Merchant Gear Upgrades`
* Current development target: `v1.23.8 Merchant Gear Upgrades`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

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
* The Journal summarizes boss trophies, Revisit history, famous gear memories, rival traces, Debt status, merchant-upgrade records, and boss-progress records using existing save data only.
* The Journal does not add rewards, start/complete actions, spending, borrowing, repayment, or progression hooks.
* Added `smoke_journal_v1233.mjs` to verify the read-only model/render contract and safe empty/populated states.
* Bumped public/runtime/cache labels to `v1.23.3` with build query `1.23.3-guild-journal-memory-board`.

---

## v1.23.2 - Revisit v1 Completion Verification

* Verified Revisit v1 around three live town lanes: Trophy Echo, Famous Gear Memory, and Rival Trace.
* Trophy Echo remains tied to boss trophy or boss record history, starts from town, resolves from town, records history, and preserves Memory Marks through reload.
* Famous Gear Memory remains tied to retired gear archive history, starts from town, resolves from town, records archive history, and does not return the retired item as loot.
* Rival Trace is treated as the third live Revisit lane: named rival elite history can start a safe archive trace, resolve it from town, and record trace history without opening a new hunt, board mission, combat path, reward loop, or progression shortcut.
* `smoke_revisit_routes_v173.mjs` is the primary verification target and covers availability, start, active reload persistence, completion history, duplicate blocking, locked future lanes, and adjacent-system neutrality.
* No version bump, combat changes, gear stat changes, economy changes, Debt changes, or main dungeon progression changes were added.

---

## v1.23.2 - Famous Gear Memory Revisit

* Added a focused Famous Gear Memory state-shape patch so older saves and fixtures repair `player.revisitState.famousGear` before the town lane reads, starts, or resolves it.
* Famous Gear Memory now has the needed live-state safety shape for `active`, `history`, `completedKeys`, and `lastResult`, including recovery for an active route key with missing active memory data.
* Kept the lane archive-only: the retired item stays retired, and the loop does not change combat, gear stats, economy, or main dungeon progression.
* Bumped public/runtime/cache labels to `v1.23.2` with build query `1.23.2-famous-gear-memory-revisit`.
* Added the Famous Gear Memory state patch to the HTML load order and service worker cache list.
* Added the current Debt Collector completion script to the service worker cache list so cached builds match the current HTML script list.
* Fixed the runtime monster cue helper so it uses the passed monster name instead of stale variable references.
* Existing Revisit smoke coverage checks Famous Gear availability, start, active reload persistence, completion history, duplicate blocking, and ledger neutrality.

---

## v1.23.1 - Trophy Echo Prototype Stabilization

* Hardened Trophy Echo save normalization, active-state validation, and duplicate-blocking checks without expanding the lane.
* Clarified the Revisit town copy so the playable Trophy Echo lane stays distinct from the still-inactive planned lanes.
* Tightened revisit smoke coverage for duplicate start/resolve blocking, reload persistence, and the existing Memory Mark contract.

---

## v1.23.1 - Trophy Echo Prototype Stabilization

* Activated Trophy Echo as the first live Revisit lane in town.
* Trophy Echo now locks against missing boss history, opens from boss trophy history, starts a short active memory, resolves in town, and records completion history in save data.
* Added a Revisit-only `Memory Mark` result that persists through save and reload without touching combat, gear stats, monster scaling, or broad progression activation.
* Famous Gear Memory remains inactive/planned, and the primary dungeon path remains Enter Dungeon / Continue Run.

---

## v1.22.0 - Trophy Echo Content Seed

* Trophy Echo now has a small content seed for future replay-memory flavor.
* Added short player-facing echo hooks around boss trophies, prior victories, and archive memory.
* Kept Revisit locked, preview-only, and non-playable, with no route entry, claim, completion, reward, or save mutation.
* Preserved Debt Collector behavior, combat behavior, economy behavior, and the existing build-label contract.
