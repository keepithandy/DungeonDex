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
Town -> Enter Dungeon / Continue Run -> Combat / Run Progress -> Loot -> Return -> Gear Upgrades -> Archive / Journal -> Repeat
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
- Trophy Echo is the only active Revisit lane in the v1.26.4.04 baseline.
- Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure are not exposed on the active Revisit surface.
- Memory lanes must not add rewards, farming, combat paths, board missions, dungeon-entry replacement, Talent effects, debt effects, or progression shortcuts unless explicitly scoped.

Deferred lane direction:

1. Trophy Echo — the only live lane.
2. Famous Gear Memory — inactive unless a focused issue explicitly restores it.
3. Rival Trace — inactive unless a focused issue explicitly restores it.
4. Board Echo — inactive; do not activate without a focused issue.
5. Debt Pressure — inactive; do not activate without a focused issue.

Historical Revisit references must not be read as an activation plan. Any future lane work requires a focused issue and must preserve the core dungeon loop.

### Merchant Gear Upgrades

Merchant Gear Upgrades are the active long-term gear progression path.

Current contract:

- the Lowfire Market upgrades equipped weapon and armor pieces only
- each eligible item stores `upgradeLevel` from `0` to `3`
- upgrade costs are fixed at `50c`, `125c`, and `250c`
- weapon upgrades add flat Power
- armor upgrades add flat Guard and HP
- upgrade state persists through save/reload and repairs malformed levels safely
- old Talent save fields remain compatibility-only and do not apply gameplay effects

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
tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs
tests/smoke/smoke_debt_collector_v169.mjs
tests/smoke/smoke_revisit_routes_v173.mjs
tests/smoke/smoke_journal_v1233.mjs
tests/smoke/smoke_rival_trace_memory_v1.mjs
```

Prefer adding targeted assertions to existing smoke files instead of creating broad manual audit requirements.

## Common Version/Label Files

When the patch explicitly requires a version bump, check:

```text
VERSION.md
README.md
CHANGELOG.md
docs/status/CURRENT_NOTES.md
docs/VERSION_CACHE_AUTHORITY.md
app.js
index.html
sw.js
js/systems/00_core_constants_data.js
js/systems/21_build_label_guard.js
tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs
tools/check_dungeondex_package.py
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
