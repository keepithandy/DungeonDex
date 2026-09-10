#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = await readFile(path.join(ROOT, 'js/systems/47_spell_mastery.js'), 'utf8');
const spells = [
  { id:'ashburst', name:'Ashburst', unlockLevel:1, emberCost:1, detail:'A searing strike.' },
  { id:'cinder_ward', name:'Cinder Ward', unlockLevel:4, emberCost:1, detail:'Raise a ward.' },
  { id:'ruin_lance', name:'Ruin Lance', unlockLevel:8, emberCost:2, detail:'Drive a lance.' },
  { id:'grave_mend', name:'Grave Mend', unlockLevel:12, emberCost:2, detail:'Restore health.' }
];
const windowRef = {};
const context = vm.createContext({
  window: windowRef,
  COMBAT_SPELLS: spells,
  numberOr(value, fallback, min, max) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
  },
  combatSpellUnlocked(spell, level) { return Number(level) >= Number(spell?.unlockLevel || 1); },
  formatMoney(value) { return `${Math.floor(Number(value) || 0)}c`; }
});
vm.runInContext(source, context, { filename:'47_spell_mastery.js' });

const api = windowRef.DungeonDexSpellMastery;
assert.ok(api, 'Spell Mastery API should load once.');

const state = {
  player: {
    level: 12,
    gold: 500,
    spellMastery: null,
    equipment: {
      weapon: { id:'w1', slot:'weapon' },
      gloves: { id:'g1', slot:'gloves' },
      armor: { id:'a1', slot:'armor' }
    }
  }
};

const normalized = api.ensure(state);
assert.deepEqual(Object.keys(normalized.spells).sort(), spells.map(spell => spell.id).sort(), 'All four spellbook spells receive safe mastery entries.');
assert.equal(api.affinityForGear(state.player.equipment.weapon), 'ashburst', 'Weapon affinity is explicit and deterministic.');
assert.equal(api.affinityBonus(state, 'ashburst'), 2, 'Matching gear grants the capped +2 mastery bonus.');

for (let cast = 0; cast < 3; cast += 1) api.recordCast(state, 'ashburst');
assert.equal(api.entryFor(state, 'ashburst').mastery, 9, 'Matching gear accelerates mastery without changing spell unlocks.');
assert.equal(api.chooseInscription(state, 'ashburst', 'cinder_script').ok, true, 'Adept mastery unlocks a standard inscription.');
for (let cast = 0; cast < 5; cast += 1) api.recordCast(state, 'ashburst');
assert.equal(api.entryFor(state, 'ashburst').mastery, 24, 'Mastery remains per spell and reaches the Master threshold.');
assert.equal(api.masterInscription(state, 'ashburst').ok, true, 'A chosen path can be mastered at the Master threshold.');
assert.ok(api.combatModifiers(state, 'ashburst', { tier:'Boss' }).damageMultiplier > 1, 'A mastered Ashburst path changes only its requested spell effect.');

const bossFolio = api.discoverRareInscription(state, 'boss');
const eventFolio = api.discoverRareInscription(state, 'event');
assert.equal(bossFolio.unlocked, true, 'Bosses can preserve a rare folio.');
assert.equal(eventFolio.unlocked, true, 'Run events can preserve a rare folio.');
state.player.spellMastery.spells.cinder_ward.mastery = 8;
assert.equal(api.chooseInscription(state, 'cinder_ward', 'mirror_verse').ok, true, 'An event folio unlocks its alternative inscription.');
assert.ok(api.combatModifiers(state, 'cinder_ward', { tier:'Common' }).reflectRatio > 0, 'Mirror Verse has an explicit one-hit counter effect.');

const goldBeforeRespec = state.player.gold;
assert.equal(api.respecSpell(state, 'ashburst').ok, true, 'The Scriptorium can respec an inscription.');
assert.equal(state.player.gold, goldBeforeRespec - api.RESPEC_COPPER_COST, 'Respec spends the displayed copper cost only.');
assert.equal(api.entryFor(state, 'ashburst').mastery, 24, 'Respec preserves earned mastery.');
assert.equal(api.entryFor(state, 'ashburst').inscription, '', 'Respec clears only the selected path.');

const journal = api.journalModel(state);
assert.equal(journal.discoveryCount, 2, 'Journal summary retains boss and event folio records.');
assert.ok(api.panelMarkup(state).includes('data-spell-inscribe'), 'Scriptorium markup exposes inscription controls.');
assert.equal(api.normalizeState({ discoveries:['ashburst:wildfire_verse', 'bad:data'], spells:{ ashburst:{ mastery:'not-a-number', inscription:'wildfire_verse' } } }).spells.ashburst.inscription, '', 'Malformed old mastery data repairs safely.');

console.log('PASS Spell Mastery v1.32: safe save normalization, all four spell paths, gear affinities, rare folios, respec, combat modifiers, Scriptorium controls, and Journal records.');
