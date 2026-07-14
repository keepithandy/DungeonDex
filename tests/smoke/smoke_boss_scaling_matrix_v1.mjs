#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

const BOSS_COUNT = 20;
const RAW_BOSS_INTERVAL = 15;
const TRIALS_PER_POLICY = 200;
const TRIALS_PER_FIXTURE = TRIALS_PER_POLICY * 3;
const TURN_LIMIT = 200;
const MAX_ROLL = 1 - Number.EPSILON;
const OVERMATCHED_COPY = 'Overmatched: this boss outclasses your current build. Temper gear at The Ashen Anvil before challenging it.';
const STRICT_BANDS = process.argv.includes('--strict-bands');
const PRINT_SIGNATURES = process.argv.includes('--print-signatures');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const COMPACT = process.env.DUNGEONDEX_SMOKE_COMPACT === '1';

// The current curve does not meet the provisional bands. Default mode keeps
// structural/regression coverage green while reporting that audit failure;
// --strict-bands turns those findings into a non-zero test result.

// These signatures lock every deterministic matrix layer independently from
// the provisional readiness/combat audit bands.
const EXPECTED_SIGNATURES = Object.freeze({
  bosses: 'e26ad58c9a701dcfb4cf99a1d4e9a56683aad7b6ea9fec223d723b2bfb165ff4',
  boundaries: '9289dcf810262f7d20ccaa11f1469fa3b63ced84c9c8b5d6091c1193f9782400',
  rewards: '7e1ffd5d75fed8a069d21861ce1aaec95b4704c3bd4593aeed019c3a7c3c9eaf',
  drops: '1849879d2d98cb7e62ca7f2f99cb247fb24423bad9811f3f3b37d8ab0f1f2e93',
  adjacentNormals: '8310543e136d8f46599f584f99dd969dbfe393c4f345b27509b6c2cac626d9d1',
  fixtures: 'a32c2f251d9623e34556df882de157248babe7877e73fcaf880d939f95b2bd5f',
  combat: '56f3a410e42019f5ced4397161b37e0453a5c951c6a0aeefcaaa9c5b78e40f9e'
});

const ROLL_MODES = Object.freeze([
  { key: 'min', value: 0 },
  { key: 'mid', value: 0.5 },
  { key: 'max', value: MAX_ROLL }
]);

const PROFILE_RULES = Object.freeze({
  natural: Object.freeze({ extraBandClears: 0, upgradeTarget: 1 }),
  strong: Object.freeze({ extraBandClears: 2, upgradeTarget: 3 }),
  reasonableMax: Object.freeze({ extraBandClears: 7, upgradeTarget: 3 })
});

// Progression can be farmed indefinitely, so "reasonableMax" is deliberately bounded:
// one natural clear plus seven repeat clears of the preceding 15-depth band.
// Fixtures use real dropped gear and Ashen Anvil upgrades only; Market purchases
// and Lowfire Forge crafts are excluded because they need separate budget rules.

const POLICY_NAMES = Object.freeze(['attack-heavy', 'skill-first', 'defensive']);

function plain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clone(value) {
  return plain(value);
}

