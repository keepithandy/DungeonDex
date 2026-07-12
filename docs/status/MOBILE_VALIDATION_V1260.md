# v1.26.0 Mobile Validation Checklist

Use this checklist for the current Trophy Echo-only baseline. It is a visual/manual check, not a gameplay test plan.

## Target widths

Inspect Town at:

1. 390px
2. 430px
3. 768px

The existing capture helper records those widths:

```powershell
node tools/capture_town_mobile_screenshots.mjs
```

It writes local captures to `archive/screenshots/town-mobile/`. A missing Chromium browser is a skip for the capture helper, not a gameplay failure.

## Manual visual checks

### Side rail

- At 390px and 430px, confirm the small left-arrow drawer button remains visible with the rail closed.
- Open and close the rail once. Confirm route labels become reachable and no active screen button is covered.
- At 768px, confirm route access remains readable and the rail does not obscure Town content.

### Town and Lowfire Board

- Open Town and confirm the main headings remain readable: Lowfire Market, Lowfire Forge, and Lowfire Board.
- In the Lowfire Board, confirm the order is Warden Objectives, Trophy Echo/Revisit, then the Lowfire Elite Board.
- Confirm Trophy Echo is the only Revisit lane shown. The locked state should request boss trophy or boss record history; it must not expose other Revisit lanes as available.

### Gear surfaces

- Open the Merchant Gear Upgrade panel and confirm its item names, upgrade level, cost, and action state are readable without horizontal clipping.
- Open the Gear tab and inspect one visible equipped or inventory gear card. Confirm the read-only detail modal fits the viewport, can be dismissed, and does not sit behind the side rail.

## Smoke checks

Run these separately from the visual inspection:

```powershell
node smoke_revisit_routes_v173.mjs
node smoke_enter_dungeon_runtime_v1.mjs
node smoke_merchant_gear_upgrades_v1238.mjs
node smoke_compact_suite.mjs
```

The smoke checks protect runtime contracts. They do not replace checking tap targets, clipping, layering, or readability on a mobile device.

## Report format

Record:

- width checked;
- rail closed/open result;
- Town and Lowfire Board order result;
- Trophy Echo visibility result;
- merchant and gear-detail readability result;
- any covered button, clipping, delayed response, or layout shift.

Do not change side-rail behavior, Revisit placement, Revisit lanes, save data, combat, rewards, or gear-upgrade behavior while performing this checklist.
