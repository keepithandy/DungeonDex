# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.5.0a — Talent Browser Smoke Hotfix

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

## Roadmap

### v1.4.x — Stabilization and Release Cleanliness
Purpose:
Finish the stability branch and prepare DungeonDex for cleaner public-facing builds.

Completed focus:
- Lore depth display consistency
- Elite Board polish
- Trophy and rival support
- Death/extraction/charter smoke coverage
- Gear/enemy scaling audit
- Enter Dungeon runtime hotfix
- Scaling smoke guard
- Floor 20–35 balance sample tools

Remaining possible v1.4.x work:
- Final branch audit
- Small readability cleanup
- Release cleanup
- Public polish candidate only if needed

### v1.5.x — Progression Identity Systems
Purpose:
Add deeper player progression without making base monster combat complicated.

Main candidate:
Talent System Foundation

Talent direction:
- Passive talents only at first
- No new combat buttons
- No status effects
- No affixes
- Talents should modify existing systems instead of creating complex new combat behavior

Active v1.5.0a talent paths:
- Survivor: HP, recovery, safer extraction
- Hunter: Elite Board, rivals, trophies
- Delver: deeper floors, charters, bosses
- Collector: item finds, trophy value, archive/famous gear support

### v1.6.x — Collection, Memory, and Item Attachment
Purpose:
Make the Dex identity stronger.

Candidate systems:
- Boss Trophy Expansion
- Retire Items
- Famous Gear
- Early Dungeon Return Incentives

### v1.7.x — World Identity and Serious Dungeon Personality
Purpose:
Make districts, rivals, bosses, and the dungeon world feel more distinct.

Candidate systems:
- District Identity Pass
- Rival Lore Lines
- Dungeon Court event foundation
- Debt Collector event foundation

### v2.0 Direction — DungeonDex Identity Pass
Purpose:
Move DungeonDex from strong prototype into a more complete-feeling solo-dev browser game.

Possible pillars:
- App-like mobile shell
- District ambience/backgrounds
- Better monster presentation
- Complete trophy/boss archive
- Talent and item retirement integration
- Stronger new-player onboarding
- Cleaner public-facing polish
