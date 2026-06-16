# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.12.5`
* Current local package baseline: `v1.18.0`
* Current development target: `v1.18.0`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## v1.18.0 - Archive / Trophy Hall Player-Facing Cleanup

* Added a deterministic district identity layer for display-only naming, subtitles, flavor, and boss-approach copy.
* Tightened Town and combat header copy so the current district and next-descent language reads more cleanly on mobile.
* Preserved the locked Talent Tree Preview and the revisit panels remaining removed.
* Talent earning, spending, unlocks, learned state, active nodes, passive bonuses, combat, economy, debt, trophies, Famous Gear, Elite Board, and revisit behavior remain unchanged.

## v1.16.2 - Talent Preview Player-Facing Copy Polish

* Trimmed the locked Talent Tree Preview copy so the branch cards read more cleanly on mobile.
* Kept Survivor, Hunter, Delver, and Collector preview branches intact with the same 12 inert preview nodes.
* Preserved the defensive preview metadata and smoke coverage added in v1.16.1.
* Talent earning, spending, unlocks, learned state, active nodes, passive bonuses, combat, economy, debt, trophies, Famous Gear, Elite Board, and revisit behavior remain unchanged.

## v1.16.1 - Talent Preview Layout / Smoke Hardening

* Mapped future passive talent candidates into the locked Talent Tree Preview for clearer planning copy.
* Added Survivor, Hunter, Delver, and Collector passive preview branches with compact passive-only node copy.
* Added defensive passive preview helper metadata so preview output stays locked, preview-only, inactive, and zero-effect.
* Expanded smoke coverage to check the passive preview map, branch count, node count, inert status fields, and runtime safety.
* Talent earning, spending, unlocks, learned state, active nodes, passive bonuses, combat, economy, debt, trophies, Famous Gear, Elite Board, and revisit behavior remain unchanged.

---

## 1.5.x Direction

DungeonDex `1.5.x` is the progression identity branch after the major `1.4` release.

The goal of this line is to add deeper player progression without turning the base combat loop into a more complex system.

---

## Historical 1.5.x Focus

* Talent System Foundation
* Passive-only progression hooks
* Save-safe unlock state
* Mobile-first talent viewing
* Small, readable progression steps
* Continued build/cache label consistency
* No combat complexity inflation

## 1.6.x Direction

* Collection, memory, and compact town economy systems
* Save-safe UI shells and normalization hooks
* Display-only progression identity
* No combat complexity inflation

---

## Do Not Use As Version Authority

The following should not be treated as the current project version:

* Old release-note filenames
* Old zip/package names
* Historical `patch-log.md` entries
* Stale cache labels
* Old smoke-test notes
* Old Codex session summaries
* Old generated package names

Use `VERSION.md` for the current active version.

---

## Version Notes

Add new notes below this section.

---

### v1.15.2 - Remove Planned Return Routes Town Panel

* Tightened the revisit route panel copy so the existing locked previews read more cleanly on mobile.
* Shortened route detail and readiness strings for the protected route identities without changing lock state or gameplay behavior.
* Extended smoke coverage to confirm the revisit route content fields remain present, string-based, and read-only.
* No route entry, reward, combat, economy, debt, trophy, Famous Gear, Elite Board, Talent, or main progression behavior changed.

### v1.14.0 - Revisit Route Content Completion

* Added a deterministic content-definition layer for revisit route previews so the existing side-route cards show clearer title, district, reason, hook source, short description, flavor line, safety line, and readiness note copy.
* Improved the Town revisit panel copy to explain that these routes are optional side content, preview-only until requirements are met, and not a replacement for main dungeon progress.
* Extended revisit smoke coverage to check route content definitions and the richer preview copy while leaving gameplay behavior unchanged.
* No revisit activation, talent, combat, economy, debt, trophy, Famous Gear, Elite Board, or scaling behavior changed.

### v1.13.1 - Rendered Build Label / Cache Hygiene Audit

* Fixed the stale visible build label source in the build label guard, which was still hardcoded to `DungeonDex v1.12.5`.
* Updated the visible version label and cache/build query strings to `DungeonDex v1.13.1` with build query `1.13.1-rendered-build-label-cache-hygiene`.
* Confirmed the fix is cache/label hygiene only. No revisit, talent, combat, economy, debt, trophy, Famous Gear, Elite Board, or scaling behavior changed.

### v1.13.0 - Revisit Routes Activation Foundation

Status: In Progress

Summary:

