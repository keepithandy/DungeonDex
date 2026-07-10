# DungeonDex Agent Stability Notes

## v1.25.2 Stability Baseline

Use these notes when continuing work after the Revisit relocation/mobile lag regression.

## Current Stability Decision

- `js/systems/44_revisit_lowfire_board_slot.js` now owns a focused Revisit source-slot bridge after the no-op rollback.
- Do not reintroduce the old post-render relocation loop.
- Do not use document-wide `MutationObserver` sweeps to move town panels after render.
- Revisit placement work must stay scoped to UI placement only; lane status, start, resolve, reward, completion, and history behavior remain protected.
- The current cache/build label for the bridge is `1.25.2-revisit-source-slot`.

## Required Agent Behavior

- Confirm `VERSION.md` before changing version labels.
- Treat `v1.25.2` as the current version baseline.
- Treat `1.25.2-revisit-source-slot` as the current cache/build label for Revisit placement verification.
- Prefer responsiveness and safe rollback/no-op behavior over cosmetic placement work when mobile/touch input is affected.
- If changing cache labels, align `VERSION.md`, `CHANGELOG.md`, `docs/status/CURRENT_NOTES.md`, `app.js`, `sw.js`, and `js/systems/21_build_label_guard.js` when the patch is a formal release/version alignment pass.
- If `index.html` still contains stale labels or query strings, report that conflict before claiming full version alignment.

## Protected Revisit Boundary

Do not change:

- Revisit lane availability logic
- Revisit start/resolve actions
- Revisit completion/history data
- Revisit rewards or memory marks
- Board Echo or Debt Pressure activation state

The next safe Revisit UI issue should verify the source-slot bridge on mobile before changing any source-render markup.