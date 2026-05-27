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

## v1.3.42 content registry audit

- `tools/audit_content_registries.py` maps likely content-like registries in `app.js` without executing the game or changing project files.
- The audit is preparation only. It does not introduce runtime JSON loading, move content out of `app.js`, or change save/storage behavior.
- Future extraction should start with display-only strings and avoid balance, merchant, charter, combat, reward, and save-state logic.
