# DungeonDex Data Planning

This folder is planning space only. DungeonDex still runs as a plain browser HTML/CSS/JS game from `index.html` with no build step and no runtime data loading.

Future passes may consider moving authored content into structured data files such as:

- `items.json`
- `enemies.json`
- `affixes.json`
- `districts.json`
- `shops.json`
- `relics.json`
- `vows.json`

No JSON files are loaded by the game in this pass. Do not add `fetch()` calls, module imports, or any dependency on external data files until the loading behavior has been designed and tested for `file://`, Koder, itch, GitHub Pages, and mobile browsers.
