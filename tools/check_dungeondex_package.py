#!/usr/bin/env python3
"""Offline package sanity check for the plain-browser DungeonDex build."""

from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


REQUIRED_FILES = (
    "index.html",
    "app.js",
    "styles.css",
    "styles_lore_layer.css",
    "styles_visual_weight.css",
    "sw.js",
    "manifest.json",
)
LOCAL_ATTRS = {"href", "src"}
SKIP_SCHEMES = {"data", "blob", "mailto", "tel", "javascript", "http", "https"}
STALE_RUNTIME_RE = re.compile(
    r"(?:"
    r"1[.]20[.]48|1[.]20[.]49|1[.]20[.]50|1[.]20[.]51|"
    r"v1[.]20[.]48|v1[.]20[.]49|v1[.]20[.]50|v1[.]20[.]51|"
    r"hunter-board-clarity-live-spend|"
    r"first-controlled-talent-spend-ui|"
    r"browser-reload-spend-persistence|"
    r"talent-spend-ui-readiness"
    r")",
    re.IGNORECASE,
)
VERSION_RE = re.compile(r"v(\d+(?:\.\d+){1,4})")
PROHIBITED_DIRS = {".git", "node_modules"}
PROHIBITED_PATH_PATTERNS = (
    re.compile(r"(?:^|[\\/])__MACOSX(?:[\\/]|$)", re.IGNORECASE),
)
PROHIBITED_FILE_PATTERNS = (
    re.compile(r"[\\/]\.git(?:[\\/]|$)", re.IGNORECASE),
    re.compile(r"[\\/]node_modules(?:[\\/]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[\\/])\.DS_Store$", re.IGNORECASE),
    re.compile(r"(?:^|[\\/])\._[^\\/]+$", re.IGNORECASE),
    re.compile(r"\.zip$", re.IGNORECASE),
    re.compile(r"\.patch$", re.IGNORECASE),
    re.compile(r"\.diff$", re.IGNORECASE),
    re.compile(r"\.(?:md|mjs|ps1|py)$", re.IGNORECASE),
    re.compile(r"(?:^|[\\/])backup", re.IGNORECASE),
    re.compile(r"(?:^|[\\/]).*debug", re.IGNORECASE),
)
DEVELOPMENT_ONLY_RUNTIME_FILES = (
    "js/systems/13_devtools_overlay.js",
    "js/systems/14_devtools_scenarios.js",
    "js/systems/15_devtools_balance_reports.js",
    "js/systems/43_devkit_reset_hold.js",
)


class LocalReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {name.lower(): value for name, value in attrs if value}
        for attr in LOCAL_ATTRS:
            if attr in attr_map:
                self.refs.append((attr_map[attr] or "", f"index.html <{tag} {attr}>"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate DungeonDex runtime/package wiring and release hygiene."
    )
    parser.add_argument(
        "root",
        nargs="?",
        help="Repository source root or staged package root. Defaults to cwd/project root.",
    )
    parser.add_argument(
        "--source",
        action="store_true",
        help=(
            "Audit a repository source tree without treating docs, tests, tools, or VCS "
            "metadata as prohibited package content."
        ),
    )
    return parser.parse_args()


def project_root(root_arg: str | None = None) -> Path:
    if root_arg:
        return Path(root_arg).resolve()
    cwd = Path.cwd().resolve()
    if (cwd / "index.html").exists():
        return cwd
    return Path(__file__).resolve().parents[1]


def normalize_local_ref(raw: str) -> str | None:
    raw = (raw or "").strip().strip("'\"")
    if not raw or raw.startswith("#"):
        return None
    parsed = urlsplit(raw)
    if parsed.scheme and parsed.scheme.lower() in SKIP_SCHEMES:
        return None
    if parsed.netloc:
        return None
    path = unquote(parsed.path).replace("\\", "/")
    if not path or path in {".", "./", "/"}:
        return None
    if path.startswith("/"):
        path = path.lstrip("/")
    while path.startswith("./"):
        path = path[2:]
    return path or None


def exists_at(root: Path, rel_path: str) -> bool:
    return (root / rel_path).exists()


def add_checked(
    checked: list[tuple[str, str, bool]],
    seen: set[tuple[str, str]],
    root: Path,
    rel_path: str,
    source: str,
) -> bool:
    key = (rel_path, source)
    if key in seen:
        return exists_at(root, rel_path)
    ok = exists_at(root, rel_path)
    checked.append((rel_path, source, ok))
    seen.add(key)
    return ok


def html_refs(index_text: str) -> list[tuple[str, str]]:
    parser = LocalReferenceParser()
    parser.feed(index_text)
    refs = parser.refs
    for match in re.finditer(r"serviceWorker\.register\(\s*['\"]([^'\"]+)['\"]", index_text):
        refs.append((match.group(1), "index.html serviceWorker.register"))
    return refs


def css_refs(css_text: str) -> list[tuple[str, str]]:
    refs: list[tuple[str, str]] = []
    for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", css_text, re.IGNORECASE):
        refs.append((match.group(2), "styles.css url()"))
    return refs


def manifest_refs(manifest_text: str) -> list[tuple[str, str]]:
    refs: list[tuple[str, str]] = []
    try:
        data = json.loads(manifest_text)
    except json.JSONDecodeError as exc:
        refs.append((f"JSON_ERROR:{exc}", "manifest.json"))
        return refs
    start_url = data.get("start_url")
    if isinstance(start_url, str):
        refs.append((start_url, "manifest.json start_url"))
    icons = data.get("icons")
    if isinstance(icons, list):
        for icon in icons:
            if isinstance(icon, dict) and isinstance(icon.get("src"), str):
                refs.append((icon["src"], "manifest.json icon"))
    return refs


def sw_asset_refs(sw_text: str) -> list[tuple[str, str]]:
    match = re.search(r"\bASSETS\s*=\s*\[(.*?)\]", sw_text, re.DOTALL)
    if not match:
        return []
    return [(ref, "sw.js ASSETS") for ref in re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))]


def is_index_script_or_style(rel_path: str, source: str) -> bool:
    suffix = Path(rel_path).suffix.lower()
    return source.startswith("index.html <script") or suffix in {".js", ".css"}


def runtime_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for rel_path in REQUIRED_FILES:
        path = root / rel_path
        if path.is_file():
            files.append(path)
    systems_dir = root / "js" / "systems"
    if systems_dir.is_dir():
        files.extend(sorted(systems_dir.glob("*.js")))
    return sorted(set(files))


def version_authority_value(version_text: str, heading: str) -> str | None:
    match = re.search(
        rf"^##\s+{re.escape(heading)}\s*$\s*^`?([^`\r\n]+?)`?\s*$",
        version_text,
        re.MULTILINE,
    )
    return match.group(1).strip() if match else None


def current_public_labels(root: Path) -> tuple[str | None, str | None]:
    version_path = root / "VERSION.md"
    version_text = version_path.read_text(encoding="utf-8") if version_path.exists() else ""
    version_match = VERSION_RE.search(version_text) if version_text else None
    expected_version = version_match.group(1) if version_match else None
    expected_build_qs = version_authority_value(version_text, "Current Build/Cache Label") if version_text else None
    index_path = root / "index.html"
    index_text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    if not expected_version:
        index_version = re.search(r"DUNGEONDEX_BUILD\s*=\s*['\"](\d+(?:\.\d+){1,4})['\"]", index_text)
        expected_version = index_version.group(1) if index_version else None
    index_build = re.search(r"DUNGEONDEX_BUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", index_text)
    sw_path = root / "sw.js"
    sw_text = sw_path.read_text(encoding="utf-8") if sw_path.exists() else ""
    if not expected_version:
        cache_version = re.search(r"CACHE_NAME\s*=\s*['\"]dungeondex-v(\d+(?:\.\d+){1,4})-", sw_text)
        expected_version = cache_version.group(1) if cache_version else None
    build_match = re.search(r"\bBUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", sw_text)
    if not version_text:
        expected_build_qs = index_build.group(1) if index_build else (build_match.group(1) if build_match else None)
    return expected_version, expected_build_qs


