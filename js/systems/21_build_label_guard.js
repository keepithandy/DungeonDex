'use strict';

// DungeonDex v1.23.8.04 - Build label guard and temporary Journal surface lock.
// Keeps the visible title stable and removes Archive/Journal from the active player loop without deleting data.
(function(){
  if (window.DDBuildLabelGuard) return;
  window.DDBuildLabelGuard = true;

  const BUILD = '1.23.8.04';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.23.8.04-gear-replacement-ownership-clarity';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;
  window.DUNGEONDEX_VISIBLE_LABEL = LABEL;
  window.DDJOURNAL_SURFACE_DISABLED = true;

  function syncBuildLabel(){
    const tag = document.getElementById('buildTag');
    if (tag && tag.textContent !== LABEL) tag.textContent = LABEL;
    if (document.title !== LABEL) document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
  }

  function disableNode(node){
    if (!node) return;
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
    node.classList.remove('active');
    node.style.display = 'none';
    if ('disabled' in node) node.disabled = true;
    if ('tabIndex' in node) node.tabIndex = -1;
  }

  function activateFallbackScreen(){
    const currentScreen = (typeof S !== 'undefined' && S && S.screen && S.screen !== 'archive') ? S.screen : 'gear';
    if (typeof S !== 'undefined' && S && S.screen === 'archive') S.screen = currentScreen;
    const safeScreen = currentScreen === 'archive' ? 'gear' : currentScreen;
    document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${safeScreen}`));
    document.querySelectorAll('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === safeScreen));
  }

  function syncJournalSurface(){
    const archiveTab = document.getElementById('tab-archive');
    const archiveScreen = document.getElementById('screen-archive');
    const archiveWasActive = !!(archiveScreen && archiveScreen.classList.contains('active')) || !!(archiveTab && archiveTab.classList.contains('active')) || (typeof S !== 'undefined' && S && S.screen === 'archive');

    disableNode(archiveTab);
    disableNode(archiveScreen);

    document.querySelectorAll('#guildJournalPanel, .journal-board').forEach(disableNode);
    document.querySelectorAll('#retireArchiveBtn, [data-retire], .retire-item-btn').forEach(disableNode);

    const inventorySubline = document.querySelector('.inventory-subline');
    if (inventorySubline && /retire/i.test(inventorySubline.textContent || '')) inventorySubline.textContent = 'Equip, sell, or filter.';

    if (archiveWasActive) activateFallbackScreen();
  }

  function installScreenRedirect(){
    if (typeof window.switchScreen !== 'function' || window.switchScreen.__ddJournalSurfaceLocked) return;
    const originalSwitchScreen = window.switchScreen;
    window.switchScreen = function journalSurfaceLockedSwitch(screen){
      return originalSwitchScreen.call(this, screen === 'archive' ? 'gear' : screen);
    };
    window.switchScreen.__ddJournalSurfaceLocked = true;
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
      journalSurface: window.DDJOURNAL_SURFACE_DISABLED ? 'hidden' : 'visible'
    };
  }

  function installObserver(){
    const tag = document.getElementById('buildTag');
    if (tag && !tag.__ddBuildLabelObserved) {
      tag.__ddBuildLabelObserved = true;
      const observer = new MutationObserver(syncBuildLabel);
      observer.observe(tag, { childList:true, characterData:true, subtree:true });
    }

    if (document.body && !document.body.__ddJournalSurfaceObserved) {
      document.body.__ddJournalSurfaceObserved = true;
      const observer = new MutationObserver(syncJournalSurface);
      observer.observe(document.body, { childList:true, subtree:true });
    }
  }

  function install(){
    syncBuildLabel();
    installScreenRedirect();
    syncJournalSurface();
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