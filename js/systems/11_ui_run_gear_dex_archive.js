'use strict';

// Run, gear, inventory, Dex, archive renderers
  function combatStageDistrictClass(state, district, depth) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth, state?.run?.floor || state?.player?.returnDepth || 1, 1, 999999)));
    const source = [district?.id, district?.tone, district?.name, state?.run?.zone].filter(Boolean).join(' ');
    const key = String(source || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

    if (safeDepth <= 4 || key.includes('lowsteps') || key.includes('ashgate')) return 'district-lowsteps';
    if (key.includes('lowfire')) return 'district-lowfire';
    if (key.includes('veyruhn') || key.includes('bellforge') || key.includes('debtworks') || key.includes('cinderbone')) return 'district-veyruhn';
    if (key.includes('mireglass') || key.includes('mire') || key.includes('sootveil')) return 'district-mireglass';
    if (key.includes('redchapel') || key.includes('chapel') || key.includes('blacktithe')) return 'district-redchapel';
    if (key.includes('saltforge') || key.includes('salt') || key.includes('hunger') || key.includes('kiln')) return 'district-saltforge';
    if (key.includes('sunkencourt') || key.includes('sunken') || key.includes('redwake') || key.includes('catacomb')) return 'district-sunkencourt';
    if (key.includes('noctis') || key.includes('atelier') || key.includes('lanternless') || key.includes('lowflame')) return 'district-noctis';

    if (safeDepth <= 10) return 'district-lowfire';
    if (safeDepth <= 25) return 'district-veyruhn';
    if (safeDepth <= 38) return 'district-mireglass';
    if (safeDepth <= 50) return 'district-saltforge';
    if (safeDepth <= 62) return 'district-redchapel';
    if (safeDepth <= 78) return 'district-sunkencourt';
    if (safeDepth <= 100) return 'district-noctis';
    return 'district-generic';
  }

  function renderRun() {
    const runStatus = el('runStatus');
    const combatPanel = el('combatPanel');
    const combatLog = el('combatLog');
    if (!runStatus || !combatPanel || !combatLog) return;
    const d = calcDerived(S);
    const monster = S.run.monster;
    if (!S.ui) S.ui = { combatLogExpanded:false };
    const depth = S.run.floor || 1;
    const depthMeta = depthProgressMeta(depth);
    const runDistrict = currentStagingDistrict(S);
    const isBossFight = monster && monster.tier === 'Boss';
    const isEliteFight = monster && monster.tier === 'Elite';
    const currentFloorText = floorNumberLabel(depth);
    const nextBoss = nextBossFloorFromDepth(depth);
    const nextBossText = isBossFight ? `${bossFloorLabel(depth)} now` : `Next boss: ${bossFloorLabel(nextBoss.floor)}`;
    const encounterLabel = isBossFight ? 'Boss Floor' : isEliteFight ? 'Elite Encounter' : 'Hollow Stair Encounter';
    const bossTitle = isBossFight ? (bossFloorNameByDepth(depth) || bossFloorLabel(depth)) : '';
    const enemyKicker = isBossFight ? `${bossFloorLabel(depth)} • ${bossTitle}` : (monster?.tier || 'Enemy');
    const playerHpPct = Math.max(0, Math.min(100, (S.player.hp / Math.max(1, S.player.maxHp)) * 100));
    const monsterHpPct = monster ? Math.max(0, Math.min(100, (monster.hp / Math.max(1, monster.maxHp)) * 100)) : 0;
    const pendingRewards = ensurePendingRunRewards(S);
    const hasUnsecured = hasPendingRunRewards(pendingRewards);
    const monsterGuard = monster ? Math.max(0, Math.floor(numberOr(monster.guard, 0, 0, 999999))) : 0;
    const shellTone = `${districtToneClass(runDistrict)} ${isBossFight ? 'combat-device-boss boss-atmosphere' : isEliteFight ? 'combat-device-elite' : ''}`;
    const stageDistrictClass = combatStageDistrictClass(S, runDistrict, depth);
    const playerDanger = playerHpPct <= 25 ? 'hp-critical' : playerHpPct <= 50 ? 'hp-warn' : '';
    const monsterDanger = monsterHpPct <= 25 ? 'hp-critical' : monsterHpPct <= 50 ? 'hp-warn' : '';
    const eliteMarkup = monster ? eliteModifierMarkup(monster) : '';
    const threatBrief = monster
      ? isBossFight
        ? `<div class="combat-threat-brief boss-threat-brief"><b>Boss floor:</b> heavier pressure, better stakes. Guard before risky bursts.</div>`
        : isEliteFight
          ? `<div class="combat-threat-brief elite-threat-brief"><b>Elite plan:</b> ${escapeHtml(eliteModifierPlanLine(eliteModifiersForMonster(monster)))}</div>`
          : ''
      : '';

    if (!S.run.active || !monster) {
      runStatus.innerHTML = `
        <div class="split"><div><h2>No active descent</h2><p>Rest in Lowfire, then return to the Hollow Stair when ready.</p></div><button class="primary mini" id="runFromIdleBtn">Enter Dungeon</button></div>`;
      combatPanel.innerHTML = `<p>No Hollow Stair threat detected.</p>`;
      combatLog.innerHTML = `<div class="run-log-head split"><h2>Combat Feed</h2><span class="pill">Idle</span></div><div class="run-log-list"><div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Resting</div><div class="feed-body">Lowfire is quiet.</div></div></div></div>`;
      return;
    }

    runStatus.innerHTML = `
      <div class="combat-device-top ${shellTone}">
        <div class="combat-top-strip run-shell-top" aria-label="Run status">
          <span class="combat-district-title">${escapeHtml(runDistrict.name)}</span>
          <span>${escapeHtml(currentFloorText)} • ${escapeHtml(encounterLabel)}</span>
        </div>
        <div class="run-progress-only" aria-label="Run progress">
          <div class="split run-progress-copy">
            <span>Room ${format(depthMeta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)} • C${format(depthMeta.chapter)}</span>
            <span>${escapeHtml(nextBossText)}</span>
          </div>
          <div class="depth-meter"><div style="width:${depthMeta.chapterPct.toFixed(1)}%"></div></div>
        </div>
      </div>`;

    combatPanel.innerHTML = `
      <div class="combat-device-shell ${shellTone}" aria-label="Combat screen">
        <section class="combat-enemy-header">
          <div class="depth-kicker">${escapeHtml(enemyKicker)}</div>
          <h2>${escapeHtml(monster.name || 'Unknown Threat')}</h2>
          <p class="small muted">${escapeHtml(monster.family || 'Depthborn')} · ${escapeHtml(monster.skill || 'Basic attack')}</p>
          ${eliteMarkup}
          ${threatBrief}
        </section>

        <section class="combat-monster-stage ${stageDistrictClass} ${isBossFight ? 'stage-boss' : isEliteFight ? 'stage-elite' : ''}" aria-label="Enemy stage">
          <div class="monster-aura"></div>
          <div class="monster-silhouette">
            <span class="monster-horns" aria-hidden="true"></span>
            <span class="monster-core" aria-hidden="true">${isBossFight ? '♛' : isEliteFight ? '◆' : '▲'}</span>
          </div>
          <div class="stage-floor"></div>
        </section>

        <section class="combat-hp-card enemy-hp ${monsterDanger} ${isBossFight ? 'boss-hp' : isEliteFight ? 'elite-hp' : ''}">
          <div class="hp-label-row"><strong>${escapeHtml(monster.name || 'Enemy')}</strong><span>${format(monster.hp)} / ${format(monster.maxHp)} HP</span></div>
          <div class="hpbar"><span style="width:${monsterHpPct}%"></span></div>
          <div class="combat-stat-row">
            <span class="pill">PWR ${format(monster.power || 0)}</span>
            <span class="pill">GRD ${format(monsterGuard)}</span>
          </div>
        </section>

        <section class="combat-hp-card player-hp ${playerDanger}">
          <div class="hp-label-row"><strong>Warden</strong><span>${format(S.player.hp)} / ${format(S.player.maxHp)} HP</span></div>
          <div class="hpbar player-hpbar"><span style="width:${playerHpPct}%"></span></div>
          <div class="combat-stat-row">
            ${hasUnsecured ? '<span class="pill pill-danger">Unsecured loot</span>' : ''}
            <span class="pill">Gold ${stripHtml(formatMoney(S.player.gold || 0))}</span>
            <span class="pill">Shards ${format(S.player.shards || 0)}</span>
            <span class="pill">Ember ${format(S.player.ember || 0)}</span>
          </div>
        </section>

        <section class="combat-hud run-stat-grid" aria-label="Player combat stats">
          ${statBox('PWR', d.power)}
          ${statBox('GRD', d.guard)}
          ${statBox('SPD', d.speed)}
          ${statBox('LCK', d.luck)}
        </section>

        <section class="combat-device-actions" aria-label="Combat actions">
          <button class="primary combat-btn attack-btn" data-action="attack" aria-label="Attack enemy">Attack</button>
          <button class="ghost combat-btn skill-btn" data-action="skill" aria-label="Use Ashburst skill">Skill</button>
          <button class="ghost combat-btn guard-btn" data-action="guard" aria-label="Guard and recover HP">Guard</button>
          <button class="ghost combat-btn danger-btn extract-btn" data-action="extract" aria-label="Attempt to extract from the Hollow Stair">Extract</button>
        </section>
      </div>`;

    const logLines = asArray(S.run.combatLog).slice(0, COMBAT_LOG_RENDER_LIMIT);
    combatLog.innerHTML = `
      <div class="run-log-head split"><h2>Combat Feed</h2><div class="tag-row"><span class="pill">Latest ×${format(logLines.length)}</span></div></div>
      <div class="run-log-list">${logLines.length ? logLines.map(renderCombatFeedLine).join('') : '<div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Quiet</div><div class="feed-body">No combat messages yet.</div></div></div>'}</div>`;
  }
  const LOADOUT_SLOT_GROUPS = [
    { label:'Weapon', slots:['weapon','offhand'] },
    { label:'Armor', slots:['helm','armor','gloves','boots'] },
    { label:'Jewelry', slots:['ring','amulet'] },
    { label:'Special', slots:['cloak','charm'] }
  ];

  const LOADOUT_STAT_LABELS = {
    power: 'Atk',
    guard: 'Guard',
    hp: 'HP',
    speed: 'Spd',
    wit: 'Wit',
    luck: 'Luck'
  };

  const LOADOUT_SLOT_STAT_PRIORITY = {
    weapon: ['power','speed','luck'],
    offhand: ['guard','wit','power'],
    helm: ['hp','guard','wit'],
    armor: ['guard','hp','power'],
    gloves: ['power','speed','luck'],
    boots: ['speed','guard','hp'],
    ring: ['hp','luck','wit'],
    amulet: ['wit','hp','luck'],
    cloak: ['speed','luck','guard'],
    charm: ['luck','wit','power']
  };

  function slotDisplayName(slot) {
    const key = String(slot || 'gear').replace(/[-_]+/g, ' ').trim().toLowerCase() || 'gear';
    return key.replace(/\b[a-z]/g, ch => ch.toUpperCase());
  }

  function loadoutFilters() {
    if (!isPlainObject(S.filters)) S.filters = {};
    return {
      slot: S.filters.slot || 'all',
      rarity: S.filters.rarity || 'all',
      sort: S.filters.sort || 'power',
      search: String(S.filters.search || '')
    };
  }

  function loadoutDisplaySlots() {
    return asArray(EQUIPMENT_DISPLAY_SLOTS, SLOT_ORDER).filter(Boolean);
  }

  function loadoutSlotGroups() {
    const displaySlots = loadoutDisplaySlots();
    const grouped = new Set(LOADOUT_SLOT_GROUPS.flatMap(group => group.slots));
    const groups = LOADOUT_SLOT_GROUPS
      .map(group => ({ ...group, slots: group.slots.filter(slot => displaySlots.includes(slot)) }))
      .filter(group => group.slots.length);
    const overflow = displaySlots.filter(slot => !grouped.has(slot));
    if (overflow.length) groups.push({ label:'Other', slots: overflow });
    return groups;
  }

  function cleanGearText(value, fallback = '') {
    return cleanDisplayText(value, fallback);
  }

  function safeGearStats(item) {
    const stats = isPlainObject(item?.stats) ? item.stats : {};
    return {
      power: Math.floor(numberOr(stats.power, 0, 0, 99999)),
      guard: Math.floor(numberOr(stats.guard, 0, 0, 99999)),
      wit: Math.floor(numberOr(stats.wit, 0, 0, 99999)),
      luck: Math.floor(numberOr(stats.luck, 0, 0, 99999)),
      speed: Math.floor(numberOr(stats.speed, 0, 0, 99999)),
      hp: Math.floor(numberOr(stats.hp, 0, 0, 99999))
    };
  }

  function gearPowerValue(item) {
    return Math.floor(numberOr(item?.rating, getItemLevelValue(item) || 0, 0, 999999));
  }

  function gearPrimaryStat(item, fallbackSlot = 'weapon') {
    const stats = safeGearStats(item);
    const slot = baseSlotForSlot(item?.slot || fallbackSlot, 'weapon');
    const preferred = LOADOUT_SLOT_STAT_PRIORITY[slot] || ['power','guard','hp','speed','wit','luck'];
    const orderedKeys = preferred.concat(Object.keys(LOADOUT_STAT_LABELS).filter(key => !preferred.includes(key)));
    const key = orderedKeys.find(statKey => stats[statKey] > 0);
    if (!key) return null;
    return { key, label: LOADOUT_STAT_LABELS[key] || slotDisplayName(key), value: stats[key] };
  }

  function gearScoreMarkup(item, fallbackSlot = 'weapon') {
    const power = gearPowerValue(item);
    const primary = gearPrimaryStat(item, fallbackSlot);
    const statMarkup = primary
      ? `<span><b>${format(primary.value)}</b><small>${escapeHtml(primary.label)}</small></span>`
      : '';
    return `<div class="gear-score-grid"><span><b>${format(power)}</b><small>Power</small></span>${statMarkup}</div>`;
  }

  function gearRarityLabel(item) {
    const key = itemRarityKey(item);
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function gearSlotTypeText(slotLabel, typeLabel) {
    const slot = cleanGearText(slotLabel, 'Gear');
    const type = cleanGearText(typeLabel);
    return type && type !== slot ? `${slot} / ${type}` : slot;
  }

  function gearUpgradeDelta(item, state) {
    const slot = item?.slot;
    const equipment = isPlainObject(state?.player?.equipment) ? state.player.equipment : {};
    const equipped = slot ? equipment[slot] : null;
    if (!equipped || equipped.id === item?.id) return 0;
    return Math.max(0, Math.floor(gearPowerValue(item) - gearPowerValue(equipped)));
  }

  function gearStatusBadges(item) {
    const badges = [];
    const delta = gearUpgradeDelta(item, S);
    if (delta > 0) badges.push(`<span class="gear-status-badge better">Better +${format(delta)}</span>`);
    const setDef = getMythicSetDefinition(getItemSetId(item));
    if (setDef) badges.push(`<span class="gear-status-badge set">${escapeHtml(setDef.name)}</span>`);
    if (canQuickSellItem(S, item)) badges.push('<span class="gear-status-badge junk">Junk</span>');
    return badges.join('');
  }

  function equippedSlotCard(slot) {
    const equipment = isPlainObject(S.player?.equipment) ? S.player.equipment : {};
    const item = isPlainObject(equipment[slot]) ? equipment[slot] : null;
    const slotLabel = slotDisplayName(slot);
    if (!item) {
      return `<article class="equip-slot loadout-equip-card equip-slot-empty">
        <div class="gear-card-top"><span class="gear-slot-label">${escapeHtml(slotLabel)}</span><span class="empty-slot-pill">Empty</span></div>
      </article>`;
    }
    const rarityKey = itemRarityKey(item);
    const itemName = cleanGearText(item.name, `${slotLabel} Gear`);
    const typeLabel = slotDisplayName(item.slot || slot);
    const slotTypeLabel = gearSlotTypeText(slotLabel, typeLabel);
    const levelLabel = getItemLevelLabel(item);
    const setMini = setBonusMiniMarkup(item, S);
    return `<article class="equip-slot loadout-equip-card equip-slot-filled ${getRarityCardClass(item)}" aria-label="${escapeHtml(slotLabel)} equipped: ${escapeHtml(itemName)}">
      <div class="gear-card-name gear-equipped-name ${rarityClass(rarityKey)}">${escapeHtml(itemName)}</div>
      <div class="gear-card-top gear-card-meta-row"><span class="gear-slot-label">${escapeHtml(slotTypeLabel)}</span><span class="gear-rarity-pill ${rarityClass(rarityKey)}">${escapeHtml(gearRarityLabel(item))}</span></div>
      <div class="gear-card-subline gear-card-level-line"><span>${escapeHtml(levelLabel)}</span></div>
      ${gearScoreMarkup(item, slot)}
      ${setMini}
    </article>`;
  }

  function equippedGroupMarkup(group) {
    const equipment = isPlainObject(S.player?.equipment) ? S.player.equipment : {};
    const filled = group.slots.filter(slot => isPlainObject(equipment[slot])).length;
    return `<section class="loadout-group">
      <div class="loadout-group-title"><span>${escapeHtml(group.label)}</span><span>${format(filled)} / ${format(group.slots.length)}</span></div>
      <div class="equipped-slot-grid">${group.slots.map(equippedSlotCard).join('')}</div>
    </section>`;
  }

  function renderGearPlayerPanel(panel, equipment, displaySlots, equippedCount) {
    const d = calcDerived(S);
    const bestDepth = Math.max(
      1,
      Math.floor(numberOr(S.player?.depth, 0, 0, 999999)),
      Math.floor(numberOr(S.player?.safeExtractDepth, 1, 1, 999999))
    );
    const openSlots = displaySlots.filter(slot => !isPlainObject(equipment[slot]));
    const openSlotLabel = openSlots.length
      ? `Open: ${openSlots.map(slot => escapeHtml(slotDisplayName(slot))).join(', ')}`
      : 'All slots filled';
    panel.innerHTML = `
      <div class="gear-player-head">
        <div class="gear-player-title">Warden Loadout</div>
        <span class="pill loadout-count-pill">Equipped ${format(equippedCount)} / ${format(displaySlots.length)}</span>
      </div>
      <div class="gear-player-stat-grid">
        <div class="gear-player-stat"><span>Power</span><strong>${format(d.power)}</strong></div>
        <div class="gear-player-stat"><span>Guard</span><strong>${format(d.guard)}</strong></div>
        <div class="gear-player-stat"><span>HP</span><strong>${format(S.player.hp)} / ${format(S.player.maxHp)}</strong></div>
        <div class="gear-player-stat"><span>Best Floor</span><strong>${escapeHtml(depthShortLabel(bestDepth))}</strong></div>
        <div class="gear-player-stat"><span>Wallet</span><strong>${formatMoney(S.player.gold || 0)}</strong></div>
      </div>
      <div class="gear-player-open-slots">${openSlotLabel}</div>`;
  }

  function renderGear() {
    const gearPlayerPanel = el('gearPlayerPanel');
    const equipmentPanel = el('equipmentPanel');
    const filtersPanel = el('filtersPanel');
    const inventoryPanel = el('inventoryPanel');
    if (!equipmentPanel || !filtersPanel || !inventoryPanel) return;
    equipmentPanel.classList.add('loadout-panel');
    filtersPanel.classList.add('loadout-filter-panel');
    inventoryPanel.classList.add('loadout-inventory-panel');

    const equipment = isPlainObject(S.player?.equipment) ? S.player.equipment : {};
    const displaySlots = loadoutDisplaySlots();
    const equippedCount = displaySlots.filter(slot => isPlainObject(equipment[slot])).length;
    const filters = loadoutFilters();
    if (gearPlayerPanel) renderGearPlayerPanel(gearPlayerPanel, equipment, displaySlots, equippedCount);
    equipmentPanel.innerHTML = `
      <div class="loadout-head">
        <div><h2>Equipped</h2><p class="small muted">Worn gear by slot.</p></div>
        <span class="pill loadout-count-pill">${format(equippedCount)} / ${format(displaySlots.length)} slots</span>
      </div>
      <div class="loadout-groups">${loadoutSlotGroups().map(equippedGroupMarkup).join('')}</div>`;

    filtersPanel.innerHTML = `
      <div class="filter-head"><h2>Filters</h2><span class="small muted">Inventory view</span></div>
      <div class="filter-grid loadout-filter-grid">
        <select id="slotFilter" aria-label="Filter inventory by slot">${['all', ...FUTURE_EQUIPMENT_SLOTS].map(x => `<option value="${escapeHtml(x)}" ${filters.slot===x?'selected':''}>${x === 'all' ? 'All slots' : escapeHtml(slotDisplayName(x))}</option>`).join('')}</select>
        <select id="rarityFilter" aria-label="Filter inventory by rarity">${['all', ...RARITIES.map(r => r.key)].map(x => `<option value="${escapeHtml(x)}" ${filters.rarity===x?'selected':''}>${x === 'all' ? 'All rarities' : escapeHtml(slotDisplayName(x))}</option>`).join('')}</select>
        <select id="sortFilter" aria-label="Sort inventory">
          <option value="power" ${filters.sort==='power'?'selected':''}>Best Power</option>
          <option value="level" ${filters.sort==='level'?'selected':''}>Item level</option>
          <option value="rarity" ${filters.sort==='rarity'?'selected':''}>Rarity</option>
          <option value="value" ${filters.sort==='value'?'selected':''}>Sell value</option>
          <option value="slot" ${filters.sort==='slot'?'selected':''}>Slot</option>
          <option value="newest" ${filters.sort==='newest'?'selected':''}>Newest</option>
        </select>
      </div>
      <input id="searchFilter" value="${escapeHtml(filters.search)}" placeholder="search gear" aria-label="Search inventory" />`;

    renderInventoryPanel();
  }

  function renderInventoryPanel() {
    const inventoryPanel = el('inventoryPanel');
    if (!inventoryPanel) return;
    inventoryPanel.classList.add('loadout-inventory-panel');
    const inv = filteredInventory();
    const inventory = asArray(S.player?.inventory, []);
    const safeSellCount = inventory.filter(item => canQuickSellItem(S, item)).length;
    const allSellCount = inventory.filter(item => canSellAllGearItem(S, item)).length;
    const sellJunkBtn = `<button class="ghost mini tiny-sell-all" id="sellJunkGearBtn" title="Sells unequipped gear marked as Junk" ${safeSellCount ? '' : 'disabled'}>Sell Junk</button>`;
    const sellAllBtn = `<button class="ghost mini tiny-sell-all danger-sell-all" id="sellAllGearBtn" title="Sells all unequipped sellable gear after two confirmations" ${allSellCount ? '' : 'disabled'}>Sell All</button>`;
    inventoryPanel.innerHTML = `
      <div class="split inventory-head loadout-inventory-head"><div><h2>Inventory</h2><p class="small muted inventory-subline">Gear you can equip or sell.</p></div><div class="inventory-actions"><span class="pill item-count-pill">${format(inv.length)} shown</span>${sellJunkBtn}${sellAllBtn}</div></div>
      <div class="list inventory-list">${inv.map(itemCard).join('') || '<div class="empty-inventory-card"><strong>No matching gear</strong><span>Adjust filters or keep delving.</span></div>'}</div>`;
  }

  function filteredInventory() {
    const filters = loadoutFilters();
    const items = asArray(S.player?.inventory, []).filter(item => {
      if (!isPlainObject(item)) return false;
      if (filters.slot !== 'all' && item.slot !== filters.slot) return false;
      if (filters.rarity !== 'all' && itemRarityKey(item) !== filters.rarity) return false;
      const q = filters.search.trim().toLowerCase();
      if (!q) return true;
      return [
        cleanGearText(item.name),
        cleanGearText(item.maker),
        cleanGearText(item.theme),
        cleanGearText(item.slot)
      ].join(' ').toLowerCase().includes(q);
    });
    if (filters.sort === 'newest') return items;
    return items.sort((a,b) => {
      if (filters.sort === 'level') return (getItemLevelValue(b) || 0) - (getItemLevelValue(a) || 0) || gearPowerValue(b) - gearPowerValue(a);
      if (filters.sort === 'rarity') return rarityIndex(itemRarityKey(b)) - rarityIndex(itemRarityKey(a)) || gearPowerValue(b) - gearPowerValue(a);
      if (filters.sort === 'value') return (b.value || 0) - (a.value || 0) || gearPowerValue(b) - gearPowerValue(a);
      if (filters.sort === 'slot') return slotSortIndex(a.slot) - slotSortIndex(b.slot) || gearPowerValue(b) - gearPowerValue(a);
      return gearPowerValue(b) - gearPowerValue(a);
    });
  }

  function itemCard(item) {
    if (!isPlainObject(item)) return '';
    const itemId = cleanGearText(item.id);
    const safeItemId = escapeHtml(itemId);
    const rarityKey = itemRarityKey(item);
    const slotLabel = slotDisplayName(item.slot);
    const slotTypeLabel = gearSlotTypeText(slotLabel, slotDisplayName(item.slot));
    const itemName = cleanGearText(item.name, `${slotLabel} Gear`);
    const maker = cleanGearText(item.maker);
    const summary = cleanGearText(item.summary);
    const delta = gearUpgradeDelta(item, S);
    const statusBadges = gearStatusBadges(item);
    const setBonusPreview = setBonusPreviewMarkup(item, S, true);
    const equipAttrs = itemId ? `data-equip="${safeItemId}"` : 'disabled';
    const sellAttrs = itemId ? `data-sell="${safeItemId}"` : 'disabled';
    const rarityEyebrow = `<span class="rarity-eyebrow ${rarityClass(rarityKey)}">${escapeHtml(gearRarityLabel(item))}</span>`;
    return `<article class="loot-card inventory-card ${getRarityCardClass(item)}">
      <div class="inventory-card-main">
        <div class="inventory-title-block">
          <div class="item-name ${rarityClass(rarityKey)}">${escapeHtml(itemName)}</div>
          <div class="inventory-title-row gear-card-meta-row"><span class="gear-slot-label">${escapeHtml(slotTypeLabel)}</span>${rarityEyebrow}</div>
          <div class="gear-card-subline"><span>${escapeHtml(getItemLevelLabel(item))}</span>${maker ? `<span>${escapeHtml(maker)}</span>` : ''}</div>
        </div>
        ${statusBadges ? `<div class="gear-badge-row">${statusBadges}</div>` : ''}
      </div>
      ${gearScoreMarkup(item)}
      ${summary ? `<p class="small inventory-card-summary">${escapeHtml(summary)}</p>` : ''}
      ${setBonusPreview}
      <div class="item-actions polished-actions inventory-card-actions"><button class="primary mini" ${equipAttrs}>${delta > 0 ? 'Equip Better' : 'Equip'}</button><button class="ghost mini sell-value-btn" ${sellAttrs}>Sell ${formatMoney(sellValue(item))}</button></div>
    </article>`;
  }

  function renderDex() {
    if (!el('dexSummary') || !el('monsterDex') || !el('gearDex')) return;
    const bestDepth = Math.max(1, S.player.depth || S.player.safeExtractDepth || 1);
    el('dexSummary').innerHTML = `
      <div class="split"><div><h2>Emberfall Index</h2><p>Relics and sightings logged by the Warden across the Hollow Stair.</p></div><span class="pill">Best ${escapeHtml(depthShortLabel(bestDepth))}</span></div>
      <div class="tag-row"><span class="pill">Seen gear: ${S.player.discoveredGear.length}</span><span class="pill">Seen monsters: ${S.player.discoveredMonsters.length}</span></div>`;
    el('monsterDex').innerHTML = `<h2>Monster Register</h2><div class="list">${S.player.discoveredMonsters.slice(0, 40).map(n => `<div class="monster-card small">${n}</div>`).join('') || '<p class="small muted">No sightings yet.</p>'}</div>`;
    el('gearDex').innerHTML = `<h2>Relic Register</h2><div class="list">${S.player.discoveredGear.slice(0, 40).map(n => `<div class="monster-card small">${n}</div>`).join('') || '<p class="small muted">No relics logged yet.</p>'}</div>`;
  }

  function renderArchive() {
    if (!el('archivePanel') || !el('settingsPanel')) return;
    const history = asArray(S.player.runHistory, []).filter(isPlainObject).slice(0, 12);
    const historyMarkup = history.map(rawEntry => {
      const r = rawEntry || {};
      const reason = normalizeRunHistoryReason(r.reason);
      const isWin = reason === 'extract';
      const isDefeat = reason === 'defeat';
      const outcomeLabel = runHistoryOutcomeLabel(reason);
      const outcomeClass = isWin ? 'outcome-win' : isDefeat ? 'outcome-loss' : 'outcome-neutral';
      const icon = isWin ? '✓' : isDefeat ? '✕' : '•';
      const zone = cleanDisplayText(r.zone || r.district || 'Hollow Stair', 'Hollow Stair');
      const fallbackDetail = isWin ? 'Extraction Haul secured. Lowfire marked the run complete.' : isDefeat ? 'The run ended here. Unsecured rewards were lost; banked gear and wallet stayed safe.' : 'Descent ended.';
      const detail = cleanDisplayText(r.detail || r.summary || fallbackDetail, fallbackDetail);
      const runLabel = cleanDisplayText(r.runLabel || depthWithRawLabel(r.floor || 1), depthWithRawLabel(1));
      const lootPreview = asArray(r.lootPreview, []).slice(0, 3)
        .map(name => cleanDisplayText(name || ''))
        .filter(Boolean)
        .map(name => `<span class="pill run-history-loot-pill">${escapeHtml(name)}</span>`)
        .join('');
      const meta = [
        `<span><b>${format(numberOr(r.kills, 0, 0, 999999))}</b> kills</span>`,
        `<span><b>${format(numberOr(r.lootCount, 0, 0, 999999))}</b> loot</span>`,
        `<span><b>${format(numberOr(r.xp, 0, 0, 999999))}</b> XP</span>`,
        cleanDisplayText(r.restartLabel || r.checkpointLabel || '') ? `<span><b>${isWin ? 'Next Start' : 'Restart'}:</b> ${escapeHtml(cleanDisplayText(r.restartLabel || r.checkpointLabel || ''))}</span>` : '',
        numberOr(r.eliteMarks, 0, 0, 999999) ? `<span><b>${format(numberOr(r.eliteMarks, 0, 0, 999999))}</b> elite mark</span>` : '',
        numberOr(r.questProgress, 0, 0, 999999) ? `<span><b>${format(numberOr(r.questProgress, 0, 0, 999999))}</b> objective progress</span>` : ''
      ].filter(Boolean).join('');
      const rewardText = runHistoryRewardText(r);
      const dateText = safeRunHistoryDate(r);
      return `<div class="run-history-card combat-feed-line ${runHistoryOutcomeClass(reason)}">
        <span class="feed-icon ${outcomeClass}">${icon}</span>
        <div class="feed-copy">
          <div class="feed-kicker">${escapeHtml(outcomeLabel)} • ${escapeHtml(runLabel)}</div>
          <div class="feed-body"><strong>${escapeHtml(zone)}</strong> — ${escapeHtml(detail)}</div>
          <div class="run-history-meta-grid">${meta}</div>
          <div class="run-history-rewards"><span class="feed-chip ${isWin ? 'feed-chip-extract' : 'feed-chip-danger'}">${isWin ? 'Banked' : 'Lost'}</span><span>${escapeHtml(rewardText)}</span></div>
          ${lootPreview ? `<div class="tag-row run-history-loot-row">${lootPreview}</div>` : ''}
          ${dateText ? `<div class="run-history-sub small muted">${escapeHtml(dateText)}</div>` : ''}
        </div>
      </div>`;
    }).join('') || '<p class="small muted">No descents logged yet. Enter the Hollow Stair to begin.</p>';

    const archiveLines = asArray(S.archive, []).filter(isPlainObject).map(a => {
      const stamp = cleanDisplayText(a.stamp || '');
      const text = cleanDisplayText(a.text || '', 'Archive note unavailable.');
      return `<div class="archive-line"><div class="small muted">${escapeHtml(stamp)}</div><div>${escapeHtml(text)}</div></div>`;
    }).join('') || '<p class="small muted">No Emberfall notes yet.</p>';

    el('archivePanel').innerHTML = `
      <div class="archive-history-head">
        <div><h2>Descent History</h2><p class="small muted">Lowfire records what was banked, what was lost, and where the next descent starts.</p></div>
        <span class="pill">Latest ${format(history.length)}</span>
      </div>
      <div class="list run-history-list">${historyMarkup}</div>
      <div class="sep"></div>
      <h3>Emberfall Notes</h3>
      <div class="list archive-log-list">${archiveLines}</div>`;

    el('settingsPanel').innerHTML = `
      <h2>System Notes</h2>
      <p class="small">${escapeHtml(VISIBLE_VERSION_LABEL)}</p>
      <div class="tag-row"><span class="pill">Safe return</span><span class="pill">Hollow Stair</span><span class="pill">Guarded loop</span></div>
      <div class="sep"></div>
      <div class="log-wrap">${S.player.log.map(line => `<div class="log-line small">${escapeHtml(cleanDisplayText(line))}</div>`).join('')}</div>`;
  }

