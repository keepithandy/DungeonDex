#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALLOWED_ROUTE = 'trophy_echo_route';
const BLOCKED_ROUTES = ['famous_gear_route', 'rival_trace_route', 'debt_pressure_route', 'board_echo_route'];

function cleanDisplayText(value, fallback = '') {
  return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
}

const revisitSource = await readFile(path.join(ROOT, 'js/systems/44_revisit_lowfire_board_slot.js'), 'utf8');
const lockdownSource = await readFile(path.join(ROOT, 'js/systems/31_revisit_activation_surface_lockdown.js'), 'utf8');
const bindingSource = await readFile(path.join(ROOT, 'js/systems/12_render_bindings_boot.js'), 'utf8');

assert.match(lockdownSource, /1\.26\.1-public-readiness/, 'lockdown report should use the v1.26.1 public build key');
assert.match(lockdownSource, /trophy-echo-only/, 'lockdown report should identify the public Trophy Echo-only surface');
assert.doesNotMatch(lockdownSource, /v1\.23\.4-boss-trophy-v1-completion/, 'lockdown report should not keep the stale v1.23.4 build marker');
assert.doesNotMatch(lockdownSource, /Famous Gear Memory is the second live Revisit lane/i, 'lockdown report should not describe Famous Gear as a live public lane');
assert.match(revisitSource, /DD_PUBLIC_REVISIT_ALLOWED_ROUTE\s*=\s*'trophy_echo_route'/, 'source-slot module should declare Trophy Echo as the only public route');
assert.match(revisitSource, /wrapPublicRevisitGate/, 'source-slot module should wrap the public start mutation path');
assert.match(revisitSource, /installBlockedCompleter/, 'source-slot module should block inactive completion paths');
assert.match(bindingSource, /\[data-start-revisit\]/, 'dynamic binding still uses data-start-revisit buttons');

const calls = [];
const api = {
  trophyEchoStatus() {
    return {
      available: true,
      locked: false,
      active: false,
      historyCount: 1,
      memoryMarks: 0,
      completedCount: 0,
      source: {
        bossName: 'Hollow King',
        trophyName: 'Hollow Crown'
      }
    };
  },
  revisitRoutePreviews() {
    return [
      { key: ALLOWED_ROUTE, title: 'Trophy Echo Route', playable: true, active: false, locked: false, entryAvailable: true, startAvailable: true, completionAvailable: false, rewardAvailable: false, mutatesSave: true },
      { key: 'famous_gear_route', title: 'Famous Gear Memory Route', playable: true, locked: false, entryAvailable: true, startAvailable: true, mutatesSave: true },
      { key: 'rival_trace_route', title: 'Rival Trace Route', playable: true, locked: false, entryAvailable: true, startAvailable: true, mutatesSave: true },
      { key: 'board_echo_route', title: 'Board Echo Route', playable: true, locked: false, entryAvailable: true, startAvailable: true, completionAvailable: true, mutatesSave: true }
    ];
  },
  revisitRouteSummary() {
    return { total: 4, playable: 4, finishedRoutes: [], unfinishedRoutes: [] };
  },
  startFamousGear() {
    calls.push('api:startFamousGear');
    return { ok: true };
  },
  startRivalTrace() {
    calls.push('api:startRivalTrace');
    return { ok: true };
  },
  completeFamousGear() {
    calls.push('api:completeFamousGear');
    return { ok: true };
  },
  completeRivalTrace() {
    calls.push('api:completeRivalTrace');
    return { ok: true };
  },
  completeBoardEcho() {
    calls.push('api:completeBoardEcho');
    return { ok: true };
  }
};

const sandbox = {
  console,
  S: { player: { revisitState: {} } },
  cleanDisplayText,
  escapeHtml,
  window: {
    DungeonDexEliteContracts: api,
    startRevisitRoute(_state, routeKey) {
      calls.push(`global:start:${routeKey}`);
      return { ok: true, routeKey };
    },
    canStartRevisitRoute(_state, routeKey) {
      calls.push(`global:canStart:${routeKey}`);
      return true;
    },
    canEnterRevisitRoute(_state, routeKey) {
      calls.push(`global:canEnter:${routeKey}`);
      return true;
    },
    completeFamousGearRoute() {
      calls.push('global:completeFamousGearRoute');
      return { ok: true };
    },
    completeRivalTraceRoute() {
      calls.push('global:completeRivalTraceRoute');
      return { ok: true };
    },
    completeBoardEchoRoute() {
      calls.push('global:completeBoardEchoRoute');
      return { ok: true };
    }
  }
};
sandbox.window.window = sandbox.window;

