# AGENTS.md

## Project

DungeonDex is a mobile-first dark fantasy browser roguelite / idle dungeon crawler by Northline Studio.

This file is the first-read operating contract for Codex, Claude, ChatGPT, and other repo agents.

## Active Core Loop

Preserve the live player loop unless the issue explicitly targets one of its steps:

```text
Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal -> Repeat
```

## Core Workflow Rules

- Keep all changes small, focused, and versioned.
- One issue should solve one engineering problem.
- Finish existing systems before creating new systems.
- Inspect the existing implementation before proposing replacement, activation, or cleanup work.
- Extend or clarify established systems before considering a rewrite.
- Do not rewrite the project unless the user explicitly asks.
- Preserve save data compatibility.
- Prefer targeted fixes, contract helpers, and smoke coverage over large refactors.
- Do not remove systems unless the user explicitly asks.
- Do not change the public game direction away from DungeonDex.
- Do not introduce external dependencies unless explicitly approved.
- Do not expose API keys, secrets, private tokens, or credentials.
- Do not include `node_modules` or unrelated lockfile noise unless required by the explicit task.
- Do not ship stale devtool artifacts, stale cache/build labels, or unrelated package leftovers in public output bundles.

## Required Agent Reading Order

Before planning or editing, read:

1. `AGENTS.md`
2. `VERSION.md`
3. `docs/status/CURRENT_NOTES.md`
4. `docs/CURRENT_ARCHITECTURE.md` if present
5. `docs/PATCH_TEMPLATE.md` before writing a patch plan
6. `docs/RELEASE_CHECKLIST.md` before version labels, release notes, cache labels, or public-facing package changes

If a listed document is missing, continue safely and report that it was not present.

## Version Authority

- Always check `VERSION.md` before changing any version number.
- `VERSION.md` is the source of truth for the current public version, current development target, and hotfix naming.
- Do not trust old release notes, old zip filenames, cached build labels, package names, old patch logs, historical comments, or stale issue text as the current version.
- Do not bump the version unless the user explicitly asks.
- Before changing version labels, search for all version strings in:
  - `VERSION.md`
  - `index.html`
  - `app.js`
  - `styles.css`
  - `manifest.json`
  - `sw.js`
  - `patch-log.md`
  - release notes
  - smoke-test notes
  - current notes
- Report every relevant version string found before editing.
- Keep the visible player-facing label short, for example: `DungeonDex v1.23.1`.

## Required Pre-Work Checklist

Before editing, identify and report or record:

- current Git branch
- current `VERSION.md` value
- intended patch category
- expected files to modify
- protected systems for the task
- smoke tests or checks required after changes
- assumptions or uncertainties

Stop and report uncertainty instead of guessing when the branch, version, scope, or protected systems cannot be determined.

## Patch Categories

Classify every task before editing. Use exactly one primary category. Mention secondary effects only when they are unavoidable.

### Audit

Purpose:
- inspect behavior, files, or repository state only

Rules:
- do not edit runtime files
- do not edit documentation unless the issue explicitly asks
- do not change behavior
- report findings only

### Bug Fix

Purpose:
- repair a confirmed defect

Rules:
- apply the smallest safe fix
- avoid unrelated cleanup
- preserve compatibility
- add or update regression coverage when practical

### Clarity

Purpose:
- improve wording, labels, UI copy, documentation, or readability

Rules:
- do not change gameplay
- do not change balance
- do not change progression
- keep copy accurate to actual behavior

### Smoke Hardening

Purpose:
- improve automated verification

Rules:
- runtime behavior should remain unchanged
- increase regression protection
- test fixtures must not become gameplay state
- explain what behavior the smoke protects

### Framework Completion

Purpose:
- finish an existing incomplete system or architecture path

Rules:
- complete the requested architecture path only
- avoid feature creep
- preserve public behavior unless the issue explicitly authorizes activation
- add smoke coverage for newly reliable contracts

### Content Expansion

Purpose:
- add monsters, relics, bosses, contracts, flavor, route content, or other player-facing data

Rules:
- prefer data-first additions
- reuse existing systems
- avoid engine rewrites
- avoid balance jumps without explicit approval

### Version Update

Purpose:
- update release labels after verification

Rules:
- update every required public/runtime/cache/version surface
- never leave mixed versions
- do not change gameplay behavior
- verify labels after editing

## Protected Systems

Do not modify these systems unless the issue explicitly authorizes that area:

- save compatibility
- save normalization and repair
- Merchant Gear Upgrade costs, caps, save fields, and stat-effect contract
- combat math
- player damage
- player HP
- monster scaling
- boss scaling
- XP formulas
- gold formulas
- reward formulas
- progression unlock rules
- dungeon entry behavior
- Talent earning
- Talent spending costs
- Talent learned-state schema
- Revisit start, completion, reward, and history behavior
- Debt Collector pressure, borrowing, repayment, and collection mechanics
- service worker cache labels
- version labels
- script-load order
- public UI routes and screen IDs

When a protected system is intentionally touched, state why it was in scope and what verification protects it.

## Permanent Gameplay Guardrails

- `Enter Dungeon` / `Continue Run` remains the only primary dungeon entry path unless the user explicitly requests a new playable entry system.
- Gear Upgrades are part of the active post-run loop and must be audited in their existing implementation before being changed.
- Archive / Journal remain part of the live loop after gear upgrades and must not be treated as optional planning-only surfaces.
- Preserve existing live Revisit lanes exactly as implemented unless the issue explicitly targets Revisit.
- Do not add or expand Revisit entry, start, begin, claim, complete, unlock, reward, progression, currency, combat, economy, or farming behavior unless explicitly requested.
- Do not treat existing live Revisit behavior as nonexistent or planning-only.
- Trophy Echo, Rival Trace, Famous Gear Memory, and future Revisit lanes may only change when a Revisit-scoped issue authorizes that work.
- Preserve debt, gear, combat, monster, economy, Elite Board, contract, trophy, Famous Gear, Talent, and save-progression behavior unless the patch scope explicitly targets one of those systems.
- No monster affixes, hidden statuses, or new combat complexity unless explicitly requested.