function signature(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

function sequenceRandom(values, fallback) {
  const queue = values.slice();
  return () => queue.length ? queue.shift() : fallback;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? +(numerator / denominator).toFixed(2) : Number.POSITIVE_INFINITY;
}

async function loadRuntime() {
  let randomSource = mulberry32(1);
  let idCounter = 0;
  const runtimeMath = Object.create(Math);
  runtimeMath.random = () => randomSource();
  const rarityKeys = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
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

  vm.runInContext(`globalThis.__bossMatrixApi = {
    BOSS_FLOOR_NAMES,
    SLOT_ORDER,
    RARITIES,
    createBaseState,
    createPendingRunRewards,
    cappedRarityForLevel,
    threatDepthFromDepth,
    bossFloorNameByDepth,
    lateFloorPowerPressure,
    deepMonsterPowerMultiplier,
    lootDropChance,
    generateGear,
    generateMonster,
    calcDerived,
    combatAction,
    xpGain,
    addPlayerGold,
    normalizeMonster,
    bossReadinessModel,
    shouldDropLoot,
    shouldDropMythicSetPiece,
    generateMythicSetPiece,
    buyMerchantGearUpgrade,
    restPlayer,
    rand,
    pick
  };`, sandbox);

  return {
    api: sandbox.__bossMatrixApi,
    setRandom(nextRandom) {
      randomSource = typeof nextRandom === 'function' ? nextRandom : mulberry32(Number(nextRandom) || 1);
    }
  };
}

function bossProjection(monster) {
  return {
    tier: monster.tier,
    level: monster.level,
    power: monster.power,
    maxHp: monster.maxHp,
    guard: monster.guard,
    speed: monster.speed,
    rewardGold: monster.rewardGold,
    rewardXp: monster.rewardXp,
    rewardShard: monster.rewardShard
  };
}

function stableMonsterSnapshot(monster) {
  const { id: _generatedId, ...stable } = plain(monster);
  return stable;
}

function generateBoss(runtime, rawDepth, roll) {
  runtime.setRandom(() => roll);
  return plain(runtime.api.generateMonster(rawDepth, null));
}

function generateCommon(runtime, rawDepth, roll) {
  // Family, type, elite rejection, then the selected stat/reward roll.
  runtime.setRandom(sequenceRandom([roll, roll, MAX_ROLL], roll));
  const monster = plain(runtime.api.generateMonster(rawDepth, null));
  assert.equal(monster.tier, 'Common', `D${rawDepth} should be forced to a Common fixture`);
  return monster;
}

function buildGenerationMatrix(runtime) {
  const rows = [];
  const rewards = [];
  const adjacentNormals = [];

  for (let bossNumber = 1; bossNumber <= BOSS_COUNT; bossNumber += 1) {
    const rawDepth = bossNumber * RAW_BOSS_INTERVAL;
    const threatFloor = runtime.api.threatDepthFromDepth(rawDepth);
    const encounterName = runtime.api.bossFloorNameByDepth(rawDepth);
    assert.equal(encounterName, runtime.api.BOSS_FLOOR_NAMES[threatFloor], `Boss ${bossNumber} should use its named floor`);
    assert.ok(encounterName, `Boss ${bossNumber} at D${rawDepth} should have a named encounter`);

    const row = { bossNumber, rawDepth, threatFloor, encounterName, rolls: {} };
    for (const mode of ROLL_MODES) {
      const boss = generateBoss(runtime, rawDepth, mode.value);
      assert.equal(boss.tier, 'Boss', `Boss ${bossNumber} ${mode.key} roll should generate as Boss`);
      assert.equal(boss.level, rawDepth, `Boss ${bossNumber} should preserve raw depth`);
      row.rolls[mode.key] = bossProjection(boss);
      rewards.push({ bossNumber, mode: mode.key, rewardGold: boss.rewardGold, rewardXp: boss.rewardXp, rewardShard: boss.rewardShard });

      for (const adjacentDepth of [rawDepth - 1, rawDepth + 1]) {
        const normal = generateCommon(runtime, adjacentDepth, mode.value);
        adjacentNormals.push({
          rawDepth: adjacentDepth,
          side: adjacentDepth < rawDepth ? 'before' : 'after',
          bossNumber,
          mode: mode.key,
          monster: stableMonsterSnapshot(normal)
        });
      }
    }

    for (const stat of ['power', 'maxHp', 'guard', 'speed']) {
      assert.ok(row.rolls.min[stat] <= row.rolls.mid[stat], `Boss ${bossNumber} ${stat} min should not exceed midpoint`);
      assert.ok(row.rolls.mid[stat] <= row.rolls.max[stat], `Boss ${bossNumber} ${stat} midpoint should not exceed max`);
    }
    rows.push(row);
  }

  assert.equal(Object.keys(runtime.api.BOSS_FLOOR_NAMES).length, BOSS_COUNT, 'boss floor catalog should contain exactly 20 named encounters');
  assert.equal(new Set(rows.map(row => row.encounterName)).size, BOSS_COUNT, 'all 20 boss encounter names should be unique');
  const bossTwo = rows.find(row => row.bossNumber === 2);
  assert.ok(bossTwo.rolls.min.power >= 650 && bossTwo.rolls.max.power <= 850, `Boss 2 should remain in its 650-850 PWR band; got ${bossTwo.rolls.min.power}-${bossTwo.rolls.max.power}`);

  for (let rawDepth = 1; rawDepth <= BOSS_COUNT * RAW_BOSS_INTERVAL; rawDepth += 1) {
    runtime.setRandom(() => MAX_ROLL);
    const monster = runtime.api.generateMonster(rawDepth, null);
    assert.equal(monster.tier === 'Boss', rawDepth % RAW_BOSS_INTERVAL === 0, `Boss cadence mismatch at D${rawDepth}`);
  }

  return { rows, rewards, adjacentNormals };
}

function buildBoundaryMatrix(runtime) {
  const depths = [39, 40, 41, 89, 90, 91, 795, 799, 800, 801, 810];
  const rows = depths.map(rawDepth => {
    const monster = rawDepth % RAW_BOSS_INTERVAL === 0
      ? generateBoss(runtime, rawDepth, 0.5)
      : generateCommon(runtime, rawDepth, 0.5);
    return { rawDepth, latePressure: runtime.api.lateFloorPowerPressure(rawDepth), deepCommon: +runtime.api.deepMonsterPowerMultiplier(rawDepth, 'Common').toFixed(5), deepBoss: +runtime.api.deepMonsterPowerMultiplier(rawDepth, 'Boss').toFixed(5), ...bossProjection(monster) };
  });

  assert.equal(runtime.api.lateFloorPowerPressure(40), 10, 'D40 should retain the first late-pressure boundary');
  assert.equal(runtime.api.lateFloorPowerPressure(41), 10.82, 'D41 should enter the next late-pressure segment');
  assert.equal(runtime.api.lateFloorPowerPressure(90), 51, 'D90 should retain the second late-pressure boundary');
  assert.equal(runtime.api.lateFloorPowerPressure(91), 51.02, 'D91 should enter the capped deep-pressure segment');
  assert.equal(runtime.api.deepMonsterPowerMultiplier(800, 'Boss'), 1, 'deep boss multiplier should remain dormant through D800');
  assert.ok(runtime.api.deepMonsterPowerMultiplier(801, 'Boss') > 1, 'deep boss multiplier should activate after D800');
  assert.equal(rows.find(row => row.rawDepth === 795)?.tier, 'Boss', 'D795 should cover the last boss before the deep boundary');
  assert.equal(rows.find(row => row.rawDepth === 810)?.tier, 'Boss', 'D810 should cover the first boss after the deep boundary');
  return rows;
}

function buildDropContract(runtime) {
  const depths = [14, 15, 29, 30, 44, 45, 89, 90, 799, 800, 801];
  const probabilityRows = [];
  const decisionRows = [];
  for (const rawDepth of depths) {
    for (const source of ['normal', 'elite', 'boss']) {
      probabilityRows.push({ rawDepth, source, chance: +runtime.api.lootDropChance(rawDepth, source, null).toFixed(8) });
      for (const roll of [0.05, 0.5, 0.95]) {
        for (const rollIndex of [0, 1]) {
          runtime.setRandom(() => roll);
          decisionRows.push({ rawDepth, source, roll, rollIndex, drops: runtime.api.shouldDropLoot(rawDepth, source, rollIndex, null) });
        }
      }
    }
  }
  return { probabilityRows, decisionRows };
}

function addCandidate(candidates, provenance, item, detail) {
  const safeItem = plain(item);
  assert.ok(safeItem?.id, 'generated fixture gear should have an id');
  assert.ok(!provenance.has(safeItem.id), `fixture gear id should be unique: ${safeItem.id}`);
  const record = { ...detail, sequence: candidates.length, itemId: safeItem.id };
  candidates.push(safeItem);
  provenance.set(safeItem.id, record);
}

function simulateClear(runtime, state, candidates, provenance, rawDepth) {
  state.player.depth = Math.max(state.player.depth || 0, rawDepth);
  const monster = plain(runtime.api.generateMonster(rawDepth, state));
  const source = monster.tier === 'Boss' ? 'boss' : monster.tier === 'Elite' ? 'elite' : 'normal';

  const lootRolls = source === 'boss' ? 2 : 1;
  for (let rollIndex = 0; rollIndex < lootRolls; rollIndex += 1) {
    if (!runtime.api.shouldDropLoot(rawDepth, source, rollIndex, state)) continue;
    const mythicSet = runtime.api.shouldDropMythicSetPiece(state, source, rawDepth);
    const item = mythicSet
      ? runtime.api.generateMythicSetPiece(rawDepth, source, state)
      : runtime.api.generateGear(
        runtime.api.pick(runtime.api.SLOT_ORDER),
        runtime.api.threatDepthFromDepth(rawDepth) + runtime.api.rand(0, 1),
        { source, depthRaw: rawDepth, state }
      );
    addCandidate(candidates, provenance, item, {
      rawDepth,
      threatDepth: runtime.api.threatDepthFromDepth(rawDepth),
      source,
      mythicSet,
      rollIndex,
      safeExtractDepthAtRoll: state.player.safeExtractDepth
    });
  }

  // Conditional fixture history: assume this encounter was won and the haul
  // was successfully banked from the next generated floor. Combat reachability
  // is measured separately instead of being smuggled into the gear fixture.
  runtime.api.addPlayerGold(state, monster.rewardGold);
  state.player.shards = Math.max(0, Number(state.player.shards) || 0) + monster.rewardShard;
  runtime.api.xpGain(state, monster.rewardXp);
  const extractedAtDepth = rawDepth + 1;
  state.player.depth = Math.max(state.player.depth || 0, extractedAtDepth);
  state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth || 1, extractedAtDepth);
  state.player.returnDepth = Math.max(state.player.returnDepth || 1, extractedAtDepth);
}