vm.runInNewContext(revisitSource, sandbox, { filename: '44_revisit_lowfire_board_slot.js' });
vm.runInNewContext(lockdownSource, sandbox, { filename: '31_revisit_activation_surface_lockdown.js' });

const markup = sandbox.window.earlierDungeonRevisitMarkup();
assert.match(markup, /data-start-revisit="trophy_echo_route"/, 'public DOM markup should expose Start Trophy Echo when available');
for (const route of BLOCKED_ROUTES) {
  assert.doesNotMatch(markup, new RegExp(`data-start-revisit=["']${route}["']`), `public DOM markup must not expose ${route}`);
}
assert.doesNotMatch(markup, /data-complete-famous-gear|data-complete-rival-trace|data-complete-board-echo/, 'public DOM markup must not expose inactive Revisit completion buttons');

calls.length = 0;
const trophyStart = sandbox.window.startRevisitRoute(sandbox.S, ALLOWED_ROUTE);
assert.equal(trophyStart?.ok, true, 'Trophy Echo start should pass through the public start gate');
assert.deepEqual(calls, [`global:start:${ALLOWED_ROUTE}`], 'Trophy Echo start should call the original global start function once');

for (const route of BLOCKED_ROUTES) {
  calls.length = 0;
  const blockedStart = sandbox.window.startRevisitRoute(sandbox.S, route);
  assert.equal(blockedStart?.blocked, true, `${route} start should be blocked`);
  assert.equal(calls.length, 0, `${route} start should not call the original global start function`);
  assert.equal(sandbox.window.canStartRevisitRoute(sandbox.S, route), false, `${route} canStart should be false`);
  assert.equal(sandbox.window.canEnterRevisitRoute(sandbox.S, route), false, `${route} canEnter should be false`);
}

for (const [name, route] of Object.entries({
  completeFamousGearRoute: 'famous_gear_route',
  completeRivalTraceRoute: 'rival_trace_route',
  completeBoardEchoRoute: 'board_echo_route'
})) {
  calls.length = 0;
  const result = sandbox.window[name](sandbox.S);
  assert.equal(result?.blocked, true, `${name} should return a blocked result`);
  assert.equal(result?.routeKey, route, `${name} should report its blocked route`);
  assert.equal(calls.length, 0, `${name} should not call the original inactive completer`);
}

for (const name of ['startFamousGear', 'startRivalTrace', 'completeFamousGear', 'completeRivalTrace', 'completeBoardEcho']) {
  calls.length = 0;
  const result = sandbox.window.DungeonDexEliteContracts[name](sandbox.S);
  assert.equal(result?.blocked, true, `${name} exported API should be blocked/no-op`);
  assert.equal(calls.length, 0, `${name} exported API should not call the original mutating function`);
}

const filteredRoutes = sandbox.window.DungeonDexEliteContracts.revisitRoutePreviews(sandbox.S);
assert.equal(filteredRoutes.length, 1, 'public route preview API should return only Trophy Echo');
assert.equal(filteredRoutes[0]?.key, ALLOWED_ROUTE, 'public route preview API should preserve Trophy Echo');

const summary = sandbox.window.DungeonDexEliteContracts.revisitRouteSummary(sandbox.S);
assert.equal(summary.total, 1, 'public route summary should count only Trophy Echo');
assert.equal(summary.playable, 1, 'public route summary should preserve Trophy Echo playable state');

const report = sandbox.window.DungeonDexEliteContracts.revisitActivationSurfaceLockdownReport(sandbox.S);
assert.equal(report.publicRevisitSurface, 'trophy-echo-only', 'lockdown report should identify Trophy-only public surface');
assert.equal(report.trophyOnly, true, 'lockdown report should assert Trophy-only enforcement');
assert.deepEqual(report.allowedRouteKeys, [ALLOWED_ROUTE], 'lockdown report should allow only Trophy Echo');
assert.equal(report.apiSurfaceSafe, true, 'lockdown report should mark API surface as safe after no-op export wrapping');

console.log('PASS: v1.26.1 public Revisit is Trophy Echo-only across DOM markup, route previews, global mutation functions, and exported API methods.');
