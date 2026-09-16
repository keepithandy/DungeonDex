#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(ROOT, 'js/systems/49_lantern_rites.js'), 'utf8');
function load() {
  const window = {};
  vm.runInContext(source, vm.createContext({ window }), { filename:'49_lantern_rites.js' });
  return window.DungeonDexLanternRites;
}
const api = load();
const json = value => JSON.parse(JSON.stringify(value));
const fresh = () => ({ player:{ hp:80, maxHp:120, ember:1, gold:100, stats:{ power:10, guard:10, wit:10, speed:10 } }, run:{ active:true, floor:1, roomsCleared:0, encounters:1, monster:{ id:'m1', hp:100 } } });
function clearRoom(state) {
  state.run.roomsCleared += 1;
  state.run.floor += 1;
  return api.onRoomClear(state);
}
function endowed(id, rank = 1) {
  const state = fresh();
  state.run.roomsCleared = api.MILESTONES[rank - 1];
  state.run.lanternRites = { seed:31, decisions:api.MILESTONES.slice(0, rank).map(milestone => ({ milestone, boonId:id })), processedClears:state.run.roomsCleared };
  api.ensure(state);
  return state;
}

assert.equal(api.BOONS.length, 9, 'The launch includes nine authored, distinct boons.');
const state = fresh();
api.startRun(state, 122);
api.onEncounterStart(state);
assert.equal(api.isDraftReady(state), false, 'The first fight remains immediately playable.');
assert.match(api.summaryMarkup(state), /Win two fights/);
assert.equal(clearRoom(state).draftQueued, false);
const milestone = clearRoom(state);
assert.equal(milestone.draftQueued, true, 'The first rite is earned by two victories.');
assert.equal(api.isDraftReady(state), true);
const initialDraft = json(state.run.lanternRites.pending);
assert.equal(new Set(initialDraft.offers).size, 3);
assert.match(api.draftMarkup(state), /Leave the flame unchanged/);
assert.equal((api.draftMarkup(state).match(/data-lantern-rite=/g) || []).length, 3);
assert.match(api.draftMarkup(state), /lantern-rite-change/);
assert.match(api.draftMarkup(state), /<b>Now<\/b>Not yet kindled\./);
assert.match(api.draftMarkup(state), /<b>After<\/b>/);
const markupBefore = api.draftMarkup(state);
api.ensure(state);
assert.equal(api.draftMarkup(state), markupBefore, 'Rendering/normalization cannot reroll the options.');
const reloaded = json(state);
const reloadApi = load();
reloadApi.ensure(reloaded);
assert.deepEqual(json(reloaded.run.lanternRites.pending), initialDraft, 'A fresh runtime reconstructs the saved draft identically.');

state.run.event = { id:'wounded_delver', options:[{ id:'leave' }] };
const preservedEvent = json(state.run.event);
assert.equal(api.isDraftReady(state), false, 'Authored incidents take precedence over a queued rite.');
assert.equal(api.choose(state, initialDraft.offers[0], initialDraft.token).reason, 'event_pending');
assert.deepEqual(json(state.run.event), preservedEvent, 'A rite never overwrites or resolves an incident.');
assert.match(api.summaryMarkup(state), /Rite waiting after this event/);
state.run.event = null;
assert.equal(api.choose(state, 'ironwick', 'old-token').reason, 'stale_draft');
assert.equal(api.choose(state, 'not-a-boon', initialDraft.token).reason, 'not_offered');
const priorBase = json(state.player.stats);
const selected = api.choose(state, initialDraft.offers[0], initialDraft.token);
assert.equal(selected.ok, true);
assert.equal(selected.rank, 1);
assert.equal(api.isDraftReady(state), false);
assert.match(api.summaryMarkup(state), /2 \/ 5 victories · next rite in 3/);
assert.match(api.summaryMarkup(state), /aria-label="[^"]+ rank 1 of [23]"/);
assert.match(api.summaryMarkup(state), /Active effects · this descent only/);
assert.equal(api.choose(state, initialDraft.offers[0], initialDraft.token).ok, false, 'Double clicks cannot claim twice.');
assert.deepEqual(json(state.player.stats), priorBase, 'Claiming never writes permanent base stats.');

while (state.run.roomsCleared < 5) clearRoom(state);
const secondDraft = json(state.run.lanternRites.pending);
const ranksBeforeSkip = json(state.run.lanternRites.ranks);
const walletBeforeSkip = json(state.player);
assert.equal(api.skip(state, secondDraft.token).ok, true);
assert.deepEqual(json(state.run.lanternRites.ranks), ranksBeforeSkip, 'Leaving the flame unchanged spends the choice without adding a boon.');
assert.deepEqual(json(state.player), walletBeforeSkip, 'Skipping has no hidden costs or rewards.');
assert.equal(api.skip(state, secondDraft.token).ok, false);
assert.equal(api.choose(state, secondDraft.offers[0], initialDraft.token).ok, false);

for (const [id, stat] of [['red_thread','power'], ['ironwick','guard'], ['scholars_glow','wit'], ['hushstep','speed']]) {
  const endowedState = endowed(id, 3);
  assert.equal(api.statBonuses(endowedState)[stat], 6, `${id} grants its fully stacked, bounded combat stat.`);
}
assert.equal(api.combatModifiers(endowed('hungry_flame', 3)).damageMultiplier, 1.3);
assert.equal(api.combatModifiers(endowed('gentle_flame', 3)).healMultiplier, 1.6);
assert.equal(api.combatModifiers(endowed('gentle_flame', 3)).siphonMultiplier, 1.6);

