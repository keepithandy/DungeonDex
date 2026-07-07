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
  { tag: 'syntax', name: 'app syntax', cmd: ['node', '--check', 'app.js'] },
  { tag: 'syntax', name: 'journal syntax', cmd: ['node', '--check', 'js/systems/38_journal_v1.js'] },
  { tag: 'syntax', name: 'journal smoke syntax', cmd: ['node', '--check', 'smoke_journal_v1233.mjs'] },
  { tag: 'syntax', name: 'famous gear smoke syntax', cmd: ['node', '--check', 'smoke_famous_gear_memory_v1.mjs'], optionalPath: 'smoke_famous_gear_memory_v1.mjs' },
  { tag: 'syntax', name: 'boss trophy smoke syntax', cmd: ['node', '--check', 'smoke_boss_trophy_v1.mjs'], optionalPath: 'smoke_boss_trophy_v1.mjs' },
  { tag: 'syntax', name: 'rival trace smoke syntax', cmd: ['node', '--check', 'smoke_rival_trace_memory_v1.mjs'], optionalPath: 'smoke_rival_trace_memory_v1.mjs' },
  { tag: 'syntax', name: 'revisit smoke syntax', cmd: ['node', '--check', 'smoke_revisit_routes_v173.mjs'] },
  { tag: 'syntax', name: 'debt smoke syntax', cmd: ['node', '--check', 'smoke_debt_collector_v169.mjs'] },
  { tag: 'syntax', name: 'app wiring smoke syntax', cmd: ['node', '--check', 'smoke_app_wiring_cache_manifest_v1.mjs'] },
  { tag: 'syntax', name: 'talent passive smoke syntax', cmd: ['node', '--check', 'smoke_talent_passive_framework_v1232.mjs'] },
  { tag: 'syntax', name: 'talent browser smoke syntax', cmd: ['node', '--check', 'smoke_talent_v150b.mjs'] },
  { tag: 'journal', name: 'journal v1', cmd: ['node', 'smoke_journal_v1233.mjs'] },
  { tag: 'famous', name: 'famous gear memory v1', cmd: ['node', 'smoke_famous_gear_memory_v1.mjs'], optionalPath: 'smoke_famous_gear_memory_v1.mjs' },
  { tag: 'boss', name: 'boss trophy v1', cmd: ['node', 'smoke_boss_trophy_v1.mjs'], optionalPath: 'smoke_boss_trophy_v1.mjs' },
  { tag: 'rival', name: 'rival trace memory v1', cmd: ['node', 'smoke_rival_trace_memory_v1.mjs'], optionalPath: 'smoke_rival_trace_memory_v1.mjs' },
  { tag: 'revisit', name: 'revisit routes', cmd: ['node', 'smoke_revisit_routes_v173.mjs'] },
  { tag: 'revisit', name: 'revisit archive codex', cmd: ['node', 'smoke_revisit_archive_codex_v174.mjs'], optionalPath: 'smoke_revisit_archive_codex_v174.mjs' },
  { tag: 'revisit', name: 'revisit famous gear flavor', cmd: ['node', 'smoke_revisit_famous_gear_flavor_v175.mjs'], optionalPath: 'smoke_revisit_famous_gear_flavor_v175.mjs' },
  { tag: 'debt', name: 'debt collector', cmd: ['node', 'smoke_debt_collector_v169.mjs'] },
  { tag: 'app', name: 'app wiring cache manifest', cmd: ['node', 'smoke_app_wiring_cache_manifest_v1.mjs'] },
  { tag: 'talent', name: 'talent passive framework', cmd: ['node', 'smoke_talent_passive_framework_v1232.mjs'] },
  { tag: 'talent', name: 'talent browser full smoke', cmd: ['node', 'smoke_talent_v150b.mjs'] }
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
      resolve({ entry, ok: code === 0, code, duration: Date.now() - startedAt, output: `${stdout}\n${stderr}` });
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
  const status = result.ok ? 'PASS' : 'FAIL';
  const signal = compactSignal(result.output, result.ok);
  console.log(`${status.padEnd(4)} ${entry.name.padEnd(32)} ${formatMs(result.duration).padStart(7)}  ${commandLine(entry)}`);
  if (!result.ok || verbose) {
    signal.forEach(line => console.log(`      ${line}`));
  }
}

const passed = results.filter(result => result.ok).length;
const failed = results.length - passed;
console.log('');
console.log(`Summary: ${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}.`);

if (failed) {
  console.log('Failed commands:');
  results.filter(result => !result.ok).forEach(result => {
    console.log(`- ${result.entry.name}: ${commandLine(result.entry)}`);
    compactSignal(result.output, false).forEach(line => console.log(`  ${line}`));
  });
  process.exit(1);
}

console.log('PASS: Compact smoke suite clean.');
