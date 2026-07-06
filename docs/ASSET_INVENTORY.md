# DungeonDex Asset Inventory

This inventory supports the asset hygiene issue and should be updated whenever DungeonDex adds or replaces visual, audio, font, or marketing assets.

Current baseline: **v1.23.7 Rival Trace Result Detail Polish**.

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

| Asset area | Current status | Notes / next action |
|---|---|---|
| Title/logo treatment | Placeholder | Use text-first `DungeonDex` title until a final licensed/original mark exists. |
| App icons | Unknown | Audit repository image/icon files before public packaging. |
| UI icons | Unknown | Confirm whether any icons are custom, generated, licensed, or plain text/UI glyphs. |
| Sprites/images | Unknown | Audit current image files before using screenshots in public marketing. |
| Fonts | Unknown | Confirm whether the app relies on system fonts, bundled fonts, or external font assets. |
| Audio/music | Not present | Add entries only if audio is introduced. |
| Screenshots | Placeholder | Capture honest current gameplay only after UI/copy surfaces are stable. |
| Marketing/hero images | Placeholder | Do not create final hero art until the visual direction and license status are clear. |
| Third-party visible packages | Unknown | Audit package/source files if any dependency contributes visible UI assets. |

## Release Hygiene Rules

- Do not commit font files unless the license is known and compatible.
- Do not use unknown-source icons, sprites, audio, or screenshots in public release material.
- Keep generated images labeled as generated until replaced or approved.
- Prefer original text-first branding until a final logo is created.
- Keep screenshots honest: show current playable systems and clearly avoid presenting locked/planned lanes as live.

## Immediate Follow-up Checklist

Before the next serious public upload or Itch refresh:

```text
[ ] Search the repo for image files.
[ ] Search the repo for audio files.
[ ] Search the repo for bundled font files.
[ ] Confirm whether app icons are original, generated, licensed, placeholder, or unknown.
[ ] Capture new screenshots only from current playable features.
[ ] Mark every unknown public-facing asset as replace-before-release until proven safe.
```
