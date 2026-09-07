# Automated Release-Candidate Preparation — v1.28 Line

## Candidate and scope

- Date: 2026-09-07.
- Active repository: `C:\Users\quali\Desktop\source\DungeonDex`.
- Starting point: clean local `main` at `99bddca`, three commits ahead of the locally recorded `origin/main`.
- Work branch: `codex/reliquary-journal-rc`; Journal milestone commit: `3819246`. The commit containing this report finalizes release preparation and is the candidate to merge into local `main`.
- Source/version authority remains **v1.28.2 Loadout Polish**, build/cache **`1.28.2-loadout-polish`**. Historical proposal numbers do not authorize a version update.
- Feature scope froze after the Journal milestone. Primary category for this preparation patch: **Bug Fix**; necessary secondary work is smoke hardening, acceptance review, and documentation reconciliation.
- Delivery authorized: verified local commits and local-main merge. No remote refresh/push, public release artifact, release tag or upload is included. The suite uses temporary package fixtures, then removes them.

## Named-milestone acceptance review

| Milestone | Result and evidence |
|---|---|
| Named Loadouts / Loadout Polish | Preserved. Existing ID-based save/reload, duplicate/reorder, safe empty-slot application, focus and upgrade-preservation checks pass. No loadout implementation was replaced. |
| Rarity baseline and reward decision | Complete with the documented no-change policy. The live-helper audit covers 33 depth/source rows, the D40 gate/scarcity boundary, D43 elite-frequency crossover, fixed yield controls, and 30,000 conditional collection trials. It is not a mixed-run yield or playtime forecast. |
| Drowned Reliquary district / encounters | Complete. D31-D40 identity, four established encounter identities, all family/type mappings, hostile/missing-data fallback and 1,900 seeded numeric/RNG/save comparisons against pinned main remain protected. |
| D45 conclusion and existing contracts | Complete through the existing D45 encounter and Gravetoll Bell trophy. No D40 boss was added. Existing in-band contract briefings, exact targets, one-active lifecycle, completion/reload and one-time Board claims pass. |
| Themed gear | Complete through existing maker/theme/tags/summary fields. All ten slots and normal/elite/boss source comparisons retain gear values, IDs, random consumption and normalization. No new gear system or balance was introduced. |
| Loot comparison / return receipt | Complete. Existing equipped-item comparison, signed score differences and read-only detail inspection pass. Town receipt derives only from existing history and retains Gear/Journal navigation ownership. Its extraction and next-start locations now use the displayed Floor/Room/Chapter mapping. |
| Town/mobile polish | Existing entry, preparation, merchant/forge/contracts and navigation remain intact. Supported touch geometry, public-control inventory, accessibility and narrow pointer checks pass. The scrolling Journal now reserves a gutter beside the fixed navigation handle. |
| Journal/world reaction | Complete. Read-only boss, located-contract, identified-gear and retained-run acknowledgements share one projection between Town and Journal. Empty/partial/complete/malformed/legacy cases, exact depth mapping, duplicate identities, unsafe text, actual save/reload and nonmutation are covered. See `RELIQUARY_JOURNAL_WORLD_REACTION.md`. |
| Automated release-candidate preparation | Complete after final checks below. Feature scope is frozen. Physical-device release validation remains a separate open gate. |
| Public package / release | The owner confirms that the itch-ready v1.28.2 ZIP and accompanying devlog were uploaded to itch.io after candidate preparation. The originally uploaded artifact was not recovered during the local re-audit, so its exact checksum and upload timestamp remain unverified. A later package derived from unchanged `VERSION.md` authority was rebuilt at local `main` commit `c114acf`: `archive/packages/DungeonDex_v1.28.2_ItchReady.zip` (396,820 bytes; SHA-256 `8A0F3404621AE9E4431C972CFB68DCF31193B501396A09AFF4428B64D2253D7F`); this later checksum is not claimed as the uploaded artifact's checksum. Physical-device evidence remains pending and no release tag is recorded. |

## Verified fixes during preparation

1. Journal upgrade costs could display escaped `<span>` currency markup. They now use the existing plain-text money helper before escaping. Focused and loaded-browser assertions protect this.
2. At supported widths, scrolling could place a Journal heading beneath the fixed closed drawer handle. A 44px Journal gutter with safe-area inset keeps text clear. Browser geometry checks now require drawer clearance at all six touch/fine-pointer profiles; fresh captures were inspected after the extraction notice expired.
3. The historical standalone gear-comparison test could not reach its assertions because its DOM mocks and runtime dependencies were incomplete. It now loads the existing core/shared UI owners, binds its fixture through the runtime state binding, and supplies the missing DOM methods. Its original comparison/upgrade assertions remain; signed score differences and nonmutation are also checked. It is now a compact-suite gate.
4. Current queue documents still asked for already-completed boss/loot/Journal work and called the stale gear harness unresolved. Active records now distinguish completed source work, historical checkpoint evidence, and the pending physical-device/public-release steps.

The preceding Journal milestone also fixed raw-depth-as-floor receipt text, isolated legacy Famous Gear summary normalization from the live save, and stopped Trophy Echo from borrowing unrelated historical-lane result text. No protected gameplay behavior changed.

