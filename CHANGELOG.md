# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.20.39`
* Current local package baseline: `v1.20.39`
* Current development target: `v1.20.39`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## v1.20.39 - Talent Point Source Decision

* Selected Boss Trophy Milestone as the first Talent point source.
* Deferred Floor Milestone and Major Archive Milestone for later decisioning.
* Kept point earning, spending, unlocks, Debt behavior, Revisit behavior, combat, economy, and save shape unchanged.

## v1.20.38 - Talent State Contract Consolidation

* Added a canonical Talent state contract helper to unify preview, selection, learning, live-render, and save-mutation vocabulary.
* Kept talent earning, spending, unlocks, Debt behavior, Revisit behavior, combat, economy, and save shape unchanged.

## v1.20.37 - Build Query Label Uniformity Cleanup

* Standardized visible runtime labels, cache labels, and script-tag query strings on `v1.20.37`.
* Kept Debt Collector logic, renderer behavior, Talent state, Revisit state, combat, economy, gear, and save shape unchanged.

## v1.20.36 - Live Debt Clarity Renderer Wiring

* Wired the existing Debt Collector renderer copy model into the live Debt panel for learned state only.
* Kept the live panel text-only, nonredundant, and gameplay-neutral while preserving the unlearned output exactly.
* Updated Debt Collector clarity metadata so learned state now reports `passiveEnabled:true` and `liveRendererWired:true` while `appliesEffect:false` remains unchanged.
* Added smoke coverage for live renderer wiring, duplicate-label avoidance, read-only model output, and unchanged debt state, wallet, pressure, repayment, and save snapshots.

## v1.20.35 - Debt Clarity Renderer Copy-Model Dry Run

* Added a Talent-owned `debtCollectorClarityRendererCopyModel(state, rendererCopy)` helper for renderer-shaped preview copy.
* Added a Debt Collector source adapter matching the live panel's summary, status, owed, pressure, flavor, terms, and metadata fragments.
* Learned preview copy improves summary and terms wording without nesting labels such as `Status: Debt status:` or `Pressure: Pressure`.
* Added smoke coverage for exact learned/unlearned output, canonical delegation, live-panel stability, and unchanged wallet, balance, pressure, repayment, and save state.
* Kept `passiveEnabled:false`, `appliesEffect:false`, `liveRendererWired:false`, and left `panelMarkup()` unchanged.

---

## v1.20.34 - Passive Renderer Contract Alignment

* Made `DungeonDexTalents` the canonical owner of Debt Collector clarity contract and copy-helper behavior.
* Defined `passiveReady` as learned/preview eligibility, `passiveEnabled` as live renderer consumption, `appliesEffect` as gameplay mutation, and `liveRendererWired` as intentional renderer integration.
* Kept Debt Collector clarity preview-ready when learned while `passiveEnabled`, `appliesEffect`, and `liveRendererWired` remain false.
* Added cross-API smoke coverage proving the Debt Collector public helpers exactly delegate to the canonical Talent output without changing wallet, balance, pressure, repayment, or save state.
* Preserved Hunter Board copy behavior, the v1.20.32 activation gate, Revisit lockdown, and all gameplay systems.

---

## v1.20.33 - Revisit Activation Surface Lockdown

* Added `31_revisit_activation_surface_lockdown.js` to fully de-export dormant Revisit start/active-summary API surfaces from `window.DungeonDexEliteContracts`.
* Added a read-only `revisitActivationSurfaceLockdownReport(state)` inspection helper that reports forbidden exports removed, no live entry, no rewards, no completion, no mutation, and the preserved primary path.
* Kept all existing Revisit previews, summaries, unlock gates, lane metadata, and route-planning diagnostics intact.
* Preserved save shape, combat, economy, gear, monsters, rewards, dungeon progression, Talent activation, Debt Collector renderer wiring, and Revisit playability lockout.

---

## v1.20.32 Hotfix - Passive Activation Gate Verification

* Added a non-mutating verification layer for the passive activation gate dry run.
* Reports `liveDisplayReady` separately from helper readiness so Debt Collector clarity remains helper-ready but not renderer-wired.
* Preserved version labels, save shape, Talent UI, gameplay effects, debt behavior, and all forbidden gameplay systems.