* Added a safe route selection/start foundation for revisit side-routes, starting from locked preview state.
* Extended `player.revisitState` to include optional active-route shape: `activeRouteKey`, `startedAt`, `sourceFloor`, `sideRoute`, `locked` flags, and `cappedReward` flag.
* Added defensive helper functions: `canStartRevisitRoute(state, routeKey)`, `startRevisitRoute(state, routeKey)`, `activeRevisitRouteSummary(state)`.
* Added validation safeguards: route key checks, locked-state enforcement, malformed-data handling, state isolation verification.
* Added minimal UI affordance for valid route previews in the town Revisit panel.
* Verified through extended smoke tests that starting a revisit route does not mutate: main floor progression, chapter progress, combat scaling, Talent state, gear inventory, economy/copper, trophies, Famous Gear, Debt state, or Elite Board contract state.
* Rewrites remain capped/preview-scoped with side-route isolation flags.
* Confirmed Enter/Continue remains the primary progression path.
* No combat mechanics, no new reward systems, no permanent progression changes, no passive bonuses, and no talent gameplay changes were added.
* Revisit Routes remain optional side routes without affecting main progression, economy balance, or existing systems.

---

### v1.12.5 - Talent Foundation Completion Checkpoint

Status: Complete

Summary:

* Added a locked, preview-only talent ruleset foundation with point source rules, caps, branches, tiers, costs, unlock requirements, and node metadata.
* Added read-only ruleset helpers that return defensive zero-gameplay data with `locked:true`, `previewOnly:true`, `active:false`, and `gameplayEnabled:false`.
* Added a compact read-only rules summary to the existing locked Talent Tree Preview UI.
* Extended `smoke_talent_v150b.mjs` coverage to verify the ruleset exists, remains defensive, and does not activate gameplay.
* Preserved malformed `player.talentLedger` repair safety from v1.12.1.
* No talent earning, talent spending, unlocks, learned state, active nodes, passive bonuses, combat changes, economy changes, scaling changes, monsters, gear, debt, revisit routes, or Elite Board behavior changes were added.

---

### v1.12.1 - Talent Ledger Repair/Smoke Hardening

Status: Complete

Summary:

* Hardened `player.talentLedger` normalization against missing, null, array, string, partial, legacy, and polluted shapes.
* Kept `talentPointLedger` and `talentPointLedgerSummary` read-only, preview-only, and zeroed.
* Froze legacy talent point/unlock/bonus helpers into a zero-state compatibility shell.
* Extended `smoke_talent_v150b.mjs` coverage for malformed talent-ledger repair and no-op legacy talent mutation paths.
* Preserved the locked Talent Tree Preview copy and status panel.
* No talent earning, talent spending, unlocks, learned state, active nodes, passive bonuses, combat changes, economy changes, scaling changes, monsters, gear, debt, revisit routes, or Elite Board behavior changes were added.

---

### v1.12.0 - Talent Point Ledger Foundation

Status: Complete

Summary:

* Audited the existing Talent foundation and smoke coverage.
* Classified Talent Foundation Expansion as the next planning lane.
* Preserved existing talent behavior, costs, unlocks, combat balance, economy balance, and save behavior.
* Revisit/Trophy Echo remains paused, locked, and non-playable.

---

### v1.10.2 - Trophy Echo Rule Handoff Audit

Status: Complete

Summary:

* Checkpointed the Trophy Echo rule-planning chain after smoke hardening.
* Clarified that Trophy Echo remains locked, inactive, rewardless, and non-playable.
* Preserved no-entry, no-reward, no-teleport, no-combat-rerun, no-completion, and no-scaling guardrails.
* No gameplay, combat, economy, or save-model changes.

---

### v1.10.1 - Trophy Echo Rule Smoke Hardening

Status: Complete

Summary:

* Hardened Trophy Echo rule planning smoke against malformed, missing, mixed, and high boss-history data.
* Confirmed high Trophy Echo signal progress does not create route access.
* Confirmed route access and reward access remain unavailable.
* Trophy Echo remains locked, inactive, and non-playable.
* No save fields, gameplay, route entry, rewards, teleporting, combat reruns, completion logic, scaling, combat balance, or economy changes.

---

### v1.10.0 - Trophy Echo Unlock Rule Planning

Status: Complete

Summary:

* Added read-only Trophy Echo unlock-rule planning metadata.
* Added boss-history signal planning.
* Added anti-farming and future reward-policy metadata.
* Trophy Echo remains locked, inactive, and non-playable.
* No route entry, rewards, teleporting, combat reruns, completion logic, scaling, combat balance, or economy changes.

---

### v1.9.3 - Systems Handoff Audit

Status: Complete

Summary:

* Added a roadmap handoff audit for checkpointed and unfinished systems.
* Marked Revisit as checkpointed but non-playable.
* Identified v1.10 candidate lanes.
* No gameplay, combat, economy, route activation, rewards, teleporting, completion logic, or scaling changes.

---

### v1.6.18 - Boss Trophy Identity Pass

Status: Complete

Summary:

