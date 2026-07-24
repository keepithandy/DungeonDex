#!/usr/bin/env node
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const SYSTEM_FILES = [
  '../../js/systems/08_normalization_save.js',
  '../../js/systems/35_revisit_famous_gear_memory_state_patch.js',
  '../../js/systems/03_town_contracts_market.js',
  '../../js/systems/37_revisit_famous_gear_flavor_pack.js',
  '../../js/systems/38_journal_v1.js'
];

function makeContext() {
  const store = new Map();
  const journalPanel = {
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
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    document: { getElementById: id => (id === 'archivePanel' ? journalPanel : null) },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    cleanDisplayText(value, fallback = '') {
      return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    },
    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    },
    format(value) { return String(value); },
    formatMoney(value) { return `${Math.floor(Number(value) || 0)}c`; },
    coins(gold = 0, silver = 0, copper = 0) {
      return Math.max(0, Math.round((Number(gold) || 0) * 10000 + (Number(silver) || 0) * 100 + (Number(copper) || 0)));
    },
    numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
      const number = Number(value);
      const safe = Number.isFinite(number) ? number : fallback;
      return Math.max(min, Math.min(max, safe));
    },
    isPlainObject(value) {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    },
    asArray(value, fallback = []) {
      return Array.isArray(value) ? value : fallback;
    },
    createBaseState() {
      return {
        build: '1.23.4',
        screen: 'town',
        filters: { slot: 'all', rarity: 'all', search: '', sort: 'power' },
        player: {
          name: 'Delver',
          title: '',
          level: 1,
          xp: 0,
          xpNext: 100,
          maxHp: 100,
          hp: 100,
          gold: 0,
          currencyVersion: 3,
          shards: 0,
          ember: 0,
          depth: 0,
          safeExtractDepth: 1,
          kills: 0,
          crit: 0,
          dodge: 0,
          forgeSpark: 0,
          permanentStartFloor: 1,
          returnDepth: 1,
          boughtStart20Scroll: false,
          debtbrandBoostReady: false,
          earlyAidGiven: false,
          goldSink: {},
          debtCollector: { active: false, balanceCopper: 0, pressure: 0, lastVisitAt: '', notes: [] },
          revisitState: { unlocked: false, lastViewedAt: '', notedDistricts: [], activeRouteKey: '', startedAt: 0, sourceFloor: 0, sideRoute: false, locked: true, cappedReward: true, trophyEcho: { history: [], completedKeys: {}, lastResult: null }, famousGear: { history: [], completedKeys: {}, lastResult: null }, rivalTrace: { history: [], completedKeys: {}, lastResult: null } },
          eliteContracts: {},
          eliteTrophies: { collected: {}, totalFound: 0, latestId: '' },
          deepStairCharters: [],
          stats: { power: 0, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 },
          inventory: [],
          equipment: {},
          discoveredMonsters: [],
          discoveredGear: [],
          bossTrophies: [],
          bossTrophyRecords: [],
          retiredRelics: [],
          log: [],
          loreSeen: [],
          runHistory: [],
          quests: [],
          talents: { unlocked: {}, spent: {}, unlockedIds: [] },
          talentUnlockIds: [],
          talentLearnedIds: {},
          talentPoints: 0,
          talentLedger: { version: 1, unlocked: false, previewOnly: true, lifetimePoints: 0, availablePoints: 0, spentPoints: 0, earnedSources: [], awardClaims: {}, notes: [] },
          talentEarning: { enabled: true, sourceId: 'boss_depth_milestone', milestonesReached: {}, pointsAwarded: 0 }
        },
        town: { merchantRefreshCost: 0, forgeTier: 1, relicFavor: 0 },
        archive: [],
        ui: { combatLogExpanded: false },
        run: { active: false, floor: 0, chain: 0, danger: 0, zone: '', roomsCleared: 0, encounters: 0, goldBonusPct: 0, pendingRewards: {}, startedFromCharter: false, charterStartFloor: 0, setBonuses: {}, combatLog: [], choices: [], monster: null },
        merchantStock: []
      };
    },
    normalizeScreenName(value) { return String(value || 'town'); },
    progressDepthValue(value, fallback = 1) { return Math.max(1, Math.floor(Number(value) || fallback)); },
    sanitizeCurrencyValue(value, fallback = 0) { return Math.max(0, Math.floor(Number(value) || fallback)); },
    defaultRunStartDepth() { return 1; },
    dangerRatingForDepth() { return 0; },
    zoneName() { return 'Town'; },
    createPendingRunRewards(value = {}) { return value && typeof value === 'object' ? value : {}; },
    ensureRunSetBonusState() {},
    clearPendingRunRewards() {},
    recoverRunToTown() {},
    buildMerchantStock() { return []; },
    calcDerived() {},
    normalizeCharterDepthList(value) { return Array.isArray(value) ? value : []; },
    createEliteContractState() { return {}; },
    createEliteTrophyState(value = {}) { return value && typeof value === 'object' ? value : { collected: {}, totalFound: 0, latestId: '' }; },
    normalizeBossTrophyStateShape() {},
    rememberBossTrophyRepairFlags() {},
    ensurePermanentCharters() {},
    ensureRunShell(state) { if (!state.run) state.run = {}; },
    normalizeItem(value) { return value && typeof value === 'object' ? value : null; },
    normalizeRetiredRelicRecords(value) { return Array.isArray(value) ? value : []; },
    normalizeDebtCollectorState(value) { return value && typeof value === 'object' ? value : { active: false, balanceCopper: 0, pressure: 0, lastVisitAt: '', notes: [] }; },
    repairTalentState() {},
    normalizeTalentLedgerState() {},
    applyBossTrophyTalentAwardIfReady() {},
    BUILD: '1.23.4',
    FUTURE_EQUIPMENT_SLOTS: ['all'],
    RARITIES: [{ key: 'common' }],
    INVENTORY_SORTS: ['power'],
    SLOT_ORDER: [],
    LEGACY_MYTHIC_SET_SLOTS: [],
    CORE_COMBAT_ACTIONS: ['attack', 'guard', 'skill', 'extract'],
    COMBAT_LOG_STORE_LIMIT: 20,
    STORAGE_KEY: 'dungeondex-save',
    S: { player: { revisitState: { trophyEcho: {}, famousGear: {}, rivalTrace: {} }, retiredRelics: [] } }
  };
  context.window = context;
  context.globalThis = context;
  return { context: vm.createContext(context), journalPanel, store };
}

