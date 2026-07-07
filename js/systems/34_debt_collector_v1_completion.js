'use strict';

// DungeonDex v1.23.1 - Debt Collector v1 completion copy and status ladder.
(function(){
  if (window.DDDebtCollectorV1Completion) return;
  window.DDDebtCollectorV1Completion = true;

  const CSS_ID = 'ddDebtCollectorV1CompletionCss';
  const PANEL_ID = 'debtCollectorPanel';
  const HIGH_PRESSURE_THRESHOLD = 3;

  function safeText(value, fallback = ''){
    if (typeof cleanDisplayText === 'function') return cleanDisplayText(value, fallback);
    return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function moneyPlain(copper){
    if (typeof moneyText === 'function') return moneyText(copper);
    if (typeof formatMoney === 'function') return safeText(formatMoney(copper), '0c');
    return `${Math.max(0, Math.floor(Number(copper) || 0))}c`;
  }

  function debtApi(){
    return window.DungeonDexDebtCollector || null;
  }

  function rawDebt(state){
    const api = debtApi();
    const debt = api && typeof api.state === 'function'
      ? api.state(state)
      : (state && state.player && typeof state.player.debtCollector === 'object' ? state.player.debtCollector : null);
    const balanceCopper = Math.max(0, Math.floor(Number(debt?.balanceCopper) || 0));
    const pressure = balanceCopper > 0 ? Math.max(0, Math.floor(Number(debt?.pressure) || 0)) : 0;
    return {
      active: balanceCopper > 0,
      balanceCopper,
      pressure,
      lastVisitAt: safeText(debt?.lastVisitAt || '').slice(0, 40),
      notes: Array.isArray(debt?.notes) ? debt.notes.map(note => safeText(note)).filter(Boolean).slice(0, 5) : []
    };
  }

  function walletCopper(state){
    return Math.max(0, Math.floor(Number(state?.player?.gold) || 0));
  }

  function pressureState(state){
    const api = debtApi();
    if (api && typeof api.debtCollectorHighPressureState === 'function') return api.debtCollectorHighPressureState(state);
    const debt = rawDebt(state);
    const highPressureActive = debt.pressure >= HIGH_PRESSURE_THRESHOLD;
    return {
      highPressureThreshold: HIGH_PRESSURE_THRESHOLD,
      highPressureActive,
      borrowingBlockedByPressure: highPressureActive,
      pressure: debt.pressure
    };
  }

  function debtCollectorStatusLadder(state){
    const debt = rawDebt(state);
    const high = pressureState(state);
    const wallet = walletCopper(state);
    const threshold = Math.max(1, Math.floor(Number(high.highPressureThreshold) || HIGH_PRESSURE_THRESHOLD));
    let stage = 'clear';
    let label = 'Clear';
    let detail = 'No active debt. The ledger is quiet.';
    let nextStep = 'Borrowing is available under normal terms.';

    if (debt.balanceCopper > 0 && high.highPressureActive) {
      stage = 'under_collection';
      label = 'Under Collection';
      detail = `Owed ${moneyPlain(debt.balanceCopper)}. Pressure ${debt.pressure}/${threshold}. Borrowing is paused.`;
      nextStep = wallet > 0 ? 'Repay to reduce pressure and reopen normal borrowing terms.' : 'Earn coin, then repay to reduce pressure.';
    } else if (debt.balanceCopper > 0 && debt.pressure >= Math.max(1, threshold - 1)) {
      stage = 'pressure_rising';
      label = 'Pressure Rising';
      detail = `Owed ${moneyPlain(debt.balanceCopper)}. Pressure ${debt.pressure}/${threshold}. Collection is close.`;
      nextStep = wallet > 0 ? 'Repay now to stabilize the marker.' : 'Earn coin before the next return raises pressure.';
    } else if (debt.balanceCopper > 0 && debt.pressure > 0) {
      stage = 'borrowed';
      label = 'Borrowed';
      detail = `Owed ${moneyPlain(debt.balanceCopper)}. Pressure ${debt.pressure}/${threshold}.`;
      nextStep = wallet > 0 ? 'Repay to lower the balance and ease pressure.' : 'Earn coin before repayment is possible.';
    } else if (debt.balanceCopper > 0) {
      stage = 'borrowed';
      label = 'Borrowed';
      detail = `Owed ${moneyPlain(debt.balanceCopper)}. Pressure is quiet for now.`;
      nextStep = wallet > 0 ? 'Repay early to keep the marker clean.' : 'Earn coin before repayment is possible.';
    }

    const recovering = debt.balanceCopper > 0 && debt.pressure > 0 && !high.highPressureActive && debt.notes.some(note => /repaid|pressure eased|cleared/i.test(note));
    if (recovering && stage !== 'under_collection') {
      stage = 'recovering';
      label = 'Recovering';
      detail = `Owed ${moneyPlain(debt.balanceCopper)}. Pressure eased to ${debt.pressure}/${threshold}.`;
      nextStep = wallet > 0 ? 'Continue repaying to clear the marker.' : 'Earn coin to continue recovery.';
    }

    return {
      contractId: 'debt_collector_v1_status_ladder',
      stage,
      label,
      detail,
      nextStep,
      balanceCopper: debt.balanceCopper,
      pressure: debt.pressure,
      threshold,
      walletCopper: wallet,
      active: debt.active,
      underCollection: high.highPressureActive === true,
      borrowingBlocked: high.borrowingBlockedByPressure === true,
      repaymentAvailable: debt.balanceCopper > 0 && wallet > 0,
      notes: debt.notes.slice()
    };
  }

  function debtCollectorV1Notice(state){
    const ladder = debtCollectorStatusLadder(state);
    const borrowText = ladder.borrowingBlocked
      ? 'Borrowing blocked: pressure is at collection level.'
      : 'Borrowing available: pressure is below collection level.';
    const repayText = ladder.repaymentAvailable
      ? 'Repayment available: spending purse coin lowers the balance and can ease pressure.'
      : ladder.balanceCopper > 0
        ? 'Repayment unavailable: no purse coin available.'
        : 'Repayment unavailable: no debt is due.';
    return {
      contractId: 'debt_collector_v1_notice',
      label: ladder.label,
      detail: ladder.detail,
      borrowText,
      repayText,
      nextStep: ladder.nextStep,
      safe: true,
      changesDebtMath: false,
      changesEconomy: false,
      changesCombat: false,
      changesRewards: false,
      changesProgression: false
    };
  }

  function injectCss(){
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      .debt-v1-status{margin-top:10px;padding:8px 9px;border:1px solid rgba(255,190,110,.14);border-radius:12px;background:rgba(255,190,110,.045)}
      .debt-v1-status-title{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px}
      .debt-v1-status-title strong{font-size:.78rem;letter-spacing:.02em}
      .debt-v1-status-grid{display:grid;gap:4px;margin-top:6px}
      .debt-v1-status-grid p{margin:0;line-height:1.25}
    `;
    document.head.appendChild(style);
  }

  function renderDebtCollectorV1Status(state){
    const slot = document.getElementById(PANEL_ID);
    if (!slot || !state) return;
    const api = debtApi();
    if (api && typeof api.renderDebtCollectorPanel === 'function' && !slot.querySelector('[data-debt-borrow], #repayDebtBtn')) {
      api.renderDebtCollectorPanel();
    }
    injectCss();
    const existing = slot.querySelector('[data-debt-v1-status]');
    if (existing) existing.remove();
    const notice = debtCollectorV1Notice(state);
    const wrap = document.createElement('section');
    wrap.className = 'debt-v1-status small';
    wrap.setAttribute('data-debt-v1-status', notice.label);
    wrap.innerHTML = `<div class="debt-v1-status-title"><strong>Debt Status Ladder</strong><span class="pill">${escapeHtml(notice.label)}</span></div>
      <div class="debt-v1-status-grid">
        <p>${escapeHtml(notice.detail)}</p>
        <p class="muted">${escapeHtml(notice.borrowText)}</p>
        <p class="muted">${escapeHtml(notice.repayText)}</p>
        <p class="muted">Next: ${escapeHtml(notice.nextStep)}</p>
      </div>`;
    slot.appendChild(wrap);
  }

  function wrapRenderTown(){
    const oldRenderTown = typeof renderTown === 'function' ? renderTown : null;
    if (!oldRenderTown || oldRenderTown.__debtCollectorV1Completion) return;
    const wrapped = function(){
      let result;
      try {
        result = oldRenderTown.apply(this, arguments);
      } finally {
        try { renderDebtCollectorV1Status(typeof S !== 'undefined' ? S : null); } catch (_) {}
      }
      return result;
    };
    wrapped.__debtCollectorV1Completion = true;
    try { renderTown = wrapped; } catch (_) { window.renderTown = wrapped; }
  }

  function patchApi(){
    const api = debtApi();
    if (!api || typeof api !== 'object') return false;
    api.debtCollectorStatusLadder = debtCollectorStatusLadder;
    api.debtCollectorV1Notice = debtCollectorV1Notice;
    api.renderDebtCollectorV1Status = renderDebtCollectorV1Status;
    api.__debtCollectorV1Completion = true;
    return true;
  }

  function smoke(state){
    const clear = { player: { gold: 0, debtCollector: { balanceCopper: 0, pressure: 0, notes: [] } } };
    const borrowed = { player: { gold: 100, debtCollector: { active: true, balanceCopper: 500, pressure: 1, notes: [] } } };
    const rising = { player: { gold: 100, debtCollector: { active: true, balanceCopper: 500, pressure: 2, notes: [] } } };
    const collection = { player: { gold: 100, debtCollector: { active: true, balanceCopper: 500, pressure: 3, notes: [] } } };
    const recovering = { player: { gold: 100, debtCollector: { active: true, balanceCopper: 400, pressure: 2, notes: ['Repaid 1s toward the marker. Pressure eased by 1.'] } } };
    const stages = [clear, borrowed, rising, collection, recovering].map(sample => debtCollectorStatusLadder(sample).stage);
    const notice = debtCollectorV1Notice(collection);
    const liveState = state ? debtCollectorStatusLadder(state) : null;
    return {
      ok: stages[0] === 'clear'
        && stages[1] === 'borrowed'
        && stages[2] === 'pressure_rising'
        && stages[3] === 'under_collection'
        && stages[4] === 'recovering'
        && notice.changesDebtMath === false
        && notice.changesEconomy === false
        && notice.changesCombat === false
        && notice.changesRewards === false,
      stages,
      notice,
      liveState
    };
  }

  wrapRenderTown();
  patchApi();
  injectCss();
  if (typeof render === 'function') render();
  else if (typeof S !== 'undefined') renderDebtCollectorV1Status(S);
})();
