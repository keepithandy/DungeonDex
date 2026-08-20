#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUNTIME_FILES = [
  'js/systems/00_core_constants_data.js',
  'js/systems/01_state_recovery.js',
  'js/systems/02_currency_pending_rewards.js',
  'js/systems/03_town_contracts_market.js',
  'js/systems/04_depth_progression_charters.js',
  'js/systems/05_elite_modifiers.js',
  'js/systems/06_scaling_generation_audits.js',
  'js/systems/07_player_combat_runtime.js',
  'js/systems/08_normalization_save.js',
  'js/systems/11_ui_run_gear_dex_archive.js',
  'js/systems/29_monster_backdrops_canvas.js'
];
const RELIQUARY_NAMES = Object.freeze(['Bell-Drowned Warden', 'Siltbound Reliquary Lurker']);

function plain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sequenceRandom(values, fallback = 0.99) {
  const queue = values.slice();
  return () => queue.length ? queue.shift() : fallback;
}

async function loadRuntime() {
  let randomSource = () => 0.99;
  let randomCalls = 0;
  let idCounter = 0;
  const runtimeMath = Object.create(Math);
  runtimeMath.random = () => {
    randomCalls += 1;
    return randomSource();
  };
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
    requestAnimationFrame(callback) { if (typeof callback === 'function') callback(); return 1; },
    cancelAnimationFrame() {},
    addEventListener() {},
    devicePixelRatio: 1,
    document: {
      readyState: 'complete',
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { style: {}, dataset: {}, setAttribute() {}, appendChild() {} }; },
      head: { appendChild() {} }
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
    escapeHtml(value) { return String(value ?? ''); },
    showExtractionPopup() {},
    showDefeatPopup() {}
  };
  context.window = context;
  context.globalThis = context;
  const sandbox = vm.createContext(context);

  for (const file of RUNTIME_FILES) {
    const source = await readFile(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, sandbox, { filename: file });
  }

  vm.runInContext(`globalThis.__reliquaryApi = {
    DISTRICT_DATA,
    DISTRICT_ENCOUNTER_IDENTITIES,
    BOSS_FLOOR_NAMES,
    createBaseState,
    districtByDepth,
    dungeonDistrictIdentityForDepth,
    districtArrivalLine,
    districtArrivalMarkup,
    districtMonsterIdentity,
    generateMonster,
    combatBackdropKind,
    combatBackdropClasses
  };`, sandbox);

  return {
    api: sandbox.__reliquaryApi,
    backdropApi: sandbox.DDMonsterBackdropCanvas,
    setRandom(nextRandom) {
      randomSource = typeof nextRandom === 'function' ? nextRandom : () => Number(nextRandom) || 0;
      randomCalls = 0;
    },
    randomCallCount() { return randomCalls; }
  };
}

const runtime = await loadRuntime();
const districts = plain(runtime.api.DISTRICT_DATA);
const reliquary = districts.find(district => district.id === 'drowned-reliquary');
assert.ok(reliquary, 'the Drowned Reliquary should be registered as a real district');
assert.deepEqual(
  { min: reliquary.min, max: reliquary.max, name: reliquary.name, tone: reliquary.tone },
  { min: 31, max: 40, name: 'The Drowned Reliquary', tone: 'drowned-reliquary' },
  'the vertical slice should occupy the boss-free D31-D40 registry gap'
);

for (let index = 1; index < districts.length; index += 1) {
  assert.equal(districts[index].min, districts[index - 1].max + 1, `${districts[index].name} should begin immediately after ${districts[index - 1].name}`);
}
assert.equal(runtime.api.districtByDepth(30).id, 'ember-debtworks', 'D30 should remain Ember Debtworks');
assert.equal(runtime.api.districtByDepth(31).id, 'drowned-reliquary', 'D31 should enter the Drowned Reliquary');
assert.equal(runtime.api.districtByDepth(40).id, 'drowned-reliquary', 'D40 should remain in the Drowned Reliquary');
assert.equal(runtime.api.districtByDepth(41).id, 'cinderbone', 'D41 should remain Cinderbone Halls');

const identity = plain(runtime.api.dungeonDistrictIdentityForDepth(31));
assert.equal(identity.name, 'The Drowned Reliquary', 'district identity should expose the Reliquary name');
assert.equal(identity.safeFallback, false, 'valid Reliquary depths should not report fallback identity');
assert.match(identity.subtitle, /drowned|bell|water|relic/i, 'district subtitle should carry its own identity');
assert.match(runtime.api.districtArrivalLine(reliquary), /drowned|bell|water|relic/i, 'arrival copy should introduce the Reliquary');
assert.match(runtime.api.districtArrivalMarkup(31, reliquary), /Entering[\s\S]*The Drowned Reliquary/, 'D31 should render the district arrival card');
assert.equal(runtime.api.districtArrivalMarkup(32, reliquary), '', 'the arrival card should remain entry-only');

assert.equal(Object.keys(runtime.api.BOSS_FLOOR_NAMES).length, 20, 'the named boss catalog should remain unchanged');
for (let depth = 31; depth <= 40; depth += 1) {
  assert.notEqual(depth % 15, 0, `D${depth} should not move or contain a boss-cadence depth`);
}

