# DungeonDex system file map

This folder is an exploratory split of the former monolithic `app.js` into major functional systems.
It preserves classic browser script load order instead of converting the game to ES modules, so the files should stay loaded in numeric order.

- `00_core_constants_data.js` — Core constants, utility helpers, item/monster/district data.
- `01_state_recovery.js` — Screen/run shell recovery and ID helpers.
- `02_currency_pending_rewards.js` — Currency conversion, pending rewards, discovery banking, reward text helpers.
- `03_town_contracts_market.js` — Gold sinks, elite contracts, district wares, selling helpers.
- `04_depth_progression_charters.js` — Depth labels, district progression, milestones, charters, pricing, encounter coin rewards.
- `05_elite_modifiers.js` — Elite modifier registry, selection, rewards, and markup.
- `06_scaling_generation_audits.js` — Rarity scaling, loot rules, base state, gear/monster generation, scaling audit.
- `07_player_combat_runtime.js` — Derived stats, XP/logs, run start, encounters, combat, quests, shops, rest/forge.
- `08_normalization_save.js` — Item/monster/save normalization and persistence.
- `09_ui_common_intro.js` — Screen switching, common UI helpers, popups, intro modal.
- `10_ui_town_shop.js` — Elite contract board, town panels, district wares, shop cards.
- `11_ui_run_gear_dex_archive.js` — Run, gear, inventory, Dex, archive renderers.
- `12_render_bindings_boot.js` — Sticky bar, render loop, guarded actions, bindings, audits, boot.
- `13_devtools_overlay.js` — Hidden internal DevTools overlay for save inspection, run controls, test loot, snapshots, and error logs.

Notes:
- `index.html` now loads these files directly in order.
- `app.js` is replaced with a tiny pointer file so future work does not accidentally edit the old monolith.
- This is intended as a review/refactor staging pass; future passes can split internals further once a target system is chosen.
