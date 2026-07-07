'use strict';

// Derived stats, XP/logs, run start, encounters, combat, quests, shops, rest/forge
  const MERCHANT_GEAR_UPGRADE_COSTS = Object.freeze([50, 125, 250]);
  const MERCHANT_GEAR_UPGRADE_CAP = MERCHANT_GEAR_UPGRADE_COSTS.length;

  function normalizeMerchantGearUpgradeLevel(value) {
    return Math.max(0, Math.min(MERCHANT_GEAR_UPGRADE_CAP, Math.floor(numberOr(value, 0, 0, MERCHANT_GEAR_UPGRADE_CAP))));
  }

  function merchantGearUpgradeSlotKey(slot) {
    const baseSlot = baseSlotForSlot(slot || '', '');
    return baseSlot === 'weapon' || baseSlot === 'armor' ? baseSlot : '';
  }

  function merchantGearUpgradeBonuses(item, levelOverride = null) {
    const level = levelOverride == null
      ? normalizeMerchantGearUpgradeLevel(item?.upgradeLevel)
      : normalizeMerchantGearUpgradeLevel(levelOverride);
    const slot = merchantGearUpgradeSlotKey(item?.slot || '');
    const bonuses = { power: 0, guard: 0, wit: 0, speed: 0, luck: 0, hp: 0 };
    if (slot === 'weapon') bonuses.power = level * 2;
    if (slot === 'armor') {
      bonuses.guard = level * 2;
      bonuses.hp = level * 8;
    }
    return bonuses;
  }

  function merchantGearUpgradeCost(level) {
    return MERCHANT_GEAR_UPGRADE_COSTS[normalizeMerchantGearUpgradeLevel(level)] || 0;
  }

  function merchantGearUpgradeStatSummary(item, levelOverride = null) {
    if (!item || typeof item !== 'object') return 'No gear equipped';
    const slot = merchantGearUpgradeSlotKey(item.slot);
    const bonuses = merchantGearUpgradeBonuses(item, levelOverride);
    const baseStats = isPlainObject(item.stats) ? item.stats : {};
    const power = Math.floor(numberOr(baseStats.power, 0, 0, 999999)) + bonuses.power;
    const guard = Math.floor(numberOr(baseStats.guard, 0, 0, 999999)) + bonuses.guard;
    const hp = Math.floor(numberOr(baseStats.hp, 0, 0, 999999)) + bonuses.hp;
    if (slot === 'armor') return `Guard ${format(guard)} • HP ${format(hp)}`;
    return `Power ${format(power)}`;
  }

  function merchantGearUpgradeModel(state, slot) {
    const safeSlot = merchantGearUpgradeSlotKey(slot);
    const equipment = state?.player?.equipment && typeof state.player.equipment === 'object' ? state.player.equipment : null;
    const item = equipment ? equipment[safeSlot] : null;
    const level = normalizeMerchantGearUpgradeLevel(item?.upgradeLevel);
    const capped = !item || level >= MERCHANT_GEAR_UPGRADE_CAP;
    const cost = capped ? 0 : merchantGearUpgradeCost(level);
    const gold = Math.max(0, Math.floor(numberOr(state?.player?.gold, 0, 0, Number.MAX_SAFE_INTEGER)));
    const affordable = !!item && !capped && gold >= cost;
    const missingCopper = affordable || !item || capped ? 0 : Math.max(0, cost - gold);
    return {
      slot: safeSlot,
      label: safeSlot === 'armor' ? 'Armor' : 'Weapon',
      item,
      itemName: cleanDisplayText(item?.name || (safeSlot === 'armor' ? 'No armor equipped' : 'No weapon equipped'), safeSlot === 'armor' ? 'No armor equipped' : 'No weapon equipped'),
      level,
      cap: MERCHANT_GEAR_UPGRADE_CAP,
      cost,
      capped,
      affordable,
      missingCopper,
      currentStat: item ? merchantGearUpgradeStatSummary(item, level) : '',
      nextStat: item && !capped ? merchantGearUpgradeStatSummary(item, level + 1) : ''
    };
  }

  function merchantGearUpgradeSummary(state) {
    return ['weapon', 'armor'].map(slot => merchantGearUpgradeModel(state, slot));
  }

  function calcDerived(state) {
    if (!isPlainObject(state?.player)) return { ...DEFAULT_PLAYER_STATS, hpBonus: 0 };
    if (!isPlainObject(state.player.stats)) state.player.stats = { ...DEFAULT_PLAYER_STATS };
    const base = { ...DEFAULT_PLAYER_STATS, ...state.player.stats };
    Object.keys(DEFAULT_PLAYER_STATS).forEach(k => {
      base[k] = Math.floor(numberOr(base[k], DEFAULT_PLAYER_STATS[k], 0, 99999));
      state.player.stats[k] = base[k];
    });
    const equip = { power:0, guard:0, wit:0, speed:0, luck:0, hp:0 };
    const seen = new Set();
    Object.values(state.player.equipment || {}).forEach(item => {
      if (!item) return;
      const key = item.id || item.name || JSON.stringify(item);
      if (seen.has(key)) return;
      seen.add(key);
      Object.keys(equip).forEach(k => equip[k] += item.stats[k] || 0);
      const upgradeBonuses = merchantGearUpgradeBonuses(item);
      Object.keys(equip).forEach(k => equip[k] += upgradeBonuses[k] || 0);
    });
    const ashboundCount = getEquippedSetCount(state, 'ashbound_warden');
    const bellforgeCount = getEquippedSetCount(state, 'veyruhn_bellforge');
    if (ashboundCount >= 2) equip.hp += 24 + Math.floor(numberOr(state.player.level, 1, 1, 999) * 3);
    if (bellforgeCount >= 2) equip.power += 4 + Math.floor(numberOr(state.player.level, 1, 1, 999) / 3);

    const total = {
      power: base.power + equip.power,
      guard: base.guard + equip.guard,
      wit: base.wit + equip.wit,
      speed: base.speed + equip.speed,
      luck: base.luck + equip.luck,
      hpBonus: equip.hp
    };
    state.player.level = Math.floor(numberOr(state.player.level, 1, 1, 999));
    state.player.maxHp = 100 + total.hpBonus + state.player.level * 10;
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    return total;
  }

  function xpGain(state, amount) {
    state.player.xp += amount;
    while (state.player.xp >= state.player.xpNext) {
      state.player.xp -= state.player.xpNext;
      state.player.level += 1;
      state.player.xpNext = Math.round(state.player.xpNext * 1.22);
      state.player.stats.power += rand(2,3);
      state.player.stats.guard += rand(1,3);
      state.player.stats.wit += rand(1,2);
      state.player.stats.speed += rand(1,2);
      state.player.stats.luck += rand(0,2);
      state.player.hp = state.player.maxHp;
      pushLog(state, `Level up → ${state.player.level}. The warden hardens.`);
    }
  }

  function isDisabledCombatEffectLine(line) {
    const lower = String(line || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    if (!lower) return false;
    return [
      'elite read:',
      'elite plan:',
      'venom seeps',
      'poison follows',
      'hollow-eyed precision',
      'pierces for',
      'burn lingers',
      'gravebound refuses',
      'ash-fed surge',
      'modifier activates',
      'aura pulses',
      'status applied'
    ].some(token => lower.includes(token));
  }

  function pushCombat(state, line) {
    if (!state.run) return;
    if (isDisabledCombatEffectLine(line)) return;
    state.run.combatLog = asArray(state.run.combatLog);
    state.run.combatLog.unshift(String(line || ''));
    state.run.combatLog = state.run.combatLog.slice(0, COMBAT_LOG_STORE_LIMIT);
  }
  function pushLog(state, line) {
    if (!state?.player) return;
    state.player.log = asArray(state.player.log, []);
    state.player.log.unshift(line);
    state.player.log = state.player.log.slice(0, 60);
  }
  function stripHtml(text) {
    return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // v1.3.22f final lock: every Archive, feed, and popup summary should render as clean player-facing text.
  function cleanDisplayText(text, fallback = '') {
    const stripped = stripHtml(text);
    const decoded = stripped
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return decoded || fallback;
  }

  function moneyText(copper) {
    return cleanDisplayText(formatMoney(copper), '0c');
  }

  function runRewardSummaryText(pending) {
    const p = createPendingRunRewards(pending);
    const parts = [];
    if (p.gold) parts.push(`Gold ${moneyText(p.gold)}`);
    if (p.shards) parts.push(`Shards ${format(p.shards)}`);
    if (p.ember) parts.push(`Ember ${format(p.ember)}`);
    if (p.xp) parts.push(`XP ${format(p.xp)}`);
    if (p.loot.length) parts.push(`Loot ${format(p.loot.length)}`);
    return parts.length ? parts.join(' • ') : 'no unsecured rewards';
  }

  function runHistoryRewardText(entry) {
    const r = isPlainObject(entry) ? entry : {};
    const saved = cleanDisplayText(r.rewards || '');
    if (saved && saved !== 'no unsecured rewards') return saved;
    const parts = [];
    const gold = sanitizeCurrencyValue(r.gold, 0);
    const shards = sanitizeCurrencyValue(r.shards, 0);
    const ember = sanitizeCurrencyValue(r.ember, 0);
    const xp = sanitizeCurrencyValue(r.xp, 0);
    const lootCount = sanitizeCurrencyValue(r.lootCount, 0);
    if (gold) parts.push(moneyText(gold));
    if (shards) parts.push(`${format(shards)} shards`);
    if (ember) parts.push(`${format(ember)} ember`);
    if (xp) parts.push(`${format(xp)} XP`);
    if (lootCount) parts.push(`${format(lootCount)} loot`);
    return parts.length ? parts.join(' • ') : (saved || 'no unsecured rewards');
  }

  function normalizeRunHistoryReason(reason) {
    const clean = String(reason || 'ended').toLowerCase().trim();
    if (clean === 'extract' || clean === 'extracted' || clean === 'success') return 'extract';
    if (clean === 'defeat' || clean === 'defeated' || clean === 'death' || clean === 'died') return 'defeat';
    return clean || 'ended';
  }

  function safeRunHistoryDate(entry) {
    const r = isPlainObject(entry) ? entry : {};
    return cleanDisplayText(r.date || r.stamp || r.time || '');
  }

  function combatFeedKind(line) {
    const raw = String(line || '');
    const lower = stripHtml(raw).toLowerCase();
    if (!lower) return 'empty';
    if (lower.includes('hardcore') || lower.includes('death') || lower.startsWith('defeated.') || lower.startsWith('defeated in ') || lower.includes('forfeit') || lower.includes('descent claimed') || lower.includes('run failed')) return 'death';
    if (/\b(extract|extracted|extraction|escaped)\b/.test(lower) || lower.includes('extraction secured')) return 'escape';
    if (lower.includes('boss') || lower.includes('warning') || lower.includes('enraged')) return 'boss';
    if (lower.includes('elite') || lower.includes('frenzied') || lower.includes('ironhide') || lower.includes('venomous') || lower.includes('swift') || lower.includes('hollow-eyed') || lower.includes('ash-fed') || lower.includes('gravebound') || lower.includes('wardmarked')) return 'elite';
    if (lower.includes('trophy found') || lower.includes('trophy duplicate found') || lower.includes('elite reward ladder')) return 'reward';
    if (lower.includes('floor secured') || lower.includes('floor cleared') || lower.includes('floor reached') || lower.startsWith('floor ')) return 'floor';
    if (lower.includes('room secured') || lower.includes('room cleared') || lower.includes('room reached')) return 'milestone';
    if (lower.includes('recovered') || lower.includes('healed') || lower.includes('returns') || lower.includes('regen')) return 'heal';
    if (lower.includes('loot') || lower.includes('found:') || lower.includes('relic') || lower.includes('drop') || lower.includes('cache')) return 'loot';
    if (lower.includes('gold') || lower.includes('shard') || lower.includes('reward')) return 'reward';
    if (lower.includes('you hit') || lower.includes('ashburst') || lower.includes('critical') || lower.includes('strike')) return 'player-hit';
    if (lower.includes('hits for') || lower.includes('misses') || lower.includes('takes')) return 'enemy-hit';
    if (lower.includes('guard') || lower.includes('brace')) return 'guard';
    if (lower.includes('descent continues') || lower.includes('entering ') || lower.includes('contract')) return 'progress';
    return 'action';
  }

  function combatFeedIcon(kind) {
    switch (kind) {
      case 'reward': return '✦';
      case 'loot': return '◈';
      case 'milestone': return '◆';
      case 'floor': return '▲';
      case 'progress': return '➜';
      case 'heal': return '✚';
      case 'boss': return '⚠';
      case 'elite': return '◇';
      case 'death': return '✕';
      case 'escape': return '⇡';
      case 'player-hit': return '⚔';
      case 'enemy-hit': return '!';
      case 'guard': return '▣';
      case 'empty': return '·';
      default: return '•';
    }
  }

  function combatFeedLabel(kind) {
    switch (kind) {
      case 'reward': return 'Reward';
      case 'loot': return 'Loot';
      case 'milestone': return 'Room';
      case 'floor': return 'Floor';
      case 'progress': return 'Progress';
      case 'heal': return 'Recovery';
      case 'boss': return 'Boss';
      case 'elite': return 'Elite';
      case 'death': return 'Defeat';
      case 'escape': return 'Extract';
      case 'player-hit': return 'Strike';
      case 'enemy-hit': return 'Damage';
      case 'guard': return 'Guard';
      case 'empty': return 'No Drop';
      default: return 'Action';
    }
  }

  function compactCombatFeedText(line) {
    let text = cleanDisplayText(line);
    if (!text) return '';
    text = text
      .replace(/^(Room Reward|Elite Spoils|Boss Spoils):\s+(.+?)\s+(secured|defeated|cleared)\.\s+Unsecured\s+/i, '$1: ')
      .replace(/^Room cleared:\s*floor\s*(\d+),\s*room\s*(\d+)\.\s*Room Reward unsecured\s+/i, 'Room cleared: F$1 R$2 - Reward ')
      .replace(/^Floor cleared:\s*Hollow Stair floor\s*(\d+)\.\s*Milestone Reward unsecured\s+/i, 'Floor cleared: Floor $1 - Reward ')
      .replace(/^(Room Reward loot|Room Reward cache):\s+/i, 'Loot: ')
      .replace(/\s+added to the unsecured haul\.?/gi, '')
      .replace(/The haul stays unsecured;\s*/gi, '')
      .replace(/^Descent continues:\s*/i, 'Next fight: ')
      .replace(/^Encounter:\s+(.+?)\s+rises in\s+.+\.?$/i, 'Now fighting: $1')
      .replace(/^Elite pressure rises:\s*/i, 'Elite: ')
      .replace(/^Boss pressure locks the stair:\s*/i, 'Boss: ')
      .replace(/^No gear found\. You pocket the coin and move on\.?$/i, 'No gear drop. Currency added to haul.')
      .replace(/^Elite Spoils:\s*no gear found\.\s*Coin,\s*shards,\s*and XP stay in the unsecured haul\.?$/i, 'Elite Spoils: no gear drop. Currency and XP held.')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  function renderCombatFeedLine(line) {
    const raw = String(line || '');
    const kind = combatFeedKind(raw);
    let normalized = escapeHtml(compactCombatFeedText(raw))
      .replace(/\(\+gold charm\)/gi, '<span class="feed-chip feed-chip-gold">Gold Charm</span>')
      .replace(/\+(\d+)\s*gold/gi, '<span class="feed-chip feed-chip-gold">+$1 gold</span>')
      .replace(/\+(\d+)\s*shards?/gi, '<span class="feed-chip feed-chip-shard">+$1 shards</span>')
      .replace(/recovered\s+(\d+)\s+hp/gi, '<span class="feed-chip feed-chip-heal">recovered $1 HP</span>')
      .replace(/healed\s+(\d+)/gi, '<span class="feed-chip feed-chip-heal">healed $1</span>')
      .replace(/returns\s+(\d+)/gi, '<span class="feed-chip feed-chip-heal">returns $1</span>')
      .replace(/hits for\s+(\d+)/gi, '<span class="feed-chip feed-chip-hurt">hits for $1</span>')
      .replace(/you hit/gi, '<span class="feed-chip feed-chip-player">You hit</span>')
      .replace(/ashburst/gi, '<span class="feed-chip feed-chip-skill">Ashburst</span>')
      .replace(/critical/gi, '<span class="feed-chip feed-chip-crit">Critical</span>')
      .replace(/Boss Spoils/gi, '<span class="feed-chip feed-chip-boss">Boss Spoils</span>')
      .replace(/Elite Spoils/gi, '<span class="feed-chip feed-chip-elite">Elite Spoils</span>')
      .replace(/Room Reward/gi, '<span class="feed-chip feed-chip-floor">Room Reward</span>')
      .replace(/Milestone Reward/gi, '<span class="feed-chip feed-chip-floor">Milestone Reward</span>')
      .replace(/Mythic Find/gi, '<span class="feed-chip rarity-mythic">Mythic Find</span>')
      .replace(/Boss relic/gi, '<span class="feed-chip feed-chip-boss">Boss relic</span>')
      .replace(/Bounty relic/gi, '<span class="feed-chip feed-chip-boss">Bounty relic</span>')
      .replace(/Elite warning/gi, '<span class="feed-chip feed-chip-elite feed-chip-threat">Elite warning</span>')
      .replace(/Dangerous elite defeated/gi, '<span class="feed-chip feed-chip-elite">Dangerous elite defeated</span>')
      .replace(/Elite drop/gi, '<span class="feed-chip feed-chip-elite">Elite drop</span>')
      .replace(/Elite bonus loot/gi, '<span class="feed-chip feed-chip-elite">Elite bonus loot</span>')
      .replace(/Floor cleared/gi, '<span class="feed-chip feed-chip-floor">Floor cleared</span>')
      .replace(/Floor secured/gi, '<span class="feed-chip feed-chip-floor">Floor secured</span>')
      .replace(/Room cleared/gi, '<span class="feed-chip feed-chip-floor">Room cleared</span>')
      .replace(/Room secured/gi, '<span class="feed-chip feed-chip-floor">Room secured</span>')
      .replace(/\bUnsecured\b/gi, '<span class="feed-chip feed-chip-unsecured">Unsecured</span>')
      .replace(/\b(Extraction|Extracted|Extract)\b/gi, match => `<span class="feed-chip feed-chip-extract">${match}</span>`)
      .replace(/Death forfeits(?: all)?(?: unextracted)? rewards?/gi, match => `<span class="feed-chip feed-chip-death">${match}</span>`)
      .replace(/Death forfeits loot/gi, '<span class="feed-chip feed-chip-death">Death forfeits loot</span>')
      .replace(/Hardcore/gi, '<span class="feed-chip feed-chip-death">Hardcore</span>');
    return `<div class="log-line small combat-feed-line feed-${kind}">
      <span class="feed-icon">${combatFeedIcon(kind)}</span>
      <div class="feed-copy">
        <div class="feed-kicker">${combatFeedLabel(kind)}</div>
        <div class="feed-body">${normalized}</div>
      </div>
    </div>`;
  }
  function spawnQuestLore(state, text) {
    if (!state) return;
    state.archive = asArray(state.archive, []);
    state.archive.unshift({ stamp: new Date().toLocaleString(), text });
    state.archive = state.archive.slice(0, 40);
  }

  function startRun(state, startDepth = null) {
    if (!isPlainObject(state) || !isPlainObject(state.player)) return false;
    const run = ensureRunShell(state);
    if (run.active && run.monster) {
      state.screen = 'run';
      return true;
    }
    if (run.active && !run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete active descent before starting a new descent.');
    }
    calcDerived(state);
    const sink = ensureGoldSinkState(state);
    const hasExplicitStart = startDepth !== null && startDepth !== undefined;
    const requestedDepth = hasExplicitStart
      ? progressDepthValue(startDepth, 1)
      : defaultRunStartDepth(state);
    const allowedCharterStart = requestedDepth > 1 && canUseCharterStart(state, requestedDepth);
    const allowedSafeReturnStart = !hasExplicitStart && canUseSafeReturnStart(state, requestedDepth);
    const actualStartDepth = requestedDepth === 1 || allowedCharterStart || allowedSafeReturnStart ? requestedDepth : 1;
    run.active = true;
    run.floor = actualStartDepth;
    run.startedFromCharter = allowedCharterStart;
    run.charterStartFloor = allowedCharterStart ? run.floor : 0;
    run.setBonuses = { ashboundLethalUsed: false, bellforgeHits: 0, sootveilEscapeUsed: false, sootveilGuard: 0 };
    run.chain = 0;
    run.roomsCleared = 0;
    run.encounters = 0;
    run.goldBonusPct = Math.floor(numberOr(sink.nextRunGoldBonusPct, 0, 0, 50));
    sink.nextRunGoldBonusPct = 0;
    run.pendingRewards = createPendingRunRewards();
    run.zone = zoneName(run.floor);
    run.danger = dangerRatingForDepth(run.floor);
    run.combatLog = [];
    if (!state.ui) state.ui = { combatLogExpanded:false };
    state.ui.combatLogExpanded = false;
    // Hollow Stair entry preserves current HP; only clamp invalid saved/runtime values.
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 1, state.player.maxHp));
    nextEncounter(state);
    if (!state.run.monster) {
      recoverRunToTown(state, 'The Hollow Stair failed to raise a threat; returned safely to Lowfire.');
      return false;
    }
    state.screen = 'run';
    pushLog(state, `Entered ${state.run.zone}. ${runDepthLabel(state)}. Start run, fight, earn haul, then extract or continue.`);
    if (state.run.goldBonusPct > 0) pushLog(state, `Small Debt Charm active: +${state.run.goldBonusPct}% gold this descent.`);
    return true;
  }


  function startCharterRun(state, depth) {
    const startDepth = normalizeCharterMilestoneDepth(depth);
    if (state.run?.active) {
      state.screen = 'run';
      return pushLog(state, 'A descent is already active. Continue it before using a charter.');
    }
    const alreadyOwned = ownsPermanentCharter(state, startDepth);
    if (!alreadyOwned && !isCharterDepthUnlocked(state, startDepth)) return pushLog(state, 'That Hollow Stair Charter is not unlocked yet.');
    const cost = charterStartCost(startDepth);
    if (!alreadyOwned) {
      if (state.player.gold < cost) return pushLog(state, `Need ${formatMoney(cost)} to permanently buy the ${charterDepthLabel(startDepth)} charter.`);
      state.player.gold -= cost;
      grantPermanentCharter(state, startDepth);
      pushLog(state, `Permanent Hollow Stair Charter bought: ${charterDepthLabel(startDepth)} for ${formatMoney(cost)}.`);
    }
    startRun(state, startDepth);
    pushLog(state, `Hollow Stair Charter used: return deeper at ${charterDepthLabel(startDepth)}.`);
  }

  function zoneName(floor) {
    return districtByDepth(floor).name;
  }

  function nextEncounter(state) {
    const run = ensureRunShell(state);
    if (!run.active) return;
    run.floor = progressDepthValue(run.floor, defaultRunStartDepth(state));
    run.zone = zoneName(run.floor);
    if (typeof expireOverdueEliteContract === 'function') expireOverdueEliteContract(state);
    run.monster = generateMonster(run.floor, state);
    if (!run.monster) {
      recoverRunToTown(state, 'Recovered from a failed encounter roll and returned to Lowfire.');
      return;
    }
    state.run.encounters += 1;
    state.run.choices = ['attack','guard','skill','extract'];
    state.player.discoveredMonsters = asArray(state.player.discoveredMonsters, []);
    if (!state.player.discoveredMonsters.includes(state.run.monster.name)) state.player.discoveredMonsters.push(state.run.monster.name);
    const monster = state.run.monster;
    if (monster.contractTarget) {
      pushCombat(state, `Contract target sighted: ${monster.name}.`);
      if (window.DungeonDexEliteContracts?.activeSummaryText) {
        const writText = window.DungeonDexEliteContracts.activeSummaryText(state);
        if (writText) pushCombat(state, writText);
      }
    } else if (monster.tier === 'Boss') {
      pushCombat(state, `Boss pressure locks the stair: ${monster.name}.`);
    } else if (monster.tier === 'Elite') {
      pushCombat(state, `Elite pressure rises: ${monster.name}.`);
    } else {
      pushCombat(state, `Encounter: ${monster.name} rises in ${state.run.zone}.`);
    }
  }

  function damageRoll(offense, defense, swing = 1) {
    return Math.max(1, Math.round((offense * swing) - defense * 0.33 + rand(-4, 5)));
  }

  function combatAction(state, action) {
    const result = { saveNow: false, fullRender: false };
    ensureRunShell(state);
    action = String(action || '');
    if (!CORE_COMBAT_ACTIONS.includes(action)) return result;
    if (!hasActiveCombat(state)) {
      if (state?.run?.active && !state.run.monster) {
        recoverRunToTown(state, 'Recovered from an incomplete combat state and returned to Lowfire.');
        result.saveNow = true;
        result.fullRender = true;
      }
      return result;
    }
    const monster = state.run.monster;
    if (numberOr(monster.hp, 0, 0, Number.MAX_SAFE_INTEGER) <= 0) {
      winEncounter(state);
      result.saveNow = true;
      return result;
    }
    const stats = calcDerived(state);
    let playerSwing = 1;
    let playerShield = 0;
    let lethalStrikeTaken = false;

    if (action === 'attack') {
      playerSwing = 1.0 + stats.speed * 0.008;
      if (Math.random() < (state.player.crit + stats.luck * 0.18) / 100) playerSwing += 0.7;
      if (hasEquippedSetBonus(state, 'veyruhn_bellforge', 3) && monster.tier === 'Boss') playerSwing += 0.14;
      if (hasEquippedSetBonus(state, 'veyruhn_bellforge', 5)) {
        const setRun = ensureRunSetBonusState(state);
        setRun.bellforgeHits += 1;
        if (setRun.bellforgeHits % 5 === 0) {
          playerSwing += 0.55;
          pushCombat(state, 'Bellforge toll rings: the fifth strike lands heavy.');
        }
      }
      if (consumeDebtbrandCombatBoost(state)) playerSwing += 0.20;
      const dealt = damageRoll(stats.power, monster.guard, playerSwing);
      monster.hp -= dealt;
      pushCombat(state, `You strike for ${dealt}.`);
    } else if (action === 'guard') {
      playerShield = Math.round(stats.guard * 0.65 + stats.wit * 0.25);
      const recovered = Math.max(1, Math.round(stats.guard * 0.09));
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);
      if (monster.contractTarget && window.DungeonDexEliteContracts?.markEliteContractGuard) window.DungeonDexEliteContracts.markEliteContractGuard(state);
      pushCombat(state, `You brace and recover ${recovered} HP.`);
    } else if (action === 'skill') {
      if (state.player.ember <= 0) {
        pushCombat(state, 'No ember left. Ashburst fizzles.');
      } else {
        state.player.ember -= 1;
        const skillSwing = 1.45 + (hasEquippedSetBonus(state, 'veyruhn_bellforge', 3) && monster.tier === 'Boss' ? 0.12 : 0) + (consumeDebtbrandCombatBoost(state) ? 0.18 : 0);
        const dealt = damageRoll(stats.power + stats.wit * 0.7, monster.guard * 0.6, skillSwing);
        monster.hp -= dealt;
        const siphon = Math.max(1, Math.round(stats.wit * 0.18));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + siphon);
        pushCombat(state, `Ashburst hits for ${dealt} and returns ${siphon} HP.`);
      }
    } else if (action === 'extract') {
      const odds = clamp(38 + stats.speed + stats.luck - threatDepthFromDepth(state.run.floor) * 2, 10, 90);
      if (Math.random() * 100 <= odds) {
        if (monster.contractTarget && window.DungeonDexEliteContracts?.markEliteContractExtract) window.DungeonDexEliteContracts.markEliteContractExtract(state);
        pushCombat(state, `You extract safely from ${state.run.zone} at ${runDepthLabel(state)}.`);
        finishRun(state, 'extract');
        result.saveNow = true;
        result.fullRender = true;
        return result;
      } else {
        pushCombat(state, 'Extraction failed. The haul stays unsecured; guard or finish the fight.');
      }
    } else {
      return result;
    }

    if (monster.hp <= 0) {
      winEncounter(state);
      result.saveNow = true;
      return result;
    }

    const sootveilGuard = consumeSootveilGuard(state);
    if (sootveilGuard > 0) {
      playerShield += sootveilGuard;
      pushCombat(state, `Sootveil guard holds: +${format(sootveilGuard)} Guard.`);
    }

    if (hasEquippedSetBonus(state, 'ashbound_warden', 3) && monster.tier === 'Boss') {
      playerShield += Math.max(2, Math.round(stats.guard * 0.22));
    }
    const swing = monster.tier === 'Boss' ? 1.3 : monster.tier === 'Elite' ? 1.16 : 1;
    const incoming = Math.max(1, damageRoll(monster.power, stats.guard + playerShield, swing));
    const dodged = Math.random() * 100 < clamp(state.player.dodge + stats.speed * 0.25, 3, 38);
    if (dodged) {
      pushCombat(state, `${monster.name} misses through the gloom.`);
    } else {
      state.player.hp -= incoming;
      if (state.player.hp <= 0) lethalStrikeTaken = true;
      pushCombat(state, `${monster.name} hits for ${incoming}.`);
    }

    if (state.player.hp <= 0) {
      if (lethalStrikeTaken && trySootveilEscape(state, stats)) {
        result.saveNow = true;
      } else if (tryAshboundLethalWard(state)) {
        result.saveNow = true;
      } else {
        defeat(state, monster);
        result.saveNow = true;
        result.fullRender = true;
      }
    }
    return result;
  }


  function bossTrophyForRawDepth(rawDepth) {
    const depth = depthStageValue(rawDepth);
    return asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], [])
      .find(trophy => depth >= numberOr(trophy.requiredDepth, 0, 0, 999999) && depth < numberOr(trophy.requiredDepth, 0, 0, 999999) + DEPTH_CHAPTERS_PER_THREAT_STEP);
  }

  function bossTrophyDefinitionFor(value) {
    const clean = String(value || '').trim();
    if (!clean) return null;
    const lower = clean.toLowerCase();
    return asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], [])
      .find(entry => {
        if (!entry) return false;
        return [entry.id, entry.name, entry.source, entry.bossName]
          .map(candidate => String(candidate || '').trim().toLowerCase())
          .filter(Boolean)
          .includes(lower);
      }) || null;
  }

  function bossTrophyDefinitionById(id) {
    return bossTrophyDefinitionFor(id);
  }

  function bossTrophySafeText(value, fallback) {
    const clean = String(value || '').trim();
    return clean || fallback;
  }

  function bossTrophyFallbackId(value) {
    const clean = String(value || '').trim();
    if (!clean || /^(boss trophy|unknown boss|unknown boss trophy)$/i.test(clean)) return '';
    return clean.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  }

  function bossTrophyRecordId(raw, fallbackId = '') {
    const source = isPlainObject(raw) ? raw : {};
    const candidates = [
      source.trophyId,
      source.id,
      source.recordId,
      source.bossId,
      source.sourceId,
      fallbackId,
      source.trophyName,
      source.name,
      source.bossName,
      source.source,
      source.sourceBoss
    ];
    for (const candidate of candidates) {
      const def = bossTrophyDefinitionFor(candidate);
      if (def?.id) return String(def.id).trim();
    }
    for (const candidate of candidates) {
      const fallback = bossTrophyFallbackId(candidate);
      if (fallback) return fallback;
    }
    return '';
  }

  function bossTrophyLegacyIds(value) {
    const ids = [];
    if (Array.isArray(value)) {
      value.forEach(entry => {
        const id = isPlainObject(entry) ? bossTrophyRecordId(entry) : bossTrophyRecordId({ trophyId: entry });
        if (id) ids.push(id);
      });
    } else if (isPlainObject(value)) {
      Object.keys(value).forEach(key => {
        const entry = value[key];
        const id = isPlainObject(entry) ? bossTrophyRecordId(entry, key) : bossTrophyRecordId({ trophyId: key });
        if (id) ids.push(id);
      });
    }
    return ids;
  }

  function bossTrophyRecordFromSource(raw, fallbackId = '', sourceKind = 'record') {
    const source = isPlainObject(raw) ? raw : {};
    const id = bossTrophyRecordId(source, fallbackId);
    if (!id) return null;
    const def = bossTrophyDefinitionById(id) || bossTrophyDefinitionFor(source.trophyName || source.name || source.bossName || source.source);
    const rawDepth = Math.max(0, Math.floor(numberOr(source.rawDepth, source.bestKillDepth || def?.requiredDepth || 0, 0, 999999)));
    const bestKillDepth = Math.max(0, Math.floor(numberOr(source.bestKillDepth, rawDepth || def?.requiredDepth || 0, 0, 999999)));
    return {
      id,
      trophyId: id,
      trophyName: bossTrophySafeText(source.trophyName || source.name || def?.name, 'Boss Trophy'),
      bossName: bossTrophySafeText(source.bossName || source.sourceBoss || def?.source || source.source, 'Unknown Boss'),
      floor: Math.max(1, Math.floor(numberOr(source.floor, 1, 1, 999999))),
      room: Math.max(1, Math.floor(numberOr(source.room, 1, 1, 999999))),
      chapter: Math.max(1, Math.floor(numberOr(source.chapter, 1, 1, 999999))),
      rawDepth,
      securedDepth: Math.max(1, Math.floor(numberOr(source.securedDepth, 1, 1, 999999))),
      bestKillDepth,
      count: Math.max(1, Math.floor(numberOr(source.count, 1, 1, 9999))),
      tone: bossTrophySafeText(source.tone || def?.tone, 'Trophy'),
      source: bossTrophySafeText(source.source || def?.source || source.bossName, 'Boss Floor'),
      image: String(source.image || def?.image || 'assets/trophies/hollow_stair_skull_trophy.png'),
      icon: String(source.icon || def?.icon || ''),
      earnedAt: Math.max(0, Math.floor(numberOr(source.earnedAt || source.defeatedAt || source.completedAt || source.createdAt || source.unlockedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      _sourceKind: sourceKind
    };
  }

  function bossTrophyMergeRecord(target, incoming) {
    if (!target || !incoming) return target || incoming || null;
    const def = bossTrophyDefinitionById(target.trophyId || incoming.trophyId);
    const prefer = (current, next, fallback) => {
      const currentText = bossTrophySafeText(current, '');
      if (currentText && currentText !== fallback) return currentText;
      return bossTrophySafeText(next || fallback, fallback);
    };
    const bothRecords = target._sourceKind === 'record' && incoming._sourceKind === 'record';
    target.trophyName = prefer(target.trophyName, incoming.trophyName || def?.name, 'Boss Trophy');
    target.bossName = prefer(target.bossName, incoming.bossName || def?.source, 'Unknown Boss');
    target.floor = Math.max(Math.floor(numberOr(target.floor, 1, 1, 999999)), Math.floor(numberOr(incoming.floor, 1, 1, 999999)));
    target.room = Math.max(Math.floor(numberOr(target.room, 1, 1, 999999)), Math.floor(numberOr(incoming.room, 1, 1, 999999)));
    target.chapter = Math.max(Math.floor(numberOr(target.chapter, 1, 1, 999999)), Math.floor(numberOr(incoming.chapter, 1, 1, 999999)));
    target.rawDepth = Math.max(Math.floor(numberOr(target.rawDepth, 0, 0, 999999)), Math.floor(numberOr(incoming.rawDepth, 0, 0, 999999)));
    target.securedDepth = Math.max(Math.floor(numberOr(target.securedDepth, 1, 1, 999999)), Math.floor(numberOr(incoming.securedDepth, 1, 1, 999999)));
    target.bestKillDepth = Math.max(Math.floor(numberOr(target.bestKillDepth, 0, 0, 999999)), Math.floor(numberOr(incoming.bestKillDepth, 0, 0, 999999)));
    target.count = bothRecords
      ? Math.max(Math.floor(numberOr(target.count, 1, 1, 9999)), Math.floor(numberOr(incoming.count, 1, 1, 9999)))
      : Math.max(1, Math.floor(numberOr(target.count, incoming.count || 1, 1, 9999)));
    target.tone = prefer(target.tone, incoming.tone || def?.tone, 'Trophy');
    target.source = prefer(target.source, incoming.source || def?.source, 'Boss Floor');
    target.image = String(target.image || incoming.image || def?.image || 'assets/trophies/hollow_stair_skull_trophy.png');
    target.icon = String(target.icon || incoming.icon || def?.icon || '');
    target.earnedAt = Math.max(Math.floor(numberOr(target.earnedAt, 0, 0, Number.MAX_SAFE_INTEGER)), Math.floor(numberOr(incoming.earnedAt, 0, 0, Number.MAX_SAFE_INTEGER)));
    return target;
  }

  function bossTrophyStateModel(state, options = {}) {
    const player = isPlainObject(state?.player) ? state.player : {};
    const rememberedLegacyDetected = player.__bossTrophyLegacyIdsDetected === true;
    const rememberedDuplicateCount = Math.max(0, Math.floor(numberOr(player.__bossTrophyDuplicateRecordsCollapsedCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const recordsById = new Map();
    const order = [];
    let duplicateRecordsCollapsed = 0;
    const addRecord = record => {
      if (!record?.trophyId) return;
      if (recordsById.has(record.trophyId)) {
        duplicateRecordsCollapsed += 1;
        bossTrophyMergeRecord(recordsById.get(record.trophyId), record);
        return;
      }
      recordsById.set(record.trophyId, record);
      order.push(record.trophyId);
    };
    asArray(player.bossTrophyRecords, []).forEach(raw => {
      if (!isPlainObject(raw)) return;
      addRecord(bossTrophyRecordFromSource(raw, '', 'record'));
    });
    const legacyIds = bossTrophyLegacyIds(player.bossTrophies);
    const seenLegacy = new Set();
    let legacyRecordsCreated = 0;
    legacyIds.forEach(id => {
      if (!id) return;
      if (seenLegacy.has(id)) {
        duplicateRecordsCollapsed += 1;
        return;
      }
      seenLegacy.add(id);
      const legacyRecord = bossTrophyRecordFromSource({ trophyId: id }, id, 'legacy');
      if (!legacyRecord) return;
      if (recordsById.has(id)) {
        bossTrophyMergeRecord(recordsById.get(id), legacyRecord);
      } else {
        legacyRecordsCreated += 1;
        addRecord(legacyRecord);
      }
    });
    const records = order
      .map(id => recordsById.get(id))
      .filter(Boolean)
      .slice(0, 80)
      .map(record => {
        const { _sourceKind, ...clean } = record;
        return clean;
      });
    const ids = records.map(record => String(record.trophyId || record.id || '').trim()).filter(Boolean).slice(0, 80);
    if (options.mutate && state?.player) {
      state.player.bossTrophyRecords = records;
      state.player.bossTrophies = Array.from(new Set(ids)).slice(0, 80);
      rememberBossTrophyRepairFlags(state, {
        legacyIdsDetected: legacyRecordsCreated > 0 || rememberedLegacyDetected,
        duplicateRecordsCollapsed: duplicateRecordsCollapsed + rememberedDuplicateCount
      });
    }
    const totalDuplicateRecordsCollapsed = duplicateRecordsCollapsed + rememberedDuplicateCount;
    return {
      records,
      ids: Array.from(new Set(ids)).slice(0, 80),
      legacyIdsDetected: legacyRecordsCreated > 0 || rememberedLegacyDetected,
      legacyIds: legacyIds.slice(),
      duplicateRecordsCollapsed: totalDuplicateRecordsCollapsed,
      duplicateSafe: true
    };
  }

  function normalizeBossTrophyStateShape(state) {
    return bossTrophyStateModel(state, { mutate: true });
  }

  function rememberBossTrophyRepairFlags(state, model) {
    if (!state?.player || !isPlainObject(model)) return;
    const legacyIdsDetected = model.legacyIdsDetected === true || state.player.__bossTrophyLegacyIdsDetected === true;
    const duplicatesCollapsed = Math.max(
      Math.floor(numberOr(model.duplicateRecordsCollapsed, 0, 0, Number.MAX_SAFE_INTEGER)),
      Math.floor(numberOr(state.player.__bossTrophyDuplicateRecordsCollapsedCount, 0, 0, Number.MAX_SAFE_INTEGER))
    );
    if (legacyIdsDetected) {
      Object.defineProperty(state.player, '__bossTrophyLegacyIdsDetected', {
        value: true,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    if (duplicatesCollapsed > 0) {
      Object.defineProperty(state.player, '__bossTrophyDuplicateRecordsCollapsedCount', {
        value: duplicatesCollapsed,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
  }

  function ensureBossTrophyRecords(state) {
    if (!state?.player) return [];
    return normalizeBossTrophyStateShape(state).records;
  }

  function getBossTrophyDisplayName(input, options) {
    const record = isPlainObject(input) ? input : null;
    const def = bossTrophyDefinitionById(record?.id || record?.trophyId || input);
    const lockedLabel = options?.lockedLabel || 'Unknown Boss Trophy';
    if (options?.locked) return lockedLabel;
    return bossTrophySafeText(record?.trophyName || record?.name || def?.name, 'Boss Trophy');
  }

  function getBossTrophyCollectionSummary(state) {
    const model = bossTrophyStateModel(state);
    const records = model.records;
    const defs = asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], []);
    const latest = records.slice().sort((a, b) => numberOr(b.earnedAt, 0) - numberOr(a.earnedAt, 0))[0] || null;
    const totalFound = records.reduce((sum, entry) => sum + Math.max(1, Math.floor(numberOr(entry.count, 1, 1, 9999))), 0);
    const bestRecord = records.slice().sort((a, b) => numberOr(b.bestKillDepth, 0) - numberOr(a.bestKillDepth, 0) || numberOr(b.earnedAt, 0) - numberOr(a.earnedAt, 0))[0] || null;
    const totalDefinitions = defs.length;
    const recordedCount = records.length;
    const missingCount = totalDefinitions > 0 ? Math.max(0, totalDefinitions - recordedCount) : 0;
    return {
      totalFound,
      uniqueFound: recordedCount,
      totalDefinitions,
      recordedCount,
      missingCount,
      latestLabel: latest ? getBossTrophyDisplayName(latest) : 'None yet',
      latestRecord: latest,
      bestRecord,
      records,
      trophyNames: records.map(entry => getBossTrophyDisplayName(entry)),
      bossNames: records.map(entry => bossTrophySafeText(entry.bossName || entry.source, 'Unknown Boss')),
      legacyIdsDetected: model.legacyIdsDetected,
      duplicateRecordsCollapsed: model.duplicateRecordsCollapsed > 0,
      duplicatesCollapsedCount: model.duplicateRecordsCollapsed,
      duplicateSafe: model.duplicateSafe,
      completionText: totalDefinitions > 0 ? `${recordedCount} / ${totalDefinitions}` : `${recordedCount}`
    };
  }

  function getBossTrophyCompletionState(state, trophyOrId) {
    const defs = asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], []);
    const trophy = isPlainObject(trophyOrId)
      ? trophyOrId
      : defs.find(entry => String(entry?.id || '').trim() === String(trophyOrId || '').trim());
    const records = ensureBossTrophyRecords(state);
    const record = records.find(entry => entry.id === trophy?.id || entry.trophyId === trophy?.id) || null;
    if (record) return { key:'recorded', trophy, record, locked:false, recorded:true };
    const bestDepth = Math.max(
      0,
      Math.floor(numberOr(state?.player?.depth, 0, 0, 999999)),
      Math.floor(numberOr(state?.player?.safeExtractDepth, 0, 0, 999999)),
      Math.floor(numberOr(state?.player?.returnDepth, 0, 0, 999999))
    );
    const available = trophy ? bestDepth >= Math.floor(numberOr(trophy.requiredDepth, 0, 0, 999999)) : false;
    return { key: available ? 'available' : 'locked', trophy, record:null, locked:!available, recorded:false };
  }

  function bossTrophySummary(state) {
    const summary = getBossTrophyCollectionSummary(state);
    return {
      totalFound: summary.totalFound,
      uniqueFound: summary.uniqueFound,
      recordedCount: summary.recordedCount,
      totalDefinitions: summary.totalDefinitions,
      missingCount: summary.missingCount,
      latestLabel: summary.latestLabel,
      bestRecordLabel: summary.bestRecord ? getBossTrophyDisplayName(summary.bestRecord) : 'None yet'
    };
  }

  function bossTrophyReadableSummary(state) {
    const summary = getBossTrophyCollectionSummary(state);
    const latest = summary.latestRecord || null;
    const names = summary.trophyNames || [];
    const firstNames = names.slice(0, 3).join(', ');
    const extraCount = Math.max(0, names.length - 3);
    const nameList = firstNames ? `${firstNames}${extraCount ? `, +${extraCount} more` : ''}` : '';
    const latestName = latest ? getBossTrophyDisplayName(latest) : '';
    const latestSource = latest ? bossTrophySafeText(latest.bossName || latest.source, 'Unknown Boss') : '';
    return {
      title: 'Boss Trophies',
      totalRecorded: summary.recordedCount,
      totalFound: summary.totalFound,
      totalDefinitions: summary.totalDefinitions,
      missingCount: summary.missingCount,
      trophyNames: names,
      bossNames: summary.bossNames || [],
      records: summary.records.slice(),
      latestTrophy: latest ? {
        id: latest.trophyId || latest.id || '',
        trophyName: latestName,
        bossName: latestSource,
        earnedAt: Math.max(0, Math.floor(numberOr(latest.earnedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
        count: Math.max(1, Math.floor(numberOr(latest.count, 1, 1, 9999)))
      } : null,
      legacyIdsDetected: summary.legacyIdsDetected,
      duplicateRecordsCollapsed: summary.duplicateRecordsCollapsed,
      duplicatesCollapsedCount: summary.duplicatesCollapsedCount,
      duplicateSafe: summary.duplicateSafe,
      emptyCopy: 'No boss trophies recorded yet.',
      body: summary.recordedCount > 0
        ? `${summary.completionText} boss trophies recorded${nameList ? `: ${nameList}.` : '.'}`
        : 'No boss trophies recorded yet.',
      meta: latest
        ? `Latest: ${latestName} from ${latestSource}.`
        : 'Defeat bosses to start the records. Last recorded: none yet.'
    };
  }

  function recordBossTrophyUnlock(state, rawDepth, monsterName) {
    if (!state?.player) return null;
    state.player.bossTrophies = asArray(state.player.bossTrophies, []);
    const trophy = bossTrophyForRawDepth(rawDepth);
    if (!trophy || !trophy.id) return null;
    const records = ensureBossTrophyRecords(state);
    const lore = typeof getLoreDepthProgress === 'function' ? getLoreDepthProgress(rawDepth) : null;
    const currentFloor = Math.max(1, Math.floor(numberOr(lore?.floorNumber, Math.ceil(Math.max(1, rawDepth) / Math.max(1, DEPTH_CHAPTERS_PER_FLOOR)), 1, 999999)));
    const currentRoom = Math.max(1, Math.floor(numberOr(lore?.roomWithinFloor, 1, 1, 999999)));
    const currentChapter = Math.max(1, Math.floor(numberOr(lore?.chapterWithinRoom, 1, 1, 999999)));
    const securedDepth = Math.max(
      1,
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(numberOr(state?.player?.returnDepth, 1, 1, 999999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
    const existing = records.find(entry => entry.id === trophy.id || entry.trophyId === trophy.id);
    if (existing) {
      existing.count = Math.max(1, Math.floor(numberOr(existing.count, 1, 1, 9999)) + 1);
      existing.bestKillDepth = Math.max(Math.floor(numberOr(existing.bestKillDepth, 0, 0, 999999)), Math.floor(numberOr(rawDepth, 0, 0, 999999)));
      existing.rawDepth = Math.max(Math.floor(numberOr(existing.rawDepth, 0, 0, 999999)), Math.floor(numberOr(rawDepth, 0, 0, 999999)));
      existing.securedDepth = Math.max(Math.floor(numberOr(existing.securedDepth, 1, 1, 999999)), securedDepth);
      existing.floor = Math.max(Math.floor(numberOr(existing.floor, 1, 1, 999999)), currentFloor);
      existing.room = currentRoom;
      existing.chapter = currentChapter;
      existing.bossName = String(existing.bossName || monsterName || trophy.source || 'Unknown Boss');
      existing.earnedAt = Date.now();
      if (!state.player.bossTrophies.includes(trophy.id)) state.player.bossTrophies.push(trophy.id);
      pushCombat(state, `Trophy Hall: ${existing.trophyName} recorded again from ${monsterName || 'the boss'}.`);
      pushLog(state, `Boss Trophy recorded: ${existing.trophyName} x${existing.count}.`);
      return existing;
    }
    const record = {
      id: trophy.id,
      trophyId: trophy.id,
      trophyName: String(trophy.name || 'Boss Trophy'),
      bossName: String(monsterName || trophy.source || 'Unknown Boss'),
      floor: currentFloor,
      room: currentRoom,
      chapter: currentChapter,
      rawDepth: Math.max(0, Math.floor(numberOr(rawDepth, 0, 0, 999999))),
      securedDepth,
      bestKillDepth: Math.max(0, Math.floor(numberOr(rawDepth, 0, 0, 999999))),
      count: 1,
      tone: String(trophy.tone || 'Trophy'),
      source: String(trophy.source || 'Boss Floor'),
      image: String(trophy.image || 'assets/trophies/hollow_stair_skull_trophy.png'),
      icon: String(trophy.icon || ''),
      earnedAt: Date.now()
    };
    records.push(record);
    state.player.bossTrophyRecords = records.slice(0, 80);
    if (!state.player.bossTrophies.includes(trophy.id)) state.player.bossTrophies.push(trophy.id);
    pushCombat(state, `Trophy Hall: ${record.trophyName} unlocked from ${monsterName || 'the boss'}.`);
    pushLog(state, `Boss Trophy earned: ${record.trophyName}.`);
    return record;
  }

  function famousGearMemoryCounter(value) {
    return Math.floor(numberOr(value, 0, 0, Number.MAX_SAFE_INTEGER));
  }

  function incrementFamousGearMemoryCounter(memory, key, amount) {
    if (!isPlainObject(memory)) return;
    const current = famousGearMemoryCounter(memory[key]);
    const gain = famousGearMemoryCounter(amount);
    memory[key] = Math.min(Number.MAX_SAFE_INTEGER, current + gain);
  }

  function trackEquippedFamousGearMemory(state, increments) {
    const equipment = isPlainObject(state?.player?.equipment) ? state.player.equipment : {};
    const patch = isPlainObject(increments) ? increments : {};
    const keys = ['kills', 'bossKills', 'eliteKills', 'chaptersCleared'].filter(key => famousGearMemoryCounter(patch[key]) > 0);
    if (!keys.length) return;
    const seen = new Set();
    Object.keys(equipment).forEach(slot => {
      const item = equipment[slot];
      if (!isPlainObject(item) || item.kind === 'special' || !isPlainObject(item.gearMemory)) return;
      const seenKey = item.id ? `id:${item.id}` : `slot:${slot}`;
      if (seen.has(seenKey)) return;
      seen.add(seenKey);
      const memory = typeof normalizeGearMemory === 'function'
        ? normalizeGearMemory(item.gearMemory, item)
        : item.gearMemory;
      if (!memory) {
        delete item.gearMemory;
        return;
      }
      keys.forEach(key => incrementFamousGearMemoryCounter(memory, key, patch[key]));
      item.gearMemory = memory;
    });
  }

  function winEncounter(state) {
    ensureRunShell(state);
    const m = state.run.monster;
    if (!m) {
      recoverRunToTown(state, 'Recovered from a cleared encounter with no active threat.');
      return;
    }
    const source = m.tier === 'Boss' ? 'boss' : m.tier === 'Elite' ? 'elite' : 'normal';
    const eliteReward = null;
    const runGoldBonus = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    const debtbrandGoldBonus = hasEquippedSetBonus(state, 'lowfire_debtbrand', 2) ? 7 : 0;
    const eliteContractGoldBonus = source === 'elite' ? Math.round(activeEliteContractRisk(state).coinBonus * 100) : 0;
    const totalGoldBonus = runGoldBonus + debtbrandGoldBonus + eliteContractGoldBonus;
    const earnedGold = sanitizeCurrencyValue(totalGoldBonus > 0 ? Math.max(1, Math.round(m.rewardGold * (1 + totalGoldBonus / 100))) : m.rewardGold, 0);
    addPendingRunGold(state, earnedGold);
    addPendingRunShards(state, m.rewardShard);
    addPendingRunXp(state, m.rewardXp);
    addPendingRunKill(state, 1);
    trackEquippedFamousGearMemory(state, {
      kills: 1,
      bossKills: source === 'boss' ? 1 : 0,
      eliteKills: source === 'elite' ? 1 : 0
    });
    state.run.roomsCleared += 1;
    state.run.chain += 1;
    const victoryLead = source === 'boss' ? 'Boss cleared' : source === 'elite' ? 'Elite defeated' : 'Room secured';
    const rewardLead = source === 'boss' ? 'Boss Spoils' : source === 'elite' ? 'Elite Spoils' : 'Room Reward';
    const victoryVerb = source === 'boss' ? 'cleared' : source === 'elite' ? 'defeated' : 'secured';
    const rewardParts = [`Gold +${formatMoney(earnedGold)}`, `Shards +${m.rewardShard}`, `XP +${format(m.rewardXp)}`];
    pushCombat(state, `${rewardLead}: ${m.name} ${victoryVerb}. Unsecured ${rewardParts.join(' • ')}${runGoldBonus > 0 ? ' (+gold charm)' : ''}${debtbrandGoldBonus > 0 ? ' (+Debtbrand)' : ''}${eliteContractGoldBonus > 0 ? ' (+contract)' : ''}${eliteReward?.modifierCount ? ' (+elite risk)' : ''}.`);
    pushLog(state, `${victoryLead}: ${m.name} at ${runDepthLabel(state)}.`);
    if (source === 'boss') recordBossTrophyUnlock(state, state.run.floor, m.name);
    updateQuest(state, 'kill', 1);

    const lootRolls = source === 'boss' ? 2 : 1;
    let drops = 0;
    for (let i = 0; i < lootRolls; i++) {
      if (!shouldDropLoot(state.run.floor, source, i, state)) continue;
      const loot = shouldDropMythicSetPiece(state, source, state.run.floor)
        ? generateMythicSetPiece(state.run.floor, source, state)
        : generateGear(pick(SLOT_ORDER), threatDepthFromDepth(state.run.floor) + rand(0, 1), { source, depthRaw: state.run.floor, state });
      addPendingRunLoot(state, loot);
      drops += 1;
      const lootLabel = source === 'boss' ? 'Boss Spoils' : source === 'elite' ? 'Elite Spoils' : 'Room Reward loot';
      const lootLine = loot.rarity === 'mythic'
        ? `Mythic Find from ${lootLabel}`
        : lootLabel;
      pushCombat(state, `${lootLine}: ${loot.name} (${loot.rarity}) added to the unsecured haul.`);
      updateQuest(state, 'loot', 1);
    }
    if (source === 'boss') {
      const sink = ensureGoldSinkState(state);
      if (sink.nextBossBounty) {
        const bountyDepth = threatDepthFromDepth(state.run.floor);
        const forcedRarity = bountyDepth >= 50 ? 'legendary' : bountyDepth >= 30 ? 'epic' : 'rare';
        const bounty = generateGear(pick(SLOT_ORDER), bountyDepth + 1, { source:'boss', forcedRarity });
        bounty.name = `Bounty ${bounty.name}`;
        bounty.summary = 'Extra boss relic paid for by a Sootveil bounty writ.';
        bounty.tags = asArray(bounty.tags, []).concat(['bounty-writ']);
        addPendingRunLoot(state, bounty);
        sink.nextBossBounty = false;
        drops += 1;
        pushCombat(state, `Boss Spoils bounty relic: ${bounty.name} (${bounty.rarity}) added to the unsecured haul.`);
        updateQuest(state, 'loot', 1);
      }
    }
    if (!drops && source === 'normal') pushCombat(state, 'No gear found. You pocket the coin and move on.');
    if (!drops && source === 'elite') pushCombat(state, 'Elite Spoils: no gear found. Coin, shards, and XP stay in the unsecured haul.');

    if (source === 'elite' && m.contractTarget && !m.eliteContractCounted) {
      m.eliteContractCounted = true;
      completeEliteContractTarget(state, m);
    }

    const pending = ensurePendingRunRewards(state);
    const hasMeaningfulGear = state.player.inventory.some(item => item && !item.tags?.includes('starter'))
      || pending.loot.some(item => item && !item.tags?.includes('starter'))
      || Object.values(state.player.equipment || {}).some(item => item && !item.tags?.includes('starter'));
    const currentThreatDepth = threatDepthFromDepth(state.run.floor);
    if (currentThreatDepth >= 4 && currentThreatDepth <= 5 && !state.player.earlyAidGiven && !hasMeaningfulGear) {
      const aidSlot = pick(['weapon','offhand','armor','helm','boots','gloves']);
      const aid = generateGear(aidSlot, Math.max(1, currentThreatDepth), { source:'normal', forcedRarity:'common' });
      aid.value = Math.max(aid.value, coins(0, 1, 80));
      aid.tags = asArray(aid.tags, []).concat(['early-aid-cache']);
      addPendingRunLoot(state, aid);
      pushCombat(state, `Room Reward cache: ${aid.name} added to the unsecured haul.`);
      pushLog(state, `A last-resort Lowfire cache produced basic gear: ${aid.name}.`);
      updateQuest(state, 'loot', 1);
    }

    const beforeDepth = depthStageValue(state.run.floor);
    state.run.floor = beforeDepth + 1;
    state.run.zone = zoneName(state.run.floor);
    state.run.danger = dangerRatingForDepth(state.run.floor);
    state.player.depth = Math.max(state.player.depth, state.run.floor);
    if (state.run.floor % 4 === 0) addPendingRunEmber(state, 1);

    const enteredDistrict = districtByDepth(state.run.floor);
    if (isDistrictEntryDepth(state.run.floor, enteredDistrict)) {
      pushCombat(state, `Entering ${enteredDistrict.name}: ${districtArrivalLine(enteredDistrict)}`);
    }
    pushCombat(state, `Descent continues: ${runDepthLabel(state)}.`);
    const milestone = depthMilestoneNotice(state.run.floor);
    if (milestone) pushCombat(state, milestone);
    applyRoomMilestoneReward(state, beforeDepth, state.run.floor);
    applyFloorMilestoneReward(state, beforeDepth, state.run.floor);
    trackEquippedFamousGearMemory(state, { chaptersCleared: 1 });

    nextEncounter(state);
  }


  // v1.4.2 Sootveil Mythic Set: quick dungeon incidents between fights.
  const RUN_EVENT_REGISTRY = [
    {
      id: 'wounded_delver',
      kicker: 'Run Event',
      title: 'Wounded Delver',
      text: 'A collapsed warden grips a cracked lantern and asks for enough coin to reach Lowfire.',
      options: [
        { id:'help', label:'Help them', detail:'Spend a little coin for ember and goodwill.' },
        { id:'search', label:'Search the packs', detail:'Risk a hostile scramble for loose rewards.' },
        { id:'leave', label:'Move on', detail:'No risk. No reward.' }
      ]
    },
    {
      id: 'cursed_shrine',
      kicker: 'Run Event',
      title: 'Cursed Shrine',
      text: 'A black chapel niche exhales warm ash. Something valuable is sealed under the soot.',
      options: [
        { id:'offer', label:'Offer ember', detail:'Trade 1 ember for a stronger unsecured haul.' },
        { id:'touch', label:'Touch the shrine', detail:'Gain shards, but take damage.' },
        { id:'leave', label:'Leave it sealed', detail:'Keep the run moving.' }
      ]
    },
    {
      id: 'gear_cache',
      kicker: 'Run Event',
      title: 'Abandoned Gear Cache',
      text: 'A rusted lockbox sits under a stairwell marker. The seal is old, but not dead.',
      options: [
        { id:'force', label:'Force it open', detail:'Chance at gear. Take a small hit.' },
        { id:'careful', label:'Open carefully', detail:'Take coins and shards safely.' },
        { id:'leave', label:'Leave it', detail:'Avoid delay.' }
      ]
    },
    {
      id: 'ember_storm',
      kicker: 'Run Event',
      title: 'Ember Storm',
      text: 'The corridor fills with furnace sparks. The next steps could buy speed or scars.',
      options: [
        { id:'push', label:'Push through', detail:'Skip ahead, but lose HP.' },
        { id:'harvest', label:'Harvest sparks', detail:'Gain ember and shards.' },
        { id:'wait', label:'Wait it out', detail:'Recover a little HP.' }
      ]
    }
  ];

  function runEventChance(state) {
    const floor = progressDepthValue(state?.run?.floor, 1);
    const base = floor < 3 ? 0.08 : floor < 12 ? 0.15 : 0.20;
    const chainBonus = Math.min(0.08, numberOr(state?.run?.chain, 0, 0, 999) * 0.01);
    return clamp(base + chainBonus, 0.06, 0.28);
  }

  function createRunEvent(state) {
    const depth = progressDepthValue(state?.run?.floor, 1);
    const event = pick(RUN_EVENT_REGISTRY);
    return {
      id: event.id,
      kicker: event.kicker,
      title: event.title,
      text: event.text,
      floor: depth,
      zone: state?.run?.zone || zoneName(depth),
      options: event.options.map(option => ({ ...option }))
    };
  }

  function maybeTriggerRunEvent(state) {
    if (!state?.run?.active || state.run.event) return false;
    const floor = progressDepthValue(state.run.floor, 1);
    if (floor <= 1 || floor % 5 === 0) return false;
    if (Math.random() > runEventChance(state)) return false;
    state.run.event = createRunEvent(state);
    state.run.choices = ['event'];
    pushCombat(state, `Run Event: ${state.run.event.title} interrupts the descent.`);
    return true;
  }

  function applySootveilRunEventSalvage(state, rewards = {}) {
    const result = {
      gold: sanitizeCurrencyValue(rewards.gold, 0),
      shards: sanitizeCurrencyValue(rewards.shards, 0),
      ember: sanitizeCurrencyValue(rewards.ember, 0),
      sootveilBonus: false
    };
    if (!hasEquippedSetBonus(state, 'sootveil_regalia', 3)) return result;

    if (result.gold > 0) {
      const boostedGold = Math.max(result.gold + 1, Math.round(result.gold * 1.15));
      result.sootveilBonus = result.sootveilBonus || boostedGold > result.gold;
      result.gold = boostedGold;
    }
    if (result.ember > 0) {
      const emberBonus = result.ember * 0.15;
      const boostedEmber = result.ember + Math.floor(emberBonus) + (Math.random() < (emberBonus % 1) ? 1 : 0);
      result.sootveilBonus = result.sootveilBonus || boostedEmber > result.ember;
      result.ember = boostedEmber;
    }
    if (result.shards > 0 && Math.random() < 0.22) {
      result.shards += Math.max(1, Math.round(result.shards * 0.08));
      result.sootveilBonus = true;
    }
    return result;
  }

  function grantRunEventSalvage(state, rewards = {}) {
    const result = applySootveilRunEventSalvage(state, rewards);
    if (result.gold) addPendingRunGold(state, result.gold);
    if (result.shards) addPendingRunShards(state, result.shards);
    if (result.ember) addPendingRunEmber(state, result.ember);
    return result;
  }

  function runEventSalvageText(rewards) {
    const parts = [];
    if (rewards.gold) parts.push(`+${formatMoney(rewards.gold)}`);
    if (rewards.ember) parts.push(`+${format(rewards.ember)} ember`);
    if (rewards.shards) parts.push(`+${format(rewards.shards)} shards`);
    return `${parts.join(', ') || 'no salvage'}${rewards.sootveilBonus ? ' (+Sootveil)' : ''}`;
  }

  function resolveRunEvent(state, optionId) {
    ensureRunShell(state);
    const event = state.run.event;
    if (!state.run.active || !event) return { saveNow:false, fullRender:false };
    const choice = String(optionId || 'leave');
    const stats = calcDerived(state);
    const depthThreat = threatDepthFromDepth(state.run.floor);
    const coin = coins(0, rand(1, 3), rand(10, 90)) + depthThreat * rand(2, 7);
    const shard = Math.max(1, Math.round(depthThreat * 1.5 + rand(1, 5)));
    const hit = Math.max(2, Math.round(depthThreat * 1.4 + rand(2, 8) - stats.guard * 0.04));

    if (event.id === 'wounded_delver') {
      if (choice === 'help') {
        const cost = Math.min(state.player.gold || 0, Math.max(coins(0, 1, 0), Math.round(coin * 0.6)));
        state.player.gold = Math.max(0, (state.player.gold || 0) - cost);
        const salvage = grantRunEventSalvage(state, { ember: 1 });
        pushCombat(state, `Event resolved: you help the delver. Spent ${formatMoney(cost)}. Unsecured ${runEventSalvageText(salvage)}.`);
      } else if (choice === 'search') {
        const salvage = grantRunEventSalvage(state, { gold: coin });
        if (Math.random() < 0.45) state.player.hp -= hit;
        pushCombat(state, `Event resolved: you search the packs. Unsecured ${runEventSalvageText(salvage)}${state.player.hp <= 0 ? '' : ' and the stair bites back.'}`);
      } else {
        pushCombat(state, 'Event resolved: you leave the wounded delver behind. The stair stays quiet.');
      }
    } else if (event.id === 'cursed_shrine') {
      if (choice === 'offer' && state.player.ember > 0) {
        state.player.ember -= 1;
        const salvage = grantRunEventSalvage(state, { gold: Math.round(coin * 1.8), shards: shard + 3 });
        pushCombat(state, `Event resolved: ember paid. Unsecured ${runEventSalvageText(salvage)}.`);
      } else if (choice === 'touch' || choice === 'offer') {
        state.player.hp -= hit;
        const salvage = grantRunEventSalvage(state, { shards: shard + 6 });
        pushCombat(state, `Event resolved: the shrine burns your hand. Took ${hit}. Unsecured ${runEventSalvageText(salvage)}.`);
      } else {
        pushCombat(state, 'Event resolved: the cursed shrine remains sealed.');
      }
    } else if (event.id === 'gear_cache') {
      if (choice === 'force') {
        state.player.hp -= Math.max(1, Math.round(hit * 0.7));
        const loot = generateGear(pick(SLOT_ORDER), depthThreat + rand(0, 1), { source:'event', depthRaw: state.run.floor, state });
        loot.tags = asArray(loot.tags, []).concat(['run-event-cache']);
        addPendingRunLoot(state, loot);
        pushCombat(state, `Event resolved: cache forced. Took ${Math.max(1, Math.round(hit * 0.7))}. ${loot.name} added to the unsecured haul.`);
        updateQuest(state, 'loot', 1);
      } else if (choice === 'careful') {
        const salvage = grantRunEventSalvage(state, { gold: coin, shards: shard });
        pushCombat(state, `Event resolved: cache opened carefully. Unsecured ${runEventSalvageText(salvage)}.`);
      } else {
        pushCombat(state, 'Event resolved: you leave the lockbox untouched.');
      }
    } else if (event.id === 'ember_storm') {
      if (choice === 'push') {
        state.player.hp -= hit;
        const beforeDepth = depthStageValue(state.run.floor);
        state.run.floor = beforeDepth + 1;
        state.run.zone = zoneName(state.run.floor);
        state.run.danger = dangerRatingForDepth(state.run.floor);
        state.player.depth = Math.max(state.player.depth, state.run.floor);
        pushCombat(state, `Event resolved: you push through the ember storm. Took ${hit}. Advanced to ${runDepthLabel(state)}.`);
      } else if (choice === 'harvest') {
        const salvage = grantRunEventSalvage(state, { ember: 1, shards: shard + 2 });
        pushCombat(state, `Event resolved: sparks harvested. Unsecured ${runEventSalvageText(salvage)}.`);
      } else {
        const heal = Math.max(2, Math.round(stats.guard * 0.12 + 4));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
        pushCombat(state, `Event resolved: you wait out the storm and recover ${heal} HP.`);
      }
    }

    state.run.event = null;
    state.run.choices = ['attack','guard','skill','extract'];
    if (state.player.hp <= 0) defeat(state, null);
    else nextEncounter(state);
    return { saveNow:true, fullRender:true };
  }

  function updateQuest(state, type, amount) {
    if (state?.run?.active) {
      addPendingQuestProgress(state, type, amount);
      return;
    }
    applyQuestProgressNow(state, type, amount);
  }

  function applyQuestProgressNow(state, type, amount) {
    const progress = sanitizeCurrencyValue(amount, 0);
    if (progress <= 0) return;
    state.player.quests.forEach(q => {
      if (q.type === type && q.progress < q.goal) {
        q.progress = Math.min(q.goal, q.progress + progress);
        if (q.progress >= q.goal) rewardQuest(state, q);
      }
    });
  }

  function rewardQuest(state, q) {
    if (q.claimed) return;
    q.claimed = true;
    if (q.id === 'q1') { addPlayerGold(state, coins(0, 2, 50)); state.player.ember += 1; }
    if (q.id === 'q2') { state.player.forgeSpark += 1; }
    if (q.id === 'q3') { state.player.shards += 80; }
    pushLog(state, `Objective complete: ${q.title}. Reward: ${q.reward}.`);
  }

  function finishRun(state, reason, context = {}) {
    ensureRunShell(state);
    let runResultDetail = '';
    const endedAtFloor = progressDepthValue(state.run.floor, state.player?.returnDepth || 1);
    const endedAtZone = state.run.zone || currentStagingDistrict(state).name;
    const endedRunLabel = runDepthLabel(state);
    const nextReturnDepth = reason === 'extract'
      ? progressDepthValue(endedAtFloor, 1)
      : hardcoreDeathCheckpointDepth(state, endedAtFloor);
    const returnLabel = hardcoreDepthReturnLabel(nextReturnDepth);
    const rewardSnapshot = runHistoryRewardSnapshot(state.run.pendingRewards);
    if (reason === 'extract') {
      const secured = bankPendingRunRewards(state);
      const securedText = cleanDisplayText(secured, 'no unsecured rewards');
      runResultDetail = `Extraction Haul secured: ${securedText}. Safe extraction preserves progress. Next descent can start from ${returnLabel}.`;
      pushCombat(state, `Extraction Haul secured. Banked: ${securedText}.`);
      pushLog(state, `Extraction Haul secured. Banked: ${securedText}. Next start: ${returnLabel}.`);
      showExtractionPopup(`${extractionPopupSummary(rewardSnapshot, securedText)} • Next: ${returnLabel}`);
      recordSafeExtractionProgress(state);
    } else if (reason === 'defeat') {
      const lost = discardPendingRunRewards(state);
      const lostText = cleanDisplayText(lost, 'no unsecured rewards');
      runResultDetail = `Death reset your descent. Lost unsecured rewards: ${lostText}. Normal descent restarts at ${returnLabel}. Deep Stair Charters stay available.`;
      pushLog(state, `Run failed. Lost unsecured rewards: ${lostText}. Death reset your descent; charters can reopen deeper stairs.`);
      showDefeatPopup(`Run ended. Lost unsecured: ${lostText}. Death reset your descent.`);
    } else {
      clearPendingRunRewards(state);
      runResultDetail = 'Descent ended without unsecured rewards.';
    }
    const summaryLine = extractionSummaryLine(state, reason);
    if (summaryLine) pushLog(state, summaryLine);
    const activeHunt = typeof activeEliteContractHunt === 'function' ? activeEliteContractHunt(state) : null;
    if (activeHunt && !activeHunt.completed && !activeHunt.complete) {
      if (reason === 'defeat') {
        if (typeof failActiveEliteContractOnDeath === 'function') failActiveEliteContractOnDeath(state, context.killer || null);
        else failEliteContract(state, 'failed');
      } else if (reason === 'extract') {
        const endedThreatFloor = Math.floor(threatDepthFromDepth(endedAtFloor));
        const targetFloor = Math.floor(numberOr(activeHunt.targetFloor, endedThreatFloor + 1, 1, 999999));
        if (window.DungeonDexEliteContracts?.markEliteContractExtract) window.DungeonDexEliteContracts.markEliteContractExtract(state);
        if (activeHunt.targetSpawned || activeHunt.status === 'active') failEliteContract(state, 'failed');
        else if (endedThreatFloor > targetFloor) failEliteContract(state, 'expired');
      }
    }
    if (reason === 'defeat' && typeof resetDescentProgressOnDeath === 'function') {
      resetDescentProgressOnDeath(state);
    } else {
      state.player.returnDepth = nextReturnDepth;
    }
    if (reason === 'extract') state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth || 1, nextReturnDepth);
    state.run.active = false;
    state.run.monster = null;
    state.run.choices = [];
    state.run.chain = 0;
    state.run.goldBonusPct = 0;
    state.player.debtbrandBoostReady = false;
    state.run.startedFromCharter = false;
    state.run.charterStartFloor = 0;
    state.player.runHistory.unshift({
      floor: endedAtFloor,
      reason,
      zone: endedAtZone,
      runLabel: endedRunLabel,
      detail: runResultDetail,
      summary: summaryLine || '',
      restartDepth: nextReturnDepth,
      restartLabel: returnLabel,
      checkpointLabel: returnLabel,
      rewards: rewardSnapshot.rewards,
      gold: rewardSnapshot.gold,
      shards: rewardSnapshot.shards,
      ember: rewardSnapshot.ember,
      xp: rewardSnapshot.xp,
      kills: rewardSnapshot.kills,
      eliteMarks: rewardSnapshot.eliteMarks,
      lootCount: rewardSnapshot.lootCount,
      questProgress: rewardSnapshot.questProgress,
      lootPreview: rewardSnapshot.lootPreview,
      date: new Date().toLocaleString()
    });
    state.player.runHistory = state.player.runHistory.slice(0, 12);
    state.screen = 'town';
  }

  function defeat(state, killer = null) {
    state.player.hp = Math.round(state.player.maxHp * 0.55);
    pushCombat(state, 'You fell. Death resets the descent. Use a Deep Stair Charter to return deeper.');
    spawnQuestLore(state, `The Lowfire bells rang for a warden lost at ${runDepthLabel(state)} — ${state.run.zone}.`);
    finishRun(state, 'defeat', { killer });
  }

  function equipItem(state, id, silent = false) {
    const idx = state.player.inventory.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = normalizeItem(state.player.inventory[idx]);
    if (!item) return;
    state.player.inventory[idx] = item;
    const conflicts = equipmentConflictSlots(item.slot);
    conflicts.forEach(slot => {
      const prev = state.player.equipment[slot];
      if (prev && prev.id !== item.id) state.player.inventory.push(prev);
      delete state.player.equipment[slot];
    });
    state.player.equipment[item.slot] = item;
    state.player.inventory.splice(idx, 1);
    calcDerived(state);
    if (!silent) {
      pushLog(state, `Equipped ${item.name}.`);
      updateQuest(state, 'equip', 1);
    }
  }

  function sellItem(state, id) {
    const idx = state.player.inventory.findIndex(x => x.id === id);
    if (idx === -1) return 0;
    const item = state.player.inventory[idx];
    const bonusUsed = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
    const paid = sellValueWithGoldSink(state, item, true);
    consumeJunkSaleBonus(state, bonusUsed);
    addPlayerGold(state, paid);
    state.player.inventory.splice(idx, 1);
    pushLog(state, `Sold ${item.name} for ${formatMoney(paid)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return paid;
  }

  function sellAllQuickSafeGear(state) {
    const inventory = asArray(state.player.inventory, []);
    const keep = [];
    let soldCount = 0;
    let paidTotal = 0;
    let bonusUsed = false;
    inventory.forEach(item => {
      if (canQuickSellItem(state, item)) {
        soldCount += 1;
        const useBonus = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
        paidTotal += sellValueWithGoldSink(state, item, useBonus);
        bonusUsed = bonusUsed || useBonus;
      } else {
        keep.push(item);
      }
    });
    if (!soldCount) return { count: 0, paid: 0 };
    consumeJunkSaleBonus(state, bonusUsed);
    state.player.inventory = keep;
    addPlayerGold(state, paidTotal);
    pushLog(state, `Sold ${soldCount} junk-marked gear pieces for ${formatMoney(paidTotal)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return { count: soldCount, paid: paidTotal };
  }

  function sellAllGear(state) {
    const inventory = asArray(state.player.inventory, []);
    const keep = [];
    let soldCount = 0;
    let paidTotal = 0;
    let bonusUsed = false;
    inventory.forEach(item => {
      if (canSellAllGearItem(state, item)) {
        soldCount += 1;
        const useBonus = ensureGoldSinkState(state).junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item);
        paidTotal += sellValueWithGoldSink(state, item, useBonus);
        bonusUsed = bonusUsed || useBonus;
      } else {
        keep.push(item);
      }
    });
    if (!soldCount) return { count: 0, paid: 0 };
    consumeJunkSaleBonus(state, bonusUsed);
    state.player.inventory = keep;
    addPlayerGold(state, paidTotal);
    pushLog(state, `Sold all unequipped sellable gear: ${soldCount} pieces for ${formatMoney(paidTotal)}${bonusUsed ? ' with a Junker bonus' : ''}.`);
    return { count: soldCount, paid: paidTotal };
  }

  function hasNonStarterWeapon(state) {
    const equipped = state.player.equipment && state.player.equipment.weapon;
    const inventoryHit = state.player.inventory.some(item => item && item.slot === 'weapon' && !(item.tags || []).includes('starter'));
    return !!(equipped && !(equipped.tags || []).includes('starter')) || inventoryHit;
  }

  function merchantGear(slot, level, rarity, tag, rawDepth = level) {
    const itemLevel = normalizeItemLevel(level);
    const item = generateGear(slot, itemLevel, { source:'merchant', forcedRarity:rarity, depthRaw:rawDepth });
    item.shopRole = tag || 'stock';
    item.summary = tag === 'core'
      ? 'Core shop stock: practical, affordable, and meant to fill weak equipment slots.'
      : tag === 'upgrade'
      ? 'Featured upgrade: stronger than baseline stock, priced to make the choice matter.'
      : tag === 'rare'
      ? 'Rare shelf item: expensive, uncommon, and not guaranteed to appear.'
      : item.summary;
    return item;
  }

  function buildMerchantStock(state) {
    const rawDepth = Math.max(1, Math.floor(numberOr(state?.player?.depth || state?.player?.level || 1, 1, 1, 999999)));
    const shopThreatDepth = threatDepthFromDepth(rawDepth);
    const stock = [];
    const coreSlots = ['weapon','armor','offhand','boots','gloves','helm'];
    const accessorySlots = ['ring','amulet','cloak','charm'];
    const used = new Set();
    const takeSlot = (pool) => {
      const options = pool.filter(slot => !used.has(slot));
      const slot = pick(options.length ? options : pool);
      used.add(slot);
      return slot;
    };

    // Emergency shop fairness: if the player reaches floor 4 without a real weapon, show one.
    if (rawDepth >= 4 && !hasNonStarterWeapon(state)) {
      stock.push(merchantGear('weapon', shopThreatDepth, 'common', 'core', rawDepth));
      used.add('weapon');
    }

    while (stock.length < 2) stock.push(merchantGear(takeSlot(coreSlots), shopThreatDepth + rand(-1, 0), 'common', 'core', rawDepth));

    stock.push(merchantGear(takeSlot(coreSlots), shopThreatDepth + rand(0, 1), 'uncommon', 'upgrade', rawDepth));

    const flexRarity = Math.random() < 0.7 ? 'common' : 'uncommon';
    stock.push(merchantGear(takeSlot(accessorySlots.concat(coreSlots)), shopThreatDepth + rand(-1, 1), flexRarity, 'stock', rawDepth));

    if (Math.random() < 0.10) stock.push(merchantGear(takeSlot(coreSlots.concat(accessorySlots)), shopThreatDepth + rand(0, 2), 'rare', 'rare', rawDepth));

    return stock.slice(0, 5);
  }


  function findCursedRerollTarget(state) {
    const items = asArray(state.player.inventory, [])
      .filter(item => item && item.kind !== 'special' && item.slot && !item.locked && !item.favorite && !item.protected && !itemIsEquipped(state, item));
    if (!items.length) return null;
    return items.slice().sort((a, b) => (a.rating || 0) - (b.rating || 0) || (a.level || 0) - (b.level || 0))[0];
  }

  function buyDistrictWare(state, id) {
    const ware = unlockedDistrictWares(state).find(entry => entry.id === id);
    if (!ware) return pushLog(state, 'That district ware is not unlocked yet.');
    const blocked = goldSinkCannotBuyReason(state, ware);
    if (blocked) return pushLog(state, `${ware.name}: ${blocked}.`);

    const sink = ensureGoldSinkState(state);
    const paidCost = merchantCostWithSetBonus(state, ware.cost);
    if (state.player.gold < paidCost) return pushLog(state, `Not enough coin for ${ware.name}.`);
    state.player.gold = Math.max(0, state.player.gold - paidCost);
    grantDebtbrandMerchantBoost(state);

    if (ware.id === 'junkers_token') {
      sink.junkSaleBonusCharges = Math.min(3, sink.junkSaleBonusCharges + 1);
      pushLog(state, `Bought ${ware.name}. Your next junk/common sell action pays more.`);
      return;
    }

    if (ware.id === 'small_debt_charm') {
      sink.nextRunGoldBonusPct = 10;
      pushLog(state, `Bought ${ware.name}. Your next descent earns +10% gold.`);
      return;
    }

    if (ware.id === 'black_market_key') {
      const rawDepth = Math.max(1, reachedDistrictFloor(state));
      const shopThreatDepth = threatDepthFromDepth(rawDepth);
      const shelfRarity = rawDepth >= 25 ? 'epic' : 'rare';
      const item = merchantGear(pick(SLOT_ORDER), shopThreatDepth + rand(0, 2), shelfRarity, 'rare', rawDepth);
      item.name = `Black Market ${item.name}`;
      item.value = Math.max(coins(0, 75, 0), Math.round(item.value * 0.82));
      item.summary = 'Unlocked by a Black Market Key. Stronger shelf stock, still priced like a risk.';
      item.tags = asArray(item.tags, []).concat(['black-market']);
      state.merchantStock.unshift(item);
      state.merchantStock = state.merchantStock.slice(0, 6);
      pushLog(state, `Bought ${ware.name}. A shady item was added to the merchant shelf.`);
      return;
    }

    if (ware.id === 'cursed_reroll_token') {
      const target = findCursedRerollTarget(state);
      if (!target) {
        addPlayerGold(state, paidCost);
        return pushLog(state, 'No safe unequipped gear exists to reroll. Purchase refunded.');
      }
      const idx = state.player.inventory.findIndex(item => item && item.id === target.id);
      const nextRarity = Math.random() < 0.2
        ? (RARITIES[Math.min(RARITIES.length - 1, rarityIndex(target.rarity) + 1)]?.key || target.rarity)
        : target.rarity;
      const rawDepth = Math.max(1, reachedDistrictFloor(state));
      const shopThreatDepth = threatDepthFromDepth(rawDepth);
      const rerollLevel = Math.max(Math.floor(numberOr(target.level, 1, 1, 999999)), shopThreatDepth);
      const rerolled = generateGear(target.slot, rerollLevel, { source:'merchant', forcedRarity:nextRarity, depthRaw:rawDepth });
      rerolled.name = `Cursed ${rerolled.name}`;
      rerolled.summary = `Rerolled from ${target.name} by an Ember Debtworks token.`;
      rerolled.tags = asArray(rerolled.tags, []).concat(['cursed-reroll']);
      if (idx >= 0) state.player.inventory.splice(idx, 1, rerolled);
      pushLog(state, `Bought ${ware.name}. ${target.name} became ${rerolled.name}.`);
      return;
    }

    if (ware.id === 'legendary_bounty_writ') {
      sink.nextBossBounty = true;
      pushLog(state, `Bought ${ware.name}. The next boss carries an extra relic.`);
      return;
    }

    if (ware.id === 'golden_coffin') {
      sink.goldenCoffin = true;
      pushLog(state, `Bought ${ware.name}. Defeat insurance is armed.`);
    }
  }

  function buyMerchantItem(state, id) {
    const idx = state.merchantStock.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = state.merchantStock[idx];
    const itemCost = merchantCostWithSetBonus(state, item.value);
    if (state.player.gold < itemCost) return pushLog(state, `Not enough coin for ${item.name}.`);
    state.player.gold = Math.max(0, state.player.gold - itemCost);
    state.player.inventory.unshift(item);
    state.merchantStock.splice(idx, 1);
    grantDebtbrandMerchantBoost(state);
    pushLog(state, `Bought ${item.name}.`);
  }

  function buyMerchantGearUpgrade(state, slot) {
    const model = merchantGearUpgradeModel(state, slot);
    if (!model.item) {
      pushLog(state, `Equip a ${model.slot || 'gear'} piece before asking the merchant for upgrades.`);
      return { ok: false, reason: 'missing_item', slot: model.slot };
    }
    if (model.capped) {
      pushLog(state, `${model.itemName} is already maxed.`);
      return { ok: false, reason: 'maxed', slot: model.slot, level: model.level };
    }
    if (!model.affordable) {
      pushLog(state, `Need ${formatMoney(model.missingCopper)} more copper to upgrade ${model.itemName}.`);
      return { ok: false, reason: 'not_enough_copper', slot: model.slot, missingCopper: model.missingCopper, cost: model.cost };
    }

    const beforeLevel = model.level;
    const afterLevel = beforeLevel + 1;
    state.player.gold = Math.max(0, state.player.gold - model.cost);
    model.item.upgradeLevel = afterLevel;
    calcDerived(state);
    pushLog(state, `Upgraded ${model.itemName} to +${afterLevel} for ${formatMoney(model.cost)}.`);
    return {
      ok: true,
      slot: model.slot,
      itemId: model.item.id || '',
      itemName: model.itemName,
      cost: model.cost,
      beforeLevel,
      afterLevel,
      goldAfter: state.player.gold
    };
  }

  if (typeof window !== 'undefined') {
    window.DungeonDexMerchantGearUpgrades = {
      costs: MERCHANT_GEAR_UPGRADE_COSTS.slice(),
      cap: MERCHANT_GEAR_UPGRADE_CAP,
      normalizeLevel: normalizeMerchantGearUpgradeLevel,
      bonusesForItem: merchantGearUpgradeBonuses,
      statSummary: merchantGearUpgradeStatSummary,
      model: merchantGearUpgradeModel,
      summary: merchantGearUpgradeSummary,
      purchase: buyMerchantGearUpgrade
    };
    window.normalizeMerchantGearUpgradeLevel = normalizeMerchantGearUpgradeLevel;
    window.merchantGearUpgradeModel = merchantGearUpgradeModel;
    window.merchantGearUpgradeSummary = merchantGearUpgradeSummary;
    window.buyMerchantGearUpgrade = buyMerchantGearUpgrade;
  }

  function rollMerchant(state, first = false) {
    if (!first && state.player.gold < state.town.merchantRefreshCost) return pushLog(state, 'Not enough coin to refresh Lowfire stock.');
    if (!first) state.player.gold -= state.town.merchantRefreshCost;
    state.merchantStock = buildMerchantStock(state);
    pushLog(state, 'Lowfire market stock updated.');
  }

  function forgeItem(state) {
    if (state.player.forgeSpark <= 0 || state.player.shards < 40) return pushLog(state, 'Need 1 forge spark and 40 shards.');
    state.player.forgeSpark -= 1;
    state.player.shards -= 40;
    // Forge scaling: use threat-depth item level, not raw chapter depth, to prevent deep-floor forged items from outpacing the monster ladder.
    const crafted = generateGear(pick(SLOT_ORDER), Math.max(1, threatDepthFromDepth(state.player.depth) + rand(1, 2)), { source:'forge', depthRaw:state.player.depth });
    crafted.value += coins(0, 16, 0);
    state.player.inventory.unshift(crafted);
    pushLog(state, `Forged ${crafted.name}.`);
    if (!state.player.discoveredGear.includes(crafted.name)) state.player.discoveredGear.push(crafted.name);
  }

  function restCost(state) {
    // Rest cost display: shared by town UI and rest action so the visible price cannot drift from the charged price.
    const player = state?.player || {};
    const earlyDiscount = player.depth <= 2 ? 35 : 0;
    return Math.max(coins(0, 0, 85), coins(0, 0, 95 + player.level * 42 - earlyDiscount));
  }

  function restPlayer(state) {
    const cost = restCost(state);
    if (state.player.gold < cost) return pushLog(state, `Need ${formatMoney(cost)} to rest.`);
    state.player.gold -= cost;
    calcDerived(state);
    state.player.hp = state.player.maxHp;
    state.player.ember = Math.max(state.player.ember, 2);
    if (window.DungeonDexEliteContracts?.markEliteContractRest) window.DungeonDexEliteContracts.markEliteContractRest(state);
    pushLog(state, `Rested at the Lowfire bunks for ${formatMoney(cost)}. HP restored, 2 ember minimum assured.`);
  }
