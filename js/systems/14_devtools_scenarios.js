'use strict';

// DungeonDex v1.4.14 - DevTools Scenario Presets
// Extension layer for the hidden DevTools overlay. Keeps scenario testing out of normal UI.
(function(){
  const SCENARIO_VERSION = 'DungeonDex v1.4.14';
  const SCENARIO_BUILD = '1.4.14-combat-page-framing-cleanup';
  const OVERLAY_ID = 'ddDevToolsOverlay';
  const PANEL_SELECTOR = '.dd-devtools-panel';
  const SECTION_ID = 'ddDevToolsScenarioPresets';
  const LOG_LIMIT = 10;

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
    state: scenarioState
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