* Refreshed the current roadmap in `DUNGEONDEX_CURRENT_NOTES.md` around the active post-v1.6.16 systems baseline.
* Replaced stale planning fragments with stable baseline, near-term priorities, next-system candidates, larger direction, and guardrails.
* Grounded next-system candidates in audited active systems without promising new gameplay.
* No gameplay, save structure, combat, economy, loot, talent, board, archive, or debt collector behavior changes.

---

### v1.6.16 - Repository Archive Cleanup

Status: Complete

Summary:

* Moved historical root release notes, smoke-test notes, patch notes, the v1.4.2 bugfix audit, and the local package zip artifact into archive folders while preserving filenames.
* Kept active runtime files, current version/changelog notes, active tools, and active smoke scripts in place for itch-upload safety.
* Updated active build/cache labels and notes to `DungeonDex v1.6.16`.
* No gameplay, save structure, combat, economy, loot, talent, board, archive, or debt collector behavior changes.

---

### v1.6.15 - Post-Theme Systems Audit

Status: Complete

Summary:

* Audited active runtime labels, service-worker cache strings, loaded system modules, root release-note clutter, smoke tooling, and theme/status leftovers after the Lowfire cleanup passes.
* Fixed stale loaded build guards and service-worker build query strings so runtime labels and cache assets stay aligned with `VERSION.md`.
* Added factual roadmap-prep audit notes without adding a new gameplay roadmap or changing combat, saves, economy, loot, talents, or debt behavior.

---

### v1.6.14 - Legacy Accent Holdout Cleanup

Status: Complete

Summary:

* Removed the remaining cyan/blue escape-feed holdout and aligned the related escape/feed chip surfaces to the Lowfire ember palette.
* Kept layout, combat math, saves, enemies, loot, and progression unchanged.
* Updated active build/cache labels and notes to `DungeonDex v1.6.14`.

---

### v1.6.13 - Combat Accent Cleanup Pass

Status: Complete

Summary:

* Reworked the remaining cold combat-heavy accents toward ember, bronze, ash, and muted gold tones.
* Tightened run-screen, combat log, enemy, tab, archive, gear, and helper surfaces so the Lowfire theme reads more consistently.
* Kept success affordances readable while reducing mint/cyan holdouts that clashed with the theme.
* Updated active build/cache labels and notes to `DungeonDex v1.6.13`.
* No gameplay, save structure, or combat logic changes.

---

### v1.6.12 - Lowfire Ember Theme Pass

Status: Complete

Summary:

* Refined the shared interface palette toward charcoal, ash, ember, and warm gold tones across town, run, gear, dex, and archive surfaces.
* Tightened panel, tab, card, pill, and combat shell treatment so the UI feels heavier and less neon while staying compact and readable on mobile.
* Reworked primary, focus, and archive accents to fit the Lowfire theme while keeping rarity colors legible.
* Updated active build/cache labels and notes to `DungeonDex v1.6.12`.
* No gameplay, save structure, or combat logic changes.

---

### v1.6.11 - Retired Gear Hall Polish

Status: Complete

Summary:

* Improved retired/archive gear readability with compact name, rarity, slot/type, iLvl, rating, retired-at, and Famous Gear memory chips.
* Added display-only retired gear summary counts for total retired items, Famous Gear, mythic/legendary items, and boss-marked memories.
* Added stable archive ordering that shows Famous Gear first, then higher rarity, item level, rating, and recent retirement records.
* Added DevTools-focused `retiredGearHallSmoke()` coverage for empty rendering, old-style memory repair, positive-only counter chips, and summary safety.
* Updated active build/cache labels and notes to `DungeonDex v1.6.11`.
* No combat changes, rewards, bonuses, or save wipe.

---

### v1.6.10 - Famous Gear Memory Expansion

Status: Complete

Summary:

* Expanded save-safe Famous Gear memory with passive kill, boss, elite, and chapter counters.
* Added equipped Famous Gear counter tracking on existing encounter and chapter-clear checkpoints without changing combat numbers, enemy behavior, rewards, or hidden mechanics.
* Added compact memory stat chips to existing gear cards and retired archive records.
* Added DevTools-focused `famousGearMemorySmoke()` coverage for marking, repair, summaries, clearing, and old-style memory repair.
* Updated active build/cache labels and notes to `DungeonDex v1.6.10`.
* No save wipe.

---

### v1.6.9 - Debt Collector Activation

Status: Complete

Summary:

* Activated the Debt Collector town panel with compact 5s, 10s, and 25s loan actions that add coin to the Warden's purse and record a save-safe debt balance.
* Added a repay action that spends available purse coin against the marker, supports partial repayment, and clears active debt plus pressure when fully paid.
* Added visible atmospheric pressure growth on completed run returns only; pressure does not alter combat stats, enemy behavior, rewards, or hidden mechanics.
* Updated active build/cache labels and notes to `DungeonDex v1.6.9`.
* No save wipe.

---

### v1.6.7 - Boss Trophy Reward Polish

