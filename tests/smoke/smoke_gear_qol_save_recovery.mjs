import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storage = new Map();
let failWrite = '';
const context = {
  console: { ...console, warn() {} }, Date, Math, JSON, Object, Map, Set, Uint32Array,
  setTimeout, clearTimeout, requestAnimationFrame() {}, addEventListener() {},
  document: {
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, createElement() { return { style:{} }; }, head: { appendChild() {} }
  },
  navigator: {}, location: { protocol:'file:', hostname:'' },
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { if (key.endsWith(failWrite) && failWrite) throw new Error('storage full'); storage.set(key, String(value)); }
  }
};
context.window = context;
vm.createContext(context);
const files = fs.readdirSync(path.join(root, 'js/systems')).filter(name => /^0[0-8]_/.test(name)).sort();
files.push('46_named_loadouts.js', '09_ui_common_intro.js', '11_ui_run_gear_dex_archive.js', '16_relic_forge_crafting.js');
for (const name of files) vm.runInContext(fs.readFileSync(path.join(root, 'js/systems', name), 'utf8'), context, { filename:name });
const api = vm.runInContext('({createBaseState, generateGear, canSellAllGearItem, canQuickSellItem, canRetireInventoryItem, itemMarkedJunk, toggleInventoryFlag, bulkSalePreview, sellItem, sellAllGear, sellAllQuickSafeGear, save, load, decodeSave, prepareSaveImport, replaceSavedState, saveRecovery, STORAGE_KEY, calcDerived})', context);
const forge = context.DungeonDexRelicForge;
const loadouts = context.DungeonDexNamedLoadouts;
const gear = (id, overrides = {}) => ({ ...api.generateGear('weapon', 2), id, name:id, rarity:'common', tags:[], ...overrides });
const fresh = () => api.createBaseState();

for (const protection of [{locked:true}, {favorite:true}, {protected:true}, {tags:['protected']}, {tags:['SPECIAL']}, {kind:'special'}]) {
  const state = fresh();
  const item = gear('protected', protection);
  state.player.inventory = [item];
  const gold = state.player.gold;
  assert.equal(api.canSellAllGearItem(state, item), false);
  assert.equal(api.canRetireInventoryItem(state, item), false);
  assert.equal(api.sellItem(state, item.id), 0);
  assert.equal(api.sellAllGear(state).count, 0);
  assert.equal(!!forge.canSalvage(state, item), false);
  forge.salvage(state);
  assert.equal(state.player.inventory.length, 1);
  assert.equal(state.player.gold, gold);
}

const flags = fresh();
flags.player.inventory = [gear('flags', {tags:['JUNK'], isJunk:true})];
api.toggleInventoryFlag(flags, 'flags', 'junk');
assert.equal(api.itemMarkedJunk(flags.player.inventory[0]), false);
api.toggleInventoryFlag(flags, 'flags', 'junk');
api.toggleInventoryFlag(flags, 'flags', 'locked');
assert.equal(api.canQuickSellItem(flags, flags.player.inventory[0]), false);
api.save(flags);
const flagReload = api.load().player.inventory[0];
assert.equal(flagReload.locked, true);
assert.equal(api.itemMarkedJunk(flagReload), true);

const protectedLoadout = fresh();
const savedItem = gear('loadout-piece');
protectedLoadout.player.equipment = {weapon:savedItem};
const savedId = loadouts.create(protectedLoadout, 'Keep').loadout.id;
protectedLoadout.player.equipment = {};
protectedLoadout.player.inventory = [savedItem];
assert.equal(api.canSellAllGearItem(protectedLoadout, savedItem), false);
assert.equal(!!forge.canSalvage(protectedLoadout, savedItem), false);
loadouts.remove(protectedLoadout, savedId);
assert.equal(api.canSellAllGearItem(protectedLoadout, savedItem), true);

