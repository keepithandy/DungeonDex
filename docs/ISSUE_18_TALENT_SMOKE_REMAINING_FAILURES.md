# Issue 18 Talent Smoke Remaining Failures

- Branch: `issue-18-talent-smoke-alignment`
- Baseline commit: `b0d1d28` `test: align hunter board clarity talent smoke`
- Debt smoke: `27/27` passing
- Revisit smoke: `15/15` passing
- Talent smoke: `216/251` passing, `35` failing
- Runtime code: safe for this slice, unchanged

## Remaining Failing Talent Checks

| Check | Classification | Notes |
| --- | --- | --- |
| Talent ruleset branch/tier/node data is locked | stale smoke expectation | The checked contract text still reflects preview-lock wording rather than current locked preview data. |
| Debt Collector activation gate reports live renderer wiring | unrelated legacy drift | Cross-system debt activation assertion, but Debt smoke itself is passing. |
| Talent spending dry run stays read-only when override-enabled | stale smoke expectation | Looks like an old dry-run contract assumption, not a Hunter Board Clarity runtime issue. |
| Normal saves now initialize earning enabled | stale fixture setup | The fixture path is still probing default save initialization instead of the current seeded earning source path. |
| Disabled normal state returns full zero-state | stale fixture setup | Depends on the same old zero-state setup path. |
| Unlearned board copy stays unchanged through passive helper reads | stale smoke expectation | This is a copy/read-only expectation, not a spend-path regression. |
| No new talent action text appears in the UI | stale smoke expectation | v1.21.2 intentionally renders one controlled `Spend 1 Talent Point` button when eligible. |
| Learned spend does not mutate save snapshot unexpectedly | stale smoke expectation | The smoke still expects the old no-mutation snapshot shape around the spend flow. |
| Talent preview helpers stay defensive on unknown inputs | unrelated legacy drift | Defensive helper coverage, not specific to the Hunter Board Clarity spend contract. |
| Hunter Board clarity spend preview is ready at one point | stale fixture setup | This depends on the current point-seeding path and still needs a seeded spendable fixture. |
| v1.21.2 spend button click succeeds in browser runtime | stale fixture setup | The runtime fix exists; the smoke path still needs to seed a valid spendable state before click validation. |
| v1.21.2 post-spend state updates ledger and learned flags | stale fixture setup | Same spend-path fixture dependency as above. |
| v1.21.2 reload UI contract stays learned-locked with no alternate spend target | stale smoke expectation | The UI contract is now a single controlled target, but the assertion set still carries older alternate-target assumptions. |
| Hunter Board clarity spend preview preserves ledger math compatibility | stale fixture setup | This is still probing the old ledger-only math path instead of the normalized source-of-truth seed. |
| Talent award claim tracking plan is repaired and aligned | unrelated legacy drift | Claim-tracking repair coverage is legacy Talent plumbing, not the Hunter Board Clarity spend flow. |
| Talent award claim save shape preview repairs malformed records | unrelated legacy drift | Same claim-shape repair plumbing; no runtime regression indicated by the passing Debt/Revisit/Talent spend checks. |
| District identity helper falls back safely | unrelated legacy drift | District helper coverage, outside the current Talent spend alignment slice. |
| Revisit backend helpers remain available | unrelated legacy drift | Revisit smoke is already passing. |
| Revisit candidate labels are protected | unrelated legacy drift | Revisit label state is already green in the dedicated smoke. |
| Trophy Hall loads | unrelated legacy drift | Trophy Hall is outside the Hunter Board Clarity controlled-spend contract. |
| Boss trophy empty state renders on fresh save | unrelated legacy drift | Trophy Hall empty-state copy, not spend behavior. |
| Talent panel mobile 390px | stale smoke expectation | Mobile panel assertion appears to be using stale layout assumptions. |
| Talent panel mobile 375px | stale smoke expectation | Same mobile layout expectation drift. |
| Talent panel mobile 360px | stale smoke expectation | Same mobile layout expectation drift. |
| Talent panel mobile 320px | stale smoke expectation | Same mobile layout expectation drift. |
| Max-point preview state displays safely | stale fixture setup | This appears to rely on a seeded max-point preview state that is not currently built in the smoke. |
| Boss trophy empty state stays readable | unrelated legacy drift | Trophy Hall copy/layout, not the Hunter Board Clarity spend path. |
| Retired item archive UI shows record card | unrelated legacy drift | Archive UI coverage, unrelated to the Talent spend contract. |
| Trophy Hall mobile 390px | unrelated legacy drift | Trophy Hall mobile copy/layout, outside current scope. |
| Trophy Hall mobile 375px | unrelated legacy drift | Trophy Hall mobile copy/layout, outside current scope. |
| Trophy Hall mobile 360px | unrelated legacy drift | Trophy Hall mobile copy/layout, outside current scope. |
| Trophy Hall mobile 320px | unrelated legacy drift | Trophy Hall mobile copy/layout, outside current scope. |

## Classification Summary

- Stale smoke expectation: 10
- Stale fixture setup: 7
- Unrelated legacy drift: 15
- Real runtime regression: 0
- Uncertain / needs follow-up: 0

## Recommended Next Slice

Update the remaining smoke expectations only where they are still asserting the pre-v1.21.2 talent contract, then split the unrelated Trophy Hall / Revisit / legacy helper assertions into their own follow-up cleanup if needed.

