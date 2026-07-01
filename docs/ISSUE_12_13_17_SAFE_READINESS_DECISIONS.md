# Issue 12, 13, and 17 Safe Readiness Decisions

Branch: `issues-12-13-15-17-19-20-safe-board-cleanup`

This note resolves the planning-only portions for Debt Collector clarity, Revisit Trophy Echo readiness, and second passive candidate selection. It does not activate any new runtime behavior.

## Issue 17: second passive candidate selection

Selected next candidate: `debt_collector_clarity`.

Reasoning:

- It is already defined as a display/copy-only Talent surface.
- It has clear player value: debt language becomes easier to read without changing debt pressure or repayment rules.
- It is easier to smoke-test than a reward, combat, or route effect.
- It can reuse the Hunter Board Clarity safety pattern: learned state gates copy clarity, while gameplay math stays untouched.

Rejected for now:

- `collector_famous_memory`: useful, but it overlaps with Archive/Revisit memory surfaces and should wait until Revisit lane language is firmer.
- `collector_item_appraisal`: useful, but it risks implying gear-value/economy changes.
- `hunter_rival_trace`: useful, but it could imply rival routing or encounter information changes.
- `delver_*` candidates: defer because depth, stairs, and charters touch progression expectations.

Decision: the future second passive contract target should be `debt_collector_clarity`, but this issue does not make it spendable and does not wire activation.

## Issue 12: Debt Collector clarity activation design packet

Allowed future learned-copy fields:

- Text labels such as `statusLabel`, `balanceLabel`, `pressureLabel`, `termsLabel`, and `reminderLabel`.
- Renderer copy model text such as `summaryText`, `statusText`, `balanceText`, `pressureText`, `pressureDetail`, `flavorText`, `termsText`, `statusMetaText`, `lastVisitText`, and `notesText`.
- Copy-only metadata such as `passiveSurface`, `clarityApplied`, `copyModelRendererWired`, and `previewOnly`.

Never-mutating fields:

- Debt active state.
- Debt balance or wallet totals.
- Debt pressure math.
- Repayment state or repayment results.
- Save shape outside existing read/repair rules.
- Economy, rewards, combat, gear, monsters, dungeon progress, scaling, Revisit, or Elite Board math.
- Talent point totals, Talent spend targets, or broad Talent UI state.

Activation checklist for a future issue:

1. Explicitly authorize `debt_collector_clarity` activation in a separate issue.
2. Confirm the node is learned through an already-safe Talent path.
3. Wire only display-copy fields into the live Debt panel.
4. Keep `debtMath:false`, `mutatesSave:false`, `combat:false`, `economy:false`, and `rewards:false` in the contract.
5. Add or update Debt smoke so it proves copy changes without balance, pressure, wallet, repayment, or save mutation.
6. Run Talent, Debt, and Revisit smokes before closing the activation issue.

Current status: design-ready, not activation-ready. `liveRendererWired` must remain false unless a future activation issue explicitly changes it.
`copyModelRendererWired` may be true for display-only copy-model wiring without implying live renderer activation.
Debt Collector repayment is tracked separately as a Debt-owned live action; it may mutate wallet and debt balance without activating the Talent clarity passive.

## Issue 13: Revisit Trophy Echo readiness note

Trophy Echo remains the first planned Revisit lane.

Allowed current readiness language:

- Lane name.
- Planned purpose.
- Source history.
- Locked status.
- Read-only preview notes.
- Future contract questions.

Blocked current surfaces:

- Start, enter, rerun, claim, complete, unlock, or resolve buttons.
- Route entry points.
- Reward tables.
- Reward grants.
- Completion records.
- Claim records.
- Save mutation.
- Any replacement of Enter Dungeon / Continue Run as the primary dungeon entry.

Remaining questions before future activation:

- What historical trophy data is safe to display without creating a route?
- What is the exact preview text for a locked Trophy Echo lane?
- Which smoke assertion proves no entry, reward, completion, or save mutation exists?
- What later issue explicitly authorizes activation?

Current status: Trophy Echo is readiness-only. Famous Gear Memory remains the second planned Revisit lane as inert metadata.

## Board guardrail summary

These decisions do not activate a second passive, do not unlock Revisit, do not change Debt Collector math, and do not touch combat, economy, rewards, gear, monsters, scaling, or dungeon entry.
