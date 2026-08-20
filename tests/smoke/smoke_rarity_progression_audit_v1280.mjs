#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SYSTEM_FILES = [
  'js/systems/00_core_constants_data.js',
  'js/systems/01_state_recovery.js',
  'js/systems/02_currency_pending_rewards.js',
  'js/systems/03_town_contracts_market.js',
  'js/systems/04_depth_progression_charters.js',
  'js/systems/05_elite_modifiers.js',
  'js/systems/06_scaling_generation_audits.js',
  'js/systems/07_player_combat_runtime.js',
  'js/systems/08_normalization_save.js'
];

const RARITY_KEYS = Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
const CHECKPOINTS = Object.freeze([1, 15, 30, 39, 40, 42, 43, 45, 80, 120, 800]);
const SOURCES = Object.freeze(['normal', 'elite', 'boss']);
const RARITY_SAMPLES = 20_000;
const SET_COLLECTION_TRIALS = 30_000;
const COMPACT = process.env.DUNGEONDEX_SMOKE_COMPACT === '1';

function plain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(...parts) {
  const input = parts.join('|');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function quantile(sortedValues, percentile) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * percentile) - 1));
  return sortedValues[index];
}

async function loadRuntime() {
  let randomSource = mulberry32(1);
  let idCounter = 0;
  const runtimeMath = Object.create(Math);
  runtimeMath.random = () => randomSource();
  const rarityKeys = new Set(RARITY_KEYS);
  const context = {
    console,
    Date,
    Math: runtimeMath,
    Object,
    JSON,
    Map,
    Set,
    Uint32Array,
    setTimeout,
    clearTimeout,
    addEventListener() {},
    document: {
      readyState: 'complete',
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
      clear() {}
    },
    navigator: {},
    location: { protocol: 'file:', hostname: '' },
    crypto: {
      randomUUID() {
        idCounter += 1;
        return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
      },
      getRandomValues(array) {
        for (let index = 0; index < array.length; index += 1) {
          idCounter += 1;
          array[index] = idCounter >>> 0;
        }
        return array;
      }
    },
    itemRarityKey(item) {
      const key = String(item?.rarity || '').toLowerCase();
      return rarityKeys.has(key) ? key : 'common';
    },
    showExtractionPopup() {},
    showDefeatPopup() {}
  };
  context.window = context;
  context.globalThis = context;
  const sandbox = vm.createContext(context);

  for (const file of SYSTEM_FILES) {
    const source = await readFile(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, sandbox, { filename: file });
  }

  vm.runInContext(`globalThis.__rarityAuditApi = {
    RARITIES,
    MYTHIC_SET_SLOTS,
    MYTHIC_SET_DEFINITIONS,
    createBaseState,
    cappedRarityForLevel,
    weightedRarityForLevel,
    lootDropChance,
    shouldDropLoot,
    mythicSetDropChance,
    depthLootScarcityMeta,
    threatDepthFromDepth
  };`, sandbox);

  return {
    api: sandbox.__rarityAuditApi,
    setRandom(nextRandom) {
      randomSource = typeof nextRandom === 'function' ? nextRandom : mulberry32(Number(nextRandom) || 1);
    }
  };
}

function auditState(runtime, safeExtractDepth, rawDepth) {
  const state = plain(runtime.api.createBaseState());
  state.player.safeExtractDepth = safeExtractDepth;
  state.run.active = true;
  state.run.floor = rawDepth;
  state.run.startedFromCharter = false;
  state.run.charterStartFloor = 0;
  return state;
}

function sampleRarityDistribution(runtime, rawDepth, source, state) {
  const counts = Object.fromEntries(RARITY_KEYS.map(key => [key, 0]));
  const level = runtime.api.threatDepthFromDepth(rawDepth);
  for (let index = 0; index < RARITY_SAMPLES; index += 1) {
    runtime.setRandom(() => (index + 0.5) / RARITY_SAMPLES);
    const rarity = runtime.api.weightedRarityForLevel(level, source, { depthRaw: rawDepth, state });
    counts[rarity.key] += 1;
  }
  return Object.fromEntries(RARITY_KEYS.map(key => [key, counts[key] / RARITY_SAMPLES]));
}

function secondBossDropChance(runtime, rawDepth, state) {
  const scarcity = runtime.api.depthLootScarcityMeta(rawDepth, 'boss', state);
  return clamp(0.35 * scarcity.dropChanceMult, 0.18, 0.35);
}

