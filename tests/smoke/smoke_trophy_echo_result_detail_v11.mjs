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
  const [detail, app, index, serviceWorker, trophySurface] = await Promise.all([
    readFile(path.join(ROOT, 'js/systems/45_trophy_echo_result_detail.js'), 'utf8'),
    readFile(path.join(ROOT, 'app.js'), 'utf8'),
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
    readFile(path.join(ROOT, 'sw.js'), 'utf8'),
    readFile(path.join(ROOT, 'js/systems/44_revisit_lowfire_board_slot.js'), 'utf8')
  ]);

  record(
    'Trophy Echo result detail extension is present',
    has(detail, 'Trophy Echo v1.1 completed-result detail polish')
      && has(detail, 'window.DDTrophyEchoResultDetail')
      && has(detail, 'version: 1'),
    'js/systems/45_trophy_echo_result_detail.js'
  );

  record(
    'Result detail reads existing Trophy Echo lastResult only',
    has(detail, 'player.revisitState')
      && has(detail, 'trophyEcho.lastResult')
      && has(detail, "return result && typeof result === 'object' ? result : null;")
      && notHas(detail, 'trophyEcho.lastResult =')
      && notHas(detail, 'trophyEcho.history')
      && notHas(detail, 'memoryMarks =')
      && notHas(detail, 'completedKeys['),
    'no Trophy Echo state writes'
  );

  record(
    'Town Trophy Echo result block is the only target',
    has(detail, "document.querySelector('.revisit-echo-card .revisit-echo-result')")
      && has(trophySurface, '<div class="small revisit-echo-result"><strong>Last Result:</strong>')
      && notHas(detail, 'querySelectorAll('),
    'focused DOM target'
  );

  record(
    'Completed-result detail exposes boss, trophy, record, mark, and reflection copy',
    [
      '<strong>Last Trophy Echo:</strong>',
      'Boss: ',
      'Trophy: ',
      'Best depth: ',
      'Record: ',
      'Memory Mark recorded',
      'Memory Mark already recorded',
      'Resolved: ',
      'reflection'
    ].every(needle => has(detail, needle)),
    'player-facing completed-result detail fields'
  );

  record(
    'Extension remains UI-only and does not add Revisit actions',
    [
      'data-start-revisit=',
      'data-complete-trophy-echo=',
      'data-complete-famous-gear=',
      'data-complete-rival-trace=',
      'data-complete-board-echo=',
      'pushLog(',
      'pushCombat(',
      'award',
      '.rewardMark =',
      '.rewardMark=',
      'memoryMarks +'
    ].every(needle => notHas(detail, needle)),
    'no start/resolve/reward/state mutation hooks'
  );

  record(
    'Old unfinished Revisit lane starts remain absent from result detail extension',
    [
      'Start Famous Gear Memory',
      'Start Rival Trace',
      'Start Board Echo',
      'Start Debt Pressure',
      'famous_gear_route',
      'rival_trace_route',
      'board_echo_route',
      'debt_pressure_route'
    ].every(needle => notHas(detail, needle)),
    'extension is Trophy Echo-only'
  );

  record(
    'Trophy Echo surface is direct while result detail remains deferred',
    has(index, 'src="./js/systems/44_revisit_lowfire_board_slot.js?build=')
      && notHas(app, "44_revisit_lowfire_board_slot.js?build=")
      && has(app, "45_trophy_echo_result_detail.js?build=")
      && has(app, "'DDTrophyEchoResultDetail'")
      && app.indexOf('45_trophy_echo_result_detail.js?build=') >= 0,
    'single surface owner and deferred detail loader'
  );

  record(
    'Service worker precaches the result detail extension',
    has(serviceWorker, '`./js/systems/45_trophy_echo_result_detail.js?build=${BUILD_QS}`'),
    'sw.js asset list'
  );

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nTrophy Echo v1.1 result detail smoke: ${passed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