function runDepthBand(runtime, state, candidates, provenance, startDepth, endDepth, passes) {
  for (let pass = 0; pass < passes; pass += 1) {
    for (let rawDepth = startDepth; rawDepth <= endDepth; rawDepth += 1) {
      simulateClear(runtime, state, candidates, provenance, rawDepth);
    }
  }
}

function equippedCandidates(candidates, provenance) {
  const equipment = {};
  for (const slot of ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet', 'cloak', 'charm']) {
    const best = candidates
      .filter(item => item.slot === slot)
      .slice()
      .sort((left, right) => (right.rating || 0) - (left.rating || 0)
        || (right.level || 0) - (left.level || 0)
        || (provenance.get(left.id)?.sequence || 0) - (provenance.get(right.id)?.sequence || 0))[0];
    if (best) equipment[slot] = clone(best);
  }
  return equipment;
}

function snapshotFixture(runtime, progressionState, candidates, provenance, bossNumber, profileName) {
  const rawDepth = bossNumber * RAW_BOSS_INTERVAL;
  const rule = PROFILE_RULES[profileName];
  const state = clone(progressionState);
  state.player.equipment = equippedCandidates(candidates, provenance);
  state.player.inventory = [];
  state.player.depth = Math.max(state.player.depth || 0, rawDepth);
  state.player.returnDepth = Math.max(state.player.returnDepth || 1, rawDepth);
  state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth || 1, rawDepth);
  state.player.log = [];
  state.player.runHistory = [];
  state.merchantStock = [];
  state.run.active = false;
  state.run.floor = 0;
  state.run.monster = null;
  state.run.combatLog = [];
  state.run.pendingRewards = plain(runtime.api.createPendingRunRewards());
  runtime.api.calcDerived(state);

  const upgradeResults = [];
  for (const slot of ['weapon', 'armor']) {
    if (!state.player.equipment[slot]) continue;
    for (let level = 0; level < rule.upgradeTarget; level += 1) {
      const result = plain(runtime.api.buyMerchantGearUpgrade(state, slot));
      assert.equal(result.ok, true, `${profileName} Boss ${bossNumber} ${slot} upgrade ${level + 1} should be affordable from earned gold`);
      upgradeResults.push(result);
    }
  }

  const restGoldBefore = state.player.gold;
  runtime.api.restPlayer(state);
  assert.ok(state.player.gold < restGoldBefore, `${profileName} Boss ${bossNumber} should afford the real Lowfire rest action`);
  assert.ok(state.player.ember >= 2, `${profileName} Boss ${bossNumber} should receive the real Lowfire rest Ember minimum`);
  assert.equal(state.player.hp, state.player.maxHp, `${profileName} Boss ${bossNumber} should enter combat fully rested`);
  const derived = plain(runtime.api.calcDerived(state));
  const selectedProvenance = Object.values(state.player.equipment).map(item => ({
    item: clone(item),
    provenance: { ...provenance.get(item.id) }
  }));

  for (const entry of selectedProvenance) {
    const item = entry.item;
    const itemProvenance = entry.provenance;
    assert.ok(itemProvenance.rawDepth < rawDepth, `${profileName} Boss ${bossNumber} gear must predate the boss`);
    const legalLevelCeiling = runtime.api.threatDepthFromDepth(itemProvenance.rawDepth) + (itemProvenance.mythicSet ? 2 : 1);
    const allowedItemLevel = itemProvenance.mythicSet ? Math.max(15, legalLevelCeiling) : legalLevelCeiling;
    assert.ok(item.level <= allowedItemLevel, `${profileName} Boss ${bossNumber} gear exceeds its legal item level`);
    assert.ok(item.tags.includes(itemProvenance.source), `${profileName} Boss ${bossNumber} gear should retain source provenance`);
    if (!itemProvenance.mythicSet) {
      const rarityKeys = runtime.api.RARITIES.map(rarity => rarity.key);
      const maxRarity = runtime.api.cappedRarityForLevel(item.level, itemProvenance.source);
      assert.ok(rarityKeys.indexOf(item.rarity) <= rarityKeys.indexOf(maxRarity), `${profileName} Boss ${bossNumber} gear rarity exceeds its source cap`);
    } else {
      assert.ok(itemProvenance.rawDepth >= 40, `${profileName} Boss ${bossNumber} Mythic-set gear must drop at D40 or later`);
      assert.ok(itemProvenance.safeExtractDepthAtRoll >= 40, `${profileName} Boss ${bossNumber} Mythic-set gear must respect the real safe-depth gate`);
    }
  }
  assert.equal(selectedProvenance.length, Object.keys(state.player.equipment).length, `${profileName} Boss ${bossNumber} should retain provenance for every equipped item`);
  assert.ok(selectedProvenance.length <= runtime.api.SLOT_ORDER.length, `${profileName} Boss ${bossNumber} should not exceed the real equipment slots`);
  assert.ok(candidates.length >= selectedProvenance.length, `${profileName} Boss ${bossNumber} equipped gear should come from its candidate history`);

  return {
    bossNumber,
    rawDepth,
    profile: profileName,
    state,
    derived,
    candidateCount: candidates.length,
    equipmentCount: Object.keys(state.player.equipment).length,
    selectedProvenance,
    upgradeResults
  };
}