function buildAuditRows(runtime) {
  const rows = [];
  for (const rawDepth of CHECKPOINTS) {
    const safeExtractDepth = rawDepth >= 40 ? 40 : Math.max(1, rawDepth);
    const state = auditState(runtime, safeExtractDepth, rawDepth);
    for (const source of SOURCES) {
      const conditional = sampleRarityDistribution(runtime, rawDepth, source, state);
      const setChance = runtime.api.mythicSetDropChance(rawDepth, source, state);
      const dropsPerEncounter = source === 'boss'
        ? 1 + secondBossDropChance(runtime, rawDepth, state)
        : runtime.api.lootDropChance(rawDepth, source, state);
      const legendaryShare = (1 - setChance) * conditional.legendary;
      const mythicShare = setChance + (1 - setChance) * conditional.mythic;
      rows.push({
        rawDepth,
        threat: runtime.api.threatDepthFromDepth(rawDepth),
        source,
        deepBand: runtime.api.depthLootScarcityMeta(rawDepth, source, state).deepBand,
        dropsPerEncounter,
        setChance,
        conditional,
        legendaryShare,
        mythicShare,
        highTierPerEncounter: dropsPerEncounter * (legendaryShare + mythicShare)
      });
    }
  }
  return rows;
}

function simulateFirstCompleteSet() {
  const drops = [];
  const duplicates = [];
  const uniquePieces = [];
  for (let trial = 0; trial < SET_COLLECTION_TRIALS; trial += 1) {
    const random = mulberry32(seedFor('rarity-audit-set', trial));
    const owned = Array.from({ length: 4 }, () => new Set());
    const seen = new Set();
    let dropCount = 0;
    while (!owned.some(slots => slots.size === 5)) {
      const pieceIndex = Math.floor(random() * 20);
      const setIndex = Math.floor(pieceIndex / 5);
      const slotIndex = pieceIndex % 5;
      owned[setIndex].add(slotIndex);
      seen.add(pieceIndex);
      dropCount += 1;
    }
    drops.push(dropCount);
    duplicates.push(dropCount - seen.size);
    uniquePieces.push(seen.size);
  }
  drops.sort((a, b) => a - b);
  duplicates.sort((a, b) => a - b);
  uniquePieces.sort((a, b) => a - b);
  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    trials: SET_COLLECTION_TRIALS,
    averageDrops: average(drops),
    medianDrops: quantile(drops, 0.5),
    p90Drops: quantile(drops, 0.9),
    p95Drops: quantile(drops, 0.95),
    averageDuplicates: average(duplicates),
    medianDuplicates: quantile(duplicates, 0.5),
    averageUniquePieces: average(uniquePieces)
  };
}

function rowAt(rows, rawDepth, source) {
  const row = rows.find(candidate => candidate.rawDepth === rawDepth && candidate.source === source);
  assert.ok(row, `missing D${rawDepth} ${source} audit row`);
  return row;
}

