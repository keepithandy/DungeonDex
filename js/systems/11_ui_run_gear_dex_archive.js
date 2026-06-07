'use strict';

// Run, gear, inventory, Dex, archive renderers
  function combatBackdropToken(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function combatBackdropHas(key, terms) {
    return terms.some(term => key.includes(term));
  }

  function combatBackdropKind(state, district, depth, monster) {
    const rawDepth = depth ?? state?.run?.floor ?? state?.player?.returnDepth;
    const hasDepth = Number.isFinite(Number(rawDepth));
    const safeDepth = Math.max(1, Math.floor(numberOr(rawDepth, 1, 1, 999999)));
    const districtKey = combatBackdropToken([district?.id, district?.tone, district?.name, state?.run?.zone].filter(Boolean).join(' '));
    const monsterKey = combatBackdropToken([
      monster?.id,
      monster?.name,
      monster?.family,
      monster?.type
    ].filter(Boolean).join(' '));

    if (!districtKey && !monsterKey && !hasDepth) return 'generic';

    if (safeDepth <= 4 || combatBackdropHas(districtKey, ['lowsteps', 'lowfire', 'ashgate'])) return 'lowfire';
    if (combatBackdropHas(districtKey, ['veyruhn', 'bellforge', 'debtworks', 'cinderbone', 'forge', 'furnace'])) return 'veyruhn';
    if (combatBackdropHas(districtKey, ['mireglass', 'mire', 'sootveil', 'swamp'])) return 'mireglass';
    if (combatBackdropHas(districtKey, ['redchapel', 'chapel', 'blacktithe', 'ritual'])) return 'red-chapel';
    if (combatBackdropHas(districtKey, ['saltforge', 'salt', 'hunger', 'kiln', 'mineral'])) return 'salt-forge';
    if (combatBackdropHas(districtKey, ['sunkencourt', 'sunken', 'redwake', 'catacomb', 'drowned'])) return 'sunken-court';
    if (combatBackdropHas(districtKey, ['rookery', 'rafter'])) return 'rookery';
    if (combatBackdropHas(districtKey, ['noctis', 'atelier', 'lanternless', 'lowflame', 'vault'])) return 'noctis';

    if (combatBackdropHas(monsterKey, ['harpy', 'silkbound', 'rookery', 'feather', 'wing'])) return 'rookery';
    if (combatBackdropHas(monsterKey, ['mireborn', 'venom', 'spitter', 'frostbit', 'mireglass'])) return 'mireglass';
    if (combatBackdropHas(monsterKey, ['bloodlit', 'cultist', 'gravesworn', 'revenant', 'bleed'])) return 'red-chapel';
    if (combatBackdropHas(monsterKey, ['sunken', 'knight', 'warden', 'chill', 'drain'])) return 'sunken-court';
    if (combatBackdropHas(monsterKey, ['blacksalt', 'starved', 'construct', 'guardbreak', 'rage'])) return 'salt-forge';
    if (combatBackdropHas(monsterKey, ['ashwake', 'burn', 'ghoul', 'husk', 'beast'])) return 'lowfire';
    if (combatBackdropHas(monsterKey, ['shade', 'watcher', 'dreadmarked', 'lanterneyed', 'seer', 'hex'])) return 'noctis';

    if (hasDepth) {
      if (safeDepth <= 10) return 'lowfire';
      if (safeDepth <= 25) return 'veyruhn';
      if (safeDepth <= 38) return 'mireglass';
      if (safeDepth <= 50) return 'salt-forge';
      if (safeDepth <= 62) return 'red-chapel';
      if (safeDepth <= 78) return 'sunken-court';
      if (safeDepth <= 100) return 'noctis';
    }
    return 'generic';
  }

  function combatBackdropClasses(state, district, depth, monster) {
    const rawDepth = depth ?? state?.run?.floor ?? state?.player?.returnDepth;
    const safeDepth = Math.max(1, Math.floor(numberOr(rawDepth, 1, 1, 999999)));
    const kind = combatBackdropKind(state, district, depth, monster);
    const legacyClass = {
      lowfire: safeDepth <= 4 ? 'district-lowsteps' : 'district-lowfire',
      veyruhn: 'district-veyruhn',
      mireglass: 'district-mireglass',
      'red-chapel': 'district-redchapel',
      'salt-forge': 'district-saltforge',
      'sunken-court': 'district-sunkencourt',
      rookery: 'district-rookery',
      noctis: 'district-noctis',
      generic: 'district-generic'
    }[kind] || 'district-generic';
    const tierClass = monster?.tier === 'Boss'
      ? 'combat-backdrop--boss'
      : monster?.tier === 'Elite'
        ? 'combat-backdrop--elite'
        : '';
    return ['combat-backdrop', `combat-backdrop--${kind}`, legacyClass, tierClass].filter(Boolean).join(' ');
  }



  function combatPersonalityKind(monster, district, depth) {
    const key = combatBackdropToken([
      monster?.id,
      monster?.name,
      monster?.family,
      monster?.type,
      district?.id,
      district?.name,
      district?.tone,
      depth
    ].filter(Boolean).join(' '));
    if (combatBackdropHas(key, ['cultist', 'chapel', 'blood', 'ritual', 'blacktithe', 'hex'])) return 'ritualist';
    if (combatBackdropHas(key, ['construct', 'forge', 'furnace', 'salt', 'kiln', 'guardbreak'])) return 'construct';
    if (combatBackdropHas(key, ['mire', 'venom', 'spitter', 'slime', 'swamp', 'frostbit'])) return 'mireborn';
    if (combatBackdropHas(key, ['shade', 'watcher', 'dread', 'lantern', 'seer', 'noctis'])) return 'shade';
    if (combatBackdropHas(key, ['harpy', 'wing', 'feather', 'rookery', 'rafter'])) return 'winged';
    if (combatBackdropHas(key, ['boss', 'warden', 'knight', 'brute', 'rage', 'beast', 'husk', 'ghoul'])) return 'brute';
    return 'stalker';
  }

  function dungeonAtmosphereProfile(state, district, depth, monster) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth ?? state?.run?.floor, 1, 1, 999999)));
    const meta = getLoreDepthProgress(safeDepth);
    const kind = combatBackdropKind(state, district, safeDepth, monster);
    const pressure = safeDepth >= 120 ? 'abyssal' : safeDepth >= 80 ? 'grave' : safeDepth >= 40 ? 'deep' : safeDepth >= 15 ? 'pressured' : 'fresh';
    const chapterMood = meta.chapterWithinRoom >= meta.chaptersPerRoom - 1 ? 'last-chapter' : meta.chapterWithinRoom <= 2 ? 'fresh-room' : 'mid-room';
    const floorMood = meta.roomWithinFloor === meta.roomsPerFloor && meta.chapterWithinRoom >= meta.chaptersPerRoom - 1 ? 'floor-edge' : meta.roomWithinFloor >= meta.roomsPerFloor - 1 ? 'near-floor' : 'normal-floor';
    const districtName = district?.name || 'The Hollow Stair';
    const lines = {
      lowfire: ['Lowfire soot drifts through the stairwell.', 'Old lamps pop in the ash behind you.', 'Warm dust settles on the weapon grip.'],
      veyruhn: ['Forge heat leaks through the stone ribs.', 'A chain ticks somewhere below the landing.', 'Red iron light crawls over the floor.'],
      'red-chapel': ['Prayer smoke gathers around the arena edge.', 'The stone tastes of rust and candle-wax.', 'A red hush presses against the fight.'],
      'salt-forge': ['Salt ash scratches across the platform.', 'Kiln breath rolls under the floor.', 'White mineral dust cuts the torchlight.'],
      'sunken-court': ['Cold water knocks under the old court stones.', 'Drowned banners shift without wind.', 'Blue-black damp crawls up the walls.'],
      rookery: ['Rafters creak above the landing.', 'Loose feathers spin in the stale updraft.', 'The ceiling answers every footstep.'],
      noctis: ['Lanternless glass drinks the light.', 'The dark narrows into a listening shape.', 'Noctis dust floats like spent stars.'],
      generic: ['The Hollow Stair folds another chamber into place.', 'The dungeon air tightens around the fight.', 'Loose stone dust falls into the dark.']
    };
    const pool = lines[kind] || lines.generic;
    const line = pool[(safeDepth + meta.roomWithinFloor + meta.chapterWithinRoom) % pool.length];
    const pressureLine = pressure === 'abyssal' ? 'Abyssal pressure: every victory feels borrowed.'
      : pressure === 'grave' ? 'Grave pressure: the descent is actively pushing back.'
      : pressure === 'deep' ? 'Deep pressure: rewards improve, but breathing room is thinner.'
      : pressure === 'pressured' ? 'Pressure rising: rooms start to feel less forgiving.'
      : 'Fresh descent: the Stair is still measuring you.';
    return { kind, pressure, chapterMood, floorMood, districtName, line, pressureLine };
  }

  function dungeonAtmosphereClasses(profile) {
    return [
      'living-dungeon',
      `living-dungeon--${profile.kind}`,
      `dungeon-pressure--${profile.pressure}`,
      `dungeon-chapter--${profile.chapterMood}`,
      `dungeon-floor--${profile.floorMood}`
    ].join(' ');
  }

  function dungeonAtmosphereMarkup(profile, depth) {
    return '';
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
    const loreDepth = getLoreDepthProgress(depth);
    const runDistrict = getLoreFloorDistrict(loreDepth.floorNumber);
    const floorName = getLoreFloorName(loreDepth.floorNumber);
    const isBossFight = monster && monster.tier === 'Boss';
    const isEliteFight = monster && monster.tier === 'Elite';
    const isContractTarget = !!(monster && monster.contractTarget);
    const currentFloorText = `Floor ${format(loreDepth.floorNumber)}`;
    const currentProgressRoomText = `Room ${format(loreDepth.roomWithinFloor)} / ${format(loreDepth.roomsPerFloor)}`;
    const currentProgressChapterText = `Chapter ${format(loreDepth.chapterWithinRoom)} / ${format(loreDepth.chaptersPerRoom)}`;
    const bossStatusText = loreDepth.isBossChapter
      ? 'Boss Chapter'
      : `Boss in ${format(loreDepth.chaptersUntilBoss)} chapter${loreDepth.chaptersUntilBoss === 1 ? '' : 's'}`;
    const playerHpPct = Math.max(0, Math.min(100, (S.player.hp / Math.max(1, S.player.maxHp)) * 100));
    const monsterHpPct = monster ? Math.max(0, Math.min(100, (monster.hp / Math.max(1, monster.maxHp)) * 100)) : 0;
    const pendingRewards = ensurePendingRunRewards(S);
    const hasUnsecured = hasPendingRunRewards(pendingRewards);
    const haulSummary = hasUnsecured ? runRewardSummaryText(pendingRewards) : 'No haul yet';
    const monsterGuard = monster ? Math.max(0, Math.floor(numberOr(monster.guard, 0, 0, 999999))) : 0;
    const shellTone = `${districtToneClass(runDistrict)} ${isBossFight ? 'combat-device-boss boss-atmosphere' : isEliteFight ? 'combat-device-elite' : ''}`;
    const stageBackdropClasses = combatBackdropClasses(S, runDistrict, depth, monster);
    const personalityKind = combatPersonalityKind(monster, runDistrict, depth);
    const personalityClass = `combat-personality--${personalityKind}`;
    const monsterFamily = escapeHtml(monster?.family || 'Depthborn');
    const monsterTier = escapeHtml(String(monster?.tier || 'Enemy').toUpperCase());
    const monsterSubline = isContractTarget
      ? `Elite Hunt • ${monsterFamily}`
      : monsterFamily;
    const atmosphereProfile = dungeonAtmosphereProfile(S, runDistrict, depth, monster);
    const playerDanger = playerHpPct <= 25 ? 'hp-critical' : playerHpPct <= 50 ? 'hp-warn' : '';
    const monsterDanger = monsterHpPct <= 25 ? 'hp-critical' : monsterHpPct <= 50 ? 'hp-warn' : '';

    if (!S.run.active || !monster) {
      runStatus.innerHTML = `
        <div class="split"><div><h2>No active descent</h2><p>Rest in Lowfire, then return to the Hollow Stair when ready.</p></div><button class="primary mini" id="runFromIdleBtn">Enter Dungeon</button></div>`;
      combatPanel.innerHTML = `<p>No Hollow Stair threat detected.</p>`;
      combatLog.innerHTML = `<div class="run-log-head split"><h2>Feed</h2><span class="pill">Idle</span></div><div class="run-log-list"><div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Resting</div><div class="feed-body">Lowfire is quiet.</div></div></div></div>`;
      return;
    }

    runStatus.innerHTML = `
      <div class="combat-device-top ${shellTone}">
        <div class="run-flow-summary ${loreDepth.isBossChapter ? 'is-boss-floor' : ''}" aria-label="Run status">
          <div class="run-flow-primary">
            <span>Current</span>
            <strong>${escapeHtml(currentFloorText)}</strong>
            <small>${escapeHtml(currentProgressRoomText)}</small>
            <small>${escapeHtml(currentProgressChapterText)}</small>
            <small>${escapeHtml(floorName)}</small>
          </div>
          <div class="run-flow-secondary">
            <span>Boss</span>
            <strong>${escapeHtml(bossStatusText)}</strong>
          </div>
        </div>
        <div class="run-progress-only combat-haul-row" aria-label="Run haul">
          <div class="split run-progress-copy run-flow-next">
            <span></span>
            <span>Haul: ${escapeHtml(haulSummary)}</span>
          </div>
        </div>
        ${dungeonAtmosphereMarkup(atmosphereProfile, depth)}
      </div>`;

    if (S.run.event) {
      const event = S.run.event;
      const options = asArray(event.options, []).map(option => `
        <button class="ghost run-event-choice" data-run-event="${escapeHtml(option.id)}">
          <strong>${escapeHtml(option.label)}</strong>
          <span>${escapeHtml(option.detail || '')}</span>
        </button>`).join('');
      combatPanel.innerHTML = `
        <div class="combat-device-shell run-event-shell ${shellTone}" aria-label="Run event">
          <section class="run-event-card ${dungeonAtmosphereClasses(atmosphereProfile)}">
            <div class="depth-kicker">${escapeHtml(event.kicker || 'Run Event')} • ${escapeHtml(event.zone || runDistrict.name)}</div>
            <h2>${escapeHtml(event.title || 'Dungeon Incident')}</h2>
            <p>${escapeHtml(event.text || 'The Hollow Stair interrupts the descent.')}</p>
            <div class="run-event-choices">${options}</div>
          </section>
        </div>`;
      combatLog.innerHTML = `
        <div class="run-log-head split"><h2>Feed</h2><div class="tag-row"><span class="pill">Decision</span></div></div>
        <div class="run-log-list">${asArray(S.run.combatLog).slice(0, COMBAT_LOG_RENDER_LIMIT).map(renderCombatFeedLine).join('')}</div>`;
      return;
    }

    combatPanel.innerHTML = `
      <div class="combat-device-shell ${shellTone}" aria-label="Combat screen">
        <section class="combat-enemy-header ${personalityClass}">
          <div class="depth-kicker">${monsterTier}</div>
          <p class="small muted">${monsterSubline}</p>
        </section>

        <section class="combat-monster-stage ${stageBackdropClasses} ${personalityClass} ${isBossFight ? 'stage-boss' : isEliteFight ? 'stage-elite' : ''}" aria-label="Enemy stage">
          <div class="stage-atmosphere-grain" aria-hidden="true"></div>
          <div class="stage-depth-veil ${dungeonAtmosphereClasses(atmosphereProfile)}" aria-hidden="true"></div>
          <div class="stage-motes" aria-hidden="true"></div>
          <div class="stage-drift" aria-hidden="true"></div>
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
          <button class="ghost combat-btn skill-btn" data-action="skill" aria-label="Use Ashburst skill">Ashburst</button>
          <button class="ghost combat-btn guard-btn" data-action="guard" aria-label="Guard and recover HP">Guard</button>
          <button class="ghost combat-btn danger-btn extract-btn" data-action="extract" aria-label="Attempt to extract from the Hollow Stair">Extract</button>
        </section>
      </div>`;

    const logLines = asArray(S.run.combatLog).filter(line => typeof isDisabledCombatEffectLine !== 'function' || !isDisabledCombatEffectLine(line)).slice(0, COMBAT_LOG_RENDER_LIMIT);
    combatLog.innerHTML = `
      <div class="run-log-head split"><h2>Feed</h2><div class="tag-row"><span class="pill">${format(logLines.length)} recent</span></div></div>
      <div class="run-log-list">${logLines.length ? logLines.map(renderCombatFeedLine).join('') : '<div class="log-line small muted combat-feed-line"><span class="feed-icon">·</span><div class="feed-copy"><div class="feed-kicker">Quiet</div><div class="feed-body">No combat messages yet.</div></div></div>'}</div>`;
    if (combatLog) {
      combatLog.style.overflowAnchor = 'none';
      const runLogList = combatLog.querySelector('.run-log-list');
      if (runLogList) runLogList.style.overflowAnchor = 'auto';
    }
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
        <div><h2>Equipped</h2><p class="small muted">Gear by slot.</p></div>
        <span class="pill loadout-count-pill">${format(equippedCount)} / ${format(displaySlots.length)} slots</span>
      </div>
      <div class="loadout-groups">${loadoutSlotGroups().map(equippedGroupMarkup).join('')}</div>`;

    filtersPanel.innerHTML = `
      <div class="filter-head"><h2>Filters</h2><span class="small muted">Inventory</span></div>
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
      <div class="split inventory-head loadout-inventory-head"><div><h2>Inventory</h2><p class="small muted inventory-subline">Equip, sell, or filter.</p></div><div class="inventory-actions"><span class="pill item-count-pill">${format(inv.length)} shown</span>${sellJunkBtn}${sellAllBtn}</div></div>
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
    return `<article class="loot-card inventory-card ${delta > 0 ? 'inventory-upgrade-card' : ''} ${getRarityCardClass(item)}">
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

  function trophyIconMarkup(trophy, unlocked) {
    const iconClass = trophy?.icon ? ` trophy-icon--${escapeHtml(trophy.icon)}` : '';
    const imageSrc = trophy?.image || 'assets/trophies/hollow_stair_skull_trophy.png';
    return `<div class="trophy-prestige-icon trophy-prestige-icon--asset${iconClass}${unlocked ? ' is-unlocked' : ' is-locked'}" aria-hidden="true">
      <img class="trophy-prestige-img" src="${escapeHtml(imageSrc)}" alt="" loading="lazy" decoding="async" />
    </div>`;
  }

  function isBossTrophyUnlocked(trophy, bestDepth) {
    const unlockedIds = asArray(S.player.bossTrophies, []);
    return unlockedIds.includes(trophy.id);
  }

  function bossTrophyLocationLabel(entry) {
    if (!isPlainObject(entry)) return 'Unrecorded depth';
    const bestDepth = Math.max(0, Math.floor(numberOr(entry.bestKillDepth, entry.rawDepth, 0, 999999)));
    if (bestDepth <= 0) return 'Unrecorded depth';
    return depthShortLabel(bestDepth);
  }

  function bossTrophyLastEarnedLabel(entry) {
    if (!isPlainObject(entry)) return 'Unknown Boss';
    const floor = Math.max(1, Math.floor(numberOr(entry.floor, 1, 1, 999999)));
    const room = Math.max(1, Math.floor(numberOr(entry.room, 1, 1, 999999)));
    const chapter = Math.max(1, Math.floor(numberOr(entry.chapter, 1, 1, 999999)));
    const source = cleanDisplayText(entry.source || entry.bossName || '', '');
    const location = `F${format(floor)} R${format(room)} C${format(chapter)}`;
    return source ? `${source} • ${location}` : location;
  }

  function bossTrophyMetaRow(label, value) {
    return `<div class="boss-trophy-meta-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function bossTrophyRecordCard(entry) {
    const trophyName = typeof getBossTrophyDisplayName === 'function' ? getBossTrophyDisplayName(entry) : (entry.trophyName || entry.name || 'Boss Trophy');
    const bossName = cleanDisplayText(entry.bossName || entry.source || '', 'Unknown Boss');
    const count = `x${format(Math.max(1, numberOr(entry.count, 1, 1, 9999)))}`;
    return `<article class="boss-trophy-record-card">
      ${trophyIconMarkup(entry, true)}
      <div class="boss-trophy-copy">
        <div class="trophy-kicker">${escapeHtml(entry.source || 'Boss Trophy')}</div>
        <h3>${escapeHtml(trophyName)}</h3>
        <div class="boss-trophy-record-boss">${escapeHtml(bossName)}</div>
        <div class="boss-trophy-record-meta"><span class="pill trophy-pill-unlocked">Recorded</span><span class="pill">Count ${escapeHtml(count)}</span></div>
        <div class="boss-trophy-meta-list">
          ${bossTrophyMetaRow('Best Depth', bossTrophyLocationLabel(entry))}
          ${bossTrophyMetaRow('Last Earned', bossTrophyLastEarnedLabel(entry))}
        </div>
      </div>
    </article>`;
  }

  function collectionShell(title, description, body, options = {}) {
    return `<section class="collection-shell${options.placeholder ? ' is-placeholder' : ''}">
      <div class="collection-shell-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="small muted">${escapeHtml(description)}</p>
        </div>
        ${options.pill ? `<span class="pill">${escapeHtml(options.pill)}</span>` : ''}
      </div>
      <div class="collection-shell-body">${body}</div>
    </section>`;
  }

  function retiredRelicDepthLabel(entry) {
    if (!isPlainObject(entry)) return 'Depth unknown';
    const floor = Math.max(1, Math.floor(numberOr(entry.floor, 1, 1, 999999)));
    const room = Math.max(1, Math.floor(numberOr(entry.room, 1, 1, 999999)));
    const chapter = Math.max(1, Math.floor(numberOr(entry.chapter, 1, 1, 999999)));
    return `F${format(floor)} • R${format(room)} • C${format(chapter)}`;
  }

  function retiredRelicCard(entry) {
    const item = isPlainObject(entry?.item) ? entry.item : {};
    const itemName = cleanDisplayText(item.name || 'Unknown relic', 'Unknown relic');
    const slotLabel = cleanDisplayText(item.slot || entry.slot || 'gear', 'gear');
    const rarityLabel = cleanDisplayText(item.rarity || entry.rarity || 'common', 'common');
    const note = cleanDisplayText(entry.note || item.summary || 'Archive record preserved.', 'Archive record preserved.');
    const source = cleanDisplayText(entry.source || 'DevTools Archive Record', 'DevTools Archive Record');
    const stamp = cleanDisplayText(entry.stamp || '', '');
    const valueLabel = typeof moneyText === 'function'
      ? moneyText(numberOr(entry.value, item.value, 0, Number.MAX_SAFE_INTEGER))
      : format(numberOr(entry.value, item.value, 0, Number.MAX_SAFE_INTEGER));
    return `<article class="retired-relic-card">
      <div class="retired-relic-card-head">
        <div>
          <h4>${escapeHtml(itemName)}</h4>
          <div class="small muted">${escapeHtml(source)}</div>
        </div>
        <span class="pill">${escapeHtml(rarityLabel)}</span>
      </div>
      <div class="tag-row retired-relic-tags">
        <span class="pill">${escapeHtml(slotLabel)}</span>
        <span class="pill">Lv ${format(numberOr(entry.itemLevel, item.level, 1, 99999))}</span>
        <span class="pill">Rating ${format(numberOr(entry.rating, item.rating, 1, 999999))}</span>
        <span class="pill">${escapeHtml(valueLabel)}</span>
      </div>
      <div class="retired-relic-meta small muted">${escapeHtml(retiredRelicDepthLabel(entry))}${stamp ? ` • ${escapeHtml(stamp)}` : ''}</div>
      <div class="retired-relic-note">${escapeHtml(note)}</div>
    </article>`;
  }

  function bossTrophyCard(trophy, bestDepth) {
    const completion = typeof getBossTrophyCompletionState === 'function'
      ? getBossTrophyCompletionState(S, trophy)
      : { key: isBossTrophyUnlocked(trophy, bestDepth) ? 'recorded' : 'locked', record:null };
    const unlocked = completion.recorded;
    const stateLabel = unlocked ? 'Recorded' : completion.key === 'available' ? 'Missing' : 'Locked';
    const lockedDescription = completion.key === 'available'
      ? 'Defeat this boss to record the trophy.'
      : 'Defeat deeper bosses to identify this trophy.';
    return `<article class="boss-trophy-card ${unlocked ? 'is-unlocked' : 'is-locked'}">
      ${trophyIconMarkup(trophy, unlocked)}
      <div class="boss-trophy-copy">
        <div class="trophy-kicker">${escapeHtml(trophy.source)} • ${escapeHtml(trophy.tone || 'Trophy')}</div>
        <h3>${unlocked ? escapeHtml(trophy.name) : 'Unknown Boss Trophy'}</h3>
        <p>${unlocked ? escapeHtml(trophy.flavor) : lockedDescription}</p>
        <div class="tag-row"><span class="pill ${unlocked ? 'trophy-pill-unlocked' : 'trophy-pill-locked'}">${escapeHtml(stateLabel)}</span></div>
      </div>
    </article>`;
  }

  function renderDex() {
    if (!el('dexSummary') || !el('monsterDex') || !el('gearDex')) return;
    S.player.bossTrophies = asArray(S.player.bossTrophies, []);
    S.player.bossTrophyRecords = asArray(S.player.bossTrophyRecords, []).filter(isPlainObject);
    S.player.retiredRelics = asArray(S.player.retiredRelics, []);
    const eliteTrophies = typeof ensureEliteTrophyState === 'function' ? ensureEliteTrophyState(S) : { collected:{}, totalFound:0, latestId:'' };
    const rivals = typeof ensureEliteRivalState === 'function' ? ensureEliteRivalState(S) : [];
    const bestDepth = Math.max(1, S.player.depth || S.player.safeExtractDepth || 1);
    const trophies = asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], []);
    const unlockedCount = trophies.filter(trophy => isBossTrophyUnlocked(trophy, bestDepth)).length;
    const bossRecords = S.player.bossTrophyRecords.slice().sort((a, b) => numberOr(b.bestKillDepth, 0) - numberOr(a.bestKillDepth, 0) || numberOr(b.earnedAt, 0) - numberOr(a.earnedAt, 0));
    const eliteEntries = Object.values(eliteTrophies.collected || {}).sort((a, b) => String(b.earnedAt || '').localeCompare(String(a.earnedAt || '')));
    const latestElite = eliteTrophies.latestId && eliteTrophies.collected[eliteTrophies.latestId] ? eliteTrophies.collected[eliteTrophies.latestId] : eliteEntries[0] || null;
    const eliteBonus = typeof getEliteTrophyPayoutBonus === 'function' ? getEliteTrophyPayoutBonus(S) : Math.min(5, eliteEntries.length);
    const rivalActive = rivals.filter(rival => rival.revengeAvailable && !rival.completed);
    const rivalDefeated = rivals.filter(rival => rival.completed);
    const latestRival = rivals.slice().sort((a, b) => numberOr(b.updatedAt || b.createdAt, 0) - numberOr(a.updatedAt || a.createdAt, 0))[0] || null;
    const retiredRelics = asArray(S.player.retiredRelics, []).filter(isPlainObject).slice(0, 80);
    const bossSummary = typeof getBossTrophyCollectionSummary === 'function'
      ? getBossTrophyCollectionSummary(S)
      : { recordedCount: bossRecords.length, totalDefinitions: trophies.length, missingCount: Math.max(0, trophies.length - bossRecords.length), totalFound: bossRecords.reduce((sum, entry) => sum + Math.max(1, numberOr(entry.count, 1, 1, 9999)), 0), bestRecord: bossRecords[0] || null };
    const bossTotalLabel = bossSummary.totalDefinitions > 0
      ? `${format(bossSummary.recordedCount)} / ${format(bossSummary.totalDefinitions)}`
      : `${format(bossSummary.recordedCount)}`;
    el('dexSummary').innerHTML = `
      <div class="split trophy-hall-head"><div><h2>Trophy Hall</h2><p>Long-term collection records for bosses, boards, rivals, and retired item archive entries.</p></div><span class="pill">Best ${escapeHtml(depthShortLabel(bestDepth))}</span></div>
      <div class="trophy-tabs"><button class="trophy-tab active" type="button">Collection Hub</button><button class="trophy-tab" type="button" disabled>DevTools archive records only</button></div>
      <div class="tag-row"><span class="pill">Boss Trophies: ${bossTotalLabel}</span><span class="pill">Recorded: ${format(bossSummary.totalFound)}</span><span class="pill">Missing: ${format(bossSummary.missingCount)}</span><span class="pill">Retired Items: ${format(retiredRelics.length)}</span></div>
      <div class="boss-trophy-summary-card"><div><strong>Hall Summary</strong><div class="small muted">${bossSummary.bestRecord ? `${escapeHtml(cleanDisplayText(bossSummary.bestRecord.bossName || '', 'Unknown Boss'))} holds the deepest recorded mark.` : 'Defeat bosses to start the collection.'}</div></div><div class="small muted">${bossSummary.bestRecord ? `Best Depth: ${escapeHtml(bossTrophyLocationLabel(bossSummary.bestRecord))}` : 'No boss trophies recorded yet.'}</div></div>`;
    el('monsterDex').innerHTML = `${collectionShell('Boss Trophies', 'Collection records from defeated bosses.', `<div class="boss-trophy-section-head"><h4>Recorded Collection</h4><span class="pill">${format(bossSummary.recordedCount)} entries</span></div><div class="boss-trophy-grid boss-trophy-record-grid">${bossRecords.length ? bossRecords.map(entry => bossTrophyRecordCard(entry)).join('') : '<div class="boss-trophy-empty-state"><strong>No boss trophies recorded</strong><p>Defeat bosses to record their trophies here.</p><div class="small muted">Collection record only. No combat bonus.</div></div>'}</div><div class="sep"></div><div class="boss-trophy-section-head"><h4>Missing Trophy Case</h4><span class="pill">${format(bossSummary.missingCount)} missing</span></div><div class="boss-trophy-grid">${trophies.map(trophy => bossTrophyCard(trophy, bestDepth)).join('')}</div>`, { pill:`${format(bossSummary.totalFound)} recorded` })}${collectionShell('Board & Rival Trophies', 'Existing contract and rival collection records.', `<div class="elite-trophy-summary"><div class="elite-trophy-summary-head"><h4>Elite Trophies</h4><span class="pill">Trophy Bonus Preview: +${format(eliteBonus)}% board payout</span></div><div class="elite-trophy-summary-copy small muted">${format(Object.keys(eliteTrophies.collected || {}).length)} found${eliteTrophies.totalFound > 0 ? ` • ${format(eliteTrophies.totalFound)} total` : ''}${latestElite ? ` • Latest: ${escapeHtml(latestElite.name)}` : ' • Latest: none yet'}</div></div><div class="elite-trophy-summary rival-summary"><div class="elite-trophy-summary-head"><h4>Rivals Remembered</h4><span class="pill">${format(rivalActive.length)} active</span></div><div class="elite-trophy-summary-copy small muted">${format(rivals.length)} remembered • ${format(rivalDefeated.length)} defeated${latestRival ? ` • Latest: ${escapeHtml(latestRival.eliteName)}` : ' • Latest: none yet'}</div></div>`, { pill:`${format(eliteEntries.length)} trophies` })}${collectionShell('Retired Items', 'Archive records for gear worth remembering. DevTools-only record creation in this build.', `${retiredRelics.length ? `<div class="retired-relic-grid">${retiredRelics.map(entry => retiredRelicCard(entry)).join('')}</div>` : '<div class="empty-relic-shelf"><span>No retired items recorded</span><small>DevTools can seed archive records for save and UI checks. No player-facing retire action is active.</small></div>'}`, { pill: retiredRelics.length ? `${format(retiredRelics.length)} recorded` : 'No records yet' })}`;
    el('gearDex').innerHTML = `
      <h2>Archive Shelf</h2>
      <p class="small muted">Retired item archive foundation only. Records can render and persist, but no gear retirement actions are active in this build.</p>
      ${retiredRelics.length ? `<div class="retired-relic-grid">${retiredRelics.slice(0, 6).map(entry => retiredRelicCard(entry)).join('')}</div>` : '<div class="empty-relic-shelf"><span>Retired Items</span><small>No archive records yet. Use DevTools helpers for archive-only test entries.</small></div>'}`;
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
      const fallbackDetail = isWin ? 'Haul banked. Lowfire marked the run complete.' : isDefeat ? 'Unsecured rewards lost; banked gear and wallet stayed safe.' : 'Descent ended.';
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
      return `<div class="archive-line archive-note-line"><div class="small muted archive-note-stamp">${escapeHtml(stamp)}</div><div>${escapeHtml(text)}</div></div>`;
    }).join('') || '<p class="small muted">No Emberfall notes yet.</p>';
    const retiredRelicLines = asArray(S.player.retiredRelics, []).filter(isPlainObject).slice(0, 12).map(entry => {
      const itemName = cleanDisplayText(entry?.item?.name || 'Unknown relic', 'Unknown relic');
      const stamp = cleanDisplayText(entry.stamp || '', '');
      const note = cleanDisplayText(entry.note || entry.source || 'Archive record preserved.', 'Archive record preserved.');
      return `<div class="archive-line archive-note-line"><div class="small muted archive-note-stamp">${escapeHtml(stamp || retiredRelicDepthLabel(entry))}</div><div><strong>${escapeHtml(itemName)}</strong> • ${escapeHtml(note)}</div></div>`;
    }).join('') || '<p class="small muted">No retired item archive records yet.</p>';

    el('archivePanel').innerHTML = `
      <div class="archive-history-head">
        <div><h2>Descent History</h2><p class="small muted">Banked, lost, and next-start records.</p></div>
        <span class="pill">Latest ${format(history.length)}</span>
      </div>
      <div class="list run-history-list">${historyMarkup}</div>
      <div class="sep"></div>
      <div class="archive-history-head">
        <div><h3>Retired Item Archive</h3><p class="small muted">Read-only archive records. DevTools-only creation for v1.6.4.</p></div>
        <span class="pill">${format(asArray(S.player.retiredRelics, []).filter(isPlainObject).length)} recorded</span>
      </div>
      <div class="list archive-log-list">${retiredRelicLines}</div>
      <div class="sep"></div>
      <h3>Emberfall Notes</h3>
      <div class="list archive-log-list">${archiveLines}</div>`;

    el('settingsPanel').innerHTML = `
      <h2>System</h2>
      <p class="small">${escapeHtml(VISIBLE_VERSION_LABEL)}</p>
      <div class="tag-row"><span class="pill">Safe return</span><span class="pill">Hollow Stair</span><span class="pill">Guarded loop</span></div>
      <div class="sep"></div>
      <button class="ghost mini" id="clearCacheReloadBtn" type="button">Clear Cache & Reload</button>
      <div class="sep"></div>
      <div class="log-wrap">${S.player.log.map(line => `<div class="log-line small">${escapeHtml(cleanDisplayText(line))}</div>`).join('')}</div>`;
  }
