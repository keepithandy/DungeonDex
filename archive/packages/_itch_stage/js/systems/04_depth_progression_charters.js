'use strict';

// Depth labels, district progression, milestones, charters, pricing, encounter coin rewards
  function progressDepthValue(value, fallback = 1) {
    return Math.max(1, Math.floor(numberOr(value, fallback, 1, 999999)));
  }

  function districtByDepth(depth) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth, 1, 1, 999)));
    return DISTRICT_DATA.find(district => safeDepth >= district.min && safeDepth <= district.max) || DISTRICT_DATA[DISTRICT_DATA.length - 1] || DISTRICT_DATA[0];
  }

  function getLoreDepthProgress(absoluteChapter) {
    const CHAPTERS_PER_ROOM = 10;
    const ROOMS_PER_FLOOR = 5;
    const CHAPTERS_PER_FLOOR = CHAPTERS_PER_ROOM * ROOMS_PER_FLOOR;
    const BOSS_EVERY_CHAPTERS = 5;
    const safeChapter = Math.max(1, Math.floor(numberOr(absoluteChapter, 1, 1, 999999)));
    const floorNumber = Math.floor((safeChapter - 1) / CHAPTERS_PER_FLOOR) + 1;
    const chapterWithinFloor = ((safeChapter - 1) % CHAPTERS_PER_FLOOR) + 1;
    const roomWithinFloor = Math.floor((chapterWithinFloor - 1) / CHAPTERS_PER_ROOM) + 1;
    const chapterWithinRoom = ((chapterWithinFloor - 1) % CHAPTERS_PER_ROOM) + 1;
    const isBossChapter = safeChapter % BOSS_EVERY_CHAPTERS === 0;
    const chaptersUntilBoss = isBossChapter ? 0 : BOSS_EVERY_CHAPTERS - (safeChapter % BOSS_EVERY_CHAPTERS);

    return {
      absoluteChapter: safeChapter,
      floorNumber,
      roomWithinFloor,
      roomsPerFloor: ROOMS_PER_FLOOR,
      chapterWithinRoom,
      chaptersPerRoom: CHAPTERS_PER_ROOM,
      chapterWithinFloor,
      chaptersPerFloor: CHAPTERS_PER_FLOOR,
      floorName: getLoreFloorName(floorNumber),
      isBossChapter,
      chaptersUntilBoss
    };
  }

  function getLoreFloorDistrict(floorNumber) {
    const safeFloor = Math.max(1, Math.floor(numberOr(floorNumber, 1, 1, 999999)));
    return districtByDepth(safeFloor);
  }

  function getLoreFloorName(floorNumber) {
    const safeFloor = Math.max(1, Math.floor(numberOr(floorNumber, 1, 1, 999999)));
    if (typeof getFloorNameForFloor === 'function') return getFloorNameForFloor(safeFloor);
    if (typeof getDistrictNameForFloor === 'function') return getDistrictNameForFloor(safeFloor);
    const district = getLoreFloorDistrict(safeFloor);
    return district?.name || 'Lowfire District';
  }

  function defaultRunStartDepth(state) {
    const fallback = progressDepthValue(state?.player?.safeExtractDepth, 1);
    return progressDepthValue(state?.player?.returnDepth, fallback);
  }

  function canUseSafeReturnStart(state, depth) {
    const safeDepth = progressDepthValue(state?.player?.safeExtractDepth, 1);
    const returnDepth = progressDepthValue(state?.player?.returnDepth, safeDepth);
    const requested = progressDepthValue(depth, 1);
    return requested > 1 && requested <= Math.max(safeDepth, returnDepth);
  }

  // v1.4.20: death resets the normal return start; charters stay available separately.
  function hardcoreDeathCheckpointDepth(state, depth = null) {
    return 1;
  }

  function resetDescentProgressOnDeath(state) {
    if (!state || !state.player) return 1;
    const resetDepth = 1;
    state.player.returnDepth = resetDepth;
    if (state.run && typeof state.run === 'object') {
      state.run.floor = resetDepth;
      state.run.zone = typeof zoneName === 'function' ? zoneName(resetDepth) : districtByDepth(resetDepth).name;
      state.run.danger = typeof dangerRatingForDepth === 'function' ? dangerRatingForDepth(resetDepth) : 1;
      state.run.startedFromCharter = false;
      state.run.charterStartFloor = 0;
    }
    return resetDepth;
  }

  function hardcoreDepthReturnLabel(depth) {
    const safeDepth = progressDepthValue(depth, 1);
    const district = districtByDepth(safeDepth);
    if (safeDepth <= 1) return `${district.name} / ${floorNumberLabel(1)}`;
    return `${district.name} / ${charterDepthCompactLabel(safeDepth)}`;
  }

  function hardcoreDeathCheckpointLabel(state, depth = null) {
    return hardcoreDepthReturnLabel(hardcoreDeathCheckpointDepth(state, depth));
  }

  function currentStagingDistrict(state) {
    const activeFloor = progressDepthValue(state?.run?.floor, 1);
    if (state?.run?.active) return districtByDepth(activeFloor);
    return districtByDepth(defaultRunStartDepth(state));
  }

  function dungeonDistrictIdentityForDepth(depth) {
    const numericDepth = Math.floor(Number(depth));
    const fallbackInput = !Number.isFinite(numericDepth) || numericDepth < 1;
    const district = districtByDepth(depth);
    const key = String(district?.id || 'lowfire').toLowerCase();
    const fallback = {
      key: 'lowfire',
      name: 'Lowfire District',
      subtitle: 'Warm start.',
      shortFlavor: 'Lamps stay low and debts stay warm.',
      bossApproachLine: 'Boss approach: the Stair tightens.',
      safeFallback: true
    };
    const identities = {
      lowfire: {
        key: 'lowfire',
        name: 'Lowfire District',
        subtitle: 'Warm lamps, shallow haul.',
        shortFlavor: 'Lowfire keeps its markets close and its debts warm.',
        bossApproachLine: 'Boss approach: the lamps gutter lower.',
        safeFallback: false
      },
      ashgate: {
        key: 'ashgate',
        name: 'Ashgate Warrens',
        subtitle: 'Narrow paths, scraped walls.',
        shortFlavor: 'Ashgate presses the stair into tight, smoky turns.',
        bossApproachLine: 'Boss approach: ash closes around the landing.',
        safeFallback: false
      },
      'ember-debtworks': {
        key: 'ember-debtworks',
        name: 'Ember Debtworks',
        subtitle: 'Chains, ledgers, red worklight.',
        shortFlavor: 'The Debtworks glow like an open ledger under heat.',
        bossApproachLine: 'Boss approach: chains tick faster below.',
        safeFallback: false
      },
      sootveil: {
        key: 'sootveil',
        name: 'Sootveil Depths',
        subtitle: 'Smoke-thick, light-starved.',
        shortFlavor: 'Sootveil hides the old stair cuts under dead ash.',
        bossApproachLine: 'Boss approach: the light thins before the room opens.',
        safeFallback: false
      },
      cinderbone: {
        key: 'cinderbone',
        name: 'Cinderbone Halls',
        subtitle: 'Old stone, champion dust.',
        shortFlavor: 'Cinderbone keeps old victories warm in the ash.',
        bossApproachLine: 'Boss approach: hollow walls answer the blade.',
        safeFallback: false
      },
      blacktithe: {
        key: 'blacktithe',
        name: 'Blacktithe Deep',
        subtitle: 'Grave tolls, sealed doors.',
        shortFlavor: 'Blacktithe counts every step like coin in a grave.',
        bossApproachLine: 'Boss approach: the toll answers from below.',
        safeFallback: false
      },
      lanternless: {
        key: 'lanternless',
        name: 'Lanternless Vault',
        subtitle: 'Sealed quiet, dead lampglass.',
        shortFlavor: 'The Lanternless Vault stores hope where flame cannot reach.',
        bossApproachLine: 'Boss approach: the dark begins to choose a shape.',
        safeFallback: false
      },
      'hunger-kilns': {
        key: 'hunger-kilns',
        name: 'The Hunger Kilns',
        subtitle: 'Open heat, empty racks.',
        shortFlavor: 'The Hunger Kilns breathe like they are waiting for tribute.',
        bossApproachLine: 'Boss approach: heat rises before the name does.',
        safeFallback: false
      },
      redwake: {
        key: 'redwake',
        name: 'Redwake Catacombs',
        subtitle: 'Red water, bone invoices.',
        shortFlavor: 'Redwake water moves under the stones like old blood.',
        bossApproachLine: 'Boss approach: the current turns against you.',
        safeFallback: false
      },
      'final-lowflame': {
        key: 'final-lowflame',
        name: 'The Final Lowflame',
        subtitle: 'Small light, impossible weight.',
        shortFlavor: 'The Final Lowflame burns small beneath the whole Stair.',
        bossApproachLine: 'Boss approach: the Stair goes quiet at the bottom.',
        safeFallback: false
      }
    };
    const identity = identities[key] || {
      ...fallback,
      key,
      name: district?.name || fallback.name,
      subtitle: district?.line || fallback.subtitle,
      shortFlavor: district?.mood || district?.line || fallback.shortFlavor,
      bossApproachLine: 'Boss approach: the Stair tightens.'
    };
    return fallbackInput ? { ...identity, safeFallback: true } : identity;
  }

  function dungeonDistrictSummary(depth){
    const identity = dungeonDistrictIdentityForDepth(depth);
    return {
      key: identity.key,
      name: identity.name,
      subtitle: identity.subtitle,
      shortFlavor: identity.shortFlavor,
      bossApproachLine: identity.bossApproachLine,
      safeFallback: !!identity.safeFallback
    };
  }

  function currentDistrictDisplay(state){
    const district = currentStagingDistrict(state);
    return dungeonDistrictSummary(state?.run?.active ? state?.run?.floor : defaultRunStartDepth(state) || district?.min || 1);
  }

  function dungeonFloorFlavorLine(depth){
    const identity = dungeonDistrictIdentityForDepth(depth);
    return identity.shortFlavor || 'The dungeon keeps its own quiet.';
  }

  function districtToneClass(district) {
    const tone = String(district?.tone || district?.id || 'lowfire').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    return `district-tone-${tone}`;
  }

  function bossAtmosphereLine(depth) {
    const name = bossFloorNameByDepth(depth);
    const district = districtByDepth(depth);
    if (!name) return 'The Stair tightens. Something below is listening.';
    return `Boss sign: ${name} waits below in ${district.name}. Bosses return every 5 floors.`;
  }

  function districtArrivalLine(district) {
    if (!district) return 'A new stretch of stair opens beneath your boots.';
    const arrivals = {
      lowfire: 'Lowfire District stays close behind you, lamps low and warm.',
      ashgate: 'Ashgate Warrens narrows around the stair; every wall is scraped by retreat.',
      'ember-debtworks': 'Ember Debtworks glows red below; chains tick like ledgers closing.',
      sootveil: 'Sootveil Depths swallows the light and leaves only breath and ash.',
      cinderbone: 'Cinderbone Halls opens in furnace heat and old champion dust.',
      blacktithe: 'Blacktithe Deep weighs each step like coin dropped into a grave.',
      lanternless: 'Lanternless Vault answers with cold glass and no flame.',
      'hunger-kilns': 'The Hunger Kilns breathe open, hot and empty-handed.',
      redwake: 'Redwake Catacombs moves under the stones before you see it.',
      'final-lowflame': 'The Final Lowflame burns small under impossible weight.'
    };
    return arrivals[district.id] || district.line || `${district.name} answers the descent.`;
  }

  function isDistrictEntryDepth(depth, district) {
    const safeDepth = Math.max(1, Math.floor(numberOr(depth, 1, 1, 999999)));
    return !!district && safeDepth === district.min;
  }

  function districtArrivalMarkup(depth, district) {
    if (!isDistrictEntryDepth(depth, district)) return '';
    return `<div class="district-arrival-card"><span>Entering</span><strong>${escapeHtml(district.name)}</strong><p>${escapeHtml(districtArrivalLine(district))}</p></div>`;
  }

  function extractionSummaryLine(state, reason) {
    const district = currentStagingDistrict(state);
    const depth = state?.run?.floor || state?.player?.depth || 1;
    const bestStr = depthWithRawLabel(state.player.depth || depth);
    if (reason === 'extract') return `Extraction Haul secured in ${district.name} at ${runDepthLabel(state)}. Safe extraction preserves progress. The next descent can start there. Best: ${bestStr}.`;
    if (reason === 'defeat') return `The run ends in ${district.name} at ${runDepthLabel(state)}. Death resets the descent; unsecured rewards were lost, but banked gear and wallet stayed safe. Restart: ${hardcoreDeathCheckpointLabel(state, depth)}. Best: ${bestStr}.`;
    return `Descent ended in ${district.name} at ${runDepthLabel(state)}.`;
  }


  // v1.3.22 archive clarity: snapshot pending rewards before they are banked/lost so History can show useful after-action details.
  function runHistoryRewardSnapshot(pending) {
    const p = createPendingRunRewards(pending);
    const questProgressTotal = Object.values(p.questProgress).reduce((sum, value) => sum + Math.max(0, Math.floor(numberOr(value, 0, 0, 999999))), 0);
    return {
      rewards: runRewardSummaryText(p),
      gold: p.gold,
      shards: p.shards,
      ember: p.ember,
      xp: p.xp,
      kills: p.kills,
      eliteMarks: p.eliteContractKills,
      lootCount: p.loot.length,
      questProgress: questProgressTotal,
      lootPreview: p.loot.slice(0, 3).map(item => item?.name || '').filter(Boolean)
    };
  }

  function runHistoryOutcomeLabel(reason) {
    if (reason === 'extract') return 'Extraction Secured';
    if (reason === 'defeat') return 'Run Lost';
    return 'Ended';
  }

  function runHistoryOutcomeClass(reason) {
    if (reason === 'extract') return 'feed-escape';
    if (reason === 'defeat') return 'feed-death';
    return 'feed-depth';
  }

  function extractionPopupSummary(snapshot, securedText) {
    // v1.3.22c: keep popup summary plain text; formatMoney() returns styled HTML for the UI.
    // showExtractionPopup() escapes summary text, so strip HTML before composing the line.
    const parts = [];
    if (snapshot.gold) parts.push(moneyText(snapshot.gold));
    if (snapshot.shards) parts.push(`${format(snapshot.shards)} shards`);
    if (snapshot.ember) parts.push(`${format(snapshot.ember)} ember`);
    if (snapshot.xp) parts.push(`${format(snapshot.xp)} XP`);
    if (snapshot.lootCount) parts.push(`${format(snapshot.lootCount)} loot`);
    return parts.length ? `Extraction Haul secured: ${parts.join(' • ')}` : (securedText || 'Extraction Haul secured. Lowfire marks the run complete.');
  }

  function milestoneAtmosphereMarkup(depth, district) {
    const nextBoss = nextBossFloorFromDepth(depth);
    const nextDistrict = districtByDepth(Math.min(100, Math.max(depth + 1, district.max + 1)));
    const meta = depthProgressMeta(depth);
    const bossChaptersAway = Math.max(0, nextBoss.floor - depthStageValue(depth));
    const nextDistrictText = nextDistrict && nextDistrict.id !== district.id
      ? `→ ${nextDistrict.name}`
      : `D${format(district.min)}–${format(district.max)}`;
    const roomPct = Math.round(meta.roomPct);
    const chapterPct = Math.round(meta.chapterPct);
    return `<div class="milestone-strip">
      <div class="milestone-strip-labels">
        <span>Room ${format(meta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)}</span>
        <strong>${chapterPct}% through room</strong>
        <span>Next floor: ${format(meta.roomsUntilFloor)} rooms</span>
      </div>
      <div class="milestone-bar"><div style="width:${roomPct}%"></div></div>
    </div>
      <span class="pill district-pill">${escapeHtml(district.name)}</span>
      <span class="pill boss-pill">${escapeHtml(bossFloorLabel(nextBoss.floor))} in ${format(bossChaptersAway)} chapters</span>
      <span class="pill">${escapeHtml(nextDistrictText)}</span>
    </div>`;
  }

  function bossFloorNameByDepth(depth) {
    const threatDepth = bossThreatDepthFromDepth(depth);
    return BOSS_FLOOR_NAMES[threatDepth] || (threatDepth > 0 && threatDepth % BOSS_INTERVAL === 0 ? `Boss Floor ${threatDepth}` : '');
  }

  function depthStageValue(depth, fallback = 1) {
    return Math.max(1, Math.floor(numberOr(depth, fallback, 1, 999999)));
  }

  function threatDepthFromDepth(depth) {
    return Math.max(1, Math.ceil(depthStageValue(depth) / DEPTH_CHAPTERS_PER_THREAT_STEP));
  }

  function bossThreatDepthFromDepth(depth) {
    return threatDepthFromDepth(depth);
  }

  function floorNumberLabel(depth) {
    return `Floor ${format(threatDepthFromDepth(depth))}`;
  }

  function bossFloorLabel(depth) {
    return `Boss Floor ${format(bossThreatDepthFromDepth(depth))}`;
  }

  function nextBossDepthFromDepth(depth) {
    const rawDepth = depthStageValue(depth);
    const interval = BOSS_INTERVAL * DEPTH_CHAPTERS_PER_THREAT_STEP;
    return Math.max(interval, Math.ceil((rawDepth + 1) / interval) * interval);
  }

  function depthStructureFromRawDepth(depth) {
    const rawDepth = depthStageValue(depth);
    const zeroBased = rawDepth - 1;
    const floor = Math.floor(zeroBased / DEPTH_CHAPTERS_PER_FLOOR) + 1;
    const floorOffset = zeroBased % DEPTH_CHAPTERS_PER_FLOOR;
    const room = Math.floor(floorOffset / DEPTH_CHAPTERS_PER_ROOM) + 1;
    const chapter = (floorOffset % DEPTH_CHAPTERS_PER_ROOM) + 1;
    const nextRoomAtDepth = rawDepth + (DEPTH_CHAPTERS_PER_ROOM - chapter + 1);
    const nextFloorAtDepth = rawDepth + (DEPTH_CHAPTERS_PER_FLOOR - floorOffset);
    return { rawDepth, floor, room, chapter, nextRoomAtDepth, nextFloorAtDepth };
  }

  function depthShortLabel(depth) {
    const d = getLoreDepthProgress(depth);
    return `F${format(d.floorNumber)} • R${format(d.roomWithinFloor)} • C${format(d.chapterWithinRoom)}`;
  }

  function depthLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `${floorNumberLabel(depth)} • Room ${format(d.room)} • Chapter ${format(d.chapter)}`;
  }

  function depthWithRawLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `${floorNumberLabel(depth)} • R${format(d.room)} C${format(d.chapter)} • D${format(d.rawDepth)}`;
  }

  function runDepthLabel(state) {
    return depthWithRawLabel(state?.run?.floor || 1);
  }

  function depthProgressMeta(depth) {
    const d = depthStructureFromRawDepth(depth);
    const chapterPct = clamp((d.chapter / DEPTH_CHAPTERS_PER_ROOM) * 100, 0, 100);
    const roomPct = clamp((d.room / DEPTH_ROOMS_PER_FLOOR) * 100, 0, 100);
    const chaptersUntilRoom = Math.max(0, DEPTH_CHAPTERS_PER_ROOM - d.chapter);
    const roomsUntilFloor = Math.max(0, DEPTH_ROOMS_PER_FLOOR - d.room);
    return { ...d, chapterPct, roomPct, chaptersUntilRoom, roomsUntilFloor };
  }

  function depthMilestoneNotice(depth) {
    const d = depthStructureFromRawDepth(depth);
    if (d.rawDepth <= 1 || d.chapter !== 1) return '';
    if (d.room === 1) return `Hollow Stair floor ${d.floor} reached. Prepare before pushing farther.`;
    return `Room ${d.room} cleared on ${floorNumberLabel(depth)}.`;
  }

  function isRoomMilestoneDepth(depth) {
    const d = depthStructureFromRawDepth(depth);
    return d.rawDepth > 1 && d.chapter === 1;
  }

  function isFloorMilestoneDepth(depth) {
    const d = depthStructureFromRawDepth(depth);
    return d.rawDepth > 1 && d.chapter === 1 && d.room === 1;
  }

  function applyRoomMilestoneReward(state, previousDepth, currentDepth) {
    if (!state?.run?.active || !isRoomMilestoneDepth(currentDepth)) return;
    const meta = depthStructureFromRawDepth(currentDepth);
    const rewardGold = Math.max(coins(0, 0, 14), Math.round(coins(0, 0, 14) + threatDepthFromDepth(currentDepth) * rand(3, 6)));
    const missingHp = Math.max(0, state.player.maxHp - state.player.hp);
    const recovered = Math.min(missingHp, Math.max(1, Math.round(state.player.maxHp * 0.05)));
    addPendingRunGold(state, rewardGold);
    if (recovered > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);
    pushCombat(state, `Room cleared: floor ${meta.floor}, room ${meta.room}. Room Reward unsecured +${formatMoney(rewardGold)}${recovered > 0 ? `, recovered ${recovered} HP` : ''}.`);
    pushLog(state, `Room milestone reached: ${depthLabel(currentDepth)}.`);
  }

  function applyFloorMilestoneReward(state, previousDepth, currentDepth) {
    if (!state?.run?.active || !isFloorMilestoneDepth(currentDepth)) return;
    const meta = depthStructureFromRawDepth(currentDepth);
    const threatDepth = threatDepthFromDepth(currentDepth);
    const rewardGold = Math.max(coins(0, 1, 80), Math.round(coins(0, 1, 80) + threatDepth * rand(9, 18)));
    const shardReward = Math.max(3, Math.round(3 + threatDepth * 0.58));
    const emberReward = meta.floor % 2 === 0 ? 1 : 0;
    const missingHp = Math.max(0, state.player.maxHp - state.player.hp);
    const recovered = Math.min(missingHp, Math.max(2, Math.round(state.player.maxHp * 0.13)));

    addPendingRunGold(state, rewardGold);
    addPendingRunShards(state, shardReward);
    if (emberReward > 0) addPendingRunEmber(state, emberReward);
    if (recovered > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + recovered);

    const parts = [`+${formatMoney(rewardGold)}`, `+${format(shardReward)} shards`];
    if (emberReward > 0) parts.push(`+${format(emberReward)} ember`);
    if (recovered > 0) parts.push(`recovered ${recovered} HP`);
    pushCombat(state, `Floor cleared: Hollow Stair floor ${meta.floor}. Milestone Reward unsecured ${parts.join(', ')}.`);
    pushLog(state, `Hollow Stair floor ${meta.floor} opened after ${format(DEPTH_CHAPTERS_PER_FLOOR)} chapters of descent.`);
  }

  function depthDifficultyLadder(depth) {
    const d = depthStructureFromRawDepth(depth);
    const chapterPressure = (d.chapter - 1) * 0.0025;
    const roomPressure = (d.room - 1) * 0.005;
    const floorPressure = Math.min(0.15, (d.floor - 1) * 0.038);
    const totalPressure = clamp(chapterPressure + roomPressure + floorPressure, 0, 0.24);
    return {
      ...d,
      chapterPressure,
      roomPressure,
      floorPressure,
      totalPressure,
      powerMult: 1 + totalPressure,
      hpMult: 1 + Math.min(0.14, roomPressure * 0.68 + floorPressure * 0.58),
      guardMult: 1 + Math.min(0.12, roomPressure * 0.48 + floorPressure * 0.48),
      speedMult: 1 + Math.min(0.065, chapterPressure * 0.55 + roomPressure * 0.22),
      rewardMult: 1 + Math.min(0.10, totalPressure * 0.38),
      eliteBonus: Math.min(0.055, roomPressure * 0.28 + floorPressure * 0.14)
    };
  }

  function dangerRatingForDepth(depth) {
    const ladder = depthDifficultyLadder(depth);
    const base = Math.max(1, Math.floor(threatDepthFromDepth(depth) / 3));
    const roomPressure = Math.floor((ladder.room - 1) / 6);
    const floorPressure = Math.max(0, (ladder.floor - 1) * 2);
    return Math.max(1, base + roomPressure + floorPressure);
  }

  function isHighRarityKey(key) {
    return rarityIndex(key) >= rarityIndex('rare');
  }

  function depthLootScarcityMeta(depth, source = 'normal', state = null) {
    const rawDepth = depthStageValue(depth);
    const deepBand = rawDepth >= 40 ? Math.floor((rawDepth - 40) / 40) + 1 : 0;
    const charterStart = Math.floor(numberOr(state?.run?.charterStartFloor, 0, 0, 999999));
    const charterWarmup = !!(state?.run?.active && state.run.startedFromCharter && charterStart >= 40 && rawDepth >= charterStart && rawDepth < charterStart + 5);
    const sourceRelief = source === 'boss' ? 0.08 : source === 'elite' ? 0.04 : 0;
    const highRarityMult = deepBand
      ? clamp(0.88 - deepBand * 0.07 + sourceRelief, 0.46, 1)
      : 1;
    const mythicMult = deepBand
      ? clamp(0.8 - deepBand * 0.06 + sourceRelief, 0.38, 1)
      : 1;
    const dropChanceMult = deepBand
      ? clamp(0.97 - deepBand * 0.025 + (source === 'boss' ? 0.02 : 0), 0.78, 1)
      : 1;
    return {
      rawDepth,
      deepBand,
      charterWarmup,
      highRarityMult: charterWarmup ? highRarityMult * 0.78 : highRarityMult,
      mythicMult: charterWarmup ? mythicMult * 0.72 : mythicMult,
      dropChanceMult: charterWarmup ? dropChanceMult * 0.9 : dropChanceMult
    };
  }

  function applyDepthLootScarcity(table, depth, source = 'normal', state = null) {
    if (!['normal','elite','boss'].includes(source)) return table;
    const meta = depthLootScarcityMeta(depth, source, state);
    if (!meta.deepBand && !meta.charterWarmup) return table;
    return table.map(([key, chance]) => {
      let adjusted = chance;
      if (isHighRarityKey(key)) adjusted *= meta.highRarityMult;
      if (key === 'legendary') adjusted *= 0.92;
      if (key === 'mythic') adjusted *= meta.mythicMult;
      return [key, Math.max(0.25, adjusted)];
    });
  }

  function depthProgressMarkup(depth) {
    const d = depthProgressMeta(depth);
    const district = districtByDepth(depth);
    const identity = dungeonDistrictIdentityForDepth(depth);
    const roomLine = d.chaptersUntilRoom === 0
      ? 'Room clears after this chapter.'
      : `${format(d.chaptersUntilRoom)} chapter${d.chaptersUntilRoom === 1 ? '' : 's'} until the next room.`;
    const floorLine = d.roomsUntilFloor === 0 && d.chaptersUntilRoom === 0
      ? 'Next Hollow Stair floor begins after this room.'
      : `Next Hollow Stair floor begins at D${format(d.nextFloorAtDepth)}.`;
    return `<div class="depth-progress-card" aria-label="Hollow Stair progress">
      <div class="split depth-progress-head">
        <div>
          <div class="depth-kicker">Hollow Stair Progress • ${escapeHtml(district.name)}</div>
          <strong>${escapeHtml(depthLabel(depth))}</strong>
          <p>${escapeHtml(identity.subtitle)}</p>
        </div>
        <span class="pill">${escapeHtml(district.name)}</span>
      </div>
      <div class="depth-progress-grid">
        <div class="depth-progress-stat"><span>Chapter</span><strong>${format(d.chapter)} / ${format(DEPTH_CHAPTERS_PER_ROOM)}</strong></div>
        <div class="depth-progress-stat"><span>Room</span><strong>${format(d.room)} / ${format(DEPTH_ROOMS_PER_FLOOR)}</strong></div>
      </div>
      <div class="depth-meter"><div style="width:${d.chapterPct.toFixed(1)}%"></div></div>
      <p class="small muted">${escapeHtml(roomLine)} ${escapeHtml(floorLine)}</p>
    </div>`;
  }

  function safeExtractDepthValue(state) {
    return progressDepthValue(state?.player?.safeExtractDepth, 1);
  }

  function safelyReachedFloor40(state) {
    return safeExtractDepthValue(state) >= 40;
  }

  function mythicSetDropsAllowed(state) {
    return safelyReachedFloor40(state);
  }

  function isDeepRun(state) {
    const activeFloor = Math.floor(numberOr(state?.run?.floor, 0, 0, 999));
    return activeFloor >= 40 || safeExtractDepthValue(state) >= 40;
  }

  function wasStartedFromDeepStairCharter(state) {
    return !!(state?.run?.active && state.run.startedFromCharter && Math.floor(numberOr(state.run.charterStartFloor, 0, 0, 999)) >= 40);
  }

  function mythicSetSlotFromSlot(slot) {
    const key = String(slot || '').toLowerCase();
    return MYTHIC_SET_SLOT_ALIASES[key] || (MYTHIC_SET_SLOTS.includes(key) ? key : '');
  }

  function isMythicSetSlot(slot) {
    return MYTHIC_SET_SLOTS.includes(mythicSetSlotFromSlot(slot));
  }

  function baseSlotForSlot(slot, fallback = 'weapon') {
    const key = String(slot || '').toLowerCase();
    if (BASES[key]) return key;
    const alias = BASE_SLOT_ALIASES[key];
    return BASES[alias] ? alias : fallback;
  }

  function getMythicSetDefinition(setId) {
    const key = String(setId || '').toLowerCase();
    return MYTHIC_SET_DEFINITIONS[key] || null;
  }

  function getItemSetId(item) {
    if (!isPlainObject(item)) return '';
    const setId = String(item.setId || item.mythicSetId || '').toLowerCase();
    return getMythicSetDefinition(setId) ? setId : '';
  }

  function isMythicSetItem(item) {
    return !!(isPlainObject(item) && itemRarityKey(item) === 'mythic' && getItemSetId(item) && isMythicSetSlot(item.setSlot || item.slot));
  }

  function getEquippedSetPieces(state, setId) {
    const targetSetId = String(setId || '').toLowerCase();
    if (!getMythicSetDefinition(targetSetId)) return [];
    const equipment = isPlainObject(state?.player?.equipment) ? state.player.equipment : {};
    const seenSlots = new Set();
    return Object.values(equipment).filter(item => {
      if (!isMythicSetItem(item) || getItemSetId(item) !== targetSetId) return false;
      const setSlot = mythicSetSlotFromSlot(item.setSlot || item.slot);
      if (!setSlot || seenSlots.has(setSlot)) return false;
      seenSlots.add(setSlot);
      return true;
    });
  }

  function getEquippedSetCount(state, setId) {
    return getEquippedSetPieces(state, setId).length;
  }

  function hasEquippedSetBonus(state, setId, pieces) {
    return getEquippedSetCount(state, setId) >= Math.floor(numberOr(pieces, 0, 0, 99));
  }

  function ensureRunSetBonusState(state) {
    if (!state.run) state.run = {};
    if (!isPlainObject(state.run.setBonuses)) state.run.setBonuses = {};
    state.run.setBonuses.ashboundLethalUsed = !!state.run.setBonuses.ashboundLethalUsed;
    state.run.setBonuses.bellforgeHits = Math.floor(numberOr(state.run.setBonuses.bellforgeHits, 0, 0, 999999));
    state.run.setBonuses.sootveilEscapeUsed = !!state.run.setBonuses.sootveilEscapeUsed;
    state.run.setBonuses.sootveilGuard = Math.floor(numberOr(state.run.setBonuses.sootveilGuard, 0, 0, 999999));
    return state.run.setBonuses;
  }

  function activeMerchantDiscountPct(state) {
    return hasEquippedSetBonus(state, 'lowfire_debtbrand', 3) ? 6 : 0;
  }

  function merchantCostWithSetBonus(state, baseCost) {
    const cost = Math.max(0, Math.floor(numberOr(baseCost, 0, 0, Number.MAX_SAFE_INTEGER)));
    const pct = activeMerchantDiscountPct(state);
    return pct > 0 ? Math.max(1, Math.round(cost * (1 - pct / 100))) : cost;
  }

  function merchantCostMarkup(state, baseCost) {
    const cost = Math.max(0, Math.floor(numberOr(baseCost, 0, 0, Number.MAX_SAFE_INTEGER)));
    const discounted = merchantCostWithSetBonus(state, cost);
    if (discounted >= cost) return formatMoney(cost);
    return `${formatMoney(discounted)} <span class="pill rarity-mythic">Debtbrand -${format(activeMerchantDiscountPct(state))}%</span>`;
  }

  function grantDebtbrandMerchantBoost(state) {
    if (!hasEquippedSetBonus(state, 'lowfire_debtbrand', 5)) return false;
    if (!state.player) state.player = {};
    if (state.player.debtbrandBoostReady) return false;
    state.player.debtbrandBoostReady = true;
    pushLog(state, 'Lowfire Debtbrand readies a paid-edge boost for the next fight.');
    return true;
  }

  function consumeDebtbrandCombatBoost(state) {
    if (!state?.player?.debtbrandBoostReady) return false;
    state.player.debtbrandBoostReady = false;
    pushCombat(state, 'Debtbrand toll paid: your next blow bites harder.');
    return true;
  }

  function resolveEliteCriticalDamage(state, monster, baseDamage) {
    const damage = Math.max(1, Math.floor(numberOr(baseDamage, 1, 1, 999999)));
    return { damage, critical: false, softened: false, feedback: '' };
  }

  function consumeSootveilGuard(state) {
    const setRun = ensureRunSetBonusState(state);
    const guard = Math.floor(numberOr(setRun.sootveilGuard, 0, 0, 999999));
    if (guard <= 0) return 0;
    setRun.sootveilGuard = 0;
    return guard;
  }

  function tryAshboundLethalWard(state) {
    if (!hasEquippedSetBonus(state, 'ashbound_warden', 5)) return false;
    const setRun = ensureRunSetBonusState(state);
    if (setRun.ashboundLethalUsed) return false;
    setRun.ashboundLethalUsed = true;
    state.player.hp = 1;
    pushCombat(state, 'Ashbound Warden refuses the death-bell. You stand at 1 HP.');
    return true;
  }

  function trySootveilEscape(state, stats = null) {
    if (!hasEquippedSetBonus(state, 'sootveil_regalia', 5)) return false;
    const setRun = ensureRunSetBonusState(state);
    if (setRun.sootveilEscapeUsed) return false;
    setRun.sootveilEscapeUsed = true;
    state.player.hp = 1;
    const guardStat = Math.floor(numberOr(stats?.guard, 0, 0, 999999));
    const restoredGuard = Math.max(2, Math.round(Math.min(120, 8 + Math.sqrt(guardStat) * 1.5)));
    setRun.sootveilGuard = Math.max(setRun.sootveilGuard, restoredGuard);
    pushCombat(state, `Sootveil Escape triggers. Ash scatters. Guard +${format(restoredGuard)}.`);
    return true;
  }

  function getSetBonusEntries(setDef) {
    if (!isPlainObject(setDef?.bonuses)) return [];
    return Object.entries(setDef.bonuses)
      .map(([pieces, label]) => ({ pieces: Math.floor(numberOr(pieces, 0, 0, 99)), label: String(label || '') }))
      .filter(entry => entry.pieces > 0 && entry.label)
      .sort((a, b) => a.pieces - b.pieces);
  }

  function setBonusPreviewMarkup(item, state = S, compact = false) {
    const setId = getItemSetId(item);
    const setDef = getMythicSetDefinition(setId);
    if (!setDef) return '';
    const equippedCount = getEquippedSetCount(state, setId);
    const entries = getSetBonusEntries(setDef);
    const setSlot = mythicSetSlotFromSlot(item?.setSlot || item?.slot);
    const slotLine = setSlot ? `<span class="pill">${escapeHtml(setSlot)}</span>` : '';
    const bonusRows = entries.map(entry => {
      const met = equippedCount >= entry.pieces;
      return `<div class="set-bonus-row ${met ? 'met' : ''}"><span>${format(entry.pieces)}pc</span><strong>${escapeHtml(entry.label)}</strong></div>`;
    }).join('');
    const modeClass = compact ? ' compact' : '';
    return `<div class="set-bonus-preview${modeClass}" aria-label="${escapeHtml(setDef.name)} set bonus preview">
      <div class="split set-bonus-head"><strong>${escapeHtml(setDef.name)} Set</strong><span class="pill">Equipped ${format(equippedCount)} / ${format(setDef.slots?.length || MYTHIC_SET_SLOTS.length)}</span></div>
      <div class="tag-row set-bonus-tags"><span class="pill rarity-mythic">Mythic Set</span>${slotLine}</div>
      <div class="set-bonus-lines">${bonusRows}</div>
      <p class="small muted">Bonuses activate automatically when enough pieces are equipped.</p>
    </div>`;
  }

  function setBonusMiniMarkup(item, state = S) {
    const setId = getItemSetId(item);
    const setDef = getMythicSetDefinition(setId);
    if (!setDef) return '';
    const equippedCount = getEquippedSetCount(state, setId);
    return `<div class="set-mini-line"><span class="pill rarity-mythic">${escapeHtml(setDef.name)}</span><span class="pill">${format(equippedCount)} / ${format(setDef.slots?.length || MYTHIC_SET_SLOTS.length)}</span></div>`;
  }

  function deepLootFoundationSnapshot(state) {
    return {
      safeExtractDepth: safeExtractDepthValue(state),
      depthStructure: depthStructureFromRawDepth(safeExtractDepthValue(state)),
      reachedFloor40: safelyReachedFloor40(state),
      mythicSetDropsAllowed: mythicSetDropsAllowed(state),
      deepRun: isDeepRun(state),
      charterStarted: wasStartedFromDeepStairCharter(state),
      setCount: Object.keys(MYTHIC_SET_DEFINITIONS).length
    };
  }

  function mythicSetDropChance(rawDepth, source = 'normal', state = null) {
    const depth = depthStageValue(rawDepth);
    if (depth < 40 || !mythicSetDropsAllowed(state)) return 0;
    const base = source === 'boss' ? 0.07 : source === 'elite' ? 0.028 : 0.012;
    const cap = source === 'boss' ? 0.10 : source === 'elite' ? 0.045 : 0.025;
    const deepBand = Math.max(0, Math.floor((depth - 40) / 40));
    let chance = Math.min(cap, base + deepBand * 0.004);
    const scarcity = depthLootScarcityMeta(depth, source, state);
    if (scarcity.charterWarmup) chance *= 0.75;
    return clamp(chance, 0, cap);
  }

  function shouldDropMythicSetPiece(state, source = 'normal', rawDepth = 1) {
    const chance = mythicSetDropChance(rawDepth, source, state);
    return chance > 0 && Math.random() < chance;
  }

  function randomMythicSetDefinition() {
    return pick(Object.values(MYTHIC_SET_DEFINITIONS));
  }

  function generateMythicSetPiece(rawDepth, source = 'normal', state = null) {
    const setDef = randomMythicSetDefinition();
    const setSlot = pick(MYTHIC_SET_SLOTS);
    const baseSlot = baseSlotForSlot(setSlot, 'armor');
    const level = normalizeItemLevel(Math.max(15, threatDepthFromDepth(rawDepth) + rand(0, 2)));
    const item = generateGear(baseSlot, level, { source, forcedRarity:'mythic', depthRaw: rawDepth, state, skipMythicSet:true });
    item.slot = baseSlot;
    item.setSlot = setSlot;
    item.setId = setDef.id;
    item.mythicSetId = setDef.id;
    item.maker = setDef.name;
    item.theme = 'mythic-set';
    item.name = setDef.pieceNames?.[setSlot] || `${setDef.name} ${setSlot}`;
    item.summary = `${setDef.name} mythic set piece. Equip matching pieces to activate the listed bonuses.`;
    item.tags = Array.from(new Set(asArray(item.tags, []).concat(['mythic-set', setDef.id, setSlot, source])));
    item.value = Math.max(item.value, gearPriceFromRating(item.rating, level, 'mythic', source));
    return item;
  }

  function slotSortIndex(slot) {
    const idx = EQUIPMENT_DISPLAY_SLOTS.indexOf(String(slot || '').toLowerCase());
    return idx >= 0 ? idx : EQUIPMENT_DISPLAY_SLOTS.length + 1;
  }

  function equipmentConflictSlots(slot) {
    const key = String(slot || '').toLowerCase();
    if (key === 'armor' || key === 'chest') return ['armor','chest'];
    if (key === 'gloves' || key === 'hands') return ['gloves','hands'];
    if (key === 'boots' || key === 'legs') return ['boots','legs'];
    if (key === 'cloak' || key === 'shoulders') return ['cloak','shoulders'];
    return [baseSlotForSlot(key, key)];
  }

  // District progression prep:
  // Safe depth only advances when a run successfully extracts.
  // Death-only progress does not unlock charters, deep loot, or district wares.
  // Visible depth now advances one chapter per cleared encounter.
  function recordSafeExtractionProgress(state) {
    const extractedFloor = progressDepthValue(state?.run?.floor, state?.player?.depth || 1);
    state.player.safeExtractDepth = Math.max(
      1,
      progressDepthValue(state.player.safeExtractDepth, 1),
      extractedFloor
    );
  }

  // Charter compatibility note:
  // Older save fields still say floor/permanentStartFloor/charterStartFloor.
  // In v1.2.27a those values are treated as raw depth checkpoints so the
  // chapter/room/floor structure can progress without breaking old saves.
  const CHARTER_EARLY_STEP = 40;
  const CHARTER_EARLY_LIMIT = 800;
  const CHARTER_LATE_STEP = 5000;
  const CHARTER_BASE_GOLD = 75;
  const CHARTER_EARLY_SCALE = 1.075;
  const CHARTER_LATE_SCALE = 1.025;
  const CHARTER_MAX_GOLD = 500;

  function normalizeCharterMilestoneDepth(depth) {
    const safeDepth = Math.max(0, Math.floor(numberOr(depth, 0, 0, 999999)));
    if (safeDepth < CHARTER_EARLY_STEP) return 0;
    if (safeDepth <= CHARTER_EARLY_LIMIT) return Math.floor(safeDepth / CHARTER_EARLY_STEP) * CHARTER_EARLY_STEP;
    return CHARTER_EARLY_LIMIT + Math.floor((safeDepth - CHARTER_EARLY_LIMIT) / CHARTER_LATE_STEP) * CHARTER_LATE_STEP;
  }

  function getNextCharterUnlockDepth(currentUnlockedDepth) {
    const unlocked = normalizeCharterMilestoneDepth(currentUnlockedDepth);
    if (unlocked < CHARTER_EARLY_LIMIT) return unlocked + CHARTER_EARLY_STEP;
    return unlocked + CHARTER_LATE_STEP;
  }

  function getUnlockedCharterDepth(state) {
    const ownedDepth = Math.max(1, ...normalizeCharterDepthList(state?.player?.deepStairCharters || []));
    const safeDepth = Math.max(
      1,
      progressDepthValue(state?.player?.safeExtractDepth, 1),
      progressDepthValue(state?.player?.permanentStartFloor >= 40 ? state.player.permanentStartFloor : 1, 1),
      ownedDepth
    );
    return normalizeCharterMilestoneDepth(safeDepth);
  }

  function getUnlockedCharterFloor(state) {
    return getUnlockedCharterDepth(state);
  }

  function normalizeCharterDepthList(value) {
    return Array.from(new Set(asArray(value, [])
      .map(depth => normalizeCharterMilestoneDepth(depth))
      .filter(depth => depth >= CHARTER_EARLY_STEP)))
      .sort((a, b) => a - b);
  }

  function ensurePermanentCharters(state) {
    if (!state.player) state.player = {};
    const owned = normalizeCharterDepthList(state.player.deepStairCharters);
    const legacyBought = !!state?.player?.goldSink?.boughtStart40Charter || Math.floor(numberOr(state?.player?.permanentStartFloor, 1, 1, 999)) >= 40;
    if (legacyBought && !owned.includes(40)) owned.push(40);
    state.player.deepStairCharters = Array.from(new Set(owned)).sort((a, b) => a - b);
    return state.player.deepStairCharters;
  }

  function isCharterDepthUnlocked(state, depth) {
    return charterStartDepths(state).includes(normalizeCharterMilestoneDepth(depth));
  }

  function ownsPermanentCharter(state, depth) {
    return ensurePermanentCharters(state).includes(normalizeCharterMilestoneDepth(depth));
  }

  function grantPermanentCharter(state, depth) {
    const startDepth = normalizeCharterMilestoneDepth(depth);
    if (startDepth < 40) return false;
    const owned = ensurePermanentCharters(state);
    if (!owned.includes(startDepth)) owned.push(startDepth);
    state.player.deepStairCharters = Array.from(new Set(owned)).sort((a, b) => a - b);
    if (startDepth === 40) ensureGoldSinkState(state).boughtStart40Charter = true;
    return true;
  }

  function charterStartDepths(state) {
    const maxDepth = getUnlockedCharterDepth(state);
    const depths = [];
    for (let depth = CHARTER_EARLY_STEP; depth <= Math.min(maxDepth, CHARTER_EARLY_LIMIT); depth += CHARTER_EARLY_STEP) depths.push(depth);
    for (let depth = CHARTER_EARLY_LIMIT + CHARTER_LATE_STEP; depth <= maxDepth; depth += CHARTER_LATE_STEP) depths.push(depth);
    return depths;
  }

  function charterStartFloors(state) {
    return charterStartDepths(state);
  }

  function charterStartCost(depth) {
    const startDepth = Math.max(CHARTER_EARLY_STEP, normalizeCharterMilestoneDepth(depth) || CHARTER_EARLY_STEP);
    const earlyTier = Math.floor(Math.min(startDepth, CHARTER_EARLY_LIMIT) / CHARTER_EARLY_STEP);
    const costAtEarlyLimit = CHARTER_BASE_GOLD * Math.pow(CHARTER_EARLY_SCALE, (CHARTER_EARLY_LIMIT / CHARTER_EARLY_STEP) - 1);
    const scaledGold = startDepth <= CHARTER_EARLY_LIMIT
      ? CHARTER_BASE_GOLD * Math.pow(CHARTER_EARLY_SCALE, earlyTier - 1)
      : costAtEarlyLimit * Math.pow(CHARTER_LATE_SCALE, Math.floor((startDepth - CHARTER_EARLY_LIMIT) / CHARTER_LATE_STEP));
    return coins(Math.min(CHARTER_MAX_GOLD, Math.max(CHARTER_BASE_GOLD, Math.round(scaledGold))), 0, 0);
  }

  function charterDepthLabel(depth) {
    return depthWithRawLabel(depthStageValue(depth));
  }

  function charterDepthCompactLabel(depth) {
    const d = depthStructureFromRawDepth(depth);
    return `F${format(threatDepthFromDepth(depth))} • D${format(d.rawDepth)} • R${format(d.room)} C${format(d.chapter)}`;
  }

  function canUseCharterStart(state, depth) {
    return ownsPermanentCharter(state, depth);
  }

  function gearPriceFromRating(rating, level, rarityKey, source = 'normal') {
    const rarityMarkup = { common:1, uncommon:1.45, rare:2.35, epic:4.2, legendary:7.5, mythic:11 };
    const sourceMarkup = source === 'merchant' ? 1.34 : source === 'forge' ? 1.1 : 1;
    const levelPressure = level <= 4 ? 13 : level <= 9 ? 18 : level <= 15 ? 25 : 34;
    const copper = Math.round((rating * levelPressure + level * 18 + rand(12, 54)) * (rarityMarkup[rarityKey] || 1) * sourceMarkup);
    return Math.max(coins(0, 0, 25), copper);
  }

  function encounterCoinReward(floor, power, tier, rewardMult) {
    let copper = rand(8, 18) + floor * rand(8, 14);
    if (tier === 'Elite') copper = Math.round(copper * 2.15 + rand(20, 55));
    if (tier === 'Boss') copper = Math.round(coins(0, 1, 20) + floor * rand(24, 42));
    const maxRewardMult = tier === 'Elite' ? 1.62 : 1.35;
    copper = Math.round(copper * Math.max(0.65, Math.min(maxRewardMult, rewardMult || 1)));
    return Math.max(6, copper);
  }