const warmth = endowed('wayfarers_warmth', 3);
warmth.player.maxHp = 1000;
warmth.player.hp = 800;
assert.equal(clearRoom(warmth).healed, 12, 'Warmth caps large-health builds at 4 HP per rank per victory.');
assert.equal(api.onRoomClear(warmth).healed, 0, 'A repeated room-clear notification cannot heal again.');
warmth.player.hp = 998;
assert.equal(clearRoom(warmth).healed, 2, 'Warmth never overheals.');
const ember = endowed('emberkeeper');
const emberBefore = ember.player.ember;
clearRoom(ember); clearRoom(ember);
assert.equal(ember.player.ember, emberBefore);
const chargeReload = json(ember);
api.ensure(chargeReload);
assert.equal(clearRoom(chargeReload).emberRestored, 1, 'The third victory restores Ember, retaining charge through reload.');
assert.equal(api.onRoomClear(chargeReload).emberRestored, 0);
chargeReload.player.ember = 4;
clearRoom(chargeReload); clearRoom(chargeReload); clearRoom(chargeReload);
assert.equal(chargeReload.player.ember, 4, 'Emberkeeper cannot stockpile beyond the visible four-Ember reserve.');
chargeReload.player.ember = 30;
clearRoom(chargeReload); clearRoom(chargeReload); clearRoom(chargeReload);
assert.equal(chargeReload.player.ember, 30, 'It never deletes the player’s existing reserve.');
const emberII = endowed('emberkeeper', 2);
clearRoom(emberII);
assert.equal(clearRoom(emberII).emberRestored, 1, 'Rank II improves cadence to two victories.');

const shield = endowed('firstlight', 3);
api.onEncounterStart(shield);
assert.equal(api.consumeOpeningShield(shield), 30);
assert.equal(api.consumeOpeningShield(shield), 0, 'Firstlight absorbs only the first response.');
const shieldReload = json(shield);
api.ensure(shieldReload);
assert.equal(api.onEncounterStart(shieldReload), false, 'Reloading the same monster cannot recharge Firstlight.');
assert.equal(api.consumeOpeningShield(shieldReload), 0);
shieldReload.run.monster.id = 'm2';
assert.equal(api.onEncounterStart(shieldReload), true);
assert.equal(api.consumeOpeningShield(shieldReload), 30);
const lateKindle = fresh();
api.startRun(lateKindle, 1);
api.onEncounterStart(lateKindle);
lateKindle.run.roomsCleared = 2;
lateKindle.run.lanternRites.decisions = [{ milestone:2, boonId:'firstlight' }];
assert.equal(api.consumeOpeningShield(lateKindle), 10, 'Kindling Firstlight after the next monster was generated still protects that fight.');

const malformed = fresh();
malformed.run.roomsCleared = 44;
malformed.run.lanternRites = {
  seed:'broken', processedClears:Infinity, emberCharge:999, openingShieldReady:'true',
  ranks:{ ironwick:999, red_thread:999 },
  decisions:[...api.MILESTONES.map(milestone => ({milestone, boonId:'ironwick'})), {milestone:2, boonId:'red_thread'}, {milestone:999, boonId:'red_thread'}, {milestone:3, boonId:'red_thread'}],
  pending:{ milestone:999, token:'forged', offers:['ironwick','ironwick','__proto__'] }
};
api.ensure(malformed);
assert.equal(malformed.run.lanternRites.ranks.ironwick, 3, 'Rank caps survive malformed saves.');
assert.equal(malformed.run.lanternRites.ranks.red_thread, 0, 'Unbacked rank maps and duplicate/unearned choices grant nothing.');
assert.equal(malformed.run.lanternRites.decisions.length, 8);
assert.equal(malformed.run.lanternRites.pending, null, 'Spent milestones stay spent after malformed decisions repair.');
assert.equal(malformed.run.lanternRites.openingShieldReady, false);
const rankCapped = endowed('ironwick', 3);
rankCapped.run.roomsCleared = 14;
api.ensure(rankCapped);
assert.equal(rankCapped.run.lanternRites.pending.offers.includes('ironwick'), false, 'Capped boons leave the draft pool.');
assert.equal(rankCapped.run.lanternRites.pending.offers.length, 3);
const oldSave = fresh();
oldSave.run.roomsCleared = 6;
api.ensure(oldSave);
assert.equal(oldSave.run.lanternRites.pending.milestone, 2, 'An older active run can claim previously earned rites in order.');
assert.equal(api.onRoomClear(oldSave).emberRestored, 0, 'Migrating a save never grants retroactive recovery.');
for (const raw of [null, [], 'broken', { decisions:[null, '__proto__', {milestone:2,boonId:'__proto__'}] }]) {
  const normalized = api.normalizeState(raw, oldSave.run);
  assert.equal(normalized.pending?.offers.length, 3);
  assert.equal(Object.values(normalized.ranks).reduce((sum, rank) => sum + rank, 0), 0);
}

const town = endowed('red_thread', 3);
town.run.active = false;
assert.deepEqual(json(api.statBonuses(town)), {power:0, guard:0, wit:0, speed:0});
assert.deepEqual(json(api.combatModifiers(town)), {damageMultiplier:1, healMultiplier:1, siphonMultiplier:1});
assert.equal(api.consumeOpeningShield(town), 0);
assert.equal(api.summaryMarkup(town), '');
assert.equal(api.isDraftReady(town), false);
assert.equal(api.ensure(town), null);
town.run.active = true;
town.run.roomsCleared = 0;
api.startRun(town, 23);
assert.equal(api.statBonuses(town).power, 0, 'The next descent begins without the previous build.');
api.clear(town);
assert.equal(town.run.lanternRites, null);
assert.equal(api.statBonuses({}).power, 0);
console.log('PASS Lantern Rites v1.33: nine working boons; earned stable drafts; event priority; stacking and caps; reload-safe recovery/shield; skip/double-claim guards; old/malformed saves; no town or next-run buffs.');
