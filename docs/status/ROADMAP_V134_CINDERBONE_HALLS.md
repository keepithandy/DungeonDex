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

- [ ] Phase 1 — Baseline and contract audit
- [ ] Phase 2 — Cinderbone chapter foundation
- [ ] Phase 3 — Cinderbone encounter roster
- [ ] Phase 4 — Cinderbone incidents
- [ ] Phase 5 — D45 boss and Elite Contract integration
- [ ] Phase 6 — Cinderbone gear identity
- [ ] Phase 7 — Chapter Chronicle and Debt Collector clarity
- [ ] Phase 8 — Large UI and accessibility polish
- [ ] Phase 9 — Verification and release preparation

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