function buildFixtureSet(runtime, bossNumber) {
  const rawDepth = bossNumber * RAW_BOSS_INTERVAL;
  const preBossDepth = rawDepth - 1;
  runtime.setRandom(mulberry32(seedFor('progression', bossNumber)));
  const progressionState = plain(runtime.api.createBaseState());
  const starterItems = progressionState.player.inventory.slice();
  progressionState.player.inventory = [];
  progressionState.player.equipment = {};
  progressionState.player.log = [];
  progressionState.player.runHistory = [];
  progressionState.merchantStock = [];
  const candidates = [];
  const provenance = new Map();

  for (const item of starterItems) {
    addCandidate(candidates, provenance, item, {
      rawDepth: 0,
      threatDepth: runtime.api.threatDepthFromDepth(0),
      source: 'starter',
      mythicSet: false,
      rollIndex: -1,
      safeExtractDepthAtRoll: progressionState.player.safeExtractDepth
    });
  }

  runDepthBand(runtime, progressionState, candidates, provenance, 1, preBossDepth, 1);
  const natural = snapshotFixture(runtime, progressionState, candidates, provenance, bossNumber, 'natural');

  const bandStart = Math.max(1, rawDepth - RAW_BOSS_INTERVAL);
  runDepthBand(runtime, progressionState, candidates, provenance, bandStart, preBossDepth, PROFILE_RULES.strong.extraBandClears);
  const strong = snapshotFixture(runtime, progressionState, candidates, provenance, bossNumber, 'strong');

  runDepthBand(runtime, progressionState, candidates, provenance, bandStart, preBossDepth, PROFILE_RULES.reasonableMax.extraBandClears - PROFILE_RULES.strong.extraBandClears);
  const reasonableMax = snapshotFixture(runtime, progressionState, candidates, provenance, bossNumber, 'reasonableMax');

  assert.ok(strong.derived.power >= natural.derived.power, `Boss ${bossNumber} strong fixture should not trail natural fixture power`);
  assert.ok(reasonableMax.derived.power >= strong.derived.power, `Boss ${bossNumber} reasonable-max fixture should not trail strong fixture power`);
  assert.ok(strong.state.player.level >= natural.state.player.level, `Boss ${bossNumber} strong fixture should not trail natural fixture level`);
  assert.ok(reasonableMax.state.player.level >= strong.state.player.level, `Boss ${bossNumber} reasonable-max fixture should not trail strong fixture level`);
  return { natural, strong, reasonableMax };
}

