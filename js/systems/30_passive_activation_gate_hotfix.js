'use strict';

// DungeonDex v1.21.1 hotfix - passive activation gate verification layer.
(function(){
  if (window.DDPassiveActivationGateHotfix) return;
  window.DDPassiveActivationGateHotfix = true;

  const BUILD = '1.21.1-hunter-board-clarity-spend-smoke-hardening';
  const REQUIRED_BLOCKED_SYSTEMS = Object.freeze([
    'combat',
    'economy',
    'rewards',
    'progression',
    'revisit',
    'debt math',
    'pressure',
    'repayment',
    'monsters',
    'gear',
    'scaling'
  ]);

  function clonePlain(value){
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return Array.isArray(value) ? [] : {};
    }
  }

  function blockedSystemsComplete(entry){
    const blocked = Array.isArray(entry?.blockedSystems)
      ? entry.blockedSystems.map(value => String(value || '').toLowerCase())
      : [];
    return REQUIRED_BLOCKED_SYSTEMS.every(system => blocked.includes(system));
  }

  function summarizeGateEntry(entry){
    const rendererWired = entry?.liveRendererWired === true;
    const helperReady = entry?.contractHelperPresent === true && entry?.displayCopyHelperPresent === true && entry?.smokeGuarded === true;
    const nonMutating = entry?.mutatesSave === false && entry?.appliesGameplayEffect === false;
    return Object.freeze({
      nodeKey: String(entry?.nodeKey || ''),
      helperReady,
      liveRendererWired: rendererWired,
      liveDisplayReady: helperReady && rendererWired,
      canActivateNow: entry?.canActivateNow === true,
      blockedSystemsComplete: blockedSystemsComplete(entry),
      nonMutating,
      blockedReason: String(entry?.activationBlockedReason || '')
    });
  }

  function verificationFromGate(gate){
    const passives = Array.isArray(gate?.passives) ? gate.passives.map(summarizeGateEntry) : [];
    const debt = passives.find(entry => entry.nodeKey === 'debt_collector_clarity') || null;
    const hunter = passives.find(entry => entry.nodeKey === 'hunter_board_clarity') || null;
    const placeholders = passives.filter(entry => entry.nodeKey && entry.nodeKey !== 'hunter_board_clarity' && entry.nodeKey !== 'debt_collector_clarity');
    return Object.freeze({
      build: BUILD,
      ok: passives.length >= 13
        && passives.every(entry => entry.nonMutating && entry.blockedSystemsComplete && entry.canActivateNow === false)
        && !!hunter
        && hunter.liveDisplayReady === true
        && !!debt
        && debt.helperReady === true
        && debt.liveRendererWired === false
        && debt.liveDisplayReady === false
        && placeholders.every(entry => entry.liveRendererWired === false && entry.liveDisplayReady === false),
      dryRun: true,
      mutatesSave: false,
      appliesGameplayEffect: false,
      liveDisplayReadyCount: passives.filter(entry => entry.liveDisplayReady).length,
      debtCollectorRendererWired: debt ? debt.liveRendererWired : false,
      guardedPassiveCount: passives.filter(entry => entry.liveRendererWired === false).length,
      entries: Object.freeze(passives)
    });
  }

  function patchApi(api){
    if (!api || api.__passiveActivationGateHotfix12032) return false;
    if (typeof api.talentPassiveActivationGateDryRun !== 'function') return false;

    const originalGate = api.talentPassiveActivationGateDryRun.bind(api);
    api.talentPassiveActivationGateDryRun = function(state){
      const gate = originalGate(state);
      const verification = verificationFromGate(gate);
      return Object.freeze({
        ...clonePlain(gate),
        hotfixVerified: verification.ok === true,
        liveDisplayReadyCount: verification.liveDisplayReadyCount,
        debtCollectorRendererWired: verification.debtCollectorRendererWired,
        guardedPassiveCount: verification.guardedPassiveCount,
        verification
      });
    };
    api.passiveActivationGateVerification = function(state){
      return verificationFromGate(originalGate(state));
    };
    api.__passiveActivationGateHotfix12032 = true;
    return true;
  }

  function patchWhenReady(attempts){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    if (patchApi(api)) return;
    if ((attempts || 0) >= 20) return;
    window.setTimeout(function(){ patchWhenReady((attempts || 0) + 1); }, 100);
  }

  patchWhenReady(0);
})();
