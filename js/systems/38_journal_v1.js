'use strict';

// v1.23.3 Journal v1.
// Read-only memory ledger for Revisit, Debt, Talent, and boss progress.
(function(){
  if (window.DDJournalV1) return;
  window.DDJournalV1 = true;

  function list(value){ return Array.isArray(value) ? value : []; }
  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function clean(value, fallback = ''){
    const raw = String(value || fallback || '').trim();
    if (typeof window.cleanDisplayText === 'function') return window.cleanDisplayText(raw, fallback);
    return raw || fallback;
  }
  function esc(value){
    return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }
  function fmt(value){
    if (typeof window.format === 'function') return window.format(value);
    const num = Number(value);
    return Number.isFinite(num) ? String(Math.floor(num)) : '0';
  }
  function money(value){
    if (typeof window.formatMoney === 'function') return window.formatMoney(value);
    const num = Math.max(0, Math.floor(Number(value) || 0));
    return `${fmt(Math.floor(num / 100))}g ${fmt(Math.floor((num % 10000) / 100))}s ${fmt(num % 100)}c`;
  }
  function timeText(value){
    const raw = Number(value || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 'No record';
    try { return new Date(raw).toLocaleString(); }
    catch (_) { return 'No record'; }
  }
  function debtStateLabel(debt){
    if (!debt || debt.balanceCopper <= 0) return 'Clear';
    if (debt.pressure >= 3) return 'Under Collection';
    if (debt.pressure >= 2) return 'Pressure Rising';
    return 'Borrowed';
  }
  function talentNodes(state){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents || null;
    const summary = typeof api?.summary === 'function' ? api.summary(state) : null;
    const ledger = obj(state?.player?.talentLedger);
    const learnedIds = list(state?.player?.talentUnlockIds);
    const learnedMap = obj(state?.player?.talentLearnedIds);
    const learnedCount = Array.isArray(summary?.unlockedIds) ? summary.unlockedIds.length : learnedIds.length;
    return {
      availablePoints: Number.isFinite(Number(summary?.pointsAvailable)) ? Math.max(0, Math.floor(Number(summary.pointsAvailable))) : Math.max(0, Math.floor(Number(ledger.availablePoints) || 0)),
      learnedCount,
      learnedIds: Array.from(new Set([
        ...learnedIds.map(value => clean(value, '')).filter(Boolean),
        ...Object.keys(learnedMap).filter(key => learnedMap[key] === true)
      ])),
      summary
    };
  }
  function bossRecords(state){
    const records = list(state?.player?.bossTrophyRecords).filter(entry => entry && typeof entry === 'object');
    const latest = records.slice().sort((a, b) => Number(b.earnedAt || 0) - Number(a.earnedAt || 0))[0] || null;
    const totalFound = records.reduce((sum, entry) => sum + Math.max(1, Math.floor(Number(entry.count) || 1)), 0);
    return {
      count: records.length,
      totalFound,
      latest
    };
  }
  function revisitSnapshot(state){
    const revisit = obj(state?.player?.revisitState);
    const trophy = obj(revisit.trophyEcho);
    const famous = obj(revisit.famousGear);
    const rival = obj(revisit.rivalTrace);
    return {
      trophy: {
        historyCount: list(trophy.history).length,
        completedCount: Object.keys(obj(trophy.completedKeys)).length,
        memoryMarks: Math.max(0, Math.floor(Number(trophy.memoryMarks) || 0)),
        lastResult: trophy.lastResult || null
      },
      famous: {
        historyCount: list(famous.history).length,
        completedCount: Object.keys(obj(famous.completedKeys)).length,
        lastResult: famous.lastResult || null
      },
      rival: {
        historyCount: list(rival.history).length,
        completedCount: Object.keys(obj(rival.completedKeys)).length,
        lastResult: rival.lastResult || null
      }
    };
  }
  function debtSnapshot(state){
    const debt = obj(state?.player?.debtCollector);
    const pressure = Math.max(0, Math.floor(Number(debt.pressure) || 0));
    return {
      balanceCopper: Math.max(0, Math.floor(Number(debt.balanceCopper) || 0)),
      pressure,
      status: debtStateLabel(debt),
      lastVisitAt: debt.lastVisitAt || '',
      notes: list(debt.notes).filter(Boolean).slice(0, 3)
    };
  }
  function safeSummaryLine(entry, fallback){
    return clean(entry?.summary || entry?.summaryLine || entry?.reflection || '', fallback);
  }
  function card(title, body, meta, tone){
    return `<article class="journal-card ${tone || ''}">
      <div class="split journal-card-head"><strong>${esc(title)}</strong><span class="pill">${esc(meta)}</span></div>
      <div class="small muted">${esc(body)}</div>
    </article>`;
  }
  function journalV1SummaryModel(state){
    const revisit = revisitSnapshot(state);
    const debt = debtSnapshot(state);
    const talent = talentNodes(state);
    const boss = bossRecords(state);
    const trophyLast = revisit.trophy.lastResult;
    const famousLast = revisit.famous.lastResult;
    const rivalLast = revisit.rival.lastResult;
    return {
      title: 'Journal',
      summary: 'A read-only ledger of what this account already remembers.',
      sections: [
        {
          key: 'revisit',
          title: 'Revisit',
          meta: `${fmt(revisit.trophy.historyCount + revisit.famous.historyCount + revisit.rival.historyCount)} records`,
          body: [
            `Trophy Echo: ${fmt(revisit.trophy.completedCount)} completed, ${fmt(revisit.trophy.memoryMarks)} Memory Marks.`,
            `Famous Gear Memory: ${fmt(revisit.famous.completedCount)} completed.`,
            `Rival Trace: ${fmt(revisit.rival.completedCount)} completed.`,
            trophyLast ? `Latest Trophy Echo: ${safeSummaryLine(trophyLast, 'No record yet')}` : 'Latest Trophy Echo: No record yet.',
            famousLast ? `Latest Famous Gear Memory: ${safeSummaryLine(famousLast, 'No record yet')}` : 'Latest Famous Gear Memory: No record yet.',
            rivalLast ? `Latest Rival Trace: ${safeSummaryLine(rivalLast, 'No record yet')}` : 'Latest Rival Trace: No record yet.'
          ].join(' ')
        },
        {
          key: 'debt',
          title: 'Debt',
          meta: debt.status,
          body: [
            `Status: ${debt.status}.`,
            debt.balanceCopper > 0 ? `Owed ${money(debt.balanceCopper)}.` : 'No debt due.',
            debt.pressure > 0 ? `Pressure ${debt.pressure}.` : 'Pressure is quiet.',
            debt.lastVisitAt ? `Last visit: ${clean(debt.lastVisitAt, '')}.` : 'Last visit: No record yet.',
            debt.notes.length ? `Recent notes: ${debt.notes.map(note => clean(note, '')).join(' | ')}.` : 'Recent notes: No records yet.'
          ].join(' ')
        },
        {
          key: 'talent',
          title: 'Talent',
          meta: `${fmt(talent.availablePoints)} available`,
          body: talent.learnedIds.length
            ? `Learned nodes: ${talent.learnedIds.join(', ')}. Hunter Board Clarity remains the controlled spend path; any second passive stays guarded if not already learned.`
            : 'No learned nodes recorded yet. Hunter Board Clarity remains the controlled spend path.'
        },
        {
          key: 'boss',
          title: 'Boss Progress',
          meta: `${fmt(boss.count)} records`,
          body: boss.latest
            ? `Latest boss record: ${clean(boss.latest.trophyName || boss.latest.bossName || boss.latest.name || 'Unknown boss', 'Unknown boss')} at ${timeText(boss.latest.earnedAt)}. Total found entries: ${fmt(boss.totalFound)}.`
            : 'No boss trophy records yet.'
        }
      ]
    };
  }
  function journalV1Markup(state){
    const model = journalV1SummaryModel(state);
    return `<section class="journal-v1-panel" aria-label="Journal v1">
      <div class="sep"></div>
      <div class="archive-history-head journal-v1-head">
        <div><h3>${esc(model.title)}</h3><p class="small muted">${esc(model.summary)}</p></div>
        <span class="pill">${esc(model.sections.length)} sections</span>
      </div>
      <div class="stack-6 journal-v1-stack">
        ${model.sections.map(section => card(section.title, section.body, section.meta, `journal-${section.key}`)).join('')}
      </div>
    </section>`;
  }
  function injectJournal(){
    const panel = document.getElementById('archivePanel');
    if (!panel || panel.querySelector('.journal-v1-panel')) return;
    const html = journalV1Markup(window.S || {});
    panel.insertAdjacentHTML('beforeend', html);
  }

  const originalRenderArchive = typeof window.renderArchive === 'function' ? window.renderArchive : null;
  if (originalRenderArchive) {
    window.renderArchive = function renderArchive(){
      originalRenderArchive.apply(this, arguments);
      injectJournal();
    };
  }

  window.DDJournalV1SummaryModel = journalV1SummaryModel;
  window.DDJournalV1Render = injectJournal;
  window.addEventListener('DOMContentLoaded', function(){ window.setTimeout(injectJournal, 0); });
  window.addEventListener('load', function(){ window.setTimeout(injectJournal, 50); });
})();
