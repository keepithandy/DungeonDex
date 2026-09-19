# DungeonDex v1.34 Cinderbone Halls Roadmap

## Status

- Planning identity: `v1.34 Cinderbone Halls`.
- Current source authority remains `v1.33.2 Crimson Oath` until a final release-authority phase is explicitly approved.
- Working repository: `C:\Users\quali\Desktop\source\DungeonDex`.
- This roadmap does not authorize a version bump, package build, push, tag, upload, or publication.
- Run one phase at a time. Begin each phase from a clean, current branch and preserve pending user work.

## Protected Product Contract

- Preserve `Town -> Dungeon -> Loot -> Return -> Gear -> Journal -> Repeat`.
- Preserve save compatibility and repair malformed additive state safely.
- Preserve combat formulas, monster and boss scaling, rewards, drop rates, economy, upgrade values, and dungeon-entry behavior unless a phase explicitly proves and authorizes a narrow change.
- Trophy Echo remains the only active Revisit lane.
- Do not add a currency, daily timer, alternate dungeon-entry route, second Talent spend target, monster-affix framework, or external dependency.
- Navigation may expose existing surfaces but must not recommend what the player should buy, upgrade, or pursue.
- Reuse established district, encounter, event, gear, contract, Journal, Archive, and save-normalization contracts.

## Phase Tracker

- [x] Phase 1 — Baseline and contract audit
- [x] Phase 2 — Cinderbone chapter foundation
- [ ] Phase 3 — Cinderbone encounter roster
- [ ] Phase 4 — Cinderbone incidents
- [ ] Phase 5 — D45 boss and Elite Contract integration
- [ ] Phase 6 — Cinderbone gear identity
- [ ] Phase 7 — Chapter Chronicle and Debt Collector clarity
- [ ] Phase 8 — Large UI and accessibility polish
- [ ] Phase 9 — Verification and release preparation

## Phase 1 Handoff — Baseline and Contract Audit

### Baseline

- Status: complete; documentation and contract audit only.
- Branch: `main`.
- Audited source commit: `e952c67` (`docs: add Cinderbone Halls phase roadmap`).
- Source authority: `v1.33.2 Crimson Oath`, build `1.33.2-crimson-oath`.
- Origin state at audit start: local `main` and `origin/main` both at `e952c67`, with `0` ahead and `0` behind.
- Phase 1 completion commit: the commit containing this handoff.
- Files changed: this roadmap only. No runtime, style, save, test, version, cache, route, package, or release file changed.

### Current D31-D50 Contract

| Range | Current behavior | Contract for later phases |
| --- | --- | --- |
| D31-D40 | `drowned-reliquary` is a complete authored district with five deterministic encounter identities, three incidents, a D40 finale, themed gear presentation, Journal evidence, and dedicated source/browser coverage. | Preserve it as the reference implementation and unchanged control. Do not route Cinderbone through Reliquary-specific helpers. |
| D41-D44 | `DISTRICT_DATA` already selects `cinderbone`, with chapter name, line, tone, mood, arrival copy, subtitle, flavor, and boss-approach identity available. Encounters, gear, and events still fall back to generic pipelines. | Complete presentation through the existing registry and render pipeline without changing mechanics or RNG consumption. |
| D45 | The existing boss slot and `gravetoll_bell` trophy definition identify D45 as the Gravetoll Bell. Run UI and approach copy also special-case that identity. Generic boss-floor naming converts raw depth to threat depth and can currently expose `Ashgate Butcher Step`; the `Cinderbone Maw` name at threat depth 45 is not raw D45. | Treat this as an identity seam. Phase 5 must reconcile presentation around the existing D45 boss, not create or rebalance a boss or move its trophy. |
| D46-D50 | The Cinderbone district registry remains active, but encounters, events, and gear presentation remain generic. | Add bounded chapter content while preserving the D51 Blacktithe boundary. |

### Runtime Ownership Map

