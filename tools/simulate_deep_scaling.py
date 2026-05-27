#!/usr/bin/env python3
"""Offline deep-floor scaling report for DungeonDex.

This script reads app.js as text for static detection only. It does not import,
evaluate, or execute the game, and it does not touch saves or browser storage.

Version context:
- v1.3.39 introduced this read-only report so deep-floor balance could be
  inspected without changing combat, loot, economy, merchants, or saves.
- v1.3.40 applied the bounded mythic/elite/boss deep-scaling alignment that
  this report now mirrors for measurement.
"""

from __future__ import annotations

import argparse
import math
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DEFAULT_CHECKPOINTS = [1, 5, 10, 20, 40, 80, 120, 200, 500, 1000, 3000, 5000]

RARITY_MULT = {
    "common": 1.0,
    "uncommon": 1.18,
    "rare": 1.42,
    "epic": 1.75,
    "legendary": 2.15,
    "mythic": 2.65,
}

SCAN_TERMS = {
    "depth threat": ["threatDepthFromDepth", "depthDifficultyLadder"],
    "enemy power": ["expectedMonsterPowerAtDepth", "deepMonsterPowerMultiplier", "generateMonster"],
    "item power": ["expectedGearRating", "rarityStatMultiplier", "mythicDepthSoftener", "generateGear"],
    "merchant stock": ["buildMerchantStock", "merchantGear"],
    "mythic": ["mythicSetDropChance", "generateMythicSetPiece"],
    "charter": ["charterStartCost", "normalizeCharterMilestoneDepth", "CHARTER_EARLY_STEP"],
    "gold": ["encounterCoinReward", "applyRoomMilestoneReward", "applyFloorMilestoneReward"],
}


@dataclass(frozen=True)
class Constants:
    copper_per_silver: int = 100
    silver_per_gold: int = 100
    depth_chapters_per_room: int = 10
    depth_rooms_per_floor: int = 15
    depth_chapters_per_threat_step: int = 3
    boss_interval: int = 5
    charter_early_step: int = 40
    charter_early_limit: int = 800
    charter_late_step: int = 5000
    charter_base_gold: int = 75
    charter_early_scale: float = 1.075
    charter_late_scale: float = 1.025
    charter_max_gold: int = 500

    @property
    def copper_per_gold(self) -> int:
        return self.copper_per_silver * self.silver_per_gold

    @property
    def depth_chapters_per_floor(self) -> int:
        return self.depth_chapters_per_room * self.depth_rooms_per_floor


@dataclass
class Checkpoint:
    depth: int
    threat: int
    layer: int
    room: int
    chapter: int
    enemy_common: int
    enemy_elite: int
    enemy_boss: int
    merchant_avg: int
    merchant_fixed_avg: int
    merchant_rare_shelf: int
    loot_rare: int
    loot_legendary: int
    mythic_boss: int
    mythic_softener: float
    normal_gold: int
    elite_gold: int
    boss_gold: int
    room_gold: int
    layer_gold: int
    charter_depth: int
    charter_cost: int
    normal_drop_pct: float
    elite_drop_pct: float
    boss_extra_drop_pct: float
    mythic_set_boss_pct: float
    warnings: list[str]


def js_round(value: float) -> int:
    return int(math.floor(value + 0.5))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def coins(gold: float = 0, silver: float = 0, copper: float = 0, c: Constants = Constants()) -> int:
    return max(0, js_round(gold * c.copper_per_gold + silver * c.copper_per_silver + copper))


def money(copper: int, c: Constants = Constants()) -> str:
    copper = max(0, int(copper))
    gold = copper // c.copper_per_gold
    copper %= c.copper_per_gold
    silver = copper // c.copper_per_silver
    copper %= c.copper_per_silver
    parts = []
    if gold:
        parts.append(f"{gold:,}g")
    if silver:
        parts.append(f"{silver}s")
    if copper or not parts:
        parts.append(f"{copper}c")
    return " ".join(parts)


def number_const(js_text: str, name: str, default: float) -> float:
    match = re.search(rf"\bconst\s+{re.escape(name)}\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*;", js_text)
    return float(match.group(1)) if match else default


