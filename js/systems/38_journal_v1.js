'use strict';

// DungeonDex v1.23.4 - Guild Journal / Memory Board read-only ledger.
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
    const learned = !!obj(state?.player?.talentLearnedIds).debt_collector_clarity;
    const mode = balance <= 0 ? 'Clear' : high ? 'Under Collection' : pressure > 0 ? 'Pressure Rising' : 'Borrowed';
    return {
      mode,
      balance,
      pressure,
      status: balance <= 0 ? 'No Debt' : 'Debt Active',
      line: balance <= 0 ? 'The ledger is quiet.' : high ? 'The collector is watching closely.' : pressure > 0 ? 'Pressure is building.' : 'Borrowing is available under normal terms.',
      extra: learned ? 'Debt Collector Clarity is learned as a guarded preview.' : 'Debt Collector Clarity remains preview-only.'
    };
  }
  function revisitModel(state){
    const revisit = obj(state?.player?.revisitState);
    const trophy = obj(revisit.trophyEcho);
    const famous = obj(revisit.famousGear);
    const rival = obj(revisit.rivalTrace);
    const trophyCount = list(trophy.history).length;
    const famousCount = list(famous.history).length;
    const rivalCount = list(rival.history).length;
    const total = trophyCount + famousCount + rivalCount;
    return {
      total,
      trophyCount,
      famousCount,
      rivalCount,
      trophyStatus: trophy.active ? 'Active' : trophy.locked ? 'Locked' : trophy.completed ? 'Recovered' : trophy.available ? 'Playable' : 'Quiet',
      famousStatus: famous.active ? 'Active' : famous.locked ? 'Locked' : famous.completed ? 'Recovered' : famous.available ? 'Playable' : 'Quiet',
      rivalStatus: rival.active ? 'Active' : rival.locked ? 'Locked' : rival.completed ? 'Recovered' : rival.available ? 'Playable' : 'Quiet',
      last: summaryLine([text(trophy.lastResult?.summary), text(famous.lastResult?.summary), text(rival.lastResult?.summary)], '')
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
    const famous = obj(state?.player?.revisitState?.famousGear);
    const history = list(famous.history).filter(entry => entry && typeof entry === 'object');
    const latest = history[0] || null;
    return { count: history.length, latest: latest ? text(latest.itemName || latest.memoryTitle || latest.name || 'Unknown gear') : '' };
  }
  function rivalModel(state){
    const rival = obj(state?.player?.revisitState?.rivalTrace);
    const history = list(rival.history).filter(entry => entry && typeof entry === 'object');
    const latest = history[0] || null;
    return { count: history.length, latest: latest ? text(latest.eliteName || latest.memoryTitle || 'Unknown rival') : '' };
  }
  function talentModel(state){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents || null;
    const summary = typeof api?.summary === 'function' ? api.summary(state) : null;
    const learnedIds = list(state?.player?.talentUnlockIds);
    const learnedMap = obj(state?.player?.talentLearnedIds);
    const learnedCount = Array.isArray(summary?.unlockedIds) ? summary.unlockedIds.length : learnedIds.length;
    return {
      points: num(summary?.pointsAvailable, num(state?.player?.talentPoints, 0)),
      learnedCount,
      hunter: !!learnedMap.hunter_board_clarity || learnedIds.includes('hunter_board_clarity'),
      debt: !!learnedMap.debt_collector_clarity || learnedIds.includes('debt_collector_clarity'),
      previewOnly: !!summary?.previewOnly
    };
  }
  function journalV1233SummaryModel(state){
    const safeState = obj(state);
    const boss = bossModel(safeState);
    const revisit = revisitModel(safeState);
    const famous = famousModel(safeState);
    const rival = rivalModel(safeState);
    const debt = debtStatus(safeState);
    const talent = talentModel(safeState);
    const memoryTotal = boss.count + revisit.total + famous.count + rival.count + (debt.balance > 0 ? 1 : 0) + talent.learnedCount;
    return {
      title: 'Guild Journal',
      flavor: memoryTotal > 0
        ? 'The town keeps record of your scars, debts, trophies, and names best forgotten.'
        : 'The ledger is quiet. Make something worth remembering.',
      memoryTotal,
      sections: [
        { key: 'account', title: 'Account Memory', body: memoryTotal > 0 ? `Total remembered records: ${memoryTotal}.` : 'No records yet.', meta: revisit.last || debt.line },
        { key: 'boss', title: 'Boss Trophies', body: boss.body || (boss.count > 0 ? `${boss.count} boss trophies recorded.` : 'No boss trophies recorded yet.'), meta: boss.meta || (boss.latest ? `Last: ${boss.latest}${boss.latestDetail ? ` • ${boss.latestDetail}` : ''}` : 'No boss trophies recorded yet.') },
        { key: 'revisit', title: 'Revisit Memories', body: revisit.total > 0 ? `Trophy Echo ${revisit.trophyStatus} • Famous Gear ${revisit.famousStatus} • Rival Trace ${revisit.rivalStatus}.` : 'No Revisit history yet.', meta: revisit.last || 'No Revisit history yet.' },
        { key: 'famous', title: 'Famous Gear', body: famous.count > 0 ? `${famous.count} retired gear record${famous.count === 1 ? '' : 's'} remembered.` : 'No famous gear has been retired into memory.', meta: famous.latest ? `Last remembered gear: ${famous.latest}` : 'No famous gear has been retired into memory.' },
        { key: 'rival', title: 'Rival Traces', body: rival.count > 0 ? `${rival.count} named rival trace${rival.count === 1 ? '' : 's'} recorded.` : 'No rival has left a name worth carving.', meta: rival.latest ? `Last rival: ${rival.latest}` : 'No rival has left a name worth carving.' },
        { key: 'debt', title: 'Debt Status', body: `${debt.status}. Pressure ${debt.pressure}. ${debt.line}`, meta: debt.extra },
        { key: 'talent', title: 'Talent Memory', body: `Available Talent points: ${talent.points}. Learned nodes: ${talent.learnedCount}. Hunter Board Clarity ${talent.hunter ? 'learned' : 'locked'}.`, meta: talent.debt ? 'Debt Collector Clarity is present as a guarded preview.' : 'Debt Collector Clarity remains locked or preview-only.' }
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
  window.journalV1233SummaryModel = journalV1233SummaryModel;
  window.renderGuildJournalPanel = renderGuildJournalPanel;
  window.guildJournalMemoryRows = state => journalV1233SummaryModel(state).sections.slice();
  window.DDJournalV1SummaryModel = journalV1233SummaryModel;
  window.DDJournalV1Render = injectJournal;
  window.addEventListener('DOMContentLoaded', function(){ window.setTimeout(injectJournal, 0); });
  window.addEventListener('load', function(){ window.setTimeout(injectJournal, 50); });
})();