const roster = plain(runtime.api.DISTRICT_ENCOUNTER_IDENTITIES['drowned-reliquary']);
assert.equal(roster.length, 2, 'v1.28.1 should add only the two-enemy vertical slice');
assert.deepEqual(roster.map(entry => entry.name).sort(), RELIQUARY_NAMES.slice().sort(), 'the vertical-slice encounter names should remain stable');
for (const entry of roster) {
  assert.deepEqual(Object.keys(entry).sort(), ['family', 'lore', 'name', 'type'], `${entry.name} should remain identity-only data`);
  assert.ok(!Object.values(entry).some(value => typeof value === 'number'), `${entry.name} should add no numeric combat or reward modifier`);
}

const outsideIdentity = plain(runtime.api.districtMonsterIdentity(30, 'Ghoul', 'Maw'));
assert.deepEqual(outsideIdentity, { name: 'Ghoul Maw', family: 'Ghoul', type: 'Maw', lore: '' }, 'existing districts should keep the rolled monster identity');
const firstIdentity = plain(runtime.api.districtMonsterIdentity(31, 'Ghoul', 'Maw'));
const secondIdentity = plain(runtime.api.districtMonsterIdentity(31, 'Ghoul', 'Stalker'));
assert.ok(RELIQUARY_NAMES.includes(firstIdentity.name), 'the first mapping should use the Reliquary roster');
assert.ok(RELIQUARY_NAMES.includes(secondIdentity.name), 'the second mapping should use the Reliquary roster');
assert.notEqual(firstIdentity.name, secondIdentity.name, 'the two deterministic mappings should expose both encounter identities');

runtime.setRandom(() => 0.99);
const preReliquaryMonster = plain(runtime.api.generateMonster(29, null));
const preReliquaryCalls = runtime.randomCallCount();
runtime.setRandom(() => 0.99);
const reliquaryMonster = plain(runtime.api.generateMonster(31, null));
const reliquaryCalls = runtime.randomCallCount();
assert.equal(preReliquaryMonster.tier, 'Common', 'the comparison fixture should be a common monster');
assert.equal(reliquaryMonster.tier, 'Common', 'the Reliquary fixture should remain a common monster');
assert.equal(reliquaryCalls, preReliquaryCalls, 'district identity mapping should consume no extra RNG calls');
assert.ok(RELIQUARY_NAMES.includes(reliquaryMonster.name), 'generated D31 monsters should use the vertical-slice identities');
assert.ok(reliquaryMonster.power > 0 && reliquaryMonster.maxHp > 0 && reliquaryMonster.rewardGold > 0, 'the existing stat/reward pipeline should still produce the encounter');

runtime.setRandom(sequenceRandom([0, 0.10], 0.99));
const alternateMonster = plain(runtime.api.generateMonster(31, null));
assert.ok(RELIQUARY_NAMES.includes(alternateMonster.name), 'alternate rolled identity should remain inside the Reliquary roster');
assert.notEqual(alternateMonster.name, reliquaryMonster.name, 'seeded generation should reach both vertical-slice encounters');

const state = plain(runtime.api.createBaseState());
state.run.active = true;
state.run.floor = 31;
state.run.zone = 'The Drowned Reliquary';
const stateBefore = JSON.stringify(state);
runtime.api.districtByDepth(31);
runtime.api.dungeonDistrictIdentityForDepth(31);
runtime.api.districtMonsterIdentity(31, 'Ghoul', 'Maw');
assert.equal(JSON.stringify(state), stateBefore, 'district and encounter identity helpers should not mutate save/run state');

const backdropDistrict = { id: 'drowned-reliquary', name: 'The Drowned Reliquary', tone: 'drowned-reliquary' };
assert.equal(runtime.api.combatBackdropKind(state, backdropDistrict, 31, reliquaryMonster), 'drowned-reliquary', 'combat backdrop routing should use the Reliquary visual theme');
assert.match(runtime.api.combatBackdropClasses(state, backdropDistrict, 31, reliquaryMonster), /district-drowned-reliquary/, 'combat stage should receive the Reliquary district class');
const backdrop = plain(runtime.backdropApi.generateMonsterBackdrop(reliquaryMonster, state, { depth: 31, district: backdropDistrict }));
assert.equal(backdrop.kind, 'drowned-reliquary', 'canvas backdrop should expose the Reliquary theme');
assert.equal(backdrop.themeLabel, 'Drowned Reliquary', 'canvas backdrop should expose a readable theme label');
assert.equal(backdrop.visualOnly, true, 'the Reliquary canvas treatment should remain visual-only');
assert.equal(backdrop.gameplayAffecting, false, 'the Reliquary canvas treatment should not affect gameplay');

const [runUiSource, backdropSource, stylesSource] = await Promise.all([
  readFile(path.join(ROOT, 'js/systems/11_ui_run_gear_dex_archive.js'), 'utf8'),
  readFile(path.join(ROOT, 'js/systems/29_monster_backdrops_canvas.js'), 'utf8'),
  readFile(path.join(ROOT, 'styles.css'), 'utf8')
]);
assert.match(runUiSource, /const runDistrict = currentStagingDistrict\(S\);/, 'combat rendering should use the active raw-depth district');
assert.match(backdropSource, /drowned-reliquary/, 'canvas routing should register the Reliquary theme');
assert.match(stylesSource, /\.district-tone-drowned-reliquary/, 'Town/combat district tokens should include the Reliquary tone');
assert.match(stylesSource, /\.combat-monster-stage\.combat-backdrop--drowned-reliquary/, 'the combat stage should include a Reliquary backdrop treatment');

console.log('PASS Drowned Reliquary vertical slice v1.28.1: contiguous D31-D40 district, two identity-only encounters, dedicated visual routing, unchanged boss cadence, no extra RNG use, and no state mutation.');