for (const junkOnly of [false, true]) {
  const state = fresh();
  state.player.goldSink.junkSaleBonusCharges = 2;
  state.player.inventory = [gear('a', {junk:true, value:100}), gear('b', {value:230}), gear('c', {locked:true})];
  const before = JSON.stringify(state);
  const preview = api.bulkSalePreview(state, junkOnly);
  assert.equal(JSON.stringify(state), before, 'preview cannot mutate state');
  assert.equal(preview.protectedCount, 1);
  const result = junkOnly ? api.sellAllQuickSafeGear(state) : api.sellAllGear(state);
  assert.equal(result.count, preview.count);
  assert.equal(result.paid, preview.paid, 'preview must match Junker bonus pricing');
  assert.equal(state.player.goldSink.junkSaleBonusCharges, 1);
}

const switching = fresh();
const target = gear('new', {upgradeLevel:3, locked:true});
switching.player.equipment = {weapon:target};
const targetId = loadouts.create(switching, 'New build').loadout.id;
switching.player.equipment = {weapon:gear('old', {upgradeLevel:2}), charm:gear('stay', {slot:'charm'})};
switching.player.inventory = [target];
api.calcDerived(switching);
const beforePreview = JSON.stringify(switching.player.equipment);
const preview = loadouts.switchPreview(switching, targetId);
assert.equal(preview.changes[0].displaced[0].id, 'old');
assert.equal(JSON.stringify(switching.player.equipment), beforePreview);
assert.equal(loadouts.switchLoadout(switching, targetId).ok, true);
assert.equal(switching.player.equipment.weapon.id, 'new');
assert.equal(switching.player.equipment.weapon.upgradeLevel, 3);
assert.equal(switching.player.equipment.charm.id, 'stay');
assert.deepEqual(Array.from(switching.player.inventory, item => item.id), ['old']);
assert.equal(switching.player.inventory[0].upgradeLevel, 2);
api.save(switching);
assert.equal(api.load().player.equipment.weapon.id, 'new');
switching.player.equipment.weapon = gear('other');
switching.player.inventory = [];
const unavailableBefore = JSON.stringify(switching);
assert.equal(loadouts.switchLoadout(switching, targetId).ok, false);
assert.equal(JSON.stringify(switching), unavailableBefore, 'missing gear must not partly switch');
switching.run.active = true;
assert.equal(loadouts.switchPreview(switching, targetId).reason, 'active-run');

const key = api.STORAGE_KEY;
for (const raw of ['{broken', 'null', '{}', '[]', '']) {
  storage.set(key, raw);
  const recovery = api.load();
  assert.equal(api.saveRecovery.blocked, true);
  assert.equal(api.save(recovery), false);
  assert.equal(storage.get(key), raw, 'startup save must preserve unreadable bytes');
}
const valid = JSON.stringify(fresh());
const imported = api.prepareSaveImport(valid);
for (const raw of ['{}', 'null', '{bad', '{"player":[]']) assert.throws(() => api.prepareSaveImport(raw));
assert.doesNotThrow(() => api.prepareSaveImport('{"player":{"gold":12}}'), 'older saves should use normalizer defaults');
assert.throws(() => api.prepareSaveImport(' '.repeat(10 * 1024 * 1024 + 1)));
failWrite = '_recovery';
assert.equal(api.replaceSavedState(imported, fresh()).ok, false);
assert.equal(api.saveRecovery.blocked, true);
assert.equal(storage.get(key), '');
failWrite = '';
assert.equal(api.replaceSavedState(imported, fresh()).ok, true);
assert.equal(storage.get(key + '_recovery'), '');
assert.equal(api.saveRecovery.blocked, false);
const current = fresh();
current.player.gold = 1234;
failWrite = key;
const beforeFailedImport = storage.get(key);
assert.equal(api.replaceSavedState(imported, current).ok, false);
assert.equal(storage.get(key), beforeFailedImport);
failWrite = '';
assert.equal(api.replaceSavedState(imported, current).ok, true);
assert.equal(JSON.parse(storage.get(key + '_before_import')).player.gold, 1234);
assert.equal(api.load().player.level, imported.player.level);
console.log('PASS gear QoL and save recovery: protection, flags, previews, switching, persistence, malformed input, and storage failure.');
