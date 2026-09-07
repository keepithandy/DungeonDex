# Loot, Return, Town, and Mobile Milestones

## Loot comparison

Inventory cards now identify the item currently equipped in the same slot and show the score difference before an action is selected. The existing Gear detail dialog remains the detailed comparison surface: it shows equipped and selected values, signed stat deltas, rarity, upgrade tier, set identity, and sell value. It remains read-only.

## Return receipt

Town now derives a Latest Return receipt from the first existing `player.runHistory` entry after a safe extraction. It reports the secured location, next start, banked rewards, kills, loot count, and up to three recovered names. Its buttons only navigate to the established Gear and Guild Journal screens; they grant no rewards and do not alter extraction, pending rewards, equip, sell, retire, or save behavior.

## Town and mobile polish

The receipt gives returning players a compact next-step surface beside the existing Town controls. Its buttons participate in the global 44px touch contract and wrap to one column on the narrowest screens. Existing Enter Dungeon, Rest, Market, Forge, Contract, Charter, Gear, and Journal paths remain in place.

## Verification

- Interface/accessibility contracts cover inventory comparison context, read-only modal behavior, history-derived receipt content, route restriction, focus transfer, and complete public-control inventory.
- Public-browser verification extracts from D31-D40, reloads, checks the banked receipt, and follows its Journal action.
- Supported touch geometry passes at 390x844, 430x932, and 768x1024.

## Boundaries

No combat, scaling, rewards, drops, economy, save schema, loadouts, upgrades, entry routes, contracts, Talent, Debt, or Revisit behavior changed. Physical-device validation under GitHub issue #139 remains outstanding.
