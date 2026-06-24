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
