#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const listOnly = args.includes('--list');
const failLinesArg = args.find(arg => arg.startsWith('--fail-lines='));
const failLineLimit = Math.max(10, Math.floor(Number(failLinesArg?.split('=')[1]) || 40));
const selectedTags = args
  .filter(arg => !arg.startsWith('-'))
  .map(arg => arg.toLowerCase().trim())
  .filter(Boolean);

const COMMANDS = [
  { tag: 'syntax', name: 'repository JavaScript syntax', cmd: ['node', 'tools/ddx_smoke_helper.mjs', '--syntax'] },
  { tag: 'syntax', name: 'app syntax', cmd: ['node', '--check', 'app.js'] },
  { tag: 'syntax', name: 'journal syntax', cmd: ['node', '--check', 'js/systems/38_journal_v1.js'] },
  { tag: 'syntax', name: 'trophy echo result detail syntax', cmd: ['node', '--check', 'js/systems/45_trophy_echo_result_detail.js'], optionalPath: 'js/systems/45_trophy_echo_result_detail.js' },
  { tag: 'syntax', name: 'journal smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_journal_v1233.mjs'] },
  { tag: 'syntax', name: 'famous gear smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_famous_gear_memory_v1.mjs'], optionalPath: 'tests/smoke/smoke_famous_gear_memory_v1.mjs' },
  { tag: 'syntax', name: 'boss trophy smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_boss_trophy_v1.mjs'], optionalPath: 'tests/smoke/smoke_boss_trophy_v1.mjs' },
  { tag: 'syntax', name: 'boss 2 readiness smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_boss_2_readiness_v1263.mjs'], optionalPath: 'tests/smoke/smoke_boss_2_readiness_v1263.mjs' },
  { tag: 'syntax', name: 'boss scaling matrix smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_boss_scaling_matrix_v1.mjs'] },
  { tag: 'syntax', name: 'rival trace smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_rival_trace_memory_v1.mjs'], optionalPath: 'tests/smoke/smoke_rival_trace_memory_v1.mjs' },
  { tag: 'syntax', name: 'revisit smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_revisit_routes_v173.mjs'] },
  { tag: 'syntax', name: 'trophy echo result detail smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_trophy_echo_result_detail_v11.mjs'], optionalPath: 'tests/smoke/smoke_trophy_echo_result_detail_v11.mjs' },
  { tag: 'syntax', name: 'public copy smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_public_copy_v1260.mjs'], optionalPath: 'tests/smoke/smoke_public_copy_v1260.mjs' },
  { tag: 'syntax', name: 'public trophy-only revisit smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs'], optionalPath: 'tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs' },
  { tag: 'syntax', name: 'devtools gate smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_devtools_gate_v1262.mjs'], optionalPath: 'tests/smoke/smoke_devtools_gate_v1262.mjs' },
  { tag: 'syntax', name: 'town runtime cleanup smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_town_runtime_cleanup_v126302.mjs'] },
  { tag: 'syntax', name: 'debt smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_debt_collector_v169.mjs'] },
  { tag: 'syntax', name: 'app wiring smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs'] },
  { tag: 'syntax', name: 'mobile layout contracts smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_mobile_layout_contracts_v1264.mjs'] },
  { tag: 'syntax', name: 'interface accessibility smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_interface_accessibility_v1264.mjs'] },
  { tag: 'syntax', name: 'computed contrast smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_computed_contrast_v1265.mjs'] },
  { tag: 'syntax', name: 'enter dungeon smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_enter_dungeon_runtime_v1.mjs'] },
  { tag: 'syntax', name: 'merchant upgrade smoke syntax', cmd: ['node', '--check', 'tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs'] },
  { tag: 'journal', name: 'journal v1', cmd: ['node', 'tests/smoke/smoke_journal_v1233.mjs'] },
  { tag: 'famous', name: 'famous gear memory v1', cmd: ['node', 'tests/smoke/smoke_famous_gear_memory_v1.mjs'], optionalPath: 'tests/smoke/smoke_famous_gear_memory_v1.mjs' },
  { tag: 'boss', name: 'boss trophy v1', cmd: ['node', 'tests/smoke/smoke_boss_trophy_v1.mjs'], optionalPath: 'tests/smoke/smoke_boss_trophy_v1.mjs' },
  { tag: 'boss', name: 'boss 2 readiness scaling', cmd: ['node', 'tests/smoke/smoke_boss_2_readiness_v1263.mjs'], optionalPath: 'tests/smoke/smoke_boss_2_readiness_v1263.mjs' },
  { tag: 'boss', name: 'boss scaling matrix', cmd: ['node', 'tests/smoke/smoke_boss_scaling_matrix_v1.mjs'], showSignal: true },
  { tag: 'rival', name: 'rival trace memory v1', cmd: ['node', 'tests/smoke/smoke_rival_trace_memory_v1.mjs'], optionalPath: 'tests/smoke/smoke_rival_trace_memory_v1.mjs' },
  { tag: 'revisit', name: 'revisit routes', cmd: ['node', 'tests/smoke/smoke_revisit_routes_v173.mjs'] },
  { tag: 'revisit', name: 'trophy echo result detail', cmd: ['node', 'tests/smoke/smoke_trophy_echo_result_detail_v11.mjs'], optionalPath: 'tests/smoke/smoke_trophy_echo_result_detail_v11.mjs' },
  { tag: 'public', name: 'public copy v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_public_copy_v1260.mjs'], optionalPath: 'tests/smoke/smoke_public_copy_v1260.mjs' },
  { tag: 'public', name: 'public trophy-only revisit v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs'], optionalPath: 'tests/smoke/smoke_public_revisit_trophy_only_v1261.mjs' },
  { tag: 'app', name: 'devtools gate v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_devtools_gate_v1262.mjs'], optionalPath: 'tests/smoke/smoke_devtools_gate_v1262.mjs' },
  { tag: 'town', name: 'town runtime cleanup v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_town_runtime_cleanup_v126302.mjs'] },
  { tag: 'revisit', name: 'revisit archive codex', cmd: ['node', 'tests/smoke/smoke_revisit_archive_codex_v174.mjs'], optionalPath: 'tests/smoke/smoke_revisit_archive_codex_v174.mjs' },
  { tag: 'revisit', name: 'revisit famous gear flavor', cmd: ['node', 'tests/smoke/smoke_revisit_famous_gear_flavor_v175.mjs'], optionalPath: 'tests/smoke/smoke_revisit_famous_gear_flavor_v175.mjs' },
  { tag: 'debt', name: 'debt collector', cmd: ['node', 'tests/smoke/smoke_debt_collector_v169.mjs'] },
  { tag: 'app', name: 'app wiring cache manifest', cmd: ['node', 'tests/smoke/smoke_app_wiring_cache_manifest_v1.mjs'] },
  { tag: 'app', name: 'mobile layout contracts v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_mobile_layout_contracts_v1264.mjs'] },
  { tag: 'app', name: 'interface accessibility v1.26.4.06', cmd: ['node', 'tests/smoke/smoke_interface_accessibility_v1264.mjs'] },
  { tag: 'app', name: 'browser-computed contrast', cmd: ['node', 'tests/smoke/smoke_computed_contrast_v1265.mjs'] },
  { tag: 'app', name: 'enter dungeon runtime', cmd: ['node', 'tests/smoke/smoke_enter_dungeon_runtime_v1.mjs'] },
  { tag: 'merchant', name: 'merchant gear upgrades', cmd: ['node', 'tests/smoke/smoke_merchant_gear_upgrades_v1238.mjs'] },
  { tag: 'forge', name: 'lowfire forge', cmd: ['node', 'tests/smoke/smoke_lowfire_forge_v1.mjs'] }
];

