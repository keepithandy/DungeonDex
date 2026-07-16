#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} - ${detail}`);
}

async function main() {
  const [index, forge, town, revisit, archive, debt, readme] = await Promise.all([
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/16_relic_forge_crafting.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/10_ui_town_shop.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/44_revisit_lowfire_board_slot.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/11_ui_run_gear_dex_archive.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/28_debt_collector_foundation.js'), 'utf8'),
    readFile(path.join(ROOT, 'README.md'), 'utf8')
  ]);

  record('Public shell names the current game and Journal', index.includes('<title>DungeonDex v1.26.3.02</title>') && index.includes('aria-label="Guild Journal"'), 'title and Guild Journal surface');
  record('Town progression copy retains Lowfire Forge and Merchant Gear Upgrades', forge.includes('<h2>Lowfire Forge</h2>') && town.includes('<strong>Merchant Gear Upgrades</strong>'), 'active crafting and upgrade labels');
  record('Active Revisit surface identifies Trophy Echo as the only lane', revisit.includes('Trophy Echo is the only active Revisit lane for v1.26.3.02.') && revisit.includes('No boss echo is recorded yet.') && revisit.includes("record is ready to be revisited.") && revisit.includes('Trophy Echo Locked') && revisit.includes('Start Trophy Echo') && revisit.includes('Settle Echo'), 'locked, available, and active Trophy Echo copy');
  record('Active Revisit surface rejects inactive lane start copy', ['Start Famous Gear Memory', 'Start Rival Trace', 'Start Board Echo', 'Start Debt Pressure'].every(needle => !revisit.includes(needle)), 'no inactive lane start labels');
  record('Player surfaces avoid internal development wording', ['DevTools only', 'DevTools Archive Record', 'learned copy-only', 'learned helper only', 'display text only', 'smoke-backed', 'compatibility-safe'].every(needle => !`${archive}\n${debt}\n${readme}`.includes(needle)), 'Archive, Debt Collector, and README copy');
  record('Archive fallback keeps Trophy Echo as the only active lane', archive.includes('Trophy Echo is the only active Revisit lane.') && archive.includes('Guild Archive Record') && archive.includes('Reserved'), 'legacy records remain history-only');

  const passed = results.filter(result => result.ok).length;
  console.log(`\nPublic-copy v1.26.3.02 smoke: ${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});