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

function baseState() {
  return {
    build: '1.23.4-boss-trophy-v1-completion',
    screen: 'town',
    filters: { slot: 'all', rarity: 'all', search: '', sort: 'power' },
    player: {
      name: 'Warden',
      title: 'Ashbound Delver',
      level: 1,
      xp: 0,
      xpNext: 100,
      hp: 100,
      maxHp: 100,
      gold: 1250,
      currencyVersion: 3,
      shards: 0,
      ember: 1,
      forgeSpark: 0,
      depth: 0,
      safeExtractDepth: 1,
      returnDepth: 1,
      permanentStartFloor: 1,
      kills: 0,
      crit: 6,
      dodge: 4,
      stats: {},
      equipment: {},
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
      revisitState: { trophyEcho: { history: [], memoryMarks: 0, completedKeys: {} }, famousGear: { history: [] }, rivalTrace: { history: [] } },
      eliteContracts: {},
      eliteTrophies: { collected: {}, totalFound: 0, latestId: '' },
      deepStairCharters: [],
      goldSink: {},
      talentLedger: { version: 1, unlocked: false, previewOnly: true, lifetimePoints: 0, availablePoints: 0, spentPoints: 0, earnedSources: [], awardClaims: {}, notes: [] },
      talentEarning: { enabled: true, sourceId: 'boss_depth_milestone', milestonesReached: {}, pointsAwarded: 0 },
      talentLearnedIds: {},
      talentUnlockIds: [],
      talents: { pointsEarned: 0, pointsSpent: 0, unlocked: {}, spent: {}, unlockedIds: [] }
    },
    town: { merchantRefreshCost: 150, forgeTier: 1, relicFavor: 0 },
    archive: [],
    ui: {},
    run: { active: false, floor: 0, monster: null, choices: [], pendingRewards: { gold: 0, shards: 0, ember: 0, xp: 0, loot: [] }, combatLog: [], setBonuses: {} },
    merchantStock: [{ id: 'merchant_kept_item', name: 'Merchant Kept Item', slot: 'weapon', rarity: 'common', level: 1, rating: 1, value: 1, stats: {} }]
  };
}

