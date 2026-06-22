# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.20.51**

## Current Build

**v1.20.51 - First Controlled Talent Spend UI Button**

This patch adds the first controlled `hunter_board_clarity` Talent spend button. The button is gated by the readiness model and calls the existing controlled spend helper only when ready.

No broad Talent UI, extra nodes, respec, combat changes, economy changes, reward math changes, Debt Collector changes, or Revisit activation was added.

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

The revisit system is currently in a foundation/preview/gate-checkpoint phase.

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
* `revisitFirstActivationLane(state)`
* `revisitSecondActivationLane(state)`
* `revisitTrophyEchoRulePlan(state)`
* `revisitTrophyEchoRuleSummary(state)`
* `revisitActivationSurfaceLockdownReport(state)`

Current rule:

> Revisit routes are not playable yet.

Trophy Echo remains the first planned Revisit lane. Famous Gear Memory is the second planned lane as inert metadata only. Rival Trace, Debt Pressure, and Board Echo remain planning hooks only. The current UI shows where future revisit content may attach, but there is no route entry path.

## Monster Backdrop Status

The monster backdrop canvas system is visual-only. It provides deterministic combat-stage atmosphere without changing combat math, HP, rewards, routes, completion, scaling, economy, debt, Talent state, Elite Board behavior, trophy records, or Famous Gear memory.
