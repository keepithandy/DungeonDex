'use strict';

// DungeonDex v1.23.8.01 Gear Upgrade Summary panel.
// Read-only Gear-tab summary for Merchant Gear Upgrades; purchasing stays in town.
(function(){
  if (window.DDGearUpgradeSummaryPanel) return;
  window.DDGearUpgradeSummaryPanel = true;

  const PANEL_ID = 'gearUpgradeSummaryPanel';

  function safeText(value, fallback = ''){
    if (typeof cleanDisplayText === 'function') return cleanDisplayText(value, fallback);
    return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(value){
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function moneyPlain(value){
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    return typeof formatMoney === 'function'
      ? safeText(formatMoney(amount), `${amount}c`)
      : `${amount}c`;
  }

  function upgradeModels(state){
    if (typeof merchantGearUpgradeSummary === 'function') {
      const models = merchantGearUpgradeSummary(state);
      return Array.isArray(models) ? models : [];
    }
    return [];
  }

  function upgradeCard(model){
    const label = safeText(model?.label, 'Gear');
    const itemName = safeText(model?.itemName, model?.item ? 'Equipped gear' : `No equipped ${label.toLowerCase()}`);
    const level = Math.max(0, Math.floor(Number(model?.level) || 0));
    const cap = Math.max(level, Math.floor(Number(model?.cap) || 3));
    const capped = model?.capped === true || level >= cap;
    const hasItem = !!model?.item;
    const canBuy = hasItem && !capped && model?.affordable === true;
    const costText = moneyPlain(model?.cost);
    const missingText = moneyPlain(model?.missingCopper);
    const tierText = safeText(model?.tierText, `+${level} / +${cap}`);
    const levelText = safeText(model?.levelText, `+${level}`);
    const perTierText = safeText(model?.perTierText, label === 'Armor' ? '+2 Guard and +8 HP per tier' : '+2 Power per tier');
    const currentBonusText = safeText(model?.currentBonusText, model?.currentStat || levelText);
    const nextBonusText = safeText(model?.nextBonusText, model?.nextStat || `+${level + 1}`);
    const statusText = !hasItem
      ? `Equip a ${label.toLowerCase()} first.`
      : capped
        ? 'Maxed at +3.'
        : canBuy
          ? `Next cost ${costText}.`
          : `Need ${missingText}`;
    return `<article class="shop-item merchant-upgrade-card gear-upgrade-summary-card">
      <div class="split">
        <div>
          <div class="item-name">${esc(label)}</div>
          <div class="item-meta">${esc(itemName)} • ${esc(tierText)}</div>
        </div>
        <span class="pill ${capped ? 'rarity-uncommon' : ''}">${esc(capped ? 'Maxed' : levelText)}</span>
      </div>
      <div class="tag-row">
        <span class="pill">${esc(perTierText)}</span>
        <span class="pill">Current bonus ${esc(currentBonusText)}</span>
        ${hasItem && !capped ? `<span class="pill">Next cost ${esc(costText)}</span>` : ''}
        ${hasItem && capped ? '<span class="pill rarity-uncommon">Maxed at +3</span>' : ''}
      </div>
      <p class="small muted">${esc(`${label} ${levelText} gives ${currentBonusText}. ${perTierText}. ${!hasItem ? statusText : capped ? 'Maxed at +3.' : `Next tier gives ${nextBonusText}. ${statusText}`}`)} Upgrades are bought from the Lowfire Market.</p>
    </article>`;
  }

  function renderGearUpgradeSummaryPanel(){
    const panel = document.getElementById(PANEL_ID);
    if (!panel || typeof S === 'undefined') return;
    const models = upgradeModels(S);
    const readyCount = models.filter(model => model?.item && !model?.capped).length;
    const maxedCount = models.filter(model => model?.item && model?.capped).length;
    const body = models.length
      ? models.map(upgradeCard).join('')
      : '<p class="small muted">Merchant Gear Upgrades are not initialized yet. Visit town to refresh the Lowfire Market.</p>';
    panel.innerHTML = `<div class="split market-subhead gear-upgrade-summary-head">
      <div>
        <h2>Gear Upgrades</h2>
        <p class="small muted">Weapon upgrades are +2 Power per tier. Armor upgrades are +2 Guard and +8 HP per tier.</p>
      </div>
      <span class="pill">${esc(String(maxedCount))} maxed • ${esc(String(readyCount))} ready</span>
    </div>
    <div class="list district-ware-list gear-upgrade-summary-list">${body}</div>`;
  }

  function installRenderHook(){
    const oldRenderGear = typeof renderGear === 'function' ? renderGear : null;
    if (!oldRenderGear || oldRenderGear.__gearUpgradeSummaryPanel) return false;
    const wrapped = function(){
      const result = oldRenderGear.apply(this, arguments);
      renderGearUpgradeSummaryPanel();
      return result;
    };
    wrapped.__gearUpgradeSummaryPanel = true;
    try { renderGear = wrapped; } catch (_) { window.renderGear = wrapped; }
    return true;
  }

  window.renderGearUpgradeSummaryPanel = renderGearUpgradeSummaryPanel;
  window.DungeonDexGearUpgradeSummaryPanel = { render: renderGearUpgradeSummaryPanel };

  installRenderHook();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ installRenderHook(); renderGearUpgradeSummaryPanel(); });
  } else {
    renderGearUpgradeSummaryPanel();
  }
  window.setTimeout(function(){ installRenderHook(); renderGearUpgradeSummaryPanel(); }, 250);
})();