Status: Complete

Summary:

* Tightened Trophy Hall boss summary, record cards, and empty-state spacing so the updated layout stays readable on narrow phones.
* Added clearer trophy count and source metadata treatment for boss trophy records without changing reward behavior or save data.
* Kept Trophy Hall updates display-only, with no gameplay, combat, scaling, affix, status, or special-mechanic changes.
* No save wipe.

---

### v1.6.3 - Trophy Hall Archive Shell Prep

Status: Complete

Summary:

* Reframed the Trophy Hall as a compact collection hub with clearer section shells for Boss Trophies, Board & Rival Trophies, and a future Retired Items shelf.
* Added a display-only Retired Items placeholder so future archive work has a clear home without introducing any gear mutation, retirement logic, or item actions.
* Preserved boss trophy records, duplicate increment behavior, Elite Board and Rival rules, Talent behavior, and combat/scaling behavior.
* No save wipe.

---

### v1.6.2 - Trophy Hall Content Density & Metadata Consistency

Status: Complete

Summary:

* Tightened Trophy Hall boss trophy spacing, labels, and card density so recorded entries stay readable without turning the screen into a wall of text.
* Normalized boss trophy metadata display around short labels for Count, Best Depth, and Last Earned while keeping safe fallbacks for missing names or malformed depth fields.
* Preserved the existing `bossTrophyRecords` save model, duplicate increment behavior, locked/missing case flow, and all Elite Board, Rival, and Talent behavior.
* No save wipe.

---

### v1.6.1 - Boss Trophy Dex Identity Polish

Status: Complete

Summary:

* Polished the Trophy Hall boss section into a clearer Dex-style collection with recorded and missing states, locked copy, and compact collection-only summary cards.
* Added a defensive boss trophy collection summary layer so records can report recorded, missing, total collected, and deepest boss mark without changing the existing `bossTrophyRecords` save model.
* Tightened boss trophy naming and display fallbacks around the existing definition list so malformed or older records still render safe boss/trophy labels.
* Preserved Elite Board trophies, Rival memory rules, Talent behavior, and boss trophy persistence; no combat mechanics, affixes, statuses, or balance changes were added.
* No save wipe.

---

### v1.6.0 - Boss Trophy Expansion Foundation

Status: Complete

Summary:

* Expanded boss trophies from a simple unlock list into save-safe trophy records with boss name, trophy name, run location, best kill depth, and count.
* Kept the Trophy Hall compact by adding a recorded Boss Trophies section plus a separate missing-trophy case.
* Preserved Elite Board and Rival trophy behavior; boss trophies remain collection records only and do not add combat power.
* Added save repair and DevTools helpers for missing or malformed boss trophy data.
* No save wipe.

---

### v1.5.2 - Talent Milestone Feedback Clarity

Status: Complete

Summary:

* Clarified the Gear tab Talent panel with next-point milestone copy, secured-depth progress, and the max-point rule.
* Added display-only milestone feedback: next point depth, progress toward the next 5-depth milestone, and max points.
* Kept the Talent System foundation unchanged: no new talents, paths, combat mechanics, monster mechanics, bonus values, or earning-rate changes were added.
* Confirmed repaired and older-save-style talent data still displays safely.
* No save wipe.

---

### v1.5.3 - Talent Release Readiness Sweep

Status: Complete

Summary:

* Verified the `v1.5.x` Talent foundation remains release-stable across fresh-save, repaired older-save-style, unknown-id, mobile-width, and town/run regression paths.
* Updated active version, build, and cache labels to `v1.5.3` for the readiness sweep.
* Kept the current four talent paths and four starter talents only, with no bonus-value, point-rate, combat, affix, or status-mechanic expansion.
* No save wipe.

---

### v1.5.1 - Talent UI Readability & Save Compatibility Polish

Status: Complete

Summary:

* Polished the Gear tab Talent panel with a clearer Warden Talents header, passive-only note, readable point totals, and stronger locked/ready/unlocked button states.
* Shortened starter talent copy while keeping Hardened Start, Board Regular, Stair Sense, and Appraiser unchanged mechanically.
* Added a small defensive Talent UI summary fallback so repaired, missing, mirrored, or unknown talent data still displays safely without changing legacy alias repair.
* Kept the existing four paths and four starter talents only.
* No combat mechanics, monster mechanics, talent values, scaling, gear balance, death, extraction, or charter rules were changed.
* No save wipe.

---

### v1.5.0b - Talent Save/Load Regression Guard

Status: Complete

Summary:

* Verified the talent system across fresh-save, older-save-style, unknown-id, longer-play, Elite Board, and charter/sell regression paths.
* Confirmed save/load repair remains stable for missing talent state, legacy aliases, and the `talentUnlockIds` mirror.
* Kept the Talent System foundation unchanged: no new talents, paths, combat mechanics, monster mechanics, or balance changes were added.
* No save wipe.