function prepareFightState(runtime, fixture, rawDepth, seed) {
  runtime.setRandom(mulberry32(seed));
  const state = clone(fixture.state);
  runtime.api.calcDerived(state);
  assert.equal(state.player.hp, state.player.maxHp, 'combat fixture should preserve its real rested HP');
  assert.ok(state.player.ember >= 2, 'combat fixture should preserve its real rested Ember');
  state.player.runHistory = [];
  state.run.active = true;
  state.run.floor = rawDepth;
  state.run.monster = plain(runtime.api.generateMonster(rawDepth, state));
  assert.equal(state.run.monster.tier, 'Boss', `${fixture.profile} Boss ${fixture.bossNumber} combat target should be a Boss`);
  assert.equal(state.run.monster.level, rawDepth, `${fixture.profile} Boss ${fixture.bossNumber} combat target should stay at raw depth ${rawDepth}`);
  state.run.choices = ['attack', 'guard', 'skill', 'extract'];
  state.run.roomsCleared = 0;
  state.run.chain = 0;
  state.run.encounters = 1;
  state.run.goldBonusPct = 0;
  state.run.combatLog = [];
  state.run.pendingRewards = plain(runtime.api.createPendingRunRewards());
  state.run.setBonuses = { ashboundLethalUsed: false, bellforgeHits: 0, sootveilEscapeUsed: false, sootveilGuard: 0 };
  return state;
}

function actionForPolicy(policy, state, turn, policyState) {
  if (policy === 'attack-heavy') return 'attack';
  if (policy === 'skill-first') return state.player.ember > 0 ? 'skill' : 'attack';
  const hpRatio = state.player.hp / Math.max(1, state.player.maxHp);
  if (!policyState.extractionAttempted && hpRatio <= 0.25) {
    policyState.extractionAttempted = true;
    return 'extract';
  }
  if (hpRatio < 0.65 && policyState.lastAction !== 'guard') return 'guard';
  if (state.player.ember > 0 && turn % 4 === 0) return 'skill';
  return 'attack';
}

function actionLogPrefixes(action) {
  if (action === 'attack') return ['You strike for '];
  if (action === 'guard') return ['You brace and recover '];
  if (action === 'skill') return ['Ashburst hits for ', 'No ember left. Ashburst fizzles.'];
  if (action === 'extract') return ['Extraction failed.', 'You extract safely from '];
  return [];
}

function bossHitLandedThisAction(state, bossName, action) {
  const lines = state.run.combatLog || [];
  const actionPrefixes = actionLogPrefixes(action);
  const actionLineIndex = lines.findIndex(line => actionPrefixes.some(prefix => String(line).startsWith(prefix)));
  if (actionLineIndex < 0) return false;
  return lines.slice(0, actionLineIndex).some(line => String(line).startsWith(`${bossName} hits for `));
}

function extractionFailedThisAction(state) {
  const lines = state.run.combatLog || [];
  const failureIndex = lines.findIndex(line => String(line).startsWith('Extraction failed.'));
  const successIndex = lines.findIndex(line => String(line).startsWith('You extract safely from '));
  return failureIndex >= 0 && (successIndex < 0 || failureIndex < successIndex);
}

