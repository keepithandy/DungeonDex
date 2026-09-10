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
    $$('[data-clear-gear-filters]').forEach(btn => btn.onclick = () => {
      S.filters = { slot:'all', rarity:'all', sort:'power', search:'' };
      render();
      el('searchFilter')?.focus();
    });
    $$('[data-gear-flag]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      const id = btn.dataset.gearId;
      const flag = btn.dataset.gearFlag;
      toggleInventoryFlag(S, id, flag);
      render();
      $$('[data-gear-flag]').find(node => node.dataset.gearId === id && node.dataset.gearFlag === flag)?.focus();
    }));
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
      const preview = bulkSalePreview(S, true);
      if (!preview.count || !window.confirm(bulkSaleConfirmation(preview, true))) return;
      const result = sellAllQuickSafeGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });

    const sellAllBtn = el('sellAllGearBtn');
    if (sellAllBtn) sellAllBtn.onclick = () => runGuardedAction(() => {
      const preview = bulkSalePreview(S);
      const count = preview.count;
      if (!count) return;
      const confirmed = window.confirm(bulkSaleConfirmation(preview));
      if (!confirmed) return;
      const result = sellAllGear(S);
      if (result.paid) showGoldPopup(result.paid);
      render();
    });
  }

  function bulkSaleConfirmation(preview, junkOnly = false) {
    return `Sell ${junkOnly ? 'Junk: ' : 'ALL: '}${preview.count} items for ${stripHtml(formatMoney(preview.paid))}? This covers the entire inventory, including items hidden by filters. ${preview.protectedCount} protected items stay, including saved-loadout gear. This cannot be undone.`;
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

    const runCombatAction = (btn, action, forceSave = false) => {
      if (!hasActiveCombat(S) || !CORE_COMBAT_ACTIONS.includes(action)) return;
      btn.classList.add('tap-now');
      window.setTimeout(() => btn.classList.remove('tap-now'), 90);
      runCombatGuardedAction(() => {
        const result = combatAction(S, action) || {};
        if (result.fullRender || !S.run.active) {
          render();
        } else {
          renderCombatTick(forceSave || !!result.saveNow);
        }
      });
    };

    $$('[data-action]').forEach(btn => {
      if (btn.dataset.action === 'skill') return;
      const handler = (e) => {
        if (e) e.preventDefault();
        runCombatAction(btn, btn.dataset.action);
      };
      const canAct = hasActiveCombat(S) && CORE_COMBAT_ACTIONS.includes(btn.dataset.action);
      btn.disabled = !canAct;
      btn.onclick = (e) => {
        if (e && e.detail !== 0) return;
        handler(e);
      };
      btn.onpointerdown = handler;
    });

    const spellButton = document.querySelector('[data-spell-button]');
    const spellMenu = el('combatSpellMenu');
    const spellOptions = $$('[data-spell-select]');
    if (!spellButton || !spellMenu) return;

    let spellHoldTimer = 0;
    let spellMenuOpened = false;
    const clearSpellHold = () => {
      if (!spellHoldTimer) return;
      window.clearTimeout(spellHoldTimer);
      spellHoldTimer = 0;
    };
    const closeSpellMenu = () => {
      clearSpellHold();
      spellMenu.hidden = true;
      spellMenuOpened = false;
      spellButton.setAttribute('aria-expanded', 'false');
    };
    const openSpellMenu = () => {
      if (!hasActiveCombat(S)) return;
      clearSpellHold();
      spellMenu.hidden = false;
      spellMenuOpened = true;
      spellButton.setAttribute('aria-expanded', 'true');
    };
    const castSelectedSpell = () => {
      closeSpellMenu();
      runCombatAction(spellButton, 'skill');
    };
    const releaseSpellPointer = event => {
      if (event?.pointerId != null && spellButton.hasPointerCapture?.(event.pointerId)) {
        try { spellButton.releasePointerCapture(event.pointerId); } catch (_) {}
      }
    };

    spellButton.disabled = !hasActiveCombat(S);
    spellButton.onpointerdown = event => {
      if (event?.button != null && event.button !== 0) return;
      if (!hasActiveCombat(S)) return;
      event?.preventDefault();
      spellMenuOpened = false;
      if (event?.pointerId != null) {
        try { spellButton.setPointerCapture(event.pointerId); } catch (_) {}
      }
      clearSpellHold();
      spellHoldTimer = window.setTimeout(openSpellMenu, COMBAT_SPELL_HOLD_MS);
    };
    spellButton.onpointerup = event => {
      if (!hasActiveCombat(S)) return;
      event?.preventDefault();
      releaseSpellPointer(event);
      const wasTap = !!spellHoldTimer;
      clearSpellHold();
      if (wasTap && !spellMenuOpened) castSelectedSpell();
    };
    spellButton.onpointercancel = event => {
      event?.preventDefault();
      releaseSpellPointer(event);
      clearSpellHold();
    };
    spellButton.onclick = event => {
      if (event && event.detail !== 0) return;
      event?.preventDefault();
      castSelectedSpell();
    };
    spellButton.onkeydown = event => {
      if (event.key === 'ArrowDown' || event.key === 'F4') {
        event.preventDefault();
        openSpellMenu();
        spellOptions.find(option => !option.disabled)?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeSpellMenu();
      }
    };
    spellOptions.forEach(option => {
      option.onclick = event => {
        event.preventDefault();
        if (option.disabled) return;
        const choice = selectCombatSpell(S, option.dataset.spellSelect);
        if (!choice.ok) return;
        closeSpellMenu();
        runCombatAction(spellButton, 'skill', true);
      };
      option.onkeydown = event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        closeSpellMenu();
        spellButton.focus();
      };
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
    $$('[data-town-route]').forEach(btn => btn.onclick = () => {
      const route = String(btn.dataset.townRoute || '').trim();
      if (!['gear', 'archive'].includes(route)) return;
      switchScreen(route);
      const screen = el(`screen-${route}`);
      const target = screen?.querySelector('button:not([disabled]), [role="button"], [tabindex]:not([tabindex="-1"])');
      try { target?.focus({ preventScroll: true }); } catch (_) { target?.focus?.(); }
    });
    $$('[data-buy]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyMerchantItem(S, btn.dataset.buy); render(); }));
    $$('[data-merchant-upgrade]').forEach(btn => btn.onclick = () => runGuardedAction(() => { buyMerchantGearUpgrade(S, btn.dataset.merchantUpgrade); render(); }));
    $$('[data-spell-inscribe]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      const [spellId, inscriptionId] = String(btn.dataset.spellInscribe || '').split(':');
      if (window.DungeonDexSpellMastery?.chooseInscription(S, spellId, inscriptionId)?.ok) render();
    }));
    $$('[data-spell-master]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (window.DungeonDexSpellMastery?.masterInscription(S, btn.dataset.spellMaster)?.ok) render();
    }));
    $$('[data-spell-respec]').forEach(btn => btn.onclick = () => runGuardedAction(() => {
      if (window.DungeonDexSpellMastery?.respecSpell(S, btn.dataset.spellRespec)?.ok) render();
    }));
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
    bindSaveTransferActions();
  }

  function bindSaveTransferActions() {
    const report = message => { saveTransferNotice = message; render(); };
    const exportButton = el('exportSaveBtn');
    if (exportButton) exportButton.onclick = () => {
      try {
        const raw = saveRecovery.blocked ? (saveRecovery.raw ?? localStorage.getItem(STORAGE_KEY)) : JSON.stringify(S);
        if (raw == null) return report('No saved data is available to export.');
        downloadSaveText(raw, saveRecovery.blocked ? 'DungeonDex-recovery.json' : 'DungeonDex-save.json');
        report('Download requested. Keep the file somewhere safe.');
      } catch (_) { report('Could not export the save. Your current progress was not replaced.'); }
    };
    const previousButton = el('exportPreviousSaveBtn');
    if (previousButton) previousButton.onclick = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_before_import');
        if (raw == null) return report('No previous save backup is available.');
        downloadSaveText(raw, 'DungeonDex-previous-save.json');
      } catch (_) { report('Could not read the previous backup.'); }
    };
    const originalButton = el('exportRecoverySaveBtn');
    if (originalButton) originalButton.onclick = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_recovery');
        if (raw == null) return report('No recovery original is available.');
        downloadSaveText(raw, 'DungeonDex-recovery-original.json');
      } catch (_) { report('Could not read the recovery original.'); }
    };
    const input = el('importSaveInput');
    if (input) input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('Choose a save smaller than 10 MB.');
        const candidate = prepareSaveImport(await file.text());
        const summary = `Level ${candidate.player.level} • ${candidate.player.inventory.length} inventory items • ${candidate.run.active ? 'active descent' : 'in town'}`;
        if (!window.confirm(`Import this save? ${summary}. This replaces current progress. A copy of the previous save will be retained in this browser.`)) { input.value = ''; return; }
        const result = replaceSavedState(candidate, S);
        if (!result.ok) return report('Import failed: browser storage could not preserve and replace the save. Current progress is unchanged.');
        S = result.state;
        report('Save imported. Export Previous Backup retrieves the save kept before replacement.');
      } catch (err) { report(`Import failed: ${err.message || 'invalid save file'}. Current progress is unchanged.`); }
    };
    const recoveryButton = el('startFreshSaveBtn');
    if (recoveryButton) recoveryButton.onclick = () => {
      if (!window.confirm('Start a fresh game? The unreadable save will be retained as a recovery backup in this browser. Export it first to keep a separate copy.')) return;
      const result = replaceSavedState(createBaseState(), S);
      if (!result.ok) return report('Could not preserve the original save. Recovery remains paused.');
      S = result.state;
      report('Fresh game started. The original is available through Export Recovery Original.');
    };
  }

  function clearCacheAndReload() {
    const btn = el('clearCacheReloadBtn');
    if (btn) btn.disabled = true;
    if (window.DungeonDexBootHealth?.clearScopedCachesAndReload) {
      window.DungeonDexBootHealth.clearScopedCachesAndReload();
      return;
    }
    window.location.reload();
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
  if (window.DungeonDexBootHealth?.markReady) window.DungeonDexBootHealth.markReady();
  showIntroModalOnce();