def constants_from_app(js_text: str) -> Constants:
    return Constants(
        copper_per_silver=int(number_const(js_text, "COPPER_PER_SILVER", 100)),
        silver_per_gold=int(number_const(js_text, "SILVER_PER_GOLD", 100)),
        depth_chapters_per_room=int(number_const(js_text, "DEPTH_CHAPTERS_PER_ROOM", 10)),
        depth_rooms_per_floor=int(number_const(js_text, "DEPTH_ROOMS_PER_FLOOR", 15)),
        depth_chapters_per_threat_step=int(number_const(js_text, "DEPTH_CHAPTERS_PER_THREAT_STEP", 3)),
        boss_interval=int(number_const(js_text, "BOSS_INTERVAL", 5)),
        charter_early_step=int(number_const(js_text, "CHARTER_EARLY_STEP", 40)),
        charter_early_limit=int(number_const(js_text, "CHARTER_EARLY_LIMIT", 800)),
        charter_late_step=int(number_const(js_text, "CHARTER_LATE_STEP", 5000)),
        charter_base_gold=int(number_const(js_text, "CHARTER_BASE_GOLD", 75)),
        charter_early_scale=number_const(js_text, "CHARTER_EARLY_SCALE", 1.075),
        charter_late_scale=number_const(js_text, "CHARTER_LATE_SCALE", 1.025),
        charter_max_gold=int(number_const(js_text, "CHARTER_MAX_GOLD", 500)),
    )


def stage_depth(depth: int | float, fallback: int = 1) -> int:
    try:
        value = float(depth)
    except (TypeError, ValueError):
        value = float(fallback)
    if not math.isfinite(value):
        value = float(fallback)
    return max(1, int(math.floor(value)))


def threat_depth_from_depth(depth: int, c: Constants) -> int:
    return max(1, int(math.ceil(stage_depth(depth) / c.depth_chapters_per_threat_step)))


def depth_structure(depth: int, c: Constants) -> dict[str, int]:
    raw = stage_depth(depth)
    zero_based = raw - 1
    layer = zero_based // c.depth_chapters_per_floor + 1
    floor_offset = zero_based % c.depth_chapters_per_floor
    room = floor_offset // c.depth_chapters_per_room + 1
    chapter = floor_offset % c.depth_chapters_per_room + 1
    return {"raw_depth": raw, "layer": layer, "room": room, "chapter": chapter}


def depth_difficulty_ladder(depth: int, c: Constants) -> dict[str, float]:
    d = depth_structure(depth, c)
    chapter_pressure = (d["chapter"] - 1) * 0.0025
    room_pressure = (d["room"] - 1) * 0.005
    floor_pressure = min(0.15, (d["layer"] - 1) * 0.038)
    total_pressure = clamp(chapter_pressure + room_pressure + floor_pressure, 0, 0.24)
    return {
        **d,
        "chapter_pressure": chapter_pressure,
        "room_pressure": room_pressure,
        "floor_pressure": floor_pressure,
        "total_pressure": total_pressure,
        "power_mult": 1 + total_pressure,
        "hp_mult": 1 + min(0.14, room_pressure * 0.68 + floor_pressure * 0.58),
        "guard_mult": 1 + min(0.12, room_pressure * 0.48 + floor_pressure * 0.48),
        "speed_mult": 1 + min(0.065, chapter_pressure * 0.55 + room_pressure * 0.22),
        "reward_mult": 1 + min(0.10, total_pressure * 0.38),
        "elite_bonus": min(0.055, room_pressure * 0.28 + floor_pressure * 0.14),
    }


def early_stat_scale(level: int) -> float:
    if level <= 4:
        return 0.62
    if level <= 9:
        return 0.78
    if level <= 15:
        return 0.9
    return 1.0


def mythic_depth_softener(level: int, raw_depth: int = 0) -> float:
    item_level = max(1, int(math.floor(level)))
    depth = max(item_level, max(0, int(math.floor(raw_depth))))
    if depth <= 500:
        return 1.0
    band = clamp((depth - 500) / 500, 0, 1)
    return 1 - band * 0.14


def rarity_stat_multiplier(rarity: str, level: int, raw_depth: int) -> float:
    mult = RARITY_MULT.get(rarity, RARITY_MULT["common"])
    if rarity != "mythic":
        return mult
    return mult * mythic_depth_softener(level, raw_depth)


