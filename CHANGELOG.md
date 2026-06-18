# DungeonDex Changelog

This file is the long-term update history and release-tracking document for DungeonDex.

Use this file instead of temporary patch-note files such as `PATCH_NOTES_1_4_X.md`.

---

## Version Source of Truth

* Public/live itch version: `v1.12.5`
* Current local package baseline: `v1.20.17`
* Current development target: `v1.20.17`
* Version authority file: `VERSION.md`

`VERSION.md` is the authority for the current active development version.
This changelog records what changed and why.

---

## v1.20.17 - Town Revisit UI No-Live-Affordance Smoke Hardening

* Added a read-only Trophy Echo route detail foundation tied to remembered boss trophies and trophy records.
* Kept the planned Revisit lane order at Trophy Echo, Famous Gear Memory, then Rival Trace.
* Added smoke coverage proving the Trophy Echo detail contract stays locked, planning-only, and exposes no live entry, hunt, board mission, reward, unlock, currency, completion, or progression mutation surface.
* No Revisit activation, route entry, route rewards, route completion, combat, economy, contracts, debt, Talent, gear, trophy, Famous Gear, save, or Elite Board behavior changed.

## v1.20.8 - Owed Money Text Fix

* Fixed the Debt Collector Owed line so text-rendered debt summaries use clean coin notation instead of displaying raw money span markup.
* Kept the HTML money formatter available for controlled styled coin output while using plain text for escaped Debt Collector summary/status strings.
* Extended debt smoke coverage to assert the rendered Owed text does not include literal money markup and still includes the owed amount.
* No debt gameplay, balance math, economy, rewards, combat, talent, save, Elite Board, trophy, Famous Gear, or Revisit behavior changed.

## v1.20.6 - Revisit Guard Hardening

* Hardened revisit smoke coverage around the inert planning contract.
* Kept Trophy Echo first and Famous Gear Memory second as read-only planned lanes only.
* Confirmed the Revisit system still has no entry path, rewards, completion, or progression mutation.
* No Revisit activation, route entry, route rewards, route completion, currency, progression, combat, debt, talent, or Elite Board behavior changed.

## v1.20.5 - Revisit Planning Copy Cleanup

* Trimmed repeated roadmap wording around the inert Revisit lane order.
* Kept Trophy Echo first and Famous Gear Memory second as read-only planned lanes only.
* Kept the Revisit system planning-only, with all gates locked and unavailable.
* No Revisit activation, route entry, route rewards, route completion, currency, progression, combat, debt, talent, or Elite Board behavior changed.

## v1.20.4 - Revisit Lane Order Clarification

* Clarified why Trophy Echo is first: boss trophy history is the cleanest anchor for earlier dungeon accomplishments.
* Clarified that Trophy Echo is remembered victories only, not a live route.
* Clarified that Famous Gear Memory is the natural second lane because retired and named gear history follows as a memory trail.
* Kept the Revisit system planning-only, with all gates locked and unavailable.
* No Revisit activation, route entry, route rewards, route completion, currency, progression, combat, debt, talent, or Elite Board behavior changed.

## v1.20.3 - Revisit Clarity and Label Sync

* Bumped the public, local, and development version labels to `v1.20.3`.
* Aligned visible build, cache, and runtime labels so they match `VERSION.md`.
* Added a short read-only Revisit planning note explaining why Trophy Echo is first, while keeping it metadata only.
* Kept Famous Gear Memory as the second planned lane and left all Revisit gates locked.
* No Revisit activation, route entry, route rewards, route completion, currency, progression, combat, debt, talent, or Elite Board behavior changed.

## v1.20.2 - Monster Backdrop Canvas Completion

* Completed the deterministic, canvas-only monster backdrop system behind the combat monster stage.
* Added the production backdrop catalog and diagnostics helpers for visual QA.
* Added stronger boss/elite framing, horizon motifs, foreground props, fog bands, motes, and resize-aware redraw keys.
* Extended smoke coverage to prove the system is complete, deterministic, non-mutating, visual-only, cataloged, and resize-aware.
* Preserved the v1.20.0 second Revisit lane planning contract and kept Revisit routes locked, read-only, preview-only, and non-playable.
* No combat math, HP, rewards, route entry, route completion, scaling, economy, debt, Talent, Elite Board, trophy, Famous Gear, or main progression behavior changed.

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
