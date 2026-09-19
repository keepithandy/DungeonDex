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
  'js/systems/08_normalization_save.js'
];

const storage = new Map();
const math = Object.create(Math);
math.random = () => 0.01;
const context = {
  console,
  Date,
  Math: math,
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
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  navigator: {},
  location: { protocol: 'file:', hostname: '' },
  crypto: { randomUUID() { return 'reliquary-event-smoke'; } },
  escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[character])); },
  showExtractionPopup() {},
  showDefeatPopup() {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of RUNTIME_FILES) {
  vm.runInContext(await readFile(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const api = vm.runInContext(`({
  STORAGE_KEY,
  DISTRICT_RUN_EVENT_REGISTRY,
  createBaseState,
  createRunEvent,
  maybeTriggerDistrictRunEvent,
  maybeTriggerReliquaryFinaleEvent,
  resolveRunEvent,
  winEncounter,
  generateMonster,
  save,
  load
})`, context);

function activeState(floor) {
  const state = api.createBaseState();
  state.run.active = true;
  state.run.floor = floor;
  state.run.zone = floor >= 31 && floor <= 40 ? 'The Drowned Reliquary' : 'Ember Debtworks';
  state.player.hp = state.player.maxHp;
  state.player.ember = 5;
  state.run.monster = api.generateMonster(floor, state);
  state.run.choices = ['attack', 'guard', 'skill', 'extract'];
  return state;
}

const registry = api.DISTRICT_RUN_EVENT_REGISTRY['drowned-reliquary'];
assert.equal(registry.random.length, 3, 'the Reliquary should have three authored repeatable incidents');
assert.equal(registry.finale.id, 'reliquary_seventh_toll', 'D40 should have its own authored finale event');
for (const event of [...registry.random, registry.finale]) {
  assert.equal(event.kicker.startsWith('Reliquary'), true, `${event.id} should identify the chapter`);
  assert.equal(event.options.length, 3, `${event.id} should use the established three-choice event card`);
  assert.ok(event.options.every(option => option.effect && option.id && option.label && option.detail), `${event.id} should keep choice behavior in data`);
}

const cinderboneRegistry = api.DISTRICT_RUN_EVENT_REGISTRY.cinderbone;
assert.equal(cinderboneRegistry.random.length, 3, 'Cinderbone should have exactly three authored incidents');
assert.equal(cinderboneRegistry.finale, null, 'Cinderbone incidents should not create a second boss/finale slot');
for (const event of cinderboneRegistry.random) {
  assert.equal(event.kicker, 'Cinderbone Incident', `${event.id} should identify the Cinderbone chapter`);
  assert.equal(event.options.length, 3, `${event.id} should use the established three-choice event card`);
  assert.ok(event.options.every(option => option.effect && option.id && option.label && option.detail), `${event.id} should keep choice behavior in data`);
}

math.random = () => 0.01;
const cinderboneEntry = activeState(40);
api.winEncounter(cinderboneEntry);
assert.equal(cinderboneEntry.run.floor, 41, 'D40 should advance into Cinderbone through the existing progression path');
assert.equal(cinderboneEntry.run.event?.chapter, 'cinderbone', 'D41 should use the Cinderbone event registry');
assert.ok(cinderboneRegistry.random.some(event => event.id === cinderboneEntry.run.event.id), 'D41 should select only a Cinderbone incident');

for (let index = 0; index < cinderboneRegistry.random.length; index += 1) {
  math.random = () => (index + 0.1) / cinderboneRegistry.random.length;
  for (const option of cinderboneRegistry.random[index].options) {
    const state = activeState(41);
    const event = api.createRunEvent(state);
    assert.equal(event.chapter, 'cinderbone', 'Cinderbone event should carry its chapter identity');
    state.run.event = { ...event, id:cinderboneRegistry.random[index].id, options:event.options };
    const before = JSON.stringify(state.run.pendingRewards);
    const result = api.resolveRunEvent(state, option.id, event.token);
    assert.equal(result.saveNow, true, `${event.id}/${option.id} should use the established save path`);
    assert.equal(state.run.event, null, `${event.id}/${option.id} should clear the pending event`);
    assert.equal(state.run.active, true, `${event.id}/${option.id} should preserve the active run`);
    assert.ok(state.run.monster, `${event.id}/${option.id} should return to normal encounter generation`);
    if (option.effect.kind !== 'leave') assert.notEqual(JSON.stringify(state.run.pendingRewards), before, `${event.id}/${option.id} should resolve through the unsecured haul`);
  }
}

const staleState = activeState(41);
const staleEvent = api.createRunEvent(staleState);
staleState.run.event = staleEvent;
const staleBefore = JSON.stringify(staleState.run.pendingRewards);
const staleResult = api.resolveRunEvent(staleState, staleEvent.options[0].id, 'stale-event-token');
assert.equal(staleResult.stale, true, 'a stale event token should be rejected');
assert.equal(staleState.run.event.id, staleEvent.id, 'stale event controls should not clear the current event');
assert.equal(JSON.stringify(staleState.run.pendingRewards), staleBefore, 'stale event controls should not mutate the pending haul');
const validResult = api.resolveRunEvent(staleState, staleEvent.options[0].id, staleEvent.token);
assert.equal(validResult.saveNow, true, 'the current event token should resolve normally');
const duplicateResult = api.resolveRunEvent(staleState, staleEvent.options[0].id, staleEvent.token);
assert.equal(duplicateResult.saveNow, false, 'a duplicate event resolution should be a safe no-op');

const persistedCinderbone = activeState(41);
persistedCinderbone.run.event = api.createRunEvent(persistedCinderbone);
assert.equal(api.save(persistedCinderbone), true, 'a pending Cinderbone incident should serialize through the existing save path');
const reloadedCinderbone = api.load();
assert.equal(reloadedCinderbone.run.event?.chapter, 'cinderbone', 'a pending Cinderbone incident should survive save/reload');
assert.equal(reloadedCinderbone.run.event?.token, persistedCinderbone.run.event.token, 'save/reload should preserve the deterministic event token');
assert.equal(reloadedCinderbone.run.choices[0], 'event', 'a reloaded pending incident should remain the active choice state');

const malformed = activeState(41);
malformed.run.event = { id:'cinderbone_broken', title:42, options:[{ id:'__proto__', effect:{ kind:'currency', gold:999999999 } }, null] };
storage.set(api.STORAGE_KEY, JSON.stringify(malformed));
const repaired = api.load();
assert.equal(repaired.run.event, null, 'malformed incident choices should be repaired to no pending event');
assert.equal(repaired.run.active, true, 'malformed incident data should not end the active run');
const oldCinderbone = activeState(41);
delete oldCinderbone.run.event;
storage.set(api.STORAGE_KEY, JSON.stringify(oldCinderbone));
const oldLoaded = api.load();
assert.equal(oldLoaded.run.active, true, 'old active saves without an event should remain loadable');
assert.equal(oldLoaded.run.floor, 41, 'old active Cinderbone saves should preserve depth');

const chapterExit = activeState(50);
chapterExit.run.pendingRewards.gold = 17;
math.random = () => 0.99;
api.winEncounter(chapterExit);
assert.equal(chapterExit.run.floor, 51, 'Cinderbone should exit through the existing D51 boundary');
assert.equal(!!chapterExit.run.event, false, 'chapter exit should not leave a Cinderbone event pending');
assert.ok(chapterExit.run.pendingRewards.gold >= 17, 'chapter exit should preserve the unsecured haul');

math.random = () => 0.01;
const entryState = activeState(30);
api.winEncounter(entryState);
assert.equal(entryState.run.floor, 31, 'a normal D30 clear should advance through the existing progression path');
assert.equal(entryState.run.event?.chapter, 'drowned-reliquary', 'the existing between-fight event pipeline should enter the Reliquary at D31');
assert.ok(registry.random.some(event => event.id === entryState.run.event.id), 'D31 should select only a Reliquary incident');
assert.equal(entryState.run.pendingRewards.loot.every(item => item && typeof item === 'object'), true, 'existing combat rewards should remain pending during an incident');

for (let index = 0; index < registry.random.length; index += 1) {
  math.random = () => (index + 0.1) / registry.random.length;
  const state = activeState(31);
  const event = api.createRunEvent(state);
  assert.equal(event.id, registry.random[index].id, 'event selection should come from the district registry only');
  assert.equal(event.chapter, 'drowned-reliquary');
  state.run.event = event;
  const before = JSON.stringify(state.run.pendingRewards);
  const result = api.resolveRunEvent(state, event.options[0].id);
  assert.equal(result.saveNow, true, 'event choices should use the established save path');
  assert.equal(state.run.event, null, 'event resolution should return to the normal encounter pipeline');
  assert.equal(state.run.active, true, 'an event must not replace the active run');
  assert.ok(state.run.monster, 'an event should hand back to the normal encounter generator');
  assert.notEqual(JSON.stringify(state.run.pendingRewards), before, 'rewarding Reliquary choices should use the existing pending haul');
  if (event.id === 'reliquary_bell_rope_vault') {
    const loot = state.run.pendingRewards.loot.at(-1);
    assert.equal(loot.maker, 'Drowned Reliquary', 'Reliquary event gear should use the existing chapter gear identity');
    assert.ok(loot.tags.includes('drowned-reliquary'), 'Reliquary event gear should remain searchable by its existing tag');
  }
}

math.random = () => 0.01;
const finaleState = activeState(40);
assert.equal(api.maybeTriggerReliquaryFinaleEvent(finaleState), true, 'D40 should enter the authored Seventh Toll finale before its normal encounter');
assert.equal(finaleState.run.event.id, 'reliquary_seventh_toll');
assert.equal(finaleState.run.event.finale, true);
assert.equal(api.maybeTriggerReliquaryFinaleEvent(finaleState), false, 'the active finale event must not duplicate');
const finaleBefore = JSON.stringify(finaleState.run.pendingRewards);
api.resolveRunEvent(finaleState, 'answer');
assert.notEqual(JSON.stringify(finaleState.run.pendingRewards), finaleBefore, 'the finale cache should enter the unsecured haul');
const finaleLoot = finaleState.run.pendingRewards.loot.at(-1);
assert.equal(finaleLoot.maker, 'Drowned Reliquary');
assert.ok(finaleLoot.tags.includes('seventh-toll'));
assert.equal(finaleState.run.floor, 40, 'the finale should not skip or move the existing final room');

const legacy = activeState(31);
delete legacy.run.event;
delete legacy.run.chapter;
storage.set(api.STORAGE_KEY, JSON.stringify(legacy));
const legacyLoaded = api.load();
assert.equal(legacyLoaded.run.active, true, 'old active saves should still load');
assert.equal(legacyLoaded.run.floor, 31, 'old active saves should keep their Reliquary floor');
assert.equal(legacyLoaded.player.ember, legacy.player.ember, 'old player currency should remain untouched');

const persistedFinale = activeState(40);
api.maybeTriggerReliquaryFinaleEvent(persistedFinale);
assert.equal(api.save(persistedFinale), true, 'a pending finale should serialize through the existing save path');
const reloadedFinale = api.load();
assert.equal(reloadedFinale.run.event?.id, 'reliquary_seventh_toll', 'a pending finale should survive save/reload without a migration');
assert.equal(reloadedFinale.run.event?.options?.[0]?.effect?.kind, 'gear', 'saved chapter event choices should retain their data-defined resolution');

console.log('PASS Drowned Reliquary events: D31 entry, three authored incidents, D40 finale, pending-haul rewards, existing encounter return, themed event gear, and old-save/new-event reload safety.');
