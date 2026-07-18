# DungeonDex Agent Stability Notes

## Current v1.26.4 Stability Target

- Current target: `v1.26.4 Mobile Interface + Release Hygiene`.
- Current build/cache label: `1.26.4-mobile-interface-release-hygiene`.
- GitHub #116-#125 and the two narrow side-rail/screenshot hotfixes are implemented and locally verified: compact suite 41/41, mobile-layout contracts 14/14, interface/accessibility contracts 19/19, dungeon-entry runtime 11/11, and inspected touch and fine-pointer captures at 390×844, 430×932, and 768×1024.
- Preserve the merged v1.26.3.02 Town runtime cleanup: system 25 owns the wallet; systems 20, 26, and 27 remain retired and must not be reloaded or precached.
- Real-device/Textastic drawer tapping and keyboard interaction remain manual handoff checks; do not describe touch emulation as a physical-device pass.
- The screenshot helper defaults to applying touch/mobile metrics before page initialization and verifying touch media state; `--fine-pointer` provides the separate narrow desktop-pointer audit. Neither mode replaces a real-device tap check.
- The side rail may remain discoverable when closed, but it must not cover Town, combat, Journal, modal, or other active content.
- No itch/package builder was run and no release package was created for this work.
- Trophy Echo remains the only active Revisit lane. Save, combat, rewards, economy, upgrades, dungeon entry, Talent, Debt, progression, and Revisit behavior remain protected.

## Historical v1.25.2 Stability Baseline

Use these notes when continuing work after the Revisit relocation/mobile lag regression.

## Historical Stability Decision

- `js/systems/44_revisit_lowfire_board_slot.js` now owns a focused Revisit source-slot bridge after the no-op rollback.
- Do not reintroduce the old post-render relocation loop.
- Do not use document-wide `MutationObserver` sweeps to move town panels after render.
- Revisit placement work must stay scoped to UI placement only; lane status, start, resolve, reward, completion, and history behavior remain protected.
- The cache/build label for that historical bridge patch was `1.25.2-revisit-source-slot`.

## Required Agent Behavior

- Confirm `VERSION.md` before changing version labels.
- Treat `VERSION.md` as the current semantic-version and build/cache authority.
- Follow `docs/VERSION_CACHE_AUTHORITY.md` for propagation and mismatch checks.
- Treat `1.25.2-revisit-source-slot` as historical, not as the current cache/build label.
- Prefer responsiveness and safe rollback/no-op behavior over cosmetic placement work when mobile/touch input is affected.
- If changing cache labels, align every surface listed in `docs/VERSION_CACHE_AUTHORITY.md`, including `VERSION.md`, README, changelog/current notes, `index.html`, `app.js`, `sw.js`, core constants, build-label guard, version-reporting systems, and focused smoke expectations.
- If `index.html` still contains stale labels or query strings, report that conflict before claiming full version alignment.

## Protected Revisit Boundary

Do not change:

- Revisit lane availability logic
- Revisit start/resolve actions
- Revisit completion/history data
- Revisit rewards or memory marks
- Board Echo or Debt Pressure activation state

The next safe Revisit UI issue should verify the source-slot bridge on mobile before changing any source-render markup.
