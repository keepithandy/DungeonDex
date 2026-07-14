#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCALING_FILE = path.join(ROOT, 'js/systems/06_scaling_generation_audits.js');
const NORMALIZATION_FILE = path.join(ROOT, 'js/systems/08_normalization_save.js');
const RENDER_FILE = path.join(ROOT, 'js/systems/11_ui_run_gear_dex_archive.js');
const OVERMATCHED_COPY = 'Overmatched: this boss outclasses your current build. Temper gear at The Ashen Anvil before challenging it.';

function numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

function depthStructure(rawDepth) {
  const depth = Math.max(1, Math.floor(rawDepth));
  const zeroBased = depth - 1;
  const chapter = zeroBased % 10 + 1;
  const room = Math.floor((zeroBased % 150) / 10) + 1;
  const floor = Math.floor(zeroBased / 150) + 1;
  const totalPressure = Math.min(0.24, (chapter - 1) * 0.0025 + (room - 1) * 0.005 + Math.min(0.15, (floor - 1) * 0.038));
  return { totalPressure, powerMult: 1 + totalPressure, hpMult: 1 + totalPressure, guardMult: 1 + totalPressure, speedMult: 1 + totalPressure, rewardMult: 1, eliteBonus: 0 };
}

function createContext(randValue) {
  const math = Object.create(Math);
  math.random = () => 1;
  const context = {
    console,
    Math: math,
    Object,
    BOSS_INTERVAL: 5,
    DEPTH_CHAPTERS_PER_THREAT_STEP: 3,
    RARITIES: [{ key: 'common', mult: 1 }],
    MONSTER_FAMILIES: ['Ash'],
    MONSTER_TYPES: ['Warden'],
    numberOr,
    isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    depthStageValue(depth) { return Math.max(1, Math.floor(numberOr(depth, 1, 1, 999999))); },
    threatDepthFromDepth(depth) { return Math.max(1, Math.ceil(depth / 3)); },
    depthDifficultyLadder: depthStructure,
    activeEliteContractRisk() { return { spawnBonus: 0, damageBonus: 0, hpBonus: 0 }; },
    pick(values) { return values[0]; },
    rand(min, max) { return randValue === 'max' ? max : min; },
    eliteChanceForFloor() { return 0; },
    selectEliteModifiers() { return []; },
    eliteRewardProfile() { return null; },
    encounterCoinReward(_floor, power) { return power; },
    makeId(prefix) { return `${prefix}_smoke`; }
  };
  context.globalThis = context;
  return vm.createContext(context);
}

async function loadRuntime(randValue) {
  const [scaling, normalization] = await Promise.all([
    readFile(SCALING_FILE, 'utf8'),
    readFile(NORMALIZATION_FILE, 'utf8')
  ]);
  const context = createContext(randValue);
  vm.runInContext(`${scaling}\n${normalization}\nglobalThis.__boss2Smoke = { generateMonster, normalizeMonster, bossReadinessModel };`, context, { filename: SCALING_FILE });
  return context.__boss2Smoke;
}

async function main() {
  const [minimum, maximum, normal, renderer] = await Promise.all([
    loadRuntime('min'),
    loadRuntime('max'),
    loadRuntime('min'),
    readFile(RENDER_FILE, 'utf8')
  ]);

  const bossTwoMin = minimum.generateMonster(30).power;
  const bossTwoMax = maximum.generateMonster(30).power;
  const legacyBossTwoMinPower = Math.round((10 * 8 + 10 + 72) * 1.08 * depthStructure(30).powerMult * (1 + (30 - 20) * 0.45));
  assert.equal(minimum.generateMonster(30).tier, 'Boss', 'raw depth 30 remains Boss 2');
  assert.ok(bossTwoMin >= 650 && bossTwoMax <= 850, `Boss 2 should stay in the 650-850 early-game band; got ${bossTwoMin}-${bossTwoMax}`);
  const rewardedBossTwo = minimum.generateMonster(30);
  assert.equal(rewardedBossTwo.rewardGold, legacyBossTwoMinPower, 'Boss 2 gold keeps the pre-patch reward basis');
  assert.equal(rewardedBossTwo.rewardXp, Math.round(legacyBossTwoMinPower * 1.05 * 1.5 * depthStructure(30).rewardMult), 'Boss 2 XP keeps the pre-patch reward basis');

  const normalDepth = 31;
  const expectedNormalPower = Math.round((11 * 8 + 10) * 1.06 * depthStructure(normalDepth).powerMult * (1 + (normalDepth - 20) * 0.45));
  assert.equal(normal.generateMonster(normalDepth).power, expectedNormalPower, 'normal monster power remains on the pre-existing scaling curve');

  const legacyBoss = minimum.normalizeMonster({
    id: 'saved_boss_2', family: 'Ash', type: 'Warden', tier: 'Boss', level: 30,
    power: 1100, maxHp: 6600, hp: 3300, guard: 352, speed: 209,
    rewardGold: 900, rewardXp: 1200, rewardShard: 30
  }, 30);
  assert.equal(legacyBoss.power, 748, 'saved 1,100-PWR Boss 2 is repaired into the tuned band');
  assert.equal(legacyBoss.maxHp, 4488, 'saved Boss 2 max HP receives the same targeted correction');
  assert.equal(legacyBoss.hp, 2244, 'saved Boss 2 retains its current HP percentage');
  assert.deepEqual([legacyBoss.rewardGold, legacyBoss.rewardXp, legacyBoss.rewardShard], [900, 1200, 30], 'saved Boss 2 rewards remain unchanged');
  assert.equal(minimum.normalizeMonster(legacyBoss, 30).power, 748, 'saved Boss 2 repair is idempotent');

  const readiness = minimum.bossReadinessModel(540, 1200);
  assert.equal(readiness.overmatched, true, 'a 1,200-PWR boss should flag a 540-PWR build as overmatched');
  assert.equal(readiness.copy, OVERMATCHED_COPY, 'overmatched guidance should name The Ashen Anvil');
  assert.ok(renderer.includes('bossReadinessModel(d.power, monster.power)') && renderer.includes('boss-warning-line'), 'combat renderer should surface the boss readiness warning');

  console.log(`PASS Boss 2 readiness scaling: ${bossTwoMin}-${bossTwoMax} PWR; saved 1,100 PWR -> ${legacyBoss.power}; normal D${normalDepth}: ${expectedNormalPower} PWR.`);
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
