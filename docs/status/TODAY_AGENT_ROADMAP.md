# DungeonDex Acting-Agent Roadmap — Today

## Current checkpoint

- Baseline: `v1.26.6 Ashen Anvil Reinforcements`.
- Current active Revisit lane: Trophy Echo only.
- Working branch: `main`.
- Implementation status: v1.27 work through #142 is complete on `main`; the next focused issue is fulfillment, claim, and Guild Journal polish (#143).
- Current compact result: 51/51 passed, including repository-wide JavaScript syntax, the 36,000-fight boss readiness matrix, package extraction, and protected-system coverage.

## Planned v1.27 Work

- Active roadmap: `docs/status/ROADMAP_V127.md`.
- Planned release: `DungeonDex v1.27 - The Contract Board`.
- The roadmap extends the already-live Elite Contract system with clearer mobile contract choice, three differentiated named-hunt presentations, a subtle and accessible in-combat `CONTRACT TARGET` indicator, a stronger fulfillment/claim flow, and clearer Guild Journal history.
- Planned sequence: #139 baseline/save audit - complete; #140 board choice/readability - complete; #141 named hunt identity - complete; #142 combat target indicator - complete; #143 fulfillment/claim/Journal polish; #144 protected-system release audit; #145 release authority and package pass.
- All roadmap work is intended to ship together in v1.27. Intermediate issues do not authorize separate version or cache bumps.
- Preserve existing contract payout/risk contracts, combat, scaling, economy, saves, Merchant Gear Upgrades, Debt, Talent, dungeon entry, and Trophy Echo-only Revisit behavior unless a focused roadmap issue explicitly authorizes and verifies a narrow change.

## v1.26.6 Release Candidate Status

- #138 adds Offhand upgrades for equipped items only: `+1 Guard` and `+1 Wit` per tier through `+3`, with the established `50c`, `125c`, and `250c` costs.
- Weapon and Armor upgrade values remain unchanged. The feature reuses the existing `upgradeLevel` save field and adds no currency, route, or progression system.
- Town, Gear, and Guild Journal render the Offhand record only when an Offhand is equipped.
- Runtime/cache labels now use `v1.26.6` and `1.26.6-ashen-anvil-reinforcements`.
- Verification passed: Merchant Gear Upgrades, Guild Journal, app-wiring/cache authority, public runtime console 18/18, Enter Dungeon 11/11, interface/accessibility 22/22, mobile layout 19/19, touch geometry at all supported profiles, source package audit 51 paths/zero warnings, and compact suite 49/49.
- The local review ZIP `archive/packages/DungeonDex_v1.26.6_ItchReady_Review.zip` passed staged and clean-extracted audits. Upload and release tagging remain pending explicit authorization.

## v1.26.5 Historical Release Status

- #127 through #134 are complete and recorded in `docs/status/ROADMAP_V1265.md`.
- The final itch-ready ZIP is `archive/packages/DungeonDex_v1.26.5_ItchReady.zip`.
- Strict source, staged, and extracted package audits each passed with 51 checked paths and zero warnings.
- The physical Textastic Workspace pass reported every required check as passing; device/browser/viewport/screenshot metadata remains unrecorded.
- Existing generated game assets with incomplete provenance remain a marketing/reuse review risk, but no untracked or undocumented package asset was found.

## Non-negotiable boundaries

- Preserve the core loop: Town -> Dungeon -> Loot -> Return -> Gear Upgrades -> Archive/Journal -> Repeat.
- Do not change combat math, player HP/damage, monster or boss scaling, rewards, drops, economy, upgrade costs, or dungeon entry.
- Do not change save schema without an explicit, documented requirement.
- Do not reactivate Famous Gear Memory, Rival Trace, Board Echo, or Debt Pressure Revisit.
- Do not change Talent or Debt behavior.
- Do not bump version or cache labels unless an explicit version/release issue requires it.
- For the v1.27 roadmap, only the final release-authority issue may bump version/cache labels.

## Historical v1.26.4 Work Status

