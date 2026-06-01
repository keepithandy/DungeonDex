#!/usr/bin/env python3
"""Create a clean DungeonDex browser release zip from the project root."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


OUTPUT_NAME = "DungeonDex_v1_4_10_Package_Hygiene_Hotfix.zip"
EXCLUDED_DIRS = {
    ".git",
    ".cache",
    ".mypy_cache",
    ".parcel-cache",
    ".pytest_cache",
    ".ruff_cache",
    ".vite",
    "__pycache__",
    "node_modules",
}
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
EXCLUDED_SUFFIXES = {".zip", ".pyc", ".pyo", ".tmp", ".temp", ".log"}


def project_root() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
    return Path.cwd().resolve()


def should_include(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    if rel.name.lower().startswith("ion"):
        return False
    if any("cache" in part.lower() for part in rel.parts):
        return False
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return False
    if path.name in EXCLUDED_NAMES:
        return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return False
    return path.is_file()


def main() -> int:
    root = project_root()
    if not (root / "index.html").exists():
        print(f"FAIL: {root} does not look like the DungeonDex project root")
        return 1

    output_path = root / OUTPUT_NAME
    files = [path for path in sorted(root.rglob("*")) if should_include(path, root)]

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(root).as_posix())

    print(f"Wrote {output_path}")
    print(f"Included {len(files)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
