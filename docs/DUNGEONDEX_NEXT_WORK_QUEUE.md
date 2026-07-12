# DungeonDex Historical Next Work Queue

This archived document preserves an older planning packet. It is not current authority and must not be used to reactivate Talent or Revisit work.

Historical baseline when written: `v1.21.2`. Use `VERSION.md` for the current baseline.

Version note: this PR does not bump `VERSION.md`. Version changes should only happen when an implementation patch is intentionally prepared.

## Current locked facts

- `VERSION.md` remains the source of truth for versioning.
- At the time of this archived plan, the public, package, and development target was `v1.21.2`.
- Hunter Board Clarity is the first complete controlled Talent loop.
- `hunter_board_clarity` remains the only live Talent spend target.
- Boss Trophy Milestone remains the first controlled Talent point source.
- Trophy Echo remains a Revisit readiness packet only.
- Trophy Echo is the first planned Revisit lane.
- Famous Gear Memory remains the second planned Revisit lane.
- Enter Dungeon and Continue Run remain the only active dungeon entry paths.

## Recommended next work

### 1. Talent loop stability pass

Goal: protect the completed Hunter Board Clarity Talent loop before adding a second live spend target.

Suggested checks:

- Verify Boss Trophy Milestone award remains one point and one claim record.
- Verify duplicate Boss Trophy claims stay blocked.
- Verify `hunter_board_clarity` can be learned once and persists after reload.
- Verify malformed Talent ledger inputs are clamped or repaired safely.
- Verify no second Talent node becomes spendable.

Definition of done:

- Smoke coverage proves the controlled Talent loop still works.
- No new Talent effects are activated.
- No Revisit, combat, economy, gear, monster, scaling, reward, or dungeon-entry behavior changes.

### 2. Trophy Echo readiness hardening

Goal: keep Revisit planning visible while preventing accidental activation.

Suggested checks:

- Trophy Echo remains first planned Revisit lane.
- Famous Gear Memory remains second planned Revisit lane.
- Trophy Echo exposes only read-only planning fields.
- No route entry, start, enter, claim, complete, unlock, rerun, resolve, reward, or save mutation surface exists.

Definition of done:

- Revisit smoke fails if any live route or reward behavior appears.
- Enter Dungeon and Continue Run remain the only active dungeon-entry paths.

### 3. Debt Collector clarity follow-up

Goal: decide whether Debt Collector clarity should stay as copy-only renderer support or receive another guarded smoke pass.

Suggested checks:

- Confirm Debt Collector clarity remains display-copy only.
- Confirm debt balance, pressure, repayment, wallet, economy, combat, rewards, and save state remain unchanged.
- Confirm Talent-owned helper ownership remains canonical.

Definition of done:

- Any Debt clarity work remains display-only unless a later patch explicitly changes the activation contract.

### 4. Release notes hygiene

Goal: keep the project easy to resume after context switching.

Suggested checks:

- Keep `DUNGEONDEX_CURRENT_NOTES.md` aligned with actual baseline.
- Keep `CHANGELOG.md` focused on committed changes only.
- Keep `README.md` high-level and player/dev friendly.
- Avoid old zip names, old release notes, or stale cache labels as version authority.

Definition of done:

- A future session can identify the current baseline without guessing.

## Safe next patch candidates

Pick one small patch at a time:

1. Add one more smoke fixture around Hunter Board Clarity reload persistence.
2. Add a Revisit guard for Trophy Echo blocked action names.
3. Add a docs-only explanation of the current Talent loop.
4. Add a Debt Collector clarity renderer-contract smoke check.
5. Add a version-label consistency guard if one is missing.

## Do not do in the next small patch

- Do not activate Trophy Echo as playable Revisit content.
- Do not add a second spendable Talent node.
- Do not add Talent respec.
- Do not change combat math.
- Do not change economy math.
- Do not change rewards.
- Do not change dungeon-entry routing.
- Do not mutate save shape unless the patch is explicitly about a guarded repair or migration.

## Suggested PR style

Use small pull requests with narrow names:

- `smoke: harden Hunter Board Clarity reload contract`
- `smoke: guard Trophy Echo blocked activation fields`
- `docs: clarify current Talent loop baseline`
- `smoke: verify Debt clarity remains display-only`

Each PR should explain:

- what changed
- what did not change
- what smoke checks protect it
- whether save state, rewards, combat, economy, or Revisit behavior changed
