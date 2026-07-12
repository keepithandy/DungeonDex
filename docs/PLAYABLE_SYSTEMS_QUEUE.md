# DungeonDex Playable Systems Queue

This queue supports the open playable/system issues without bundling protected runtime changes into one unsafe patch.

Current baseline: **v1.23.7 Rival Trace Result Detail Polish**.

## Priority 1: Board Echo v1 (#36)

### Player-facing goal

Board Echo should become the next safe Revisit memory lane after Trophy Echo, Famous Gear Memory, and Rival Trace.

The player should be able to:

1. Build enough board/contract history for Board Echo to become available.
2. Start a Board Echo memory from town when eligible.
3. Resolve it from town/archive.
4. See the latest result in the Guild Journal.

### Implementation boundary

Allowed in the focused Board Echo patch:

- Add canonical Board Echo state under the existing Revisit save area.
- Detect eligibility from existing board/contract history only.
- Add deterministic active/completed/history records.
- Add duplicate-safe completion keys.
- Render available/active/completed Board Echo copy.
- Add Guild Journal read-only result summary.
- Add smoke coverage for start, resolve, reload, duplicate safety, and locked future-lane behavior.

Forbidden in the focused Board Echo patch:

- No combat route.
- No board mission generation.
- No reward, claim, currency, XP, gear, or progression payout.
- No Talent interaction.
- No debt interaction.
- No change to Trophy Echo, Famous Gear Memory, or Rival Trace semantics except smoke compatibility.
- No service worker/cache/version bump unless separately requested.

### Suggested smoke checklist

```powershell
node smoke_compact_suite.mjs
node tests/smoke/smoke_revisit_routes_v173.mjs
node tests/smoke/smoke_journal_v1233.mjs
```

A focused Board Echo smoke should prove:

- missing board/contract history keeps Board Echo locked;
- eligible history exposes Board Echo as available;
- start writes active Board Echo state;
- resolve writes completed/history state;
- save/reload preserves active and completed state;
- Guild Journal shows latest Board Echo result;
- existing Revisit lanes remain stable;
- Debt Pressure remains locked/planned.

## Priority 2: Debt Pressure v1 (#37)

### Player-facing goal

Debt Pressure should explain the current debt state and recovery path without making debt harsher.

The player should understand:

1. Whether they are clear, borrowed, rising, under collection, or recovering.
2. Why borrowing is allowed or blocked.
3. How repayment affects pressure.
4. What they should do next.

### Implementation boundary

Allowed in the focused Debt Pressure patch:

- Define a deterministic display-only pressure ladder.
- Improve town/archive copy for debt pressure state.
- Show recovery guidance after repayment lowers pressure.
- Record a small read-only notice/history entry only if it reuses existing safe debt state.
- Add smoke coverage for high pressure, blocked borrowing, repayment, and recovery copy.

Forbidden in the focused Debt Pressure patch:

- No new penalty system.
- No interest spike.
- No debt balance formula change unless a confirmed defect requires it.
- No wallet mutation rule change.
- No combat, gear, Talent, reward, progression, or Revisit behavior change.
- No punitive lockout beyond the existing collection gate.

### Suggested smoke checklist

```powershell
node smoke_compact_suite.mjs
node tests/smoke/smoke_debt_collector_v169.mjs
node tests/smoke/smoke_journal_v1233.mjs
```

A focused Debt Pressure smoke should prove:

- high pressure blocks borrowing before wallet/debt mutation;
- repayment remains available;
- repayment can lower visible pressure status;
- recovery copy appears when pressure improves;
- save/reload preserves relevant pressure state;
- no unrelated economy, combat, Talent, or Revisit behavior changes.

## Why These Are Separate Patches

Board Echo and Debt Pressure both touch protected systems. They should not be implemented in the same commit because a failure would be harder to review and smoke-test. Board Echo is Revisit-scoped; Debt Pressure is debt-scoped. Keeping them separate matches the repo contract and makes each patch easier to revert.