---

### v1.5.0a - Talent Browser Smoke Hotfix

Status: Complete

Summary:

* Verified the talent browser smoke against the live headless build.
* Fixed the stale Settings panel version label so it now matches the current `DungeonDex v1.5.0a` build label.
* Kept the Talent System foundation unchanged: no new talents, paths, combat mechanics, monster mechanics, or balance changes were added.
* No save wipe.

---

### v1.5.0 - Talent System Foundation

Status: Complete

Summary:

* Added a save-safe talent state model with `pointsEarned`, `pointsSpent`, and `unlocked` data.
* Added four starter passive paths: Survivor, Hunter, Delver, and Collector.
* Added a compact Talent Paths panel on the Gear screen with available/spent points and unlock buttons.
* Added passive hooks only for max HP, Elite Board payout, charter cost, and sell value.
* Added DevTools helpers for granting points, resetting talents, unlocking talents for testing, smoke checks, and summaries.
* Old or missing talent data repairs safely, unknown talent ids are preserved without crashing the UI, and unlocks persist across save/load.
* No active combat buttons, spell rotations, status effects, affixes, modifier popups, special monster behavior, or broad scaling rebalance were added.
* No save wipe.

---

### v1.4.29 - Intro Modal Mobile Spacing Audit

Status: Complete

Summary:

* Tightened the intro/safe-return modal spacing on narrow mobile widths so the Current Roadmap card stays readable without crowding the district, progress, or footer rows.
* Kept the `Enter Dungeon` and `Close` actions visible and tappable on mobile widths, including the 390px, 375px, 360px, and 320px checks.
* Preserved the v1.4.28 roadmap copy and the v1.4.28a verified intro/safe-return button behavior.
* Updated build and cache labels to `DungeonDex v1.4.29` with build query `1.4.29-intro-modal-mobile-spacing-audit`.
* No gameplay, combat math, monster scaling, gear scaling, death/extraction/charter rules, Elite Board behavior, Bonus Writ behavior, Trophy behavior, Rival behavior, affixes, status effects, modifier popups, special monster behavior, or hidden enemy effects were changed.
* No save wipe.

---

### v1.4.28a - Intro Button Smoke Hotfix

Status: Complete

Summary:

* Verified the intro/safe-return modal still renders the Current Roadmap card from v1.4.28.
* Confirmed the modal retains the `Enter Dungeon` and `Close` controls in code and layout.
* No UI redesign was needed, and no gameplay, combat, scaling, or save rules were changed.
* Kept the safe-return/extraction flow intact.
* Updated build and version labels to `DungeonDex v1.4.28a` for the hotfix pass.
* No affixes, status effects, modifier popups, special monster behavior, or hidden enemy effects were added.
* No save wipe.

---

### v1.4.28 - Intro Roadmap Panel & Itch Analytics Note

Status: Complete

Summary:

* Reworked the intro/safe-return modal so the old Best Floor, Safe Return, and Next Boss status chips no longer repeat progress summary data in that panel.
* Added a compact Current Roadmap card that reads cleanly on mobile and keeps the panel focused on what is new and what comes next.
* Kept the current district card, room progress bar, last-descent feedback, and wallet/ember display intact.
* Updated the active build labels and cache query strings to `DungeonDex v1.4.28` with build query `1.4.28-intro-roadmap-panel-itch-analytics-note`.
* Used recent itch traffic only as design context for a cleaner returning-player panel; no raw analytics numbers were surfaced in-game.
* Kept gameplay, combat math, monster scaling, gear scaling, death/extraction/charter rules, Elite Board behavior, Bonus Writ behavior, Trophy behavior, and Rival behavior unchanged.
* Did not add talents, combat systems, monster affixes, status effects, modifier popups, special monster behavior, or hidden enemy effects.
* No save wipe.

---

### v1.4.27 - Roadmap Notes & Branch Cleanup

Status: Complete

Summary:

* Added a clean roadmap handoff note for the post-v1.4 branch transition.
* Clarified that v1.4.x remains the stabilization, scaling, and readability branch.
* Clarified that v1.5.x is the next progression-system branch, with `v1.5.0` pointing to the Talent System Foundation.
* Kept `VERSION.md` as the source of truth and updated visible build labels to `v1.4.27`.
* Kept gameplay, combat math, monster scaling, and board/rival behavior unchanged.
* No affixes, status effects, modifier popups, special monster behavior, aura mechanics, burn, bleed, poison, stun, thorns, regen, shield procs, or hidden enemy effects were reintroduced.
* No save wipe.

---

### v1.4.26 - Floor 20-35 Balance Sample Pass

Status: Complete

Summary:

