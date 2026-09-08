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
  'js/systems/10_ui_town_shop.js',
  'js/systems/38_journal_v1.js'
];

const context = {
  console,
  Date,
  Math,
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
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: {},
  location: { protocol: 'file:', hostname: '' },
  crypto: { randomUUID() { return 'reliquary-content-slice'; } },
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
  createBaseState,
  districtMonsterIdentity,
  generateMonster,
  generateGear,
  normalizeMonster,
  reliquaryJournalModel,
  renderReliquaryTownAcknowledgement,
  townReturnReceiptMarkup,
  roster: DISTRICT_ENCOUNTER_IDENTITIES['drowned-reliquary']
})`, context);

const featured = api.roster.find(entry => entry.name === 'Seventh-Toll Bell-Keeper');
assert.ok(featured, 'the focused Reliquary encounter should be data-registered');
assert.deepEqual(Object.keys(featured).sort(), ['family', 'lore', 'name', 'type'], 'the content slice remains identity-only data');
assert.equal(api.districtMonsterIdentity(31, 'Ghoul', 'Warden').name, featured.name, 'the new identity should be reachable through existing rolls');

const monster = api.generateMonster(31, null);
assert.ok(monster.power > 0 && monster.maxHp > 0 && monster.rewardGold > 0, 'the existing combat/reward pipeline should create the encounter');
assert.ok(['Common', 'Elite'].includes(monster.tier), 'the focused fixture should remain a non-boss encounter');
const reloaded = api.normalizeMonster({ ...monster, name: featured.name, family: featured.family, type: featured.type }, 31);
assert.equal(reloaded.name, featured.name, 'the new encounter identity should survive save normalization');

const state = api.createBaseState();
const playerKeysBefore = Object.keys(state.player).sort();
const gear = api.generateGear('charm', 11, { source: 'normal', depthRaw: 31 });
state.player.discoveredMonsters.push(featured.name);
state.player.inventory.push(gear);
state.player.runHistory = [{ floor: 31, zone: 'The Drowned Reliquary', reason: 'extract', lootPreview: [gear.name], lootCount: 1, kills: 1, xp: 1 }];
const beforeProjection = JSON.stringify(state);
const model = api.reliquaryJournalModel(state);
const encounterRow = model.rows.find(row => row.key === 'reliquary-encounter');
assert.equal(encounterRow.badge, 'Discovered', 'the Journal should derive the encounter record from existing discovery state');
assert.match(encounterRow.primary, /Seventh-Toll Bell-Keeper/);
assert.equal(model.rows.find(row => row.key === 'reliquary-gear').badge, 'Recorded — in your gear', 'existing Reliquary loot identity should remain visible to the Journal');
assert.match(api.renderReliquaryTownAcknowledgement(state), /Drowned Reliquary · Completed — safe return/);
assert.match(api.townReturnReceiptMarkup(state), /Drowned Reliquary/);
assert.equal(JSON.stringify(state), beforeProjection, 'Town and Journal projections must not mutate the save');
assert.deepEqual(Object.keys(state.player).sort(), playerKeysBefore, 'the content slice must not add a player save field');

console.log('PASS Drowned Reliquary content slice: identity-only encounter, existing combat/loot pipeline, Town acknowledgement, Journal projection, normalization and no new save fields.');
