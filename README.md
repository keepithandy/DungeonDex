# DungeonDex

**DungeonDex** is a solo-developed, browser-based dungeon crawler focused on compact mobile play, readable combat, gear progression, elite contracts, trophy records, and long-term dungeon memory systems.

Current baseline: **DungeonDex v1.19.1**

## Current Build

**v1.19.1 - Current Roadmap / Next Systems Audit**

This pass updates the project-facing roadmap and current notes so the next lane is clear after the debt collector visibility audit. It does not change gameplay, combat, rewards, progression, talent behavior, revisit behavior, or debt mechanics.

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

v1.19.0 keeps Debt Collector display cleanup separate from gameplay while preserving the locked Talent Tree Preview and the existing smoke coverage.

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

Current focus is on roadmap and visibility audits, not new gameplay activation. The locked foundations stay in place:

* Talent Tree Preview and Talent Ledger remain locked and read-only.
* Revisit Routes remain preview/planning only.
* Debt Collector remains a visibility and ledger layer only.
* Elite Board remains the optional challenge layer.
* Boss Trophy, Archive, and Famous Gear memory remain display-focused.

Candidate next lanes:

1. Revisit route activation planning
2. Talent foundation next-step planning
3. Monster Codex / monster identity expansion planning
4. Archive / Famous Gear memory polish
5. Elite Board clarity polish

Recommended next lane:

**Revisit route activation planning** is the next systems lane to evaluate, but it should stay in planning only until explicitly approved.

## Project Status

DungeonDex is an active work-in-progress. Systems are being built in small, validated patches with a strong preference for safe, reviewable commits.

## License

No public license has been selected yet.

Until a license is added, all rights are reserved by the project owner. Public visibility on GitHub does not automatically grant reuse rights.
