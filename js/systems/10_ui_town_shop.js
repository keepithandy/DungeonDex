'use strict';

// Elite contract board, town panels, district wares, shop cards
  // Read-only town panel: this is a design lock surface, not route selection or travel.
  function earlierDungeonRevisitMarkup(state) {
    const rawHooks = typeof revisitCandidateHooks === 'function' ? revisitCandidateHooks(state) : [];
    const rawRoutes = typeof revisitRoutePreviews === 'function' ? revisitRoutePreviews(state) : [];
    const rawGates = typeof revisitUnlockGates === 'function' ? revisitUnlockGates(state) : [];
    const rawPreviews = typeof revisitUnlockPreview === 'function' ? revisitUnlockPreview(state) : [];
    const hooks = Array.isArray(rawHooks) ? rawHooks.filter(hook => hook && typeof hook === 'object') : [];
    const routes = Array.isArray(rawRoutes) ? rawRoutes.filter(route => route && typeof route === 'object') : [];
    const gates = Array.isArray(rawGates) ? rawGates.filter(gate => gate && typeof gate === 'object') : [];
    const previews = Array.isArray(rawPreviews) ? rawPreviews.filter(preview => preview && typeof preview === 'object') : [];
    const gatesByKey = new Map(gates.map(gate => [String(gate.key || ''), gate]));
    const previewsByKey = new Map(previews.map(preview => [String(preview.key || ''), preview]));
    const status = state?.player?.revisitState?.unlocked ? 'Planned Preview' : 'Locked Preview';
    const viewed = String(state?.player?.revisitState?.lastViewedAt || '').trim();
    const noted = Array.isArray(state?.player?.revisitState?.notedDistricts) ? state.player.revisitState.notedDistricts.slice(0, 3) : [];
    const notes = noted.length ? escapeHtml(noted.join(' • ')) : 'No districts noted yet.';
    const body = hooks.length
      ? hooks.slice(0, 5).map(hook => {
          const label = String(hook.label || '').trim() || 'Unknown Hook';
          const detail = String(hook.detail || '').trim() || 'No details';
          const source = String(hook.source || '').trim() || 'Unknown source';
          return `<div class="revisit-candidate-row">
            <div class="split revisit-candidate-head">
              <strong>${escapeHtml(label)}</strong>
              <span class="pill revisit-candidate-state">${hook.locked ? 'Locked Preview' : 'Planned Preview'}</span>
            </div>
            <div class="small muted revisit-candidate-detail">${escapeHtml(detail)}</div>
            <div class="small muted revisit-candidate-source">Echo source: ${escapeHtml(source)}</div>
          </div>`;
        }).join('')
      : `<div class="small muted revisit-empty-state">No return routes are marked yet. Deeper runs will leave better traces.</div>`;
    const routeBody = routes.length
      ? routes.slice(0, 3).map(route => {
          const hookLabels = Array.isArray(route.hooks) ? route.hooks.filter(Boolean).join(' • ') : '';
          const criteria = Array.isArray(route.criteria) ? route.criteria.filter(Boolean).slice(0, 2) : [];
          const criteriaNote = String(route.criteriaNote || '').trim();
          const gate = gatesByKey.get(String(route.key || '')) || {};
          const preview = previewsByKey.get(String(route.key || '')) || {};
          const previewLabel = String(preview.previewLabel || gate.previewLabel || 'Still locked').trim();
          const previewReason = String(preview.previewReason || gate.previewReason || 'Future route history may shape this path later.').trim();
          const previewRequirement = String(preview.previewRequirement || gate.previewRequirement || 'Build more dungeon history.').trim();
          const previewSafety = String(preview.previewSafety || gate.previewSafety || 'Preview only - route access is unavailable.').trim();
          const gateReason = String(gate.reason || 'Locked: Revisit gate not ready').trim();
          const gateRequirement = String(gate.requirement || 'Build more town and dungeon history.').trim();
          const gateSource = String(gate.source || hookLabels || 'Unknown').trim();
          const signal = String(gate.progressLabel || route.readiness || 'No signal yet').trim();
          const diagnosticLabel = String(gate.diagnosticLabel || 'Gate Diagnostics').trim();
          const diagnosticDetail = String(gate.diagnosticDetail || 'Diagnostic only - future unlock rule inactive.').trim();
          const accessLabel = String(gate.accessLabel || 'Route access is unavailable.').trim();
          const progressCurrent = Math.max(0, Math.floor(Number(gate.progressCurrent || 0)));
          const progressRequired = Math.max(1, Math.floor(Number(gate.progressRequired || 1)));
          const progressPercent = Math.max(0, Math.min(100, Math.floor(Number(gate.progressPercent || 0))));
          const criteriaBody = criteria.length
            ? criteria.map(text => `<div class="small muted revisit-route-criteria-item">${escapeHtml(text)}</div>`).join('')
            : `<div class="small muted revisit-route-criteria-item">Future condition only.</div>`;
          return `<div class="revisit-route-card">
            <div class="split revisit-route-head">
              <strong>${escapeHtml(route.title || 'Planned Route')}</strong>
              <span class="pill revisit-route-pill">${escapeHtml(previewLabel || 'Still locked')}</span>
            </div>
            <div class="small muted revisit-route-district">${escapeHtml(route.district || 'Earlier district band')}</div>
            <div class="split revisit-route-readiness-head">
              <span class="pill revisit-route-readiness-pill">${escapeHtml(previewLabel || 'Still locked')}</span>
              <span class="small muted">Signal: ${escapeHtml(signal || 'Still locked')}</span>
            </div>
            <div class="small muted revisit-route-reason">${escapeHtml(previewReason || 'Future route history may shape this path later.')}</div>
            <div class="revisit-route-criteria-list">${criteriaBody}</div>
            ${criteriaNote ? `<div class="small muted revisit-route-criteria-note">${escapeHtml(criteriaNote)}</div>` : ''}
            <div class="small muted revisit-route-diagnostic-label">${escapeHtml(diagnosticLabel)}</div>
            <div class="small muted revisit-route-diagnostic-detail">${escapeHtml(diagnosticDetail)}</div>
            <div class="small muted revisit-route-progress">Progress: ${escapeHtml(String(progressCurrent))} / ${escapeHtml(String(progressRequired))} · ${escapeHtml(signal || 'No signal yet')} (${escapeHtml(String(progressPercent))}%)</div>
            <div class="split revisit-route-meta">
              <span class="small muted"><strong>Requirement:</strong> ${escapeHtml(previewRequirement || 'Build more dungeon history.')}</span>
              <span class="small muted"><strong>Safety:</strong> ${escapeHtml(previewSafety || 'Preview only - route access is unavailable.')}</span>
            </div>
            <div class="revisit-route-gate">
              <div class="split revisit-route-gate-head">
                <span class="pill revisit-route-gate-pill">Locked Foundation</span>
                <span class="small muted">Future Conditions</span>
              </div>
              <div class="small muted revisit-route-gate-reason">${escapeHtml(gateReason)}</div>
              <div class="small muted revisit-route-gate-requirement"><strong>Requirement:</strong> ${escapeHtml(gateRequirement)}</div>
              <div class="small muted revisit-route-gate-status"><strong>Signal:</strong> ${escapeHtml(signal || 'No signal yet')}</div>
              <div class="small muted revisit-route-gate-access"><strong>Access:</strong> ${escapeHtml(accessLabel)}</div>
              <div class="small muted revisit-route-gate-source"><strong>Source:</strong> ${escapeHtml(gateSource)}</div>
            </div>
            <div class="revisit-route-meta small muted">
              <span>Diagnostic only</span>
              <span>Future rule inactive</span>
              <span>Route access is unavailable.</span>
            </div>
            <div class="small muted revisit-route-hooks"><strong>Source:</strong> ${escapeHtml(hookLabels || 'Unknown')}</div>
          </div>`;
        }).join('')
      : `<div class="small muted revisit-empty-state">No route previews are ready yet. More trophies, rivals, debt, or archive memories will mark future roads.</div>`;
    return `<div class="district-wallet-card revisit-foundation-card" aria-label="Earlier Dungeon Revisit">
      <div class="split revisit-foundation-head"><div><h3>Earlier Dungeon Revisit</h3><p>Old districts are beginning to leave return traces.</p></div><span class="pill">${status}</span></div>
      <div class="small muted">Locked Preview. Preview notes only. Future Conditions. Route access is unavailable.</div>
      <div class="list revisit-hook-list">${body}</div>
      <div class="split revisit-route-headline"><h4>Planned Return Routes</h4><span class="pill">Still locked</span></div>
      <div class="small muted revisit-route-readiness-note">Preview notes only. Future Conditions. Requirement: display only. Safety: display only. Progress: display only. Signal: display only. Route access is unavailable.</div>
      <div class="small muted revisit-route-criteria-note">Future Conditions. Gate Diagnostics. Diagnostic only - future unlock rule inactive.</div>
      <div class="list revisit-route-list">${routeBody}</div>
      <div class="split small muted"><span>Last viewed: ${escapeHtml(viewed || 'Never')}</span><span>${notes}</span></div>
    </div>`;
  }

  function eliteContractBoardMarkup(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;

    if (active) {
      const contract = eliteContractDef(active.id);
      if (!contract) return '';
      const progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)));
      const ready = active.complete || progress >= contract.goal;
      const statusLabel = ready ? 'Ready to Claim' : 'Active';
      const rewardAmount = activeContractRewardAmount(active, contract, state);
      return `<div class="elite-contract-board">
      <div class="elite-contract-head">
        <div><h3>Lowfire Elite Board</h3><p>Take elite marks for clean payout.</p></div>
          <span class="pill ${ready ? 'rarity-rare' : ''}">${statusLabel}</span>
        </div>
        <div class="elite-contract-card ${ready ? 'ready' : 'active'}">
          <div class="split"><strong>Active Hunt: ${escapeHtml(contract.name)}</strong><span class="small muted">${escapeHtml(active.tier || contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Mark:</b> ${escapeHtml(contract.eliteName || active.eliteName || contract.name || '')}</span>
            <span><b>Where:</b> ${escapeHtml(active.targetLocation || `Floor ${active.targetFloor || '?'}`)}</span>
            <span><b>Status:</b> ${ready ? 'Completed' : active.rivalContract ? 'Rival' : active.bonusWritCompleted ? 'Bonus Complete' : active.bonusWritMissed ? 'Bonus Missed' : 'Active'}</span>
            <span><b>Objective:</b> ${escapeHtml(active.contractText || contract.contractText || `Defeat ${contract.eliteName} when it appears.`)}</span>
            <span><b>Bonus Goal:</b> ${escapeHtml(active.bonusWrit || contract.bonusWrit || 'Pending')}</span>
            <span><b>Danger:</b> ${escapeHtml(active.rivalContract ? 'Rival writ' : 'Elite hunt')}</span>
            <span><b>Reward Preview:</b> ${formatMoney(rewardAmount)}</span>
          </div>
          <div class="elite-contract-actions">
            <span class="pill">${ready ? 'Ready to Claim' : 'Payment held'}: ${formatMoney(rewardAmount)}</span>
            ${ready ? '<button class="primary mini" id="claimEliteContractBtn">Claim</button>' : '<span class="small muted">Finish the mark to claim.</span>'}
          </div>
        </div>
      </div>`;
    }

    const available = availableEliteContracts(state);
    const body = available.length
      ? available.map(contract => `<div class="elite-contract-card">
        <div class="split"><strong>${escapeHtml(contract.title || contract.name)}</strong><span class="small muted">${escapeHtml(contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Mark:</b> ${escapeHtml(contract.eliteName || contract.name || '')}</span>
            <span><b>Where:</b> ${escapeHtml(contract.targetLocation || `Floor ${contract.targetFloor || '?'}`)}</span>
            <span><b>Objective:</b> ${escapeHtml(contract.contractText || `Defeat ${contract.eliteName} when it appears.`)}</span>
            <span><b>Bonus Goal:</b> ${escapeHtml(contract.bonusWrit || 'Pending')}</span>
            <span><b>Danger:</b> Elite hunt</span>
            <span><b>Reward Preview:</b> ${formatMoney(calculateContractReward(contract, state))}</span>
          </div>
          <div class="elite-contract-actions">
            <span class="pill">Reward Preview</span>
            <button class="primary mini" data-start-contract="${escapeHtml(contract.id)}">Take Mark</button>
          </div>
        </div>`).join('')
      : '<p class="small muted elite-contract-empty">No paid marks are currently available.</p>';

    return `<div class="elite-contract-board">
      <div class="elite-contract-head">
        <div><h3>Lowfire Elite Board</h3><p>Take marked danger, earn clear payout.</p></div>
        <span class="pill">No Active (${contracts.claimed.length}/${ELITE_CONTRACTS.length})</span>
      </div>
      <div class="elite-contract-list">${body}</div>
    </div>`;
  }


  function districtWalletMarkup(state) {
    const wallet = formatMoney(state.player.gold || 0);
    const pending = state.run?.active ? pendingRunRewardSummary(ensurePendingRunRewards(state)) : '';
    const pendingLine = pending ? `<span class="district-wallet-pending">Held haul: ${pending}</span>` : '<span class="district-wallet-pending muted">No held haul.</span>';
    return `<div class="district-wallet-card" aria-label="Warden currency wallet">
      <div class="district-wallet-head">
        <div>
          <span class="district-wallet-title">Warden's Purse</span>
          <small>Lowfire tender</small>
        </div>
        <strong class="district-wallet-money">${wallet}</strong>
      </div>
      <div class="district-wallet-meta">
        ${pendingLine}
        <span class="district-wallet-extra">Shards ${format(state.player.shards || 0)} • Ember ${format(state.player.ember || 0)}</span>
      </div>
    </div>`;
  }

  function renderTown() {
    const stagingDistrict = currentStagingDistrict(S);
    const stagedStartDepth = defaultRunStartDepth(S);
    const nextDescent = getLoreDepthProgress(stagedStartDepth);
    const questPanel = el('questPanel');
    const merchantPanel = el('merchantPanel');
    const forgePanel = el('forgePanel');
    const districtPanel = el('districtName')?.closest('.panel');
    if (districtPanel) {
      districtPanel.className = `panel section-header district-banner town-district-hub district-charter-hub ${districtToneClass(stagingDistrict)}`;
    }
    if (el('districtName')) el('districtName').textContent = stagingDistrict.name || 'Lowfire District';
    if (el('districtLine')) el('districtLine').innerHTML = `Next descent: ${escapeHtml(`F${format(nextDescent.floorNumber)} • R${format(nextDescent.roomWithinFloor)} • C${format(nextDescent.chapterWithinRoom)}`)}. Lowfire banks the haul and returns you to ${escapeHtml(stagingDistrict.name || 'Lowfire District')}.<br><span class="district-mood">${escapeHtml(stagingDistrict.mood || stagingDistrict.line || '')}</span>`;
    if (el('districtWalletSlot')) el('districtWalletSlot').innerHTML = districtWalletMarkup(S);
    if (el('revisitFoundationSlot')) el('revisitFoundationSlot').innerHTML = earlierDungeonRevisitMarkup(S);
    if (el('startRunBtn')) el('startRunBtn').textContent = S.run.active ? 'Continue Run' : 'Enter Dungeon';
    const restCostNode = el('restCostPill');
    if (restCostNode) {
      const cost = restCost(S);
      const affordable = S.player.gold >= cost;
      restCostNode.innerHTML = `Cost ${formatMoney(cost)}`;
      restCostNode.classList.toggle('rest-cost-low', !affordable);
      restCostNode.title = affordable ? 'Cost to rest and restore HP' : `Need ${cleanDisplayText(formatMoney(cost))} to rest`;
    }
    if (el('districtCharterSlot')) el('districtCharterSlot').innerHTML = deepStairCharterMarkup('hollow');
    if (questPanel) questPanel.innerHTML = `
      <div class="card-head"><div><h2>Lowfire Board</h2><p>Paid marks and objectives.</p></div></div>
      <div class="warden-ledger">
        <div class="split ledger-subhead"><div><strong>Warden Objectives</strong><p class="small">Short orders paid after runs.</p></div><span class="pill">${S.player.quests.filter(q => q.claimed).length}/${S.player.quests.length}</span></div>
      </div>
      <div class="list warden-objective-list">
        ${S.player.quests.map(q => `
          <div class="quest-card warden-objective-card">
            <div class="split"><strong>${q.title}</strong><span class="small muted">${q.progress}/${q.goal}</span></div>
            <p class="small">${q.reward}${q.claimed ? ' - claimed' : ''}</p>
            <div class="xpbar"><div class="xpfill" style="width:${(q.progress/q.goal)*100}%"></div></div>
          </div>`).join('')}
      </div>
      ${eliteContractBoardMarkup(S)}`;

    const districtWares = unlockedDistrictWares(S);
    const activeSinkPills = activeGoldSinkPills(S);
    if (merchantPanel) merchantPanel.innerHTML = `
      <div class="split merchant-head"><div><h2>Lowfire Market</h2><p>Gear and descent support.</p></div><button class="ghost mini refresh-compact" id="refreshMerchantBtn"><span>Refresh Stock</span><strong>${formatMoney(S.town.merchantRefreshCost)}</strong></button></div>
      ${activeSinkPills.length ? `<div class="tag-row market-pills">${activeSinkPills.map(label => `<span class="pill rarity-uncommon">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      <div class="list market-stock-list">${S.merchantStock.map(item => shopCard(item)).join('')}</div>
      <div class="sep"></div>
      <div class="district-market lowfire-wares">
        <div class="split market-subhead"><div><strong>District Wares</strong><p class="small">Support unlocked by your deepest secured floor.</p></div><span class="pill">${districtWares.length}/${DISTRICT_MARKET_WARES.length}</span></div>
        <div class="list district-ware-list">${districtWares.map(ware => districtWareCard(ware)).join('')}</div>
      </div>`;

    if (forgePanel) forgePanel.innerHTML = `
      <div class="card-head"><div><h2>Relic Forge</h2><p>Craft and salvage relic gear.</p></div></div>
      <div class="tag-row"><span class="pill">Forge spark: ${S.player.forgeSpark}</span><span class="pill">Shards: ${S.player.shards}</span></div>
      <div class="sep"></div>
      <button class="primary" id="forgeBtn">Forge Relic (1 spark + 40 shards)</button>
      <div class="sep"></div>
      <p class="small">Every crafted relic rolls at least rare quality.</p>`;
  }

  function districtWareCard(ware) {
    const district = districtForWare(ware);
    const status = goldSinkStatus(S, ware);
    const reason = goldSinkCannotBuyReason(S, ware);
    const disabled = reason ? 'disabled' : '';
    const buttonText = status && ['owned','armed','bounty active','next descent ready'].includes(status) ? status : 'Buy';
    return `<div class="shop-item district-ware rarity-card rarity-card-${ware.rarity}">
      <div class="split"><div><div class="item-name ${rarityClass(ware.rarity)}">${escapeHtml(ware.name)}</div><div class="item-meta">${escapeHtml(district.name)} • unlock ${escapeHtml(charterDepthCompactLabel(ware.unlockFloor))}</div></div><span class="pill ${rarityClass(ware.rarity)}">${escapeHtml(ware.rarity)}</span></div>
      <div class="tag-row"><span class="pill">${merchantCostMarkup(S, ware.cost)}</span>${status ? `<span class="pill rarity-uncommon">${escapeHtml(status)}</span>` : ''}</div>
      <p class="small"><strong>${escapeHtml(ware.effect)}</strong> ${escapeHtml(ware.summary)}</p>
      <div class="item-actions"><button class="primary mini" data-buy-district="${escapeHtml(ware.id)}" ${disabled}>${escapeHtml(buttonText)}</button>${reason && reason !== 'not enough gold' ? `<span class="small muted">${escapeHtml(reason)}</span>` : ''}</div>
    </div>`;
  }

  function shopCard(item) {
    const meta = item.kind === 'special'
      ? `unlocks ${charterDepthCompactLabel(15)} • starts ${charterDepthCompactLabel(20)}`
      : `${item.slot} • ilvl ${item.level} • pwr ${item.rating} • ${item.theme}`;
    const tags = item.kind === 'special'
      ? `<span class="pill">Permanent</span><span class="pill">${merchantCostMarkup(S, item.value)}</span>`
      : `<span class="pill">${merchantCostMarkup(S, item.value)}</span>`;
    return `<div class="shop-item"><div class="split"><div><div class="item-name ${rarityClass(item.rarity)}">${item.name}</div><div class="item-meta">${meta}</div></div><span class="pill ${rarityClass(item.rarity)}">${item.rarity}</span></div><div class="tag-row">${tags}</div><p class="small">${item.summary || ''}</p><div class="item-actions"><button class="primary mini" data-buy="${item.id}">Buy</button></div></div>`;
  }



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