* Added a developer-only Floor 20-35 balance sample helper to the existing DevTools scaling tools.
* The helper reports player power, HP, guard, average ilvl, common / elite / boss samples, Elite Board target samples, Rival Elite samples, ratios, and short risk labels.
* The helper prefers a high-power live save when one is loaded and otherwise uses a clearly labeled synthetic ilvl 320 / 22k player profile without touching save data.
* Sampled Floor 20, 24, 26, 30, and 35 against the v1.4.25 scaling shape.
* Left monster scaling values unchanged because the sample data stayed in the intended range for the Floor 20-35 follow-up.
* Preserved HP-first contract and rival threat shape.
* No affixes, status effects, modifier popups, special monster behavior, aura mechanics, burn, bleed, poison, stun, thorns, regen, shield procs, or hidden enemy effects were reintroduced.
* No save wipe.

---

### v1.4.25 - Scaling Follow-up & Runtime Smoke Guard

Status: Complete

Summary:

* Verified the v1.4.24 scaling path after the v1.4.24a Enter Dungeon runtime hotfix.
* Added a DevTools scaling smoke snapshot that reports player power, current Floor / Room / Chapter, common / elite / boss sample power and HP, and active contract / rival target HP when available.
* Tuned Floor 20+ monster pressure so high-ilvl mythic gear no longer leaves common enemies far behind.
* Preserved HP-first elite, boss, contract, and rival threat shape.
* Confirmed the bad undefined `depth` reference is not present in `generateMonster`.
* Preserved simple combat with no affixes, status effects, modifier popups, or special monster mechanics.
* No save wipe.

---

### v1.4.24a - Enter Dungeon Scaling Runtime Hotfix

Status: Complete

Summary:

* Fixed a runtime crash in monster HP generation caused by an undefined `depth` reference.
* Replaced the bad HP-scaling reference with the already-defined `rawDepth` value.
* Restored Enter Dungeon / monster generation after the v1.4.24 scaling audit.
* Did not change scaling values beyond the variable reference fix.
* Preserved saves, combat simplicity, board hunts, Bonus Writs, trophies, rivals, death reset, extraction, and charters.

---

### v1.4.24 - Gear Scaling & Enemy Power Audit

Status: Complete

Summary:

* Audited gear scaling and enemy power at mid-depth.
* Tuned enemy scaling so Floor 20+ enemies better keep pace with high-ilvl gear.
* Prioritized HP-first difficulty for elites, bosses, contracts, and rivals.
* Preserved simple combat with no affixes/status effects.
* Did not wipe saves or delete gear.
* Preserved death reset, extraction, charters, board hunts, Bonus Writs, trophies, and rivals.

---

### v1.4.23 - Run Flow & Board Integration Audit

Status: Complete

Summary:

* Audited the run flow around death, extraction, charters, and board hunts.
* Clarified feedback around descent reset, safe extraction, and charter return.
* Tightened Elite Board, Bonus Writ, trophy, and rival integration where needed.
* Preserved HP-only combat and board-driven complexity.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.
* No zip/package created.

---

### v1.4.22 - Mobile Board & Trophy Hall Readability Polish

Status: Complete

Summary:

* Improved Elite Board readability.
* Cleaned active hunt and rival writ summaries.
* Improved Bonus Writ status labels.
* Clarified Trophy Hall and trophy summary wording.
* Kept trophy payout bonus labeled as preview/display-only.
* Made small mobile spacing improvements.
* No gameplay systems, combat mechanics, rewards, or save data were changed.
* No monster affixes/status effects were reintroduced.

---

### v1.4.21 - Cache Hygiene & Board Regression Guard

Status: Complete

Finished changes:

* Improved service worker and cache hygiene for the current DungeonDex build.
* Tightened build/version consistency checks across the active runtime label, cache query, and service worker assets.
* Added defensive Elite Board state regression guards for active contracts, Bonus Writs, trophies, rivals, failures, and death resets.
* Preserved safe extraction, death reset behavior, and Deep Stair Charter availability.
* Added or refined dev-facing board regression helpers for board, trophy, rival, and death-state inspection.
* Clarified cache, death, and board feedback where safe.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.

---

### v1.4.20 - Board Hunt Balance & Feedback Pass

Status: Complete

Finished changes:

* Improved Elite Board hunt state clarity for available, active, completed, failed, expired, rival, and trophy states.
* Improved compact feedback for active hunts, completed contracts, failed contracts, and rival contracts.
* Reviewed contract and rival target scaling; HP-only scaling remains the active behavior.
* Kept contract targets at 1.25x HP before threat floor 20 and 1.35x HP after that.
* Kept Rival Elites at 1.15x HP over Contract Elite targets.
* Clarified Bonus Writ, trophy roll, main reward, and rival reward feedback.
* Clarified trophy summary wording so the board payout bonus is labeled as a preview-only collection bonus.
* Death now resets normal descent progress back to the default start while preserving Deep Stair Charters, records, trophies, rivals, archive data, and save progress.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.

