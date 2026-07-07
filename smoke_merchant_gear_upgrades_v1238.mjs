#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const SYSTEM_FILES = [
  './js/systems/00_core_constants_data.js',
  './js/systems/01_state_recovery.js',
  './js/systems/02_currency_pending_rewards.js',
  './js/systems/03_town_contracts_market.js',
  './js/systems/04_depth_progression_charters.js',
  './js/systems/05_elite_modifiers.js',
  './js/systems/06_scaling_generation_audits.js',
  './js/systems/07_player_combat_runtime.js',
  './js/systems/08_normalization_save.js',
  './js/systems/09_ui_common_intro.js',
  './js/systems/10_ui_town_shop.js',
  './js/systems/11_ui_run_gear_dex_archive.js',
  './js/systems/19_warden_talents_lowfire_board.js',
  './js/systems/38_journal_v1.js'
];

function numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.max(min, Math.min(max, safe));
}

function createNode(id = '') {
  return {
    id,
    innerHTML: '',
    textContent: '',
    className: '',
    title: '',
    value: '',
    style: {},
    dataset: {},
    disabled: false,
    closest() { return createNode(`${id}-closest`); },
    appendChild() {},
    insertAdjacentHTML(_where, html) { this.innerHTML += html; },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    }
  };
}

function createContext() {
  const nodes = new Map();
  const storage = new Map();
  const getNode = id => {
    if (!nodes.has(id)) nodes.set(id, createNode(id));
    return nodes.get(id);
  };
  const context = {
    console,
    Math,
    Date,
    JSON,
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 0;
    },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    requestAnimationFrame(fn) {
      if (typeof fn === 'function') fn();
      return 0;
    },
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {},
    confirm() { return true; },
    alert() {},
    numberOr,
    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    },
    cleanDisplayText(value, fallback = '') {
      return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    },
    format(value) {
      return String(Math.round(Number(value) || 0));
    },
    formatMoney(value) {
      return `${Math.max(0, Math.floor(Number(value) || 0))}c`;
    },
    performance: { now: () => 0 },
    navigator: {},
    MutationObserver: class {
      constructor() {}
      observe() {}
      disconnect() {}
    },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    document: {
      readyState: 'complete',
      title: '',
      body: createNode('body'),
      head: { appendChild() {} },
      createElement(tag) {
        const node = createNode(tag);
        node.tagName = String(tag || '').toUpperCase();
        return node;
      },
      getElementById(id) { return getNode(id); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    el(id) { return getNode(id); },
    $$(selector) {
      if (selector === '.screen' || selector === '.tab') return [];
      return [];
    }
  };
  context.window = context;
  context.globalThis = context;
  context.__nodes = nodes;
  context.__getNode = getNode;
  return vm.createContext(context);
}

function vmValue(context, value) {
  return vm.runInContext(`(${JSON.stringify(value)})`, context);
}

function makeGear(context, slot, overrides = {}) {
  const base = {
    id: `smoke_${slot}_${Math.random().toString(16).slice(2, 8)}`,
    name: slot === 'armor' ? 'Smoke Plate' : 'Smoke Blade',
    slot,
    rarity: 'common',
    level: 6,
    rating: slot === 'armor' ? 12 : 14,
    value: 100,
    theme: 'warden',
    maker: 'Lowfire',
    summary: 'Smoke fixture',
    stats: {
      power: slot === 'weapon' ? 10 : 0,
      guard: slot === 'armor' ? 8 : 0,
      wit: 0,
      speed: 0,
      luck: 0,
      hp: slot === 'armor' ? 18 : 0
    },
    ...overrides
  };
  return base;
}

function assignGear(context, state, slot, overrides = {}) {
  context.__targetState = state;
  context.__gearPayload = vmValue(context, makeGear(context, slot, overrides));
  vm.runInContext(`__targetState.player.equipment[${JSON.stringify(slot)}] = normalizeItem(__gearPayload, ${JSON.stringify(slot)});`, context);
  delete context.__targetState;
  delete context.__gearPayload;
}

async function loadRuntime() {
  const context = createContext();
  for (const file of SYSTEM_FILES) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return context;
}

const context = await loadRuntime();

function currentState(context) {
  return vm.runInContext('S', context);
}

function replaceState(context, expression) {
  vm.runInContext(`S = ${expression};`, context);
  return currentState(context);
}

assert.equal(typeof context.createBaseState, 'function');
assert.equal(typeof context.renderTown, 'function');
assert.equal(typeof context.renderGear, 'function');
assert.equal(typeof context.buyMerchantGearUpgrade, 'function');
assert.equal(typeof context.normalizeSaveShape, 'function');

const state = replaceState(context, 'createBaseState()');
state.player.gold = 1000;
assignGear(context, state, 'weapon');
assignGear(context, state, 'armor');
vm.runInContext('calcDerived(S)', context);

context.renderTown();
const merchantHtml = String(context.__getNode('merchantPanel').innerHTML || '');
assert.match(merchantHtml, /Merchant Gear Upgrades/);
assert.match(merchantHtml, /Current /);
assert.match(merchantHtml, /Next /);
assert.match(merchantHtml, /data-merchant-upgrade="weapon"/);

context.renderGear();
const gearProgressHtml = String(context.__getNode('talentPanel').innerHTML || '');
assert.match(gearProgressHtml, /Gear Upgrades/);
assert.doesNotMatch(gearProgressHtml, /Talent Tree Preview/);
assert.doesNotMatch(gearProgressHtml, /data-talent-spend-hunter-board/);

const goldBefore = state.player.gold;
const firstUpgrade = context.buyMerchantGearUpgrade(state, 'weapon');
assert.equal(firstUpgrade.ok, true);
assert.equal(firstUpgrade.cost, 50);
assert.equal(state.player.gold, goldBefore - 50);
assert.equal(state.player.equipment.weapon.upgradeLevel, 1);

