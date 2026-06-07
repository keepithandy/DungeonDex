'use strict';

// DungeonDex v1.6.3 - DevTools Scenario Presets
// Extension layer for the hidden DevTools overlay. Keeps scenario testing out of normal UI.
(function(){
  const SCENARIO_VERSION = 'DungeonDex v1.6.3';
  const SCENARIO_BUILD = '1.6.3-trophy-hall-archive-shell-prep-devtools';
  const OVERLAY_ID = 'ddDevToolsOverlay';
  const PANEL_SELECTOR = '.dd-devtools-panel';
  const SECTION_ID = 'ddDevToolsScenarioPresets';
  const LOG_LIMIT = 10;
  const FLOOR_BALANCE_SAMPLE_FLOORS = [20, 24, 26, 30, 35];

  const scenarioState = {
    lastScenario: 'none',
    lastBackup: null,
    lastMessage: '',
    logs: []
  };

  const SCENARIOS = [
    { id:'fresh-lowfire', name:'Fresh Lowfire', depth:1, gold:0, hp:110, stats:{ power:8, guard:6, wit:5, luck:4, speed:5 }, gear:'starter', charters:[] },
    { id:'floor-10', name:'Floor 10 Starter Check', depth:10, gold:1400, hp:180, stats:{ power:18, guard:12, wit:7, luck:6, speed:7 }, gear:'modest', charters:[] },
    { id:'floor-40', name:'Floor 40 Mythic Unlock', depth:40, gold:6000, hp:420, stats:{ power:62, guard:38, wit:12, luck:10, speed:12 }, gear:'rare', charters:[40] },
    { id:'floor-80', name:'Floor 80 Charter Check', depth:80, gold:16000, hp:800, stats:{ power:130, guard:82, wit:18, luck:16, speed:18 }, gear:'epic', charters:[40,80] },
    { id:'gold-starved', name:'Gold Starved', depth:30, gold:75, hp:310, stats:{ power:42, guard:26, wit:9, luck:7, speed:9 }, gear:'modest', charters:[] },
    { id:'undergeared', name:'Undergeared', depth:60, gold:2500, hp:480, stats:{ power:54, guard:33, wit:10, luck:8, speed:10 }, gear:'weak', charters:[40] },
    { id:'overpowered-mythic', name:'Overpowered Mythic', depth:80, gold:50000, hp:1250, stats:{ power:260, guard:170, wit:30, luck:28, speed:28 }, gear:'mythic', charters:[40,80] },
    { id:'floor-500', name:'Late Scaling Floor 500', depth:500, gold:200000, hp:5200, stats:{ power:1200, guard:720, wit:90, luck:80, speed:85 }, gear:'late', charters:[40,80,120,160,200,240,280,320,360,400,440,480] },
    { id:'floor-1000', name:'Deep Scaling Floor 1000', depth:1000, gold:750000, hp:11000, stats:{ power:2600, guard:1500, wit:180, luck:160, speed:170 }, gear:'deep', charters:[40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760,800,840,880,920,960,1000] }
  ];

  function hasState(){ return typeof S !== 'undefined' && S && typeof S === 'object' && S.player; }
  function int(value, fallback, min, max){
    const n = Math.floor(Number(value));
    const clean = Number.isFinite(n) ? n : fallback;
    return Math.max(min == null ? -Infinity : min, Math.min(max == null ? Infinity : max, clean));
  }
  function arr(value){ return Array.isArray(value) ? value : []; }
  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch];
    });
  }
  function fmt(value){
    try { if (typeof format === 'function') return format(value); } catch (err) {}
    return int(value, 0).toLocaleString();
  }
  function coinValue(gold){
    try { if (typeof coins === 'function') return coins(gold, 0, 0); } catch (err) {}
    return gold * 10000;
  }
  function money(value){
    try { if (typeof moneyText === 'function') return moneyText(value); } catch (err) {}
    const g = Math.floor(int(value, 0, 0) / 10000);
    return g ? `${g}g` : `${int(value, 0, 0)}c`;
  }
  function maxIlvl(){
    try { if (typeof MAX_ITEM_LEVEL === 'number') return MAX_ITEM_LEVEL; } catch (err) {}
    return 3250;
  }
  function log(message, level){
    scenarioState.logs.unshift({ message:String(message || 'Scenario event'), level:level || 'info', time:new Date().toLocaleTimeString() });
    scenarioState.logs.splice(LOG_LIMIT);
    if (level === 'warn') console.warn('[DungeonDex Scenario Presets]', message);
    renderScenarioSectionSoon();
  }
  function slotList(){
    try { if (Array.isArray(SLOT_ORDER)) return SLOT_ORDER.slice(); } catch (err) {}
    return ['weapon','offhand','helm','armor','gloves','boots','ring','amulet','cloak','charm'];
  }
  function rarityForGearMode(mode, index){
    if (mode === 'starter') return index === 0 ? 'common' : 'common';
    if (mode === 'weak') return index < 2 ? 'common' : 'common';
    if (mode === 'modest') return index < 2 ? 'rare' : 'common';
    if (mode === 'rare') return index < 5 ? 'rare' : 'uncommon';
    if (mode === 'epic') return index < 4 ? 'epic' : 'rare';
    if (mode === 'mythic') return index < 5 ? 'mythic' : 'legendary';
    if (mode === 'late') return index < 3 ? 'mythic' : 'legendary';
    if (mode === 'deep') return index < 5 ? 'mythic' : 'legendary';
    return 'common';
  }
  function targetIlvl(depth, mode, index){
    const cap = maxIlvl();
    const multipliers = { starter:0.8, weak:0.55, modest:0.9, rare:1.2, epic:1.35, mythic:1.7, late:2.8, deep:3.2 };
    const base = Math.max(1, Math.round(depth * (multipliers[mode] || 1)) + index * 3);
    return Math.min(cap, base);
  }
  function fallbackGear(slot, rarity, level, mode){
    const scale = { common:1, uncommon:1.15, rare:1.4, epic:1.8, legendary:2.3, mythic:2.9 }[rarity] || 1;
    const rating = Math.max(3, Math.round(level * scale));
    return {
      id: `scenario_${mode}_${slot}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      slot,
      rarity,
      theme:'scenario',
      maker:'DevTools',
      name:`Scenario ${rarity} ${slot}`,
      level,
      rating,
      value:Math.max(1, Math.round(rating * 70)),
      stats:{ power:rating, guard:Math.round(rating * 0.38), wit:0, luck:0, speed:0, hp:Math.round(rating * 0.8) },
      tags:['devtools-scenario', `scenario-${mode}`],
      summary:`${SCENARIO_VERSION} preset test item.`
    };
  }
  function makeGear(slot, rarity, level, mode){
    let item = null;
    try {
      if (typeof generateGear === 'function') item = generateGear(slot, level, { source:'scenario', forcedRarity:rarity, depthRaw:level, state:S });
    } catch (err) {
      log(`Gear generator fallback for ${slot}.`, 'warn');
    }
    if (!obj(item) || item.rarity !== rarity) item = fallbackGear(slot, rarity, level, mode);
    item.slot = item.slot || slot;
    item.rarity = rarity;
    item.level = Math.min(maxIlvl(), int(item.level || level, level, 1, maxIlvl()));
    item.name = item.name && item.name.indexOf('Scenario ') === 0 ? item.name : `Scenario ${item.name || rarity + ' ' + slot}`;
    item.tags = Array.from(new Set(arr(item.tags).concat(['devtools-scenario', `scenario-${mode}`])));
    try { if (typeof normalizeItem === 'function') item = normalizeItem(item); } catch (err) {}
    return item;
  }
  function buildGearSet(depth, mode){
    const slots = slotList();
    const equipment = {};
    const inventory = [];
    slots.forEach(function(slot, index){
      const rarity = rarityForGearMode(mode, index);
      const item = makeGear(slot, rarity, targetIlvl(depth, mode, index), mode);
      if (index < 5 || mode === 'mythic' || mode === 'deep' || mode === 'late') equipment[slot] = item;
      else inventory.push(item);
    });
    return { equipment, inventory };
  }
  function cloneState(){
    if (!hasState()) return null;
    try { return JSON.parse(JSON.stringify(S)); } catch (err) { log('Backup clone failed.', 'warn'); return null; }
  }
  function restoreObject(target, source){
    if (!obj(target) || !obj(source)) return;
    Object.keys(target).forEach(function(key){ delete target[key]; });
    Object.keys(source).forEach(function(key){ target[key] = source[key]; });
  }
  function saveAndRender(){
    try { if (typeof calcDerived === 'function') calcDerived(S); } catch (err) { log('calcDerived failed after scenario.', 'warn'); }
    try { if (typeof save === 'function') save(S); } catch (err) { log('Save failed after scenario.', 'warn'); }
    try { if (typeof render === 'function') render(); } catch (err) { log('Render failed after scenario.', 'warn'); }
    renderScenarioSectionSoon();
  }
  function setRunAtDepth(depth){
    if (!obj(S.run)) S.run = {};
    S.run.active = true;
    S.run.floor = depth;
    S.run.chain = 0;
    S.run.danger = typeof dangerRatingForDepth === 'function' ? dangerRatingForDepth(depth) : Math.max(1, Math.round(depth / 5));
    try { S.run.zone = typeof zoneName === 'function' ? zoneName(depth) : 'Scenario Depth'; } catch (err) { S.run.zone = 'Scenario Depth'; }
    S.run.event = null;
    S.run.choices = ['attack','guard','skill','extract'];
    S.run.combatLog = [`Scenario preset loaded at depth ${depth}.`];
    try {
      if (typeof generateMonster === 'function') S.run.monster = generateMonster(depth, S);
      else if (typeof nextEncounter === 'function') nextEncounter(S);
      else S.run.monster = null;
    } catch (err) {
      S.run.monster = null;
      log('Enemy generation failed for scenario.', 'warn');
    }
    S.screen = 'run';
  }
  function applyScenario(id){
    if (!hasState()) { log('Scenario skipped: game state unavailable.', 'warn'); return; }
    const scenario = SCENARIOS.find(function(entry){ return entry.id === id; });
    if (!scenario) { log(`Unknown scenario: ${id}`, 'warn'); return; }
    scenarioState.lastBackup = cloneState();
    const p = S.player;
    if (!obj(p.stats)) p.stats = {};
    Object.assign(p.stats, scenario.stats);
    p.level = Math.max(1, Math.round(scenario.depth / 8));
    p.xp = 0;
    p.xpNext = Math.max(100, p.level * 140);
    p.maxHp = scenario.hp;
    p.hp = scenario.hp;
    p.gold = coinValue(Math.max(0, scenario.gold / 10000));
    if (scenario.gold > 10000) p.gold = scenario.gold;
    p.depth = scenario.depth;
    p.safeExtractDepth = scenario.depth;
    p.returnDepth = scenario.depth;
    p.deepStairCharters = scenario.charters.slice();
    p.unlockedCharters = scenario.charters.slice();
    const gear = buildGearSet(scenario.depth, scenario.gear);
    p.equipment = gear.equipment;
    p.inventory = gear.inventory.concat(arr(p.inventory).filter(function(item){ return obj(item) && !arr(item.tags).includes('devtools-scenario'); }).slice(0, 12));
    p.discoveredGear = Array.from(new Set(arr(p.discoveredGear).concat(Object.values(gear.equipment).concat(gear.inventory).map(function(item){ return item.name; }).filter(Boolean))));
    S.build = SCENARIO_BUILD;
    S.lastDevScenario = scenario.name;
    setRunAtDepth(scenario.depth);
    scenarioState.lastScenario = scenario.name;
    scenarioState.lastMessage = `${scenario.name} loaded at depth ${scenario.depth}.`;
    log(scenarioState.lastMessage, 'info');
    saveAndRender();
  }
  function eliteContractApi(){ return window.DungeonDexEliteContracts || null; }
  function eliteTrophyStateText(){
    const api = eliteContractApi();
    if (!api || !hasState()) return 'Elite trophy state unavailable.';
    const summary = typeof api.trophySummary === 'function' ? api.trophySummary(S) : { totalFound:0, uniqueFound:0, latestLabel:'none yet', bonus:0 };
    return [
      `Elite trophies`,
      `unique: ${summary.uniqueFound}`,
      `total found: ${summary.totalFound}`,
      `latest: ${summary.latestLabel}`,
      `bonus: +${summary.bonus}%`
    ].join('\n');
  }
  function eliteRivalStateText(){
    const api = eliteContractApi();
    if (!api || !hasState()) return 'Elite rival state unavailable.';
    const rivals = api.ensureRivals ? api.ensureRivals(S) : [];
    return [
      'Elite rivals',
      `remembered: ${rivals.length}`,
      `available: ${rivals.filter(function(rival){ return rival.revengeAvailable && !rival.completed; }).length}`,
      `defeated: ${rivals.filter(function(rival){ return rival.completed; }).length}`,
      `latest: ${rivals[0] ? rivals[0].eliteName : 'none'}`
    ].join('\n');
  }
  function eliteBoardStateText(){
    const api = eliteContractApi();
    if (!api || !hasState()) return 'Elite board state unavailable.';
    const board = api.inspectBoardState ? api.inspectBoardState(S) : null;
    if (!board) return 'Elite board state unavailable.';
    return [
      'Elite board',
      `active: ${board.active ? board.active.eliteName : 'none'}`,
      `completed: ${board.completed.length}`,
      `claimed: ${board.claimed.length}`,
      `failed: ${board.failed.length}`,
      `expired: ${board.expired.length}`,
      `rivals: ${board.rivals.length}`,
      `trophies: ${board.trophyIds.length}`
    ].join('\n');
  }

  function talentApi(){
    return window.DungeonDexTalents || window.DungeonDexWardenTalents || null;
  }

  function talentSummaryText(state){
    const api = talentApi();
    if (!api) return 'Talent state unavailable.';
    const summary = typeof api.summary === 'function'
      ? api.summary(state || S)
      : { pointsEarned:0, pointsSpent:0, pointsAvailable:0, unlockedIds:[], bonuses:{ maxHpPct:0, eliteBoardRewardPct:0, charterCostPct:0, sellValuePct:0 } };
    const unlockedNames = Array.isArray(summary.unlockedIds) && summary.unlockedIds.length
      ? summary.unlockedIds.map(function(id){ return (api.defs || []).find(function(def){ return def.id === id; })?.name || id; }).join(', ')
      : 'none';
    return [
      `Talent points`,
      `earned: ${summary.pointsEarned}`,
      `spent: ${summary.pointsSpent}`,
      `available: ${summary.pointsAvailable}`,
      `unlocked: ${unlockedNames}`,
      `bonuses: HP +${Math.round((summary.bonuses?.maxHpPct || 0) * 100)}%, Board +${Math.round((summary.bonuses?.eliteBoardRewardPct || 0) * 100)}%, Charters -${Math.round((summary.bonuses?.charterCostPct || 0) * 100)}%, Sell +${Math.round((summary.bonuses?.sellValuePct || 0) * 100)}%`
    ].join('\n');
  }

  function grantTalentPoint(count = 1){
    const api = talentApi();
    if (!api || !hasState()) return false;
    const gained = typeof api.grantPoints === 'function' ? api.grantPoints(S, count) : 0;
    if (gained) {
      scenarioState.lastMessage = talentSummaryText();
      log(`Granted ${count} talent point${count === 1 ? '' : 's'}.`, 'info');
      saveAndRender();
    }
    return !!gained;
  }

  function resetTalents(){
    const api = talentApi();
    if (!api || !hasState() || typeof api.reset !== 'function') return false;
    const ok = api.reset(S);
    if (ok) {
      scenarioState.lastMessage = talentSummaryText();
      log('Talent points reset.', 'info');
      saveAndRender();
    }
    return ok;
  }

  function unlockTalentForTest(id){
    const api = talentApi();
    if (!api || !hasState()) return false;
    if (typeof api.unlock !== 'function') return false;
    if (typeof api.getAvailablePoints === 'function' && api.getAvailablePoints(S) <= 0) {
      if (!grantTalentPoint(1)) return false;
    }
    const ok = api.unlock(S, id);
    if (ok) {
      scenarioState.lastMessage = talentSummaryText();
      log(`Unlocked talent for test: ${id}.`, 'info');
      saveAndRender();
    }
    return ok;
  }

  function talentSmoke(){
    const api = talentApi();
    if (!api) return 'Talent API unavailable.';
    const snapshot = cloneState();
    if (!snapshot) return 'Talent smoke unavailable.';
    try {
      if (!snapshot.player) snapshot.player = {};
      delete snapshot.player.talents;
      delete snapshot.player.talentPointsEarned;
      delete snapshot.player.talentPointsSpent;
      delete snapshot.player.talentPoints;
      delete snapshot.player.talentUnlockIds;
      const repaired = typeof api.ensure === 'function' ? api.ensure(snapshot) : null;
      const summary = typeof api.summary === 'function' ? api.summary(snapshot) : null;
      let unknownSafe = true;
      if (typeof api.unlock === 'function') {
        try { api.unlock(snapshot, '__unknown_talent__'); } catch (err) { unknownSafe = false; }
      }
      return [
        'Talent smoke',
        `repaired: ${!!repaired}`,
        `points: ${summary ? summary.pointsAvailable : 'n/a'}`,
        `unlocked: ${summary ? summary.unlockedIds.length : 'n/a'}`,
        `unknown id safe: ${unknownSafe}`
      ].join('\n');
    } catch (err) {
      return `Talent smoke failed: ${err?.message || String(err)}`;
    }
  }
  function scalingProbeDepthLabel(rawDepth){
    if (typeof getLoreDepthProgress === 'function') {
      const lore = getLoreDepthProgress(rawDepth);
      return {
        floor: lore.floorNumber,
        room: lore.roomWithinFloor,
        chapter: lore.chapterWithinRoom,
        text: `Floor ${fmt(lore.floorNumber)} / Room ${fmt(lore.roomWithinFloor)} / Chapter ${fmt(lore.chapterWithinRoom)}`
      };
    }
    return {
      floor: rawDepth,
      room: 1,
      chapter: 1,
      text: `Depth ${fmt(rawDepth)}`
    };
  }
  function scalingProbeSample(rawDepth, tier){
    if (typeof expectedMonsterSampleAtDepth === 'function') return expectedMonsterSampleAtDepth(rawDepth, tier);
    const power = typeof expectedMonsterPowerAtDepth === 'function' ? expectedMonsterPowerAtDepth(rawDepth, tier) : 0;
    const hpMult = tier === 'Boss' ? 2.95 : tier === 'Elite' ? 1.84 : 1.44;
    return {
      rawDepth,
      threatFloor: typeof threatDepthFromDepth === 'function' ? threatDepthFromDepth(rawDepth) : rawDepth,
      tier,
      power,
      maxHp: Math.round(power * hpMult)
    };
  }
  function scalingProbeSnapshot(){
    if (!hasState()) return null;
    const derived = (() => {
      try { return typeof calcDerived === 'function' ? calcDerived(S) : null; } catch (err) { return null; }
    })();
    const playerPower = derived ? Math.round(derived.power || 0) : 0;
    const rawDepth = Math.max(1, Math.floor(Number(S.run && S.run.active ? S.run.floor : (S.player.depth || S.player.safeExtractDepth || 1)) || 1));
    const depthLabel = scalingProbeDepthLabel(rawDepth);
    const bossDepth = typeof nextBossDepthFromDepth === 'function'
      ? nextBossDepthFromDepth(rawDepth)
      : Math.max(1, Math.ceil(rawDepth / ((typeof BOSS_INTERVAL === 'number' ? BOSS_INTERVAL : 5) * (typeof DEPTH_CHAPTERS_PER_THREAT_STEP === 'number' ? DEPTH_CHAPTERS_PER_THREAT_STEP : 3))) * ((typeof BOSS_INTERVAL === 'number' ? BOSS_INTERVAL : 5) * (typeof DEPTH_CHAPTERS_PER_THREAT_STEP === 'number' ? DEPTH_CHAPTERS_PER_THREAT_STEP : 3)));
    const common = scalingProbeSample(rawDepth, 'Common');
    const elite = scalingProbeSample(rawDepth, 'Elite');
    const boss = scalingProbeSample(bossDepth, 'Boss');
    const api = eliteContractApi();
    const board = api && api.inspectBoardState ? api.inspectBoardState(S) : null;
    const active = board && board.active ? board.active : null;
    const targetRawDepth = active
      ? (typeof eliteContractRawDepthForThreatFloor === 'function'
        ? eliteContractRawDepthForThreatFloor(active.targetFloor)
        : Math.max(1, (Math.floor(Number(active.targetFloor) || 1) - 1) * (typeof DEPTH_CHAPTERS_PER_THREAT_STEP === 'number' ? DEPTH_CHAPTERS_PER_THREAT_STEP : 3) + 1))
      : 0;
    const targetBase = active ? scalingProbeSample(targetRawDepth, 'Elite') : null;
    const targetHpMult = active ? ((Math.floor(Number(active.targetFloor) || 1) < 20 ? 1.25 : 1.35) * (active.rivalContract ? 1.15 : 1)) : 1;
    const activeTarget = active && targetBase ? {
      name: active.eliteName,
      rival: !!active.rivalContract,
      targetFloor: active.targetFloor,
      rawDepth: targetRawDepth,
      power: targetBase.power,
      maxHp: Math.round(targetBase.maxHp * targetHpMult)
    } : null;
    return {
      build: SCENARIO_BUILD,
      playerPower,
      rawDepth,
      depthLabel,
      common,
      elite,
      boss,
      activeTarget
    };
  }
  function scalingProbeText(){
    const probe = scalingProbeSnapshot();
    if (!probe) return 'Scaling probe unavailable.';
    return [
      'Scaling Probe',
      `Player Power: ${fmt(probe.playerPower)}`,
      `Current: ${probe.depthLabel.text} (D${fmt(probe.rawDepth)}, threat Floor ${fmt(probe.common.threatFloor)})`,
      probe.common.power ? `Common sample: ${fmt(probe.common.power)} power / ${fmt(probe.common.maxHp)} HP` : 'Common sample: n/a',
      probe.elite.power ? `Elite sample: ${fmt(probe.elite.power)} power / ${fmt(probe.elite.maxHp)} HP` : 'Elite sample: n/a',
      probe.boss.power ? `Boss sample: ${fmt(probe.boss.power)} power / ${fmt(probe.boss.maxHp)} HP at D${fmt(probe.boss.rawDepth)}` : 'Boss sample: n/a',
      probe.activeTarget ? `${probe.activeTarget.rival ? 'Rival' : 'Contract'} sample: ${probe.activeTarget.name} - ${fmt(probe.activeTarget.power)} power / ${fmt(probe.activeTarget.maxHp)} HP` : 'Contract/Rival sample: none active'
    ].join('\n');
  }
  function ratioValue(value, baseline){
    const v = Number(value);
    const b = Number(baseline);
    return Number.isFinite(v) && Number.isFinite(b) && b > 0 ? +(v / b).toFixed(2) : null;
  }
  function ratioText(value){
    return value == null ? 'n/a' : `${Number(value).toFixed(2)}x`;
  }
  function equippedAverageIlvl(state){
    const gear = Object.values(obj(state?.player?.equipment) ? state.player.equipment : {}).filter(obj);
    return gear.length ? Math.round(gear.reduce(function(sum, item){ return sum + int(item.level || item.ilvl || 0, 0); }, 0) / gear.length) : 0;
  }
  function liveBalanceProfile(requireHighPower){
    if (!hasState()) return null;
    let derived = null;
    try { derived = typeof calcDerived === 'function' ? calcDerived(S) : null; } catch (err) { derived = null; }
    const p = S.player || {};
    const power = Math.round(numberOr(derived?.power, p.stats?.power || 0, 0, 999999));
    const guard = Math.round(numberOr(derived?.guard, p.stats?.guard || 0, 0, 999999));
    const hp = Math.round(numberOr(p.maxHp, p.hp || 0, 0, 999999));
    const avgIlvl = equippedAverageIlvl(S);
    if (requireHighPower && power < 15000 && avgIlvl < 260) return null;
    return {
      source: 'live-save-derived',
      note: 'current save, read-only sample',
      power,
      maxHp: hp,
      guard,
      avgIlvl
    };
  }
  function syntheticBalanceProfile(reason){
    return {
      source: 'synthetic-ilvl-320-22k',
      note: reason || 'synthetic multiple-mythic reference; no save data touched',
      power: 22000,
      maxHp: 20600,
      guard: 10400,
      avgIlvl: 320
    };
  }
  function balanceSampleProfile(mode){
    const sampleMode = String(mode || 'auto').toLowerCase();
    if (sampleMode === 'live') return liveBalanceProfile(false) || syntheticBalanceProfile('live save unavailable; synthetic fallback used');
    if (sampleMode === 'synthetic') return syntheticBalanceProfile();
    return liveBalanceProfile(true) || syntheticBalanceProfile('no high-power live save loaded; synthetic reference used');
  }
  function rawDepthForSampleFloor(floor){
    const step = typeof DEPTH_CHAPTERS_PER_THREAT_STEP === 'number' ? DEPTH_CHAPTERS_PER_THREAT_STEP : 3;
    return Math.max(1, Math.floor(numberOr(floor, 1, 1, 999999)) * step);
  }
  function representativeBossDepth(rawDepth){
    const step = typeof DEPTH_CHAPTERS_PER_THREAT_STEP === 'number' ? DEPTH_CHAPTERS_PER_THREAT_STEP : 3;
    const interval = Math.max(1, Math.floor(numberOr(BOSS_INTERVAL, 5, 1, 999)) * step);
    const depth = Math.max(1, Math.floor(numberOr(rawDepth, 1, 1, 999999)));
    if (depth % interval === 0) return depth;
    return typeof nextBossDepthFromDepth === 'function' ? nextBossDepthFromDepth(depth) : Math.max(interval, Math.ceil(depth / interval) * interval);
  }
  function targetSampleFromElite(rawDepth, rival){
    const base = scalingProbeSample(rawDepth, 'Elite');
    const targetFloor = base.threatFloor || (typeof threatDepthFromDepth === 'function' ? threatDepthFromDepth(rawDepth) : rawDepth);
    const hpMult = (targetFloor < 20 ? 1.25 : 1.35) * (rival ? 1.15 : 1);
    return {
      rawDepth: base.rawDepth,
      threatFloor: targetFloor,
      power: base.power,
      maxHp: Math.round(base.maxHp * hpMult)
    };
  }
  function floorBalanceRisk(row){
    if (row.floor >= 26 && row.commonPowerRatio < 0.45 && row.commonHpRatio < 1.8) return 'Too Weak';
    if (row.commonPowerRatio < 0.45) return 'Low';
    if (row.commonPowerRatio > 0.85) return 'High';
    if (row.bossPowerRatio >= 0.95 && row.bossHpRatio >= 6) return 'Boss Threat';
    if (row.commonPowerRatio >= 0.45 && row.eliteHpRatio >= 2.5) return 'Fair';
    return 'Low';
  }
  function balanceSampleRow(floor, profile){
    const rawDepth = rawDepthForSampleFloor(floor);
    const depthLabel = scalingProbeDepthLabel(rawDepth);
    const bossDepth = representativeBossDepth(rawDepth);
    const common = scalingProbeSample(rawDepth, 'Common');
    const elite = scalingProbeSample(rawDepth, 'Elite');
    const boss = scalingProbeSample(bossDepth, 'Boss');
    const board = targetSampleFromElite(rawDepth, false);
    const rival = targetSampleFromElite(rawDepth, true);
    const row = {
      floor,
      rawDepth,
      depthLabel: depthLabel.text,
      playerProfile: profile.source,
      playerPower: profile.power,
      playerHp: profile.maxHp,
      playerGuard: profile.guard,
      avgIlvl: profile.avgIlvl,
      commonPower: common.power,
      commonHp: common.maxHp,
      commonPowerRatio: ratioValue(common.power, profile.power),
      commonHpRatio: ratioValue(common.maxHp, profile.maxHp),
      elitePower: elite.power,
      eliteHp: elite.maxHp,
      elitePowerRatio: ratioValue(elite.power, profile.power),
      eliteHpRatio: ratioValue(elite.maxHp, profile.maxHp),
      bossRawDepth: boss.rawDepth,
      bossPower: boss.power,
      bossHp: boss.maxHp,
      bossPowerRatio: ratioValue(boss.power, profile.power),
      bossHpRatio: ratioValue(boss.maxHp, profile.maxHp),
      boardPower: board.power,
      boardHp: board.maxHp,
      boardPowerRatio: ratioValue(board.power, profile.power),
      boardHpRatio: ratioValue(board.maxHp, profile.maxHp),
      rivalPower: rival.power,
      rivalHp: rival.maxHp,
      rivalPowerRatio: ratioValue(rival.power, profile.power),
      rivalHpRatio: ratioValue(rival.maxHp, profile.maxHp),
      risk: '',
      tuningChanged: 'no'
    };
    row.risk = floorBalanceRisk(row);
    return row;
  }
  function floorBalanceSample(mode, options){
    const opts = obj(options) ? options : {};
    const profile = balanceSampleProfile(mode);
    const rows = FLOOR_BALANCE_SAMPLE_FLOORS.map(function(floor){ return balanceSampleRow(floor, profile); });
    const sample = {
      build: SCENARIO_BUILD,
      update: 'Floor 20-35 Balance Sample Pass',
      profile,
      sampleRawDepthNote: 'Representative end-of-threat-floor raw depth; boss sample uses the current or next boss depth nearby.',
      tuningChanged: false,
      rows
    };
    if (opts.log !== false && typeof console !== 'undefined') {
      if (typeof console.table === 'function') console.table(rows);
      else console.info('[DungeonDex Floor Balance Sample]', rows);
    }
    return sample;
  }
  function floorBalanceSampleText(mode){
    const sample = floorBalanceSample(mode, { log:false });
    if (!sample || !sample.rows) return 'Floor balance sample unavailable.';
    const profile = sample.profile;
    const lines = [
      'Floor 20-35 Balance Sample',
      `Build: ${sample.build}`,
      `Player profile: ${profile.source} (${profile.note})`,
      `Player power / HP / guard: ${fmt(profile.power)} / ${fmt(profile.maxHp)} / ${fmt(profile.guard)}`,
      `Average ilvl: ${fmt(profile.avgIlvl)}`,
      'Tuning changed: no'
    ];
    sample.rows.forEach(function(row){
      lines.push(
        '',
        `Floor ${fmt(row.floor)}:`,
        `rawDepth/chapter sampled: D${fmt(row.rawDepth)} - ${row.depthLabel}`,
        `common: ${fmt(row.commonPower)} power / ${fmt(row.commonHp)} HP (${ratioText(row.commonPowerRatio)} power, ${ratioText(row.commonHpRatio)} HP)`,
        `elite: ${fmt(row.elitePower)} power / ${fmt(row.eliteHp)} HP (${ratioText(row.elitePowerRatio)} power, ${ratioText(row.eliteHpRatio)} HP)`,
        `boss: ${fmt(row.bossPower)} power / ${fmt(row.bossHp)} HP at D${fmt(row.bossRawDepth)} (${ratioText(row.bossPowerRatio)} power, ${ratioText(row.bossHpRatio)} HP)`,
        `board target: ${fmt(row.boardPower)} power / ${fmt(row.boardHp)} HP (${ratioText(row.boardPowerRatio)} power, ${ratioText(row.boardHpRatio)} HP)`,
        `rival elite: ${fmt(row.rivalPower)} power / ${fmt(row.rivalHp)} HP (${ratioText(row.rivalPowerRatio)} power, ${ratioText(row.rivalHpRatio)} HP)`,
        `judgment: ${row.risk}`
      );
    });
    return lines.join('\n');
  }
  function createTestRival(){
    const api = eliteContractApi();
    if (!api || !hasState()) return false;
    const active = api.ensure ? api.ensure(S).active : null;
    const source = active || (typeof ELITE_CONTRACTS !== 'undefined' && ELITE_CONTRACTS && ELITE_CONTRACTS[0]) || null;
    if (!source) return false;
    const fakeKiller = { contractTarget:true, contractId:source.id, name:source.eliteName || source.name || 'Rival Elite' };
    const rival = api.rememberRival ? api.rememberRival(S, source, fakeKiller) : null;
    if (rival) {
      scenarioState.lastMessage = eliteRivalStateText();
      log(`Created test rival: ${rival.eliteName}.`, 'info');
      saveAndRender();
    }
    return !!rival;
  }
  function forceRivalContract(){
    const api = eliteContractApi();
    if (!api || !hasState()) return false;
    const rivals = api.availableRivals ? api.availableRivals(S) : [];
    const rival = rivals[0];
    if (!rival || !api.startRival) return false;
    const ok = api.startRival(S, rival.id);
    if (ok) {
      log(`Forced rival contract: ${rival.eliteName}.`, 'info');
      saveAndRender();
    }
    return ok;
  }
  function completeTestRival(){
    const api = eliteContractApi();
    if (!api || !hasState() || !api.completeRival) return false;
    const ok = api.completeRival(S);
    if (ok) {
      scenarioState.lastMessage = eliteRivalStateText();
      log('Marked one rival completed.', 'info');
      saveAndRender();
    }
    return ok;
  }
  function clearRivalState(){
    const api = eliteContractApi();
    if (!api || !hasState() || !api.clearRivals) return false;
    const ok = api.clearRivals(S);
    if (ok) {
      log('Elite rival state cleared for testing.', 'info');
      saveAndRender();
    }
    return ok;
  }
  function simulateDeathReset(){
    const api = eliteContractApi();
    if (!api || !hasState() || !api.simulateDeathReset) return false;
    const ok = api.simulateDeathReset(S);
    if (ok) {
      scenarioState.lastMessage = eliteBoardStateText();
      log('Simulated death reset for Elite Board state.', 'info');
      saveAndRender();
    }
    return ok;
  }
  function validateBoardState(){
    const api = eliteContractApi();
    if (!api || !hasState() || !api.validate) return false;
    const ok = api.validate(S);
    if (ok) {
      scenarioState.lastMessage = eliteBoardStateText();
      log('Validated Elite Board state.', 'info');
      saveAndRender();
    }
    return !!ok;
  }
  function forceEliteTrophy(){
    const api = eliteContractApi();
    if (!api || !hasState()) return false;
    const active = api.ensure ? api.ensure(S).active : null;
    const target = active || (typeof ELITE_CONTRACTS !== 'undefined' && ELITE_CONTRACTS && ELITE_CONTRACTS[0]) || null;
    const contract = active || target;
    if (!contract) return false;
    const result = api.forceTrophy ? api.forceTrophy(S, contract.id || contract.eliteName || '') : null;
    saveAndRender();
    log(result?.awarded ? `Forced elite trophy: ${result.trophy.name}.` : 'Forced elite trophy produced a duplicate or no-op.', result?.awarded ? 'info' : 'warn');
    return !!result;
  }
  function simulateEliteCompletion(){
    const api = eliteContractApi();
    if (!api || !hasState()) return false;
    const active = api.activeSummaryText ? api.ensure(S).active : null;
    if (!active) return false;
    if (api.complete) {
      api.complete(S);
      saveAndRender();
      return true;
    }
    return false;
  }
  function clearTrophyState(){
    const api = eliteContractApi();
    if (!api || !hasState() || !api.clearTrophies) return false;
    const ok = api.clearTrophies(S);
    if (ok) {
      log('Elite trophy state cleared for testing.', 'info');
      saveAndRender();
    }
    return ok;
  }
  function bossTrophySummaryText(){
    if (!hasState()) return 'Boss trophy state unavailable.';
    const records = arr(S.player.bossTrophyRecords).filter(obj);
    const latest = records.slice().sort(function(a, b){ return int(b.earnedAt, 0, 0) - int(a.earnedAt, 0, 0); })[0];
    const summary = typeof getBossTrophyCollectionSummary === 'function'
      ? getBossTrophyCollectionSummary(S)
      : { recordedCount: records.length, totalDefinitions: 0, missingCount: 0, totalFound: records.reduce(function(sum, entry){ return sum + Math.max(1, int(entry.count, 1, 1)); }, 0) };
    return [
      'Boss trophy state',
      `unique: ${fmt(records.length)}`,
      `total: ${fmt(summary.totalFound)}`,
      `recorded: ${fmt(summary.recordedCount)}${summary.totalDefinitions > 0 ? ` / ${fmt(summary.totalDefinitions)}` : ''}`,
      `missing: ${fmt(summary.missingCount)}`,
      `latest: ${latest ? latest.trophyName || latest.name || 'unknown' : 'none yet'}`
    ].join('\n');
  }
  function grantBossTrophyForTest(){
    if (!hasState() || typeof recordBossTrophyUnlock !== 'function') return false;
    const defs = Array.isArray(BOSS_TROPHY_DEFINITIONS) ? BOSS_TROPHY_DEFINITIONS : [];
    const owned = new Set(arr(S.player.bossTrophies).map(String));
    const next = defs.find(function(def){ return def && def.id && !owned.has(def.id); }) || defs[0];
    if (!next) return false;
    const rawDepth = int(next.requiredDepth || 15, 15, 1);
    const record = recordBossTrophyUnlock(S, rawDepth, next.source || next.name || 'Boss');
    if (!record) return false;
    if (typeof save === 'function') save(S);
    if (typeof render === 'function') render();
    scenarioState.lastMessage = bossTrophySummaryText();
    log(`Forced boss trophy: ${record.trophyName || record.name}.`, 'info');
    return true;
  }
  function clearBossTrophies(){
    if (!hasState()) return false;
    S.player.bossTrophies = [];
    S.player.bossTrophyRecords = [];
    if (typeof save === 'function') save(S);
    if (typeof render === 'function') render();
    scenarioState.lastMessage = bossTrophySummaryText();
    log('Boss trophy state cleared for testing.', 'info');
    return true;
  }
  function restoreBackup(){
    if (!scenarioState.lastBackup || !hasState()) { log('No scenario backup available.', 'warn'); return; }
    restoreObject(S, scenarioState.lastBackup);
    scenarioState.lastScenario = 'restored backup';
    scenarioState.lastMessage = 'Restored last pre-scenario backup.';
    log(scenarioState.lastMessage, 'info');
    saveAndRender();
  }
  function scenarioSnapshot(){
    if (!hasState()) return `${SCENARIO_VERSION} snapshot unavailable: game state missing.`;
    const p = S.player;
    const depth = S.run && S.run.active ? S.run.floor : (p.returnDepth || p.depth || 1);
    const gear = Object.values(obj(p.equipment) ? p.equipment : {}).filter(obj);
    const avg = gear.length ? Math.round(gear.reduce(function(sum, item){ return sum + int(item.level || item.ilvl || 0, 0); }, 0) / gear.length) : 0;
    return [
      `${SCENARIO_VERSION} scenario snapshot`,
      `scenario: ${scenarioState.lastScenario}`,
      `build: ${SCENARIO_BUILD}`,
      `floor/depth: ${fmt(depth)}`,
      `screen: ${S.screen || 'unknown'}`,
      `HP: ${fmt(p.hp)}/${fmt(p.maxHp)}`,
      `stats: power ${fmt(p.stats && p.stats.power)}, guard ${fmt(p.stats && p.stats.guard)}, speed ${fmt(p.stats && p.stats.speed)}`,
      `currency: ${money(p.gold || 0)}`,
      `equipped average ilvl: ${avg || 'n/a'}`,
      `charters: ${arr(p.deepStairCharters).join(', ') || 'none'}`,
      `recent scenario log: ${scenarioState.logs.slice(0,3).map(function(entry){ return entry.message; }).join(' | ') || 'none'}`
    ].join('\n');
  }
  function copyScenarioSnapshot(){
    const text = scenarioSnapshot();
    scenarioState.lastMessage = text;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(function(){ log('Scenario snapshot copied.', 'info'); }).catch(function(){ log('Clipboard failed; snapshot displayed in panel.', 'warn'); });
    } else {
      log('Clipboard unavailable; snapshot displayed in panel.', 'warn');
    }
    renderScenarioSectionSoon();
  }
  function button(label, action, id, danger){
    return `<button type="button" class="dd-devtools-btn${danger ? ' dd-devtools-btn-danger' : ''}" data-dd-scenario-action="${esc(action)}"${id ? ` data-scenario-id="${esc(id)}"` : ''}>${esc(label)}</button>`;
  }
  function scenarioMarkup(){
    const logs = scenarioState.logs.length
      ? scenarioState.logs.map(function(entry){ return `<div class="dd-devtools-log dd-devtools-log-${esc(entry.level)}"><span>${esc(entry.time)} ${esc(entry.level.toUpperCase())}</span><p>${esc(entry.message)}</p></div>`; }).join('')
      : '<p class="dd-devtools-empty">No scenario preset used yet.</p>';
    const message = scenarioState.lastMessage && scenarioState.lastMessage.indexOf('\n') >= 0
      ? `<pre class="dd-devtools-snapshot">${esc(scenarioState.lastMessage)}</pre>`
      : `<p class="dd-devtools-empty">${esc(scenarioState.lastMessage || 'Choose a preset to overwrite the current test state. Backup is automatic.')}</p>`;
    return `<section class="dd-devtools-section" id="${SECTION_ID}">
      <div class="dd-devtools-section-head"><h3>Scenario Presets</h3><span class="dd-devtools-empty">${esc(SCENARIO_VERSION)}</span></div>
      <div class="dd-devtools-button-grid">
        ${SCENARIOS.map(function(scenario){ return button(scenario.name, 'apply', scenario.id); }).join('')}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Backup Current State', 'backup')}
        ${button('Restore Last Backup', 'restore', '', true)}
        ${button('Copy Scenario Snapshot', 'snapshot')}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Force Trophy', 'force-trophy')}
        ${button('Simulate Completion', 'simulate-complete')}
        ${button('Clear Trophy State', 'clear-trophies', '', true)}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Force Boss Trophy', 'force-boss-trophy')}
        ${button('Boss Trophy Summary', 'boss-trophy-summary')}
        ${button('Clear Boss Trophies', 'clear-boss-trophies', '', true)}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Create Rival', 'create-rival')}
        ${button('Force Rival Contract', 'force-rival')}
        ${button('Complete Rival', 'complete-rival')}
        ${button('Clear Rival State', 'clear-rivals', '', true)}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Validate Board', 'validate-board')}
        ${button('Sim Death Reset', 'simulate-death-reset')}
      </div>
      <div class="dd-devtools-button-grid">
        ${button('Scaling Probe', 'scaling-probe')}
        ${button('Floor 20-35 Sample', 'floor-balance-sample')}
      </div>
      ${message}
      <div class="dd-devtools-log-list">${logs}</div>
    </section>`;
  }
  function injectScenarioSection(){
    const overlay = document.getElementById(OVERLAY_ID);
    const panel = overlay && overlay.querySelector(PANEL_SELECTOR);
    if (!panel || panel.querySelector(`#${SECTION_ID}`)) return;
    const runControls = Array.from(panel.querySelectorAll('.dd-devtools-section')).find(function(section){
      return /Run Controls/i.test(section.textContent || '');
    });
    if (runControls) runControls.insertAdjacentHTML('afterend', scenarioMarkup());
    else panel.insertAdjacentHTML('beforeend', scenarioMarkup());
  }
  function refreshScenarioSection(){
    const existing = document.getElementById(SECTION_ID);
    if (existing) existing.outerHTML = scenarioMarkup();
    else injectScenarioSection();
  }
  function renderScenarioSectionSoon(){
    window.setTimeout(refreshScenarioSection, 0);
  }
  document.addEventListener('click', function(event){
    const btn = event.target.closest('[data-dd-scenario-action]');
    if (!btn) return;
    event.preventDefault();
    const action = btn.dataset.ddScenarioAction;
    if (action === 'apply') return applyScenario(btn.dataset.scenarioId || '');
    if (action === 'backup') { scenarioState.lastBackup = cloneState(); scenarioState.lastMessage = 'Manual backup captured.'; log('Manual backup captured.', 'info'); return; }
    if (action === 'restore') return restoreBackup();
    if (action === 'snapshot') return copyScenarioSnapshot();
    if (action === 'force-trophy') return forceEliteTrophy();
    if (action === 'force-boss-trophy') return grantBossTrophyForTest();
    if (action === 'boss-trophy-summary') { scenarioState.lastMessage = bossTrophySummaryText(); renderScenarioSectionSoon(); return true; }
    if (action === 'clear-boss-trophies') return clearBossTrophies();
    if (action === 'simulate-complete') return simulateEliteCompletion();
    if (action === 'clear-trophies') return clearTrophyState();
    if (action === 'create-rival') return createTestRival();
    if (action === 'force-rival') return forceRivalContract();
    if (action === 'complete-rival') return completeTestRival();
    if (action === 'clear-rivals') return clearRivalState();
    if (action === 'validate-board') return validateBoardState();
    if (action === 'simulate-death-reset') return simulateDeathReset();
    if (action === 'scaling-probe') { scenarioState.lastMessage = scalingProbeText(); log('Generated scaling probe.', 'info'); return renderScenarioSectionSoon(); }
    if (action === 'floor-balance-sample') { scenarioState.lastMessage = floorBalanceSampleText(); log('Generated Floor 20-35 balance sample.', 'info'); return renderScenarioSectionSoon(); }
  });
  function init(){
    try { document.title = SCENARIO_VERSION; } catch (err) {}
    const tag = document.getElementById('buildTag');
    if (tag) tag.textContent = SCENARIO_VERSION;
    const observer = new MutationObserver(function(){ injectScenarioSection(); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    injectScenarioSection();
  }
  window.DungeonDexScenarioDevTools = {
    version: SCENARIO_VERSION,
    build: SCENARIO_BUILD,
    apply: applyScenario,
    backup: function(){ scenarioState.lastBackup = cloneState(); return !!scenarioState.lastBackup; },
    restore: restoreBackup,
    snapshot: scenarioSnapshot,
    scalingProbe: scalingProbeSnapshot,
    scalingProbeText,
    floorBalanceSample,
    floorBalanceSampleText,
    eliteTrophyStateText,
    eliteRivalStateText,
    talentSummary: talentSummaryText,
    bossTrophySummary: bossTrophySummaryText,
    grantBossTrophyForTest,
    clearBossTrophies,
    grantTalentPoint,
    resetTalents,
    unlockTalentForTest,
    talentSmoke,
    state: scenarioState
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
