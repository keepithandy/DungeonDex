# DungeonDex Release Checklist

Use this short checklist before committing a DungeonDex patch.

## Version Authority
- `VERSION.md` is the public build authority.
- `CHANGELOG.md` is the permanent release history.
- `DUNGEONDEX_CURRENT_NOTES.md` is the current working summary.
- Runtime labels, cache labels, and internal module labels must not replace those files as the source of truth.
- Keep visible version labels short and aligned with the authority files.

## Quick Checks
Run the checks that match the patch scope:

```powershell
git status --short
git diff --check
node --check app.js
node --check sw.js
node --check js/systems/21_build_label_guard.js
node --check js/systems/30_passive_activation_gate_hotfix.js
node --check js/systems/31_revisit_activation_surface_lockdown.js
node --check js/systems/33_talent_hunter_board_clarity_spend.js
node --check smoke_talent_v150b.mjs
node --check smoke_debt_collector_v169.mjs
node --check smoke_revisit_routes_v173.mjs
node .\smoke_talent_v150b.mjs
node .\smoke_debt_collector_v169.mjs
node .\smoke_revisit_routes_v173.mjs
```

For documentation-only audits, this command list is the expected safety net for the next feature patch; do not change runtime behavior just to satisfy the checklist.

## Protected Stability Surfaces
- Controlled Talent spending: `hunter_board_clarity` is the only live Talent spend target. Any second node, broad spend UI, respec, refund, unlock tree, or passive stat/economy/reward effect needs its own explicit issue.
- Read-only/passive helpers: Talent previews, award previews, passive contracts, readiness reports, and activation-gate dry runs must not mutate save state unless the issue explicitly names a controlled mutation helper.
- Debt Collector clarity prep: display-copy helpers may clarify wording only. They must not change debt math, pressure, repayment, wallet, economy, combat, rewards, save shape, or Revisit state.
- Revisit planning lock: Trophy Echo, Famous Gear Memory, Rival Trace, Debt Pressure, and Board Echo remain planning/readiness surfaces only; no entry, start, claim, complete, reward, unlock, route, or mutation affordance should appear.
- Service worker/cache labels: `CACHE_NAME`, build query strings, visible title labels, and `VERSION.md` must stay aligned during versioned release patches. Documentation-only audits should not change service worker behavior or cache labels.
- Classic script-load ordering: `index.html` is the source of truth for dependency order. Keep the numeric file map in `js/systems/README.md` descriptive; do not reorder runtime scripts as cleanup.
- Smoke-test safety net: Talent, Debt Collector, and Revisit smoke files define the current protected behavior boundaries. Update smoke coverage only when the issue scope explicitly calls for it.

## Guardrails
- Preview-only systems must stay preview-only unless the issue explicitly activates them.
- Revisit routes are not playable yet.
- The broad Talent tree UI remains locked and preview-only.
- Do not add new Talent nodes, respec, passive stat effects, reward multipliers, combat effects, economy effects, or Revisit effects unless the issue explicitly says so.
- Service worker and cache label changes should only happen during versioned release patches.

## Final Pass
- Confirm the version label set is aligned before you commit.
- Keep the checklist short and practical.
- Do not add extra release process overhead unless the patch truly needs it.
