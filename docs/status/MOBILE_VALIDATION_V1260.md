# v1.26.4.05 Mobile Validation Checklist

Use this checklist for the current Trophy Echo-only v1.26.4.05 release baseline. It is a visual/manual check, not a gameplay test plan.

## Target widths

Inspect Town at the helper's realistic touch profiles:

1. 390 × 844
2. 430 × 932
3. 768 × 1024

The existing capture helper records those widths:

```powershell
node tools/capture_town_mobile_screenshots.mjs
```

It writes local captures to `archive/screenshots/town-mobile/`. The helper applies touch/mobile emulation before page initialization, reloads under each profile, and rejects a capture when viewport or touch-media state is wrong. A missing Chromium browser is a skip for the capture helper, not a gameplay failure.

Use the explicit fine-pointer mode for the narrow desktop/trackpad rail contract:

```powershell
node tools/capture_town_mobile_screenshots.mjs --fine-pointer
```

Fine-pointer captures write to `archive/screenshots/town-narrow-pointer/` and fail if the viewport reports touch/coarse-pointer media instead.

## Player-facing control inventory

This inventory covers the loaded public UI and groups dynamic controls by their live selector family, so every rendered merchant item, gear card, board action, and route instance inherits the same target contract. `.dd-devtools-btn` is the only intentional button exclusion from the global touch rule. Passive `.pill` labels are not actions and are not enlarged. Locked future Revisit lanes and the unloaded Vow prototype are outside the public surface. No live `<a>` controls are present.

| Surface | Live control families / selectors | Minimum touch target | Spacing and collision contract | Prior risk / current result |
|---|---|---:|---|---|
| Shell and navigation | `#saveBtn`, `#resetBtn`, `[data-screen]`, `.ddx-nav-toggle` | 44px; open routes 46px | Open drawer uses an 8px gap and scrolls inside the safe viewport. | Legacy toggle sizes were 24/30px and compact routes could fall to 31/34px. Final touch rules override them; the 768px Town title now clears the closed toggle. |
| Town entry and charters | `#startRunBtn`, `#restBtn`, `[data-charter-start]` | 44px; narrow primary 52px and Rest 70px | Narrow Town actions stack without collisions; Rest fields retain their own grid areas. | No remaining clipping or collision at 390, 430, or 768px. |
| Town economy and boards | `[data-debt-borrow]`, `#repayDebtBtn`, `#refreshMerchantBtn`, `[data-merchant-upgrade]`, `[data-buy]`, `[data-buy-district]`, `[data-start-contract]`, `#forgeBtn`, `#salvageForgeBtn`, `[data-forge-slot]`, `[data-temper-slot]`, `#claimSparkWritBtn`, `#refreshSparkWritBtn`, `#claimEliteContractBtn`, `[data-start-revisit]`, `[data-complete-trophy-echo]`, `button[disabled]` | 44px | `.ddx-action-row`, `.item-actions`, `.inline-actions`, and wrapped grids keep 8px separation where actions share a row. | Dynamic mini buttons previously inherited smaller desktop sizing; the final coarse-pointer rule covers every rendered instance. |
| Run and combat | `#runFromIdleBtn`, `[data-run-event]`, `[data-action]` | 44px; combat actions 46px | Attack, Ashburst, Guard, and Extract remain four equal in-flow columns with a 6px gap. | Final combat owner prevents controls from covering combat text. |
| Gear filters, actions, and inspection | `#slotFilter`, `#rarityFilter`, `#sortFilter`, `#searchFilter`, `#sellJunkGearBtn`, `#sellAllGearBtn`, `#retireArchiveBtn`, `[data-equip]`, `[data-sell]`, `[data-retire]`, `[data-gear-detail-trigger]` | 44px | Item actions wrap; pointer and keyboard inspection share the same read-only detail action. | Form controls, bulk actions, mini actions, and role-buttons are all included by the final touch rule. |
| Modals, Archive, and settings | `#introModalEnterDungeonBtn`, `#introModalContinueRunBtn`, `#introModalCloseBtn`, `[data-gear-detail-close]`, `[data-gear-detail-compare]`, `.trophy-tab`, `#clearCacheReloadBtn` | 44px | Modal bodies scroll inside the dynamic viewport; visible close controls remain reachable. | Mini close controls no longer retain the older 36px desktop minimum on touch. |