---

### v1.4.19 - Named Rival Elite Contracts

Status: Complete

Finished changes:

* Active Elite Board contracts now fail safely if the player dies before completing them.
* Dying to an active contract target can create a named Rival Elite memory.
* Rival Elites can return later as revenge contracts.
* Rival contracts use HP-only scaling and simple reward hooks.
* Rival state is save-safe and defensive for old saves.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.

---

### v1.4.18 - Elite Trophy & Reward Ladder

Status: Complete

Finished changes:

* Added Elite Trophy collection hooks for completed Elite Board hunts.
* Elite Board targets can now drop collectible trophies.
* Duplicate trophies are tracked safely.
* Reward feedback now separates contract reward, Bonus Writ reward, and trophy results.
* Added a lightweight trophy summary to the board/archive area.
* Trophy bonuses are tiny, capped, and limited to Elite Board rewards if implemented.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.

---

### v1.4.17 - Elite Board Bonus Writ Polish & Rewards

Status: Complete

Finished changes:

* Polished Elite Board Bonus Writs.
* Bonus Writs are optional objectives attached to active hunt contracts.
* Completing a Bonus Writ grants a small extra payout.
* Missing a Bonus Writ does not fail the main hunt.
* Board and combat feedback now explain Bonus Writ status more clearly.
* Bonus Writs use simple HP and run-action tracking only.
* No monster affixes, status effects, or special enemy mechanics were reintroduced.
* No save wipe.

---

### v1.4.16 - Lore Depth Counter & Floor Naming Fix

Status: Complete

Finished changes:

* Updated active build labels and cache query strings to `DungeonDex v1.4.16` with build query `1.4.16-lore-depth-counter-floor-names`.
* Town and combat now share the same lore-depth helper.
* The combat header now displays Floor, Room, and Chapter more clearly.
* `10` Chapters display as `1` Room.
* `5` Rooms display as `1` Floor.
* Boss distance now displays in chapters.
* Floor names resolve through the shared lore-depth display helper.
* No save data, combat mechanics, rewards, Elite Board behavior, or enemy mechanics were changed.
* Monster affixes/status effects were not reintroduced.

---

### v1.4.15 - Combat Affix Removal & Encounter Simplification Pass

Status: Complete

Finished changes:

* Updated active build labels and cache query strings to `DungeonDex v1.4.15` with build query `1.4.15-combat-affix-removal`.
* Removed active monster affix and elite modifier generation for now.
* Disabled affix/status combat behavior, including modifier readouts, poison, burn ticks, pierce hooks, revive/surge hooks, elite critical specials, and modifier bonus loot.
* Simplified enemy headers to Common, Elite, and Boss tier identity with monster family/contract hunt language.
* Kept Common, Elite, and Boss tier scaling, with elites and bosses relying primarily on HP scaling.
* Updated Elite Board cards to stop advertising modifier fields while preserving named hunt contracts and save compatibility.
* Preserved save compatibility by ignoring old affix/status/modifier fields instead of wiping or migrating progress.

---

### v1.4.15 - Elite Board Hunt Contracts Pass

Status: Complete

Finished changes:

* Made Elite Board contracts create real named hunts with stored target floor, tier, district, contract text, Bonus Writ, and reward preview.
* Injected accepted contract targets into the run flow at the target floor and kept the exact elite name stable through save/load.
* Added simple Bonus Writ tracking and payout bonuses without bringing back affixes or special enemy mechanics.
* Updated Elite Board UI to show the active hunt summary and the contract's Target, Tier, Contract, Bonus Writ, and Reward fields.
* Added safe contract test helpers for accept, jump, force encounter, complete, fail, and expire flows.
* Preserved save compatibility and left the existing simplified Common/Elite/Boss combat model intact.

---

### v1.4.14 - Combat Page Framing & Text Cleanup Pass

Status: Complete

Finished changes:

* Updated active build labels and cache query strings to `DungeonDex v1.4.14` with build query `1.4.14-combat-page-framing-cleanup`.
* Removed the heavy outer combat frame so the run screen reads as the actual combat screen instead of a phone-shaped card.
* Removed the top objective/status text line, including `Win this fight to continue deeper`, while keeping the Haul display.
* Removed the duplicate giant monster-name header and kept the monster name near the enemy HP bar.
* Shifted the enemy-card header to compact rarity/type/tag metadata.
* Cleaned combat status copy spacing/capitalization, including room and boss-distance labels.
* No combat balance, reward logic, save format, or progression logic changed.

---

### v1.4.13 - Elite Board Contract Identity Pass

Status: Complete

Finished changes:

