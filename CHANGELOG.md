# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.20.32`
* Current local package baseline: `v1.20.32`
* Current development target: `v1.20.32`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

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
