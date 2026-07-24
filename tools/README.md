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

## Package checker

Use strict package mode against an extracted or staged public package:

```bash
python tools/check_dungeondex_package.py path/to/package
```

Strict mode rejects repository-only content such as docs, tests, tools, VCS metadata, and archive files.

Use source-audit mode against the repository:

```bash
python tools/check_dungeondex_package.py --source .
```

Source mode keeps required-file, local-reference, version/cache, and stale-runtime checks, but does not treat normal source-only files as package violations. It does not build or publish a package.
