# Tools

This folder is reserved for repeatable DungeonDex maintenance tools.

Use this folder for scripts that help maintain the repo but are not part of the browser runtime and are not smoke tests.

Good candidates:

- release helpers;
- package review helpers;
- asset inventory helpers;
- one-off cleanup scripts that become reusable.

Do not put runtime game systems here. Runtime systems belong in `js/systems/`.

Do not put current smoke files here. Smoke tests should eventually move to `tests/smoke/` through a focused migration.
