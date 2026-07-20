#!/usr/bin/env node
'use strict';

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STRICT_BOSS_SCALING = process.argv.includes('--strict-boss-scaling');

const TESTS = [
  { name: 'App wiring + cache manifest', file: 'tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs' },
  { name: 'Revisit route contracts', file: 'tests/smoke/smoke_revisit_routes_v173.mjs' },
  { name: 'Revisit journal visibility', file: 'tests/smoke/smoke_revisit_journal_visibility_v1.mjs' },
  { name: 'Revisit source-render placement', file: 'tests/smoke/smoke_revisit_lowfire_source_render_v1252.mjs' },
  { name: 'Journal v1', file: 'tests/smoke/smoke_journal_v1.mjs' },
  { name: 'Rival Trace memory v1', file: 'tests/smoke/smoke_rival_trace_memory_v1.mjs' },
  { name: 'Revisit archive codex', file: 'tests/smoke/smoke_revisit_archive_codex_v174.mjs' },
  { name: 'Famous Gear flavor', file: 'tests/smoke/smoke_revisit_famous_gear_flavor_v175.mjs' },
  { name: 'Famous Gear memory v1', file: 'tests/smoke/smoke_famous_gear_memory_v1.mjs' },
  { name: 'Boss Trophy v1', file: 'tests/smoke/smoke_boss_trophy_v1.mjs' },
  { name: 'Talent system replacement', file: 'tests/smoke/smoke_talent_system_replaced_v1238.mjs' },
  { name: 'Merchant Gear Upgrades', file: 'tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs' },
  { name: 'Gear upgrade loot clarity', file: 'tests/smoke/smoke_gear_upgrade_loot_clarity_v123803.mjs' },
  { name: 'Gear upgrade replacement warning', file: 'tests/smoke/smoke_gear_upgrade_replacement_warning_v123804.mjs' },
  { name: 'Gear detail modal', file: 'tests/smoke/smoke_gear_detail_modal_v123801.mjs' },
  { name: 'Core loop', file: 'tests/smoke/smoke_core_loop_v1.mjs' },
  { name: 'Deep districts', file: 'tests/smoke/smoke_deep_districts_v1.mjs' },
  { name: 'Dungeon entry runtime', file: 'tests/smoke/smoke_enter_dungeon_runtime_v1.mjs' },
  { name: 'Public UI cleanup', file: 'tests/smoke/smoke_public_ui_cleanup_v1238.mjs' },
  { name: 'Sootveil Mythic set', file: 'tests/smoke/smoke_sootveil_set_v142.mjs' },
  { name: 'Debt Pressure v1', file: 'tests/smoke/smoke_debt_pressure_v1.mjs' },
  { name: 'Public copy v1.26.4.03', file: 'tests/smoke/smoke_public_copy_v1260.mjs' },
  { name: 'Public Revisit Trophy Echo-only v1.26.4.03', file: 'tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs' },
  { name: 'Public DevTools gate v1.26.4.03', file: 'tests/smoke/smoke_devtools_gate_v1262.mjs' },
  { name: 'Boss 2 readiness scaling', file: 'tests/smoke/smoke_boss2_readiness_scaling_v1263.mjs' },
  { name: 'Boss scaling matrix v1.26.3.01', file: 'tests/smoke/smoke_boss_scaling_matrix_v126301.mjs', advisory: true, strictArg: '--strict-bands' },
  { name: 'Town runtime cleanup v1.26.4.03', file: 'tests/smoke/smoke_town_runtime_cleanup_v126302.mjs' },
  { name: 'Mobile layout contracts v1.26.4.03', file: 'tests/smoke/smoke_mobile_layout_contracts_v1264.mjs' },
  { name: 'Interface accessibility v1.26.4.03', file: 'tests/smoke/smoke_interface_accessibility_v1264.mjs' },
  { name: 'Asset provenance policy v1.26.4', file: 'tests/smoke/smoke_asset_provenance_v1264.mjs' },
  { name: 'Package builder', file: 'tools/check_dungeondex_package.py', runtime: 'python' }
];

function commandFor(test) {
  const args = [];
  if (test.runtime === 'python') {
    const executable = process.platform === 'win32' ? 'python' : 'python3';
    args.push(path.join(ROOT, test.file), ROOT);
    return { executable, args };
  }
  args.push(path.join(ROOT, test.file));
  if (STRICT_BOSS_SCALING && test.strictArg) args.push(test.strictArg);
  return { executable: process.execPath, args };
}

function tail(text, limit = 8) {
  return String(text || '')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .join('\n');
}

const results = [];
for (const test of TESTS) {
  const { executable, args } = commandFor(test);
  const startedAt = Date.now();
  const run = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000
  });
  const durationMs = Date.now() - startedAt;
  const passed = run.status === 0 && !run.error;
  const advisoryFailure = !passed && test.advisory && !STRICT_BOSS_SCALING;
  results.push({ test, passed, advisoryFailure, durationMs, run, executable, args });

  if (passed) {
    console.log(`PASS: ${test.name} (${durationMs}ms)`);
    continue;
  }
  if (advisoryFailure) {
    console.log(`WARN: ${test.name} (${durationMs}ms) - provisional audit failure; rerun with --strict-boss-scaling to make it blocking.`);
    continue;
  }

  console.log(`FAIL: ${test.name} (${durationMs}ms)`);
  if (run.error) console.log(`  error: ${run.error.message}`);
  if (run.status !== null) console.log(`  exit: ${run.status}`);
  const details = tail(run.stderr || run.stdout);
  if (details) console.log(details.split('\n').map(line => `  ${line}`).join('\n'));
}

const passedCount = results.filter(result => result.passed).length;
const advisoryCount = results.filter(result => result.advisoryFailure).length;
const failed = results.filter(result => !result.passed && !result.advisoryFailure);
console.log(`\nCompact suite: ${passedCount}/${results.length} passed${advisoryCount ? `, ${advisoryCount} advisory warning` : ''}`);

if (failed.length) {
  console.log('Failures:');
  failed.forEach(result => console.log(`- ${result.test.name}`));
  process.exitCode = 1;
} else if (advisoryCount) {
  console.log('Provisional audit warnings:');
  results.filter(result => result.advisoryFailure).forEach(result => console.log(`- ${result.test.name}`));
  if (STRICT_BOSS_SCALING) process.exitCode = 1;
}