async function loadRuntime(context) {
  for (const file of SYSTEM_FILES) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
}

const { context, journalPanel, store } = makeContext();
await loadRuntime(context);

assert.equal(typeof context.normalizeSaveShape, 'function');
assert.equal(typeof context.save, 'function');
assert.equal(typeof context.load, 'function');
assert.equal(typeof context.famousGearMemorySummary, 'function');
assert.equal(typeof context.renderGuildJournalPanel, 'function');

const legacyState = {
  player: {
    revisitState: {
      famousGear: {
        history: [
          'relic-1',
          { completionKey: 'famous_gear:relic-1', recordId: 'relic-1', itemName: 'Ashcloth Wraps', sourceLabel: 'Retired Gear Archive', summary: 'Recovered Famous Gear memory.' },
          { completionKey: 'famous_gear:relic-1', recordId: 'relic-1', itemName: 'Ashcloth Wraps', sourceLabel: 'Retired Gear Archive', summary: 'Recovered Famous Gear memory again.' },
          { completionKey: 'famous_gear:relic-2', recordId: 'relic-2', itemName: 'Graysteel Cap', sourceLabel: 'Retired Gear Archive', summary: 'Recovered Famous Gear memory.' }
        ],
        completedKeys: { 'famous_gear:relic-1': true, 'legacy-key': true },
        lastResult: { completionKey: 'famous_gear:relic-1', recordId: 'relic-1', itemName: 'Ashcloth Wraps', sourceLabel: 'Retired Gear Archive', summary: 'Recovered Famous Gear memory.' }
      }
    }
  }
};

const rawSummary = context.famousGearMemorySummary(JSON.parse(JSON.stringify(legacyState)));
assert.equal(rawSummary.totalRecorded, 2);
assert.equal(rawSummary.duplicateSafe, true);
assert.equal(rawSummary.duplicateRecordsCollapsed, true);
assert.equal(rawSummary.legacyIdsDetected, true);
assert.ok(rawSummary.readableNames.includes('Ashcloth Wraps'));
assert.ok(rawSummary.readableNames.includes('Graysteel Cap'));
assert.ok(rawSummary.latestMemory && rawSummary.latestMemory.itemName);

const normalized = context.normalizeSaveShape(JSON.parse(JSON.stringify(legacyState)));
const summary = context.famousGearMemorySummary(normalized);
assert.equal(summary.totalRecorded, 2);
assert.equal(summary.duplicateSafe, true);

const beforeSave = JSON.stringify(normalized.player.revisitState.famousGear);
assert.equal(context.save(normalized), true);
const afterLoad = context.load();
const afterSummary = context.famousGearMemorySummary(afterLoad);

assert.equal(JSON.stringify(afterLoad.player.revisitState.famousGear), beforeSave);
assert.equal(afterSummary.totalRecorded, 2);
assert.equal(afterSummary.duplicateSafe, true);
assert.ok(afterSummary.duplicateRecordsCollapsed === false || afterSummary.duplicateRecordsCollapsed === true);

const emptySummary = context.famousGearMemorySummary({ player: { revisitState: { famousGear: { history: [], completedKeys: {} } } } });
assert.equal(emptySummary.totalRecorded, 0);
assert.equal(emptySummary.emptyStateCopy, 'No famous gear memories recorded yet.');

const journal = context.renderGuildJournalPanel(afterLoad);
assert.ok(/Famous Gear/i.test(journal));
assert.ok(/Historical Memories/i.test(journal));
assert.ok(/2 compatible records remain/i.test(journal));
assert.ok(/Read-only/i.test(journal));
assert.ok(!/Memory Key|duplicate-safe|legacy trace detected/i.test(journal));

context.S = afterLoad;
context.DDJournalV1Render();
assert.ok(String(journalPanel.innerHTML).includes('Guild Journal'));
assert.ok(String(journalPanel.innerHTML).includes('Famous Gear'));
assert.ok(String(journalPanel.innerHTML).includes('Historical Memories'));

assert.ok(store.size > 0);
const persisted = JSON.parse(store.values().next().value || 'null');
assert.ok(persisted && persisted.player && persisted.player.revisitState && persisted.player.revisitState.famousGear);

console.log('PASS: Famous Gear Memory v1 smoke');