| Concern | Current owner and reusable contracts | Later phase |
| --- | --- | --- |
| District registry and authored data | `js/systems/00_core_constants_data.js`: `DISTRICT_DATA`, `DISTRICT_ENCOUNTER_IDENTITIES`, `DISTRICT_RUN_EVENT_REGISTRY`, `BOSS_TROPHY_DEFINITIONS`, `BOSS_FLOOR_NAMES`. | 2-6 |
| District selection and chapter copy | `js/systems/04_depth_progression_charters.js`: `districtByDepth`, `dungeonDistrictIdentityForDepth`, `districtArrivalLine`, `districtToneClass`, `currentDistrictDisplay`, `dungeonDistrictSummary`, `districtArrivalMarkup`, `extractionSummaryLine`, `dungeonBossApproachLineForDepth`, `bossFloorNameByDepth`. | 2, 5 |
| Encounter generation | `js/systems/06_scaling_generation_audits.js`: `districtMonsterIdentity` and `generateMonster`. Identity selection is deterministic and currently adds no random calls. | 3 |
| Gear generation | `js/systems/06_scaling_generation_audits.js`: `generateGear`. The D31-D40 branch changes maker, theme, tags, name, and summary while retaining mechanics. | 6 |
| Incidents and pending haul | `js/systems/07_player_combat_runtime.js`: `createRunEvent`, Reliquary event registry/trigger/finale/resolution helpers, and existing gear, Ember, salvage, heal, leave, and pending-reward effects. | 4 |
| Save normalization | `js/systems/08_normalization_save.js`: active-run repair, `normalizeMonster`, pending-reward normalization, bounded histories, and old-save fallback. | 2-7 |
| Run, gear, Dex, and Archive UI | `js/systems/11_ui_run_gear_dex_archive.js`: `renderRun`, generic event-card rendering, active-run labels, boss status, gear detail, Archive, and route rendering. | 2-8 |
| Boss backdrop presentation | `js/systems/29_monster_backdrops_canvas.js`: existing district-specific visual routing without combat authority. | 3, 5, 8 |
| Elite Contracts | `js/systems/03_town_contracts_market.js`: one-active lifecycle, exact target, risk/objective helpers, target briefing/location, claim/failure/expiry, and Journal history. | 5 |
| Guild Journal | `js/systems/38_journal_v1.js`: `reliquaryJournalModel`, evidence derivation from trophies/contracts/gear/monster discovery/run history, progressive disclosure, and disclosure-state retention. | 7 |
| Debt Collector | `js/systems/28_debt_collector_foundation.js`, `js/systems/34_debt_collector_v1_completion.js`, and `js/systems/41_debt_pressure_v1.js`: display summary, pressure/status/terms/recovery models, borrow/repay contracts, and locked display-only pressure card. | 7-8 |
| Visual and responsive layer | `styles.css`, `styles_lore_layer.css`, `styles_visual_weight.css`, plus the required script order in `index.html`. | 2, 8 |

### Protected Systems and Stable Signatures

- Preserve combat formulas, late-floor pressure, Common/Elite/Boss scaling, boss cadence, rewards, drop rates, rarity, economy, Merchant Gear Upgrade values and caps, dungeon entry, extraction, and fall behavior.
- Preserve gear slots, stat budgets, values, IDs, equip/sell/salvage/lock/junk rules, named loadouts, and random-call count.
- Preserve one active Elite Contract, exact-target completion, established risk and payout, one-time claim, failure/expiry, and Journal history.
- Preserve Talent points and passives, Debt formulas and wallet mutation, Trophy Echo as the only active Revisit lane, route IDs, required script order, cache authority, and public-runtime cleanliness.
- Use D30/D31, D40/D41, D45, D50/D51 as boundary controls. D31-D40 must remain an unchanged authored control; D51 must remain Blacktithe.
- For seeded encounter comparisons, lock family, type, tier, Elite fields, numeric combat/reward fields, normalization output, contract-target behavior, and total random calls. Presentation fields may change only inside the phase's authorized Cinderbone range.
- For seeded gear comparisons, lock slot, rarity, numeric stats, value, ID behavior, source behavior, and total random calls across `normal`, `elite`, `boss`, and `event`; only approved maker/theme/tag/name/summary fields may differ at D41-D50.
- Keep `tests/smoke/smoke_boss_scaling_matrix_v1.mjs` signatures green. Use `e952c67` as the pinned pre-Cinderbone control for any new before/after signature harness; do not silently use moving `HEAD` as the baseline.

### Save and History Boundaries