def public_label_warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    expected_version, expected_build_qs = current_public_labels(root)
    if not expected_version:
        return ["could not determine the current public version from VERSION.md or index.html"]
    if not expected_build_qs:
        return ["could not determine the current build/cache label from VERSION.md (or index.html/sw.js in a stripped staged package)"]

    checks = (
        ("index.html", r"<title>DungeonDex v(\d+(?:\.\d+){1,4})</title>", expected_version, "title version"),
        ("index.html", r"DUNGEONDEX_BUILD\s*=\s*['\"]([^'\"]+)['\"]", expected_version, "public build version"),
        ("index.html", r"DUNGEONDEX_BUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", expected_build_qs, "build query label"),
        ("app.js", r"DUNGEONDEX_BUILD\s*=\s*['\"]([^'\"]+)['\"]", expected_version, "runtime build version"),
        ("app.js", r"DUNGEONDEX_BUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", expected_build_qs, "runtime build query label"),
        ("sw.js", r"CACHE_NAME\s*=\s*['\"]([^'\"]+)['\"]", f"dungeondex-v{expected_build_qs}", "service-worker cache label"),
        ("sw.js", r"\bBUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", expected_build_qs, "service-worker build query label"),
        ("js/systems/21_build_label_guard.js", r"\bBUILD\s*=\s*['\"]([^'\"]+)['\"]", expected_version, "build-guard version"),
        ("js/systems/21_build_label_guard.js", r"\bBUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", expected_build_qs, "build-guard query label"),
        ("js/systems/44_revisit_lowfire_board_slot.js", r"DungeonDex v(\d+(?:\.\d+){1,4}) public Revisit surface only allows Trophy Echo", expected_version, "public Revisit response version"),
    )
    for rel_path, pattern, expected, label in checks:
        path = root / rel_path
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        matches = re.findall(pattern, text)
        if not matches:
            warnings.append(f"{rel_path} is missing its {label}")
            continue
        for value in matches:
            if value != expected:
                warnings.append(f"{rel_path} has {label} {value}; expected {expected}")

    index_path = root / "index.html"
    if index_path.is_file():
        index_text = index_path.read_text(encoding="utf-8")
        for value in re.findall(r"[?&]build=([^'\"\s]+)", index_text):
            if value != expected_build_qs:
                warnings.append(f"index.html has asset build label {value}; expected {expected_build_qs}")
                break
    return warnings


def stale_runtime_warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    for path in runtime_files(root):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        except OSError as exc:
            warnings.append(f"could not scan {path.relative_to(root).as_posix()}: {exc}")
            continue
        rel_path = path.relative_to(root).as_posix()
        for line_no, line in enumerate(text.splitlines(), 1):
            match = STALE_RUNTIME_RE.search(line)
            if match:
                warnings.append(f"{rel_path}:{line_no} contains stale runtime/build string: {match.group(0)}")
                break
    return warnings


def prohibited_content_warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    for path in sorted(root.rglob("*")):
        rel_path = path.relative_to(root).as_posix()
        if any(part in PROHIBITED_DIRS for part in path.parts) or any(
            pattern.search(rel_path) for pattern in PROHIBITED_PATH_PATTERNS
        ):
            warnings.append(f"prohibited package content present: {rel_path}")
            continue
        if path.is_file() and any(pattern.search(rel_path) for pattern in PROHIBITED_FILE_PATTERNS):
            warnings.append(f"prohibited package content present: {rel_path}")
    for rel_path in DEVELOPMENT_ONLY_RUNTIME_FILES:
        if (root / rel_path).is_file():
            warnings.append(f"development-only runtime file present: {rel_path}")
    return warnings


