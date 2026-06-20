# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.20.31 - Talent Passive Activation Readiness Matrix

## v1.20.31 Talent Passive Activation Readiness Matrix
- Current baseline: v1.20.31.
- Added a read-only `talentPassiveActivationReadiness(state)` helper that reports prepared passive contracts for `hunter_board_clarity` and `debt_collector_clarity` without mutating state or wiring new activation paths.
- The helper reports contract presence, display copy presence, smoke guarding, live renderer wiring, activation status, learned state, readiness, enabled state, save mutation, gameplay effect application, allowed surface, and blocked systems.
- Smoke coverage now checks the readiness matrix, read-only behavior, debt collector renderer wiring status, blocked-system coverage, and the continued absence of new talent action text.
- `hunter_board_clarity` remains on its current copy-only surface. `debt_collector_clarity` remains inactive and does not apply gameplay effects.
- No talent spending, earning, unlocks, learned UI, buttons, or gameplay activation behavior changed.

## v1.20.30 Debt Collector Clarity Contract Smoke Guard
- Current baseline: v1.20.30.
- Tightened smoke-only coverage for `debt_collector_clarity` to prove the helper remains read-only, clone-safe, and display-only.
- The patch keeps the live Debt Collector renderer untouched and does not add new UI, actions, spending, debt math, pressure changes, repayment changes, economy changes, combat changes, or progression changes.
- Smoke coverage now checks that the unlearned contract leaves display copy unchanged, the learned contract only changes display text fields, and the helper does not mutate its input or any save/gameplay values.
- Debt Collector gameplay, combat, economy, gear, dungeon progression, Revisit, Elite Board, and Talent behavior remain unchanged.

## v1.20.29 Debt Collector Clarity Passive Contract Prep
- Current baseline: v1.20.29.
- Added a smoke-only `debt_collector_clarity` passive contract helper and a read-only display-copy helper for future Debt Collector summary reuse.
- The patch keeps the live Debt Collector renderer untouched and does not add new UI, actions, spending, or debt math.
- Smoke coverage now checks the contract metadata, clone-safe display copy, and a guarded alternate Debt Collector summary fixture for read-only text behavior.
- Combat, economy, gear, dungeon progression, Revisit, Elite Board math, Debt math, and Talent UI actions remain unchanged.

## v1.20.28 Elite Board Copy Surface Contract Guard
- Current baseline: v1.20.28.
- Added a smoke-only alternate Elite Board summary fixture that reuses the existing `hunter_board_clarity` copy helper contract.
- The patch keeps `applyHunterBoardClarityCopy` as the single source of truth for Elite Board clarity copy and does not add new UI.
- Smoke coverage now checks both the current card surface and a guarded alternate summary fixture for read-only copy behavior.
- Elite Board math, combat, economy, gear, dungeon progression, Revisit, Debt, and Talent UI actions remain unchanged.

## v1.20.27 First Passive Effect Activation
- Current baseline: v1.20.27.
- Activated the first passive for `hunter_board_clarity` as Elite Board display-copy clarity only.
- The passive contract now reports learned state, readiness, enabled status, effect application, and the copy-only surface while remaining read-only.
- Smoke coverage proves the helper changes wording only, leaves numeric board values untouched, and does not mutate save state.
- Elite Board math, combat, economy, gear, dungeon progression, Revisit, Debt, and Talent UI actions remain unchanged.
- This is a copy-only activation layer. No gameplay effect is active.

## v1.20.25 Talent Spending Activation, Learned State Only
- Historical baseline retained below for reference.
- Current baseline now: v1.20.27.
- v1.20.25 added a single-node learned-state spending helper for `hunter_board_clarity`.
- Smoke coverage proved default blocking, explicit override spending, one-point consumption, duplicate blocking, and save-repair persistence.
- Passive effects, respec, Talent action UI, and other gameplay behavior remained unchanged.
- This was a learned-state activation only. Combat, economy, gear, dungeon progression, Revisit, Debt, and Elite Board behavior remained unchanged.

## v1.20.24 Talent Spending Dry Run
- Current baseline: v1.20.24.
- Added a read-only spending preview helper that reports affordability and block reasons without mutating save data.
- Smoke coverage proves the dry run leaves available points, learned state, and passive state unchanged.
- Real spending, unlocks, learned nodes, passive effects, respec, and Talent action UI remain disabled.
- This is a dry run only. Combat, economy, gear, dungeon progression, Revisit, Debt, and Elite Board behavior remain unchanged.

## v1.20.23 Talent Earning Stability Audit
- Current baseline: v1.20.23.
- Audited the live boss/depth earning path for one-award-only behavior, safe save repair, and ledger visibility.
- Confirmed awarded milestones persist in `player.talentEarning.milestonesReached` and `pointsAwarded` persists as the live award total.
- Spending, unlocks, learned nodes, passive effects, and Talent action UI remain disabled.
- This is a stability audit only. Combat, economy, gear, dungeon progression, Revisit, Debt, and Elite Board behavior remain unchanged.

## v1.20.21 Talent Award Ledger Dry Run
- Current baseline: v1.20.21.
- Added `calculatePendingTalentMilestoneAwards(state, enabledOverride)` as a read-only proof of reached-minus-awarded milestone delta logic.
- Disabled saves receive a full zero-state; fixture overrides can inspect reached, awarded, and pending milestone IDs without mutating state.
- Smoke coverage validates stale and malformed award maps, unique outputs, pending point counts, normal-save zero state, and no activation API.
- `talentEarning.enabled` remains false in normal saves; no Talent points, milestones, ledger values, unlocks, spending, bonuses, or UI actions are awarded or persisted.
- No combat, economy, gear, dungeon progression, Revisit, Debt, or Elite Board behavior changed.

