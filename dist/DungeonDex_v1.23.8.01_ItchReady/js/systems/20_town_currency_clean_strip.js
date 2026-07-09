'use strict';

// DungeonDex v1.4.9a — Town currency strip cleanup.
(function(){
  if (window.DDTownCurrencyCleanStrip) return;
  window.DDTownCurrencyCleanStrip = true;

  const fmt = value => typeof format === 'function' ? format(value) : String(Math.round(Number(value) || 0));
  const money = value => typeof formatMoney === 'function' ? formatMoney(value) : `${Math.floor(Number(value) || 0)}c`;

  function stripMarkup(state){
    if (!state || !state.player) return '';
    return `<div class="town-currency-strip clean-town-currency" aria-label="Compact currency reference">
      <span title="Coins pay for rest, market gear, board shuffles, and repairs.">Coin ${money(state.player.gold || 0)}</span>
      <span title="Spark drops from objectives and is spent on forge crafts.">Spark ${fmt(state.player.forgeSpark || 0)}</span>
      <span title="Shards come from rooms, elites, bosses, and salvage. Used for crafting and tempering.">Shards ${fmt(state.player.shards || 0)}</span>
      <span title="Ember drops during descent and fuels Ashburst, focused forging, and tempering.">Ember ${fmt(state.player.ember || 0)}</span>
      <span title="Favor rises when you craft, salvage, or temper. It raises forge tier.">Favor ${fmt(state.town?.relicFavor || 0)}</span>
    </div>`;
  }

  function injectCss(){
    if (document.getElementById('ddTownCurrencyCleanCss')) return;
    const style = document.createElement('style');
    style.id = 'ddTownCurrencyCleanCss';
    style.textContent = `
      .clean-town-currency{margin-top:5px;gap:4px 6px}
      .clean-town-currency span{font-size:10.75px;padding:3px 6px}
    `;
    document.head.appendChild(style);
  }

  function renderCleanStrip(){
    injectCss();
    const slot = typeof el === 'function' ? el('districtWalletSlot') : document.getElementById('districtWalletSlot');
    if (slot && typeof S !== 'undefined') slot.innerHTML = stripMarkup(S);
  }

  const oldRenderTown = typeof renderTown === 'function' ? renderTown : null;
  if (oldRenderTown) {
    renderTown = function townCurrencyCleanRender(){
      oldRenderTown();
      renderCleanStrip();
    };
  }

  injectCss();
  if (typeof render === 'function') render();
})();
