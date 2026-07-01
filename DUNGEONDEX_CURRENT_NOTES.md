# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.23.1 - Trophy Echo Prototype Stabilization
- VERSION.md remains at v1.23.1 until an explicit version bump is requested.

## v1.23.1 Debt Collector Under Collection Hardening
- Debt Collector Under Collection is a Debt-owned high-pressure state derived from existing `player.debtCollector.pressure`.
- Threshold: `pressure >= 3` while active debt exists.
- Under Collection blocks Debt Collector borrowing before wallet, debt balance, or pressure mutation.
- Repayment remains available while Under Collection.
- Successful partial repayment lowers pressure by the existing bounded relief amount of 1.
- Failed repayment does not lower pressure or clear Under Collection.
- Full payoff clears pressure through the existing clear-debt path.
- Borrowing returns when pressure drops below 3.
- No `highPressureActive`, `borrowingBlockedByPressure`, or Under Collection flag is stored in save data.
- Talent passive `liveRendererWired` remains false. This is Debt Collector gameplay behavior, not Talent passive activation.

## v1.23.2 Progression Systems Clarity Pass
- Display-only town/Talent/Debt wording clarifies active, learned, preview-only, locked, and next-target states without changing saves, math, rewards, economy, district IDs, depth ranges, unlock thresholds, or activation gates.
- Talent copy separates the live Boss Trophy point source and controlled Hunter Board Clarity spend path from the wider locked preview tree.
- Town copy clarifies Trophy Echo as the only playable Revisit lane, Famous Gear Memory as planned-only, Debt Collector clarity as copy-only, and district/depth progression as a next-target status line.
- This was retained from the resolved notes conflict as historical/planning context only; VERSION.md remains the version authority.

## Issue #18 Stability Guardrail Audit
- Documentation-only guardrail checkpoint before feature-style patches.
- Protected systems for review: controlled `hunter_board_clarity` spending, read-only Talent preview/passive helpers, Debt Collector display-copy clarity, Revisit planning lock, service worker/cache label alignment, classic script-load order, and smoke-test coverage.
- Do not use this audit to change gameplay behavior, save mutation, cache behavior, script ordering, combat, economy, rewards, Debt Collector math, Revisit activation, Talents, gear, monsters, dungeon entry, or scaling.
- Recommended safety net before feature patches: run the Talent, Debt Collector, and Revisit smoke files listed in `docs/RELEASE_CHECKLIST.md`.

## v1.21.2 Revisit Trophy Echo Readiness Packet
- Trophy Echo was originally planned as the first Revisit lane and was design/readiness-only at this historical point.
- Famous Gear Memory remained the second planned lane as inert metadata only, and Enter Dungeon / Continue Run remained the only active dungeon entry path.
- v1.23.1 later activated and stabilized Trophy Echo as the first live Revisit lane.

## v1.23.2 Talent Passive Framework Completion
- The Talent API exposes a canonical passive inventory for all 13 known nodes, including classification, lifecycle, spend readiness, helper status, renderer wiring, copy-only status, and blocker metadata.
- `hunter_board_clarity` remains the only controlled spend path and the only learned passive with live copy-only renderer wiring. It changes Elite Board display copy only.
- `debt_collector_clarity` is learned-ready for contract checks but guarded: its copy model is preview-only, `passiveEnabled` is false, and `liveRendererWired` is false until an explicit activation issue authorizes live Debt renderer wiring.
- Placeholder passives remain preview-only with generic inventory contracts and no renderer, gameplay, economy, reward, combat, Revisit, or progression effects.
- `smoke_talent_passive_framework_v1232.mjs` locks the passive inventory shape, Hunter Board Clarity spend lifecycle, guarded Debt Collector clarity state, Talent award preview read-only behavior, duplicate award blocking, and passive activation gate metadata.

## v1.23.1 Trophy Echo Prototype Stabilization
- Trophy Echo is now the first live Revisit lane.
- It appears in town, locks against missing boss history, opens from boss trophy history, starts a short active memory, resolves in town, and records completion history plus Memory Marks in save data.
- Famous Gear Memory remains the second planned lane as inert metadata only, and Enter Dungeon / Continue Run remains the only active primary dungeon path.

