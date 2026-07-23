# DungeonDex Version and Cache Authority

This document defines the release-label flow. It is a procedure, not an independent version source.

Target for the current authorized version pass:

- Public version: `v1.26.4.05 Stability Hardening`
- Visible semantic version: `1.26.4.05`
- Build/cache slug: `1.26.4.05-stability-hardening`

No package builder was run and no package was created while documenting this authority flow.

## Authority Flow

```text
VERSION.md
  -> public/local/development release value
  -> visible semantic version + build/cache slug
  -> browser/runtime labels and asset queries
  -> service-worker cache name and manifest entries
  -> focused mismatch smoke
  -> versioned package-builder filename derivation when packaging is explicitly requested
```

1. `VERSION.md` owns the current public/live version, local package version, development target, and build/cache slug.
2. The three release values must agree for a completed version pass. The visible label uses only `DungeonDex v<semantic-version>`.
3. Runtime and cache files mirror the semantic version and slug; they do not become competing authorities.
4. The focused smoke reads the authority, reports every mismatch by file and field, and verifies the service-worker asset manifest.
5. The versioned package builder derives its output name from the authority only when packaging is separately authorized. Generic builders retain a generic filename and never contribute version data. Editing or validating source does not imply that a package should be created.

## Surface Inventory

| Surface | Required relationship to authority |
|---|---|
| `VERSION.md` | Sole source for the long release value, visible semantic version, and build/cache slug. |
| `README.md` | Mirrors the short current baseline for readers. |
| `CHANGELOG.md` | Mirrors the three current version pointers and records the permanent release entry. Historical entries remain unchanged. |
| `docs/status/CURRENT_NOTES.md` | Mirrors the current baseline and records the active build/cache slug. |
| `index.html` | Mirrors the short title/H1, `DUNGEONDEX_BUILD`, `DUNGEONDEX_BUILD_QS`, and every direct script/stylesheet `?build=` query. |
| `app.js` | Mirrors the runtime pointer, `DUNGEONDEX_BUILD`, `DUNGEONDEX_BUILD_QS`, and loader fallback slug. |
| `js/systems/00_core_constants_data.js` | Mirrors the runtime `BUILD` and visible version label. |
| `js/systems/21_build_label_guard.js` | Mirrors the semantic version and build/cache slug used to repair stale labels. |
| Other loaded version-reporting systems | May mirror the current label only when their public/reporting contract requires it; they must not override `VERSION.md`. |
| `sw.js` | Uses `dungeondex-v<build-cache-slug>` for `CACHE_NAME`, the exact slug for `BUILD_QS`, and the same slug for every versioned cached asset. |
| `tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs` | Reads the authority and reports mismatches with file/field detail; it also verifies direct/dynamic asset coverage and public DevTools exclusions. |
| `tools/check_dungeondex_package.py` | Uses `VERSION.md` when checking the source tree. A stripped staging directory may fall back to its aligned `index.html`/`sw.js` values because public packages intentionally omit authority documentation. |
| `tools/build_itch_ready.ps1` | Reads the semantic version from `VERSION.md` for an explicitly requested versioned output name. It is not run during ordinary source/version review. |
| `tools/make_release_zip.py` / `tools/make_release_zip.ps1` | Produce the intentionally generic `DungeonDex.zip`; that filename is not version authority. |

## Intentional Non-authorities

- `manifest.json` has no release-version field. Its app name and metadata must not be parsed as version authority.
- `styles.css`, `styles_lore_layer.css`, and `styles_visual_weight.css` contain styling, not version authority. Their cache-busting values live in `index.html` and `sw.js`.
- Old release notes, smoke-note filenames, package names, archived stages, and historical changelog entries are evidence only.
- `patch-log.md` is not present in the current repository. If one is added later, it remains historical documentation rather than authority.

## Required Alignment Check

Before calling a version pass complete:

1. Read the exact release value and build/cache slug from `VERSION.md`.
2. Search active source and current-status documentation for the prior semantic version and prior slug.
3. Verify each surface in the inventory above.
4. Run the focused app-wiring/cache smoke and the compact suite.
5. Report any skipped check. Do not run a package builder unless packaging is explicitly requested.

A version pass fails if visible labels disagree, any active asset query uses another slug, the service-worker cache name or entries drift, or a package script/file name is treated as the source of truth.
