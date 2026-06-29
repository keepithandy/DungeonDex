# DungeonDex System Priority Audit

Patch: `v1.23.2 - Newer Systems Priority Audit`

Scope: audit / planning only. No gameplay activation.

## 1. Executive Summary

DungeonDex has three distinct classes of newer systems:

1. Finished and safe systems with stable smoke coverage.
2. Partially implemented systems that are intentionally locked or copy-only.
3. Helper-only or contract-only systems that look more complete than they are.

The highest-value next work is not broad feature activation. It is finishing the source-of-truth gaps around Talent contracts, passive readiness semantics, and Revisit planning boundaries without changing gameplay.

Top repo evidence:

- Talent foundation and preview lattice: [`js/systems/19_warden_talents_lowfire_board.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/19_warden_talents_lowfire_board.js)
- Controlled Talent spend helper: [`js/systems/33_talent_hunter_board_clarity_spend.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/33_talent_hunter_board_clarity_spend.js)
- Talent claim repair contract: [`js/systems/32_talent_award_claim_repair_contract.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/32_talent_award_claim_repair_contract.js)
- Passive gate hotfix: [`js/systems/30_passive_activation_gate_hotfix.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/30_passive_activation_gate_hotfix.js)
- Revisit lockdown: [`js/systems/31_revisit_activation_surface_lockdown.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/31_revisit_activation_surface_lockdown.js)
- Debt Collector foundation: [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js)
- Current working notes: [`DUNGEONDEX_CURRENT_NOTES.md`](/C:/Users/quali/Desktop/DungeonDex/DUNGEONDEX_CURRENT_NOTES.md)
- Architecture summary: [`docs/CURRENT_ARCHITECTURE.md`](/C:/Users/quali/Desktop/DungeonDex/docs/CURRENT_ARCHITECTURE.md)

## 2. Current Safe Baseline

The current baseline is version `v1.23.1` per [`VERSION.md`](/C:/Users/quali/Desktop/DungeonDex/VERSION.md). The repo notes consistently state:

- Trophy Echo is the only live Revisit lane.
- Enter Dungeon / Continue Run remains the only active dungeon entry path.
- Broader Talent activation remains locked.
- Debt Collector clarity remains copy/display only.

This is reinforced by:

- `Trophy Echo` live-state contract in [`js/systems/31_revisit_activation_surface_lockdown.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/31_revisit_activation_surface_lockdown.js)
- Locked preview and helper-only Talent vocabulary in [`js/systems/19_warden_talents_lowfire_board.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/19_warden_talents_lowfire_board.js)
- Copy-only Debt contract boundary in [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js)

## 3. Finished Systems

These look finished enough for current scope:

- Monster backdrop visuals are explicitly visual-only and non-gameplay in [`js/systems/29_monster_backdrops_canvas.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/29_monster_backdrops_canvas.js) and `smoke_monster_backdrops_v120.mjs`.
- Debt Collector borrow/repay/pressure behavior is stable as foundation code in [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js) with smoke coverage in `smoke_debt_collector_v169.mjs`.
- Trophy Echo’s current live loop is stabilized and smoke-covered in `smoke_revisit_routes_v173.mjs`.
- Controlled Hunter Board Clarity spend is stable at the single-node level and smoke-covered in `smoke_talent_v150b.mjs` and `smoke_talent_spend_v12048.mjs`.

What makes these safe:

- they are already smoke-backed,
- they are narrow,
- they have explicit non-expansion comments,
- and the repo docs repeatedly call out what they do not change.

## 4. Partially Implemented / Locked Systems

### Talent system

Evidence:

- Preview lattice and branch metadata in [`js/systems/19_warden_talents_lowfire_board.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/19_warden_talents_lowfire_board.js) via `TALENT_PASSIVE_PREVIEW_MAP`, `TALENT_RULESET_PREVIEW`, `talentTreePreview`, `talentRulesetPreview`, `talentPreviewNodes`.
- Earning contract helpers via `talentEarningSourceContract`, `talentEarningEnabled`, `talentEarningStatus`.
- Copy-only passive helpers and readiness vocabulary via `hunterBoardClarityPassiveContract`, `debtCollectorClarityPassiveContract`, `talentPassiveActivationGateDryRun`.
- Internal save-repair helper in [`js/systems/32_talent_award_claim_repair_contract.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/32_talent_award_claim_repair_contract.js) via `normalizeTalentAwardClaims`, `repairTalentAwardClaimsOnState`.
- Controlled spend helper in [`js/systems/33_talent_hunter_board_clarity_spend.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/33_talent_hunter_board_clarity_spend.js) via `applyHunterBoardClaritySpend`, `hunterBoardClaritySpendUiReadinessModel`.

Status:

- Broad Talent is intentionally preview-only.
- One controlled spend node is live.
- Passive vocabulary is contract-heavy, but not a broad active tree.
- Claim tracking and earning are present as helper/repair surfaces, not a broad player-facing expansion.

### Debt Collector clarity

Evidence:

- `debtCollectorClarityPassiveContract`, `applyDebtCollectorClarityCopy`, and `debtCollectorClarityRendererCopyModel` in [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js).
- Passive-gate semantics in [`js/systems/30_passive_activation_gate_hotfix.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/30_passive_activation_gate_hotfix.js) using `liveRendererWired`, `passiveReady`, `passiveEnabled`, `appliesGameplayEffect`.
- Repo notes explicitly warn not to activate live Debt renderer wiring unless explicitly requested.

