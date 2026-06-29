# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.23.1**

## Revisit Status

Trophy Echo is now the first live Revisit lane. It stays small and deterministic: if the player has boss trophy history, town can surface a short memory-reflection loop tied to that boss record.

The prototype starts and resolves entirely from town. It records completion history, preserves it across reloads, and awards a Revisit-only Memory Mark instead of touching combat, gear, debt, or broader progression systems.

Famous Gear Memory stays the second planned lane as inert metadata only, and Enter Dungeon / Continue Run remains the only primary dungeon entry path.

## Current Build

**v1.23.1 - Trophy Echo Prototype Stabilization**

This patch hardens the first playable Revisit loop. Trophy Echo still locks against missing boss history, opens from real boss records, starts an active memory, resolves in town, records completion history, and persists Memory Marks across reloads.

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
5. Extract safely or risk deeper progress.
6. Build long-term records through trophies, gear memory, contracts, and archive systems.

The game favors clarity over mechanical bloat. Combat is intentionally direct: Common, Elite, and Boss enemies are the main combat tiers.

## One-Minute Visitor Summary

DungeonDex is a mobile-first browser RPG prototype with a compact dungeon loop and a strong release-hygiene habit. The project is not just a game surface; it is also a living example of safe incremental development, smoke-tested feature gates, preview-only systems, and careful separation between live gameplay and planned mechanics.

A visitor should read this repo as:

* A playable dungeon crawler foundation.
* A portfolio project showing disciplined JavaScript development.
* A testbed for safe RPG systems such as Talents, Revisit routes, Debt Collector clarity, Elite Board contracts, and long-term gear memory.

## Live vs Planned Systems

Live gameplay systems:

* Town preparation
* Dungeon entry through Enter Dungeon / Continue Run
* Readable HP-based combat
* Gear inventory and equipment
* Merchant stock
* Relic Forge
* Elite Board contracts
* Rival elite memory
* Boss trophy records
* Retired gear archive
* Famous Gear memory
* Monster backdrop canvas visuals
* Boss Trophy Milestone Talent point source
* Controlled Hunter Board Clarity Talent spend

Preview, planning, or guarded systems:

* Broader Talent tree UI remains locked and preview-only.
* Revisit routes are not playable yet.
* Revisit lanes, route previews, unlock gates, and activation summaries are planning surfaces only.
* Debt Collector clarity is display/copy focused and does not change debt math or economy behavior.
* Monster backdrop visuals do not change combat, rewards, scaling, routes, saves, debt, Talents, or Elite Board behavior.

## Screenshot and Media Capture Plan

Future screenshots or short clips should focus on showing the project clearly instead of flooding the repo with every possible panel.

Recommended capture targets:

* Town overview: the main preparation surface and current system entry points.
* Combat screen: readable HP-first combat with the monster backdrop visible.
* Gear and equipment: inventory, equipped items, and loot progression.
* Elite Board: optional challenge contracts and Hunter Board Clarity copy behavior.
* Debt Collector: display-focused debt clarity without implying economy changes.
* Talent panel: locked preview state, Boss Trophy point source, and controlled Hunter Board Clarity spend surface.
* Revisit preview: planned lanes and locked route language that clearly communicates non-playable status.
* Archive/Famous Gear memory: long-term gear history and retired item identity.

Suggested future media paths, once assets are ready:

* `docs/media/town-overview.png`
* `docs/media/combat-backdrop.png`
* `docs/media/gear-inventory.png`
* `docs/media/elite-board.png`
* `docs/media/talent-panel.png`
* `docs/media/revisit-preview.png`
* `docs/media/archive-memory.png`

These paths are placeholders for planning only. No screenshot files are required for the current baseline.

## Design Rules

* Keep combat readable and HP-number-driven.
* Avoid hidden monster mechanics.
* Avoid monster affixes, status stacks, or overloaded combat effects.
* Keep the Elite Board as the optional challenge layer.
* Keep mobile-first UI decisions central.
* Preserve town systems as planning, memory, and progression surfaces.
* Do not let preview systems accidentally become gameplay routes.

## Major Systems

Current major systems include:

* Core dungeon run loop
* Town screen
* Gear inventory and equipment
* Merchant stock
* Relic Forge
* Elite Board contracts
* Rival elite memory
* Boss trophy records
* Retired gear archive
* Famous Gear memory
* Debt Collector foundation
* Talent foundation
* Revisit candidate ledger
* Revisit route previews
* Revisit unlock gates
* Revisit unlock preview helpers
* Monster backdrop canvas system

## Talent System Status

The Talent system has one live earning source path and one controlled live spend helper. Boss Trophy Milestone awards can add a single Talent Point with claim tracking, and `applyHunterBoardClaritySpend(state)` can spend exactly one safe point into `hunter_board_clarity` when the preview gate reports eligibility.

The Talent tree UI remains locked and preview-only. There is no broad spend UI, unlock UI, respec path, extra live nodes, passive stat bonus, reward multiplier, combat effect, economy effect, or Revisit effect.

The Talent module's internal `v1.16.2` label records its component lineage; `VERSION.md` remains the public build authority.

## Revisit System Status

The revisit system now has one live lane and several remaining planning surfaces.

Implemented so far:

* `player.revisitState`
* `revisitCandidateHooks(state)`
* `revisitCandidateSummary(state)`
* `revisitRoutePreviews(state)`
* `revisitRouteSummary(state)`
* `revisitUnlockGates(state)`
* `revisitUnlockGateSummary(state)`
* `revisitUnlockPreview(state)`
* `revisitUnlockPreviewSummary(state)`
* `revisitRouteActivationPlan(state)`
* `revisitRouteActivationSummary(state)`
* `revisitRoutePreviewStateSummary(state)`
* `trophyEchoStatus(state)`
* `startTrophyEcho(state)`
* `completeTrophyEcho(state)`
* `trophyEchoResultSummary(state)`
* `revisitFirstActivationLane(state)`
* `revisitSecondActivationLane(state)`
* `revisitTrophyEchoRulePlan(state)`
* `revisitTrophyEchoRuleSummary(state)`
* `revisitActivationSurfaceLockdownReport(state)`

Current rule:

> Trophy Echo is playable. Other Revisit lanes are not.

Trophy Echo is the first live Revisit lane. Famous Gear Memory remains the second planned lane as inert metadata only. Rival Trace, Debt Pressure, and Board Echo remain planning hooks only.

## Monster Backdrop Status

The monster backdrop canvas system is visual-only. It provides deterministic combat-stage atmosphere without changing combat math, HP, rewards, routes, completion, scaling, economy, debt, Talent state, Elite Board behavior, trophy records, or Famous Gear memory.

## Smoke and Validation Commands

Use these commands for the current manual validation pass:

```powershell
git status --short
git diff --check
node --check app.js
node --check sw.js
node --check smoke_talent_v150b.mjs
node .\smoke_talent_v150b.mjs
```

Additional focused checks may be added by a patch plan when a specific system is touched.

## Version Authority

`VERSION.md` is the public build authority. `CHANGELOG.md` is the permanent release history. `DUNGEONDEX_CURRENT_NOTES.md` is the current working summary. Runtime labels, cache labels, and internal module labels should never replace those files as the source of truth.