## v1.21.x Remaining Board Cleanup Notes
- Issue #12: Debt Collector Clarity is selected as a design-ready display/copy-only passive candidate, but live activation remains blocked until a separate activation issue explicitly authorizes renderer wiring.
- Issue #13 is resolved by v1.23.0 for Trophy Echo only. v1.23.1 stabilizes that lane without expanding it. Other Revisit lanes remain inactive.
- Issue #15: Mobile Talent/status copy should keep chips short, separate locked-preview text from spend-readiness text, and avoid implying broad Talent activation.
- Issue #17: The selected second passive candidate is `debt_collector_clarity`; no second Talent spend target or passive activation is added by the selection note.
- Issues #19/#20: HTML shell work may add safer semantics and inert templates only; all current screen IDs, tab `data-screen` values, classic script load order, build query strings, and runtime renderer ownership stay intact.

## v1.23.1 Revisit Activation Contract
- Trophy Echo is now the first live Revisit lane and uses boss trophy or boss record history as its qualifying source.
- Live fields include an active echo state, completion history, deterministic completion keys, a last-result summary, and a Revisit-only Memory Mark counter under `player.revisitState.trophyEcho`.
- Famous Gear Memory remains inactive, and other Revisit hooks remain planning-only.

## v1.22.0 Talent Loop Release-Stability Hardening
- Verified the controlled `hunter_board_clarity` spend path remains the only live Talent spend target.
- Malformed ledger handling, duplicate spend blocking, negative-point clamping, and reload persistence are covered by the existing controlled spend hardening audit and smoke checks.
- No additional Talent nodes, respec, passive bonuses, combat effects, economy effects, or Revisit effects were introduced.

## v1.23.1 Trophy Echo Prototype Stabilization Smoke
- Current baseline: v1.23.1.
- Trophy Echo is locked with no boss history, opens with boss history, starts, completes, records history, and persists after reload.
- Famous Gear Memory remains inactive, and Talent, Debt, combat, gear, and monster systems remain outside the patch scope.

## v1.21.2 Hunter Board Clarity Post-Reload UI Contract Smoke
- Current baseline: v1.21.2.
- Adds the first complete controlled `hunter_board_clarity` Talent loop: Boss Trophy point source, spend preview, readiness, spend button, save/reload persistence, and duplicate blocking.
- The Talent panel explains available, earned, and spent points, the Boss Trophy Milestone source, the Hunter Board Clarity effect, and the learned/active display-only contract.
- No second Talent node, no Revisit activation, no combat change, no economy change, no Debt Collector change, and no broad Talent tree activation were added.

## v1.20.47 Hunter Board Clarity Spend Preview
- Added a read-only spend preview for `hunter_board_clarity`.
- The preview reports affordability and future learn/passive intent without spending points or mutating save state.
- No spending UI or unlock UI was added.

## v1.20.46 First Controlled Boss Trophy Talent Award
- Enabled the first controlled Boss Trophy Milestone Talent point award path behind the live gate.
- The award is atomic: one point, one claim record.
- Duplicate claims block repeat awards.
- This remains the only live Talent point award source.

## v1.20.45 Talent Award Mutation Live Gate
- Added a disabled-by-default live mutation gate for Boss Trophy Milestone Talent awards.
- Default gameplay still awards no points and creates no claim records.
- Explicit override exists only for smoke and fixture validation.

## v1.20.44 Talent Award Mutation Contract Preview
- Added a read-only preview for the future atomic Boss Trophy Milestone award mutation path.
- The preview derives deterministic claim keys and source IDs from trophy evidence, but does not write claims, award points, or mutate save state.
- No spending or Talent unlock UI is introduced.

## v1.20.43 Talent Award Claim Repair Contract Completion
- Wired the claim repair contract into runtime loading and aligned build/cache labels to the release.
- `player.talentLedger.awardClaims` repairs to a normalized object map: missing or malformed containers become `{}`, valid boss trophy milestone records are retained, and invalid records are dropped.
- No points are awarded, no live claim records are created from boss trophy evidence, and no spending or Talent unlock UI is introduced.

## v1.20.42 Talent Claim Tracking Save Shape Dry Run
- Added a read-only preview of the future `player.talentLedger.awardClaims` object map and version-1 record shape.
- Missing and malformed containers or records are reported with future repair rules but are not changed in-place.
- No `awardClaims` field is added, no points are awarded, and no spending or Talent unlock UI is introduced.

## v1.20.41 Talent Award Claim Tracking Plan
- Planned claim tracking belongs at `player.talentLedger.awardClaims` with deterministic `boss_trophy_milestone:{bossTrophyId}` keys.
- The proposed record stores key, source, trophy source ID, one-point amount, claim timestamp, and schema version.
- No claim tracking is added to save state, no points are awarded, and no spending or Talent unlock UI is introduced.