def expected_gear_rating(level: int, rarity: str = "common", source: str = "normal", raw_depth: int = 0) -> int:
    safe_level = max(1, int(math.floor(level)))
    source_scale = {"merchant": 0.96, "elite": 1.05, "boss": 1.15, "forge": 1.08}.get(source, 1.0)
    base_roll_average = safe_level * 7.5 + 5
    rating = base_roll_average * rarity_stat_multiplier(rarity, safe_level, raw_depth) * early_stat_scale(safe_level) * source_scale
    return max(3, js_round(rating))


def deep_monster_power_multiplier(raw_depth: int, tier: str, c: Constants) -> float:
    depth = stage_depth(raw_depth)
    if depth <= 800:
        return 1.0
    base = min(0.55, (depth - 800) * 0.00018)
    deep_tier_ramp = clamp((depth - 800) / 300, 0, 1)
    tier_bonus = 0.0
    if tier == "Boss":
        tier_bonus = 0.08 + deep_tier_ramp * 0.15
    elif tier == "Elite":
        tier_bonus = 0.04 + deep_tier_ramp * 0.13
    return 1 + base + tier_bonus


def expected_monster_power(depth: int, tier: str, c: Constants) -> int:
    raw = stage_depth(depth)
    threat = threat_depth_from_depth(raw, c)
    ladder = depth_difficulty_ladder(raw, c)
    boss = tier == "Boss"
    elite = tier == "Elite"
    if threat <= 3:
        early_pressure = 0.90
    elif threat <= 5:
        early_pressure = 1.0
    elif threat <= 10:
        early_pressure = 1.08
    elif threat <= 15:
        early_pressure = 1.06
    else:
        early_pressure = 1.0
    base = (threat * 9.5 + 15 + (72 if boss else 0) + (16 if elite else 0)) * early_pressure * ladder["power_mult"]
    tier_profile = 1.22 if boss else 1.16 if elite else 1.0
    return js_round(base * deep_monster_power_multiplier(raw, tier, c) * tier_profile)


def average_rating_for_offsets(threat: int, offsets: list[int], rarity: str, source: str, depth: int) -> float:
    values = [expected_gear_rating(max(1, threat + offset), rarity, source, depth) for offset in offsets]
    return sum(values) / len(values)


def merchant_stock_estimate(depth: int, c: Constants) -> dict[str, int]:
    threat = threat_depth_from_depth(depth, c)
    core = average_rating_for_offsets(threat, [-1, 0], "common", "merchant", depth)
    upgrade = average_rating_for_offsets(threat, [0, 1], "uncommon", "merchant", depth)
    flex_common = average_rating_for_offsets(threat, [-1, 0, 1], "common", "merchant", depth)
    flex_uncommon = average_rating_for_offsets(threat, [-1, 0, 1], "uncommon", "merchant", depth)
    flex = flex_common * 0.70 + flex_uncommon * 0.30
    rare_shelf = average_rating_for_offsets(threat, [0, 1, 2], "rare", "merchant", depth)
    fixed_avg = (core * 2 + upgrade + flex) / 4
    visible_avg = (core * 2 + upgrade + flex + rare_shelf * 0.10) / 4.10
    return {
        "fixed_avg": js_round(fixed_avg),
        "visible_avg": js_round(visible_avg),
        "rare_shelf": js_round(rare_shelf),
    }


def depth_loot_scarcity_meta(depth: int, source: str = "normal") -> dict[str, float]:
    raw = stage_depth(depth)
    deep_band = math.floor((raw - 40) / 40) + 1 if raw >= 40 else 0
    source_relief = 0.08 if source == "boss" else 0.04 if source == "elite" else 0.0
    high_rarity_mult = clamp(0.88 - deep_band * 0.07 + source_relief, 0.46, 1) if deep_band else 1.0
    mythic_mult = clamp(0.8 - deep_band * 0.06 + source_relief, 0.38, 1) if deep_band else 1.0
    drop_chance_mult = clamp(0.97 - deep_band * 0.025 + (0.02 if source == "boss" else 0), 0.78, 1) if deep_band else 1.0
    return {
        "raw_depth": raw,
        "deep_band": float(deep_band),
        "charter_warmup": 0.0,
        "high_rarity_mult": high_rarity_mult,
        "mythic_mult": mythic_mult,
        "drop_chance_mult": drop_chance_mult,
    }


