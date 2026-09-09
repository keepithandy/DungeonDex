# DungeonDex Next Phase Roadmap

## Status

- v1.30.0 Spellbook & Gear Quality of Life is a local release candidate.
- Automated smoke, browser, accessibility, mobile, package, and regression checks are the release baseline.
- The physical-device/Textastic checklist is retired and is not a release blocker.
- Do not publish, upload, tag, or push the candidate until explicitly requested.

## Prompt-ready phases

### Phase 1 — Choose the next player-facing slice

Pick one small improvement that strengthens the existing loop:

`Town -> Dungeon -> Loot -> Return -> Gear -> Journal -> Repeat`

Keep the change focused, reuse existing systems, and preserve saves, combat, rewards, economy, dungeon entry, Talent, Debt, and Revisit behavior.

### Phase 2 — Build the slice

Implement the approved feature with the smallest practical runtime and UI changes. Add focused smoke coverage for the new behavior.

### Phase 3 — Polish and verify

Check mobile layout, accessibility, copy, save/reload behavior, and protected-system regressions. Run the compact suite until clean.

### Phase 4 — Release decision

Summarize the change, verification, risks, and files. Wait for explicit authorization before changing version labels, building a package, pushing, tagging, or uploading.

## Prompt format

`Implement Phase 1: [specific player-facing improvement]. Keep it focused, preserve the existing gameplay contracts, update the relevant smoke coverage, and report the files changed and checks run.`
