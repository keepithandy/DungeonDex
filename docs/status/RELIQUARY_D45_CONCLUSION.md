# Reliquary D45 conclusion and existing-contract briefing

Primary category: Content Expansion / Clarity. Starting point: local `main` at `6709301`; focused branch: `work/reliquary-d45-conclusion`. Version remains v1.28.2 Loadout Polish.

The existing D45 boss presentation now says: “Beyond the flooded doors, the Gravetoll Bell calls in what the drowned could not collect.” This links the D31-D40 Reliquary to its nearest existing boss without moving the D45 slot, changing its name, modifying the Gravetoll Bell trophy, or treating D40 as a boss.

An existing Elite Contract receives “The mark waits among the sealed bells. Follow the writ's listed location.” only when its normal target-floor mapping resolves to raw D31-D40 (threat floors 11 through 14). The player still receives the existing contract, target, target location, bonus writ, lifecycle, one-active limit, reward calculation, and one-time claim. The briefing is derived for presentation; it adds no saved field or migration. Out-of-band targets do not receive the copy.

Protected unchanged behavior: raw boss cadence, named boss catalog, trophy IDs/names, combat/scaling/reward/drop math, RNG use, contract target selection, payout, failure/expiry/claim behavior, save schema, loadouts, upgrades, routes, version/cache labels, and inactive systems.

Verification passed: system syntax; the 1,900 seeded Reliquary controls against pinned main; Elite Contract lifecycle smoke; public-browser rendering of the in-band/out-of-band briefing and visible D45 Gravetoll Bell label; the full compact suite, **57/57 with no skips**; and `git diff --check`. Physical-device issue #139 remains a release gate. No push, package, tag, upload, or version update is part of this patch.

Reviewer handoff: confirm the exact D45-only line, in-band mapping D31-D40 only, no changes to contract object mechanics, and no boss/catalog/reward/trophy drift. Confirm the public browser uses the loaded card/status markup rather than source-text matching.