## Contrast audit record

These source-level checks use a 4.5:1 minimum for small text and composite alpha text before measuring it. The listed backgrounds are conservative bright endpoints derived from the current Town, combat, Journal, and modal gradients; actual darker endpoints produce equal or higher ratios. “Previous” records the effective pre-v1.26.4 declaration where one existed. Unchanged pairs are included to prove that the full required surface was checked, not to imply every color needed adjustment.

| Surface | Selector / state | Previous foreground | Current foreground | Conservative bright surface | Previous ratio | Current ratio | Non-color cue / result |
|---|---|---|---|---|---:|---:|---|
| Town | `.rest-cost-chip.rest-cost-low` | `rgba(255,210,210,.92)` | `#ffd0ca` | `#1e160f` | 11.20:1 | 12.85:1 | Cost text remains labelled and the border also changes. Pass. |
| Combat | `.feed-chip-danger` | `#ffb0a4` | `#ffd0ca` | `#1b120e` | 10.53:1 | 13.28:1 | Feed text names the event and the chip retains a distinct border. Pass. |
| Gear | `.rarity-*` six-color minimum | Old palette minimum | Current palette minimum | `#1e160f` | 8.84:1 | 10.48:1 | Printed rarity name plus a `currentColor` border; color is not the only cue. Pass. |
| Journal / Archive | `.run-history-meta-grid span` | `rgba(239,241,247,.78)` | `rgba(244,236,223,.74)` | `#22180f` | 9.74:1 | 8.58:1 | The warmer metadata treatment is lower but remains well above AA and stays structurally separate from body copy. Pass. |
| Intro modal | `.threshold-roadmap-copy` | `rgba(240,234,222,.76)` | unchanged | `#0a0c12` | 9.54:1 | 9.54:1 | Roadmap headings and rows provide structure beyond color. Pass. |
| Gear modal | `.gear-detail-kicker` | `rgba(245,222,180,.72)` | unchanged | `#1e1912` | 7.42:1 | Uppercase kicker, title, and tag structure distinguish the field. Pass. |
| Disabled controls | `button:disabled`, `[aria-disabled="true"]` | Whole-control `opacity:.42`; no stable pair | `rgba(247,239,226,.72)` | `#1e160f` | Not comparable | 8.53:1 | Dashed border, full element opacity, and `not-allowed` cursor provide non-color cues. Pass. |

## Manual visual checks

### Side rail

- At 390px and 430px, confirm the small left-arrow drawer button remains visible with the rail closed and clear of top/bottom safe areas and browser/app controls.
- Open and close the rail once. Confirm route labels become reachable and no active screen button is covered.
- At 768px, confirm route access remains readable and the closed rail does not obscure Town content.
- Confirm every existing navigation destination remains visible/tappable in its established order.

### Town and Lowfire Board

- Open Town and confirm the main headings remain readable: Lowfire Market, Lowfire Forge, and Lowfire Board.
- In the Lowfire Board, confirm the order is Warden Objectives, Trophy Echo/Revisit, then the Lowfire Elite Board.
- Confirm Trophy Echo is the only Revisit lane shown. The locked state should request boss trophy or boss record history; it must not expose other Revisit lanes as available.

### Rest and Town actions

- Confirm current HP, rest effect, coin cost, and action state remain visually distinct without wrapping or overflow.
- Confirm Town action groups use consistent spacing/radius/surface treatment and preserve their existing labels, order, and handlers.
- Check existing Town buttons/links for comfortable tap size and collision-free spacing.

