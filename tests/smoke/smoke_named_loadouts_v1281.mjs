#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = await readFile(path.join(ROOT, 'js/systems/46_named_loadouts.js'), 'utf8');
const context = {
  window: {},
  console,
  Date,
  Math,
  Set,
  Map,
  String,
  Object,
  Array
};
vm.createContext(context);
vm.runInContext(source, context, { filename:'46_named_loadouts.js' });

const loadouts = context.window.DungeonDexNamedLoadouts;
assert.ok(loadouts, 'named loadout API should register');

function item(id, slot, name = id){
  return { id, slot, name };
}

function state(){
  return {
    player: {
      equipment: {
        weapon:item('ember-blade', 'weapon', 'Ember Blade'),
        armor:item('ash-mail', 'armor', 'Ash Mail')
      },
      inventory: [item('ward-lantern', 'offhand', 'Ward Lantern'), item('deep-helm', 'helm', 'Deep Helm')]
    }
  };
}

const saved = state();
const created = loadouts.create(saved, 'Deep Delver');
assert.equal(created.ok, true, 'create should snapshot equipped gear');
assert.equal(created.loadout.items.length, 2, 'snapshot should include each equipped item');
assert.equal(loadouts.create(saved, 'deep delver').reason, 'duplicate-name', 'names should be unique case-insensitively');
assert.equal(loadouts.create(saved, 'Same Gear').reason, 'duplicate-gear', 'identical snapshots should not be duplicated');

const renamed = loadouts.rename(saved, created.loadout.id, 'Warden Set');
assert.equal(renamed.ok, true, 'rename should succeed');
assert.equal(saved.player.namedLoadouts[0].name, 'Warden Set', 'rename should persist in state');

const persisted = JSON.parse(JSON.stringify(saved));
loadouts.normalizeState(persisted);
assert.equal(persisted.player.namedLoadouts.length, 1, 'loadout should survive JSON persistence');
assert.equal(persisted.player.namedLoadouts[0].items[0].itemId, 'ember-blade', 'snapshot must retain stable item IDs');

const lookup = loadouts.inspect(persisted, created.loadout.id);
assert.equal(lookup.counts.equipped, 2, 'equipment lookup should recognize matching equipped gear');

persisted.player.equipment = { weapon:item('old-blade', 'weapon', 'Old Blade') };
persisted.player.inventory = [item('ember-blade', 'weapon', 'Ember Blade'), item('ash-mail', 'armor', 'Ash Mail')];
const unavailable = loadouts.inspect(persisted, created.loadout.id);
assert.equal(unavailable.counts.occupied, 1, 'occupied slots must be reported instead of replaced');
assert.equal(unavailable.counts.ready, 1, 'matching inventory gear for an empty slot should be safely applicable');
const applied = loadouts.apply(persisted, created.loadout.id);
assert.equal(applied.applied.length, 1, 'safe apply should equip only available empty-slot gear');
assert.equal(persisted.player.equipment.weapon.id, 'old-blade', 'safe apply must never replace equipped gear');
assert.equal(persisted.player.equipment.armor.id, 'ash-mail', 'safe apply should move a matching inventory item into an empty slot');

persisted.player.inventory = [];
persisted.player.equipment.weapon = item('ember-blade', 'weapon', 'Ember Blade');
delete persisted.player.equipment.armor;
const missing = loadouts.inspect(persisted, created.loadout.id);
assert.equal(missing.counts.missing, 1, 'missing equipment should be reported without creating replacement items');

persisted.player.inventory = [item('ash-mail', 'weapon', 'Ash Mail')];
const wrongSlot = loadouts.inspect(persisted, created.loadout.id);
assert.equal(wrongSlot.counts.missing, 1, 'an ID collision in the wrong item slot must remain unavailable');

const malformed = {
  player: {
    namedLoadouts: [
      null,
      { id:'same', name:'Alpha', items:[{ slot:'weapon', itemId:'one', name:'One' }, { slot:'weapon', itemId:'two', name:'Two' }] },
      { id:'same', name:'alpha', items:[{ slot:'weapon', itemId:'one', name:'One' }] },
      { id:'bad', name:'Broken', items:[{ slot:'unknown', itemId:'three' }] }
    ]
  }
};
loadouts.normalizeState(malformed);
assert.equal(malformed.player.namedLoadouts.length, 1, 'malformed and duplicate saved loadouts should collapse safely');
assert.equal(malformed.player.namedLoadouts[0].items.length, 1, 'duplicate slots should be removed from saved loadouts');

assert.equal(loadouts.remove(saved, created.loadout.id).ok, true, 'delete should succeed');
assert.equal(saved.player.namedLoadouts.length, 0, 'delete should remove the loadout from state');

console.log('PASS Named Loadouts v1.28.1: create, rename, persistence, delete, equipment lookup, safe apply, missing gear, and malformed-save repair.');
