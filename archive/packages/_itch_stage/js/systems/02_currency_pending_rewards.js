'use strict';

// Currency conversion, pending rewards, discovery banking, reward text helpers
  const COPPER_PER_SILVER = 100;
  const SILVER_PER_GOLD = 100;
  const COPPER_PER_GOLD = COPPER_PER_SILVER * SILVER_PER_GOLD;
  const toCopper = (goldUnits) => Math.max(0, Math.round((Number(goldUnits) || 0) * COPPER_PER_GOLD));
  const coins = (gold = 0, silver = 0, copper = 0) => Math.max(0, Math.round((Number(gold) || 0) * COPPER_PER_GOLD + (Number(silver) || 0) * COPPER_PER_SILVER + (Number(copper) || 0)));

  function sanitizeCurrencyValue(value, fallback = 0) {
    return Math.floor(numberOr(value, fallback, 0, Number.MAX_SAFE_INTEGER));
  }

  function addPlayerGold(state, amount) {
    if (!state?.player) return false;
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const current = sanitizeCurrencyValue(state.player.gold, 0);
    state.player.gold = Math.min(Number.MAX_SAFE_INTEGER, current + reward);
    return true;
  }

  function createPendingRunRewards(seed = {}) {
    const source = isPlainObject(seed) ? seed : {};
    const questProgress = {};
    const savedQuestProgress = isPlainObject(source.questProgress) ? source.questProgress : {};
    Object.entries(savedQuestProgress).forEach(([key, value]) => {
      const amount = Math.floor(numberOr(value, 0, 0, 999999));
      if (amount > 0) questProgress[String(key)] = amount;
    });
    return {
      gold: sanitizeCurrencyValue(source.gold, 0),
      shards: sanitizeCurrencyValue(source.shards, 0),
      ember: sanitizeCurrencyValue(source.ember, 0),
      xp: sanitizeCurrencyValue(source.xp, 0),
      kills: sanitizeCurrencyValue(source.kills, 0),
      eliteContractKills: sanitizeCurrencyValue(source.eliteContractKills, 0),
      loot: asArray(source.loot, []).map(item => normalizeItem(item)).filter(Boolean).slice(0, 80),
      discoveredGear: asArray(source.discoveredGear, []).map(String).filter(Boolean).slice(0, 160),
      questProgress
    };
  }

  function ensurePendingRunRewards(state) {
    if (!state.run) state.run = {};
    state.run.pendingRewards = createPendingRunRewards(state.run.pendingRewards);
    return state.run.pendingRewards;
  }

  function clearPendingRunRewards(state) {
    if (!state.run) state.run = {};
    state.run.pendingRewards = createPendingRunRewards();
  }

  function hasPendingRunRewards(pending) {
    const p = createPendingRunRewards(pending);
    return !!(p.gold || p.shards || p.ember || p.xp || p.kills || p.eliteContractKills || p.loot.length || Object.keys(p.questProgress).length);
  }

  function pendingRunRewardSummary(pending) {
    const p = createPendingRunRewards(pending);
    const parts = [];
    if (p.gold) parts.push(`Gold ${formatMoney(p.gold)}`);
    if (p.shards) parts.push(`Shards ${format(p.shards)}`);
    if (p.ember) parts.push(`Ember ${format(p.ember)}`);
    if (p.xp) parts.push(`XP ${format(p.xp)}`);
    if (p.loot.length) parts.push(`Loot ${format(p.loot.length)}`);
    return parts.length ? parts.join(' • ') : 'no unsecured rewards';
  }

  function addPendingRunGold(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.gold = Math.min(Number.MAX_SAFE_INTEGER, pending.gold + reward);
    return true;
  }

  function addPendingRunShards(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.shards = Math.min(Number.MAX_SAFE_INTEGER, pending.shards + reward);
    return true;
  }

  function addPendingRunEmber(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.ember = Math.min(Number.MAX_SAFE_INTEGER, pending.ember + reward);
    return true;
  }

  function addPendingRunXp(state, amount) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.xp = Math.min(Number.MAX_SAFE_INTEGER, pending.xp + reward);
    return true;
  }

  function addPendingRunKill(state, amount = 1) {
    const reward = sanitizeCurrencyValue(amount, 0);
    if (reward <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.kills = Math.min(Number.MAX_SAFE_INTEGER, pending.kills + reward);
    return true;
  }

  function addPendingRunLoot(state, item) {
    const normalized = normalizeItem(item);
    if (!normalized) return false;
    const pending = ensurePendingRunRewards(state);
    pending.loot.unshift(normalized);
    pending.loot = pending.loot.slice(0, 80);
    addPendingGearDiscovery(state, normalized.name);
    return true;
  }

  function addPendingGearDiscovery(state, name) {
    const clean = String(name || '').trim();
    if (!clean) return false;
    const pending = ensurePendingRunRewards(state);
    if (!pending.discoveredGear.includes(clean)) pending.discoveredGear.unshift(clean);
    pending.discoveredGear = pending.discoveredGear.slice(0, 160);
    return true;
  }

  function addPendingQuestProgress(state, type, amount = 1) {
    const key = String(type || '').trim();
    const progress = sanitizeCurrencyValue(amount, 0);
    if (!key || progress <= 0) return false;
    const pending = ensurePendingRunRewards(state);
    pending.questProgress[key] = Math.min(999999, Math.floor(numberOr(pending.questProgress[key], 0, 0, 999999)) + progress);
    return true;
  }

  function addPendingEliteContractKill(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete) return false;
    const contract = eliteContractDef(active.id);
    if (!contract) return false;
    const pending = ensurePendingRunRewards(state);
    pending.eliteContractKills = Math.min(999999, pending.eliteContractKills + 1);
    const projected = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)) + pending.eliteContractKills);
    pushCombat(state, projected >= contract.goal
      ? 'Elite contract mark ready. Extract to bank the progress.'
      : `Elite contract mark: ${projected} / ${contract.goal}. Extract to bank progress.`);
    return true;
  }

  function bankGearDiscovery(state, name) {
    const clean = String(name || '').trim();
    if (!clean || !state?.player) return false;
    if (!state.player.discoveredGear.includes(clean)) state.player.discoveredGear.push(clean);
    return true;
  }

  function bankPendingRunRewards(state) {
    const pending = ensurePendingRunRewards(state);
    const summary = pendingRunRewardSummary(pending);
    if (pending.gold) addPlayerGold(state, pending.gold);
    if (pending.shards) state.player.shards = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.shards, 0) + pending.shards);
    if (pending.ember) state.player.ember = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.ember, 0) + pending.ember);
    if (pending.xp) xpGain(state, pending.xp);
    if (pending.kills) state.player.kills = Math.min(Number.MAX_SAFE_INTEGER, sanitizeCurrencyValue(state.player.kills, 0) + pending.kills);

    pending.loot.slice().reverse().forEach(item => {
      const normalized = normalizeItem(item);
      if (!normalized) return;
      if (asArray(normalized.tags, []).includes('early-aid-cache')) state.player.earlyAidGiven = true;
      state.player.inventory.unshift(normalized);
      bankGearDiscovery(state, normalized.name);
    });
    pending.discoveredGear.forEach(name => bankGearDiscovery(state, name));
    Object.entries(pending.questProgress).forEach(([type, amount]) => applyQuestProgressNow(state, type, amount));
    for (let i = 0; i < pending.eliteContractKills; i++) recordEliteContractKill(state, { bank:true });
    clearPendingRunRewards(state);
    return summary;
  }

  function discardPendingRunRewards(state) {
    const pending = ensurePendingRunRewards(state);
    const summary = pendingRunRewardSummary(pending);
    clearPendingRunRewards(state);
    return summary;
  }

  function formatMoney(copper) {
    copper = Math.max(0, Math.floor(Number(copper) || 0));
    const gold = Math.floor(copper / COPPER_PER_GOLD);
    copper %= COPPER_PER_GOLD;
    const silver = Math.floor(copper / COPPER_PER_SILVER);
    const coin = copper % COPPER_PER_SILVER;
    const parts = [];
    if (gold) parts.push(`<span class="money-part coin-gold">${gold}g</span>`);
    if (silver) parts.push(`<span class="money-part coin-silver">${silver}s</span>`);
    if (coin || !parts.length) parts.push(`<span class="money-part coin-copper">${coin}c</span>`);
    return `<span class="money money-wow">${parts.join(' ')}</span>`;
  }
