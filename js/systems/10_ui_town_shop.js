'use strict';

// Elite contract board, town panels, district wares, shop cards
  function eliteContractBoardMarkup(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;

    if (active) {
      const contract = eliteContractDef(active.id);
      if (!contract) return '';
      const progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)));
      const pct = Math.min(100, Math.round((progress / contract.goal) * 100));
      const ready = active.complete || progress >= contract.goal;
      const statusLabel = ready ? 'Ready to Claim' : 'Active';
      const rewardAmount = activeContractRewardAmount(active, contract, state);
      const riskLevel = eliteContractRiskLevel(contract);
      const objective = eliteContractObjective(contract);
      return `<div class="elite-contract-board">
        <div class="elite-contract-head">
          <div><h3>Lowfire Elite Board</h3><p>Clear paid marks for wardens taking extra elite risk.</p></div>
          <span class="pill ${ready ? 'rarity-rare' : ''}">${statusLabel}</span>
        </div>
        <div class="elite-contract-card ${ready ? 'ready' : 'active'}">
          <div class="split"><strong>Active Contract: ${escapeHtml(contract.name)}</strong><span class="small muted">${escapeHtml(active.tier || contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Progress:</b> ${progress} / ${contract.goal} elites defeated</span>
            <span><b>Objective:</b> ${escapeHtml(objective)}</span>
            <span><b>Risk:</b> ${escapeHtml(riskLevel)}</span>
            <span><b>Reward:</b> ${formatMoney(rewardAmount)}</span>
            <span><b>Completion:</b> ${ready ? 'Ready to Claim' : 'In progress'}</span>
          </div>
          <div class="elite-contract-meter"><div style="width:${pct}%"></div></div>
          <div class="elite-contract-actions">
            <span class="pill">${ready ? 'Ready to Claim' : 'Payment held'}: ${formatMoney(rewardAmount)}</span>
            ${ready ? '<button class="primary mini" id="claimEliteContractBtn">Claim Reward</button>' : '<span class="small muted">Finish the elite mark, then claim in Lowfire.</span>'}
          </div>
        </div>
      </div>`;
    }

    const available = availableEliteContracts(state);
    const body = available.length
      ? available.map(contract => `<div class="elite-contract-card">
          <div class="split"><strong>${escapeHtml(contract.name)}</strong><span class="small muted">${escapeHtml(contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Objective:</b> ${escapeHtml(eliteContractObjective(contract))}</span>
            <span><b>Risk:</b> ${escapeHtml(eliteContractRiskLevel(contract))}</span>
            <span><b>Reward:</b> ${formatMoney(calculateContractReward(contract, state))}</span>
          </div>
          <div class="elite-contract-actions">
            <span class="pill">Reward Preview</span>
            <button class="primary mini" data-start-contract="${escapeHtml(contract.id)}">Take Mark</button>
          </div>
        </div>`).join('')
      : '<p class="small muted elite-contract-empty">No paid marks are currently available.</p>';

    return `<div class="elite-contract-board">
      <div class="elite-contract-head">
        <div><h3>Lowfire Elite Board</h3><p>Take marked danger for a clear payout.</p></div>
        <span class="pill">No Active (${contracts.claimed.length}/${ELITE_CONTRACTS.length})</span>
      </div>
      <div class="elite-contract-list">${body}</div>
    </div>`;
  }

  function renderTown() {
    const stagingDistrict = currentStagingDistrict(S);
    const stagedStartDepth = defaultRunStartDepth(S);
    const questPanel = el('questPanel');
    const merchantPanel = el('merchantPanel');
    const forgePanel = el('forgePanel');
    const districtPanel = el('districtName')?.closest('.panel');
    if (districtPanel) {
      districtPanel.className = `panel section-header district-banner town-district-hub district-charter-hub ${districtToneClass(stagingDistrict)}`;
    }
    if (el('districtName')) el('districtName').textContent = stagingDistrict.name || 'Lowfire District';
    if (el('districtLine')) el('districtLine').innerHTML = `Next descent starts at ${escapeHtml(depthShortLabel(stagedStartDepth))}. Lowfire banks the haul; the Stair opens back into ${escapeHtml(stagingDistrict.name || 'Lowfire District')}.<br><span class="district-mood">${escapeHtml(stagingDistrict.mood || stagingDistrict.line || '')}</span>`;
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
      <div class="card-head"><div><h2>Lowfire Board</h2><p>Paid marks and Warden Objectives tracked from the safe district.</p></div></div>
      <div class="warden-ledger">
        <div class="split ledger-subhead"><div><strong>Warden Objectives</strong><p class="small">Short Lowfire orders paid after descent work.</p></div><span class="pill">${S.player.quests.filter(q => q.claimed).length}/${S.player.quests.length}</span></div>
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
      <div class="split merchant-head"><div><h2>Lowfire Market</h2><p>Stair gear, district wares, and descent support.</p></div><button class="ghost mini refresh-compact" id="refreshMerchantBtn"><span>Refresh</span><strong>${formatMoney(S.town.merchantRefreshCost)}</strong></button></div>
      ${activeSinkPills.length ? `<div class="tag-row market-pills">${activeSinkPills.map(label => `<span class="pill rarity-uncommon">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      <div class="list market-stock-list">${S.merchantStock.map(item => shopCard(item)).join('')}</div>
      <div class="sep"></div>
      <div class="district-market lowfire-wares">
        <div class="split market-subhead"><div><strong>District Wares</strong><p class="small">Support unlocked by your deepest secured floor.</p></div><span class="pill">${districtWares.length}/${DISTRICT_MARKET_WARES.length}</span></div>
        <div class="list district-ware-list">${districtWares.map(ware => districtWareCard(ware)).join('')}</div>
      </div>`;

    if (forgePanel) forgePanel.innerHTML = `
      <div class="card-head"><div><h2>Relic Forge</h2><p>Sparks, shards, and salvage work.</p></div></div>
      <div class="tag-row"><span class="pill">Forge spark: ${S.player.forgeSpark}</span><span class="pill">Shards: ${S.player.shards}</span></div>
      <div class="sep"></div>
      <button class="primary" id="forgeBtn">Forge Item (1 spark + 40 shards)</button>
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



// v1.4.1 Monster Identity & Elite Behavior Pass
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