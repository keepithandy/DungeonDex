import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(ROOT, 'js/systems/48_guild_oaths.js'), 'utf8');
const windowRef = {};
vm.runInContext(source, vm.createContext({ window:windowRef }), { filename:'48_guild_oaths.js' });
const api = windowRef.DungeonDexGuildOaths;
const state = () => ({ screen:'town', player:{ level:12, title:'Ashbound Delver', guildOaths:api.createState() }, run:{ active:false, floor:1, roomsCleared:0, monster:null } });

const first = state();
assert.equal(api.selectOath(first, 'iron_vigil').ok, true, 'Lowfire can prepare an unlocked oath.');
assert.equal(first.player.guildOaths.selectedOath, 'iron_vigil');
first.run.active = true; first.run.floor = 1; first.run.monster = { id:'m1', tier:'Common', hp:20 };
const started = api.beginRun(first);
assert.equal(started.oathId, 'iron_vigil');
for (let index = 0; index < 4; index += 1) {
  first.run.floor = index + 1;
  first.run.monster = { id:`m${index}`, tier:'Common', hp:20 };
  if (index < 3) api.recordAction(first, 'guard', { successful:true });
  api.recordVictory(first, first.run.monster);
}
const progress = api.progressFor(first.run.guildOath);
assert.equal(progress.complete, true, 'Guard oath reaches its stated chapter and Guard goals.');
const settled = api.settleRun(first, 'extract');
assert.equal(settled.completed, true);
assert.equal(settled.gold, 60);
assert.match(settled.message, /Oath fulfilled: Iron Vigil/);
assert.match(settled.message, /4 renown to Pathfinder/);
assert.equal(first.player.guildOaths.renown, 2);
assert.equal(api.settleRun(first, 'extract').gold, 0, 'Settling the same oath twice cannot duplicate its reward.');

const spell = state();
api.selectOath(spell, 'ember_scribe');
spell.run.active = true; spell.run.floor = 1; spell.run.monster = { id:'s1', tier:'Common', hp:20 };
api.beginRun(spell);
for (let index = 0; index < 4; index += 1) {
  spell.run.floor = index + 1;
  spell.run.monster = { id:`s${index}`, tier:'Common', hp:20 };
  api.recordAction(spell, 'skill', { successful:true, spellId:index % 2 ? 'cinder_ward' : 'ashburst' });
  api.recordVictory(spell, spell.run.monster);
}
assert.equal(api.progressFor(spell.run.guildOath).complete, true, 'Spell oath tracks successful spell victories and extraction readiness.');

const broken = state();
broken.player.guildOaths.renown = 6;
api.selectOath(broken, 'quiet_steel');
broken.run.active = true; broken.run.floor = 1; broken.run.monster = { id:'q1', tier:'Common', hp:20 };
api.beginRun(broken);
api.recordAction(broken, 'skill', { successful:true, spellId:'ashburst' });
assert.equal(api.progressFor(broken.run.guildOath).broken, true, 'Quiet Steel breaks as soon as a spell succeeds.');
const brokenSettlement = api.settleRun(broken, 'extract');
assert.equal(brokenSettlement.completed, false);
assert.match(brokenSettlement.message, /Oath broken: Quiet Steel/);
assert.match(brokenSettlement.message, /successful spell breaks this oath/);

const recovered = state();
api.selectOath(recovered, 'first_light');
recovered.run.active = true; recovered.run.floor = 1; recovered.run.monster = { id:'r1', tier:'Common', hp:20 };
api.beginRun(recovered);
const ended = api.settleRun(recovered, 'ended');
assert.equal(ended.settled, true, 'An incomplete recovery settles the active oath without a reward.');
assert.equal(ended.gold, 0);
assert.equal(recovered.player.guildOaths.settledThrough, 1);

const rankState = state();
rankState.player.guildOaths = api.normalizeState({ renown:6, keepsakes:['bad'], selectedTitle:'brass_compass', runSequence:2, settledThrough:2 });
assert.equal(rankState.player.guildOaths.keepsakes.includes('brass_compass'), true, 'Renown reconstructs the Pathfinder keepsake safely.');
assert.equal(api.selectTitle(rankState, 'brass_compass').ok, true);
assert.equal(rankState.player.title, 'Pathfinder of Lowfire');
assert.equal(api.selectTitle(rankState, '').ok, true);
assert.equal(rankState.player.title, 'Ashbound Delver');

const malformed = api.normalizeState({ renown:'not-number', runSequence:Infinity, completions:{ iron_vigil:999999999 }, history:[{ oathId:'bad', serial:1 }] });
assert.equal(malformed.renown, 0);
assert.equal(malformed.history.length, 0);
assert.equal(malformed.completions.iron_vigil, 999999);
const townMarkup = api.townPanelMarkup(rankState);
assert.equal(townMarkup.includes('Warden Oaths'), true);
assert.match(townMarkup, /guild-oaths-dropdown/);
assert.match(townMarkup, /data-guild-oaths-menu="dropdown"/);
assert.match(townMarkup, /<dt>Promise<\/dt>/);
assert.match(townMarkup, /<dt>Risk<\/dt>/);
assert.match(townMarkup, /Falling or returning before every goal is met earns no oath bonus/);
const runMarkup = api.runMarkup(first);
assert.equal(runMarkup.includes('Iron Vigil'), true);
assert.match(runMarkup, /guild-oath-objectives/);
assert.match(runMarkup, /Status:<\/strong> Goal met/);
assert.match(runMarkup, /aria-valuetext="Chapters cleared 4 of 4; Victories using Guard 3 of 3"/);
assert.equal(api.journalMarkup(first).includes('Promises brought home'), true);
console.log('PASS Guild Oaths v1.33: nine authored objectives, action/victory tracking, extraction-only copper and renown, rank keepsakes/titles, settlement idempotence, and malformed-save repair.');
