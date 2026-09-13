import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(ROOT, 'js/systems/50_guildbound_qol.js'), 'utf8');
const storage = new Map();
const document = { documentElement:{ classList:{ values:new Set(), toggle(name, value){ value ? this.values.add(name) : this.values.delete(name); } } }, querySelector(){ return null; }, querySelectorAll(){ return []; }, getElementById(){ return null; } };
const windowRef = { document, localStorage:{ getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,String(value)) } };
vm.runInContext(source, vm.createContext({ window:windowRef, globalThis:windowRef, gearUpgradeDelta:(item)=>item.upgradeReady ? 1 : 0, itemMarkedJunk:item=>item.junk === true, itemInNamedLoadout:(state,item)=>state.loadoutIds?.includes(item.id), canSellAllGearItem:(state,item)=>item.sellable === true }), { filename:'50_guildbound_qol.js' });
const api = windowRef.DungeonDexGuildboundQol;
const state = { filters:{ status:'all', search:'' }, loadoutIds:['saved'] };
const item = { id:'saved', upgradeReady:true, locked:true, junk:true, sellable:false };
for (const [status, expected] of [['all',true],['upgrades',true],['locked',true],['junk',true],['loadout',true],['sellable',false]]) {
  assert.equal(api.matchesStatusFilter({...state, filters:{status}}, item), expected, `${status} status filter remains explicit.`);
}
assert.match(api.statusFilterMarkup(state), /gearStatusFilter/);
assert.match(api.sectionToolsMarkup('town'), /Expand all/);
assert.equal(api.sectionToolsMarkup('bad'), '');
assert.equal(api.normalizePreferences({ comfortable:true, largeText:'yes', sections:{'town:market':false, bad:true} }).largeText, false);
api.applyPreferences(document);
assert.equal(document.documentElement.classList.values.has('guildbound-comfortable'), false);
api.readPreferences().comfortable = true;
api.applyPreferences(document);
assert.equal(document.documentElement.classList.values.has('guildbound-comfortable'), true);
assert.match(api.preferencesMarkup(), /Comfortable spacing/);
console.log('PASS Guildbound QoL v1.33: explicit gear status filters, section controls, device-only display preferences, safe normalization, and accessible markup contracts.');
