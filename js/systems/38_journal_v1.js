'use strict';

// DungeonDex v1.23.7 - Guild Journal / Memory Board read-only ledger.
(function(){
  if (window.DDJournalV1) return;
  window.DDJournalV1 = true;

  function list(value){ return Array.isArray(value) ? value : []; }
  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function text(value, fallback = ''){
    const raw = String(value || fallback || '').trim();
    return typeof cleanDisplayText === 'function' ? cleanDisplayText(raw, fallback) : raw;
  }
  function esc(value){
    return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function num(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : Math.max(0, Math.floor(fallback));
  }
  function firstNum(values, fallback = 0){
    const source = Array.isArray(values) ? values : [];
    for (const value of source) {
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
    }
    return num(fallback, 0);
  }
  function money(value){
    return typeof moneyText === 'function' ? moneyText(value) : `${num(value)}c`;
  }
  function summaryLine(lines, fallback){
    return lines.find(Boolean) || fallback;
  }
  function debtStatus(state){
    const debt = obj(state?.player?.debtCollector);
    const balance = num(debt.balanceCopper, 0);
    const pressure = balance > 0 ? num(debt.pressure, 0) : 0;
    const high = pressure >= 3;
    const mode = balance <= 0 ? 'Clear' : high ? 'Under Collection' : pressure > 0 ? 'Pressure Rising' : 'Borrowed';
    return {
      mode,
      balance,
      pressure,
      status: balance <= 0 ? 'No Debt' : 'Debt Active',
      line: balance <= 0 ? 'The ledger is quiet.' : high ? 'The collector is watching closely.' : pressure > 0 ? 'Pressure is building.' : 'Borrowing is available under normal terms.',
      extra: 'Debt Collector terms remain unchanged.'
    };
  }
  function revisitModel(state){
    const revisit = obj(state?.player?.revisitState);
    const trophy = obj(revisit.trophyEcho);
    const famous = obj(revisit.famousGear);
    const board = obj(revisit.boardEcho);
    const rival = obj(revisit.rivalTrace);
    const trophyCount = list(trophy.history).length;
    const famousCount = list(famous.history).length;
    const boardCount = list(board.history).length;
    const rivalCount = list(rival.history).length;
    const total = trophyCount + famousCount + boardCount + rivalCount;
    return {
      total,
      trophyCount,
      famousCount,
      boardCount,
      rivalCount,
      trophyStatus: trophy.active ? 'Active' : trophy.locked ? 'Locked' : trophy.completed ? 'Recovered' : trophy.available ? 'Playable' : 'Quiet',
      famousStatus: famous.active ? 'Active' : famous.locked ? 'Locked' : famous.completed ? 'Recovered' : famous.available ? 'Playable' : 'Quiet',
      boardStatus: board.active ? 'Active' : board.locked ? 'Locked' : board.completed ? 'Recovered' : board.available ? 'Playable' : 'Quiet',
      rivalStatus: rival.active ? 'Active' : rival.locked ? 'Locked' : rival.completed ? 'Recovered' : rival.available ? 'Playable' : 'Quiet',
      last: text(trophy.lastResult?.summary)
    };
  }
  function bossModel(state){
    if (typeof bossTrophyReadableSummary === 'function') {
      const summary = bossTrophyReadableSummary(state);
      return {
        count: num(summary.totalRecorded, 0),
        latest: summary.latestTrophy ? text(summary.latestTrophy.trophyName || summary.latestTrophy.bossName || 'Boss Trophy') : '',
        latestDetail: summary.latestTrophy ? text(summary.latestTrophy.bossName || '') : '',
        body: text(summary.body || '', ''),
        meta: text(summary.meta || '', ''),
        duplicateSafe: summary.duplicateSafe === true,
        duplicatesCollapsed: summary.duplicateRecordsCollapsed === true,
        legacyIdsDetected: summary.legacyIdsDetected === true
      };
    }
    const records = list(state?.player?.bossTrophyRecords).filter(entry => entry && typeof entry === 'object');
    const latest = records.slice().sort((a, b) => num(b.earnedAt, 0) - num(a.earnedAt, 0))[0] || null;
    return {
      count: records.length,
      latest: latest ? text(latest.bossName || latest.trophyName || latest.id || 'Unknown boss') : '',
      latestDetail: latest ? text(latest.summary || latest.recordId || '') : '',
      body: records.length > 0 ? `${records.length} boss trophies recorded.` : 'No boss trophies recorded yet.',
      meta: latest ? `Last: ${text(latest.bossName || latest.trophyName || latest.id || 'Unknown boss')}${latest.summary || latest.recordId ? ` • ${text(latest.summary || latest.recordId || '')}` : ''}` : 'No boss trophies recorded yet.',
      duplicateSafe: true,
      duplicatesCollapsed: false,
      legacyIdsDetected: false
    };
  }
  function famousModel(state){
    const api = window.DungeonDexEliteContracts || null;
    // The legacy summary repairs Revisit state; isolate that work from the live save.
    const summaryState = { ...obj(state), player: { ...obj(state?.player), revisitState: JSON.parse(JSON.stringify(obj(state?.player?.revisitState))) } };
    const summary = typeof api?.famousGearMemorySummary === 'function' ? api.famousGearMemorySummary(summaryState) : null;
    if (summary) {
      return {
        count: num(summary.totalRecorded, 0),
        latest: summary.latestMemory ? text(summary.latestMemory.itemName || summary.latestMemory.recordId || 'Unknown gear') : '',
        body: text(summary.body || '', ''),
        meta: text(summary.meta || '', ''),
        duplicateSafe: summary.duplicateSafe === true,
        duplicatesCollapsed: summary.duplicateRecordsCollapsed === true,
        legacyIdsDetected: summary.legacyIdsDetected === true,
        emptyStateCopy: text(summary.emptyStateCopy || 'No famous gear memories recorded yet.', 'No famous gear memories recorded yet.')
      };
    }
    const famous = obj(state?.player?.revisitState?.famousGear);
    const history = list(famous.history).filter(entry => entry && typeof entry === 'object');
    const latest = history[0] || null;
    return {
      count: history.length,
      latest: latest ? text(latest.itemName || latest.memoryTitle || latest.name || 'Unknown gear') : '',
      body: history.length > 0 ? `${history.length} famous gear memories recorded.` : 'No famous gear memories recorded yet.',
      meta: history.length > 0 ? `Last remembered gear: ${text(latest.itemName || latest.memoryTitle || latest.name || 'Unknown gear')}` : 'No famous gear memories recorded yet.',
      duplicateSafe: true,
      duplicatesCollapsed: false,
      legacyIdsDetected: false,
      emptyStateCopy: 'No famous gear memories recorded yet.'
    };
  }
  function rivalTraceSlug(value){
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function rivalTraceRawObject(raw){
    if (raw && typeof raw === 'object') return raw;
    const rawText = text(raw, '');
    if (!rawText) return {};
    const cleanName = rawText.replace(/^rival_trace:/i, '').replace(/[_-]+/g, ' ').trim() || 'Rival Elite';
    return { completionKey: rawText, eliteName: cleanName, memoryTitle: `${cleanName} Trace`, legacy: true };
  }
  function rivalTraceKey(raw, sourceLabel, index){
    const source = rivalTraceRawObject(raw);
    const key = text(source.completionKey || source.rivalId || source.id || source.recordId || source.eliteName || source.memoryTitle || '', '');
    if (key) return key.indexOf('rival_trace:') === 0 ? key : `rival_trace:${rivalTraceSlug(key) || key}`;
    return `rival_trace:${sourceLabel}:${index}`;
  }
  function rivalTraceRecord(raw, sourceLabel, index, legacy = false){
    const source = rivalTraceRawObject(raw);
    const legacyRecord = legacy || source.legacy === true || typeof raw === 'string';
    const eliteName = text(source.eliteName || source.name || source.memoryTitle || 'Rival Elite', 'Rival Elite');
    const memoryTitle = text(source.memoryTitle || `${eliteName} Trace`, `${eliteName} Trace`);
    const routeStatus = text(source.routeStatus || source.status || source.state || source.resultStatus || '', '');
    const completedLabel = source.completedLabel || source.lastCompletedLabel || source.completedAtLabel || '';
    return {
      key: rivalTraceKey(source, sourceLabel, index),
      rivalId: text(source.rivalId || source.id || source.recordId || '', ''),
      eliteName,
      memoryTitle,
      floorName: text(source.floorName || source.district || source.source || 'Elite Board', 'Elite Board'),
      summary: text(source.summary || source.summaryLine || source.reflection || '', ''),
      routeStatus,
      completedLabel: text(completedLabel || (legacyRecord ? 'Completed' : ''), legacyRecord ? 'Completed' : ''),
      memoryKey: text(source.memoryKey || source.completionKey || source.key || '', ''),
      source: text(sourceLabel, 'Rival Trace'),
      completed: !!(source.completed || source.result || sourceLabel === 'history' || legacyRecord),
      legacy: legacyRecord,
      updatedAt: firstNum([source.completedAt, source.endedAt, source.startedAt, source.updatedAt, source.createdAt, source.earnedAt], 0)
    };
  }
  function rivalTraceResultDetail(record){
    const parts = [];
    const rivalName = text(record?.eliteName || record?.memoryTitle || '', '');
    const routeStatus = text(record?.routeStatus || '', '');
    const memoryKey = text(record?.memoryKey || record?.key || '', '');
    const flavor = text(record?.summary || '', '');
    const completedLabel = text(record?.completedLabel || '', '');
    if (rivalName) parts.push(`Rival: ${rivalName}`);
    if (routeStatus) parts.push(`Route: ${routeStatus}`);
    parts.push(`State: ${record?.completed ? 'Completed' : 'Pending'}`);
    if (memoryKey) parts.push(`Memory Key: ${memoryKey}`);
    if (flavor) parts.push(`Flavor: ${flavor}`);
    if (completedLabel) parts.push(`Last Completed: ${completedLabel}`);
    return parts.join(' • ');
  }
  function rivalTraceReadableSummary(state){
    const safeState = obj(state);
    const trace = obj(safeState?.player?.revisitState?.rivalTrace);
    const contracts = obj(safeState?.player?.eliteContracts);
    const records = [];
    const rawHistory = list(trace.history).filter(Boolean);
    rawHistory.forEach((entry, index) => records.push(rivalTraceRecord(entry, 'history', index)));
    if (trace.active && typeof trace.active === 'object') records.push(rivalTraceRecord(trace.active, 'active', records.length));
    list(contracts.rivals).filter(entry => entry && typeof entry === 'object').forEach((entry, index) => records.push(rivalTraceRecord(entry, 'elite-rival-record', index)));
    const completedKeys = Object.keys(obj(trace.completedKeys)).filter(key => trace.completedKeys[key] === true && /^rival_trace:[^:]+/i.test(String(key || '').trim()));
    completedKeys.forEach((key, index) => {
      records.push(rivalTraceRecord({ completionKey: key, memoryTitle: key.replace(/^rival_trace:/i, '').replace(/[_-]+/g, ' '), completed: true }, 'legacy-completed-key', index, true));
    });
    const byKey = new Map();
    let duplicatesCollapsed = false;
    records.forEach(record => {
      const key = record.key;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, record);
        return;
      }
      duplicatesCollapsed = true;
      existing.rivalId = existing.rivalId || record.rivalId;
      existing.eliteName = existing.eliteName === 'Rival Elite' ? record.eliteName : existing.eliteName;
      existing.memoryTitle = existing.memoryTitle || record.memoryTitle;
      existing.floorName = existing.floorName === 'Elite Board' ? record.floorName : existing.floorName;
      existing.summary = existing.summary || record.summary;
      existing.completed = existing.completed || record.completed;
      existing.legacy = existing.legacy || record.legacy;
      existing.updatedAt = Math.max(num(existing.updatedAt, 0), num(record.updatedAt, 0));
    });
    const collapsed = Array.from(byKey.values())
      .sort((left, right) => num(right.updatedAt, 0) - num(left.updatedAt, 0) || String(left.key || '').localeCompare(String(right.key || '')))
      .slice(0, 12);
    const latest = collapsed[0] || null;
    const latestCompleted = collapsed.find(record => record.completed) || latest;
    const total = collapsed.length;
    const names = collapsed.map(record => record.eliteName || record.memoryTitle).filter(Boolean);
    const legacyIdsDetected = collapsed.some(record => record.legacy) || rawHistory.some(entry => typeof entry === 'string') || completedKeys.length > rawHistory.length;
    return {
      totalRecorded: total,
      traceNames: names,
      latestTrace: latestCompleted,
      latestCompletedTrace: latestCompleted,
      latestResultDetail: latestCompleted ? rivalTraceResultDetail(latestCompleted) : '',
      body: total > 0
        ? `${total} rival trace${total === 1 ? '' : 's'} remembered: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ', and more' : ''}.`
        : 'No rival has left a name worth carving.',
      meta: latestCompleted
        ? `Last rival: ${latestCompleted.eliteName}${latestCompleted.floorName ? ` • ${latestCompleted.floorName}` : ''}${duplicatesCollapsed ? ' • duplicate-safe' : ''}${legacyIdsDetected ? ' • legacy trace detected' : ''}`
        : 'No rival trace records yet.',
      duplicateSafe: true,
      duplicateRecordsCollapsed: duplicatesCollapsed,
      legacyIdsDetected,
      records: collapsed
    };
  }
  function rivalModel(state){
    const summary = rivalTraceReadableSummary(state);
    const latest = summary.latestTrace || null;
    const detail = text(summary.latestResultDetail || (latest ? rivalTraceResultDetail(latest) : ''), '');
    const detailLine = detail ? `Completed result: ${detail}` : '';
    return {
      count: num(summary.totalRecorded, 0),
      latest: latest ? text(latest.eliteName || latest.memoryTitle || 'Unknown rival') : '',
      latestDetail: detail,
      completed: latest ? latest.completed === true : false,
      body: text(summary.body || '', ''),
      meta: text([summary.meta || '', detailLine].filter(Boolean).join(' • '), ''),
      duplicateSafe: summary.duplicateSafe === true,
      duplicatesCollapsed: summary.duplicateRecordsCollapsed === true,
      legacyIdsDetected: summary.legacyIdsDetected === true
    };
  }
  function revisitLaneClarityModel(state){
    const api = window.DungeonDexEliteContracts || null;
    const lanes = typeof api?.revisitLaneStatusClarity === 'function' ? api.revisitLaneStatusClarity(state) : [];
    const unfinished = lanes.filter(lane => lane && lane.bucket !== 'finished');
    const board = unfinished.find(lane => lane.key === 'board_echo_route') || null;
    const debt = unfinished.find(lane => lane.key === 'debt_pressure_route') || null;
    const boardText = board
      ? `${board.title || 'Board Echo'} ${board.shortLabel || 'Locked'}. ${board.active ? 'This lane is active now.' : board.historyStateAvailable ? 'This lane has a recorded completion.' : board.isPlayable ? 'This lane is playable now.' : 'This lane is not playable yet.'} ${board.detailText || 'Read-only lane copy only.'} ${board.nextStepText || 'Future patch should keep it read-only for now.'}`
      : 'Board Echo is not recorded yet.';
    const debtText = debt
      ? `${debt.title || 'Debt Pressure'} ${debt.shortLabel || 'Locked'}. This lane is not playable yet. ${debt.detailText || 'Read-only lane copy only.'} ${debt.nextStepText || 'Future patch should keep it read-only for now.'}`
      : 'Debt Pressure is not recorded yet.';
    const statusText = unfinished.length
      ? [boardText, debtText].filter(Boolean).join(' • ')
      : 'No unfinished lanes recorded.';
    return {
      count: lanes.length,
      unfinishedCount: unfinished.length,
      board,
      debt,
      boardText,
      debtText,
      debtPreviewText: debt ? `${debt.title || 'Debt Pressure'} preview is read-only and not playable yet.` : '',
      statusText,
      lanes
    };
  }
  function merchantUpgradeModel(state){
    const upgrades = typeof merchantGearUpgradeSummary === 'function' ? merchantGearUpgradeSummary(state) : [];
    const active = upgrades.filter(entry => entry && entry.item);
    const totalLevels = active.reduce((sum, entry) => sum + num(entry.level, 0), 0);
    return {
      active,
      totalLevels,
      body: active.length
        ? active.map(entry => `${text(entry.itemName || entry.label || 'Gear')} ${text(entry.tierText || `${entry.level || 0}`)} gives ${text(entry.currentBonusText || entry.currentStat || 'no bonus')}${entry.capped ? ' • Maxed at +3' : ` • Next cost ${money(entry.cost)}`}`).join(' • ')
        : 'No merchant gear upgrades are active yet.',
      meta: active.length
        ? 'Weapon upgrades are +2 Power per tier. Armor upgrades are +2 Guard and +8 HP per tier. Equipped Offhands gain +1 Guard and +1 Wit per tier.'
        : 'Spend copper at the Lowfire Market to improve equipped gear.'
    };
  }
  function eliteContractModel(state){
    const api = window.DungeonDexEliteContracts || null;
    const history = typeof api?.journalHistory === 'function' ? api.journalHistory(state) : [];
    const records = list(history).filter(entry => entry && typeof entry === 'object').slice(0, 8).map(entry => ({
      eliteName: text(entry.eliteName || 'Unknown target', 'Unknown target'),
      location: text(entry.location || 'Elite Board', 'Elite Board'),
      outcome: text(entry.outcome || 'Recorded', 'Recorded'),
      badge: text(entry.badge || entry.outcome || 'Recorded', 'Recorded'),
      bonusResult: text(entry.bonusResult || '', ''),
      failureNote: text(entry.failureNote || '', '')
    }));
    return {
      records,
      count: records.length,
      latest: records[0] || null
    };
  }
  // Presentation only: depth is a location, never proof of a victory or a full-band clear.
  function reliquaryJournalModel(state){
    const player = obj(state?.player);
    const run = obj(state?.run);
    const depth = value => {
      if (typeof value !== 'number' && typeof value !== 'string') return 0;
      const n = Number(value);
      return Number.isSafeInteger(n) && n > 0 && n <= 999999 ? n : 0;
    };
    const inBand = value => depth(value) >= 31 && depth(value) <= 40;
    const location = value => {
      if (typeof getLoreDepthProgress !== 'function' || !depth(value)) return 'Location not recorded';
      const lore = getLoreDepthProgress(depth(value));
      return `Floor ${lore.floorNumber} • Room ${lore.roomWithinFloor} • Chapter ${lore.chapterWithinRoom} (D${depth(value)})`;
    };
    const makeRow = (key, title, badge, primary, detail) => ({ key: `reliquary-${key}`, title, badge, primary, detail });

    // Reuse the established ID/legacy-name resolver without its mutation option.
    const legacy = player.bossTrophies;
    const bossTrophies = Array.isArray(legacy) ? legacy.filter(entry => typeof entry === 'string' || Object.keys(obj(entry)).length)
      : Object.fromEntries(Object.entries(obj(legacy)).filter(([, value]) => value === true || typeof value === 'number' && value > 0 || Object.keys(obj(value)).length));
    const bossIds = typeof bossTrophyStateModel === 'function'
      ? bossTrophyStateModel({ player: { bossTrophyRecords: list(player.bossTrophyRecords), bossTrophies } }).ids : [];
    const bossComplete = bossIds.includes('gravetoll_bell');
    const bossActive = run.active === true && depth(run.floor) === 45 && obj(run.monster).tier === 'Boss';
    const boss = makeRow('boss', 'The bell beyond the water', bossComplete ? 'Completed' : bossActive ? 'Active' : 'Locked — no trophy record',
      bossComplete ? 'The Gravetoll Bell now has a place in the guild ledger.' : bossActive ? 'The Gravetoll Bell is calling from the next descent.' : 'The Gravetoll Bell has not been recorded in the ledger yet.',
      `${location(45)}. ${bossComplete ? 'Its trophy keeps the Reliquary’s story ringing.' : 'Reaching this location alone does not record a victory.'}`);

    const contracts = obj(player.eliteContracts);
    const knownContract = entry => typeof normalizeEliteContractId === 'function' && !!normalizeEliteContractId(obj(entry).id);
    const contractDepth = entry => depth(obj(entry).targetFloor) && typeof eliteContractRawDepthForThreatFloor === 'function'
      ? eliteContractRawDepthForThreatFloor(depth(entry.targetFloor)) : 0;
    const locatedContract = entry => knownContract(entry) && inBand(contractDepth(entry));
    const active = obj(contracts.active);
    const activeLocated = locatedContract(active);
    const failedActive = active.failed === true || active.expired === true || ['failed', 'expired'].includes(active.status);
    const completedActive = !failedActive && (active.completed === true || active.complete === true || active.claimable === true || active.status === 'completed');
    const oldContract = list(contracts.failed).find(locatedContract) || list(contracts.expired).find(locatedContract);
    const unlocatedCompletion = [...list(contracts.claimed), ...list(contracts.completed)].some(id => knownContract({ id }));
    const contract = makeRow('contract', 'A writ beneath the bells', 'Locked — no located record',
      'No Reliquary contract location is recorded here.', 'Only a writ with a recorded target beneath the bells belongs in this account.');
    if (activeLocated) {
      contract.badge = failedActive ? 'Historical' : completedActive ? 'Completed — target defeated' : 'Active';
      contract.primary = `${text(active.eliteName || active.name, 'Contract target')}: ${failedActive ? 'the writ ended without a recorded victory' : completedActive ? 'the guild has marked the target defeated' : 'the guild awaits word from beneath the bells'}.`;
      contract.detail = `${location(contractDepth(active))}. ${failedActive ? 'An ended writ is not a completed hunt.' : completedActive ? 'Return to the existing Contract Board for its claim status.' : 'Accepting a writ is not proof of reaching or defeating its target.'}`;
    } else if (oldContract) {
      contract.badge = 'Historical';
      contract.primary = `${text(oldContract.eliteName, 'Contract target')}: an ended writ remains in the ledger.`;
      contract.detail = `${location(contractDepth(oldContract))}. Failed or expired writs do not record a victory.`;
    } else if (unlocatedCompletion) {
      contract.badge = 'Historical — location unrecorded';
      contract.primary = 'Earlier contract completions remain in the Guild Journal.';
      contract.detail = 'Those completion records retain the hunt, but not its target location. The guild cannot place them in the Reliquary.';
    }

    // Only explicit item identity is evidence. A name, item level, or retirement depth is insufficient.
    const themedItem = item => {
      const source = obj(item);
      return typeof source.id === 'string' && !!source.id.trim() && typeof source.name === 'string' && !!source.name.trim()
        && typeof source.slot === 'string' && (typeof SLOT_ORDER === 'undefined' || SLOT_ORDER.includes(source.slot))
        && (source.maker === 'Drowned Reliquary' || list(source.tags).includes('drowned-reliquary'));
    };
    const held = [...Object.values(obj(player.equipment)), ...list(player.inventory)].find(themedItem);
    const retired = list(player.retiredRelics).map(entry => obj(entry).item || entry).find(themedItem);
    const gear = makeRow('gear', 'A mark from the black water', held ? 'Recorded — in your gear' : retired ? 'Historical — retired' : 'Locked — no identified gear',
      held || retired ? `${text((held || retired).name)} still carries the Reliquary’s mark.` : 'No identified Reliquary piece remains in your gear or retired archive.',
      held ? 'Lowfire recognizes this piece in your equipped gear or inventory.' : retired ? 'Its retired record endures as a memory of the descent.' : 'Names and old loot previews alone cannot establish where a piece came from.');

    const history = list(player.runHistory).filter(entry => inBand(obj(entry).floor));
    const extracted = history.find(entry => entry.reason === 'extract');
    const ended = history.find(entry => ['defeat', 'ended'].includes(entry.reason));
    const activeRun = run.active === true && inBand(run.floor);
    const returned = makeRow('return', 'A return from the Reliquary', extracted ? 'Completed — safe return' : activeRun ? 'Active' : ended ? 'Historical' : 'Locked — no return record',
      extracted ? 'Lowfire remembers your safe return from beneath the bells.' : activeRun ? 'Your current descent is among the sealed bells.' : ended ? 'The guild preserves an ended Reliquary descent.' : 'No safe Reliquary return appears in the retained descent history.',
      extracted ? `${location(extracted.floor)}. This records an extraction, not a clear of every room.${activeRun ? ' Another Reliquary descent is active.' : ''}`
        : activeRun ? `${location(run.floor)}. The descent is still underway; its haul is not yet a safe return.`
        : ended ? `${location(ended.floor)}. ${ended.reason === 'defeat' ? 'This descent was lost; unsecured loot was not recovered.' : 'No safe extraction is recorded for this descent.'}`
        : 'Only retained run entries can place a return here; deeper progress alone cannot.');
    const rows = [boss, contract, gear, returned];
    const townRecord = bossComplete || bossActive ? boss : activeLocated ? contract : extracted ? returned : held || retired ? gear : activeRun || ended ? returned : null;
    return { rows, townRecord };
  }
  function renderReliquaryTownAcknowledgement(state){
    const record = reliquaryJournalModel(state).townRecord;
    return record ? `<p class="small journal-record-detail town-reliquary-reaction"><strong>Drowned Reliquary · ${esc(record.badge)}</strong><br>${esc(record.primary)}</p>` : '';
  }

  function journalV1233SummaryModel(state){
    const safeState = obj(state);
    const boss = bossModel(safeState);
    const revisit = revisitModel(safeState);
    const famous = famousModel(safeState);
    const rival = rivalModel(safeState);
    const debt = debtStatus(safeState);
    const upgrades = merchantUpgradeModel(safeState);
    const contracts = eliteContractModel(safeState);
    const historicalCount = famous.count + rival.count;
    const memoryTotal = boss.count
      + revisit.trophyCount
      + historicalCount
      + contracts.count
      + (debt.balance > 0 ? 1 : 0)
      + upgrades.active.length;
    const sections = [];
    if (boss.count > 0) sections.push({
      key: 'boss',
      title: 'Boss Trophies',
      badge: `${boss.count} recorded`,
      primary: boss.latest ? `${boss.latest} stands as the latest trophy.` : `${boss.count} trophies endure in the guild ledger.`,
      detail: boss.latestDetail || 'Proof of the deepest victories remains in the Archive.'
    });
    if (revisit.trophyCount > 0) sections.push({
      key: 'trophy-echo',
      title: 'Trophy Echo',
      badge: `${revisit.trophyCount} remembered`,
      primary: revisit.last || `${revisit.trophyCount} Trophy Echo ${revisit.trophyCount === 1 ? 'memory has' : 'memories have'} been recovered.`,
      detail: 'The guild remembers this descent without changing its rewards or outcome.'
    });
    contracts.records.forEach((record, index) => sections.push({
      key: `elite-contract-${index + 1}`,
      title: 'Elite Contract',
      badge: record.badge,
      primary: `${record.outcome}: ${record.eliteName}`,
      detail: [record.location, record.bonusResult, record.failureNote].filter(Boolean).join(' • ')
    }));
    if (historicalCount > 0) {
      const historicalNames = [
        famous.latest ? `Famous gear: ${famous.latest}` : '',
        rival.latest ? `Rival: ${rival.latest}` : ''
      ].filter(Boolean);
      sections.push({
        key: 'historical',
        title: 'Historical Memories',
        badge: 'Read-only',
        primary: historicalNames.join(' • ') || `${historicalCount} older memories remain in the ledger.`,
        detail: `${historicalCount} compatible ${historicalCount === 1 ? 'record remains' : 'records remain'} preserved from earlier journeys.`
      });
    }
    if (debt.balance > 0) sections.push({
      key: 'debt',
      title: 'Debt Record',
      badge: debt.mode,
      primary: `${money(debt.balance)} remains due. Pressure ${debt.pressure}.`,
      detail: debt.line
    });
    if (upgrades.totalLevels > 0) sections.push({
      key: 'upgrades',
      title: 'Merchant Upgrades',
      badge: `${upgrades.totalLevels} total tiers`,
      primary: upgrades.body,
      detail: upgrades.meta
    });
    const latestRecord = summaryLine([
      contracts.latest ? `${contracts.latest.eliteName} — ${contracts.latest.badge}` : '',
      revisit.last,
      boss.latest ? `${boss.latest} Trophy` : '',
      famous.latest ? `${famous.latest} memory` : '',
      rival.latest ? `${rival.latest} trace` : '',
      upgrades.active[0]?.itemName ? `${text(upgrades.active[0].itemName)} upgrade` : '',
      debt.balance > 0 ? 'Debt Record' : ''
    ], 'No records yet');
    sections.forEach(section => {
      section.body = section.primary;
      section.meta = section.detail;
    });
    return {
      reliquary: reliquaryJournalModel(safeState),
      title: 'Guild Journal',
      flavor: memoryTotal > 0
        ? `${memoryTotal} ${memoryTotal === 1 ? 'record endures' : 'records endure'} in the guild chronicle.`
        : 'No deeds have been carved into the guild chronicle yet.',
      memoryTotal,
      latestRecord,
      sections
    };
  }
  function row(section){
    return `<article class="journal-row journal-record-card journal-record-${esc(section.key)}" data-journal-kind="${esc(section.key)}">
      <div class="journal-record-head">
        <h3>${esc(section.title)}</h3>
        <span class="pill journal-record-badge">${esc(section.badge)}</span>
      </div>
      <p class="journal-record-primary">${esc(section.primary)}</p>
      <p class="small muted journal-record-detail">${esc(section.detail)}</p>
    </article>`;
  }
  function renderGuildJournalPanel(state){
    const model = journalV1233SummaryModel(state);
    return `<section class="journal-board" id="guildJournalPanel" aria-label="Guild Journal">
      <header class="journal-chronicle-head">
        <div class="journal-chronicle-title">
          <span class="eyebrow">Guild Chronicle</span>
          <h2>${esc(model.title)}</h2>
          <p>${esc(model.flavor)}</p>
        </div>
        <div class="journal-chronicle-summary" aria-label="Journal summary">
          <strong>${esc(model.memoryTotal)}</strong>
          <span>${model.memoryTotal === 1 ? 'record' : 'records'}</span>
        </div>
        <p class="journal-latest"><span>Latest</span><strong>${esc(model.latestRecord)}</strong></p>
      </header>
      ${model.sections.length
        ? `<div class="journal-grid">${model.sections.map(row).join('')}</div>`
        : '<p class="journal-empty">Complete a Board hunt, defeat a boss, recover a Trophy Echo, or temper equipped gear to begin the chronicle.</p>'}
      <section class="journal-reliquary" aria-label="Drowned Reliquary records">
        <h2>Drowned Reliquary</h2>
        <p class="small muted">The guild records what your journey can prove. These acknowledgements are read-only.</p>
        <div class="journal-grid">${model.reliquary.rows.map(row).join('')}</div>
      </section>
    </section>`;
  }
  function injectJournal(){
    const panel = document.getElementById('archivePanel');
    if (!panel) return;
    const state = typeof S !== 'undefined' ? S : window.S || {};
    const html = renderGuildJournalPanel(state);
    const existing = panel.querySelector('#guildJournalPanel');
    if (existing) existing.outerHTML = html;
    else panel.insertAdjacentHTML('beforeend', html);
  }
  const originalRenderArchive = typeof window.renderArchive === 'function' ? window.renderArchive : null;
  if (originalRenderArchive) {
    window.renderArchive = function renderArchive(){
      const result = originalRenderArchive.apply(this, arguments);
      injectJournal();
      return result;
    };
  }
  window.reliquaryJournalModel = reliquaryJournalModel;
  window.renderReliquaryTownAcknowledgement = renderReliquaryTownAcknowledgement;
  window.rivalTraceReadableSummary = rivalTraceReadableSummary;
  window.journalV1233SummaryModel = journalV1233SummaryModel;
  window.renderGuildJournalPanel = renderGuildJournalPanel;
  window.guildJournalMemoryRows = state => journalV1233SummaryModel(state).sections.slice();
  window.DDJournalV1SummaryModel = journalV1233SummaryModel;
  window.DDJournalV1Render = injectJournal;
  window.addEventListener('DOMContentLoaded', function(){ window.setTimeout(injectJournal, 0); });
  window.addEventListener('load', function(){ window.setTimeout(injectJournal, 50); });
})();
