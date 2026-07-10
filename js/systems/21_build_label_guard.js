'use strict';

// DungeonDex v1.25.1 - Build label guard.
// Keeps the visible title stable when older render helpers try to write stale labels.
(function(){
  if (window.DDBuildLabelGuard) return;
  window.DDBuildLabelGuard = true;

  const BUILD = '1.25.1';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.25.1-mobile-side-rail-toggle';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;
  window.DUNGEONDEX_VISIBLE_LABEL = LABEL;

  function syncBuildLabel(){
    const tag = document.getElementById('buildTag');
    if (tag && tag.textContent !== LABEL) tag.textContent = LABEL;
    if (document.title !== LABEL) document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
  }

  function hideEmberfallNotes(){
    const panel = document.getElementById('archivePanel');
    if (!panel) return;
    const headings = Array.from(panel.querySelectorAll('h3')).filter(node => String(node.textContent || '').trim() === 'Emberfall Notes');
    headings.forEach(heading => {
      const list = heading.nextElementSibling && heading.nextElementSibling.classList && heading.nextElementSibling.classList.contains('archive-log-list')
        ? heading.nextElementSibling
        : null;
      const separator = heading.previousElementSibling && heading.previousElementSibling.classList && heading.previousElementSibling.classList.contains('sep')
        ? heading.previousElementSibling
        : null;
      if (list) list.remove();
      if (separator) separator.remove();
      heading.remove();
    });
  }

  function installHiddenRevisitPreviewMetadata(){
    if (typeof window.DDJournalV1SummaryModel !== 'function' || window.DDJournalV1SummaryModel.__ddHiddenPreviewMetadata) return;
    const original = window.DDJournalV1SummaryModel;
    window.DDJournalV1SummaryModel = function ddJournalSummaryWithHiddenPreviewMetadata(state){
      const model = original(state) || {};
      const sections = Array.isArray(model.sections) ? model.sections.slice() : [];
      const api = window.DungeonDexEliteContracts || null;
      const lanes = typeof api?.revisitLaneStatusClarity === 'function' ? api.revisitLaneStatusClarity(state) : [];
      const unfinished = Array.isArray(lanes) ? lanes.filter(lane => lane && lane.bucket !== 'finished') : [];
      const board = unfinished.find(lane => lane.key === 'board_echo_route') || null;
      const debt = unfinished.find(lane => lane.key === 'debt_pressure_route') || null;
      const hasPreviewRows = board || debt;
      if (hasPreviewRows && !sections.some(section => section && section.key === 'lanes')) {
        const boardText = board
          ? `${board.title || 'Board Echo'} ${board.shortLabel || 'Planned'}. This lane is not playable yet. ${board.detailText || ''} ${board.nextStepText || ''}`
          : 'Board Echo Planned. This lane is not playable yet.';
        const debtText = debt
          ? `${debt.title || 'Debt Pressure'} ${debt.shortLabel || 'Locked'}. This lane is not playable yet. ${debt.detailText || 'Future ledger pressure remains preview-only.'} ${debt.nextStepText || ''}`
          : 'Debt Pressure Locked. This lane is not playable yet. Future ledger pressure remains preview-only.';
        sections.push({
          key: 'lanes',
          title: 'Unfinished Lanes',
          body: `${boardText} • ${debtText}`,
          meta: 'Hidden from the active Guild Journal. Board Echo and Debt Pressure stay preview-only; future ledger pressure remains internal until activation.',
          hidden: true,
          previewOnly: true
        });
      }
      return {
        ...model,
        sections,
        debtPreviewText: model.debtPreviewText || (debt ? `${debt.title || 'Debt Pressure'} preview is read-only and not playable yet.` : '')
      };
    };
    window.DDJournalV1SummaryModel.__ddHiddenPreviewMetadata = true;
  }

  function healthCheck(){
    const tag = document.getElementById('buildTag');
    const visible = tag ? String(tag.textContent || '').trim() : '';
    const cacheQuery = window.DUNGEONDEX_BUILD_QS || BUILD_QS;
    return {
      build: BUILD,
      expectedLabel: LABEL,
      visibleLabel: visible,
      cacheQuery,
      cacheHealth: visible === LABEL && cacheQuery === BUILD_QS ? 'current' : 'mismatch',
      emberfallNotes: document.querySelector('#archivePanel h3') && Array.from(document.querySelectorAll('#archivePanel h3')).some(node => String(node.textContent || '').trim() === 'Emberfall Notes') ? 'visible' : 'hidden',
      hiddenRevisitPreviewMetadata: typeof window.DDJournalV1SummaryModel === 'function' && window.DDJournalV1SummaryModel.__ddHiddenPreviewMetadata ? 'installed' : 'missing'
    };
  }

  function installObserver(){
    const tag = document.getElementById('buildTag');
    if (tag && !tag.__ddBuildLabelObserved) {
      tag.__ddBuildLabelObserved = true;
      const observer = new MutationObserver(syncBuildLabel);
      observer.observe(tag, { childList:true, characterData:true, subtree:true });
    }

    if (document.body && !document.body.__ddEmberfallNotesObserved) {
      document.body.__ddEmberfallNotesObserved = true;
      const observer = new MutationObserver(hideEmberfallNotes);
      observer.observe(document.body, { childList:true, subtree:true });
    }
  }

  function install(){
    syncBuildLabel();
    installHiddenRevisitPreviewMetadata();
    hideEmberfallNotes();
    window.DUNGEONDEX_BUILD_HEALTH = healthCheck;
    installObserver();
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 50);
  window.setTimeout(install, 250);
  window.setTimeout(install, 1000);
})();