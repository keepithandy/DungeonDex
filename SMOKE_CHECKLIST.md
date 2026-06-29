# SMOKE_CHECKLIST.md

## Purpose

Use this checklist when creating, updating, running, or reviewing DungeonDex smoke checks.

The goal is to make smoke checks consistent, narrow, and useful. A smoke check should prove that a specific behavior still works or remains safely locked without turning into a broad rewrite, brittle test, or hidden gameplay change.

DungeonDex smoke checks should protect the repo's most important rule: small patches should do only the requested thing and preserve locked systems.

## Core Smoke Principles

- Smoke checks should be narrow.
- Smoke checks should prove one clear contract.
- Smoke checks should be readable enough to audit quickly.
- Smoke checks should not mutate runtime behavior outside the test fixture.
- Smoke checks should not hide behavior changes.
- Smoke checks should not encode incorrect future assumptions.
- Smoke checks should not activate locked systems.
- Smoke checks should report clear pass/fail reasons.

## Smoke Verdicts

Every smoke review should end with one verdict:

```text
PASS — expected smoke checks passed.
PASS WITH NOTES — checks passed, but follow-up is recommended.
FAIL — one or more checks failed.
NOT RUN — checks were skipped and the reason is documented.
NOT APPLICABLE — no smoke check was needed for this patch type.
```

## Required First Step

Before adding or changing smoke coverage, read or confirm:

- `AGENTS.md`
- `VERSION.md`
- `DUNGEONDEX_CURRENT_NOTES.md`
- The issue, prompt, or Codex packet authorizing the change
- Existing smoke files related to the target system
- Any helper, renderer, save, or state function being protected

Do not add a smoke check until the behavior being protected is clearly stated.

## Smoke Identity Block

Fill this out before writing or reviewing smoke coverage:

```text
Smoke target:
Patch type:
System under test:
Expected behavior:
Expected locked behavior:
Runtime files changed: yes/no
Smoke files changed: yes/no
Command to run:
Reviewer:
Review date:
```

## 1. Choosing the Right Smoke Scope

A good smoke check answers one narrow question.

### Good Smoke Targets

- Talent points are awarded only under the expected condition.
- Talent spending consumes exactly the expected amount.
- Learned Talent state persists after save/reload.
- Duplicate spending is blocked.
- Hunter Board Clarity remains copy-only.
- Debt Collector clarity remains not live-renderer active.
- Revisit remains locked/read-only/planning-only.
- Version labels match after a release-label patch.
- A helper returns a read-only contract object.
- A UI copy helper changes display text without changing gameplay math.

### Poor Smoke Targets

- Test the entire game at once.
- Assert every UI string in the project.
- Recreate combat balance in a brittle fixture.
- Depend on unrelated DOM layout details.
- Treat a future planned system as active.
- Hide a behavior change by updating expectations without explanation.

## 2. Patch-Type Smoke Requirements

### Docs-Only

Smoke checks are usually not required.

Required verification:
- Markdown is readable.
- No runtime files changed.
- No docs claim smoke checks passed unless they actually passed.

### Smoke-Only

Required verification:
- Only smoke/test files changed.
- Runtime behavior did not change.
- Smoke check has a clear target.
- Smoke check protects expected behavior or locked behavior.
- Smoke command was run if available.

### Contract / Helper

Required verification:
- Helper behavior is tested or manually verified.
- Helper is read-only or non-mutating unless mutation was explicitly requested.
- Helper is not wired into live gameplay unless activation was explicitly requested.
- Locked system state is asserted where relevant.

### Activation

Required verification:
- Activated behavior is tested.
- Boundary/locked behavior is still tested.
- Save/reload impact is checked if persistent state is involved.
- Rollback risk is documented.

### Release-Label / Cache-Label

Required verification:
- Version strings were searched as required by `AGENTS.md`.
- Public/runtime/cache labels match the requested version.
- No gameplay behavior changed.

### Bugfix

Required verification:
- Bug condition is covered by a check where practical.
- Regression behavior is protected.
- Fix is not just a changed expectation.
- Related locked systems still pass or are manually verified.

## 3. DungeonDex Locked-System Smoke Review

When smoke coverage touches these systems, confirm the correct locked behavior.

### Revisit

Expected locked behavior:
- Revisit remains read-only/planning-only.
- No Revisit entry/start/claim/complete/reward/progression/farming behavior exists unless explicitly activated.
- Revisit helpers are not re-exported unless explicitly requested.

Useful assertions:
- No live Revisit entry action is exposed.
- No Revisit reward/claim path is active.
- Planning copy does not imply playable behavior.

### Talent

Expected guarded behavior:
- Existing Talent foundation remains valid.
- Talent earning works only where already implemented.
- Talent spending consumes the expected amount.
- Learned state persists where already implemented.
- Duplicate spending is blocked.
- New Talent branches/currencies are not added unless requested.

Useful assertions:
- Talent point total changes only by expected amount.
- Learned node state survives save/reload.
- Duplicate spend attempt does not consume another point.
- No unrelated node becomes spendable.

### Passive Effects

Expected guarded behavior:
- Passive effects remain copy-only/read-only unless explicitly activated.
- Hunter Board Clarity remains existing copy-only behavior unless changed by scope.
- Debt Collector clarity does not set `liveRendererWired: true` unless explicitly unlocked.

Useful assertions:
- Helper reports read-only/copy-only metadata correctly.
- Renderer activation flags remain false for locked passives.
- Copy changes do not alter gameplay math.

