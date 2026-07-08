#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  index: await readFile(new URL('./index.html', import.meta.url), 'utf8'),
  app: await readFile(new URL('./app.js', import.meta.url), 'utf8'),
  sw: await readFile(new URL('./sw.js', import.meta.url), 'utf8'),
  debt: await readFile(new URL('./js/systems/28_debt_collector_foundation.js', import.meta.url), 'utf8'),
  debtV1: await readFile(new URL('./js/systems/34_debt_collector_v1_completion.js', import.meta.url), 'utf8')
};

const retiredProgressionFiles = [
  '19_warden_talents_lowfire_board.js',
  '32_talent_award_claim_repair_contract.js',
  '33_talent_hunter_board_clarity_spend.js',
  '30_passive_activation_gate_hotfix.js'
];

for (const file of retiredProgressionFiles) {
  assert.equal(files.index.includes(file), false, `${file} should not load from index.html`);
  assert.equal(files.app.includes(file), false, `${file} should not load from app.js`);
  assert.equal(files.sw.includes(file), false, `${file} should not be cached by sw.js`);
}

assert.match(files.debt, /window\.DungeonDexDebtCollector/);
assert.match(files.debt, /function\s+debtCollectorDisplaySummary/);
assert.match(files.debt, /function\s+debtPressureDisplay/);
assert.match(files.debt, /function\s+debtCollectorStatusLine/);
assert.match(files.debt, /function\s+debtCollectorRepaymentContract/);
assert.match(files.debt, /function\s+debtCollectorBorrowContract/);
assert.match(files.debt, /function\s+debtCollectorHighPressureState/);
assert.match(files.debt, /function\s+borrowDebt/);
assert.match(files.debt, /function\s+repayDebt/);
assert.match(files.debt, /function\s+recordDebtReturn/);

assert.match(files.debt, /contractOwner:\s*'DungeonDexDebtCollector'/);
assert.match(files.debt, /actionId:\s*'debt_collector_repayment'/);
assert.match(files.debt, /actionId:\s*'debt_collector_borrow'/);
assert.match(files.debt, /repaymentActionLive:\s*true/);
assert.match(files.debt, /borrowActionLive:\s*true/);
assert.match(files.debt, /combat:\s*false/);
assert.match(files.debt, /rewards:\s*false/);
assert.match(files.debt, /progression:\s*false/);
assert.match(files.debt, /revisit:\s*false/);
assert.match(files.debt, /trophyEcho:\s*false/);
assert.match(files.debt, /liveRendererWired:\s*false/);

assert.match(files.debt, /HIGH_PRESSURE_THRESHOLD\s*=\s*3/);
assert.match(files.debt, /Under Collection/);
assert.match(files.debt, /borrowingBlockedByPressure/);
assert.match(files.debt, /pressureReliefAmount/);
assert.match(files.debt, /No active debt\. Pressure is quiet\./);
assert.match(files.debtV1, /Debt Status Ladder/);

assert.doesNotMatch(files.debt, /DungeonDexTalents|DungeonDexWardenTalents|contractOwner:\s*'DungeonDexTalents'/);
assert.doesNotMatch(files.debtV1, /DungeonDexTalents|DungeonDexWardenTalents|contractOwner:\s*'DungeonDexTalents'/);

console.log('PASS: debt collector smoke v1.23.8 progression-cleanup contract');
