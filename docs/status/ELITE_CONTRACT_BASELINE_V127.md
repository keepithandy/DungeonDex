# Elite Contract Baseline Audit - v1.27 #139

## Scope

This audit records the active Elite Contract lifecycle before the v1.27 presentation work. It does not change contract behavior, balance, save fields, or public UI.

## Current Live Lifecycle

1. The Lowfire Elite Board offers the established `lowfire_bounty`, `hazard_contract`, and `cinderjaw_bailiff` templates when no hunt is active.
2. A player may accept one available contract. Its active snapshot keeps target identity, location, bonus-writ state, payout amount, and completion state.
3. The normal dungeon generator marks only the matching encounter with `contractTarget` and its active contract ID.
4. Matching target defeat makes the contract claimable. A mismatched contract ID cannot complete it.
5. The existing Town claim action pays the stored contract reward once, then clears the active hunt and records the claimed ID. A completed but unclaimed hunt remains valid through save normalization so it can reach this claim step.
6. Active and completed-unclaimed contracts save and reload. Claimed IDs block duplicate payment. Invalid IDs, malformed list entries, and inactive failed/expired snapshots repair safely.
7. Target death can create an existing rival-history record; this is not a Revisit activation path.

## Existing Reward and Risk Contract

| Contract | Established base reward | Existing cap | Existing risk |
| --- | ---: | ---: | --- |
| Lowfire Bounty | 25 silver | 75 silver | Low |
| Hazard Contract | 60 silver | 1 gold 60 silver | Medium |
| Cinderjaw Bailiff | 42 silver | 1 gold 25 silver | Medium |

The existing floor bonus, active target scaling, bonus writ payout, elite trophy roll, and rival-writ behavior remain owned by `js/systems/03_town_contracts_market.js`. This audit records them; it does not retune them.

## Protected Contract

- No normal monster or boss scaling change.
- No combat action, power, guard, speed, or timing change.
- No alternate dungeon-entry path.
- No new currency, reward table, daily timer, or farming loop.
- No Debt, Talent, Merchant Gear Upgrade, or save-schema change.
- Trophy Echo remains the only active Revisit lane.

## Evidence

`tests/smoke/smoke_elite_contract_lifecycle_v127.mjs` runs the real loaded contract and save owners. It verifies available offers, one-active acceptance, exact target identity, matching-only completion, target scaling boundaries, one-time claim, active-contract save/reload, malformed-save repair, failed-claim blocking, and protected-state isolation.