function createContext() {
  const store = new Map();
  const context = {
    console,
    Date,
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    document: {
      getElementById(id) {
        if (id !== 'archivePanel') return null;
        return context.archivePanel;
      }
    },
    archivePanel: {
      innerHTML: '',
      querySelector(selector) {
        return selector === '#guildJournalPanel' && this.innerHTML.includes('guildJournalPanel')
          ? { outerHTML: this.innerHTML }
          : null;
      },
      insertAdjacentHTML(_pos, html) { this.innerHTML += html; }
    },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      clear() { store.clear(); }
    },
    STORAGE_KEY,
    BUILD: '1.23.4-boss-trophy-v1-completion',
    COPPER_PER_GOLD: 10000,
    BOSS_INTERVAL: 5,
    DEPTH_CHAPTERS_PER_FLOOR: 3,
    DEPTH_CHAPTERS_PER_THREAT_STEP: 15,
    COMBAT_LOG_STORE_LIMIT: 20,
    CORE_COMBAT_ACTIONS: ['attack', 'guard', 'skill', 'extract'],
    FUTURE_EQUIPMENT_SLOTS: ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet', 'cloak', 'charm'],
    SLOT_ORDER: ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet', 'cloak', 'charm'],
    LEGACY_MYTHIC_SET_SLOTS: [],
    BASES: {
      weapon: ['Blade'],
      offhand: ['Ward'],
      helm: ['Helm'],
      armor: ['Armor'],
      gloves: ['Gloves'],
      boots: ['Boots'],
      ring: ['Ring'],
      amulet: ['Amulet'],
      cloak: ['Cloak'],
      charm: ['Charm']
    },
    RARITIES: [{ key: 'common' }],
    INVENTORY_SORTS: ['power'],
    LORE_SNIPPETS: ['Lowfire'],
    DEFAULT_PLAYER_STATS: {},
    BOSS_TROPHY_DEFINITIONS: [
      { id: 'lowfire_fang', boss: 1, requiredDepth: 15, name: 'Lowfire Fang', source: 'Boss Floor 5', tone: 'Starter Relic', icon: 'fang', image: 'assets/trophies/hollow_stair_skull_trophy.png' },
      { id: 'cinder_crown', boss: 2, requiredDepth: 30, name: 'Cinder Crown', source: 'Boss Floor 10', tone: 'Charred Iron', icon: 'crown', image: 'assets/trophies/hollow_stair_skull_trophy.png' }
    ],
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
    depthStageValue(value) { return Math.max(0, Math.floor(numberOr(value, 0, 0, 999999))); },
    dangerRatingForDepth() { return 1; },
    zoneName() { return 'Lowfire'; },
    districtByDepth() { return { name: 'Lowfire' }; },
    getLoreDepthProgress(rawDepth) {
      const depth = Math.max(1, Math.floor(numberOr(rawDepth, 1, 1, 999999)));
      return { floorNumber: Math.max(1, Math.ceil(depth / 3)), roomWithinFloor: 1, chapterWithinRoom: 1 };
    },
    createBaseState: baseState,
    createGoldSinkState(value = {}) { return { ...value }; },
    createEliteContractState(value = {}) { return { ...value }; },
    createEliteTrophyState(value = {}) { return { collected: {}, totalFound: 0, latestId: '', ...value }; },
    normalizeCharterDepthList(value) { return Array.isArray(value) ? value.slice() : []; },
    ensurePermanentCharters() {},
    baseSlotForSlot(slot, fallback = 'weapon') { return slot || fallback; },
    buildMerchantStock() { return []; },
    calcDerived() {},
    getEquippedSetCount() { return 0; },
    normalizeMonster(monster) { return monster || null; },
    ensureRunShell(state) { state.run = state.run && typeof state.run === 'object' ? state.run : baseState().run; return state.run; },
    defaultRunStartDepth() { return 1; },
    ensureRunSetBonusState(state) { state.run.setBonuses = state.run.setBonuses || {}; return state.run.setBonuses; },
    createPendingRunRewards(value = {}) { return { gold: 0, shards: 0, ember: 0, xp: 0, loot: [], ...value }; },
    clearPendingRunRewards(state) { state.run.pendingRewards = context.createPendingRunRewards(); },
    recoverRunToTown(state) { state.screen = 'town'; state.run.active = false; },
    pushCombat(state, line) { state.run.combatLog = Array.isArray(state.run.combatLog) ? state.run.combatLog : []; state.run.combatLog.push(String(line)); },
    pushLog(state, line) { state.player.log = Array.isArray(state.player.log) ? state.player.log : []; state.player.log.push(String(line)); }
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function loadRuntime() {
  const context = createContext();
  for (const file of SYSTEM_FILES) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  return context;
}

function selectedGuardState(state) {
  return JSON.stringify({
    talentLedger: state.player.talentLedger,
    talentLearnedIds: state.player.talentLearnedIds,
    debtCollector: state.player.debtCollector,
    revisitState: state.player.revisitState,
    gold: state.player.gold,
    shards: state.player.shards,
    ember: state.player.ember,
    forgeSpark: state.player.forgeSpark,
    inventory: state.player.inventory,
    pendingRewards: state.run.pendingRewards,
    choices: state.run.choices,
    monster: state.run.monster
  });
}

const context = loadRuntime();

assert.equal(typeof context.recordBossTrophyUnlock, 'function');
assert.equal(typeof context.normalizeBossTrophyStateShape, 'function');
assert.equal(typeof context.bossTrophyReadableSummary, 'function');
assert.equal(typeof context.save, 'function');
assert.equal(typeof context.load, 'function');

const clean = baseState();
const cleanSummary = context.bossTrophyReadableSummary(clean);
assert.equal(clean.player.bossTrophyRecords.length, 0);
assert.equal(cleanSummary.totalRecorded, 0);
assert.equal(cleanSummary.emptyCopy, 'No boss trophies recorded yet.');
assert.equal(cleanSummary.duplicateSafe, true);
const emptyJournal = context.journalV1233SummaryModel(clean);
assert.ok(emptyJournal.sections.find(section => section.key === 'boss').body.includes('No boss trophies recorded yet'));

const state = baseState();
state.player.gold = 4321;
state.player.shards = 9;
state.player.ember = 2;
state.player.forgeSpark = 1;
state.player.inventory = [{ id: 'kept_item', name: 'Kept Item', slot: 'weapon', rarity: 'common', level: 1, rating: 1, value: 1, stats: {} }];
state.player.debtCollector = { active: true, balanceCopper: 500, pressure: 2, lastVisitAt: 'Before', notes: ['existing'] };
state.player.revisitState = { trophyEcho: { history: [], memoryMarks: 0, completedKeys: {} }, famousGear: { history: [] }, rivalTrace: { history: [] } };
state.player.talentLedger = { version: 1, unlocked: false, previewOnly: true, lifetimePoints: 1, availablePoints: 1, spentPoints: 0, earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }], awardClaims: {}, notes: [] };
state.run.pendingRewards = { gold: 12, shards: 3, ember: 1, xp: 4, loot: [{ id: 'pending_loot' }] };
state.run.choices = ['attack', 'guard'];
const guardBefore = selectedGuardState(state);

