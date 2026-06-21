# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.20.40**

## Current Build

**v1.20.40 - Talent Point Award Contract Dry Run**

This patch adds a read-only Boss Trophy Milestone award eligibility preview. It does not award points, add claim tracking, enable spending, or add Talent unlock UI.

## Previous Build

**v1.20.39 - Talent Point Source Decision**

This patch selects Boss Trophy Milestone as the first Talent point source and keeps point earning, spending, unlocks, and gameplay behavior disabled.

## Previous Build

**v1.20.34 - Passive Renderer Contract Alignment**

This patch makes the Talent module the canonical owner of passive clarity metadata and Debt Collector clarity copy helpers. Debt clarity can be preview-ready when learned, but remains disabled, gameplay-inert, and absent from the live renderer.

## Previous Build

**v1.20.33 - Revisit Activation Surface Lockdown**

This patch fully de-exports dormant Revisit start/active-summary surfaces from the public Elite Contracts API and adds a read-only lockdown report. Revisit remains planning-only; Enter Dungeon / Continue Run remains the only active dungeon entry path.

## Previous Build

**v1.20.32 - Passive Activation Gate Dry Run**

This patch adds read-only activation-gate metadata for the two prepared display-copy passives. It does not wire the Debt Collector renderer, mutate saves, add Talent actions, or apply gameplay effects.

## Previous Build

**v1.20.31 - Talent Passive Activation Readiness Matrix**

This patch added a read-only readiness matrix for the prepared Board Clarity and Debt Collector Clarity passive contracts.

## Previous Build

**v1.20.8 - Owed Money Text Fix**

This patch fixes the Debt Collector Owed line so text-rendered debt summaries show clean coin notation like `Owed 5s` instead of raw money span markup.

## Previous Build

**v1.20.7 - Rival Trace Planning Lane**

This cleanup aligned the visible build, cache, and runtime labels with `VERSION.md` and tightened the read-only Trophy Echo detail contract without activating Revisit.

## Previous Build

**v1.20.2 - Monster Backdrop Canvas Completion**

This pass completes the deterministic, canvas-only monster backdrop system behind the combat monster stage. It adds the production theme catalog, stronger boss/elite visual framing, resize-aware rendering, diagnostics, and expanded smoke coverage. It remains visual-only and does not alter combat math, rewards, scaling, progression, or Revisit behavior.

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

The Talent system is a stable preview foundation backed by one deeply frozen ruleset with four branches and twelve nodes. Save repair forces legacy point/unlock fields and the canonical ledger to a safe zero-state, and existing smoke coverage verifies that combat, Elite Board rewards, charter costs, and sell values remain unaffected.

The Talent module's internal `v1.16.2` label records its component lineage; `VERSION.md` remains the public build authority. Boss/depth milestones are the primary future earning source. Milestone tracking and activation remain undecided future work, while Elite Board sources remain possible secondary sources only.

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