## Final verification

- Compact suite: **58/58 passing, zero skips**, after the final drawer-clearance fix. Includes repository-wide JavaScript syntax, the restored gear comparison gate, 20 named bosses / 60 legal fixtures / 36,000 real combat fights (18/18 post-Boss-2 readiness), rarity and Reliquary audits, contracts, Merchant Gear Upgrades, loadouts, Journal/Revisit, Debt/Talent compatibility, mobile/accessibility/contrast, Enter Dungeon, public runtime and temporary package extraction.

- Public loaded browser: **48/48 passing**, including normal D30-to-D40 combat, loot, extract, bank, reload and loadout application; Journal legacy/read-only/save-reload checks; Town acknowledgement; six Journal viewport/pointer profiles; no runtime/console/rejection/local-request/DevTools failures.
- Browser-computed contrast: **11/11 passing**. New Journal primary/detail/state and Town acknowledgement measured 15.37:1, 9.47:1, 11.38:1 and 8.51:1 respectively in the fixture's computed background stack, above 4.5:1. Existing source-level conservative-gradient checks remain in the interface gate; computed fixtures are not a physical-display measurement.
- Strict source package audit: **52 checked paths, zero warnings** (`python tools/check_dungeondex_package.py --source .`). Source mode intentionally permits repository docs/tests/VCS; the suite separately audits stripped staged/extracted public trees in strict package mode and launches the clean extraction.
- Package-checker mode regression: **8/8 passing**; repository-only and development-only content is still rejected in strict package mode.
- Protected-system/diff review: only the existing Town receipt, Journal presentation and Journal CSS changed in runtime. No version/cache files, classic script order, save normalization, loadouts, upgrades, combat/scaling, reward/drop/economy, entry, contract lifecycle, Talent, Debt or Revisit mechanics changed. Trophy Echo remains the only active Revisit lane.
- Asset inventory: five existing tracked image files match `docs/ASSET_INVENTORY.md`; no new/untracked release assets or dependencies were added. Existing incomplete generated-asset provenance remains a restriction for new marketing/reuse.
- `git diff --check`: clean (Git may print normal LF/CRLF conversion notices).

Reproduction: use the installed Node runtime, make the bundled Python runtime available on the command's PATH, then run `node smoke_compact_suite.mjs`, the source package audit and the package-checker mode regression. Verification environment: Windows, Node v24.16.0, Python 3.12.14, Chrome executable version 152.0.7977.82. Browser gates use installed Chrome in a disposable local profile. No dependency installation is required.

Local verification artifacts (outside the active repository): `C:\Users\quali\Documents\ChatGPT\DungeonDex\_codex_work\rc-final-compact.log`, `rc-browser.log`, `rc-source-package.log`, and `captures/journal-*.png`. The Documents folder holds working evidence only; it is not the active source repository. Test captures use disposable generated fixtures, including deliberately long gear names, and are not marketing material.

## Limits and remaining release gate

- **Physical-device/Textastic validation is not complete.** Use the fresh `REAL_DEVICE_HANDOFF_V128.md`, recording exact commit, device, OS, Textastic/browser version, portrait/landscape viewports, screenshots and row results. The historical v1.27 exception does not carry forward. The last recorded related GitHub issue is #139; remote issue/PR status was not refreshed in this local continuation.
- Browser fixtures are synthetic and isolated from player saves. They prove wiring, persistence and layout contracts, not natural player difficulty, real touch responsiveness, screen-reader speech, physical keyboard behavior or mobile browser chrome/safe-area behavior.
- Existing older displays/logs may use threat-floor terminology. New Journal acknowledgements and the return receipt explicitly derive their Floor/Room/Chapter location from the lore mapping and include raw D notation. Progression, boss cadence and stored history were not rewritten.
- Retained run history is limited and claimed contract IDs lose location detail. Sold gear may leave insufficient origin evidence. The new presentation reports those limits rather than creating permanent achievements or inferring unrecorded progress.
- No new marketing or external asset reuse is cleared by this source audit. Incomplete provenance remains documented in the existing asset inventory.

## Authorized local package

- The versioned itch-ready package was built after explicit owner authorization.
- Compact smoke: **58/58 passing**.
- Staged package audit: **52 paths checked, zero warnings**.
- Re-audit/package handoff: clean extracted-package audit and public launch gate **11/11 passing**; the extracted runtime loaded with DevTools disabled, navigated to the Guild Journal, entered the dungeon, and had no console, runtime, or local-request failures.
- The owner subsequently confirmed the itch.io ZIP and devlog upload. Physical-device evidence and any release tag remain separate actions; the exact original uploaded checksum is still unverified.

Next action: complete the fresh physical-device handoff and record a live itch observation, then continue from `ROADMAP_NEXT_UPDATE.md`. The upload is owner-confirmed; any release tag, version change, or replacement upload remains a separate explicitly authorized action.

Reviewer handoff: inspect `99bddca..HEAD` for presentation-only scope, evidence sufficiency, canonical location text, escaped output, nonmutation, Trophy Echo-only behavior, supported drawer clearance, meaningful regression assertions, and consistency between this report and actual Git/test output. Do not interpret historical proposal labels as release authorization.
