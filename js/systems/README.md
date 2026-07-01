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
- `19_warden_talents_lowfire_board.js` — Warden Talent foundation, passive inventory/contracts, and Lowfire Board support.
- `20_town_currency_clean_strip.js` — Compact town currency strip cleanup.
- `21_build_label_guard.js` — Build label guard and cache query alignment.
- `22_nav_centering.js` — Navigation centering cleanup.
- `23_boss_header_cleanup.js` — Boss header readability cleanup.
- `24_lowfire_spark_board.js` — Lowfire Spark Board UI/support pass.
- `25_town_wallet_chip_fix.js` — Town wallet chip layout fix.
- `26_spark_writ_pill_cleanup.js` — Spark writ pill cleanup.
- `27_interface_density_cleanup.js` — Interface density and app-feel cleanup.
- `28_debt_collector_foundation.js` — Debt Collector foundation UI and helpers.
- `30_passive_activation_gate_hotfix.js` — Passive activation gate verification layer.
- `31_revisit_activation_surface_lockdown.js` — Revisit activation surface lockdown.
- `32_talent_award_claim_repair_contract.js` — Talent award claim repair and boss trophy award mutation helpers.
- `33_talent_hunter_board_clarity_spend.js` — Controlled one-node Hunter Board Clarity spend helper and readiness model.
- `34_debt_under_collection_hardening.js` — Debt-owned Under Collection hardening. It derives high pressure from existing Debt Collector pressure, blocks borrowing at pressure 3+, keeps repayment available, and does not activate Talent passive live renderer wiring.
- `smoke_talent_v150b.mjs` — Browser smoke coverage including v1.21.2 button, readiness, reload persistence, and smoke-hardening audits for the controlled Hunter Board Clarity spend.
- `smoke_talent_passive_framework_v1232.mjs` — Focused Node smoke for passive inventory shape, lifecycle flags, guarded Debt Collector clarity, Hunter Board Clarity spend, award preview, and activation gate metadata.

## Talent Passive Contract Vocabulary

- `passiveReady` means the node is learned and eligible for passive helper checks.
- `passiveEnabled` means an approved copy surface may consume the passive.
- `appliesEffect` is reserved for gameplay or state changes.
- `appliesCopyEffect` means display copy changes only.
- `liveRendererWired` means a live renderer intentionally consumes the helper.
- `copyModelRendererWired` means the Debt Collector panel consumes display-only copy-model text without activating the Talent passive.
- `hunter_board_clarity` is the only current controlled spend target and live copy-only passive.
- `debt_collector_clarity` is guarded: contract and copy-model helpers exist, but the live Debt renderer is not wired.
- Debt Collector repayment is a Debt-owned live action; it mutates only wallet and debt balance through the Debt Collector API and does not spend Talent points.
- Debt Collector Under Collection is Debt-owned gameplay behavior. It is derived from existing saved pressure, uses threshold `pressure >= 3`, blocks borrowing while active, keeps repayment available, and does not store a new save field or set Talent `liveRendererWired` true.
- Placeholder passives have generic inventory contracts only and remain preview-only until a future issue adds specific contracts, renderer or gameplay wiring, and smoke coverage.

Notes:
- `index.html` now loads these files directly in order, while `app.js` may also load extension-style hardening files after the classic script stack initializes.
- `app.js` is replaced with a tiny pointer file so future work does not accidentally edit the old monolith.
- This map is documentation only; future passes can split internals further once a target system is chosen.
