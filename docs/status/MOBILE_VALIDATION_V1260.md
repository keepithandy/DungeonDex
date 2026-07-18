# v1.26.4 Mobile Validation Checklist

Use this checklist for the current Trophy Echo-only v1.26.4 baseline. It is a visual/manual check, not a gameplay test plan.

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
- `node tests/smoke/smoke_mobile_layout_contracts_v1264.mjs`: 14/14 passed.
- `node tests/smoke/smoke_interface_accessibility_v1264.mjs`: 19/19 passed.
- `node tests/smoke/smoke_enter_dungeon_runtime_v1.mjs`: 11/11 passed.
- `node smoke_compact_suite.mjs`: 41/41 passed after integrating the Town runtime-cleanup smoke.
- Real-device/Textastic drawer tapping, an open-rail visual pass, and physical keyboard interaction were not run; those remain explicit handoff checks.

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
