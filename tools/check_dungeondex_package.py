#!/usr/bin/env python3
"""Offline package sanity check for the plain-browser DungeonDex build."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


REQUIRED_FILES = ("index.html", "app.js", "styles.css")
LOCAL_ATTRS = {"href", "src"}
SKIP_SCHEMES = {"data", "blob", "mailto", "tel", "javascript", "http", "https"}


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
            if not ok and Path(rel_path).name not in {"manifest.json", "sw.js"}:
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
                warnings.append(f"{source} references missing local asset: {rel_path}")

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

    status = "FAIL" if missing_required else "PASS"
    print(f"Summary: {status} ({len(checked)} paths checked, {len(warnings)} warnings)")
    return 1 if missing_required else 0


if __name__ == "__main__":
    raise SystemExit(main())
