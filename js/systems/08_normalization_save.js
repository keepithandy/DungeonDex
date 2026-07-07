'use strict';

// Item/monster/save normalization and persistence
  function normalizeGearMemoryTag(tag) {
    const clean = cleanDisplayText(tag || '', '').slice(0, 32);
    if (!clean) return '';
    const known = asArray(typeof FAMOUS_GEAR_MEMORY_TAGS !== 'undefined' ? FAMOUS_GEAR_MEMORY_TAGS : [], [])
      .find(entry => String(entry || '').toLowerCase() === clean.toLowerCase());
    return known || clean;
  }

  function normalizeGearMemoryTags(value) {
    const tags = [];
    const source = Array.isArray(value) ? value : (value ? [value] : []);
    source.forEach(tag => {
      const clean = normalizeGearMemoryTag(tag);
      if (clean && !tags.includes(clean)) tags.push(clean);
    });
    return tags.slice(0, 5);
  }

  function normalizeGearMemoryCount(value) {
    return Math.floor(numberOr(value, 0, 0, Number.MAX_SAFE_INTEGER));
  }

  function normalizeGearMemory(value, item = {}) {
    const source = isPlainObject(value) ? value : {};
    const legacy = isPlainObject(item) ? item : {};
    const tags = normalizeGearMemoryTags(source.tags ?? source.memoryTags ?? legacy.memoryTags ?? legacy.fameTags ?? []);
    const title = cleanDisplayText(source.title || legacy.fameTitle || legacy.memoryTitle || '', '').slice(0, 40);
    const firstMarkedAt = cleanDisplayText(source.firstMarkedAt || legacy.firstMarkedAt || legacy.markedAt || '', '').slice(0, 40);
    const rawNotes = Array.isArray(source.notes) ? source.notes : (source.notes ? [source.notes] : []);
    if (legacy.memoryNote) rawNotes.push(legacy.memoryNote);
    const notes = rawNotes
      .map(note => cleanDisplayText(note || '', '').slice(0, 80))
      .filter(Boolean)
      .slice(0, 3);
    const kills = normalizeGearMemoryCount(source.kills);
    const bossKills = normalizeGearMemoryCount(source.bossKills);
    const eliteKills = normalizeGearMemoryCount(source.eliteKills);
    const chaptersCleared = normalizeGearMemoryCount(source.chaptersCleared);
    if (!tags.length && !title && !firstMarkedAt && !notes.length && !kills && !bossKills && !eliteKills && !chaptersCleared) return null;
    return {
      tags,
      title: title || (tags.length ? 'Famous Gear' : ''),
      firstMarkedAt,
      notes,
      kills,
      bossKills,
      eliteKills,
      chaptersCleared
    };
  }

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
    const gearMemory = normalizeGearMemory(item.gearMemory, item);
    if (gearMemory) item.gearMemory = gearMemory;
    else delete item.gearMemory;
    delete item.memoryTags;
    delete item.fameTags;
    delete item.fameTitle;
    delete item.memoryTitle;
    delete item.memoryNote;
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
    const normalizedModifiers = [];
    const eliteReward = null;
    const family = String(monster.family || (monster.contractTarget ? 'Elite Hunt' : 'Husk'));
    const type = String(monster.type || (monster.contractTarget ? 'Contract' : 'Stalker'));
    const name = monster.contractTarget
      ? String(monster.contractEliteName || monster.name || 'Recovered Elite Hunt')
      : `${family} ${type}`.trim();
    return {
      id: monster.id || makeId('monster'),
      name: name || 'Recovered Hollow Threat',
      family,
      type,
      affix: '',
      skill: 'Basic attack',
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
      rivalTarget: !!monster.rivalTarget,
      rivalId: String(monster.rivalId || ''),
      contractModifierName: '',
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

  const TALENT_POINT_STEP = 5;
  const TALENT_POINT_CAP = 20;
  const TALENT_BONUS_KEYS = Object.freeze(['maxHpPct', 'eliteBoardRewardPct', 'charterCostPct', 'sellValuePct']);
  const TALENT_LEDGER_VERSION = 1;
  const ZERO_TALENT_BONUSES = Object.freeze({
    maxHpPct: 0,
    eliteBoardRewardPct: 0,
    charterCostPct: 0,
    sellValuePct: 0
  });

  function createTalentState() {
    const unlocked = {};
    return {
      pointsEarned: 0,
      pointsSpent: 0,
      unlocked,
      spent: unlocked,
      unlockedIds: []
    };
  }

  function bossTrophyDefinitionById(id) {
    const clean = String(id || '').trim();
    if (!clean) return null;
    return asArray(typeof BOSS_TROPHY_DEFINITIONS !== 'undefined' ? BOSS_TROPHY_DEFINITIONS : [], []).find(entry => String(entry?.id || '').trim() === clean) || null;
  }

  function normalizeBossTrophyRecords(source, unlockedIds = []) {
    if (typeof bossTrophyStateModel === 'function') {
      return bossTrophyStateModel({ player: { bossTrophyRecords: source, bossTrophies: unlockedIds } }).records;
    }
    const records = [];
    const seen = new Set();
    asArray(source, []).forEach(raw => {
      if (!isPlainObject(raw)) return;
      const fallbackId = raw.trophyId || raw.id || raw.bossId || raw.bossName;
      const def = bossTrophyDefinitionById(fallbackId);
      const recordId = String(raw.id || raw.trophyId || def?.id || '').trim();
      if (!recordId || seen.has(recordId)) return;
      seen.add(recordId);
      const rawDepth = Math.max(0, Math.floor(numberOr(raw.rawDepth, raw.bestKillDepth, 0, 999999)));
      const bestKillDepth = Math.max(0, Math.floor(numberOr(raw.bestKillDepth, rawDepth, 0, 999999)));
      const count = Math.max(1, Math.floor(numberOr(raw.count, 1, 1, 9999)));
      records.push({
        id: recordId,
        trophyId: recordId,
        trophyName: String(raw.trophyName || raw.name || def?.name || 'Boss Trophy'),
        bossName: String(raw.bossName || raw.sourceBoss || def?.source || 'Unknown Boss'),
        floor: Math.max(1, Math.floor(numberOr(raw.floor, 1, 1, 999999))),
        room: Math.max(1, Math.floor(numberOr(raw.room, 1, 1, 999999))),
        chapter: Math.max(1, Math.floor(numberOr(raw.chapter, 1, 1, 999999))),
        rawDepth,
        securedDepth: Math.max(1, Math.floor(numberOr(raw.securedDepth, 1, 1, 999999))),
        bestKillDepth,
        count,
        tone: String(raw.tone || def?.tone || 'Trophy'),
        source: String(raw.source || def?.source || 'Boss Floor'),
        image: String(raw.image || def?.image || 'assets/trophies/hollow_stair_skull_trophy.png'),
        icon: String(raw.icon || def?.icon || ''),
        earnedAt: Math.max(0, Math.floor(numberOr(raw.earnedAt || raw.defeatedAt || raw.completedAt || raw.createdAt || raw.unlockedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
      });
    });
    unlockedIds.forEach(id => {
      const clean = String(id || '').trim();
      if (!clean || seen.has(clean)) return;
      const def = bossTrophyDefinitionById(clean);
      records.push({
        id: clean,
        trophyId: clean,
        trophyName: String(def?.name || 'Boss Trophy'),
        bossName: String(def?.source || 'Unknown Boss'),
        floor: Math.max(1, Math.floor(numberOr(def?.boss, 1, 1, 999999) * Math.max(1, Math.floor(numberOr(BOSS_INTERVAL, 5, 1, 999999))))),
        room: 1,
        chapter: 1,
        rawDepth: Math.max(0, Math.floor(numberOr(def?.requiredDepth, 0, 0, 999999))),
        securedDepth: Math.max(1, Math.floor(numberOr(def?.requiredDepth, 1, 1, 999999))),
        bestKillDepth: Math.max(0, Math.floor(numberOr(def?.requiredDepth, 0, 0, 999999))),
        count: 1,
        tone: String(def?.tone || 'Trophy'),
        source: String(def?.source || 'Boss Floor'),
        image: String(def?.image || 'assets/trophies/hollow_stair_skull_trophy.png'),
        icon: String(def?.icon || ''),
        earnedAt: 0
      });
    });
    return records.slice(0, 80);
  }

  function normalizeRetiredRelicRecords(source) {
    const records = [];
    const seen = new Set();
    asArray(source, []).forEach(raw => {
      if (!isPlainObject(raw)) return;
      const itemSource = isPlainObject(raw.item) ? { ...raw.item } : { ...raw };
      if (!itemSource.gearMemory && raw.gearMemory) itemSource.gearMemory = raw.gearMemory;
      if (!itemSource.memoryTags && raw.memoryTags) itemSource.memoryTags = raw.memoryTags;
      if (!itemSource.fameTitle && raw.fameTitle) itemSource.fameTitle = raw.fameTitle;
      if (!itemSource.memoryNote && raw.memoryNote) itemSource.memoryNote = raw.memoryNote;
      const item = normalizeItem(itemSource, raw.slot || raw.item?.slot || 'weapon');
      if (!item) return;
      const recordId = String(raw.id || raw.recordId || item.id || '').trim() || makeId('retired');
      if (seen.has(recordId)) return;
      seen.add(recordId);
      const archivedAt = Math.max(0, Math.floor(numberOr(raw.archivedAt, raw.recordedAt, raw.earnedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER)));
      records.push({
        id: recordId,
        archivedAt,
        stamp: cleanDisplayText(raw.stamp || (archivedAt ? new Date(archivedAt).toLocaleString() : ''), ''),
        rawDepth: Math.max(0, Math.floor(numberOr(raw.rawDepth, raw.depth, raw.bestDepth, 0, 999999))),
        floor: Math.max(1, Math.floor(numberOr(raw.floor, 1, 1, 999999))),
        room: Math.max(1, Math.floor(numberOr(raw.room, 1, 1, 999999))),
        chapter: Math.max(1, Math.floor(numberOr(raw.chapter, 1, 1, 999999))),
        slot: String(raw.slot || item.slot || 'weapon'),
        rarity: String(raw.rarity || item.rarity || 'common'),
        itemLevel: Math.max(1, Math.floor(numberOr(raw.itemLevel, item.level, 1, 99999))),
        rating: Math.max(1, Math.floor(numberOr(raw.rating, item.rating, 1, 999999))),
        value: Math.max(1, Math.floor(numberOr(raw.value, item.value, 1, Number.MAX_SAFE_INTEGER))),
        source: cleanDisplayText(raw.source || raw.reason || 'DevTools Archive Record', 'DevTools Archive Record'),
        note: cleanDisplayText(raw.note || raw.summary || item.summary || 'Archive record preserved for future retirement workflows.', 'Archive record preserved for future retirement workflows.'),
        item
      });
    });
    return records.slice(0, 80);
  }

  function bestTalentProgressDepth(state) {
    const runDepth = Math.floor(numberOr(state?.run?.floor, 0, 0, 999999));
    const depth = Math.max(
      runDepth,
      Math.floor(numberOr(state?.player?.depth, 0, 0, 999999)),
      Math.floor(numberOr(state?.player?.safeExtractDepth, 0, 0, 999999)),
      Math.floor(numberOr(state?.player?.returnDepth, 0, 0, 999999)),
      Math.floor(numberOr(state?.player?.permanentStartFloor, 0, 0, 999999))
    );
    return Math.max(1, depth || 1);
  }

  function talentMilestonePoints(depth) {
    return 0;
  }

  function normalizeTalentUnlocks(value) {
    return {};
  }

  function normalizeTalentUnlockIds(value) {
    return [];
  }

  function normalizeTalentLearnedIds(value) {
    const learned = {};
    if (!isPlainObject(value)) return learned;
    Object.keys(value).forEach(key => {
      if (value[key] === true) learned[String(key)] = true;
    });
    return learned;
  }

  function normalizeTalentLearnedIdList(value) {
    const learned = [];
    const source = Array.isArray(value) ? value : [];
    source.forEach(entry => {
      const clean = String(entry || '').trim();
      if (clean && !learned.includes(clean)) learned.push(clean);
    });
    return learned;
  }

  function createTalentEarningState() {
    return {
      enabled: true,
      sourceId: 'boss_depth_milestone',
      milestonesReached: {},
      pointsAwarded: 0
    };
  }

  function normalizeTalentEarningState(state) {
    const earning = createTalentEarningState();
    if (!state?.player) return earning;
    const saved = isPlainObject(state.player.talentEarning) ? state.player.talentEarning : {};
    earning.enabled = true;
    earning.sourceId = 'boss_depth_milestone';
    earning.milestonesReached = isPlainObject(saved.milestonesReached) ? saved.milestonesReached : {};
    earning.pointsAwarded = Math.max(0, Math.floor(numberOr(saved.pointsAwarded, 0, 0, Number.MAX_SAFE_INTEGER)));
    state.player.talentEarning = earning;
    return earning;
  }

  function repairTalentState(state) {
    const talentState = createTalentState();
    talentState.spent = talentState.unlocked;
    if (!state?.player) return talentState;
    state.player.talents = talentState;
    state.player.talentPointsEarned = 0;
    state.player.talentPointsSpent = 0;
    state.player.talentPoints = 0;
    state.player.talentUnlockIds = normalizeTalentLearnedIdList(state.player.talentUnlockIds);
    state.player.talentLearnedIds = normalizeTalentLearnedIds(state.player.talentLearnedIds);
    const earning = normalizeTalentEarningState(state);
    if (earning && earning.enabled === true && typeof window !== 'undefined' && window.DungeonDexTalents && typeof window.DungeonDexTalents.applyPendingTalentMilestoneAwards === 'function') {
      window.DungeonDexTalents.applyPendingTalentMilestoneAwards(state);
    }
    return talentState;
  }

  function safeTalentLedgerSource(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const proto = Object.getPrototypeOf(value);
    if (proto && proto !== Object.prototype && proto !== null) return {};
    return value;
  }

  function ownTalentLedgerValue(source, key, fallback) {
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallback;
  }

  function normalizeTalentLedger(value) {
    const source = safeTalentLedgerSource(value);
    const rawNotes = ownTalentLedgerValue(source, 'notes', []);
    return {
      version: Math.max(TALENT_LEDGER_VERSION, Math.floor(numberOr(ownTalentLedgerValue(source, 'version', TALENT_LEDGER_VERSION), TALENT_LEDGER_VERSION, TALENT_LEDGER_VERSION, 999999))),
      unlocked: false,
      previewOnly: true,
      lifetimePoints: 0,
      availablePoints: 0,
      spentPoints: 0,
      earnedSources: [],
      awardClaims: {},
      notes: asArray(rawNotes, [])
        .map(entry => cleanDisplayText(entry || '', '').slice(0, 80))
        .filter(Boolean)
        .slice(0, 6)
    };
  }

  function normalizeTalentLedgerState(state) {
    if (!state?.player) return normalizeTalentLedger();
    const ledger = normalizeTalentLedger(state.player.talentLedger);
    const earning = isPlainObject(state.player.talentEarning) ? state.player.talentEarning : {};
    const earned = Math.max(0, Math.floor(numberOr(earning.pointsAwarded, 0, 0, Number.MAX_SAFE_INTEGER)));
    const learnedMap = normalizeTalentLearnedIds(state.player.talentLearnedIds);
    const learnedCount = Object.keys(learnedMap).length;
    const repairedClaims = typeof window !== 'undefined' && typeof window.normalizeTalentAwardClaims === 'function'
      ? window.normalizeTalentAwardClaims(state.player.talentLedger?.awardClaims)
      : {};
    const liveClaimPoints = Object.keys(repairedClaims).length;
    const totalPoints = earned + liveClaimPoints;
    const available = Math.max(0, totalPoints - learnedCount);
    ledger.lifetimePoints = totalPoints;
    ledger.availablePoints = available;
    ledger.spentPoints = Math.max(0, totalPoints - available);
    ledger.previewOnly = true;
    ledger.unlocked = false;
    ledger.earnedSources = [{ sourceId: 'boss_depth_milestone', points: totalPoints }];
    ledger.awardClaims = repairedClaims;
    state.player.talentLedger = ledger;
    return ledger;
  }

  function getTalentState(state) {
    return repairTalentState(state);
  }

  function getTalentLedger(state) {
    return normalizeTalentLedgerState(state);
  }

  function hasTalent(state, id) {
    repairTalentState(state);
    return false;
  }

  function getTalentBonuses(state) {
    repairTalentState(state);
    return { ...ZERO_TALENT_BONUSES };
  }

  function getTalentBonus(state, key) {
    const bonuses = getTalentBonuses(state);
    return Math.max(0, Math.min(1, Math.max(0, numberOr(bonuses[key], 0, 0, 1))));
  }

  function getAvailableTalentPoints(state) {
    repairTalentState(state);
    return 0;
  }

  function grantTalentPoints(state, amount = 1) {
    repairTalentState(state);
    return 0;
  }

  function unlockTalent(state, id) {
    repairTalentState(state);
    return false;
  }

  function resetTalents(state) {
    if (!state?.player) return false;
    state.player.talents = createTalentState();
    state.player.talentPointsEarned = 0;
    state.player.talentPointsSpent = 0;
    state.player.talentPoints = 0;
    state.player.talentUnlockIds = [];
    state.player.talentLearnedIds = {};
    return true;
  }

  function talentSummary(state) {
    repairTalentState(state);
    return {
      pointsEarned: 0,
      pointsSpent: 0,
      pointsAvailable: 0,
      unlockedIds: [],
      bonuses: { ...ZERO_TALENT_BONUSES }
    };
  }

  function talentPointLedger(state) {
    return getTalentLedger(state);
  }

  function talentPointLedgerSummary(state) {
    const ledger = getTalentLedger(state);
    return {
      previewOnly: ledger.previewOnly === true,
      unlocked: ledger.unlocked === true,
      lifetimePoints: ledger.lifetimePoints,
      availablePoints: ledger.availablePoints,
      spentPoints: ledger.spentPoints,
      canEarn: false,
      canSpend: false,
      sourceCount: Array.isArray(ledger.earnedSources) ? ledger.earnedSources.length : 0
    };
  }

  function createDebtCollectorState() {
    return {
      active: false,
      balanceCopper: 0,
      pressure: 0,
      lastVisitAt: '',
      notes: []
    };
  }

  function createRevisitState() {
    return {
      unlocked: false,
      lastViewedAt: '',
      notedDistricts: [],
      activeRouteKey: '',
      startedAt: 0,
      sourceFloor: 0,
      sideRoute: false,
      locked: true,
      cappedReward: true,
      trophyEcho: {
        active: null,
        history: [],
        memoryMarks: 0,
        completedKeys: {},
        lastResult: null
      },
      famousGear: {
        active: null,
        history: [],
        completedKeys: {},
        lastResult: null
      },
      boardEcho: {
        active: null,
        history: [],
        completedKeys: {},
        lastResult: null
      },
      rivalTrace: {
        active: null,
        history: [],
        completedKeys: {},
        lastResult: null
      }
    };
  }

  function normalizeRevisitText(value, fallback = '', limit = 120) {
    return cleanDisplayText(value || fallback || '', fallback || '').slice(0, limit);
  }

  function normalizeRevisitCompletedKeys(value) {
    const map = {};
    if (!isPlainObject(value)) return map;
    Object.keys(value).forEach(key => {
      const cleanKey = String(key || '').trim().slice(0, 80);
      if (!cleanKey || !/^(trophy_echo|famous_gear|rival_trace):[^:]+$/i.test(cleanKey)) return;
      map[cleanKey] = value[key] === true;
    });
    return map;
  }

  function normalizeTrophyEchoHistoryEntry(value) {
    if (!isPlainObject(value)) return null;
    const completionKey = normalizeRevisitText(value.completionKey || value.claimKey || '', '', 80);
    const trophyId = normalizeRevisitText(value.trophyId || value.sourceTrophyId || '', '', 80);
    const bossName = normalizeRevisitText(value.bossName || value.sourceBoss || 'Unknown Boss', 'Unknown Boss', 60);
    const trophyName = normalizeRevisitText(value.trophyName || value.memoryTitle || 'Boss Trophy', 'Boss Trophy', 60);
    const summary = normalizeRevisitText(value.summary || value.resultSummary || '', '', 180);
    if (!completionKey || !trophyId || !summary) return null;
    return {
      completionKey,
      trophyId,
      recordId: normalizeRevisitText(value.recordId || '', '', 80),
      trophyName,
      bossName,
      memoryTitle: normalizeRevisitText(value.memoryTitle || trophyName, trophyName, 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summary,
      bestDepth: Math.max(0, Math.floor(numberOr(value.bestDepth, 0, 0, 999999))),
      rewardMark: Math.max(0, Math.floor(numberOr(value.rewardMark, 0, 0, 1))),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt: Math.max(0, Math.floor(numberOr(value.completedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeTrophyEchoActive(value) {
    if (!isPlainObject(value)) return null;
    const routeKey = normalizeRevisitText(value.routeKey || 'trophy_echo_route', 'trophy_echo_route', 40);
    const trophyId = normalizeRevisitText(value.trophyId || value.sourceTrophyId || '', '', 80);
    const completionKey = normalizeRevisitText(value.completionKey || `trophy_echo:${trophyId}`, `trophy_echo:${trophyId}`, 80);
    if (!trophyId || !/^trophy_echo:[^:]+$/i.test(completionKey)) return null;
    return {
      routeKey,
      completionKey,
      trophyId,
      recordId: normalizeRevisitText(value.recordId || '', '', 80),
      trophyName: normalizeRevisitText(value.trophyName || value.memoryTitle || 'Boss Trophy', 'Boss Trophy', 60),
      bossName: normalizeRevisitText(value.bossName || value.sourceBoss || 'Unknown Boss', 'Unknown Boss', 60),
      memoryTitle: normalizeRevisitText(value.memoryTitle || value.trophyName || 'Boss Trophy', 'Boss Trophy', 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summaryLine: normalizeRevisitText(value.summaryLine || '', '', 140),
      sourceLabel: normalizeRevisitText(value.sourceLabel || '', '', 80),
      bestDepth: Math.max(0, Math.floor(numberOr(value.bestDepth, 0, 0, 999999))),
      sourceFloor: Math.max(0, Math.floor(numberOr(value.sourceFloor, 0, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeRevisitTrophyEchoState(value) {
    const source = isPlainObject(value) ? value : {};
    const history = asArray(source.history, []).map(normalizeTrophyEchoHistoryEntry).filter(Boolean).slice(0, 20);
    const completedKeys = normalizeRevisitCompletedKeys(source.completedKeys);
    return {
      active: normalizeTrophyEchoActive(source.active),
      history,
      memoryMarks: Math.max(0, Math.floor(numberOr(source.memoryMarks, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedKeys,
      lastResult: normalizeTrophyEchoHistoryEntry(source.lastResult)
    };
  }

  function normalizeFamousGearHistoryEntry(value) {
    if (!isPlainObject(value)) return null;
    const completionKey = normalizeRevisitText(value.completionKey || value.claimKey || '', '', 80);
    const recordId = normalizeRevisitText(value.recordId || value.sourceRecordId || value.itemId || '', '', 80);
    const itemName = normalizeRevisitText(value.itemName || value.gearName || 'Famous Gear', 'Famous Gear', 60);
    const summary = normalizeRevisitText(value.summary || value.resultSummary || '', '', 180);
    if (!completionKey || !recordId || !summary) return null;
    return {
      completionKey,
      recordId,
      itemId: normalizeRevisitText(value.itemId || '', '', 80),
      itemName,
      slot: normalizeRevisitText(value.slot || '', '', 40),
      memoryTitle: normalizeRevisitText(value.memoryTitle || itemName, itemName, 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summary,
      sourceLabel: normalizeRevisitText(value.sourceLabel || '', '', 80),
      sourceFloor: Math.max(0, Math.floor(numberOr(value.sourceFloor, 0, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt: Math.max(0, Math.floor(numberOr(value.completedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeFamousGearActive(value) {
    if (!isPlainObject(value)) return null;
    const recordId = normalizeRevisitText(value.recordId || value.sourceRecordId || value.itemId || '', '', 80);
    const completionKey = normalizeRevisitText(value.completionKey || `famous_gear:${recordId}`, `famous_gear:${recordId}`, 80);
    if (!recordId || !/^famous_gear:[^:]+$/i.test(completionKey)) return null;
    return {
      routeKey: normalizeRevisitText(value.routeKey || 'famous_gear_route', 'famous_gear_route', 40),
      completionKey,
      recordId,
      itemId: normalizeRevisitText(value.itemId || '', '', 80),
      itemName: normalizeRevisitText(value.itemName || value.memoryTitle || 'Famous Gear', 'Famous Gear', 60),
      slot: normalizeRevisitText(value.slot || '', '', 40),
      memoryTitle: normalizeRevisitText(value.memoryTitle || value.itemName || 'Famous Gear', 'Famous Gear', 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summaryLine: normalizeRevisitText(value.summaryLine || '', '', 140),
      sourceLabel: normalizeRevisitText(value.sourceLabel || '', '', 80),
      sourceFloor: Math.max(0, Math.floor(numberOr(value.sourceFloor, 0, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeRevisitFamousGearState(value) {
    const source = isPlainObject(value) ? value : {};
    const history = asArray(source.history, []).map(normalizeFamousGearHistoryEntry).filter(Boolean);
    const dedupedHistory = typeof window !== 'undefined' && typeof window.dedupeFamousGearHistoryEntries === 'function'
      ? window.dedupeFamousGearHistoryEntries(history)
      : history;
    const completedKeys = normalizeRevisitCompletedKeys(source.completedKeys);
    return {
      active: normalizeFamousGearActive(source.active),
      history: dedupedHistory.slice(0, 20),
      completedKeys,
      lastResult: normalizeFamousGearHistoryEntry(source.lastResult)
    };
  }

  function normalizeRevisitRivalTraceActive(value) {
    return isPlainObject(value) ? {
      routeKey: String(value.routeKey || 'rival_trace_route').trim() || 'rival_trace_route',
      completionKey: String(value.completionKey || '').trim(),
      rivalId: String(value.rivalId || value.id || '').trim(),
      eliteName: cleanDisplayText(value.eliteName || 'Rival Elite', 'Rival Elite'),
      floorName: cleanDisplayText(value.floorName || 'Elite Board', 'Elite Board'),
      memoryTitle: normalizeRevisitText(value.memoryTitle || '', '', 140),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summaryLine: normalizeRevisitText(value.summaryLine || '', '', 140),
      defeats: Math.max(0, Math.floor(numberOr(value.defeats, 0, 0, 999999))),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    } : null;
  }

  function normalizeRevisitRivalTraceHistoryEntry(value) {
    if (!isPlainObject(value)) return null;
    return {
      completionKey: String(value.completionKey || '').trim(),
      rivalId: String(value.rivalId || '').trim(),
      eliteName: cleanDisplayText(value.eliteName || 'Rival Elite', 'Rival Elite'),
      memoryTitle: normalizeRevisitText(value.memoryTitle || '', 'Rival Trace', 140),
      reflection: normalizeRevisitText(value.reflection || '', '', 220),
      summary: normalizeRevisitText(value.summary || '', '', 220),
      floorName: cleanDisplayText(value.floorName || 'Elite Board', 'Elite Board'),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt: Math.max(0, Math.floor(numberOr(value.completedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeRevisitRivalTraceState(value) {
    const source = isPlainObject(value) ? value : {};
    const history = asArray(source.history, []).map(normalizeRevisitRivalTraceHistoryEntry).filter(Boolean).slice(0, 20);
    const completedKeys = normalizeRevisitCompletedKeys(source.completedKeys);
    return {
      active: normalizeRevisitRivalTraceActive(source.active),
      history,
      completedKeys,
      lastResult: normalizeRevisitRivalTraceHistoryEntry(source.lastResult)
    };
  }

  function normalizeRevisitBoardEchoActive(value) {
    return isPlainObject(value) ? {
      routeKey: String(value.routeKey || 'board_echo_route').trim() || 'board_echo_route',
      sourceRecordId: String(value.sourceRecordId || value.recordId || value.contractId || '').trim(),
      memoryTitle: normalizeRevisitText(value.memoryTitle || 'Board Echo', 'Board Echo', 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 180),
      summaryLine: normalizeRevisitText(value.summaryLine || value.summary || '', '', 180),
      sourceLabel: normalizeRevisitText(value.sourceLabel || 'Elite Board', 'Elite Board', 60),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    } : null;
  }

  function normalizeRevisitBoardEchoHistoryEntry(value) {
    if (!isPlainObject(value)) return null;
    return {
      routeKey: String(value.routeKey || 'board_echo_route').trim() || 'board_echo_route',
      sourceRecordId: String(value.sourceRecordId || value.recordId || '').trim(),
      memoryTitle: normalizeRevisitText(value.memoryTitle || 'Board Echo', 'Board Echo', 60),
      reflection: normalizeRevisitText(value.reflection || '', '', 180),
      summary: normalizeRevisitText(value.summary || value.summaryLine || '', '', 180),
      sourceLabel: normalizeRevisitText(value.sourceLabel || 'Elite Board', 'Elite Board', 60),
      completedLabel: normalizeRevisitText(value.completedLabel || value.lastCompletedLabel || '', '', 60),
      startedAt: Math.max(0, Math.floor(numberOr(value.startedAt, 0, 0, Number.MAX_SAFE_INTEGER))),
      completedAt: Math.max(0, Math.floor(numberOr(value.completedAt, 0, 0, Number.MAX_SAFE_INTEGER)))
    };
  }

  function normalizeRevisitBoardEchoState(value) {
    const source = isPlainObject(value) ? value : {};
    const history = asArray(source.history, []).map(normalizeRevisitBoardEchoHistoryEntry).filter(Boolean).slice(0, 20);
    const completedKeys = normalizeRevisitCompletedKeys(source.completedKeys);
    return {
      active: normalizeRevisitBoardEchoActive(source.active),
      history,
      completedKeys,
      lastResult: normalizeRevisitBoardEchoHistoryEntry(source.lastResult)
    };
  }

  function normalizeRevisitState(value) {
    const base = createRevisitState();
    const source = isPlainObject(value) ? value : {};
    base.unlocked = !!source.unlocked;
    base.lastViewedAt = String(source.lastViewedAt || '').trim();
    base.notedDistricts = asArray(source.notedDistricts, []).map(String).map(x => x.trim()).filter(Boolean).slice(0, 12);
    base.activeRouteKey = String(source.activeRouteKey || '').trim();
    base.startedAt = Math.max(0, Math.floor(numberOr(source.startedAt, 0, 0, Number.MAX_SAFE_INTEGER)));
    base.sourceFloor = Math.max(0, Math.floor(numberOr(source.sourceFloor, 0, 0, 999999)));
    base.sideRoute = !!source.sideRoute;
    base.locked = source.locked !== false;
    base.cappedReward = source.cappedReward !== false;
    base.trophyEcho = normalizeRevisitTrophyEchoState(source.trophyEcho);
    base.famousGear = normalizeRevisitFamousGearState(source.famousGear);
    base.boardEcho = normalizeRevisitBoardEchoState(source.boardEcho);
    base.rivalTrace = normalizeRevisitRivalTraceState(source.rivalTrace);
    return base;
  }

  function normalizeDebtCollectorState(value) {
    const base = createDebtCollectorState();
    const source = isPlainObject(value) ? value : {};
    const balanceCopper = Math.max(0, Math.floor(numberOr(source.balanceCopper, 0, 0, Number.MAX_SAFE_INTEGER)));
    const notes = asArray(source.notes, [])
      .map(note => cleanDisplayText(note || '', '').slice(0, 80))
      .filter(Boolean)
      .slice(0, 5);
    return {
      active: balanceCopper > 0,
      balanceCopper,
      pressure: balanceCopper > 0 ? Math.max(0, Math.floor(numberOr(source.pressure, 0, 0, 999999))) : 0,
      lastVisitAt: cleanDisplayText(source.lastVisitAt || '', '').slice(0, 40),
      notes: notes.length ? notes : base.notes
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
    state.player.debtCollector = normalizeDebtCollectorState(savedPlayer.debtCollector);
    state.player.revisitState = normalizeRevisitState(savedPlayer.revisitState);
    state.player.eliteContracts = createEliteContractState(isPlainObject(savedPlayer.eliteContracts) ? savedPlayer.eliteContracts : {}, state);
    state.player.eliteTrophies = typeof createEliteTrophyState === 'function'
      ? createEliteTrophyState(isPlainObject(savedPlayer.eliteTrophies) ? savedPlayer.eliteTrophies : {})
      : { collected:{}, totalFound:0, latestId:'' };
    state.player.deepStairCharters = normalizeCharterDepthList(savedPlayer.deepStairCharters);
    repairTalentState(state);
    normalizeTalentLedgerState(state);
    if (typeof window !== 'undefined' && typeof window.applyBossTrophyTalentAwardIfReady === 'function') {
      window.applyBossTrophyTalentAwardIfReady(state);
      normalizeTalentLedgerState(state);
    }
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
    const rawBossTrophyModel = typeof bossTrophyStateModel === 'function'
      ? bossTrophyStateModel({ player: { bossTrophyRecords: savedPlayer.bossTrophyRecords, bossTrophies: savedPlayer.bossTrophies } })
      : null;
    state.player.bossTrophies = Array.from(new Set(asArray(savedPlayer.bossTrophies, []).map(String).map(id => id.trim()).filter(Boolean))).slice(0, 80);
    state.player.bossTrophyRecords = normalizeBossTrophyRecords(savedPlayer.bossTrophyRecords, state.player.bossTrophies);
    if (typeof normalizeBossTrophyStateShape === 'function') {
      normalizeBossTrophyStateShape(state);
    } else {
      state.player.bossTrophies = Array.from(new Set(state.player.bossTrophies.concat(state.player.bossTrophyRecords.map(entry => String(entry.trophyId || entry.id || '').trim()).filter(Boolean)))).slice(0, 80);
    }
    if (typeof rememberBossTrophyRepairFlags === 'function') rememberBossTrophyRepairFlags(state, rawBossTrophyModel);
    state.player.retiredRelics = normalizeRetiredRelicRecords(savedPlayer.retiredRelics);
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
    state.player.eliteTrophies = typeof createEliteTrophyState === 'function'
      ? createEliteTrophyState(isPlainObject(state.player.eliteTrophies) ? state.player.eliteTrophies : {})
      : { collected:{}, totalFound:0, latestId:'' };
    state.player.debtCollector = normalizeDebtCollectorState(state.player.debtCollector);
    state.player.revisitState = normalizeRevisitState(state.player.revisitState);
    state.player.retiredRelics = normalizeRetiredRelicRecords(state.player.retiredRelics);
    if (typeof normalizeBossTrophyStateShape === 'function') normalizeBossTrophyStateShape(state);
    repairTalentState(state);
    normalizeTalentLedgerState(state);
    if (typeof window !== 'undefined' && typeof window.applyBossTrophyTalentAwardIfReady === 'function') {
      window.applyBossTrophyTalentAwardIfReady(state);
      normalizeTalentLedgerState(state);
    }
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
      if (parsed.player.talents == null && parsed.player.talentPointsEarned == null && parsed.player.talentPoints == null) parsed.player.talents = createTalentState();
      return normalizeSaveShape(parsed);
    } catch (err) {
      console.warn('DungeonDex save recovery used a fresh state.');
      return createBaseState();
    }
  }
