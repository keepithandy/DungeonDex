'use strict';

// Screen switching, common UI helpers, popups, intro modal
  let S = load();

  function switchScreen(screen) {
    if (S?.run?.active && screen !== 'run') screen = 'run';
    screen = normalizeScreenName(screen);
    S.screen = screen;
    $$('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
    $$('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === screen));
    render();
  }

  function rarityClass(key) {
    const found = RARITIES.find(r => r.key === key);
    return found ? found.color : 'rarity-common';
  }

  function itemRarityKey(item) {
    const key = String(item?.rarity || 'common').toLowerCase();
    return RARITIES.some(r => r.key === key) ? key : 'common';
  }

  function getItemLevelValue(item) {
    if (!isPlainObject(item)) return null;
    const fields = ['itemLevel', 'ilvl', 'level', 'power', 'score', 'rating'];
    for (const field of fields) {
      const value = Number(item[field]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
    return null;
  }

  function getItemLevelLabel(item) {
    const value = getItemLevelValue(item);
    return value == null ? 'ilvl —' : `ilvl ${format(value)}`;
  }

  function getRarityCardClass(item) {
    return `rarity-card rarity-card-${itemRarityKey(item)}`;
  }

  function upgradeMarkup(item, state) {
    const slot = item && item.slot;
    if (!slot) return '';
    const equipped = state && state.player && state.player.equipment && state.player.equipment[slot];
    if (!equipped || equipped.id === item.id) return '';
    const delta = (item.rating || 0) - (equipped.rating || 0);
    if (delta <= 0) return '';
    return `<span class="upgrade-badge">↑ Upgrade<span class="upgrade-delta">+${delta} PWR</span></span>`;
  }

  function renderStatBoxes() {
    calcDerived(S);
    const d = calcDerived(S);
    const heroStats = el('heroStats');
    const resourceBar = el('resourceBar');
    const bestDepth = Math.max(1, S.player.depth || S.player.safeExtractDepth || 1);
    if (heroStats) heroStats.innerHTML = [
      statBox('Level', S.player.level),
      statBox('Best Floor', depthShortLabel(bestDepth)),
      statBox('Power', d.power),
      statBox('Guard', d.guard)
    ].join('');
    if (resourceBar) resourceBar.innerHTML = [
      resourceBox('HP', `${format(S.player.hp)}/${format(S.player.maxHp)}`),
      resourceBox('Wallet', formatMoney(S.player.gold)),
      resourceBox('Shards', format(S.player.shards)),
      resourceBox('Ember', format(S.player.ember))
    ].join('');
    const buildTag = el('buildTag');
    if (buildTag) buildTag.textContent = VISIBLE_VERSION_LABEL;
    const loreLine = el('loreLine');
    if (loreLine) loreLine.textContent = SESSION_LORE_LINE;
  }

  function statBox(label, value) { return `<div class="stat-box"><div class="small muted">${escapeHtml(label)}</div><strong>${escapeHtml(value)}</strong></div>`; }
  function resourceBox(label, value) { return `<div class="resource-box"><div class="small muted">${label}</div><strong>${value}</strong></div>`; }

  function updateSaveStatus(ok, label = '') {
    const node = el('saveStatus');
    if (!node) return;
    node.textContent = label || (ok ? 'Saved' : 'Save blocked');
    node.classList.toggle('save-warn', !ok);
  }

  function showGoldPopup(copper) {
    const popup = document.createElement('div');
    popup.className = 'gold-popup';
    popup.innerHTML = `+${formatMoney(copper)}`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.remove(), 1200);
  }

  function showExtractionPopup(summary = '') {
    if (typeof document === 'undefined' || !document.body) return;
    document.querySelectorAll('.extract-success-popup').forEach(node => node.remove());
    const popup = document.createElement('div');
    popup.className = 'extract-success-popup';
    popup.setAttribute('role', 'status');
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `<strong>Extraction Haul</strong><span>${escapeHtml(summary || 'Rewards banked. You made it back to Lowfire.')}</span>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.classList.remove('show'), 2100);
    setTimeout(() => popup.remove(), 2450);
  }

  function showDefeatPopup(summary = '') {
    if (typeof document === 'undefined' || !document.body) return;
    document.querySelectorAll('.defeat-result-popup').forEach(node => node.remove());
    const popup = document.createElement('div');
    popup.className = 'defeat-result-popup';
    popup.setAttribute('role', 'status');
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `<strong>Run Lost</strong><span>${escapeHtml(summary || 'Unsecured rewards were forfeited.')}</span>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => popup.classList.remove('show'), 2400);
    setTimeout(() => popup.remove(), 2750);
  }

  function latestRunSummary(state) {
    const latest = asArray(state.player.runHistory, [])[0];
    if (!latest) return 'No descents logged yet';
    const floor = Math.max(0, Math.floor(numberOr(latest.floor, 0, 0, 999999)));
    const reason = normalizeRunHistoryReason(latest.reason);
    if (reason === 'extract') return `Last descent: extraction secured at ${depthWithRawLabel(floor || 1)}`;
    if (reason === 'defeat') return `Last descent: run lost at ${depthWithRawLabel(floor || 1)}`;
    return `Last descent: ${reason} at ${depthWithRawLabel(floor || 1)}`;
  }

  function nextBossFloorFromDepth(depth) {
    const next = nextBossDepthFromDepth(depth);
    return { floor: next, name: bossFloorNameByDepth(next) };
  }

  function introStat(label, value, extraClass = '') {
    return `<div class="intro-stat ${extraClass}"><div class="small muted">${label}</div><strong>${value}</strong></div>`;
  }

  function introRoadmapMarkup() {
    return `
      <div class="threshold-roadmap-card" aria-label="Current Roadmap">
        <div class="threshold-roadmap-head">
          <span class="threshold-label">Current Roadmap</span>
          <p class="threshold-roadmap-copy">v1.4 stabilized the dungeon. v1.5 starts deeper progression.</p>
        </div>
        <div class="threshold-roadmap-list">
          <div class="threshold-roadmap-row">
            <span class="threshold-roadmap-key">Now</span>
            <span class="threshold-roadmap-value">Scaling, board hunts, rivals, trophies</span>
          </div>
          <div class="threshold-roadmap-row">
            <span class="threshold-roadmap-key">Next</span>
            <span class="threshold-roadmap-value">Talent System Foundation</span>
          </div>
          <div class="threshold-roadmap-row">
            <span class="threshold-roadmap-key">Later</span>
            <span class="threshold-roadmap-value">Boss trophies, retired gear, famous items</span>
          </div>
          <div class="threshold-roadmap-row">
            <span class="threshold-roadmap-key">Future</span>
            <span class="threshold-roadmap-value">District identity, Debt Collector, Dungeon Court</span>
          </div>
        </div>
      </div>`;
  }

  function deepStairCharterMarkup(mode = 'panel') {
    const unlockedDepth = getUnlockedCharterDepth(S);
    const depths = Array.from(new Set([...charterStartDepths(S), ...ensurePermanentCharters(S)])).sort((a, b) => a - b);
    const nextUnlock = unlockedDepth ? getNextCharterUnlockDepth(unlockedDepth) : CHARTER_EARLY_STEP;
    const safeDepth = Math.max(1, Math.floor(numberOr(S.player.safeExtractDepth || S.player.depth || 1, 1, 1, 999999)));
    const progress = clamp((safeDepth / nextUnlock) * 100, 0, 100);
    const label = unlockedDepth
      ? `Unlocked through ${charterDepthCompactLabel(unlockedDepth)}.`
      : `Extract safely at ${charterDepthCompactLabel(40)} to unlock the first charter.`;
    const buttons = depths.length
      ? depths.map(depth => {
          const owned = ownsPermanentCharter(S, depth);
          const cost = charterStartCost(depth);
          const disabled = S.run.active || (!owned && S.player.gold < cost) ? 'disabled' : '';
          const startLabel = charterDepthLabel(depth);
          const cleanPrice = formatMoney(cost).replace(/<[^>]*>/g, '');
          const title = owned
            ? `Owned forever. Start at ${startLabel}`
            : (S.player.gold < cost ? `Need ${cleanPrice} to permanently buy ${startLabel}` : `Buy forever and start at ${startLabel}`);
          const labelText = owned ? 'Start' : formatMoney(cost);
          const ownedClass = owned ? ' charter-owned' : '';
          const aria = owned ? `Start at owned ${startLabel}` : `Permanently buy ${startLabel} for ${cleanPrice}`;
          return `<button class="ghost mini charter-price-btn${ownedClass}" data-charter-start="${depth}" title="${escapeHtml(title)}" aria-label="${escapeHtml(aria)}" ${disabled}>${labelText}</button>`;
        }).join('')
      : '<span class="charter-empty small">No Hollow Stair charters claimed yet.</span>';

    return `<div class="deep-charter-card compact-charter-card" aria-label="Hollow Stair Charters">
      <div class="charter-glow" aria-hidden="true"></div>
      <div class="charter-head">
        <div>
          <div class="charter-kicker">Safe Return Milestone</div>
          <strong>Hollow Stair Charters</strong>
        </div>
        <span class="charter-badge">Next D${format(nextUnlock)}</span>
      </div>
      <p class="charter-copy small">${escapeHtml(label)} Later safe extractions unlock more charters through D800, then every D5000.</p>
      <div class="charter-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
      <div class="charter-actions">${buttons}</div>
    </div>`;
  }

  function introProgressMarkup() {
    const stagingDistrict = currentStagingDistrict(S);
    const activeDepth = S.run.active ? progressDepthValue(S.run.floor || 1, 1) : defaultRunStartDepth(S);
    const activeDepthMeta = depthProgressMeta(activeDepth);
    const returnDepth = S.run.active ? activeDepth : defaultRunStartDepth(S);
    const lastRunText = S.run.active ? `Current descent: ${depthWithRawLabel(activeDepth)}` : latestRunSummary(S);
    const title = S.run.active ? 'Descent In Progress' : 'Hollow Stair Threshold';
    const subtitle = S.player.runHistory.length || S.player.depth > 0
      ? stagingDistrict.line
      : 'The Hollow Stair descends below Emberfall. Only debt is free here.';
    const kicker = S.run.active ? 'Active Descent' : 'Returning Players';
    const actionId = S.run.active ? 'introModalContinueRunBtn' : 'introModalEnterDungeonBtn';
    const action = S.run.active
      ? `<button class="primary mini threshold-enter" id="${actionId}">Continue Run</button>`
      : `<button class="primary mini threshold-enter" id="${actionId}">Enter Dungeon</button>`;
    const closeAction = '<button class="ghost mini threshold-close" id="introModalCloseBtn">Close</button>';

    return `
      <div class="threshold-hero ${districtToneClass(stagingDistrict)}">
        <div class="threshold-veil" aria-hidden="true"></div>
        <div class="intro-head threshold-head">
          <div>
            <span class="threshold-kicker">${escapeHtml(kicker)}</span>
            <h2>${title}</h2>
            <p class="threshold-copy">${escapeHtml(subtitle)}</p>
          </div>
          <div class="intro-actions threshold-actions">${action}${closeAction}</div>
        </div>
        <div class="threshold-district-card">
          <div>
            <span class="threshold-label">Current District</span>
            <strong>${escapeHtml(stagingDistrict.name)}</strong>
          </div>
          <span class="pill threshold-pill">${escapeHtml(depthShortLabel(returnDepth))}</span>
        </div>
        <div class="threshold-progress" aria-label="Hollow Stair progress">
          <div class="split threshold-progress-head">
            <span>${escapeHtml(floorNumberLabel(activeDepth))} • Room ${format(activeDepthMeta.room)}/${format(DEPTH_ROOMS_PER_FLOOR)}</span>
            <b>${activeDepthMeta.chapterPct.toFixed(0)}% through room</b>
          </div>
          <div class="depth-meter threshold-meter"><div style="width:${activeDepthMeta.chapterPct.toFixed(1)}%"></div></div>
        </div>
        ${introRoadmapMarkup()}
        <div class="threshold-footer">
          <span>${escapeHtml(lastRunText)}</span>
          <span>${formatMoney(S.player.gold)} / Ember ${format(S.player.ember)}</span>
        </div>
      </div>`;
  }

  function renderIntroModal() {
    const content = el('introModalContent');
    if (!content) return;
    // TODO(v1.7): Let earlier district revisits surface here without changing the current single-run entry flow.
    content.innerHTML = introProgressMarkup();
  }

  function hideIntroModal() {
    const modal = el('introModal');
    if (!modal) return;
    modal.hidden = true;
  }

  let introModalFallbackSeen = false;
  function shouldShowIntroModal() {
    try {
      if (sessionStorage.getItem(INTRO_MODAL_SESSION_KEY)) return false;
      sessionStorage.setItem(INTRO_MODAL_SESSION_KEY, '1');
      return true;
    } catch (err) {
      if (introModalFallbackSeen) return false;
      introModalFallbackSeen = true;
      return true;
    }
  }

  function showIntroModalOnce() {
    const modal = el('introModal');
    if (!modal || !shouldShowIntroModal()) return;
    renderIntroModal();
    modal.hidden = false;
    bindIntroModalActions();
  }
