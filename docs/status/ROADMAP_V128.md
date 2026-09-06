# DungeonDex v1.28 Roadmap

## Active integration queue (2026-09-05)

Source baseline: `7929698e22ccfbc92cdbf41830296e0d2b7bc5b3`, v1.28.2 Loadout Polish, build `1.28.2-loadout-polish`. The selected integration was fast-forward merged into local `main` at `60117cc`; it remains three commits ahead of `origin/main` until pushed. All three remote refs were fetched and verified; the common ancestor is `e52b68aa30f589d92682885c85e574f75a8a73da` and main/content divergence was intentionally 3/2 commits.

Credit: main supplied Named Loadouts (48d7a4b and 743b0c5); `work/v1.28.0-rarity-audit` supplied audit evidence (3e5ab1f); `work/v1.28.1-drowned-reliquary` supplied the first-descent slice (7384585). The selected audit and content were ported selectively into local `main`; version/cache changes from those branches were excluded.

| State | Current classification |
|---|---|
| Playable now | Existing core loop, three Elite Contracts, Merchant Gear Upgrades, Lowfire Forge, Debt, polished Named Loadouts, Trophy Echo; D31-D40 Reliquary first descent and four-identity roster on local main |
| Implemented but inactive | Famous Gear Memory, Rival Trace, Board Echo and Debt Pressure Revisit compatibility/helpers; no activation authorized |
| Read-only foundation | Guild Journal/history projections; rarity audit evidence (collection is a conditional model, not live-run yield) |
| Planned only | Boss/contract decision, reward-curve decision, themed gear, loot/return clarity, Town/mobile polish, world response, release candidate, v1.29 handoff |
| Broken or incomplete | Physical-device evidence is outstanding; legacy standalone gear comparison harness has missing DOM mocks (see integration report); local main has not been pushed |

Work order uses **named milestones** until a version update is explicitly authorized: audit reconciliation -> first-descent integration and regression protection -> Reliquary encounters -> boss/contract integration -> reward-curve decision -> themed gear -> loot/return clarity -> Town/mobile polish -> Journal/world response -> release candidate -> v1.29 itch handoff. Named loadouts are complete and must not be rebuilt. Safe application only fills available empty slots.

The [four-identity roster milestone](RELIQUARY_ROSTER_MILESTONE.md) is now source-complete and passed a fresh 57/57 compact run. [Climax options](RELIQUARY_CLIMAX_DECISION.md) are prepared; owner selection is required before boss/contract implementation.

D31-D40 contains no boss slot. Resolve a coherent climax without moving existing bosses or changing cadence/entry before implementing the boss milestone. No balance selection, pity fields, save migration, package, tag, push, or upload is implied by the roadmap.

