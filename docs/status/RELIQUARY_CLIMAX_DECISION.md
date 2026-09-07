# Reliquary climax: decision before implementation

Primary category: Audit / explicitly requested design documentation. Baseline is local `main` at `60117cc`, v1.28.2; the alternatives below describe the historical decision point; Option A was subsequently selected and implemented as recorded next.

## Selected implementation

Option A was selected and implemented as a narrow source patch on `work/reliquary-d45-conclusion`. It adds only the D45 Gravetoll Bell conclusion and a derived briefing for existing contracts whose normal target maps to raw D31-D40. It does not rename or add a boss, trophy, contract, route, reward, save field, or boss slot. Boss/cadence and contract-lifecycle controls plus the loaded public-browser presentation passed.

## Verified constraints

System 06 creates bosses when raw depth is divisible by `BOSS_INTERVAL * DEPTH_CHAPTERS_PER_THREAT_STEP` (5 * 3 = 15). The adjacent real slots are D30 and D45, not D40. System 04's named-floor lookup uses threat depth: D45 maps to the existing `Ashgate Butcher Step`, and system 00's third trophy remains `Gravetoll Bell`. D41 is already Cinderbone Halls. The separate lore chapter UI cadence is not authority for spawning a boss.

System 03 generates contract targets three to eight threat floors ahead and skips multiples of five. Existing target floors 11, 12, 13 and 14 can begin at raw D31, D34, D37 and D40. An accepted hunt appears once at its matching threat floor, provided it has not expired or spawned. Its override replaces ordinary district identity; completion and claim match the exact accepted contract. It is not a guaranteed D40 encounter and must not be described as one.

## Concrete options

| | A: D45 narrative conclusion (recommended) | B: D40 descent conclusion |
|---|---|---|
| Player experience | The drowned bells foreshadow the existing D45 encounter beyond the Reliquary; the Gravetoll Bell provides the thematic connection. | Completing the band closes its story through a short departure line; the next boss remains unrelated. |
| Boss treatment | Keep `Ashgate Butcher Step`, D45, trophy ID/name and all stats. Add one contextual line: "Beyond the flooded doors, the Gravetoll Bell calls in what the drowned could not collect." This is a lore connection, not a renamed or added boss. | No new boss identity or boss claim. Departure: "The last sealed bell falls silent behind you. Cinderbone waits above the black water." |
| Contract tie-in | When an existing offer's actual target lies in D31-D40, append a Reliquary location briefing: "The mark waits among the sealed bells. Follow the writ's listed location." Keep its name, ID, rolled location, risks, payout and writ. | Same conditional existing-contract briefing; no forced end-of-band hunt. |
| Scope | Systems 04/11 for contextual boss copy; system 03's offer presentation only; tests/docs. A later Journal patch may reflect the actual existing trophy record. | System 04 departure copy and existing rendering owner; system 03 offer presentation only; tests/docs. |
| Tradeoff | Gives a boss-linked conclusion outside the district without moving its boundary. Requires accepting a narrative connection instead of adding a boss. | Keeps the story entirely within the district, but explicitly defers the requested boss-linked climax. |

Neither option adds a boss slot, renames an existing boss/trophy, invents a new route, forces contract RNG, changes numeric values, creates rewards or adds save fields. If a distinct new named boss is essential, the current constraints need a separate owner decision; no hidden replacement is proposed.

## Acceptance before committing an implementation

Compare boss catalog, cadence, trophies, numeric generation, RNG, rewards and 36,000-fight signatures with the no-change control. Exercise all three current contracts with in-band and out-of-band targets, one-active rejection, exact-target completion, failed/expired cases, one-time claim and active/completed reloads. Verify empty and historical saves, public boss/contract copy, mobile wrapping, keyboard focus and full compact suite. No implementation until the owner chooses the narrative resolution.
