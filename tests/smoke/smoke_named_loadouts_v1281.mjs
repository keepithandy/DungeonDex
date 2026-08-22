#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [source, visualCss] = await Promise.all([
  readFile(path.join(ROOT, 'js/systems/46_named_loadouts.js'), 'utf8'),
  readFile(path.join(ROOT, 'styles_visual_weight.css'), 'utf8')
]);
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

const duplicated = loadouts.duplicate(saved, created.loadout.id);
assert.equal(duplicated.ok, true, 'duplicate should copy an existing loadout');
assert.equal(duplicated.loadout.name, 'Warden Set Copy', 'duplicate should receive a readable unique name');
assert.notEqual(duplicated.loadout.id, created.loadout.id, 'duplicate should receive a unique stable ID');
assert.notEqual(duplicated.loadout.items, created.loadout.items, 'duplicate should not share its item array');
assert.deepEqual(
  JSON.parse(JSON.stringify(duplicated.loadout.items)),
  JSON.parse(JSON.stringify(created.loadout.items)),
  'duplicate should retain the same ID-based equipment snapshot'
);

assert.equal(loadouts.move(saved, duplicated.loadout.id, 'up').ok, true, 'a loadout should move up');
assert.equal(saved.player.namedLoadouts[0].id, duplicated.loadout.id, 'move up should persist list order');
assert.equal(loadouts.move(saved, duplicated.loadout.id, 'up').reason, 'at-start', 'first loadout should not move beyond the list');
assert.equal(loadouts.move(saved, duplicated.loadout.id, 'down').ok, true, 'a loadout should move down');
assert.equal(saved.player.namedLoadouts[1].id, duplicated.loadout.id, 'move down should persist list order');
assert.equal(loadouts.move(saved, duplicated.loadout.id, 'down').reason, 'at-end', 'last loadout should not move beyond the list');

const persisted = JSON.parse(JSON.stringify(saved));
loadouts.normalizeState(persisted);
assert.equal(persisted.player.namedLoadouts.length, 2, 'original and duplicated loadouts should survive JSON persistence');
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
assert.match(loadouts.applicationSummary(applied), /1 equipped; 1 occupied/, 'apply should report a concise outcome summary');
assert.match(loadouts.applicationSummary(applied), /Existing gear was left untouched/, 'apply summary should reinforce the safety contract');

persisted.player.inventory = [];
persisted.player.equipment.weapon = item('ember-blade', 'weapon', 'Ember Blade');
delete persisted.player.equipment.armor;
const missing = loadouts.inspect(persisted, created.loadout.id);
assert.equal(missing.counts.missing, 1, 'missing equipment should be reported without creating replacement items');

persisted.player.inventory = [item('ash-mail', 'weapon', 'Ash Mail')];
const wrongSlot = loadouts.inspect(persisted, created.loadout.id);
assert.equal(wrongSlot.counts.wrongSlot, 1, 'an ID collision in the wrong item slot must be identified explicitly');
assert.equal(wrongSlot.items.find(entry => entry.itemId === 'ash-mail').status, 'wrongSlot', 'slot preview should expose wrong-slot status per item');

persisted.player.inventory = [];
persisted.player.equipment.offhand = item('ash-mail', 'offhand', 'Ash Mail');
const inUse = loadouts.inspect(persisted, created.loadout.id);
assert.equal(inUse.counts.elsewhere, 1, 'saved gear equipped in another slot should be reported as in use');
assert.equal(inUse.items.find(entry => entry.itemId === 'ash-mail').status, 'elsewhere', 'equipped-away preview should remain distinct from wrong inventory metadata');

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
assert.equal(malformed.player.namedLoadouts.length, 2, 'valid duplicate configurations should survive while malformed entries are removed');
assert.equal(malformed.player.namedLoadouts[0].items.length, 1, 'duplicate slots should be removed from saved loadouts');
assert.notEqual(malformed.player.namedLoadouts[0].id, malformed.player.namedLoadouts[1].id, 'duplicate saved IDs should repair uniquely');
assert.notEqual(malformed.player.namedLoadouts[0].name, malformed.player.namedLoadouts[1].name, 'duplicate saved names should repair uniquely');

