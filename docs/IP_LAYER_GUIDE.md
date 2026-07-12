# DungeonDex IP Layer Guide

This guide advances the current identity-layer issues without changing runtime behavior.

Current baseline: **v1.26.0 Trophy Echo Only Revisit**.

## Premise (#38)

DungeonDex is a compact dark-fantasy dungeon crawler where a guild delver pushes deeper into the Hollow Stair, survives readable encounters, records trophies and gear memories, and revisits safe echoes of past progress from town.

### Store-page style paragraph

DungeonDex is a mobile-first browser RPG about building a record of dungeon survival. Prepare in town, enter the Hollow Stair, fight clear HP-driven encounters, collect gear, retire notable finds, and let the Guild Journal turn your progress into trophies, echoes, rival traces, and memory lanes. It is built to be readable, incremental, and safe to expand: new systems should deepen the dungeon record without hiding the core loop behind noise.

### Player promises

- You always know the main path: prepare, enter, fight, loot, return, and improve.
- Progress creates memory: trophies, retired gear, rivals, and Revisit lanes make old runs matter.
- Systems stay readable: numbers, labels, and state changes should explain themselves.
- New lanes should build from existing records, not replace the core dungeon loop.
- Mobile readability matters as much as feature count.

### What DungeonDex is not trying to be

- Not a full party-builder RPG.
- Not an action combat game.
- Not a hidden-stat spreadsheet where the player cannot tell what changed.
- Not a casino reward loop or farming exploit engine.
- Not a broad live-service framework.

## Feature Glossary (#39)

| Term | Player-facing meaning |
|---|---|
| Hollow Stair | The main dungeon path where the player pushes deeper through readable encounters. |
| Town | The safe preparation surface where the player reviews state and starts approved actions. |
| Lowfire Market | The Town shop and home of Merchant Gear Upgrades. |
| Lowfire Forge | The active crafting surface for forging, salvage, and tempering. |
| Lowfire Board | The Town board for Warden Objectives, Trophy Echo, and Elite Board information. |
| Warden Objectives | Current Town objectives and notices. |
| Merchant Gear Upgrades | The active simple progression path for eligible equipped weapons and armor. |
| Upgrade level | The visible improvement tier on an eligible equipped item. |
| Copper | The cost shown for Merchant Gear Upgrades. |
| Guild Journal | The readable archive for trophies and other earned dungeon records. |
| Boss trophy record | Proof of a defeated boss that can make its Trophy Echo available. |
| Retired gear record | Journal history for a retired item; it does not make Famous Gear Memory active in v1.26.0. |
| Trophy Echo | The only active Revisit lane in v1.26.0. It reflects on an earned boss record without adding rewards or replacing a dungeon run. |
| Locked Trophy Echo | No boss trophy or boss record is available yet. |
| Active | Available to use now. |
| Locked | Unavailable until its stated requirement is met. |
| Completed | Recorded in the Journal or memory history. |
| History-only | Preserved as a record, not offered as an active player path. |
| Planned | Not part of the current playable surface. |
| Talent | Compatibility/history language only; Merchant Gear Upgrades are the active simple progression path. |
| Famous Gear Memory / Rival Trace / Board Echo / Debt Pressure Revisit | Inactive Revisit concepts in the v1.26.0 baseline. |

## Visual Identity Direction (#40)

DungeonDex should look and read like a **guild ledger for a dangerous dungeon**: dark fantasy, compact records, readable status cards, and restrained system language.

### Principles

- Prefer high-contrast readable panels over ornamental clutter.
- Use short labels first, then supporting detail below.
- Make cards feel like records: status, source, result, next action.
- Keep mobile line length tight.
- Avoid UI that looks like unfinished debug output.
- Avoid random fantasy decoration that does not support the systems.

### Useful visual anchors

- Guild ledger cards
- Monster journal entries
- Echo/archive tags
- Warden warnings
- Debt notices
- Trophy records
- Rival trace summaries

## Compact Lore Bible (#41)

### The dungeon

The Hollow Stair is a layered descent that keeps records of what survives it: monsters defeated, gear retired, rivals crossed, and debts carried back to town.

### The Guild

The Guild tracks delvers, trophies, contracts, memories, and warnings. It turns raw progress into readable records so the player knows what they have earned and what remains dangerous.

### Echoes

Echoes are safe reflections of past progress. They do not create new combat paths or rewards by default; they let the player revisit what the save already remembers.

### Rivals

Rivals are named threats or competing delvers that leave traces in the archive. Rival Trace should feel like following a remembered encounter, not opening a new hunt.

### Trophies

Trophies prove major encounters happened. Trophy Echo uses that proof to create a small memory loop.

### Debt pressure

Debt pressure is the Guild's risk ledger becoming louder. It should warn, explain, and show recovery before it punishes.

### The player

The player is a delver whose value comes from surviving, recording, and learning from the dungeon rather than simply stacking bigger numbers.

## Factions and Recurring Roles (#42)