def main() -> int:
    args = parse_args()
    root = project_root(args.root)
    mode = "source" if args.source else "package"
    checked: list[tuple[str, str, bool]] = []
    seen: set[tuple[str, str]] = set()
    missing_required: list[str] = []
    warnings: list[str] = []

    for rel_path in REQUIRED_FILES:
        if not add_checked(checked, seen, root, rel_path, "required"):
            missing_required.append(f"{rel_path} is missing")

    index_path = root / "index.html"
    index_text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    normalized_index_refs: list[str] = []
    manifest_referenced = False
    sw_referenced = False

    if index_text:
        for raw_ref, source in html_refs(index_text):
            rel_path = normalize_local_ref(raw_ref)
            if not rel_path:
                continue
            normalized_index_refs.append(rel_path)
            if Path(rel_path).name == "manifest.json":
                manifest_referenced = True
            if Path(rel_path).name == "sw.js":
                sw_referenced = True
            ok = add_checked(checked, seen, root, rel_path, source)
            if not ok and is_index_script_or_style(rel_path, source):
                missing_required.append(f"{source} references missing script/style: {rel_path}")
            elif not ok and Path(rel_path).name not in {"manifest.json", "sw.js"}:
                warnings.append(f"{source} references missing local asset: {rel_path}")

        if "app.js" not in {Path(ref).name for ref in normalized_index_refs}:
            missing_required.append("index.html does not reference app.js")
        if "styles.css" not in {Path(ref).name for ref in normalized_index_refs}:
            missing_required.append("index.html does not reference styles.css")

    if manifest_referenced and not add_checked(checked, seen, root, "manifest.json", "referenced by index.html"):
        missing_required.append("manifest.json is referenced by index.html but missing")
    if sw_referenced and not add_checked(checked, seen, root, "sw.js", "referenced by index.html"):
        missing_required.append("sw.js is referenced by index.html but missing")

    styles_path = root / "styles.css"
    if styles_path.exists():
        for raw_ref, source in css_refs(styles_path.read_text(encoding="utf-8")):
            rel_path = normalize_local_ref(raw_ref)
            if rel_path and not add_checked(checked, seen, root, rel_path, source):
                warnings.append(f"{source} references missing local asset: {rel_path}")

    manifest_path = root / "manifest.json"
    if manifest_referenced and manifest_path.exists():
        for raw_ref, source in manifest_refs(manifest_path.read_text(encoding="utf-8")):
            if raw_ref.startswith("JSON_ERROR:"):
                warnings.append(raw_ref.replace("JSON_ERROR:", "manifest.json parse warning: ", 1))
                continue
            rel_path = normalize_local_ref(raw_ref)
            if rel_path and not add_checked(checked, seen, root, rel_path, source):
                warnings.append(f"{source} references missing local asset: {rel_path}")

    sw_path = root / "sw.js"
    if sw_referenced and sw_path.exists():
        for raw_ref, source in sw_asset_refs(sw_path.read_text(encoding="utf-8")):
            rel_path = normalize_local_ref(raw_ref)
            if rel_path and not add_checked(checked, seen, root, rel_path, source):
                missing_required.append(f"{source} references missing local asset: {rel_path}")

    warnings.extend(public_label_warnings(root))
    warnings.extend(stale_runtime_warnings(root))
    if not args.source:
        warnings.extend(prohibited_content_warnings(root))

    print("DungeonDex package check")
    print(f"Root: {root}")
    print(f"Mode: {mode}")
    print()
    print("Checked paths:")
    for rel_path, source, ok in checked:
        status = "OK" if ok else "MISSING"
        print(f"  {status:7} {rel_path} ({source})")
    print()
    print("Missing required files:")
    if missing_required:
        for item in missing_required:
            print(f"  FAIL {item}")
    else:
        print("  none")
    print()
    print("Warnings:")
    if warnings:
        for item in warnings:
            print(f"  WARN {item}")
    else:
        print("  none")
    print()

    status = "FAIL" if missing_required or warnings else "PASS"
    print(f"Summary: {status} ({len(checked)} paths checked, {len(warnings)} warnings)")
    return 1 if missing_required or warnings else 0


if __name__ == "__main__":
    raise SystemExit(main())
