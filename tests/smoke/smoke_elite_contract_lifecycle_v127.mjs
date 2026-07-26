#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function protectedSnapshot(state) {
  return plain({
    debt: state.player.debtCollector,
    talentLedger: state.player.talentLedger,
    talentEarning: state.player.talentEarning,
    talentLearnedIds: state.player.talentLearnedIds,
    revisit: state.player.revisitState,
    equipment: state.player.equipment,
    inventory: state.player.inventory,
    stats: state.player.stats,
    runChoices: state.run.choices,
    pendingRewards: state.run.pendingRewards
  });
}

function createRuntime() {
  const store = new Map();
  let id = 0;
  const runtimeMath = Object.create(Math);
  // Keep the trophy roll deterministic and out of this lifecycle audit.
  runtimeMath.random = () => 0.99;
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
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); }
    },
    navigator: {},
    location: { protocol: 'file:', hostname: '' },
    crypto: {
      randomUUID() {
        id += 1;
        return `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
      },
      getRandomValues(values) {
        for (let index = 0; index < values.length; index += 1) {
          id += 1;
          values[index] = id;
        }
        return values;
      }
    },
    showExtractionPopup() {},
    showDefeatPopup() {}
  };
  context.window = context;
  context.globalThis = context;
  const sandbox = vm.createContext(context);
  SYSTEM_FILES.forEach(file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));
  vm.runInContext(`globalThis.__eliteLifecycleApi = {
    createBaseState,
    normalizeSaveShape,
    save,
    load,
    validateEliteBoardState,
    availableEliteContracts,
    startEliteContract,
    activeEliteContractHunt,
    applyEliteContractTargetMonster,
    completeEliteContractTarget,
    claimEliteContract,
    failEliteContract,
    eliteContractDef,
    eliteContractTargetScaling
  };`, sandbox);
  return { api: sandbox.__eliteLifecycleApi, store };
}

const { api, store } = createRuntime();
assert.equal(typeof api.startEliteContract, 'function');
assert.equal(typeof api.claimEliteContract, 'function');
assert.equal(typeof api.applyEliteContractTargetMonster, 'function');

const state = api.createBaseState();
const board = api.validateEliteBoardState(state);
assert.equal(board.active, null);
assert.deepEqual(plain(api.availableEliteContracts(state).map(contract => contract.id)), [
  'lowfire_bounty',
  'hazard_contract',
  'cinderjaw_bailiff'
]);
assert.deepEqual(plain(api.availableEliteContracts(state).map(contract => ({
  id: contract.id,
  eliteName: contract.eliteName,
  reward: contract.reward,
  maxReward: contract.maxReward,
  floorBonusPerDepth: contract.floorBonusPerDepth,
  risk: contract.risk,
  bonusWritType: contract.bonusWritType
}))), [
  { id: 'lowfire_bounty', eliteName: 'Glassfang Brute', reward: 250000, maxReward: 750000, floorBonusPerDepth: 7500, risk: { level: 'Low', label: 'Low risk', spawnBonus: 0.03, hpBonus: 0.04, damageBonus: 0.03, coinBonus: 0.03 }, bonusWritType: 'rest' },
  { id: 'hazard_contract', eliteName: 'Ash-Crowned Marauder', reward: 600000, maxReward: 1600000, floorBonusPerDepth: 7500, risk: { level: 'Medium', label: 'Medium risk', spawnBonus: 0.05, hpBonus: 0.08, damageBonus: 0.05, coinBonus: 0.05 }, bonusWritType: 'extract' },
  { id: 'cinderjaw_bailiff', eliteName: 'Cinderjaw Bailiff', reward: 420000, maxReward: 1250000, floorBonusPerDepth: 6000, risk: { level: 'Medium', label: 'Medium risk', spawnBonus: 0.04, hpBonus: 0.06, damageBonus: 0.04, coinBonus: 0.04 }, bonusWritType: 'guard' }
]);

assert.equal(api.startEliteContract(state, 'lowfire_bounty'), true);
assert.equal(api.startEliteContract(state, 'hazard_contract'), false, 'only one active contract may be accepted');
const active = state.player.eliteContracts.active;
assert.equal(active.id, 'lowfire_bounty');
assert.equal(active.status, 'active');
assert.equal(active.claimable, false);
assert.ok(active.rewardAmount > 0);

const baseMonster = {
  name: 'Unrelated Elite',
  level: active.targetFloor,
  maxHp: 100,
  hp: 100,
  power: 31,
  guard: 8,
  speed: 5,
  rewardGold: 20,
  rewardXp: 30,
  rewardShard: 4
};
const target = api.applyEliteContractTargetMonster(state, baseMonster);
const scaling = api.eliteContractTargetScaling(active);
assert.equal(target.contractTarget, true);
assert.equal(target.contractId, active.id);
assert.equal(target.name, active.eliteName);
assert.equal(target.tier, 'Elite');
assert.equal(target.power, 31, 'target identity must not change the existing power contract');
assert.equal(target.maxHp, Math.round(100 * scaling.hp));
assert.equal(target.rewardGold, Math.round(20 * scaling.reward));
assert.equal(api.completeEliteContractTarget(state, { contractTarget: true, contractId: 'hazard_contract' }), false, 'only the matching target can complete a hunt');
assert.equal(api.completeEliteContractTarget(state, target), true);
const completed = state.player.eliteContracts.active;
assert.equal(completed.completed, true);
assert.equal(completed.claimable, true);
assert.equal(completed.status, 'completed');

const completedReload = api.normalizeSaveShape(plain(state));
assert.equal(completedReload.player.eliteContracts.active.id, 'lowfire_bounty', 'a completed unclaimed hunt must survive save normalization');
assert.equal(completedReload.player.eliteContracts.active.claimable, true);
const protectedBeforeClaim = protectedSnapshot(completedReload);
const goldBeforeClaim = completedReload.player.gold;
assert.equal(api.claimEliteContract(completedReload), true);
assert.ok(completedReload.player.gold > goldBeforeClaim, 'a completed contract must pay through the existing claim path');
assert.equal(completedReload.player.eliteContracts.active, null);
assert.ok(completedReload.player.eliteContracts.claimed.includes('lowfire_bounty'));
assert.equal(api.claimEliteContract(completedReload), false, 'a claimed contract cannot pay twice');
assert.deepEqual(protectedSnapshot(completedReload), protectedBeforeClaim, 'claiming a contract must not alter protected systems');

const pendingSave = api.createBaseState();
assert.equal(api.startEliteContract(pendingSave, 'hazard_contract'), true);
const pendingId = pendingSave.player.eliteContracts.active.id;
const pendingTarget = pendingSave.player.eliteContracts.active.targetFloor;
assert.equal(api.save(pendingSave), true);
assert.ok(store.size > 0);
const reloaded = api.load();
assert.equal(reloaded.player.eliteContracts.active.id, pendingId, 'active contracts must survive save and reload');
assert.equal(reloaded.player.eliteContracts.active.targetFloor, pendingTarget);
assert.equal(reloaded.player.eliteContracts.active.claimable, false);

const malformed = api.createBaseState();
malformed.player.eliteContracts = {
  claimed: ['elite_hunter_i', 'not-a-contract'],
  completed: ['not-a-contract'],
  active: { id: 'not-a-contract', status: 'active' },
  failed: ['not-an-object'],
  expired: [{ id: 'old', status: 'expired' }],
  rivals: [{ eliteName: 'Glassfang Brute', sourceContractId: 'elite_hunter_i', defeats: '2' }]
};
const repaired = api.normalizeSaveShape(malformed);
assert.equal(repaired.player.eliteContracts.active, null, 'invalid active saves must be cleared safely');
assert.deepEqual(plain(repaired.player.eliteContracts.claimed), ['lowfire_bounty']);
assert.deepEqual(plain(repaired.player.eliteContracts.completed), ['lowfire_bounty']);
assert.equal(repaired.player.eliteContracts.failed.length, 0);
assert.equal(repaired.player.eliteContracts.expired.length, 1);
assert.equal(repaired.player.eliteContracts.rivals[0].sourceContractId, 'lowfire_bounty');

const failed = api.createBaseState();
assert.equal(api.startEliteContract(failed, 'cinderjaw_bailiff'), true);
assert.equal(api.failEliteContract(failed, 'failed'), true);
assert.equal(failed.player.eliteContracts.active, null);
assert.equal(failed.player.eliteContracts.failed.length, 1);
assert.equal(api.claimEliteContract(failed), false, 'failed contracts cannot be claimed');

console.log('PASS: Elite Contract lifecycle v1.27 smoke');