## Talent System Guardrails

DungeonDex has an active Talent foundation. Do not treat the Talent system as nonexistent or fully inert.

Known allowed Talent foundation may include:
- Talent point earning where already implemented.
- Talent point spending where already implemented.
- Learned node state where already implemented.
- Read-only or copy-only passive helper behavior where already implemented.
- Existing smoke coverage for Talent earning, spending, learned state, and copy-only passive behavior.

Rules:
- Do not add new Talent currencies unless explicitly requested.
- Do not add new branches unless explicitly requested.
- Do not add new gameplay bonuses unless explicitly requested.
- Do not change Talent earning rates, spending costs, unlock rules, save schema, or learned-state behavior unless explicitly requested.
- Talent passive effects must remain copy-only/read-only unless the issue explicitly says activation is allowed.
- Hunter Board Clarity is allowed only as existing copy-only behavior unless the issue explicitly changes it.
- Debt Collector clarity must not set `liveRendererWired: true` unless the issue explicitly unlocks renderer activation.
- Do not activate Debt Collector clarity live rendering unless explicitly requested.
- When changing Talent code, verify that existing earning/spending/learned-state smoke expectations still pass.

## Revisit Guardrails

- Revisit helpers may exist internally.
- Do not re-export Revisit helpers unless the issue explicitly asks for it.
- Do not unlock additional Revisit lanes unless the issue explicitly asks for that lane activation.
- Do not add Revisit rewards, claim loops, progression, or farming unless the issue explicitly asks.
- Revisit planning copy may be edited only when the patch scope allows copy/docs changes.
- When changing Revisit code, verify that existing playable lanes stay playable and locked future lanes stay locked.

## Change Discipline

- Prefer small focused commits.
- Avoid unrelated cleanup.
- Avoid large refactors.
- Preserve compatibility.
- Avoid duplicate helpers.
- Avoid parallel implementations.
- Prefer extending existing systems over replacing them.
- Document assumptions.
- Leave TODOs only when they identify a real future task.
- Keep file edits minimal.
- Preserve classic script-load ordering unless the issue explicitly targets script architecture.
- Do not modernize architecture, convert modules, add build tooling, or refactor file structure unless explicitly requested.
- Do not add dead UI buttons or labels that imply behavior not yet implemented.
- If an existing system already works in some form, audit and continue it safely instead of rebuilding it from scratch.

## Preferred Agent Roles

- Patch Warden: enforce narrow diffs, active-surface guardrails, and inspect-before-replace discipline.
- Smoke Captain: map the touched behavior to the compact smoke suite and any focused smoke checks, then report what was actually run.
- Lore Consistency: review player-facing copy, Archive / Journal wording, and DungeonDex tone so documentation and UI language stay aligned with the live baseline.

## UI / Design Direction

- Mobile-first.
- Compact panels.
- One-hand friendly.
- Dark fantasy tone.
- Ember, dungeon, town, wardens, trophies, loot, contracts, debt, elites, and descent identity.
- Avoid clutter.
- Prefer cleaner CSS/layout improvements before adding new UI systems.
- Keep labels accurate to live behavior.

## Verification Requirements

Every implementation issue should finish with verification.

Minimum expectations:
- syntax checks for edited JavaScript, when JavaScript changed
- relevant existing smoke tests for behavior-facing changes
- new or updated smoke coverage for newly introduced framework behavior, when practical
- protected-system review
- compatibility review
- regression review

Use applicable commands such as:
- `node --check <file>`
- targeted smoke file for the touched system
- broader smoke file when the touched system crosses renderer, save, or town surfaces
- `node smoke_compact_suite.mjs` when a change crosses multiple live systems or the right focused boundary is unclear

Documentation-only changes do not require gameplay smoke tests, but must still verify:
- changed documentation is readable
- version labels were not changed unless requested
- no runtime files were edited
- no new contradiction was introduced against current baseline notes

Release/package-facing work must additionally verify:
- version labels, build query strings, and service-worker cache labels stay aligned
- public package output does not include stale devtool/cache references or unrelated temp artifacts

Do not claim a check passed unless it was actually run.

## Agent Decision Rules

If uncertain:
- inspect first
- report findings
- avoid assumptions

If behavior is ambiguous:
- preserve existing behavior

If multiple implementations exist:
- prefer the established implementation already loaded by `index.html`

If compatibility is uncertain:
- choose the safest compatible approach

If a requested task expands beyond its scope:
- complete the requested scoped work
- recommend additional work separately

If an issue is documentation-only:
- do not opportunistically patch gameplay
- report any gameplay risk as a suggested next issue instead

## Testing Before Final Response

After any repo change, report:

1. Files edited.
2. What changed.
3. What was intentionally not changed.
4. Checks or smoke tests run.
5. Checks not run and why.
6. Risks or follow-up checks.
7. Suggested next issue, if obvious.

## Required Final Report Format

Use this format after completing repo work:

```text
Summary:
- ...

Files changed:
- ...

Behavior changed:
- ...

Behavior intentionally not changed:
- ...

Checks run:
- ...

Checks not run:
- ...

Risks:
- ...

Suggested next issue:
- ...
```

## Preferred Output Style

- Be concise.
- Be direct about bugs, risks, and uncertainty.
- Include git commands when useful.
- Do not hide skipped checks.
- Do not claim a check passed unless it was actually run.
- Do not claim behavior changed unless the patch actually changed runtime behavior.
