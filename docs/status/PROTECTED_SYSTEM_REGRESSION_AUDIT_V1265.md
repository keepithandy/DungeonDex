# v1.26.5 Protected-System Regression Audit

## Audit identity

| Field | Result |
|---|---|
| Audit issue | #133 Final protected-system regression audit |
| Baseline branch | `main` |
| Baseline commit | `21792c53d8cf59090255c035d77b4f3f6f114b45` |
| Version authority | `v1.26.4.06 Mobile Interface Audit Closure` |
| Build/cache label | `1.26.4.06-mobile-interface-audit-closure` |
| Audit result | Pass - no unauthorized protected-system drift found by the evidence below. |

## Evidence matrix

| Protected contract | Evidence | Result |
|---|---|---|
| Combat math, player damage/HP, monster and boss scaling, rewards, drops, and normalization | `node tests/smoke/smoke_boss_scaling_matrix_v1.mjs` | Pass - 20 named bosses, 60 legal progression fixtures, 36,000 real combat fights, and 18/18 post-Boss-2 readiness fixtures passed. |
| Core Journal records and read-only presentation | `node tests/smoke/smoke_journal_v1233.mjs` | Pass. |
| Trophy Echo behavior and inactive Revisit availability | `node tests/smoke/smoke_revisit_routes_v173.mjs` and `node tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs` | Pass - 7/7 Trophy Echo-only contracts; no Famous Gear, Rival, Board, or Debt Revisit starts on the active public surface. |
| Merchant Gear Upgrade prices, caps, bonuses, save fields, and persistence | `node tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs` | Pass. |
| Debt borrowing, repayment, pressure, save normalization, and combat neutrality | `node tests/smoke/smoke_debt_talent_compatibility_v1265.mjs` | Pass - Debt contract fixture verifies borrowing, partial/full repayment, collection threshold blocking, pressure relief, return pressure, persistence, and no combat-state mutation. |
| Talent compatibility-only behavior | `node tests/smoke/smoke_debt_talent_compatibility_v1265.mjs` | Pass - legacy Talent data repairs to preview-only state with zero points, zero bonuses, no earn/spend/unlock path, and no gameplay/live-state mutation. |
| Dungeon entry and active Revisit surface | `node tests/smoke/smoke_enter_dungeon_runtime_v1.mjs` | Pass - 11/11. |
| Public routes, modal/accessibility contracts, control inventory, and current Revisit copy | `node tests/smoke/smoke_interface_accessibility_v1264.mjs` | Pass - 21/21. |
| Mobile route geometry, safe-area behavior, and public route order | `node tests/smoke/smoke_mobile_layout_contracts_v1264.mjs` | Pass - 18/18. |
| Script-load ordering, version/cache authority, package derivation, and public DevTools exclusion | `node tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs` | Pass - 34 direct assets and 9 dynamic loads align. |
| Source runtime wiring and local-reference integrity | `python tools/check_dungeondex_package.py --source .` | Pass - 51 paths checked, 0 warnings. |
| Strict staged-package contents, extracted public runtime, and public Journal/dungeon loop | `node tests/smoke/smoke_package_build_extraction_v1265.mjs` | Pass - 11/11; strict staged and extracted checks passed with no development-only runtime files, console failures, runtime failures, or local-request failures. |
| Cross-system release regression net | `node smoke_compact_suite.mjs` | Pass - 49/49. |

## Focused audit repair

The previous compact entry for Debt Collector was a retired placeholder and did
not exercise active Debt behavior. This audit replaces that runner entry with
`tests/smoke/smoke_debt_talent_compatibility_v1265.mjs`.

The new smoke starts the actual public runtime with DevTools disabled and uses
only isolated in-memory fixtures. It proves active Debt contracts and current
Talent compatibility behavior without changing the live runtime state or a
player save. It is a test-only correction; no gameplay contract changed.

## Intentionally unchanged

- Combat, player damage/HP, monster and boss scaling, rewards, drops, XP, and
  gold formulas.
- Merchant Gear Upgrade costs, `+3` cap, bonuses, and persisted save fields.
- Save schema and normalization behavior.
- Enter Dungeon / Continue Run behavior, route IDs, and classic script order.
- Debt borrowing, repayment, pressure, wallet effects, and collection rules.
- Talent compatibility behavior: no earning, spending, unlock, bonus, or live
  progression path was activated.
- Trophy Echo mechanics/rewards and inactive Revisit lane availability.
- Version and cache labels.

## Remaining release note

The physical Textastic handoff passed, but its device metadata and screenshots
were not captured. That evidence-quality limitation remains recorded in
`docs/status/REAL_DEVICE_HANDOFF_V1265.md`; it is not a reported gameplay or
runtime defect.

This audit does not authorize the v1.26.5 version/cache update. #134 may begin
only after explicit release authorization.
