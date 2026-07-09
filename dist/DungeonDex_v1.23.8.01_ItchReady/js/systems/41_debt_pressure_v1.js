'use strict';

// Debt Pressure v1: readable recovery guide only. No debt math, borrowing, repayment, or collection changes.
(function(){
  if (window.DDDebtPressureV1) return;
  window.DDDebtPressureV1 = true;

  const CSS_ID = 'ddDebtPressureV1Css';
  const PANEL_ATTR = 'data-debt-pressure-v1';
  const oldRenderTown = typeof renderTown === 'function' ? renderTown : null;

  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function list(value){ return Array.isArray(value) ? value : []; }
  function num(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : Math.max(0, Math.floor(fallback));
  }
  function text(value, fallback = '', limit = 180){
    const raw = String(value || fallback || '').trim();
    const clean = typeof cleanDisplayText === 'function' ? cleanDisplayText(raw, fallback || '') : raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return clean.slice(0, limit);
  }
  function esc(value){
    return typeof escapeHtml === 'function'
      ? escapeHtml(value)
      : String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }
  function moneyPlain(copper){
    if (typeof moneyText === 'function') return moneyText(copper);
    if (typeof formatMoney === 'function') return text(formatMoney(copper), '0c', 60);
    return `${num(copper, 0)}c`;
  }

  function debtSnapshot(state){
    const debt = obj(state?.player?.debtCollector);
    const balanceCopper = num(debt.balanceCopper, 0);
    const pressure = balanceCopper > 0 ? num(debt.pressure, 0) : 0;
    const debtApi = window.DungeonDexDebtCollector || null;
    const highPressure = typeof debtApi?.debtCollectorHighPressureState === 'function'
      ? debtApi.debtCollectorHighPressureState(state)
      : { highPressureThreshold: 3, highPressureActive: pressure >= 3, borrowingBlockedByPressure: pressure >= 3, pressure };
    return {
      active: balanceCopper > 0,
      balanceCopper,
      balanceText: moneyPlain(balanceCopper),
      pressure,
      threshold: num(highPressure.highPressureThreshold, 3) || 3,
      highPressureActive: highPressure.highPressureActive === true,
      borrowingBlockedByPressure: highPressure.borrowingBlockedByPressure === true,
      walletCopper: num(state?.player?.gold, 0),
      lastVisitAt: text(debt.lastVisitAt || '', 'None', 60),
      notes: list(debt.notes).map(note => text(note, '', 80)).filter(Boolean).slice(0, 5)
    };
  }

  function debtPressureStage(snapshot){
    if (!snapshot.active) {
      return {
        key: 'quiet',
        label: 'Quiet',
        headline: 'Debt Pressure is quiet.',
        detail: 'No active debt marker is pressuring the account.',
        recovery: 'No recovery action is needed.'
      };
    }
    if (snapshot.highPressureActive) {
      return {
        key: 'collection',
        label: 'Under Collection',
        headline: `Pressure ${snapshot.pressure}: Under Collection.`,
        detail: `Borrowing is paused at pressure ${snapshot.threshold} or higher. This is readable pressure, not a new penalty layer.`,
        recovery: snapshot.walletCopper > 0
          ? 'Use the existing Repay Debt action to lower the marker. Repayment can ease pressure under current debt rules.'
          : 'Find coin first, then use the existing Repay Debt action to recover normal terms.'
      };
    }
    if (snapshot.pressure >= Math.max(1, snapshot.threshold - 1)) {
      return {
        key: 'rising',
        label: 'Rising',
        headline: `Pressure ${snapshot.pressure}: close to collection.`,
        detail: 'The ledger is heavy, but borrowing is not paused yet.',
        recovery: 'Repay when possible to reduce the marker before it reaches collection pressure.'
      };
    }
    return {
      key: 'watching',
      label: snapshot.pressure > 0 ? 'Watching' : 'Borrowed',
      headline: `Pressure ${snapshot.pressure}: normal terms.`,
      detail: 'The marker is active and readable, but collection pressure is not active.',
      recovery: 'Repay from the existing Debt Collector panel when you want to reduce or clear the marker.'
    };
  }

  function debtPressureLadder(snapshot){
    const threshold = snapshot.threshold || 3;
    return [
      { key: 'quiet', label: '0', title: 'Quiet', active: !snapshot.active },
      { key: 'watching', label: '1', title: 'Watching', active: snapshot.active && snapshot.pressure === 1 },
      { key: 'rising', label: `${Math.max(2, threshold - 1)}`, title: 'Rising', active: snapshot.active && snapshot.pressure > 1 && snapshot.pressure < threshold },
      { key: 'collection', label: `${threshold}+`, title: 'Under Collection', active: snapshot.highPressureActive }
    ];
  }

  function debtPressureRecoveryGuide(state){
    const snapshot = debtSnapshot(state);
    const stage = debtPressureStage(snapshot);
    const ladder = debtPressureLadder(snapshot);
    return {
      contractId: 'debt_pressure_v1_recovery_guide',
      routeKey: 'debt_pressure_route',
      title: 'Debt Pressure',
      readOnly: true,
      playable: false,
      routeActivation: false,
      mutatesState: false,
      mutatesSave: false,
      changesDebtMath: false,
      changesBorrowing: false,
      changesRepayment: false,
      changesCollection: false,
      changesEconomy: false,
      changesCombat: false,
      balanceCopper: snapshot.balanceCopper,
      balanceText: snapshot.balanceText,
      pressure: snapshot.pressure,
      threshold: snapshot.threshold,
      highPressureActive: snapshot.highPressureActive,
      borrowingBlockedByPressure: snapshot.borrowingBlockedByPressure,
      walletCopper: snapshot.walletCopper,
      stage,
      ladder,
      lastVisitAt: snapshot.lastVisitAt,
      noteCount: snapshot.notes.length,
      notes: snapshot.notes,
      recoveryAction: 'Repay Debt',
      recoveryText: stage.recovery,
      summary: `${stage.headline} ${stage.recovery}`
    };
  }

  function debtPressureReadableSummary(state){
    const guide = debtPressureRecoveryGuide(state);
    return {
      title: guide.title,
      body: `${guide.stage.headline} Balance ${guide.balanceText}.`,
      meta: guide.recoveryText,
      routeKey: guide.routeKey,
      readOnly: guide.readOnly,
      playable: false,
      stageLabel: guide.stage.label,
      pressure: guide.pressure,
      threshold: guide.threshold,
      highPressureActive: guide.highPressureActive
    };
  }

  function injectCss(){
    if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      .debt-pressure-v1-card{margin-top:10px;padding:9px;border:1px solid rgba(255,190,110,.13);border-radius:14px;background:rgba(0,0,0,.16)}
      .debt-pressure-v1-card h3{margin:0;font-size:.86rem;letter-spacing:.03em}
      .debt-pressure-v1-card p{margin:5px 0 0;line-height:1.25}
      .debt-pressure-v1-ladder{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:8px}
      .debt-pressure-v1-step{padding:6px 5px;border:1px solid rgba(255,190,110,.11);border-radius:10px;background:rgba(255,190,110,.045);text-align:center;line-height:1.12}
      .debt-pressure-v1-step strong{display:block;font-size:.72rem}
      .debt-pressure-v1-step span{display:block;font-size:.58rem;color:rgba(240,234,222,.72)}
      .debt-pressure-v1-step.active{border-color:rgba(255,142,96,.35);background:rgba(255,122,80,.11);color:#ffd7be}
      .debt-pressure-v1-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
      @media(max-width:420px){.debt-pressure-v1-ladder{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function debtPressureMarkup(state){
    const guide = debtPressureRecoveryGuide(state);
    const ladder = guide.ladder.map(step => `<div class="debt-pressure-v1-step ${step.active ? 'active' : ''}"><strong>${esc(step.label)}</strong><span>${esc(step.title)}</span></div>`).join('');
    return `<div class="debt-pressure-v1-card" ${PANEL_ATTR}="readable-recovery">
      <div class="split">
        <h3>${esc(guide.title)}</h3>
        <span class="pill ${guide.highPressureActive ? 'rarity-rare' : 'rarity-common'}">${esc(guide.stage.label)}</span>
      </div>
      <p class="small">${esc(guide.stage.headline)}</p>
      <p class="small muted">${esc(guide.stage.detail)}</p>
      <div class="debt-pressure-v1-ladder" aria-label="Debt Pressure ladder">${ladder}</div>
      <div class="debt-pressure-v1-meta small muted">
        <span><b>Balance:</b> ${esc(guide.balanceText)}</span>
        <span><b>Threshold:</b> ${esc(String(guide.threshold))}</span>
        <span><b>Recovery:</b> ${esc(guide.recoveryAction)}</span>
      </div>
      <p class="small muted">${esc(guide.recoveryText)}</p>
      <p class="small muted">Read-only guide: no new borrowing, repayment, collection, economy, combat, Talent, or Revisit route behavior is added.</p>
    </div>`;
  }

  function renderDebtPressureGuide(){
    if (typeof document === 'undefined') return;
    injectCss();
    const slot = document.getElementById('debtCollectorPanel');
    if (!slot) return;
    const existing = slot.querySelector(`[${PANEL_ATTR}]`);
    const state = typeof S !== 'undefined' ? S : window.S || {};
    const markup = debtPressureMarkup(state);
    if (existing) existing.outerHTML = markup;
    else slot.insertAdjacentHTML('beforeend', markup);
  }

  if (oldRenderTown && !oldRenderTown.__debtPressureV1) {
    const wrapped = function(){
      const result = oldRenderTown.apply(this, arguments);
      renderDebtPressureGuide();
      return result;
    };
    wrapped.__debtPressureV1 = true;
    try { renderTown = wrapped; } catch (_) { window.renderTown = wrapped; }
  }

  const debtApi = window.DungeonDexDebtCollector || (window.DungeonDexDebtCollector = {});
  debtApi.debtPressureRecoveryGuide = debtPressureRecoveryGuide;
  debtApi.debtPressureReadableSummary = debtPressureReadableSummary;

  const revisitApi = window.DungeonDexEliteContracts || null;
  if (revisitApi && typeof revisitApi.revisitLaneStatusClarity === 'function' && !revisitApi.revisitLaneStatusClarity.__debtPressureV1) {
    const oldLaneStatus = revisitApi.revisitLaneStatusClarity;
    const patched = function(state){
      const lanes = oldLaneStatus.call(this, state);
      const summary = debtPressureReadableSummary(state);
      return list(lanes).map(lane => {
        if (!lane || lane.key !== 'debt_pressure_route') return lane;
        return {
          ...lane,
          title: 'Debt Pressure Route',
          status: 'Readable / Locked',
          bucket: 'locked',
          isPlayable: false,
          isFinished: false,
          isPreview: true,
          isPlanned: true,
          isLocked: true,
          shortLabel: 'Readable / Locked',
          detailText: `${summary.body} ${summary.meta}`,
          nextStepText: 'Use the existing Repay Debt action from the Debt Collector panel; this lane remains non-playable.',
          sourceLabel: 'debt_pressure'
        };
      });
    };
    patched.__debtPressureV1 = true;
    revisitApi.revisitLaneStatusClarity = patched;
  }

  window.debtPressureRecoveryGuide = debtPressureRecoveryGuide;
  window.debtPressureReadableSummary = debtPressureReadableSummary;
  window.renderDebtPressureGuide = renderDebtPressureGuide;

  if (typeof render === 'function') render();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(renderDebtPressureGuide, 0));
  else window.setTimeout(renderDebtPressureGuide, 0);
})();
