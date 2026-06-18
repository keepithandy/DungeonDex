# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.20.14**

## Current Build

**v1.20.14 - Trophy Echo Fallback Smoke Lock**

This patch adds the first read-only Trophy Echo route detail foundation. Trophy Echo remains a future side-route concept tied to remembered boss trophies and trophy records, and it adds no live entry, reward, completion, unlock, currency, or progression mutation.

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

Current rule:

> Revisit routes are not playable yet.

Trophy Echo remains the first planned Revisit lane. Famous Gear Memory is the second planned lane as inert metadata only. Rival Trace, Debt Pressure, and Board Echo remain planning hooks only. The current UI shows where future revisit content may attach, but there is no route entry path.

## Monster Backdrop Status

The monster backdrop system is currently complete as a visual-only canvas layer.

Implemented so far:

* `generateMonsterBackdrop(monster, state, options)`
* `renderMonsterBackdrop(canvas, backdrop)`
* `attachMonsterBackdropCanvas()`
* `monsterBackdropCatalog()`
* `monsterBackdropDiagnostics()`
* `window.DDMonsterBackdropCanvas`
* `smoke_monster_backdrops_v120.mjs`

Current rule:

> Monster backdrops are presentation only.

The canvas renderer mounts behind `.combat-monster-stage`, uses deterministic seeds, maps monster/district/depth identity into themed scenery, reacts to stage resize dimensions, and exposes no route entry, reward, scaling, damage, HP, or combat hook behavior. No Three.js dependency is used.

## Running Locally

DungeonDex is a static browser project.

```powershell
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Validation

Common validation commands used during development:

```powershell
node --check app.js
node --check sw.js
node --check smoke_talent_v150b.mjs
node --check smoke_debt_collector_v169.mjs
node --check smoke_revisit_routes_v173.mjs
node --check smoke_monster_backdrops_v120.mjs
node --check js/systems/29_monster_backdrops_canvas.js
git diff --check
node .\smoke_talent_v150b.mjs
node .\smoke_debt_collector_v169.mjs
node .\smoke_revisit_routes_v173.mjs
node .\smoke_monster_backdrops_v120.mjs
```

## Current Roadmap Direction

Current focus is safe foundation work. The locked foundations stay in place:

* Talent Tree Preview and Talent Ledger remain locked and read-only.
* Revisit Routes remain preview/planning only, with Trophy Echo first, Famous Gear Memory second, and Rival Trace third as named rival elite memory only.
* Debt Collector remains a visibility and ledger layer only.
* Elite Board remains the optional challenge layer.
* Boss Trophy, Archive, and Famous Gear memory remain display-focused.
* Monster backdrops remain visual-only and canvas-based.

Candidate next lanes:

1. Monster backdrop visual QA / mobile polish
2. Monster Codex / monster identity expansion planning
3. Revisit route activation implementation, later
4. Talent foundation next-step planning
5. Archive / Famous Gear memory polish
6. Elite Board clarity polish

Recommended next lane:

**Monster backdrop visual QA** is the next visual lane to evaluate, while Revisit route activation should stay planning-only until explicitly approved.

## Project Status

DungeonDex is an active work-in-progress. Systems are being built in small, validated patches with a strong preference for safe, reviewable commits.

## License

No public license has been selected yet.

Until a license is added, all rights are reserved by the project owner. Public visibility on GitHub does not automatically grant reuse rights.
