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

Revisit is the town/archive memory layer. It should build from existing save records, not replace the core dungeon loop.

Current contract:

- Trophy Echo is playable from town when boss trophy or boss record history exists.
- Famous Gear Memory is playable from town when retired gear archive history exists.
- Rival Trace is playable from town when named rival elite history exists.
- Each live lane records Revisit-local memory/completion history.
- Board Echo remains locked/planned until a focused Board Echo issue activates it.
- Debt Pressure remains locked/planned until a focused Debt Pressure issue activates or clarifies it.
- Memory lanes must not add rewards, farming, combat paths, board missions, dungeon-entry replacement, Talent effects, debt effects, or progression shortcuts unless explicitly scoped.

Planned lane direction:

1. Trophy Echo — live.
2. Famous Gear Memory — live.
3. Rival Trace — live.
4. Board Echo — next safe Revisit candidate.
5. Debt Pressure — debt clarity/recovery candidate, not a punitive system.

Rival Trace means named rival elite memory only. It does not create a hunt, board mission, route, reward, unlock, currency, or progression mutation.

### Talent System

Talent is an active but tightly controlled foundation.

Current contract:

- normalized save shape with repaired ledger and claim containers
- controlled Boss Trophy Milestone point award source where already implemented
- controlled spend entrypoint for `hunter_board_clarity`
- learned node marking for the controlled Hunter Board Clarity path
- passive readiness gating through explicit contract helpers
- copy-only passive surfaces for Hunter Board and Debt Collector clarity where already wired
- no broad Talent tree activation
- no additional live Talent spend nodes unless explicitly scoped
- no respec/refund system
- no combat/economy/stat mutation

### Debt Collector

Debt Collector is an existing foundation system. Do not change debt math, borrowing, repayment, pressure, wallet mutation, or display behavior unless the patch explicitly targets debt.

Money text in plain UI copy should not render raw markup. Use plain money text where inline HTML is not intended.

Debt Pressure v1 should be treated as a focused debt clarity/recovery patch, not as a general punishment system.

### Famous Gear / Trophies / Elite Board

These systems provide identity, record, and optional challenge structure. Do not expand or alter their reward/progression behavior unless explicitly requested.

## Identity / IP Layer

Identity work supports the game; it does not replace playable-content work.

Current identity docs:

- `docs/IP_LAYER_GUIDE.md`
- `docs/ASSET_INVENTORY.md`
- `docs/OPEN_ISSUE_SWEEP.md`
- `docs/PLAYABLE_SYSTEMS_QUEUE.md`

Player-facing copy should avoid internal terms like contract helper, dry run, normalization, fixture, smoke, canonical shape, and renderer wiring unless the surface is explicitly technical documentation.

## Primary Smoke Files

Use these files to lock existing behavior:

```text
smoke_compact_suite.mjs
smoke_talent_v150b.mjs
smoke_debt_collector_v169.mjs
smoke_revisit_routes_v173.mjs
smoke_journal_v1233.mjs
smoke_rival_trace_memory_v1.mjs
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
