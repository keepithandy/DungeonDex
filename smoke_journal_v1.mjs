#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const SYSTEM_FILE = './js/systems/38_journal_v1.js';

function createContext() {
  const panel = {
    inserted: '',
    querySelector(selector) {
      if (selector === '.journal-v1-panel' && this.inserted.includes('journal-v1-panel')) return {};
      return null;
    },
    insertAdjacentHTML(position, html) {
      this.inserted += html;
    }
  };
  const context = {
    console,
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    document: {
      getElementById(id) { return id === 'archivePanel' ? panel : null; }
    },
    cleanDisplayText(value, fallback = '') {
      return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    },
    format(value) {
      return String(Math.max(0, Math.floor(Number(value) || 0)));
    },
    formatMoney(value) {
      return `${Math.max(0, Math.floor(Number(value) || 0))}c`;
    },
    window: null,
    globalThis: null
  };
  context.window = context;
  context.globalThis = context;
  return { context: vm.createContext(context), panel };
}

const { context, panel } = createContext();
const source = await readFile(new URL(SYSTEM_FILE, import.meta.url), 'utf8');
vm.runInContext(source, context, { filename: SYSTEM_FILE });

assert.equal(typeof context.DDJournalV1SummaryModel, 'function');
assert.equal(typeof context.DDJournalV1Render, 'function');

const emptyModel = context.DDJournalV1SummaryModel({});
assert.equal(emptyModel.sections.length, 4);
assert.ok(emptyModel.sections[0].body.includes('No record yet'));
assert.ok(emptyModel.sections[1].body.includes('No debt due.'));
assert.ok(emptyModel.sections[2].body.includes('No learned nodes recorded yet') || emptyModel.sections[2].body.includes('No learned nodes'));
assert.ok(emptyModel.sections[3].body.includes('No boss trophy records yet'));

context.S = {
  player: {
    revisitState: {
      trophyEcho: {
        history: [{ summary: 'Boss Floor 5 settles into record. Memory Mark +1.', earnedAt: 1000 }],
        memoryMarks: 1,
        completedKeys: { a: true },
        lastResult: { summary: 'Boss Floor 5 settles into record. Memory Mark +1.' }
      },
      famousGear: {
        history: [{ summary: 'Ashcloth Wraps settles back into archive memory. Memory Recovered.' }],
        completedKeys: { a: true },
        lastResult: { summary: 'Ashcloth Wraps settles back into archive memory. Memory Recovered.' }
      },
      rivalTrace: {
        history: [{ summary: 'Glassfang Brute settles into archive memory. Trace recorded.' }],
        completedKeys: { a: true },
        lastResult: { summary: 'Glassfang Brute settles into archive memory. Trace recorded.' }
      }
    },
    debtCollector: { balanceCopper: 500, pressure: 3, lastVisitAt: 'Test Visit', notes: ['Pressure rising'] },
    talentLedger: { availablePoints: 1 },
    talentLearnedIds: { hunter_board_clarity: true },
    bossTrophyRecords: [{ trophyName: 'Lowfire Fang', earnedAt: 2000, count: 2 }]
  }
};

const populatedModel = context.DDJournalV1SummaryModel(context.S);
assert.ok(populatedModel.sections[0].body.includes('Trophy Echo: 1 completed'));
assert.ok(populatedModel.sections[0].body.includes('Famous Gear Memory: 1 completed'));
assert.ok(populatedModel.sections[0].body.includes('Rival Trace: 1 completed'));
assert.ok(populatedModel.sections[1].body.includes('Under Collection'));
assert.ok(populatedModel.sections[2].body.includes('hunter_board_clarity'));
assert.ok(populatedModel.sections[3].body.includes('Lowfire Fang'));

context.DDJournalV1Render();
assert.ok(panel.inserted.includes('Journal'));
assert.ok(panel.inserted.includes('Revisit'));
assert.ok(panel.inserted.includes('Debt'));
assert.ok(panel.inserted.includes('Talent'));
assert.ok(panel.inserted.includes('Boss Progress'));

console.log('PASS: Journal v1 smoke');