| Role / faction | Purpose | Useful surfaces |
|---|---|---|
| The Ledger Guild | Keeps records, contracts, trophies, and archive entries. | Guild Journal, README, town records |
| Hollow Wardens | Explain dungeon rules, warnings, and safe boundaries. | Dungeon entry, locked/planned copy, smoke-protected labels |
| Archive Keepers | Preserve trophies, gear memories, and echoes. | Trophy Echo, Famous Gear Memory, Board Echo, Guild Journal |
| Debt Office | Tracks borrowing, repayment, pressure, and recovery. | Debt Collector, Debt Pressure |
| Rival Scouts | Track named rivals and traces. | Rival Trace, elite/rival memory copy |

NPC copy can reference these roles without adding actual NPC systems.

## Copy Audit Rules (#43)

Player-facing copy should avoid internal engineering terms unless the surface is explicitly technical documentation.

### Avoid in player UI

- contract helper
- dry run
- normalization
- fixture
- smoke
- canonical shape
- mutation surface
- renderer wiring

### Prefer in player UI

- record
- memory
- echo
- trace
- locked
- planned
- source
- result
- recovered
- under collection
- journal entry

## README Identity Rules (#45)

The public README should keep these sections clear:

1. What DungeonDex is.
2. What is playable now.
3. What is planned next.
4. What is intentionally not changing.
5. Which smoke command protects the branch.

Do not market locked/planned systems as live.

## Title and Logo Usage (#46)

Preferred spelling: **DungeonDex**.

Rules:

- Use `DungeonDex` in README, app title, release notes, screenshots, and public posts.
- Avoid shorthand like `DDex` in public copy.
- Do not add a final logo file until the asset source/license is known.
- Temporary title treatment should be text-first and readable on mobile.
- Logo direction: compact dark-fantasy wordmark, guild/archive tone, not generic skull clutter.

## Screenshot and Hero-card Plan (#47)

Priority screenshots should show honest current gameplay:

1. **Town / Lowfire Board** — best public hero image: Town identity, Trophy Echo, and the active post-run loop in one frame.
2. **Lowfire Market** — Merchant Gear Upgrades visibly explain the active progression surface.
3. **Lowfire Forge** — shows the active crafting/salvage identity without implying new mechanics.
4. **Gear detail modal** — supports a focused mobile-readability post.
5. **Guild Journal** — use only when it shows current boss-trophy records without presenting inactive lanes as playable.

Hero candidate: **Town / Lowfire Board with Trophy Echo locked or available**.

Capture Town at 390px, 430px, and 768px. For public posts, use the cleanest readable state; keep rail-toggle and edge-case captures in internal notes. Do not use Talent, Famous Gear Memory, Rival Trace, Board Echo, or Debt Pressure as a current-feature screenshot.

## Revisit Flavor Direction (#48)

Use consistent memory language for the one live Revisit lane:

| Lane | Flavor direction |
|---|---|
| Trophy Echo | A trophy record vibrating with remembered boss pressure. |
| Famous Gear Memory | Inactive in v1.26.0; no active-surface copy target. |
| Rival Trace | Inactive in v1.26.0; no active-surface copy target. |
| Board Echo | Inactive in v1.26.0; no active-surface copy target. |
| Debt Pressure | Inactive in v1.26.0; no active-surface copy target. |

Flavor must not imply rewards, combat, farming, or progression payouts.

## Public Copy Smoke Coverage Plan (#49)

Good smoke targets are stable labels, not full paragraphs.

Current labels and boundaries to protect:

- `DungeonDex`
- `Guild Journal`
- `Trophy Echo`
- visible current version label
- inactive-lane start labels remain absent from the active Revisit surface

Avoid brittle whole-panel `innerText` checks unless a specific regression requires them.

## Public Roadmap Categories (#50)

### Playable systems

- Preserve the live Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal loop.
- Trophy Echo is the only active Revisit lane in v1.26.0.
- Merchant Gear Upgrades and Lowfire Forge are the active progression/crafting surfaces.
- Future playable work requires its own focused issue; do not present inactive Revisit lanes as current content.

### Identity and documentation

- Feature glossary and player promise
- Lore, faction, and role notes
- README and public roadmap upkeep

### Visual and asset cleanup

- Asset inventory
- Title/logo usage note
- Screenshot/hero-card plan
- Mobile readability validation

### Smoke/testing guardrails

- Public copy smoke coverage
- Trophy Echo-only Revisit smoke protection
- Compact suite and mobile checklist verification

## Loading / Title Screen Copy (#51)

### Title line

DungeonDex

### Subtitle options

- Records from the Hollow Stair
- A Guild Ledger of Dungeon Survival
- Echoes, Trophies, and the Next Descent

### Loading/status phrases

- Opening the Guild Journal...
- Reading trophy records...
- Checking the Hollow Stair...
- Preparing town records...

### First-run welcome line

Welcome to the Guild. Enter the Hollow Stair, survive what you can, and let the Journal remember what mattered.

These lines are copy-only. Implementing them later should not change save state, routes, rewards, combat, debt, Talent, or progression.
