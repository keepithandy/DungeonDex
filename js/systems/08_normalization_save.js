'use strict';

// Item/monster/save normalization and persistence
  function normalizeItem(item, fallbackSlot = 'weapon') {
    if (!isPlainObject(item)) return null;
    if (item.kind === 'special') {
      item.id = item.id || makeId('special');
      item.name = String(item.name || 'Special Charter');
      item.rarity = RARITIES.some(r => r.key === item.rarity) ? item.rarity : 'legendary';
      item.slot = item.slot || 'scroll';
      item.level = normalizeItemLevel(item.level);
      item.rating = Math.floor(numberOr(item.rating, item.level, 1, 99999));
      item.value = Math.floor(numberOr(item.value, coins(1, 25, 0), 1, Number.MAX_SAFE_INTEGER));
      item.summary = String(item.summary || 'A rare Lowfire special.');
      return item;
    }
    const fallback = SLOT_ORDER.includes(fallbackSlot) ? fallbackSlot : baseSlotForSlot(fallbackSlot, 'weapon');
    const rawSlot = String(item.slot || fallback).toLowerCase();
    const legacySetSlot = mythicSetSlotFromSlot(item.setSlot || rawSlot);
    const baseSlot = baseSlotForSlot(rawSlot, baseSlotForSlot(fallback, 'weapon'));
    const stats = isPlainObject(item.stats) ? item.stats : {};
    item.id = item.id || makeId('gear');
    item.slot = baseSlot;
    item.rarity = RARITIES.some(r => r.key === item.rarity) ? item.rarity : 'common';
    item.level = normalizeItemLevel(item.level);
    item.rating = Math.floor(numberOr(item.rating, 3, 1, 99999));
    item.value = Math.floor(numberOr(item.value, coins(0, 0, 25), 1, Number.MAX_SAFE_INTEGER));
    item.name = String(item.name || `${BASES[baseSlot][0]} of Lowfire`);
    item.theme = String(item.theme || 'warden');
    item.maker = String(item.maker || 'Lowfire');
    item.summary = String(item.summary || `${item.maker} ${baseSlot} recovered from an older save.`);
    if (item.setId != null) item.setId = String(item.setId);
    if (item.mythicSetId != null && item.setId == null) item.setId = String(item.mythicSetId);
    if (item.setId && !getMythicSetDefinition(item.setId)) delete item.setId;
    if (item.setId || item.mythicSetId || item.setSlot != null || LEGACY_MYTHIC_SET_SLOTS.includes(rawSlot)) item.setSlot = legacySetSlot || mythicSetSlotFromSlot(baseSlot) || '';
    item.tags = asArray(item.tags, []).map(String);
    item.stats = {
      power: Math.floor(numberOr(stats.power, 0, 0, 99999)),
      guard: Math.floor(numberOr(stats.guard, 0, 0, 99999)),
      wit: Math.floor(numberOr(stats.wit, 0, 0, 99999)),
      speed: Math.floor(numberOr(stats.speed, 0, 0, 99999)),
      luck: Math.floor(numberOr(stats.luck, 0, 0, 99999)),
      hp: Math.floor(numberOr(stats.hp, 0, 0, 99999))
    };
    return item;
  }

  function normalizeMonster(monster, floor) {
    if (!isPlainObject(monster)) return null;
    const level = Math.floor(numberOr(monster.level, Math.max(1, floor || 1), 1, 999));
    const maxHp = Math.floor(numberOr(monster.maxHp, Math.max(12, level * 18), 1, 999999));
    const tier = ['Common','Elite','Boss'].includes(monster.tier) ? monster.tier : 'Common';
    const normalizedModifiers = tier === 'Elite'
      ? eliteModifiersForMonster({ tier, modifier:monster.modifier, modifiers:monster.modifiers })
      : [];
    const eliteReward = tier === 'Elite' ? normalizeEliteRewardProfile(monster.eliteReward, normalizedModifiers, level) : null;
    return {
      id: monster.id || makeId('monster'),
      name: String(monster.name || 'Recovered Hollow Threat'),
      family: String(monster.family || 'Husk'),
      type: String(monster.type || 'Stalker'),
      affix: String(monster.affix || 'Ashwake'),
      skill: MONSTER_SKILLS.includes(monster.skill) ? monster.skill : 'Bleed',
      tier,
      modifier: normalizedModifiers[0] || null,
      modifiers: normalizedModifiers,
      eliteReward,
      reviveUsed: !!monster.reviveUsed,
      ashFedTriggered: !!monster.ashFedTriggered,
      eliteContractCounted: !!monster.eliteContractCounted,
      contractTarget: !!monster.contractTarget,
      contractId: String(monster.contractId || ''),
      contractEliteName: String(monster.contractEliteName || ''),
      contractModifierName: String(monster.contractModifierName || ''),
      contractTargetFloor: Math.floor(numberOr(monster.contractTargetFloor, 0, 0, 999999)),
      contractHpMult: numberOr(monster.contractHpMult, 1, 0, 9),
      contractPowerMult: numberOr(monster.contractPowerMult, 1, 0, 9),
      contractRewardMult: numberOr(monster.contractRewardMult, 1, 0, 9),
      level,
      power: Math.floor(numberOr(monster.power, Math.max(8, level * 10), 1, 999999)),
      maxHp,
      hp: Math.floor(numberOr(monster.hp, maxHp, 1, maxHp)),
      guard: Math.floor(numberOr(monster.guard, Math.max(1, level * 3), 0, 999999)),
      speed: Math.floor(numberOr(monster.speed, Math.max(1, level * 2), 0, 999999)),
      rewardGold: Math.floor(numberOr(monster.rewardGold, encounterCoinReward(level, Math.max(8, level * 10), tier, 1), 0, Number.MAX_SAFE_INTEGER)),
      rewardXp: Math.floor(numberOr(monster.rewardXp, Math.max(6, level * 10), 0, 999999)),
      rewardShard: Math.floor(numberOr(monster.rewardShard, tier === 'Boss' ? 22 : tier === 'Elite' ? 7 : 1, 0, 999999)),
      lore: String(monster.lore || 'Recovered from an older save.')
    };
  }

  function normalizeSaveShape(parsed) {
    if (!isPlainObject(parsed) || !isPlainObject(parsed.player)) return createBaseState();

    const base = createBaseState();
    const savedPlayer = parsed.player;
    const state = { ...base, ...parsed };
    state.build = BUILD;
    state.screen = normalizeScreenName(state.screen);
    state.filters = { ...base.filters, ...(isPlainObject(parsed.filters) ? parsed.filters : {}) };
    if (!FUTURE_EQUIPMENT_SLOTS.includes(state.filters.slot) && state.filters.slot !== 'all') state.filters.slot = 'all';
    if (!RARITIES.some(r => r.key === state.filters.rarity) && state.filters.rarity !== 'all') state.filters.rarity = 'all';
    state.filters.search = String(state.filters.search || '');
    if (!INVENTORY_SORTS.includes(state.filters.sort)) state.filters.sort = 'power';

    state.player = { ...base.player, ...savedPlayer };
    state.player.name = String(state.player.name || base.player.name);
    state.player.title = String(state.player.title || base.player.title);
    state.player.level = Math.floor(numberOr(state.player.level, 1, 1, 999));
    state.player.xp = Math.floor(numberOr(state.player.xp, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.xpNext = Math.floor(numberOr(state.player.xpNext, 100, 1, Number.MAX_SAFE_INTEGER));
    state.player.maxHp = Math.floor(numberOr(state.player.maxHp, base.player.maxHp, 1, 999999));
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    state.player.gold = Math.floor(numberOr(state.player.gold, base.player.gold, 0, Number.MAX_SAFE_INTEGER));
    state.player.currencyVersion = Math.floor(numberOr(state.player.currencyVersion, 3, 1, 99));
    state.player.shards = Math.floor(numberOr(state.player.shards, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.ember = Math.floor(numberOr(state.player.ember, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.depth = Math.floor(numberOr(state.player.depth, 0, 0, 999999));
    state.player.safeExtractDepth = Math.floor(numberOr(state.player.safeExtractDepth, 1, 1, 999999));
    state.player.kills = Math.floor(numberOr(state.player.kills, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.crit = numberOr(state.player.crit, base.player.crit, 0, 100);
    state.player.dodge = numberOr(state.player.dodge, base.player.dodge, 0, 100);
    state.player.forgeSpark = Math.floor(numberOr(state.player.forgeSpark, 0, 0, Number.MAX_SAFE_INTEGER));
    state.player.permanentStartFloor = Math.floor(numberOr(state.player.permanentStartFloor, 1, 1, 999999));
    if (state.player.permanentStartFloor >= 40) state.player.safeExtractDepth = Math.max(state.player.safeExtractDepth, state.player.permanentStartFloor);
    // v1.3.26: preserve earned return checkpoints from older saves instead of
    // clamping them to the district table ceiling or permanentStartFloor only.
    state.player.returnDepth = progressDepthValue(state.player.returnDepth, state.player.safeExtractDepth || 1);
    state.player.boughtStart20Scroll = !!state.player.boughtStart20Scroll;
    state.player.debtbrandBoostReady = !!state.player.debtbrandBoostReady;
    state.player.earlyAidGiven = !!state.player.earlyAidGiven;
    state.player.goldSink = createGoldSinkState(isPlainObject(savedPlayer.goldSink) ? savedPlayer.goldSink : {});
    state.player.eliteContracts = createEliteContractState(isPlainObject(savedPlayer.eliteContracts) ? savedPlayer.eliteContracts : {}, state);
    state.player.deepStairCharters = normalizeCharterDepthList(savedPlayer.deepStairCharters);
    if (state.player.permanentStartFloor >= 40) state.player.goldSink.boughtStart40Charter = true;
    ensurePermanentCharters(state);
    state.player.stats = { ...base.player.stats, ...(isPlainObject(savedPlayer.stats) ? savedPlayer.stats : {}) };
    Object.keys(base.player.stats).forEach(k => { state.player.stats[k] = Math.floor(numberOr(state.player.stats[k], base.player.stats[k], 0, 99999)); });

    state.player.inventory = asArray(savedPlayer.inventory, base.player.inventory).map(item => normalizeItem(item)).filter(Boolean);
    const equipment = isPlainObject(savedPlayer.equipment) ? savedPlayer.equipment : {};
    state.player.equipment = {};
    const equipmentLoadSlots = Array.from(new Set([...SLOT_ORDER, ...LEGACY_MYTHIC_SET_SLOTS]));
    equipmentLoadSlots.forEach(slot => {
      const item = normalizeItem(equipment[slot], slot);
      if (!item) return;
      const targetSlot = baseSlotForSlot(item.slot, slot);
      item.slot = targetSlot;
      const equipped = state.player.equipment[targetSlot];
      if (!equipped) {
        state.player.equipment[targetSlot] = item;
        return;
      }
      const keepNew = numberOr(item.rating, 0, 0, 999999) > numberOr(equipped.rating, 0, 0, 999999);
      if (keepNew) {
        state.player.inventory.push(equipped);
        state.player.equipment[targetSlot] = item;
      } else {
        state.player.inventory.push(item);
      }
    });
    state.player.discoveredMonsters = asArray(savedPlayer.discoveredMonsters, []).map(String).slice(0, 200);
    state.player.discoveredGear = asArray(savedPlayer.discoveredGear, []).map(String).slice(0, 200);
    state.player.bossTrophies = asArray(savedPlayer.bossTrophies, []).map(String).slice(0, 80);
    state.player.retiredRelics = asArray(savedPlayer.retiredRelics, []).filter(isPlainObject).slice(0, 80);
    state.player.log = asArray(savedPlayer.log, base.player.log).map(String).slice(0, 60);
    state.player.loreSeen = asArray(savedPlayer.loreSeen, base.player.loreSeen).map(String).slice(0, 80);
    state.player.runHistory = asArray(savedPlayer.runHistory, []).filter(isPlainObject).slice(0, 12);
    const savedQuests = asArray(savedPlayer.quests, []);
    state.player.quests = base.player.quests.map(def => {
      const saved = savedQuests.find(q => q && q.id === def.id) || {};
      return {
        ...def,
        ...saved,
        progress: Math.floor(numberOr(saved.progress, def.progress, 0, def.goal)),
        goal: Math.floor(numberOr(saved.goal, def.goal, 1, 99999)),
        claimed: !!saved.claimed
      };
    });

    state.town = { ...base.town, ...(isPlainObject(parsed.town) ? parsed.town : {}) };
    state.town.merchantRefreshCost = Math.floor(numberOr(state.town.merchantRefreshCost, base.town.merchantRefreshCost, 0, Number.MAX_SAFE_INTEGER));
    state.town.forgeTier = Math.floor(numberOr(state.town.forgeTier, 1, 1, 999));
    state.town.relicFavor = Math.floor(numberOr(state.town.relicFavor, 0, 0, Number.MAX_SAFE_INTEGER));
    state.archive = asArray(parsed.archive, base.archive).filter(isPlainObject).slice(0, 40);
    state.ui = { ...base.ui, ...(isPlainObject(parsed.ui) ? parsed.ui : {}) };
    state.ui.combatLogExpanded = !!state.ui.combatLogExpanded;

    state.run = { ...base.run, ...(isPlainObject(parsed.run) ? parsed.run : {}) };
    state.run.active = !!state.run.active;
    state.run.floor = state.run.active
      ? progressDepthValue(state.run.floor, defaultRunStartDepth(state))
      : Math.floor(numberOr(state.run.floor, 0, 0, 999999));
    state.run.chain = Math.floor(numberOr(state.run.chain, 0, 0, 99999));
    state.run.danger = dangerRatingForDepth(Math.max(1, state.run.floor || 1));
    state.run.zone = String(state.run.zone || zoneName(Math.max(1, state.run.floor || 1)));
    state.run.roomsCleared = Math.floor(numberOr(state.run.roomsCleared, 0, 0, 99999));
    state.run.encounters = Math.floor(numberOr(state.run.encounters, 0, 0, 99999));
    state.run.goldBonusPct = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    state.run.pendingRewards = state.run.active ? createPendingRunRewards(state.run.pendingRewards) : createPendingRunRewards();
    state.run.startedFromCharter = !!state.run.startedFromCharter;
    state.run.charterStartFloor = Math.floor(numberOr(state.run.charterStartFloor, 0, 0, 999999));
    ensureRunSetBonusState(state);
    if (!state.run.active) { state.run.startedFromCharter = false; state.run.charterStartFloor = 0; state.run.setBonuses = { ashboundLethalUsed:false, bellforgeHits:0, sootveilEscapeUsed:false, sootveilGuard:0 }; clearPendingRunRewards(state); }
    state.run.choices = asArray(state.run.choices, CORE_COMBAT_ACTIONS).filter(x => CORE_COMBAT_ACTIONS.includes(x));
    state.run.combatLog = asArray(state.run.combatLog, base.run.combatLog).map(String).slice(0, COMBAT_LOG_STORE_LIMIT);
    state.run.monster = state.run.active ? normalizeMonster(state.run.monster, state.run.floor) : null;
    if (state.run.active && !state.run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete combat save and returned to Lowfire.');
    }
    if (state.run.active && state.run.monster) state.screen = 'run';

    state.merchantStock = asArray(parsed.merchantStock, []).map(item => normalizeItem(item)).filter(item => item && item.specialType !== 'start20');
    if (!state.merchantStock.length) state.merchantStock = buildMerchantStock(state);

    calcDerived(state);
    return state;
  }

  function sanitizeLiveStateForSave(state) {
    if (!isPlainObject(state) || !isPlainObject(state.player)) return false;
    state.build = BUILD;
    state.screen = normalizeScreenName(state.screen);
    state.player.maxHp = Math.floor(numberOr(state.player.maxHp, 100, 1, 999999));
    state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
    state.player.gold = sanitizeCurrencyValue(state.player.gold, 0);
    state.player.shards = sanitizeCurrencyValue(state.player.shards, 0);
    state.player.ember = sanitizeCurrencyValue(state.player.ember, 0);
    state.player.forgeSpark = sanitizeCurrencyValue(state.player.forgeSpark, 0);
    state.player.log = asArray(state.player.log, []).map(String).slice(0, 60);
    state.player.eliteContracts = createEliteContractState(isPlainObject(state.player.eliteContracts) ? state.player.eliteContracts : {}, state);
    if (!isPlainObject(state.run)) state.run = {};
    ensureRunShell(state);
    state.run.active = !!state.run.active;
    state.run.floor = state.run.active
      ? progressDepthValue(state.run.floor, defaultRunStartDepth(state))
      : Math.floor(numberOr(state.run.floor, 0, 0, 999999));
    state.run.goldBonusPct = Math.floor(numberOr(state.run.goldBonusPct, 0, 0, 50));
    state.run.pendingRewards = state.run.active ? createPendingRunRewards(state.run.pendingRewards) : createPendingRunRewards();
    ensureRunSetBonusState(state);
    state.run.combatLog = asArray(state.run.combatLog, []).map(String).slice(0, COMBAT_LOG_STORE_LIMIT);
    state.run.choices = asArray(state.run.choices, []).filter(x => CORE_COMBAT_ACTIONS.includes(x));
    if (state.run.active && !state.run.choices.length) state.run.choices = CORE_COMBAT_ACTIONS.slice();
    if (state.run.active && !state.run.monster) {
      recoverRunToTown(state, 'Recovered from an incomplete combat state before saving and returned to Lowfire.');
    }
    return true;
  }

  function save(state) {
    try {
      if (!sanitizeLiveStateForSave(state)) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('DungeonDex save skipped. Progress may not persist this session.');
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createBaseState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return createBaseState();
      parsed.build = BUILD;
      if (!parsed.archive) parsed.archive = [];
      if (!isPlainObject(parsed.player)) return createBaseState();
      if (parsed.player.permanentStartFloor == null) parsed.player.permanentStartFloor = 1;
      if (parsed.player.boughtStart20Scroll == null) parsed.player.boughtStart20Scroll = false;
      if ((parsed.player.currencyVersion || 1) < 2) {
        parsed.player.gold = toCopper(parsed.player.gold || 0);
        if (parsed.town && parsed.town.merchantRefreshCost != null) parsed.town.merchantRefreshCost = toCopper(parsed.town.merchantRefreshCost);
        if (Array.isArray(parsed.player.inventory)) parsed.player.inventory.forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
        if (isPlainObject(parsed.player.equipment)) Object.values(parsed.player.equipment).forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
        if (Array.isArray(parsed.merchantStock)) parsed.merchantStock.forEach(item => { if (isPlainObject(item)) item.value = toCopper(item.value || 0); });
      }
      if ((parsed.player.currencyVersion || 1) < 3) {
        parsed.player.gold = Math.min(Math.max(0, Math.floor(parsed.player.gold || 0)), coins(2, 0, 0));
        parsed.player.currencyVersion = 3;
        if (parsed.town) parsed.town.merchantRefreshCost = coins(0, 1, 50);
        const normalizeItem = (item) => {
          if (!item) return;
          if (!Number.isFinite(item.value) || item.value <= 0) item.value = coins(0, 0, 25);
          if (item.value > coins(4, 0, 0)) item.value = Math.max(coins(0, 0, 25), Math.round(item.value / COPPER_PER_GOLD * 100));
        };
        if (Array.isArray(parsed.player.inventory)) parsed.player.inventory.forEach(normalizeItem);
        if (isPlainObject(parsed.player.equipment)) Object.values(parsed.player.equipment).forEach(normalizeItem);
        if (Array.isArray(parsed.merchantStock)) parsed.merchantStock.forEach(normalizeItem);
      }
      if (parsed.player.earlyAidGiven == null) parsed.player.earlyAidGiven = false;
      return normalizeSaveShape(parsed);
    } catch (err) {
      console.warn('DungeonDex save recovery used a fresh state.');
      return createBaseState();
    }
  }
