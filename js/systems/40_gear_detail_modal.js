'use strict';

// DungeonDex v1.23.8.01 Gear Detail Modal.
// Click a visible equipped or inventory gear card to inspect it without changing gear state.
(function(){
  if (window.DDGearDetailModal) return;
  window.DDGearDetailModal = true;

  const MODAL_ID = 'gearDetailModal';
  const STYLE_ID = 'ddGearDetailModalCss';

  function text(value, fallback = ''){
    if (typeof cleanDisplayText === 'function') return cleanDisplayText(value, fallback);
    return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(value){
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function number(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatNumber(value){
    if (typeof format === 'function') return format(value);
    return String(Math.max(0, Math.floor(number(value))));
  }

  function moneyPlain(value){
    const amount = Math.max(0, Math.floor(number(value)));
    if (typeof formatMoney === 'function') return text(formatMoney(amount), `${amount}c`);
    return `${amount}c`;
  }

  function allGearItems(){
    const gear = [];
    const equipment = S && S.player && S.player.equipment && typeof S.player.equipment === 'object' ? S.player.equipment : {};
    Object.keys(equipment).forEach(slot => {
      const item = equipment[slot];
      if (item && typeof item === 'object') gear.push({ item, source: 'Equipped', slot });
    });
    const inventory = Array.isArray(S?.player?.inventory) ? S.player.inventory : [];
    inventory.forEach(item => {
      if (item && typeof item === 'object') gear.push({ item, source: 'Inventory', slot: item.slot || '' });
    });
    return gear;
  }

  function cardItemName(card){
    const node = card?.querySelector?.('.gear-equipped-name, .item-name');
    return text(node?.textContent || '');
  }

  function findGearForCard(card){
    const name = cardItemName(card).toLowerCase();
    if (!name || typeof S === 'undefined') return null;
    return allGearItems().find(entry => text(entry.item?.name || '').toLowerCase() === name) || null;
  }

  function itemRarity(item){
    if (typeof gearRarityLabel === 'function') return gearRarityLabel(item);
    return text(item?.rarity, 'Common');
  }

  function itemSlot(item, fallbackSlot){
    if (typeof slotDisplayName === 'function') return slotDisplayName(item?.slot || fallbackSlot || 'Gear');
    return text(item?.slot || fallbackSlot, 'Gear');
  }

  function itemLevel(item){
    if (typeof getItemLevelLabel === 'function') return getItemLevelLabel(item);
    return `ilvl ${Math.max(1, Math.floor(number(item?.level || item?.ilvl, 1)))}`;
  }

  function itemPower(item){
    if (typeof gearPowerValue === 'function') return gearPowerValue(item);
    return Math.max(0, Math.floor(number(item?.rating || item?.power || 0)));
  }

  function statRows(item){
    const rows = [];
    const stats = item && typeof item.stats === 'object' ? item.stats : {};
    Object.keys(stats).forEach(key => {
      const value = Math.floor(number(stats[key]));
      if (value) rows.push([key, value]);
    });
    ['power','guard','hp','maxHp','atk','wit','luck','speed'].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(item || {}, key)) {
        const value = Math.floor(number(item[key]));
        if (value && !rows.some(row => row[0] === key)) rows.push([key, value]);
      }
    });
    return rows.slice(0, 8);
  }

  function statLabel(key){
    const map = { maxHp:'HP', hp:'HP', atk:'Atk', power:'Power', guard:'Guard', wit:'Wit', luck:'Luck', speed:'Speed' };
    return map[key] || text(key).replace(/([A-Z])/g, ' $1').replace(/^./, ch => ch.toUpperCase());
  }

  function upgradeLevel(item){
    return Math.max(0, Math.floor(number(item?.upgradeLevel || item?.merchantUpgradeLevel || 0)));
  }

  function setLine(item){
    try {
      if (typeof getItemSetId === 'function' && typeof getMythicSetDefinition === 'function') {
        const def = getMythicSetDefinition(getItemSetId(item));
        if (def?.name) return text(def.name);
      }
    } catch (_) {}
    return '';
  }

  function memoryLine(item){
    try {
      if (typeof gearMemoryModel === 'function') {
        const memory = gearMemoryModel(item);
        if (memory?.title) return text(memory.title);
      }
    } catch (_) {}
    return '';
  }

  function modalMarkup(entry){
    const item = entry.item;
    const rarity = itemRarity(item);
    const slot = itemSlot(item, entry.slot);
    const level = itemLevel(item);
    const upgrade = upgradeLevel(item);
    const power = itemPower(item);
    const value = typeof sellValue === 'function' ? sellValue(item) : number(item?.value || 0);
    const stats = statRows(item);
    const summary = text(item?.summary || item?.flavor || item?.description, 'No extra notes recorded for this piece yet.');
    const maker = text(item?.maker || item?.theme || '', '');
    const set = setLine(item);
    const memory = memoryLine(item);
    const statMarkup = stats.length
      ? stats.map(([key, value]) => `<span class="gear-detail-stat"><b>${esc(statLabel(key))}</b>${esc(formatNumber(value))}</span>`).join('')
      : `<span class="gear-detail-stat"><b>Power</b>${esc(formatNumber(power))}</span>`;
    return `<div class="gear-detail-backdrop">
      <section class="gear-detail-window" role="dialog" aria-modal="true" aria-label="Gear details">
        <button class="ghost mini gear-detail-close" type="button" data-gear-detail-close="1">Close</button>
        <div class="gear-detail-kicker">${esc(entry.source)} • ${esc(slot)} • ${esc(level)}</div>
        <h2>${esc(text(item?.name, 'Unknown Gear'))}</h2>
        <div class="tag-row gear-detail-tags">
          <span class="pill">${esc(rarity)}</span>
          <span class="pill">Upgrade +${esc(formatNumber(upgrade))} / +3</span>
          <span class="pill">Score ${esc(formatNumber(power))}</span>
          <span class="pill">Sell ${esc(moneyPlain(value))}</span>
        </div>
        <div class="gear-detail-stats">${statMarkup}</div>
        <p class="gear-detail-summary">${esc(summary)}</p>
        <div class="gear-detail-notes small muted">
          ${maker ? `<span>Maker / theme: ${esc(maker)}</span>` : ''}
          ${set ? `<span>Set: ${esc(set)}</span>` : ''}
          ${memory ? `<span>Memory: ${esc(memory)}</span>` : ''}
          <span>Tip: use the normal Equip, Sell, Retire, or Lowfire Market buttons for actions.</span>
        </div>
      </section>
    </div>`;
  }

  function ensureStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .loadout-equip-card,.inventory-card{cursor:pointer}
      .loadout-equip-card:focus-visible,.inventory-card:focus-visible{outline:2px solid rgba(255,214,151,.55);outline-offset:2px}
      .gear-detail-backdrop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.68);backdrop-filter:blur(8px)}
      .gear-detail-window{position:relative;width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 36px);overflow:auto;border:1px solid rgba(255,214,151,.22);border-radius:22px;background:linear-gradient(145deg,rgba(30,25,18,.98),rgba(8,8,8,.98));box-shadow:0 24px 80px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.06);padding:18px}
      .gear-detail-window h2{margin:2px 0 8px;font-size:1.32rem;line-height:1.05;color:#f7e4bd}
      .gear-detail-close{position:absolute;top:12px;right:12px}
      .gear-detail-kicker{padding-right:74px;color:rgba(245,222,180,.72);font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .gear-detail-tags{margin:10px 0 12px}
      .gear-detail-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
      .gear-detail-stat{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid rgba(255,214,151,.12);border-radius:13px;background:rgba(255,214,151,.045)}
      .gear-detail-stat b{color:rgba(255,238,210,.78)}
      .gear-detail-summary{margin:10px 0 0;color:rgba(248,242,226,.9);line-height:1.35}
      .gear-detail-notes{display:grid;gap:5px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
      @media(max-width:460px){.gear-detail-window{padding:15px;border-radius:18px}.gear-detail-stats{grid-template-columns:1fr}.gear-detail-window h2{font-size:1.15rem}}
    `;
    document.head.appendChild(style);
  }

  function openGearDetail(entry){
    if (!entry?.item) return;
    ensureStyle();
    closeGearDetail();
    const wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.innerHTML = modalMarkup(entry);
    document.body.appendChild(wrap);
    const close = wrap.querySelector('[data-gear-detail-close]');
    if (close) close.focus?.();
  }

  function closeGearDetail(){
    const existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
  }

  document.addEventListener('click', function(event){
    const closeTarget = event.target.closest?.('[data-gear-detail-close]');
    if (closeTarget || event.target.classList?.contains('gear-detail-backdrop')) {
      closeGearDetail();
      return;
    }
    if (event.target.closest?.('button,select,input,textarea,a')) return;
    const card = event.target.closest?.('.loadout-equip-card,.inventory-card');
    if (!card) return;
    const entry = findGearForCard(card);
    if (!entry) return;
    openGearDetail(entry);
  });

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape') closeGearDetail();
  });

  window.DungeonDexGearDetailModal = { open: openGearDetail, close: closeGearDetail };
})();
