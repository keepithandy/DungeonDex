# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.23.8**

## Try It First

Open `index.html` directly in a browser to review the current playable build.

For the safest current validation pass, run:

```bash
node smoke_compact_suite.mjs
```

Focused merchant-upgrade checks are available with:

```bash
node smoke_merchant_gear_upgrades_v1238.mjs
```

Current status: active flagship browser RPG. The live build includes the core dungeon loop, merchant gear upgrades, Guild Journal memory surfaces, and safe Revisit lanes. Board Echo and Debt Pressure remain planned/locked until their focused issues land.

## Player Promise

DungeonDex is about surviving the Hollow Stair and letting the Guild Journal remember what mattered: trophies, retired gear, rivals, debt pressure, merchant gear upgrades, and safe echoes of past progress.

The project favors:

- readable mobile-first play;
- clear HP-driven encounters;
- records and memories that build from real save history;
- small focused systems over broad rewrites;
- safe smoke-backed patches before bigger content expansion.

DungeonDex is not trying to become an action game, a hidden-stat spreadsheet, a broad live-service framework, or a reward-farming exploit loop.

## What DungeonDex Is

DungeonDex is built around a simple loop:

1. Prepare in town.
2. Enter the Hollow Stair.
3. Fight readable HP-driven encounters.
4. Loot gear.
5. Retire notable gear into the archive.
6. Revisit safe memory lanes from town.
7. Keep pushing deeper.

## Current Playable / Live Systems

- **Core dungeon loop:** Town preparation, dungeon entry, readable combat, loot, and return flow.
- **Guild Journal:** Read-only memory board for existing records and progression memory.
- **Trophy Echo:** Live Revisit lane tied to boss trophy or boss record history.
- **Famous Gear Memory:** Live Revisit lane tied to retired gear archive history.
- **Rival Trace:** Live Revisit lane tied to named rival elite history.
- **Merchant gear upgrades:** Spend copper at the Lowfire Market to permanently improve equipped weapon and armor pieces up to +3.
- **Debt Collector foundation:** Borrowing, repayment, pressure, and collection status foundation with conservative guardrails.

## Planned / Locked Systems

These systems may appear in docs or locked/planned copy, but they should not be treated as fully playable until their focused issues land:

- **Board Echo v1:** Next safe Revisit memory-lane candidate.
- **Debt Pressure v1:** Debt readability and recovery lane.
- **Public copy smoke coverage:** Stable smoke checks for important player-facing labels.
- **Revisit flavor pass:** Copy polish for live lanes without changing mechanics.
- **Asset hygiene:** Source/license inventory for icons, fonts, screenshots, and other public-facing assets.

## Revisit Status

Trophy Echo is the first live Revisit lane. It stays small and deterministic: if the player has boss trophy history, town can surface a short memory-reflection loop tied to that boss record.

Famous Gear Memory is the second live Revisit lane. It uses retired gear archive history to start a safe town memory, resolve it, and record archive history without returning the item as a reward.

Rival Trace is the third live Revisit lane. It uses named rival elite history to start a safe archive trace from town, resolve it, and record trace history without opening a new hunt, board mission, combat path, or reward loop.

The Revisit prototype starts and resolves entirely from town. It records completion history, preserves it across reloads, and keeps the main dungeon path separate from memory lanes.

Debt Pressure and Board Echo remain locked/planned.

## Open Issue Roadmap

The current open issue set is split into four safe lanes:

1. **Playable/system completion** — Board Echo v1 and Debt Pressure v1.
2. **Identity layer** — premise, glossary, lore, factions, player-facing copy, README, and title/loading direction.
3. **Visual/public readiness** — visual rules, title/logo direction, screenshot plan, and asset inventory.
4. **Smoke hardening** — stable public-label coverage once copy targets settle.

See:

