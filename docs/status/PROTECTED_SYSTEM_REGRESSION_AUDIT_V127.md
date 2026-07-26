# v1.27 Protected-System Release Audit

## Audit identity

| Field | Result |
|---|---|
| Audit issue | #144 Mobile, runtime, and protected-system release audit |
| Baseline branch | `main` |
| Baseline commit | `61afca47419a90ac36dbdb8cce7528937de7e609` |
| Version authority | `v1.26.6 Ashen Anvil Reinforcements` |
| Build/cache label | `1.26.6-ashen-anvil-reinforcements` |
| Audit result | Pass - the focused repair below is verified and no unauthorized protected-system drift was found. |

## Evidence matrix

| Contract | Evidence | Result |
|---|---|---|
| Elite Contract initial render, acceptance, exact target cue, ordinary-elite exclusion, fulfillment, save/reload, one-time claim, Journal history, and public runtime errors | `node tests/smoke/smoke_public_runtime_console_v1265.mjs` | Pass - 26/26 with DevTools disabled and no console, exception, rejection, asset, request, or development-only load failures. |
| Elite Contract lifecycle, matching-only completion, save repair, protected-state isolation, and read-only history | `node tests/smoke/smoke_elite_contract_lifecycle_v127.mjs` | Pass. |
| Guild Journal empty/rich states, contract outcomes, nontechnical copy, read-only output, and mobile wrapping | `node tests/smoke/smoke_journal_v1233.mjs` | Pass. |
| Interface semantics, focus, tap targets, control inventory, non-color cues, and Trophy Echo copy | `node tests/smoke/smoke_interface_accessibility_v1264.mjs` | Pass - 22/22. |
| Mobile layout, route order, safe areas, combat navigation, and Town hold shortcuts | `node tests/smoke/smoke_mobile_layout_contracts_v1264.mjs` | Pass - 19/19. |
| Closed touch-navigation geometry | `node tools/capture_town_mobile_screenshots.mjs --verify-geometry` | Pass at 390x844, 430x932, and 768x1024. |
| Browser-computed contrast | `node tests/smoke/smoke_computed_contrast_v1265.mjs` | Pass - 7/7. |
| Enter Dungeon / Continue Run behavior | `node tests/smoke/smoke_enter_dungeon_runtime_v1.mjs` | Pass - 11/11. |
| Merchant Gear Upgrade costs, caps, bonuses, equipment ownership, and persistence | `node tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs` | Pass. |
| Debt and Talent compatibility | `node tests/smoke/smoke_debt_talent_compatibility_v1265.mjs` | Pass - 4/4; no gameplay or live-state mutation. |
| Trophy Echo-only public Revisit surface | `node tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs` | Pass. |
| Version/cache authority, script order, assets, package derivation, and public DevTools exclusions | `node tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs` | Pass - 34 direct assets and 9 dynamic loads align. |
| Combat, player fixtures, monster/boss scaling, and reward contracts | `node tests/smoke/smoke_boss_scaling_matrix_v1.mjs` | Pass - 20 bosses, 60 legal fixtures, 36,000 fights, and 18/18 fully upgraded post-Boss-2 readiness fixtures. |
| Source runtime wiring and local references | `python tools/check_dungeondex_package.py --source .` | Pass - 51 paths checked, 0 warnings. |
| Source/strict package checker behavior | `python tests/smoke/smoke_package_checker_modes_v1265.py` | Pass - 8/8. |
| Temporary staged and extracted package integrity | `node tests/smoke/smoke_package_build_extraction_v1265.mjs` | Pass - 11/11; strict stage/extraction checks and extracted public runtime passed. |
| Cross-system regression net | `node smoke_compact_suite.mjs` | Pass - 51/51. |

## Focused audit repair

The hardened public runtime test found that available Elite Contract cards showed
`Where: Floor ?`. The card renderer was passing raw contract definitions instead
of the already-established resolved offer model.

The focused repair changes only that presentation path. Available cards now use
the existing model to show their resolved Floor, Room, and Chapter. Contract
IDs, target selection, target floor calculation, rewards, risk, combat, saves,
and claim behavior are unchanged. The browser smoke now fails if any available
card returns to `Floor ?`.

## Intentionally unchanged

- Combat math, player HP/damage, monster and boss scaling, rewards, drops, XP,
  gold formulas, and action timing.
- Elite Contract IDs, target selection, target floor calculation, payout values,
  payout caps, risk values, Bonus Writ rules, save fields, and claim behavior.
- Merchant Gear Upgrade costs, `+3` cap, bonuses, and persisted fields.
- Debt borrowing, repayment, pressure, wallet effects, and collection rules.
- Talent compatibility-only behavior.
- Trophy Echo mechanics/rewards and inactive Revisit availability.
- Enter Dungeon / Continue Run behavior, route IDs, script order, version, and
  cache labels.

## Release boundary

This audit does not authorize the v1.27 version/cache update, final package name,
tag, or upload. Those remain #145 work and require explicit owner authorization.
