'use strict';

// Hidden internal DevTools overlay. It is inactive unless enabled by ?dev=1
// or the version-label gesture.
(function(){
  const DEVTOOLS_SESSION_KEY = 'dungeondex_devtools_v145_enabled';
  const DEVTOOLS_LOG_LIMIT = 80;
  const DEVTOOLS_VISIBLE_LOG_LIMIT = 16;
  const DEVTOOLS_RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const state = {
    enabled: false,
    root: null,
    snapshot: '',
    lastDrop: null,
    lastEnemy: '',
    renderWrapped: false,
    refreshQueued: false,
    versionClickTimes: []
  };
  const logEntries = [];

  function localEscape(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>"]/g, function(ch) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch];
    });
  }

  function localClean(value, fallback = '') {
    if (typeof cleanDisplayText === 'function') return cleanDisplayText(value, fallback);
    const clean = String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || fallback;
  }

  function safeNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
    if (typeof numberOr === 'function') return numberOr(value, fallback, min, max);
    const n = Number(value);
    const next = Number.isFinite(n) ? n : fallback;
    return Math.max(min, Math.min(max, next));
  }

  function safeInt(value, fallback = 0, min = -Infinity, max = Infinity) {
    return Math.floor(safeNumber(value, fallback, min, max));
  }

  function safeArray(value, fallback = []) {
    if (typeof asArray === 'function') return asArray(value, fallback);
    return Array.isArray(value) ? value : fallback;
  }

  function safeObject(value) {
    if (typeof isPlainObject === 'function') return isPlainObject(value);
    return !!(value && typeof value === 'object' && !Array.isArray(value));
  }

  function safeFormat(value) {
    if (typeof format === 'function') return format(value);
    return Math.round(Number(value) || 0).toLocaleString();
  }

  function safeDepth(value, fallback = 1) {
    if (typeof progressDepthValue === 'function') return progressDepthValue(value, fallback);
    return Math.max(1, safeInt(value, fallback, 1, 999999));
  }

  function depthText(depth) {
    if (typeof depthWithRawLabel === 'function') return depthWithRawLabel(depth);
    if (typeof floorNumberLabel === 'function') return `${floorNumberLabel(depth)} / D${safeFormat(depth)}`;
    return `D${safeFormat(depth)}`;
  }

  function moneyValueText(copper) {
    if (typeof moneyText === 'function') return moneyText(copper);
    if (typeof formatMoney === 'function') return localClean(formatMoney(copper), '0c');
    const goldCopper = typeof COPPER_PER_GOLD === 'number' ? COPPER_PER_GOLD : 10000;
    const silverCopper = typeof COPPER_PER_SILVER === 'number' ? COPPER_PER_SILVER : 100;
    let value = Math.max(0, safeInt(copper, 0));
    const gold = Math.floor(value / goldCopper);
    value %= goldCopper;
    const silver = Math.floor(value / silverCopper);
    const coin = value % silverCopper;
    const parts = [];
    if (gold) parts.push(`${gold}g`);
    if (silver) parts.push(`${silver}s`);
    if (coin || !parts.length) parts.push(`${coin}c`);
    return parts.join(' ');
  }

  function devLog(level, message, detail = '') {
    const cleanLevel = ['info', 'warn', 'error'].includes(level) ? level : 'info';
    const cleanMessage = String(message || 'DevTools event');
    const cleanDetail = detail instanceof Error ? (detail.message || String(detail)) : String(detail || '');
    logEntries.unshift({
      level: cleanLevel,
      message: cleanMessage,
      detail: cleanDetail,
      time: new Date().toLocaleTimeString()
    });
    logEntries.splice(DEVTOOLS_LOG_LIMIT);
    if (cleanLevel === 'warn') console.warn('[DungeonDex DevTools]', cleanMessage, cleanDetail);
    if (cleanLevel === 'error') console.warn('[DungeonDex DevTools error]', cleanMessage, cleanDetail);
    scheduleDevToolsRefresh();
  }

  function missingHook(name) {
    devLog('warn', `${name} hook is unavailable.`);
  }

  function hasGameState() {
    return typeof S !== 'undefined' && safeObject(S) && safeObject(S.player);
  }

  function currentDepth() {
    if (!hasGameState()) return 1;
    if (S.run && S.run.active && S.run.floor) return safeDepth(S.run.floor, 1);
    if (typeof defaultRunStartDepth === 'function') return safeDepth(defaultRunStartDepth(S), 1);
    return safeDepth(S.player.returnDepth || S.player.safeExtractDepth || S.player.depth || 1, 1);
  }

  function currentDistrictText() {
    if (!hasGameState()) return 'unavailable';
    try {
      if (typeof currentStagingDistrict === 'function') return currentStagingDistrict(S).name || 'unknown';
      if (typeof districtByDepth === 'function') return districtByDepth(currentDepth()).name || 'unknown';
    } catch (err) {
      devLog('warn', 'District lookup failed.', err);
    }
    return S.run?.zone || 'unknown';
  }

  function derivedStats() {
    if (!hasGameState()) return {};
    try {
      if (typeof calcDerived === 'function') return calcDerived(S) || {};
    } catch (err) {
      devLog('warn', 'Derived stat calculation failed.', err);
    }
    return safeObject(S.player.stats) ? S.player.stats : {};
  }

  function averageEquippedIlvl() {
    if (!hasGameState()) return 'n/a';
    const equipment = safeObject(S.player.equipment) ? S.player.equipment : {};
    const seen = new Set();
    const values = Object.values(equipment)
      .filter(safeObject)
      .filter(function(item) {
        const key = item.id || item.name || JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(function(item) {
        if (typeof getItemLevelValue === 'function') return getItemLevelValue(item);
        return item.itemLevel || item.ilvl || item.level || item.rating || null;
      })
      .filter(function(value) {
        return Number.isFinite(Number(value)) && Number(value) > 0;
      })
      .map(Number);
    if (!values.length) return 'n/a';
    const avg = values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
    return avg.toFixed(1);
  }

  function unlockedChartersText() {
    if (!hasGameState()) return 'n/a';
    try {
      const depths = typeof charterStartDepths === 'function'
        ? charterStartDepths(S)
        : safeArray(S.player.deepStairCharters, []);
      const normalized = Array.from(new Set(depths.map(function(depth) { return safeDepth(depth, 1); })))
        .filter(function(depth) { return depth >= 40; })
        .sort(function(a, b) { return a - b; });
      if (typeof getUnlockedCharterDepth === 'function') {
        const unlocked = safeDepth(getUnlockedCharterDepth(S), 1);
        if (unlocked >= 40 && !normalized.includes(unlocked)) normalized.push(unlocked);
      }
      normalized.sort(function(a, b) { return a - b; });
      if (!normalized.length) return 'none';
      const labels = normalized.slice(-6).map(function(depth) {
        if (typeof charterDepthCompactLabel === 'function') return charterDepthCompactLabel(depth);
        return `D${safeFormat(depth)}`;
      });
      return labels.join(', ') + (normalized.length > labels.length ? ` (+${normalized.length - labels.length} more)` : '');
    } catch (err) {
      devLog('warn', 'Charter inspection failed.', err);
      return 'unavailable';
    }
  }

  function activeSetBonusesText() {
    if (!hasGameState() || typeof MYTHIC_SET_DEFINITIONS === 'undefined') return 'n/a';
    try {
      const active = [];
      Object.values(MYTHIC_SET_DEFINITIONS).forEach(function(setDef) {
        const count = typeof getEquippedSetCount === 'function' ? getEquippedSetCount(S, setDef.id) : 0;
        if (!count) return;
        const entries = typeof getSetBonusEntries === 'function'
          ? getSetBonusEntries(setDef)
          : Object.entries(setDef.bonuses || {}).map(function(entry) {
              return { pieces: safeInt(entry[0], 0), label: String(entry[1] || '') };
            });
        entries.forEach(function(entry) {
          if (count >= entry.pieces) active.push(`${setDef.name} ${entry.pieces}pc: ${entry.label}`);
        });
      });
      return active.length ? active.join('; ') : 'none';
    } catch (err) {
      devLog('warn', 'Set bonus inspection failed.', err);
      return 'unavailable';
    }
  }

  function deathCountText() {
    if (!hasGameState()) return 'n/a';
    const history = safeArray(S.player.runHistory, []);
    const deaths = history.filter(function(entry) {
      if (!safeObject(entry)) return false;
      if (typeof normalizeRunHistoryReason === 'function') return normalizeRunHistoryReason(entry.reason) === 'defeat';
      return ['defeat', 'death', 'died', 'defeated'].includes(String(entry.reason || '').toLowerCase());
    }).length;
    return `${safeFormat(deaths)} derived`;
  }

  function itemSummary(item) {
    if (!safeObject(item)) return 'none';
    const rarity = item.rarity ? `${item.rarity} ` : '';
    const level = item.level ? ` ilvl ${safeFormat(item.level)}` : '';
    return `${rarity}${item.name || 'Unnamed item'}${level}`;
  }

  function enemySummary(monster) {
    if (!safeObject(monster)) return '';
    const hp = Number.isFinite(Number(monster.hp)) && Number.isFinite(Number(monster.maxHp))
      ? ` ${safeFormat(monster.hp)}/${safeFormat(monster.maxHp)} HP`
      : '';
    const power = Number.isFinite(Number(monster.power)) ? ` PWR ${safeFormat(monster.power)}` : '';
    return `${monster.tier || 'Enemy'} ${monster.name || 'Unknown'}${hp}${power}`.trim();
  }

  function lastDropText() {
    if (safeObject(state.lastDrop)) return itemSummary(state.lastDrop);
    const pending = hasGameState() && S.run ? S.run.pendingRewards : null;
    const pendingLoot = safeArray(pending?.loot, []);
    if (pendingLoot[0]) return itemSummary(pendingLoot[0]);
    return 'none';
  }

  function lastEnemyText() {
    if (hasGameState() && safeObject(S.run?.monster)) return enemySummary(S.run.monster);
    return state.lastEnemy || 'none';
  }

  function metric(label, value) {
    return `<div class="dd-devtools-metric"><span>${localEscape(label)}</span><strong>${localEscape(value)}</strong></div>`;
  }

  function toolButton(label, action, attrs = {}, extraClass = '') {
    const data = Object.entries(attrs).map(function(entry) {
      return ` data-${localEscape(entry[0])}="${localEscape(entry[1])}"`;
    }).join('');
    const cls = extraClass ? ` ${extraClass}` : '';
    return `<button type="button" class="dd-devtools-btn${cls}" data-dd-dev-action="${localEscape(action)}"${data}>${localEscape(label)}</button>`;
  }

  function saveInspectorMarkup() {
    if (!hasGameState()) return '<p class="dd-devtools-empty">Game state unavailable.</p>';
    const stats = derivedStats();
    const depth = currentDepth();
    return `<div class="dd-devtools-metrics">
      ${metric('Version', typeof VISIBLE_VERSION_LABEL !== 'undefined' ? VISIBLE_VERSION_LABEL : 'DungeonDex')}
      ${metric('Build', typeof BUILD !== 'undefined' ? BUILD : 'unknown')}
      ${metric('Current Floor', depthText(depth))}
      ${metric('District', currentDistrictText())}
      ${metric('HP', `${safeFormat(S.player.hp || 0)} / ${safeFormat(S.player.maxHp || 0)}`)}
      ${metric('Power', safeFormat(stats.power || S.player.stats?.power || 0))}
      ${metric('Guard', safeFormat(stats.guard || S.player.stats?.guard || 0))}
      ${metric('Currency', moneyValueText(S.player.gold || 0))}
      ${metric('Average Equipped ilvl', averageEquippedIlvl())}
      ${metric('Unlocked Charters', unlockedChartersText())}
      ${metric('Active Set Bonuses', activeSetBonusesText())}
      ${metric('Death Count', deathCountText())}
    </div>`;
  }

  function logMarkup() {
    if (!logEntries.length) return '<p class="dd-devtools-empty">No DevTools warnings or errors yet.</p>';
    return `<div class="dd-devtools-log-list">${logEntries.slice(0, DEVTOOLS_VISIBLE_LOG_LIMIT).map(function(entry) {
      return `<div class="dd-devtools-log dd-devtools-log-${localEscape(entry.level)}">
        <span>${localEscape(entry.time)} ${localEscape(entry.level.toUpperCase())}</span>
        <p>${localEscape(entry.message)}${entry.detail ? ` - ${localEscape(entry.detail)}` : ''}</p>
      </div>`;
    }).join('')}</div>`;
  }

  function renderDevTools() {
    if (!state.enabled) return;
    createOverlay();
    const snapshotMarkup = state.snapshot
      ? `<pre class="dd-devtools-snapshot">${localEscape(state.snapshot)}</pre>`
      : '<p class="dd-devtools-empty">No snapshot exported yet.</p>';
    state.root.innerHTML = `<aside class="dd-devtools-panel" aria-label="DungeonDex internal DevTools">
      <header class="dd-devtools-head">
        <div>
          <span>Internal</span>
          <strong>DevTools</strong>
        </div>
        <div class="dd-devtools-head-actions">
          ${toolButton('Refresh', 'refresh')}
          ${toolButton('Hide', 'disable', {}, 'dd-devtools-btn-danger')}
        </div>
      </header>

      <section class="dd-devtools-section">
        <h3>Save Inspector</h3>
        ${saveInspectorMarkup()}
      </section>

      <section class="dd-devtools-section">
        <h3>Run Controls</h3>
        <div class="dd-devtools-button-grid">
          ${toolButton('+1 floor', 'floor-add', { amount: 1 })}
          ${toolButton('+5 floors', 'floor-add', { amount: 5 })}
          ${toolButton('+10 floors', 'floor-add', { amount: 10 })}
          ${toolButton('+40 floors', 'floor-add', { amount: 40 })}
          ${toolButton('Next Boss', 'next-boss')}
          ${toolButton('Next District', 'next-district')}
        </div>
      </section>

      <section class="dd-devtools-section">
        <h3>Economy Tools</h3>
        <div class="dd-devtools-button-grid">
          ${toolButton('Add 1g', 'add-gold', { gold: 1 })}
          ${toolButton('Add 10g', 'add-gold', { gold: 10 })}
          ${toolButton('Add 100g', 'add-gold', { gold: 100 })}
        </div>
      </section>

      <section class="dd-devtools-section">
        <h3>Loot Tools</h3>
        <div class="dd-devtools-button-grid">
          ${DEVTOOLS_RARITIES.map(function(rarity) {
            return toolButton(`Spawn ${rarity}`, 'spawn-loot', { rarity: rarity });
          }).join('')}
        </div>
      </section>

      <section class="dd-devtools-section">
        <h3>Player Tools</h3>
        <div class="dd-devtools-button-grid">
          ${toolButton('Full Heal', 'full-heal')}
          ${toolButton('Force Death / 0 HP', 'force-death', {}, 'dd-devtools-btn-danger')}
          ${toolButton('Clear Enemy', 'clear-enemy')}
        </div>
      </section>

      <section class="dd-devtools-section">
        <h3>Debug Snapshot</h3>
        <div class="dd-devtools-button-grid">
          ${toolButton('Copy Snapshot', 'snapshot')}
          ${toolButton('Display Snapshot', 'snapshot-display')}
        </div>
        ${snapshotMarkup}
      </section>

      <section class="dd-devtools-section">
        <div class="dd-devtools-section-head">
          <h3>Error Log</h3>
          ${toolButton('Clear Log', 'clear-log')}
        </div>
        ${logMarkup()}
      </section>
    </aside>`;
  }

  function createOverlay() {
    if (state.root && document.body.contains(state.root)) return;
    const root = document.createElement('div');
    root.id = 'ddDevToolsOverlay';
    root.className = 'dd-devtools-overlay';
    root.addEventListener('click', handleDevToolsClick);
    document.body.appendChild(root);
    state.root = root;
  }

  function removeOverlay() {
    if (state.root) state.root.remove();
    state.root = null;
  }

  function scheduleDevToolsRefresh() {
    if (!state.enabled || state.refreshQueued) return;
    state.refreshQueued = true;
    const refresh = function() {
      state.refreshQueued = false;
      try { renderDevTools(); } catch (err) { console.warn('[DungeonDex DevTools] refresh failed', err); }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refresh);
    else window.setTimeout(refresh, 0);
  }

  function setSessionEnabled(enabled) {
    try {
      if (enabled) sessionStorage.setItem(DEVTOOLS_SESSION_KEY, '1');
      else sessionStorage.removeItem(DEVTOOLS_SESSION_KEY);
    } catch (err) {
      console.warn('[DungeonDex DevTools] session toggle unavailable', err);
    }
  }

  function readSessionEnabled() {
    try { return sessionStorage.getItem(DEVTOOLS_SESSION_KEY) === '1'; }
    catch (err) { return false; }
  }

  function setEnabled(enabled, source = 'manual') {
    const next = !!enabled;
    if (state.enabled === next) {
      setSessionEnabled(next);
      if (!next) removeOverlay();
      if (next) renderDevTools();
      return;
    }
    state.enabled = next;
    setSessionEnabled(next);
    if (next) {
      installRenderHook();
      createOverlay();
      devLog('info', `DevTools enabled by ${source}.`);
      renderDevTools();
    } else {
      removeOverlay();
      devLog('info', `DevTools hidden by ${source}.`);
    }
  }

  function installRenderHook() {
    if (state.renderWrapped || typeof render !== 'function') return;
    try {
      const baseRender = render;
      render = function() {
        const result = baseRender.apply(this, arguments);
        scheduleDevToolsRefresh();
        return result;
      };
      render.__ddDevToolsWrapped = true;
      state.renderWrapped = true;
    } catch (err) {
      devLog('warn', 'Render refresh hook could not be installed.', err);
    }
  }

  function finalizeMutation() {
    if (!hasGameState()) {
      renderDevTools();
      return;
    }
    try {
      if (typeof calcDerived === 'function') calcDerived(S);
    } catch (err) {
      devLog('warn', 'Post-action derived stat update failed.', err);
    }
    try {
      if (typeof render === 'function') render();
      else {
        if (typeof save === 'function') save(S);
        renderDevTools();
      }
    } catch (err) {
      devLog('error', 'Post-action render failed.', err);
      try { if (typeof save === 'function') save(S); } catch (saveErr) { devLog('warn', 'Post-action save failed.', saveErr); }
      renderDevTools();
    }
  }

  function mutate(label, fn) {
    try {
      if (!hasGameState()) {
        devLog('warn', `${label} skipped because game state is unavailable.`);
        return;
      }
      const message = fn();
      devLog('info', message || `${label} complete.`);
      finalizeMutation();
    } catch (err) {
      devLog('error', `${label} failed.`, err);
      renderDevTools();
    }
  }

  function ensureDevRunActive() {
    if (!hasGameState()) return false;
    if (S.run?.active) return true;
    if (typeof startRun === 'function') {
      const started = startRun(S);
      if (!started) devLog('warn', 'startRun did not produce an active run.');
      return !!S.run?.active;
    }
    missingHook('startRun');
    if (typeof ensureRunShell === 'function') ensureRunShell(S);
    else if (!safeObject(S.run)) S.run = {};
    S.run.active = true;
    S.run.floor = currentDepth();
    S.run.zone = typeof zoneName === 'function' ? zoneName(S.run.floor) : 'DevTools Depth';
    S.run.choices = ['attack', 'guard', 'skill', 'extract'];
    S.screen = 'run';
    return true;
  }

  function setRunDepth(targetDepth) {
    if (!ensureDevRunActive()) {
      devLog('warn', 'Run depth change skipped; no active run could be created.');
      return 'Run depth change skipped.';
    }
    const target = safeDepth(targetDepth, currentDepth());
    if (safeObject(S.run.monster)) state.lastEnemy = enemySummary(S.run.monster);
    S.run.floor = target;
    S.run.zone = typeof zoneName === 'function' ? zoneName(target) : currentDistrictText();
    S.run.danger = typeof dangerRatingForDepth === 'function' ? dangerRatingForDepth(target) : safeInt(S.run.danger, 1, 1, 999999);
    S.run.event = null;
    S.run.choices = ['attack', 'guard', 'skill', 'extract'];
    S.player.depth = Math.max(safeInt(S.player.depth, 0, 0, 999999), target);
    if (typeof nextEncounter === 'function') {
      nextEncounter(S);
    } else if (typeof generateMonster === 'function') {
      S.run.monster = generateMonster(target, S);
    } else {
      S.run.monster = null;
      missingHook('nextEncounter/generateMonster');
    }
    S.screen = 'run';
    return `Jumped to ${depthText(target)}.`;
  }

  function nextDistrictBoundaryDepth(depth) {
    if (typeof DISTRICT_DATA === 'undefined' || !Array.isArray(DISTRICT_DATA)) return safeDepth(depth + 10, 1);
    const next = DISTRICT_DATA
      .map(function(district) { return safeInt(district.min, 0, 0, 999999); })
      .filter(function(min) { return min > depth; })
      .sort(function(a, b) { return a - b; })[0];
    return safeDepth(next || (depth + 10), depth + 10);
  }

  function addGold(gold) {
    const amount = typeof coins === 'function' ? coins(gold, 0, 0) : gold * 10000;
    if (typeof addPlayerGold === 'function') addPlayerGold(S, amount);
    else S.player.gold = Math.min(Number.MAX_SAFE_INTEGER, safeInt(S.player.gold, 0, 0, Number.MAX_SAFE_INTEGER) + amount);
    return `Added ${safeFormat(gold)}g.`;
  }

  function fullHeal() {
    if (typeof calcDerived === 'function') calcDerived(S);
    S.player.maxHp = Math.max(1, safeInt(S.player.maxHp, 100, 1, 999999));
    S.player.hp = S.player.maxHp;
    return 'Player fully healed.';
  }

  function forceDeath() {
    S.player.hp = 0;
    if (S.run?.active && typeof defeat === 'function') {
      defeat(S);
      return 'Forced active run death through defeat().';
    }
    return 'Player HP set to 0 outside an active run.';
  }

  function clearEnemy() {
    if (!S.run?.active || !safeObject(S.run.monster)) {
      devLog('warn', 'Clear enemy skipped; no active enemy exists.');
      return 'No active enemy to clear.';
    }
    state.lastEnemy = enemySummary(S.run.monster);
    if (typeof winEncounter === 'function') {
      winEncounter(S);
      return 'Current enemy cleared through winEncounter().';
    }
    S.run.monster = null;
    S.run.event = null;
    S.run.choices = [];
    missingHook('winEncounter');
    return 'Current enemy removed without reward resolution.';
  }

  function fallbackTestItem(rarity) {
    const level = Math.max(1, typeof threatDepthFromDepth === 'function' ? threatDepthFromDepth(currentDepth()) : currentDepth());
    const rating = Math.max(3, Math.round(level * ({ common:7, rare:11, epic:15, legendary:20, mythic:26 }[rarity] || 7)));
    return {
      id: typeof makeId === 'function' ? makeId('devtools') : `devtools_${Date.now()}`,
      slot: 'weapon',
      rarity,
      theme: 'devtools',
      maker: 'DevTools',
      name: `DevTools ${rarity} Test Relic`,
      level,
      rating,
      value: typeof coins === 'function' ? coins(0, Math.max(1, level), 0) : rating * 100,
      stats: { power: rating, guard: Math.round(rating * 0.22), wit: 0, speed: 0, luck: 0, hp: Math.round(rating * 0.3) },
      tags: ['devtools-test', `devtools-${rarity}`],
      summary: 'Fallback DevTools test item.'
    };
  }

  function spawnLoot(rarity) {
    const cleanRarity = DEVTOOLS_RARITIES.includes(rarity) ? rarity : 'common';
    const depth = currentDepth();
    const level = Math.max(1, typeof threatDepthFromDepth === 'function' ? threatDepthFromDepth(depth) : depth);
    let item = null;
    try {
      if (typeof generateGear === 'function' && typeof SLOT_ORDER !== 'undefined' && Array.isArray(SLOT_ORDER)) {
        const slot = typeof pick === 'function'
          ? pick(SLOT_ORDER)
          : SLOT_ORDER[Math.floor(Math.random() * SLOT_ORDER.length)];
        item = generateGear(slot, level, { source:'devtools', forcedRarity:cleanRarity, depthRaw:depth, state:S });
      } else {
        missingHook('generateGear');
      }
    } catch (err) {
      devLog('warn', `Generated ${cleanRarity} loot fallback after generator error.`, err);
    }
    if (!safeObject(item) || item.rarity !== cleanRarity) {
      item = fallbackTestItem(cleanRarity);
    } else {
      item.name = `DevTools ${item.name}`;
      item.summary = `DevTools ${cleanRarity} test item generated from the normal loot factory.`;
      item.tags = Array.from(new Set(safeArray(item.tags, []).concat(['devtools-test', `devtools-${cleanRarity}`])));
    }
    const normalized = typeof normalizeItem === 'function' ? normalizeItem(item) : item;
    if (!safeObject(normalized)) throw new Error('Generated item could not be normalized.');
    S.player.inventory = safeArray(S.player.inventory, []);
    S.player.inventory.unshift(normalized);
    S.player.discoveredGear = safeArray(S.player.discoveredGear, []);
    if (normalized.name && !S.player.discoveredGear.includes(normalized.name)) S.player.discoveredGear.push(normalized.name);
    state.lastDrop = normalized;
    return `Spawned ${cleanRarity} test item: ${normalized.name}.`;
  }

  function recentWarningsText() {
    const warnings = logEntries
      .filter(function(entry) { return entry.level === 'warn' || entry.level === 'error'; })
      .slice(0, 5)
      .map(function(entry) { return `${entry.level}: ${entry.message}${entry.detail ? ` (${entry.detail})` : ''}`; });
    return warnings.length ? warnings.join(' | ') : 'none';
  }

  function buildDebugSnapshot() {
    if (!hasGameState()) return 'DungeonDex snapshot unavailable: game state missing.';
    const stats = derivedStats();
    const depth = currentDepth();
    const runState = S.run?.active ? (S.run.event ? 'run event' : 'active run') : 'town/idle';
    return [
      `DungeonDex version: ${typeof VISIBLE_VERSION_LABEL !== 'undefined' ? VISIBLE_VERSION_LABEL : 'unknown'}`,
      `build: ${typeof BUILD !== 'undefined' ? BUILD : 'unknown'}`,
      `floor: ${localClean(depthText(depth), `D${depth}`)}`,
      `district: ${currentDistrictText()}`,
      `player: HP ${safeFormat(S.player.hp || 0)}/${safeFormat(S.player.maxHp || 0)}, power ${safeFormat(stats.power || 0)}, guard ${safeFormat(stats.guard || 0)}`,
      `currency: ${moneyValueText(S.player.gold || 0)}; shards ${safeFormat(S.player.shards || 0)}; ember ${safeFormat(S.player.ember || 0)}`,
      `equipped average ilvl: ${averageEquippedIlvl()}`,
      `active set bonuses: ${activeSetBonusesText()}`,
      `last enemy: ${lastEnemyText()}`,
      `last drop: ${lastDropText()}`,
      `current screen/state: ${S.screen || 'unknown'} / ${runState}`,
      `recent warnings/errors: ${recentWarningsText()}`
    ].join('\n');
  }

  function copyOrDisplaySnapshot(copy) {
    state.snapshot = buildDebugSnapshot();
    renderDevTools();
    if (!copy) {
      devLog('info', 'Snapshot displayed.');
      return;
    }
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      devLog('warn', 'Clipboard unavailable; snapshot displayed instead.');
      return;
    }
    navigator.clipboard.writeText(state.snapshot)
      .then(function() { devLog('info', 'Snapshot copied to clipboard.'); })
      .catch(function(err) { devLog('warn', 'Clipboard copy failed; snapshot displayed instead.', err); });
  }

  function handleDevToolsClick(event) {
    const btn = event.target.closest('[data-dd-dev-action]');
    if (!btn) return;
    event.preventDefault();
    const action = btn.dataset.ddDevAction;
    if (action === 'disable') return setEnabled(false, 'panel');
    if (action === 'refresh') return renderDevTools();
    if (action === 'clear-log') {
      logEntries.splice(0, logEntries.length);
      renderDevTools();
      return;
    }
    if (action === 'snapshot') return copyOrDisplaySnapshot(true);
    if (action === 'snapshot-display') return copyOrDisplaySnapshot(false);
    if (action === 'floor-add') return mutate('Floor jump', function() {
      return setRunDepth(currentDepth() + safeInt(btn.dataset.amount, 1, 1, 999999));
    });
    if (action === 'next-boss') return mutate('Boss jump', function() {
      const next = typeof nextBossDepthFromDepth === 'function' ? nextBossDepthFromDepth(currentDepth()) : currentDepth() + 5;
      return setRunDepth(next);
    });
    if (action === 'next-district') return mutate('District jump', function() {
      return setRunDepth(nextDistrictBoundaryDepth(currentDepth()));
    });
    if (action === 'add-gold') return mutate('Add gold', function() { return addGold(safeInt(btn.dataset.gold, 1, 1, 999999)); });
    if (action === 'full-heal') return mutate('Full heal', fullHeal);
    if (action === 'force-death') return mutate('Force death', forceDeath);
    if (action === 'clear-enemy') return mutate('Clear enemy', clearEnemy);
    if (action === 'spawn-loot') return mutate('Spawn loot', function() { return spawnLoot(btn.dataset.rarity || 'common'); });
  }

  function bindVersionGesture() {
    const tag = typeof el === 'function' ? el('buildTag') : document.getElementById('buildTag');
    if (!tag || tag.__ddDevToolsGestureBound) return;
    tag.__ddDevToolsGestureBound = true;
    let holdTimer = 0;
    const clearHold = function() {
      if (holdTimer) window.clearTimeout(holdTimer);
      holdTimer = 0;
    };
    tag.addEventListener('pointerdown', function() {
      clearHold();
      holdTimer = window.setTimeout(function() {
        holdTimer = 0;
        setEnabled(!state.enabled, 'version long-hold');
      }, 900);
    });
    tag.addEventListener('pointerup', clearHold);
    tag.addEventListener('pointerleave', clearHold);
    tag.addEventListener('pointercancel', clearHold);
    tag.addEventListener('click', function() {
      const now = Date.now();
      state.versionClickTimes = state.versionClickTimes.filter(function(time) { return now - time < 1600; });
      state.versionClickTimes.push(now);
      if (state.versionClickTimes.length >= 3) {
        state.versionClickTimes = [];
        setEnabled(!state.enabled, 'version triple-click');
      }
    });
  }

  function initDevTools() {
    bindVersionGesture();
    window.setTimeout(bindVersionGesture, 500);
    window.addEventListener('error', function(event) {
      if (state.enabled) devLog('error', `Runtime error: ${event.message || 'unknown error'}`);
    });
    window.addEventListener('unhandledrejection', function(event) {
      if (state.enabled) devLog('error', 'Unhandled promise rejection.', event.reason instanceof Error ? event.reason : String(event.reason || 'unknown'));
    });

    let devParam = '';
    try {
      devParam = new URLSearchParams(window.location.search).get('dev') || '';
    } catch (err) {
      devParam = '';
    }
    if (devParam === '1') setEnabled(true, 'url');
    else if (devParam === '0') setEnabled(false, 'url');
    else if (readSessionEnabled()) setEnabled(true, 'session');
  }

  window.DungeonDexDevTools = {
    enable: function() { setEnabled(true, 'api'); },
    disable: function() { setEnabled(false, 'api'); },
    toggle: function() { setEnabled(!state.enabled, 'api'); },
    refresh: renderDevTools,
    snapshot: buildDebugSnapshot,
    log: logEntries
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDevTools);
  else initDevTools();
})();
