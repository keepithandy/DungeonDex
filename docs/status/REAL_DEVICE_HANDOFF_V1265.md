# v1.26.5 Real-Device Release Handoff

Use this sheet only for a physical-device release-candidate check. Browser
emulation, screenshots, and automated smoke results support this handoff but do
not replace it.

## Candidate identity

Fill this before testing. Use a disposable device copy because the dungeon and
reload steps create normal gameplay save state.

| Field | Record |
|---|---|
| Candidate commit | `98ba036eaf5fbb9c4e27f2a498b478ba62f33790` |
| Source version | `v1.26.4.06 Mobile Interface Audit Closure` |
| Build/cache label | `1.26.4.06-mobile-interface-audit-closure` |
| Device model | Not recorded |
| iOS/iPadOS version | Not recorded |
| Textastic version | Not recorded |
| Preview/browser used | Textastic Workspace preview, per tester report |
| Tested date and time | 2026-07-24, exact time not recorded |
| Portrait viewport | Not recorded |
| Landscape viewport | Not recorded |
| Tester | Project owner |

Prepare the candidate from this exact commit before copying it to the device:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build_itch_ready.ps1 -OutputName DungeonDex_v1265_device_handoff.zip -StageName _itch_staging_v1265_device_handoff
```

Open the extracted candidate's `index.html` from the device copy. Do not test a
stale installed copy or a browser-emulation capture. Confirm the visible build
label still identifies `DungeonDex v1.26.4.06` before recording results.

## Result rules

Every row must be one of:

- `Pass` - the stated behavior worked without a defect.
- `Fail` - the stated behavior did not work. Stop that row and create a focused
  defect issue; do not hide it in a release commit.
- `Blocked` - the check could not be performed. Record the exact reason and
  whether release approval is needed to accept the block.

Record a screenshot filename for every row. If a screenshot is not useful,
write `none` and state why in Notes. Do not use "looks good" as a result.

## Required handoff checks

| # | Physical check | Result | Screenshot filename | Notes / exact failure or block reason |
|---:|---|---|---|---|
| 1 | Launch the copied candidate in Textastic. Confirm the title/build label and intro modal render. Close the intro modal. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 2 | With the drawer closed, open and close it five times. Confirm each tap responds and the closed toggle remains reachable and clear of browser/app chrome. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 3 | With the drawer open, select each public route in its displayed order: Town, Gear, Archive, and Guild Journal. Confirm the selected route changes and no control is covered. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 4 | On Town, scroll from top to bottom with the drawer closed. Confirm Town controls, Lowfire Board, and Trophy Echo remain reachable without accidental drawer activation. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 5 | Repeat the Town scroll with the drawer open. Confirm route controls remain usable and Town can still be scrolled intentionally. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 6 | Enter Dungeon using the normal Town action. Confirm the Run screen opens and the navigation behavior remains as designed during combat. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 7 | Use Attack, Ashburst, Guard, and Extract once each when their normal combat states permit. Confirm all four controls are reachable and no combat text or browser chrome covers them. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 8 | After Extract, confirm the normal return to Town works and the Town route remains responsive. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 9 | Open Archive and Guild Journal. Confirm Chronicle cards/text scroll and wrap without horizontal clipping. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 10 | Open Gear inspection for an ordinarily owned/equipped item, scroll the modal if needed, then close it. Confirm the modal stays above the rail, its close control is reachable, and focus/tap returns to the opener. If the disposable save owns no gear, record `Blocked` and do not use DevTools or a fabricated runtime item. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 11 | While a normal run is active, reload the candidate. Confirm the saved run resumes normally, then Extract back to Town. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |
| 12 | Rotate portrait to landscape and back on Town, Gear, Archive/Journal, and the Run screen. Confirm layout recovers, the drawer works, and no important control sits beneath browser or app chrome. | Pass | none | Tester reported the live Workspace/Textastic check passed; no capture supplied. |

## Handoff verdict

| Field | Record |
|---|---|
| Overall result (`Pass`, `Fail`, or `Blocked`) | Pass - all twelve checks reported passing in a live Textastic Workspace session. |
| Failed-row issue links | None reported. |
| Blocked-row approval and owner | Not applicable. |
| Evidence folder / filenames | none - no screenshots were supplied. |
| Tester sign-off | Project owner reported all twelve checks as fine on 2026-07-24. |

## Evidence note

The physical run was reported verbally after pulling the Workspace copy. The
device model, operating-system/Textastic versions, viewport dimensions, exact
candidate SHA visible on-device, and screenshots were not captured. This is a
documentation-quality limitation, not a reported runtime or interaction defect.

## Release rule

This sheet does not authorize a version or cache-label update. #134 may proceed
only after every row passes, or a blocked row has explicit documented approval.
Automated v1.26.5 evidence remains separate: the public-runtime console gate,
package extraction gate, mobile geometry, contrast, and compact smoke suite are
not substitutes for this physical-device record.
