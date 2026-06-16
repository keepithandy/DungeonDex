# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.20.1 - Monster Backdrop Canvas Foundation

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

## v1.14.0 Revisit Route Content Completion
- Current baseline: v1.14.0.
- Added deterministic content-definition helpers for revisit route previews so each known route gets clearer title, district, reason, hook source, short description, flavor line, safety line, and readiness copy.
- Improved the Town revisit route panel copy to make the side-route/preview-only status easier to read on mobile.
- Extended revisit smoke coverage to assert the route content definitions and richer preview copy remain stable.
- Revisit activation behavior, talent preview, combat, economy, debt, trophies, Famous Gear, Elite Board, and main progression remain unchanged.

## v1.13.1 Rendered Build Label / Cache Hygiene Audit
- Current baseline: v1.13.1.
- Fixed the stale visible label source in `js/systems/21_build_label_guard.js`, which was still hardcoded to `DungeonDex v1.12.5`.
- Updated cache/build query strings to a new `1.13.1-rendered-build-label-cache-hygiene` label so browser and smoke runs do not reuse the old label path.
- Revisit routes, talent preview, combat, economy, debt, trophies, Famous Gear, Elite Board, and main progression remain unchanged.

## v1.13.0 Revisit Routes Activation Foundation
- Current baseline: v1.13.0.
- Added safe route selection/start foundation with extended `player.revisitState` shape.
- New fields: `activeRouteKey`, `startedAt`, `sourceFloor`, `sideRoute`, `locked`, `cappedReward`.
- Added helpers: `canStartRevisitRoute`, `startRevisitRoute`, `activeRevisitRouteSummary`.
- Verification: Route start does not mutate main progression, scaling, Talent, gear, economy, or other systems.
- Smoke coverage extended to validate route isolation, state safety, and primary progression preservation.
- Revisit Routes remain locked/optional/side-route-only with capped rewards.
- Enter/Continue remains primary progression path.
- Combat, economy, scaling, talents, debt, Elite Board, Famous Gear, and trophy behavior remain unchanged.

## v1.12.5 Talent Foundation Completion Checkpoint
- Current baseline: v1.12.5.
- Added a locked `TALENT_RULESET_PREVIEW` foundation for future point source rules, caps, branch/category structure, node tiers, cost model, unlock requirements, and preview-only node metadata.
- Current ruleset helpers are read-only and defensive: `talentRulesetPreview`, `talentRulesetSummary`, and `talentPreviewNodes`.
- All ruleset helper output reports locked, preview-only, inactive, and non-gameplay state.
- Current talent earning, spending, unlocks, learned state, active nodes, and passive effects remain disabled.
- Current Talent Tree Preview keeps its locked status panel and now includes a compact rules summary.
- Smoke coverage checks ruleset existence, frozen source data, defensive helper copies, disabled earning/spending/unlocks/passives, malformed talent-ledger repair, no-op mutation hooks, mobile layout, combat path safety, board reward stability, charter cost stability, sell value stability, and runtime errors.
- Combat, economy, scaling, monsters, gear, debt, revisit routes, and Elite Board behavior were left unchanged.
- Revisit and Trophy Echo remain paused, locked/read-only, and non-playable.

## v1.12.1 Talent Ledger Repair/Smoke Hardening
- Historical baseline: v1.12.1.
- Hardened `player.talentLedger` repair/normalization against missing, null, array, string, partial, legacy, and polluted shapes.
- Current talent ledger helpers are read-only and always zeroed: no earning, no spending, no active sources, no active points.
- Current legacy talent save mirrors are repaired to a safe zero-state compatibility shell.
- Current legacy talent API/devtools mutation hooks remain present but inert: no point grants, no unlocks, no learned state, and no passive bonuses.
- Current Talent Tree Preview remains locked, preview-only, and non-gameplay-affecting.
- Smoke coverage checks malformed talent-ledger repair, zero-state summaries, no-op mutation hooks, mobile layout, combat path safety, board reward stability, charter cost stability, sell value stability, and runtime errors.
- Combat, economy, scaling, monsters, gear, debt, revisit routes, and Elite Board behavior were left unchanged.
- Revisit and Trophy Echo remain paused, locked/read-only, and non-playable.

## v1.12.0 First Talent Point Ledger Foundation
- Historical baseline: v1.12.0.
- Audited the existing Talent foundation after the Trophy Echo handoff.
- Classified current talent save shape, UI surface, helper/API surface, and smoke coverage.
- v1.12.0 talent save shape used `player.talents` plus point/unlock mirrors repaired by `repairTalentState`.
- v1.12.0 talent UI surface was the Warden Talents panel with passive-only cards, milestone progress, unlock buttons, and reset control.
- v1.12.0 helper/API surface was `DungeonDexTalents` / `DungeonDexWardenTalents`, backed by normalization helpers and DevTools smoke helpers.
- v1.12.0 smoke coverage checked malformed repair, zero-point UI, unlock/reset persistence, unknown IDs, mobile layout, combat path, board payout, charter cost, sell value, and runtime errors.
- First Talent Point Ledger Foundation is the next visible lane, but this patch did not change talent gameplay.
- Talent behavior, costs, unlocks, combat balance, economy balance, enemy scaling, gear generation, debt behavior, and revisit routes were left unchanged.
- Revisit and Trophy Echo remain paused, locked/read-only, and non-playable.

## v1.10.2 Trophy Echo Rule Handoff Audit
- Current baseline: v1.10.2.
- Trophy Echo classification: Planning chain checkpointed, not playable.
- Trophy Echo has read-only rule plan metadata.
- Boss-history signal planning exists.
- Anti-farming policy metadata exists.
- Future reward-policy metadata exists.
- Smoke hardening exists for malformed and high-progress boss-history data.
- Trophy Echo remains locked, inactive, rewardless, and non-playable.
- All revisit routes remain locked/read-only.
- No route activation exists.