function simulateFight(runtime, fixture, policy, trial) {
  const seed = seedFor('combat', fixture.bossNumber, fixture.profile, policy, trial);
  const state = prepareFightState(runtime, fixture, fixture.rawDepth, seed);
  const bossId = state.run.monster.id;
  const bossName = state.run.monster.name;
  const startRooms = state.run.roomsCleared;
  const startEmber = state.player.ember;
  const policyState = { extractionAttempted: false, lastAction: '' };
  let turns = 0;
  let landedBossHits = 0;
  let extractionAttempts = 0;
  let failedExtractions = 0;

  while (turns < TURN_LIMIT && state.run.active && state.run.monster?.id === bossId) {
    turns += 1;
    const action = actionForPolicy(policy, state, turns, policyState);
    if (action === 'extract') extractionAttempts += 1;
    runtime.api.combatAction(state, action);
    if (bossHitLandedThisAction(state, bossName, action)) landedBossHits += 1;
    if (action === 'extract' && extractionFailedThisAction(state)) failedExtractions += 1;
    policyState.lastAction = action;
  }

  const won = state.run.roomsCleared > startRooms;
  const terminalReason = state.player.runHistory?.[0]?.reason || '';
  const defeated = terminalReason === 'defeat';
  const extracted = terminalReason === 'extract';
  const timedOut = !won && !defeated && !extracted;
  const survived = won || extracted;
  return {
    won,
    defeated,
    extracted,
    timedOut,
    turns,
    oneHitDeath: defeated && landedBossHits === 1,
    remainingHp: survived ? state.player.hp : 0,
    remainingHpPct: survived ? state.player.hp / Math.max(1, state.player.maxHp) : 0,
    emberUsed: Math.max(0, startEmber - state.player.ember),
    extractionAttempts,
    failedExtractions
  };
}

function fixtureSignatureProjection(fixture) {
  const equipment = Object.entries(fixture.state.player.equipment || {})
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([slot, item]) => ({
      slot,
      name: item.name,
      level: item.level,
      rarity: item.rarity,
      rating: item.rating,
      upgradeLevel: item.upgradeLevel || 0,
      stats: plain(item.stats),
      tags: plain(item.tags),
      setId: item.setId || '',
      mythicSetId: item.mythicSetId || ''
    }));
  const provenance = fixture.selectedProvenance
    .map(entry => ({ slot: entry.item.slot, ...plain(entry.provenance) }))
    .sort((left, right) => left.slot < right.slot ? -1 : left.slot > right.slot ? 1 : 0);
  const upgrades = fixture.upgradeResults.map(result => ({
    slot: result.slot,
    cost: result.cost,
    beforeLevel: result.beforeLevel,
    afterLevel: result.afterLevel,
    goldAfter: result.goldAfter
  }));
  return {
    bossNumber: fixture.bossNumber,
    rawDepth: fixture.rawDepth,
    profile: fixture.profile,
    player: {
      level: fixture.state.player.level,
      xp: fixture.state.player.xp,
      xpNext: fixture.state.player.xpNext,
      maxHp: fixture.state.player.maxHp,
      gold: fixture.state.player.gold,
      shards: fixture.state.player.shards,
      ember: fixture.state.player.ember,
      depth: fixture.state.player.depth,
      safeExtractDepth: fixture.state.player.safeExtractDepth,
      returnDepth: fixture.state.player.returnDepth,
      stats: plain(fixture.state.player.stats)
    },
    derived: plain(fixture.derived),
    candidateCount: fixture.candidateCount,
    equipmentCount: fixture.equipmentCount,
    equipment,
    provenance,
    upgrades
  };
}

