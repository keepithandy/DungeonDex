# DungeonDex Open Issue Sweep

This document groups the current open DungeonDex issue set into safe work lanes so agents can make progress without turning every issue into one oversized runtime patch.

Baseline for this sweep: **v1.23.7 Rival Trace Result Detail Polish**.

## Scope Rule

This sweep advances every open issue by assigning it a concrete repo surface, next action, and guardrail. It does not claim that every issue is complete. Runtime behavior remains unchanged unless a later focused issue patch explicitly targets that system and passes the relevant smoke checks.

## Open Issue Matrix

| Issue | Work lane | Repo surface advanced by this sweep | Next safe implementation action |
|---:|---|---|---|
| #36 | Board Echo v1 | `docs/PLAYABLE_SYSTEMS_QUEUE.md` | Implement Board Echo as its own focused Revisit patch after reading the Revisit files and smoke. |
| #37 | Debt Pressure v1 | `docs/PLAYABLE_SYSTEMS_QUEUE.md` | Implement Debt Pressure clarity/recovery as its own focused debt patch after reading the debt foundation and smoke. |
| #38 | Premise / player promise | `README.md`, `docs/IP_LAYER_GUIDE.md` | Keep README and player-facing copy anchored to the same premise. |
| #39 | Feature glossary | `docs/IP_LAYER_GUIDE.md` | Use the glossary before adding new public copy. |
| #40 | Visual identity rules | `docs/IP_LAYER_GUIDE.md` | Apply rules during future UI/art polish without a broad redesign. |
| #41 | Lore bible | `docs/IP_LAYER_GUIDE.md` | Use the compact lore only as support copy; do not block playable content. |
| #42 | Factions and NPC roles | `docs/IP_LAYER_GUIDE.md` | Reuse roles in town, Journal, Revisit, and debt copy where appropriate. |
| #43 | Copy audit | `docs/IP_LAYER_GUIDE.md`, `README.md` | Replace dev-only wording on player-facing surfaces when touched by focused patches. |
| #44 | Asset hygiene | `docs/ASSET_INVENTORY.md` | Fill in real asset provenance as screenshots, fonts, icons, or audio are added. |
| #45 | README identity refresh | `README.md` | Keep playable-now and planned-next sections separate. |
| #46 | Title/logo usage | `docs/IP_LAYER_GUIDE.md` | Use `DungeonDex` consistently; avoid unlicensed logo assets. |
| #47 | Screenshot/hero-card plan | `docs/IP_LAYER_GUIDE.md` | Capture honest screenshots from playable systems first. |
| #48 | Revisit flavor pass | `docs/IP_LAYER_GUIDE.md` | Apply flavor text to live Revisit lanes only in a copy-safe patch. |
| #49 | Public copy smoke coverage | `docs/IP_LAYER_GUIDE.md` | Add stable label smoke checks only after finalizing the target labels. |
| #50 | Public roadmap | `README.md`, `docs/OPEN_ISSUE_SWEEP.md` | Keep playable-content, identity, asset, and smoke work separated. |
| #51 | Loading/title copy | `docs/IP_LAYER_GUIDE.md` | Implement loading/title copy later without save or route changes. |

## Recommended Pull Order

1. **#36 Board Echo v1** — best next playable-content patch.
2. **#37 Debt Pressure v1** — best next system-completion patch.
3. **#49 Public copy smoke coverage** — protects identity copy after the new wording stabilizes.
4. **#48 Revisit flavor pass** — improves the live memory lanes once the gameplay boundary is stable.
5. **#44 Asset hygiene inventory** — keep filling this as public media becomes real.

## Guardrails for This Sweep

- No version bump.
- No runtime label change.
- No service worker/cache change.
- No new route start button.
- No Revisit reward, claim, farming, combat, or progression loop.
- No Talent cost, earning, learned-state, or passive-stat change.
- No debt balance, pressure, repayment, wallet, or economy math change.
- No new dependency.

## Validation Expected for This Sweep

Documentation-only verification:

```powershell
git diff --check
```

Recommended before merging a runtime follow-up:

```powershell
node smoke_compact_suite.mjs
node smoke_revisit_routes_v173.mjs
node smoke_debt_collector_v169.mjs
node smoke_journal_v1233.mjs
```