### Combat / Economy / Rewards

Expected locked behavior:
- No combat math changes unless requested.
- No monster scaling changes unless requested.
- No HP, damage, XP, gold, drop, or reward economy changes unless requested.

Useful assertions:
- Changed patch does not touch combat/economy files unless explicitly scoped.
- Test fixture does not alter baseline balance constants.
- Reward values remain unchanged unless targeted.

### Save / Reload

Expected guarded behavior:
- Existing saves remain compatible.
- New state has safe defaults if explicitly added.
- Save/reload does not erase learned or earned state.
- Locked systems do not become active after reload.

Useful assertions:
- Save object shape remains compatible.
- Reload preserves intended persistent values.
- Missing optional fields do not crash helper logic.

## 4. Smoke Implementation Checklist

Before committing a smoke change, confirm:

```text
[ ] Smoke target is named clearly
[ ] Test fixture is minimal
[ ] Test data is explicit
[ ] Assertions are specific
[ ] Failure messages explain what broke
[ ] Test does not rely on unrelated layout or copy
[ ] Test does not mutate global state without reset
[ ] Test does not activate locked behavior
[ ] Test does not silently weaken previous coverage
[ ] Runtime files are unchanged for smoke-only patches
[ ] Relevant smoke command was run or skipped with reason
```

## 5. Running Smoke Checks

Before running checks:

- Confirm the command name.
- Confirm the repo root.
- Confirm dependencies are installed if required.
- Confirm whether the check is Node-based, browser-based, or manual.

Report the exact command:

```text
Checks run:
- `npm run smoke:talent` — passed
```

Do not report vague results:

```text
Looks fine.
Smoke passed probably.
Tests should pass.
```

## 6. Smoke Failure Handling

If a smoke check fails:

1. Stop.
2. Capture the failing command.
3. Capture the failure message.
4. Identify whether the failure is from the patch, fixture, environment, or pre-existing issue.
5. Do not hide the failure.
6. Do not change expected behavior just to make the check pass.
7. Fix only if the fix is inside the authorized scope.
8. If outside scope, report it as a follow-up issue.

Failure report template:

```text
Smoke failure:
- Command: [command]
- Failure: [message]
- Likely cause: [patch/fixture/environment/pre-existing/unknown]
- Scope status: [inside scope/outside scope]
- Recommended action: [fix now/follow-up issue/block commit]
```

## 7. Manual Smoke Checks

Manual smoke checks are acceptable when automated coverage is unavailable, but they must be specific.

Good manual smoke:

```text
Manual check:
- Opened Talent panel.
- Confirmed Hunter Board Clarity label shows copy-only clarity text.
- Confirmed no second Talent node became spendable.
- Confirmed Debt Collector clarity still reports liveRendererWired:false.
```

Poor manual smoke:

```text
Clicked around. Seems okay.
```

## 8. Smoke Report Template

Use this after running smoke checks:

```text
Smoke verdict:
- [PASS | PASS WITH NOTES | FAIL | NOT RUN | NOT APPLICABLE]

Smoke target:
- [behavior/system]

Patch type:
- [docs-only | smoke-only | contract/helper | activation | release-label/cache-label | bugfix]

Commands run:
- [command] — [result]

Manual checks:
- [manual check] — [result]

Checks not run:
- [check] — [reason]

Locked systems verified:
- [system] — [status]

Failures:
- [failure or None]

Risk:
- [low/medium/high and why]

Recommended next step:
- [commit/fix/follow-up/revert]
```

## 9. Fast Smoke Checklist

Use this for small patches:

```text
[ ] Correct smoke target
[ ] Correct patch type
[ ] Runtime files unchanged if smoke-only
[ ] Assertions protect real behavior
[ ] Assertions do not activate planned systems
[ ] Revisit remains locked if relevant
[ ] Talent expansion remains locked if relevant
[ ] Debt Collector clarity remains not live-renderer active if relevant
[ ] Save/reload checked if persistent state changed
[ ] Exact command reported
[ ] Pass/fail result reported
[ ] Skipped checks explained
[ ] Failure handled honestly
```

## 10. Automatic Smoke Rejection Conditions

Reject or rewrite smoke coverage if it:

- Activates gameplay behavior while claiming to test only.
- Changes runtime behavior in a smoke-only patch.
- Changes expected values to match a broken patch without explanation.
- Removes existing coverage without replacement.
- Tests broad unrelated behavior instead of the target contract.
- Depends on fragile formatting unrelated to the contract.
- Implies Revisit is playable when it is locked.
- Implies passive gameplay effects are active when they are copy-only/read-only.
- Allows Debt Collector clarity to become live-renderer active without explicit activation.
- Claims checks passed without command output or clear verification.

## 11. Suggested Smoke-Only Commit Message Format

Use:

```text
smoke: [specific behavior protected]
```

Examples:

```text
smoke: lock Debt Collector clarity renderer state
smoke: preserve Talent learned state after reload
smoke: guard Hunter Board Clarity copy-only behavior
smoke: verify Revisit remains planning-only
```

Avoid:

```text
smoke updates
more tests
fix tests
misc smoke
```

## Review Principle

Do not ask, "Did the smoke pass?"

Ask:

```text
Did this smoke check prove the exact behavior we care about without changing or activating anything else?
```

If the answer is not clearly yes, do not commit the smoke change yet.
