'use strict';

// DungeonDex v1.26.3.02 - Build label guard.
// Keeps the visible title stable when older render helpers try to write stale labels.
(function(){
  if (window.DDBuildLabelGuard) return;
  window.DDBuildLabelGuard = true;

  const BUILD = '1.26.3.02';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.26.3.02-town-runtime-layer-cleanup';

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
      trophyEchoOnlyRevisit: window.__dungeondexRevisitTrophyEchoOnly === true ? 'installed' : 'missing',
      emberfallNotes: document.querySelector('#archivePanel h3') && Array.from(document.querySelectorAll('#archivePanel h3')).some(node => String(node.textContent || '').trim() === 'Emberfall Notes') ? 'visible' : 'hidden'
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
    hideEmberfallNotes();
    window.DUNGEONDEX_BUILD_HEALTH = healthCheck;
    installObserver();
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 50);
  window.setTimeout(install, 250);
})();