def loot_drop_chance(depth: int, source: str, c: Constants) -> float:
    raw = stage_depth(depth)
    threat = threat_depth_from_depth(raw, c)
    base = 1.0 if source == "boss" else 0.72 if source == "elite" else 0.10
    if source == "normal":
        chance = 0.42 if threat < 6 else 0.48 if threat < 12 else 0.52
    elif threat < 5:
        chance = 0.08
    elif threat < 10:
        chance = 0.12
    elif threat < 15:
        chance = 0.16
    else:
        chance = base
    scarcity = depth_loot_scarcity_meta(raw, source)
    return clamp(chance * scarcity["drop_chance_mult"], 0.04, 1)


def boss_extra_drop_chance(depth: int) -> float:
    scarcity = depth_loot_scarcity_meta(depth, "boss")
    return clamp(0.35 * scarcity["drop_chance_mult"], 0.18, 0.35)


def mythic_set_drop_chance(depth: int, source: str = "boss", assume_safe_depth_40: bool = True) -> float:
    raw = stage_depth(depth)
    if raw < 40 or not assume_safe_depth_40:
        return 0.0
    base = 0.07 if source == "boss" else 0.028 if source == "elite" else 0.012
    cap = 0.10 if source == "boss" else 0.045 if source == "elite" else 0.025
    deep_band = max(0, math.floor((raw - 40) / 40))
    chance = min(cap, base + deep_band * 0.004)
    return clamp(chance, 0, cap)


def reward_mult_for_depth(depth: int, tier: str, c: Constants) -> float:
    threat = threat_depth_from_depth(depth, c)
    ladder = depth_difficulty_ladder(depth, c)
    if threat <= 3:
        base = 1.55 if tier == "Boss" else 1.28 if tier == "Elite" else 1.12
    else:
        base = 1.5 if tier == "Boss" else 1.18 if tier == "Elite" else 1.0
    return base * ladder["reward_mult"]


def expected_encounter_coin_reward(threat: int, tier: str, reward_mult: float, c: Constants) -> int:
    copper = 13 + threat * 11
    if tier == "Elite":
        copper = copper * 2.15 + 37.5
    if tier == "Boss":
        copper = coins(0, 1, 20, c) + threat * 33
    max_reward_mult = 1.62 if tier == "Elite" else 1.35
    copper = copper * max(0.65, min(max_reward_mult, reward_mult or 1))
    return max(6, js_round(copper))


