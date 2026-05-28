'use strict';

// Run, gear, inventory, Dex, archive renderers
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

        <section class="combat-monster-stage ${isBossFight ? 'stage-boss' : isEliteFight ? 'stage-elite' : ''}" aria-label="Enemy stage">
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
  function renderGear() {
    if (!el('equipmentPanel') || !el('filtersPanel') || !el('inventoryPanel')) return;
    el('equipmentPanel').innerHTML = `
      <h2>Loadout</h2>
      <div class="list">${EQUIPMENT_DISPLAY_SLOTS.map(slot => {
        const item = S.player.equipment[slot];
        const levelLine = item ? `<div class="item-level">${getItemLevelLabel(item)}</div>` : '';
        const setMini = item ? setBonusMiniMarkup(item, S) : '';
        const cardClass = item ? getRarityCardClass(item) : '';
        const filledClass = item ? ' equip-slot-filled' : '';
        const statLine = item ? `<div class="tag-row" style="margin-top:3px"><span class="pill">PWR ${item.rating}</span><span class="pill">Atk ${item.stats.power}</span><span class="pill">Guard ${item.stats.guard}</span><span class="pill">HP ${item.stats.hp}</span></div>` : '';
        return `<div class="equip-slot ${cardClass}${filledClass}"><div class="split"><div><div class="item-name">${slot}</div><div class="item-meta gear-equipped-name ${item ? rarityClass(item.rarity) : ''}"><span class="${item ? rarityClass(item.rarity) : ''}">${item ? item.name : 'Empty slot'}</span></div>${levelLine}${statLine}${setMini}</div>${item ? `<span class="pill ${rarityClass(item.rarity)}">${item.rarity}</span>` : ''}</div></div>`;
      }).join('')}</div>`;

    el('filtersPanel').innerHTML = `
      <h2>Inventory Filters</h2>
      <div class="filter-grid">
        <select id="slotFilter">${['all', ...FUTURE_EQUIPMENT_SLOTS].map(x => `<option value="${x}" ${S.filters.slot===x?'selected':''}>${x}</option>`).join('')}</select>
        <select id="rarityFilter">${['all', ...RARITIES.map(r => r.key)].map(x => `<option value="${x}" ${S.filters.rarity===x?'selected':''}>${x}</option>`).join('')}</select>
        <select id="sortFilter">
          <option value="power" ${S.filters.sort==='power'?'selected':''}>power first</option>
          <option value="level" ${S.filters.sort==='level'?'selected':''}>ilvl first</option>
          <option value="rarity" ${S.filters.sort==='rarity'?'selected':''}>rarity first</option>
          <option value="value" ${S.filters.sort==='value'?'selected':''}>value first</option>
          <option value="slot" ${S.filters.sort==='slot'?'selected':''}>slot order</option>
          <option value="newest" ${S.filters.sort==='newest'?'selected':''}>newest first</option>
        </select>
      </div>
      <div class="sep"></div>
      <input id="searchFilter" value="${escapeHtml(S.filters.search)}" placeholder="search name, maker, theme" />`;

    renderInventoryPanel();
  }

  function renderInventoryPanel() {
    const inv = filteredInventory();
    const safeSellCount = S.player.inventory.filter(item => canQuickSellItem(S, item)).length;
    const allSellCount = S.player.inventory.filter(item => canSellAllGearItem(S, item)).length;
    const sellJunkBtn = `<button class="ghost mini tiny-sell-all" id="sellJunkGearBtn" title="Sells unequipped gear marked as Junk" ${safeSellCount ? '' : 'disabled'}>Sell Junk</button>`;
    const sellAllBtn = `<button class="ghost mini tiny-sell-all danger-sell-all" id="sellAllGearBtn" title="Sells all unequipped sellable gear after two confirmations" ${allSellCount ? '' : 'disabled'}>Sell All</button>`;
    el('inventoryPanel').innerHTML = `
      <div class="split inventory-head"><div><h2>Inventory</h2><p class="small muted inventory-subline">Rarity, upgrades, junk, and sell value at a glance.</p></div><div class="inventory-actions"><span class="pill item-count-pill">${inv.length} items</span>${sellJunkBtn}${sellAllBtn}</div></div>
      <div class="list">${inv.map(itemCard).join('') || '<p class="small muted">No matching gear.</p>'}</div>`;
  }

  function filteredInventory() {
    const items = S.player.inventory.filter(item => {
      if (S.filters.slot !== 'all' && item.slot !== S.filters.slot) return false;
      if (S.filters.rarity !== 'all' && item.rarity !== S.filters.rarity) return false;
      const q = S.filters.search.trim().toLowerCase();
      if (!q) return true;
      return [item.name, item.maker, item.theme, item.slot].join(' ').toLowerCase().includes(q);
    });
    if (S.filters.sort === 'newest') return items;
    return items.sort((a,b) => {
      if (S.filters.sort === 'level') return (b.level || 0) - (a.level || 0) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'rarity') return rarityIndex(b.rarity) - rarityIndex(a.rarity) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'value') return (b.value || 0) - (a.value || 0) || (b.rating || 0) - (a.rating || 0);
      if (S.filters.sort === 'slot') return slotSortIndex(a.slot) - slotSortIndex(b.slot) || (b.rating || 0) - (a.rating || 0);
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  function itemCard(item) {
    const isJunk = canQuickSellItem(S, item);
    const junkPill = isJunk ? '<span class="pill junk-pill">Junk</span>' : '';
    const setDef = getMythicSetDefinition(getItemSetId(item));
    const setPill = setDef ? `<span class="pill rarity-mythic">${escapeHtml(setDef.name)}</span>` : '';
    const setBonusPreview = setBonusPreviewMarkup(item, S);
    const upgradeMark = upgradeMarkup(item, S);
    const rarityLabel = item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : '';
    const rarityEyebrow = rarityLabel ? `<div class="rarity-eyebrow ${rarityClass(item.rarity)}">${rarityLabel}</div>` : '';
    return `<div class="loot-card ${getRarityCardClass(item)}"><div class="split"><div>${rarityEyebrow}<div class="item-name ${rarityClass(item.rarity)}">${item.name}</div><div class="item-level">${getItemLevelLabel(item)}</div><div class="item-meta">${item.slot} • ${item.maker}</div></div><div class="tag-row right-tags">${upgradeMark}${setPill}${junkPill}</div></div><div class="tag-row"><span class="pill stat-pill primary-stat">Power ${item.rating}</span><span class="pill stat-pill">Atk ${item.stats.power}</span><span class="pill stat-pill">Guard ${item.stats.guard}</span><span class="pill stat-pill">HP ${item.stats.hp}</span>${item.stats.speed > 0 ? `<span class="pill">Spd ${item.stats.speed}</span>` : ''}${item.stats.wit > 0 ? `<span class="pill">Wit ${item.stats.wit}</span>` : ''}</div><p class="small">${item.summary}</p>${setBonusPreview}<div class="item-actions polished-actions"><button class="primary mini" data-equip="${item.id}">${upgradeMark ? 'Equip ↑' : 'Equip'}</button><button class="ghost mini sell-value-btn" data-sell="${item.id}">Sell ${formatMoney(sellValue(item))}</button></div></div>`;
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

