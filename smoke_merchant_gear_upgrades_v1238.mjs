#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const STORAGE_KEY = 'dungeondex_emberfall_v109';
const SYSTEM_FILES = [
  'js/systems/07_player_combat_runtime.js',
  'js/systems/08_normalization_save.js',
  'js/systems/38_journal_v1.js'
];

function numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.max(min, Math.min(max, safe));
}

function cleanDisplayText(value, fallback = '') {
  return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function createGearState() {
  return {
    build: '1.23.8.01-gear-section-polish',
    screen: 'town',
    filters: { slot: 'all', rarity: 'all', search: '', sort: 'power' },
    player: {
      name: 'Warden',
      title: 'Lowfire Delver',
      level: 1,
      xp: 0,
      xpNext: 100,
      hp: 100,
      maxHp: 100,
      gold: 1000,
      currencyVersion: 3,
      shards: 0,
      ember: 0,
      forgeSpark: 0,
      depth: 0,
      safeExtractDepth: 1,
      returnDepth: 1,
      permanentStartFloor: 1,
      kills: 0,
      crit: 0,
      dodge: 0,
      stats: { power: 8, guard: 6, wit: 5, speed: 5, luck: 4, hp: 0 },
      equipment: {
        weapon: {
          id: 'warden_blade',
          name: 'Warden Blade',
          slot: 'weapon',
          rarity: 'common',
          level: 3,
          rating: 12,
          value: 120,
          upgradeLevel: 0,
          stats: { power: 12, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 }
        },
        armor: {
          id: 'ashcoat',
          name: 'Ashcoat',
          slot: 'armor',
          rarity: 'common',
          level: 3,
          rating: 10,
          value: 120,
          upgradeLevel: 0,
          stats: { power: 0, guard: 5, wit: 0, speed: 0, luck: 0, hp: 20 }
        }
      },
      inventory: [],
      discoveredMonsters: [],
      discoveredGear: [],
      bossTrophies: [],
      bossTrophyRecords: [],
      retiredRelics: [],
      log: [],
      loreSeen: [],
      runHistory: [],
      quests: [],
      debtCollector: { active: false, balanceCopper: 0, pressure: 0, lastVisitAt: '', notes: [] },
      revisitState: {
        trophyEcho: { history: [], memoryMarks: 0, completedKeys: {} },
        famousGear: { history: [], completedKeys: {} },
        rivalTrace: { history: [], completedKeys: {} }
      },
      eliteContracts: {},
      eliteTrophies: { collected: {}, totalFound: 0, latestId: '' },
      deepStairCharters: [],
      goldSink: {},
      talentLedger: {
        version: 1,
        unlocked: false,
        previewOnly: true,
        lifetimePoints: 0,
        availablePoints: 0,
        spentPoints: 0,
        earnedSources: [],
        awardClaims: {},
        notes: []
      },
      talentEarning: { enabled: false, sourceId: 'deprecated_talent_system', milestonesReached: {}, pointsAwarded: 0 },
      talentLearnedIds: {},
      talentUnlockIds: [],
      talents: { pointsEarned: 0, pointsSpent: 0, unlocked: {}, spent: {}, unlockedIds: [] }
    },
    town: { merchantRefreshCost: 150, forgeTier: 1, relicFavor: 0 },
    archive: [],
    ui: {},
    run: {
      active: false,
      floor: 0,
      monster: null,
      choices: [],
      pendingRewards: { gold: 0, shards: 0, ember: 0, xp: 0, loot: [] },
      combatLog: [],
      setBonuses: {}
    },
    merchantStock: [
      {
        id: 'merchant_backup_blade',
        name: 'Merchant Backup Blade',
        slot: 'weapon',
        rarity: 'common',
        level: 1,
        rating: 4,
        value: 40,
        upgradeLevel: 0,
        stats: { power: 4, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 }
      }
    ]
  };
}

function createBaseState() {
  return createGearState();
}

function createContext() {
  const store = new Map();
  const archivePanel = {
    innerHTML: '',
    querySelector(selector) {
      return selector === '#guildJournalPanel' && this.innerHTML.includes('guildJournalPanel')
        ? { outerHTML: this.innerHTML }
        : null;
    },
    insertAdjacentHTML(_pos, html) {
      this.innerHTML += html;
    }
  };
  const context = {
    console,
    Date,
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    document: {
      getElementById(id) {
        return id === 'archivePanel' ? archivePanel : null;
      }
    },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); }
    },
    STORAGE_KEY,
    BUILD: '1.23.8.01-gear-section-polish',
    COPPER_PER_GOLD: 10000,
    BOSS_INTERVAL: 5,
    DEPTH_CHAPTERS_PER_THREAT_STEP: 15,
    COMBAT_LOG_STORE_LIMIT: 20,
    CORE_COMBAT_ACTIONS: ['attack', 'guard', 'skill', 'extract'],
    FUTURE_EQUIPMENT_SLOTS: ['weapon', 'armor'],
    SLOT_ORDER: ['weapon', 'armor'],
    LEGACY_MYTHIC_SET_SLOTS: [],
    BASES: {
      weapon: ['Blade'],
      armor: ['Armor']
    },
    RARITIES: [{ key: 'common' }],
    INVENTORY_SORTS: ['power'],
    DEFAULT_PLAYER_STATS: { power: 8, guard: 6, wit: 5, luck: 4, speed: 5 },
    BOSS_TROPHY_DEFINITIONS: [],
    asArray(value, fallback = []) { return Array.isArray(value) ? value : fallback; },
    isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); },
    numberOr,
    cleanDisplayText,
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); },
    format(value) { return String(Math.floor(Number(value) || 0)); },
    formatMoney(value) { return `${Math.max(0, Math.floor(Number(value) || 0))}c`; },
    coins(gold = 0, silver = 0, copper = 0) { return Math.max(0, Math.floor(gold * 10000 + silver * 100 + copper)); },
    toCopper(value) { return Math.max(0, Math.floor(Number(value) || 0)); },
    sanitizeCurrencyValue(value, fallback = 0) { return Math.max(0, Math.floor(numberOr(value, fallback, 0, Number.MAX_SAFE_INTEGER))); },
    makeId(prefix = 'id') { return `${prefix}_smoke`; },
    normalizeItemLevel(value, fallback = 1) { return Math.max(1, Math.floor(numberOr(value, fallback, 1, 999999))); },
    mythicSetSlotFromSlot() { return ''; },
    getMythicSetDefinition() { return null; },
    normalizeScreenName(value) { return String(value || 'town') === 'run' ? 'run' : 'town'; },
    progressDepthValue(value, fallback = 1) { return Math.max(1, Math.floor(numberOr(value, fallback, 1, 999999))); },
    threatDepthFromDepth(value) { return Math.max(1, Math.floor(numberOr(value, 1, 1, 999999))); },
    dangerRatingForDepth() { return 1; },
    zoneName() { return 'Lowfire'; },
    districtByDepth() { return { name: 'Lowfire' }; },
    getLoreDepthProgress(rawDepth) {
      const depth = Math.max(1, Math.floor(numberOr(rawDepth, 1, 1, 999999)));
      return { floorNumber: Math.max(1, Math.ceil(depth / 3)), roomWithinFloor: 1, chapterWithinRoom: 1 };
    },
    createBaseState,
    createGoldSinkState(value = {}) { return { ...value }; },
    createEliteContractState(value = {}) { return { ...value }; },
    createEliteTrophyState(value = {}) { return { collected: {}, totalFound: 0, latestId: '', ...value }; },
    normalizeCharterDepthList(value) { return Array.isArray(value) ? value.slice() : []; },
    ensurePermanentCharters() {},
    baseSlotForSlot(slot, fallback = 'weapon') {
      const clean = String(slot || '').toLowerCase();
      if (clean === 'weapon' || clean === 'armor') return clean;
      return fallback;
    },
    buildMerchantStock() { return []; },
    getEquippedSetCount() { return 0; },
    normalizeMonster(monster) { return monster || null; },
    ensureRunShell(state) { state.run = state.run && typeof state.run === 'object' ? state.run : createBaseState().run; return state.run; },
    defaultRunStartDepth() { return 1; },
    ensureRunSetBonusState(state) { state.run.setBonuses = state.run.setBonuses || {}; return state.run.setBonuses; },
    createPendingRunRewards(value = {}) { return { gold: 0, shards: 0, ember: 0, xp: 0, loot: [], ...value }; },
    clearPendingRunRewards(state) { state.run.pendingRewards = context.createPendingRunRewards(); },
    recoverRunToTown(state) { state.screen = 'town'; state.run.active = false; },
    pushCombat(state, line) {
      state.run.combatLog = Array.isArray(state.run.combatLog) ? state.run.combatLog : [];
      state.run.combatLog.push(String(line));
    },
    pushLog(state, line) {
      state.player.log = Array.isArray(state.player.log) ? state.player.log : [];
      state.player.log.push(String(line));
    },
    normalizeBossTrophyStateShape() {},
    rememberBossTrophyRepairFlags() {},
    normalizeTalentAwardClaims() { return {}; },
    applyBossTrophyTalentAwardIfReady() {}
  };
  context.window = context;
  context.globalThis = context;
  return { context: vm.createContext(context), store, archivePanel };
}