## v1.20.40 Talent Point Award Contract Dry Run
- Added a read-only Boss Trophy Milestone award preview based only on valid existing boss trophy IDs or boss trophy records.
- The preview amount is one future point; no points are awarded and no save state is mutated.
- Claim tracking, spending, and Talent unlock UI remained unimplemented.

## v1.20.39 Talent Point Source Decision
- Boss Trophy Milestone is the selected first Talent point source.
- Floor Milestone and Major Archive Milestone are deferred.
- No points are awarded, no spending path is added, and no unlock UI is introduced.

## v1.20.36 Live Debt Clarity Renderer Wiring
- Learned Debt Collector clarity can improve live Debt panel display copy only.
- Debt math, balance, pressure, repayment, wallet, economy, combat, rewards, progression, and save state remain unchanged.

## v1.20.35 Debt Clarity Renderer Copy-Model Dry Run
- Added a renderer-shaped Debt clarity copy model owned by `DungeonDexTalents` and exposed through the Debt Collector namespace.
- `panelMarkup()` remains unchanged in this historical patch.
- No wallet, debt balance, pressure, repayment, economy, combat, rewards, progression, Talent actions, save shape, or Revisit behavior changed.

## v1.20.34 Passive Renderer Contract Alignment
- `DungeonDexTalents` is the canonical owner of Debt Collector clarity contract and display-copy helper behavior; the Debt Collector API delegates to it.
- `passiveReady` means learned and eligible for read-only preview copy. `passiveEnabled` means consumed by a live renderer. `appliesEffect` is reserved for gameplay/state changes. `liveRendererWired` means intentional live renderer integration.
- Hunter Board clarity remains on its existing Elite Board copy-only surface with no gameplay effect.

## Talent Contract Vocabulary
- `passiveReady`: learned and eligible for read-only contract or preview copy.
- `passiveEnabled`: the copy surface is allowed to use the passive contract; this does not imply gameplay activation.
- `appliesEffect`: reserved for real gameplay or state changes.
- `liveRendererWired`: the renderer helper is intentionally connected; for Debt Collector clarity this remains locked unless explicitly activated.
- `preview` / `dry run`: read-only contract inspection only; no save mutation, no point spending, no live activation.
- `learned state`: the node has been learned in save data.
- `spend state`: the controlled spend path has been used and updated the saved point ledger.
- `contract helper`: a read-only helper that reports contract readiness or copy rules.
- `renderer helper`: a copy-rendering helper that formats text for an existing surface without widening gameplay.

## v1.20.33 Revisit Activation Surface Lockdown
- Fully de-exported dormant Revisit start/active-summary API surfaces from `window.DungeonDexEliteContracts`.
- Revisit remains planning-only; Enter Dungeon / Continue Run remains the only active dungeon entry path.
- No live entry, reward, completion, or mutation surface exists for Revisit.

## v1.20.32 Passive Activation Gate Dry Run
- Added a read-only `talentPassiveActivationGateDryRun(state)` helper for `hunter_board_clarity` and `debt_collector_clarity`.
- The dry run explains contract, display-copy, smoke, learned, readiness, renderer-wiring, blocked-system, save-mutation, and gameplay-effect gates without mutating state.

## v1.20.28 Elite Board Copy Surface Contract Guard
- Added a smoke-only alternate Elite Board summary fixture that reuses the existing `hunter_board_clarity` copy helper contract.
- Elite Board math, combat, economy, gear, dungeon progression, Revisit, Debt, and Talent UI actions remain unchanged.

## v1.20.27 First Passive Effect Activation
- Activated the first passive for `hunter_board_clarity` as Elite Board display-copy clarity only.
- The passive contract reports learned state, readiness, enabled status, effect application, and the copy-only surface while remaining read-only.
- Elite Board math, combat, economy, gear, dungeon progression, Revisit, Debt, and Talent UI actions remain unchanged.

## v1.20.8 Owed Money Text Fix
- Debt Collector Owed summaries render clean text such as `Owed 5s` instead of literal money span markup.
- Styled coin HTML remains limited to controlled money markup contexts; escaped text surfaces use plain coin text.
- No gameplay, combat, economy, debt math, Talent, Elite Board, trophy, Famous Gear, save-structure, or Revisit behavior changed.

## Revisit Rule
- Trophy Echo is the first live Revisit lane.
- Famous Gear Memory remains the second planned lane as inert metadata only.
- Rival Trace, Debt Pressure, and Board Echo remain planning hooks only.
