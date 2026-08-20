# DungeonDex v1.28.0 Rarity and Progression Audit

## Decision

v1.28.0 records the active loot economy before the larger v1.28 content work. It does not tune rarity, drops, scarcity, set chances, rewards, combat, or progression.

The executable authority for this report is `tests/smoke/smoke_rarity_progression_audit_v1280.mjs`. That smoke loads systems 00-08 in runtime order and calls the real implementation; it does not maintain a copied balance formula.

## Current Runtime Contract

- Rarity ladder: Common, Uncommon, Rare, Epic, Legendary, Mythic.
- Mythic-set pool: four sets, five existing equipment slots per set, twenty equally selectable set/slot combinations.
- Set gate: raw D40 plus `safeExtractDepth >= 40`.
- D40 per-gear-drop set chance: `1.2%` normal, `2.8%` elite, `7%` boss.
- Non-set Mythic rolls begin at threat 15 for normal and boss sources. Raw D43 is the first depth that maps to threat 15.
- The first deep-loot scarcity band begins at raw D40.

## Measured Checkpoints

The rarity columns below include the Mythic-set decision that runs before ordinary gear generation. `Gear / encounter` includes the guaranteed first boss drop and expected second-drop chance for bosses.

| Depth | Source | Gear / encounter | Legendary / gear | Mythic / gear | Set / gear | Legendary + Mythic / encounter |
|---:|---|---:|---:|---:|---:|---:|
| D15 | Normal | 0.4200 | 0.00% | 0.00% | 0.00% | 0.0000 |
| D15 | Elite | 0.1200 | 0.00% | 0.00% | 0.00% | 0.0000 |
| D30 | Normal | 0.4800 | 1.00% | 0.00% | 0.00% | 0.0048 |
| D30 | Elite | 0.1600 | 2.00% | 0.00% | 0.00% | 0.0032 |
| D39 | Normal | 0.5200 | 1.00% | 0.00% | 0.00% | 0.0052 |
| D39 | Elite | 0.1600 | 2.00% | 0.00% | 0.00% | 0.0032 |
| D40 | Normal | 0.4914 | 0.77% | 1.20% | 1.20% | 0.0097 |
| D40 | Elite | 0.1512 | 1.61% | 2.80% | 2.80% | 0.0067 |
| D40 | Boss | 1.3377 | 3.22% | 7.00% | 7.00% | 0.1367 |
| D43 | Normal | 0.4914 | 1.58% | 1.83% | 1.20% | 0.0168 |
| D43 | Elite | 0.6804 | 3.31% | 2.80% | 2.80% | 0.0416 |
| D43 | Boss | 1.3377 | 9.23% | 8.50% | 7.00% | 0.2371 |
| D120 | Normal | 0.4654 | 1.36% | 2.46% | 2.00% | 0.0178 |
| D120 | Elite | 0.6444 | 2.95% | 3.60% | 3.60% | 0.0422 |
| D120 | Boss | 1.3202 | 8.71% | 9.00% | 7.80% | 0.2338 |
| D800 | Normal | 0.4056 | 1.01% | 2.80% | 2.50% | 0.0154 |
| D800 | Elite | 0.5616 | 2.18% | 4.50% | 4.50% | 0.0375 |
| D800 | Boss | 1.2730 | 7.10% | 10.53% | 10.00% | 0.2244 |

The full smoke covers 33 combinations at D1, D15, D30, D39, D40, D42, D43, D45, D80, D120, and D800 for normal, elite, and boss sources.

## Findings

### 1. Elite rewards have a hard threat-15 crossover

Elite gear frequency is lower than normal gear frequency through threat 14. At D30 it is `16%` versus `48%`; under the first scarcity band at D40 it is `15.12%` versus `49.14%`. At D43, which maps to threat 15, elite frequency jumps to `68.04%` while normal remains `49.14%`.

Elite conditional rarity is better, but before the crossover that advantage does not always offset the lower gear frequency. At D30, expected Legendary-or-better items are `0.0032` per elite encounter versus `0.0048` per normal encounter.

### 2. The D40 unlock and scarcity boundary collide

D40 is both the first eligible Mythic-set depth and the first deep-scarcity depth. The set route makes Mythic drops newly possible, while ordinary high-rarity weights and gear frequency are reduced on the same step. This is internally consistent but difficult for a player to read without explicit feedback.

### 3. Non-set Mythic availability arrives at D43

At D40-D42, the set route is the only Mythic path for normal and boss drops. At D43, normal and boss tables reach threat 15 and allow non-set Mythic rolls. This creates another sharp three-depth transition immediately after the D40 gate.

### 4. Four uniform sets create a long duplicate tail

Across 30,000 deterministic trials, the first complete five-piece set required:

- median: 24 set drops;
- p90: 36 set drops;
- p95: 40 set drops;
- average: 24.69 set drops;
- average duplicates at completion: 10.49.

Those are set drops, not encounters. At the D40 rates, 24 expected set drops correspond to roughly 4,070 normal encounters, 1,260 post-crossover elite encounters, or 256 boss encounters if each source is considered in isolation. A real run mixes sources, so these are scale indicators rather than a playtime prediction.

### 5. Deep scarcity remains bounded but slowly compresses high-tier yield

By D800, expected Legendary-or-Mythic yield per encounter is lower than at D120 for all three audited sources. The caps prevent the curve from collapsing, but future content should not add another blanket scarcity multiplier without a new simulation.

## v1.28.4 Balance Gate

v1.28.4 should treat reward-curve balance as one focused problem and compare proposed values against this file. Before changing the runtime:

1. Measure elite encounter frequency as well as per-elite drops; do not balance only the conditional rarity table.
2. Model a smoother threat-5/threat-10/threat-15 elite gear curve and require elite high-tier yield to communicate its stronger source status without flooding total loot.
3. Decide whether the D40 scarcity/set collision is intentional. If it remains, make the transition legible; if it changes, alter only one boundary or multiplier family at a time.
4. Compare no duplicate relief, targeted missing-piece bias, and a bounded pity rule for Mythic sets. Any relief must remain deterministic, save-compatible, and non-exploitable.
5. Rerun the boss matrix, compact suite, Merchant Gear Upgrade coverage, contract coverage, and package-source audit after any tuning.

## Intentionally Unchanged in v1.28.0

- All rarity table weights, caps, multipliers, and item stat multipliers.
- All normal, elite, boss, merchant, forge, and Mythic-set drop chances.
- Deep-loot scarcity bands and charter warmup behavior.
- Mythic-set definitions, slots, bonuses, selection, and gate.
- Combat, monster and boss scaling, rewards, economy, saves, upgrades, dungeon entry, Debt, Talent, progression, and Revisit behavior.
