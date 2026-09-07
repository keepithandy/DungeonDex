# Reliquary Journal and World Reaction

## Patch record

- Primary category: Framework Completion; secondary effects are two verified Journal/Town clarity fixes and regression coverage.
- Starting branch/commit: clean local `main`, `99bddca`; work branch `codex/reliquary-journal-rc`.
- Target remains v1.28.2 Loadout Polish / `1.28.2-loadout-polish`.
- Scope: existing Journal and Town receipt renderers, focused Journal/Famous Gear smoke, public Reliquary browser checks, and milestone records.

## Completed presentation

The Guild Journal includes four read-only Reliquary acknowledgements. Town reuses the same projection inside the existing return/preparation panel. The additional cards summarize evidence; they do not add to the existing chronicle record count or create save fields.

| Account | Sufficient evidence | Limit |
|---|---|---|
| Gravetoll Bell | Existing trophy ID or supported legacy trophy identity | Raw depth, best depth, or an active boss alone cannot prove a victory. The existing D45 encounter may be labelled Active. |
| Writ among the bells | Existing contract identity with a recorded target threat floor mapping into D31–D40 | Active acceptance, completed target, failed/expired history, and claimed/completed IDs without location remain distinct. Claimed IDs do not preserve the target location and cannot prove a Reliquary hunt. |
| Notable gear | Equipped/inventory or retired item with an ID, name, valid slot, and explicit Reliquary maker/tag | Names, loot-preview strings, item level, and retirement depth alone cannot establish origin. Retirement remains historical. |
| Word from the Reliquary | Retained run entry ending at D31–D40; `extract` establishes a safe return | Defeat is historical loss. An active run is still underway. Deeper progress and extraction elsewhere cannot prove passage through the band. No full-band clear is inferred. |

Missing evidence is labelled Locked with an explanation, not a claim that the gameplay district is inaccessible. Retained run history is bounded to the existing 12 entries; sold gear and older discarded history may no longer support an acknowledgement. The UI makes no permanent achievement promise.

## Verified defects corrected

- Latest Return printed raw D40 as Floor 40. It now derives both the extraction and next-start location through `getLoreDepthProgress`: Floor 1, Room 4, Chapter 10 (D40). The older `depthWithRawLabel` mixes threat-floor numbering into its label and is intentionally not used on this new presentation. Other existing location owners are outside this patch.
- Famous Gear summary preparation could normalize the live Revisit record during Journal rendering. The Journal passes an isolated copy of memory state to the existing summary, preserving legacy saves. Trophy Echo text now comes only from its own result, so absent Trophy Echo copy cannot borrow an unrelated historical lane's result.
- The historical Famous Gear smoke's `outerHTML` mock did not update its backing panel. It now models the DOM replacement and checks the actual remembered item rather than an incidental word.

## Verification and freeze boundary

- Focused Journal coverage passes for empty, partial, complete, malformed and legacy records, exact raw-to-displayed locations, unsafe names, duplicate trophy identity, unsupported achievement inference, and nonmutation.
- Public runtime: 48/48 passed, including real save/reload, legacy projection, Town acknowledgement, no acknowledgement actions, and Journal geometry at 390×844, 430×932 and 768×1024 with touch and fine pointer.
- Initial compact run: 56/57; the sole failure was the stale Famous Gear DOM mock described above. Its focused rerun passed after repair. All other compact gates, including 36,000 boss fights, rarity, package extraction, protected systems, mobile/accessibility and public runtime passed. The final release-candidate record owns the subsequent complete clean run.
- Feature scope is now frozen. Remaining work is automated release preparation and verified regression/accessibility/documentation fixes only.

No rewards, claim actions, farming routes, gameplay bonuses, save schema, normalization rules, combat, economy, loadouts, upgrades, entry rules, contracts, Talent, Debt, or Revisit mechanics changed. Trophy Echo remains the only active Revisit lane. No version/cache change, public package, tag, push, or upload is part of this milestone.

Physical-device/Textastic validation remains outstanding; desktop emulation does not satisfy that gate.

Reviewer handoff: inspect only this diff for unsupported achievement claims, location evidence, pure presentation, exact depth mapping, preserved historical records, and Trophy Echo-only behavior.
