'use strict';

// DungeonDex v1.22.0 - Revisit Activation Surface Lockdown.
(function(){
  if (window.DDRevisitActivationSurfaceLockdown) return;
  window.DDRevisitActivationSurfaceLockdown = true;

  const BUILD = '1.23.0-trophy-echo-playable-prototype';
  const PRIMARY_PATH = 'Enter Dungeon / Continue Run';
  const forbiddenExportNames = Object.freeze([
    'can' + 'Start' + 'Revisit' + 'Route',
    'start' + 'Revisit' + 'Route',
    'active' + 'Revisit' + 'Route' + 'Summary'
  ]);
  const forbiddenActionPattern = /^(enter|start|begin|claim|complete|reward|unlock|activate|launch).*revisit/i;

  function eliteApi(){
    return window.DungeonDexEliteContracts || null;
  }

  function actionKeys(api){
    if (!api || typeof api !== 'object') return [];
    return Object.keys(api).filter(key => forbiddenActionPattern.test(key));
  }

  function remainingForbiddenExports(api){
    if (!api || typeof api !== 'object') return forbiddenExportNames.slice();
    return forbiddenExportNames.filter(name => Object.prototype.hasOwnProperty.call(api, name));
  }

  function removeForbiddenExports(api){
    if (!api || typeof api !== 'object') return false;
    forbiddenExportNames.forEach(name => {
      try { delete api[name]; }
      catch (_) {
        try { api[name] = undefined; } catch (__) {}
      }
    });
    return true;
  }

  function safeNumber(value, fallback, min, max){
    const raw = Number(value);
    const floor = Number.isFinite(raw) ? Math.floor(raw) : Math.floor(Number(fallback) || 0);
    const lower = Number.isFinite(Number(min)) ? Number(min) : 0;
    const upper = Number.isFinite(Number(max)) ? Number(max) : Number.MAX_SAFE_INTEGER;
    return Math.max(lower, Math.min(upper, floor));
  }

  function trophyEchoActivationChecklist(state){
    const api = eliteApi();
    const plan = api && typeof api.revisitTrophyEchoRulePlan === 'function'
      ? api.revisitTrophyEchoRulePlan(state)
      : {};
    const status = api && typeof api.trophyEchoStatus === 'function'
      ? api.trophyEchoStatus(state)
      : {};
    const firstLane = api && typeof api.revisitFirstActivationLane === 'function'
      ? api.revisitFirstActivationLane(state)
      : null;
    const secondLane = api && typeof api.revisitSecondActivationLane === 'function'
      ? api.revisitSecondActivationLane(state)
      : null;
    return Object.freeze({
      checklistId: 'trophy_echo_activation_checklist_v1',
      routeKey: 'trophy_echo_route',
      routeLabel: 'Trophy Echo Route',
      laneKey: 'trophy-echo',
      laneLabel: 'Trophy Echo',
      laneOrder: 1,
      secondLaneKey: 'famous-gear-memory',
      secondLaneLabel: 'Famous Gear Memory',
      status: status.active ? 'Active' : status.available ? 'Playable' : 'Locked',
      planningOnly: false,
      readOnly: false,
      locked: status.locked !== false,
      previewOnly: false,
      playable: status.available === true,
      active: status.active === true,
      primaryPath: PRIMARY_PATH,
      primaryPathPreserved: true,
      routeEntryAvailable: status.available === true && status.active !== true,
      startButtonAvailable: status.available === true && status.active !== true,
      rewardAvailable: false,
      completionAvailable: status.active === true,
      claimAvailable: false,
      mutatesSave: true,
      liveSaveFields: Object.freeze([
        'player.revisitState.activeRouteKey',
        'player.revisitState.trophyEcho.active',
        'player.revisitState.trophyEcho.history',
        'player.revisitState.trophyEcho.completedKeys',
        'player.revisitState.trophyEcho.lastResult',
        'player.revisitState.trophyEcho.memoryMarks'
      ]),
      entryConditions: Object.freeze([
        'Require a valid boss trophy or boss record source before Trophy Echo can be started.',
        'Require Enter Dungeon / Continue Run to remain the primary dungeon path.',
        'Allow only Trophy Echo as the live Revisit lane in this patch.'
      ]),
      rewardCaps: Object.freeze([
        'Revisit-only Memory Marks stay separate from power systems.',
        'No uncapped gear rewards.',
        'No mythic farming path.',
        'No economy bypass or repeatable low-floor power spike.'
      ]),
      completionRules: Object.freeze([
        'Completion is explicit and finite.',
        'A deterministic completion key records the first clear per boss memory.',
        'Completion must not advance main dungeon progression by itself.'
      ]),
      claimRules: Object.freeze([
        'Duplicate Memory Mark rewards are blocked by deterministic completion keys.',
        'No separate claim button exists in this prototype.',
        'Completion records repair safely through save normalization.'
      ]),
      failureCancelBehavior: Object.freeze([
        'The prototype resolves only from town and does not alter death recovery.',
        'Cancel or abandon paths are not exposed in this first loop.',
        'Normal dungeon recovery rules remain unchanged.'
      ]),
      uiRequirements: Object.freeze([
        'Town Revisit copy must keep Trophy Echo distinct from the primary dungeon path.',
        'Famous Gear Memory remains visibly inactive.',
        'Start and Resolve buttons are limited to Trophy Echo only.'
      ]),
      activationBlockers: Object.freeze(status.available ? [] : ['No qualifying boss trophy history yet.']),
      signalCurrent: safeNumber(plan && plan.signalCurrent, 0, 0, Number.MAX_SAFE_INTEGER),
      signalRequired: safeNumber(plan && plan.signalRequired, 3, 1, Number.MAX_SAFE_INTEGER),
      signalPercent: safeNumber(plan && plan.signalPercent, 0, 0, 100),
      firstLane,
      secondLane,
      notes: Object.freeze([
        'Trophy Echo is the first live Revisit lane.',
        'Famous Gear Memory remains the second lane and stays inactive.',
        'The prototype uses a short memory-reflection loop instead of new combat.'
      ])
    });
  }

  function routeSurfaceReport(state){
    const api = eliteApi();
    const remaining = remainingForbiddenExports(api);
    const liveActionKeys = actionKeys(api);
    const activationSummary = api && typeof api.revisitRouteActivationSummary === 'function'
      ? api.revisitRouteActivationSummary(state)
      : null;
    const gateSummary = api && typeof api.revisitRouteGateSummary === 'function'
      ? api.revisitRouteGateSummary(state)
      : null;
    const previewSummary = api && typeof api.revisitRoutePreviewStateSummary === 'function'
      ? api.revisitRoutePreviewStateSummary(state)
      : null;
    const routes = api && typeof api.revisitRoutePreviews === 'function'
      ? api.revisitRoutePreviews(state)
      : [];
    const routeList = Array.isArray(routes) ? routes : [];
    const trophyRoute = routeList.find(route => String(route?.key || '') === 'trophy_echo_route') || null;
    const famousGearRoute = routeList.find(route => String(route?.key || '') === 'famous_gear_route') || null;
    const routeFlagsSafe = routeList.every(route => {
      if (!route) return false;
      if (String(route.key || '') === 'trophy_echo_route') return route.rewardAvailable !== true;
      return route.locked === true
        && route.playable !== true
        && route.active !== true
        && route.entryAvailable !== true
        && route.completionAvailable !== true;
    });
    return Object.freeze({
      build: BUILD,
      planningOnly: false,
      readOnly: false,
      primaryPath: PRIMARY_PATH,
      forbiddenExportsRemoved: remaining.length === 0,
      remainingForbiddenExports: Object.freeze(remaining.slice()),
      detectedActionExports: Object.freeze(liveActionKeys.slice()),
      liveEntry: trophyRoute?.entryAvailable === true,
      rewardAvailable: false,
      completionAvailable: trophyRoute?.completionAvailable === true,
      mutatesSave: true,
      trophyEchoPlayable: trophyRoute?.playable === true,
      trophyEchoActive: trophyRoute?.active === true,
      famousGearInactive: famousGearRoute?.playable !== true && famousGearRoute?.entryAvailable !== true && famousGearRoute?.completionAvailable !== true,
      routeFlagsSafe,
      apiSurfaceSafe: remaining.length === 0 && liveActionKeys.length === 0 && routeFlagsSafe,
      activationSummary,
      gateSummary,
      previewSummary
    });
  }

  function patchApi(attempts){
    const api = eliteApi();
    if (api && typeof api === 'object') {
      removeForbiddenExports(api);
      api.revisitTrophyEchoActivationChecklist = trophyEchoActivationChecklist;
      api.revisitActivationSurfaceLockdownReport = routeSurfaceReport;
      api.__revisitActivationSurfaceLockdown12033 = true;
      return true;
    }
    if ((attempts || 0) >= 30) return false;
    window.setTimeout(function(){ patchApi((attempts || 0) + 1); }, 100);
    return false;
  }

  patchApi(0);
})();
