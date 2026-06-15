# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.15.0**

## Current Build

**v1.15.0 - Revisit Route Entry Gate Foundation**

This version tightens revisit route panel readability and detail copy for the existing side-route previews. Talent earning, spending, unlocks, learned state, active nodes, passive bonuses, combat changes, economy changes, enemy scaling changes, gear generation changes, debt behavior changes, and revisit route activation behavior remain unchanged.

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

DungeonDex follows several project rules:

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
* `revisitTrophyEchoRulePlan(state)`
* `revisitTrophyEchoRuleSummary(state)`

Current rule:

> Revisit routes are not playable yet.

Trophy Echo now has read-only rule-planning metadata. Famous Gear Memory, Rival Trace, Debt Pressure, and Board Echo remain planning hooks only. The current UI shows where future revisit content may attach, but there is no route entry path.

v1.15.0 keeps revisit routes side-content only while adding a safe gate/readiness foundation without making routes playable.

## Running Locally

DungeonDex is a static browser project.

From the project folder, run a simple local server:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also use a VS Code live server extension or any basic static web server.

## Validation

Common validation commands used during development:

```powershell
node --check app.js
node --check sw.js
node --check smoke_talent_v150b.mjs
node --check smoke_debt_collector_v169.mjs
node --check smoke_revisit_routes_v173.mjs
node --check js/systems/00_core_constants_data.js
node --check js/systems/03_town_contracts_market.js
node --check js/systems/08_normalization_save.js
node --check js/systems/10_ui_town_shop.js
node --check js/systems/19_warden_talents_lowfire_board.js
node --check js/systems/21_build_label_guard.js
node --check js/systems/27_interface_density_cleanup.js
git diff --check
node .\smoke_talent_v150b.mjs
node .\smoke_debt_collector_v169.mjs
node .\smoke_revisit_routes_v173.mjs
```

## Current Roadmap Direction

Near-term development is focused on finishing the locked Talent System foundation while Trophy Echo planning remains checkpointed and non-playable.

Candidate next lanes:

1. Talent Passive Preview Mapping
2. Debt Collector Visibility / Risk Pressure
3. Famous Gear Memory Attachment
4. Boss Trophy / Dex Identity
5. District / World Identity
6. Trophy Echo UI Readiness Preview, still non-playable

Recommended next lane:

**Talent Passive Preview Mapping** is the active next systems lane. Keep the next talent patch focused on mapping simple passive candidates to the locked ruleset before any behavior changes, and keep any future playable Trophy Echo work separate and explicitly approved.

## Project Status

DungeonDex is an active work-in-progress. Systems are being built in small, validated patches with a strong preference for safe, reviewable commits.

## License

No public license has been selected yet.

Until a license is added, all rights are reserved by the project owner. Public visibility on GitHub does not automatically grant reuse rights.