GitHub snapshot: [#139 — v1.28.2 release gate: complete physical-device loadout validation](https://github.com/keepithandy/DungeonDex/issues/139) is the sole open issue; no open PRs. Historical #139-#145 labels below and in ROADMAP_V127 are planning numbers, not current issue identities. ROADMAP_V1265 and ROADMAP_V127 are completed history. Older Talent/Revisit queues do not authorize activation.

The branch's 49/55 compact passes, one skip and five environment failures are historical incomplete validation. Fresh integration verification passed 57/57 compact checks and 36/36 public-browser assertions, including the complete Reliquary combat/loot/return/loadout loop. See [integration evidence](RELIQUARY_LOADOUT_INTEGRATION.md). Real-device evidence still needs device, OS, browser, viewport, screenshots and results; the v1.27 exception does not carry forward.

## Historical proposal (numbering retained, superseded by named queue above)

v1.28.1 and v1.28.2 were subsequently used on main for loadouts. All version alignment and activation language below is historical proposal, not current authorization. Encounter expansion excludes affixes and new numeric roles.

## North Star

Make v1.28 feel large because its pieces reinforce one another: a new dungeon identity, stronger encounter and gear texture, a measured reward curve, faster loot decisions, a cleaner mobile loop, and a Journal that reacts to what the player actually did.

The release should add depth without adding a second game. Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal -> Repeat remains the spine.

## Release Shape

| Version | Focus | Player payoff | Exit gate |
|---|---|---|---|
| v1.28.0 | Rarity Baseline | Trustworthy foundation; no silent tuning | Runtime-backed audit, version/cache alignment, protected regressions |
| v1.28.1 | Drowned Reliquary vertical slice | A distinct place appears in the existing descent | One end-to-end band slice; no cadence or save break |
| v1.28.2 | Reliquary encounter expansion | More recognizable enemies and room texture | Content matrix and generation/fallback coverage |
| v1.28.3 | Reliquary boss and contracts | A memorable climax with an existing-system reason to return | Boss readiness matrix plus contract lifecycle coverage |
| v1.28.4 | Reward-curve resolution | Elites and Mythic progression feel intentional | Before/after simulation; one approved tuning policy; no loot flood |
| v1.28.5 | Themed gear and named loadouts | Finds support identity and easier preparation | Save-compatible equipment/loadout tests; no new slot type |
| v1.28.6 | Loot compare and return summary | Faster keep/equip/retire decisions | Keyboard/touch/accessibility coverage; no action-semantic drift |
| v1.28.7 | Town and mobile declutter | Less scrolling and clearer next action | Supported viewport geometry and public-control inventory |
| v1.28.8 | Journal and world reaction | The game remembers the Reliquary journey | Read-only/default-safe history coverage; Trophy Echo remains sole Revisit lane |
| v1.28.9 | Release candidate | One coherent, stable v1.28 line | Full clean regression, device handoff, release notes; no new feature scope |
| v1.29 | Package and itch handoff | Public release | Explicit package, tag, and upload authorization plus clean extracted audit |

## Balance Rules for the Whole Line

- One dominant risk per patch. A content patch does not also rewrite the economy; a UI patch does not also alter action semantics.
- Use real runtime helpers in audits. Copied formulas and old ZIPs are supporting evidence, never balance authority.
- Measure total yield: encounter frequency x gear-drop frequency x rarity share. Conditional rarity alone is not enough.
- Preserve boss cadence and existing named boss floors unless a focused patch explicitly proves a migration path.
- Add content through existing monster, gear, contract, Journal, and district structures before proposing a new framework.
- Any additive save field must have a default, normalization, malformed-state repair, reload coverage, and old-save fixture. Avoid a schema change when runtime-derived state is sufficient.
- Never trade mobile readability for feature density. New surfaces must fit the supported 390x844, 430x932, and 768x1024 touch profiles.
- Do not activate another Revisit lane. Trophy Echo remains the only live lane through v1.29 unless the owner separately changes that direction.

## Patch Acceptance Criteria

### v1.28.0 — Rarity Baseline

- Align `VERSION.md`, visible labels, direct asset queries, runtime pointers, service-worker cache, and focused smoke expectations.
- Execute active rarity/drop/scarcity/set formulas across representative early, transition, deep, and extreme-depth checkpoints.
- Record the elite drop crossover, D40 gate/scarcity interaction, and 20-piece duplicate burden.
- Publish this roadmap.
- Change no gameplay formula or save behavior.

### v1.28.1 — Drowned Reliquary Vertical Slice

- Choose the insertion range from the existing district/depth cadence without moving existing boss depths.
- Establish one coherent district identity: title, subtitle, palette/tokens, environmental copy, and safe fallback behavior.
- Add the smallest complete encounter slice that proves Town-to-dungeon-to-loot-to-return continuity.
- Reuse current rendering and generation contracts; do not introduce a second district framework.

### v1.28.2 — Encounter Expansion

- Add a bounded roster of Reliquary enemies using established families/types/affixes.
- Give enemies readable silhouettes in text/stat identity and distinct but existing combat roles.
- Add room/event copy only where it can be tested and does not interrupt combat pacing.
- Verify seeded generation coverage, hostile/missing data fallback, and mobile combat readability.

### v1.28.3 — Boss and Contract Integration

- Add one Reliquary boss identity through the existing boss cadence and scaling path.
- Extend Elite Contracts through the existing one-active, exact-target, one-time-claim lifecycle; add no currency or alternate payout route.
- Keep boss rewards, contract payout bounds, writ handling, and Journal history structurally compatible unless a separately measured value change is approved.
- Require the 20-boss readiness matrix (expanded if a new cadence slot is added) and focused contract save/reload coverage.

### v1.28.4 — Reward-Curve Resolution

- Start from `RARITY_PROGRESSION_AUDIT_V1280.md`, not intuition.
- Compare a no-change control against a smoother elite frequency curve and bounded Mythic duplicate-relief options.
- Select one coherent policy only after total-yield, deep-scarcity, boss, contract, and economy simulations agree.
- Add deterministic regression signatures for every changed value and document the exact before/after player effect.
- If the evidence does not support a safe improvement, ship clarity only and keep the values unchanged.

### v1.28.5 — Themed Gear and Named Loadouts

- Add Reliquary-themed gear identity through existing slots, rarity, maker/theme, and generation structures.
- Keep stat budgets inside current rarity and level curves.
- Design named loadouts as preparation shortcuts, never extra power, inventory duplication, or a new equipment slot.
- Use default-safe persistence only if a loadout cannot be derived; include old-save, malformed-save, duplicate-item, and missing-item behavior.

### v1.28.6 — Loot Compare and Return Summary

- Show the currently equipped comparison and clear stat deltas without hiding rarity, upgrade level, set identity, or sell/retire meaning.
- Summarize a completed return using existing run/reward records; do not grant from the summary surface.
- Preserve equip, sell, retire, extraction, pending reward, and modal action ownership.
- Verify keyboard focus, screen-reader names, reduced motion, touch sizing, and narrow-width wrapping.

### v1.28.7 — Town and Mobile Declutter

- Establish one obvious primary action and a readable hierarchy for preparation, Market, Forge, Contracts, Revisit, and Journal routes.
- Reduce repeated explanatory copy and vertical churn without hiding costs, locks, risks, or active status.
- Preserve the current side-rail and Town shortcut destinations and the canonical wallet owner.
- Pass supported touch geometry, fine-pointer narrow layout, contrast, public-control inventory, and real-device handoff checks.

### v1.28.8 — Journal and World Reaction

- Add read-only Reliquary boss, contract, notable-gear, and milestone presentation using established records wherever possible.
- Let Town/Journal copy acknowledge completed milestones without adding rewards or an active Revisit route.
- Keep locked, active, completed, history-only, and planned language unambiguous.
- Verify empty, partial, complete, malformed, and legacy-save histories.

### v1.28.9 — Release Candidate

- Freeze feature scope; fix only verified regressions, release-label mismatches, accessibility defects, and package blockers.
- Run repository syntax, compact suite, rarity audit, boss matrix, contracts, Merchant Gear Upgrades, Journal/Revisit, mobile/accessibility/contrast, Enter Dungeon, public runtime, and strict source package audit.
- Record browser automation limitations and complete a fresh physical-device/Textastic handoff when practical.
- Align final v1.28.9 authority and release notes. Do not build or upload the v1.29 artifact in this patch.

### v1.29 — Package and Itch Release

- Requires explicit owner authorization for package creation, staging, commit, push, tag, and itch.io upload as separate actions where applicable.
- Derive the artifact name from `VERSION.md`, audit source/staged/extracted trees, launch the clean extracted public build, and record checksum/size.
- Publish only after current device/browser evidence and the final known-risk list are accepted.

## Priority Tiers

### Must

- v1.28.0 baseline, one complete Reliquary vertical slice, boss/contract integration, an evidence-backed reward-curve decision, loot comparison/return clarity, and v1.28.9 release hardening.

### Should

- Expanded encounter texture, themed gear/loadouts, Town/mobile declutter, and Journal/world reaction. These are planned patches, but each can be narrowed before it is allowed to destabilize the Must tier.

### Stretch

- Extra enemy variants, extra prose, cosmetic effects, new art, or marketing assets. Stretch work requires remaining test budget and documented asset provenance; it never delays stability or introduces a new system framework.

## Definition of “Huge”

v1.28 is huge when the new place is memorable, its loot chase is mathematically defensible, decisions are faster on a phone, past actions receive visible acknowledgement, and the whole line remains compatible with an existing save. Raw feature count is not the acceptance test.
