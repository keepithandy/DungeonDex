# Smoke Tests

DungeonDex keeps the stable compact runner at the repository root and individual smoke scripts in this folder.

Run commands from the repository root so cwd-relative smoke fixtures resolve consistently.

Use the stable root runner:

```bash
node smoke_compact_suite.mjs
```

Focused examples:

```bash
node tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs
node tests/smoke/smoke_revisit_routes_v173.mjs
node tests/smoke/smoke_journal_v1233.mjs
python tests/smoke/smoke_package_checker_modes_v1265.py
```

When adding a smoke, keep runtime reads rooted at the repository or use paths relative to `tests/smoke/` deliberately. Add release-gating coverage to the root compact runner.
