# Live itch.io Observation — v1.28.2

## Observation identity

- Date: 2026-09-07.
- Public page: `https://northline-studio.itch.io/dungeondex`.
- The public page reports an update at 2026-09-07 14:17 UTC and links the devlog `DungeonDex v1.28.2 — Loadout Polish`.
- The Run game surface opens `https://html-classic.itch.zone/html/19141802/index.html?v=1788793356`.
- The served shell identifies itself as **DungeonDex v1.28.2** and requests build/cache query **`1.28.2-loadout-polish`**.

## Result

**Blocked — verified live-release runtime failure.**

- The public HTML shell loads and displays Town navigation, but runtime state does not initialize: `S`, `render`, and `startRun` are undefined after document completion.
- Town remains on placeholder values such as `HP --/--`; Journal navigation does not activate the Journal screen.
- Direct observation of `js/systems/00_core_constants_data.js?build=1.28.2-loadout-polish` returns HTTP 404 from the live itch host. This required core file is referenced by the served `index.html`.
- The browser console also reports failed loads for Trophy Echo result detail, Gear Upgrade summary, Debt Pressure v1, Gear detail modal, and Gear Upgrade money-text cleanup.
- The public download list visible during the observation ends at `DungeonDex_v1.27_ItchReady (2).zip`; it does not list the v1.28.2 ZIP as a downloadable file. The HTML iframe and devlog are nevertheless labeled v1.28.2.

## Local comparison

- Local candidate: `archive/packages/DungeonDex_v1.28.2_ItchReady.zip`.
- Size: 396,820 bytes.
- SHA-256: `8A0F3404621AE9E4431C972CFB68DCF31193B501396A09AFF4428B64D2253D7F`.
- The local ZIP contains `index.html`, `app.js`, `js/systems/00_core_constants_data.js`, the other required system scripts, and runtime assets at the expected root-relative paths.
- This local package previously passed staged and clean-extracted strict audits plus an 11/11 extracted public-launch gate. The live 404 is therefore evidence about the currently hosted itch artifact/configuration, not proof of a source-code defect.

## Remaining live-release checks

Launch, cache freshness, navigation, and save continuity cannot pass while the core runtime files return 404. After an explicitly authorized replacement upload:

1. Confirm the itch upload is configured as the browser-playable HTML build and preserves the ZIP's root-level `index.html` plus nested `js/systems` and `assets` directories.
2. Launch the public game in a fresh session and confirm visible v1.28.2 / `1.28.2-loadout-polish` identity.
3. Confirm Town initializes with real state rather than placeholders.
4. Navigate Town, Run, Gear, Archive, and Journal.
5. Create a harmless save checkpoint, reload, and confirm continuity.
6. Confirm no console, runtime, failed-request, or stale-cache errors.

No replacement upload, itch configuration change, source repair, version change, cache-label change, or release tag was performed during this observation.