- Prefer derived district state from raw run floor and the existing registry in Phase 2; no new persisted chapter field is currently needed.
- `normalizeMonster` currently restores authored names only for D31-D40 and searches only the Reliquary roster. Phase 3 must generalize that lookup by district before Cinderbone names can survive active-run reload safely.
- `state.run.event` currently survives through the merged run object but has no dedicated bounded sanitizer. Phase 4 must add explicit validation/repair for any new Cinderbone event shape and retain token-based duplicate safety.
- Active pending rewards are normalized; an incomplete or invalid active run returns safely to Town. Preserve both behaviors.
- `state.player.runHistory` is bounded to 12 entries, `revisitState.notedDistricts` to 12, and `state.archive` to 40. Do not introduce unbounded chapter history.
- Phase 7 should derive Chronicle evidence from existing run, trophy, contract, identified gear, monster-discovery, extraction, and retained-history records. Any unavoidable additive state must have a default, type/range normalization, malformed-state repair, an explicit bound, and old-save coverage.

### Known Seams and Risks

- `renderRun` currently corrects raw-depth district identity only for D31-D40; D41-D50 can fall back to lore-floor district selection. Phase 2 must generalize this without changing floor math.
- D45 has split naming authority across trophy data, run UI, approach copy, and threat-depth boss-floor names. Phase 5 owns presentation reconciliation.
- Reliquary event helpers and Journal model are chapter-specific. Extend or generalize the established contracts; do not copy a second event or Journal framework.
- The current event object relies partly on raw save passthrough. A Cinderbone implementation must not widen that trust boundary.
- Cinderbone has registry copy but no authored encounter roster or event registry. Missing data must continue to fall back safely to generic content.
- Visual work must keep non-color identity cues, contrast, keyboard operation, reduced motion, 44px touch geometry, no horizontal overflow, and existing Town/Gear disclosure state.

### Required Verification by Phase

| Phase | Focused checks to add or run |
| --- | --- |
| 2 | New Cinderbone foundation source smoke and browser check for D40/D41 and D50/D51 boundaries, arrival/transition copy, active-run label, save/reload, missing-data fallback, and mobile chapter cue; `smoke_enter_dungeon_runtime_v1.mjs`; `smoke_app_wiring_cache_manifest_v1.mjs`; Reliquary vertical/content controls. |
| 3 | New seeded Cinderbone encounter smoke comparing mechanics and RNG with pinned `e952c67`; all four identities at Common/Elite presentation; active-monster save/reload; hostile/missing roster fallback; D30/D31, D40/D41, D45, D50/D51 controls; boss scaling matrix; public runtime console. |
| 4 | New incident smoke covering every choice, eligibility, pending haul, reload before and after choice, stale and duplicate tokens, malformed event repair, old saves, extraction/fall/exit, and non-Cinderbone controls; browser/mobile event cards; existing Reliquary events smoke. |
| 5 | D45 approach/arrival/aftermath, trophy identity, save/reload, malformed trophy state, scaling/reward signatures, target indicator, each Cinderbone briefing, exact-target claim, duplicate claim, failure/expiry, and Journal history; boss trophy/scaling and Elite Contract lifecycle smokes. |
| 6 | Seeded gear mechanics and RNG comparison to `e952c67` for every slot and `normal`/`elite`/`boss`/`event`; D40/D41 and D50/D51 controls; old/malformed save; inventory, compare, modal, loadout, return record, Journal; gear identity, named loadout, Merchant upgrade, and rarity progression smokes. |
| 7 | Chronicle empty/partial/complete/locked/history-only states; old/malformed save and reload; bounded history; Journal/Archive/Town rendering; Debt status/balance/pressure/terms/repayment/collection/recovery display with unchanged numeric results; Journal, Debt, Debt/Talent compatibility, Archive, and Trophy Echo isolation smokes. |
| 8 | Source and browser checks for visible non-color cues, focus/keyboard behavior, screen-reader labels/status, reduced motion, contrast, wrapping, no horizontal overflow, and 44px controls at 390x844, 430x932, 768x1024 touch, and 360x844 fine-pointer; mobile layout, accessibility, computed contrast, side-nav, and route-scroll smokes. |
| 9 | Syntax helper; every focused Cinderbone smoke; Reliquary controls; boss, contract, gear, loadout, Journal, Archive, Revisit, Debt, entry, runtime, accessibility, contrast, mobile, app-wiring/cache, boot recovery; `node smoke_compact_suite.mjs` without the retained package gate unless package authorization is separately granted. |

### Phase 2 Handoff

Use the Phase 2 prompt below unchanged. Start from this completed handoff, keep `VERSION.md` at `v1.33.2`, and implement only the chapter foundation. The first required fixes are raw-depth Cinderbone selection in active-run presentation, chapter arrival/transition copy through the registry, visual tokens, reload retention, D40/D41 and D50/D51 controls, and safe fallback. Do not add encounters, incidents, gear identity, boss/contract behavior, Chronicle state, or Debt changes early.

