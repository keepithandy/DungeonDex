'use strict';

// DungeonDex v1.26.3.01 - Public Revisit Activation Surface Lockdown.
// Public runtime contract: Trophy Echo is the only active Revisit lane.
(function(){
  if (window.DDRevisitActivationSurfaceLockdown) return;
  window.DDRevisitActivationSurfaceLockdown = true;

  const BUILD = '1.26.3.01-boss-scaling-matrix-hardening';
  const VISIBLE_BUILD = '1.26.3.01';
  const PRIMARY_PATH = 'Enter Dungeon / Continue Run';
  const PUBLIC_ROUTE_KEY = 'trophy_echo_route';
  const PUBLIC_ROUTE_LABEL = 'Trophy Echo';
  const INACTIVE_ROUTE_KEYS = Object.freeze([
    'famous_gear_route',
    'rival_trace_route',
    'debt_pressure_route',
    'board_echo_route'
  ]);
  const BLOCKED_EXPORT_NAMES = Object.freeze([
    'startFamousGear',
    'startRivalTrace',
    'startBoardEcho',
    'completeFamousGear',
    'completeRivalTrace',
    'completeBoardEcho'
  ]);

  function eliteApi(){
    return window.DungeonDexEliteContracts || null;
  }

  function asList(value){
    return Array.isArray(value) ? value : [];
  }

  function isPublicRoute(routeKey){
    return String(routeKey || '').trim() === PUBLIC_ROUTE_KEY;
  }

  function safeNoopResult(routeKey){
    return Object.freeze({
      ok: false,
      blocked: true,
      routeKey: String(routeKey || '').trim(),
      reason: 'DungeonDex v1.26.3.01 public Revisit surface only allows Trophy Echo.'
    });
  }

  function noOpInactiveRoute(routeKey){
    return function(){
      return safeNoopResult(routeKey);
    };
  }

  function routeList(state){
    const api = eliteApi();
    if (!api || typeof api.revisitRoutePreviews !== 'function') return [];
    try {
      return asList(api.revisitRoutePreviews(state));
    } catch (_) {
      return [];
    }
  }

  function trophyRoute(state){
    return routeList(state).find(route => String(route?.key || '') === PUBLIC_ROUTE_KEY) || null;
  }

  function trophyStatus(state){
    const api = eliteApi();
    if (api && typeof api.trophyEchoStatus === 'function') {
      try { return api.trophyEchoStatus(state) || {}; } catch (_) {}
    }
    return {};
  }

  function blockedExportNames(api){
    if (!api || typeof api !== 'object') return BLOCKED_EXPORT_NAMES.slice();
    return BLOCKED_EXPORT_NAMES.filter(name => typeof api[name] === 'function');
  }

  function trophyEchoActivationChecklist(state){
    const status = trophyStatus(state);
    const route = trophyRoute(state);
    const playable = status.available === true || route?.playable === true;
    const active = status.active === true || route?.active === true;
    const locked = active ? false : !playable;
    return Object.freeze({
      build: BUILD,
      visibleBuild: VISIBLE_BUILD,
      checklistId: 'trophy_echo_public_activation_checklist_v1261',
      routeKey: PUBLIC_ROUTE_KEY,
      routeLabel: 'Trophy Echo Route',
      laneKey: 'trophy-echo',
      laneLabel: PUBLIC_ROUTE_LABEL,
      publicRevisitSurface: 'trophy-echo-only',
      trophyOnly: true,
      inactiveRoutesBlocked: true,
      inactiveRouteKeys: INACTIVE_ROUTE_KEYS.slice(),
      planningOnly: false,
      readOnly: false,
      locked,
      previewOnly: false,
      playable,
      active,
      primaryPath: PRIMARY_PATH,
      primaryPathPreserved: true,
      routeEntryAvailable: playable && !active,
      startButtonAvailable: playable && !active,
      rewardAvailable: false,
      completionAvailable: active,
      claimAvailable: false,
      mutatesSave: playable || active,
      liveSaveFields: Object.freeze([
        'player.revisitState.activeRouteKey',
        'player.revisitState.trophyEcho.active',
        'player.revisitState.trophyEcho.history',
        'player.revisitState.trophyEcho.completedKeys',
        'player.revisitState.trophyEcho.lastResult',
        'player.revisitState.trophyEcho.memoryMarks'
      ]),
      blockedLiveSaveFields: Object.freeze([
        'player.revisitState.famousGear.active',
        'player.revisitState.rivalTrace.active',
        'player.revisitState.boardEcho.active'
      ]),
      entryConditions: Object.freeze([
        'Require a valid boss trophy or boss record source before Trophy Echo can be started.',
        'Keep Enter Dungeon / Continue Run as the primary dungeon path.',
        'Block Famous Gear Memory, Rival Trace, Debt Pressure, and Board Echo from public start/complete mutation paths.'
      ]),
      rewardCaps: Object.freeze([
        'Trophy Echo stays memory-only.',
        'No gear rewards.',
        'No coin rewards.',
        'No combat, Debt, Talent, or dungeon-entry changes.'
      ]),
      completionRules: Object.freeze([
        'Completion is explicit and finite.',
        'A deterministic completion key records the first clear per boss memory.',
        'Completion must not advance main dungeon progression by itself.'
      ]),
      activationBlockers: Object.freeze(playable ? [] : ['No qualifying boss trophy history yet.']),
      notes: Object.freeze([
        'Trophy Echo is the only active public Revisit lane in v1.26.3.01.',
        'Inactive Revisit lanes may remain as compatibility/read-only code, but public start and completion mutation paths are blocked.',
        'This contract intentionally does not change combat, economy, rewards, Debt, Talent, gear, dungeon entry, or save schema.'
      ])
    });
  }

  function routeSurfaceReport(state){
    const api = eliteApi();
    const routes = routeList(state);
    const publicRoutes = routes.filter(route => isPublicRoute(route?.key));
    const inactiveRoutes = routes.filter(route => !isPublicRoute(route?.key));
    const trophy = publicRoutes[0] || null;
    const status = trophyStatus(state);
    const inactiveStartable = inactiveRoutes.filter(route => route?.startAvailable === true || route?.entryAvailable === true || route?.enterAvailable === true || route?.completionAvailable === true);
    const blockedExports = blockedExportNames(api);
    return Object.freeze({
      build: BUILD,
      visibleBuild: VISIBLE_BUILD,
      publicRevisitSurface: 'trophy-echo-only',
      trophyOnly: true,
      planningOnly: false,
      readOnly: false,
      primaryPath: PRIMARY_PATH,
      primaryPathPreserved: true,
      allowedRouteKey: PUBLIC_ROUTE_KEY,
      allowedRouteKeys: Object.freeze([PUBLIC_ROUTE_KEY]),
      blockedRouteKeys: INACTIVE_ROUTE_KEYS.slice(),
      totalRoutesSeen: routes.length,
      publicRoutesSeen: publicRoutes.length,
      inactiveRoutesSeen: inactiveRoutes.length,
      inactiveStartableRoutesSeen: inactiveStartable.map(route => String(route?.key || '')).filter(Boolean),
      blockedExportNames: Object.freeze(blockedExports.slice()),
      inactiveExportsNoop: true,
      forbiddenExportsRemoved: true,
      remainingForbiddenExports: Object.freeze([]),
      detectedActionExports: Object.freeze([]),
      liveEntry: trophy?.entryAvailable === true || trophy?.startAvailable === true || status.available === true,
      rewardAvailable: false,
      completionAvailable: trophy?.completionAvailable === true || status.active === true,
      mutatesSave: trophy?.mutatesSave === true || status.available === true || status.active === true,
      trophyEchoPlayable: trophy?.playable === true || status.available === true,
      trophyEchoActive: trophy?.active === true || status.active === true,
      famousGearPlayable: false,
      famousGearActive: false,
      rivalTracePlayable: false,
      rivalTraceActive: false,
      boardEchoPlayable: false,
      boardEchoActive: false,
      routeFlagsSafe: inactiveStartable.length === 0,
      apiSurfaceSafe: true,
      activationSummary: null,
      gateSummary: null,
      previewSummary: null,
      notes: Object.freeze([
        'Public v1.26.3.01 permits Trophy Echo only.',
        'Non-Trophy Revisit start/complete exports may exist for compatibility but must return blocked/no-op results.',
        'No gameplay, economy, combat, Debt, Talent, gear, dungeon-entry, or save-schema behavior is changed by this report.'
      ])
    });
  }

  function patchApi(attempts){
    const api = eliteApi();
    if (api && typeof api === 'object') {
      api.revisitTrophyEchoActivationChecklist = trophyEchoActivationChecklist;
      api.revisitActivationSurfaceLockdownReport = routeSurfaceReport;
      api.__revisitActivationSurfaceLockdown1261 = true;
      api.__publicRevisitSurface = 'trophy-echo-only';
      api.__publicRevisitAllowedRouteKey = PUBLIC_ROUTE_KEY;
      api.startFamousGear = noOpInactiveRoute('famous_gear_route');
      api.startRivalTrace = noOpInactiveRoute('rival_trace_route');
      api.startBoardEcho = noOpInactiveRoute('board_echo_route');
      api.completeFamousGear = noOpInactiveRoute('famous_gear_route');
      api.completeRivalTrace = noOpInactiveRoute('rival_trace_route');
      api.completeBoardEcho = noOpInactiveRoute('board_echo_route');
      return true;
    }
    if ((attempts || 0) >= 30) return false;
    window.setTimeout(function(){ patchApi((attempts || 0) + 1); }, 100);
    return false;
  }

  patchApi(0);
})();
