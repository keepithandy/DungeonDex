# DungeonDex Schema Notes

These notes describe possible future data boundaries. They are not runtime schemas and do not change current gameplay, save data, balance, merchant behavior, combat behavior, dungeon progression, or mobile UX.

Potential content files:

- `items.json`: base item names, slots, maker tags, rarity metadata, and player-facing summaries.
- `enemies.json`: monster families, types, affixes, skills, boss labels, and lore snippets.
- `affixes.json`: elite modifier names, display text, and future non-balance metadata.
- `districts.json`: Lowfire and deeper district names, unlock floors, tone copy, and staging text.
- `shops.json`: district ware definitions, shelf metadata, and non-random shop copy.
- `relics.json`: mythic set metadata, relic naming, and set display copy.
- `vows.json`: future challenge or constraint metadata if vows are added later.

Restrictions for future extraction:

- Keep `index.html` able to launch the game with no build step.
- Do not make core gameplay depend on network access.
- Do not add external JSON loading until offline, `file://`, Koder, itch, GitHub Pages, and mobile behavior are verified.
- Preserve the current save format and localStorage keys unless a dedicated migration pass explicitly changes them.
- Treat any content extraction as a separate pass with focused regression testing.