## Phase 1 Prompt — Baseline and Contract Audit

```text
Implement Phase 1 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read AGENTS.md, VERSION.md, docs/status/CURRENT_NOTES.md, and docs/status/ROADMAP_V134_CINDERBONE_HALLS.md before acting. Verify the current branch, HEAD, working tree, and origin state. Audit the current district registry, D41-D50 behavior, encounter generation, event handling, gear generation, D45 boss presentation, Elite Contracts, Journal, Archive, Debt Collector, save normalization, mobile UI, and existing smoke coverage.

Record the protected systems, current D31-D50 behavior, likely files for later phases, available runtime helpers, save-state boundaries, seeded signatures that must remain stable, and exact focused tests required for each later phase. Do not implement gameplay or UI changes in this phase. Do not change VERSION.md. Add or update planning documentation only, run documentation checks where relevant, update the Phase 1 checklist and handoff evidence, and commit the completed Phase 1 work with a focused commit.
```

## Phase 2 Prompt — Cinderbone Chapter Foundation

```text
Implement Phase 2 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and the Phase 1 handoff. Turn the existing D41-D50 Cinderbone Halls definition into a complete playable chapter foundation with arrival copy, transition copy, district visual tokens, active-run chapter labeling, save/reload retention, and safe missing-data fallback. Reuse the existing district registry and render pipeline. Preserve D40 and D51 boundaries, current boss cadence, combat, scaling, rewards, RNG consumption, saves, dungeon entry, Talent, Debt, contracts, gear mechanics, and Trophy Echo-only Revisit behavior.

Add focused source and browser smoke coverage for district selection, chapter arrival, active-run identity, save/reload, boundaries, and fallback behavior. Update the roadmap checklist and handoff evidence, report behavior changed and intentionally unchanged, and commit the completed Phase 2 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 2 Handoff — Cinderbone Chapter Foundation

### Completion

- Status: complete; chapter foundation only.
- Branch: `main`.
- Completion commit: the commit containing this handoff.
- Baseline preserved: `v1.33.2 Crimson Oath`, build `1.33.2-crimson-oath`.
- Version, package, cache, tag, push, upload, and publication work were not performed.

### Files changed

- `js/systems/11_ui_run_gear_dex_archive.js`
  - Active-run district presentation now derives from `currentStagingDistrict(S)` for every raw depth, not only D31-D40.
  - Run status exposes a stable `data-district-key` and authored district flavor copy.
- `js/systems/08_normalization_save.js`
  - Active saved runs now repair `run.zone` from authoritative raw floor depth, preventing stale chapter labels after reload.
- `styles.css`
  - Added Cinderbone run-header border/background treatment and a readable authored flavor cue while retaining the existing tone variables and combat backdrop.
- `tests/smoke/smoke_drowned_reliquary_vertical_slice_v1281.mjs`
  - Added Cinderbone registry, D41/D50/D51 boundary, identity, arrival, tone, and source-contract assertions.
- `tests/smoke/reliquary_browser_checks.mjs`
  - Added active-save zone repair and D41 Cinderbone render/reload assertions.
- `docs/status/ROADMAP_V134_CINDERBONE_HALLS.md`
  - Marked Phase 2 complete and recorded this handoff.

### Player-visible behavior changed

- Active runs at D41-D50 now consistently show Cinderbone Halls in the run header, event shell, combat tone, and district data attributes.
- The run header includes the authored Cinderbone flavor: “Cinderbone keeps old victories warm in the ash.”
- Reloading an active Cinderbone run repairs a stale saved zone label back to `Cinderbone Halls`.
- Cinderbone run headers receive furnace/bone visual framing with a non-color text cue.

### Behavior intentionally unchanged

- No new encounter identities, incidents, gear identity, boss behavior, Elite Contract behavior, Chronicle state, Debt behavior, currencies, progression, Revisit lane, or dungeon-entry route.
- Combat formulas, scaling, rewards, drop rates, rarity, economy, equipment mechanics, save histories, RNG consumption, D40/D45 cadence, and D51 boundary remain unchanged.
- D45’s existing Gravetoll Bell presentation seam remains assigned to Phase 5.

### Save compatibility impact

- Additive schema: none.
- Existing active saves remain loadable. Their active `run.zone` is repaired from the already-persisted raw floor; inactive historical zone text is preserved.
- Missing or invalid district identity continues to fall back through the existing Lowfire-safe registry path.

### Checks run

- `node --check` passed for the changed runtime and smoke files.
- Cinderbone/Reliquary vertical slice passed with 1,900 seeded comparisons, including numeric values, Elite modifiers, RNG consumption, bosses, and outside-band visuals.
- Filtered compact smoke suite passed: 45/45, including repository syntax, Reliquary controls, app wiring/cache, mobile geometry, accessibility, contrast, and Enter Dungeon runtime.
- Browser smoke was attempted through `smoke_public_runtime_console_v1265.mjs` but could not start because the local Chromium `/json/version` endpoint timed out. No browser assertions ran.

### Remaining risks

- Cinderbone still uses generic encounter, event, and gear presentation until Phases 3, 4, and 6.
- D45 naming remains split between existing boss/trophy/run authorities until Phase 5.
- The browser-specific D41 reload assertion is present but awaits a successful local Chromium session.

### Exact next phase

Proceed with the Phase 3 prompt below. Add four bounded Cinderbone encounter identities, generalize active-monster normalization by district, and add seeded mechanics/RNG, save/reload, fallback, browser, mobile-readability, and D30/D31-D50/D51 control coverage. Keep all combat, scaling, rewards, drop logic, and encounter RNG behavior unchanged.

## Phase 3 Prompt — Cinderbone Encounter Roster

```text
Implement Phase 3 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-2 handoffs. Add four bounded Cinderbone encounter identities using established monster families, types, tiers, combat roles, scaling, rewards, drop logic, and RNG behavior. Provide readable Common and Elite presentation where supported, deterministic seeded coverage, save/reload retention for active encounters, and safe missing or hostile data fallback.