function percent(value, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

function printReport(rows, collection) {
  console.log('DungeonDex v1.28.0 rarity/progression baseline (current formulas; no tuning applied)');
  console.log('Depth | Threat | Source | Gear/encounter | Legendary/drop | Mythic/drop | Set/drop | High-tier/encounter');
  for (const row of rows) {
    console.log([
      `D${row.rawDepth}`,
      row.threat,
      row.source,
      row.dropsPerEncounter.toFixed(4),
      percent(row.legendaryShare),
      percent(row.mythicShare),
      percent(row.setChance),
      row.highTierPerEncounter.toFixed(4)
    ].join(' | '));
  }
  console.log(`First complete 5-piece set across four uniform sets (${collection.trials.toLocaleString('en-US')} trials): median ${collection.medianDrops} set drops, p90 ${collection.p90Drops}, p95 ${collection.p95Drops}, average ${collection.averageDrops.toFixed(2)}; average duplicates ${collection.averageDuplicates.toFixed(2)}.`);
}

const runtime = await loadRuntime();
const rarityKeys = plain(runtime.api.RARITIES).map(rarity => rarity.key);
assert.deepEqual(rarityKeys, RARITY_KEYS, 'rarity ladder should remain common through mythic');

const setDefinitions = plain(runtime.api.MYTHIC_SET_DEFINITIONS);
const setSlots = plain(runtime.api.MYTHIC_SET_SLOTS);
assert.equal(Object.keys(setDefinitions).length, 4, 'the baseline should contain four mythic sets');
assert.equal(setSlots.length, 5, 'each mythic set should use five existing equipment slots');
for (const setDefinition of Object.values(setDefinitions)) {
  assert.deepEqual(setDefinition.slots, setSlots, `${setDefinition.name} should use the shared five-slot contract`);
  assert.equal(Object.keys(setDefinition.pieceNames).length, 5, `${setDefinition.name} should define all five pieces`);
}

const mutationState = auditState(runtime, 40, 40);
const stateBefore = JSON.stringify(mutationState);
runtime.setRandom(() => 0.5);
runtime.api.weightedRarityForLevel(runtime.api.threatDepthFromDepth(40), 'boss', { depthRaw: 40, state: mutationState });
runtime.api.lootDropChance(40, 'elite', mutationState);
runtime.api.shouldDropLoot(40, 'boss', 1, mutationState);
runtime.api.mythicSetDropChance(40, 'boss', mutationState);
assert.equal(JSON.stringify(mutationState), stateBefore, 'the rarity audit surface should not mutate player or run state');

const lockedState = auditState(runtime, 39, 40);
const eligibleState = auditState(runtime, 40, 40);
assert.equal(runtime.api.mythicSetDropChance(39, 'boss', eligibleState), 0, 'mythic set drops should be locked before D40');
assert.equal(runtime.api.mythicSetDropChance(40, 'boss', lockedState), 0, 'D40 should still require a recorded safe extraction at D40');
assert.equal(runtime.api.mythicSetDropChance(40, 'boss', eligibleState), 0.07, 'eligible D40 boss set chance should remain 7% per gear drop');
assert.equal(runtime.api.depthLootScarcityMeta(39, 'normal', eligibleState).deepBand, 0, 'scarcity should be inactive at D39');
assert.equal(runtime.api.depthLootScarcityMeta(40, 'normal', eligibleState).deepBand, 1, 'the first scarcity band should start at D40');

const rows = buildAuditRows(runtime);
for (const row of rows) {
  const conditionalTotal = Object.values(row.conditional).reduce((sum, chance) => sum + chance, 0);
  assert.ok(Math.abs(conditionalTotal - 1) < 0.00001, `D${row.rawDepth} ${row.source} conditional rarity shares should sum to 100%`);
  assert.ok(row.dropsPerEncounter >= 0 && row.dropsPerEncounter <= 1.35, `D${row.rawDepth} ${row.source} gear expectation should remain bounded`);
}

assert.ok(rowAt(rows, 15, 'elite').dropsPerEncounter < rowAt(rows, 15, 'normal').dropsPerEncounter, 'early elite gear frequency should be captured below normal gear frequency');
assert.ok(rowAt(rows, 30, 'elite').dropsPerEncounter < rowAt(rows, 30, 'normal').dropsPerEncounter, 'midgame elite gear frequency should be captured below normal gear frequency');
assert.ok(rowAt(rows, 45, 'elite').dropsPerEncounter > rowAt(rows, 45, 'normal').dropsPerEncounter, 'late elite gear frequency should be captured above normal gear frequency');
assert.equal(rowAt(rows, 42, 'normal').conditional.mythic, 0, 'non-set normal Mythic rolls should still be unavailable at threat 14');
assert.ok(rowAt(rows, 43, 'normal').conditional.mythic > 0, 'non-set normal Mythic rolls should start at threat 15');
assert.equal(rowAt(rows, 42, 'boss').conditional.mythic, 0, 'non-set boss Mythic rolls should still be unavailable at threat 14');
assert.ok(rowAt(rows, 43, 'boss').conditional.mythic > 0, 'non-set boss Mythic rolls should start at threat 15');

const collection = simulateFirstCompleteSet();
assert.ok(collection.medianDrops > 5, 'four-set duplication should require more than five set drops at the median');
assert.ok(collection.p90Drops > collection.medianDrops, 'the set-completion p90 should expose a meaningful long tail');
assert.ok(collection.averageDuplicates > 0, 'the set-completion baseline should record duplicate pieces');

if (!COMPACT) printReport(rows, collection);
console.log(`PASS Rarity progression audit v1.28.0: ${rows.length} depth/source rows, four 5-piece sets, D40 gate/scarcity boundary, early-elite frequency crossover, and ${collection.trials.toLocaleString('en-US')}-trial duplicate burden captured without mutating gameplay state.`);
