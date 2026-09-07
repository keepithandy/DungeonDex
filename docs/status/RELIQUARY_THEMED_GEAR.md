# Drowned Reliquary Themed Gear Milestone

## Scope

Raw depths D31-D40 now give normal, elite, and boss gear a Drowned Reliquary presentation through the existing ten equipment slots. Each slot has a fixed identity name pattern and existing `maker`, `theme`, `tags`, and `summary` fields. The implementation adds no slot, rarity, affix, set, reward, or save-system framework.

## Protected behavior

- Gear generation still rolls the same base, prefix, suffix, maker, theme, rarity, stats, rating, value, and item ID before the presentation override.
- The override occurs after those rolls and consumes no extra random values. Outside D31-D40 and non-dungeon sources retain their prior presentation.
- Stat budgets, combat math, scaling, rewards, drop rates, loadouts, upgrades, inventory behavior, normalization, and save schema are unchanged.

## Verification

- `smoke_drowned_reliquary_vertical_slice_v1281.mjs` compares every slot and normal/elite/boss source against pinned main, covering 1,900 seeded comparisons, normalization, item ID format, outside-band presentation, and random-call counts.
- `smoke_boss_scaling_matrix_v1.mjs` retains its combat, rewards, drops, boundaries, and adjacent-normal signatures. Its fixture signature records the intended presentation change.
- The public Reliquary browser path saves and reloads themed gear and confirms the Drowned Reliquary maker is visible in Gear.

## Remaining work

Loot comparison, return clarity, Town/mobile polish and Journal/world reaction are now source-complete. Automated release preparation is recorded in `RELEASE_CANDIDATE_V128.md`; physical-device validation under the recorded GitHub issue #139 remains a release gate.
