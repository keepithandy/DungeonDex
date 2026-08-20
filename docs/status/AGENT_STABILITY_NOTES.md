# DungeonDex Agent Stability Notes

## Current v1.28.1 Drowned Reliquary Target

- Current target: `v1.28.1 Drowned Reliquary: First Descent`.
- Current build/cache label: `1.28.1-drowned-reliquary-first-descent`.
- D31-D40 is owned by the Drowned Reliquary. Do not restore the previous gap behavior that allowed those depths to inherit Final Lowflame presentation.
- Bell-Drowned Warden and Siltbound Reliquary Lurker are identity-only encounter overlays. Keep numeric stats, scaling, rewards, loot, elite handling, and RNG ownership in the established generator.
- Preserve the existing 15-depth boss cadence. There is no boss slot inside D31-D40, and v1.28.1 must not add or move one.
- Preserve rarity weights, multipliers, caps, drop rates, deep scarcity, Mythic-set chances, combat, scaling, rewards, economy, saves, upgrades, dungeon entry, Debt, Talent, progression, and Trophy Echo-only Revisit behavior until a focused roadmap patch explicitly scopes and verifies a change.
- Local non-browser verification passes, including 88-file syntax, the Reliquary slice, the rarity audit, 20-boss/36,000-fight matrix, app wiring, protected systems, and strict 51-path source audit. The compact result is 49/55 passed, one skipped, and five unchanged environment-only failures caused by missing Chromium and PowerShell.
- The local v1.27 itch-ready ZIP remains the latest authorized package. v1.28.1 has no package, tag, or itch.io upload.

## Historical v1.28.0 Rarity Baseline Target

- Historical target: `v1.28.0 Rarity Baseline`.
- Historical build/cache label: `1.28.0-rarity-baseline`.
- The runtime-backed rarity audit owns the drop/rarity baseline. Do not tune against `tools/simulate_deep_scaling.py` or another copied formula model when the runtime audit can measure the active implementation directly.
- v1.28.0 recorded, but did not alter, the early/mid elite gear-frequency crossover, the D40 Mythic-set/scarcity boundary, and the four-set duplicate burden.
- Its local non-browser verification passed, including the expanded rarity audit, 20-boss/36,000-fight matrix, app wiring, protected systems, and strict source audit. The compact result was 47/53 passed, one skipped, and five unchanged environment-only failures caused by missing Chromium and PowerShell.
- Remote commit `3e5ab1fa7a5c1f9f17c73f65501f9d1bd42d3c8f` records v1.28.0 on `work/v1.28.0-rarity-audit`.

## Historical v1.27 The Contract Board Target

- Historical target: `v1.27 The Contract Board`.
- Historical build/cache label: `1.27-the-contract-board`.
- #139-#145 deliver the clearer three-hunt Elite Contract Board, exact-target combat cue, one-time fulfillment/claim clarity, read-only Guild Journal records, protected-system audit, and final package pass.
- #138 adds the equipped Offhand Merchant Gear Upgrade path: `+1 Guard` and `+1 Wit` per tier through `+3`, with the established `50c`, `125c`, and `250c` costs. Weapon and Armor upgrade values remain unchanged.
- The feature reuses the existing `upgradeLevel` save field; no Offhand card or action is exposed until an Offhand is equipped.
- Validation passed: compact suite 49/49; Merchant Gear Upgrades; Guild Journal; app-wiring/cache authority; public runtime console 18/18; Enter Dungeon 11/11; interface/accessibility 22/22; mobile layout 19/19; supported touch-geometry profiles; and the source package audit with 51 paths and zero warnings.
- The v1.26.5 Journal Chronicle, browser-computed contrast, touch-navigation geometry, and protected-system release gates remain complete and carry forward.
- Preserve the merged v1.26.3.02 Town runtime cleanup: system 25 owns the wallet; systems 20, 26, and 27 remain retired and must not be reloaded or precached.
- The real-device/Textastic Workspace handoff reported all twelve required checks passing. Device, OS, browser, viewport, and screenshot metadata were not captured, so retain that evidence-quality limitation in future release records.
- The screenshot helper defaults to applying touch/mobile metrics before page initialization and verifying touch media state; `--fine-pointer` provides the separate narrow desktop-pointer audit. Neither mode replaces a real-device tap check.
- The side rail may remain discoverable when closed, but it must not cover Town, combat, Journal, modal, or other active content.
- `archive/packages/DungeonDex_v1.26.6_ItchReady_Review.zip` is the prior review artifact. The final local v1.27 artifact is `archive/packages/DungeonDex_v1.27_ItchReady.zip`; upload and tagging still require separate owner authorization.
- The owner approved a physical-device exception for the local v1.27 package after automated touch/mobile and extracted-runtime checks passed. Run a fresh Textastic/device pass before itch.io upload when practical.
- Trophy Echo remains the only active Revisit lane. Save, combat, rewards, economy, upgrades, dungeon entry, Talent, Debt, progression, and Revisit behavior remain protected.
- Runtime ownership is intentionally singular for Ashen Anvil heading copy, monster cues, Lowfire Forge presentation, and direct startup extensions; do not restore duplicate definitions or duplicate direct/dynamic loads.

## Historical v1.25.2 Stability Baseline

Use these notes when continuing work after the Revisit relocation/mobile lag regression.

## Historical Stability Decision

- `js/systems/44_revisit_lowfire_board_slot.js` now owns a focused Revisit source-slot bridge after the no-op rollback.
- Do not reintroduce the old post-render relocation loop.
- Do not use document-wide `MutationObserver` sweeps to move town panels after render.
- Revisit placement work must stay scoped to UI placement only; lane status, start, resolve, reward, completion, and history behavior remain protected.
- The cache/build label for that historical bridge patch was `1.25.2-revisit-source-slot`.

## Required Agent Behavior

- Confirm `VERSION.md` before changing version labels.
- Treat `VERSION.md` as the current semantic-version and build/cache authority.
- Follow `docs/VERSION_CACHE_AUTHORITY.md` for propagation and mismatch checks.
- Treat `1.25.2-revisit-source-slot` as historical, not as the current cache/build label.
- Prefer responsiveness and safe rollback/no-op behavior over cosmetic placement work when mobile/touch input is affected.
- If changing cache labels, align every surface listed in `docs/VERSION_CACHE_AUTHORITY.md`, including `VERSION.md`, README, changelog/current notes, `index.html`, `app.js`, `sw.js`, core constants, build-label guard, version-reporting systems, and focused smoke expectations.
- If `index.html` still contains stale labels or query strings, report that conflict before claiming full version alignment.

## Protected Revisit Boundary

Do not change:

- Revisit lane availability logic
- Revisit start/resolve actions
- Revisit completion/history data
- Revisit rewards or memory marks
- Board Echo or Debt Pressure activation state

The next safe Revisit UI issue should verify the source-slot bridge on mobile before changing any source-render markup.
