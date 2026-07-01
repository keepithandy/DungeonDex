'use strict';

// Debt Collector Under Collection hardening.
// Debt-owned gameplay behavior only: no Talent passive renderer activation.
(function(){
  if (window.DDDebtUnderCollectionHardening) return;
  window.DDDebtUnderCollectionHardening = true;

  const THRESHOLD = 3;
  const PRESSURE_RELIEF_MAX = 1;

  function toInt(value){ return Math.max(0, Math.floor(Number(value) || 0)); }
  function debtState(state){
    const source = state && state.player && state.player.debtCollector && typeof state.player.debtCollector === 'object' && !Array.isArray(state.player.debtCollector)
      ? state.player.debtCollector
      : {};
    const balanceCopper = toInt(source.balanceCopper);
    return {
      active: balanceCopper > 0,
      balanceCopper,
      pressure: balanceCopper > 0 ? toInt(source.pressure) : 0,
      lastVisitAt: String(source.lastVisitAt || ''),
      notes: Array.isArray(source.notes) ? source.notes.slice() : []
    };
  }
  function ensureDebt(state){
    if (!state || !state.player) return debtState(null);
    const normalized = debtState(state);
    state.player.debtCollector = normalized;
    return state.player.debtCollector;
  }
  function highPressureState(state){
    const debt = debtState(state);
    const active = debt.balanceCopper > 0 && debt.pressure >= THRESHOLD;
    return {
      contractOwner: 'DungeonDexDebtCollector',
      contractVersion: 1,
      stateName: active ? 'Under Collection' : 'Standard Terms',
      highPressureThreshold: THRESHOLD,
      highPressureActive: active,
      borrowingBlockedByPressure: active,
      activeDebt: debt.balanceCopper > 0,
      balanceCopper: debt.balanceCopper,
      pressure: debt.balanceCopper > 0 ? debt.pressure : 0,
      derivedFromPressure: true,
      savedState: false,
      mutatesState: false,
      mutatesSave: false,
      recoveryCopy: active ? `Under Collection: borrowing is paused until pressure drops below ${THRESHOLD}.` : '',
      repaymentCopy: active ? 'Repay to ease pressure and restore normal terms.' : '',
      liveRendererWired: false
    };
  }
  function borrowContract(state, amount){
    const debt = debtState(state);
    const high = highPressureState(state);
    const requestedBorrowCopper = amount === undefined ? 0 : toInt(amount);
    const validAmount = amount === undefined || requestedBorrowCopper > 0;
    const enabled = validAmount && !high.borrowingBlockedByPressure;
    return {
      contractOwner: 'DungeonDexDebtCollector',
      contractVersion: 1,
      actionId: 'debt_collector_borrow',
      actionLabel: 'Borrow Debt',
      liveGameplayAction: true,
      borrowingActionLive: true,
      panelActionWired: true,
      enabled,
      blockedReason: enabled ? '' : !validAmount ? 'invalid_amount' : 'under_collection',
      requestedBorrowCopper,
      balanceCopper: debt.balanceCopper,
      pressure: debt.pressure,
      highPressureThreshold: THRESHOLD,
      highPressureActive: high.highPressureActive,
      borrowingBlockedByPressure: high.borrowingBlockedByPressure,
      appliesEffect: enabled,
      mutatesStateOnAction: enabled,
      mutatesSave: enabled,
      affectsDebtBalance: enabled,
      affectsWallet: enabled,
      debtMath: enabled,
      borrowing: true,
      repayment: false,
      combat: false,
      rewards: false,
      progression: false,
      revisit: false,
      trophyEcho: false,
      talentPointEconomy: false,
      talentEarning: false,
      talentSpending: false,
      liveRendererWired: false
    };
  }
  function pressurePreview(debt, maxRepayCopper){
    if (!debt || debt.balanceCopper <= 0 || maxRepayCopper <= 0) return debt ? debt.pressure : 0;
    if (maxRepayCopper >= debt.balanceCopper) return 0;
    return Math.max(0, debt.pressure - Math.min(PRESSURE_RELIEF_MAX, debt.pressure));
  }
  function decorateRepaymentContract(baseContract, state){
    const debt = debtState(state);
    const wallet = toInt(state && state.player && state.player.gold);
    const maxRepayCopper = Math.max(0, Math.min(wallet, debt.balanceCopper));
    const preview = pressurePreview(debt, maxRepayCopper);
    return {
      ...(baseContract && typeof baseContract === 'object' ? baseContract : {}),
      pressureBefore: debt.pressure,
      pressureAfterSuccessfulRepaymentPreview: preview,
      pressureReliefEnabled: true,
      pressureReliefMax: PRESSURE_RELIEF_MAX,
      affectsPressure: true,
      repaymentWouldExitHighPressure: debt.balanceCopper > 0 && debt.pressure >= THRESHOLD && preview < THRESHOLD,
      highPressureThreshold: THRESHOLD,
      highPressureActive: debt.balanceCopper > 0 && debt.pressure >= THRESHOLD,
      liveRendererWired: false
    };
  }
  function wrapApi(){
    const api = window.DungeonDexDebtCollector;
    if (!api || api.__underCollectionWrapped) return api;
    const oldBorrow = typeof api.borrow === 'function' ? api.borrow.bind(api) : null;
    const oldRepay = typeof api.repay === 'function' ? api.repay.bind(api) : null;
    const oldRepaymentContract = typeof api.debtCollectorRepaymentContract === 'function' ? api.debtCollectorRepaymentContract.bind(api) : null;
    const oldDisplaySummary = typeof api.debtCollectorDisplaySummary === 'function' ? api.debtCollectorDisplaySummary.bind(api) : null;
    const oldRendererSource = typeof api.debtCollectorRendererCopySource === 'function' ? api.debtCollectorRendererCopySource.bind(api) : null;
    const oldSmoke = typeof api.smoke === 'function' ? api.smoke.bind(api) : null;

    api.debtCollectorHighPressureState = highPressureState;
    api.debtCollectorBorrowContract = borrowContract;
    api.borrow = function(state, amount){
      if (!state || !state.player) return { ok:false, reason:'missing state' };
      const requestedBorrowCopper = toInt(amount);
      if (requestedBorrowCopper <= 0) return { ok:false, reason:'invalid amount' };
      const debt = ensureDebt(state);
      const contract = borrowContract(state, requestedBorrowCopper);
      if (contract.borrowingBlockedByPressure) {
        return { ok:false, reason:'under_collection', blockedByPressure:true, highPressureThreshold:THRESHOLD, pressure:debt.pressure, balanceCopper:debt.balanceCopper };
      }
      return oldBorrow ? oldBorrow(state, requestedBorrowCopper) : { ok:false, reason:'missing borrow api' };
    };
    api.repay = function(state){
      if (!state || !state.player) return { ok:false, reason:'missing state' };
      const debt = ensureDebt(state);
      const pressureBefore = debt.pressure;
      const balanceBefore = debt.balanceCopper;
      const result = oldRepay ? oldRepay(state) : { ok:false, reason:'missing repay api' };
      const after = ensureDebt(state);
      if (result && result.ok && balanceBefore > 0 && after.balanceCopper > 0) {
        const pressureRelief = Math.min(PRESSURE_RELIEF_MAX, pressureBefore);
        after.pressure = Math.max(0, pressureBefore - pressureRelief);
      }
      if (result && result.ok) {
        result.pressureBefore = pressureBefore;
        result.pressureAfter = after.pressure;
        result.pressureRelief = Math.max(0, pressureBefore - after.pressure);
      }
      return result;
    };
    api.debtCollectorRepaymentContract = function(state){ return decorateRepaymentContract(oldRepaymentContract ? oldRepaymentContract(state) : null, state); };
    api.debtCollectorDisplaySummary = function(state){
      const summary = oldDisplaySummary ? oldDisplaySummary(state) : { title:'Debt Collector', summary:'', statusLabel:'No Debt' };
      const high = highPressureState(state);
      return { ...summary, statusLabel: high.highPressureActive ? 'Under Collection' : summary.statusLabel, highPressureThreshold: THRESHOLD, highPressureActive: high.highPressureActive, borrowingBlockedByPressure: high.borrowingBlockedByPressure };
    };
    api.debtCollectorRendererCopySource = function(state){
      const source = oldRendererSource ? oldRendererSource(state) : {};
      const high = highPressureState(state);
      return { ...source, statusText: high.highPressureActive ? 'Under Collection' : source.statusText, collectionText: high.recoveryCopy, recoveryText: high.repaymentCopy, highPressureThreshold: THRESHOLD, highPressureActive: high.highPressureActive, borrowingBlockedByPressure: high.borrowingBlockedByPressure };
    };
    api.smoke = function(){
      const base = oldSmoke ? oldSmoke() : { ok:true, checks:{} };
      const blocked = { player:{ gold:100, debtCollector:{ active:true, balanceCopper:1000, pressure:3, lastVisitAt:'', notes:[] } } };
      const before = JSON.stringify({ gold: blocked.player.gold, debt: blocked.player.debtCollector });
      const blockedBorrow = api.borrow(blocked, 500);
      const relief = { player:{ gold:100, debtCollector:{ active:true, balanceCopper:1000, pressure:3, lastVisitAt:'', notes:[] } } };
      const repay = api.repay(relief);
      const checks = {
        ...(base && base.checks ? base.checks : {}),
        highPressureOk: highPressureState({ player:{ debtCollector:{ active:true, balanceCopper:1000, pressure:2 } } }).highPressureActive === false && highPressureState(blocked).highPressureActive === true,
        blockOk: blockedBorrow.ok === false && blockedBorrow.reason === 'under_collection' && before === JSON.stringify({ gold: blocked.player.gold, debt: blocked.player.debtCollector }),
        reliefOk: repay.ok === true && relief.player.debtCollector.pressure === 2 && borrowContract(relief, 500).enabled === true
      };
      return { ...(base || {}), ok: Object.values(checks).every(Boolean), checks, highPressure: highPressureState(blocked), borrowContract: borrowContract(blocked, 500), repaymentContract: api.debtCollectorRepaymentContract(relief) };
    };
    api.__underCollectionWrapped = true;
    return api;
  }
  function decoratePanel(){
    const api = wrapApi();
    if (!api || typeof document === 'undefined') return;
    const high = typeof S !== 'undefined' ? highPressureState(S) : null;
    const panel = document.getElementById('debtCollectorPanel');
    if (panel && high && high.highPressureActive && !panel.querySelector('[data-debt-under-collection="true"]')) {
      const copy = document.createElement('div');
      copy.className = 'small muted debt-collector-terms';
      copy.setAttribute('data-debt-under-collection', 'true');
      copy.innerHTML = `${high.recoveryCopy}<br>${high.repaymentCopy}`;
      const actions = panel.querySelector('.debt-collector-actions');
      if (actions && actions.parentNode) actions.parentNode.insertBefore(copy, actions);
      else panel.appendChild(copy);
    }
    Array.from(document.querySelectorAll('[data-debt-borrow]')).forEach(btn => {
      const amount = toInt(btn.dataset.debtBorrow);
      const contract = typeof S !== 'undefined' ? borrowContract(S, amount) : { enabled:true, borrowingBlockedByPressure:false };
      btn.disabled = !contract.enabled;
      btn.dataset.debtBorrowBlockedByPressure = contract.borrowingBlockedByPressure ? 'true' : 'false';
      btn.onclick = () => {
        const run = () => { api.borrow(S, amount); if (typeof render === 'function') render(); };
        return typeof runGuardedAction === 'function' ? runGuardedAction(run) : run();
      };
    });
    const repay = document.getElementById('repayDebtBtn');
    if (repay) repay.onclick = () => {
      const run = () => { api.repay(S); if (typeof render === 'function') render(); };
      return typeof runGuardedAction === 'function' ? runGuardedAction(run) : run();
    };
  }
  wrapApi();
  const oldRenderTown = typeof renderTown === 'function' ? renderTown : null;
  if (oldRenderTown && !oldRenderTown.__debtUnderCollectionHardening) {
    const wrappedRenderTown = function(){ const result = oldRenderTown.apply(this, arguments); decoratePanel(); return result; };
    wrappedRenderTown.__debtUnderCollectionHardening = true;
    try { renderTown = wrappedRenderTown; } catch (_) { window.renderTown = wrappedRenderTown; }
  }
  const oldBindDynamic = typeof bindDynamic === 'function' ? bindDynamic : null;
  if (oldBindDynamic && !oldBindDynamic.__debtUnderCollectionHardening) {
    const wrappedBindDynamic = function(){ const result = oldBindDynamic.apply(this, arguments); decoratePanel(); return result; };
    wrappedBindDynamic.__debtUnderCollectionHardening = true;
    try { bindDynamic = wrappedBindDynamic; } catch (_) { window.bindDynamic = wrappedBindDynamic; }
  }
  if (typeof document !== 'undefined') decoratePanel();
})();
