# Reward-curve decision: no-change control

Primary category: Audit. Starting point: local `main` at `c0bd8c0`; focused branch: `work/reward-curve-decision`. Version remains v1.28.2 Loadout Polish. This milestone adds executable evidence and a decision record only. It does not alter runtime balance.

## Live no-change control

The executable owner is `tests/smoke/smoke_rarity_progression_audit_v1280.mjs`. It calls the live drop, scarcity, rarity, set, and threat-depth helpers. The control points below are expected gear drops and Legendary-or-Mythic items per encounter, not a prediction of a mixed player run.

| Depth | Source | Gear / encounter | High-tier / encounter |
|---:|---|---:|---:|
| D30 | Normal | 0.4800 | 0.0048 |
| D30 | Elite | 0.1600 | 0.0032 |
| D40 | Normal | 0.4914 | 0.0097 |
| D40 | Elite | 0.1512 | 0.0067 |
| D40 | Boss* | 1.3378 | 0.1367 |
| D43 | Normal | 0.4914 | 0.0168 |
| D43 | Elite | 0.6804 | 0.0416 |

*The D40 boss row is a conditional diagnostic: D40 is not a real boss slot. Boss cadence remains every 15 raw depths.

The first live elite gear-frequency crossover is raw D43, which maps to threat 15. D40 begins both the first scarcity band and the Mythic-set gate, while D40-D42 still exclude ordinary Mythic rolls. The current uniform four-set/five-slot model has a 24-drop median, 36-drop p90, 40-drop p95, and 10.49 average duplicates before the first complete set. Those collection figures are conditional on eligible set drops, not playtime or a total-yield forecast.

## Exact alternatives considered — none selected

| Option | Exact before → after | Expected effect | Decision |
|---|---|---|---|
| A. No change | All current values remain as above. | Preserves the control and leaves D43 as the elite crossover. | **Retained.** |
| B. Smooth early elite frequency | Elite base gear chance at threat 5-9: 12% → 18%; threat 10-14: 16% → 24%; threat 15+: 72% unchanged. Existing scarcity multipliers remain applied afterward. | Raises D30 Elite gear expectation 0.1600 → 0.2400 and D40 Elite 0.1512 → 0.2268 before any conditional-rarity change. | Not selected; would need mixed-run yield, contract, economy, and boss regression evidence. |
| C. Separate the D40 collision | Mythic-set gate: raw D40/safe D40 → raw D39/safe D39. Set chance and scarcity multipliers unchanged. | Gives the existing set route one raw depth before scarcity begins. | Not selected; changes progression access and needs save/history and player-feedback review. |
| D. Missing-piece relief | Uniform 20-cell selection → uniformly choose a missing slot within a selected unfinished set, then retain uniform selection after completion. | Reduces duplicate burden but needs explicit collection ownership and persistence policy. | Rejected for this scope; it would introduce stateful behavior and resembles a pity system. |

No runtime option was silently chosen. Option A is the documented control, not a new balance policy. The next player-facing work should improve loot and return clarity around the existing D40 gate before any tuning is reconsidered.

## Protected behavior and verification

Unchanged: rarity weights/caps, all normal/elite/boss/merchant/forge/set drop chances, scarcity bands, set definitions and selection, combat/scaling/rewards/economy, contracts, saves, upgrades, entry, loadouts, version/cache labels, and inactive systems.

Verification for this evidence patch: the rarity audit must pass its 33 live depth/source rows, 30,000-trial conditional duplicate model, fixed no-change control points, and raw-D43 crossover assertion; app wiring, full compact, and `git diff --check` remain required before merge. Physical-device issue #139 is unaffected. No push, package, tag, upload, or version update is part of this patch.

Reviewer handoff: verify that every control point calls the live helper path, that D40 boss data remains labeled hypothetical, and that all alternatives are documentation rather than runtime values. Reject any change that turns an option into a silent tuning decision.
