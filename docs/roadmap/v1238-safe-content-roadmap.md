# v1.23.8 Safe Content Roadmap

Branch: `feature/v1238-safe-content-roadmap`
Base: restored v1.23.7 baseline (`c3a3e7968679768e7cfbde6f27c4aad7d79d8d2d`)

## Purpose

Plan the next couple DungeonDex updates without touching `main` directly and without repeating the risky UI/debug patch stack.

## Hard rules

- Do not patch `main` until the branch is visibly playable.
- Do not add broad CSS hiding rules.
- Do not use `:has(...)` for new cleanup work.
- Do not wrap the global render loop.
- Do not alter service worker/cache behavior unless doing an intentional version-label update.
- Do not add fallback UI.
- Keep Enter Dungeon / Continue Run protected.
- Preserve save compatibility.

## Update 1: recovery-safe planning and checks

Goal: keep the restored v1.23.7 package stable while preparing the next feature.

Allowed work:

- Documentation-only roadmap updates.
- Smoke checklist updates.
- Branch-only notes.
- No gameplay, UI, render, service worker, or save-schema changes.

Required checks before Update 2:

- Textastic preview opens.
- Visible label is `DungeonDex v1.23.7`.
- Intro modal works.
- Enter Dungeon works.
- Town, Run, Gear, and Archive render.
- No blank screen after intro actions.

## Update 2: Board Echo contract-only prep

Goal: prepare Board Echo safely without making it playable yet.

Allowed work:

- Read-only helper/contract review.
- Fixture/dry-run helper only if it does not mutate live state.
- Smoke coverage for locked/planned status.
- No Start Board Echo button.
- No Resolve Board Echo button.
- No reward, combat, economy, Talent, debt, or progression changes.

## Update 3: Board Echo town preview

Goal: show clear town copy only after contract-only prep passes.

Allowed work:

- Locked/planned copy polish.
- Available/preview copy if supported by existing state.
- Smoke that confirms preview does not start or mutate Board Echo.

Blocked until explicitly approved:

- Board Echo start/resolve activation.
- Journal record completion.
- Version bump.
- Service worker/cache edits.

## Merge gate

Before merge to `main`:

```bash
node smoke_compact_suite.mjs
node tests/smoke/smoke_revisit_routes_v173.mjs
node tests/smoke/smoke_rival_trace_memory_v1.mjs
```

Manual gate:

- Mobile/Textastic opens cleanly.
- Intro works.
- Dungeon entry works.
- Town/Run/Gear/Archive are visible.
- No hidden-panel or fallback behavior appears.
