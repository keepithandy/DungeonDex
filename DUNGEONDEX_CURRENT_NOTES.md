# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.21.1 - Hunter Board Clarity Spend Smoke Hardening

## v1.21.1 Hunter Board Clarity Spend Smoke Hardening
- Current baseline: v1.21.1.
- Adds the first complete controlled `hunter_board_clarity` Talent loop: Boss Trophy point source, spend preview, readiness, spend button, save/reload persistence, and duplicate blocking.
- The Talent panel now explains available, earned, and spent points, the Boss Trophy Milestone source, the Hunter Board Clarity effect, and the learned/active display-only contract.
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
- `player.talentLedger.awardClaims` now repairs to a normalized object map: missing or malformed containers become `{}`, valid boss trophy milestone records are retained, and invalid records are dropped.
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
- Revisit routes are not playable yet.
- Trophy Echo remains the first planned Revisit lane.
- Famous Gear Memory remains the second planned Revisit lane as inert metadata only.
- Rival Trace, Debt Pressure, and Board Echo remain planning hooks only.
