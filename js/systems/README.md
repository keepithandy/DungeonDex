# DungeonDex system file map

This folder is an exploratory split of the former monolithic `app.js` into major functional systems.
It preserves classic browser script load order instead of converting the game to ES modules. While numeric naming suggests sequential loading, the actual order in `index.html` reflects dependency constraints and is the source of truth.

- `00_core_constants_data.js` — Core constants, utility helpers, item/monster/district data.
- `01_state_recovery.js` — Screen/run shell recovery and ID helpers.
- `02_currency_pending_rewards.js` — Currency conversion, pending rewards, discovery banking, reward text helpers.
- `03_town_contracts_market.js` — Gold sinks, elite contracts, district wares, selling helpers.
- `31_revisit_activation_surface_lockdown.js` — Revisit activation surface lockdown.
- `04_depth_progression_charters.js` — Depth labels, district progression, milestones, charters, pricing, encounter coin rewards.
- `05_elite_modifiers.js` — Elite modifier registry, selection, rewards, and markup.
- `06_scaling_generation_audits.js` — Rarity scaling, loot rules, base state, gear/monster generation, scaling audit.
- `07_player_combat_runtime.js` — Derived stats, XP/logs, run start, encounters, combat, quests, shops, rest/forge.
- `08_normalization_save.js` — Item/monster/save normalization and persistence.
- `09_ui_common_intro.js` — Screen switching, common UI helpers, popups, intro modal.
- `10_ui_town_shop.js` — Elite contract board, town panels, district wares, shop cards.
- `11_ui_run_gear_dex_archive.js` — Run, gear, inventory, Dex, archive renderers.
- `29_monster_backdrops_canvas.js` — Monster backdrop canvas rendering and layer management.
- `12_render_bindings_boot.js` — Sticky bar, render loop, guarded actions, bindings, audits, boot.
- `13_devtools_overlay.js` — Hidden internal DevTools overlay for save inspection, run controls, test loot, snapshots, and error logs.
- `14_devtools_scenarios.js` — DevTools scenario presets and focused state setup helpers.
- `15_devtools_balance_reports.js` — DevTools balance reports and simulation helpers.
- `16_relic_forge_crafting.js` — Relic Forge crafting actions and forge state helpers.
- `17_relic_forge_clarity.js` — Relic Forge clarity copy and UI support.
- `18_relic_forge_compact_text.js` — Compact Relic Forge text adjustments.
- `19_warden_talents_lowfire_board.js` — Warden Talent foundation and Lowfire Board support.
- `20_town_currency_clean_strip.js` — Compact town currency strip cleanup.
- `21_build_label_guard.js` — Build label guard and cache query alignment.
- `22_nav_centering.js` — Navigation centering cleanup.
- `23_boss_header_cleanup.js` — Boss header readability cleanup.
- `24_lowfire_spark_board.js` — Lowfire Spark Board UI/support pass.
- `25_town_wallet_chip_fix.js` — Town wallet chip layout fix.
- `26_spark_writ_pill_cleanup.js` — Spark writ pill cleanup.
- `27_interface_density_cleanup.js` — Interface density and app-feel cleanup.
- `28_debt_collector_foundation.js` — Debt Collector foundation UI and helpers.
- `30_passive_activation_gate_hotfix.js` — Passive activation gate verification hotfix.
- `31_revisit_activation_surface_lockdown.js` — Revisit activation surface lockdown.
- `32_talent_award_claim_repair_contract.js` — Talent award claim repair and boss trophy award mutation helpers.
- `33_talent_hunter_board_clarity_spend.js` — Controlled one-node Hunter Board Clarity spend helper and readiness model.
- `smoke_talent_v150b.mjs` — Browser smoke coverage including v1.21.2 button, readiness, reload persistence, and smoke-hardening audits for the controlled Hunter Board Clarity spend.

Notes:
- `index.html` now loads these files directly in order.
- `app.js` is replaced with a tiny pointer file so future work does not accidentally edit the old monolith.
- This map is documentation only; future passes can split internals further once a target system is chosen.
