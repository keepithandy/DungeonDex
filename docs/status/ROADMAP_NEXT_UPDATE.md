# DungeonDex Post-Upload and Next-Update Roadmap

## Authority and current position

- Active source/version authority remains **v1.28.2 Loadout Polish** with build/cache label **`1.28.2-loadout-polish`**.
- Roadmap preparation began from local and remote-tracking `main` aligned at `a759713`; this documentation update will advance the local commit when committed.
- The owner confirms that the itch-ready v1.28.2 ZIP and its accompanying devlog were uploaded to itch.io.
- That uploaded build contains the completed named source milestones through Journal/world reaction (the historical v1.28.8 planning phase), plus release-candidate hardening.
- The original uploaded ZIP was not recovered during the local re-audit. Its exact uploaded checksum and timestamp remain unverified; do not substitute the checksum of a later rebuild as upload evidence.
- No version or cache-label change is authorized by this roadmap.

## Phase map

| Phase | State | Purpose | Exit gate |
|---|---|---|---|
| 1. v1.28 source line | Complete | Reliquary D31-D40, D45 conclusion, themed gear, named loadouts, loot/return clarity, Town/mobile polish, and read-only Town/Journal acknowledgements | Existing automated acceptance evidence remains green |
| 2. Package and itch handoff | Complete — owner confirmed | Publish the itch-ready v1.28.2 browser build and devlog | Upload confirmed; exact original artifact checksum remains unverified |
| 3. Physical-device closure | In progress — owner session required | Validate the uploaded/current candidate in Textastic and a real mobile browser | Complete all 13 rows in `REAL_DEVICE_HANDOFF_V128.md` with device, OS, viewport, browser/Textastic version, and evidence |
| 4. Live-release observation | Pending | Check the public build for cache freshness, launch, save continuity, navigation, and any release-only regressions | Record actual itch URL/build observation and triage only verified defects |
| 5. Next-update scope lock | Pending | Choose one player-facing goal for the next update without reopening completed v1.28 work | Written scope, protected systems, acceptance criteria, and explicit version decision |
| 6. Next-update implementation | Not started | Implement the selected goal in small, test-backed milestones | Focused checks plus compact-suite regression coverage |
| 7. Next release candidate | Not started | Freeze scope, reconcile evidence, package, device-check, and publish only with separate authorization | Source/staged/extracted audits, public launch, device evidence, checksum, tag, and upload approval |

## Immediate work order

1. Complete the physical-device checklist against the uploaded/current v1.28.2 build.
2. Record a live itch observation: URL, visible version, cache freshness, launch result, and save behavior.
3. Repair only a verified release blocker, regression, accessibility defect, or record contradiction found by those checks.
4. Select the next update's single player-facing goal before changing version labels or beginning feature work.

## Next-update scope guardrails

- Preserve `Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal -> Repeat`.
- Do not rebuild the completed Reliquary, loadout, comparison, return, Town/mobile, or Journal milestones.
- Preserve save compatibility, combat and reward math, boss cadence, Merchant Gear Upgrades, Debt, Talent, contracts, and Trophy Echo-only Revisit behavior unless a separately approved scope explicitly targets one of them.
- Treat feedback and ideas as candidates, not implementation authorization.
- Choose one dominant risk per milestone and require a clear player payoff and exit gate.
- Keep generated marketing imagery out of source and packages unless provenance and intended use are documented and approved.

## Decisions needed before feature work

- The next update's player-facing theme and smallest complete payoff.
- Whether the next update retains v1.28.2 during development or receives an explicitly authorized new version/cache label.
- Whether physical-device or live-itch findings require a hotfix before new content begins.
