# DungeonDex Agent Stability Notes

## v1.25.2 Stability Baseline

Use these notes when continuing work after the Revisit relocation/mobile lag regression.

## Current Stability Decision

- `js/systems/44_revisit_lowfire_board_slot.js` is intentionally a no-op stability marker.
- Do not reintroduce the post-render Revisit relocation helper.
- Do not use document-wide `MutationObserver` sweeps to move town panels after render.
- Revisit placement should be fixed at the source renderer level, likely inside `js/systems/10_ui_town_shop.js`, only in a focused Revisit UI placement issue.

## Required Agent Behavior

- Confirm `VERSION.md` before changing version labels.
- Treat `v1.25.2-revisit-noop-stability` as the current cache/build label for stability work.
- Prefer responsiveness and safe rollback/no-op behavior over cosmetic placement work when mobile/touch input is affected.
- If changing cache labels, align `VERSION.md`, `CHANGELOG.md`, `docs/status/CURRENT_NOTES.md`, `app.js`, `sw.js`, and `js/systems/21_build_label_guard.js` in the same patch.
- If `index.html` still contains stale labels or query strings, report that conflict before claiming full version alignment.

## Protected Revisit Boundary

Do not change:

- Revisit lane availability logic
- Revisit start/resolve actions
- Revisit completion/history data
- Revisit rewards or memory marks
- Board Echo or Debt Pressure activation state

The next safe Revisit UI issue should move the rendered panel at the source without altering lane behavior.