function loadRuntime(context) {
  for (const file of SYSTEM_FILES) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
}

function merchantSection(state, context) {
  const model = context.journalV1233SummaryModel(state);
  return model.sections.find(section => section.key === 'upgrades');
}

const { context, store, archivePanel } = createContext();
loadRuntime(context);

assert.equal(typeof context.merchantGearUpgradeSummary, 'function');
assert.equal(typeof context.buyMerchantGearUpgrade, 'function');
assert.equal(typeof context.normalizeSaveShape, 'function');
assert.equal(typeof context.save, 'function');
assert.equal(typeof context.load, 'function');
assert.equal(typeof context.journalV1233SummaryModel, 'function');

const state = createGearState();
const initialSummary = context.merchantGearUpgradeSummary(state);
assert.equal(initialSummary.length, 2);
assert.equal(initialSummary[0].label, 'Weapon');
assert.equal(initialSummary[0].itemName, 'Warden Blade');
assert.equal(initialSummary[0].cost, 50);
assert.equal(initialSummary[0].currentStat, 'Power 12');
assert.equal(initialSummary[0].nextStat, 'Power 14');
assert.equal(initialSummary[1].label, 'Armor');
assert.equal(initialSummary[1].itemName, 'Ashcoat');
assert.equal(initialSummary[1].cost, 50);
assert.equal(initialSummary[1].currentStat, 'Guard 5 • HP 20');
assert.equal(initialSummary[1].nextStat, 'Guard 7 • HP 28');

