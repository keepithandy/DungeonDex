#!/usr/bin/env python3
"""Regression coverage for strict package and source-audit checker modes."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHECKER = ROOT / "tools" / "check_dungeondex_package.py"


def run_checker(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CHECKER), *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def require(condition: bool, message: str, output: str) -> None:
    if condition:
        print(f"PASS: {message}")
        return
    raise AssertionError(f"{message}\n\n{output[-4000:]}")


def main() -> int:
    source = run_checker("--source", str(ROOT))
    require(source.returncode == 0, "source mode exits successfully on the repository", source.stdout)
    require("Mode: source" in source.stdout, "source mode reports its audit mode", source.stdout)
    require("Summary: PASS" in source.stdout, "source mode reports a clean summary", source.stdout)
    require(
        "prohibited package content present:" not in source.stdout,
        "source mode suppresses expected repo-only package warnings",
        source.stdout,
    )

    package = run_checker(str(ROOT))
    require(package.returncode == 1, "default package mode remains strict on the repository", package.stdout)
    require("Mode: package" in package.stdout, "default mode reports package auditing", package.stdout)
    require(
        "prohibited package content present:" in package.stdout,
        "default package mode still rejects repo-only content",
        package.stdout,
    )
    require("Summary: FAIL" in package.stdout, "strict package violations return a failed summary", package.stdout)

    print("Package checker modes v1.26.5: 8/8 passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
