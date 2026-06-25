'use strict';

// DungeonDex v1.21.1 - Revisit Activation Surface Lockdown.
(function(){
  if (window.DDRevisitActivationSurfaceLockdown) return;
  window.DDRevisitActivationSurfaceLockdown = true;

  const BUILD = '1.21.1-hunter-board-clarity-spend-smoke-hardening';
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
      status: 'Planning only',
      planningOnly: true,
      readOnly: true,
      locked: true,
      previewOnly: true,
      playable: false,
      active: false,
      primaryPath: PRIMARY_PATH,
      primaryPathPreserved: true,
      routeEntryAvailable: false,
      startButtonAvailable: false,
      rewardAvailable: false,
      completionAvailable: false,
      claimAvailable: false,
      mutatesSave: false,
      futureSaveFields: Object.freeze([
        'future player.revisitState.activeRouteKey only after explicit activation',
        'future player.revisitState.sourceTrophyId for deterministic boss-history binding',
        'future player.revisitState.claimKeys for duplicate-prevention records',
        'future player.revisitState.completedRouteKeys only after completion rules exist'
      ]),
      entryConditions: Object.freeze([
        'Require an explicit future activation patch before any route can be entered.',
        'Require a valid boss trophy or boss record source before Trophy Echo can be considered.',
        'Require Enter Dungeon / Continue Run to remain the primary dungeon path.',
        'Require route preview and gate state to stay locked until activation guardrails pass.'
      ]),
      rewardCaps: Object.freeze([
        'Memory, trophy, and Dex identity rewards should be considered before power rewards.',
        'No uncapped gear rewards.',
        'No mythic farming path.',
        'No economy bypass or repeatable low-floor power spike.'
      ]),
      completionRules: Object.freeze([
        'Future completion must be explicit, finite, and recorded once per deterministic route source.',
        'Failure or extraction behavior must be defined before activation.',
        'Completion must not advance main dungeon progression by itself.'
      ]),
      claimRules: Object.freeze([
        'Future claims must use deterministic keys tied to the source boss trophy or record.',
        'Duplicate claims must be blocked before any reward is exposed.',
        'Claim records must be repaired safely if malformed.'
      ]),
      failureCancelBehavior: Object.freeze([
        'Future route failure must return safely to normal town/run recovery rules.',
        'Cancel or abandon behavior must not create rewards, completion, or duplicate claims.',
        'Death handling must not bypass existing dungeon recovery rules.'
      ]),
      uiLockRequirements: Object.freeze([
        'No Revisit start, enter, complete, claim, unlock, or reward button may appear in this planning patch.',
        'Town Revisit copy must say planned, locked, preview, or unavailable.',
        'Route previews must remain read-only and subordinate to Enter Dungeon / Continue Run.'
      ]),
      activationBlockers: Object.freeze([
        'No live route entry surface exists.',
        'No reward contract exists.',
        'No completion contract exists.',
        'No save mutation contract exists.',
        'No UI control exists.'
      ]),
      signalCurrent: safeNumber(plan && plan.signalCurrent, 0, 0, Number.MAX_SAFE_INTEGER),
      signalRequired: safeNumber(plan && plan.signalRequired, 3, 1, Number.MAX_SAFE_INTEGER),
      signalPercent: safeNumber(plan && plan.signalPercent, 0, 0, 100),
      firstLane,
      secondLane,
      notes: Object.freeze([
        'Trophy Echo remains the first planned Revisit lane.',
        'Famous Gear Memory remains the second planned Revisit lane.',
        'This checklist is metadata only and does not activate Revisit gameplay.'
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
    const routeFlagsSafe = routeList.every(route => route
      && route.locked === true
      && route.playable !== true
      && route.active !== true
      && route.entryAvailable !== true
      && route.rewardAvailable !== true
      && route.completionAvailable !== true);
    return Object.freeze({
      build: BUILD,
      planningOnly: true,
      readOnly: true,
      primaryPath: PRIMARY_PATH,
      forbiddenExportsRemoved: remaining.length === 0,
      remainingForbiddenExports: Object.freeze(remaining.slice()),
      detectedActionExports: Object.freeze(liveActionKeys.slice()),
      liveEntry: false,
      rewardAvailable: false,
      completionAvailable: false,
      mutatesSave: false,
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