# DungeonDex Release Checklist

Use this short checklist before committing a DungeonDex patch.

## Version Authority

- `VERSION.md` is the public build authority.
- [`docs/VERSION_CACHE_AUTHORITY.md`](VERSION_CACHE_AUTHORITY.md) defines how the semantic version and build/cache slug flow from that authority into runtime, cache, smoke, and package tooling.
- `CHANGELOG.md` is the permanent release history.
- `docs/status/CURRENT_NOTES.md` is the current working summary.
- Runtime labels, cache labels, and internal module labels must not replace those files as the source of truth.
- Keep visible version labels short and aligned with the authority files.

## Asset Provenance Gate

Before a public release or marketing refresh:

```powershell
git status --short --untracked-files=all
rg --files -g '*.png' -g '*.jpg' -g '*.jpeg' -g '*.webp' -g '*.avif' -g '*.gif' -g '*.svg' -g '*.ico' -g '*.bmp' -g '*.mp3' -g '*.wav' -g '*.ogg' -g '*.flac' -g '*.m4a' -g '*.aac' -g '*.woff' -g '*.woff2' -g '*.ttf' -g '*.otf'
```

- Review every untracked asset before staging it.
- Confirm every listed visual, audio, font, screenshot, and marketing file has an exact-path row in [`docs/ASSET_INVENTORY.md`](ASSET_INVENTORY.md).
- Require creator/source, license/ownership, modification notes, and usage location for every manifest row.
- Keep placeholders and third-party material explicit; do not silently treat unknown or incomplete provenance as release clearance.
- Apply the [Northline Studio asset licensing policy](../ASSETS_LICENSE.md). An asset-policy entry documents project handling; it does not recreate missing source/license evidence.

## Quick Checks

Run the checks that match the patch scope:

```powershell
git status --short
git diff --check
python tools/check_dungeondex_package.py --source .
node --check app.js
node --check sw.js
node --check js/systems/21_build_label_guard.js
node --check js/systems/30_passive_activation_gate_hotfix.js
node --check js/systems/31_revisit_activation_surface_lockdown.js
node --check tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs
node --check tests/smoke/smoke_debt_collector_v169.mjs
node --check tests/smoke/smoke_revisit_routes_v173.mjs
node .\tests\smoke\smoke_merchant_gear_upgrades_v1238.mjs
node .\tests\smoke\smoke_debt_collector_v169.mjs
node .\tests\smoke\smoke_revisit_routes_v173.mjs
```

For documentation-only audits, this command list is the expected safety net for the next feature patch; do not change runtime behavior just to satisfy the checklist.

## Stability Hotfix / Cache Recovery Checks

Use this when a patch follows a lag report, broken mobile interaction, stale service-worker behavior, or rollback/no-op patch:

- Prefer restoring responsiveness before continuing feature placement work.
- If disabling unstable glue code, keep the disabled file as an explicit no-op marker instead of deleting a loaded script path unless script-order cleanup is the issue.
- If a service-worker cache key changes, align `CACHE_NAME`, `BUILD_QS`, `VERSION.md`, `CHANGELOG.md`, `docs/status/CURRENT_NOTES.md`, `app.js`, and `js/systems/21_build_label_guard.js`.
- Do not use post-render `MutationObserver` relocation loops for source-render placement problems.
- If `index.html` still contains stale static labels or stale query strings, either align them in the same version pass or call out the remaining conflict before merge.

## Protected Stability Surfaces

- Merchant gear upgrades: keep upgrades limited to equipped weapon and armor pieces, fixed costs, and a `+3` cap unless a focused issue explicitly expands that surface.
- Old Talent compatibility: legacy `talentLedger`, earning, learned-node, preview, and passive helper paths must not restore gameplay effects or become the active progression UI without an explicit issue.
- Debt Collector clarity prep: display-copy helpers may clarify wording only. They must not change debt math, pressure, repayment, wallet, economy, combat, rewards, save shape, or Revisit state unless a focused debt issue explicitly targets that behavior.
- Revisit lanes: Trophy Echo is the only current live memory lane. Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure are removed from the active Revisit surface. Trophy Echo must remain a town/archive memory loop, not a reward, combat, farming, or progression loop.
- Service worker/cache labels: `CACHE_NAME`, build query strings, visible title labels, and `VERSION.md` must stay aligned during versioned release patches. Documentation-only audits should not change service worker behavior or cache labels.
- Public package output: itch-ready or release packages must not ship stale devtool/cache references, old build labels, temp files, or unrelated repo artifacts.
- Classic script-load ordering: `index.html` is the source of truth for dependency order. Keep the numeric file map in `js/systems/README.md` descriptive; do not reorder runtime scripts as cleanup.
- Smoke-test safety net: Talent, Debt Collector, Revisit, Journal, and compact smoke files define the current protected behavior boundaries. Update smoke coverage only when the issue scope explicitly calls for it.

## Guardrails

- Preview-only systems must stay preview-only unless the issue explicitly activates them.
- Trophy Echo is the only live Revisit memory lane.
- Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure must remain inactive unless a focused issue explicitly restores a lane.
- The Talent tree is deprecated compatibility-only. Merchant gear upgrades are the active progression surface.
- Do not reactivate Talent nodes, respec, passive stat effects, reward multipliers, combat effects, economy effects, or Revisit effects unless the issue explicitly says so.
- Service worker and cache label changes should only happen during versioned release or stability patches.

## Final Pass

- Confirm the version label set is aligned before you commit.
- Keep the checklist short and practical.
- Do not add extra release process overhead unless the patch truly needs it.
