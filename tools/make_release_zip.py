#!/usr/bin/env python3
"""Create a clean DungeonDex browser release zip from the project root."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


PACKAGE_DIR = Path("archive/packages")
OUTPUT_NAME = "DungeonDex.zip"
ROOT_FILES = (
    "index.html",
    "app.js",
    "sw.js",
    "manifest.json",
    "styles.css",
)
RUNTIME_DIRS = (
    Path("js/systems"),
    Path("assets"),
)


def project_root() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
    return Path.cwd().resolve()


def iter_release_files(root: Path) -> list[Path]:
    files: list[Path] = []

    for rel_path in ROOT_FILES:
        path = root / rel_path
        if not path.is_file():
            raise FileNotFoundError(f"missing required runtime file: {rel_path}")
        files.append(path)

    for rel_dir in RUNTIME_DIRS:
        runtime_dir = root / rel_dir
        if not runtime_dir.is_dir():
            continue
        for path in sorted(runtime_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() == ".js":
                files.append(path)
            elif path.is_file() and rel_dir.name == "assets":
                files.append(path)

    return sorted(set(files))


def main() -> int:
    root = project_root()
    if not (root / "index.html").exists():
        print(f"FAIL: {root} does not look like the DungeonDex project root")
        return 1

    output_path = root / PACKAGE_DIR / OUTPUT_NAME
    output_path.parent.mkdir(parents=True, exist_ok=True)
    files = iter_release_files(root)

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(root))

    print(f"Wrote {output_path}")
    print(f"Included {len(files)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
