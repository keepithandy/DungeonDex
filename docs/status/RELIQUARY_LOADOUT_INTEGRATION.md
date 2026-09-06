# Reliquary / Loadout integration checkpoint

## Scope and baseline

Primary category: Content Expansion, with regression protection and two narrowly required presentation/compatibility fixes. Active checkout: `C:\Users\quali\Desktop\source\DungeonDex`; branch `work/reliquary-loadout-integration`. Version remains v1.28.2 Loadout Polish / `1.28.2-loadout-polish`.

Fetched baseline `7929698e22ccfbc92cdbf41830296e0d2b7bc5b3`; audit ref `3e5ab1fa7a5c1f9f17c73f65501f9d1bd42d3c8f`; content ref `73845851468b2ef7a661f8cb8e931a4cd459c825`; ancestor `e52b68aa30f589d92682885c85e574f75a8a73da`. Intentional 3/2 main/content divergence verified. Audit/document reconciliation was committed separately as `0fbf46a`.

## Changes and owners

- Systems 00/04: D31-D40 district, two named identity/lore entries, arrival and subtitle copy.
- System 06: deterministic identity overlay on existing family/type rolls; contract overrides retain final ownership.
- System 08: retain an exact known Reliquary name/family/type on active-run reload. Historical generic encounters are not remapped; no migration or saved field added.
- Systems 11/29 and styles.css: bounded Reliquary visual routing and theme. Existing broader district fallback and outside-band lore rendering retained. Boss text acknowledges that the band has no boss slot.
- styles.css: restrict the existing narrow-screen hidden last-pill rule to the player row so enemy Guard remains readable at 360px.
- Slice smoke: pinned-main numeric/RNG/save and outside-band visual comparisons; exact contract override controls.
- Public runtime smoke and new `reliquary_browser_checks.mjs`: isolated real-browser entry, combat through D31-D40, pending loot, extraction, persistence and continued loadout interactions.
- Compact runner: both branch tests registered alongside all mainline loadout checks. Boss matrix changes only its adjacent-normal identity signature after numeric equivalence verification.
- Current notes, Today roadmap, v1.28 roadmap, README and this report: distinguish integrated source from main and release status. Rarity audit owner wording corrected to `winEncounter`.

Protected: combat/scaling/reward math, RNG consumption, D30/D41 boundaries, named bosses/raw cadence, contracts and one-time claims, upgrades and item IDs, duplicate loadouts, pending rewards/history, save schema, script order/precache/system 46, prices, entry, Talent and Trophy Echo-only Revisit. No version/cache change.

## Verification

- Focused named loadouts: PASS.
- Reliquary slice: PASS; 1,900 seeded full-mechanics and normalization comparisons against pinned main, three exact contract-target controls, district boundaries and outside-band canvas comparisons.
- Rarity audit: PASS; 33 diagnostic rows and 30,000 conditional collection trials. Uses actual drop/set helpers; off-cadence boss rows are hypothetical. No balance conclusions inferred from the collection model.
- App wiring/cache: PASS; 35 direct scripts, nine dynamic dependencies, v1.28.2 labels preserved.
- Full compact suite: **57/57 PASS, no skips**. Includes repository JavaScript syntax, 36,000 real boss fights, named loadouts, contracts, upgrades, Debt/Talent, Journal, Trophy Echo, dungeon entry, mobile/accessibility/contrast, and temporary extracted-package validation.
- Public browser: **36/36 PASS**. Enter-to-create, duplicate/reorder/focus, active save/reload, D30 entry through D40 combat/loot, extract/bank, reload, and Apply Safe Items into an empty slot while preserving equipped IDs and upgrades.
- Additional monster backdrop gate: **10/10 PASS**. Revisit Lowfire source-render browser gate: PASS after elevated rerun (sandbox first closed CDP connection).
- Package checker mode regression: **8/8 PASS**. Source package audit: **52 paths, zero warnings, PASS**. Sandbox could not locate Python; elevated execution succeeded.
- `git diff --check`: PASS (line-ending notices only).

Browser fixture uses runtime-generated level-150 mythic equipment and deterministic randomness to test the complete loop, not normal-player difficulty or balance. Test profiles are isolated from real player saves. Touch 390x844, 430x932, 768x1024 and fine-pointer 360x844 verified for geometry, accessible 44px controls, reduced motion, stat cues and overflow. Captures inspected at `C:\Users\quali\Documents\ChatGPT\DungeonDex\verification-captures\reliquary-*.png`.

Initial browser checks found and corrected lost names after normalization and the pre-existing hidden enemy Guard pill. Initial compact run was 56/57 because the expected adjacent-normal identity hash still described main; numerical controls passed before adopting the content branch hash. The rerun passed all 57.

## Remaining gates and delivery state

The optional historical `smoke_gear_identity_compare_v1238.mjs` fails before its assertions: its document mock lacks `addEventListener`; adding that temporarily exposed another missing helper, `el`. The exploratory mock edit was removed. This stale standalone harness is not counted as passing; current loaded Gear/loadout interactions are independently covered by the compact and public browser checks. Systems 39/40 used by the historical harness are not newly activated.

Automated integration checkpoint is complete. Physical-device/Textastic evidence remains missing under [#139: v1.28.2 release gate: complete physical-device loadout validation](https://github.com/keepithandy/DungeonDex/issues/139), so the release gate is incomplete. Emulation does not replace device/OS/browser/viewport/screenshots/results. No historical device exception applies.

No push, PR, merge, retained release package, version update, tag or itch upload performed. Temporary package fixtures were used only by verification. Next narrow milestone: a bounded identity-only Reliquary roster; then concrete boss/contract options resolving the absent boss slot before implementation.

## Diff-review handoff

Review the integration branch against `7929698`. Confirm system 46/save hooks/wiring remain intact, D31-D40 identity and visual changes stay bounded, known names persist without remapping older encounters, and numerical/RNG/contract controls are meaningful. Check the complete browser loop and mobile captures. Treat the audit as conditional evidence, record the legacy standalone harness failure, and keep physical-device issue #139 open. Do not infer merge or release authorization.