Status:

- Helper-ready, copy-only, and intentionally constrained.
- High risk if touched because its wording is already semantically loaded with activation terms.

### Revisit system

Evidence:

- Revisit route preview / unlock helpers in [`README.md`](/C:/Users/quali/Desktop/DungeonDex/README.md) and [`docs/CURRENT_ARCHITECTURE.md`](/C:/Users/quali/Desktop/DungeonDex/docs/CURRENT_ARCHITECTURE.md).
- Live lockout surface in [`js/systems/31_revisit_activation_surface_lockdown.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/31_revisit_activation_surface_lockdown.js).
- Current notes state Famous Gear Memory remains inert metadata and Rival Trace remains planning only.

Status:

- Trophy Echo is live.
- All other Revisit lanes remain locked/planning-only.
- This is deliberately a boundary system, not a content system.

### District / depth / charter / shop surfaces

Evidence:

- `js/systems/04_depth_progression_charters.js`
- `js/systems/03_town_contracts_market.js`
- `js/systems/10_ui_town_shop.js`
- `js/systems/17_relic_forge_clarity.js`
- `js/systems/18_relic_forge_compact_text.js`
- `js/systems/21_build_label_guard.js`

Status:

- These are mostly mature support layers.
- They matter because they gate presentation, pricing, and progression surfaces, but there is no sign in the current audit that they are the next unfinished feature frontier.

## 5. Newer Systems Needing Attention

### 1. Talent passive contract clarity

Why it matters:

- The repo now has multiple overlapping Talent surfaces: broad preview tree, earning contract, repair contract, spend preview, passive contract, and passive gate.
- The risk is not gameplay drift; it is stale semantics. Some helpers read like active features even when they are still contract-only.

Key files:

- [`js/systems/19_warden_talents_lowfire_board.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/19_warden_talents_lowfire_board.js)
- [`js/systems/30_passive_activation_gate_hotfix.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/30_passive_activation_gate_hotfix.js)
- [`js/systems/32_talent_award_claim_repair_contract.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/32_talent_award_claim_repair_contract.js)
- [`js/systems/33_talent_hunter_board_clarity_spend.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/33_talent_hunter_board_clarity_spend.js)

### 2. Revisit boundary hygiene

Why it matters:

- Revisit is partly live and partly locked.
- The current surface is easy to misread because many helper names sound like activation paths even when they are just planning or summary helpers.

Key files:

- [`js/systems/31_revisit_activation_surface_lockdown.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/31_revisit_activation_surface_lockdown.js)
- [`README.md`](/C:/Users/quali/Desktop/DungeonDex/README.md)
- [`DUNGEONDEX_CURRENT_NOTES.md`](/C:/Users/quali/Desktop/DungeonDex/DUNGEONDEX_CURRENT_NOTES.md)

### 3. Debt clarity semantics

Why it matters:

- Debt Collector clarity is the most likely place to accidentally cross from display-copy into live renderer wiring.
- The current code already has explicit `liveRendererWired` language, so stale comments here can mislead future agents if they read it as a gameplay switch.

Key files:

