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
    DungeonDexEliteContracts: {
      famousGearMemorySummary: () => ({
        totalRecorded: 1,
        latestMemory: { itemName: 'Ashcloth Wraps' },
        body: '1 famous gear memory recorded.',
        meta: 'Last remembered gear: Ashcloth Wraps',
        duplicateSafe: true,
        duplicateRecordsCollapsed: false,
        legacyIdsDetected: false,
        emptyStateCopy: 'No famous gear memories recorded yet.'
      })
    },
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
          { rivalId: 'glassfang', eliteName: 'Glassfang Brute', floorName: 'Lowfire District', summary: 'Trace recovered', routeStatus: 'Archive trace', completedLabel: 'Lowfire District cleared', memoryKey: 'rival_trace:glassfang', completedAt: 20 },
          { rivalId: 'glassfang', eliteName: 'Glassfang Brute', floorName: 'Lowfire District', summary: 'Duplicate trace', completedAt: 15 },
          'rival_trace:old_knife_bailiff'
        ],
        active: { rivalId: 'ash_crown', eliteName: 'Ash-Crowned Marauder', floorName: 'Ashgate Warrens', routeStatus: 'Active trace', summary: 'The rival is still at large', startedAt: 30 },
        completedKeys: {
          'rival_trace:glassfang': true,
          'rival_trace:old_knife_bailiff': true
        },
        lastResult: { summary: 'Rival trace complete', completedLabel: 'Lowfire District cleared', memoryKey: 'rival_trace:glassfang' },
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
assert.ok(summary.latestResultDetail.includes('Rival: Glassfang Brute'));
assert.ok(summary.latestResultDetail.includes('Route: Archive trace'));
assert.ok(summary.latestResultDetail.includes('State: Completed'));
assert.ok(summary.latestResultDetail.includes('Memory Key: rival_trace:glassfang'));
assert.ok(summary.latestResultDetail.includes('Last Completed: Lowfire District cleared'));
assert.ok(summary.traceNames.includes('Glassfang Brute'));
assert.ok(summary.traceNames.includes('Ash-Crowned Marauder'));
assert.ok(summary.traceNames.some(name => /old knife bailiff/i.test(name)));
assert.ok(summary.body.includes('3 rival traces remembered'));

const reloaded = JSON.parse(JSON.stringify(state));
const reloadedSummary = context.rivalTraceReadableSummary(reloaded);
assert.deepEqual(reloadedSummary.traceNames, summary.traceNames);
assert.equal(reloadedSummary.totalRecorded, summary.totalRecorded);
assert.equal(reloadedSummary.duplicateRecordsCollapsed, true);
assert.equal(reloadedSummary.legacyIdsDetected, true);

const model = context.journalV1233SummaryModel(state);
const rivalRow = model.sections.find(section => section.key === 'rival');
const famousRow = model.sections.find(section => section.key === 'famous');
assert.ok(rivalRow);
assert.ok(famousRow);
assert.ok(rivalRow.body.includes('3 rival traces remembered'));
assert.ok(rivalRow.meta.includes('duplicate-safe') || rivalRow.meta.includes('legacy trace detected'));
assert.ok(rivalRow.meta.includes('Completed result:'));
assert.ok(rivalRow.meta.includes('Memory Key: rival_trace:glassfang'));
assert.ok(famousRow.body.includes('1 famous gear memory recorded'));

const reloadModel = context.journalV1233SummaryModel(reloaded);
const reloadRivalRow = reloadModel.sections.find(section => section.key === 'rival');
assert.ok(reloadRivalRow.body.includes('3 rival traces remembered'));

context.DDJournalV1Render();
assert.ok(String(context.document.getElementById('archivePanel').innerHTML).includes('Rival Traces'));
assert.ok(!String(context.document.getElementById('archivePanel').innerHTML).match(/data-start-|data-complete-|data-spend-|data-borrow-|data-repay-|data-claim-|data-reward-/i));

console.log('PASS: Rival Trace memory v1 smoke');
