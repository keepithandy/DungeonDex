# Fresh Physical-Device Handoff — v1.28 Source Candidate

Automated preparation is recorded in `RELEASE_CANDIDATE_V128.md`. This sheet is intentionally fresh: it does not inherit any historical device pass or exception.

Closure status: **In progress — physical testing has been opened, but no checklist row is passed until the owner records real-device evidence below.**

## Candidate identity

| Field | Record before testing |
|---|---|
| Candidate commit | `c114acf` (`main`; verify the copied source matches this exact commit). This supersedes stale `d58808b`, which is an ancestor two local commits behind current `main`. |
| Source version | v1.28.2 Loadout Polish |
| Visible build | DungeonDex v1.28.2 |
| Cache label | 1.28.2-loadout-polish |
| Device model / OS | Not yet tested |
| Textastic version / browser or preview version | Not yet tested |
| Portrait / landscape viewport | Not yet tested |
| Tester / date / time | Not yet tested |
| Screenshots / evidence folder | Not yet supplied |

Use a disposable device copy of the exact source commit and an ordinary save. Confirm its visible version before starting. This handoff does not authorize creating or publishing a release package. Do not use the automated test captures as device evidence.

## Required checks

All rows below remain **Blocked pending the owner's physical-device session**. Replace each with Pass, Fail, or a specific remaining Blocked reason after physical testing. Record a screenshot filename, or explain why a screenshot cannot show the result.

| # | Check | Result | Evidence / notes |
|---:|---|---|---|
| 1 | Launch in Textastic/target browser; verify version, close intro, verify Town. | Blocked | Awaiting physical session |
| 2 | Open/close the drawer five times; verify response and clearance from browser chrome/safe areas. | Blocked | Awaiting physical session |
| 3 | Use each public route and return to Town; verify focus and reachable controls. | Blocked | Awaiting physical session |
| 4 | Scroll all Town content with drawer closed and open; check entry, Rest, Market, Forge, Contracts and Trophy Echo. | Blocked | Awaiting physical session |
| 5 | Verify Trophy Echo is the only active Revisit lane; historical Journal memories have no new actions. | Blocked | Awaiting physical session |
| 6 | Enter Dungeon normally and use Attack, Ashburst, Guard and Extract when allowed; verify controls and text remain clear. | Blocked | Awaiting physical session |
| 7 | After extraction, read Latest Return and its location/rewards, follow its Gear/Journal links, and verify Town reaction against actual records. | Blocked | Awaiting physical session |
| 8 | Scroll Guild Journal, including all Reliquary acknowledgements; check drawer clearance, state labels and wrapping. | Blocked | Awaiting physical session |
| 9 | Inspect ordinarily owned/equipped gear; compare, scroll, close and verify return to opener. | Blocked | Awaiting physical session; record missing owned gear if applicable |
| 10 | Create/rename/duplicate/reorder a named loadout, reload, and use Apply Safe Items only where a matching empty slot exists; verify equipped items and upgrade tiers persist. | Blocked | Awaiting physical session |
| 11 | Reload during a normal active run; verify resume and extraction back to Town. | Blocked | Awaiting physical session |
| 12 | Rotate portrait/landscape on Town, Gear, Journal and Run; verify recovery and no covered controls. | Blocked | Awaiting physical session |
| 13 | Check VoiceOver/screen-reader names and reading order, physical keyboard focus where available, reduced-motion behavior and readable text contrast. | Blocked | Awaiting physical session |

Overall physical-device verdict: **In progress, not passed**. All 13 checks currently remain blocked pending the physical session, and no exception has been granted for this candidate. A failure should be recorded as a focused defect; rerun affected checks after its fix. If a row cannot be exercised naturally, record the missing prerequisite rather than fabricating an achievement.

The last recorded tracking issue is GitHub #139 (physical-device loadout validation). This sheet adds the combined Reliquary/Journal checks without changing gameplay, version authority, or release authorization.