- [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js)
- [`js/systems/30_passive_activation_gate_hotfix.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/30_passive_activation_gate_hotfix.js)

### 4. Save/load compatibility helpers

Why it matters:

- The Talent claim repair contract is already mutating save shape repair at load time.
- That is useful, but it is also the main place where an innocent cleanup can become a save-compat regression.

Key files:

- [`js/systems/08_normalization_save.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/08_normalization_save.js)
- [`js/systems/32_talent_award_claim_repair_contract.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/32_talent_award_claim_repair_contract.js)

## 6. Priority List

### P0

- Keep the current source-of-truth docs aligned with the locked/live boundaries.
- Remove or rewrite misleading activation language only when it is clearly documentation-only.
- Protect save-compat helpers from accidental widening.

### P1

- Finish the Talent contract vocabulary cleanup so helper-only, preview-only, and live surfaces are unmistakable.
- Tighten the documentation around what `passiveReady`, `passiveEnabled`, `appliesEffect`, and `liveRendererWired` mean in practice.

### P2

- Improve Revisit planning docs so future work can see exactly which lane is live and which are inert.
- Improve smoke comments around the Talent spend / claim repair flow so the next patch does not have to re-derive the same boundary rules.

### P3

- District/depth/shop/town presentation cleanup.
- Broader passive-tree expansion.
- Any new active Talent nodes beyond the current controlled path.

### Blocked

- Revisit activation expansion.
- New Talent behavior beyond the current controlled spend and helper contracts.
- Debt Collector live renderer activation.

## 7. Recommended Next 3 Patches

1. Talent contract vocabulary cleanup.
2. Revisit boundary documentation and smoke note consolidation.
3. Save-compat helper audit for the Talent claim repair path.

## 8. Do-Not-Touch Warnings

- Do not activate Revisit.
- Do not add new Talent behavior.
- Do not activate Debt Collector clarity.
- Do not change combat math.
- Do not change reward math.
- Do not change economy balance.
- Do not change save schema.
- Do not change district IDs.
- Do not change depth ranges.
- Do not change unlock thresholds.

## 9. Smoke Coverage Map

- `smoke_talent_v150b.mjs`: broad Talent smoke, ruleset preview, readiness, spend stability, and cross-system no-op checks.
- `smoke_talent_spend_v12048.mjs`: focused controlled Hunter Board Clarity spend helper contract.
- `smoke_debt_collector_v169.mjs`: Debt Collector foundation, copy-model, and renderer-copy contract coverage.
- `smoke_revisit_routes_v173.mjs`: Trophy Echo live lane, route lockdown, duplicate blocking, and reload persistence.
- `smoke_monster_backdrops_v120.mjs`: visual-only monster backdrop contract.

Coverage gap:

- There is no dedicated smoke file for the passive-gate vocabulary itself.
- There is no dedicated smoke file for the Talent claim repair contract alone.

## 10. Specific Files / Functions to Inspect Next

### Talent

- [`js/systems/19_warden_talents_lowfire_board.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/19_warden_talents_lowfire_board.js): `TALENT_RULESET_PREVIEW`, `talentPassivePreviewSummary`, `talentTreePreview`, `talentEarningStatus`, `talentPassiveActivationGateDryRun`
- [`js/systems/32_talent_award_claim_repair_contract.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/32_talent_award_claim_repair_contract.js): `normalizeTalentAwardClaims`, `repairTalentAwardClaimsOnState`, `talentAwardMutationPreview`, `applyTalentAwardMutation`
- [`js/systems/33_talent_hunter_board_clarity_spend.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/33_talent_hunter_board_clarity_spend.js): `hunterBoardClaritySpendUiReadinessModel`, `applyHunterBoardClaritySpend`, `talentControlledSpendHardeningAudit`

### Debt

- [`js/systems/28_debt_collector_foundation.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/28_debt_collector_foundation.js): `debtCollectorDisplaySummary`, `debtCollectorClarityPassiveContract`, `debtCollectorClarityRendererCopyModel`, `panelMarkup`
- [`js/systems/30_passive_activation_gate_hotfix.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/30_passive_activation_gate_hotfix.js): `summarizeGateEntry`, `verificationFromGate`, `patchApi`

### Revisit

- [`js/systems/31_revisit_activation_surface_lockdown.js`](/C:/Users/quali/Desktop/DungeonDex/js/systems/31_revisit_activation_surface_lockdown.js): `trophyEchoActivationChecklist`, `routeSurfaceReport`, `removeForbiddenExports`

### Docs

- [`README.md`](/C:/Users/quali/Desktop/DungeonDex/README.md)
- [`CHANGELOG.md`](/C:/Users/quali/Desktop/DungeonDex/CHANGELOG.md)
- [`DUNGEONDEX_CURRENT_NOTES.md`](/C:/Users/quali/Desktop/DungeonDex/DUNGEONDEX_CURRENT_NOTES.md)
- [`docs/CURRENT_ARCHITECTURE.md`](/C:/Users/quali/Desktop/DungeonDex/docs/CURRENT_ARCHITECTURE.md)
- [`docs/PATCH_TEMPLATE.md`](/C:/Users/quali/Desktop/DungeonDex/docs/PATCH_TEMPLATE.md)
- [`docs/RELEASE_CHECKLIST.md`](/C:/Users/quali/Desktop/DungeonDex/docs/RELEASE_CHECKLIST.md)

## 11. Next Best Objective

**Next best objective:** normalize the Talent passive / spend / claim vocabulary and add a dedicated smoke boundary for the claim-repair contract, while keeping Revisit locked and Debt Collector clarity non-wired.

That objective is high-value because it reduces future ambiguity without expanding gameplay, and it is safer than finishing any new live system.
