'use strict';

  // DungeonDex v1.21.0 Debt Collector support.
(function(){
  if (window.DDDebtCollectorFoundation) return;
  window.DDDebtCollectorFoundation = true;

  const PANEL_ID = 'debtCollectorPanel';
  const CSS_ID = 'ddDebtCollectorFoundationCss';
  const BORROW_OPTIONS = [
    { label: 'Borrow 5s', amount: coinValue(0, 5, 0) },
    { label: 'Borrow 10s', amount: coinValue(0, 10, 0) },
    { label: 'Borrow 25s', amount: coinValue(0, 25, 0) }
  ];

  function coinValue(gold = 0, silver = 0, copper = 0){
    if (typeof coins === 'function') return coins(gold, silver, copper);
    return Math.max(0, Math.round((Number(gold) || 0) * 10000 + (Number(silver) || 0) * 100 + (Number(copper) || 0)));
  }

  function safeText(value, fallback = ''){
    if (typeof cleanDisplayText === 'function') return cleanDisplayText(value, fallback);
    return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function moneyHtml(copper){
    return typeof formatMoney === 'function' ? formatMoney(copper) : `${Math.max(0, Math.floor(Number(copper) || 0))}c`;
  }

  function moneyPlain(copper){
    if (typeof moneyText === 'function') return moneyText(copper);
    return safeText(moneyHtml(copper), '0c');
  }

  function nowStamp(){
    try { return new Date().toLocaleString(); }
    catch (_) { return ''; }
  }

  function normalizeDebt(raw){
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const balanceCopper = Math.max(0, Math.floor(Number(source.balanceCopper) || 0));
    const notes = Array.isArray(source.notes)
      ? source.notes.map(note => safeText(note).slice(0, 80)).filter(Boolean).slice(0, 5)
      : [];
    return {
      active: balanceCopper > 0,
      balanceCopper,
      pressure: balanceCopper > 0 ? Math.max(0, Math.floor(Number(source.pressure) || 0)) : 0,
      lastVisitAt: safeText(source.lastVisitAt).slice(0, 40),
      notes
    };
  }

  function ensureDebtCollectorState(state){
    if (!state || !state.player) return normalizeDebt(null);
    state.player.debtCollector = normalizeDebt(state.player.debtCollector);
    return state.player.debtCollector;
  }

  function debtState(state){
    return normalizeDebt(state && state.player ? state.player.debtCollector : null);
  }

  function addDebtNote(debt, note){
    if (!debt) return;
    const clean = safeText(note).slice(0, 80);
    if (!clean) return;
    debt.notes = Array.isArray(debt.notes) ? debt.notes : [];
    debt.notes.unshift(clean);
    debt.notes = debt.notes.filter(Boolean).slice(0, 5);
  }

  function pressureWarning(debt){
    if (!debt || debt.balanceCopper <= 0) return 'The ledger is quiet. No debt pressure is active.';
    if (debt.pressure <= 1) return 'Debt pressure is active: a collector has been asking around.';
    if (debt.pressure <= 3) return 'Debt pressure is active: the ledger grows heavier.';
    return 'Debt pressure is active: someone remembers what you owe.';
  }

  function debtCollectorDisplaySummary(state){
    const debt = debtState(state);
    return {
      title: 'Debt Collector',
      summary: debt.balanceCopper > 0 ? 'Active debt. Pressure is visible.' : 'No active debt. Pressure is quiet.',
      statusLabel: debt.balanceCopper > 0 ? 'Debt Active' : 'No Debt',
      balanceLabel: `Owed ${moneyPlain(debt.balanceCopper)}`,
      pressureLabel: debt.balanceCopper > 0 ? debt.pressure : 0,
      lastVisitLabel: debt.lastVisitAt || 'None',
      notesLabel: Array.isArray(debt.notes) && debt.notes.length ? `${debt.notes.length} note${debt.notes.length === 1 ? '' : 's'}` : 'No notes',
      active: debt.active === true,
      balanceCopper: debt.balanceCopper,
      pressure: debt.pressure,
      notes: Array.isArray(debt.notes) ? debt.notes.slice() : []
    };
  }

  function debtPressureDisplay(state){
    const debt = debtState(state);
    if (debt.balanceCopper <= 0) return { label: 'Pressure 0', detail: 'Quiet', active: false };
    if (debt.pressure <= 1) return { label: 'Pressure 1', detail: 'Watching', active: true };
    if (debt.pressure <= 3) return { label: `Pressure ${debt.pressure}`, detail: 'Rising', active: true };
    return { label: `Pressure ${debt.pressure}`, detail: 'High', active: true };
  }

  function debtCollectorStatusLine(state){
    const debt = debtState(state);
    return debt.balanceCopper > 0
      ? `Owed ${moneyPlain(debt.balanceCopper)}. Pressure is visible.`
      : 'No debt due. Pressure is quiet.';
  }

  function debtCollectorClarityPassiveContract(state){
    const talents = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    return typeof talents?.debtCollectorClarityPassiveContract === 'function'
      ? talents.debtCollectorClarityPassiveContract(state)
      : null;
  }

  function applyDebtCollectorClarityCopy(state, debtCardOrCopy){
    const talents = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    if (typeof talents?.applyDebtCollectorClarityCopy === 'function') {
      return talents.applyDebtCollectorClarityCopy(state, debtCardOrCopy);
    }
    return debtCardOrCopy && typeof debtCardOrCopy === 'object' && !Array.isArray(debtCardOrCopy)
      ? { ...debtCardOrCopy }
      : { text: String(debtCardOrCopy || '') };
  }

  function debtCollectorRendererCopySource(state){
    const debt = debtState(state);
    const summary = debtCollectorDisplaySummary(state);
    const pressure = debtPressureDisplay(state);
    const wallet = Math.max(0, Math.floor(Number(state?.player?.gold) || 0));
    return {
      title: summary.title,
      summaryText: summary.summary,
      statusText: summary.statusLabel,
      balanceText: summary.balanceLabel,
      pressureText: pressure.label,
      pressureDetail: pressure.detail,
      flavorText: debtCollectorStatusLine(state),
      termsText: 'Repay spends purse coin. Pressure is visible only.',
      statusMetaText: summary.statusLabel,
      lastVisitText: summary.lastVisitLabel,
      notesText: summary.notesLabel,
      active: summary.active,
      balanceCopper: summary.balanceCopper,
      pressure: summary.pressure,
      wallet,
      repaymentState: summary.balanceCopper <= 0 ? 'clear' : wallet > 0 ? 'available' : 'wallet-empty'
    };
  }

  function debtCollectorClarityRendererCopyModel(state){
    const talents = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    const source = debtCollectorRendererCopySource(state);
    // Copy-model only: this does not wire gameplay, it only forwards renderer-safe text.
    return typeof talents?.debtCollectorClarityRendererCopyModel === 'function'
      ? talents.debtCollectorClarityRendererCopyModel(state, source)
      : source;
  }

  function debtCollectorFallbackState(){
    return {
      active: false,
      balanceCopper: 0,
      pressure: 0,
      lastVisitAt: 'None',
      notes: []
    };
  }

  function borrowDebt(state, amount){
    if (!state || !state.player) return { ok: false, reason: 'missing state' };
    const borrowed = Math.max(0, Math.floor(Number(amount) || 0));
    if (borrowed <= 0) return { ok: false, reason: 'invalid amount' };
    const debt = ensureDebtCollectorState(state);
    if (typeof addPlayerGold === 'function') addPlayerGold(state, borrowed);
    else state.player.gold = Math.max(0, Math.floor(Number(state.player.gold) || 0)) + borrowed;
    debt.balanceCopper = Math.min(Number.MAX_SAFE_INTEGER, debt.balanceCopper + borrowed);
    debt.active = true;
    debt.lastVisitAt = nowStamp();
    addDebtNote(debt, `Borrowed ${moneyPlain(borrowed)} from the Lowfire ledger.`);
    if (typeof pushLog === 'function') pushLog(state, `Debt Collector loan taken: ${moneyHtml(borrowed)}.`);
    return { ok: true, amount: borrowed, balanceCopper: debt.balanceCopper };
  }

  function repayDebt(state){
    if (!state || !state.player) return { ok: false, reason: 'missing state' };
    const debt = ensureDebtCollectorState(state);
    const balance = Math.max(0, Math.floor(Number(debt.balanceCopper) || 0));
    if (balance <= 0) {
      debt.active = false;
      debt.pressure = 0;
      return { ok: false, reason: 'no debt' };
    }
    const wallet = Math.max(0, Math.floor(Number(state.player.gold) || 0));
    const paid = Math.min(wallet, balance);
    if (paid <= 0) {
      if (typeof pushLog === 'function') pushLog(state, 'No coin available to repay the Debt Collector.');
      return { ok: false, reason: 'no coin' };
    }
    state.player.gold = Math.max(0, wallet - paid);
    debt.balanceCopper = Math.max(0, balance - paid);
    debt.lastVisitAt = nowStamp();
    if (debt.balanceCopper <= 0) {
      debt.active = false;
      debt.pressure = 0;
      addDebtNote(debt, 'Debt cleared. The collector closed the marker.');
      if (typeof pushLog === 'function') pushLog(state, `Debt Collector marker cleared with ${moneyHtml(paid)}.`);
    } else {
      debt.active = true;
      addDebtNote(debt, `Repaid ${moneyPlain(paid)} toward the marker.`);
      if (typeof pushLog === 'function') pushLog(state, `Debt Collector repayment: ${moneyHtml(paid)}.`);
    }
    return { ok: true, amount: paid, balanceCopper: debt.balanceCopper };
  }

  function recordDebtReturn(state){
    const debt = ensureDebtCollectorState(state);
    if (!debt.active || debt.balanceCopper <= 0) return false;
    debt.pressure = Math.min(999999, Math.max(0, Math.floor(Number(debt.pressure) || 0)) + 1);
    debt.lastVisitAt = nowStamp();
    return true;
  }

  function compactLabel(state){
    const debt = debtState(state);
    const pressureText = debt.balanceCopper > 0 ? `Pressure ${debt.pressure}` : 'Pressure 0';
    return {
      clear: debt.balanceCopper > 0 ? 'Marker active' : 'Marker clear',
      balance: debt.balanceCopper > 0 ? moneyHtml(debt.balanceCopper) : moneyHtml(0),
      pressure: pressureText,
      active: debt.active
    };
  }

  function panelMarkup(state){
    const debt = debtState(state);
    const summary = debtCollectorDisplaySummary(state);
    const pressure = debtPressureDisplay(state);
    const rendererCopy = debtCollectorClarityRendererCopyModel(state);
    const passiveContract = debtCollectorClarityPassiveContract(state);
    const liveRendererWired = passiveContract?.learned === true && passiveContract?.liveRendererWired === true;
    const statusClass = debt.balanceCopper > 0 ? 'rarity-rare' : 'rarity-common';
    const wallet = Math.max(0, Math.floor(Number(state?.player?.gold) || 0));
    const canRepay = debt.balanceCopper > 0 && wallet > 0;
    const titleText = liveRendererWired ? rendererCopy.title : summary.title;
    const summaryText = liveRendererWired ? rendererCopy.summaryText : summary.summary;
    const statusText = liveRendererWired ? rendererCopy.statusText : summary.statusLabel;
    const balanceText = liveRendererWired ? rendererCopy.balanceText : summary.balanceLabel;
    const pressureText = liveRendererWired ? rendererCopy.pressureText : pressure.label;
    const pressureDetail = liveRendererWired ? rendererCopy.pressureDetail : pressure.detail;
    const flavorText = liveRendererWired ? rendererCopy.flavorText : debtCollectorStatusLine(state);
    const termsText = liveRendererWired ? rendererCopy.termsText : 'Repay spends purse coin. Pressure is visible only.';
    const lastVisitText = liveRendererWired ? rendererCopy.lastVisitText : summary.lastVisitLabel;
    const notesText = liveRendererWired ? rendererCopy.notesText : summary.notesLabel;
    const notes = debt.notes.length
      ? `<div class="small muted debt-collector-notes">${debt.notes.map(note => `<div class="debt-collector-note">${escapeHtml(note)}</div>`).join('')}</div>`
      : '';
    const borrowButtons = BORROW_OPTIONS.map(option => `<button class="ghost mini" data-debt-borrow="${option.amount}">${escapeHtml(option.label)}</button>`).join('');
    return `<div class="split debt-collector-head">
      <div>
        <h2>${escapeHtml(titleText)}</h2>
        <p>${escapeHtml(summaryText)}</p>
      </div>
      <span class="pill debt-collector-status-pill ${statusClass}">${escapeHtml(statusText)}</span>
    </div>
    <p class="small muted debt-collector-flavor">${escapeHtml(flavorText)}</p>
    <div class="tag-row debt-collector-chips" aria-label="Debt Collector status">
      <span class="pill debt-collector-chip ${summary.active ? 'debt-collector-chip-active' : ''}">${escapeHtml(statusText)}</span>
      <span class="pill debt-collector-chip">${escapeHtml(balanceText)}</span>
      <span class="pill debt-collector-chip">${escapeHtml(pressureText)}${pressureDetail ? ` • ${escapeHtml(pressureDetail)}` : ''}</span>
    </div>
    <div class="debt-collector-actions" aria-label="Debt Collector loan actions">
      ${borrowButtons}
      <button class="primary mini" id="repayDebtBtn" ${canRepay ? '' : 'disabled'}>Repay Debt</button>
    </div>
    <p class="small muted debt-collector-terms">${escapeHtml(termsText)}</p>
    <div class="debt-collector-meta small">
      <span><b>Status:</b> ${escapeHtml(statusText)}</span>
      <span><b>Last Visit:</b> ${escapeHtml(lastVisitText)}</span>
      <span><b>Notes:</b> ${escapeHtml(notesText)}</span>
    </div>
    ${notes}`;
  }

  function injectCss(){
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      .debt-collector-head h2{margin:0}
      .debt-collector-head p{margin:3px 0 0;line-height:1.25}
      .debt-collector-status-pill{border-color:rgba(255,188,104,.24);background:rgba(255,160,82,.08)}
      .debt-collector-flavor{margin-top:8px;color:rgba(255,225,175,.86);line-height:1.28}
      .debt-collector-chips{margin-top:8px}
      .debt-collector-chip{font-size:.68rem;line-height:1.12;border-color:rgba(255,190,110,.18);background:rgba(255,190,110,.055)}
      .debt-collector-chip-active{border-color:rgba(255,130,92,.28);background:rgba(255,130,92,.09);color:#ffd7be}
      .debt-collector-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .debt-collector-actions button{flex:1 1 86px}
      .debt-collector-terms{margin:6px 0 0;line-height:1.25}
      .debt-collector-meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px}
      .debt-collector-notes{display:grid;gap:4px;margin-top:8px}
      .debt-collector-note{padding:6px 8px;border:1px solid rgba(255,190,110,.12);border-radius:10px;background:rgba(0,0,0,.14)}
      @media(max-width:420px){.debt-collector-actions button{flex-basis:calc(50% - 3px)}}
    `;
    document.head.appendChild(style);
  }

  function renderDebtCollectorPanel(){
    injectCss();
    const slot = typeof el === 'function' ? el(PANEL_ID) : document.getElementById(PANEL_ID);
    if (!slot || typeof S === 'undefined') return;
    ensureDebtCollectorState(S);
    slot.innerHTML = panelMarkup(S);
  }

  function bindDebtCollectorActions(){
    if (typeof S === 'undefined') return;
    const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
    Array.from(document.querySelectorAll('[data-debt-borrow]')).forEach(btn => {
      btn.onclick = () => guard(() => {
        borrowDebt(S, btn.dataset.debtBorrow);
        if (typeof render === 'function') render();
      });
    });
    const repay = document.getElementById('repayDebtBtn');
    if (repay) repay.onclick = () => guard(() => {
      repayDebt(S);
      if (typeof render === 'function') render();
    });
  }

  function smoke(){
    const state = typeof createBaseState === 'function'
      ? createBaseState()
      : { player: { gold: 0, stats: { power: 8, guard: 6, wit: 5, luck: 4, speed: 5 }, log: [], debtCollector: normalizeDebt(null) }, run: { active: false, choices: ['attack','guard','skill','extract'] } };
    state.player.gold = 0;
    state.player.debtCollector = normalizeDebt(null);
    const statsBefore = JSON.stringify(state.player.stats || {});
    const choicesBefore = JSON.stringify(state.run?.choices || []);
    const borrow = borrowDebt(state, coinValue(0, 5, 0));
    const borrowOk = borrow.ok && state.player.gold === coinValue(0, 5, 0) && state.player.debtCollector.balanceCopper === coinValue(0, 5, 0) && state.player.debtCollector.active === true;
    const persisted = typeof normalizeSaveShape === 'function'
      ? normalizeSaveShape(JSON.parse(JSON.stringify(state)))
      : JSON.parse(JSON.stringify(state));
    const persistOk = persisted.player.debtCollector.balanceCopper === state.player.debtCollector.balanceCopper && persisted.player.debtCollector.active === true;
    state.player.gold = coinValue(0, 3, 0);
    const partial = repayDebt(state);
    const partialOk = partial.ok && state.player.gold === 0 && state.player.debtCollector.balanceCopper === coinValue(0, 2, 0) && state.player.debtCollector.active === true;
    state.player.gold = coinValue(0, 25, 0);
    const clear = repayDebt(state);
    const clearOk = clear.ok && state.player.debtCollector.balanceCopper === 0 && state.player.debtCollector.active === false && state.player.debtCollector.pressure === 0;
    borrowDebt(state, coinValue(0, 10, 0));
    const pressureBefore = state.player.debtCollector.pressure;
    recordDebtReturn(state, 'extract');
    const pressureOk = state.player.debtCollector.pressure === pressureBefore + 1;
    const combatOk = JSON.stringify(state.player.stats || {}) === statsBefore && JSON.stringify(state.run?.choices || []) === choicesBefore;
    const checks = { borrowOk, persistOk, partialOk, clearOk, pressureOk, combatOk };
    return {
      ok: Object.values(checks).every(Boolean),
      checks,
      finalDebt: { ...state.player.debtCollector },
      fallback: debtCollectorFallbackState(),
      summary: debtCollectorDisplaySummary(state),
      pressure: debtPressureDisplay(state),
      statusLine: debtCollectorStatusLine(state)
    };
  }

  const oldRenderTown = typeof renderTown === 'function' ? renderTown : null;
  if (oldRenderTown && !oldRenderTown.__debtCollectorFoundation) {
    const wrapped = function(){
      const result = oldRenderTown.apply(this, arguments);
      renderDebtCollectorPanel();
      return result;
    };
    wrapped.__debtCollectorFoundation = true;
    try { renderTown = wrapped; } catch (_) { window.renderTown = wrapped; }
  }

  const oldBindDynamic = typeof bindDynamic === 'function' ? bindDynamic : null;
  if (oldBindDynamic && !oldBindDynamic.__debtCollectorFoundation) {
    const wrappedBind = function(){
      const result = oldBindDynamic.apply(this, arguments);
      bindDebtCollectorActions();
      return result;
    };
    wrappedBind.__debtCollectorFoundation = true;
    try { bindDynamic = wrappedBind; } catch (_) { window.bindDynamic = wrappedBind; }
  }

  const oldFinishRun = typeof finishRun === 'function' ? finishRun : null;
  if (oldFinishRun && !oldFinishRun.__debtCollectorFoundation) {
    const wrappedFinishRun = function(state, reason){
      const result = oldFinishRun.apply(this, arguments);
      if (state && state.screen === 'town') recordDebtReturn(state, reason);
      return result;
    };
    wrappedFinishRun.__debtCollectorFoundation = true;
    try { finishRun = wrappedFinishRun; } catch (_) { window.finishRun = wrappedFinishRun; }
  }

  window.DungeonDexDebtCollector = {
    borrow: borrowDebt,
    repay: repayDebt,
    pressureReturn: recordDebtReturn,
    state: debtState,
    debtCollectorDisplaySummary,
    debtPressureDisplay,
    debtCollectorStatusLine,
    debtCollectorClarityPassiveContract,
    applyDebtCollectorClarityCopy,
    debtCollectorRendererCopySource,
    debtCollectorClarityRendererCopyModel,
    debtCollectorFallbackState,
    warning: pressureWarning,
    smoke
  };

  injectCss();
  if (typeof render === 'function') render();
})();