function summarizeFights(runtime, fixture, policy) {
  const fights = [];
  for (let trial = 0; trial < TRIALS_PER_POLICY; trial += 1) fights.push(simulateFight(runtime, fixture, policy, trial));
  const wins = fights.filter(fight => fight.won).length;
  const defeats = fights.filter(fight => fight.defeated).length;
  const extracts = fights.filter(fight => fight.extracted).length;
  const timeouts = fights.filter(fight => fight.timedOut).length;
  const survivingFights = fights.filter(fight => fight.won || fight.extracted);
  assert.equal(wins + defeats + extracts + timeouts, TRIALS_PER_POLICY, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} trial accounting should balance`);
  assert.ok(fights.every(fight => fight.turns >= 1 && fight.turns <= TURN_LIMIT), `${fixture.profile} Boss ${fixture.bossNumber} ${policy} turn counts should stay within the simulation limit`);
  const row = {
    bossNumber: fixture.bossNumber,
    rawDepth: fixture.rawDepth,
    profile: fixture.profile,
    policy,
    trials: TRIALS_PER_POLICY,
    wins,
    defeats,
    extracts,
    timeouts,
    winRate: +(wins / TRIALS_PER_POLICY).toFixed(3),
    oneHitDeaths: fights.filter(fight => fight.oneHitDeath).length,
    medianTurns: +median(fights.map(fight => fight.turns)).toFixed(1),
    medianSurvivorHp: +median(survivingFights.map(fight => fight.remainingHp)).toFixed(1),
    medianSurvivorHpPct: +median(survivingFights.map(fight => fight.remainingHpPct)).toFixed(3),
    averageEmberUsed: +(fights.reduce((sum, fight) => sum + fight.emberUsed, 0) / TRIALS_PER_POLICY).toFixed(2),
    extractionAttempts: fights.reduce((sum, fight) => sum + fight.extractionAttempts, 0),
    failedExtractions: fights.reduce((sum, fight) => sum + fight.failedExtractions, 0)
  };
  assert.equal(row.timeouts, 0, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} should reach a real terminal outcome`);
  assert.ok(row.winRate >= 0 && row.winRate <= 1, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} win rate should be bounded`);
  assert.ok(row.oneHitDeaths <= row.defeats, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} one-hit deaths cannot exceed defeats`);
  assert.ok(row.extracts <= row.extractionAttempts, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} successful extractions require an attempt`);
  assert.equal(row.extracts + row.failedExtractions, row.extractionAttempts, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} extraction attempts should resolve as success or failure`);
  assert.ok(row.medianTurns >= 1 && row.medianTurns <= TURN_LIMIT, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} median turns should be bounded`);
  assert.ok(row.medianSurvivorHp >= 0 && row.medianSurvivorHp <= fixture.state.player.maxHp, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} survivor HP should be bounded`);
  assert.ok(row.medianSurvivorHpPct >= 0 && row.medianSurvivorHpPct <= 1, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} survivor HP ratio should be bounded`);
  assert.ok(row.averageEmberUsed >= 0 && row.averageEmberUsed <= fixture.state.player.ember, `${fixture.profile} Boss ${fixture.bossNumber} ${policy} Ember use should be bounded`);
  return row;
}

function assertSignatures(contracts) {
  const actual = {
    bosses: signature(contracts.bosses),
    boundaries: signature(contracts.boundaries),
    rewards: signature(contracts.rewards),
    drops: signature(contracts.drops),
    adjacentNormals: signature(contracts.adjacentNormals),
    fixtures: signature(contracts.fixtures),
    combat: signature(contracts.combat)
  };
  if (PRINT_SIGNATURES) {
    console.log(JSON.stringify(actual, null, 2));
  }
  for (const [key, value] of Object.entries(actual)) {
    assert.equal(value, EXPECTED_SIGNATURES[key], `${key} regression signature changed`);
  }
  return actual;
}

function printReports(generationRows, boundaryRows, fixtureRows, combatRows, audit) {
  if (COMPACT) return;
  console.log('\nBoss generation matrix (deterministic min-mid-max):');
  console.table(generationRows.map(row => ({
    boss: row.bossNumber,
    encounter: row.encounterName,
    rawDepth: row.rawDepth,
    power: `${row.rolls.min.power}-${row.rolls.mid.power}-${row.rolls.max.power}`,
    hp: `${row.rolls.min.maxHp}-${row.rolls.mid.maxHp}-${row.rolls.max.maxHp}`,
    guard: `${row.rolls.min.guard}-${row.rolls.mid.guard}-${row.rolls.max.guard}`,
    speed: `${row.rolls.min.speed}-${row.rolls.mid.speed}-${row.rolls.max.speed}`,
    rewards: `G ${row.rolls.mid.rewardGold} / XP ${row.rolls.mid.rewardXp} / S ${row.rolls.mid.rewardShard}`
  })));

  console.log('\nBoundary matrix:');
  console.table(boundaryRows);

  console.log('\nFixture contract: conditional on successfully clearing and banking all earlier encounters. Natural = one full pre-boss clear; strong = two extra clears of the preceding 15-depth band; reasonable max = seven extra clears. Gear comes from the real starter/drop paths plus The Ashen Anvil only; Market and Lowfire Forge gear are excluded. Combat readiness uses the real Lowfire rest action.');
  console.log('\nConditional legal-drop player fixtures:');
  console.table(fixtureRows.map(row => ({
    boss: row.bossNumber,
    profile: row.profile,
    level: row.state.player.level,
    gear: `${row.equipmentCount}/10`,
    candidates: row.candidateCount,
    power: row.derived.power,
    guard: row.derived.guard,
    hp: row.state.player.maxHp,
    speed: row.derived.speed,
    bossToPlayer: row.bossToPlayerRatio,
    inTarget: row.inPowerTarget
  })));

  console.log('\nStrong-fixture combat results (200 seeded fights per policy):');
  console.table(combatRows.filter(row => row.profile === 'strong'));
  if (VERBOSE) {
    console.log('\nAll combat results:');
    console.table(combatRows);
  }
  console.log(`\nAUDIT ${audit.powerFailures.length ? 'FAIL' : 'PASS'} power target: ${audit.powerPasses}/${BOSS_COUNT} strong fixtures are within 1.2-1.6x.`);
  console.log(`AUDIT ${audit.combatFailures.length ? 'FAIL' : 'PASS'} combat target: ${audit.combatPasses}/${BOSS_COUNT} strong fixtures have a best committed win rate within 50-75%.`);
  if (audit.powerFailures.length) console.log(`AUDIT out-of-band power bosses: ${audit.powerFailures.join(', ')}`);
  if (audit.combatFailures.length) console.log(`AUDIT out-of-band combat bosses: ${audit.combatFailures.join(', ')}`);
}

async function main() {
  const runtime = await loadRuntime();
  const generation = buildGenerationMatrix(runtime);
  const boundaryRows = buildBoundaryMatrix(runtime);
  const dropContract = buildDropContract(runtime);

  const atReadinessThreshold = plain(runtime.api.bossReadinessModel(200, 300));
  const aboveReadinessThreshold = plain(runtime.api.bossReadinessModel(200, 301));
  assert.equal(atReadinessThreshold.overmatched, false, 'readiness warning should not appear at exactly 1.5x player power');
  assert.equal(aboveReadinessThreshold.overmatched, true, 'readiness warning should appear above 1.5x player power');
  assert.equal(aboveReadinessThreshold.copy, OVERMATCHED_COPY, 'overmatched readiness should direct the player to The Ashen Anvil');
  assert.ok(!aboveReadinessThreshold.copy.includes('Merchant Gear Upgrades'), 'overmatched readiness should not use the retired Merchant Gear Upgrades wording');

  const fixtures = [];
  for (let bossNumber = 1; bossNumber <= BOSS_COUNT; bossNumber += 1) {
    const fixtureSet = buildFixtureSet(runtime, bossNumber);
    const bossMid = generation.rows[bossNumber - 1].rolls.mid;
    for (const profileName of Object.keys(PROFILE_RULES)) {
      const fixture = fixtureSet[profileName];
      fixture.bossToPlayerRatio = ratio(bossMid.power, fixture.derived.power);
      fixture.inPowerTarget = fixture.bossToPlayerRatio >= 1.2 && fixture.bossToPlayerRatio <= 1.6;
      const readiness = plain(runtime.api.bossReadinessModel(fixture.derived.power, bossMid.power));
      assert.equal(readiness.overmatched, bossMid.power > fixture.derived.power * 1.5, `${profileName} Boss ${bossNumber} readiness threshold should match the 1.5x contract`);
      if (readiness.overmatched) assert.equal(readiness.copy, OVERMATCHED_COPY, `${profileName} Boss ${bossNumber} should use The Ashen Anvil guidance`);

      const normalizedOnce = plain(runtime.api.normalizeMonster(generateBoss(runtime, fixture.rawDepth, 0.5), fixture.rawDepth));
      const normalizedTwice = plain(runtime.api.normalizeMonster(normalizedOnce, fixture.rawDepth));
      assert.deepEqual(normalizedTwice, normalizedOnce, `${profileName} Boss ${bossNumber} normalization should be idempotent`);
      fixtures.push(fixture);
    }
  }

  const combatRows = [];
  for (const fixture of fixtures) {
    for (const policy of POLICY_NAMES) combatRows.push(summarizeFights(runtime, fixture, policy));
  }
  assertSignatures({
    bosses: generation.rows,
    boundaries: boundaryRows,
    rewards: generation.rewards,
    drops: dropContract,
    adjacentNormals: generation.adjacentNormals,
    fixtures: fixtures.map(fixtureSignatureProjection),
    combat: combatRows
  });

  const strongFixtures = fixtures.filter(fixture => fixture.profile === 'strong');
  const powerFailures = strongFixtures.filter(fixture => !fixture.inPowerTarget).map(fixture => fixture.bossNumber);
  const combatFailures = [];
  for (let bossNumber = 1; bossNumber <= BOSS_COUNT; bossNumber += 1) {
    const committed = combatRows.filter(row => row.bossNumber === bossNumber && row.profile === 'strong' && row.policy !== 'defensive');
    const bestWinRate = Math.max(...committed.map(row => row.winRate));
    if (bestWinRate < 0.5 || bestWinRate > 0.75) combatFailures.push(bossNumber);
  }

  const audit = {
    powerFailures,
    combatFailures,
    powerPasses: BOSS_COUNT - powerFailures.length,
    combatPasses: BOSS_COUNT - combatFailures.length
  };
  printReports(generation.rows, boundaryRows, fixtures, combatRows, audit);

  if (STRICT_BANDS) {
    assert.deepEqual(powerFailures, [], `provisional 1.2-1.6x strong-build power target failed for bosses: ${powerFailures.join(', ')}`);
    assert.deepEqual(combatFailures, [], `provisional 50-75% strong-build win target failed for bosses: ${combatFailures.join(', ')}`);
  }

  assert.equal(fixtures.length, BOSS_COUNT * Object.keys(PROFILE_RULES).length, 'all 20 bosses should have three progression fixtures');
  assert.equal(combatRows.length * TRIALS_PER_POLICY, BOSS_COUNT * Object.keys(PROFILE_RULES).length * TRIALS_PER_FIXTURE, 'combat matrix should run 600 seeded fights per fixture');
  console.log(`PASS Boss scaling matrix structural/regression contracts: ${BOSS_COUNT} named bosses, ${fixtures.length} legal progression fixtures, ${combatRows.length * TRIALS_PER_POLICY} real combat fights. PROVISIONAL TARGET ${audit.powerFailures.length || audit.combatFailures.length ? 'FAIL' : 'PASS'}: power ${audit.powerPasses}/${BOSS_COUNT}, combat ${audit.combatPasses}/${BOSS_COUNT}.`);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
