#!/usr/bin/env python3
"""Offline package sanity check for the plain-browser DungeonDex build."""

from __future__ import annotations

import json
import re
import sys
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
BUILD_QS_RE = re.compile(r"\b\d+(?:\.\d+){1,4}-[a-z0-9-]+\b", re.IGNORECASE)
PROHIBITED_DIRS = {".git", "node_modules"}
PROHIBITED_FILE_PATTERNS = (
    re.compile(r"[\\/]\.git(?:[\\/]|$)", re.IGNORECASE),
    re.compile(r"[\\/]node_modules(?:[\\/]|$)", re.IGNORECASE),
    re.compile(r"\.zip$", re.IGNORECASE),
    re.compile(r"\.patch$", re.IGNORECASE),
    re.compile(r"\.diff$", re.IGNORECASE),
    re.compile(r"(?:^|[\\/])backup", re.IGNORECASE),
    re.compile(r"(?:^|[\\/]).*debug", re.IGNORECASE),
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


def project_root() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
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


def current_public_labels(root: Path) -> tuple[str | None, str | None]:
    version_path = root / "VERSION.md"
    version_match = VERSION_RE.search(version_path.read_text(encoding="utf-8")) if version_path.exists() else None
    expected_version = version_match.group(1) if version_match else None
    sw_path = root / "sw.js"
    sw_text = sw_path.read_text(encoding="utf-8") if sw_path.exists() else ""
    if not expected_version:
        cache_version = re.search(r"CACHE_NAME\s*=\s*['\"]dungeondex-v(\d+(?:\.\d+){1,4})-", sw_text)
        expected_version = cache_version.group(1) if cache_version else None
    build_match = re.search(r"\bBUILD_QS\s*=\s*['\"]([^'\"]+)['\"]", sw_text)
    return expected_version, build_match.group(1) if build_match else None


def stale_runtime_warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    expected_version, expected_build_qs = current_public_labels(root)
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
            if expected_version and any(value != expected_version and re.search(r"public|runtime|revisit|build", line, re.IGNORECASE) for value in VERSION_RE.findall(line)):
                warnings.append(f"{rel_path}:{line_no} contains a public/runtime/Revisit version other than {expected_version}")
                break
            if expected_build_qs and any(value != expected_build_qs for value in BUILD_QS_RE.findall(line)) and re.search(r"build|cache|runtime", line, re.IGNORECASE):
                warnings.append(f"{rel_path}:{line_no} contains a build/cache label other than {expected_build_qs}")
                break
    return warnings


def prohibited_content_warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    for path in sorted(root.rglob("*")):
        rel_path = path.relative_to(root).as_posix()
        if any(part in PROHIBITED_DIRS for part in path.parts):
            warnings.append(f"prohibited package content present: {rel_path}")
            continue
        if path.is_file() and any(pattern.search(rel_path) for pattern in PROHIBITED_FILE_PATTERNS):
            warnings.append(f"prohibited package content present: {rel_path}")
    return warnings


def main() -> int:
    root = project_root()
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

    warnings.extend(stale_runtime_warnings(root))
    warnings.extend(prohibited_content_warnings(root))

    print("DungeonDex package check")
    print(f"Root: {root}")
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