---

## v1.20.32 - Passive Activation Gate Dry Run

* Added read-only activation-gate metadata for `hunter_board_clarity` and `debt_collector_clarity`.
* Reports missing Debt Collector live renderer wiring and keeps both passives blocked from further activation.
* Preserved save shape, Talent UI, gameplay effects, debt behavior, and all forbidden gameplay systems.

---

## v1.20.29 - Debt Collector Clarity Passive Contract Prep

* Added a smoke-only `debt_collector_clarity` passive contract helper and a read-only copy helper for future Debt Collector summary rendering.
* Kept the live Debt Collector renderer untouched and routed the new helper only through smoke-only fixture coverage.
* Confirmed the new display helper is clone-safe, text-only, non-mutating, and does not change debt math, pressure, repayment, or save state.

---

## v1.20.28 - Elite Board Copy Surface Contract Guard

* Added a smoke-only alternate Elite Board summary fixture that reuses the hunter_board_clarity copy helper contract without creating new UI.
* Kept `applyHunterBoardClarityCopy` as the single copy surface source of truth and extended smoke coverage to check both current card and alternate summary behavior.
* Confirmed unlearned copy stays unchanged, learned copy stays textual-only, numeric values stay fixed, and save state remains untouched.
* Kept combat, economy, gear, dungeon progression, Revisit, Debt, Talent UI actions, and Elite Board math unchanged.

## v1.20.27 - First Passive Effect Activation

* Activated `hunter_board_clarity` as a read-only Elite Board display-copy passive.
* Added a small helper that rewrites board wording for clarity only when the node is learned.
* Extended smoke coverage to confirm unlearned text stays unchanged, learned text becomes clearer, numeric reward/risk values stay fixed, and save state remains untouched.
* Kept combat, economy, gear, dungeon progression, Revisit, Debt, Talent UI actions, and Elite Board math unchanged.

## v1.20.19 - Talent Earning Source Contract

* Defined boss/depth milestones as the primary future Talent earning source behind a disabled gate.
* Added a defensive, read-only contract with six future milestone examples and six total planned points.
* Expanded save shape with inert `player.talentEarning` metadata; normalization forces the gate disabled, milestone state empty, and awarded points remain zero.
* Added `earningSourceContract`, `earningEnabled`, and `earningStatus` inspection helpers without adding an award path.
* Added seven smoke records covering contract shape, milestones, disabled state, zero points, non-mutation, and stable output.
* Retained the Talent module's stable `v1.16.2` component provenance label.
* No milestone tracking, Talent point awards, spending, unlocks, bonuses, UI actions, combat, economy, monsters, gear, or progression behavior changed.

## v1.20.20 - Talent Milestone Tracking Gate Test (fixture-only, no live earning)

* Added read-only talent milestone detection helpers for fixture validation only.
* Extended smoke coverage to verify boss and depth milestone detection, unique milestone IDs, disabled-state zero points, override-only fixture scoring, and no state mutation.
* Kept `talentEarning.enabled` false in normal saves and did not add any live award, persist, spend, unlock, passive, or UI path.
* No combat, economy, monsters, gear, progression, or live Talent activation behavior changed.

## v1.20.21 - Talent Award Ledger Dry Run

* Added a read-only dry-run helper that reports reached, already-awarded, and pending Talent milestone IDs without mutating state.
* Locked saves return a full zero-state with no reached or awarded milestone information exposed.
* Added fixture-only smoke coverage for award deltas, stale IDs, malformed milestone maps, unique outputs, and state immutability.
* Kept Talent earning, awards, persistence, spending, unlocks, passive effects, and UI activation disabled.
* No combat, economy, gear, dungeon progression, Revisit, Debt, or Elite Board behavior changed.

## v1.20.22 - Live Talent Earning Activation, Earning Only

* Activated boss/depth milestone earning in normal saves and persisted awarded milestones plus total awarded points.
* Kept spending, unlocks, learned nodes, passive effects, and Talent action UI disabled.
* Added live award application helper coverage in smoke, including repeat-award suppression, stale ID safety, and save/reload persistence.
