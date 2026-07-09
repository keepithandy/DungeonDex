# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.23.8.04**

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

Current status: active flagship browser RPG. The live build includes the core dungeon loop, merchant gear upgrades, Guild Journal memory surfaces, safe Revisit lanes, a Gear-tab upgrade summary, and a click-to-inspect gear detail modal. Board Echo and Debt Pressure remain planned/locked until their focused issues land.

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
- **Gear detail modal:** Click a visible equipped or inventory gear card for a simple read-only rundown.
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
