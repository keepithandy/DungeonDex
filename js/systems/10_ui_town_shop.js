'use strict';

// Elite contract board, town panels, district wares, shop cards
  // Read-only revisit helper surface remains in backend systems only.
  function earlierDungeonRevisitMarkup() {
    const api = window.DungeonDexEliteContracts || {};
    const trophyStatus = typeof api.trophyEchoStatus === 'function' ? api.trophyEchoStatus(S) : null;
    const famousStatus = typeof api.famousGearStatus === 'function' ? api.famousGearStatus(S) : null;
    if (!trophyStatus || !famousStatus) return '';
    const trophyActive = trophyStatus.activeEcho || null;
    const trophyLastResult = trophyStatus.lastResult || null;
    const famousActive = famousStatus.activeMemory || null;
    const famousLastResult = famousStatus.lastResult || null;
    const rivalStatus = typeof api.rivalTraceStatus === 'function' ? api.rivalTraceStatus(S) : null;
    const boardStatus = typeof api.boardEchoStatus === 'function' ? api.boardEchoStatus(S) : null;
    const revisitRoutes = typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(S) : [];
    const rivalTraceRoute = Array.isArray(revisitRoutes) ? revisitRoutes.find(route => String(route?.key || '') === 'rival_trace_route') || null : null;
    const rivalActive = rivalStatus?.activeTrace || null;
    const rivalLastResult = rivalStatus?.lastResult || null;
    const rivalTraceState = S?.player?.revisitState?.rivalTrace || null;
    const rivalRecords = Array.isArray(S?.player?.eliteContracts?.rivals) ? S.player.eliteContracts.rivals : [];
    const unfinishedLanes = typeof api.revisitUnfinishedLaneTownRows === 'function'
      ? api.revisitUnfinishedLaneTownRows(S)
      : [];
    const unfinishedLaneRows = unfinishedLanes.length
      ? unfinishedLanes.map(lane => `
          <article class="journal-row revisit-unfinished-row revisit-unfinished-${escapeHtml(String(lane.key || '').replace(/[^a-z0-9_-]/gi, ''))}">
            <strong>${escapeHtml(cleanDisplayText(lane.title || 'Unlisted Route', 'Unlisted Route'))}</strong>
            <p>${escapeHtml(cleanDisplayText(lane.bodyText || 'This unfinished lane is not playable yet. No player action is available yet.', 'This unfinished lane is not playable yet. No player action is available yet.'))}</p>
            <p class="small muted">${escapeHtml(cleanDisplayText(lane.nextStepText || 'Future patch should keep this lane read-only until its contract is ready.', 'Future patch should keep this lane read-only until its contract is ready.'))}</p>
          </article>
        `).join('')
      : `<p class="small muted">No unfinished Revisit lanes recorded.</p>`;
    const bossName = cleanDisplayText(trophyStatus.source?.bossName || trophyActive?.bossName || 'Unknown Boss', 'Unknown Boss');
    const trophyName = cleanDisplayText(trophyStatus.source?.trophyName || trophyActive?.trophyName || 'Boss Trophy', 'Boss Trophy');
    const itemName = cleanDisplayText(famousStatus.source?.itemName || famousActive?.itemName || 'Famous Gear', 'Famous Gear');
    const famousMemoryTitle = cleanDisplayText(famousStatus.source?.memoryTitle || famousActive?.memoryTitle || `${itemName} Memory`, `${itemName} Memory`);
    const rivalName = cleanDisplayText(rivalStatus?.source?.eliteName || rivalActive?.eliteName || 'Rival Elite', 'Rival Elite');
    const rivalTraceTitle = cleanDisplayText(rivalStatus?.source?.memoryTitle || rivalActive?.memoryTitle || `${rivalName} Trace`, `${rivalName} Trace`);
    const memoryMarks = Math.max(0, Math.floor(numberOr(trophyStatus.memoryMarks, 0, 0, Number.MAX_SAFE_INTEGER)));
    const completedCount = Math.max(0, Math.floor(numberOr(trophyStatus.completedCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const historyCount = Math.max(0, Math.floor(numberOr(trophyStatus.historyCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const famousHistoryCount = Math.max(0, Math.floor(numberOr(famousStatus.historyCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const famousCompletedCount = Math.max(0, Math.floor(numberOr(famousStatus.completedCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const rivalCompletedCount = Math.max(0, Math.floor(numberOr(rivalStatus?.completedCount, 0, 0, Number.MAX_SAFE_INTEGER)));
    const echoStateLabel = trophyActive ? 'Active' : trophyStatus.locked ? 'Locked' : 'Playable';
    const famousStateLabel = famousStatus.active ? 'Active' : famousStatus.completed ? 'Recovered' : famousStatus.locked ? 'Locked' : 'Playable';
    const rivalStateLabel = rivalStatus?.active ? 'Active' : rivalStatus?.completed ? 'Recovered' : rivalStatus?.locked ? 'Locked' : 'Playable';
    const summaryLine = trophyActive
      ? cleanDisplayText(trophyActive.summaryLine || `${trophyName} stirs with a remembered weight.`, `${trophyName} stirs with a remembered weight.`)
      : trophyStatus.locked
        ? 'Locked until you have at least one boss trophy or boss record.'
        : `${bossName} is ready as a playable Revisit lane.`;
    const famousSummaryLine = famousActive
      ? cleanDisplayText(famousActive.summaryLine || `${itemName} settles into archive memory.`, `${itemName} settles into archive memory.`)
      : famousStatus.completed
        ? `${itemName} has already been recovered as archive memory.`
        : famousStatus.locked
          ? 'Locked until you have at least one retired gear record.'
          : 'Retired gear can be revisited as safe archive memory.';
    const flavor = trophyActive
      ? cleanDisplayText(trophyActive.reflection || '', '')
      : trophyStatus.locked
        ? 'The lane is cold. Bring back proof of a defeated boss and the echo can answer.'
        : `The ${trophyName} still remembers ${bossName}. Step into the reflection and settle the memory before the next descent.`;
    const famousFlavor = famousActive
      ? cleanDisplayText(famousActive.reflection || '', '')
      : famousStatus.locked
        ? 'Retired gear records stay archived until you have something to remember.'
        : 'The archive keeps the record safe. Start the memory from town and read it back without returning the gear.';
    const actionMarkup = trophyActive
      ? `<button class="primary" type="button" data-complete-trophy-echo="1">Resolve Echo</button>`
      : trophyStatus.locked
        ? `<button class="ghost" type="button" disabled aria-disabled="true">Echo Locked</button>`
        : `<button class="primary" type="button" data-start-revisit="trophy_echo_route">Start Trophy Echo</button>`;
    const famousActionMarkup = famousActive
      ? `<button class="primary" type="button" data-complete-famous-gear="1">Resolve Memory</button>`
      : famousStatus.locked
        ? `<button class="ghost" type="button" disabled aria-disabled="true">Memory Locked</button>`
        : `<button class="primary" type="button" data-start-revisit="famous_gear_route">Start Famous Gear Memory</button>`;
    const resultMarkup = trophyLastResult
      ? `<div class="small revisit-echo-result"><strong>Last Result:</strong> ${escapeHtml(cleanDisplayText(trophyLastResult.summary || '', ''))}</div>`
      : '';
    const famousResultMarkup = famousLastResult
      ? `<div class="small revisit-echo-result"><strong>Last Result:</strong> ${escapeHtml(cleanDisplayText(famousLastResult.summary || '', ''))}</div>`
      : '';
    const rivalResultMarkup = rivalLastResult
      ? `<div class="small revisit-echo-result"><strong>Last Result:</strong> ${escapeHtml(cleanDisplayText(rivalLastResult.summary || '', ''))}</div>`
      : '';
    const rivalPlayable = rivalTraceRoute?.playable === true
      || rivalTraceRoute?.entryAvailable === true
      || rivalTraceRoute?.startAvailable === true
      || rivalStatus?.available === true
      || rivalStatus?.active === true
      || rivalStatus?.completed === true
      || rivalRecords.some(entry => entry && entry.revengeAvailable !== false && entry.completed !== true)
      || Array.isArray(rivalTraceState?.history) && rivalTraceState.history.length > 0;
    const boardPlayable = boardStatus?.available === true || boardStatus?.active === true || boardStatus?.completed === true;
    const playableLanes = [
      trophyStatus.available ? 'Trophy Echo' : '',
      famousStatus.available ? 'Famous Gear Memory' : '',
      rivalPlayable ? 'Rival Trace' : ''
    ].filter(Boolean);
    const revisitStatusText = trophyActive
      ? `Active: Trophy Echo is running in town. ${famousStatus.available ? 'Famous Gear Memory is also available.' : 'Famous Gear Memory remains locked.'}`
      : famousActive
        ? `Active: Famous Gear Memory is running in town. ${trophyStatus.available ? 'Trophy Echo is also available.' : 'Trophy Echo remains locked.'}`
        : rivalActive
          ? `Active: Rival Trace is running in town. ${trophyStatus.available ? 'Trophy Echo is also available.' : 'Trophy Echo remains locked.'}`
        : playableLanes.length
          ? `Playable: ${playableLanes.join(' and ')}.`
          : 'Locked: Trophy Echo needs boss history, Famous Gear Memory needs retired gear history, and Rival Trace needs named rival history.';
    const revisitNextText = trophyActive
      ? 'Next: resolve the active echo in town before starting another.'
      : famousActive
        ? 'Next: resolve the active archive memory in town before starting another.'
        : playableLanes.length
          ? 'Next: choose a playable Revisit lane from town; rewards stay Revisit-only.'
          : 'Next: defeat a boss or retire gear to open a Revisit lane.';
    return `
      <section class="panel revisit-foundation-panel" id="revisitPanel" aria-label="Revisit panel">
        <div class="card-head">
          <div>
            <h2>Revisit</h2>
            <p>Short memory lanes tied to DungeonDex history.</p>
          </div>
        </div>
        <article class="quest-card revisit-echo-card ${trophyStatus.locked ? 'locked' : 'ready'}">
          <div class="quest-topline">
            <strong>Trophy Echo</strong>
            <span class="small ${trophyStatus.active ? '' : 'muted'}">${echoStateLabel}</span>
          </div>
          <p class="small">${escapeHtml(summaryLine)}</p>
          <p class="small muted">${escapeHtml(flavor)}</p>
          <div class="small muted">Boss history ${historyCount} • Memory Marks ${memoryMarks} • Recorded echoes ${completedCount}</div>
          <div class="small muted">${escapeHtml(revisitStatusText)}</div>
          <div class="small muted">Memory Marks are Revisit-only records; combat, gear, debt, and Talent values stay unchanged.</div>
          <div class="small muted">${escapeHtml(revisitNextText)}</div>
          ${trophyActive ? `<div class="small muted">Active Memory: ${escapeHtml(cleanDisplayText(trophyActive.memoryTitle || bossName, bossName))}</div>` : ''}
          <div class="inline-actions revisit-echo-actions">
            ${actionMarkup}
          </div>
          ${resultMarkup}
        </article>
        <article class="quest-card revisit-lane-card ${famousStatus.locked ? 'locked' : famousStatus.active ? 'active' : famousStatus.completed ? 'completed' : 'ready'}">
          <div class="quest-topline">
            <strong>Famous Gear Memory</strong>
            <span class="small ${famousStatus.active ? '' : 'muted'}">${famousStateLabel}</span>
          </div>
          <p class="small">${escapeHtml(famousSummaryLine)}</p>
          <p class="small muted">${escapeHtml(famousFlavor)}</p>
          <div class="small muted">Archive records ${famousHistoryCount} • Recovered memories ${famousCompletedCount}</div>
          <div class="small muted">${famousStatus.active ? 'Active: resolve the archive memory in town.' : famousStatus.completed ? 'Recovered: the archive note stays readable after reload.' : famousStatus.locked ? 'Locked until you have a retired gear record.' : 'Playable: start the archive memory from town.'}</div>
          <div class="small muted">Famous Gear Memory replays the record only; the item stays retired and no gear reward returns.</div>
          <div class="small muted">${famousStatus.active ? 'Next: resolve the active archive memory before starting another.' : famousStatus.completed ? 'Next: start the memory again if you want to revisit the record.' : famousStatus.locked ? 'Next: retire gear to unlock the lane.' : 'Next: start Famous Gear Memory from town; rewards stay archive-only.'}</div>
          ${famousActive ? `<div class="small muted">Active Memory: ${escapeHtml(famousMemoryTitle || itemName)}</div>` : ''}
          <div class="inline-actions revisit-echo-actions">
            ${famousActionMarkup}
          </div>
          ${famousResultMarkup}
        </article>
        <article class="quest-card revisit-lane-card ${rivalStatus?.active ? 'active' : rivalStatus?.completed ? 'completed' : rivalPlayable ? 'ready' : 'locked'}">
          <div class="quest-topline">
            <strong>Rival Trace</strong>
            <span class="small ${rivalStatus?.active ? '' : 'muted'}">${rivalStateLabel}</span>
          </div>
          <p class="small">${escapeHtml(rivalStatus?.active ? cleanDisplayText(rivalActive?.summaryLine || `${rivalName} leaves a trace in the archive.`, `${rivalName} leaves a trace in the archive.`) : rivalStatus?.completed ? `${rivalName} has already been recovered as archive trace.` : rivalPlayable ? 'Named rival memory can be revisited as a safe archive trace.' : 'Locked until named rival history exists.')}</p>
          <p class="small muted">${escapeHtml(rivalStatus?.active ? cleanDisplayText(rivalActive?.reflection || '', '') : rivalPlayable ? 'The trace is safe to read from town; it does not return rewards or alter combat.' : 'The archive keeps the rival sealed in memory. No combat, reward, or board mission opens.' )}</p>
          <div class="small muted">Named rival records ${rivalStatus?.historyCount || 0} • Traces recorded ${rivalCompletedCount}</div>
          <div class="small muted">${rivalStatus?.active ? 'Active: resolve the rival trace in town.' : rivalStatus?.completed ? 'Recovered: the archive note stays readable after reload.' : rivalPlayable ? 'Playable: start Rival Trace from town.' : 'Locked until named rival memory exists.'}</div>
          <div class="small muted">Rival Trace replays the record only; combat, debt, gear, and dungeon entry stay unchanged.</div>
          <div class="small muted">${rivalStatus?.active ? 'Next: resolve the active rival trace before starting another.' : rivalStatus?.completed ? 'Next: start the memory again if you want to revisit the record.' : rivalPlayable ? 'Next: start Rival Trace from town; rewards stay archive-only.' : 'Next: remember a named rival elite to unlock the lane.'}</div>
          ${rivalActive ? `<div class="small muted">Active Memory: ${escapeHtml(rivalTraceTitle || rivalName)}</div>` : ''}
          <div class="inline-actions revisit-echo-actions">
            ${rivalStatus?.active ? `<button class="primary" type="button" data-complete-rival-trace="1">Resolve Trace</button>` : rivalPlayable ? `<button class="primary" type="button" data-start-revisit="rival_trace_route">Start Rival Trace</button>` : `<button class="ghost" type="button" disabled aria-disabled="true">Trace Locked</button>`}
          </div>
          ${rivalResultMarkup}
        </article>
        <article class="quest-card revisit-lane-card ${boardStatus?.active ? 'active' : boardStatus?.completed ? 'completed' : boardPlayable ? 'ready' : 'locked'}">
          <div class="quest-topline">
            <strong>Board Echo</strong>
            <span class="small ${boardStatus?.active ? '' : 'muted'}">${boardStatus?.active ? 'Active' : boardStatus?.completed ? 'Recovered' : boardPlayable ? 'Playable' : 'Locked'}</span>
          </div>
          <p class="small">${escapeHtml(boardStatus?.active ? cleanDisplayText(boardStatus?.activeTrace?.summaryLine || 'Board Echo is active in town.', 'Board Echo is active in town.') : boardStatus?.completed ? 'Board Echo has already been recorded as archive memory.' : boardPlayable ? 'Board history can be revisited as a safe town memory.' : 'Locked until board history exists.')}</p>
          <p class="small muted">${escapeHtml(boardStatus?.active ? cleanDisplayText(boardStatus?.activeTrace?.reflection || '', '') : boardPlayable ? 'The board trace is safe to read from town; it does not add rewards, combat, debt, or dungeon-entry changes.' : 'The archive keeps the board sealed in memory. No combat, reward, or board mission opens.')}</p>
          <div class="small muted">Board records ${Math.max(0, Math.floor(numberOr(boardStatus?.historyCount, 0, 0, Number.MAX_SAFE_INTEGER)))} • Completed echoes ${Math.max(0, Math.floor(numberOr(boardStatus?.completedCount, 0, 0, Number.MAX_SAFE_INTEGER)))}</div>
          <div class="small muted">${boardStatus?.active ? 'Active: resolve Board Echo in town.' : boardStatus?.completed ? 'Recovered: the archive note stays readable after reload.' : boardPlayable ? 'Playable: start Board Echo from town.' : 'Locked until board history exists.'}</div>
          <div class="small muted">Board Echo replays the record only; rewards, combat, and dungeon entry stay unchanged.</div>
          <div class="small muted">${boardStatus?.active ? 'Next: resolve the active board echo before starting another.' : boardStatus?.completed ? 'Next: start the memory again if you want to revisit the record.' : boardPlayable ? 'Next: start Board Echo from town; rewards stay archive-only.' : 'Next: build board history to unlock the lane.'}</div>
          ${boardStatus?.active ? `<div class="small muted">Active Memory: ${escapeHtml(cleanDisplayText(boardStatus?.activeTrace?.memoryTitle || 'Board Echo', 'Board Echo'))}</div>` : ''}
          <div class="inline-actions revisit-echo-actions">
            ${boardStatus?.active ? `<button class="primary" type="button" data-complete-board-echo="1">Resolve Echo</button>` : boardPlayable ? `<button class="primary" type="button" data-start-revisit="board_echo_route">Start Board Echo</button>` : `<button class="ghost" type="button" disabled aria-disabled="true">Echo Locked</button>`}
          </div>
        </article>
        <article class="quest-card revisit-lane-card revisit-unfinished-lanes-card ${unfinishedLanes.length ? 'locked' : 'muted'}">
          <div class="quest-topline">
            <strong>Unfinished Lanes</strong>
            <span class="small muted">Read-only preview</span>
          </div>
          <p class="small">Board Echo is a compact Revisit lane when its board history route is playable. It stays separate from debt mechanics and rewards.</p>
          <p class="small muted">Trophy Echo, Famous Gear Memory, Rival Trace, and Board Echo remain distinct memory lanes; Debt Pressure stays locked.</p>
          <div class="journal-grid revisit-unfinished-grid">
            ${unfinishedLaneRows}
          </div>
        </article>
      </section>`;
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

  function townProgressionStatusLine(state, stagedStartDepth) {
    const formatSafe = typeof format === 'function'
      ? format
      : value => String(Math.max(0, Math.floor(Number(value) || 0)));
    const depthLabel = depth => typeof charterDepthCompactLabel === 'function'
      ? charterDepthCompactLabel(depth)
      : `D${formatSafe(depth)}`;
    const safeDepth = typeof safeExtractDepthValue === 'function'
      ? safeExtractDepthValue(state)
      : Math.max(1, Math.floor(numberOr(state?.player?.safeExtractDepth, state?.player?.depth, 1, 1, 999999)));
    const boss = typeof nextBossFloorFromDepth === 'function' ? nextBossFloorFromDepth(stagedStartDepth) : null;
    const bossText = boss?.floor
      ? `${boss.name || `Boss Floor ${formatSafe(boss.floor)}`} at ${depthLabel(boss.floor)}`
      : 'the next boss floor';
    const unlockedCharter = typeof getUnlockedCharterDepth === 'function' ? getUnlockedCharterDepth(state) : 0;
    const nextCharter = typeof getNextCharterUnlockDepth === 'function'
      ? getNextCharterUnlockDepth(unlockedCharter)
      : 40;
    const charterText = safeDepth >= nextCharter
      ? `${depthLabel(nextCharter)} charter ready`
      : `secure D${formatSafe(nextCharter)} for the next charter`;
    return `Secured depth D${formatSafe(safeDepth)}. Next target: ${bossText}; ${charterText}.`;
  }

  function renderTown() {
    const stagingDistrict = currentStagingDistrict(S);
    const districtDisplay = currentDistrictDisplay(S);
    const stagedStartDepth = defaultRunStartDepth(S);
    const nextDescent = getLoreDepthProgress(stagedStartDepth);
    const progressionStatusLine = townProgressionStatusLine(S, stagedStartDepth);
    const questPanel = el('questPanel');
    const merchantPanel = el('merchantPanel');
    const forgePanel = el('forgePanel');
    const districtPanel = el('districtName')?.closest('.panel');
    if (districtPanel) {
      districtPanel.className = `panel section-header district-banner town-district-hub district-charter-hub ${districtToneClass(stagingDistrict)}`;
    }
    if (el('districtName')) el('districtName').textContent = districtDisplay.name || stagingDistrict.name || 'Lowfire District';
    if (el('districtLine')) el('districtLine').innerHTML = `<span class="district-subtitle">${escapeHtml(districtDisplay.subtitle || stagingDistrict.line || 'Steady stair.')}</span><br><span class="district-mood">${escapeHtml(districtDisplay.shortFlavor || stagingDistrict.mood || '')}</span><br><span class="district-next-descent">Next descent: ${escapeHtml(`F${format(nextDescent.floorNumber)} • R${format(nextDescent.roomWithinFloor)} • C${format(nextDescent.chapterWithinRoom)}`)}.</span><br><span class="district-next-descent">${escapeHtml(progressionStatusLine)}</span>`;
    if (el('districtWalletSlot')) el('districtWalletSlot').innerHTML = districtWalletMarkup(S);
    if (el('revisitFoundationSlot')) el('revisitFoundationSlot').innerHTML = earlierDungeonRevisitMarkup();
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
