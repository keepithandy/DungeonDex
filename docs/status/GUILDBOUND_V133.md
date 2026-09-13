# DungeonDex v1.33 — Guildbound

## Authorized milestone scope

The owner requested a major 1.33 update with multiple original, fully playable systems and broad quality-of-life and visual improvements. Primary patch category: Content Expansion; the requested UI, save integration, combat hooks, verification, and version alignment are supporting work.

- Source: owner-designated `C:/Users/quali/Desktop/source/DungeonDex`, clean `main` at `3259ceb`.
- Work branch: `codex/v1.33-guildbound`, isolated worktree derived from that source.
- Starting version: `v1.32.2 Merchant Upgrade Hotfix`; build `1.32.2-merchant-upgrade-hotfix`.
- Relevant active version references were inspected before edits: VERSION, README, CHANGELOG authority pointers, CURRENT_NOTES baseline, VERSION_CACHE_AUTHORITY, index title/labels/build globals/asset queries, app globals/fallback, core BUILD/visible label, build guard, service-worker name/query, and wiring smoke expectations. They agree on 1.32.2. Historical 1.32.0 and older release entries remain history. Manifest/CSS are not version authorities; package builders derive their version. `patch-log.md` is absent.

## Whole-game review and implementation

The established game already has merchant upgrades, spell mastery, gear protection, named loadouts, save recovery, elite contracts, the Reliquary chapter, and Trophy Echo. The largest opportunity is variation within a descent and durable goals across descents.

1. Warden Oaths: optional goals chosen in Town, tracked during normal runs, with stated completion rewards secured through the existing extraction reward pipeline.
2. Guild Renown: persistent ranks, oath unlocks, keepsakes, titles, and Journal records earned from successful oaths.
3. Lantern Rites: earned, persisted three-way boon drafts and useful run-only effects; compatible with established dungeon events and reset at run end.
4. Usability: gear status filters, explicit spellbook access, section controls, readable display preferences, accessible touch/focus treatment and cohesive brass/ember styling.

Expected files: new systems 48–50 and focused smoke tests; explicit integration in core state defaults, combat/run runtime, save normalization, Town/Run/Gear/Journal renderers, bindings; visual-weight CSS; script/cache manifests; release/version records; compact verification list.

## Protected contracts and validation

Existing saves retain the same storage key and existing fields. New state is additive and normalized. Merchant prices/cap/stat contract, baseline monster/boss curves, base rewards/drop RNG, Talent compatibility, Debt, existing Elite Contracts and Trophy Echo stay intact. Combat adds only the explicitly advertised temporary Lantern effects. Oath bonuses use the existing pending/banking path. No external dependencies, alternate entry route, new Revisit lane, upload, tag, or push.

Required verification: focused lifecycle and malformed-save tests for every new system; public browser play through selection, combat, drafts, extraction, save/reload; old-save recovery; JavaScript syntax; full compact suite including protected systems, mobile geometry, accessibility, contrast, runtime errors, version/cache manifest. Source package audit without building an upload bundle. Physical device testing is unavailable in this session and will not be claimed.

## Verification results

Focused smoke coverage passes for Guild Oaths, Lantern Rites, and Guildbound QoL. The repository syntax gate passes, the interface/accessibility gate passes 25/25, the app-wiring/cache authority check passes, and the full compact suite passes 76/76, including browser-computed contrast, public runtime console coverage, Enter Dungeon runtime, touch geometry, protected-system regressions, and the new milestone checks. No package build, upload, tag, or push was performed.
