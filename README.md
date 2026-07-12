# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.26.0**

## Try It First

Open `index.html` directly in a browser to review the current playable build.

For the safest current validation pass, run:

```bash
node smoke_compact_suite.mjs
```

Focused Revisit placement and Trophy Echo checks are available with:

```bash
node tests/smoke/smoke_revisit_lowfire_source_render_v1252.mjs
```

Current status: active flagship browser RPG. The live build includes the core dungeon loop, side rail navigation for desktop hover/focus and a tiny mobile/touch `←` drawer button, Lowfire Forge gear crafting/tempering, merchant gear upgrades, Guild Journal memory surfaces, Trophy Echo as the only active Revisit lane, a Gear-tab upgrade summary, custom header/Town visual identity assets, and a click-to-inspect gear detail modal.

## Player Promise

DungeonDex is about surviving the Hollow Stair and letting the Guild Journal remember what mattered: trophies, retired gear, rivals, debt pressure, merchant gear upgrades, and safe echoes of past progress.

The project favors:

- readable mobile-first play;
- clear HP-driven encounters;
- records and memories that build from real save history;
- small focused systems over broad rewrites;
- verified, focused patches before bigger content expansion.

DungeonDex is not trying to become an action game, a hidden-stat spreadsheet, a broad live-service framework, or a reward-farming exploit loop.

## What DungeonDex Is

DungeonDex is built around a simple loop:

1. Prepare in town.
2. Enter the Hollow Stair.
3. Fight readable HP-driven encounters.
4. Loot gear.
5. Retire notable gear into the archive.
6. Read Trophy Echo from town when boss history exists.
7. Keep pushing deeper.

## Current Playable / Live Systems

- **Core dungeon loop:** Town preparation, dungeon entry, readable combat, loot, and return flow.
- **Side rail navigation:** Desktop hover/focus reveal and a tiny mobile/touch `←` drawer button for core routes.
- **Lowfire Forge:** Gear crafting, salvage, and tempering; older internal names remain preserved for existing saves.
- **Custom visual identity:** Decorative DungeonDex crest and Hollow Stair gate art in the header/Town surfaces.
- **Guild Journal:** Read-only memory board for existing records and progression memory.
- **Trophy Echo:** The only active Revisit lane for v1.26.0, tied to boss trophy or boss record history.
- **Merchant gear upgrades:** Spend copper at the Lowfire Market to permanently improve equipped weapon and armor pieces up to +3.
- **Gear detail modal:** Click a visible equipped or inventory gear card for a simple read-only rundown.
- **Debt Collector:** Borrowing, repayment, pressure, and collection status with clearly stated terms.

## Planned / Locked Systems

These systems may exist in old history or compatibility files, but they are not part of the active Revisit surface in v1.26.0:

- **Famous Gear Memory:** Removed from the active Revisit surface.
- **Rival Trace:** Removed from the active Revisit surface.
- **Board Echo:** Removed from the active Revisit surface.
- **Debt Pressure Revisit:** Removed from the active Revisit surface.
- **Asset hygiene:** Source/license inventory for icons, fonts, screenshots, and other public-facing assets.

## Revisit Status

Trophy Echo is the only active Revisit lane for v1.26.0. It stays small and deterministic: if the player has boss trophy history, town surfaces a short memory-reflection loop tied to that boss record.

The Revisit panel stays housed in the Lowfire Board between Warden Objectives and the Lowfire Elite Board. When no boss trophy or boss record exists, the panel shows a locked Trophy Echo state instead of exposing unfinished lane concepts.

Trophy Echo starts and resolves entirely from town. It records completion history, preserves it across reloads, and keeps the main dungeon path separate from memory lanes.
