# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.4.1`
* Current local package baseline: `v1.4.9b`
* Current development target: `v1.4.10`
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

Add new notes below this section, starting with `v1.4.10`.

---

### v1.4.10 — Pending

Status: In development

Planned focus:

* Confirm `VERSION.md` matches the current development target
* Clean up changelog structure
* Remove temporary patch-note naming
* Keep visible player-facing build labels short
* Improve Codex/GitHub workflow consistency
* Continue small, safe mobile-first polish passes

---

## Standing Development Rules

These rules apply to future DungeonDex updates:

* Do not create a new zip/package unless explicitly requested.
* Treat the GitHub folder as the source of truth.
* Use `VERSION.md` as the active version authority.
* Use `CHANGELOG.md` for ongoing update history.
* Keep visible in-game labels short and player-facing, such as `DungeonDex v1.4.10`.
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