- `docs/OPEN_ISSUE_SWEEP.md`
- `docs/PLAYABLE_SYSTEMS_QUEUE.md`
- `docs/IP_LAYER_GUIDE.md`
- `docs/ASSET_INVENTORY.md`
- `docs/PACKAGE_STRUCTURE.md`
- `docs/status/CURRENT_NOTES.md`

## Current Build

**v1.23.8 - Merchant Gear Upgrades Replace Talent System**

This build replaces the active Talent tree with Merchant Gear Upgrades. The Lowfire Market now lets the player spend copper to permanently improve equipped weapon and armor pieces up to +3, with item-level persistence, exact upgrade costs, and live stat application.

Old Talent ledger/learned data remains inert compatibility state only. The Gear surface and Guild Journal now point at merchant upgrades instead of Talent preview copy.

The build label, runtime pointer, service worker cache name, and version authority now target v1.23.8.

## Current Smoke Target

Run the compact smoke suite after this patch:

```bash
node smoke_compact_suite.mjs
```

Focused merchant-upgrade checks are available with:

```bash
node smoke_merchant_gear_upgrades_v1238.mjs
```

That smoke covers merchant panel rendering, upgrade purchase rules, save/reload persistence, cap enforcement, malformed upgrade repair, Talent compatibility neutrality, and Journal integration.

For the current open-issue sweep, documentation-only validation should also include:

```bash
git diff --check
```

## Package Structure

The root folder should stay limited to browser/runtime entry files, version/history files, and the stable compact smoke runner. Status notes now live in `docs/status/`, and package-layout rules live in `docs/PACKAGE_STRUCTURE.md`.

Individual smoke scripts currently remain at the root because several scripts load runtime files relative to their own location. Move them into `tests/smoke/` only as a separate path-aware migration that updates the compact runner, README commands, status notes, and any script-local file loading.

## Previous Build

**v1.23.5 - Famous Gear Memory v1 Completion**

This build completed Famous Gear Memory v1 as a durable progression memory system. Famous Gear records normalize into a readable canonical shape, duplicate records collapse safely, save/reload preserves modern and legacy memory state, and the Guild Journal shows the player-facing Famous Gear summary.

## Previous Build

**v1.23.4 - Boss Trophy v1 Completion**

This build completed Boss Trophy v1 as a durable progression memory system. Boss Trophy records normalize into a readable canonical shape, duplicate records collapse safely, save/reload preserves modern and legacy trophy state, and the Guild Journal shows the player-facing Boss Trophy summary.

## Previous Build

**v1.23.3 - Guild Journal / Memory Board**

This build added the read-only Guild Journal memory board in the Archive surface. It summarizes existing Revisit, Debt, Talent, and boss-progress records using safe read-only state only.

## Previous Build

**v1.23.2 - Famous Gear Memory Revisit**

This patch hardened the Famous Gear Memory lane so older saves and fixtures always repair `player.revisitState.famousGear` before town start/resolve actions use it. The lane stays archive-only: retired gear remains retired, and the memory does not alter combat, gear stats, economy, Talent values, or main dungeon progression.

## Previous Build

**v1.23.1 - Trophy Echo Prototype Stabilization**

This patch hardened the first playable Revisit loop. Trophy Echo locks against missing boss history, opens from real boss records, starts an active memory, resolves in town, records completion history, and persists Memory Marks across reloads.

No dungeon combat path, debt math, gear stats, monster scaling, or broader Talent activation was added.

## Previous Build

**v1.20.47 - Hunter Board Clarity Spend Preview**

This patch added a read-only preview of the first safe Talent spend target, `hunter_board_clarity`. It did not spend points, learn nodes, mutate save state, enable spending, or add Talent unlock UI.

## Previous Build

**v1.20.46 - First Controlled Boss Trophy Talent Award**

This patch enabled the first controlled Boss Trophy Milestone Talent point award path behind the live gate. The award is atomic: one point, one claim record, and duplicate claims block repeat awards.

## Previous Build

**v1.20.41 - Talent Award Claim Tracking Plan**
