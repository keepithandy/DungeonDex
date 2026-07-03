# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.23.3**

## Revisit Status

Trophy Echo is the first live Revisit lane. It stays small and deterministic: if the player has boss trophy history, town can surface a short memory-reflection loop tied to that boss record.

Famous Gear Memory is the second live Revisit lane. It uses retired gear archive history to start a safe town memory, resolve it, and record archive history without returning the item as a reward.

Rival Trace is the third live Revisit lane. It uses named rival elite history to start a safe archive trace from town, resolve it, and record trace history without opening a new hunt, board mission, combat path, or reward loop.

The Revisit prototype starts and resolves entirely from town. It records completion history, preserves it across reloads, and keeps the main dungeon path separate from memory lanes.

Debt Pressure and Board Echo remain locked/planned.

## Current Build

**v1.23.3 - Journal v1 Memory Ledger**

This build adds the read-only Journal v1 memory ledger in the Archive surface. It summarizes Revisit, Debt, Talent, and boss progress records using existing state only, and keeps the ledger separate from combat, gear stats, economy, Talent spending, Debt mutation, and main dungeon progression.

The build label, runtime pointer, service worker cache name, and version authority now target v1.23.3.

## Current Smoke Target

Run the Revisit smoke after this patch:

```bash
node smoke_revisit_routes_v173.mjs
```

That smoke covers Trophy Echo, Famous Gear Memory, Rival Trace, reload persistence, duplicate blocking, and neutrality around adjacent systems.

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

This patch defines the planned claim path, deterministic key format, record shape, and duplicate-prevention rules for future Boss Trophy Milestone awards. It does not add save fields, award points, enable spending, or add Talent unlock UI.

## Previous Build

**v1.20.40 - Talent Point Award Contract Dry Run**

This patch adds a read-only Boss Trophy Milestone award eligibility preview. It does not award points, add claim tracking, enable spending, or add Talent unlock UI.

## Previous Build

**v1.20.39 - Talent Point Source Decision**

This patch selects Boss Trophy Milestone as the first Talent point source and keeps point earning, spending, unlocks, and gameplay behavior disabled.

## Previous Build

**v1.20.36 - Live Debt Clarity Renderer Wiring**

This patch wires the existing Debt Collector clarity copy model into the live Debt panel for learned state only. The live panel remains text-only, nonredundant, and gameplay-neutral.

## Previous Build

**v1.20.33 - Revisit Activation Surface Lockdown**

This patch fully de-exports dormant Revisit start/active-summary surfaces from the public Elite Contracts API and adds a read-only lockdown report. Revisit remains planning-only; Enter Dungeon / Continue Run remains the only active dungeon entry path.

## Previous Build

**v1.20.8 - Owed Money Text Fix**

This patch fixes the Debt Collector Owed line so text-rendered debt summaries show clean coin notation like `Owed 5s` instead of raw money span markup.

Latest confirmed commit is the repository HEAD for the current baseline.

## What DungeonDex Is

DungeonDex is built around a simple loop:

1. Prepare in town.
2. Enter the Hollow Stair.
3. Fight readable HP-driven encounters.
4. Loot gear.
5. Retire notable gear into the archive.
6. Revisit safe memory lanes from town.
7. Keep pushing deeper.
