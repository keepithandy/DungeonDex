'use strict';

// Rarity scaling, loot rules, base state, gear/monster generation, scaling audit
  function rarityIndex(key) { return Math.max(0, RARITIES.findIndex(r => r.key === key)); }

  function cappedRarityForLevel(level, source = 'normal') {
    level = normalizeItemLevel(level);
    if (source === 'forge') {
      if (level < 10) return 'rare';
      if (level < 15) return 'epic';
      return 'legendary';
    }
    if (source === 'merchant') {
      if (level < 6) return 'rare';
      if (level < 12) return 'epic';
      return 'legendary';
    }
    if (source === 'boss') {
      if (level < 10) return 'epic';
      if (level < 15) return 'legendary';
      return 'mythic';
    }
    if (source === 'elite') {
      if (level < 5) return 'rare';
      if (level < 10) return 'epic';
      return 'legendary';
    }
    if (level < 5) return 'rare';
    if (level < 10) return 'epic';
    if (level < 15) return 'legendary';
    return 'mythic';
  }

  function weightedRarityForLevel(level, source = 'normal', opts = {}) {
    level = normalizeItemLevel(level);
    let table;
    if (source === 'merchant') {
      table = level < 6
        ? [['common',62],['uncommon',32],['rare',6]]
        : level < 12
        ? [['common',50],['uncommon',36],['rare',12],['epic',2]]
        : [['common',38],['uncommon',36],['rare',19],['epic',6],['legendary',1]];
    } else if (source === 'elite') {
      table = level < 5
        ? [['common',56],['uncommon',34],['rare',9],['epic',1]]
        : level < 10
        ? [['common',42],['uncommon',36],['rare',18],['epic',4]]
        : level < 15
        ? [['common',30],['uncommon',35],['rare',24],['epic',9],['legendary',2]]
        : [['common',22],['uncommon',31],['rare',28],['epic',14],['legendary',4],['mythic',1]];
    } else if (source === 'boss') {
      table = level < 10
        ? [['common',25],['uncommon',45],['rare',22],['epic',7],['legendary',1]]
        : level < 15
        ? [['common',16],['uncommon',38],['rare',30],['epic',12],['legendary',4]]
        : [['uncommon',26],['rare',36],['epic',25],['legendary',11],['mythic',2]];
    } else if (source === 'forge') {
      table = level < 10
        ? [['uncommon',34],['rare',52],['epic',14]]
        : level < 15
        ? [['rare',50],['epic',38],['legendary',12]]
        : [['rare',26],['epic',42],['legendary',25],['mythic',7]];
    } else {
      table = level < 5
        ? [['common',72],['uncommon',22],['rare',5],['epic',1]]
        : level < 10
        ? [['common',62],['uncommon',27],['rare',9],['epic',2]]
        : level < 15
        ? [['common',48],['uncommon',31],['rare',16],['epic',4],['legendary',1]]
        : [['common',36],['uncommon',31],['rare',22],['epic',8],['legendary',2],['mythic',1]];
    }
    table = applyDepthLootScarcity(table, opts.depthRaw || opts.depth || level, source, opts.state || null);
    const allowedMax = rarityIndex(cappedRarityForLevel(level, source));
    const filtered = table.filter(([key]) => rarityIndex(key) <= allowedMax);
    const roll = Math.random() * filtered.reduce((sum, [, chance]) => sum + chance, 0);
    let sum = 0;
    for (const [key, chance] of filtered) {
      sum += chance;
      if (roll <= sum) return RARITIES.find(r => r.key === key);
    }
    return RARITIES[0];
  }

  function earlyStatScale(level) {
    if (level <= 4) return 0.62;
    if (level <= 9) return 0.78;
    if (level <= 15) return 0.9;
    if (level <= 25) return 0.96;
    return 1;
  }

  // Item scaling audit: most dropped gear uses threat-depth as its item level, while raw
  // descent depth can be thousands of chapters. Keep raw-depth pressure visible without
  // letting Mythic rarity become a runaway multiplier at very deep floors.
  //
  // v1.3.40 tuning note: Mythics should still beat Legendaries at deep floors. The softener
  // begins after depth 500 and reaches the existing 0.86 deep floor by depth 1000.
  function mythicDepthSoftener(level, rawDepth = 0) {
    const itemLevel = normalizeItemLevel(level);
    const depth = Math.max(itemLevel, Math.floor(numberOr(rawDepth, 0, 0, 999999)));
    if (depth <= 500) return 1;
    const band = clamp((depth - 500) / 500, 0, 1);
    return 1 - band * 0.14;
  }

  // Rarity scaling audit: Mythics keep their early/midgame identity, then receive
  // diminishing raw-stat growth after deep-floor thresholds instead of stacking forever.
  function rarityStatMultiplier(rarityKey, level, rawDepth = 0) {
    const def = RARITIES.find(r => r.key === rarityKey) || RARITIES[0];
    if (def.key !== 'mythic') return def.mult;
    return def.mult * mythicDepthSoftener(level, rawDepth);
  }

  // Monster scaling audit: prior deep floors leaned too heavily on capped room/floor
  // pressure. Common enemies keep the existing readable deep curve; elite and boss enemies
  // gain a bounded post-D800 pressure bump so deep Mythics do not make marked fights soft.
  function deepMonsterPowerMultiplier(rawDepth, tier = 'Common') {
    const depth = depthStageValue(rawDepth);
    if (depth <= 800) return 1;
    const base = Math.min(0.55, (depth - 800) * 0.00018);
    const deepTierRamp = clamp((depth - 800) / 300, 0, 1);
    const tierBonus = tier === 'Boss' ? 0.08 + deepTierRamp * 0.15 : tier === 'Elite' ? 0.04 + deepTierRamp * 0.13 : 0;
    return 1 + base + tierBonus;
  }

  function expectedGearRating(level, rarityKey = 'common', source = 'normal', rawDepth = 0) {
    const safeLevel = normalizeItemLevel(level);
    const sourceScale = source === 'merchant' ? 0.96 : source === 'elite' ? 1.05 : source === 'boss' ? 1.15 : source === 'forge' ? 1.08 : 1;
    const baseRollAverage = safeLevel * 6.8 + 4;
    return Math.max(3, Math.round(baseRollAverage * rarityStatMultiplier(rarityKey, safeLevel, rawDepth) * earlyStatScale(safeLevel) * sourceScale));
  }

  function expectedMonsterPowerAtDepth(rawDepth, tier = 'Common') {
    const depth = depthStageValue(rawDepth);
    const threatDepth = threatDepthFromDepth(depth);
    const ladder = depthDifficultyLadder(depth);
    const boss = tier === 'Boss';
    const elite = tier === 'Elite';
    const earlyPressure = threatDepth <= 3 ? 0.90 : threatDepth <= 5 ? 1.0 : threatDepth <= 10 ? 1.08 : threatDepth <= 15 ? 1.06 : 1;
    const lateFloorPressure = depth <= 20 ? 1 : depth <= 40 ? 1 + (depth - 20) * 0.085 : 2.7 + Math.min(0.8, (depth - 40) * 0.015);
    const base = (threatDepth * 9.5 + 15 + (boss ? 72 : 0) + (elite ? 16 : 0)) * earlyPressure * ladder.powerMult * lateFloorPressure;
    const tierProfile = boss ? 1.22 : elite ? 1.16 : 1;
    return Math.round(base * deepMonsterPowerMultiplier(depth, tier) * tierProfile);
  }

  function generateStarterJunk() {
    const junk = generateGear(pick(['weapon','offhand','helm','gloves','boots']), 1, { forcedRarity:'common', source:'starter', broken:true });
    junk.name = pick(['Rust Knife','Cracked Buckler','Frayed Hood','Ashcloth Wraps','Torn Treads']);
    junk.rating = Math.max(3, Math.round(junk.rating * 0.45));
    Object.keys(junk.stats).forEach(k => junk.stats[k] = Math.max(0, Math.round(junk.stats[k] * 0.35)));
    junk.value = rand(6, 12);
    junk.summary = 'Barely serviceable salvage. Better than empty hands, not by much.';
    junk.tags = ['junk', junk.slot, 'starter'];
    return junk;
  }

  function eliteChanceForFloor(floor) {
    if (floor <= 3) return 0.08;
    if (floor <= 7) return 0.18;
    if (floor <= 12) return 0.28;
    if (floor <= 15) return 0.34;
    return 0.26;
  }

  function lootDropChance(floor, source = 'normal', state = null) {
    const rawDepth = depthStageValue(floor);
    const depth = threatDepthFromDepth(rawDepth);
    const base = source === 'boss' ? 1 : source === 'elite' ? 0.72 : 0.10;
    let chance;
    if (source === 'normal') {
      chance = depth < 6 ? 0.42 : depth < 12 ? 0.48 : 0.52;
    } else if (depth < 5) {
      chance = 0.08;
    } else if (depth < 10) {
      chance = 0.12;
    } else if (depth < 15) {
      chance = 0.16;
    } else {
      chance = base;
    }
    const scarcity = depthLootScarcityMeta(rawDepth, source, state);
    return clamp(chance * scarcity.dropChanceMult, 0.04, 1);
  }

  function shouldDropLoot(floor, source = 'normal', rollIndex = 0, state = null) {
    if (source === 'boss') {
      if (rollIndex === 0) return true;
      const scarcity = depthLootScarcityMeta(floor, source, state);
      return Math.random() < clamp(0.35 * scarcity.dropChanceMult, 0.18, 0.35);
    }
    return Math.random() < lootDropChance(floor, source, state);
  }


  function gearCatalogCount() {
    return SLOT_ORDER.reduce((acc, slot) => acc + (BASES[slot].length * PREFIXES.length * SUFFIXES.length), 0);
  }

  function monsterCatalogCount() {
    return MONSTER_FAMILIES.length * MONSTER_TYPES.length * MONSTER_AFFIXES.length;
  }

  function createBaseState() {
    const state = {
      build: BUILD,
      screen: 'town',
      filters: { slot:'all', rarity:'all', search:'', sort:'power' },
      player: {
        name: 'Warden',
        title: 'Ashbound Delver',
        level: 1,
        xp: 0,
        xpNext: 100,
        hp: 100,
        maxHp: 100,
        gold: coins(0, 12, 50),
        currencyVersion: 3,
        shards: 0,
        ember: 1,
        depth: 0,
        safeExtractDepth: 1,
        returnDepth: 1,
        kills: 0,
        crit: 6,
        dodge: 4,
        stats: { ...DEFAULT_PLAYER_STATS },
        equipment: {},
        inventory: [],
        discoveredMonsters: [],
        discoveredGear: [],
        log: [],
        loreSeen: [LORE_SNIPPETS[0]],
        runHistory: [],
        quests: [
          { id:'q1', title:'Open the Hollow Stair', goal:5, progress:0, reward:'2s50c + 1 ember', type:'kill' },
          { id:'q2', title:'Dress the Delver', goal:4, progress:0, reward:'1 forge spark', type:'equip' },
          { id:'q3', title:'Relic Census', goal:12, progress:0, reward:'80 shards', type:'loot' }
        ],
        forgeSpark: 0,
        earlyAidGiven: false,
        permanentStartFloor: 1,
        deepStairCharters: [],
        debtbrandBoostReady: false,
        boughtStart20Scroll: false,
        goldSink: createGoldSinkState(),
        eliteContracts: createEliteContractState()
      },
      town: { merchantRefreshCost: coins(0, 1, 50), forgeTier: 1, relicFavor: 0 },
      run: {
        active: false,
        floor: 0,
        chain: 0,
        danger: 1,
        zone: 'Low Steps',
        monster: null,
        combatLog: ['Lowfire waits above. The Hollow Stair waits below.'],
        roomsCleared: 0,
        encounters: 0,
        choices: [],
        goldBonusPct: 0,
        pendingRewards: createPendingRunRewards(),
        startedFromCharter: false,
        charterStartFloor: 0,
        setBonuses: { ashboundLethalUsed: false, bellforgeHits: 0, sootveilEscapeUsed: false, sootveilGuard: 0 }
      },
      merchantStock: [],
      archive: [],
      ui: { combatLogExpanded: false }
    };

    state.player.inventory.push(generateStarterJunk());
    rollMerchant(state, true);
    spawnQuestLore(state, 'Lowfire sends the Warden down with almost nothing. Survival must be earned.');
    pushLog(state, 'Lowfire market stock is lean, useful, and priced for a hard descent.');
    return state;
  }

  function generateGear(slot, level, opts = {}) {
    const itemLevel = normalizeItemLevel(level);
    const source = opts.source || 'normal';
    const rarity = opts.forcedRarity ? RARITIES.find(r => r.key === opts.forcedRarity) : weightedRarityForLevel(itemLevel, source, opts);
    const base = pick(BASES[slot]);
    const prefix = pick(PREFIXES);
    const suffix = pick(slot === 'charm' ? SUFFIXES.concat(TRINKET_SUFFIXES) : SUFFIXES);
    const maker = pick(MAKERS);
    const theme = pick(THEMES);
    const rawDepth = Math.floor(numberOr(opts.depthRaw || opts.depth, itemLevel, 1, 999999));
    const lowFloorScale = source === 'starter' ? 0.5 : earlyStatScale(itemLevel);
    const sourceScale = source === 'merchant' ? 0.96 : source === 'elite' ? 1.05 : source === 'boss' ? 1.15 : source === 'forge' ? 1.08 : 1;
    const brokenScale = opts.broken ? 0.55 : 1;
    // Item power score calculation: base item level roll × rarity scaling × source scaling.
    // Mythic rarity uses rarityStatMultiplier() so deep floors apply a soft cap instead of
    // compounding full Mythic multiplier forever.
    const rating = Math.max(3, Math.round((itemLevel * rand(5, 8) + rand(1, 7)) * rarityStatMultiplier(rarity.key, itemLevel, rawDepth) * lowFloorScale * sourceScale * brokenScale));
    const stats = {
      power: slot === 'weapon' ? rating + rand(1, 4) : Math.round(rating * 0.18),
      guard: ['armor','offhand','helm','boots'].includes(slot) ? rating + rand(0, 3) : Math.round(rating * 0.15),
      wit: ['amulet','charm','cloak','offhand'].includes(slot) ? Math.round(rating * 0.34) + rand(0, 2) : Math.round(rating * 0.11),
      speed: ['boots','gloves','weapon','cloak'].includes(slot) ? Math.round(rating * 0.3) + rand(0, 2) : Math.round(rating * 0.09),
      luck: ['ring','amulet','charm'].includes(slot) ? Math.round(rating * 0.22) + rand(0, 2) : Math.round(rating * 0.05),
      hp: ['armor','helm','ring','amulet'].includes(slot) ? Math.round(rating * 0.62) + rand(0, 5) : Math.round(rating * 0.18)
    };
    return {
      id: makeId('gear'),
      slot,
      rarity: rarity.key,
      theme,
      maker,
      name: `${prefix} ${base} ${suffix}`,
      level: itemLevel,
      rating,
      value: gearPriceFromRating(rating, itemLevel, rarity.key, source),
      stats,
      tags: [theme, maker, slot, source],
      summary: `${maker} ${slot === 'charm' ? 'trinket' : slot} attuned for ${theme} paths.`
    };
  }

  function generateMonster(floor, state = null) {
    const rawDepth = depthStageValue(floor);
    const threatDepth = threatDepthFromDepth(rawDepth);
    const ladder = depthDifficultyLadder(rawDepth);
    const contractRisk = activeEliteContractRisk(state);
    const family = pick(MONSTER_FAMILIES);
    const type = pick(MONSTER_TYPES);
    const affix = '';
    const skill = 'Basic attack';
    const boss = rawDepth > 0 && rawDepth % (BOSS_INTERVAL * DEPTH_CHAPTERS_PER_THREAT_STEP) === 0;
    const contractTarget = !boss && typeof eliteContractTargetDue === 'function' ? eliteContractTargetDue(state, rawDepth) : null;
    const eliteChance = clamp(eliteChanceForFloor(threatDepth) + ladder.eliteBonus + contractRisk.spawnBonus, 0.04, 0.43);
    const elite = !boss && (contractTarget || Math.random() < eliteChance);
    const modifiers = elite && !boss ? selectEliteModifiers(rawDepth, state) : [];
    const modifier = modifiers[0] || null;
    const tier = boss ? 'Boss' : elite ? 'Elite' : 'Common';
    const earlyPressure = threatDepth <= 3 ? 0.90 : threatDepth <= 5 ? 1.0 : threatDepth <= 10 ? 1.08 : threatDepth <= 15 ? 1.06 : 1;
    // Monster scaling: threat-depth base roll × room/floor ladder × deep-floor pressure.
    // The deep multiplier is intentionally dormant before raw depth 800, then ramps so
    // normal monsters do not flatten behind deep Mythic-equipped players.
    const lateFloorPressure = rawDepth <= 20 ? 1 : rawDepth <= 40 ? 1 + (rawDepth - 20) * 0.085 : 2.7 + Math.min(0.8, (rawDepth - 40) * 0.015);
    let power = Math.round((threatDepth * rand(8, 11) + rand(10, 20) + (boss ? 72 : 0) + (elite ? 16 : 0)) * earlyPressure * ladder.powerMult * lateFloorPressure * deepMonsterPowerMultiplier(rawDepth, tier));
    let hp = power * (boss ? 2.95 : elite ? 1.84 : 1.44) * ladder.hpMult * (rawDepth <= 20 ? 1 : rawDepth <= 40 ? 1 + (rawDepth - 20) * 0.1 : 3);
    let guard = Math.round(power * 0.32 * ladder.guardMult);
    let speed = Math.round(power * 0.19 * ladder.speedMult);
    let rewardMult = (threatDepth <= 3 ? (boss ? 1.55 : elite ? 1.28 : 1.12) : boss ? 1.5 : elite ? 1.18 : 1) * ladder.rewardMult;
    let name = `${family} ${type}`;
    let reviveUsed = false;
    const eliteReward = elite ? eliteRewardProfile(modifiers, rawDepth) : null;
    const rewardPower = power;
    const rewardGold = encounterCoinReward(threatDepth, rewardPower, tier, rewardMult);
    if (elite) {
      power = Math.round(power * (1 + contractRisk.damageBonus));
      hp = Math.round(hp * (1 + contractRisk.hpBonus));
    }
    const monster = {
      id: makeId('monster'),
      name,
      family,
      type,
      affix,
      skill,
      tier,
      modifier,
      modifiers,
      eliteReward,
      reviveUsed,
      ashFedTriggered: false,
      level: rawDepth,
      depthPressure: Math.round(ladder.totalPressure * 100),
      power,
      maxHp: Math.round(hp),
      hp: Math.round(hp),
      guard,
      speed,
      rewardGold,
      rewardXp: Math.max(6, Math.round(power * 1.05 * rewardMult)),
      rewardShard: boss ? rand(22, 34) : elite ? rand(7, 12) + (eliteReward?.shardBonus || 0) : rand(1, 4),
      lore: boss ? 'A named ruin-lord waits deeper than prayer.' : `A ${tier.toLowerCase()} threat shaped by the ruin-depths.`
    };
    return contractTarget && typeof applyEliteContractTargetMonster === 'function'
      ? applyEliteContractTargetMonster(state, monster, contractTarget)
      : monster;
  }

  function runDeepScalingAudit(state = S) {
    const depths = [50, 100, 250, 500, 1000, 2000, 3000, 4000];
    const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? +(a / b).toFixed(2) : 'n/a');
    const verdictFor = (rawDepth, mythicVsNormal, mythicVsElite, mythicVsBoss, mythicVsLegendary) => {
      if (rawDepth < 1000) return 'early/mid reference';
      if (mythicVsLegendary < 1.04) return 'watch: mythic identity thin';
      if (mythicVsBoss > 1.15) return 'watch: mythic outruns boss pressure';
      if (mythicVsElite > 1.30) return 'watch: mythic outruns elite pressure';
      if (mythicVsNormal > 1.65) return 'watch: mythic ahead of commons';
      if (mythicVsNormal < 0.95) return 'watch: monsters too steep';
      return 'healthy band';
    };
    const currentStats = state ? calcDerived(state) : null;
    const playerPower = currentStats ? Math.round(numberOr(currentStats.power, 0, 0, 9999999)) : 0;
    const rows = depths.map(rawDepth => {
      const level = threatDepthFromDepth(rawDepth);
      const common = expectedGearRating(level, 'common', 'normal', rawDepth);
      const rare = expectedGearRating(level, 'rare', 'normal', rawDepth);
      const legendary = expectedGearRating(level, 'legendary', 'boss', rawDepth);
      const mythic = expectedGearRating(level, 'mythic', 'boss', rawDepth);
      const normalMonster = expectedMonsterPowerAtDepth(rawDepth, 'Common');
      const eliteMonster = expectedMonsterPowerAtDepth(rawDepth, 'Elite');
      const bossMonster = expectedMonsterPowerAtDepth(rawDepth, 'Boss');
      const mythicVsNormal = ratio(mythic, normalMonster);
      const mythicVsElite = ratio(mythic, eliteMonster);
      const mythicVsBoss = ratio(mythic, bossMonster);
      const mythicVsLegendary = ratio(mythic, legendary);
      return {
        depth: rawDepth,
        threatLevel: level,
        normalMonsterPower: normalMonster,
        eliteMonsterPower: eliteMonster,
        bossMonsterPower: bossMonster,
        commonItemPower: common,
        rareItemPower: rare,
        legendaryItemPower: legendary,
        mythicItemPower: mythic,
        mythicSoftener: +mythicDepthSoftener(level, rawDepth).toFixed(3),
        mythicVsNormal,
        mythicVsElite,
        mythicVsBoss,
        mythicVsLegendary,
        eliteVsNormal: ratio(eliteMonster, normalMonster),
        bossVsNormal: ratio(bossMonster, normalMonster),
        currentPlayerPower: playerPower || 'n/a',
        currentPlayerToNormalRatio: playerPower ? ratio(playerPower, normalMonster) : 'n/a',
        tuningVerdict: verdictFor(rawDepth, mythicVsNormal, mythicVsElite, mythicVsBoss, mythicVsLegendary)
      };
    });
    console.info('DungeonDex scaling audit target: deep Mythics stay exciting while elite and boss pressure remains credible beyond D1000.');
    console.table(rows);
    return rows;
  }
