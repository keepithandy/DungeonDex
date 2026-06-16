# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.12.5`
* Current local package baseline: `v1.20.1`
* Current development target: `v1.20.1`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## v1.20.1 - Monster Backdrop Canvas Foundation

* Added a deterministic, canvas-only monster backdrop runtime behind the combat monster stage.
* Added visual-only helpers for generating, rendering, and attaching monster backdrops without adding Three.js or external assets.
* Added smoke coverage proving the backdrop contract is deterministic, non-mutating, visual-only, and free of gameplay action fields.
* Preserved the v1.20.0 second Revisit lane planning contract and kept Revisit routes locked, read-only, preview-only, and non-playable.
* No combat math, HP, rewards, route entry, route completion, scaling, economy, debt, Talent, Elite Board, trophy, Famous Gear, or main progression behavior changed.

## v1.20.0 - Second Revisit Lane Planning Contract

* Added Famous Gear Memory as the second planned Revisit lane contract with inert metadata only.
* Extended smoke coverage to prove Trophy Echo remains the first planned lane when preview order changes and second-lane fixture data exists.
* No revisit activation, route entry, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, Talent, or main progression behavior changed.

## v1.19.9 - Revisit First Lane Selection Contract

* Selected Trophy Echo as the first planned revisit activation lane in a read-only contract.
* Extended smoke coverage to prove the lane stays planned-only and still exposes no live entry, reward, or completion surface.
* No revisit activation, route entry, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.8 - Revisit Route-Preview Summary Mirror

* Added a read-only route-preview summary mirror for the revisit preview-state vocabulary.
* Extended smoke coverage to prove the mirror stays preview-only and still exposes no live entry, reward, or completion surface.
* No revisit activation, route entry, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.7 - Revisit Preview-State Summary Contract

* Added a read-only activation summary helper for the revisit preview-state vocabulary.
* Extended smoke coverage to prove the summary stays preview-only and still exposes no live entry, reward, or completion surface.
* No revisit activation, route entry, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.6 - Revisit Preview-State Contract Smoke

* Added an inert allowed-state vocabulary to the revisit activation plan contract for future preview-state transitions.
* Extended smoke coverage to prove the planning helper only returns allowed state names and still exposes no live entry, reward, or completion surface.
* No revisit activation, route entry, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.5 - Revisit Activation Rule Contract

* Defined a planning-only activation contract for future revisit routes without enabling route entry.
* Added an inert eligibility helper that keeps route planning read-only and preserves the primary dungeon path.
* Extended smoke coverage to prove the helper is non-mutating and still exposes no entry, reward, or completion affordances.
* No revisit activation, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.4 - Revisit UI Affordance Guard Smoke

* Added explicit smoke assertions proving the visible Town/Revisit UI does not expose route entry, reward, claim, or completion affordances.
* Kept the revisit preview surface locked, read-only, inactive, and non-playable.
* No revisit activation, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.3 - Revisit Reward/Completion Absence Smoke

* Added explicit smoke assertions proving revisit route previews expose no reward path or completion ledger surface.
* Confirmed preview helpers stay read-only and do not mutate player state while building route previews and summaries.
* Kept revisit routes locked, inactive, and non-playable.
* No revisit activation, route rewards, route completion, combat, economy, debt, trophy, Famous Gear, Elite Board, or main progression behavior changed.

## v1.19.2 - Revisit Route Activation Planning

* Documented the future revisit route activation rules, terminology, UI expectations, and guardrails.
* Kept Revisit Routes locked, read-only, and non-playable.
* Kept candidate hooks tied to existing history sources only.
* No gameplay, rewards, penalties, activation, combat, economy, talent, debt, or scaling behavior changed.

## v1.19.1 - Current Roadmap / Next Systems Audit

* Refreshed the project-facing roadmap so the next lane is clear after the debt collector visibility audit.
* Kept the locked Talent Tree Preview, revisit planning, Debt Collector ledger layer, Elite Board behavior, and archive memory systems unchanged.
* Reaffirmed the next recommended lane as revisit route activation planning, in planning only.
* No gameplay, combat, economy, talent, revisit, debt, or scaling behavior changed.

## v1.19.0 - Debt Collector Visibility Polish

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