assert.equal(context.save(state), true);
replaceState(context, 'load()');
const reloaded = currentState(context);
assert.equal(reloaded.player.equipment.weapon.upgradeLevel, 1);

reloaded.player.gold = 2000;
const secondUpgrade = context.buyMerchantGearUpgrade(reloaded, 'weapon');
const thirdUpgrade = context.buyMerchantGearUpgrade(reloaded, 'weapon');
const cappedUpgrade = context.buyMerchantGearUpgrade(reloaded, 'weapon');
assert.equal(secondUpgrade.ok, true);
assert.equal(secondUpgrade.cost, 125);
assert.equal(thirdUpgrade.ok, true);
assert.equal(thirdUpgrade.cost, 250);
assert.equal(reloaded.player.equipment.weapon.upgradeLevel, 3);
assert.equal(cappedUpgrade.ok, false);
assert.equal(cappedUpgrade.reason, 'maxed');
assert.equal(reloaded.player.equipment.weapon.upgradeLevel, 3);

const armorGoldBefore = reloaded.player.gold = 49;
const armorLevelBefore = reloaded.player.equipment.armor.upgradeLevel;
const blockedArmorUpgrade = context.buyMerchantGearUpgrade(reloaded, 'armor');
assert.equal(blockedArmorUpgrade.ok, false);
assert.equal(blockedArmorUpgrade.reason, 'not_enough_copper');
assert.equal(reloaded.player.gold, armorGoldBefore);
assert.equal(reloaded.player.equipment.armor.upgradeLevel, armorLevelBefore);

const malformedState = vm.runInContext('createBaseState()', context);
context.__targetState = malformedState;
context.__badWeapon = vmValue(context, {
  id: 'bad_weapon',
  name: 'Bad Weapon',
  slot: 'weapon',
  rarity: 'common',
  level: 5,
  rating: 10,
  value: 100,
  stats: { power: 9, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 },
  upgradeLevel: 'bad'
});
context.__badArmor = vmValue(context, {
  id: 'bad_armor',
  name: 'Bad Armor',
  slot: 'armor',
  rarity: 'common',
  level: 5,
  rating: 10,
  value: 100,
  stats: { power: 0, guard: 7, wit: 0, speed: 0, luck: 0, hp: 15 },
  upgradeLevel: 99
});
context.__badInventoryWeapon = vmValue(context, {
  id: 'bad_inventory_weapon',
  name: 'Bad Inventory Weapon',
  slot: 'weapon',
  rarity: 'common',
  level: 4,
  rating: 9,
  value: 80,
  stats: { power: 8, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 },
  upgradeLevel: -2
});
vm.runInContext(`
  __targetState.player.equipment.weapon = __badWeapon;
  __targetState.player.equipment.armor = __badArmor;
  __targetState.player.inventory.push(__badInventoryWeapon);
`, context);
delete context.__targetState;
delete context.__badWeapon;
delete context.__badArmor;
delete context.__badInventoryWeapon;
context.normalizeSaveShape(malformedState);
assert.equal(malformedState.player.equipment.weapon.upgradeLevel, 0);
assert.equal(malformedState.player.equipment.armor.upgradeLevel, 3);
assert.equal(malformedState.player.inventory.find(item => item.id === 'bad_inventory_weapon')?.upgradeLevel, 0);

const cleanTalentState = vm.runInContext('createBaseState()', context);
assignGear(context, cleanTalentState, 'weapon', { id: 'talent_compare_weapon' });
assignGear(context, cleanTalentState, 'armor', { id: 'talent_compare_armor' });
context.normalizeSaveShape(cleanTalentState);
const cleanDerived = context.calcDerived(cleanTalentState);
const cleanMaxHp = cleanTalentState.player.maxHp;

const legacyTalentState = vm.runInContext('createBaseState()', context);
assignGear(context, legacyTalentState, 'weapon', { id: 'legacy_talent_weapon' });
assignGear(context, legacyTalentState, 'armor', { id: 'legacy_talent_armor' });
legacyTalentState.player.talentLedger = { availablePoints: 99, lifetimePoints: 99, spentPoints: 12, awardClaims: { first_boss: true } };
legacyTalentState.player.talentEarning = { enabled: true, sourceId: 'boss_depth_milestone', pointsAwarded: 9, milestonesReached: { first_boss: true } };
legacyTalentState.player.talentLearnedIds = { hunter_board_clarity: true, debt_collector_clarity: true, survivor_guard_return: true };
legacyTalentState.player.talentUnlockIds = ['hunter_board_clarity', 'debt_collector_clarity', 'survivor_guard_return'];
legacyTalentState.player.talentPoints = 9;
context.normalizeSaveShape(legacyTalentState);
const legacyDerived = context.calcDerived(legacyTalentState);
assert.deepEqual(
  { power: legacyDerived.power, guard: legacyDerived.guard, hp: legacyTalentState.player.maxHp },
  { power: cleanDerived.power, guard: cleanDerived.guard, hp: cleanMaxHp }
);
assert.equal(context.DungeonDexTalents.summary(legacyTalentState).pointsAvailable, 0);

context.__legacyTalentState = legacyTalentState;
vm.runInContext('S = __legacyTalentState;', context);
delete context.__legacyTalentState;
context.__getNode('archivePanel').innerHTML = '';
context.DDJournalV1Render();
const journalHtml = String(context.__getNode('archivePanel').innerHTML || '');
assert.match(journalHtml, /Merchant Upgrades/);
assert.doesNotMatch(journalHtml, /Talent Memory/);

console.log('PASS: merchant gear upgrades smoke v1.23.8');
