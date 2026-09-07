import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync('js/systems/38_journal_v1.js', 'utf8');
const visualCss = fs.readFileSync('styles_visual_weight.css', 'utf8');
const state = {
  player: {
    bossTrophyRecords: [{ bossName: 'Boss Floor 5', summary: 'First boss recorded', earnedAt: 2 }],
    revisitState: {
      trophyEcho: { history: [{ summary: 'Trophy echo complete' }], lastResult: { summary: 'Trophy echo complete' }, available: true },
      famousGear: { history: [{ itemName: 'Ashcloth Wraps' }], lastResult: { summary: 'Famous gear complete' }, completed: true },
      rivalTrace: {
        history: [{
          eliteName: 'Glassfang Brute With An Unusually Long Historical Name',
          memoryKey: 'rival_trace:glassfang_brute',
          routeStatus: 'legacy trace detected',
          summary: 'duplicate-safe'
        }],
        lastResult: { summary: 'Rival trace complete' },
        completed: true
      },
      boardEcho: { available: true, locked: false },
      debtPressure: { available: true, locked: false }
    },
    debtCollector: { active: true, balanceCopper: 1500, pressure: 3 },
    equipment: {
      weapon: { id: 'journal_weapon', name: 'Ash Blade', slot: 'weapon', upgradeLevel: 2, stats: { power: 10 } },
      armor: { id: 'journal_armor', name: 'Ward Plate', slot: 'armor', upgradeLevel: 1, stats: { guard: 8, hp: 18 } }
    }
  }
};