def normalize_charter_milestone_depth(depth: int, c: Constants) -> int:
    safe = max(0, int(math.floor(depth)))
    if safe < c.charter_early_step:
        return 0
    if safe <= c.charter_early_limit:
        return (safe // c.charter_early_step) * c.charter_early_step
    return c.charter_early_limit + ((safe - c.charter_early_limit) // c.charter_late_step) * c.charter_late_step


def charter_start_cost(depth: int, c: Constants) -> tuple[int, int]:
    milestone = normalize_charter_milestone_depth(depth, c)
    start_depth = max(c.charter_early_step, milestone or c.charter_early_step)
    early_tier = math.floor(min(start_depth, c.charter_early_limit) / c.charter_early_step)
    cost_at_early_limit = c.charter_base_gold * math.pow(
        c.charter_early_scale,
        (c.charter_early_limit / c.charter_early_step) - 1,
    )
    if start_depth <= c.charter_early_limit:
        scaled_gold = c.charter_base_gold * math.pow(c.charter_early_scale, early_tier - 1)
    else:
        scaled_gold = cost_at_early_limit * math.pow(
            c.charter_late_scale,
            math.floor((start_depth - c.charter_early_limit) / c.charter_late_step),
        )
    gold = min(c.charter_max_gold, max(c.charter_base_gold, js_round(scaled_gold)))
    return coins(gold, 0, 0, c), start_depth


def ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return math.inf
    return numerator / denominator


def warning_notes(depth: int, values: dict[str, float], c: Constants) -> list[str]:
    notes: list[str] = []
    mythic_vs_normal = ratio(values["mythic_boss"], values["enemy_common"])
    mythic_vs_elite = ratio(values["mythic_boss"], values["enemy_elite"])
    mythic_vs_boss = ratio(values["mythic_boss"], values["enemy_boss"])
    mythic_vs_legendary = ratio(values["mythic_boss"], values["loot_legendary"])
    merchant_vs_normal = ratio(values["merchant_avg"], values["enemy_common"])
    rare_vs_normal = ratio(values["loot_rare"], values["enemy_common"])

    if depth >= 1000:
        if mythic_vs_legendary < 1.04:
            notes.append("mythic identity thin vs legendary boss loot")
        if mythic_vs_boss > 1.15:
            notes.append("Mythic outruns boss pressure")
        if mythic_vs_elite > 1.30:
            notes.append("Mythic outruns elite pressure")
        if mythic_vs_normal > 1.65:
            notes.append("mythic estimate is ahead of common enemy power")
        if mythic_vs_normal < 0.95:
            notes.append("normal enemy power may be steep vs mythic item estimate")
    else:
        if mythic_vs_legendary < 1.04:
            notes.append("watch mythic vs legendary spread")

    if merchant_vs_normal < 0.45 and depth >= 80:
        notes.append("Merchant trails enemies")
    if rare_vs_normal < 0.55 and depth >= 200:
        notes.append("rare loot estimate trails normal enemy power")

    charter_cost = values["charter_cost"]
    normal_gold = max(1, values["normal_gold"])
    common_wins = ratio(charter_cost, normal_gold)
    if depth >= c.charter_early_step and common_wins > 250:
        notes.append("Charter cost high vs common gold")
    if depth >= c.charter_early_limit and values["charter_depth"] < depth:
        if c.charter_late_step > c.charter_early_step and int(values["charter_depth"]) == c.charter_early_limit:
            notes.append(
                f"Charter milestone gap appears intentional under configured post-D{c.charter_early_limit:,} spacing; "
                f"latest charter is D{int(values['charter_depth']):,}"
            )
        else:
            notes.append(f"between charter milestones; latest charter is D{int(values['charter_depth']):,}")

    return notes


def checkpoint(depth: int, c: Constants) -> Checkpoint:
    raw = stage_depth(depth)
    d = depth_structure(raw, c)
    threat = threat_depth_from_depth(raw, c)
    enemy_common = expected_monster_power(raw, "Common", c)
    enemy_elite = expected_monster_power(raw, "Elite", c)
    enemy_boss = expected_monster_power(raw, "Boss", c)
    merchant = merchant_stock_estimate(raw, c)
    loot_rare = expected_gear_rating(threat, "rare", "normal", raw)
    loot_legendary = expected_gear_rating(threat, "legendary", "boss", raw)
    mythic_boss = expected_gear_rating(threat, "mythic", "boss", raw)
    normal_gold = expected_encounter_coin_reward(threat, "Common", reward_mult_for_depth(raw, "Common", c), c)
    elite_gold = expected_encounter_coin_reward(threat, "Elite", reward_mult_for_depth(raw, "Elite", c), c)
    boss_gold = expected_encounter_coin_reward(threat, "Boss", reward_mult_for_depth(raw, "Boss", c), c)
    room_gold = max(coins(0, 0, 14, c), js_round(coins(0, 0, 14, c) + threat * 4.5))
    layer_gold = max(coins(0, 1, 80, c), js_round(coins(0, 1, 80, c) + threat * 13.5))
    charter_cost, charter_depth = charter_start_cost(raw, c)
    values = {
        "enemy_common": enemy_common,
        "enemy_elite": enemy_elite,
        "enemy_boss": enemy_boss,
        "loot_rare": loot_rare,
        "loot_legendary": loot_legendary,
        "mythic_boss": mythic_boss,
        "merchant_avg": merchant["visible_avg"],
        "normal_gold": normal_gold,
        "charter_cost": charter_cost,
        "charter_depth": charter_depth,
    }
    return Checkpoint(
        depth=raw,
        threat=threat,
        layer=d["layer"],
        room=d["room"],
        chapter=d["chapter"],
        enemy_common=enemy_common,
        enemy_elite=enemy_elite,
        enemy_boss=enemy_boss,
        merchant_avg=merchant["visible_avg"],
        merchant_fixed_avg=merchant["fixed_avg"],
        merchant_rare_shelf=merchant["rare_shelf"],
        loot_rare=loot_rare,
        loot_legendary=loot_legendary,
        mythic_boss=mythic_boss,
        mythic_softener=mythic_depth_softener(threat, raw),
        normal_gold=normal_gold,
        elite_gold=elite_gold,
        boss_gold=boss_gold,
        room_gold=room_gold,
        layer_gold=layer_gold,
        charter_depth=charter_depth,
        charter_cost=charter_cost,
        normal_drop_pct=loot_drop_chance(raw, "normal", c) * 100,
        elite_drop_pct=loot_drop_chance(raw, "elite", c) * 100,
        boss_extra_drop_pct=boss_extra_drop_chance(raw) * 100,
        mythic_set_boss_pct=mythic_set_drop_chance(raw, "boss") * 100,
        warnings=warning_notes(raw, values, c),
    )


def static_scan(js_text: str) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for category, terms in SCAN_TERMS.items():
        hits = [term for term in terms if re.search(rf"\b{re.escape(term)}\b", js_text)]
        found[category] = hits
    return found


def table(headers: list[str], rows: list[list[str]]) -> list[str]:
    widths = [len(header) for header in headers]
    for row in rows:
        for index, value in enumerate(row):
            widths[index] = max(widths[index], len(value))
    line = "  ".join(header.ljust(widths[index]) for index, header in enumerate(headers))
    divider = "  ".join("-" * widths[index] for index in range(len(headers)))
    output = [line, divider]
    for row in rows:
        output.append("  ".join(value.ljust(widths[index]) for index, value in enumerate(row)))
    return output


def compact_int(value: int | float) -> str:
    return f"{int(round(value)):,}"


def pct(value: float) -> str:
    return f"{value:.1f}%"


def parse_checkpoints(raw: str) -> list[int]:
    values: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            value = int(part)
        except ValueError as exc:
            raise argparse.ArgumentTypeError(f"Invalid checkpoint: {part}") from exc
        if value < 1:
            raise argparse.ArgumentTypeError("Checkpoints must be positive integers")
        values.append(value)
    if not values:
        raise argparse.ArgumentTypeError("At least one checkpoint is required")
    return values


def default_root() -> Path:
    cwd = Path.cwd().resolve()
    if (cwd / "app.js").exists():
        return cwd
    parent = Path(__file__).resolve().parents[1]
    return parent


def build_report(root: Path, checkpoints: list[int]) -> tuple[str, list[Checkpoint]]:
    app_path = root / "app.js"
    js_text = app_path.read_text(encoding="utf-8", errors="replace") if app_path.exists() else ""
    constants = constants_from_app(js_text)
    scan = static_scan(js_text)
    rows = [checkpoint(depth, constants) for depth in checkpoints]
    detected_count = sum(len(hits) for hits in scan.values())
    expected_count = sum(len(terms) for terms in SCAN_TERMS.values())

    power_rows = [
        [
            f"D{row.depth:,}",
            f"F{row.threat:,}",
            f"L{row.layer} R{row.room} C{row.chapter}",
            compact_int(row.enemy_common),
            compact_int(row.enemy_elite),
            compact_int(row.enemy_boss),
            compact_int(row.merchant_avg),
            compact_int(row.loot_rare),
            compact_int(row.loot_legendary),
            compact_int(row.mythic_boss),
            f"{row.mythic_softener:.3f}",
        ]
        for row in rows
    ]
    economy_rows = [
        [
            f"D{row.depth:,}",
            money(row.normal_gold, constants),
            money(row.elite_gold, constants),
            money(row.boss_gold, constants),
            money(row.room_gold, constants),
            money(row.layer_gold, constants),
            f"D{row.charter_depth:,}",
            money(row.charter_cost, constants),
            f"{ratio(row.charter_cost, max(1, row.normal_gold)):.1f}",
        ]
        for row in rows
    ]
    drop_rows = [
        [
            f"D{row.depth:,}",
            pct(row.normal_drop_pct),
            pct(row.elite_drop_pct),
            "100.0%",
            pct(row.boss_extra_drop_pct),
            pct(row.mythic_set_boss_pct),
            compact_int(row.merchant_fixed_avg),
            compact_int(row.merchant_rare_shelf),
        ]
        for row in rows
    ]

    lines: list[str] = []
    lines.append("DungeonDex v1.3.41 Deep Scaling Report")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Project root: {root}")
    lines.append(f"Static source: {app_path if app_path.exists() else 'app.js missing'}")
    lines.append("")
    lines.append("Scope")
    lines.append("- Offline standard-library tool; no pip packages, no internet, no game runtime.")
    lines.append("- Reads app.js as text for detection only; avoids eval and does not execute browser code.")
    lines.append("- Checkpoints are raw Depth values. Threat Floor is ceil(Depth / threat step).")
    lines.append("- Random rolls are collapsed to conservative expected averages for inspection.")
    lines.append("")
    lines.append("Version Context")
    lines.append("- v1.3.39: added the offline simulator/report only; no balance or save changes.")
    lines.append("- v1.3.40: applied bounded deep-floor mythic, elite, and boss alignment; merchants, gold, charters, drop rates, and saves stayed unchanged.")
    lines.append("- v1.3.41: report readability and release documentation only; no formula changes.")
    lines.append("")
    lines.append("Static Formula Scan")
    lines.append(f"- Detected {detected_count}/{expected_count} searched helper or constant names.")
    for category, hits in scan.items():
        status = ", ".join(hits) if hits else "none found"
        lines.append(f"- {category}: {status}")
    lines.append("")
    lines.append("Formula Confidence")
    lines.append("- Exact mirrors: threat depth, depth structure, depth difficulty ladder, expected gear rating, expected monster power, mythic softener, charter cost.")
    lines.append("- Estimates: merchant stock average, encounter gold averages, milestone gold averages, loot/drop probabilities, mythic set chance assuming D40 safe progress is available.")
    lines.append("")
    lines.append("Power Checkpoints")
    lines.extend(
        table(
            [
                "Depth",
                "Threat",
                "Layer",
                "Common Enemy",
                "Elite Enemy",
                "Boss Enemy",
                "Merchant Stock",
                "Rare Loot",
                "Legendary Loot",
                "Mythic Estimate",
                "Mythic Softener",
            ],
            power_rows,
        )
    )
    lines.append("")
    lines.append("Economy And Charter Pressure")
    lines.extend(
        table(
            ["Depth", "Common Gold", "Elite Gold", "Boss Gold", "Room Bonus", "Layer Bonus", "Charter", "Cost", "Common Wins To Charter"],
            economy_rows,
        )
    )
    lines.append("")
    lines.append("Loot And Merchant Detail")
    lines.extend(
        table(
            ["Depth", "Normal Drop", "Elite Drop", "Boss Drop 1", "Boss Drop 2", "Mythic Set Boss", "Merchant Fixed", "Rare Shelf"],
            drop_rows,
        )
    )
    lines.append("")
    lines.append("Warnings")
    warning_lines = []
    for row in rows:
        for item in row.warnings:
            warning_lines.append(f"- D{row.depth:,}: {item}")
    if warning_lines:
        lines.extend(warning_lines)
    else:
        lines.append("- none")
    lines.append("")
    lines.append("Reminder")
    lines.append("- This report is measurement only. It does not recommend or apply gameplay, save, merchant, enemy, loot, mythic, charter, or UI changes.")
    return "\n".join(lines), rows


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline DungeonDex deep scaling simulator report.")
    parser.add_argument("--root", type=Path, default=default_root(), help="Project root containing app.js.")
    parser.add_argument(
        "--checkpoints",
        type=parse_checkpoints,
        default=DEFAULT_CHECKPOINTS,
        help="Comma-separated raw depth checkpoints. Default: common deep-scaling checkpoints.",
    )
    parser.add_argument(
        "--write-report",
        nargs="?",
        const="DEEP_SCALING_SIMULATION_REPORT.txt",
        help="Optionally write the report to a text file. Defaults to DEEP_SCALING_SIMULATION_REPORT.txt when no path is provided.",
    )
    args = parser.parse_args(argv)

    root = args.root.resolve()
    report, _rows = build_report(root, list(args.checkpoints))
    print(report)

    if args.write_report:
        output_path = Path(args.write_report)
        if not output_path.is_absolute():
            output_path = root / output_path
        output_path.write_text(report + "\n", encoding="utf-8")
        print()
        print(f"Wrote report: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
