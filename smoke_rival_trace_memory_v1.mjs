import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync('js/systems/38_journal_v1.js', 'utf8');

function makeContext(state){
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

const state = {
  player: {
    revisitState: {
      rivalTrace: {
        history: [
          { rivalId: 'glassfang', eliteName: 'Glassfang Brute', floorName: 'Lowfire District', summary: 'Trace recovered', completedAt: 20 },
          { rivalId: 'glassfang', eliteName: 'Glassfang Brute', floorName: 'Lowfire District', summary: 'Duplicate trace', completedAt: 15 }
        ],
        active: { rivalId: 'ash_crown', eliteName: 'Ash-Crowned Marauder', floorName: 'Ashgate Warrens', startedAt: 30 },
        completedKeys: {
          'rival_trace:glassfang': true,
          'rival_trace:old_knife_bailiff': true
        },
        lastResult: { summary: 'Rival trace complete' },
        completed: true
      }
    },
    eliteContracts: {
      rivals: [
        { id: 'glassfang', eliteName: 'Glassfang Brute', floorName: 'Lowfire District', defeats: 2, updatedAt: 19 }
      ]
    }
  }
};

const before = JSON.stringify(state);
const context = makeContext(state);
context.window = context;
vm.createContext(context);
vm.runInContext(code, context, { filename: 'js/systems/38_journal_v1.js' });

assert.equal(typeof context.rivalTraceReadableSummary, 'function');
const empty = context.rivalTraceReadableSummary({});
assert.equal(empty.totalRecorded, 0);
assert.equal(empty.duplicateSafe, true);
assert.ok(empty.body.includes('No rival'));

const summary = context.rivalTraceReadableSummary(state);
assert.equal(JSON.stringify(state), before);
assert.equal(summary.duplicateSafe, true);
assert.equal(summary.duplicateRecordsCollapsed, true);
assert.equal(summary.legacyIdsDetected, true);
assert.equal(summary.totalRecorded, 3);
assert.ok(summary.traceNames.includes('Glassfang Brute'));
assert.ok(summary.traceNames.includes('Ash-Crowned Marauder'));
assert.ok(summary.body.includes('3 rival traces remembered'));

const model = context.journalV1233SummaryModel(state);
const rivalRow = model.sections.find(section => section.key === 'rival');
assert.ok(rivalRow);
assert.ok(rivalRow.body.includes('3 rival traces remembered'));
assert.ok(rivalRow.meta.includes('duplicate-safe') || rivalRow.meta.includes('legacy trace detected'));

context.DDJournalV1Render();
assert.ok(String(context.document.getElementById('archivePanel').innerHTML).includes('Rival Traces'));
assert.ok(!String(context.document.getElementById('archivePanel').innerHTML).match(/data-start-|data-complete-|data-spend-|data-borrow-|data-repay-|data-claim-|data-reward-/i));

console.log('PASS: Rival Trace memory v1 smoke');
