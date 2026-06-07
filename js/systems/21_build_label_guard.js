'use strict';

// DungeonDex v1.6.5 - Build label guard.
// Keeps the visible title stable when older render helpers try to write stale labels.
(function(){
  if (window.DDBuildLabelGuard) return;
  window.DDBuildLabelGuard = true;

  const BUILD = '1.6.5';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.6.5-retired-item-manual-archive-action';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;
  window.DUNGEONDEX_VISIBLE_LABEL = LABEL;

  function syncBuildLabel(){
    const tag = document.getElementById('buildTag');
    if (tag && tag.textContent !== LABEL) tag.textContent = LABEL;
    if (document.title !== LABEL) document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
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
      cacheHealth: visible === LABEL && cacheQuery === BUILD_QS ? 'current' : 'mismatch'
    };
  }

  function wrap(name){
    const fn = window[name] || globalThis[name];
    if (typeof fn !== 'function' || fn.__ddBuildGuarded) return;
    const guarded = function(){
      const result = fn.apply(this, arguments);
      syncBuildLabel();
      return result;
    };
    guarded.__ddBuildGuarded = true;
    try { window[name] = guarded; } catch (_) {}
    try { globalThis[name] = guarded; } catch (_) {}
  }

  function installObserver(){
    const tag = document.getElementById('buildTag');
    if (!tag || tag.__ddBuildLabelObserved) return;
    tag.__ddBuildLabelObserved = true;
    const observer = new MutationObserver(syncBuildLabel);
    observer.observe(tag, { childList:true, characterData:true, subtree:true });
  }

  function install(){
    wrap('renderStatBoxes');
    wrap('syncScreenState');
    wrap('switchScreen');
    wrap('render');
    syncBuildLabel();
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
