# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.12.1 - Talent Ledger Repair/Smoke Hardening

## v1.12.1 Talent Ledger Repair/Smoke Hardening
- Current baseline: v1.12.1.
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
- Current baseline: v1.8.0.
- Trophy Echo now shows preview-only unlock language while remaining locked/read-only.
- Unlock preview metadata is display-only and still reports route access as unavailable.
- Routes remain locked/read-only.
- No route entry, route buttons, revisit rewards, teleporting, rerun combat, route completion, route scaling, combat balance changes, or economy changes were added.
- Smoke verifies preview copy cannot imply playable access.
- Recommended next step: v1.8.1 Revisit Unlock Preview Copy Hardening. That pass should keep the preview inert and avoid any playable route entry unless explicitly requested later.

## v1.7.10 Revisit Gate Smoke Hardening
- Current baseline: v1.7.10.
- Revisit Gate Smoke Hardening completed.
- Unlock-gate model remains inert and read-only.
- Routes remain locked/read-only.
- Smoke now verifies missing-player safety, missing revisitState safety, malformed-state safety, repeated helper stability, candidate/route preview immutability, unknown-gate fallback, and no route-card action controls.
- No route entry, route buttons, revisit rewards, teleporting, rerun combat, route completion, route scaling, combat balance changes, or economy changes were added.
- Recommended next step: v1.8.0 First Revisit Route Unlock Preview. That pass should still avoid playable route entry unless explicitly requested later.

## v1.7.9 Revisit Unlock Gate Model
- Current baseline: v1.7.9.
- Added inert unlock-gate data for planned revisit route previews.
- Revisit gates are read-only display objects that explain why a route is locked, what future requirement would matter, and that status remains preview-only.
- Verified safe: gate helpers derive from route preview data, tolerate malformed state, and do not add player or run state mutations.
- Routes remain locked/read-only.
- Intentionally not implemented: route entry, route buttons, revisit rewards, teleporting, rerun combat, route completion, route scaling, or combat balance changes.
- Recommended next step: v1.7.10 Revisit Gate Smoke Hardening. Keep routes locked while adding stricter regression coverage before any unlock preview work.

## v1.7.8 Revisit Checkpoint
- Current baseline: v1.7.8.
- Revisit routes remain display-only, locked, and read-only.
- Verified safe: candidate hooks, candidate summary, route previews, route summary, readiness labels, criteria strings, and detail panel copy remain preview surfaces.
- Intentionally not implemented: route entry, route buttons, revisit rewards, teleporting, rerun combat, route completion, route scaling, or any replacement for Enter Dungeon / Continue Run.
- Recommended next step: v1.7.9 Revisit Unlock Gate Model. Define inert unlock-gate data structures, keep routes locked, and show why each route is locked without adding entry, rewards, or combat.

## Current Workflow
- Inspect files before editing.
- Keep updates small and reviewable.
- Do not create a new zip/package unless explicitly requested.
- Do not rename the project folder.
- Preserve save compatibility whenever possible.
- Summarize changed files after every pass.
- Include smoke-test steps before commit.

## Player-Facing Labels
- Keep visible labels short and clean.
- Use labels like “DungeonDex v1.4.11”.
- Do not show long internal pass names in the game UI.
- Long names belong only in changelog notes, commit messages, or internal comments.

## UI Direction
- Mobile-first.
- Compact panels.
- Fast repeat play.
- Clear gear readability.
- Less repeated combat text.
- Stable town/combat layout.
- Avoid clutter.

## Release Notes
- Add finished update notes to CHANGELOG.md.
- Do not create new PATCH_NOTES_1_4_X files.
- Keep VERSION.md updated when starting a new version target.

## Current Roadmap

### Current Stable Checkpoint
- DungeonDex v1.10.2 is the Trophy Echo rule handoff baseline.
- Trophy Echo planning is checkpointed and safe to pause.
- Trophy Echo remains locked, inactive, rewardless, and non-playable.
- All revisit routes remain locked/read-only.

### v1.12.0 First Talent Point Ledger Foundation
- Audit the current Talent foundation before any passive choice expansion.
- Talent Foundation Expansion is now the active next planning lane.
- Do not change talent effects, costs, unlocks, combat balance, economy balance, enemy scaling, gear generation, debt behavior, or revisit routes in this audit.
- Playable revisit routes require a separate approved gameplay patch.

### Candidate Next Lanes
1. Talent Foundation Expansion.
2. Debt Collector Visibility / Risk Pressure.
3. Famous Gear Memory Attachment.
4. Boss Trophy / Dex Identity.
5. District / World Identity.
6. Trophy Echo UI Readiness Preview, still non-playable.

### Recommended Next Lane
- Talent Foundation Expansion is the active next planning lane.
- Keep the next talent patch focused on passive player choice planning before any behavior changes.
- Keep any future Trophy Echo gameplay work separate and explicitly approved.

### Larger Direction
- Move v1.7/v2 planning toward stronger world identity and collection-game feel.
- Build emotional attachment to gear, bosses, rival elites, and districts.
- Add reasons to revisit earlier dungeons without bloating combat.
- Improve progression arcs while keeping normal monsters Common / Elite / Boss.
- Preserve the mobile-first, one-hand-friendly interface.

### Deferred / Guardrails
- Do not reintroduce monster affixes or status effects.
- Do not make combat mechanically complex or text-heavy.
- Do not bloat the mobile UI or restart broad theme churn.
- Do not rewrite save structure casually.
- Do not change combat, loot, enemy scaling, economy, talent, debt, board, or archive behavior without a clear bug.
- Revisit guardrail: avoid infinite farming loops, best-in-slot low-floor farming, mandatory revisit grind, forced district choice before combat, and new affix/status complexity.
- Treat roadmap items as candidates unless explicitly promoted into a patch plan.
