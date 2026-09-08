# DungeonDex v1.29.0 Drowned Reliquary — Local Release Candidate

**Status:** verified locally; deliberately not published, uploaded, tagged, committed, or pushed.

## Release baseline and package alignment

| Surface | Verified state |
|---|---|
| Starting playable runtime | v1.28.2 |
| Latest publicly downloadable itch package | DungeonDex_v1.27_ItchReady (2).zip |
| Candidate runtime and package version | v1.29.0 — Drowned Reliquary |
| Candidate package | archive/packages/DungeonDex_v1.29.0_ItchReady.zip |
| Package size | 2,671,145 bytes |
| SHA-256 | 19B76F3AD8931BAEC8839B2B7FEFDC984337646CA8885F9282FCD18C1D0072C7 |

The itch-downloadable package is **not aligned** with this candidate: it remains the observed v1.27 package. No external operation was performed to change that state.

## Files changed

- Runtime and release labels: index.html, app.js, sw.js, 00_core_constants_data.js, 06_scaling_generation_audits.js, 07_player_combat_runtime.js, 21_build_label_guard.js, 31_revisit_activation_surface_lockdown.js, 38_journal_v1.js, and 44_revisit_lowfire_board_slot.js.
- Focused coverage and suite wiring: smoke_compact_suite.mjs, reliquary_browser_checks.mjs, smoke_drowned_reliquary_events_v1290.mjs, smoke_drowned_reliquary_content_slice_v1.mjs, smoke_drowned_reliquary_vertical_slice_v1281.mjs, smoke_boss_scaling_matrix_v1.mjs, smoke_app_wiring_cache_manifest_v1.mjs, smoke_enter_dungeon_runtime_v1.mjs, smoke_public_copy_v1260.mjs, smoke_public_revisit_trophy_only_v1261.mjs, smoke_revisit_archive_codex_v174.mjs, smoke_revisit_famous_gear_flavor_v175.mjs, smoke_revisit_routes_v173.mjs, and smoke_town_runtime_cleanup_v126302.mjs.
- Release authority and handoff material: AGENTS.md, VERSION.md, README.md, CHANGELOG.md, CURRENT_ARCHITECTURE.md, VERSION_CACHE_AUTHORITY.md, CURRENT_NOTES.md, REAL_DEVICE_HANDOFF_V128.md, RELEASE_CANDIDATE_V128.md, ROADMAP_V128.md, TODAY_AGENT_ROADMAP.md, ROADMAP_NEXT_PHASE.md, and this record.

## Player-facing chapter behavior

- Drowned Reliquary remains a data-first district chapter across its authored floors, encounter families, elite variants, flavor, and Seventh-Toll Bell-Keeper finale.
- Three authored Reliquary incidents now enter through the existing between-encounter pending-event flow. Their choices use existing damage, healing, salvage, Ember, gear, and pending-reward behavior.
- The D40 Seventh-Toll Bell-Keeper finale presents a mandatory final-choice event immediately before the normal finale encounter. It does not alter entry, routing, boss, combat, extraction, replay, or reward frameworks.
- Reliquary event gear uses the existing item pipeline and is visibly attributed to Drowned Reliquary. Existing rarity, slots, comparison, selling, and merchant upgrades remain authoritative.
- The existing Journal, Archive, Notice Board, Contracts, and Trophy Echo Revisit surfaces keep their chapter-facing Reliquary presentation. Trophy Echo remains the sole active Revisit lane.

## Compatibility and regression evidence

- No save migration or new persistent top-level state was introduced. The event state uses the existing active-run event field, and old active saves that omit it load safely.
- Existing combat formulas, turn order, damage/status rules, rewards, loot rolls, difficulty scaling, Talent, Debt, merchant economy, Charters, and Revisit behavior were not changed.
- smoke_drowned_reliquary_events_v1290.mjs covers event entry, all three random incidents, finale timing, reward handling, run continuation, event loot attribution, old-save loading, and save/reload while a finale event is pending.
- The Reliquary vertical-slice regression compares generated content with the base runtime across 1,900 seeded cases; its scaling matrix covers 36,000 real combat fights.

## Verification record

- Compact suite: **64/64 passed**.
- Public browser runtime console gate: **48/48 passed**, including a complete Reliquary loop and event resolution.
- Package builder: syntax checks, compact suite, staged package check, root-level ZIP structure check: **passed**.
- Independently extracted candidate package check: **52 paths checked, 0 warnings**.
- Mobile layout, touch geometry, accessibility, computed contrast, save, combat, loot, economy, Debt, Talent, Charter, Journal, Archive, and Trophy Echo/Revisit checks all passed through the compact suite.

## Review handoff

The candidate is ready for explicit review at archive/packages/DungeonDex_v1.29.0_ItchReady.zip. Publishing it would be the action that aligns the itch-downloadable package; that action remains intentionally pending.