const weaponBuy = context.buyMerchantGearUpgrade(state, 'weapon');
assert.equal(weaponBuy.ok, true);
assert.equal(weaponBuy.beforeLevel, 0);
assert.equal(weaponBuy.afterLevel, 1);
assert.equal(weaponBuy.cost, 50);
assert.equal(state.player.gold, 950);
assert.equal(state.player.equipment.weapon.upgradeLevel, 1);
const afterWeaponSummary = context.merchantGearUpgradeSummary(state);
assert.equal(afterWeaponSummary[0].cost, 125);
assert.equal(afterWeaponSummary[0].currentStat, 'Power 14');
assert.equal(afterWeaponSummary[0].nextStat, 'Power 16');
assert.equal(context.calcDerived(state).power, 22);

const armorBuy = context.buyMerchantGearUpgrade(state, 'armor');
assert.equal(armorBuy.ok, true);
assert.equal(armorBuy.beforeLevel, 0);
assert.equal(armorBuy.afterLevel, 1);
assert.equal(armorBuy.cost, 50);
assert.equal(state.player.gold, 900);
assert.equal(state.player.equipment.armor.upgradeLevel, 1);
const afterArmorSummary = context.merchantGearUpgradeSummary(state);
assert.equal(afterArmorSummary[1].cost, 125);
assert.equal(afterArmorSummary[1].currentStat, 'Guard 7 • HP 28');
assert.equal(afterArmorSummary[1].nextStat, 'Guard 9 • HP 36');
const derivedAfterArmor = context.calcDerived(state);
assert.equal(derivedAfterArmor.guard, 13);
assert.equal(state.player.maxHp, 138);

const journalBeforeSave = merchantSection(state, context);
assert.ok(journalBeforeSave.body.includes('Weapon +1/3'));
assert.ok(journalBeforeSave.body.includes('Armor +1/3'));
assert.ok(journalBeforeSave.meta.includes('Warden Blade (Power 14)'));
assert.ok(journalBeforeSave.meta.includes('Ashcoat (Guard 7 • HP 28)'));

const poorState = createGearState();
poorState.player.gold = 49;
const poorAttempt = context.buyMerchantGearUpgrade(poorState, 'weapon');
assert.equal(poorAttempt.ok, false);
assert.equal(poorAttempt.reason, 'not_enough_copper');
assert.equal(poorAttempt.missingCopper, 1);
assert.equal(poorState.player.gold, 49);
assert.equal(poorState.player.equipment.weapon.upgradeLevel, 0);
assert.ok(String(poorState.player.log[poorState.player.log.length - 1] || '').includes('Need 1c more copper'));

assert.equal(context.save(state), true);
assert.ok(store.size > 0);
const rawSaved = JSON.parse(store.get(STORAGE_KEY) || 'null');
assert.equal(rawSaved.player.equipment.weapon.upgradeLevel, 1);
assert.equal(rawSaved.player.equipment.armor.upgradeLevel, 1);
let normalizedSaved = null;
try {
  normalizedSaved = context.normalizeSaveShape(JSON.parse(JSON.stringify(rawSaved)));
} catch (err) {
  throw new Error(`normalizeSaveShape failed in merchant smoke: ${err && err.message ? err.message : err}`);
}
assert.equal(normalizedSaved.player.equipment.weapon.upgradeLevel, 1);
assert.equal(normalizedSaved.player.equipment.armor.upgradeLevel, 1);

const reloaded = context.load();
assert.equal(reloaded.player.equipment.weapon.upgradeLevel, 1);
assert.equal(reloaded.player.equipment.armor.upgradeLevel, 1);
const reloadedSummary = context.merchantGearUpgradeSummary(reloaded);
assert.equal(reloadedSummary[0].currentStat, 'Power 14');
assert.equal(reloadedSummary[1].currentStat, 'Guard 7 • HP 28');
const journalAfterLoad = merchantSection(reloaded, context);
assert.ok(journalAfterLoad.body.includes('Weapon +1/3'));
assert.ok(journalAfterLoad.body.includes('Armor +1/3'));

context.S = reloaded;
context.DDJournalV1Render();
assert.ok(String(archivePanel.innerHTML).includes('Guild Journal'));
assert.ok(String(archivePanel.innerHTML).includes('Merchant Upgrades'));
assert.ok(String(archivePanel.innerHTML).includes('Weapon +1/3'));

console.log('PASS: Merchant Gear Upgrades smoke');