Do not add numeric role definitions, a new affix framework, persistent combat statuses, reward routes, balance changes, or a second encounter-generation framework. Verify that existing district, D45 boss, combat, reward, and generation signatures remain stable. Add focused source, seeded, browser, mobile-readability, and fallback smoke coverage. Update the roadmap checklist and handoff evidence, and commit the completed Phase 3 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 4 Prompt — Cinderbone Incidents

```text
Implement Phase 4 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-3 handoffs. Add three authored Cinderbone incidents using the established event-choice, damage, gear-cache, salvage, coin, leave, and unsecured pending-haul contracts. Give each incident clear dark-fantasy copy, three readable choices, deterministic eligibility, safe resolution, mobile-friendly cards, and accessible labels.

Protect pending-event save/reload, stale-token handling, duplicate resolution, malformed-state repair, chapter exit, extraction, and fall behavior. Do not add a currency, permanent progression, alternate reward route, second event framework, boss slot, Revisit lane, or unbounded save history. Add focused source and browser coverage for every choice, reload before choice, reload after choice, duplicate safety, malformed state, old saves, and non-Cinderbone controls. Update the roadmap checklist and handoff evidence, and commit the completed Phase 4 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 5 Prompt — D45 Boss and Elite Contract Integration

```text
Implement Phase 5 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-4 handoffs. Connect Cinderbone Halls to the existing D45 boss and Elite Contract systems. Add chapter-aware approach, arrival, and aftermath presentation for the existing D45 boss without changing its identity, slot, cadence, scaling, combat behavior, rewards, trophy, or save contract. Add three Cinderbone-specific Elite Contract briefings using the existing one-active, exact-target, established-risk, established-payout, one-time-claim, failure, expiry, and Journal-history lifecycle.

Do not create a boss, contract type, payout path, farming loop, alternate claim path, or dungeon-entry route. Add focused boss, trophy, contract, target-indicator, claim, save/reload, malformed-state, Journal-history, and protected-system coverage. Update the roadmap checklist and handoff evidence, and commit the completed Phase 5 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 6 Prompt — Cinderbone Gear Identity