function makeContext(){
  const panel = {
    innerHTML: '',
    querySelector: selector => selector === '#guildJournalPanel' && panel.innerHTML.includes('guildJournalPanel') ? { outerHTML: panel.innerHTML, remove: () => { panel.innerHTML = ''; } } : null,
    insertAdjacentHTML: (_pos, html) => { panel.innerHTML += html; }
  };
  return {
    console,
    window: null,
    document: { getElementById: id => id === 'archivePanel' ? panel : null },
    addEventListener: () => {},
    cleanDisplayText: v => String(v || '').trim(),
    escapeHtml: v => String(v || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
    format: v => String(v),
    formatMoney: v => `${Math.floor(Number(v) || 0)}c`,
    S: state,
    merchantGearUpgradeSummary: source => {
      const equipment = source?.player?.equipment || {};
      return [
        {
          slot: 'weapon',
          label: 'Weapon',
          item: equipment.weapon || null,
          itemName: equipment.weapon?.name || 'No weapon equipped',
          level: Number(equipment.weapon?.upgradeLevel || 0),
          cap: 3,
          currentStat: 'Power 14'
        },
        {
          slot: 'armor',
          label: 'Armor',
          item: equipment.armor || null,
          itemName: equipment.armor?.name || 'No armor equipped',
          level: Number(equipment.armor?.upgradeLevel || 0),
          cap: 3,
          currentStat: 'Guard 10 • HP 26'
        }
      ];
    },
    DungeonDexEliteContracts: {
      journalHistory: source => source === state ? [
          { eliteName: 'Glassfang Brute', location: 'Floor 4 • Room 2', outcome: 'Target defeated', badge: 'Ready to claim', bonusResult: 'Bonus Writ completed.' },
          { eliteName: 'Ash-Crowned Marauder', location: 'Ashgate Warrens', outcome: 'Claimed', badge: 'Claimed' },
          { eliteName: 'Cinderjaw Bailiff', location: 'Lowfire District', outcome: 'Expired', badge: 'Expired' }
        ] : []
    },
    setTimeout,
    clearTimeout
  };
}

const context = makeContext();
context.window = context;
vm.createContext(context);
vm.runInContext(code, context, { filename: 'js/systems/38_journal_v1.js' });

assert.equal(typeof context.journalV1233SummaryModel, 'function');
assert.equal(typeof context.renderGuildJournalPanel, 'function');
assert.equal(typeof context.DDJournalV1Render, 'function');

const before = JSON.stringify(state);
const emptyModel = context.journalV1233SummaryModel({});
const richModel = context.journalV1233SummaryModel(state);
assert.equal(JSON.stringify(state), before);
assert.equal(emptyModel.sections.length, 0);
assert.equal(emptyModel.memoryTotal, 0);
assert.equal(emptyModel.latestRecord, 'No records yet');
assert.ok(context.renderGuildJournalPanel({}).includes('No deeds have been carved'));
assert.ok(richModel.sections.some(section => section.title === 'Boss Trophies'));
assert.ok(richModel.sections.some(section => section.title === 'Trophy Echo'));
assert.ok(richModel.sections.some(section => section.title === 'Historical Memories'));
assert.ok(richModel.sections.some(section => section.title === 'Debt Record'));
assert.ok(richModel.sections.some(section => section.title === 'Merchant Upgrades'));
assert.ok(!richModel.sections.some(section => section.title === 'Revisit Memories'));
assert.ok(!richModel.sections.some(section => section.title === 'Account Memory'));
assert.ok(!richModel.sections.some(section => section.title === 'Unfinished Lanes'));
assert.equal(richModel.memoryTotal, 10);
assert.equal(richModel.latestRecord, 'Glassfang Brute — Ready to claim');
assert.equal(richModel.sections.filter(section => section.title === 'Elite Contract').length, 3);

context.DDJournalV1Render();
const html = String(context.document.getElementById('archivePanel').innerHTML);
assert.ok(html.includes('Guild Journal'));
assert.ok(html.includes('Guild Chronicle'));
assert.ok(html.includes('10 records'));
assert.ok(html.includes('Target defeated: Glassfang Brute'));
assert.ok(html.includes('Ready to claim'));
assert.ok(html.includes('Claimed: Ash-Crowned Marauder'));
assert.ok(html.includes('Expired: Cinderjaw Bailiff'));
assert.ok(html.includes('Bonus Writ completed.'));
assert.ok(html.includes('Merchant Upgrades'));
assert.ok(html.includes('Historical Memories'));
assert.ok(html.includes('Read-only'));
assert.ok(html.includes('1500c remains due. Pressure 3.'));
assert.ok(!html.includes('Account Memory'));
assert.ok(!html.includes('Unfinished Lanes'));
assert.ok(!html.includes('Board Echo'));
assert.ok(!html.includes('Debt Pressure'));
assert.ok(!html.includes('Memory Key'));
assert.ok(!html.includes('rival_trace:'));
assert.ok(!html.includes('duplicate-safe'));
assert.ok(!html.includes('legacy trace detected'));
assert.ok(!html.match(/\b(?:helper|fixture|normalization|canonical shape|renderer wiring)\b/i));
assert.ok(!html.match(/data-start-|data-complete-|data-spend-|data-borrow-|data-repay-|data-claim-|data-reward-/i));
assert.ok(!html.includes('<button'));
assert.match(visualCss, /@media \(max-width: 560px\)[\s\S]*?\.journal-grid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
assert.match(visualCss, /\.journal-record-head h3,[\s\S]*?overflow-wrap: anywhere/);
assert.equal(JSON.stringify(state), before);

console.log('PASS: Journal v1 smoke');

// Exercise the acknowledgement against the live record resolvers and depth mapping.
const live = makeContext();
live.window = live;
live.globalThis = live;
live.document = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
live.localStorage = { getItem: () => null, setItem: () => {} };
live.crypto = { randomUUID: () => 'journal-fixture' };
vm.createContext(live);
for (const name of fs.readdirSync('js/systems').filter(name => /^(0[0-8]_)/.test(name)).sort()) {
  vm.runInContext(fs.readFileSync(`js/systems/${name}`, 'utf8'), live, { filename: name });
}
vm.runInContext(fs.readFileSync('js/systems/10_ui_town_shop.js', 'utf8'), live);
vm.runInContext(code, live);
const rows = source => live.reliquaryJournalModel(source).rows;
const row = (source, key) => rows(source).find(entry => entry.key === `reliquary-${key}`);
const base = () => ({ player: {}, run: {} });
const fixture = base();
assert.ok(rows(fixture).every(entry => entry.badge.startsWith('Locked')));
assert.equal(live.renderReliquaryTownAcknowledgement(fixture), '');
fixture.player.depth = fixture.player.safeExtractDepth = 999;
fixture.player.bossTrophyRecords = [{ rawDepth: 45, bestKillDepth: 45 }];
fixture.player.runHistory = [{ floor: 99, zone: 'The Drowned Reliquary', reason: 'extract', runLabel: 'D31' }];
assert.ok(rows(fixture).every(entry => entry.badge.startsWith('Locked')), 'depth, zone, and labels do not prove an achievement');

for (const floor of [31, 40, '31']) {
  fixture.player.runHistory = [{ floor, reason: 'extract' }];
  assert.equal(row(fixture, 'return').badge, 'Completed — safe return');
}
assert.match(row(fixture, 'return').detail, /Floor 1 • Room 4 • Chapter 1 \(D31\)/);
for (const floor of [null, true, {}, [], -1, 0, 30, 41, 45, 31.9, '31abc', Infinity, NaN]) {
  fixture.player.runHistory = [{ floor, reason: 'extract' }];
  assert.match(row(fixture, 'return').badge, /^Locked/, String(floor));
}
fixture.player.runHistory = [null, false, 'D40', { floor: 40, reason: 'defeat', lootPreview: ['Drowned Sword'] }];
assert.equal(row(fixture, 'return').badge, 'Historical');
assert.match(row(fixture, 'return').detail, /unsecured loot was not recovered/);
fixture.run = { active: true, floor: 31 };
assert.equal(row(fixture, 'return').badge, 'Active');
fixture.run.active = 'true';
assert.equal(row(fixture, 'return').badge, 'Historical');

const contractId = vm.runInContext('ELITE_CONTRACTS[0].id', live);
fixture.player.eliteContracts = { active: { id: contractId, eliteName: '<img src=x onerror=alert(1)> Bell Mark', targetFloor: 11, status: 'pending' } };
assert.equal(row(fixture, 'contract').badge, 'Active');
assert.match(row(fixture, 'contract').detail, /Floor 1 • Room 4 • Chapter 1 \(D31\)/);
fixture.player.eliteContracts.active.completed = true;
assert.equal(row(fixture, 'contract').badge, 'Completed — target defeated');
fixture.player.eliteContracts.active.failed = true;
assert.equal(row(fixture, 'contract').badge, 'Historical', 'conflicting failure does not imply victory');
for (const targetFloor of [null, true, {}, 0, 10, 15, 31, 11.2, 'bad']) {
  fixture.player.eliteContracts.active.targetFloor = targetFloor;
  assert.match(row(fixture, 'contract').badge, /^Locked/);
}
fixture.player.eliteContracts = { claimed: [contractId], completed: [contractId] };
assert.equal(row(fixture, 'contract').badge, 'Historical — location unrecorded');
fixture.player.eliteContracts.failed = [{ id: contractId, targetFloor: 14, eliteName: 'Old mark' }];
assert.equal(row(fixture, 'contract').badge, 'Historical');
assert.match(row(fixture, 'contract').detail, /D40/);

const item = { id: 'marked-gear', name: 'Bellbound Blade', slot: 'weapon', maker: 'Drowned Reliquary', tags: ['drowned-reliquary'] };
fixture.player.inventory = [{ id: 'name-only', name: 'Drowned Reliquary Blade', slot: 'weapon', level: 31 }];
fixture.player.retiredRelics = [{ rawDepth: 31, item: fixture.player.inventory[0] }];
assert.match(row(fixture, 'gear').badge, /^Locked/, 'retirement location is not item origin');
fixture.player.inventory.push(item);
assert.equal(row(fixture, 'gear').badge, 'Recorded — in your gear');
fixture.player.inventory = [];
fixture.player.retiredRelics = [{ item }];
assert.equal(row(fixture, 'gear').badge, 'Historical — retired');

for (const bossTrophies of [['gravetoll_bell'], ['Gravetoll Bell'], { gravetoll_bell: true }]) {
  fixture.player.bossTrophies = bossTrophies;
  assert.equal(row(fixture, 'boss').badge, 'Completed');
}
fixture.player.bossTrophies = { gravetoll_bell: false };
assert.match(row(fixture, 'boss').badge, /^Locked/);
fixture.player.bossTrophies = [];
fixture.player.bossTrophyRecords = [{ trophyId: 'gravetoll_bell' }, { trophyName: 'Gravetoll Bell' }];
assert.equal(rows(fixture).filter(entry => entry.key === 'reliquary-boss').length, 1);
assert.equal(row(fixture, 'boss').badge, 'Completed');
fixture.player.runHistory = [{ floor: 40, reason: 'extract', restartDepth: 40 }];
fixture.player.eliteContracts = { active: { id: contractId, eliteName: '<svg onload=alert(1)>', targetFloor: 11, completed: true } };
const beforeComplete = JSON.stringify(fixture);
const markup = live.renderGuildJournalPanel(fixture);
assert.equal(JSON.stringify(fixture), beforeComplete, 'rendering does not change existing records');
assert.match(markup, /Drowned Reliquary records/);
assert.ok(!/<svg|onload="|<button|data-(?:claim|reward|start|complete)-/.test(markup));
const receipt = live.townReturnReceiptMarkup(fixture);
assert.match(receipt, /Banked at Floor 1 • Room 4 • Chapter 10 \(D40\)/);
assert.ok(!receipt.includes('Banked at Floor 40'));
assert.match(receipt, /Drowned Reliquary · Completed/);
assert.equal(JSON.stringify(fixture), beforeComplete);

for (const malformed of [null, [], {}, { player: null }, { player: { runHistory: 'bad', bossTrophies: false, bossTrophyRecords: [null, true, []], retiredRelics: [null, false], inventory: {}, eliteContracts: { active: [], claimed: 'bad' } }, run: { active: true, floor: {} } }]) {
  const beforeMalformed = JSON.stringify(malformed);
  assert.doesNotThrow(() => live.reliquaryJournalModel(malformed));
  assert.doesNotThrow(() => live.renderGuildJournalPanel(malformed));
  assert.equal(JSON.stringify(malformed), beforeMalformed);
}
const activeBoss = { player: {}, run: { active: true, floor: 45, monster: { tier: 'Boss' } } };
assert.equal(row(activeBoss, 'boss').badge, 'Active');
console.log('PASS: Reliquary Journal evidence, legacy/malformed histories, read-only rendering and Town depth labels');
