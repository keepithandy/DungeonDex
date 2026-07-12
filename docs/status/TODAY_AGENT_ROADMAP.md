# DungeonDex Acting-Agent Roadmap — Today

## Current checkpoint

- Baseline: `v1.26.0 Trophy Echo Only Revisit`.
- Current active Revisit lane: Trophy Echo only.
- Latest reviewed main commit: `2921a0b`.
- Compact smoke baseline: 27/27 passed.

## Non-negotiable boundaries

- Preserve the core loop: Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal -> Repeat.
- Do not change combat math, player HP/damage, monster or boss scaling, rewards, drops, economy, upgrade costs, or dungeon entry.
- Do not change save schema without an explicit, documented requirement.
- Do not reactivate Famous Gear Memory, Rival Trace, Board Echo, or Debt Pressure Revisit.
- Do not change Talent or Debt behavior.
- Do not bump version or cache labels unless an explicit version/release issue requires it.

## Work order

1. **Trophy Echo flavor pass (#48) — complete**
   - Locked, available, and active copy is now boss-record focused without changing actions or state.
   - `smoke_public_copy_v1260.mjs` protects the updated wording.

2. **Run the mobile validation checklist**
   - Use `docs/status/MOBILE_VALIDATION_V1260.md`.
   - Check 390px, 430px, and 768px Town states.
   - Record only observed clipping, covered controls, delayed input, or layout shifts.
   - Treat any mobile regression as a dedicated stability issue; do not fold it into flavor work.

3. **Public-facing documentation queue**
   - #50: v1.26.0 roadmap split — complete.
   - #47: honest screenshot/hero-card plan — complete.
   - #39: player-facing glossary — complete on the current glossary branch.
   - Keep each as its own docs-only patch.

4. **Visual/identity queue**
   - Prefer small copy, CSS, or asset-hygiene improvements backed by the existing mobile checklist.
   - Do not introduce new dependencies or replace the current side rail.

5. **Second safe wave**
   - #44: verify asset provenance and replacement status.
   - #43: audit one player-facing copy surface per patch.
   - #51 and #46: align title/loading copy with the existing DungeonDex brand rules.
   - #42, #41, and #40: keep faction, lore, and visual guidance compact and subordinate to playable work.
   - #56: defer smoke-file migration to a dedicated organization patch with the full compact suite.

## Per-patch routine

1. Start from clean, current `main` on one focused branch.
2. Read `AGENTS.md`, `VERSION.md`, and current notes before editing.
3. State the patch category, allowed files, protected systems, and intended smoke checks.
4. Make the smallest useful change.
5. Run `git diff --check` plus the focused smoke; use `node smoke_compact_suite.mjs` when a runtime surface changes or the boundary is unclear.
6. Open a draft PR with behavior changed, intentionally unchanged behavior, validation, and risks.
7. Squash-merge only after the PR is still narrow, mergeable, and green; refresh local `main` before the next branch.

## Handoff format

Report every completed step with:

- Branch and commit.
- PR link/status.
- Files changed.
- Behavior changed.
- Behavior intentionally not changed.
- Checks run and result.
- Risks.
- Next safest action.

## Stop conditions

Stop editing and report the blocker when:

- `main` is not clean or cannot fast-forward safely.
- A requested patch would touch a protected system without explicit scope.
- A smoke failure persists after a focused rerun and cannot be linked to the patch safely.
- The next action needs a product decision, external approval, or a new gameplay direction.
