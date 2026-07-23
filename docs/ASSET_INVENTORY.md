# DungeonDex Asset Provenance and Usage Manifest

This manifest records the origin, ownership/license status, modification history, and use of every tracked DungeonDex visual, audio, font, or marketing asset. Update it whenever an asset is added, replaced, or repurposed.

Target baseline: **v1.26.4.05 Stability Hardening**.

Policy: [Northline Studio asset licensing policy](../ASSETS_LICENSE.md).

## Status Key

| Status | Meaning |
|---|---|
| Original | Created specifically for DungeonDex by the project owner/team. |
| Generated | AI-generated or tool-generated; prompt/source notes should be retained. |
| Provenance incomplete | Some history is known, but the original tool, prompt, source, or license chain is not fully recorded. Treat as a review risk. |
| Licensed | Third-party asset with known permission/license. |
| Placeholder | Temporary asset that should be replaced before a serious public release. |
| Unknown | Source is not currently known. Treat as risky until proven. |
| Needs replacement | Should not ship in public marketing or release builds. |
| Not present | No asset of this type is currently tracked in this inventory. |

## Tracked Asset Manifest

| Asset path | Status | Creator / source | License / ownership | Modification notes | Usage location |
|---|---|---|---|---|---|
| `assets/img/ui/dungeondex-crest.svg` | Generated; provenance incomplete | Repo-native generated SVG; exact tool and prompt are unrecorded. Added by John Belles in `6f334d3`. | Governed by the Northline Studio asset policy; generation-source terms are not recorded. | No later asset modification is recorded in the current history. | Header crest installed by `js/systems/22_nav_centering.js`; cached by `sw.js`. |
| `assets/img/ui/hollow-stair-gate.svg` | Generated; provenance incomplete | Repo-native generated SVG; exact tool and prompt are unrecorded. Added by John Belles in `01621f1`. | Governed by the Northline Studio asset policy; generation-source terms are not recorded. | Polished in `043e710`. | Town gate art installed by `js/systems/22_nav_centering.js`; cached by `sw.js`. |
| `assets/trophies/hollow_stair_skull_trophy.png` | Generated; provenance incomplete | Exact generator, prompt, and source terms are unrecorded. Added by John Belles in `9f712c6`; the historical v1.4.3a release note identifies it as generated art. | Governed by the Northline Studio asset policy, but the generation-source license chain is unverified. Do not treat it as cleared for external reuse or new marketing. | No later image modification is recorded in the current history. | Runtime fallback/image for the ten boss trophy definitions, save repair/normalization, and Journal trophy cards; cached by `sw.js`. |
| `.codex_monster_qa_320.png` | Generated QA capture | Captured from the DungeonDex runtime and added by John Belles in `157cfd0`; capture-tool details are not retained with the file. | Governed by the Northline Studio asset policy; internal QA use only. | No later image modification is recorded in the current history. | Internal 320px monster-rendering QA only; not loaded by the game or included by the release builders. |
| `.codex_monster_qa_430.png` | Generated QA capture | Captured from the DungeonDex runtime and added by John Belles in `157cfd0`; capture-tool details are not retained with the file. | Governed by the Northline Studio asset policy; internal QA use only. | No later image modification is recorded in the current history. | Internal 430px monster-rendering QA only; not loaded by the game or included by the release builders. |

The commit author records above establish who added each file to this repository. They do not substitute for a missing original generator, prompt, source file, or third-party license record.

## Non-file and Missing Asset State

| Asset class | Status | Release action |
|---|---|---|
| Text `DungeonDex` title | Original | Project-owned text treatment and preferred public fallback. |
| Manifest/app icons | Not present | `manifest.json` has an empty `icons` list; make no app-icon claim. |
| UI glyphs | Original | Navigation and status marks use text/system glyphs; no third-party icon pack is loaded. |
| Bundled fonts | Not present | CSS uses Georgia, Inter fallbacks, and system font stacks; no font files or remote font imports are tracked. |
| Audio/music | Not present | No tracked audio files were found. |
| Public screenshots | Not present | Capture only current playable surfaces using the media plan and mobile checklist. |
| Marketing/hero images | Placeholder | No final hero art is tracked. Use an honest current-game capture until a final asset has documented provenance. |
| Third-party visual/audio assets | Not present | No third-party visual, audio, font, or externally loaded visible-asset dependency was found. Record any future third-party material before use. |

## Release Hygiene Rules

- Every tracked or newly added visual, audio, font, screenshot, and marketing file must have one exact-path row in the manifest above.
- Do not commit font files unless the license is known and compatible.
- Do not use unknown-source icons, sprites, audio, or screenshots in public release material.
- Keep generated images labeled as generated and retain their tool/prompt/source notes when available.
- Treat `provenance incomplete`, `Unknown`, and `Needs replacement` as explicit review blockers for new marketing use unless the project owner records an approval.
- Prefer original text-first branding until a final logo is created.
- Keep screenshots honest: show current playable systems and clearly avoid presenting locked/planned lanes as live.

## Immediate Follow-up Checklist

Before the next serious public upload or Itch refresh:

```text
[x] Search the repo for image files.
[x] Search the repo for audio files.
[x] Search the repo for bundled font files.
[x] Confirm current app-icon status.
[ ] Capture new screenshots only from current playable features.
[x] Record every currently tracked visual asset by exact path.
[x] Mark incomplete provenance and restrict external reuse/new marketing until clarified.
```
