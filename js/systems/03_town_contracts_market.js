'use strict';

// Gold sinks, elite contracts, district wares, selling helpers
  const GOLD_SINK_DEFAULTS = {
    junkSaleBonusCharges: 0,
    nextRunGoldBonusPct: 0,
    nextBossBounty: false,
    goldenCoffin: false,
    boughtStart40Charter: false
  };

  const ELITE_CONTRACT_RISK_DEFAULTS = {
    level: 'Standard',
    label: 'Standard risk',
    spawnBonus: 0,
    hpBonus: 0,
    damageBonus: 0,
    coinBonus: 0
  };

  const ELITE_CONTRACTS = [
    {
      id:'lowfire_bounty',
      name:'Lowfire Bounty',
      tier:'Tier I',
      goal:3,
      reward:coins(25,0,0),
      maxReward:coins(75,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:1,
      risk:{ level:'Low', label:'Low risk', spawnBonus:0.03, hpBonus:0.04, damageBonus:0.03, coinBonus:0.03 },
      summary:'Defeat 3 elite enemies for a cautious Lowfire payout.'
    },
    {
      id:'hazard_contract',
      name:'Hazard Contract',
      tier:'Tier II',
      goal:6,
      reward:coins(60,0,0),
      maxReward:coins(160,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:1,
      risk:{ level:'Medium', label:'Medium risk', spawnBonus:0.05, hpBonus:0.08, damageBonus:0.05, coinBonus:0.05 },
      summary:'Defeat 6 elite enemies under a modest hazard clause.'
    },
    {
      id:'blood_stamped_order',
      name:'Blood-Stamped Order',
      tier:'Tier III',
      goal:10,
      reward:coins(125,0,0),
      maxReward:coins(325,0,0),
      floorBonusPerDepth:coins(0,75,0),
      requiresClaimed:null,
      unlockFloor:11,
      risk:{ level:'High', label:'High risk', spawnBonus:0.08, hpBonus:0.12, damageBonus:0.08, coinBonus:0.08 },
      summary:'Defeat 10 elite enemies on a deeper, blood-stamped writ.'
    }
  ];

  const ELITE_CONTRACT_ID_ALIASES = {
    elite_hunter_i: 'lowfire_bounty',
    elite_hunter_ii: 'hazard_contract',
    dangerous_work: 'blood_stamped_order'
  };

  const DISTRICT_MARKET_WARES = [
    { id:'junkers_token', districtId:'lowfire', unlockFloor:1, name:"Junker's Token", rarity:'common', cost:coins(0,18,0), effect:'Next junk/common sell action pays +15%.', summary:'A cheap Lowfire marker for squeezing a little more coin out of junk piles.' },
    { id:'small_debt_charm', districtId:'lowfire', unlockFloor:1, name:'Small Debt Charm', rarity:'uncommon', cost:coins(0,25,0), effect:'+10% gold during your next descent.', summary:'A minor charm that makes the next descent pay slightly better.' },
    { id:'black_market_key', districtId:'ashgate', unlockFloor:11, name:'Black Market Key', rarity:'rare', cost:coins(0,55,0), effect:'Adds one shady rare shelf item to the merchant.', summary:'Opens a side drawer in Ashgate stock. The item still has to be bought.' },
    { id:'cursed_reroll_token', districtId:'ember-debtworks', unlockFloor:21, name:'Cursed Reroll Token', rarity:'epic', cost:coins(0,85,0), effect:'Rerolls one weak unequipped item.', summary:'The Debtworks will remake a bad relic. It chooses the weakest safe target.' },
    { id:'legendary_bounty_writ', districtId:'sootveil', unlockFloor:31, name:'Legendary Bounty Writ', rarity:'legendary', cost:coins(1,25,0), effect:'Next boss drops one extra better relic.', summary:'Raises the reward on the next boss without changing normal shop gear.' },
    { id:'golden_coffin', districtId:'blacktithe', unlockFloor:51, name:'Golden Coffin', rarity:'mythic', cost:coins(2,75,0), effect:'Arms a Blacktithe defeat-insurance marker.', summary:'A luxury box kept ready for the next failed descent.' }
  ];

  function createGoldSinkState(seed = {}) {
    return {
      junkSaleBonusCharges: Math.floor(numberOr(seed.junkSaleBonusCharges, GOLD_SINK_DEFAULTS.junkSaleBonusCharges, 0, 3)),
      nextRunGoldBonusPct: Math.floor(numberOr(seed.nextRunGoldBonusPct, GOLD_SINK_DEFAULTS.nextRunGoldBonusPct, 0, 50)),
      nextBossBounty: !!seed.nextBossBounty,
      goldenCoffin: !!seed.goldenCoffin,
      boughtStart40Charter: !!seed.boughtStart40Charter
    };
  }

  function ensureGoldSinkState(state) {
    if (!state.player) state.player = {};
    state.player.goldSink = createGoldSinkState(isPlainObject(state.player.goldSink) ? state.player.goldSink : {});
    return state.player.goldSink;
  }

  function eliteContractDef(id) {
    return ELITE_CONTRACTS.find(contract => contract.id === id) || null;
  }

  function normalizeEliteContractId(id) {
    const raw = String(id || '');
    const normalized = ELITE_CONTRACT_ID_ALIASES[raw] || raw;
    return eliteContractDef(normalized) ? normalized : '';
  }

  function eliteContractRisk(contract) {
    return { ...ELITE_CONTRACT_RISK_DEFAULTS, ...(isPlainObject(contract?.risk) ? contract.risk : {}) };
  }

  function eliteContractRiskLevel(contract) {
    const risk = eliteContractRisk(contract);
    return String(risk.level || risk.label || 'Standard').replace(/\s*risk$/i, '') || 'Standard';
  }

  function eliteContractObjective(contract) {
    const goal = Math.max(1, Math.floor(numberOr(contract?.goal, 1, 1, 999)));
    return `Defeat ${goal} elite enemies`;
  }

  function contractBaseReward(contract) {
    if (!contract) return 0;
    const base = contract.baseReward ?? contract.reward;
    return Math.max(0, Math.floor(numberOr(base, 0, 0, Number.MAX_SAFE_INTEGER)));
  }

  function contractRewardCap(contract) {
    const base = contractBaseReward(contract);
    return Math.max(base, Math.floor(numberOr(contract?.maxReward, base, base, Number.MAX_SAFE_INTEGER)));
  }

  function isValidRewardNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function sanitizeContractReward(contract, value) {
    const base = contractBaseReward(contract);
    const cap = contractRewardCap(contract);
    if (!isValidRewardNumber(value)) return base;
    return clamp(Math.floor(value), 0, cap);
  }

  function contractRewardDepth(state) {
    return Math.max(1,
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
  }

  function calculateContractReward(contract, state = null) {
    if (!contract) return 0;
    const base = contractBaseReward(contract);
    const floorBonus = Math.floor(numberOr(contract.floorBonusPerDepth, 0, 0, Number.MAX_SAFE_INTEGER)) * contractRewardDepth(state);
    return sanitizeContractReward(contract, base + floorBonus);
  }

  function activeContractRewardAmount(active, contract, state = null) {
    if (!active || !contract) return 0;
    if (!Object.prototype.hasOwnProperty.call(active, 'rewardAmount') || active.rewardAmount == null) {
      active.rewardAmount = calculateContractReward(contract, state);
    } else {
      active.rewardAmount = sanitizeContractReward(contract, active.rewardAmount);
    }
    return active.rewardAmount;
  }

  function activeEliteContractDef(state) {
    const active = state?.player?.eliteContracts?.active;
    if (!active) return null;
    return eliteContractDef(active.id);
  }

  function activeEliteContractRisk(state) {
    const contract = activeEliteContractDef(state);
    return contract ? eliteContractRisk(contract) : { ...ELITE_CONTRACT_RISK_DEFAULTS };
  }

  function activeEliteContractRiskText(contract) {
    const risk = eliteContractRisk(contract);
    const parts = [
      `+${Math.round(risk.spawnBonus * 100)}% elite spawn`,
      `+${Math.round(risk.hpBonus * 100)}% elite HP`,
      `+${Math.round(risk.damageBonus * 100)}% elite damage`,
      `+${Math.round(risk.coinBonus * 100)}% elite coins`
    ];
    return `${risk.label}: ${parts.join(', ')} while active.`;
  }

  function normalizeEliteContractIds(value) {
    const ids = new Set();
    asArray(value, []).forEach(id => {
      const normalized = normalizeEliteContractId(id);
      if (normalized) ids.add(normalized);
    });
    return Array.from(ids);
  }

  function createEliteContractState(seed = {}, state = null) {
    const source = isPlainObject(seed) ? seed : {};
    const claimed = normalizeEliteContractIds(source.claimed);
    const completedSet = new Set([...normalizeEliteContractIds(source.completed), ...claimed]);
    const savedActive = isPlainObject(source.active) ? source.active : null;
    let active = null;

    if (savedActive) {
      const def = eliteContractDef(normalizeEliteContractId(savedActive.id));
      if (def && !claimed.includes(def.id)) {
        const progress = Math.floor(numberOr(savedActive.progress, 0, 0, def.goal));
        const complete = !!savedActive.complete || progress >= def.goal || completedSet.has(def.id);
        const alreadyClaimed = !!savedActive.claimed;
        const rewardAmount = Object.prototype.hasOwnProperty.call(savedActive, 'rewardAmount') && savedActive.rewardAmount != null
          ? sanitizeContractReward(def, savedActive.rewardAmount)
          : calculateContractReward(def, state);
        if (alreadyClaimed) {
          completedSet.add(def.id);
          if (!claimed.includes(def.id)) claimed.push(def.id);
        } else {
          active = {
            id: def.id,
            name: def.name,
            tier: def.tier || '',
            progress: complete ? def.goal : progress,
            goal: def.goal,
            rewardAmount,
            complete,
            claimable: complete,
            claimed: false
          };
          if (complete) completedSet.add(def.id);
        }
      }
    }

    return {
      active,
      completed: Array.from(completedSet),
      claimed
    };
  }

  function ensureEliteContractState(state) {
    if (!state.player) state.player = {};
    state.player.eliteContracts = createEliteContractState(state.player.eliteContracts, state);
    return state.player.eliteContracts;
  }

  function isEliteContractAvailable(contract, contracts, state = null) {
    if (!contract || contracts.claimed.includes(contract.id)) return false;
    if (contract.unlockFloor && state && reachedDistrictFloor(state) < contract.unlockFloor) return false;
    return !contract.requiresClaimed || contracts.claimed.includes(contract.requiresClaimed);
  }

  function availableEliteContracts(state) {
    const contracts = ensureEliteContractState(state);
    if (contracts.active) return [];
    return ELITE_CONTRACTS.filter(contract => isEliteContractAvailable(contract, contracts, state));
  }

  function startEliteContract(state, id) {
    const contracts = ensureEliteContractState(state);
    const contract = eliteContractDef(id);
    if (contracts.active || !isEliteContractAvailable(contract, contracts, state)) return false;
    contracts.active = {
      id: contract.id,
      name: contract.name,
      tier: contract.tier || '',
      progress: 0,
      goal: contract.goal,
      rewardAmount: calculateContractReward(contract, state),
      complete: false,
      claimable: false,
      claimed: false
    };
    pushLog(state, `Elite contract accepted: ${contract.name}. Risk active until claimed.`);
    return true;
  }

  function recordEliteContractKill(state, options = {}) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete) return false;

    const contract = eliteContractDef(active.id);
    if (!contract) {
      contracts.active = null;
      return false;
    }

    if (state?.run?.active && !options.bank) return addPendingEliteContractKill(state);

    active.goal = contract.goal;
    active.name = contract.name;
    active.tier = contract.tier || '';
    active.rewardAmount = activeContractRewardAmount(active, contract, state);
    active.progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)) + 1);
    if (active.progress >= contract.goal) {
      active.complete = true;
      active.claimable = true;
      if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
      pushCombat(state, `Elite contract complete. Return to Lowfire to claim ${formatMoney(active.rewardAmount)}.`);
    } else {
      pushCombat(state, `Elite contract: ${active.progress} / ${contract.goal} elites defeated.`);
    }
    return true;
  }

  function claimEliteContract(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.claimed || (!active.complete && !active.claimable)) return false;

    const contract = eliteContractDef(active.id);
    if (!contract) {
      contracts.active = null;
      return false;
    }

    const rewardAmount = activeContractRewardAmount(active, contract, state);
    if (!isValidRewardNumber(rewardAmount) || rewardAmount <= 0) return false;
    active.claimed = true;
    if (!addPlayerGold(state, rewardAmount)) return false;
    if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
    if (!contracts.claimed.includes(contract.id)) contracts.claimed.push(contract.id);
    contracts.active = null;
    pushLog(state, `Payment claimed: ${contract.name} paid ${stripHtml(formatMoney(rewardAmount))}.`);
    return true;
  }

  function reachedDistrictFloor(state) {
    return Math.max(1,
      Math.floor(numberOr(state?.player?.depth, 0, 0, 999)),
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999))
    );
  }

  function districtForWare(ware) {
    return DISTRICT_DATA.find(d => d.id === ware.districtId) || districtByDepth(ware.unlockFloor);
  }

  function unlockedDistrictWares(state) {
    const reached = reachedDistrictFloor(state);
    return DISTRICT_MARKET_WARES.filter(ware => reached >= ware.unlockFloor);
  }

  function goldSinkStatus(state, ware) {
    const sink = ensureGoldSinkState(state);
    if (ware.id === 'junkers_token' && sink.junkSaleBonusCharges > 0) return `${sink.junkSaleBonusCharges}/3 ready`;
    if (ware.id === 'small_debt_charm' && sink.nextRunGoldBonusPct > 0) return 'next descent ready';
    if (ware.id === 'legendary_bounty_writ' && sink.nextBossBounty) return 'bounty active';
    if (ware.id === 'golden_coffin' && sink.goldenCoffin) return 'armed';
    return '';
  }

  function goldSinkCannotBuyReason(state, ware) {
    const sink = ensureGoldSinkState(state);
    if (state.player.gold < merchantCostWithSetBonus(state, ware.cost)) return 'not enough gold';
    if (ware.id === 'junkers_token' && sink.junkSaleBonusCharges >= 3) return 'token limit reached';
    if (ware.id === 'small_debt_charm' && sink.nextRunGoldBonusPct > 0) return 'already prepared';
    if (ware.id === 'legendary_bounty_writ' && sink.nextBossBounty) return 'bounty already active';
    if (ware.id === 'golden_coffin' && sink.goldenCoffin) return 'already armed';
    if (ware.id === 'cursed_reroll_token' && !findCursedRerollTarget(state)) return 'needs unequipped gear';
    return '';
  }

  function activeGoldSinkPills(state) {
    const sink = ensureGoldSinkState(state);
    const pills = [];
    if (sink.junkSaleBonusCharges > 0) pills.push(`Junk bonus x${sink.junkSaleBonusCharges}`);
    if (sink.nextRunGoldBonusPct > 0) pills.push(`Next descent +${sink.nextRunGoldBonusPct}% gold`);
    if (state.run?.active && state.run.goldBonusPct > 0) pills.push(`Descent gold +${state.run.goldBonusPct}%`);
    if (sink.nextBossBounty) pills.push('Boss bounty armed');
    if (sink.goldenCoffin) pills.push('Golden Coffin armed');
    return pills;
  }

  function sellValue(item) {
    const base = Math.max(1, Math.floor(Number(item && item.value) || 0));
    return Math.max(1, Math.floor(base * 0.22));
  }

  function itemIsEquipped(state, item) {
    if (!item || !state.player || !state.player.equipment) return false;
    return Object.values(state.player.equipment).some(equipped => equipped && (equipped === item || equipped.id === item.id));
  }

  function canQuickSellItem(state, item) {
    if (!item || item.kind === 'special') return false;
    if (item.locked || item.favorite || item.protected) return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    const markedJunk = tags.includes('junk') || item.junk === true || item.isJunk === true || item.markedJunk === true;
    if (!markedJunk) return false;
    if (tags.includes('protected') || tags.includes('special')) return false;
    if (itemIsEquipped(state, item)) return false;
    return sellValue(item) > 0;
  }

  function canSellAllGearItem(state, item) {
    if (!item || item.kind === 'special') return false;
    if (!item.slot) return false;
    if (item.locked || item.favorite || item.protected) return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    if (tags.includes('protected') || tags.includes('special')) return false;
    if (itemIsEquipped(state, item)) return false;
    return sellValue(item) > 0;
  }

  function isJunkSaleBonusItem(item) {
    if (!item || item.kind === 'special') return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    return item.rarity === 'common' || tags.includes('junk') || item.junk === true || item.isJunk === true || item.markedJunk === true;
  }

  function sellValueWithGoldSink(state, item, bonusAvailable = true) {
    const base = sellValue(item);
    const sink = ensureGoldSinkState(state);
    if (bonusAvailable && sink.junkSaleBonusCharges > 0 && isJunkSaleBonusItem(item)) {
      return Math.max(1, Math.round(base * 1.15));
    }
    return base;
  }

  function consumeJunkSaleBonus(state, used) {
    if (!used) return;
    const sink = ensureGoldSinkState(state);
    sink.junkSaleBonusCharges = Math.max(0, Math.floor(numberOr(sink.junkSaleBonusCharges, 0, 0, 3)) - 1);
  }

  // v1.3.26 Checkpoint & Charter QA:
  // Raw depth checkpoints can now exceed 999 because late charters unlock every
  // 5,000 depths after D800. Keep district display bounded separately, but never
  // clamp safe/extract/return progress to the district table ceiling.