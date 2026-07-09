#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const STORAGE_KEY = 'dungeondex_emberfall_v109';
const SYSTEM_FILES = [
  'js/systems/07_player_combat_runtime.js',
  'js/systems/08_normalization_save.js',
  'js/systems/11_ui_run_gear_dex_archive.js',
  'js/systems/39_gear_upgrade_summary_panel.js',
  'js/systems/40_gear_detail_modal.js'
];

function numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.max(min, Math.min(max, safe));
}

function cleanDisplayText(value, fallback = '') {
  return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function createState() {
  return {
    build: '1.23.8.03-gear-identity-compare-clarity',
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
          upgradeLevel: 2,
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
          upgradeLevel: 1,
          stats: { power: 0, guard: 5, wit: 0, speed: 0, luck: 0, hp: 20 }
        }
      },
      inventory: [
        {
          id: 'shale_blade',
          name: 'Shale Blade',
          slot: 'weapon',
          rarity: 'common',
          level: 2,
          rating: 9,
          value: 90,
          upgradeLevel: 0,
          stats: { power: 9, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 }
        },
        {
          id: 'ember_plate',
          name: 'Ember Plate',
          slot: 'armor',
          rarity: 'common',
          level: 2,
          rating: 8,
          value: 85,
          upgradeLevel: 1,
          stats: { power: 0, guard: 4, wit: 0, speed: 0, luck: 0, hp: 14 }
        }
      ],
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
      revisitState: { trophyEcho: { history: [], memoryMarks: 0, completedKeys: {} }, famousGear: { history: [], completedKeys: {} }, rivalTrace: { history: [], completedKeys: {} } },
      eliteContracts: {},
      eliteTrophies: { collected: {}, totalFound: 0, latestId: '' },
      deepStairCharters: [],
      goldSink: {},
      talentLedger: { version: 1, unlocked: false, previewOnly: true, lifetimePoints: 0, availablePoints: 0, spentPoints: 0, earnedSources: [], awardClaims: {}, notes: [] },
      talentEarning: { enabled: false, sourceId: 'deprecated_talent_system', milestonesReached: {}, pointsAwarded: 0 },
      talentLearnedIds: {},
      talentUnlockIds: [],
      talents: { pointsEarned: 0, pointsSpent: 0, unlocked: {}, spent: {}, unlockedIds: [] }
    },
    town: { merchantRefreshCost: 150, forgeTier: 1, relicFavor: 0 },
    archive: [],
    ui: {},
    run: { active: false, floor: 0, monster: null, choices: [], pendingRewards: { gold: 0, shards: 0, ember: 0, xp: 0, loot: [] }, combatLog: [], setBonuses: {} },
    merchantStock: []
  };
}

