# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.4.15`
* Current local package baseline: `v1.4.15`
* Current development target: `v1.4.15`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## 1.4.x Direction

DungeonDex `1.4.x` is the cleanup, polish, and foundation branch after the major `1.4` release.

The goal of this line is to stabilize the live app, reduce version confusion, clean up player-facing UI, improve mobile play, and prepare the project for larger `1.5+` systems.

---

## Current 1.4.x Focus

* Clean version authority
* Cleaner patch-note history
* Safer Codex workflow
* Mobile-first UI polish
* Active app-facing label cleanup
* Cache/build label consistency
* Better release documentation
* Small controlled hotfixes instead of messy version jumps

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

## Active 1.4.x Notes

Add new notes below this section.

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
* Keep visible in-game labels short and player-facing, such as `DungeonDex v1.4.15`.
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