## v1.10.1 Trophy Echo Rule Smoke Hardening
- Current baseline: v1.10.1.
- Hardened Trophy Echo rule planning smoke against malformed, missing, mixed, and high boss-history data.
- Confirmed high boss-history progress does not activate Trophy Echo.
- Confirmed route access and reward access remain unavailable.
- Trophy Echo remains locked, inactive, and non-playable.
- All revisit routes remain locked/read-only.
- All gates remain locked:true, ready:false, playable:false.
- No gameplay was added.

## v1.10.0 Trophy Echo Unlock Rule Planning
- Current baseline: v1.10.0.
- Added read-only Trophy Echo rule plan metadata.
- Added boss-history signal planning for the future Trophy Echo rule.
- Added anti-farming policy metadata.
- Added future reward policy metadata.
- Trophy Echo remains locked, inactive, and non-playable.
- All revisit routes remain locked/read-only.
- All gates remain locked:true, ready:false, playable:false.
- No gameplay, rewards, combat reruns, teleporting, completion logic, scaling, combat balance, or economy balance was added.

## v1.9.3 Systems Handoff Audit
- Current baseline: v1.9.3.
- Added a systems handoff audit before v1.10 planning.
- Revisit is checkpointed as locked, read-only, diagnostic-only, and non-playable.
- Unfinished foundations are classified so future patches can stay focused.
- Candidate v1.10 lanes are identified without starting v1.10.0.
- Trophy Echo remains preview-only and non-playable.
- All gates remain locked:true, ready:false, playable:false.
- All routes remain locked/read-only.
- No gameplay, rewards, combat reruns, teleporting, completion logic, scaling, combat balance, economy balance, talent behavior, debt behavior, gear generation, or enemy scaling was changed.

### v1.9.3 System Status Categories

#### Checkpointed Foundation
- Revisit candidate ledger.
- Revisit route previews.
- Revisit unlock gates.
- Revisit gate diagnostics.
- Revisit checkpoint smoke.
- Boss trophy records baseline.
- Famous Gear memory baseline.
- Retired Gear archive baseline.
- Debt Collector foundation baseline.
- Talent foundation baseline.
- Elite Board/rival contract baseline.

#### Active but Unfinished
- Trophy Echo / first revisit rule planning.
- Talent passive choice expansion.
- Debt Collector pressure/risk visibility.
- Famous Gear memory attachment depth.
- Boss Trophy / Dex identity improvements.
- Retired Gear Hall depth.
- Elite Board / Rival Trace route support.
- District/world identity expansion.

#### Future Candidate
- Trophy Echo unlock-rule planning.
- Trophy Echo smoke hardening.
- Famous Gear route planning.
- Debt Pressure route planning.
- Rival Trace / Board Echo route planning.
- District identity pass.
- Talent choice/passive expansion.

#### Do Not Touch Without Separate Patch
- Combat balance.
- Enemy scaling.
- Economy balance.
- Gear drop scaling.
- Route activation.
- Route rewards.
- Teleporting.
- Combat reruns.
- Route completion logic.
- Monster affixes/status effects.
- Broad theme rewrite.

## v1.9.2 Revisit Gate Checkpoint Audit
- Current baseline: v1.9.2.
- Revisit Gate Checkpoint Audit confirms the locked-only revisit diagnostics layer before v1.10 unlock-rule planning.
- Locked-only gate diagnostics were verified in source and smoke coverage.
- Smoke scope was verified and one compact checkpoint assertion was added.
- README current-baseline drift from v1.8.0 was corrected.
- Trophy Echo remains preview-only and non-playable.
- All gates remain locked:true, ready:false, playable:false.
- All routes remain locked/read-only.
- No gameplay, rewards, combat reruns, teleporting, completion logic, or scaling was added.

## v1.9.1 Revisit Gate Diagnostics Polish
- Current baseline: v1.9.1.
- Clarified revisit gate diagnostics so the copy reads as diagnostic only.
- Added or refined diagnostic labels and access text on locked gate previews.
- Earlier Dungeon Revisit now shows clearer gate progress and signal detail.
- Gate summary remains locked, non-playable, and read-only.
- Trophy Echo remains preview-only and non-playable.
- No gameplay, rewards, combat reruns, teleporting, completion logic, or scaling was added.

## v1.9.0 Revisit Unlock Gate Foundation
- Current baseline: v1.9.0.
- Added read-only gate progress models for revisit routes.
- Added per-route progress and signal labels for locked preview display.
- Earlier Dungeon Revisit now shows compact locked progress detail in the preview panel.
- Gates remain locked/read-only and Trophy Echo remains preview-only and non-playable.
- No route gameplay, rewards, combat reruns, teleporting, completion logic, or scaling was added.

## v1.8.2 Revisit Preview Panel Polish
- Current baseline: v1.8.2.
- Earlier Dungeon Revisit panel is easier to scan on mobile.
- Route rows present preview label, reason, requirement, safety, and source more clearly.
- Future Conditions wording replaces ambiguous unlock/action phrasing.
- Trophy Echo remains preview-only and non-playable.
- All routes remain locked/read-only.
- No gameplay was added.

## v1.8.1 Revisit Unlock Preview Copy Hardening
- Current baseline: v1.8.1.
- Preview copy was hardened so revisit text stays locked, inert, and clearly informational.
- Trophy Echo remains preview-only and non-playable.
- All routes remain locked/read-only.
- No gameplay, rewards, teleporting, rerun combat, completion, or scaling was added.
- Recommended next step: keep smoke coverage aligned with any later preview copy changes.

## v1.8.0 First Revisit Route Unlock Preview
