# Smoke Tests

DungeonDex smoke scripts currently remain at the repository root for compatibility.

Several smoke files load runtime files relative to their own script location, for example with `new URL('./js/...', import.meta.url)`. Moving those files into this folder without updating their internal paths would break validation.

Use the stable root runner for now:

```bash
node smoke_compact_suite.mjs
```

A future focused cleanup can migrate individual smoke files here after updating:

- `smoke_compact_suite.mjs` command paths;
- README smoke commands;
- `docs/status/CURRENT_NOTES.md` smoke target notes;
- script-local runtime loading paths.

Until that migration lands, this folder is the intended destination and documentation anchor for smoke-test organization, not the active smoke location.
