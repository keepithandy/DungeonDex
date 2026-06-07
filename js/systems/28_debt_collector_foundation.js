'use strict';

// DungeonDex v1.6.8 Debt Collector foundation.
(function(){
  if (window.DDDebtCollectorFoundation) return;
  window.DDDebtCollectorFoundation = true;

  const PANEL_ID = 'debtCollectorPanel';
  const CSS_ID = 'ddDebtCollectorFoundationCss';

  function debtState(state){
    const raw = state && state.player ? state.player.debtCollector : null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        active: false,
        balanceCopper: 0,
        pressure: 0,
        lastVisitAt: '',
        notes: []
      };
    }
    const notes = Array.isArray(raw.notes) ? raw.notes.map(note => String(note || '').trim()).filter(Boolean).slice(0, 5) : [];
    return {
      active: !!raw.active,
      balanceCopper: Math.max(0, Math.floor(Number(raw.balanceCopper) || 0)),
      pressure: Math.max(0, Math.floor(Number(raw.pressure) || 0)),
      lastVisitAt: String(raw.lastVisitAt || '').trim().slice(0, 40),
      notes
    };
  }

  function compactLabel(state){
    const debt = debtState(state);
    const clear = debt.balanceCopper <= 0;
    const pressureText = debt.pressure > 0 ? `Pressure ${debt.pressure}` : 'No pressure';
    return {
      clear: clear ? 'Clear' : 'Notice posted',
      balance: debt.balanceCopper > 0 ? `${debt.balanceCopper} debt` : '0 debt',
      pressure: pressureText,
      active: debt.active
    };
  }

  function panelMarkup(state){
    const debt = debtState(state);
    const chips = compactLabel(state);
    const statusClass = debt.balanceCopper > 0 ? 'rarity-rare' : 'rarity-common';
    const notes = debt.notes.length
      ? `<div class="small muted debt-collector-notes">${debt.notes.map(note => `<div class="debt-collector-note">${escapeHtml(note)}</div>`).join('')}</div>`
      : '';
    return `<div class="split debt-collector-head">
      <div>
        <h2>Debt Collector</h2>
        <p>${debt.balanceCopper > 0 ? 'A marker has been posted against this Warden.' : 'No marker has been posted against this Warden.'}</p>
      </div>
      <span class="pill ${statusClass}">${debt.balanceCopper > 0 ? 'Notice Posted' : 'Clear'}</span>
    </div>
    <p class="small muted debt-collector-flavor">The collectors have a ledger. Your name is not written in it yet.</p>
    <div class="tag-row debt-collector-chips" aria-label="Debt Collector status">
      <span class="pill">${escapeHtml(chips.clear)}</span>
      <span class="pill">${escapeHtml(chips.balance)}</span>
      <span class="pill">${escapeHtml(chips.pressure)}</span>
    </div>
    <div class="debt-collector-meta small">
      <span><b>Active:</b> ${debt.active ? 'Yes' : 'No'}</span>
      <span><b>Last Visit:</b> ${escapeHtml(debt.lastVisitAt || 'None')}</span>
    </div>
    ${notes}`;
  }

  function injectCss(){
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      .debt-collector-head h2{margin:0}
      .debt-collector-head p{margin:3px 0 0}
      .debt-collector-flavor{margin-top:8px}
      .debt-collector-chips{margin-top:8px}
      .debt-collector-meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px}
      .debt-collector-notes{display:grid;gap:4px;margin-top:8px}
      .debt-collector-note{padding:6px 8px;border:1px solid rgba(255,190,110,.12);border-radius:10px;background:rgba(0,0,0,.14)}
    `;
    document.head.appendChild(style);
  }

  function renderDebtCollectorPanel(){
    injectCss();
    const slot = typeof el === 'function' ? el(PANEL_ID) : document.getElementById(PANEL_ID);
    if (!slot || typeof S === 'undefined') return;
    slot.innerHTML = panelMarkup(S);
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

  injectCss();
  if (typeof render === 'function') render();
})();
