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
      summary:'Defeat Glassfang Brute for a cautious Lowfire payout.',
      eliteName:'Glassfang Brute',
      title:'WANTED: Glassfang Brute',
      district:'Lowfire District',
      threat:2,
      modifier:'',
      modifierKey:'',
      contractText:'Defeat Glassfang Brute when it appears.',
      bonusWrit:'Defeat it before resting.',
      bonusWritType:'rest',
      rewardPreview:'+silver, +rare chance',
      flavor:'A Lowfire enforcer dragging broken blades behind it.'
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
      summary:'Defeat Ash-Crowned Marauder under a modest hazard clause.',
      eliteName:'Ash-Crowned Marauder',
      title:'WANTED: Ash-Crowned Marauder',
      district:'Ashgate Warrens',
      threat:2,
      modifier:'',
      modifierKey:'',
      contractText:'Defeat Ash-Crowned Marauder when it appears.',
      bonusWrit:'Defeat it without extracting first.',
      bonusWritType:'extract',
      rewardPreview:'+silver, +elite loot',
      flavor:'An old stair raider wearing trophy armor from failed Wardens.'
    },
    {
      id:'cinderjaw_bailiff',
      name:'Cinderjaw Bailiff',
      tier:'Tier II',
      goal:4,
      reward:coins(42,0,0),
      maxReward:coins(125,0,0),
      floorBonusPerDepth:coins(0,60,0),
      requiresClaimed:null,
      unlockFloor:1,
      risk:{ level:'Medium', label:'Medium risk', spawnBonus:0.04, hpBonus:0.06, damageBonus:0.04, coinBonus:0.04 },
      summary:'Defeat Cinderjaw Bailiff for a compact Lowfire debt-court payout.',
      eliteName:'Cinderjaw Bailiff',
      title:'WANTED: Cinderjaw Bailiff',
      district:'Lowfire District',
      threat:2,
      modifier:'',
      modifierKey:'',
      contractText:'Defeat Cinderjaw Bailiff when it appears.',
      bonusWrit:'Defeat it after guarding at least once.',
      bonusWritType:'guard',
      rewardPreview:'+silver, +board rep soon',
      flavor:'A debt-court brute sent to collect from the living.'
    },
  ];

  const ELITE_CONTRACT_ID_ALIASES = {
    elite_hunter_i: 'lowfire_bounty',
    elite_hunter_ii: 'hazard_contract',
    dangerous_work: 'hazard_contract'
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

  function eliteContractThreatStars(threat) {
    const filled = Math.max(1, Math.min(3, Math.floor(numberOr(threat, 1, 1, 3))));
    return `${'★'.repeat(filled)}${'☆'.repeat(3 - filled)}`;
  }

  function eliteContractThreatFloor(state) {
    return Math.max(1, Math.floor(threatDepthFromDepth(reachedDistrictFloor(state))));
  }

  function eliteContractRawDepthForThreatFloor(targetFloor) {
    const floor = Math.max(1, Math.floor(numberOr(targetFloor, 1, 1, 999999)));
    return Math.max(1, (floor - 1) * DEPTH_CHAPTERS_PER_THREAT_STEP + 1);
  }

  function eliteContractTargetFloor(state) {
    const current = eliteContractThreatFloor(state);
    let target = current + rand(3, 8);
    const bossInterval = Math.max(1, Math.floor(numberOr(BOSS_INTERVAL, 5, 1, 999)));
    target = Math.min(target, current + 12);
    while (target % bossInterval === 0) target += 1;
    return Math.max(current + 1, target);
  }

  function eliteBoardContractModel(contract, state = null, accepted = false, seed = null) {
    if (!contract) return null;
    const targetFloor = Math.max(1, Math.floor(numberOr(seed?.targetFloor ?? contract.targetFloor, eliteContractTargetFloor(state), 1, 999999)));
    const eliteName = seed?.eliteName || contract.eliteName || contract.name || 'Unlisted Elite';
    const district = seed?.district || contract.district || districtByDepth(eliteContractRawDepthForThreatFloor(targetFloor)).name || 'Lowfire District';
    const status = String(seed?.status || '').toLowerCase();
    return {
      id: contract.id,
      rivalId: seed?.rivalId || contract.rivalId || '',
      rivalContract: !!(seed?.rivalContract || contract.rivalContract || seed?.rivalId || contract.rivalId),
      eliteName,
      title: seed?.title || contract.title || (seed?.rivalId || contract.rivalId ? `RIVAL SIGHTED: ${eliteName}` : `WANTED: ${eliteName}`),
      district,
      targetFloor,
      targetLocation: eliteContractTargetLocationLabel(targetFloor),
      killedPlayerAtLocation: seed?.killedPlayerAtLocation || contract.killedPlayerAtLocation || '',
      rivalDefeats: Math.max(1, Math.floor(numberOr(seed?.rivalDefeats || seed?.defeats || contract.rivalDefeats, 1, 1, 9999))),
      threat: Math.max(1, Math.min(3, Math.floor(numberOr(seed?.threat ?? contract.threat, 1, 1, 3)))),
      modifier: '',
      modifierKey: '',
      contractText: seed?.contractText || contract.contractText || (seed?.rivalId || contract.rivalId ? `Defeat ${eliteName} and reclaim the writ.` : `Defeat ${eliteName} when it appears.`),
      bonusWrit: seed?.bonusWrit || contract.bonusWrit || 'Defeat it before resting.',
      bonusWritType: seed?.bonusWritType || contract.bonusWritType || 'rest',
      rewardPreview: seed?.rewardPreview || contract.rewardPreview || '+silver, +elite loot',
      flavor: seed?.flavor || contract.flavor || contract.summary || 'A paid mark for wardens willing to face elite danger.',
      accepted: !!accepted,
      completed: !!(seed?.completed || status === 'completed'),
      expired: !!(seed?.expired || status === 'expired'),
      failed: !!(seed?.failed || status === 'failed')
    };
  }

  function eliteContractOfferModel(state, id) {
    const offers = asArray(state?.town?.eliteBoardContracts, []);
    return offers.find(offer => offer && offer.id === id) || null;
  }

  function eliteContractSnapshot(active, status = '') {
    if (!active) return null;
    return {
      id: active.id,
      rivalId: active.rivalId || '',
      rivalContract: !!active.rivalContract,
      eliteName: active.eliteName || active.name || '',
      district: active.district || '',
      targetFloor: active.targetFloor || 0,
      targetLocation: active.targetLocation || '',
      killedPlayerAtLocation: active.killedPlayerAtLocation || '',
      rivalDefeats: Math.max(1, Math.floor(numberOr(active.rivalDefeats, 1, 1, 9999))),
      threat: active.threat || 1,
      modifier: '',
      modifierKey: '',
      contractText: active.contractText || '',
      bonusWrit: active.bonusWrit || '',
      bonusWritType: active.bonusWritType || '',
      bonusWritCompleted: !!active.bonusWritCompleted,
      bonusWritMissed: !!active.bonusWritMissed,
      failureNote: active.failureNote || '',
      failureKind: active.failureKind || '',
      rewardPreview: active.rewardPreview || '',
      flavor: active.flavor || '',
      status: status || active.status || 'pending',
      completed: !!active.completed,
      expired: !!active.expired,
      failed: !!active.failed,
      date: new Date().toLocaleString()
    };
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

  function sanitizeContractReward(contract, value, options = {}) {
    const base = contractBaseReward(contract);
    const capMultiplier = isPlainObject(options) ? numberOr(options.capMultiplier, 1, 1, 2) : 1;
    const cap = Math.max(base, Math.round(contractRewardCap(contract) * capMultiplier));
    if (!isValidRewardNumber(value)) return base;
    return clamp(Math.floor(value), 0, cap);
  }

  function contractRewardDepth(state) {
    return Math.max(1,
      Math.floor(numberOr(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
  }

  function eliteContractTargetLocationLabel(targetFloor) {
    const rawDepth = eliteContractRawDepthForThreatFloor(targetFloor);
    if (typeof getLoreDepthProgress === 'function') {
      const lore = getLoreDepthProgress(rawDepth);
      return `Floor ${format(lore.floorNumber)} • Room ${format(lore.roomWithinFloor)} • Chapter ${format(lore.chapterWithinRoom)}`;
    }
    return `Floor ${format(Math.max(1, Math.floor(numberOr(targetFloor, 1, 1, 999999))))}`;
  }

  function eliteContractNextBossFloor(targetFloor) {
    const floor = Math.max(1, Math.floor(numberOr(targetFloor, 1, 1, 999999)));
    const bossInterval = Math.max(1, Math.floor(numberOr(BOSS_INTERVAL, 5, 1, 999)));
    return Math.ceil(floor / bossInterval) * bossInterval;
  }

  function eliteContractBonusWritReward(active, contract, state = null) {
    if (!active || !contract) return 0;
    const base = activeContractRewardAmount(active, contract, state);
    const depthBonus = Math.max(1, Math.floor(numberOr(active.targetFloor, 1, 1, 999999) / 2));
    return Math.max(1, Math.min(Math.round(base * 0.15), 24 + depthBonus));
  }

  function calculateContractReward(contract, state = null) {
    if (!contract) return 0;
    const base = contractBaseReward(contract);
    const floorBonus = Math.floor(numberOr(contract.floorBonusPerDepth, 0, 0, Number.MAX_SAFE_INTEGER)) * contractRewardDepth(state);
    return sanitizeContractReward(contract, base + floorBonus);
  }

  function activeContractRewardAmount(active, contract, state = null) {
    if (!active || !contract) return 0;
    const capMultiplier = active.rivalContract ? 1.10 : 1;
    if (!Object.prototype.hasOwnProperty.call(active, 'rewardAmount') || active.rewardAmount == null) {
      const baseReward = calculateContractReward(contract, state);
      active.rewardAmount = active.rivalContract ? Math.round(baseReward * 1.10) : baseReward;
    } else {
      active.rewardAmount = sanitizeContractReward(contract, active.rewardAmount, { capMultiplier });
    }
    active.rewardAmount = sanitizeContractReward(contract, active.rewardAmount, { capMultiplier });
    return active.rewardAmount;
  }

  function activeEliteContractDef(state) {
    const active = state?.player?.eliteContracts?.active;
    if (!active) return null;
    return eliteContractDef(active.id);
  }

  function activeEliteContractRisk(state) {
    const active = state?.player?.eliteContracts?.active;
    if (active && active.eliteName) return { ...ELITE_CONTRACT_RISK_DEFAULTS };
    const contract = activeEliteContractDef(state);
    return contract ? eliteContractRisk(contract) : { ...ELITE_CONTRACT_RISK_DEFAULTS };
  }

  function activeEliteContractRiskText(contract) {
    const risk = eliteContractRisk(contract);
    const parts = [
      `+${Math.round(risk.spawnBonus * 100)}% elite spawn`,
      `+${Math.round(risk.hpBonus * 100)}% elite HP`,
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

  function eliteRivalId(eliteName) {
    const base = String(eliteName || 'rival_elite').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'rival_elite';
    return `rival_${base}_${Date.now().toString(36)}`;
  }

  function createEliteRivalState(seed = []) {
    const seen = new Set();
    return asArray(seed, []).filter(isPlainObject).map(entry => {
      const eliteName = String(entry.eliteName || '').trim();
      if (!eliteName) return null;
      const key = eliteName.toLowerCase();
      if (seen.has(key) && !entry.completed) return null;
      seen.add(key);
      const sourceContractId = normalizeEliteContractId(entry.sourceContractId || entry.contractId);
      return {
        id: String(entry.id || eliteRivalId(eliteName)),
        eliteName,
        floorName: String(entry.floorName || entry.district || 'Elite Board'),
        sourceContractId: sourceContractId || 'lowfire_bounty',
        killedPlayerAtChapter: Math.max(0, Math.floor(numberOr(entry.killedPlayerAtChapter, 0, 0, 999999))),
        killedPlayerAtLocation: String(entry.killedPlayerAtLocation || 'Unknown floor'),
        defeats: Math.max(1, Math.floor(numberOr(entry.defeats, 1, 1, 9999))),
        revengeAvailable: entry.revengeAvailable !== false && !entry.completed,
        completed: !!entry.completed,
        createdAt: Math.max(0, Math.floor(numberOr(entry.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER))),
        updatedAt: Math.max(0, Math.floor(numberOr(entry.updatedAt, entry.createdAt || Date.now(), 0, Number.MAX_SAFE_INTEGER)))
      };
    }).filter(Boolean).slice(0, 12);
  }

  function validateEliteBoardState(state) {
    if (!state) return createEliteContractState({}, state);
    if (!state.player) state.player = {};
    const contracts = createEliteContractState(isPlainObject(state.player.eliteContracts) ? state.player.eliteContracts : {}, state);
    contracts.completed = normalizeEliteContractIds(contracts.completed);
    contracts.claimed = normalizeEliteContractIds(contracts.claimed);
    contracts.failed = asArray(contracts.failed, []).filter(isPlainObject).slice(0, 20);
    contracts.expired = asArray(contracts.expired, []).filter(isPlainObject).slice(0, 20);
    contracts.rivals = createEliteRivalState(contracts.rivals);
    if (contracts.active) {
      const activeStatus = String(contracts.active.status || '').toLowerCase();
      const isInvalid = !normalizeEliteContractId(contracts.active.id) || contracts.active.failed || contracts.active.expired || contracts.active.completed || activeStatus === 'failed' || activeStatus === 'expired';
      if (isInvalid) contracts.active = null;
      else {
        contracts.active.bonusWritCompleted = !!contracts.active.bonusWritCompleted;
        contracts.active.bonusWritMissed = !!contracts.active.bonusWritMissed;
        contracts.active.bonusWritFailed = !!contracts.active.bonusWritFailed;
        if (contracts.active.bonusWritFailed && !contracts.active.bonusWritCompleted) contracts.active.bonusWritMissed = true;
      }
    }
    state.player.eliteContracts = contracts;
    return contracts;
  }

  function createEliteContractState(seed = {}, state = null) {
    const source = isPlainObject(seed) ? seed : {};
    const claimed = normalizeEliteContractIds(source.claimed);
    const completedSet = new Set([...normalizeEliteContractIds(source.completed), ...claimed]);
    const expired = asArray(source.expired, []).filter(isPlainObject).slice(0, 20);
    const failed = asArray(source.failed, []).filter(isPlainObject).slice(0, 20);
    const rivals = createEliteRivalState(source.rivals);
    const savedActive = isPlainObject(source.active) ? source.active : null;
    let active = null;

    if (savedActive) {
      const def = eliteContractDef(normalizeEliteContractId(savedActive.id));
      if (def && (!claimed.includes(def.id) || savedActive.rivalId)) {
        const progress = Math.floor(numberOr(savedActive.progress, 0, 0, 1));
        const complete = !!savedActive.completed || !!savedActive.complete || progress >= 1 || completedSet.has(def.id);
        const expiredActive = !!savedActive.expired || String(savedActive.status || '').toLowerCase() === 'expired';
        const failedActive = !!savedActive.failed || String(savedActive.status || '').toLowerCase() === 'failed';
        const alreadyClaimed = !!savedActive.claimed;
        const rewardCapMultiplier = savedActive.rivalContract || savedActive.rivalId ? 1.10 : 1;
        const rewardAmount = Object.prototype.hasOwnProperty.call(savedActive, 'rewardAmount') && savedActive.rewardAmount != null
          ? sanitizeContractReward(def, savedActive.rewardAmount, { capMultiplier: rewardCapMultiplier })
          : sanitizeContractReward(def, calculateContractReward(def, state) * rewardCapMultiplier, { capMultiplier: rewardCapMultiplier });
        if (alreadyClaimed && !savedActive.rivalId) {
          completedSet.add(def.id);
          if (!claimed.includes(def.id)) claimed.push(def.id);
        } else if (expiredActive || failedActive) {
          const model = eliteBoardContractModel(def, state, false, savedActive);
          model.status = expiredActive ? 'expired' : 'failed';
          model.expired = expiredActive;
          model.failed = failedActive;
          const list = expiredActive ? expired : failed;
          list.unshift(model);
          list.splice(20);
        } else {
          active = {
            id: def.id,
            rivalId: String(savedActive.rivalId || ''),
            rivalContract: !!savedActive.rivalContract || !!savedActive.rivalId,
            sourceContractId: String(savedActive.sourceContractId || def.id),
            name: def.name,
            tier: def.tier || '',
            eliteName: savedActive.eliteName || def.eliteName || def.name,
            title: savedActive.title || def.title || `WANTED: ${def.eliteName || def.name}`,
            district: savedActive.district || def.district || '',
            targetFloor: Math.max(1, Math.floor(numberOr(savedActive.targetFloor, eliteContractTargetFloor(state), 1, 999999))),
            threat: Math.max(1, Math.min(3, Math.floor(numberOr(savedActive.threat ?? def.threat, 1, 1, 3)))),
            modifier: '',
            modifierKey: '',
            contractText: savedActive.contractText || def.contractText || `Defeat ${savedActive.eliteName || def.eliteName || def.name} when it appears.`,
            bonusWrit: savedActive.bonusWrit || def.bonusWrit || 'Defeat it before resting.',
            bonusWritType: savedActive.bonusWritType || def.bonusWritType || 'rest',
            bonusWritCompleted: !!savedActive.bonusWritCompleted,
            bonusWritMissed: !!savedActive.bonusWritMissed,
            bonusWritFailed: !!savedActive.bonusWritFailed || !!savedActive.bonusWritMissed,
            bonusWritRewardPaid: !!savedActive.bonusWritRewardPaid,
            failureNote: String(savedActive.failureNote || ''),
            failureKind: String(savedActive.failureKind || ''),
            bonusRested: !!savedActive.bonusRested,
            bonusExtracted: !!savedActive.bonusExtracted,
            bonusBossReached: !!savedActive.bonusBossReached,
            bonusGuardUses: Math.floor(numberOr(savedActive.bonusGuardUses, 0, 0, 999)),
            rewardPreview: savedActive.rewardPreview || def.rewardPreview || '',
            killedPlayerAtLocation: String(savedActive.killedPlayerAtLocation || ''),
            rivalDefeats: Math.max(1, Math.floor(numberOr(savedActive.rivalDefeats, 1, 1, 9999))),
            flavor: savedActive.flavor || def.flavor || def.summary || '',
            accepted: true,
            completed: complete,
            expired: expiredActive,
            failed: failedActive,
            status: failedActive ? 'failed' : expiredActive ? 'expired' : complete ? 'completed' : String(savedActive.status || 'pending'),
            targetSpawned: !!savedActive.targetSpawned,
            targetDefeated: !!savedActive.targetDefeated || complete,
            spawnedAtFloor: Math.max(0, Math.floor(numberOr(savedActive.spawnedAtFloor, 0, 0, 999999))),
            progress: complete ? 1 : progress,
            goal: 1,
            rewardAmount,
            complete,
            claimable: complete,
            claimed: false
          };
          if (complete && !active.rivalContract) completedSet.add(def.id);
        }
      }
    }

    return {
      active,
      completed: Array.from(completedSet),
      claimed,
      expired,
      failed,
      rivals
    };
  }

  function createEliteTrophyState(seed = {}) {
    const source = isPlainObject(seed) ? seed : {};
    const collected = {};
    const rawCollected = isPlainObject(source.collected) ? source.collected : {};
    Object.keys(rawCollected).forEach(id => {
      const entry = rawCollected[id];
      if (!isPlainObject(entry)) return;
      const trophyId = String(entry.id || id || '').trim();
      if (!trophyId) return;
      collected[trophyId] = {
        id: trophyId,
        name: String(entry.name || 'Elite Trophy'),
        sourceElite: String(entry.sourceElite || entry.source || ''),
        floorName: String(entry.floorName || ''),
        earnedAt: Math.floor(numberOr(entry.earnedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER)),
        count: Math.max(1, Math.floor(numberOr(entry.count, 1, 1, 9999)))
      };
    });
    return {
      collected,
      totalFound: Math.max(0, Math.floor(numberOr(source.totalFound, Object.keys(collected).reduce((sum, id) => sum + Math.max(1, Math.floor(numberOr(collected[id]?.count, 1, 1, 9999))), 0), 0, Number.MAX_SAFE_INTEGER))),
      latestId: String(source.latestId || '')
    };
  }

  function ensureEliteTrophyState(state) {
    if (!state.player) state.player = {};
    state.player.eliteTrophies = createEliteTrophyState(state.player.eliteTrophies);
    return state.player.eliteTrophies;
  }

  function getEliteTrophyCollection(state) {
    return ensureEliteTrophyState(state).collected;
  }

  function eliteTrophyDefinitions() {
    return Array.isArray(window?.ELITE_TROPHY_DEFINITIONS) ? window.ELITE_TROPHY_DEFINITIONS : [];
  }

  function eliteTrophyByEliteName(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return null;
    const map = window?.ELITE_TROPHY_BY_ELITE || {};
    const id = map[key];
    return eliteTrophyDefinitions().find(trophy => trophy.id === id) || null;
  }

  function eliteTrophyDefinitionForContract(contract) {
    if (!contract) return null;
    return eliteTrophyByEliteName(contract.eliteName) || eliteTrophyDefinitions().find(trophy => trophy.sourceElite === contract.eliteName) || null;
  }

  function eliteTrophyFallback(contract) {
    const eliteName = String(contract?.eliteName || contract?.name || 'Elite').trim();
    const clean = eliteName.replace(/\s+/g, ' ');
    return {
      id: clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `elite_trophy_${Date.now()}`,
      name: `${clean} Trophy`,
      sourceElite: eliteName,
      floorName: String(contract?.district || contract?.targetLocation || '').trim() || 'Elite Board',
      bonusText: '+1% Elite Board payout',
      flavor: `A collected sign of victory over ${clean}.`
    };
  }

  function getEliteTrophyPayoutBonus(state) {
    const trophies = ensureEliteTrophyState(state);
    const uniqueCount = Object.keys(trophies.collected || {}).length;
    return Math.min(5, Math.max(0, uniqueCount));
  }

  function eliteTrophyRollChance(active, contract, state = null) {
    const base = 0.12;
    const bonus = active?.bonusWritCompleted ? 0.08 : 0;
    return Math.min(0.20, base + bonus);
  }

  function awardEliteTrophy(state, contract, options = {}) {
    const trophies = ensureEliteTrophyState(state);
    const def = eliteTrophyDefinitionForContract(contract) || eliteTrophyFallback(contract);
    if (!def || !def.id) return null;
    const existing = trophies.collected[def.id];
    if (existing) {
      existing.count = Math.max(1, Math.floor(numberOr(existing.count, 1, 1, 9999)) + 1);
      existing.earnedAt = existing.earnedAt || Date.now();
      trophies.totalFound = Math.max(0, Math.floor(numberOr(trophies.totalFound, 0, 0, Number.MAX_SAFE_INTEGER))) + 1;
      trophies.latestId = def.id;
      const line = `Trophy duplicate found: ${existing.name} x${existing.count}`;
      if (options.log !== false) pushCombat(state, line);
      if (options.log !== false) pushLog(state, line);
      return { trophy: existing, duplicate: true, awarded: false };
    }
    const trophy = {
      id: def.id,
      name: String(def.name || 'Elite Trophy'),
      sourceElite: String(def.sourceElite || contract?.eliteName || ''),
      floorName: String(def.floorName || contract?.district || ''),
      earnedAt: Date.now(),
      count: 1
    };
    trophies.collected[trophy.id] = trophy;
    trophies.totalFound = Math.max(0, Math.floor(numberOr(trophies.totalFound, 0, 0, Number.MAX_SAFE_INTEGER))) + 1;
    trophies.latestId = trophy.id;
    if (options.log !== false) {
      const bonusText = def.bonusText || '+1% Elite Board payout';
      pushCombat(state, `Trophy found: ${trophy.name}.`);
      pushLog(state, `Trophy found: ${trophy.name}. ${bonusText}.`);
    }
    return { trophy, duplicate: false, awarded: true };
  }

  function eliteTrophySummary(state) {
    const trophies = ensureEliteTrophyState(state);
    const collected = Object.values(trophies.collected || {});
    const latest = trophies.latestId && trophies.collected[trophies.latestId];
    const bonus = getEliteTrophyPayoutBonus(state);
    const latestLabel = latest ? latest.name : 'None yet';
    return {
      totalFound: Math.max(0, Math.floor(numberOr(trophies.totalFound, 0, 0, Number.MAX_SAFE_INTEGER))),
      uniqueFound: collected.length,
      latestLabel,
      bonus
    };
  }

  // Revisit candidate ledger is read-only foundation data until route mechanics are explicitly introduced.
  // Keep this side-route planning surface attached to existing systems only; do not turn it into gameplay flow.
  function revisitCandidateHooks(state = S) {
    const safeState = state && typeof state === 'object' ? state : {};
    const safePlayer = safeState.player && typeof safeState.player === 'object' ? safeState.player : {};
    const revisitState = safePlayer.revisitState && typeof safePlayer.revisitState === 'object' ? safePlayer.revisitState : {};
    const contracts = ensureEliteContractState(safeState);
    const rivals = ensureEliteRivalState(safeState);
    const trophies = ensureEliteTrophyState(safeState);
    const retired = asArray(safePlayer.retiredRelics, []).filter(entry => entry && typeof entry === 'object');
    const trophyCount = Object.keys(trophies.collected || {}).length;
    const rivalCount = rivals.filter(r => r && !r.completed && r.revengeAvailable).length;
    const boardEcho = contracts.active ? (contracts.active.rivalContract ? 'Rival route active' : 'Board route open') : 'Board route quiet';
    const currentFloor = Math.max(1, Math.floor(numberOr(safeState.run?.floor, safePlayer.safeExtractDepth || 1, 1, 999999)));
    const currentDistrict = typeof currentStagingDistrict === 'function' ? currentStagingDistrict(safeState) : null;
    const districtName = String(currentDistrict && currentDistrict.name ? currentDistrict.name : 'Lowfire District').trim() || 'Lowfire District';
    const floorLabel = typeof getLoreDepthProgress === 'function'
      ? getLoreDepthProgress(currentFloor)
      : { floorNumber: currentFloor, roomWithinFloor: 1, chapterWithinRoom: 1 };
    const meta = revisitState.unlocked ? 'Planned' : 'Future Route';
    const debtBalance = Math.max(0, Math.floor(numberOr(safePlayer?.debtCollector?.balanceCopper, 0, 0, Number.MAX_SAFE_INTEGER)));
    const entries = [
      {
        key: 'trophy_echo',
        label: 'Trophy Echo',
        detail: trophyCount ? `${trophyCount} recorded` : 'No boss marks yet',
        source: `Trophies in ${districtName}`,
        priority: 10,
        locked: !trophyCount
      },
      {
        key: 'famous_gear_memory',
        label: 'Famous Gear Memory',
        detail: retired.length ? `${Math.min(retired.length, 3)} archive record${retired.length === 1 ? '' : 's'}` : 'No archive memory yet',
        source: 'Archive memory',
        priority: 20,
        locked: !retired.length
      },
      {
        key: 'rival_trace',
        label: 'Rival Trace',
        detail: rivalCount ? `${rivalCount} ready` : 'Quiet',
        source: contracts.active?.rivalContract ? 'Elite Board rival' : `Current floor F${format(floorLabel.floorNumber)}`,
        priority: 30,
        locked: !rivalCount && !contracts.active?.rivalContract
      },
      {
        key: 'debt_pressure',
        label: 'Debt Pressure',
        detail: debtBalance > 0 ? 'Active' : 'Dormant',
        source: 'Debt Collector',
        priority: 40,
        locked: debtBalance <= 0
      },
      {
        key: 'board_echo',
        label: 'Board Echo',
        detail: boardEcho,
        source: contracts.active ? 'Board activity' : `District ${districtName}`,
        priority: 50,
        locked: false
      }
    ];
    const seen = new Set();
    return entries
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        key: String(entry.key || '').trim() || `revisit_${entry.priority || 0}`,
        label: String(entry.label || '').trim() || 'Unknown Hook',
        detail: String(entry.detail || '').trim() || 'No details',
        source: String(entry.source || '').trim() || 'Unknown source',
        priority: Math.max(0, Math.floor(numberOr(entry.priority, 0, 0, Number.MAX_SAFE_INTEGER))),
        locked: !!entry.locked,
        note: meta
      }))
      .sort((left, right) => (left.priority - right.priority) || left.key.localeCompare(right.key))
      .filter(entry => {
        if (seen.has(entry.key)) return false;
        seen.add(entry.key);
        return true;
      });
  }

  function revisitRouteUnlockCriteriaStub(routeKey, hooks = []) {
    const hookSet = new Set(asArray(hooks, []).map(hook => String(hook || '').trim()).filter(Boolean));
    const criteriaMap = {
      trophy_echo_route: [
        'Stub: recover a stronger boss record',
        'Stub: bind this echo to a future return route'
      ],
      famous_gear_route: [
        'Stub: carry or retire gear with stronger memory',
        'Stub: record more kills or boss marks on a named item'
      ],
      rival_trace_route: [
        'Stub: leave a clearer rival trail',
        'Stub: defeat or encounter more named elites'
      ],
      debt_pressure_route: [
        'Stub: let the debt ledger build pressure',
        'Stub: tie the debt note to a return district'
      ],
      board_echo_route: [
        'Stub: complete more board hunts',
        'Stub: leave a stronger contract trace'
      ]
    };
    const criteria = (criteriaMap[String(routeKey || '').trim()] || []).map(text => String(text || '').trim()).filter(Boolean);
    return {
      criteria: criteria.length ? criteria : ['Stub: future conditions are inferred, not active'],
      note: hookSet.size ? 'Stub only - criteria are display text from active hooks.' : 'Stub only - future conditions are inferred, not active.'
    };
  }

  function revisitRouteReadiness(route = {}, hooks = []) {
    const criteria = asArray(route?.criteria, []).filter(Boolean);
    const hookCount = Math.max(0, Math.floor(numberOr(asArray(hooks, []).length, 0, 0, Number.MAX_SAFE_INTEGER)));
    const priority = Math.max(0, Math.floor(numberOr(route?.priority, 0, 0, Number.MAX_SAFE_INTEGER)));
    const signal = hookCount + criteria.length + Math.max(0, Math.min(2, Math.floor(priority / 20)));
    if (signal >= 6) return 'Strong Echo';
    if (signal >= 3) return 'Route Forming';
    return 'Faint Trace';
  }

  function revisitReadOnlyStateSnapshot(state = S) {
    const safeState = state && typeof state === 'object' ? state : {};
    try {
      if (typeof structuredClone === 'function') return structuredClone(safeState);
    } catch (err) {}
    try {
      return JSON.parse(JSON.stringify(safeState));
    } catch (err) {}
    return {};
  }

  function revisitGateProgressClamp(current, required) {
    const progressCurrent = Math.max(0, Math.floor(numberOr(current, 0, 0, Number.MAX_SAFE_INTEGER)));
    const progressRequired = Math.max(1, Math.floor(numberOr(required, 1, 1, Number.MAX_SAFE_INTEGER)));
    return {
      progressCurrent,
      progressRequired,
      progressPercent: Math.max(0, Math.min(100, Math.floor((progressCurrent / progressRequired) * 100)))
    };
  }

  function revisitGateProgressPercent(current, required) {
    return revisitGateProgressClamp(current, required).progressPercent;
  }

  function revisitTrophyEchoSignalModel(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const safePlayer = safeState.player && typeof safeState.player === 'object' ? safeState.player : {};
    const countArray = source => asArray(source, []).filter(entry => entry && (typeof entry === 'object' || typeof entry === 'string')).length;
    const bossTrophyCount = countArray(safePlayer.bossTrophies);
    const eliteSource = isPlainObject(safePlayer.eliteTrophies) && isPlainObject(safePlayer.eliteTrophies.collected)
      ? safePlayer.eliteTrophies.collected
      : isPlainObject(safePlayer.eliteTrophies)
        ? safePlayer.eliteTrophies
        : {};
    const eliteTrophyCount = Object.keys(eliteSource).filter(key => {
      const entry = eliteSource[key];
      return entry && typeof entry === 'object';
    }).length;
    const bossRecordCount = countArray(safePlayer.bossTrophyRecords);
    const signalSources = [
      { key: 'bossTrophies', label: 'Boss trophy memory', count: bossTrophyCount },
      { key: 'eliteTrophies', label: 'Elite trophy memory', count: eliteTrophyCount },
      { key: 'bossRecords', label: 'Boss record memory', count: bossRecordCount }
    ].map(source => ({
      key: source.key,
      label: source.label,
      count: Math.max(0, Math.floor(numberOr(source.count, 0, 0, Number.MAX_SAFE_INTEGER)))
    }));
    const signalCurrent = signalSources.reduce((sum, source) => sum + source.count, 0);
    const signalRequired = 3;
    const progress = revisitGateProgressClamp(signalCurrent, signalRequired);
    return {
      signalCurrent: progress.progressCurrent,
      signalRequired: progress.progressRequired,
      signalPercent: progress.progressPercent,
      signalSources
    };
  }

  function revisitTrophyEchoRulePlan(state = S) {
    const signal = revisitTrophyEchoSignalModel(state);
    return {
      key: 'trophy_echo_route',
      label: 'Trophy Echo',
      planLabel: 'Future Trophy Echo Rule',
      status: 'Planning only',
      locked: true,
      ready: false,
      playable: false,
      active: false,
      accessAvailable: false,
      rewardAvailable: false,
      routeAccessLabel: 'Route access is unavailable.',
      ruleInactiveLabel: 'Future rule inactive.',
      signalLabel: 'Boss-history signal',
      signalCurrent: signal.signalCurrent,
      signalRequired: signal.signalRequired,
      signalPercent: signal.signalPercent,
      signalSources: signal.signalSources,
      futureCondition: 'Build boss-history memory before this future route can be considered.',
      antiFarmPolicy: [
        'No best-in-slot low-floor farming.',
        'No infinite revisit loops.',
        'No mandatory revisit grind.',
        'No route rewards stronger than main progression.',
        'Enter Dungeon and Continue Run remain primary.'
      ],
      rewardPolicy: {
        status: 'Planning only',
        rewardAccess: false,
        allowedFutureClass: 'Memory, trophy, and Dex identity rewards first.',
        disallowed: [
          'No mythic farming path.',
          'No uncapped gear rewards.',
          'No repeatable low-floor power spike.',
          'No economy bypass.'
        ]
      },
      notes: [
        'Trophy Echo should be the first planned revisit route because boss history is already tracked.',
        'This plan is read-only and does not create route activation.'
      ]
    };
  }

  function revisitTrophyEchoRuleSummary(state = S) {
    const plan = revisitTrophyEchoRulePlan(state);
    return {
      planned: true,
      locked: true,
      ready: 0,
      playable: 0,
      active: 0,
      accessAvailable: false,
      rewardAvailable: false,
      signalCurrent: plan.signalCurrent,
      signalRequired: plan.signalRequired,
      signalPercent: plan.signalPercent,
      antiFarmGuardrails: Array.isArray(plan.antiFarmPolicy) ? plan.antiFarmPolicy.length : 0
    };
  }

  function revisitGateProgressSignals(routeKey, state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const safePlayer = safeState.player && typeof safeState.player === 'object' ? safeState.player : {};
    const safeKey = String(routeKey || '');
    const signals = [];
    const add = (label, value) => {
      const count = Math.max(0, Math.floor(numberOr(value, 0, 0, Number.MAX_SAFE_INTEGER)));
      if (count > 0) signals.push(`${label}:${count}`);
    };
    const countArray = source => asArray(source, []).filter(entry => entry && typeof entry === 'object').length;

    if (safeKey === 'trophy_echo_route') {
      add('bossTrophies', Array.isArray(safePlayer.bossTrophies) ? safePlayer.bossTrophies.length : 0);
      add('eliteTrophies', isPlainObject(safePlayer.eliteTrophies) ? Object.keys(safePlayer.eliteTrophies).length : 0);
      add('bossRecords', countArray(safePlayer.bossTrophyRecords));
    } else if (safeKey === 'famous_gear_route') {
      add('retiredRelics', countArray(safePlayer.retiredRelics));
      add('gearMemory', asArray(safePlayer.inventory, []).filter(item => isPlainObject(item) && isPlainObject(item.gearMemory)).length);
      add('memoryTags', asArray(safePlayer.inventory, []).filter(item => isPlainObject(item) && Array.isArray(item.tags) && item.tags.some(tag => /famous|archive|memory/i.test(String(tag || '')))).length);
    } else if (safeKey === 'rival_trace_route') {
      const contracts = ensureEliteContractState(safeState);
      add('claimedContracts', Array.isArray(contracts.claimed) ? contracts.claimed.length : 0);
      add('activeRival', contracts.active && contracts.active.rivalId ? 1 : 0);
      add('rivalRecords', countArray(contracts.rivals));
    } else if (safeKey === 'debt_pressure_route') {
      const debt = isPlainObject(safePlayer.debtCollector) ? safePlayer.debtCollector : {};
      add('debtNotes', Array.isArray(debt.notes) ? debt.notes.length : 0);
      add('debtPressure', debt.pressure);
      add('debtBalance', debt.balanceCopper);
    } else if (safeKey === 'board_echo_route') {
      const contracts = ensureEliteContractState(safeState);
      add('claimed', Array.isArray(contracts.claimed) ? contracts.claimed.length : 0);
      add('completed', Array.isArray(contracts.completed) ? contracts.completed.length : 0);
      add('history', Array.isArray(contracts.history) ? contracts.history.length : 0);
    }

    return signals.slice(0, 6);
  }

  function revisitGateProgressModel(routeKey, state = S) {
    const meta = revisitUnlockGateMeta(routeKey);
    const safeKey = String(routeKey || '');
    const signals = revisitGateProgressSignals(safeKey, state);
    const signalScore = signals.reduce((sum, signal) => {
      const match = /:(\d+)$/.exec(String(signal || ''));
      return sum + (match ? Math.max(0, Math.floor(numberOr(match[1], 0, 0, Number.MAX_SAFE_INTEGER))) : 0);
    }, 0);
    const thresholds = {
      trophy_echo_route: 3,
      famous_gear_route: 2,
      rival_trace_route: 2,
      debt_pressure_route: 3,
      board_echo_route: 3
    };
    const progress = revisitGateProgressClamp(signalScore, thresholds[safeKey] || 1);
    const progressLabel = progress.progressCurrent <= 0
      ? 'No signal yet'
      : progress.progressPercent >= 100
        ? 'Diagnostic cap reached'
        : progress.progressCurrent === 1
          ? 'Foundation signal noted'
          : 'Progress noted';
    return {
      routeKey: safeKey,
      gateType: meta.gateType || 'unknown',
      progressCurrent: progress.progressCurrent,
      progressRequired: progress.progressRequired,
      progressPercent: progress.progressPercent,
      progressLabel,
      diagnosticLabel: 'Gate Diagnostics',
      diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
      accessLabel: 'Route access is unavailable.',
      signals
    };
  }

  function revisitUnlockGateMeta(routeKey = '') {
    const key = String(routeKey || '');
    if (key === 'trophy_echo_route') {
      return {
        gateType: 'trophy',
        gateLabel: 'Trophy Echo',
        reason: 'Locked: Trophy Echo not ready',
        requirement: 'Build more boss history.',
        progressLabel: 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: 'Route access is unavailable.',
        source: 'trophy echo',
        previewState: 'preview',
        previewLabel: 'Future Unlock Preview',
        previewReason: 'Future boss history may reopen this path later.',
        previewRequirement: 'Build more boss history.',
        previewSafety: 'Preview only - route access is unavailable.'
      };
    }
    if (key === 'famous_gear_route') {
      return {
        gateType: 'famousGear',
        gateLabel: 'Famous Gear',
        reason: 'Locked: Famous Gear memory not ready',
        requirement: 'Build stronger gear memory.',
        progressLabel: 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: 'Route access is unavailable.',
        source: 'famous gear',
        previewState: 'locked',
        previewLabel: 'Still locked',
        previewReason: 'Future archive memory may shape this path later.',
        previewRequirement: 'Build stronger gear memory.',
        previewSafety: 'Preview only - route access is unavailable.'
      };
    }
    if (key === 'rival_trace_route') {
      return {
        gateType: 'rival',
        gateLabel: 'Rival Trace',
        reason: 'Locked: Rival Trace not ready',
        requirement: 'Build more rival history.',
        progressLabel: 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: 'Route access is unavailable.',
        source: 'rival trace',
        previewState: 'locked',
        previewLabel: 'Still locked',
        previewReason: 'Future rival history may sharpen this trace later.',
        previewRequirement: 'Build more rival history.',
        previewSafety: 'Preview only - route access is unavailable.'
      };
    }
    if (key === 'debt_pressure_route') {
      return {
        gateType: 'debt',
        gateLabel: 'Debt Pressure',
        reason: 'Locked: Debt Pressure not ready',
        requirement: 'Build more debt history.',
        progressLabel: 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: 'Route access is unavailable.',
        source: 'debt pressure',
        previewState: 'locked',
        previewLabel: 'Still locked',
        previewReason: 'Future ledger pressure may mark this district later.',
        previewRequirement: 'Build more debt history.',
        previewSafety: 'Preview only - route access is unavailable.'
      };
    }
    if (key === 'board_echo_route') {
      return {
        gateType: 'board',
        gateLabel: 'Board Echo',
        reason: 'Locked: Board Echo not ready',
        requirement: 'Build more board history.',
        progressLabel: 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: 'Route access is unavailable.',
        source: 'board echo',
        previewState: 'locked',
        previewLabel: 'Still locked',
        previewReason: 'Future board history may strengthen this echo later.',
        previewRequirement: 'Build more board history.',
        previewSafety: 'Preview only - route access is unavailable.'
      };
    }
    return {
      gateType: 'unknown',
      gateLabel: 'Unknown Gate',
      reason: 'Locked: Revisit gate not ready',
      requirement: 'Build more dungeon history.',
      progressLabel: 'No signal yet',
      diagnosticLabel: 'Gate Diagnostics',
      diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
      accessLabel: 'Route access is unavailable.',
      source: 'unknown',
      previewState: 'locked',
      previewLabel: 'Still locked',
      previewReason: 'Future route history may shape this path later.',
      previewRequirement: 'Build more dungeon history.',
      previewSafety: 'Preview only - route access is unavailable.'
    };
  }

  function revisitUnlockGates(state = S) {
    const routes = revisitRoutePreviews(revisitReadOnlyStateSnapshot(state));
    return asArray(routes, []).map(route => {
      const key = String(route?.key || 'unknown_route');
      const meta = revisitUnlockGateMeta(key);
      const sourceHooks = asArray(route?.hooks, []).map(hook => String(hook || '').trim()).filter(Boolean);
      const readiness = String(route?.readiness || 'Faint Trace');
      const preview = revisitUnlockPreview(state).find(entry => entry.key === key) || null;
      const progress = revisitGateProgressModel(key, state);
      return {
        key,
        label: String(route?.title || meta.gateLabel || 'Planned Route'),
        locked: true,
        gateType: meta.gateType,
        gateLabel: meta.gateLabel,
        ready: false,
        playable: false,
        reason: meta.reason,
        requirement: meta.requirement,
      progressCurrent: progress.progressCurrent,
      progressRequired: progress.progressRequired,
      progressPercent: progress.progressPercent,
      progressLabel: progress.progressLabel || meta.progressLabel || 'No signal yet',
      signals: progress.signals,
      diagnosticLabel: meta.diagnosticLabel || 'Gate Diagnostics',
      diagnosticDetail: meta.diagnosticDetail || 'Diagnostic only - future unlock rule inactive.',
      accessLabel: meta.accessLabel || 'Route access is unavailable.',
      source: sourceHooks.length ? sourceHooks.join(' / ') : String(route?.source || 'Unknown'),
        previewState: preview?.previewState || meta.previewState || 'locked',
        previewLabel: preview?.previewLabel || meta.previewLabel || 'Still locked',
        previewReason: preview?.previewReason || meta.previewReason || 'Future route history may shape this path later.',
        previewRequirement: preview?.previewRequirement || meta.previewRequirement || 'Build more dungeon history.',
        previewSafety: preview?.previewSafety || meta.previewSafety || 'Preview only - route access is unavailable.'
      };
    });
  }

  function revisitUnlockGateSummary(state = S) {
    const gates = revisitUnlockGates(state);
    const total = gates.length;
    const types = gates.reduce((acc, gate) => {
      const type = String(gate?.gateType || 'unknown');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      locked: total,
      ready: 0,
      playable: 0,
      progressAverage: total ? Math.floor(gates.reduce((sum, gate) => sum + Math.max(0, Math.floor(numberOr(gate?.progressPercent, 0, 0, 100))), 0) / total) : 0,
      progressNoted: gates.filter(gate => Math.max(0, Math.floor(numberOr(gate?.progressCurrent, 0, 0, Number.MAX_SAFE_INTEGER))) > 0).length,
      diagnosticOnly: true,
      accessAvailable: false,
      types
    };
  }

  function revisitRouteGateState(state = S, route = null) {
    const routeKey = String(route?.key || route || '');
    const routes = revisitRoutePreviews(revisitReadOnlyStateSnapshot(state));
    const preview = Array.isArray(routes) ? routes.find(entry => String(entry?.key || '') === routeKey) || null : null;
    const gateMeta = revisitUnlockGateMeta(routeKey);
    const routeContent = revisitRouteContentDefinitions()?.[routeKey] || null;
    const hasRoute = !!preview;
    const locked = true;
    const eligible = !!preview && !!gateMeta && !!routeContent;
    const enterable = false;
    const previewOnly = true;
    return {
      routeKey: routeKey || 'unknown_route',
      eligible,
      enterable,
      locked,
      reason: String(preview?.reason || gateMeta?.reason || routeContent?.reason || 'Route gate prepared.').trim(),
      requirementLabel: String(preview?.lockedReadinessNote || gateMeta?.requirement || routeContent?.lockedReadinessNote || 'Build more dungeon history.').trim(),
      safetyLabel: String(preview?.safetyStatusLine || gateMeta?.accessLabel || 'Route access is unavailable.').trim(),
      previewOnly,
      routeTitle: String(preview?.title || routeContent?.title || gateMeta?.gateLabel || 'Route Preview').trim(),
      gateLabel: String(gateMeta?.gateLabel || routeContent?.title || 'Route Gate').trim(),
      statusLabel: enterable ? 'Entry Ready' : (hasRoute ? 'Entry Locked' : 'Gate Prepared'),
      sourceLabel: String(preview?.hookSource || routeContent?.hookSource || gateMeta?.source || '').trim(),
      previewState: String(preview?.status || gateMeta?.previewState || 'locked').trim(),
      routeFound: hasRoute,
      gatedBy: String(gateMeta?.gateType || 'unknown').trim()
    };
  }

  function revisitRouteGateSummary(state = S) {
    const routes = revisitRoutePreviews(state);
    const gates = routes.map(route => revisitRouteGateState(state, route));
    return {
      total: gates.length,
      eligible: gates.filter(entry => entry.eligible).length,
      enterable: gates.filter(entry => entry.enterable).length,
      locked: gates.filter(entry => entry.locked).length,
      previewOnly: gates.every(entry => entry.previewOnly),
      routes
    };
  }

  function canEnterRevisitRoute(state = S, routeKey = '') {
    return !!revisitRouteGateState(state, routeKey).enterable;
  }

  function explainRevisitRouteGate(state = S, routeKey = '') {
    return revisitRouteGateState(state, routeKey);
  }

  function revisitUnlockPreview(state = S) {
    const routeDefs = [
      { key: 'trophy_echo_route', previewState: 'preview', previewLabel: 'Future Unlock Preview', previewReason: 'Future boss history may reopen this path later.', previewRequirement: 'Build more boss history.' },
      { key: 'famous_gear_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future archive memory may shape this path later.', previewRequirement: 'Build stronger gear memory.' },
      { key: 'rival_trace_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future rival history may sharpen this trace later.', previewRequirement: 'Build more rival history.' },
      { key: 'debt_pressure_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future ledger pressure may mark this district later.', previewRequirement: 'Build more debt history.' },
      { key: 'board_echo_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future board history may strengthen this echo later.', previewRequirement: 'Build more board history.' }
    ];
    return routeDefs.map(def => {
      return {
        key: def.key,
        previewState: def.previewState,
        previewLabel: def.previewLabel,
        previewReason: def.previewReason,
        previewRequirement: def.previewRequirement,
        previewSafety: 'Preview only - route access is unavailable.',
        locked: true,
        playable: false
      };
    });
  }

  function revisitUnlockPreviewSummary(state = S) {
    const previews = revisitUnlockPreview(state);
    return {
      total: previews.length,
      preview: previews.filter(entry => entry.previewState === 'preview').length,
      locked: previews.length,
      playable: 0
    };
  }

  function revisitRouteContentDefinitions() {
    return {
      trophy_echo_route: {
        title: 'Trophy Echo Route',
        district: 'Trophy record districts',
        hookSource: 'trophy_echo',
        shortDescription: 'Boss history leaves a return trail.',
        routeFlavorLine: 'Old victories still mark the path.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs more boss history.',
        reason: 'Old victories may call back later.'
      },
      famous_gear_route: {
        title: 'Famous Gear Memory Route',
        district: 'Archive memory districts',
        hookSource: 'famous_gear_memory',
        shortDescription: 'Retired gear remembers the route.',
        routeFlavorLine: 'Notable gear keeps the old turn.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs stronger gear memory.',
        reason: 'Retired gear may remember old ground.'
      },
      rival_trace_route: {
        title: 'Rival Trace Route',
        district: 'Board and rival districts',
        hookSource: 'rival_trace / board_echo',
        shortDescription: 'A rival trace runs through old districts.',
        routeFlavorLine: 'Rivals leave a sharp trail.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs more rival history.',
        reason: 'A rival path may cross earlier districts.'
      },
      debt_pressure_route: {
        title: 'Debt Pressure Route',
        district: 'Ledger districts',
        hookSource: 'debt_pressure',
        shortDescription: 'Ledger pressure marks an old trail.',
        routeFlavorLine: 'Every ledger mark points back.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs more debt history.',
        reason: 'The ledger may point back to safer work.'
      },
      board_echo_route: {
        title: 'Board Echo Route',
        district: 'Contract history districts',
        hookSource: 'board_echo',
        shortDescription: 'Old board contracts echo as a route.',
        routeFlavorLine: 'Paid marks can still linger.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs more board history.',
        reason: 'Contract history may reopen old roads.'
      }
    };
  }

  function hydrateRevisitRoutePreview(route = {}, fallbackHookLabels = []) {
    const definitions = revisitRouteContentDefinitions();
    const def = definitions[String(route?.key || '').trim()] || {};
    const hookLabels = Array.isArray(route?.hooks) ? route.hooks.filter(Boolean) : [];
    const sourceLabels = Array.isArray(fallbackHookLabels) ? fallbackHookLabels.filter(Boolean) : [];
    return {
      ...route,
      title: String(route?.title || def.title || 'Return Route').trim(),
      district: String(route?.district || def.district || 'Earlier district band').trim(),
      reason: String(route?.reason || def.reason || 'Return route preview only.').trim(),
      hookSource: String(route?.hookSource || def.hookSource || sourceLabels.join(' / ') || hookLabels.join(' / ') || 'unknown').trim(),
      shortDescription: String(route?.shortDescription || def.shortDescription || 'Side route preview only.').trim(),
      routeFlavorLine: String(route?.routeFlavorLine || def.routeFlavorLine || 'Read-only route note.').trim(),
      safetyStatusLine: String(route?.safetyStatusLine || def.safetyStatusLine || 'Locked preview. No route access.').trim(),
      lockedReadinessNote: String(route?.lockedReadinessNote || def.lockedReadinessNote || 'Needs more dungeon history.').trim()
    };
  }

  function revisitRoutePreviews(state = S) {
    const hooks = revisitCandidateHooks(state);
    if (!Array.isArray(hooks) || !hooks.length) return [];
    const sourceHooks = hooks.filter(hook => hook && typeof hook === 'object');
    const routeDefs = [
      {
        key: 'trophy_echo_route',
        title: 'Trophy Echo Route',
        district: 'Trophy record districts',
        reason: 'Old victories may call back later.',
        hooks: ['trophy_echo'],
        status: 'Planned',
        locked: true,
        priority: 10,
        hookSource: 'trophy_echo'
      },
      {
        key: 'famous_gear_route',
        title: 'Famous Gear Memory Route',
        district: 'Archive memory districts',
        reason: 'Retired gear may remember old ground.',
        hooks: ['famous_gear_memory'],
        status: 'Future Route',
        locked: true,
        priority: 20,
        hookSource: 'famous_gear_memory'
      },
      {
        key: 'rival_trace_route',
        title: 'Rival Trace Route',
        district: 'Board and rival districts',
        reason: 'A rival path may cross earlier districts.',
        hooks: ['rival_trace', 'board_echo'],
        status: 'Locked',
        locked: true,
        priority: 30,
        hookSource: 'rival_trace / board_echo'
      },
      {
        key: 'debt_pressure_route',
        title: 'Debt Pressure Route',
        district: 'Ledger districts',
        reason: 'The ledger may point back to safer work.',
        hooks: ['debt_pressure'],
        status: 'Locked',
        locked: true,
        priority: 40,
        hookSource: 'debt_pressure'
      },
      {
        key: 'board_echo_route',
        title: 'Board Echo Route',
        district: 'Contract history districts',
        reason: 'Contract history may reopen old roads.',
        hooks: ['board_echo'],
        status: 'Planned',
        locked: true,
        priority: 50,
        hookSource: 'board_echo'
      }
    ];
    const byKey = new Map(sourceHooks.map(hook => [hook.key, hook]));
    return routeDefs
      .map(route => {
        const routeHooks = route.hooks.map(key => byKey.get(key)).filter(Boolean);
        if (!routeHooks.length) return null;
        const topHook = routeHooks[0];
        const criteriaStub = revisitRouteUnlockCriteriaStub(route.key, routeHooks.map(hook => hook.key));
        return hydrateRevisitRoutePreview({
          key: String(route.key || '').trim(),
          title: String(route.title || '').trim(),
          district: String(route.district || '').trim(),
          reason: String(route.reason || '').trim(),
          hooks: routeHooks.map(hook => String(hook.label || '').trim()).filter(Boolean),
          hookSource: String(route.hookSource || '').trim(),
          shortDescription: route.key === 'trophy_echo_route'
            ? 'Boss history leaves a return trail.'
            : route.key === 'famous_gear_route'
              ? 'Retired gear remembers the route.'
              : route.key === 'rival_trace_route'
                ? 'A rival trace runs through old districts.'
                : route.key === 'debt_pressure_route'
                  ? 'Ledger pressure marks an old trail.'
                  : route.key === 'board_echo_route'
                    ? 'Old board contracts echo as a route.'
                    : 'Side route preview only.',
          routeFlavorLine: route.key === 'trophy_echo_route'
            ? 'Old victories still mark the path.'
            : route.key === 'famous_gear_route'
              ? 'Notable gear keeps the old turn.'
              : route.key === 'rival_trace_route'
                ? 'Rivals leave a sharp trail.'
                : route.key === 'debt_pressure_route'
                  ? 'Every ledger mark points back.'
                  : route.key === 'board_echo_route'
                    ? 'Paid marks can still linger.'
                    : 'Read-only route note.',
          safetyStatusLine: 'Locked preview. No route access.',
          lockedReadinessNote: route.key === 'trophy_echo_route'
            ? 'Needs more boss history.'
            : route.key === 'famous_gear_route'
              ? 'Needs stronger gear memory.'
              : route.key === 'rival_trace_route'
                ? 'Needs more rival history.'
                : route.key === 'debt_pressure_route'
                  ? 'Needs more debt history.'
                  : route.key === 'board_echo_route'
                    ? 'Needs more board history.'
                    : 'Needs more dungeon history.',
          status: String(route.status || 'Locked').trim(),
          locked: true,
          priority: Math.max(0, Math.floor(numberOr(route.priority, topHook.priority || 0, 0, Number.MAX_SAFE_INTEGER))),
          criteria: criteriaStub.criteria,
          criteriaNote: criteriaStub.note,
          readiness: revisitRouteReadiness({ ...route, criteria: criteriaStub.criteria }, routeHooks)
        }, routeHooks.map(hook => hook.key));
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  function revisitRouteSummary(state = S) {
    const routes = revisitRoutePreviews(state);
    return {
      total: routes.length,
      planned: routes.filter(route => route.status === 'Planned').length,
      future: routes.filter(route => route.status === 'Future Route').length,
      locked: routes.filter(route => route.locked).length
    };
  }

  function revisitRouteActivationPlan(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const allowedFutureRouteStates = ['locked', 'planned', 'eligible-preview', 'playable-later'];
    const stableHookSources = {
      trophy_echo_route: 'Trophy Echo',
      famous_gear_route: 'Famous Gear Memory',
      rival_trace_route: 'Rival Trace',
      debt_pressure_route: 'Debt Pressure',
      board_echo_route: 'Board Echo'
    };
    const eligibleRoutes = routes.filter(route => route && typeof route === 'object').map(route => {
      const key = String(route.key || '').trim();
      const status = String(route.status || 'Locked').trim();
      return {
        key,
        title: String(route.title || 'Return Route').trim(),
        hookSource: String(route.hookSource || stableHookSources[key] || 'unknown').trim(),
        status,
        locked: true,
        planned: status === 'Planned' || status === 'Future Route',
        eligibilityState: status === 'Planned' ? 'eligible-preview' : 'playable-later',
        optionalSideContent: true,
        primaryPathPreserved: true,
        readOnly: true,
        entryAvailable: false,
        rewardAvailable: false,
        completionAvailable: false,
        sourceHistoryOnly: true
      };
    });
    return {
      contractId: 'revisit_route_activation_contract_v1',
      status: 'Planning only',
      locked: true,
      readOnly: true,
      entryAvailable: false,
      rewardAvailable: false,
      completionAvailable: false,
      primaryPath: 'Enter Dungeon / Continue Run',
      optionalSideContent: true,
      allowedFutureRouteStates,
      stableHookSources: ['Trophy Echo', 'Famous Gear Memory', 'Rival Trace', 'Debt Pressure', 'Board Echo'],
      routeStates: eligibleRoutes.map(route => ({
        key: route.key,
        hookSource: route.hookSource,
        state: route.eligibilityState
      })),
      eligibleRoutes
    };
  }

  function revisitRouteActivationSummary(state = S) {
    const plan = revisitRouteActivationPlan(state);
    const routeStates = asArray(plan?.routeStates, []);
    const eligibleRoutes = asArray(plan?.eligibleRoutes, []);
    return {
      contractId: String(plan?.contractId || 'revisit_route_activation_contract_v1'),
      allowedStates: asArray(plan?.allowedFutureRouteStates, ['locked', 'planned', 'eligible-preview', 'playable-later']).slice(),
      currentLockedCount: routeStates.length,
      currentPlayableCount: 0,
      currentPreviewOnly: true,
      hasLiveEntry: false,
      hasRewards: false,
      hasCompletion: false,
      status: String(plan?.status || 'Planning only'),
      note: 'Preview-state vocabulary only. No route entry, reward, or completion is exposed.',
      routeStateCount: routeStates.length,
      eligibleRouteCount: eligibleRoutes.length
    };
  }

  function revisitRoutePreviewStateSummary(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const routeSummary = revisitRouteSummary(safeState);
    const allowedStates = ['locked', 'planned', 'eligible-preview', 'playable-later'];
    const stableHookLabels = Array.from(new Set(routes.map(route => String(route?.hookSource || '').trim()).filter(Boolean)));
    return {
      contractId: 'revisit_route_preview_state_summary_v1',
      allowedStates,
      totalPreviewCount: routes.length,
      lockedPreviewCount: routeSummary?.locked ?? routes.filter(route => route && route.locked).length,
      playablePreviewCount: 0,
      currentPreviewOnly: true,
      hasLiveEntry: false,
      hasRewards: false,
      hasCompletion: false,
      stableHookLabels,
      note: 'Route-preview mirror only. No live entry, reward, or completion is exposed.'
    };
  }

  function revisitFirstActivationLane(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const trophyRoute = routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null;
    return {
      laneKey: 'trophy-echo',
      laneLabel: 'Trophy Echo',
      sourceHook: 'Trophy Echo',
      currentStatus: 'planned',
      previewOnly: true,
      hasLiveEntry: false,
      hasRewards: false,
      hasCompletion: false,
      routeKey: 'trophy_echo_route',
      routeLabel: String(trophyRoute?.title || 'Trophy Echo Route'),
      reason: 'Derived from existing boss and trophy history only.',
      note: 'First planned revisit lane. Planning only.',
      allowedStates: ['locked', 'planned', 'eligible-preview', 'playable-later']
    };
  }

  function canStartRevisitRoute(state = S, routeKey = '') {
    if (!state || typeof state !== 'object') return false;
    if (!state.player || typeof state.player !== 'object') return false;
    const safeKey = String(routeKey || '').trim();
    if (!safeKey) return false;
    const revisitState = state.player.revisitState && typeof state.player.revisitState === 'object' ? state.player.revisitState : {};
    if (revisitState.locked !== false) return false;
    const routes = revisitRoutePreviews(state);
    const route = routes.find(r => String(r?.key || '') === safeKey);
    if (!route) return false;
    if (route.locked !== false) return false;
    return true;
  }

  function startRevisitRoute(state = S, routeKey = '') {
    if (!canStartRevisitRoute(state, routeKey)) return null;
    if (!state?.player) return null;
    const safeKey = String(routeKey || '').trim();
    const currentFloor = Math.max(0, Math.floor(numberOr(state?.player?.depth, state?.run?.floor || 0, 0, 999999)));
    const routes = revisitRoutePreviews(state);
    const route = routes.find(r => String(r?.key || '') === safeKey);
    if (!route) return null;
    const revisitState = state.player.revisitState && typeof state.player.revisitState === 'object' ? state.player.revisitState : {};
    revisitState.activeRouteKey = safeKey;
    revisitState.startedAt = Date.now();
    revisitState.sourceFloor = currentFloor;
    revisitState.sideRoute = true;
    revisitState.locked = false;
    revisitState.cappedReward = true;
    state.player.revisitState = revisitState;
    return {
      routeKey: safeKey,
      routeTitle: String(route?.title || 'Return Route'),
      startedAt: revisitState.startedAt,
      sourceFloor: revisitState.sourceFloor,
      sideRoute: true,
      locked: false,
      cappedReward: true
    };
  }

  function activeRevisitRouteSummary(state = S) {
    if (!state?.player) return null;
    const revisitState = state.player.revisitState && typeof state.player.revisitState === 'object' ? state.player.revisitState : {};
    if (!revisitState.activeRouteKey) return null;
    const safeKey = String(revisitState.activeRouteKey || '').trim();
    const routes = revisitRoutePreviews(state);
    const route = routes.find(r => String(r?.key || '') === safeKey);
    if (!route) return null;
    return {
      routeKey: safeKey,
      routeTitle: String(route?.title || 'Return Route'),
      district: String(route?.district || ''),
      startedAt: Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      sourceFloor: Math.max(0, Math.floor(numberOr(revisitState.sourceFloor, 0, 0, 999999))),
      sideRoute: !!revisitState.sideRoute,
      locked: revisitState.locked !== false,
      cappedReward: revisitState.cappedReward !== false
    };
  }

  function ensureEliteContractState(state) {
    if (!state.player) state.player = {};
    state.player.eliteContracts = validateEliteBoardState(state);
    return state.player.eliteContracts;
  }

  function ensureEliteRivalState(state) {
    const contracts = ensureEliteContractState(state);
    contracts.rivals = createEliteRivalState(contracts.rivals);
    return contracts.rivals;
  }

  function availableEliteRivals(state) {
    return ensureEliteRivalState(state).filter(rival => rival.revengeAvailable && !rival.completed).slice(0, 3);
  }

  function rivalDeathLocation(state, active) {
    const rawDepth = Math.max(1, Math.floor(numberOr(state?.run?.floor, active?.targetFloor || 1, 1, 999999)));
    if (typeof getLoreDepthProgress === 'function') {
      const lore = getLoreDepthProgress(rawDepth);
      return `Floor ${format(lore.floorNumber)} • Room ${format(lore.roomWithinFloor)} • Chapter ${format(lore.chapterWithinRoom)}`;
    }
    return active?.targetLocation || `Floor ${format(rawDepth)}`;
  }

  function rememberEliteRivalDeath(state, activeContract, killer = null) {
    if (!activeContract || !killer?.contractTarget || killer.contractId !== activeContract.id) return null;
    const rivals = ensureEliteRivalState(state);
    const eliteName = String(activeContract.eliteName || killer.name || 'Rival Elite').trim();
    const location = rivalDeathLocation(state, activeContract);
    const rawDepth = Math.max(0, Math.floor(numberOr(state?.run?.floor, activeContract.targetFloor || 0, 0, 999999)));
    let rival = rivals.find(entry => !entry.completed && String(entry.eliteName || '').toLowerCase() === eliteName.toLowerCase());
    if (rival) {
      rival.defeats = Math.max(1, Math.floor(numberOr(rival.defeats, 1, 1, 9999)) + 1);
      rival.killedPlayerAtChapter = rawDepth;
      rival.killedPlayerAtLocation = location;
      rival.floorName = activeContract.district || rival.floorName || 'Elite Board';
      rival.revengeAvailable = true;
      rival.updatedAt = Date.now();
    } else {
      rival = {
        id: eliteRivalId(eliteName),
        eliteName,
        floorName: activeContract.district || 'Elite Board',
        sourceContractId: normalizeEliteContractId(activeContract.sourceContractId || activeContract.id) || activeContract.id,
        killedPlayerAtChapter: rawDepth,
        killedPlayerAtLocation: location,
        defeats: 1,
        revengeAvailable: true,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      rivals.unshift(rival);
      rivals.splice(12);
    }
    pushLog(state, `Rival remembered: ${eliteName}. Killed you ${format(rival.defeats)} time${rival.defeats === 1 ? '' : 's'}. Last seen: ${location}.`);
    return rival;
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
    const offer = eliteContractOfferModel(state, contract.id);
    const model = eliteBoardContractModel(contract, state, true, offer);
    contracts.active = {
      id: contract.id,
      rivalId: '',
      rivalContract: false,
      sourceContractId: contract.id,
      name: contract.name,
      tier: contract.tier || '',
      eliteName: model.eliteName,
      title: model.title,
      district: model.district,
      targetFloor: model.targetFloor,
      threat: model.threat,
      modifier: '',
      modifierKey: '',
      contractText: model.contractText,
      bonusWrit: model.bonusWrit,
      bonusWritType: model.bonusWritType,
      targetLocation: model.targetLocation,
      rewardPreview: model.rewardPreview,
      flavor: model.flavor,
      accepted: true,
      completed: false,
      expired: false,
      failed: false,
      status: 'active',
      targetSpawned: false,
      targetDefeated: false,
      spawnedAtFloor: 0,
      progress: 0,
      goal: 1,
      rewardAmount: calculateContractReward(contract, state),
      complete: false,
      claimable: false,
      claimed: false,
      bonusRested: false,
      bonusExtracted: false,
      bonusGuardUses: 0,
      bonusWritCompleted: false,
      bonusWritMissed: false,
      bonusWritFailed: false,
      bonusWritRewardPaid: false,
      bonusBossReached: false
    };
    pushLog(state, `Elite contract accepted: ${model.eliteName}. Target: Floor ${format(model.targetFloor)}.`);
    return true;
  }

  function startEliteRivalContract(state, rivalId) {
    const contracts = ensureEliteContractState(state);
    if (contracts.active) return false;
    contracts.rivals = createEliteRivalState(contracts.rivals);
    const rival = contracts.rivals.find(entry => entry.id === rivalId && entry.revengeAvailable && !entry.completed);
    if (!rival) return false;
    const contract = eliteContractDef(normalizeEliteContractId(rival.sourceContractId)) || eliteContractDef('lowfire_bounty') || ELITE_CONTRACTS[0];
    if (!contract) return false;
    const targetFloor = eliteContractTargetFloor(state);
    const baseReward = calculateContractReward(contract, state);
    const rewardAmount = sanitizeContractReward(contract, Math.round(baseReward * 1.10), { capMultiplier: 1.10 });
    contracts.active = {
      id: contract.id,
      rivalId: rival.id,
      rivalContract: true,
      sourceContractId: contract.id,
      name: contract.name,
      tier: 'Rival Writ',
      eliteName: rival.eliteName,
      title: `RIVAL SIGHTED: ${rival.eliteName}`,
      district: rival.floorName || contract.district || '',
      targetFloor,
      threat: Math.max(1, Math.min(3, Math.floor(numberOr(contract.threat, 1, 1, 3)) + 1)),
      modifier: '',
      modifierKey: '',
      contractText: `Defeat ${rival.eliteName} and reclaim the writ.`,
      bonusWrit: contract.bonusWrit || 'Defeat it before resting.',
      bonusWritType: contract.bonusWritType || 'rest',
      targetLocation: eliteContractTargetLocationLabel(targetFloor),
      killedPlayerAtLocation: rival.killedPlayerAtLocation || '',
      rivalDefeats: Math.max(1, Math.floor(numberOr(rival.defeats, 1, 1, 9999))),
      rewardPreview: '+silver, +rare chance, trophy chance',
      flavor: `This rival killed you at ${rival.killedPlayerAtLocation || 'an unknown floor'}. Lowfire has reposted the name.`,
      accepted: true,
      completed: false,
      expired: false,
      failed: false,
      status: 'active',
      targetSpawned: false,
      targetDefeated: false,
      spawnedAtFloor: 0,
      progress: 0,
      goal: 1,
      rewardAmount,
      complete: false,
      claimable: false,
      claimed: false,
      bonusRested: false,
      bonusExtracted: false,
      bonusGuardUses: 0,
      bonusWritCompleted: false,
      bonusWritMissed: false,
      bonusWritFailed: false,
      bonusWritRewardPaid: false,
      bonusBossReached: false
    };
    pushLog(state, `Rival contract accepted: ${rival.eliteName}. Last seen: ${rival.killedPlayerAtLocation || 'unknown floor'}.`);
    return true;
  }

  function resolveEliteRivalContract(state, active) {
    if (!active?.rivalId) return false;
    const rivals = ensureEliteRivalState(state);
    const rival = rivals.find(entry => entry.id === active.rivalId);
    if (!rival) return false;
    rival.completed = true;
    rival.revengeAvailable = false;
    rival.updatedAt = Date.now();
    pushCombat(state, `Rival defeated: ${active.eliteName}. The board scratches its name from the writ.`);
    pushLog(state, `Rival defeated: ${active.eliteName}.`);
    return true;
  }

  function recordEliteContractKill(state, options = {}) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete || active.failed || active.expired) return false;

    const contract = eliteContractDef(active.id);
    if (!contract) {
      contracts.active = null;
      return false;
    }

    if (!options.contractTarget) return false;

    active.goal = 1;
    active.name = contract.name;
    active.tier = contract.tier || '';
    active.rewardAmount = activeContractRewardAmount(active, contract, state);
    active.progress = 1;
    active.targetDefeated = true;
    active.bonusWritCompleted = evaluateEliteBonusWrit(active, state, options);
    active.bonusWritMissed = !active.bonusWritCompleted;
    active.bonusWritFailed = active.bonusWritMissed;
    if (active.progress >= 1) {
      active.complete = true;
      active.completed = true;
      active.claimable = true;
      active.status = 'completed';
      if (!active.rivalContract && !contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
      const trophyChance = eliteTrophyRollChance(active, contract, state);
      const trophyRolled = Math.random() < trophyChance;
      const trophyContract = active.rivalContract ? { ...contract, eliteName: active.eliteName, district: active.district } : contract;
      const trophyResult = trophyRolled ? awardEliteTrophy(state, trophyContract, { log:false }) : null;
      const writLine = active.bonusWritCompleted ? 'Bonus Writ completed. Extra pay ready.' : 'Bonus Writ missed. No extra pay.';
      const trophyLine = trophyResult?.awarded
        ? `Trophy found: ${trophyResult.trophy.name}.`
        : trophyRolled && trophyResult?.duplicate
          ? `Trophy duplicate found: ${trophyResult.trophy.name} x${trophyResult.trophy.count}.`
          : 'Trophy roll: no trophy found.';
      if (active.rivalContract) resolveEliteRivalContract(state, active);
      pushCombat(state, `Contract fulfilled: ${active.eliteName}. ${writLine} ${trophyLine}`);
      pushLog(state, `Elite reward ladder: ${active.eliteName}. ${writLine} ${trophyLine}`);
    }
    return true;
  }

  function evaluateEliteBonusWrit(active, state, options = {}) {
    if (!active) return false;
    const type = String(active.bonusWritType || '').toLowerCase();
    const count = name => Math.floor(numberOr(active[name], 0, 0, 999));
    const playerHp = numberOr(state?.player?.hp, 0, 0, Number.MAX_SAFE_INTEGER);
    const playerMaxHp = Math.max(1, numberOr(state?.player?.maxHp, 1, 1, Number.MAX_SAFE_INTEGER));
    if (type === 'rest') return !active.bonusRested;
    if (type === 'extract') return !active.bonusExtracted;
    if (type === 'guard') return count('bonusGuardUses') <= 2;
    if (type === 'boss') {
      const targetFloor = Math.max(1, Math.floor(numberOr(active.targetFloor, 1, 1, 999999)));
      const currentFloor = Math.max(1, Math.floor(threatDepthFromDepth(state?.run?.floor || reachedDistrictFloor(state))));
      return currentFloor < eliteContractNextBossFloor(targetFloor);
    }
    if (type === 'hp') return playerHp > playerMaxHp * 0.5;
    if (String(options.action || '').toLowerCase() === 'rest') return !active.bonusRested;
    if (String(options.action || '').toLowerCase() === 'extract') return !active.bonusExtracted;
    return true;
  }

  function completeEliteContractTarget(state, monster) {
    const active = ensureEliteContractState(state).active;
    if (!active || !monster?.contractTarget || monster.contractId !== active.id) return false;
    return recordEliteContractKill(state, { contractTarget:true });
  }

  function failEliteContract(state, reason = 'failed', options = {}) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.completed || active.complete) return false;
    active.failed = reason === 'failed';
    active.expired = reason === 'expired';
    active.status = reason === 'expired' ? 'expired' : 'failed';
    if (options.note) active.failureNote = String(options.note);
    if (options.kind) active.failureKind = String(options.kind);
    const snapshot = eliteContractSnapshot(active, active.status);
    if (snapshot) {
      const list = active.expired ? contracts.expired : contracts.failed;
      list.unshift(snapshot);
      list.splice(20);
    }
    const note = active.failureNote ? ` ${active.failureNote}` : '';
    const logLine = active.expired
      ? `Contract expired: ${active.eliteName}.`
      : `Contract failed: ${active.eliteName}.${note}`;
    pushLog(state, logLine);
    if (options.combatLine) pushCombat(state, String(options.combatLine));
    contracts.active = null;
    return true;
  }

  function failActiveEliteContractOnDeath(state, killer = null) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.completed || active.complete) return false;
    const rival = killer?.contractTarget && killer.contractId === active.id ? rememberEliteRivalDeath(state, active, killer) : null;
    const note = rival
      ? `The board reclaimed the writ after your fall. Rival remembered: ${rival.eliteName}.`
      : 'The board reclaimed the writ after your fall. No rival was recorded.';
    const combatLine = `Contract failed: ${active.eliteName}. ${rival ? `Rival remembered: ${rival.eliteName}.` : 'No rival was recorded.'}`;
    return failEliteContract(state, 'failed', { note, kind:'death', combatLine });
  }

  function expireOverdueEliteContract(state) {
    const active = ensureEliteContractState(state).active;
    if (!active || active.completed || active.complete || active.targetSpawned) return false;
    const current = Math.floor(threatDepthFromDepth(state?.run?.floor || reachedDistrictFloor(state)));
    if (current <= Math.floor(numberOr(active.targetFloor, current + 1, 1, 999999))) return false;
    return failEliteContract(state, 'expired');
  }

  function activeEliteContractHunt(state) {
    const active = ensureEliteContractState(state).active;
    if (!active || active.completed || active.complete || active.failed || active.expired) return null;
    return active;
  }

  function eliteContractTargetDue(state, rawDepth) {
    const active = activeEliteContractHunt(state);
    if (!active || active.targetSpawned) return null;
    const currentFloor = Math.floor(threatDepthFromDepth(rawDepth));
    const targetFloor = Math.floor(numberOr(active.targetFloor, 0, 1, 999999));
    if (currentFloor > targetFloor) {
      expireOverdueEliteContract(state);
      return null;
    }
    if (currentFloor !== targetFloor) return null;
    const bossInterval = Math.max(1, Math.floor(numberOr(BOSS_INTERVAL, 5, 1, 999)));
    if (currentFloor % bossInterval === 0) return null;
    return active;
  }

  function eliteContractTargetScaling(active) {
    const targetFloor = Math.max(1, Math.floor(numberOr(active?.targetFloor, 1, 1, 999999)));
    const early = targetFloor < 20;
    const rivalHpBonus = active?.rivalContract ? 1.15 : 1;
    return {
      hp: (early ? 1.25 : 1.35) * rivalHpBonus,
      power: 1,
      reward: 1.35
    };
  }

  function applyEliteContractTargetMonster(state, monster, active = null) {
    const hunt = active || activeEliteContractHunt(state);
    if (!hunt || !monster) return monster;
    const scaling = eliteContractTargetScaling(hunt);
    hunt.targetSpawned = true;
    hunt.status = 'active';
    hunt.targetLocation = eliteContractTargetLocationLabel(hunt.targetFloor);
    hunt.spawnedAtFloor = Math.floor(threatDepthFromDepth(monster.level || state?.run?.floor || 1));
    monster.name = hunt.eliteName;
    monster.family = hunt.rivalContract ? 'Rival Elite' : 'Elite Hunt';
    monster.type = hunt.rivalContract ? 'Rival Contract' : 'Contract';
    monster.affix = '';
    monster.tier = 'Elite';
    monster.contractTarget = true;
    monster.contractId = hunt.id;
    monster.contractEliteName = hunt.eliteName;
    monster.rivalTarget = !!hunt.rivalContract;
    monster.rivalId = hunt.rivalId || '';
    monster.contractModifierName = '';
    monster.bonusWritType = hunt.bonusWritType || '';
    monster.contractTargetFloor = hunt.targetFloor;
    monster.contractHpMult = scaling.hp;
    monster.contractPowerMult = scaling.power;
    monster.contractRewardMult = scaling.reward;
    monster.modifier = null;
    monster.modifiers = [];
    monster.eliteReward = null;
    monster.maxHp = Math.max(1, Math.round(numberOr(monster.maxHp, monster.hp || 1, 1, 999999) * scaling.hp));
    monster.hp = monster.maxHp;
    monster.rewardGold = Math.max(0, Math.round(numberOr(monster.rewardGold, 0, 0, Number.MAX_SAFE_INTEGER) * scaling.reward));
    monster.rewardXp = Math.max(0, Math.round(numberOr(monster.rewardXp, 0, 0, 999999) * 1.18));
    monster.rewardShard = Math.max(1, Math.round(numberOr(monster.rewardShard, 1, 0, 999999) + 2));
    monster.lore = `${hunt.rivalContract ? 'Rival Elite' : 'Contract Elite'}: ${hunt.contractText || `Defeat ${hunt.eliteName}.`}`;
    return monster;
  }

  function resolveEliteContractCompletion(state, active, contract) {
    if (!active || !contract || active.bonusWritRewardPaid || active.failed || active.expired) return 0;
    const trophyBonus = getEliteTrophyPayoutBonus(state);
    const bonusAmount = active.bonusWritCompleted ? eliteContractBonusWritReward(active, contract, state) : 0;
    active.bonusWritRewardPaid = true;
    if (bonusAmount > 0 && addPlayerGold(state, bonusAmount)) {
      pushLog(state, `Bonus Writ payout: ${contract.name} paid ${stripHtml(formatMoney(bonusAmount))}.`);
      if (trophyBonus > 0) {
        pushLog(state, `Trophy Bonus Preview: +${trophyBonus}% board payout from ${Object.keys(ensureEliteTrophyState(state).collected || {}).length} unique trophies (display only).`);
      }
      return bonusAmount;
    }
    return 0;
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
    const bonusAmount = resolveEliteContractCompletion(state, active, contract);
    if (!active.rivalContract && !contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
    if (!active.rivalContract && !contracts.claimed.includes(contract.id)) contracts.claimed.push(contract.id);
    contracts.active = null;
    const paymentName = active.rivalContract ? `Rival ${active.eliteName}` : active.eliteName || contract.name;
    const mainLine = active.rivalContract
      ? `Rival reward claimed: ${paymentName} paid ${stripHtml(formatMoney(rewardAmount))}.`
      : `Main contract reward claimed: ${paymentName} paid ${stripHtml(formatMoney(rewardAmount))}.`;
    const bonusLine = active.bonusWritCompleted
      ? ` Bonus Writ completed. Lowfire paid extra ${stripHtml(formatMoney(bonusAmount))}.`
      : active.bonusWritMissed
        ? ' Bonus Writ missed. No extra pay.'
        : '';
    pushLog(state, `${mainLine}${bonusLine}`);
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

  function canRetireInventoryItem(state, item) {
    if (!item || item.kind === 'special') return false;
    if (!item.slot) return false;
    if (item.locked || item.favorite || item.protected) return false;
    const tags = asArray(item.tags, []).map(tag => String(tag).toLowerCase());
    if (tags.includes('protected') || tags.includes('special')) return false;
    if (itemIsEquipped(state, item)) return false;
    return true;
  }

  function createRetiredRelicRecordFromItem(state, item, source) {
    if (!item || !state?.player) return null;
    const rawDepth = Math.max(1, Math.floor(numberOr(state.player.safeExtractDepth, state.player.depth, 1, 999999)));
    const depthLabel = typeof getLoreDepthProgress === 'function'
      ? getLoreDepthProgress(rawDepth)
      : { floorNumber: rawDepth, roomWithinFloor: 1, chapterWithinRoom: 1 };
    const snapshot = typeof structuredClone === 'function'
      ? structuredClone(item)
      : JSON.parse(JSON.stringify(item));
    return {
      id: `retired_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      archivedAt: Date.now(),
      stamp: new Date().toLocaleString(),
      rawDepth,
      floor: Math.max(1, Math.floor(numberOr(depthLabel.floorNumber, 1, 1, 999999))),
      room: Math.max(1, Math.floor(numberOr(depthLabel.roomWithinFloor, 1, 1, 999999))),
      chapter: Math.max(1, Math.floor(numberOr(depthLabel.chapterWithinRoom, 1, 1, 999999))),
      slot: String(item.slot || 'weapon'),
      rarity: String(item.rarity || 'common'),
      itemLevel: Math.max(1, Math.floor(numberOr(item.level, 1, 1, 99999))),
      rating: Math.max(1, Math.floor(numberOr(item.rating, 1, 1, 999999))),
      value: Math.max(1, Math.floor(numberOr(item.value, 1, 1, Number.MAX_SAFE_INTEGER))),
      source: source || 'Manual Retirement',
      note: 'Manually retired into the Archive. No combat bonus granted.',
      item: snapshot
    };
  }

  function retireInventoryItem(state, itemId) {
    if (!state?.player) return { ok:false, reason:'state unavailable' };
    const inventory = asArray(state.player.inventory, []);
    const cleanId = String(itemId || '').trim();
    if (!cleanId) return { ok:false, reason:'missing item id' };
    const index = inventory.findIndex(item => isPlainObject(item) && String(item.id || '').trim() === cleanId);
    if (index < 0) return { ok:false, reason:'item not found' };
    const item = inventory[index];
    if (!canRetireInventoryItem(state, item)) return { ok:false, reason:'item not eligible' };
    const record = createRetiredRelicRecordFromItem(state, item, 'Manual Retirement');
    if (!record) return { ok:false, reason:'archive record failed' };
    const archived = asArray(state.player.retiredRelics, []).filter(isPlainObject);
    archived.unshift(record);
    const before = inventory.length;
    inventory.splice(index, 1);
    if (inventory.length === before) {
      return { ok:false, reason:'item removal failed' };
    }
    state.player.retiredRelics = archived.slice(0, 80);
    state.player.inventory = inventory;
    if (typeof pushLog === 'function') pushLog(state, `Archived: ${cleanDisplayText(item.name || 'Unknown relic', 'Unknown relic')}.`);
    return { ok:true, record, item };
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

  if (typeof window !== 'undefined') {
    window.DungeonDexEliteContracts = {
      ensure: ensureEliteContractState,
      ensureRivals: ensureEliteRivalState,
      validate: validateEliteBoardState,
      availableRivals: availableEliteRivals,
      rememberRival: rememberEliteRivalDeath,
      startRival: startEliteRivalContract,
      ensureTrophies: ensureEliteTrophyState,
      trophyCollection: getEliteTrophyCollection,
      awardTrophy: awardEliteTrophy,
      trophyBonus: getEliteTrophyPayoutBonus,
      trophySummary: eliteTrophySummary,
      activeSummaryText(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return '';
        const status = active.failed ? 'Failed' : active.expired ? 'Expired' : active.completed ? 'Completed' : 'Active';
        const label = active.rivalContract ? 'Rival Danger' : 'Active Hunt';
        const writ = String(active.bonusWrit || 'None').replace(/[.]+$/g, '');
        return `${label}: ${active.eliteName}. Where: ${active.targetLocation || eliteContractTargetLocationLabel(active.targetFloor)}. Bonus Goal: ${writ}. Hunt: ${status}.`;
      },
      inspectBoardState(state = S) {
        const contracts = ensureEliteContractState(state);
        const trophies = ensureEliteTrophyState(state);
        return {
          active: contracts.active ? eliteContractSnapshot(contracts.active, contracts.active.status || 'pending') : null,
          completed: contracts.completed.slice(),
          claimed: contracts.claimed.slice(),
          failed: contracts.failed.slice(0, 3),
          expired: contracts.expired.slice(0, 3),
          rivals: contracts.rivals.slice(0, 5),
          trophies: eliteTrophySummary(state),
          trophyIds: Object.keys(trophies.collected || {})
        };
      },
      // Summary mirrors the same read-only candidate shape used by the town panel.
      revisitCandidateSummary(state = S) {
        return revisitCandidateHooks(state).map(entry => ({
          key: String(entry.key || ''),
          label: String(entry.label || ''),
          detail: String(entry.detail || ''),
          source: String(entry.source || ''),
          priority: Math.max(0, Math.floor(numberOr(entry.priority, 0, 0, Number.MAX_SAFE_INTEGER))),
          locked: !!entry.locked
        }));
      },
      revisitRoutePreviews(state = S) {
        return revisitRoutePreviews(state);
      },
      revisitRouteSummary(state = S) {
        return revisitRouteSummary(state);
      },
      revisitRouteActivationPlan(state = S) {
        return revisitRouteActivationPlan(state);
      },
      revisitRouteActivationSummary(state = S) {
        return revisitRouteActivationSummary(state);
      },
      revisitRoutePreviewStateSummary(state = S) {
        return revisitRoutePreviewStateSummary(state);
      },
      revisitFirstActivationLane(state = S) {
        return revisitFirstActivationLane(state);
      },
      revisitRouteGateState(state = S, route = null) {
        return revisitRouteGateState(state, route);
      },
      revisitRouteGateSummary(state = S) {
        return revisitRouteGateSummary(state);
      },
      canEnterRevisitRoute(state = S, routeKey = '') {
        return canEnterRevisitRoute(state, routeKey);
      },
      explainRevisitRouteGate(state = S, routeKey = '') {
        return explainRevisitRouteGate(state, routeKey);
      },
      revisitRouteContentDefinitions() {
        return revisitRouteContentDefinitions();
      },
      revisitUnlockGates(state = S) {
        return revisitUnlockGates(state);
      },
      revisitUnlockGateSummary(state = S) {
        return revisitUnlockGateSummary(state);
      },
      revisitUnlockPreview(state = S) {
        return revisitUnlockPreview(state);
      },
      revisitUnlockPreviewSummary(state = S) {
        return revisitUnlockPreviewSummary(state);
      },
      revisitTrophyEchoRulePlan(state = S) {
        return revisitTrophyEchoRulePlan(state);
      },
      revisitTrophyEchoRuleSummary(state = S) {
        return revisitTrophyEchoRuleSummary(state);
      },
      canStartRevisitRoute(state = S, routeKey = '') {
        return canStartRevisitRoute(state, routeKey);
      },
      startRevisitRoute(state = S, routeKey = '') {
        return startRevisitRoute(state, routeKey);
      },
      activeRevisitRouteSummary(state = S) {
        return activeRevisitRouteSummary(state);
      },
      simulateDeathReset(state = S) {
        if (!state?.player) return false;
        if (typeof recoverRunToTown === 'function') recoverRunToTown(state, 'Death reset your descent. Charters can reopen deeper stairs.');
        state.player.eliteContracts = validateEliteBoardState(state);
        return true;
      },
      validateChartersRemain(state = S) {
        return !!(state?.player && Array.isArray(state.player.deepStairCharters));
      },
      acceptFirst(state = S) {
        const list = typeof availableEliteContracts === 'function' ? availableEliteContracts(state) : [];
        const first = list[0];
        return first ? startEliteContract(state, first.id) : false;
      },
      acceptById(state = S, id = '') {
        return startEliteContract(state, id);
      },
      jumpToTargetFloor(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        if (!state.run && typeof ensureRunShell === 'function') ensureRunShell(state);
        state.run.active = true;
        state.run.floor = eliteContractRawDepthForThreatFloor(active.targetFloor);
        state.run.zone = zoneName(state.run.floor);
        state.run.monster = null;
        state.run.choices = ['attack','guard','skill','extract'];
        return true;
      },
      markEliteContractRest(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        active.bonusRested = true;
        return true;
      },
      markEliteContractExtract(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        active.bonusExtracted = true;
        return true;
      },
      markEliteContractGuard(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        active.bonusGuardUses = Math.floor(numberOr(active.bonusGuardUses, 0, 0, 999)) + 1;
        return true;
      },
      forceTargetEncounter(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        this.jumpToTargetFloor(state);
        if (typeof nextEncounter === 'function') nextEncounter(state);
        return !!state.run?.monster?.contractTarget;
      },
      complete(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        return recordEliteContractKill(state, { contractTarget:true });
      },
      failActive(state = S, killedByTarget = false) {
        const active = activeEliteContractHunt(state);
        const monster = killedByTarget && active
          ? { contractTarget:true, contractId:active.id, name:active.eliteName }
          : null;
        return failActiveEliteContractOnDeath(state, monster);
      },
      rememberRivalFromActive(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return null;
        return rememberEliteRivalDeath(state, active, { contractTarget:true, contractId:active.id, name:active.eliteName });
      },
      simulateBonusWrit(state = S, completed = true) {
        const active = activeEliteContractHunt(state);
        if (!active) return false;
        const type = String(active.bonusWritType || '').toLowerCase();
        if (completed) {
          active.bonusRested = false;
          active.bonusExtracted = false;
          active.bonusGuardUses = Math.min(Math.floor(numberOr(active.bonusGuardUses, 0, 0, 999)), 2);
          if (type === 'hp' && state?.player) state.player.hp = Math.max(Math.ceil(numberOr(state.player.maxHp, 1, 1, Number.MAX_SAFE_INTEGER) * 0.75), 1);
          if (type === 'boss' && state?.run) state.run.floor = Math.min(numberOr(state.run.floor, 1, 1, Number.MAX_SAFE_INTEGER), eliteContractRawDepthForThreatFloor(active.targetFloor));
        } else {
          if (type === 'rest') active.bonusRested = true;
          if (type === 'extract') active.bonusExtracted = true;
          if (type === 'guard') active.bonusGuardUses = Math.max(3, Math.floor(numberOr(active.bonusGuardUses, 0, 0, 999)));
          if (type === 'hp' && state?.player) state.player.hp = Math.max(1, Math.floor(numberOr(state.player.maxHp, 1, 1, Number.MAX_SAFE_INTEGER) * 0.5));
          if (type === 'boss' && state?.run) state.run.floor = eliteContractRawDepthForThreatFloor(eliteContractNextBossFloor(active.targetFloor));
        }
        active.bonusWritCompleted = !!completed;
        active.bonusWritMissed = !completed;
        active.bonusWritFailed = !completed;
        return true;
      },
      forceTrophy(state = S, contractId = '') {
        const contract = contractId ? eliteContractDef(contractId) : activeEliteContractDef(state);
        return contract ? awardEliteTrophy(state, contract) : null;
      },
      clearTrophies(state = S) {
        if (!state?.player) return false;
        state.player.eliteTrophies = createEliteTrophyState();
        return true;
      },
      clearRivals(state = S) {
        const contracts = ensureEliteContractState(state);
        contracts.rivals = [];
        return true;
      },
      completeRival(state = S, rivalId = '') {
        const rivals = ensureEliteRivalState(state);
        const rival = rivals.find(entry => entry.id === rivalId) || rivals.find(entry => entry.revengeAvailable && !entry.completed);
        if (!rival) return false;
        rival.completed = true;
        rival.revengeAvailable = false;
        rival.updatedAt = Date.now();
        return true;
      },
      expire(state = S) {
        return failEliteContract(state, 'expired');
      },
      fail(state = S) {
        return failEliteContract(state, 'failed');
      }
    };
  }

  // v1.3.26 Checkpoint & Charter QA:
  // Raw depth checkpoints can now exceed 999 because late charters unlock every
  // 5,000 depths after D800. Keep district display bounded separately, but never
  // clamp safe/extract/return progress to the district table ceiling.
