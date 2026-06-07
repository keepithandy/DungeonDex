'use strict';

// DungeonDex v1.6.11 - DevTools Balance Reports
// Internal-only measurement layer. It injects into the hidden DevTools overlay and does not touch normal UI.
(function(){
  const REPORT_VERSION = 'DungeonDex v1.6.11';
  const REPORT_BUILD = '1.6.11-retired-gear-hall-polish-devtools-balance-reports';
  const OVERLAY_ID = 'ddDevToolsOverlay';
  const PANEL_SELECTOR = '.dd-devtools-panel';
  const SECTION_ID = 'ddDevToolsBalanceReports';
  const LOG_LIMIT = 8;

  const state = {
    lastReport: '',
    lastTitle: 'No balance report yet.',
    logs: []
  };

  function hasState(){ return typeof S !== 'undefined' && S && typeof S === 'object' && S.player; }
  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value); }
  function arr(value){ return Array.isArray(value) ? value : []; }
  function num(value, fallback){ const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function int(value, fallback, min, max){ const n = Math.floor(num(value, fallback)); return Math.max(min == null ? -Infinity : min, Math.min(max == null ? Infinity : max, n)); }
  function esc(value){ return String(value == null ? '' : value).replace(/[&<>\"]/g, function(ch){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]; }); }
  function fmt(value){ try { if (typeof format === 'function') return format(value); } catch (err) {} return int(value, 0).toLocaleString(); }
  function pct(value){ return `${Math.round(value * 100)}%`; }
  function money(value){
    try { if (typeof moneyText === 'function') return moneyText(value); } catch (err) {}
    const copper = int(value, 0, 0);
    const g = Math.floor(copper / 10000);
    const s = Math.floor((copper % 10000) / 100);
    return g ? `${g}g ${s}s` : `${s}s ${copper % 100}c`;
  }
  function currentDepth(){
    if (!hasState()) return 1;
    if (S.run && S.run.active && S.run.floor) return int(S.run.floor, 1, 1, 999999);
    return int(S.player.returnDepth || S.player.safeExtractDepth || S.player.depth || 1, 1, 1, 999999);
  }
  function scenarioName(){ return (hasState() && (S.lastDevScenario || S.devScenario || S.activeScenario)) || (window.DungeonDexScenarioDevTools && window.DungeonDexScenarioDevTools.state && window.DungeonDexScenarioDevTools.state.lastScenario) || 'manual/current state'; }
  function derivedStats(){
    if (!hasState()) return {};
    try { if (typeof calcDerived === 'function') return calcDerived(S) || {}; } catch (err) {}
    return obj(S.player.stats) ? S.player.stats : {};
  }
  function playerProfile(){
    const p = hasState() ? S.player : {};
    const stats = derivedStats();
    return {
      hp:int(p.hp || p.maxHp || 100, 100, 1, 99999999),
      maxHp:int(p.maxHp || p.hp || 100, 100, 1, 99999999),
      power:int(stats.power || (p.stats && p.stats.power) || 8, 8, 1, 99999999),
      guard:int(stats.guard || (p.stats && p.stats.guard) || 0, 0, 0, 99999999),
      speed:int(stats.speed || (p.stats && p.stats.speed) || 0, 0, 0, 99999999),
      crit:num(p.crit, 0.07),
      dodge:num(p.dodge, 0.03),
      gold:int(p.gold, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }
  function log(message, level){
    state.logs.unshift({ message:String(message || 'Report event'), level:level || 'info', time:new Date().toLocaleTimeString() });
    state.logs.splice(LOG_LIMIT);
    if (level === 'warn') console.warn('[DungeonDex Balance Reports]', message);
    renderSoon();
  }
  function enemyAt(depth, boss){
    try {
      if (typeof generateMonster === 'function') {
        const monster = generateMonster(depth, S);
        if (obj(monster)) {
          if (boss) {
            monster.tier = monster.tier || 'Boss';
            monster.maxHp = int(monster.maxHp || monster.hp, 50) * 1.65;
            monster.hp = monster.maxHp;
            monster.power = int(monster.power, 5) * 1.35;
          }
          return monster;
        }
      }
    } catch (err) {}
    const scale = Math.max(1, depth);
    const bossMult = boss ? 1.8 : 1;
    return {
      name: boss ? 'Simulated Boss' : 'Simulated Enemy',
      tier: boss ? 'Boss' : 'Enemy',
      hp:Math.round((70 + scale * 10) * bossMult),
      maxHp:Math.round((70 + scale * 10) * bossMult),
      power:Math.round((8 + scale * 1.6) * (boss ? 1.35 : 1)),
      guard:Math.round(scale * 0.45),
      rewardGold:Math.round(80 + scale * 25)
    };
  }
  function simulateFight(depth, boss){
    const p = playerProfile();
    const enemy = enemyAt(depth, boss);
    let playerHp = p.maxHp;
    let enemyHp = int(enemy.hp || enemy.maxHp, 100, 1);
    const enemyGuard = int(enemy.guard, 0, 0);
    const enemyPower = int(enemy.power, 5, 1);
    let turns = 0;
    let playerDamageTotal = 0;
    let enemyDamageTotal = 0;
    while (turns < 60 && playerHp > 0 && enemyHp > 0) {
      turns += 1;
      const crit = Math.random() < Math.min(0.65, Math.max(0, p.crit));
      const playerRoll = 0.82 + Math.random() * 0.36;
      const playerDamage = Math.max(1, Math.round((p.power * playerRoll * (crit ? 1.75 : 1)) - enemyGuard * 0.28));
      enemyHp -= playerDamage;
      playerDamageTotal += playerDamage;
      if (enemyHp <= 0) break;
      if (Math.random() < Math.min(0.45, Math.max(0, p.dodge))) continue;
      const enemyRoll = 0.78 + Math.random() * 0.44;
      const enemyDamage = Math.max(1, Math.round(enemyPower * enemyRoll - p.guard * 0.34));
      playerHp -= enemyDamage;
      enemyDamageTotal += enemyDamage;
    }
    return {
      win: enemyHp <= 0 && playerHp > 0,
      timeout: turns >= 60 && enemyHp > 0 && playerHp > 0,
      turns,
      hpLost: Math.max(0, p.maxHp - playerHp),
      hpLostPct: Math.max(0, p.maxHp - playerHp) / Math.max(1, p.maxHp),
      playerDamageTotal,
      enemyDamageTotal,
      rewardGold:int(enemy.rewardGold, Math.round(depth * 20), 0)
    };
  }
  function fightReport(count, boss){
    if (!hasState()) return setReport('Fight Report', 'Game state unavailable.');
    const depth = currentDepth();
    const results = [];
    for (let i = 0; i < count; i++) results.push(simulateFight(depth + (boss ? 0 : i % 5), boss));
    const wins = results.filter(r => r.win).length;
    const losses = count - wins;
    const avgTurns = results.reduce((s,r)=>s+r.turns,0) / count;
    const avgHpLost = results.reduce((s,r)=>s+r.hpLostPct,0) / count;
    const avgGold = results.reduce((s,r)=>s+r.rewardGold,0) / count;
    const pressure = wins / count < 0.45 ? 'too punishing' : wins / count < 0.68 ? 'hard but playable' : wins / count > 0.92 ? 'too easy / overgeared' : 'healthy';
    const recommendation = wins / count < 0.55
      ? 'increase player guard/power in this band or lower enemy damage 6–12%.'
      : wins / count > 0.92
        ? 'raise enemy HP/damage or reduce gear advantage in this band.'
        : 'keep current band and test adjacent presets.';
    setReport(boss ? 'Boss Check' : `${count}-Fight Report`, [
      `${REPORT_VERSION} ${boss ? 'boss check' : 'fight report'}`,
      `scenario: ${scenarioName()}`,
      `depth: ${fmt(depth)}`,
      `fights simulated: ${fmt(count)}`,
      `wins: ${fmt(wins)} (${pct(wins / count)})`,
      `losses/timeouts: ${fmt(losses)}`,
      `average fight length: ${avgTurns.toFixed(1)} turns`,
      `average HP lost: ${pct(avgHpLost)}`,
      `average gold reward seen: ${money(avgGold)}`,
      `pressure: ${pressure}`,
      `recommendation: ${recommendation}`
    ].join('\n'));
  }
  function rarityFromItem(item){ return String((item && item.rarity) || 'unknown').toLowerCase(); }
  function rollLoot(depth){
    try {
      if (typeof generateGear === 'function') {
        const slots = Array.isArray(SLOT_ORDER) ? SLOT_ORDER : ['weapon','helm','armor','gloves','boots','ring','amulet','cloak','charm'];
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const item = generateGear(slot, depth, { source:'balance-report', depthRaw:depth, state:S });
        if (obj(item)) return item;
      }
    } catch (err) {}
    const roll = Math.random() * 100;
    const rarity = roll < 40 ? 'common' : roll < 66 ? 'uncommon' : roll < 83 ? 'rare' : roll < 93 ? 'epic' : roll < 98 ? 'legendary' : 'mythic';
    return { rarity, level:depth, value:depth * ({ common:20, uncommon:30, rare:45, epic:75, legendary:120, mythic:210 }[rarity] || 20) };
  }
  function lootReport(count){
    if (!hasState()) return setReport('Loot Report', 'Game state unavailable.');
    const depth = currentDepth();
    const counts = {};
    let levelSum = 0;
    let valueSum = 0;
    for (let i = 0; i < count; i++) {
      const item = rollLoot(depth + (i % 10));
      const rarity = rarityFromItem(item);
      counts[rarity] = (counts[rarity] || 0) + 1;
      levelSum += int(item.level || item.ilvl || 0, 0);
      valueSum += int(item.value, 0, 0);
    }
    const order = ['common','uncommon','rare','epic','legendary','mythic','unknown'];
    const rarityLines = order.filter(r => counts[r]).map(r => `${r}: ${fmt(counts[r])} (${pct(counts[r] / count)})`);
    const mythicRate = (counts.mythic || 0) / count;
    const recommendation = mythicRate > 0.04 ? 'mythic rate may be too generous.' : mythicRate < 0.005 ? 'mythic rate may be too invisible.' : 'rarity spread looks usable for this sample.';
    setReport(`${count} Loot Rolls`, [
      `${REPORT_VERSION} loot report`,
      `scenario: ${scenarioName()}`,
      `depth: ${fmt(depth)}`,
      `rolls: ${fmt(count)}`,
      ...rarityLines,
      `average ilvl: ${fmt(levelSum / count)}`,
      `average item value: ${money(valueSum / count)}`,
      `recommendation: ${recommendation}`
    ].join('\n'));
  }
  function economySnapshot(){
    if (!hasState()) return setReport('Economy Snapshot', 'Game state unavailable.');
    const p = playerProfile();
    const depth = currentDepth();
    const projected = [];
    for (let i = 0; i < 20; i++) projected.push(simulateFight(depth + i, false));
    const wins = projected.filter(r => r.win).length;
    const goldPerWin = projected.reduce((s,r)=>s+(r.win ? r.rewardGold : 0),0) / Math.max(1, wins);
    const goldPer20 = projected.reduce((s,r)=>s+(r.win ? r.rewardGold : 0),0);
    const pressure = p.gold < goldPerWin * 2 ? 'starved' : p.gold > goldPerWin * 25 ? 'wealthy' : 'healthy';
    setReport('Economy Snapshot', [
      `${REPORT_VERSION} economy snapshot`,
      `scenario: ${scenarioName()}`,
      `current currency: ${money(p.gold)}`,
      `projected wins over 20 fights: ${fmt(wins)}/20`,
      `average gold per win: ${money(goldPerWin)}`,
      `projected gold over 20 fights: ${money(goldPer20)}`,
      `economy pressure: ${pressure}`,
      `recommendation: ${pressure === 'starved' ? 'check rest/merchant/charter costs against this preset.' : pressure === 'wealthy' ? 'add stronger sinks or reduce gold gain in this band.' : 'economy band looks usable.'}`
    ].join('\n'));
  }
  function scalingSnapshot(){
    if (!hasState()) return setReport('Scaling Snapshot', 'Game state unavailable.');
    const depth = currentDepth();
    const points = [depth, depth + 10, depth + 40, depth + 100, Math.max(1, depth * 2)].map(d => int(d, 1, 1, 999999));
    const lines = points.map(function(d){
      const e = enemyAt(d, false);
      return `D${fmt(d)} -> enemy HP ${fmt(e.maxHp || e.hp)}, power ${fmt(e.power)}, guard ${fmt(e.guard || 0)}`;
    });
    setReport('Scaling Snapshot', [
      `${REPORT_VERSION} scaling snapshot`,
      `scenario: ${scenarioName()}`,
      ...lines,
      `recommendation: compare this slope against player power/average ilvl before adding new progression systems.`
    ].join('\n'));
  }
  function setReport(title, text){
    state.lastTitle = title;
    state.lastReport = text;
    log(`${title} generated.`, 'info');
    renderSoon();
  }
  function copyReport(){
    if (!state.lastReport) { log('No report to copy yet.', 'warn'); return; }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(state.lastReport).then(()=>log('Balance report copied.', 'info')).catch(()=>log('Clipboard failed; report remains displayed.', 'warn'));
    } else log('Clipboard unavailable; report remains displayed.', 'warn');
  }
  function button(label, action, count){ return `<button type="button" class="dd-devtools-btn" data-dd-balance-action="${esc(action)}"${count ? ` data-count="${esc(count)}"` : ''}>${esc(label)}</button>`; }
  function markup(){
    const logs = state.logs.length ? state.logs.map(entry => `<div class="dd-devtools-log dd-devtools-log-${esc(entry.level)}"><span>${esc(entry.time)} ${esc(entry.level.toUpperCase())}</span><p>${esc(entry.message)}</p></div>`).join('') : '<p class="dd-devtools-empty">No balance reports generated yet.</p>';
    return `<section class="dd-devtools-section" id="${SECTION_ID}">
      <div class="dd-devtools-section-head"><h3>Balance Reports</h3><span class="dd-devtools-empty">${esc(REPORT_VERSION)}</span></div>
      <div class="dd-devtools-button-grid">
        ${button('Run 10-Fight Report', 'fight', 10)}
        ${button('Run 100-Fight Report', 'fight', 100)}
        ${button('Loot 100 Rolls', 'loot', 100)}
        ${button('Loot 1000 Rolls', 'loot', 1000)}
        ${button('Economy Snapshot', 'economy')}
        ${button('Scaling Snapshot', 'scaling')}
        ${button('Boss Check', 'boss')}
        ${button('Copy Report', 'copy')}
      </div>
      <p class="dd-devtools-empty">Reports use the current state or active scenario as the baseline. These are approximate balance probes, not player-visible systems.</p>
      ${state.lastReport ? `<pre class="dd-devtools-snapshot">${esc(state.lastReport)}</pre>` : `<p class="dd-devtools-empty">${esc(state.lastTitle)}</p>`}
      <div class="dd-devtools-log-list">${logs}</div>
    </section>`;
  }
  function inject(){
    const overlay = document.getElementById(OVERLAY_ID);
    const panel = overlay && overlay.querySelector(PANEL_SELECTOR);
    if (!panel || panel.querySelector(`#${SECTION_ID}`)) return;
    const scenarioSection = panel.querySelector('#ddDevToolsScenarioPresets');
    if (scenarioSection) scenarioSection.insertAdjacentHTML('afterend', markup());
    else {
      const runControls = Array.from(panel.querySelectorAll('.dd-devtools-section')).find(section => /Run Controls/i.test(section.textContent || ''));
      if (runControls) runControls.insertAdjacentHTML('afterend', markup());
      else panel.insertAdjacentHTML('beforeend', markup());
    }
  }
  function refresh(){ const existing = document.getElementById(SECTION_ID); if (existing) existing.outerHTML = markup(); else inject(); }
  function renderSoon(){ window.setTimeout(refresh, 0); }
  document.addEventListener('click', function(event){
    const btn = event.target.closest('[data-dd-balance-action]');
    if (!btn) return;
    event.preventDefault();
    const action = btn.dataset.ddBalanceAction;
    const count = int(btn.dataset.count, 10, 1, 5000);
    if (action === 'fight') return fightReport(count, false);
    if (action === 'loot') return lootReport(count);
    if (action === 'economy') return economySnapshot();
    if (action === 'scaling') return scalingSnapshot();
    if (action === 'boss') return fightReport(50, true);
    if (action === 'copy') return copyReport();
  });
  function init(){
    const observer = new MutationObserver(function(){ inject(); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    inject();
  }
  window.DungeonDexBalanceReports = { version:REPORT_VERSION, build:REPORT_BUILD, fight:fightReport, loot:lootReport, economy:economySnapshot, scaling:scalingSnapshot, boss:function(){ fightReport(50, true); }, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
