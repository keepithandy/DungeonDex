import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync('js/systems/38_journal_v1.js', 'utf8');
const state = {
  player: {
    bossTrophyRecords: [{ bossName: 'Boss Floor 5', summary: 'First boss recorded', earnedAt: 2 }],
    revisitState: {
      trophyEcho: { history: [{ summary: 'Trophy echo complete' }], lastResult: { summary: 'Trophy echo complete' }, available: true },
      famousGear: { history: [{ itemName: 'Ashcloth Wraps' }], lastResult: { summary: 'Famous gear complete' }, completed: true },
      rivalTrace: { history: [{ eliteName: 'Glassfang Brute' }], lastResult: { summary: 'Rival trace complete' }, completed: true }
    },
    debtCollector: { active: true, balanceCopper: 1500, pressure: 3 },
    talentLearnedIds: { hunter_board_clarity: true, debt_collector_clarity: true },
    talentUnlockIds: ['hunter_board_clarity', 'debt_collector_clarity'],
    talentPoints: 1
  }
};

function makeContext(){
  const panel = {
    innerHTML: '',
    querySelector: selector => selector === '#guildJournalPanel' && panel.innerHTML.includes('guildJournalPanel') ? { outerHTML: panel.innerHTML } : null,
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
assert.ok(emptyModel.sections.length >= 6);
assert.ok(richModel.sections.some(section => section.title === 'Boss Trophies'));
assert.ok(richModel.sections.some(section => section.title === 'Revisit Memories'));
assert.ok(richModel.sections.some(section => section.title === 'Debt Status'));
assert.ok(richModel.sections.some(section => section.title === 'Talent Memory'));

context.DDJournalV1Render();
assert.ok(String(context.document.getElementById('archivePanel').innerHTML).includes('Guild Journal'));
assert.ok(!String(context.document.getElementById('archivePanel').innerHTML).match(/data-start-|data-complete-|data-spend-|data-borrow-|data-repay-|data-claim-|data-reward-/i));

console.log('PASS: Journal v1 smoke');