```text
Implement Phase 6 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-5 handoffs. Add Cinderbone maker, theme, tag, name, summary, and presentation identity to gear generated at D41-D50 from normal, Elite, Boss, and Event sources. Extend the established themed-gear pipeline and surface the identity in inventory cards, comparison text, the gear detail modal, loadout previews, return records, and read-only Journal presentation.

Preserve all equipment slots, rarity chances, stat budgets, values, item IDs, RNG consumption, equip rules, selling, salvage, locks, junk flags, loadouts, Merchant Gear Upgrade values and caps, save schema, and outside-band gear signatures. Add seeded mechanics controls, source/slot coverage, old-save and malformed-save fixtures, browser save/reload coverage, Gear-screen checks, loadout checks, and protected-system signatures. Update the roadmap checklist and handoff evidence, and commit the completed Phase 6 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 7 Prompt — Chapter Chronicle and Debt Collector Clarity

```text
Implement Phase 7 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-6 handoffs. Add read-only Cinderbone Chronicle acknowledgement to the Guild Journal, Archive, and appropriate Town record surfaces. Derive first arrival, Elite, incident, identified gear, secured depth, extraction, and D45 evidence from existing run, trophy, contract, gear, and retained-history records wherever possible. Add only bounded, additive, normalized state when an important record cannot be derived safely.

In the same ledger-focused phase, implement display-only Debt Collector clarity for current status, balance, pressure, terms, repayment availability, collection state, and recovery guidance. Do not change debt formulas, interest, borrowing eligibility, wallet mutation, repayment results, collection penalties, rewards, combat, gear, Talent points, progression, or Revisit behavior. Trophy Echo must remain the only active Revisit lane.

Add empty, partial, complete, locked, history-only, old-save, malformed-state, save/reload, Debt, Journal, Archive, Town, and Trophy Echo isolation coverage. Update the roadmap checklist and handoff evidence, and commit the completed Phase 7 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 8 Prompt — Large UI and Accessibility Polish

```text
Implement Phase 8 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and completed Phase 1-7 handoffs. Apply a cohesive Cinderbone ash, furnace, bone, and ember visual language across chapter arrival, active-run headers, encounter identity cues, incident cards, contract cards, gear cards, the gear detail modal, Journal, Archive, Chronicle, and Debt Collector surfaces. Improve hierarchy, wrapping, spacing, focus visibility, keyboard operation, screen-reader labels, status announcements, reduced-motion behavior, non-color cues, contrast, and 44px touch geometry.

Verify 390x844, 430x932, and 768x1024 touch profiles plus narrow fine-pointer behavior. Preserve existing Town and Gear disclosure state, route IDs, side-rail behavior, player discovery, actions, costs, locks, risks, combat, rewards, economy, saves, and progression. Navigation may expose existing surfaces but must not recommend what to buy, upgrade, equip, or pursue. Add focused interface, accessibility, contrast, mobile-layout, touch-geometry, keyboard, and browser screenshot verification. Update the roadmap checklist and handoff evidence, and commit the completed Phase 8 work with a focused commit. Do not change VERSION.md, build a package, push, tag, upload, or publish.
```

## Phase 9 Prompt — Verification and Release Preparation

```text
Implement Phase 9 of the v1.34 Cinderbone Halls roadmap in the permanent DungeonDex repository at C:\Users\quali\Desktop\source\DungeonDex.

Read the repository operating contract and all completed phase handoffs. Freeze feature scope. Reconcile every Cinderbone phase against the roadmap and fix only verified regressions, accessibility defects, documentation mismatches, stale labels, and release blockers. Run repository-wide syntax checks, all focused Cinderbone checks, event save/reload checks, boss and Elite Contract checks, gear and loadout checks, Journal/Archive/Revisit checks, Debt checks, Enter Dungeon runtime checks, public-runtime checks, accessibility, contrast, mobile layout, touch geometry, app-wiring/cache authority, package hygiene, and the full compact suite.

Update README.md, CHANGELOG.md, docs/status/CURRENT_NOTES.md, and this roadmap with final behavior, intentionally unchanged systems, verification evidence, known risks, and release readiness. Keep VERSION.md at v1.33.2 unless the user separately and explicitly authorizes v1.34 version/cache alignment. Do not build a retained package, push, tag, upload, or publish without separate explicit authorization. Commit the completed Phase 9 verification and documentation work with a focused commit.
```

## Per-Phase Handoff Record

After each phase, append or update a concise handoff containing:

- Branch and commit.
- Phase status.
- Files changed.
- Player-visible behavior changed.
- Behavior intentionally unchanged.
- Save compatibility impact.
- Checks run and results.
- Remaining risks.
- Exact next phase prompt.

## Final Release Gate

The roadmap is source-complete only when all nine phase checkboxes are complete and the final verification is clean. Version alignment, package creation, push, tag, itch.io upload, and publication remain separate owner-authorized actions.