const first = context.recordBossTrophyUnlock(state, 15, 'Boss Floor 5');
assert.equal(first.trophyId, 'lowfire_fang');
assert.equal(state.player.bossTrophyRecords.length, 1);
assert.equal(state.player.bossTrophies.length, 1);
assert.equal(selectedGuardState(state), guardBefore, 'Boss Trophy recording must not touch protected unrelated state');

const duplicate = context.recordBossTrophyUnlock(state, 15, 'Boss Floor 5');
assert.equal(duplicate.trophyId, 'lowfire_fang');
assert.equal(state.player.bossTrophyRecords.length, 1);
assert.ok(state.player.bossTrophyRecords[0].count >= 2);
const countAfterAward = state.player.bossTrophyRecords[0].count;
context.normalizeBossTrophyStateShape(state);
context.normalizeBossTrophyStateShape(state);
assert.equal(state.player.bossTrophyRecords.length, 1);
assert.equal(state.player.bossTrophyRecords[0].count, countAfterAward);

const beforeSummary = JSON.stringify(state);
const summary = context.bossTrophyReadableSummary(state);
assert.equal(JSON.stringify(state), beforeSummary, 'readable summary must be read-only');
assert.equal(summary.totalRecorded, 1);
assert.equal(summary.totalFound, countAfterAward);
assert.equal(summary.latestTrophy.trophyName, 'Lowfire Fang');
assert.ok(summary.body.includes('Lowfire Fang'));
assert.equal(summary.duplicateSafe, true);
assert.equal(summary.duplicateRecordsCollapsed, false);
assert.equal(summary.duplicatesCollapsedCount, 0);

assert.equal(context.save(state), true);
const savedSnapshot = JSON.parse(context.localStorage.getItem(STORAGE_KEY));
context.normalizeSaveShape(JSON.parse(JSON.stringify(savedSnapshot)));
const reloaded = context.load();
assert.equal(reloaded.player.bossTrophyRecords.length, 1);
assert.equal(reloaded.player.bossTrophyRecords[0].trophyId, 'lowfire_fang');
assert.ok(reloaded.player.bossTrophies.includes('lowfire_fang'));
assert.equal(context.bossTrophyReadableSummary(reloaded).totalRecorded, 1);

const legacyRaw = baseState();
legacyRaw.player.bossTrophies = ['lowfire_fang', 'lowfire_fang'];
legacyRaw.player.bossTrophyRecords = [];
context.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyRaw));
const legacyLoaded = context.load();
const legacySummary = context.bossTrophyReadableSummary(legacyLoaded);
assert.equal(legacyLoaded.player.bossTrophyRecords.length, 1);
assert.equal(legacyLoaded.player.bossTrophyRecords[0].trophyName, 'Lowfire Fang');
assert.equal(legacySummary.legacyIdsDetected, true);
assert.equal(legacySummary.duplicatesCollapsedCount >= 1, true);

const mixedRaw = baseState();
mixedRaw.player.bossTrophies = ['lowfire_fang'];
mixedRaw.player.bossTrophyRecords = [
  { trophyId: 'lowfire_fang', trophyName: 'Lowfire Fang', bossName: 'Boss Floor 5', count: 1, earnedAt: 20, rawDepth: 15 },
  { id: 'lowfire_fang', trophyName: 'Lowfire Fang', bossName: 'Boss Floor 5', count: 1, earnedAt: 10, rawDepth: 15 }
];
context.localStorage.setItem(STORAGE_KEY, JSON.stringify(mixedRaw));
const mixedLoaded = context.load();
const mixedSummary = context.bossTrophyReadableSummary(mixedLoaded);
assert.equal(mixedLoaded.player.bossTrophyRecords.length, 1);
assert.equal(mixedSummary.duplicateRecordsCollapsed, true);
assert.equal(mixedSummary.totalRecorded, 1);

const journalModel = context.journalV1233SummaryModel(reloaded);
const bossSection = journalModel.sections.find(section => section.key === 'boss');
assert.ok(bossSection.body.includes('Lowfire Fang'));
assert.ok(bossSection.meta.includes('Boss Floor 5'));
const panel = context.renderGuildJournalPanel(reloaded);
assert.ok(panel.includes('Guild Journal'));
assert.ok(panel.includes('Lowfire Fang'));
assert.ok(!panel.match(/data-start-|data-complete-|data-spend-|data-borrow-|data-repay-|data-claim-|data-reward-/i));

console.log('PASS: Boss Trophy v1 smoke');
