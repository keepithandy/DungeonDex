# DungeonDex Current Architecture

This document is a fast orientation layer for agents. It is not the version authority. Always check VERSION.md for the current version before editing labels.

## Project Shape
DungeonDex is a mobile-first browser roguelite / idle dungeon crawler built with HTML, CSS, and JavaScript.

The project is intentionally conservative:
- small focused patches
- explicit version labels
- smoke-test-backed contracts
- save compatibility preservation
- minimal dependency surface

## Core Active Flow
The active dungeon path is:

```text
Town -> Enter Dungeon / Continue Run -> Combat / Run Progress -> Extract or Death -> Town
```

Enter Dungeon / Continue Run is the only active dungeon entry path unless the user explicitly requests another live path.

## Stable System Boundaries

### Combat
Combat is intentionally readable and HP-number-driven.

Current design guardrails:
- Common / Elite / Boss remains the core monster structure.
- Avoid hidden status systems.
- Avoid monster affixes unless explicitly requested.
- Elite Board is the optional challenge layer.

### Revisit
Revisit is a planning foundation only.

Current contract:
- locked
- read-only
- non-playable
- no entry/start/begin/claim/complete/unlock/reward/progression behavior
- no new currency
- no farming loop

Planned lane order:
1. Trophy Echo
2. Famous Gear Memory
3. Rival Trace

Rival Trace means named rival elite memory only. It does not create a hunt, board mission, route, reward, unlock, currency, or progression mutation.

### Talent System
Talent is a foundation/preview system unless explicitly activated.

Current contract:
- locked/read-only preview for the broad Talent tree
- normalized save shape with repaired ledger and claim containers
- one controlled Boss Trophy Milestone point award source
- one controlled spend entrypoint for `hunter_board_clarity`
- learned node marking for the controlled Hunter Board Clarity path
- passive readiness gating through explicit contract helpers
- copy-only passive surfaces for Hunter Board and Debt Collector clarity
- no additional Talent nodes, respec, broad unlock actions, or active bonuses
- no combat/economy/stat mutation

### Debt Collector
Debt Collector is an existing foundation system. Do not change debt math, borrowing, repayment, pressure, or display behavior unless the patch explicitly targets debt.

Money text in plain UI copy should not render raw markup. Use plain money text where inline HTML is not intended.

### Famous Gear / Trophies / Elite Board
These systems provide identity, record, and optional challenge structure. Do not expand or alter their reward/progression behavior unless explicitly requested.

## Primary Smoke Files
Use these files to lock existing behavior:

```text
smoke_talent_v150b.mjs
smoke_debt_collector_v169.mjs
smoke_revisit_routes_v173.mjs
```

Prefer adding targeted assertions to existing smoke files instead of creating broad manual audit requirements.

## Common Version/Label Files
When the patch explicitly requires a version bump, check:

```text
VERSION.md
README.md
CHANGELOG.md
DUNGEONDEX_CURRENT_NOTES.md
app.js
index.html
sw.js
js/systems/21_build_label_guard.js
js/systems/27_interface_density_cleanup.js
```

Do not bump version labels for docs-only or smoke-only changes unless the user requests a version bump.

## Preferred Agent Roles
- ChatGPT: roadmap, patch specification, scope control, reviewer prompt.
- Codex: implementation inside the repo.
- Claude or second agent: diff-only audit and drift review.
- User: final approval and release decision.

## Patch Philosophy
A good DungeonDex patch should answer:
1. What exact contract changed?
2. What exact files changed?
3. What existing systems were intentionally not changed?
4. What smoke or validation proves it?
5. What remains risky or intentionally deferred?