const panel = { innerHTML:'' };
context.window.renderNamedLoadoutPanel(panel, saved);
assert.match(panel.innerHTML, /role="list" aria-label="Saved named loadouts"/, 'saved cards should expose list semantics');
assert.match(panel.innerHTML, /aria-label="Slot-by-slot availability"/, 'slot preview should have an accessible label');
assert.match(panel.innerHTML, /aria-label="Move Warden Set Copy up; currently 2 of 2"/, 'reorder buttons should include position and loadout name');
assert.match(panel.innerHTML, /data-named-loadout-action="duplicate"/, 'duplicate should be exposed as a native button action');
assert.match(panel.innerHTML, /Already equipped/, 'preview should use the explicit already-equipped label');
assert.match(source, /global\.confirm\(`Delete loadout/, 'delete should require explicit confirmation');
assert.match(source, /event\.key !== 'Enter'.*namedLoadoutName/, 'Enter in the name field should activate save for keyboard users');
assert.match(source, /restoreFocus\(focus\)/, 'rerendered loadout actions should restore keyboard focus');
assert.match(source, /preferred \|\| reorderFallback \|\| applyFallback/, 'focus recovery should fall back when a reorder control becomes disabled');
assert.match(visualCss, /\.named-loadout-order button \{ min-height: 44px; \}/, 'reorder controls should remain touch safe');

let clickHandler;
let focusedControl = '';
const focusButtons = [
  { disabled:true, dataset:{ namedLoadoutAction:'move', namedLoadoutDirection:'up' }, focus(){ focusedControl = 'up'; } },
  { disabled:false, dataset:{ namedLoadoutAction:'move', namedLoadoutDirection:'down' }, focus(){ focusedControl = 'down'; } },
  { disabled:false, dataset:{ namedLoadoutAction:'apply' }, focus(){ focusedControl = 'apply'; } }
];
const focusDocument = {
  __ddNamedLoadoutActionsBound:false,
  addEventListener(type, handler){ if (type === 'click') clickHandler = handler; },
  getElementById(id){
    if (id === `namedLoadoutCard-${duplicated.loadout.id}`) return { querySelectorAll:() => focusButtons };
    return null;
  }
};
const focusState = state();
focusState.player.namedLoadouts = JSON.parse(JSON.stringify(saved.player.namedLoadouts));
const focusContext = {
  window:{}, document:focusDocument, console, Date, Math, Set, Map, String, Object, Array,
  S:focusState, render(){}
};
vm.createContext(focusContext);
vm.runInContext(source, focusContext, { filename:'46_named_loadouts-focus.js' });
assert.equal(typeof clickHandler, 'function', 'loadout click actions should bind in a document context');
clickHandler({
  preventDefault(){},
  target:{ closest:() => ({ dataset:{ namedLoadoutAction:'move', namedLoadoutId:duplicated.loadout.id, namedLoadoutDirection:'up' } }) }
});
assert.equal(focusedControl, 'down', 'reaching the first position should focus the remaining enabled reorder control');

const emptyPanel = { innerHTML:'' };
context.window.renderNamedLoadoutPanel(emptyPanel, { player:{ equipment:{}, inventory:[] } });
assert.match(emptyPanel.innerHTML, /No saved loadouts yet/, 'empty state should explain how to create the first loadout');

const capped = state();
const cappedFirst = loadouts.create(capped, 'Cap Seed').loadout;
while (capped.player.namedLoadouts.length < loadouts.MAX_LOADOUTS) {
  assert.equal(loadouts.duplicate(capped, cappedFirst.id).ok, true, 'duplicate should work until the cap');
}
assert.equal(loadouts.duplicate(capped, cappedFirst.id).reason, 'limit', 'duplicate should stop at the loadout cap');
const cappedPanel = { innerHTML:'' };
context.window.renderNamedLoadoutPanel(cappedPanel, capped);
assert.match(cappedPanel.innerHTML, /Loadout limit reached \(12 of 12\)/, 'cap state should explain how to make room');
assert.match(cappedPanel.innerHTML, /id="namedLoadoutName"[^>]* disabled/, 'cap state should disable new-loadout input');

assert.equal(loadouts.remove(saved, created.loadout.id).ok, true, 'delete should succeed');
assert.equal(saved.player.namedLoadouts.length, 1, 'delete should remove only the selected loadout');
assert.equal(saved.player.namedLoadouts[0].id, duplicated.loadout.id, 'delete should preserve other loadouts');

console.log('PASS Named Loadouts v1.28.2: duplicate, reorder, slot preview, apply summary, confirmation, capacity, keyboard semantics, and save compatibility.');
