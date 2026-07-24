# DungeonDex v1.26.5 Audit and Hotfix Roadmap

## Starting baseline

- Source version: `v1.26.4.06 Mobile Interface Audit Closure`.
- Branch: `main`.
- Release tag: `v1.26.4.06`.
- Compact suite: 43/43 passed.
- Open runtime syntax, stale-label, silent-catch, TODO/FIXME, and console-error audit findings: none.
- v1.26.5 is a development direction only; version/cache labels remain v1.26.4.06 until a separate explicit version pass.

## Work order

### 1. #126 — Package checker source-audit mode

- Status: completed and verified in the first v1.26.5 tooling patch.
- Category: Smoke Hardening.
- Goal: keep strict staged-package rejection while allowing useful, low-noise source-tree audits.
- Protected behavior: all runtime, gameplay, save, combat, economy, progression, Revisit, and version contracts.

### 2. #127 — Browser-computed contrast verification

- Status: queued.
- Category: Smoke Hardening.
- Goal: measure effective computed colors and opacity after the full CSS cascade instead of relying on hardcoded audit surfaces.
- Protected behavior: player-facing colors remain unchanged unless a separate confirmed defect is authorized.

### 3. #128 — Touch-navigation geometry smoke

- Status: queued.
- Category: Smoke Hardening.
- Goal: prove with browser rectangles that the closed touch toggle and Town title do not overlap at 390×844, 430×932, and 768×1024.
- Protected behavior: navigation routes, touch behavior, safe-area rules, combat hiding, and screen IDs.

## Audit notes

- The package checker is strict by default and correctly rejects repository-only content in package mode.
- Before #126, using that strict mode on the source repository produced hundreds of expected warnings that obscured actionable source wiring/version failures.
- After #126, source mode passes with 51 checked paths and zero warnings; the focused two-mode regression passes 8/8.
- The current contrast smoke passes but uses conservative hardcoded background samples; #127 will bind the proof to effective browser styles.
- The current navigation smoke and screenshots pass; #128 will turn the visual non-overlap proof into repeatable browser geometry assertions.

## Release gate

Do not label or release v1.26.5 until:

1. selected scoped issues are complete;
2. focused checks pass;
3. the compact suite passes;
4. protected-system review finds no drift;
5. the user explicitly authorizes the version/cache update.
