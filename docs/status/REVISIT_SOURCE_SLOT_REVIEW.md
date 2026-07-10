# Revisit Source Slot Review

This note documents the v1.25.2 Revisit placement correction after the unstable post-render relocation loop was disabled.

## Intent

Place the live Revisit panel beside the Lowfire Elite Board without reintroducing the mobile/Textastic lag source.

## Implementation boundary

- `js/systems/44_revisit_lowfire_board_slot.js` now wraps the normal `renderTown()` function once.
- After the normal town render, it places the already-rendered `#revisitPanel` beside `.elite-contract-board` inside `#questPanel .town-board-shell`.
- It does not use `MutationObserver`.
- It does not run repeated sweeps.
- It does not change Revisit lane status, start, resolve, reward, completion, or history logic.

## Expected mobile layout

On narrow screens, Revisit appears in the Lowfire Board area before the Elite Contract cards, rather than above Hollow Stair Charters.

## Protected behavior

- Combat unchanged.
- Economy unchanged.
- Save data unchanged.
- Revisit mechanics unchanged.
- Elite Contract mechanics unchanged.
- Dungeon entry unchanged.
