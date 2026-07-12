# v1.23.7 Mobile Recovery Checkpoint

Branch: `stabilize/v1237-mobile-recovery-checkpoint`
Base: `c3a3e7968679768e7cfbde6f27c4aad7d79d8d2d`

## Purpose

Verify that the restored v1.23.7 baseline is playable on mobile/Textastic before any new DungeonDex feature work resumes.

This checkpoint is documentation-only. It must not change gameplay, UI rendering, save state, service worker behavior, Revisit lanes, Talent, Debt, combat, gear, economy, or progression.

## Manual mobile/Textastic checklist

- [ ] Working Copy local `main` or this branch points at the restored v1.23.7 baseline.
- [ ] Textastic opens `DungeonDex/index.html` from the fresh/reset local copy.
- [ ] Visible label shows `DungeonDex v1.23.7`, not v1.23.8.
- [ ] Intro modal appears.
- [ ] Intro close works.
- [ ] Enter Dungeon works.
- [ ] Town screen renders.
- [ ] Run screen renders.
- [ ] Gear screen renders.
- [ ] Archive/Guild Journal renders.
- [ ] No `Recovered Descent` fallback copy appears.
- [ ] No blank screen after intro buttons.

## Smoke checklist

Run where Node is available:

```bash
node smoke_compact_suite.mjs
node tests/smoke/smoke_rival_trace_memory_v1.mjs
node tests/smoke/smoke_revisit_routes_v173.mjs
```

Useful adjacent checks:

```bash
node tests/smoke/smoke_journal_v1233.mjs
node tests/smoke/smoke_famous_gear_memory_v1.mjs
node tests/smoke/smoke_boss_trophy_v1.mjs
node tests/smoke/smoke_talent_passive_framework_v1232.mjs
node tests/smoke/smoke_debt_collector_v169.mjs
```

## Main branch rule

Do not merge feature work to `main` until this checkpoint is manually verified. Future UI or cleanup patches must happen on branches only and must avoid broad `display:none`, `:has(...)`, render-loop wrappers, service worker experiments, or fallback UI.
