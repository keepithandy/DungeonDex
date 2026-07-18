'use strict';

// DungeonDex v1.26.3.02 — canonical Town wallet strip.
// Owns the compact Town currency reference after duplicate strip cleanup.
(function(){
  if (window.DDTownWalletChipFix) return;
  window.DDTownWalletChipFix = true;

  function whole(value){
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function shortNumber(value){
    if (typeof format === 'function') return format(whole(value));
    return String(whole(value));
  }

  function compactCoin(value){
    const total = whole(value);
    const gold = Math.floor(total / 10000);
    const silver = Math.floor((total % 10000) / 100);
    const copper = total % 100;
    const parts = [];
    if (gold) parts.push(`${gold}g`);
    if (silver || gold) parts.push(`${silver}s`);
    parts.push(`${copper}c`);
    return parts.join(' ');
  }

  function townWalletMarkup(state){
    const player = state?.player || {};
    const town = state?.town || {};
    return `<div class="town-wallet-chips" aria-label="Town currency reference">
      <span title="Coins pay for rest, market gear, board shuffles, and repairs.">Coin ${compactCoin(player.gold || 0)}</span>
      <span title="Forge Spark is earned from Lowfire Board work and spent on relic crafts.">Spark ${shortNumber(player.forgeSpark || 0)}</span>
      <span title="Shards come from fights and salvaging gear. Used for crafting and tempering.">Shards ${shortNumber(player.shards || 0)}</span>
      <span title="Ember comes from bosses, events, and deeper runs. Used for Ashburst and focused forge work.">Ember ${shortNumber(player.ember || 0)}</span>
      <span title="Favor rises from forge work and raises Forge Tier.">Favor ${shortNumber(town.relicFavor || 0)}</span>
    </div>`;
  }

  function renderTownWallet(state){
    const slot = typeof el === 'function' ? el('districtWalletSlot') : document.getElementById('districtWalletSlot');
    if (!slot || !state?.player) return;
    slot.innerHTML = townWalletMarkup(state);
  }

  function renderTownShellIdentity(){
    const questPanel = typeof el === 'function' ? el('questPanel') : document.getElementById('questPanel');
    const merchantPanel = typeof el === 'function' ? el('merchantPanel') : document.getElementById('merchantPanel');
    const forgePanel = typeof el === 'function' ? el('forgePanel') : document.getElementById('forgePanel');
    if (questPanel) questPanel.classList.add('town-section-shell', 'town-board-shell');
    if (merchantPanel) merchantPanel.classList.add('town-section-shell', 'town-market-shell');
    if (forgePanel) forgePanel.classList.add('town-section-shell', 'town-forge-shell');
  }

  function injectCss(){
    if (document.getElementById('ddTownWalletChipFixCss')) return;
    const style = document.createElement('style');
    style.id = 'ddTownWalletChipFixCss';
    style.textContent = `
      .district-wallet-slot{margin-top:5px!important;display:block!important;max-width:100%!important;overflow:visible!important}
      .town-wallet-chips{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:4px 6px!important;margin:0!important;padding:0!important;font-size:11px!important;line-height:1.15!important;color:rgba(244,232,210,.86)!important}
      .town-wallet-chips>span{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:21px!important;border:1px solid rgba(255,190,110,.18)!important;border-radius:999px!important;background:rgba(0,0,0,.18)!important;padding:3px 7px!important;font-size:11px!important;line-height:1!important;font-weight:650!important;white-space:nowrap!important;color:rgba(244,232,210,.88)!important;box-shadow:none!important}
      .town-wallet-chips>span:first-child{color:#f4dfad!important;background:rgba(255,170,69,.07)!important;border-color:rgba(255,190,110,.22)!important}
    `;
    document.head.appendChild(style);
  }

  function install(){
    injectCss();
    renderTownShellIdentity();
    if (typeof S !== 'undefined') renderTownWallet(S);
  }

  const oldRenderTown = typeof renderTown === 'function' ? renderTown : window.renderTown;
  if (oldRenderTown && !oldRenderTown.__townWalletChipFixed) {
    const wrapped = function(){
      const result = oldRenderTown.apply(this, arguments);
      install();
      return result;
    };
    wrapped.__townWalletChipFixed = true;
    try { renderTown = wrapped; } catch (_) { window.renderTown = wrapped; }
  }

  window.DungeonDexTownWallet = Object.freeze({
    markup: townWalletMarkup,
    render: renderTownWallet
  });

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 100);
  window.setTimeout(install, 500);
})();