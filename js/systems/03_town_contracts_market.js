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
  function revisitTrophyEchoContentSeed(state = S) {
    const safeState = state && typeof state === 'object' ? state : {};
    const safePlayer = safeState.player && typeof safeState.player === 'object' ? safeState.player : {};
    const trophies = safePlayer.trophies && typeof safePlayer.trophies === 'object' ? safePlayer.trophies : {};
    const bossTrophies = safePlayer.bossTrophies && typeof safePlayer.bossTrophies === 'object' ? safePlayer.bossTrophies : {};
    const trophyNames = Object.values(trophies).map(entry => String(entry?.name || entry?.label || '').trim()).filter(Boolean).slice(0, 3);
    const bossNames = Object.values(bossTrophies).map(entry => String(entry?.name || entry?.label || '').trim()).filter(Boolean).slice(0, 2);
    return {
      previewText: 'Future replay-memory lane for boss trophies and victory echoes.',
      summary: 'Trophy Echo is a future lane for replay memory, boss trophy reflection, and short archive-style echoes.',
      flavorHooks: [
        'A trophy can remember the hand that earned it.',
        'A boss mark may one day echo the fight that made it.',
        'Old victories can become replay memory instead of static loot.',
        'Archive notes may grow into reflection scenes after a run ends.',
        'A reflected trophy could describe what changed before the next descent.'
      ],
      echoExamples: [
        'The ogre trophy still carries the heat of the last room.',
        'A broken crown remembers the boss that fell for it.',
        'Victory notes could replay the run before the next descent.',
        'An archive echo might summarize what the trophy proved.'
      ],
      detail: [
        trophyNames.length ? `Known trophies: ${trophyNames.join(', ')}.` : 'Known trophies are still sparse.',
        bossNames.length ? `Boss echoes: ${bossNames.join(', ')}.` : 'Boss echoes remain unwritten.'
      ].join(' '),
      note: 'Future content seed only. No route entry, reward, or save mutation.'
    };
  }

  function ensureRevisitStateShape(state = S) {
    if (!state || typeof state !== 'object') return {};
    if (!state.player || typeof state.player !== 'object') state.player = {};
    const revisitState = state.player.revisitState && typeof state.player.revisitState === 'object'
      ? state.player.revisitState
      : {};
    revisitState.unlocked = revisitState.unlocked === true;
    revisitState.lastViewedAt = String(revisitState.lastViewedAt || '').trim();
    revisitState.notedDistricts = asArray(revisitState.notedDistricts, []).map(String).map(value => value.trim()).filter(Boolean).slice(0, 12);
    revisitState.activeRouteKey = String(revisitState.activeRouteKey || '').trim();
    revisitState.startedAt = Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)));
    revisitState.sourceFloor = Math.max(0, Math.floor(numberOr(revisitState.sourceFloor, 0, 0, 999999)));
    revisitState.sideRoute = revisitState.sideRoute === true;
    revisitState.locked = revisitState.locked !== false;
    revisitState.cappedReward = revisitState.cappedReward !== false;
    const trophyEcho = revisitState.trophyEcho && typeof revisitState.trophyEcho === 'object'
      ? revisitState.trophyEcho
      : {};
    trophyEcho.active = trophyEcho.active && typeof trophyEcho.active === 'object' ? trophyEcho.active : null;
    trophyEcho.history = asArray(trophyEcho.history, []).filter(entry => entry && typeof entry === 'object').slice(0, 20);
    trophyEcho.memoryMarks = Math.max(0, Math.floor(numberOr(trophyEcho.memoryMarks, 0, 0, Number.MAX_SAFE_INTEGER)));
    trophyEcho.completedKeys = trophyEcho.completedKeys && typeof trophyEcho.completedKeys === 'object' ? trophyEcho.completedKeys : {};
    trophyEcho.lastResult = trophyEcho.lastResult && typeof trophyEcho.lastResult === 'object' ? trophyEcho.lastResult : null;
    revisitState.trophyEcho = trophyEcho;
    const rivalTrace = revisitState.rivalTrace && typeof revisitState.rivalTrace === 'object'
      ? revisitState.rivalTrace
      : {};
    rivalTrace.active = rivalTrace.active && typeof rivalTrace.active === 'object' ? rivalTrace.active : null;
    rivalTrace.history = asArray(rivalTrace.history, []).filter(entry => entry && typeof entry === 'object').slice(0, 20);
    rivalTrace.completedKeys = rivalTrace.completedKeys && typeof rivalTrace.completedKeys === 'object' ? rivalTrace.completedKeys : {};
    rivalTrace.lastResult = rivalTrace.lastResult && typeof rivalTrace.lastResult === 'object' ? rivalTrace.lastResult : null;
    if (!rivalTrace.active && String(revisitState.activeRouteKey || '').trim() === 'rival_trace_route') {
      const rivalSource = ensureEliteRivalState(state).find(entry => entry && !entry.completed && entry.revengeAvailable) || ensureEliteContractState(state).active || null;
      if (rivalSource) {
        const rivalId = String(rivalSource.rivalId || rivalSource.id || '').trim();
        rivalTrace.active = {
          routeKey: 'rival_trace_route',
          completionKey: rivalTraceCompletionKey(rivalSource),
          rivalId,
          eliteName: cleanDisplayText(rivalSource.eliteName || 'Rival Elite', 'Rival Elite'),
          floorName: cleanDisplayText(rivalSource.floorName || 'Elite Board', 'Elite Board'),
          memoryTitle: `${cleanDisplayText(rivalSource.eliteName || 'Rival Elite', 'Rival Elite')} Trace`,
          reflection: createRivalTraceReflection(rivalSource).reflection,
          summaryLine: createRivalTraceReflection(rivalSource).summaryLine,
          defeats: Math.max(0, Math.floor(numberOr(rivalSource.defeats, rivalSource.rivalDefeats, 0, 999999))),
          startedAt: Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
        };
      }
    }
    revisitState.rivalTrace = rivalTrace;
    state.player.revisitState = revisitState;
    return revisitState;
  }

  function trophyEchoBossHistory(state = S) {
    const safePlayer = state?.player && typeof state.player === 'object' ? state.player : {};
    const seen = new Set();
    const records = asArray(safePlayer.bossTrophyRecords, []).filter(isPlainObject).map(raw => {
      const trophyId = String(raw.trophyId || raw.id || '').trim();
      if (!trophyId || seen.has(trophyId)) return null;
      seen.add(trophyId);
      return {
        trophyId,
        recordId: String(raw.id || trophyId).trim(),
        trophyName: cleanDisplayText(raw.trophyName || raw.name || 'Boss Trophy', 'Boss Trophy'),
        bossName: cleanDisplayText(raw.bossName || raw.sourceBoss || 'Unknown Boss', 'Unknown Boss'),
        bestDepth: Math.max(0, Math.floor(numberOr(raw.bestKillDepth, raw.rawDepth, 0, 0, 999999))),
        earnedAt: Math.max(0, Math.floor(numberOr(raw.earnedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
        sourceLabel: cleanDisplayText(raw.source || 'Boss Trophy Record', 'Boss Trophy Record')
      };
    }).filter(Boolean);
    asArray(safePlayer.bossTrophies, []).forEach(rawId => {
      const trophyId = String(rawId || '').trim();
      if (!trophyId || seen.has(trophyId)) return;
      const def = asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], []).find(entry => String(entry?.id || '').trim() === trophyId) || null;
      seen.add(trophyId);
      records.push({
        trophyId,
        recordId: trophyId,
        trophyName: cleanDisplayText(def?.name || 'Boss Trophy', 'Boss Trophy'),
        bossName: cleanDisplayText(def?.source || 'Unknown Boss', 'Unknown Boss'),
        bestDepth: Math.max(0, Math.floor(numberOr(def?.requiredDepth, 0, 0, 999999))),
        earnedAt: 0,
        sourceLabel: cleanDisplayText(def?.source || 'Boss Trophy Memory', 'Boss Trophy Memory')
      });
    });
    return records
      .sort((left, right) => numberOr(right.bestDepth, 0) - numberOr(left.bestDepth, 0) || numberOr(right.earnedAt, 0) - numberOr(left.earnedAt, 0) || String(left.trophyId || '').localeCompare(String(right.trophyId || '')))
      .slice(0, 12);
  }

  function trophyEchoCompletionKey(source) {
    const trophyId = String(source?.trophyId || '').trim();
    return trophyId ? `trophy_echo:${trophyId}` : '';
  }

  function createTrophyEchoReflection(source) {
    const trophyName = cleanDisplayText(source?.trophyName || 'Boss Trophy', 'Boss Trophy');
    const bossName = cleanDisplayText(source?.bossName || 'Unknown Boss', 'Unknown Boss');
    const bestDepth = Math.max(0, Math.floor(numberOr(source?.bestDepth, 0, 0, 999999)));
    const depthLine = bestDepth > 0 ? `Best depth remembered: ${format(bestDepth)}.` : 'The exact floor has faded, but the kill still holds.';
    return {
      memoryTitle: `${bossName} Echo`,
      summaryLine: `${trophyName} stirs with a remembered weight.`,
      reflection: `${bossName} returns as a brief ember-memory instead of a fresh hunt. You steady the trophy, recall the last clean strike, and let the fear break before the next descent. ${depthLine}`
    };
  }

  function trophyEchoStatusModel(state = S) {
    const revisitState = ensureRevisitStateShape(state);
    const history = trophyEchoBossHistory(state);
    const active = revisitState.trophyEcho?.active && typeof revisitState.trophyEcho.active === 'object'
      ? revisitState.trophyEcho.active
      : null;
    const source = active
      ? history.find(entry => String(entry.trophyId || '') === String(active.trophyId || '')) || active
      : (history[0] || null);
    return {
      routeKey: 'trophy_echo_route',
      historyCount: history.length,
      memoryMarks: Math.max(0, Math.floor(numberOr(revisitState.trophyEcho?.memoryMarks, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedCount: Object.keys(revisitState.trophyEcho?.completedKeys || {}).filter(key => /^trophy_echo:[^:]+$/i.test(String(key || '').trim()) && revisitState.trophyEcho.completedKeys[key] === true).length,
      locked: history.length <= 0,
      available: history.length > 0,
      active: !!active,
      source,
      activeEcho: active,
      lastResult: revisitState.trophyEcho?.lastResult || null
    };
  }

  function famousGearRetiredRecords(state = S) {
    const safePlayer = state?.player && typeof state.player === 'object' ? state.player : {};
    return asArray(safePlayer.retiredRelics, []).filter(entry => entry && typeof entry === 'object');
  }

  function famousGearCompletionKey(source) {
    const recordId = String(source?.recordId || source?.id || source?.itemId || '').trim();
    return recordId ? `famous_gear:${recordId}` : '';
  }

  function createFamousGearReflection(source) {
    const item = isPlainObject(source?.item) ? source.item : {};
    const itemName = cleanDisplayText(source?.itemName || item.name || 'Famous Gear', 'Famous Gear');
    const slot = cleanDisplayText(source?.slot || item.slot || 'gear', 'gear');
    const rarity = cleanDisplayText(source?.rarity || item.rarity || 'common', 'common');
    const archiveLabel = cleanDisplayText(source?.source || 'retired gear archive', 'retired gear archive');
    const note = cleanDisplayText(source?.note || item.summary || '', '');
    return {
      memoryTitle: `${itemName} Memory`,
      summaryLine: `${itemName} rests as a ${rarity} ${slot} record.`,
      reflection: `${itemName} returns as a safe archive memory from the ${archiveLabel}. You review the record, keep the gear retired, and leave the reward path closed.${note ? ` Archive note: ${note}` : ''}`
    };
  }

  function famousGearMemorySummary(state = S) {
    const rawSource = state?.player?.revisitState?.famousGear && typeof state.player.revisitState.famousGear === 'object'
      ? state.player.revisitState.famousGear
      : {};
    const rawHistory = Array.isArray(rawSource.history) ? rawSource.history.filter(Boolean) : [];
    const revisitState = ensureRevisitStateShape(state);
    const source = revisitState.famousGear && typeof revisitState.famousGear === 'object' ? revisitState.famousGear : {};
    const history = Array.isArray(source.history) ? source.history.filter(entry => entry && typeof entry === 'object') : [];
    const dedupedHistory = typeof window.dedupeFamousGearHistoryEntries === 'function'
      ? window.dedupeFamousGearHistoryEntries(history)
      : history;
    const active = source.active && typeof source.active === 'object' ? source.active : null;
    const lastResult = source.lastResult && typeof source.lastResult === 'object' ? source.lastResult : null;
    const latest = dedupedHistory[0] || lastResult || active || null;
    const legacyIdsDetected = rawHistory.some(entry => typeof entry === 'string' || !entry || !entry.completionKey || !entry.recordId)
      || Object.keys(rawSource.completedKeys || {}).some(key => !/^famous_gear:[^:]+$/i.test(String(key || '').trim()));
    const duplicateRecordsCollapsed = dedupedHistory.length < rawHistory.length || dedupedHistory.length < history.length;
    const latestName = latest ? cleanDisplayText(latest.itemName || latest.memoryTitle || latest.name || 'Famous Gear', 'Famous Gear') : '';
    const sourceLabel = latest ? cleanDisplayText(latest.sourceLabel || 'Retired Gear Archive', 'Retired Gear Archive') : '';
    const summaryLine = latest ? cleanDisplayText(latest.summary || latest.summaryLine || latest.reflection || '', '') : '';
    const body = dedupedHistory.length > 0
      ? `${dedupedHistory.length} famous gear memory${dedupedHistory.length === 1 ? '' : 'ies'} recorded${duplicateRecordsCollapsed ? '; duplicates collapsed' : ''}.`
      : 'No famous gear memories recorded yet.';
    const meta = dedupedHistory.length > 0
      ? `Last remembered gear: ${latestName}${sourceLabel ? ` • ${sourceLabel}` : ''}${summaryLine ? ` • ${summaryLine}` : ''}`
      : 'No famous gear memories recorded yet.';
    return {
      totalRecorded: dedupedHistory.length,
      readableNames: dedupedHistory.map(entry => cleanDisplayText(entry.itemName || entry.memoryTitle || entry.name || 'Famous Gear', 'Famous Gear')),
      sourceNames: dedupedHistory.map(entry => cleanDisplayText(entry.sourceLabel || 'Retired Gear Archive', 'Retired Gear Archive')),
      latestMemory: latest ? {
        recordId: cleanDisplayText(latest.recordId || latest.itemId || 'unknown', 'unknown'),
        itemName: latestName,
        sourceLabel,
        summary: summaryLine,
        completedAt: Math.max(0, Math.floor(numberOr(latest.completedAt, latest.startedAt || 0, 0, Number.MAX_SAFE_INTEGER)))
      } : null,
      legacyIdsDetected,
      duplicateRecordsCollapsed,
      duplicateSafe: true,
      body,
      meta,
      emptyStateCopy: 'No famous gear memories recorded yet.'
    };
  }

  function famousGearStatusModel(state = S) {
    const revisitState = ensureRevisitStateShape(state);
    const retiredRecords = famousGearRetiredRecords(state);
    const active = revisitState.famousGear?.active && typeof revisitState.famousGear.active === 'object'
      ? revisitState.famousGear.active
      : null;
    const source = active
      ? retiredRecords.find(entry => String(entry.recordId || entry.id || entry.item?.id || '') === String(active.recordId || active.itemId || '')) || active
      : (retiredRecords[0] || null);
    const completedCount = Object.keys(revisitState.famousGear?.completedKeys || {}).filter(key => /^famous_gear:[^:]+$/i.test(String(key || '').trim()) && revisitState.famousGear.completedKeys[key] === true).length;
    return {
      routeKey: 'famous_gear_route',
      historyCount: retiredRecords.length,
      completedCount,
      locked: retiredRecords.length <= 0,
      available: retiredRecords.length > 0,
      active: !!active,
      completed: !active && completedCount > 0,
      source,
      activeMemory: active,
      lastResult: revisitState.famousGear?.lastResult || null
    };
  }

  function rivalTraceCompletionKey(source) {
    const rivalId = String(source?.rivalId || source?.id || source?.eliteName || '').trim();
    return rivalId ? `rival_trace:${rivalId}` : '';
  }

  function createRivalTraceReflection(source) {
    const eliteName = cleanDisplayText(source?.eliteName || 'Rival Elite', 'Rival Elite');
    const floorName = cleanDisplayText(source?.floorName || 'Elite Board', 'Elite Board');
    const defeats = Math.max(0, Math.floor(numberOr(source?.defeats, 0, 0, 999999)));
    const defeatLine = defeats > 0 ? `Remembered defeats: ${format(defeats)}.` : 'The rival trace is newly recorded.';
    return {
      memoryTitle: `${eliteName} Trace`,
      summaryLine: `${eliteName} leaves a trace in the archive.`,
      reflection: `${eliteName} is remembered as a safe archive trace from ${floorName}. You read the record, keep the rival sealed in memory, and leave combat, rewards, and board progression unchanged. ${defeatLine}`
    };
  }

  function rivalTraceStatusModel(state = S) {
    const revisitState = ensureRevisitStateShape(state);
    const contracts = ensureEliteContractState(state);
    const rivals = ensureEliteRivalState(state);
    const directActive = revisitState.rivalTrace?.active && typeof revisitState.rivalTrace.active === 'object'
      ? revisitState.rivalTrace.active
      : null;
    const source = directActive
      ? rivals.find(entry => String(entry.id || '') === String(directActive.rivalId || '')) || directActive
      : (contracts.active && contracts.active.rivalContract
        ? {
          id: String(contracts.active.rivalId || contracts.active.id || ''),
          rivalId: String(contracts.active.rivalId || contracts.active.id || ''),
          eliteName: cleanDisplayText(contracts.active.eliteName || 'Rival Elite', 'Rival Elite'),
          floorName: cleanDisplayText(contracts.active.district || 'Elite Board', 'Elite Board'),
          defeats: Math.max(1, Math.floor(numberOr(contracts.active.rivalDefeats, 1, 1, 999999)))
        }
        : (rivals[0] || null));
    const completedCount = Object.keys(revisitState.rivalTrace?.completedKeys || {}).filter(key => /^rival_trace:[^:]+$/i.test(String(key || '').trim()) && revisitState.rivalTrace.completedKeys[key] === true).length;
    const syntheticActive = String(revisitState.activeRouteKey || '').trim() === 'rival_trace_route' && source ? {
      routeKey: 'rival_trace_route',
      rivalId: String(source.rivalId || source.id || '').trim(),
      eliteName: cleanDisplayText(source.eliteName || 'Rival Elite', 'Rival Elite'),
      floorName: cleanDisplayText(source.floorName || 'Elite Board', 'Elite Board'),
      memoryTitle: `${cleanDisplayText(source.eliteName || 'Rival Elite', 'Rival Elite')} Trace`,
      reflection: createRivalTraceReflection(source).reflection,
      summaryLine: createRivalTraceReflection(source).summaryLine,
      completionKey: rivalTraceCompletionKey(source),
      defeats: Math.max(0, Math.floor(numberOr(source.defeats, source.rivalDefeats, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    } : null;
    const active = directActive || syntheticActive;
    return {
      routeKey: 'rival_trace_route',
      historyCount: rivals.length,
      completedCount,
      locked: rivals.length <= 0 && !contracts.active?.rivalContract,
      available: rivals.length > 0 || !!contracts.active?.rivalContract,
      active: !!active,
      completed: !active && completedCount > 0,
      source,
      activeTrace: active,
      activeRouteKey: String(revisitState.activeRouteKey || '').trim(),
      lastResult: revisitState.rivalTrace?.lastResult || null
    };
  }

  function revisitCandidateHooks(state = S) {
    const safeState = state && typeof state === 'object' ? state : {};
    const safePlayer = safeState.player && typeof safeState.player === 'object' ? safeState.player : {};
    const revisitState = ensureRevisitStateShape(safeState);
    const contracts = ensureEliteContractState(safeState);
    const rivals = ensureEliteRivalState(safeState);
    const trophies = ensureEliteTrophyState(safeState);
    const retired = asArray(safePlayer.retiredRelics, []).filter(entry => entry && typeof entry === 'object');
    const trophyEcho = trophyEchoStatusModel(safeState);
    const famousGear = famousGearStatusModel(safeState);
    const trophyCount = trophyEcho.historyCount;
    const rivalCount = rivals.filter(r => r && !r.completed && r.revengeAvailable).length;
    const boardEcho = contracts.active ? (contracts.active.rivalContract ? 'Rival route active' : 'Board route open') : 'Board route quiet';
    const currentDistrict = typeof currentStagingDistrict === 'function' ? currentStagingDistrict(safeState) : null;
    const districtName = String(currentDistrict && currentDistrict.name ? currentDistrict.name : 'Lowfire District').trim() || 'Lowfire District';
    const meta = trophyEcho.active ? 'Active' : trophyEcho.available || famousGear.available ? 'Available' : (revisitState.unlocked ? 'Planned' : 'Future Route');
    const debtBalance = Math.max(0, Math.floor(numberOr(safePlayer?.debtCollector?.balanceCopper, 0, 0, Number.MAX_SAFE_INTEGER)));
    const entries = [
      {
        key: 'trophy_echo',
        label: 'Trophy Echo',
        detail: trophyEcho.active
          ? `Active memory: ${cleanDisplayText(trophyEcho.activeEcho?.bossName || trophyEcho.source?.bossName || 'Unknown Boss', 'Unknown Boss')}.`
          : trophyEcho.available
            ? `${trophyCount} qualifying boss ${trophyCount === 1 ? 'memory' : 'memories'} • ${trophyEcho.memoryMarks} mark${trophyEcho.memoryMarks === 1 ? '' : 's'}.`
            : 'Locked until a boss trophy or boss record exists.',
        source: `Boss history in ${districtName}`,
        priority: 10,
        locked: !trophyEcho.available
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
        detail: rivalCount ? `${rivalCount} remembered` : 'No named rival memory',
        source: contracts.active?.rivalContract ? 'Active named rival elite memory' : 'Named rival elite memory',
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
        'Stub: remember a named rival elite',
        'Stub: keep the trace as memory only',
        'Stub: third planned lane, no live route'
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
      previewText: 'Future replay-memory lane for boss trophies and victory echoes.',
      summary: 'Trophy Echo is a future lane for replay memory, boss trophy reflection, and short archive-style echoes.',
      flavorHooks: [
        'A trophy can remember the hand that earned it.',
        'A boss mark may one day echo the fight that made it.',
        'Old victories can become replay memory instead of static loot.',
        'Archive notes may grow into reflection scenes after a run ends.',
        'A reflected trophy could describe what changed before the next descent.'
      ],
      echoExamples: [
        'The ogre trophy still carries the heat of the last room.',
        'A broken crown remembers the boss that fell for it.',
        'Victory notes could replay the run before the next descent.',
        'An archive echo might summarize what the trophy proved.'
      ],
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
        'Its future content should feel like replay memory and trophy reflection, not a reward route.',
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

  function revisitTrophyEchoRouteDetail(state = S) {
    const plan = revisitTrophyEchoRulePlan(state) || {};
    const summary = revisitTrophyEchoRuleSummary(state) || {};
    const safePlan = {
      status: 'Planning only',
      notes: ['Trophy Echo should be the first planned revisit route because boss history is already tracked.', 'Its future content should feel like replay memory and trophy reflection, not a reward route.'],
      routeAccessLabel: 'Route access is unavailable.',
      ruleInactiveLabel: 'Future rule inactive.'
    };
    const safeSummary = {
      signalCurrent: 0,
      signalRequired: 3,
      signalPercent: 0
    };
    return {
      key: 'trophy_echo_route',
      title: 'Trophy Echo Route',
      source: 'boss trophies / trophy records',
      status: plan.status || safePlan.status,
      planningOnly: true,
      locked: true,
      readOnly: true,
      previewText: String(plan.previewText || 'Future replay-memory lane for boss trophies and victory echoes.'),
      summary: String(plan.summary || 'Trophy Echo is a future lane for replay memory, boss trophy reflection, and short archive-style echoes.'),
      flavorHooks: Array.isArray(plan.flavorHooks) ? plan.flavorHooks : [],
      echoExamples: Array.isArray(plan.echoExamples) ? plan.echoExamples : [],
      detail: 'Planned memory detail lane. Future side-route concept tied to remembered boss trophies, trophy records, and replay-style echoes.',
      reason: Array.isArray(plan.notes) && plan.notes[0] ? plan.notes[0] : safePlan.notes[0],
      safety: plan.routeAccessLabel || safePlan.routeAccessLabel,
      routeAccessLabel: plan.routeAccessLabel || safePlan.routeAccessLabel,
      ruleInactiveLabel: plan.ruleInactiveLabel || safePlan.ruleInactiveLabel,
      signalCurrent: Number.isFinite(summary.signalCurrent) ? summary.signalCurrent : safeSummary.signalCurrent,
      signalRequired: Number.isFinite(summary.signalRequired) ? summary.signalRequired : safeSummary.signalRequired,
      signalPercent: Number.isFinite(summary.signalPercent) ? summary.signalPercent : safeSummary.signalPercent
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
      add('namedRivalRecords', countArray(contracts.rivals));
      add('activeNamedRival', contracts.active && contracts.active.rivalId ? 1 : 0);
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
      const meta = revisitUnlockGateMeta(state, routeKey);
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

  function revisitUnlockGateMeta(state = S, routeKey = '') {
    const key = String(routeKey || '');
    const famousReady = famousGearRetiredRecords(state).length > 0;
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
        reason: famousReady ? 'Playable: Famous Gear archive memory is ready' : 'Locked: Famous Gear memory not ready',
        requirement: famousReady ? 'Retired gear archive is ready.' : 'Build stronger gear memory.',
        progressLabel: famousReady ? 'Archive signal noted' : 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: famousReady ? 'Route access is available.' : 'Route access is unavailable.',
        source: 'famous gear',
        previewState: famousReady ? 'playable-now' : 'locked',
        previewLabel: famousReady ? 'Available now' : 'Still locked',
        previewReason: famousReady ? 'Retired gear archive can be revisited from town.' : 'Future archive memory may shape this path later.',
        previewRequirement: famousReady ? 'Retired gear archive is ready.' : 'Build stronger gear memory.',
        previewSafety: famousReady ? 'Route access is available.' : 'Preview only - route access is unavailable.'
      };
    }
    if (key === 'rival_trace_route') {
      const rivalReady = rivalTraceStatusModel(state).available;
      return {
        gateType: 'rival',
        gateLabel: 'Rival Trace',
        reason: rivalReady ? 'Playable: Rival Trace memory is ready' : 'Locked: Rival Trace not ready',
        requirement: 'Remember named rival elite history.',
        progressLabel: rivalReady ? 'Rival signal noted' : 'No signal yet',
        diagnosticLabel: 'Gate Diagnostics',
        diagnosticDetail: 'Diagnostic only - future unlock rule inactive.',
        accessLabel: rivalReady ? 'Route access is available.' : 'Route access is unavailable.',
        source: 'named rival elite memory',
        previewState: rivalReady ? 'playable-now' : 'locked',
        previewLabel: rivalReady ? 'Available now' : 'Still locked',
        previewReason: rivalReady ? 'Named rival elite memory can be revisited from town.' : 'Future named rival elite memory may sharpen this third planning lane later.',
        previewRequirement: 'Remember named rival elite history.',
        previewSafety: rivalReady ? 'Route access is available.' : 'Preview only - route access is unavailable.'
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
      const meta = revisitUnlockGateMeta(state, key);
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
    const gateMeta = revisitUnlockGateMeta(state, routeKey);
    const routeContent = revisitRouteContentDefinitions()?.[routeKey] || null;
    const hasRoute = !!preview;
    const locked = preview ? preview.locked !== false : true;
    const eligible = !!preview && !!gateMeta && !!routeContent;
    const enterable = preview?.entryAvailable === true;
    const previewOnly = !['trophy_echo_route', 'famous_gear_route', 'rival_trace_route'].includes(routeKey);
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
      statusLabel: routeKey === 'famous_gear_route'
        ? (preview?.status === 'Recovered'
          ? 'Memory Recovered'
          : preview?.completionAvailable === true
            ? 'Memory Active'
            : enterable
              ? 'Archive Ready'
              : hasRoute
                ? 'Entry Locked'
                : 'Gate Prepared')
        : routeKey === 'rival_trace_route'
          ? (preview?.completionAvailable === true
            ? 'Trace Active'
            : enterable
              ? 'Trace Ready'
              : hasRoute
                ? 'Entry Locked'
                : 'Gate Prepared')
        : preview?.completionAvailable === true
          ? 'Echo Active'
          : enterable
            ? 'Entry Ready'
            : (hasRoute ? 'Entry Locked' : 'Gate Prepared'),
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
    const famousReady = famousGearRetiredRecords(state).length > 0;
    const routeDefs = [
      { key: 'trophy_echo_route', previewState: 'preview', previewLabel: 'Future Unlock Preview', previewReason: 'Future boss history may reopen this path later.', previewRequirement: 'Build more boss history.' },
      { key: 'famous_gear_route', previewState: famousReady ? 'playable-now' : 'locked', previewLabel: famousReady ? 'Available now' : 'Still locked', previewReason: famousReady ? 'Retired gear archive can be revisited from town.' : 'Future archive memory may shape this path later.', previewRequirement: famousReady ? 'Retired gear archive is ready.' : 'Build stronger gear memory.' },
      { key: 'rival_trace_route', previewState: rivalTraceStatusModel(state).available ? 'playable-now' : 'locked', previewLabel: rivalTraceStatusModel(state).available ? 'Available now' : 'Still locked', previewReason: rivalTraceStatusModel(state).available ? 'Named rival elite memory can be revisited from town.' : 'Future named rival elite memory may sharpen this trace later.', previewRequirement: 'Remember named rival elite history.' },
      { key: 'debt_pressure_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future ledger pressure may mark this district later.', previewRequirement: 'Build more debt history.' },
      { key: 'board_echo_route', previewState: 'locked', previewLabel: 'Still locked', previewReason: 'Future board history may strengthen this echo later.', previewRequirement: 'Build more board history.' }
    ];
    return routeDefs.map(def => {
      const previewSafety = def.previewState === 'playable-now'
        ? 'Route access is available.'
        : 'Preview only - route access is unavailable.';
      return {
        key: def.key,
        previewState: def.previewState,
        previewLabel: def.previewLabel,
        previewReason: def.previewReason,
        previewRequirement: def.previewRequirement,
        previewSafety,
        locked: def.previewState !== 'playable-now',
        playable: def.previewState === 'playable-now'
      };
    });
  }

  function revisitUnlockPreviewSummary(state = S) {
    const previews = revisitUnlockPreview(state);
    return {
      total: previews.length,
      preview: previews.filter(entry => entry.previewState === 'preview').length,
      locked: previews.filter(entry => entry.previewState === 'locked').length,
      playable: previews.filter(entry => entry.previewState === 'playable-now').length
    };
  }

  function revisitRouteContentDefinitions() {
    return {
      trophy_echo_route: {
        title: 'Trophy Echo Route',
        district: 'Trophy record districts',
        hookSource: 'trophy_echo',
        shortDescription: 'Boss trophies leave replay memory behind.',
        routeFlavorLine: 'Old victories still mark the path.',
        safetyStatusLine: 'Locked preview. No route access.',
        lockedReadinessNote: 'Needs more boss history.',
        detail: 'Planned memory detail lane. Future side-route concept tied to remembered boss trophies, trophy records, and replay-style echoes.',
        reason: 'Old victories may call back later as replay memory.'
      },
      famous_gear_route: {
        title: 'Famous Gear Memory Route',
        district: 'Archive memory districts',
        hookSource: 'famous_gear_memory',
        shortDescription: 'Retired gear remembers the route.',
        routeFlavorLine: 'Notable gear keeps the old turn.',
        safetyStatusLine: 'Playable. Start a safe archive memory from town.',
        lockedReadinessNote: 'Retired gear archive is ready.',
        reason: 'Retired gear may remember old ground.',
        previewText: 'Retired gear can be revisited as a short archive memory in town.',
        summary: 'Famous Gear Memory is a safe archive reflection tied to retired gear history, not a real item reward.',
        detail: 'Playable memory lane tied to retired gear archive records. The lane replays the record, keeps the item retired, and never returns the gear as loot.',
        flavorHooks: [
          'A retired relic can remember the town that kept it.',
          'Archive notes preserve the item without restoring it.',
          'The memory should feel like a recovered record, not a reward loop.'
        ],
        echoExamples: [
          'A famous sword remembers the day it was retired.',
          'An archive record can replay the shape of the old gear without reviving it.',
          'The item stays retired while the memory becomes readable.'
        ]
      },
      rival_trace_route: {
        title: 'Rival Trace Route',
        district: 'Named rival memory districts',
        hookSource: 'rival_trace / board_echo',
        shortDescription: 'Named rival elite memory leaves a trace.',
        routeFlavorLine: 'Remembered rivals leave a sharp trail.',
        safetyStatusLine: 'Locked preview. No route access, hunt, or board mission.',
        lockedReadinessNote: 'Needs named rival elite memory.',
        reason: 'Remembered named rival elites may leave a trace.'
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
      lockedReadinessNote: String(route?.lockedReadinessNote || def.lockedReadinessNote || 'Needs more dungeon history.').trim(),
      detail: String(route?.detail || def.detail || (String(route?.key || '').trim() === 'trophy_echo_route'
        ? 'Planned memory detail lane. Future side-route concept tied to remembered boss trophies and trophy records.'
        : 'Read-only route preview.')).trim()
      ,
      previewText: String(route?.previewText || def.previewText || '').trim(),
      summary: String(route?.summary || def.summary || '').trim(),
      flavorHooks: Array.isArray(route?.flavorHooks) && route.flavorHooks.length ? route.flavorHooks : (Array.isArray(def.flavorHooks) ? def.flavorHooks : []),
      echoExamples: Array.isArray(route?.echoExamples) && route.echoExamples.length ? route.echoExamples : (Array.isArray(def.echoExamples) ? def.echoExamples : [])
    };
  }

  function revisitRoutePreviews(state = S) {
    const hooks = revisitCandidateHooks(state);
    if (!Array.isArray(hooks) || !hooks.length) return [];
    const sourceHooks = hooks.filter(hook => hook && typeof hook === 'object');
    const trophyEcho = trophyEchoStatusModel(state);
    const famousGear = famousGearStatusModel(state);
    const routeDefs = [
      {
        key: 'trophy_echo_route',
        title: 'Trophy Echo Route',
        district: 'Trophy record districts',
        reason: trophyEcho.locked
          ? 'Boss victories must be recorded before this memory can answer.'
          : 'A defeated boss can answer as a brief memory-reflection lane.',
        hooks: ['trophy_echo'],
        status: trophyEcho.active ? 'Active' : trophyEcho.locked ? 'Locked' : 'Playable',
        locked: trophyEcho.locked,
        priority: 10,
        hookSource: 'trophy_echo',
        previewText: trophyEcho.locked
          ? 'Locked until a boss trophy or boss record exists.'
          : trophyEcho.active
            ? 'A boss memory is active in Lowfire. Resolve it before the next descent.'
            : 'Revisit a defeated boss as a short echo memory in town.',
        summary: trophyEcho.locked
          ? 'Trophy Echo waits for proof of a defeated boss.'
          : trophyEcho.active
            ? `${cleanDisplayText(trophyEcho.activeEcho?.bossName || trophyEcho.source?.bossName || 'Unknown Boss', 'Unknown Boss')} is currently stirring in the echo lane.`
            : 'Trophy Echo is the first active Revisit lane: a short, deterministic memory reflection tied to boss history.',
        flavorHooks: [
          'A trophy can remember the hand that earned it.',
          'A boss mark may one day echo the fight that made it.',
          'Old victories can become replay memory instead of static loot.',
          'Archive notes may grow into reflection scenes after a run ends.',
          'A reflected trophy could describe what changed before the next descent.'
        ],
        echoExamples: [
          'The ogre trophy still carries the heat of the last room.',
          'A broken crown remembers the boss that fell for it.',
          'Victory notes could replay the run before the next descent.',
          'An archive echo might summarize what the trophy proved.'
        ],
        playable: !trophyEcho.locked,
        active: trophyEcho.active,
        readOnly: false,
        entryAvailable: !trophyEcho.locked && !trophyEcho.active,
        startAvailable: !trophyEcho.locked && !trophyEcho.active,
        enterAvailable: !trophyEcho.locked && !trophyEcho.active,
        completionAvailable: trophyEcho.active,
        completeAvailable: trophyEcho.active,
        claimAvailable: false,
        rewardAvailable: false,
        resultAvailable: !!trophyEcho.lastResult,
        mutatesSave: true
      },
      {
        key: 'famous_gear_route',
        title: 'Famous Gear Memory Route',
        district: 'Archive memory districts',
        reason: famousGear.active
          ? 'A retired gear record is already open as an archive memory.'
          : famousGear.completed
            ? 'A retired gear record was already recovered and remains readable.'
            : famousGear.available
              ? 'Retired gear can be revisited as a safe archive memory.'
              : 'Retired gear memory waits for a record to answer.',
        hooks: ['famous_gear_memory'],
        status: famousGear.active ? 'Active' : famousGear.completed ? 'Recovered' : famousGear.available ? 'Playable' : 'Locked',
        locked: famousGear.locked,
        priority: 20,
        hookSource: 'famous_gear_memory',
        playable: famousGear.available,
        active: famousGear.active,
        completed: famousGear.completed,
        readOnly: false,
        entryAvailable: famousGear.available && !famousGear.active,
        startAvailable: famousGear.available && !famousGear.active,
        enterAvailable: famousGear.available && !famousGear.active,
        completionAvailable: famousGear.active,
        completeAvailable: famousGear.active,
        claimAvailable: false,
        rewardAvailable: false,
        resultAvailable: !!famousGear.lastResult,
        mutatesSave: true
      },
      {
        key: 'rival_trace_route',
        title: 'Rival Trace Route',
        district: 'Named rival memory districts',
        reason: rivalTraceStatusModel(state).available
          ? 'A remembered named rival elite can answer as a safe trace.'
          : 'Remembered named rival elites may leave a trace.',
        hooks: ['rival_trace', 'board_echo'],
        status: rivalTraceStatusModel(state).active ? 'Active' : rivalTraceStatusModel(state).completed ? 'Recovered' : rivalTraceStatusModel(state).available ? 'Playable' : 'Locked',
        locked: !rivalTraceStatusModel(state).available && !rivalTraceStatusModel(state).active,
        playable: rivalTraceStatusModel(state).available,
        active: rivalTraceStatusModel(state).active,
        completed: rivalTraceStatusModel(state).completed,
        readOnly: false,
        entryAvailable: rivalTraceStatusModel(state).available && !rivalTraceStatusModel(state).active,
        startAvailable: rivalTraceStatusModel(state).available && !rivalTraceStatusModel(state).active,
        enterAvailable: rivalTraceStatusModel(state).available && !rivalTraceStatusModel(state).active,
        completionAvailable: rivalTraceStatusModel(state).active,
        completeAvailable: rivalTraceStatusModel(state).active,
        claimAvailable: false,
        rewardAvailable: false,
        resultAvailable: !!rivalTraceStatusModel(state).lastResult,
        mutatesSave: true,
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
                ? 'Named rival elite memory leaves a trace.'
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
                ? 'Remembered rivals leave a sharp trail.'
                : route.key === 'debt_pressure_route'
                  ? 'Every ledger mark points back.'
                  : route.key === 'board_echo_route'
                    ? 'Paid marks can still linger.'
                    : 'Read-only route note.',
          safetyStatusLine: route.key === 'trophy_echo_route'
            ? (trophyEcho.active
                ? 'Active echo in progress. Resolve it from town.'
                : trophyEcho.locked
                  ? 'Locked. Boss memory required.'
                  : 'Playable. Start a short memory reflection from town.')
            : route.key === 'famous_gear_route'
              ? (famousGear.active
                  ? 'Active archive memory in progress. Resolve it from town.'
                  : famousGear.completed
                    ? 'Recovered archive memory. Start again if you want to revisit the record.'
                    : famousGear.available
                      ? 'Playable. Start a safe archive memory from town.'
                      : 'Locked. Archive memory required.')
              : route.key === 'rival_trace_route'
                ? (rivalTraceStatusModel(state).active
                    ? 'Active rival trace in progress. Resolve it from town.'
                    : rivalTraceStatusModel(state).completed
                      ? 'Recovered rival trace. Start again if you want to revisit the record.'
                      : rivalTraceStatusModel(state).available
                        ? 'Playable. Start a safe rival trace from town.'
                        : 'Locked. Rival memory required.')
              : 'Locked preview. No route access.',
          lockedReadinessNote: route.key === 'trophy_echo_route'
            ? (trophyEcho.locked ? 'Needs more boss history.' : trophyEcho.active ? 'Active echo already underway.' : 'Boss history is ready.')
            : route.key === 'famous_gear_route'
              ? (famousGear.locked ? 'Needs retired gear archive history.' : famousGear.active ? 'Active archive memory already underway.' : famousGear.completed ? 'Archive memory recovered.' : 'Retired gear archive is ready.')
            : route.key === 'rival_trace_route'
                ? (rivalTraceStatusModel(state).locked ? 'Needs named rival elite memory.' : rivalTraceStatusModel(state).active ? 'Active rival trace already underway.' : rivalTraceStatusModel(state).completed ? 'Rival trace recovered.' : 'Rival memory is ready.')
                : route.key === 'debt_pressure_route'
                  ? 'Needs more debt history.'
                  : route.key === 'board_echo_route'
                    ? 'Needs more board history.'
                    : 'Needs more dungeon history.',
          status: String(route.status || 'Locked').trim(),
          locked: route.key === 'trophy_echo_route'
            ? trophyEcho.locked
            : route.key === 'famous_gear_route'
              ? famousGear.locked
              : route.key === 'rival_trace_route'
                ? rivalTraceStatusModel(state).locked
              : true,
          priority: Math.max(0, Math.floor(numberOr(route.priority, topHook.priority || 0, 0, Number.MAX_SAFE_INTEGER))),
          previewText: String(route.previewText || '').trim(),
          summary: String(route.summary || '').trim(),
          flavorHooks: Array.isArray(route.flavorHooks) ? route.flavorHooks.slice() : [],
          echoExamples: Array.isArray(route.echoExamples) ? route.echoExamples.slice() : [],
          playable: route.playable === true,
          active: route.active === true,
          readOnly: route.readOnly === true,
          entryAvailable: route.entryAvailable === true,
          startAvailable: route.startAvailable === true,
          enterAvailable: route.enterAvailable === true,
          completionAvailable: route.completionAvailable === true,
          completeAvailable: route.completeAvailable === true,
          claimAvailable: route.claimAvailable === true,
          rewardAvailable: route.rewardAvailable === true,
          resultAvailable: route.resultAvailable === true,
          mutatesSave: route.mutatesSave === true,
          criteria: criteriaStub.criteria,
          criteriaNote: criteriaStub.note,
          readiness: route.key === 'trophy_echo_route'
            ? (trophyEcho.active ? 'Active' : trophyEcho.locked ? 'Faint Trace' : 'Ready')
            : route.key === 'famous_gear_route'
              ? (famousGear.active ? 'Active' : famousGear.completed ? 'Recovered' : famousGear.locked ? 'Faint Trace' : 'Ready')
              : route.key === 'rival_trace_route'
                ? (rivalTraceStatusModel(state).active ? 'Active' : rivalTraceStatusModel(state).completed ? 'Recovered' : rivalTraceStatusModel(state).locked ? 'Faint Trace' : 'Ready')
            : revisitRouteReadiness({ ...route, criteria: criteriaStub.criteria }, routeHooks)
        }, routeHooks.map(hook => hook.key));
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  function revisitRouteSummary(state = S) {
    const routes = revisitRoutePreviews(state);
    const finishedRoutes = routes.filter(route => route.completed === true || route.active === true || route.playable === true);
    const unfinishedRoutes = routes.filter(route => route.completed !== true && route.active !== true && route.playable !== true);
    return {
      total: routes.length,
      finished: finishedRoutes.length,
      unfinished: unfinishedRoutes.length,
      planned: routes.filter(route => route.status === 'Planned').length,
      active: routes.filter(route => route.active === true).length,
      playable: routes.filter(route => route.playable === true).length,
      future: routes.filter(route => route.status === 'Future Route').length,
      locked: routes.filter(route => route.locked).length,
      finishedRoutes,
      unfinishedRoutes
    };
  }

  function revisitLaneStatusClarity(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const previewEntries = revisitUnlockPreview(safeState);
    const routeContent = revisitRouteContentDefinitions();
    const routeByKey = new Map(routes.map(route => [String(route?.key || '').trim(), route]).filter(entry => entry[0]));
    const previewByKey = new Map(previewEntries.map(entry => [String(entry?.key || '').trim(), entry]).filter(entry => entry[0]));
    const knownKeys = ['trophy_echo_route', 'famous_gear_route', 'rival_trace_route', 'debt_pressure_route', 'board_echo_route'];
    return knownKeys.map(key => {
      const route = routeByKey.get(key) || null;
      const preview = previewByKey.get(key) || null;
      const source = route || preview || null;
      const content = isPlainObject(routeContent) ? routeContent[key] : null;
      const status = String(route?.status || preview?.previewState || 'unknown').trim();
      const plannedFromContent = key === 'board_echo_route' || (content && String(content.status || '').trim() === 'Planned');
      const bucket = key === 'board_echo_route'
        ? 'planned'
        : route
          ? (route.completed === true ? 'finished' : route.playable === true || route.active === true ? 'playable' : route.status === 'Planned' || plannedFromContent ? 'planned' : route.locked === true ? 'locked' : 'unknown')
          : preview
            ? (preview.previewState === 'playable-now' ? 'playable' : preview.previewState === 'planned' ? 'planned' : preview.previewState === 'preview' ? 'preview' : preview.previewState === 'locked' ? (plannedFromContent ? 'planned' : 'locked') : 'unknown')
            : plannedFromContent
              ? 'planned'
              : 'unknown';
      const isPlayable = route ? route.playable === true || route.active === true : preview ? preview.previewState === 'playable-now' : false;
      const isFinished = route ? route.completed === true : false;
      const isPreview = route ? route.status === 'Planned' || route.status === 'Future Route' : preview ? preview.previewState === 'preview' : false;
      const isPlanned = key === 'board_echo_route'
        ? true
        : route
          ? route.status === 'Planned' || plannedFromContent
          : preview
            ? preview.previewState === 'planned'
            : plannedFromContent;
      const isLocked = key === 'board_echo_route'
        ? true
        : route
          ? (route.status === 'Planned' ? false : route.locked === true)
          : preview
            ? preview.previewState === 'locked' && !plannedFromContent
            : !isPlanned;
      const shortLabel = isFinished ? 'Completed' : isPlayable ? 'Playable' : isPlanned ? 'Planned' : isPreview ? 'Preview' : isLocked ? 'Locked' : 'Unknown';
      const detailText = route
        ? String(route.reason || route.summary || route.previewText || route.detail || 'Route status is read-only.').trim()
        : preview
          ? String(preview.previewReason || preview.previewSafety || preview.previewLabel || 'Route status is read-only.').trim()
          : 'Route status is not yet defined.';
      const nextStepText = isPlayable
        ? 'This lane can already be used from town.'
        : isFinished
          ? 'Preserve the finished lane and keep future lanes read-only.'
          : key === 'debt_pressure_route'
            ? 'Future patch should add read-only copy before any activation.'
            : key === 'board_echo_route'
              ? 'Future patch should add preview copy or smoke coverage before activation.'
              : 'Future patch should keep this lane read-only until its contract is ready.';
      return {
        key,
        title: String(route?.title || content?.title || preview?.previewLabel || preview?.title || (key === 'board_echo_route' ? 'Board Echo Route' : key === 'debt_pressure_route' ? 'Debt Pressure Route' : 'Unlisted Route')).trim(),
        status,
        bucket,
        isPlayable,
        isFinished,
        isPreview,
        isPlanned,
        isLocked,
        shortLabel,
        detailText,
        nextStepText,
        sourceLabel: String(source?.hookSource || source?.source || content?.hookSource || 'unknown').trim()
      };
    });
  }

  function revisitUnfinishedLaneTownRows(state = S) {
    const laneOrder = ['board_echo_route', 'debt_pressure_route'];
    const laneClarity = revisitLaneStatusClarity(revisitReadOnlyStateSnapshot(state));
    const byKey = new Map(laneClarity.map(lane => [String(lane?.key || '').trim(), lane]).filter(entry => entry[0]));
    return laneOrder.map(key => {
      const lane = byKey.get(key) || {};
      const title = key === 'board_echo_route' ? 'Board Echo' : 'Debt Pressure';
      const statusLabel = key === 'board_echo_route' ? 'Planned / Locked' : 'Locked / Planned';
      const detail = String(lane.detailText || (key === 'board_echo_route'
        ? 'Future board history may strengthen this echo later.'
        : 'Future ledger pressure may mark this district later.')).trim();
      const next = String(lane.nextStepText || 'Future patch should keep this lane read-only until its contract is ready.').trim();
      return {
        key,
        title: String(lane.title || title).replace(/\s+Route$/i, '').trim() || title,
        statusLabel,
        bucket: String(lane.bucket || (key === 'board_echo_route' ? 'planned' : 'locked')).trim(),
        isUnfinished: true,
        isPlayable: false,
        isLocked: true,
        isPlanned: key === 'board_echo_route' || lane.isPlanned === true,
        actionAvailable: false,
        startAvailable: false,
        activeStateAvailable: false,
        completedStateAvailable: false,
        historyStateAvailable: false,
        bodyText: `${statusLabel}: unfinished Revisit lane. This lane is not playable yet. No player action is available yet. ${detail}`,
        nextStepText: `${next} Board Echo and Debt Pressure remain separate from finished lanes.`
      };
    });
  }

  function revisitRouteActivationPlan(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const trophyEcho = trophyEchoStatusModel(state);
    const famousGear = famousGearStatusModel(state);
    const allowedFutureRouteStates = ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active'];
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
        locked: route.locked !== false,
        planned: status === 'Planned' || status === 'Future Route',
        eligibilityState: key === 'trophy_echo_route'
          ? (route.active ? 'active' : route.locked ? 'locked' : 'playable-now')
          : key === 'famous_gear_route'
            ? (route.active ? 'active' : route.completed ? 'playable-now' : route.locked ? 'locked' : 'playable-now')
            : key === 'rival_trace_route'
              ? (route.active ? 'active' : route.completed ? 'playable-now' : route.locked ? 'locked' : 'playable-now')
            : status === 'Planned' ? 'eligible-preview' : 'playable-later',
        optionalSideContent: true,
        primaryPathPreserved: true,
        readOnly: key !== 'trophy_echo_route' && key !== 'famous_gear_route' && key !== 'rival_trace_route',
        entryAvailable: key === 'trophy_echo_route' ? route.entryAvailable === true : key === 'famous_gear_route' ? route.entryAvailable === true : key === 'rival_trace_route' ? route.entryAvailable === true : false,
        rewardAvailable: false,
        completionAvailable: key === 'trophy_echo_route' ? route.completionAvailable === true : key === 'famous_gear_route' ? route.completionAvailable === true : key === 'rival_trace_route' ? route.completionAvailable === true : false,
        sourceHistoryOnly: true
      };
    });
    return {
      contractId: 'revisit_route_activation_contract_v1',
      status: routes.some(route => route.active)
        ? `${String(routes.find(route => route.active)?.title || 'Revisit route') } active`
        : routes.some(route => route.playable === true)
          ? `${routes.filter(route => route.playable === true).map(route => String(route.title || 'Route')).join(' and ')} playable`
          : 'Revisit lanes locked',
      locked: !routes.some(route => route.playable === true || route.active === true),
      readOnly: false,
      entryAvailable: routes.some(route => route.entryAvailable === true),
      rewardAvailable: false,
      completionAvailable: routes.some(route => route.completionAvailable === true),
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
      allowedStates: asArray(plan?.allowedFutureRouteStates, ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active']).slice(),
      currentLockedCount: routeStates.filter(route => route.state === 'locked').length,
      currentPlayableCount: routeStates.filter(route => route.state === 'playable-now' || route.state === 'active').length,
      currentPreviewOnly: false,
      hasLiveEntry: plan?.entryAvailable === true,
      hasRewards: false,
      hasCompletion: plan?.completionAvailable === true,
      status: String(plan?.status || 'Planning only'),
      note: 'Trophy Echo, Famous Gear Memory, and Rival Trace are the live Revisit lanes. The remaining lanes stay preview-only.',
      routeStateCount: routeStates.length,
      eligibleRouteCount: eligibleRoutes.length
    };
  }

  function revisitRoutePreviewStateSummary(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const routeSummary = revisitRouteSummary(safeState);
    const allowedStates = ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active'];
    const stableHookLabels = Array.from(new Set(routes.map(route => String(route?.hookSource || '').trim()).filter(Boolean)));
    return {
      contractId: 'revisit_route_preview_state_summary_v1',
      allowedStates,
      totalPreviewCount: routes.length,
      lockedPreviewCount: routeSummary?.locked ?? routes.filter(route => route && route.locked).length,
      playablePreviewCount: routeSummary?.playable ?? routes.filter(route => route && route.playable === true).length,
      currentPreviewOnly: false,
      hasLiveEntry: routes.some(route => route && route.entryAvailable === true),
      hasRewards: false,
      hasCompletion: routes.some(route => route && route.completionAvailable === true),
      stableHookLabels,
      note: 'Trophy Echo, Famous Gear Memory, and Rival Trace can now be started and completed from town. The remaining lanes stay preview-only.'
    };
  }

  function revisitFirstActivationLane(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const trophyRoute = routes.find(route => String(route?.key || '') === 'trophy_echo_route') || null;
    const trophyEcho = trophyEchoStatusModel(state);
    return {
      laneKey: 'trophy-echo',
      laneLabel: 'Trophy Echo',
      sourceHook: 'Trophy Echo',
      currentStatus: trophyEcho.active ? 'active' : trophyEcho.locked ? 'locked' : 'playable',
      locked: trophyEcho.locked,
      readOnly: false,
      previewOnly: false,
      hasLiveEntry: trophyEcho.available,
      hasRewards: false,
      hasCompletion: !!trophyEcho.lastResult,
      routeKey: 'trophy_echo_route',
      routeLabel: String(trophyRoute?.title || 'Trophy Echo Route'),
      reason: 'Derived from existing boss and trophy history only.',
      note: 'First live Revisit lane. Trophy Echo is a short memory reflection tied to defeated boss history, not a reward farm.',
      allowedStates: ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active']
    };
  }

  function revisitSecondActivationLane(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const famousGearRoute = routes.find(route => String(route?.key || '') === 'famous_gear_route') || null;
    const famousGear = famousGearStatusModel(state);
    return {
      laneKey: 'famous-gear-memory',
      laneLabel: 'Famous Gear Memory',
      sourceHook: 'Famous Gear Memory',
      currentStatus: famousGear.active ? 'active' : famousGear.completed ? 'recovered' : famousGear.available ? 'playable' : 'locked',
      locked: famousGear.locked,
      readOnly: false,
      previewOnly: false,
      hasLiveEntry: famousGear.available,
      hasRewards: false,
      hasCompletion: famousGear.active || famousGear.completed,
      routeKey: 'famous_gear_route',
      routeLabel: String(famousGearRoute?.title || 'Famous Gear Memory Route'),
      reason: 'Derived from existing famous gear and archive memory only.',
      note: 'Second live Revisit lane. Famous Gear Memory is a safe archive reflection tied to retired gear history, not a real item reward.',
      allowedStates: ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active']
    };
  }

  function revisitThirdActivationLane(state = S) {
    const safeState = revisitReadOnlyStateSnapshot(state);
    const routes = revisitRoutePreviews(safeState);
    const rivalTraceRoute = routes.find(route => String(route?.key || '') === 'rival_trace_route') || null;
    return {
      laneKey: 'rival-trace',
      laneLabel: 'Rival Trace',
      sourceHook: 'Rival Trace',
      currentStatus: rivalTraceStatusModel(state).active ? 'active' : rivalTraceStatusModel(state).completed ? 'traced' : rivalTraceStatusModel(state).available ? 'playable' : 'locked',
      locked: rivalTraceStatusModel(state).locked,
      readOnly: false,
      previewOnly: false,
      hasLiveEntry: rivalTraceStatusModel(state).available,
      hasRewards: false,
      hasCompletion: !!rivalTraceStatusModel(state).lastResult || rivalTraceStatusModel(state).completed,
      routeKey: 'rival_trace_route',
      routeLabel: String(rivalTraceRoute?.title || 'Rival Trace Route'),
      reason: 'Based on remembered named rival elite history only.',
      note: 'Third live Revisit lane. Rival Trace is a safe archive memory tied to named rival elite history, not a reward, hunt, or combat path.',
      allowedStates: ['locked', 'planned', 'eligible-preview', 'playable-later', 'playable-now', 'active']
    };
  }

  function canStartRevisitRoute(state = S, routeKey = '') {
    if (!state || typeof state !== 'object') return false;
    if (!state.player || typeof state.player !== 'object') return false;
    const safeKey = String(routeKey || '').trim();
    if (!safeKey) return false;
    const routes = revisitRoutePreviews(state);
    const route = routes.find(r => String(r?.key || '') === safeKey);
    if (!route) return false;
    if (safeKey !== 'trophy_echo_route' && safeKey !== 'famous_gear_route' && safeKey !== 'rival_trace_route') return false;
    return route.startAvailable === true;
  }

  function startRevisitRoute(state = S, routeKey = '') {
    if (!canStartRevisitRoute(state, routeKey)) return null;
    if (!state?.player) return null;
    const safeKey = String(routeKey || '').trim();
    const revisitState = ensureRevisitStateShape(state);
    if (safeKey === 'trophy_echo_route' && revisitState.trophyEcho?.active && typeof revisitState.trophyEcho.active === 'object') return null;
    if (safeKey === 'famous_gear_route' && revisitState.famousGear?.active && typeof revisitState.famousGear.active === 'object') return null;
    if (safeKey === 'rival_trace_route' && revisitState.rivalTrace?.active && typeof revisitState.rivalTrace.active === 'object') return null;
    const status = safeKey === 'famous_gear_route' ? famousGearStatusModel(state) : safeKey === 'rival_trace_route' ? rivalTraceStatusModel(state) : trophyEchoStatusModel(state);
    const source = status.source;
    if (!source) return null;
    const currentFloor = safeKey === 'famous_gear_route'
      ? Math.max(0, Math.floor(numberOr(source.floor || source.itemLevel || source.item?.level || state?.player?.depth, 0, 0, 999999)))
      : safeKey === 'rival_trace_route'
        ? Math.max(0, Math.floor(numberOr(source.defeats || source.rivalDefeats || 0, state?.player?.depth, 0, 0, 999999)))
        : Math.max(0, Math.floor(numberOr(source.bestDepth, state?.player?.depth, state?.run?.floor || 0, 0, 999999)));
    const reflection = safeKey === 'famous_gear_route'
      ? createFamousGearReflection(source)
      : safeKey === 'rival_trace_route'
        ? createRivalTraceReflection(source)
        : createTrophyEchoReflection(source);
    const startedAt = Date.now();
    revisitState.unlocked = true;
    revisitState.locked = false;
    revisitState.activeRouteKey = safeKey;
    revisitState.startedAt = startedAt;
    revisitState.sourceFloor = currentFloor;
    revisitState.sideRoute = true;
    revisitState.cappedReward = true;
    revisitState.lastViewedAt = new Date(startedAt).toLocaleString();
    if (safeKey === 'famous_gear_route') {
      revisitState.famousGear.active = {
        routeKey: safeKey,
        completionKey: famousGearCompletionKey(source),
        recordId: String(source.recordId || source.id || source.item?.id || '').trim(),
        itemId: String(source.itemId || source.item?.id || source.id || '').trim(),
        itemName: cleanDisplayText(source.itemName || source.item?.name || 'Famous Gear', 'Famous Gear'),
        slot: cleanDisplayText(source.slot || source.item?.slot || 'gear', 'gear'),
        memoryTitle: reflection.memoryTitle,
        reflection: reflection.reflection,
        summaryLine: reflection.summaryLine,
        sourceLabel: cleanDisplayText(source.source || 'Retired Gear Archive', 'Retired Gear Archive'),
        sourceFloor: currentFloor,
        startedAt
      };
      revisitState.famousGear.lastResult = null;
      pushLog(state, `Famous Gear Memory started: ${revisitState.famousGear.active.itemName}.`);
      return {
        routeKey: safeKey,
        routeTitle: 'Famous Gear Memory Route',
        startedAt,
        sourceFloor: currentFloor,
        sideRoute: true,
        locked: false,
        cappedReward: true,
        recordId: revisitState.famousGear.active.recordId,
        itemName: revisitState.famousGear.active.itemName
      };
    }
    if (safeKey === 'rival_trace_route') {
      revisitState.rivalTrace.active = {
        routeKey: safeKey,
        completionKey: rivalTraceCompletionKey(source),
        rivalId: String(source.rivalId || source.id || '').trim(),
        eliteName: cleanDisplayText(source.eliteName || 'Rival Elite', 'Rival Elite'),
        floorName: cleanDisplayText(source.floorName || 'Elite Board', 'Elite Board'),
        memoryTitle: reflection.memoryTitle,
        reflection: reflection.reflection,
        summaryLine: reflection.summaryLine,
        defeats: Math.max(0, Math.floor(numberOr(source.defeats, 0, 0, 999999))),
        startedAt
      };
      revisitState.rivalTrace.lastResult = null;
      pushLog(state, `Rival Trace started: ${revisitState.rivalTrace.active.eliteName}.`);
      return {
        routeKey: safeKey,
        routeTitle: 'Rival Trace Route',
        startedAt,
        sourceFloor: currentFloor,
        sideRoute: true,
        locked: false,
        cappedReward: true,
        rivalId: revisitState.rivalTrace.active.rivalId,
        eliteName: revisitState.rivalTrace.active.eliteName
      };
    }
    revisitState.trophyEcho.active = {
      routeKey: safeKey,
      completionKey: trophyEchoCompletionKey(source),
      trophyId: String(source.trophyId || '').trim(),
      recordId: String(source.recordId || source.trophyId || '').trim(),
      trophyName: cleanDisplayText(source.trophyName || 'Boss Trophy', 'Boss Trophy'),
      bossName: cleanDisplayText(source.bossName || 'Unknown Boss', 'Unknown Boss'),
      memoryTitle: reflection.memoryTitle,
      reflection: reflection.reflection,
      summaryLine: reflection.summaryLine,
      sourceLabel: cleanDisplayText(source.sourceLabel || 'Boss Trophy Record', 'Boss Trophy Record'),
      bestDepth: Math.max(0, Math.floor(numberOr(source.bestDepth, 0, 0, 999999))),
      sourceFloor: currentFloor,
      startedAt
    };
    revisitState.trophyEcho.lastResult = null;
    pushLog(state, `Trophy Echo started: ${revisitState.trophyEcho.active.bossName}.`);
    return {
      routeKey: safeKey,
      routeTitle: safeKey === 'famous_gear_route' ? 'Famous Gear Memory Route' : 'Trophy Echo Route',
      startedAt,
      sourceFloor: currentFloor,
      sideRoute: true,
      locked: false,
      cappedReward: true,
      trophyId: safeKey === 'famous_gear_route' ? '' : revisitState.trophyEcho.active.trophyId,
      bossName: safeKey === 'famous_gear_route' ? '' : revisitState.trophyEcho.active.bossName,
      recordId: safeKey === 'famous_gear_route' ? revisitState.famousGear.active.recordId : '',
      itemName: safeKey === 'famous_gear_route' ? revisitState.famousGear.active.itemName : '',
      rivalId: '',
      eliteName: ''
    };
  }

  function activeRevisitRouteSummary(state = S) {
    if (!state?.player) return null;
    const revisitState = ensureRevisitStateShape(state);
    if (!revisitState.activeRouteKey) return null;
    const safeKey = String(revisitState.activeRouteKey || '').trim();
    const routes = revisitRoutePreviews(state);
    const route = routes.find(r => String(r?.key || '') === safeKey);
    if (!route) return null;
    const activeEcho = revisitState.trophyEcho?.active && typeof revisitState.trophyEcho.active === 'object'
      ? revisitState.trophyEcho.active
      : null;
    const activeMemory = revisitState.famousGear?.active && typeof revisitState.famousGear.active === 'object'
      ? revisitState.famousGear.active
      : null;
    const activeTrace = revisitState.rivalTrace?.active && typeof revisitState.rivalTrace.active === 'object'
      ? revisitState.rivalTrace.active
      : null;
    return {
      routeKey: safeKey,
      routeTitle: String(route?.title || 'Return Route'),
      district: String(route?.district || ''),
      startedAt: Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      sourceFloor: Math.max(0, Math.floor(numberOr(revisitState.sourceFloor, 0, 0, 999999))),
      sideRoute: !!revisitState.sideRoute,
      locked: revisitState.locked !== false,
      cappedReward: revisitState.cappedReward !== false,
      bossName: cleanDisplayText(activeEcho?.bossName || '', ''),
      trophyName: cleanDisplayText(activeEcho?.trophyName || '', ''),
      itemName: cleanDisplayText(activeMemory?.itemName || '', ''),
      recordId: cleanDisplayText(activeMemory?.recordId || '', ''),
      rivalId: cleanDisplayText(activeTrace?.rivalId || '', ''),
      eliteName: cleanDisplayText(activeTrace?.eliteName || '', ''),
      memoryTitle: cleanDisplayText(activeEcho?.memoryTitle || activeMemory?.memoryTitle || activeTrace?.memoryTitle || '', ''),
      reflection: cleanDisplayText(activeEcho?.reflection || activeMemory?.reflection || activeTrace?.reflection || '', ''),
      summaryLine: cleanDisplayText(activeEcho?.summaryLine || activeMemory?.summaryLine || activeTrace?.summaryLine || '', '')
    };
  }

  function completeTrophyEchoRoute(state = S) {
    if (!state?.player) return null;
    const revisitState = ensureRevisitStateShape(state);
    const active = revisitState.trophyEcho?.active && typeof revisitState.trophyEcho.active === 'object'
      ? revisitState.trophyEcho.active
      : null;
    if (!active || String(revisitState.activeRouteKey || '').trim() !== 'trophy_echo_route') return null;
    const completionKey = String(active.completionKey || trophyEchoCompletionKey(active)).trim();
    if (!completionKey || !/^trophy_echo:[^:]+$/i.test(completionKey)) return null;
    const firstCompletion = revisitState.trophyEcho.completedKeys[completionKey] !== true;
    const rewardMark = firstCompletion ? 1 : 0;
    if (firstCompletion) revisitState.trophyEcho.memoryMarks = Math.max(0, Math.floor(numberOr(revisitState.trophyEcho.memoryMarks, 0, 0, Number.MAX_SAFE_INTEGER))) + 1;
    revisitState.trophyEcho.completedKeys[completionKey] = true;
    const completedAt = Date.now();
    const summary = rewardMark > 0
      ? `${active.bossName} settles into record. Memory Mark +1.`
      : `${active.bossName} settles again, but its mark was already recorded.`;
    const result = {
      completionKey,
      trophyId: String(active.trophyId || '').trim(),
      recordId: String(active.recordId || active.trophyId || '').trim(),
      trophyName: cleanDisplayText(active.trophyName || 'Boss Trophy', 'Boss Trophy'),
      bossName: cleanDisplayText(active.bossName || 'Unknown Boss', 'Unknown Boss'),
      memoryTitle: cleanDisplayText(active.memoryTitle || active.bossName || 'Trophy Echo', 'Trophy Echo'),
      reflection: cleanDisplayText(active.reflection || '', ''),
      summary,
      bestDepth: Math.max(0, Math.floor(numberOr(active.bestDepth, 0, 0, 999999))),
      rewardMark,
      startedAt: Math.max(0, Math.floor(numberOr(active.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt
    };
    revisitState.trophyEcho.history.unshift(result);
    revisitState.trophyEcho.history = revisitState.trophyEcho.history.slice(0, 20);
    revisitState.trophyEcho.lastResult = result;
    revisitState.trophyEcho.active = null;
    revisitState.activeRouteKey = '';
    revisitState.startedAt = 0;
    revisitState.sourceFloor = 0;
    revisitState.sideRoute = false;
    revisitState.unlocked = true;
    revisitState.locked = false;
    revisitState.lastViewedAt = new Date(completedAt).toLocaleString();
    pushLog(state, summary);
    return result;
  }

  function completeFamousGearRoute(state = S) {
    if (!state?.player) return null;
    const revisitState = ensureRevisitStateShape(state);
    const active = revisitState.famousGear?.active && typeof revisitState.famousGear.active === 'object'
      ? revisitState.famousGear.active
      : null;
    if (!active || String(revisitState.activeRouteKey || '').trim() !== 'famous_gear_route') return null;
    const completionKey = String(active.completionKey || famousGearCompletionKey(active)).trim();
    if (!completionKey || !/^famous_gear:[^:]+$/i.test(completionKey)) return null;
    const firstCompletion = revisitState.famousGear.completedKeys[completionKey] !== true;
    revisitState.famousGear.completedKeys[completionKey] = true;
    const completedAt = Date.now();
    const summary = firstCompletion
      ? `${active.itemName} settles back into archive memory. Memory Recovered.`
      : `${active.itemName} settles again, but its archive note was already recorded.`;
    const result = {
      completionKey,
      recordId: String(active.recordId || '').trim(),
      itemId: String(active.itemId || '').trim(),
      itemName: cleanDisplayText(active.itemName || 'Famous Gear', 'Famous Gear'),
      slot: cleanDisplayText(active.slot || 'gear', 'gear'),
      memoryTitle: cleanDisplayText(active.memoryTitle || active.itemName || 'Famous Gear', 'Famous Gear'),
      reflection: cleanDisplayText(active.reflection || '', ''),
      summary,
      sourceLabel: cleanDisplayText(active.sourceLabel || 'Retired Gear Archive', 'Retired Gear Archive'),
      sourceFloor: Math.max(0, Math.floor(numberOr(active.sourceFloor, 0, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(active.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt
    };
    revisitState.famousGear.history.unshift(result);
    revisitState.famousGear.history = revisitState.famousGear.history.slice(0, 20);
    revisitState.famousGear.lastResult = result;
    revisitState.famousGear.active = null;
    revisitState.activeRouteKey = '';
    revisitState.startedAt = 0;
    revisitState.sourceFloor = 0;
    revisitState.sideRoute = false;
    revisitState.unlocked = true;
    revisitState.locked = false;
    revisitState.lastViewedAt = new Date(completedAt).toLocaleString();
    pushLog(state, summary);
    return result;
  }

  function completeRivalTraceRoute(state = S) {
    if (!state?.player) return null;
    const revisitState = ensureRevisitStateShape(state);
    const status = rivalTraceStatusModel(state);
    const active = status.activeTrace || (String(revisitState.activeRouteKey || '').trim() === 'rival_trace_route' && status.source ? {
      routeKey: 'rival_trace_route',
      completionKey: rivalTraceCompletionKey(status.source),
      rivalId: String(status.source.rivalId || status.source.id || '').trim(),
      eliteName: cleanDisplayText(status.source.eliteName || 'Rival Elite', 'Rival Elite'),
      floorName: cleanDisplayText(status.source.floorName || 'Elite Board', 'Elite Board'),
      memoryTitle: `${cleanDisplayText(status.source.eliteName || 'Rival Elite', 'Rival Elite')} Trace`,
      reflection: createRivalTraceReflection(status.source).reflection,
      summaryLine: createRivalTraceReflection(status.source).summaryLine,
      defeats: Math.max(0, Math.floor(numberOr(status.source.defeats, status.source.rivalDefeats, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(revisitState.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    } : null);
    if (!active || String(revisitState.activeRouteKey || '').trim() !== 'rival_trace_route') return null;
    const completionKey = String(active.completionKey || rivalTraceCompletionKey(active)).trim();
    if (!completionKey || !/^rival_trace:[^:]+$/i.test(completionKey)) return null;
    const firstCompletion = revisitState.rivalTrace.completedKeys[completionKey] !== true;
    revisitState.rivalTrace.completedKeys[completionKey] = true;
    const completedAt = Date.now();
    const summary = firstCompletion
      ? `${active.eliteName} settles into archive memory. Trace recorded.`
      : `${active.eliteName} settles again, but its trace was already recorded.`;
    const result = {
      completionKey,
      rivalId: String(active.rivalId || '').trim(),
      eliteName: cleanDisplayText(active.eliteName || 'Rival Elite', 'Rival Elite'),
      memoryTitle: cleanDisplayText(active.memoryTitle || active.eliteName || 'Rival Trace', 'Rival Trace'),
      reflection: cleanDisplayText(active.reflection || '', ''),
      summary,
      floorName: cleanDisplayText(active.floorName || 'Elite Board', 'Elite Board'),
      startedAt: Math.max(0, Math.floor(numberOr(active.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt
    };
    revisitState.rivalTrace.history.unshift(result);
    revisitState.rivalTrace.history = revisitState.rivalTrace.history.slice(0, 20);
    revisitState.rivalTrace.lastResult = result;
    revisitState.rivalTrace.active = null;
    revisitState.activeRouteKey = '';
    revisitState.startedAt = 0;
    revisitState.sourceFloor = 0;
    revisitState.sideRoute = false;
    revisitState.unlocked = true;
    revisitState.locked = false;
    revisitState.lastViewedAt = new Date(completedAt).toLocaleString();
    pushLog(state, summary);
    return result;
  }

  function trophyEchoResultSummary(state = S) {
    const revisitState = ensureRevisitStateShape(state);
    return revisitState.trophyEcho?.lastResult || null;
  }

  function famousGearResultSummary(state = S) {
    const revisitState = ensureRevisitStateShape(state);
    return revisitState.famousGear?.lastResult || null;
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
      revisitLaneStatusClarity(state = S) {
        return revisitLaneStatusClarity(state);
      },
      revisitUnfinishedLaneTownRows(state = S) {
        return revisitUnfinishedLaneTownRows(state);
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
      revisitSecondActivationLane(state = S) {
        return revisitSecondActivationLane(state);
      },
      revisitThirdActivationLane(state = S) {
        return revisitThirdActivationLane(state);
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
      revisitTrophyEchoRouteDetail(state = S) {
        return revisitTrophyEchoRouteDetail(state);
      },
      trophyEchoStatus(state = S) {
        return trophyEchoStatusModel(state);
      },
      famousGearStatus(state = S) {
        return famousGearStatusModel(state);
      },
      famousGearMemorySummary(state = S) {
        return famousGearMemorySummary(state);
      },
      startTrophyEcho(state = S) {
        return startRevisitRoute(state, 'trophy_echo_route');
      },
      startFamousGear(state = S) {
        return startRevisitRoute(state, 'famous_gear_route');
      },
      completeTrophyEcho(state = S) {
        return completeTrophyEchoRoute(state);
      },
      completeFamousGear(state = S) {
        return completeFamousGearRoute(state);
      },
      rivalTraceStatus(state = S) {
        return rivalTraceStatusModel(state);
      },
      startRivalTrace(state = S) {
        return startRevisitRoute(state, 'rival_trace_route');
      },
      completeRivalTrace(state = S) {
        return completeRivalTraceRoute(state);
      },
      trophyEchoResultSummary(state = S) {
        return trophyEchoResultSummary(state);
      },
      famousGearResultSummary(state = S) {
        return famousGearResultSummary(state);
      },
      activeTrophyEcho(state = S) {
        return activeRevisitRouteSummary(state);
      },
      activeFamousGear(state = S) {
        return activeRevisitRouteSummary(state);
      },
      activeRivalTrace(state = S) {
        return rivalTraceStatusModel(state);
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