- #116 safe-area navigation — implemented; touch and fine-pointer viewport captures plus the mobile contract smoke passed. Real-device drawer tapping remains a handoff check.
- #117 rest-cost hierarchy — implemented; all three touch-profile layouts were inspected without wrapping or overlap.
- #118 mobile combat controls — implemented; established four-control order and equal-width layout are smoke-protected.
- #119 Town presentation tokens — implemented; focused interface smoke and compact regression suite passed.
- #120 Journal/Archive wrapping — implemented; wrapping and overflow contracts passed.
- #121 modal focus, scroll lock, close behavior, stacking, safe areas, and keyboard gear access — implemented; isolated lifecycle and stable-ID/keyboard contracts passed. Physical keyboard/touch interaction remains a handoff check.
- #122 touch-target sizing/spacing — implemented; 44px route, drawer, and action contracts passed.
- #123 contrast and non-color cues — implemented; contrast ratios and non-color state contracts passed.
- #124 asset provenance/usage manifest — implemented and documentation-reviewed against the five tracked visual assets.
- #125 version/cache authority and mismatch reporting — implemented; the field-level v1.26.4 authority smoke passed, including changelog/current-notes build labels and the dynamic-loader fallback.
- No package builder has been run and no release package has been created.

## Work order

1. **Trophy Echo flavor pass (#48) — complete**
   - Locked, available, and active copy is now boss-record focused without changing actions or state.
   - `smoke_public_copy_v1260.mjs` protects the updated wording.

2. **Run the final v1.26.4 mobile validation checklist — local profiles complete**
   - Use `docs/status/MOBILE_VALIDATION_V1260.md`.
   - Touch-emulation captures at 390×844, 430×932, and 768×1024 were generated and inspected.
   - No covered controls or left-edge clipping remained after the Rest/action-stack and 44px drawer-gutter fixes.
   - A real-device/Textastic open/close and physical keyboard pass remains a manual handoff check.
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
   - #40–#44, #46, and #51: complete.
   - #56 smoke-file migration: complete and compact-suite protected.
   - Historical note: the GitHub open issue queue was empty before the v1.26.1 release patch.

## Immediate two-hotfix roadmap

These began as separate follow-ups from the 2026-07-18 Town visual audit. The user later authorized their inclusion in the combined v1.26.4 version/cache alignment. Neither requires an itch/package build, a new dependency, or a gameplay-system change.

1. **Bug Fix — keep the closed desktop side rail off Town content — implemented and locally verified**
   - Pre-fix evidence: the 390px, 430px, and 768px Town captures showed the closed desktop-pointer rail covering the left edge of content; `Lowfire Market` was visibly clipped.
   - Primary surface: `js/systems/22_nav_centering.js` and only the narrow visual/smoke coverage needed to prove the fix.
   - Implemented outcome: a closed rail remains discoverable without covering Town headings, controls, or card content at narrow desktop-pointer widths.
   - Guardrails: preserve the existing touch drawer behavior, route IDs, script order, Town layout ownership, save data, combat, economy, Talent, Debt, and Revisit behavior.
   - Validation completed: the focused 14/14 mobile-layout smoke, inspected 390×844/430×932/768×1024 fine-pointer captures, and 41/41 compact suite passed.

2. **Smoke Hardening — make Town screenshots emulate real touch devices — implemented and locally verified**
   - Pre-fix evidence: `tools/capture_town_mobile_screenshots.mjs` changed viewport metrics after load without enabling touch emulation, so captures exercised desktop hover/pointer rules rather than the mobile drawer path.
   - Primary surface: `tools/capture_town_mobile_screenshots.mjs`; optional focused smoke coverage only if it can remain tooling-only.
   - Implemented outcome: touch/mobile emulation is configured before page initialization with realistic viewport heights, so 390px, 430px, and 768px captures exercise the mobile rail state.
   - Guardrails: no production runtime, CSS, save, route, combat, economy, Talent, Debt, or Revisit changes. Do not treat screenshots as a replacement for a real-device tap check.
   - Validation completed: syntax passed; the capture helper verified touch/coarse-pointer state at all three profiles and the resulting closed-rail Town images were inspected. Open/close tapping remains a real-device handoff check.

## Hotfix sequencing

- Implementation order was side-rail overlap first, then screenshot-harness hardening.
- Local touch-emulation checklist and smoke validation are complete; retain real-device/Textastic drawer tapping as a handoff check.
- The explicit v1.26.4 request supersedes the earlier no-version-bump note; protected systems remain out of scope.

## Per-patch routine

1. Start from clean, current `main`; create a focused branch when the user or issue requires one.
2. Read `AGENTS.md`, `VERSION.md`, and current notes before editing.
3. State the patch category, allowed files, protected systems, and intended smoke checks.
4. Make the smallest useful change.
5. Run `git diff --check` plus the focused smoke; use `node smoke_compact_suite.mjs` when a runtime surface changes or the boundary is unclear.
6. When a PR is requested, open it with behavior changed, intentionally unchanged behavior, validation, and risks.
7. Keep direct-to-main commits small and verified; refresh local `main` before starting work that depends on the remote baseline.

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
