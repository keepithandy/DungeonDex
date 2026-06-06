# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.5.0`
* Current local package baseline: `v1.5.0`
* Current development target: `v1.5.0`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## 1.5.x Direction

DungeonDex `1.5.x` is the progression identity branch after the major `1.4` release.

The goal of this line is to add deeper player progression without turning the base combat loop into a more complex system.

---

## Current 1.5.x Focus

* Talent System Foundation
* Passive-only progression hooks
* Save-safe unlock state
* Mobile-first talent viewing
* Small, readable progression steps
* Continued build/cache label consistency
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

## Active 1.5.x Notes

Add new notes below this section.

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