* Expanded the Lowfire Elite Board into a three-contract choice system.
* Added real named hunt targets with exact elite names, target floors, contract text, bonus writ copy, modifiers, reward previews, and flavor.
* Injected accepted contract targets into the run encounter flow with conservative Contract Elite scaling.
* Added accepted-contract visual state, completion/failure/expiration state handling, and a compact active-hunt summary.
* Kept trophy rewards out of this pass and avoided broad combat or economy rebalance.
* Aligned active build labels and cache query strings to `DungeonDex v1.4.13` with build query `1.4.13-elite-board-contract-identity`.

---

### v1.4.12 - DevTools Load Restore & Package Hygiene Hotfix

Status: Complete

Finished changes:

* Restored `14_devtools_scenarios.js` and `15_devtools_balance_reports.js` in `index.html` load order between systems 13 and 16.
* Aligned `index.html`, `app.js`, `sw.js`, and build-label guards to `DungeonDex v1.4.12` with build query `1.4.12-devtools-load-hygiene`.
* Removed accidental tracked file `tatus --short` and added a minimal `.gitignore` hygiene baseline.

### v1.4.11 - Dungeon Flow Clarity Pass

Status: Complete

Finished changes:

* Reworked the active-run header into compact current floor, district, room/chapter, boss status, next-action, and haul lines.
* Kept boss-floor state visible with a clearer active boss label while preserving the existing boss encounter layout.
* Improved reward summaries with labeled Gold, Shards, Ember, XP, and Loot values.
* Tightened rendered combat-feed wording for post-fight rewards, next-fight flow, room/floor milestones, and no-drop outcomes.
* Renamed the vague combat action label from `Skill` to `Ashburst` without changing the underlying action.

---

### v1.4.11 - App Feel Polish Pass

Status: Complete

Finished changes:

* Aligned stale runtime build guards with `VERSION.md` so loaded UI keeps the short `DungeonDex v1.4.11` label.
* Updated the cache-busting label to `1.4.11-app-feel-polish`.
* Shortened town, run-feed, gear, and archive copy to reduce panel height.
* Compressed repeated combat-feed wording at render time without changing stored combat logs or rewards.
* Added compact mobile combat CSS through the existing density cleanup module.
* Improved gear upgrade and archive note scanability with small CSS hooks.

---

## Standing Development Rules

These rules apply to future DungeonDex updates:

* Do not create a new zip/package unless explicitly requested.
* Treat the GitHub folder as the source of truth.
* Use `VERSION.md` as the active version authority.
* Use `CHANGELOG.md` for ongoing update history.
* Keep visible in-game labels short and player-facing, such as `DungeonDex v1.4.17`.
* Keep long internal pass names out of player-facing UI.
* Preserve save compatibility whenever possible.
* Prefer small, reviewable updates over large rewrites.
* Keep DungeonDex mobile-first and compact.
* Inspect files before editing.
* Summarize changed files after each pass.
* Include smoke-test steps before committing.

---

## Commit Style

Use clear commit messages such as:

* `Update changelog structure`
* `Fix version authority notes`
* `Polish mobile combat flow`
* `Clean up run gear archive UI`
* `Fix build label consistency`
* `Improve town panel spacing`
* `Add clean context baseline notes`

---

## Notes

This changelog replaces temporary patch-note files and should remain the single ongoing update record for DungeonDex.
## v1.6.6 - Famous Gear Memory Foundation
* Added a save-safe `gearMemory` item shape for display-only Famous Gear tags, titles, timestamps, and short notes.
* Added compact memory labels to inventory/equipment cards and retired item archive cards when an item carries memory.
* Preserved memory fields through save repair and manual retirement archive snapshots without changing gear stats, value, scaling, sell/equip behavior, or combat.
* Added DevTools-only Famous Gear helpers and smoke coverage for mark, reload persistence, retire preservation, archive display, and mobile layout.

## v1.6.5a - Retired Item Manual Action Smoke Hotfix
* Added a browser-backed smoke check for the manual retire action, including cancel, confirm, archive-before-remove, reload persistence, and mobile overflow coverage.
* Kept the v1.6.5 retire action behavior unchanged unless smoke exposed a real defect.

## v1.6.5 - Retired Item Manual Archive Action
* Added a safe manual retire action for unequipped inventory items only, with confirmation copy that identifies the item by name, rarity, and slot.
* Archived retired items before inventory removal, and rolled back the archive entry if the item could not be removed.
* Kept equipped items out of the retire flow and left sell/equip behavior intact.

## v1.6.4 - Retired Item Archive Foundation
* Added a normalized retired item archive record model under `player.retiredRelics`, preserving read-only gear snapshots for archive display and save repair without changing inventory or equipment behavior.
* Replaced the Trophy Hall Retired Items placeholder with a real archive section that renders persisted records and keeps creation DevTools-only for this build.
* Added DevTools retired item archive test helpers plus smoke coverage for record creation, malformed-save repair, reload persistence, and mobile layout stability.