function commandExists(entry) {
  return !entry.optionalPath || existsSync(path.join(ROOT, entry.optionalPath));
}

function selected(entry) {
  if (!selectedTags.length) return true;
  const haystack = `${entry.tag} ${entry.name} ${entry.cmd.join(' ')}`.toLowerCase();
  return selectedTags.some(tag => haystack.includes(tag));
}

const suite = COMMANDS.filter(commandExists).filter(selected);

function commandLine(entry) {
  return entry.cmd.join(' ');
}

function trimCapture(current, chunk, maxChars = 350000) {
  const combined = current + chunk;
  return combined.length > maxChars ? combined.slice(combined.length - maxChars) : combined;
}

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function compactSignal(output, ok) {
  const lines = String(output || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const interesting = lines.filter(line => /\bFAIL\b|AssertionError|assert|Expected|Actual|Error:|TypeError|ReferenceError|SyntaxError|exception|timeout|timed out|missing|not ok/i.test(line));
  if (!ok) return interesting.slice(0, failLineLimit);
  const passLines = lines.filter(line => /^PASS\b|\bPASS:/i.test(line));
  if (passLines.length) return passLines.slice(-2);
  const lastUseful = lines.filter(line => !/^\[/.test(line)).slice(-1);
  return lastUseful.length ? lastUseful : ['completed'];
}

function runCommand(entry) {
  return new Promise(resolve => {
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(entry.cmd[0], entry.cmd.slice(1), {
      cwd: ROOT,
      shell: false,
      windowsHide: true,
      env: { ...process.env, DUNGEONDEX_SMOKE_COMPACT: '1' }
    });

    child.stdout.on('data', data => {
      const chunk = data.toString();
      if (verbose) process.stdout.write(chunk);
      stdout = trimCapture(stdout, chunk);
    });
    child.stderr.on('data', data => {
      const chunk = data.toString();
      if (verbose) process.stderr.write(chunk);
      stderr = trimCapture(stderr, chunk);
    });
    child.on('error', err => {
      resolve({ entry, ok: false, code: null, duration: Date.now() - startedAt, output: `${stdout}\n${stderr}\n${err.stack || err.message || String(err)}` });
    });
    child.on('close', code => {
      const output = `${stdout}\n${stderr}`;
      const skipped = code === 0 && /^SKIP:/m.test(output);
      resolve({ entry, ok: code === 0, skipped, code, duration: Date.now() - startedAt, output });
    });
  });
}

if (!suite.length) {
  console.error('No smoke commands selected. Try: node smoke_compact_suite.mjs --list');
  process.exit(1);
}

if (listOnly) {
  console.log('DungeonDex compact smoke commands:');
  suite.forEach((entry, index) => console.log(`${String(index + 1).padStart(2, '0')}. [${entry.tag}] ${entry.name} -> ${commandLine(entry)}`));
  process.exit(0);
}

console.log(`DungeonDex compact smoke runner`);
console.log(`Commands: ${suite.length}${selectedTags.length ? ` | filter: ${selectedTags.join(', ')}` : ''}${verbose ? ' | verbose' : ''}`);
console.log('');

const results = [];
for (const entry of suite) {
  const result = await runCommand(entry);
  results.push(result);
  const status = result.skipped ? 'SKIP' : result.ok ? 'PASS' : 'FAIL';
  const signal = compactSignal(result.output, result.ok);
  console.log(`${status.padEnd(4)} ${entry.name.padEnd(32)} ${formatMs(result.duration).padStart(7)}  ${commandLine(entry)}`);
  if (!result.ok || result.skipped || verbose || result.entry.showSignal) {
    signal.forEach(line => console.log(`      ${line}`));
  }
}

const passed = results.filter(result => result.ok && !result.skipped).length;
const skipped = results.filter(result => result.skipped).length;
const failed = results.filter(result => !result.ok).length;
console.log('');
console.log(`Summary: ${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} failed` : ''}.`);

if (failed) {
  console.log('Failed commands:');
  results.filter(result => !result.ok).forEach(result => {
    console.log(`- ${result.entry.name}: ${commandLine(result.entry)}`);
    compactSignal(result.output, false).forEach(line => console.log(`  ${line}`));
  });
  process.exit(1);
}

console.log(`PASS: Compact smoke suite clean${skipped ? ' with declared environment skips' : ''}.`);
