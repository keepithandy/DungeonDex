# DungeonDex Patch Template

Use this template for every focused DungeonDex patch. Keep the patch narrow, testable, and easy to audit.

## Patch Header
- Target version:
- Patch name:
- Primary system:
- Patch type: code / smoke / docs / UI / release / audit
- Starting branch:
- Starting commit:
- Baseline status: clean / dirty

## Goal
Write one plain-language sentence describing the exact outcome.

Example:
> Add smoke coverage proving Talent earning remains disabled while preserving the existing locked preview UI.

## Allowed Scope
List the files or systems that may change.

```text
Allowed files:
- VERSION.md
- CHANGELOG.md
- DUNGEONDEX_CURRENT_NOTES.md
- smoke_talent_v150b.mjs
```

## Forbidden Scope
List systems that must not drift.

```text
Do not change:
- Revisit activation, entry, rewards, completion, unlocks, or progression
- Talent earning, spending, learned nodes, unlocks, or bonuses unless explicitly in scope
- Combat, monsters, gear generation, gear scaling, economy, debt math, contracts, trophies, Famous Gear, Elite Board, or save progression
- Enter Dungeon / Continue Run as the only active dungeon entry path
```

## Required Reads
Before editing, read:
1. AGENTS.md
2. VERSION.md
3. DUNGEONDEX_CURRENT_NOTES.md
4. docs/CURRENT_ARCHITECTURE.md
5. The target files listed in Allowed Scope

## Implementation Rules
- Make the smallest change that satisfies the goal.
- Prefer explicit contract helpers and smoke assertions over broad rewrites.
- Do not introduce dependencies unless explicitly approved.
- Preserve save compatibility.
- Keep player-facing labels short.
- Do not bump version labels unless the patch explicitly includes a version bump.

## Validation Commands
Use the commands that apply to the patch.

```powershell
git status --short
git diff --check
node --check app.js
node smoke_talent_v150b.mjs
node smoke_debt_collector_v169.mjs
node smoke_revisit_routes_v173.mjs
```

If a command is skipped, state why.

## Required Final Report
```text
Result:

Version:
- Final version from VERSION.md:
- Commit hash:
- Branch:
- Repo status:
- Pushed to origin/main:

Files changed:
-

What changed:
-

What intentionally did not change:
-

Validation:
-

Risks / follow-up:
-
```

## Review Prompt Hand-off
After the patch, produce a short reviewer prompt that asks a second agent to inspect only the diff and confirm there was no scope drift.
