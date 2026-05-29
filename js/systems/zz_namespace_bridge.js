// Namespace bridge: collect common globals into a single `DD` namespace.
// This file is safe to load after the other `js/systems` scripts and does
// not remove existing globals; it only makes them available under `window.DD`.
'use strict';

(function () {
  if (typeof window === 'undefined') return;
  window.DD = window.DD || {};
  const ns = window.DD;

  // Single canonical monster archetype and cue provider (de-duplicates repeated blocks)
  ns.DD_MONSTER_ARCHETYPES = ns.DD_MONSTER_ARCHETYPES || [
    'Brute', 'Ritualist', 'Skulker', 'Ashbound',
    'Mireborn', 'Furnace Spawn', 'Hollowed', 'Warden'
  ];

  ns.ddGetMonsterCue = ns.ddGetMonsterCue || function (name) {
    const cues = [
      "The creature watches silently.",
      "Ash drifts from the enemy's armor.",
      "A hostile presence fills the chamber.",
      "The monster prepares to strike."
    ];
    return cues[Math.floor(Math.random() * cues.length)];
  };

  // Common top-level symbols to mirror into the namespace for gradual modernization.
  // This list focuses on the most-used constants and functions across `js/systems`.
  const mirror = [
    // core constants
    'STORAGE_KEY','BUILD','VISIBLE_VERSION_LABEL','MAX_ITEM_LEVEL','BOSS_INTERVAL',
    'DEPTH_CHAPTERS_PER_ROOM','DEPTH_ROOMS_PER_FLOOR','DEPTH_CHAPTERS_PER_FLOOR','DEPTH_CHAPTERS_PER_THREAT_STEP',
    'ACTION_GUARD_MS','COMBAT_ACTION_GUARD_MS','COMBAT_LOG_STORE_LIMIT','COMBAT_LOG_RENDER_LIMIT','COMBAT_AUTOSAVE_MS',
    'INTRO_MODAL_SESSION_KEY','VALID_SCREENS','CORE_COMBAT_ACTIONS','DEFAULT_PLAYER_STATS','SLOT_ORDER','INVENTORY_SORTS','RARITIES',
    'BASES','PREFIXES','SUFFIXES','TRINKET_SUFFIXES','MAKERS','THEMES','MYTHIC_SET_SLOTS','LEGACY_MYTHIC_SET_SLOTS','MYTHIC_SET_SLOT_ALIASES','BASE_SLOT_ALIASES','MYTHIC_SET_DEFINITIONS','MONSTER_FAMILIES','MONSTER_TYPES','MONSTER_AFFIXES','MONSTER_SKILLS','LORE_SNIPPETS','DISTRICT_DATA','BOSS_FLOOR_NAMES',

    // small utilities
    'el','$$','clamp','pick','rand','format','isPlainObject','asArray','numberOr','normalizeItemLevel','makeId','escapeHtml','stripHtml',

    // pending/currency
    'COPPER_PER_SILVER','SILVER_PER_GOLD','COPPER_PER_GOLD','toCopper','coins','sanitizeCurrencyValue','addPlayerGold',

    // pending run helpers
    'createPendingRunRewards','ensurePendingRunRewards','clearPendingRunRewards','hasPendingRunRewards','pendingRunRewardSummary','addPendingRunGold','addPendingRunShards','addPendingRunEmber','addPendingRunXp','addPendingRunKill','addPendingRunLoot','addPendingGearDiscovery','addPendingQuestProgress','addPendingEliteContractKill','bankPendingRunRewards','discardPendingRunRewards','formatMoney',

    // contracts/market
    'GOLD_SINK_DEFAULTS','ELITE_CONTRACT_RISK_DEFAULTS','ELITE_CONTRACTS','ELITE_CONTRACT_ID_ALIASES','DISTRICT_MARKET_WARES',
    'createGoldSinkState','ensureGoldSinkState','eliteContractDef','normalizeEliteContractId','eliteContractRisk','eliteContractRiskLevel','eliteContractObjective','contractBaseReward','contractRewardCap','isValidRewardNumber','sanitizeContractReward','contractRewardDepth','calculateContractReward','activeContractRewardAmount','activeEliteContractDef','activeEliteContractRisk','activeEliteContractRiskText','normalizeEliteContractIds','createEliteContractState','ensureEliteContractState','isEliteContractAvailable','availableEliteContracts','startEliteContract','recordEliteContractKill','claimEliteContract','reachedDistrictFloor','districtForWare','unlockedDistrictWares','goldSinkStatus','goldSinkCannotBuyReason','activeGoldSinkPills','sellValue','itemIsEquipped','canQuickSellItem','canSellAllGearItem','isJunkSaleBonusItem','sellValueWithGoldSink','consumeJunkSaleBonus',

    // depth/charter
    'progressDepthValue','districtByDepth','defaultRunStartDepth','canUseSafeReturnStart','hardcoreDeathCheckpointDepth','hardcoreDepthReturnLabel','hardcoreDeathCheckpointLabel','currentStagingDistrict','districtToneClass','bossAtmosphereLine','districtArrivalLine','isDistrictEntryDepth','districtArrivalMarkup','extractionSummaryLine','runHistoryRewardSnapshot','runHistoryOutcomeLabel','runHistoryOutcomeClass','extractionPopupSummary','milestoneAtmosphereMarkup','bossFloorNameByDepth','depthStageValue','threatDepthFromDepth','bossThreatDepthFromDepth','floorNumberLabel','bossFloorLabel','nextBossDepthFromDepth','depthStructureFromRawDepth','depthShortLabel','depthLabel','depthWithRawLabel','runDepthLabel','depthProgressMeta','depthMilestoneNotice','isRoomMilestoneDepth','isFloorMilestoneDepth','applyRoomMilestoneReward','applyFloorMilestoneReward','depthDifficultyLadder','dangerRatingForDepth','isHighRarityKey','depthLootScarcityMeta','applyDepthLootScarcity','depthProgressMarkup','safeExtractDepthValue','safelyReachedFloor40','mythicSetDropsAllowed','isDeepRun','wasStartedFromDeepStairCharter',

    // scaling / generation
    'rarityIndex','cappedRarityForLevel','weightedRarityForLevel','earlyStatScale','mythicDepthSoftener','rarityStatMultiplier','deepMonsterPowerMultiplier','expectedGearRating','expectedMonsterPowerAtDepth','generateStarterJunk','eliteChanceForFloor','lootDropChance','shouldDropLoot','gearCatalogCount','monsterCatalogCount','createBaseState','generateGear','generateMonster','runDeepScalingAudit',

    // combat / player / run
    'calcDerived','xpGain','pushCombat','pushLog','cleanDisplayText','moneyText','runRewardSummaryText','runHistoryRewardText','normalizeRunHistoryReason','safeRunHistoryDate','combatFeedKind','combatFeedIcon','combatFeedLabel','renderCombatFeedLine','spawnQuestLore','startRun','startCharterRun','zoneName','nextEncounter','damageRoll','combatAction','winEncounter','RUN_EVENT_REGISTRY','runEventChance','createRunEvent','maybeTriggerRunEvent','applySootveilRunEventSalvage','grantRunEventSalvage','runEventSalvageText','resolveRunEvent','updateQuest','applyQuestProgressNow','rewardQuest','finishRun','defeat','equipItem','sellItem','sellAllQuickSafeGear','sellAllGear','hasNonStarterWeapon','merchantGear','buildMerchantStock','findCursedRerollTarget','buyDistrictWare','buyMerchantItem','rollMerchant','forgeItem','restCost','restPlayer',

    // normalization / save
    'normalizeItem','normalizeMonster','normalizeSaveShape','sanitizeLiveStateForSave','save','load',

    // UI/render
    'switchScreen','rarityClass','itemRarityKey','getItemLevelValue','getItemLevelLabel','getRarityCardClass','upgradeMarkup','renderStatBoxes','statBox','resourceBox','updateSaveStatus','showGoldPopup','showExtractionPopup','showDefeatPopup','latestRunSummary','nextBossFloorFromDepth','introStat','deepStairCharterMarkup','introProgressMarkup','renderIntroModal','hideIntroModal','shouldShowIntroModal','showIntroModalOnce','renderTown','districtWareCard','shopCard','combatBackdropToken','combatBackdropHas','combatBackdropKind','combatBackdropClasses','combatPersonalityKind','combatPersonalityLine','dungeonAtmosphereProfile','dungeonAtmosphereClasses','dungeonAtmosphereMarkup','renderRun','LOADOUT_SLOT_GROUPS','LOADOUT_STAT_LABELS','LOADOUT_SLOT_STAT_PRIORITY','slotDisplayName','loadoutFilters','loadoutDisplaySlots','loadoutSlotGroups','cleanGearText','safeGearStats','gearPowerValue','gearPrimaryStat','renderStickyBar','syncScreenState','render','maybeSaveCombat','renderCombatTick','refreshInventoryOnly','runGuardedAction','runCombatGuardedAction','bindInventoryActions','bindCombatActions','bindIntroModalActions','bindDynamic','escapeHtml','checkpointAuditRow','runCheckpointCharterAudit','bindStatic'
  ];

  mirror.forEach((name) => {
    try {
      if (typeof name !== 'string') return;
      if (window[name] !== undefined && ns[name] === undefined) ns[name] = window[name];
    } catch (err) {
      // ignore
    }
  });

  // convenience: expose `DD` on window for older code and dev console
  window.DD = ns;
})();