### Combat controls

- Confirm Attack, Ashburst, Guard, and Extract remain visible without covering combat text.
- Confirm their established order/actions remain unchanged at every profile.

### Gear surfaces

- Open the Merchant Gear Upgrade panel and confirm its item names, upgrade level, cost, and action state are readable without horizontal clipping.
- Open the Gear tab and inspect one visible equipped or inventory gear card. Confirm the read-only detail modal fits the viewport, can be dismissed, and does not sit behind the side rail.

### Journal, Archive, and modals

- Use a long item name/history entry and confirm words, metadata, and lore wrap without horizontal scrolling.
- Open an existing detail/intro/inspection modal. Confirm focus enters it, background scrolling is locked only while open, Escape/visible close behavior works where supported, and focus returns to the opener.
- Confirm narrow-height modal content scrolls and close controls remain reachable.

### Contrast and non-color cues

- Confirm critical status, rarity, disabled, and error/success text remains readable against its background.
- Confirm state meaning is not communicated by color alone.

## Smoke checks

Run these separately from the visual inspection:

```powershell
node tests/smoke/smoke_revisit_routes_v173.mjs
node tests/smoke/smoke_enter_dungeon_runtime_v1.mjs
node tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs
node smoke_compact_suite.mjs
```

The smoke checks protect runtime contracts. They do not replace checking tap targets, clipping, layering, or readability on a mobile device.

## Local verification record — 2026-07-18

- Touch-emulation captures completed at 390×844, 430×932, and 768×1024; the closed rail, upper Town headings, stacked Rest/action hierarchy, and left-edge clearance were inspected without remaining overlap or clipping.
- Lowfire Board order and Trophy Echo-only availability were verified by the focused Revisit/public smoke contracts; the Board sits below the visible area of the viewport-limited captures and was not claimed as visually inspected.
- Fine-pointer captures also completed and were inspected at all three profiles; the closed rail remained separate from the Town content gutter.
- `node tests/smoke/smoke_mobile_layout_contracts_v1264.mjs`: the then-current 14/14 checks passed.
- `node tests/smoke/smoke_interface_accessibility_v1264.mjs`: 19/19 passed.
- `node tests/smoke/smoke_enter_dungeon_runtime_v1.mjs`: 11/11 passed.
- `node smoke_compact_suite.mjs`: 41/41 passed after integrating the Town runtime-cleanup smoke.
- Real-device/Textastic drawer tapping, an open-rail visual pass, and physical keyboard interaction were not run; those remain explicit handoff checks.

## Completion verification record — 2026-07-23

- Fresh touch captures completed at 390×844, 430×932, and 768×1024. The audit found the closed toggle covering the 768px `Lowfire District` title; the scoped tablet-touch clearance rule was then applied and the recapture is clear.
- Fresh fine-pointer captures completed at all three profiles without Town-content overlap.
- The loaded public control families above were reconciled against their source owners, and no live anchor control was found.
- The seven critical contrast pairs above were recomputed from their current source declarations with alpha compositing.
- `node tests/smoke/smoke_mobile_layout_contracts_v1264.mjs`: 16/16 passed.
- `node tests/smoke/smoke_interface_accessibility_v1264.mjs`: 21/21 passed.
- `node smoke_compact_suite.mjs`: 43/43 passed.
- Real-device/Textastic drawer tapping and physical keyboard interaction were not run; they remain manual handoff checks and are not being represented as completed.

## Report format

Record:

- width checked;
- rail closed/open result;
- Town and Lowfire Board order result;
- Trophy Echo visibility result;
- merchant and gear-detail readability result;
- rest/combat/Journal/modal/touch-target/contrast result;
- safe-area and browser/app-control clearance result;
- any covered button, clipping, delayed response, or layout shift.

Do not change side-rail behavior, Revisit placement, Revisit lanes, save data, combat, rewards, or gear-upgrade behavior while performing this checklist.
