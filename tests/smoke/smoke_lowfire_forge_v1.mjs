#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FORGE_SOURCES = [
  'js/systems/16_relic_forge_crafting.js',
  'js/systems/17_relic_forge_clarity.js'
];

function gear(id, slot, overrides = {}) {
  return {
    id,
    name: id,
    slot,
    rarity: 'common',
    level: 1,
    rating: 10,
    value: 100,
    stats: { power: 4, guard: 2, hp: 6 },
    tags: [],
    summary: 'Smoke gear.',
    ...overrides
  };
}

function state(overrides = {}) {
  const base = {
    player: {
      forgeSpark: 2,
      shards: 200,
      ember: 3,
      depth: 10,
      returnDepth: 10,
      inventory: [],
      discoveredGear: [],
      equipment: { weapon: gear('equipped_weapon', 'weapon') },
      log: []
    },
    town: { forgeTier: 1, relicFavor: 0 }
  };
  return {
    ...base,
    ...overrides,
    player: { ...base.player, ...(overrides.player || {}) },
    town: { ...base.town, ...(overrides.town || {}) }
  };
}

function createRuntime() {
  const forgePanel = { innerHTML: '' };
  let generated = 0;
  const context = {
    console,
    Math,
    Set,
    Array,
    String,
    Number,
    Object,
    SLOT_ORDER: ['weapon', 'armor'],
    S: state(),
    format(value) { return String(Math.floor(Number(value) || 0)); },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); },
    normalizeItemLevel(value) { return Math.max(1, Math.floor(Number(value) || 1)); },
    generateGear(slot) {
      generated += 1;
      return gear(`generated_${generated}`, slot, { name: `Generated ${slot}`, stats: { power: 5, guard: 3, hp: 7 } });
    },
    pushLog(current, line) { current.player.log.push(String(line)); },
    render() {},
    renderTown() {},
    bindDynamic() {},
    runGuardedAction(action) { return action(); },
    el(id) { return id === 'forgePanel' ? forgePanel : null; },
    $$() { return []; },
    document: {
      head: { appendChild() {} },
      createElement() { return { id: '', textContent: '' }; },
      getElementById(id) { return id === 'forgePanel' ? forgePanel : null; },
      querySelectorAll() { return []; }
    },
    confirm() { return true; }
  };
  context.window = context;
  context.globalThis = context;
  const runtime = vm.createContext(context);
  FORGE_SOURCES.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), runtime, { filename: file }));
  return { runtime, forgePanel };
}

const { runtime, forgePanel } = createRuntime();
const forge = runtime.DungeonDexRelicForge;

assert.equal(typeof forge?.craft, 'function');
assert.equal(typeof forge?.salvage, 'function');
assert.equal(typeof forge?.temper, 'function');
assert.equal(typeof forge?.ensure, 'function');

const malformed = { player: { forgeSpark: -4, shards: '9.8', ember: null, inventory: null, discoveredGear: null } };
forge.ensure(malformed);
assert.deepEqual(JSON.parse(JSON.stringify(malformed.town)), { forgeTier: 1, relicFavor: 0 });
assert.equal(malformed.player.forgeSpark, 0);
assert.equal(malformed.player.shards, 9);
assert.equal(malformed.player.ember, 0);
assert.deepEqual(JSON.parse(JSON.stringify(malformed.player.inventory)), []);
assert.deepEqual(JSON.parse(JSON.stringify(malformed.player.discoveredGear)), []);

const craftedState = state();
const randomCraft = forge.craft(craftedState, 'weapon', false);
assert.equal(randomCraft.slot, 'weapon');
assert.equal(randomCraft.source, 'forge');
assert.equal(randomCraft.crafted, 1);
assert.equal(randomCraft.rarity, 'rare');
assert.ok(randomCraft.tags.includes('crafted') && randomCraft.tags.includes('lowfire-forge'));
assert.equal(craftedState.player.forgeSpark, 1);
assert.equal(craftedState.player.shards, 160);
assert.equal(craftedState.player.ember, 3);
assert.equal(craftedState.town.relicFavor, 7);
assert.equal(craftedState.player.inventory[0].id, randomCraft.id);

const focusedCraft = forge.craft(craftedState, 'armor', true);
assert.equal(focusedCraft.slot, 'armor');
assert.equal(craftedState.player.forgeSpark, 0);
assert.equal(craftedState.player.shards, 85);
assert.equal(craftedState.player.ember, 2);
assert.equal(craftedState.town.relicFavor, 19);

const salvageState = state({
  player: {
    forgeSpark: 0,
    shards: 0,
    ember: 0,
    equipment: { weapon: gear('worn', 'weapon') },
    inventory: [
      gear('common_safe', 'armor', { rarity: 'common', level: 4 }),
      gear('uncommon_safe', 'armor', { rarity: 'uncommon', level: 8 }),
      gear('junk_safe', 'armor', { rarity: 'rare', level: 4, tags: ['junk'] }),
      gear('worn', 'weapon'),
      gear('special_safe', 'armor', { kind: 'special' }),
      gear('rare_kept', 'armor', { rarity: 'rare' })
    ]
  }
});
const salvage = forge.salvage(salvageState);
assert.deepEqual(JSON.parse(JSON.stringify(salvage)), { shards: 32, ember: 1, favor: 15 });
assert.equal(salvageState.player.shards, 32);
assert.equal(salvageState.player.ember, 1);
assert.equal(salvageState.town.relicFavor, 15);
assert.deepEqual(salvageState.player.inventory.map(item => item.id), ['worn', 'special_safe', 'rare_kept']);

const temperState = state({
  player: {
    forgeSpark: 0,
    shards: 100,
    ember: 3,
    equipment: {
      weapon: gear('temper_weapon', 'weapon', {
        level: 10,
        rating: 100,
        value: 200,
        stats: { power: 10, guard: 0, hp: 0 }
      })
    }
  }
});
const tempered = forge.temper(temperState, 'weapon');
assert.equal(tempered.tempered, 1);
assert.equal(tempered.level, 11);
assert.equal(tempered.rating, 111);
assert.equal(tempered.value, 251);
assert.equal(tempered.stats.power, 12);
assert.ok(tempered.tags.includes('tempered'));
assert.equal(temperState.player.shards, 40);
assert.equal(temperState.player.ember, 2);
assert.equal(temperState.town.relicFavor, 10);

temperState.player.equipment.weapon.tempered = 4;
const cappedShards = temperState.player.shards;
const cappedEmber = temperState.player.ember;
assert.equal(forge.temper(temperState, 'weapon'), null);
assert.equal(temperState.player.shards, cappedShards);
assert.equal(temperState.player.ember, cappedEmber);

const reloaded = JSON.parse(JSON.stringify(temperState));
forge.ensure(reloaded);
assert.equal(reloaded.town.forgeTier, 1);
assert.equal(reloaded.town.relicFavor, 10);
assert.equal(reloaded.player.equipment.weapon.tempered, 4);
assert.equal(reloaded.player.shards, 40);
assert.equal(reloaded.player.ember, 2);

runtime.S = state();
runtime.renderTown();
assert.ok(forgePanel.innerHTML.includes('Lowfire Forge'));
assert.ok(forgePanel.innerHTML.includes('Forge Random'));
assert.ok(forgePanel.innerHTML.includes('Salvage Junk'));
assert.ok(forgePanel.innerHTML.includes('data-forge-slot='));
assert.ok(forgePanel.innerHTML.includes('data-temper-slot='));

console.log('PASS: Lowfire Forge crafting, salvage, tempering, persistence shape, and Town panel contracts.');
