#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function has(source, needle) {
  return String(source || '').includes(needle);
}

function notHas(source, needle) {
  return !has(source, needle);
}

async function main() {
  const [surface, version, readme, notes] = await Promise.all([
    readFile(path.join(ROOT, 'js/systems/44_revisit_lowfire_board_slot.js'), 'utf8'),
    readFile(path.join(ROOT, 'VERSION.md'), 'utf8'),
    readFile(path.join(ROOT, 'README.md'), 'utf8'),
    readFile(path.join(ROOT, 'docs/status/CURRENT_NOTES.md'), 'utf8')
  ]);

  record(
    'Revisit surface is v1.26.4.01 Trophy Echo only',
    has(surface, 'v1.26.4.01 Revisit surface: Trophy Echo only')
      && has(surface, 'Trophy Echo is the only active Revisit lane for v1.26.4.01.'),
    'js/systems/44_revisit_lowfire_board_slot.js'
  );

  record(
    'Trophy Echo locked/playable/active actions are present',
    has(surface, 'Trophy Echo Locked')
      && has(surface, 'data-start-revisit="trophy_echo_route"')
      && has(surface, 'data-complete-trophy-echo="1"'),
    'locked, start, and resolve actions'
  );

  record(
    'Non-Trophy Revisit start actions are absent from active surface',
    [
      'data-start-revisit="famous_gear_route"',
      'data-start-revisit="rival_trace_route"',
      'data-start-revisit="board_echo_route"',
      'data-start-revisit="debt_pressure_route"',
      'Start Famous Gear Memory',
      'Start Rival Trace',
      'Start Board Echo',
      'Start Debt Pressure'
    ].every(needle => notHas(surface, needle)),
    'Famous Gear/Rival/Board/Debt Revisit starts hidden'
  );

  record(
    'Player-facing route preview filter keeps only trophy_echo_route',
    has(surface, 'function trophyOnlyRoutes(routes)')
      && has(surface, "const DD_PUBLIC_REVISIT_ALLOWED_ROUTE = 'trophy_echo_route'")
      && has(surface, "String(route?.key || '') === DD_PUBLIC_REVISIT_ALLOWED_ROUTE")
      && has(surface, '__ddTrophyEchoOnlyApi'),
    'route preview API filter'
  );

  record(
    'Revisit placement helper has no DOM mover, MutationObserver, or timing loop',
    notHas(surface, 'appendChild(')
      && notHas(surface, 'insertBefore(')
      && notHas(surface, 'MutationObserver')
      && notHas(surface, 'setTimeout(')
      && notHas(surface, 'setInterval('),
    'source-render only'
  );

  record(
    'Trophy Echo copy states memory-only guardrails',
    has(surface, 'Trophy Echo is memory-only: no gear, coin, combat, debt, Talent, or dungeon-entry changes.'),
    'no gear/coin/combat/debt/Talent/dungeon-entry effects'
  );

  record(
    'Version docs identify Trophy Echo as the only active Revisit lane',
    has(version, 'v1.26.4.01 Combat CSS Authority Playtest')
      && has(readme, 'Trophy Echo')
      && !has(readme, '**Famous Gear Memory:** Live Revisit lane')
      && !has(readme, '**Rival Trace:** Live Revisit lane')
      && has(notes, 'Trophy Echo'),
    'VERSION.md, README.md, CURRENT_NOTES.md'
  );

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nRevisit Trophy Echo-only smoke: ${passed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