## v1.20.20 Talent Milestone Tracking Test
- Current baseline: v1.20.20.
- Added read-only talent milestone detection helpers for fixture validation only: boss milestones, depth milestones, merged reached milestones, and point calculation from milestones.
- Extended smoke coverage for helper existence, boss/depth detection, unique milestone IDs, disabled-state zero points, override-only fixture scoring, no state mutation, and locked earning gate verification.
- `talentEarning.enabled` remains false in normal saves, `milestonesReached` stays empty, and `pointsAwarded` stays zero.
- The Talent module retains its stable `v1.16.2` component provenance label; v1.20.20 updated the active public/runtime/cache labels for that patch.
- No milestone earning activation, spending, unlocks, learned nodes, passive bonuses, UI actions, combat, economy, monsters, gear, or progression behavior changed.

## v1.20.18 Talent System Re-entry Audit
- Current baseline: v1.20.18.
- The Talent ruleset foundation remains stable and single-sourced through the deeply frozen `TALENT_RULESET_PREVIEW` export: four branches, three tiers, and twelve nodes.
- Talent runtime behavior remains locked, preview-only, and inert. Earning, spending, unlocks, learned nodes, and passive effects remain disabled and zero-state.
- Talent save repair remains safe: legacy point/unlock fields are cleared and malformed canonical ledgers normalize to a locked zero-state while retaining only sanitized notes and a minimum schema version of 1.
- Preview helpers derive from the single ruleset. The internal passive-preview map is closure-private and exposed only through defensive clones; it is not itself frozen.
- Legacy talent fields remain repair/devtools-only outside the Talent module. Combat, economy, progression, and unrelated UI modules do not read them.
- The Talent module retains its `v1.16.2` component provenance label. It is old but stable and is not the public build authority.
- Existing Talent smoke coverage is comprehensive; no new smoke record was needed.
- Recommended next Talent patch: feature-gate point earning from Elite Board contract completion while keeping spending, unlocks, learned nodes, and passive effects disabled.
- No Talent gameplay, combat, economy, contract rewards, save shape, UI interaction, or balance behavior changed.

## v1.20.17 Town Revisit UI No-Live-Affordance Smoke Hardening
- Current baseline: v1.20.17.
- Trophy Echo now has a read-only route detail foundation tied to remembered boss trophies and trophy records.
- The planned Revisit lane order remains Trophy Echo, Famous Gear Memory, then Rival Trace.
- Rival Trace remains named rival elite memory only.
- No gameplay, combat, economy, contracts, debt, Talent, Elite Board, trophy, Famous Gear, save-structure, or Revisit activation behavior changed.

## v1.20.8 Owed Money Text Fix
- Current baseline: v1.20.8.
- Debt Collector Owed summaries now render clean text such as `Owed 5s` instead of literal money span markup.
- Styled coin HTML remains limited to controlled money markup contexts; escaped text surfaces use plain coin text.
- Debt smoke coverage asserts the rendered Owed text contains the expected amount and no literal `<span class="money` markup.
- No gameplay, combat, economy, debt math, Talent, Elite Board, trophy, Famous Gear, save-structure, or Revisit behavior changed.

## v1.20.1 Monster Backdrop Canvas Foundation
- Current baseline: v1.20.1.
- Added `js/systems/29_monster_backdrops_canvas.js` as a deterministic, canvas-only combat backdrop runtime.
- Added visual-only helpers: `generateMonsterBackdrop(monster, state, options)`, `renderMonsterBackdrop(canvas, backdrop)`, `attachMonsterBackdropCanvas()`, and `window.DDMonsterBackdropCanvas`.
- The backdrop renderer mounts behind `.combat-monster-stage`, uses deterministic seeds, and maps district/monster/depth identity into Lowfire, Bellforge, Mireglass, Red Chapel, Salt Forge, Sunken Court, Rookery, Noctis, or generic Hollow Stair scenery.
- Added `smoke_monster_backdrops_v120.mjs` to prove the backdrop contract is deterministic, non-mutating, visual-only, and free of gameplay action fields.
- No Three.js dependency was added.
- No combat math, HP, rewards, route entry, route completion, scaling, economy, debt, Talent, Elite Board, trophy, Famous Gear, or main progression behavior changed.
- v1.20.0 second Revisit lane planning remains preserved: Trophy Echo is still lane 1 and Famous Gear Memory is still lane 2 as inert metadata only.

## v1.20.0 Second Revisit Lane Planning Contract
- Current baseline: v1.20.0.
- Added Famous Gear Memory as the second planned Revisit lane contract in read-only metadata.
- Extended smoke coverage to prove Trophy Echo remains the first planned lane when preview order changes and second-lane fixture data is present.
- Revisit routes remain locked, inactive, preview-only, and non-playable.
- No gameplay, combat, economy, talent, revisit activation, debt, trophy, Famous Gear, Elite Board, or scaling behavior changed.

## v1.19.9 Revisit First Lane Selection Contract
- Current baseline: v1.19.9.
- Selected Trophy Echo as the first planned revisit activation lane in a read-only contract.
- Extended smoke coverage to prove the lane stays planned-only and still exposes no live entry, reward, or completion surface.
- Revisit routes remain locked, inactive, and non-playable.
- No gameplay, combat, economy, talent, revisit, debt, or scaling behavior changed.
