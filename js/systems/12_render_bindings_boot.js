'use strict';

// Sticky bar, render loop, guarded actions, bindings, audits, boot
  function renderStickyBar() {
    const bar = el('stickyBar');
    if (!bar) return;
    bar.classList.remove('context-actions');
    bar.style.display = 'none';
    bar.innerHTML = '';
  }

  function syncScreenState() {
    const shell = document.querySelector('.app-shell');
    const activeDistrict = currentStagingDistrict(S);
    if (shell) {
      Array.from(shell.classList).filter(cls => cls.startsWith('district-tone-')).forEach(cls => shell.classList.remove(cls));
      shell.classList.add(districtToneClass(activeDistrict));
      shell.classList.toggle('run-focus', S.screen === 'run');
      shell.classList.toggle('combat-active', S.screen === 'run' && S.run.active);
    }
    $$('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${S.screen}`));
    $$('.tab').forEach(node => {
      const isActive = node.dataset.screen === S.screen;
      node.classList.toggle('active', isActive);
      if (isActive) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
  }

  function render() {
    try {
      syncScreenState();
      renderStatBoxes();
      renderTown();
      renderRun();
      renderGear();
      renderDex();
      renderArchive();
      renderStickyBar();
      syncScreenState();
    } catch (err) {
      console.warn('DungeonDex render error (partial):', err);
    }
    updateSaveStatus(save(S));
    try { bindDynamic(); } catch(err) { console.warn('DungeonDex bindDynamic error:', err); }
  }

  let lastCombatAutosaveAt = 0;
  function maybeSaveCombat(force = false) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (!force && now - lastCombatAutosaveAt < COMBAT_AUTOSAVE_MS) return;
    lastCombatAutosaveAt = now;
    updateSaveStatus(save(S));
  }

  function renderCombatTick(forceSave = false) {
    if (!S.run.active) {
      render();
      return;
    }
    try {
      syncScreenState();
      renderRun();
      renderStickyBar();
    } catch (err) {
      console.warn('DungeonDex combat render error:', err);
    }
    maybeSaveCombat(forceSave);
    try { bindCombatActions(); } catch(err) { console.warn('DungeonDex combat bind error:', err); }
  }

  function refreshInventoryOnly() {
    renderInventoryPanel();
    updateSaveStatus(save(S));
    bindInventoryActions();
  }

  let actionGuardUntil = 0;
  let combatActionGuardUntil = 0;
  let combatActionInFlight = false;
  function runGuardedAction(fn) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (now < actionGuardUntil) return;
    actionGuardUntil = now + ACTION_GUARD_MS;
    try {
      fn();
    } catch (err) {
      console.warn('DungeonDex guarded action skipped after an error:', err);
      updateSaveStatus(save(S));
    }
  }

  function runCombatGuardedAction(fn) {
    const now = globalThis.performance && typeof globalThis.performance.now === 'function'
      ? globalThis.performance.now()
      : Date.now();
    if (combatActionInFlight || now < combatActionGuardUntil) return;
    combatActionGuardUntil = now + COMBAT_ACTION_GUARD_MS;
    combatActionInFlight = true;
    try {
      fn();
    } catch (err) {
      console.warn('DungeonDex combat action skipped after an error:', err);
      maybeSaveCombat(true);
    } finally {
      combatActionInFlight = false;
    }
  }

  function bindInventoryActions() {
    $$('[data-equip]').forEach(btn => btn.onclick = () => runGuardedAction(() => { equipItem(S, btn.dataset.equip); render(); }));
    $$('[data-sell]').forEach(btn => btn.onclick = () => runGuardedAction(() => { const paid = sellItem(S, btn.dataset.sell); if (paid) showGoldPopup(paid); render(); }));
    $$('[data-retire]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      const itemId = String(btn.dataset.retire || '').trim();
      const item = asArray(S.player?.inventory, []).find(entry => entry && String(entry.id || '').trim() === itemId);
      if (!item || !canRetireInventoryItem(S, item)) return;
      const itemName = cleanDisplayText(item.name || 'Unknown relic', 'Unknown relic');
      const rarity = cleanDisplayText(item.rarity || 'common', 'common');
      const slot = cleanDisplayText(item.slot || 'gear', 'gear');
      const confirmText = `Retire ${itemName} (${rarity} ${slot}) into the Archive?\nThis removes it from inventory and preserves it as a record.`;
      if (!window.confirm(confirmText)) return;
      const result = retireInventoryItem(S, itemId);
      if (!result.ok) {
        console.warn('DungeonDex retire action skipped:', result.reason);
        render();
        return;
      }
      render();
    }));
    const sellJunkBtn = el('sellJunkGearBtn');
    if (sellJunkBtn) sellJunkBtn.onclick = () => runGuardedAction(() => {
      const result = sellAllQuickSafeGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });

    const sellAllBtn = el('sellAllGearBtn');
    if (sellAllBtn) sellAllBtn.onclick = () => runGuardedAction(() => {
      const count = S.player.inventory.filter(item => canSellAllGearItem(S, item)).length;
      if (!count) return;
      const confirmed = window.confirm(`Sell ALL ${count} unequipped sellable gear items? This cannot be undone. Equipped, protected, favorite, locked, and special items will stay.`);
      if (!confirmed) return;
      const result = sellAllGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });
  }

  function bindCombatActions() {
    $$('[data-run-event]').forEach(btn => {
      const handler = (e) => {
        if (e) e.preventDefault();
        if (!S.run?.event) return;
        btn.classList.add('tap-now');
        window.setTimeout(() => btn.classList.remove('tap-now'), 90);
        runCombatGuardedAction(() => {
          const result = resolveRunEvent(S, btn.dataset.runEvent) || {};
          if (result.fullRender || !S.run.active) render();
          else renderCombatTick(!!result.saveNow);
        });
      };
      btn.disabled = !S.run?.event;
      btn.onclick = (e) => { if (e && e.detail !== 0) return; handler(e); };
      btn.onpointerdown = handler;
    });

    $$('[data-action]').forEach(btn => {
      const handler = (e) => {
        if (e) e.preventDefault();
        const action = btn.dataset.action;
        if (!hasActiveCombat(S) || !CORE_COMBAT_ACTIONS.includes(action)) return;
        btn.classList.add('tap-now');
        window.setTimeout(() => btn.classList.remove('tap-now'), 90);
        runCombatGuardedAction(() => {
          const result = combatAction(S, action) || {};
          if (result.fullRender || !S.run.active) {
            render();
          } else {
            renderCombatTick(!!result.saveNow);
          }
        });
      };
      const canAct = hasActiveCombat(S) && CORE_COMBAT_ACTIONS.includes(btn.dataset.action);
      btn.disabled = !canAct;
      btn.onclick = (e) => {
        if (e && e.detail !== 0) return;
        handler(e);
      };
      btn.onpointerdown = handler;
    });
  }

  function bindIntroModalActions() {
    function focusRunSurface() {
      const screen = el('screen-run');
      if (!screen) return;
      const target = screen.querySelector('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || screen;
      if (target === screen && !screen.hasAttribute('tabindex')) screen.setAttribute('tabindex', '-1');
      try {
        target.focus({ preventScroll: true });
      } catch (_) {
        target.focus?.();
      }
    }

    function focusTownFallback() {
      const target = document.querySelector('.tab.active') || el('startRunBtn');
      try {
        target?.focus({ preventScroll: true });
      } catch (_) {
        target?.focus?.();
      }
    }

    if (el('introModalCloseBtn')) el('introModalCloseBtn').onclick = hideIntroModal;
    if (el('introModalEnterDungeonBtn')) {
      el('introModalEnterDungeonBtn').onclick = () => runGuardedAction(() => {
        hideIntroModal({ restoreFocus: false });
        startRun(S);
        render();
        focusRunSurface();
      });
    }
    if (el('introModalContinueRunBtn')) {
      el('introModalContinueRunBtn').onclick = () => runGuardedAction(() => {
        hideIntroModal({ restoreFocus: false });
        if (continueRun(S)) {
          switchScreen('run');
          focusRunSurface();
        } else {
          render();
          focusTownFallback();
        }
      });
    }
    $$('[data-charter-start]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      hideIntroModal({ restoreFocus: false });
      startCharterRun(S, btn.dataset.charterStart);
      render();
      focusRunSurface();
    }));
  }

  function bindDynamic() {
    $$('[data-buy]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyMerchantItem(S, btn.dataset.buy); render(); }));
    $$('[data-merchant-upgrade]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyMerchantGearUpgrade(S, btn.dataset.merchantUpgrade); render(); }));
    $$('[data-buy-district]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyDistrictWare(S, btn.dataset.buyDistrict); render(); }));
    $$('[data-start-contract]').forEach(btn => btn.onclick = () => runGuardedAction(() => { startEliteContract(S, btn.dataset.startContract); render(); }));
    $$('[data-start-revisit]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (typeof startRevisitRoute !== 'function') return;
      startRevisitRoute(S, btn.dataset.startRevisit);
      render();
    }));
    $$('[data-complete-trophy-echo]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (typeof completeTrophyEchoRoute !== 'function') return;
      completeTrophyEchoRoute(S);
      render();
    }));
    $$('[data-complete-famous-gear]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (typeof completeFamousGearRoute !== 'function') return;
      completeFamousGearRoute(S);
      render();
    }));
    $$('[data-complete-board-echo]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (typeof completeBoardEchoRoute !== 'function') return;
      completeBoardEchoRoute(S);
      render();
    }));
    $$('[data-complete-rival-trace]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (typeof completeRivalTraceRoute !== 'function') return;
      completeRivalTraceRoute(S);
      render();
    }));
    bindInventoryActions();
    bindCombatActions();
    if (el('refreshMerchantBtn')) el('refreshMerchantBtn').onclick = () => runGuardedAction(() => { rollMerchant(S); render(); });
    if (el('forgeBtn')) el('forgeBtn').onclick = () => runGuardedAction(() => { forgeItem(S); render(); });
    if (el('claimEliteContractBtn')) el('claimEliteContractBtn').onclick = () => runGuardedAction(() => {
      const claimBtn = el('claimEliteContractBtn');
      if (claimBtn) claimBtn.disabled = true;
      const claimed = claimEliteContract(S);
      if (!claimed && claimBtn) claimBtn.disabled = false;
      render();
    });
    if (el('slotFilter')) el('slotFilter').onchange = (e) => { S.filters.slot = e.target.value; render(); };
    if (el('rarityFilter')) el('rarityFilter').onchange = (e) => { S.filters.rarity = e.target.value; render(); };
    if (el('sortFilter')) el('sortFilter').onchange = (e) => { S.filters.sort = e.target.value; render(); };
    if (el('searchFilter')) el('searchFilter').oninput = (e) => { S.filters.search = e.target.value; refreshInventoryOnly(); };
    $$('[data-charter-start]').forEach(btn => btn.onclick = () => runGuardedAction(() => { startCharterRun(S, btn.dataset.charterStart); render(); }));
    if (el('runFromIdleBtn')) el('runFromIdleBtn').onclick = () => runGuardedAction(() => { startRun(S); render(); });
    if (el('clearCacheReloadBtn')) el('clearCacheReloadBtn').onclick = clearCacheAndReload;
  }

  function clearCacheAndReload() {
    const tasks = [];
    const reload = () => window.location.reload();
    const btn = el('clearCacheReloadBtn');
    if (btn) btn.disabled = true;
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      tasks.push(navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister()))));
    }
    if (window.caches && window.caches.keys) {
      tasks.push(window.caches.keys()
        .then(keys => Promise.all(keys.map(key => window.caches.delete(key)))));
    }
    if (!tasks.length) {
      reload();
      return;
    }
    Promise.allSettled(tasks).finally(reload);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch]));
  }

  function checkpointAuditRow(label, safeDepth, returnDepth, endedDepth, reason = 'defeat', ownedCharters = []) {
    const mock = {
      player: {
        safeExtractDepth: progressDepthValue(safeDepth, 1),
        returnDepth: progressDepthValue(returnDepth, safeDepth || 1),
        permanentStartFloor: 1,
        deepStairCharters: normalizeCharterDepthList(ownedCharters),
        goldSink: createGoldSinkState()
      },
      run: {
        active: true,
        floor: progressDepthValue(endedDepth, returnDepth || safeDepth || 1),
        zone: zoneName(progressDepthValue(endedDepth, 1))
      }
    };
    const unlocked = getUnlockedCharterDepth(mock);
    const nextReturn = reason === 'extract'
      ? progressDepthValue(endedDepth, 1)
      : hardcoreDeathCheckpointDepth(mock, endedDepth);
    mock.run.active = false;
    mock.player.returnDepth = nextReturn;
    return {
      case: label,
      reason,
      endedDepth: progressDepthValue(endedDepth, 1),
      safeDepth: mock.player.safeExtractDepth,
      unlockedCharter: unlocked || 0,
      nextReturnDepth: nextReturn,
      nextStart: defaultRunStartDepth(mock),
      nextDistrict: districtByDepth(nextReturn).name,
      checkpointLabel: hardcoreDepthReturnLabel(nextReturn),
      note: reason === 'extract'
        ? 'extract keeps earned return depth'
        : 'death resets normal start; owned charters stay available'
    };
  }

  function runCheckpointCharterAudit() {
    const rows = [
      checkpointAuditRow('fresh death before first charter', 1, 1, 12, 'defeat'),
      checkpointAuditRow('extract before first charter', 1, 1, 37, 'extract'),
      checkpointAuditRow('death after D72 safe progress', 72, 72, 75, 'defeat'),
      checkpointAuditRow('extract at D121', 80, 80, 121, 'extract'),
      checkpointAuditRow('death after D121 safe progress', 121, 121, 128, 'defeat'),
      checkpointAuditRow('death after D805 safe progress', 805, 805, 820, 'defeat'),
      checkpointAuditRow('extract at D4000', 805, 805, 4000, 'extract'),
      checkpointAuditRow('death before first mega-charter', 4000, 4000, 4100, 'defeat'),
      checkpointAuditRow('death after D5800 mega-charter', 5800, 5800, 6110, 'defeat')
    ];
    console.info('DungeonDex checkpoint/charter QA: extraction keeps the earned return depth; death resets normal descent to Lowfire while Deep Stair Charters stay available. Use these rows to verify return flow without mutating your save.');
    console.table(rows);
    return rows;
  }

  if (typeof window !== 'undefined') {
    window.DungeonDexBalanceAudit = runDeepScalingAudit;
    window.DungeonDexCheckpointAudit = runCheckpointCharterAudit;
  }

  function bindStatic() {
    $$('.tab').forEach(btn => btn.addEventListener('click', () => switchScreen(btn.dataset.screen)));
    const startRunBtn = el('startRunBtn');
    if (startRunBtn) startRunBtn.onclick = () => runGuardedAction(() => {
      if (S.run?.active) {
        if (continueRun(S)) switchScreen('run');
        else render();
        return;
      }
      startRun(S);
      render();
    });
    const restBtn = el('restBtn');
    if (restBtn) restBtn.onclick = () => runGuardedAction(() => { restPlayer(S); render(); });
    const saveBtn = el('saveBtn');
    if (saveBtn) saveBtn.onclick = () => { pushLog(S, save(S) ? 'Manual save written.' : 'Manual save failed; browser storage is unavailable.'); render(); };
    const resetBtn = el('resetBtn');
    if (resetBtn) resetBtn.onclick = () => {
      if (!confirm('Reset all progress?')) return;
      S = createBaseState();
      render();
    };
  }

  bindStatic();
  render();
  showIntroModalOnce();


// v1.4.2 Sootveil Mythic Set Pass
window.DD_MONSTER_ARCHETYPES = [
  "Brute","Ritualist","Skulker","Ashbound",
  "Mireborn","Furnace Spawn","Hollowed","Warden"
];

window.ddGetMonsterCue = function(name){
  const cues = [
    "The creature watches silently.",
    "Ash drifts from the enemy's armor.",
    "A hostile presence fills the chamber.",
    "The monster prepares to strike."
  ];
  return cues[Math.floor(Math.random()*cues.length)];
};
