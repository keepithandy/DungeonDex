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
    return typeof formatMoney === 'function' ? formatMoney(value) : `${num(value)}c`;
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
      last: summaryLine([text(trophy.lastResult?.summary), text(famous.lastResult?.summary), text(board.lastResult?.summary), text(rival.lastResult?.summary)], '')
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
    const summary = typeof api?.famousGearMemorySummary === 'function' ? api.famousGearMemorySummary(state) : null;
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
        ? active.map(entry => `${text(entry.label || 'Gear')} +${num(entry.level, 0)}/${num(entry.cap, 3)}`).join(' • ')
        : 'No merchant gear upgrades are active yet.',
      meta: active.length
        ? active.map(entry => `${text(entry.itemName || entry.label || 'Gear')} (${text(entry.currentStat || 'No stat')})`).join(' • ')
        : 'Spend copper at the Lowfire Market to improve equipped gear.'
    };
  }
  function journalV1233SummaryModel(state){
    const safeState = obj(state);
    const boss = bossModel(safeState);
    const revisit = revisitModel(safeState);
    const famous = famousModel(safeState);
    const rival = rivalModel(safeState);
    const laneClarity = revisitLaneClarityModel(safeState);
    const debt = debtStatus(safeState);
    const upgrades = merchantUpgradeModel(safeState);
    const memoryTotal = boss.count + revisit.total + famous.count + rival.count + (debt.balance > 0 ? 1 : 0) + upgrades.totalLevels;
    return {
      title: 'Guild Journal',
      flavor: memoryTotal > 0
        ? 'The town keeps record of your scars, debts, trophies, and names best forgotten.'
        : 'The ledger is quiet. Make something worth remembering.',
      memoryTotal,
      debtPreviewText: laneClarity.debtPreviewText,
      sections: [
        { key: 'account', title: 'Account Memory', body: memoryTotal > 0 ? `Total remembered records: ${memoryTotal}.` : 'No records yet.', meta: revisit.last || debt.line },
        { key: 'boss', title: 'Boss Trophies', body: boss.body || (boss.count > 0 ? `${boss.count} boss trophies recorded.` : 'No boss trophies recorded yet.'), meta: boss.meta || (boss.latest ? `Last: ${boss.latest}${boss.latestDetail ? ` • ${boss.latestDetail}` : ''}` : 'No boss trophies recorded yet.') },
        { key: 'revisit', title: 'Revisit Memories', body: revisit.total > 0 ? `Trophy Echo ${revisit.trophyStatus} • Famous Gear ${revisit.famousStatus} • Board Echo ${revisit.boardStatus} • Rival Trace ${revisit.rivalStatus}.` : 'No Revisit history yet.', meta: revisit.last || 'No Revisit history yet.' },
        { key: 'famous', title: 'Famous Gear', body: famous.body || (famous.count > 0 ? `${famous.count} famous gear memory${famous.count === 1 ? '' : 'ies'} recorded.` : famous.emptyStateCopy), meta: famous.meta || (famous.latest ? `Last remembered gear: ${famous.latest}` : famous.emptyStateCopy) },
        { key: 'rival', title: 'Rival Traces', body: rival.body || (rival.count > 0 ? `${rival.count} named rival trace${rival.count === 1 ? '' : 's'} recorded.` : 'No rival has left a name worth carving.'), meta: rival.meta || (rival.latest ? `Last rival: ${rival.latest}` : 'No rival has left a name worth carving.') + (rival.latestDetail ? ` • ${rival.latestDetail}` : '') },
        { key: 'lanes', title: 'Unfinished Lanes', body: laneClarity.statusText, meta: [laneClarity.boardText, laneClarity.debtText].filter(Boolean).join(' • ') || laneClarity.boardText || laneClarity.debtText },
        { key: 'debt', title: 'Debt Status', body: `${debt.status}. Pressure ${debt.pressure}. ${debt.line}`, meta: debt.extra },
        { key: 'upgrades', title: 'Merchant Upgrades', body: upgrades.body, meta: upgrades.meta }
      ]
    };
  }
  function row(section){
    return `<article class="journal-row"><strong>${esc(section.title)}</strong><p>${esc(section.body)}</p><p class="small muted">${esc(section.meta || '')}</p></article>`;
  }
  function renderGuildJournalPanel(state){
    const model = journalV1233SummaryModel(state);
    return `<section class="journal-board" id="guildJournalPanel" aria-label="Guild Journal">
      <div class="card-head">
        <div><h2>${esc(model.title)}</h2><p>${esc(model.flavor)}</p></div>
        <span class="pill">Memory Board</span>
      </div>
      <div class="journal-grid">
        ${model.sections.map(row).join('')}
      </div>
    </section>`;
  }
  function injectJournal(){
    const panel = document.getElementById('archivePanel');
    if (!panel) return;
    const html = renderGuildJournalPanel(window.S || {});
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
  window.rivalTraceReadableSummary = rivalTraceReadableSummary;
  window.journalV1233SummaryModel = journalV1233SummaryModel;
  window.renderGuildJournalPanel = renderGuildJournalPanel;
  window.guildJournalMemoryRows = state => journalV1233SummaryModel(state).sections.slice();
  window.DDJournalV1SummaryModel = journalV1233SummaryModel;
  window.DDJournalV1Render = injectJournal;
  window.addEventListener('DOMContentLoaded', function(){ window.setTimeout(injectJournal, 0); });
  window.addEventListener('load', function(){ window.setTimeout(injectJournal, 50); });
})();
