#!/usr/bin/env python3
"""Read-only content registry audit for DungeonDex.

This tool scans app.js as text. It does not import, evaluate, or execute the
game, and it does not modify project files.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Area:
    name: str
    status: str
    identifiers: tuple[str, ...]
    patterns: tuple[tuple[str, str], ...]
    note: str
    warning: str


@dataclass(frozen=True)
class Finding:
    name: str
    kind: str
    line: int
    source: str
    coupling: tuple[str, ...]


COUPLING_PATTERNS = (
    ("random roll", r"\bMath\.random\b|\brand\("),
    ("state/save coupling", r"\bstate(?:\.|\?\.|\b)|\bS\.|\bplayer\.|\brun\.|\bmerchantStock\b|\binventory\b|\bequipment\b"),
    ("storage key/save path", r"\blocalStorage\b|\bSTORAGE_KEY\b|\bsave\(|\bload\("),
    ("scaling math", r"\bMath\.(?:floor|round|ceil|pow|min|max)\b|\bclamp\(|\bthreatDepthFromDepth\b|\bdepthDifficultyLadder\b|\bexpected"),
    ("combat coupling", r"\bcombatAction\b|\bhp\b|\bguard\b|\bdamage\b|\bcrit\b|\bdodge\b"),
    ("economy/reward coupling", r"\bcoins\(|\bformatMoney\b|\brewardGold\b|\brewardXp\b|\brewardShard\b|\bgoldSink\b|\bmerchantCost"),
    ("DOM/render coupling", r"\binnerHTML\b|\bdocument\.|\bel\(|\bclassList\b|\bescapeHtml\b"),
)


AREAS = (
    Area(
        name="Rarity definitions and display metadata",
        status="MIXED",
        identifiers=(
            "RARITIES",
            "rarityClass",
            "itemRarityKey",
            "getRarityCardClass",
            "cappedRarityForLevel",
            "weightedRarityForLevel",
            "rarityStatMultiplier",
        ),
        patterns=(),
        note="Rarity labels and CSS class names are plausible future data. The same table also contains multipliers and drop weights.",
        warning="Extract display labels/colors before any rarity multipliers, chances, caps, or loot tables.",
    ),
    Area(
        name="Item generation registries",
        status="RISKY",
        identifiers=(
            "SLOT_ORDER",
            "BASES",
            "PREFIXES",
            "SUFFIXES",
            "TRINKET_SUFFIXES",
            "MAKERS",
            "THEMES",
            "generateGear",
            "expectedGearRating",
            "weightedRarityForLevel",
            "cappedRarityForLevel",
            "depthLootScarcityMeta",
            "applyDepthLootScarcity",
            "lootDropChance",
            "shouldDropLoot",
        ),
        patterns=(),
        note="Base names, prefixes, suffixes, makers, and theme labels are content-like. Gear creation also calculates rating, value, rarity, and summaries.",
        warning="Do not extract item formulas or loot chances until balance-safe fixtures exist.",
    ),
    Area(
        name="Affix and elite modifier definitions",
        status="RISKY",
        identifiers=(
            "MONSTER_AFFIXES",
            "ELITE_MODIFIERS",
            "ELITE_STACKED_MODIFIER_MIN_DEPTH",
            "ELITE_STACKED_MODIFIER_MAX_COUNT",
            "eliteModifierDef",
            "eligibleEliteModifiers",
            "selectEliteModifiers",
            "eliteModifierStatProfile",
            "eliteRewardProfile",
            "normalizeEliteRewardProfile",
            "eliteModifierMarkup",
        ),
        patterns=(),
        note="Monster affix names are simple strings. Elite modifiers include display text, spawn weights, stat multipliers, reward multipliers, and combat hooks.",
        warning="Affix labels can be separated later; elite modifier behavior should stay in app.js for now.",
    ),
    Area(
        name="Enemy generation",
        status="RISKY",
        identifiers=(
            "MONSTER_FAMILIES",
            "MONSTER_TYPES",
            "MONSTER_SKILLS",
            "generateMonster",
            "expectedMonsterPowerAtDepth",
            "deepMonsterPowerMultiplier",
            "dangerRatingForDepth",
            "normalizeMonster",
            "encounterCoinReward",
        ),
        patterns=(),
        note="Enemy naming arrays are content-like. Generation is tightly bound to depth, boss/elite state, rewards, and combat stats.",
        warning="Keep enemy scaling, power, HP, reward, and boss/elite branching in app.js until a dedicated balance migration pass.",
    ),
    Area(
        name="Boss generation and boss labels",
        status="MIXED",
        identifiers=(
            "BOSS_INTERVAL",
            "BOSS_FLOOR_NAMES",
            "bossFloorNameByDepth",
            "bossThreatDepthFromDepth",
            "nextBossDepthFromDepth",
            "nextBossFloorFromDepth",
            "generateMonster",
        ),
        patterns=(),
        note="Boss floor names are good future content candidates. Boss cadence and threat-depth helpers are runtime progression logic.",
        warning="Extract labels only; leave interval, depth math, and boss selection behavior untouched.",
    ),
    Area(
        name="District and location names",
        status="SAFE_CANDIDATE",
        identifiers=(
            "DISTRICT_DATA",
            "districtByDepth",
            "districtArrivalLine",
            "districtToneClass",
            "currentStagingDistrict",
            "zoneName",
            "milestoneAtmosphereMarkup",
            "districtArrivalMarkup",
        ),
        patterns=(),
        note="District display names, lines, moods, and tone IDs are among the safest future extraction targets.",
        warning="Keep min/max gates and tone class expectations stable during any extraction.",
    ),
    Area(
        name="Merchant stock and district wares",
        status="NOT_READY",
        identifiers=(
            "DISTRICT_MARKET_WARES",
            "GOLD_SINK_DEFAULTS",
            "buildMerchantStock",
            "merchantGear",
            "rollMerchant",
            "buyMerchantItem",
            "buyDistrictWare",
            "unlockedDistrictWares",
            "merchantCostWithSetBonus",
            "activeMerchantDiscountPct",
        ),
        patterns=(),
        note="District ware names and summaries are content-like, but merchant stock generation changes item power, cost, and purchase side effects.",
        warning="Do not extract merchant stock generation or purchase behavior yet.",
    ),
    Area(
        name="Relic and mythic set definitions",
        status="MIXED",
        identifiers=(
            "MYTHIC_SET_SLOTS",
            "MYTHIC_SET_SLOT_ALIASES",
            "BASE_SLOT_ALIASES",
            "MYTHIC_SET_DEFINITIONS",
            "mythicSetDropChance",
            "shouldDropMythicSetPiece",
            "randomMythicSetDefinition",
            "generateMythicSetPiece",
            "getMythicSetDefinition",
            "isMythicSetItem",
        ),
        patterns=(),
        note="Mythic set names, piece names, roles, themes, and bonus copy are content-like. Drops and set-piece generation are balance behavior.",
        warning="Extract static lore/display fields first; keep set slots, aliases, drop chance, and generated item stats in app.js.",
    ),
    Area(
        name="Vow definitions",
        status="NOT_DETECTED",
        identifiers=("VOWS", "VOW_DEFINITIONS", "CHALLENGE_VOWS", "VOW_REWARDS"),
        patterns=((r"\bvow\b", "plain-text vow mentions"),),
        note="No explicit vow registry is expected in this build unless future challenge systems are added.",
        warning="Do not create data files for absent systems during this prep pass.",
    ),
    Area(
        name="Quest, contract, and reward tables",
        status="RISKY",
        identifiers=(
            "ELITE_CONTRACTS",
            "ELITE_CONTRACT_RISK_DEFAULTS",
            "ELITE_CONTRACT_ID_ALIASES",
            "createBaseState",
            "rewardQuest",
            "updateQuest",
            "applyQuestProgressNow",
            "calculateContractReward",
            "applyRoomMilestoneReward",
            "applyFloorMilestoneReward",
            "encounterCoinReward",
            "runRewardSummaryText",
            "runHistoryRewardText",
        ),
        patterns=((r"\bquests\s*:\s*\[", "quest literal array in createBaseState"),),
        note="Quest text and contract names are content-like. Rewards, progress banking, and run-history shaping touch save/runtime state.",
        warning="Do not extract reward math, pending reward shape, quest progress banking, or run-history save data yet.",
    ),
    Area(
        name="Deep Stair Charter constants",
        status="NOT_READY",
        identifiers=(
            "CHARTER_EARLY_STEP",
            "CHARTER_EARLY_LIMIT",
            "CHARTER_LATE_STEP",
            "CHARTER_BASE_GOLD",
            "CHARTER_EARLY_SCALE",
            "CHARTER_LATE_SCALE",
            "CHARTER_MAX_GOLD",
            "normalizeCharterMilestoneDepth",
            "getNextCharterUnlockDepth",
            "getUnlockedCharterDepth",
            "normalizeCharterDepthList",
            "charterStartDepths",
            "charterStartCost",
            "startCharterRun",
        ),
        patterns=(),
        note="The charter constants are easy to locate, but they define progression, cost, and restart behavior.",
        warning="Leave charter constants and helpers in app.js unless a dedicated charter regression pass is planned.",
    ),
    Area(
        name="Static lore and non-runtime copy",
        status="SAFE_CANDIDATE",
        identifiers=("LORE_SNIPPETS", "SESSION_LORE_LINE", "spawnQuestLore"),
        patterns=(),
        note="Static lore strings are good future extraction candidates if loading remains local/offline-safe.",
        warning="Avoid extracting strings embedded in render, save, reward, or combat functions until they are separated from behavior.",
    ),
)


def project_root() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
    cwd = Path.cwd().resolve()
    if (cwd / "app.js").exists():
        return cwd
    return Path(__file__).resolve().parents[1]


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, max(0, offset)) + 1


def match_brace(text: str, open_pos: int) -> int:
    depth = 0
    quote = ""
    escape = False
    line_comment = False
    block_comment = False
    i = open_pos
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = ""
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return open_pos


def top_level_semicolon(text: str, start: int) -> int:
    quote = ""
    escape = False
    line_comment = False
    block_comment = False
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = ""
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)
        elif ch == ";" and depth == 0:
            return i
        i += 1
    return start


def declaration_source(text: str, offset: int, kind: str) -> str:
    if kind == "function":
        open_pos = text.find("{", offset)
        if open_pos == -1:
            end = text.find("\n", offset)
            return text[offset : end if end != -1 else offset + 240]
        close_pos = match_brace(text, open_pos)
        return text[offset : close_pos + 1]
    end = top_level_semicolon(text, offset)
    if end <= offset:
        end = text.find("\n", offset)
    return text[offset : end + 1]


def coupling_labels(source: str) -> tuple[str, ...]:
    labels: list[str] = []
    for label, pattern in COUPLING_PATTERNS:
        if re.search(pattern, source):
            labels.append(label)
    return tuple(labels)


def find_identifier(text: str, name: str) -> Finding | None:
    patterns = (
        (rf"(?m)^\s*const\s+{re.escape(name)}\b", "const"),
        (rf"(?m)^\s*let\s+{re.escape(name)}\b", "let"),
        (rf"(?m)^\s*var\s+{re.escape(name)}\b", "var"),
        (rf"(?m)^\s*function\s+{re.escape(name)}\b", "function"),
    )
    for pattern, kind in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        source = declaration_source(text, match.start(), kind)
        return Finding(
            name=name,
            kind=kind,
            line=line_number(text, match.start()),
            source=source,
            coupling=coupling_labels(source),
        )
    return None


def find_pattern(text: str, pattern: str, label: str) -> Finding | None:
    match = re.search(pattern, text)
    if not match:
        return None
    start = text.rfind("\n", 0, match.start()) + 1
    end = text.find("\n", match.end())
    if end == -1:
        end = match.end()
    source = text[start:end]
    return Finding(
        name=label,
        kind="pattern",
        line=line_number(text, match.start()),
        source=source,
        coupling=coupling_labels(source),
    )


def area_findings(text: str, area: Area) -> list[Finding]:
    found: list[Finding] = []
    seen: set[tuple[str, int]] = set()
    for identifier in area.identifiers:
        finding = find_identifier(text, identifier)
        if finding and (finding.name, finding.line) not in seen:
            found.append(finding)
            seen.add((finding.name, finding.line))
    for pattern, label in area.patterns:
        finding = find_pattern(text, pattern, label)
        if finding and (finding.name, finding.line) not in seen:
            found.append(finding)
            seen.add((finding.name, finding.line))
    return found


def format_finding(finding: Finding) -> str:
    coupling = f" ({', '.join(finding.coupling)})" if finding.coupling else ""
    return f"    - line {finding.line}: {finding.kind} {finding.name}{coupling}"


def main() -> int:
    root = project_root()
    app_path = root / "app.js"
    if not app_path.exists():
        print("DungeonDex content registry audit")
        print(f"Root: {root}")
        print("FAIL: app.js not found")
        return 2

    text = app_path.read_text(encoding="utf-8")
    line_count = text.count("\n") + 1
    total_found = 0
    risky_areas = 0

    print("DungeonDex content registry audit")
    print(f"Root: {root}")
    print(f"Source: {app_path.name} ({line_count:,} lines)")
    print("Mode: text scan only; app.js is not imported, evaluated, or executed.")
    print()
    print("Detected content areas:")

    for area in AREAS:
        findings = area_findings(text, area)
        status = area.status if findings else "NOT_DETECTED"
        total_found += len(findings)
        if status in {"RISKY", "NOT_READY", "MIXED"}:
            risky_areas += 1
        print()
        print(f"[{status}] {area.name}")
        if findings:
            for finding in findings:
                print(format_finding(finding))
        else:
            print("    - no matching constants/functions found")
        print(f"  Note: {area.note}")
        print(f"  Warning: {area.warning}")

        area_coupling = sorted({label for finding in findings for label in finding.coupling})
        if area_coupling:
            print(f"  Coupling scan: {', '.join(area_coupling)}")

    print()
    print("Summary:")
    print(f"  Findings: {total_found}")
    print(f"  Areas with mixed/risky/not-ready status: {risky_areas}")
    print("  Safest later candidates: district copy, lore strings, rarity display labels/colors, affix display labels.")
    print("  Keep in app.js for now: item/enemy scaling, merchant stock, rewards, combat, save/localStorage, Deep Stair Charter behavior.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
