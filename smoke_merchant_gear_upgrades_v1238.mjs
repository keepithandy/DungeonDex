#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  index: await readFile(new URL('./index.html', import.meta.url), 'utf8'),
  app: await readFile(new URL('./app.js', import.meta.url), 'utf8'),
  sw: await readFile(new URL('./sw.js', import.meta.url), 'utf8'),
  market: await readFile(new URL('./js/systems/10_ui_town_shop.js', import.meta.url), 'utf8'),
  bindings: await readFile(new URL('./js/systems/12_render_bindings_boot.js', import.meta.url), 'utf8'),
  contracts: await readFile(new URL('./js/systems/03_town_contracts_market.js', import.meta.url), 'utf8'),
  journal: await readFile(new URL('./js/systems/38_journal_v1.js', import.meta.url), 'utf8')
};

const retiredRuntimeFiles = [
  '19_warden_talents_lowfire_board.js',
  '32_talent_award_claim_repair_contract.js',
  '33_talent_hunter_board_clarity_spend.js',
  '30_passive_activation_gate_hotfix.js'
];

for (const retiredFile of retiredRuntimeFiles) {
  assert.equal(files.index.includes(retiredFile), false, `${retiredFile} should not load from index.html`);
  assert.equal(files.app.includes(retiredFile), false, `${retiredFile} should not load from app.js`);
  assert.equal(files.sw.includes(retiredFile), false, `${retiredFile} should not be cached by sw.js`);
}

assert.equal(files.index.includes('id="talentPanel"'), false, 'old talentPanel placeholder should be removed from index.html');
assert.equal(files.index.includes('talent-panel'), false, 'old talent-panel CSS class should be removed from index.html');
assert.match(files.index, /gearUpgradeSummaryPanel/);

assert.match(files.market, /Merchant Gear Upgrades/);
assert.match(files.market, /data-merchant-upgrade/);
assert.match(files.bindings, /buyMerchantGearUpgrade/);
assert.match(files.contracts, /function\s+buyMerchantGearUpgrade/);
assert.match(files.contracts, /function\s+merchantGearUpgradeSummary/);
assert.match(files.journal, /Merchant Upgrades/);
assert.doesNotMatch(files.journal, /Talent Memory/);

console.log('PASS: merchant gear upgrades replacement smoke v1.23.8');
