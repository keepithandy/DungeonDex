#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = relativePath => readFileSync(path.join(ROOT, relativePath), 'utf8');
const index = read('index.html');
const app = read('app.js');
const serviceWorker = read('sw.js');
const board = read('js/systems/24_lowfire_spark_board.js');
const wallet = read('js/systems/25_town_wallet_chip_fix.js');
const build = '1.26.4.05-stability-hardening';

for (const source of [index, app, serviceWorker]) {
  assert.ok(source.includes(build), 'public runtime surfaces should use the current v1.26.4.05 build query');
}

for (const retiredPath of [
  'js/systems/20_town_currency_clean_strip.js',
  'js/systems/26_spark_writ_pill_cleanup.js',
  'js/systems/27_interface_density_cleanup.js'
]) {
  assert.equal(existsSync(path.join(ROOT, retiredPath)), false, `${retiredPath} should be retired`);
  assert.equal(index.includes(retiredPath), false, `${retiredPath} should not load from index.html`);
  assert.equal(app.includes(retiredPath), false, `${retiredPath} should not load from app.js`);
  assert.equal(serviceWorker.includes(retiredPath), false, `${retiredPath} should not be precached`);
}

assert.equal(board.includes('Spark Source'), false, 'Spark Writ header should not emit the redundant Spark Source pill');
for (const signal of ['Repeatable Spark Writ', 'claimSparkWritBtn', 'refreshSparkWritBtn', 'WRIT_REFRESH_COST']) {
  assert.ok(board.includes(signal), `Spark Writ behavior signal should remain: ${signal}`);
}

for (const signal of [
  'townWalletMarkup',
  'DungeonDexTownWallet',
  'Coin ${',
  'Spark ${',
  'Shards ${',
  'Ember ${',
  'Favor ${'
]) {
  assert.ok(wallet.includes(signal), `canonical Town wallet signal should remain: ${signal}`);
}

console.log('PASS: v1.26.3.02 Town runtime cleanup remains canonical under v1.26.4.05 and obsolete layers are retired.');
