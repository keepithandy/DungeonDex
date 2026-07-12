# DungeonDex Asset Inventory

This inventory supports the asset hygiene issue and should be updated whenever DungeonDex adds or replaces visual, audio, font, or marketing assets.

Current baseline: **v1.26.0 Trophy Echo Only Revisit**.

## Status Key

| Status | Meaning |
|---|---|
| Original | Created specifically for DungeonDex by the project owner/team. |
| Generated | AI-generated or tool-generated; prompt/source notes should be retained. |
| Licensed | Third-party asset with known permission/license. |
| Placeholder | Temporary asset that should be replaced before a serious public release. |
| Unknown | Source is not currently known. Treat as risky until proven. |
| Needs replacement | Should not ship in public marketing or release builds. |
| Not present | No asset of this type is currently tracked in this inventory. |

## Current Inventory

| Asset | Status | Provenance / release action |
|---|---|---|
| Text `DungeonDex` title | Original | Project-owned text treatment; preferred public fallback. |
| `assets/img/ui/dungeondex-crest.svg` | Generated | Custom repo-native SVG introduced in commit `6f334d3`; generation method/license note is not recorded. Keep labeled generated. |
| `assets/img/ui/hollow-stair-gate.svg` | Generated | Custom repo-native SVG introduced in `01621f1` and polished in `043e710`; generation method/license note is not recorded. |
| `assets/trophies/hollow_stair_skull_trophy.png` | Unknown | Runtime trophy image inherited from older history. Replace or document its source before a serious public release. |
| Manifest/app icons | Not present | `manifest.json` has an empty `icons` list; no app-icon claim should be made. |
| UI glyphs | Original | Current navigation and status marks are text/system glyphs; no third-party icon pack is loaded. |
| Bundled fonts | Not present | CSS uses Georgia, Inter fallbacks, and system font stacks; no font files or remote font imports are tracked. |
| Audio/music | Not present | No tracked audio files found. |
| `.codex_monster_qa_320.png` / `.codex_monster_qa_430.png` | Generated | Internal QA captures only; do not package or use as marketing art. |
| Public screenshots | Not present | Capture only current v1.26.x playable surfaces using the media plan and mobile checklist. |
| Marketing/hero images | Placeholder | No final hero art is tracked. Use an honest gameplay capture until provenance is recorded. |
| Third-party visible packages | Not present | No package manifest or externally loaded visible-asset dependency found. |
| Archived itch-stage trophy PNG | Unknown | Historical duplicate of the unknown trophy image; the archived stage is not a release source. |

## Release Hygiene Rules

- Do not commit font files unless the license is known and compatible.
- Do not use unknown-source icons, sprites, audio, or screenshots in public release material.
- Keep generated images labeled as generated until replaced or approved.
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
[x] Mark every unknown public-facing asset as replace-before-release until proven safe.
```
