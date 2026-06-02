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
      eliteName,
      title: seed?.title || contract.title || `WANTED: ${eliteName}`,
      district,
      targetFloor,
      targetLocation: eliteContractTargetLocationLabel(targetFloor),
      threat: Math.max(1, Math.min(3, Math.floor(numberOr(seed?.threat ?? contract.threat, 1, 1, 3)))),
      modifier: '',
      modifierKey: '',
      contractText: seed?.contractText || contract.contractText || `Defeat ${eliteName} when it appears.`,
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
      eliteName: active.eliteName || active.name || '',
      district: active.district || '',
      targetFloor: active.targetFloor || 0,
      targetLocation: active.targetLocation || '',
      threat: active.threat || 1,
      modifier: '',
      modifierKey: '',
      contractText: active.contractText || '',
      bonusWrit: active.bonusWrit || '',
      bonusWritType: active.bonusWritType || '',
      bonusWritCompleted: !!active.bonusWritCompleted,
      bonusWritMissed: !!active.bonusWritMissed,
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

  function createEliteContractState(seed = {}, state = null) {
    const source = isPlainObject(seed) ? seed : {};
    const claimed = normalizeEliteContractIds(source.claimed);
    const completedSet = new Set([...normalizeEliteContractIds(source.completed), ...claimed]);
    const expired = asArray(source.expired, []).filter(isPlainObject).slice(0, 20);
    const failed = asArray(source.failed, []).filter(isPlainObject).slice(0, 20);
    const savedActive = isPlainObject(source.active) ? source.active : null;
    let active = null;

    if (savedActive) {
      const def = eliteContractDef(normalizeEliteContractId(savedActive.id));
      if (def && !claimed.includes(def.id)) {
        const progress = Math.floor(numberOr(savedActive.progress, 0, 0, 1));
        const complete = !!savedActive.completed || !!savedActive.complete || progress >= 1 || completedSet.has(def.id);
        const expiredActive = !!savedActive.expired || String(savedActive.status || '').toLowerCase() === 'expired';
        const failedActive = !!savedActive.failed || String(savedActive.status || '').toLowerCase() === 'failed';
        const alreadyClaimed = !!savedActive.claimed;
        const rewardAmount = Object.prototype.hasOwnProperty.call(savedActive, 'rewardAmount') && savedActive.rewardAmount != null
          ? sanitizeContractReward(def, savedActive.rewardAmount)
          : calculateContractReward(def, state);
        if (alreadyClaimed) {
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
            bonusRested: !!savedActive.bonusRested,
            bonusExtracted: !!savedActive.bonusExtracted,
            bonusBossReached: !!savedActive.bonusBossReached,
            bonusGuardUses: Math.floor(numberOr(savedActive.bonusGuardUses, 0, 0, 999)),
            rewardPreview: savedActive.rewardPreview || def.rewardPreview || '',
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
          if (complete) completedSet.add(def.id);
        }
      }
    }

    return {
      active,
      completed: Array.from(completedSet),
      claimed,
      expired,
      failed
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
    const offer = eliteContractOfferModel(state, contract.id);
    const model = eliteBoardContractModel(contract, state, true, offer);
    contracts.active = {
      id: contract.id,
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
      status: 'pending',
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

  function recordEliteContractKill(state, options = {}) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.complete) return false;

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
      if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
      const trophyChance = eliteTrophyRollChance(active, contract, state);
      const trophyRolled = Math.random() < trophyChance;
      const trophyResult = trophyRolled ? awardEliteTrophy(state, contract) : null;
      const writLine = active.bonusWritCompleted ? 'Bonus Writ completed.' : 'Bonus Writ missed.';
      const trophyLine = trophyResult?.awarded
        ? `Trophy found: ${trophyResult.trophy.name}.`
        : trophyRolled && trophyResult?.duplicate
          ? `Trophy duplicate found: ${trophyResult.trophy.name} x${trophyResult.trophy.count}.`
          : 'No trophy found this time.';
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

  function failEliteContract(state, reason = 'failed') {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (!active || active.completed || active.complete) return false;
    active.failed = reason === 'failed';
    active.expired = reason === 'expired';
    active.status = reason === 'expired' ? 'expired' : 'failed';
    const snapshot = eliteContractSnapshot(active, active.status);
    if (snapshot) {
      const list = active.expired ? contracts.expired : contracts.failed;
      list.unshift(snapshot);
      list.splice(20);
    }
    pushLog(state, active.expired
      ? `Elite contract expired: ${active.eliteName}.`
      : `Elite contract failed: ${active.eliteName}.`);
    contracts.active = null;
    return true;
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
    return {
      hp: early ? 1.25 : 1.35,
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
    monster.family = 'Elite Hunt';
    monster.type = 'Contract';
    monster.affix = '';
    monster.tier = 'Elite';
    monster.contractTarget = true;
    monster.contractId = hunt.id;
    monster.contractEliteName = hunt.eliteName;
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
    monster.lore = `Contract Elite: ${hunt.contractText || `Defeat ${hunt.eliteName}.`}`;
    return monster;
  }

  function resolveEliteContractCompletion(state, active, contract) {
    if (!active || !contract || active.bonusWritRewardPaid) return 0;
    const trophyBonus = getEliteTrophyPayoutBonus(state);
    const bonusAmount = active.bonusWritCompleted ? eliteContractBonusWritReward(active, contract, state) : 0;
    active.bonusWritRewardPaid = true;
    if (bonusAmount > 0 && addPlayerGold(state, bonusAmount)) {
      pushLog(state, `Bonus Writ payout: ${contract.name} paid ${stripHtml(formatMoney(bonusAmount))}.`);
      if (trophyBonus > 0) {
        pushLog(state, `Elite Trophy Bonus: +${trophyBonus}% Elite Board payout from ${Object.keys(ensureEliteTrophyState(state).collected || {}).length} unique trophies.`);
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
    resolveEliteContractCompletion(state, active, contract);
    if (!contracts.completed.includes(contract.id)) contracts.completed.push(contract.id);
    if (!contracts.claimed.includes(contract.id)) contracts.claimed.push(contract.id);
    contracts.active = null;
    pushLog(state, active.bonusWritCompleted
      ? `Payment claimed: ${contract.name} paid ${stripHtml(formatMoney(rewardAmount))} plus Bonus Writ.`
      : `Payment claimed: ${contract.name} paid ${stripHtml(formatMoney(rewardAmount))}.`);
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

  if (typeof window !== 'undefined') {
    window.DungeonDexEliteContracts = {
      ensure: ensureEliteContractState,
      ensureTrophies: ensureEliteTrophyState,
      trophyCollection: getEliteTrophyCollection,
      awardTrophy: awardEliteTrophy,
      trophyBonus: getEliteTrophyPayoutBonus,
      trophySummary: eliteTrophySummary,
      activeSummaryText(state = S) {
        const active = activeEliteContractHunt(state);
        if (!active) return '';
        const status = active.bonusWritCompleted ? 'Completed' : active.bonusWritMissed ? 'Missed' : 'Pending';
        return `Contract target sighted: ${active.eliteName}. Bonus Writ active: ${active.bonusWrit || 'None'}. Bonus status: ${status}.`;
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
      forceTrophy(state = S, contractId = '') {
        const contract = contractId ? eliteContractDef(contractId) : activeEliteContractDef(state);
        return contract ? awardEliteTrophy(state, contract) : null;
      },
      clearTrophies(state = S) {
        if (!state?.player) return false;
        state.player.eliteTrophies = createEliteTrophyState();
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