function createContext() {
  const store = new Map();
  const panels = new Map();
  const ids = ['gearPlayerPanel','equipmentPanel','filtersPanel','inventoryPanel','gearUpgradeSummaryPanel','archivePanel','settingsPanel'];
  ids.forEach(id => panels.set(id, { id, innerHTML: '', classList: { add() {}, remove() {} } }));
  const context = {
    console,
    Date,
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    document: {
      readyState: 'complete',
      body: { appendChild(node) { panels.set(node.id, node); } },
      head: { appendChild() {} },
      createElement(tag) { return { tagName: tag.toUpperCase(), id: '', innerHTML: '', classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }; },
      getElementById(id) { return panels.get(id) || null; },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); }
    },
    STORAGE_KEY,
    BUILD: '1.23.8.03-gear-identity-compare-clarity',
    COPPER_PER_GOLD: 10000,
    COMBAT_LOG_STORE_LIMIT: 20,
    CORE_COMBAT_ACTIONS: ['attack', 'guard', 'skill', 'extract'],
    FUTURE_EQUIPMENT_SLOTS: ['weapon', 'armor'],
    SLOT_ORDER: ['weapon', 'armor'],
    DEFAULT_PLAYER_STATS: { power: 8, guard: 6, wit: 5, luck: 4, speed: 5 },
    RARITIES: [{ key: 'common' }],
    INVENTORY_SORTS: ['power'],
    BASES: { weapon: ['Blade'], armor: ['Armor'] },
    asArray(value, fallback = []) { return Array.isArray(value) ? value : fallback; },
    isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); },
    numberOr,
    cleanDisplayText,
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); },
    format(value) { return String(Math.floor(Number(value) || 0)); },
    formatMoney(value) { return `${Math.max(0, Math.floor(Number(value) || 0))}c`; },
    coins(gold = 0, silver = 0, copper = 0) { return Math.max(0, Math.floor(gold * 10000 + silver * 100 + copper)); },
    toCopper(value) { return Math.max(0, Math.floor(Number(value) || 0)); },
    sanitizeCurrencyValue(value, fallback = 0) { return Math.max(0, Math.floor(numberOr(value, fallback, 0, Number.MAX_SAFE_INTEGER))); },
    makeId(prefix = 'id') { return `${prefix}_smoke`; },
    normalizeItemLevel(value, fallback = 1) { return Math.max(1, Math.floor(numberOr(value, fallback, 1, 999999))); },
    baseSlotForSlot(slot, fallback = 'weapon') { const clean = String(slot || '').toLowerCase(); return clean === 'weapon' || clean === 'armor' ? clean : fallback; },
    getMythicSetDefinition() { return null; },
    mythicSetSlotFromSlot() { return ''; },
    getItemSetId() { return ''; },
    gearRarityLabel(item) { return String(item?.rarity || 'common'); },
    itemRarityKey(item) { return String(item?.rarity || 'common'); },
    rarityClass() { return ''; },
    getRarityCardClass() { return ''; },
    gearPowerValue(item) { return Math.floor(numberOr(item?.rating || item?.power || 0)); },
    gearMemoryBadges() { return ''; },
    setBonusMiniMarkup() { return ''; },
    setBonusPreviewMarkup() { return ''; },
    slotDisplayName(slot) { return String(slot || '').replace(/\b[a-z]/g, ch => ch.toUpperCase()); },
    getItemLevelLabel(item) { return `ilvl ${Math.max(1, Math.floor(numberOr(item?.level || item?.ilvl, 1)))}`; },
    gearSlotTypeText(slotLabel, typeLabel) { return typeLabel && typeLabel !== slotLabel ? `${slotLabel} / ${typeLabel}` : slotLabel; },
    gearScoreMarkup(item) { return `<div class="gear-score-grid"><span><b>${Math.max(0, Math.floor(numberOr(item?.rating || 0)))}</b><small>Power</small></span></div>`; },
    sellValue(item) { return Math.max(0, Math.floor(numberOr(item?.value || 0))); },
    canRetireInventoryItem() { return false; },
    loadoutSlotGroups() { return []; },
    depthShortLabel() { return 'F1'; },
    bestDepthReached() { return 1; },
    calcDerived(state) { return state.player.stats; },
    createBaseState() { return createState(); },
    save() { return true; },
    load() { return createState(); },
    render() {},
    normalizeSaveShape(state) { return state; },
    merchantGearUpgradeSummary(state) { return window.merchantGearUpgradeSummary(state); }
  };
  context.window = context;
  context.globalThis = context;
  return { context: vm.createContext(context), panels };
}

function loadRuntime(context) {
  for (const file of SYSTEM_FILES) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
}

const { context, panels } = createContext();
loadRuntime(context);

assert.equal(typeof context.renderGear, 'function');
assert.equal(typeof context.DungeonDexGearDetailModal?.open, 'function');

const state = createState();
context.S = state;
context.renderGear();

const equipmentHtml = String(panels.get('equipmentPanel').innerHTML);
const inventoryHtml = String(panels.get('inventoryPanel').innerHTML);
const summaryHtml = String(panels.get('gearUpgradeSummaryPanel').innerHTML);

assert.ok(equipmentHtml.includes('Warden Blade +2'));
assert.ok(equipmentHtml.includes('Ashcoat +1'));
assert.ok(inventoryHtml.includes('Shale Blade'));
assert.ok(inventoryHtml.includes('Ember Plate +1'));
assert.ok(summaryHtml.includes('Warden Blade +2'));
assert.ok(summaryHtml.includes('Ashcoat +1'));
assert.ok(summaryHtml.includes('Current bonus +4 Power'));
assert.ok(summaryHtml.includes('Current bonus +2 Guard and +8 HP'));

context.DungeonDexGearDetailModal.open({ item: state.player.inventory[0], source: 'Inventory', slot: 'weapon' });
const modalHtml = String(panels.get('gearDetailModal')?.innerHTML || '');
assert.ok(modalHtml.includes('Equipped'));
assert.ok(modalHtml.includes('Warden Blade +2'));
assert.ok(modalHtml.includes('Equipped: +4 Power from upgrades'));
assert.ok(modalHtml.includes('Selected gear is compared against the current equipped piece in the same slot.'));

console.log('PASS: Gear identity and comparison smoke');
