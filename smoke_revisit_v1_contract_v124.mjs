#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

function has(text, pattern) {
  return pattern.test(String(text || ''));
}

async function readRepoFile(relativePath) {
  return await readFile(path.join(ROOT, relativePath), 'utf8');
}

async function main() {
  const contracts = await readRepoFile('js/systems/03_town_contracts_market.js');
  const lockdown = await readRepoFile('js/systems/31_revisit_activation_surface_lockdown.js');
  const routeSmoke = await readRepoFile('smoke_revisit_routes_v173.mjs');

  const liveRouteKeys = ['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'];
  const futureRouteKeys = ['debt_pressure_route', 'board_echo_route'];

  record(
    'Revisit v1 route keys are present in route content definitions',
    liveRouteKeys.every(key => contracts.includes(`${key}: {`)) && futureRouteKeys.every(key => contracts.includes(`${key}: {`)),
    JSON.stringify({ liveRouteKeys, futureRouteKeys })
  );

  record(
    'Only the three Revisit v1 lanes can start through startRevisitRoute',
    has(contracts, /safeKey !== 'trophy_echo_route' && safeKey !== 'famous_gear_route' && safeKey !== 'rival_trace_route'\) return false;/),
    'startRevisitRoute allow-list must stay limited to Trophy Echo, Famous Gear Memory, and Rival Trace.'
  );

  record(
    'Trophy Echo has start, complete, status, active, and result exports',
    ['startTrophyEcho', 'completeTrophyEcho', 'trophyEchoStatus', 'activeTrophyEcho', 'trophyEchoResultSummary'].every(name => contracts.includes(`${name}(state = S)`)),
    'Trophy Echo API surface should remain complete for smoke/runtime verification.'
  );

  record(
    'Famous Gear Memory has start, complete, status, active, and result exports',
    ['startFamousGear', 'completeFamousGear', 'famousGearStatus', 'activeFamousGear', 'famousGearResultSummary'].every(name => contracts.includes(`${name}(state = S)`)),
    'Famous Gear Memory API surface should remain complete for smoke/runtime verification.'
  );

  record(
    'Rival Trace has start, complete, status, and active exports',
    ['startRivalTrace', 'completeRivalTrace', 'rivalTraceStatus', 'activeRivalTrace'].every(name => contracts.includes(`${name}(state = S)`)),
    'Rival Trace API surface should remain complete for smoke/runtime verification.'
  );

  record(
    'All three Revisit v1 completion functions persist history and completed keys',
    ['completeTrophyEchoRoute', 'completeFamousGearRoute', 'completeRivalTraceRoute'].every(fn => contracts.includes(`function ${fn}`))
      && ['trophyEcho.history.unshift', 'famousGear.history.unshift', 'rivalTrace.history.unshift', 'trophyEcho.completedKeys', 'famousGear.completedKeys', 'rivalTrace.completedKeys'].every(snippet => contracts.includes(snippet)),
    'Completion must keep deterministic history and completed key tracking.'
  );

  record(
    'Trophy Echo duplicate Memory Mark protection exists',
    has(contracts, /const firstCompletion = revisitState\.trophyEcho\.completedKeys\[completionKey\] !== true;/)
      && has(contracts, /const rewardMark = firstCompletion \? 1 : 0;/)
      && has(contracts, /if \(firstCompletion\) revisitState\.trophyEcho\.memoryMarks/),
    'Memory Marks should only increment on first completion key.'
  );

  record(
    'Famous Gear Memory does not restore retired gear or expose route rewards',
    has(contracts, /rewardAvailable:\s*false/)
      && has(contracts, /keeps the item retired/i)
      && !has(contracts, /completeFamousGearRoute[\s\S]{0,2200}(addPlayerGold|inventory\.push|rewardMark\s*=\s*1)/),
    'Famous Gear completion should stay archive-only, not a loot or currency farm.'
  );

  record(
    'Rival Trace does not create combat, board mission, or reward path',
    has(contracts, /Rival Trace is a safe archive memory tied to named rival elite history, not a reward, hunt, or combat path\./)
      && has(contracts, /rewardAvailable:\s*false/)
      && !has(contracts, /completeRivalTraceRoute[\s\S]{0,2200}(addPlayerGold|startEliteRivalContract|applyEliteContractTargetMonster|rewardMark\s*=\s*1)/),
    'Rival Trace completion should stay archive-only.'
  );

  record(
    'Future Revisit lanes remain locked in route previews',
    has(contracts, /key:\s*'debt_pressure_route',[\s\S]{0,320}status:\s*'Locked',[\s\S]{0,120}locked:\s*true/)
      && has(contracts, /key:\s*'board_echo_route',[\s\S]{0,320}status:\s*'Planned',[\s\S]{0,120}locked:\s*true/),
    'Debt Pressure and Board Echo should not become startable in Revisit v1.'
  );

  record(
    'Activation summary documents three live lanes and remaining preview-only lanes',
    has(contracts, /Trophy Echo, Famous Gear Memory, and Rival Trace are the live Revisit lanes\. The remaining lanes stay preview-only\./),
    'Summary wording should match Revisit v1 scope.'
  );

  record(
    'Activation surface lockdown knows current live Revisit lanes',
    has(lockdown, /Trophy Echo is the first live Revisit lane\./)
      && has(lockdown, /Famous Gear Memory is the second live Revisit lane\./)
      && has(lockdown, /famousGearPlayable/)
      && has(lockdown, /completionAvailable: trophyRoute\?\.completionAvailable === true \|\| famousGearRoute\?\.completionAvailable === true/),
    'Lockdown report should include current live Revisit lane state.'
  );

  record(
    'Browser Revisit smoke covers all three live lane starts and completions',
    ['Trophy Echo can start', 'Trophy Echo can complete', 'Famous Gear can start', 'Famous Gear can complete', 'Rival Trace can start', 'Rival Trace can complete'].every(label => routeSmoke.includes(label)),
    'smoke_revisit_routes_v173.mjs should remain the browser/runtime source of truth.'
  );

  record(
    'Browser Revisit smoke covers reload persistence and duplicate blocking',
    ['Duplicate Trophy Echo start is blocked', 'Duplicate Trophy Echo resolve is blocked', 'Duplicate Famous Gear start is blocked', 'Duplicate Famous Gear resolve is blocked', 'Active Famous Gear persists after reload', 'Active Rival Trace persists after reload', 'Completion persists after save and reload'].every(label => routeSmoke.includes(label)),
    'Runtime smoke should guard active/recovered persistence and duplicate operations.'
  );

  record(
    'Browser Revisit smoke keeps future lanes inactive while testing live lanes',
    routeSmoke.includes("!['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'].includes")
      && routeSmoke.includes('route.playable !== true && route.entryAvailable !== true && route.completionAvailable !== true'),
    'Future lanes must not become playable while live lanes are exercised.'
  );

  const failed = results.filter(result => !result.ok);
  console.log(`\nRevisit v1 contract smoke: ${results.length - failed.length}/${results.length} passing`);
  if (failed.length) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
