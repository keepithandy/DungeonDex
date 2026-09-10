# DungeonDex system file map

This folder is an exploratory split of the former monolithic `app.js` into major functional systems.
It preserves classic browser script load order instead of converting the game to ES modules. While numeric naming suggests sequential loading, the actual order in `index.html` reflects dependency constraints and is the source of truth.

- `app.js` — Runtime pointer plus small legacy/fallback helpers that have not been split yet. Keep new gameplay work in `js/systems/*.js` unless a targeted compatibility fix requires this file.
- `00_core_constants_data.js` — Core constants, utility helpers, item/monster/district data.
- `01_state_recovery.js` — Screen/run shell recovery and ID helpers.
- `02_currency_pending_rewards.js` — Currency conversion, pending rewards, discovery banking, reward text helpers.
- `03_town_contracts_market.js` — Gold sinks, elite contracts, district wares, selling helpers.
- `04_depth_progression_charters.js` — Depth labels, district progression, milestones, charters, pricing, encounter coin rewards.
- `05_elite_modifiers.js` — Elite modifier registry, selection, rewards, and markup.
- `06_scaling_generation_audits.js` — Rarity scaling, loot rules, base state, gear/monster generation, scaling audit.
- `07_player_combat_runtime.js` — Derived stats, XP/logs, run start, encounters, combat, quests, shops, rest/forge.
- `08_normalization_save.js` — Item/monster/save normalization and persistence.
- `47_spell_mastery.js` — Spell mastery save model, inscriptions, rare folios, gear affinities, Scriptorium markup, and Journal summary helpers.
- `46_named_loadouts.js` — ID-based named equipment snapshots, duplication/reordering, slot-by-slot safe-apply previews, and accessible Gear-tab controls.
- `09_ui_common_intro.js` — Screen switching, common UI helpers, popups, intro modal.
- `10_ui_town_shop.js` — Elite contract board, town panels, district wares, shop cards.
- `11_ui_run_gear_dex_archive.js` — Run, gear, inventory, Dex, archive renderers.
- `29_monster_backdrops_canvas.js` — Monster backdrop canvas rendering and layer management.
- `12_render_bindings_boot.js` — Sticky bar, render loop, guarded actions, bindings, audits, boot.
- `13_devtools_overlay.js` — Hidden internal DevTools overlay for save inspection, run controls, test loot, snapshots, and error logs.
- `14_devtools_scenarios.js` — DevTools scenario presets and focused state setup helpers.
- `15_devtools_balance_reports.js` — DevTools balance reports and simulation helpers.
- `16_relic_forge_crafting.js` — Lowfire Forge crafting actions and forge state helpers; filename/global names are legacy compatibility only.
- `17_relic_forge_clarity.js` — Lowfire Forge clarity copy and UI support; filename/global names are legacy compatibility only.
- `18_relic_forge_compact_text.js` — Compact Lowfire Forge text adjustments; filename/global names are legacy compatibility only.
- `21_build_label_guard.js` — Build label guard and cache query alignment.
- `22_nav_centering.js` — Navigation centering cleanup.
- `23_boss_header_cleanup.js` — Boss header readability cleanup.
- `24_lowfire_spark_board.js` — Lowfire Spark Board UI/support pass.
- `25_town_wallet_chip_fix.js` — Town wallet chip layout fix.
- `28_debt_collector_foundation.js` — Debt Collector foundation UI and helpers.
- `31_revisit_activation_surface_lockdown.js` — Revisit activation surface lockdown.

## Talent Compatibility

- Talent compatibility is owned by the loaded save-normalization, Debt Collector, and Town systems. Retired compatibility shims are intentionally absent from this map.

Notes:
- `index.html` remains the source of truth for direct runtime order; `app.js` owns its small dynamic extension list.
- `app.js` should stay small. It currently retains build labels, compatibility helpers, and fallback effects that can be split later through targeted system passes.
- This map is documentation only; future passes can split internals further once a target system is chosen.
- Player-facing forge copy now calls the active gear crafting/tempering system `Lowfire Forge`; legacy `relic_*` file names, globals, and save fields remain stable for compatibility.
