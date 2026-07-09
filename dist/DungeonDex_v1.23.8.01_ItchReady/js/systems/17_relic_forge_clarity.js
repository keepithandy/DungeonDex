'use strict';

// DungeonDex v1.4.9a - Relic Forge clarity/lore overlay.
(function(){
  if (window.DDRelicForgeClarity) return;
  window.DDRelicForgeClarity = true;

  const SLOTS = ['weapon','offhand','helm','armor','gloves','boots','ring','amulet','cloak','charm'];
  const NAMES = { weapon:'Weapon', offhand:'Offhand', helm:'Helm', armor:'Armor', gloves:'Gloves', boots:'Boots', ring:'Ring', amulet:'Amulet', cloak:'Cloak', charm:'Charm' };
  const esc = value => typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmt = value => typeof format === 'function' ? format(value) : String(Math.floor(Number(value) || 0));
  const slotList = () => typeof SLOT_ORDER !== 'undefined' && Array.isArray(SLOT_ORDER) ? SLOT_ORDER : SLOTS;

  function forgeState(state){
    if (window.DungeonDexRelicForge && typeof window.DungeonDexRelicForge.ensure === 'function') window.DungeonDexRelicForge.ensure(state);
    if (!state.town) state.town = {};
    if (!state.player) state.player = {};
    state.town.forgeTier = Math.max(1, Math.min(5, Math.floor(Number(state.town.forgeTier) || 1)));
    state.town.relicFavor = Math.max(0, Math.floor(Number(state.town.relicFavor) || 0));
    state.player.forgeSpark = Math.max(0, Math.floor(Number(state.player.forgeSpark) || 0));
    state.player.shards = Math.max(0, Math.floor(Number(state.player.shards) || 0));
    state.player.ember = Math.max(0, Math.floor(Number(state.player.ember) || 0));
    state.player.inventory = Array.isArray(state.player.inventory) ? state.player.inventory : [];
    return state;
  }

  function equipped(state, item){
    if (!state?.player?.equipment || !item?.id) return false;
    return Object.values(state.player.equipment).some(eq => eq && eq.id === item.id);
  }

  function canSalvage(state, item){
    if (!item || item.kind === 'special' || equipped(state, item) || item.locked || item.favorite || item.protected) return false;
    const rarity = String(item.rarity || 'common').toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags : [];
    return rarity === 'common' || rarity === 'uncommon' || tags.includes('junk') || tags.includes('starter');
  }

  function temperCost(state, item){
    const tier = Math.max(1, Math.floor(Number(state?.town?.forgeTier) || 1));
    const count = Math.max(0, Math.floor(Number(item?.tempered) || 0));
    return { shards: 50 + tier * 10 + count * 22, ember: 1 + Math.floor(count / 2) };
  }

  function temperButtonsMarkup(state){
    const rows = slotList().map(slot => ({ slot, item: state.player.equipment && state.player.equipment[slot] })).filter(row => row.item);
    if (!rows.length) return '<p class="small muted">Equip gear first. Tempering only works on worn items.</p>';
    return `<div class="forge-grid forge-temper-grid">${rows.map(({slot, item}) => {
      const count = Math.max(0, Math.floor(Number(item.tempered) || 0));
      const cap = 3 + state.town.forgeTier;
      const cost = temperCost(state, item);
      const disabled = count >= cap || state.player.shards < cost.shards || state.player.ember < cost.ember ? 'disabled' : '';
      return `<button class="ghost mini" data-temper-slot="${esc(slot)}" ${disabled}>${esc(NAMES[slot] || slot)} +${count}/${cap}<br><span>${cost.shards} shards + ${cost.ember} ember</span></button>`;
    }).join('')}</div>`;
  }

  function forgePanelMarkup(state){
    forgeState(state);
    const safe = state.player.inventory.filter(item => canSalvage(state, item)).length;
    return `<div class="card-head forge-head">
      <div><h2>Lowfire Relic Forge</h2><p>Lowfire breaks useless relics down, then hammers the pieces into gear you can actually use.</p></div>
      <span class="pill rarity-rare">Tier ${fmt(state.town.forgeTier)}</span>
    </div>
    <div class="tag-row forge-wallet">
      <span class="pill">Spark ${fmt(state.player.forgeSpark)}</span><span class="pill">Shards ${fmt(state.player.shards)}</span><span class="pill">Ember ${fmt(state.player.ember)}</span><span class="pill">Favor ${fmt(state.town.relicFavor)}</span>
    </div>
    <div class="sep"></div>
    <div class="forge-grid"><button class="primary" id="forgeBtn">Forge Random Relic<br><span>1 spark + 40 shards</span></button><button class="ghost" id="salvageForgeBtn">Salvage Junk<br><span>${safe} safe items</span></button></div>
    <p class="small muted forge-note">Random Forge is the cheap option: spend a spark and shards to roll a rare-or-better relic from any slot.</p>
    <div class="sep"></div>
    <p class="small forge-explain"><strong>Focused Forge:</strong> choose the gear slot before the relic is made. The exact name, rarity, and stats still roll randomly. Costs 1 spark + 75 shards + 1 ember because you are forcing the shape of the relic.</p>
    <div class="forge-grid forge-slot-grid">${slotList().map(slot => `<button class="ghost mini" data-forge-slot="${esc(slot)}">${esc(NAMES[slot] || slot)}</button>`).join('')}</div>
    <div class="sep"></div>
    <p class="small forge-explain"><strong>Tempering:</strong> permanently upgrades equipped gear. Each use adds +1 temper and raises item level, rating, stats, and value. Costs rise each time; higher Forge Tier raises the temper cap.</p>
    ${temperButtonsMarkup(state)}
    <div class="sep"></div><p class="small muted">Simple loop: run dungeon -> keep good gear -> salvage weak gear -> focus or temper the pieces you care about. Material farming is tracked on the Lowfire Board.</p>`;
  }

  function injectStyles(){
    if (document.getElementById('ddForgeClarityCss')) return;
    const style = document.createElement('style');
    style.id = 'ddForgeClarityCss';
    style.textContent = '#forgePanel .forge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#forgePanel button span{font-size:11px;opacity:.78}#forgePanel .forge-explain,#forgePanel .forge-note{line-height:1.45}@media(max-width:560px){#forgePanel .forge-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function bindActions(){
    injectStyles();
    const api = window.DungeonDexRelicForge || {};
    const guarded = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
    const byId = id => typeof el === 'function' ? el(id) : document.getElementById(id);
    const query = typeof $$ === 'function' ? $$ : selector => Array.from(document.querySelectorAll(selector));
    const randomBtn = byId('forgeBtn');
    if (randomBtn && typeof api.craft === 'function') randomBtn.onclick = () => guarded(() => { api.craft(S, null, false); render(); });
    const salvageBtn = byId('salvageForgeBtn');
    if (salvageBtn && typeof api.salvage === 'function') salvageBtn.onclick = () => guarded(() => { api.salvage(S); render(); });
    query('[data-forge-slot]').forEach(btn => btn.onclick = () => guarded(() => { if (typeof api.craft === 'function') api.craft(S, btn.dataset.forgeSlot, true); render(); }));
    query('[data-temper-slot]').forEach(btn => btn.onclick = () => guarded(() => { if (typeof api.temper === 'function') api.temper(S, btn.dataset.temperSlot); render(); }));
  }

  const oldRenderTown = typeof renderTown === 'function' ? renderTown : window.renderTown;
  if (typeof oldRenderTown === 'function') {
    const patchedRenderTown = function(){ oldRenderTown(); injectStyles(); const panel = typeof el === 'function' ? el('forgePanel') : document.getElementById('forgePanel'); if (panel && typeof S !== 'undefined') panel.innerHTML = forgePanelMarkup(S); };
    try { renderTown = patchedRenderTown; } catch (_) { window.renderTown = patchedRenderTown; }
  }

  const oldBindDynamic = typeof bindDynamic === 'function' ? bindDynamic : window.bindDynamic;
  if (typeof oldBindDynamic === 'function') {
    const patchedBindDynamic = function(){ oldBindDynamic(); bindActions(); };
    try { bindDynamic = patchedBindDynamic; } catch (_) { window.bindDynamic = patchedBindDynamic; }
  }

  injectStyles();
  if (typeof S !== 'undefined') forgeState(S);
  if (typeof render === 'function') render();
})();
