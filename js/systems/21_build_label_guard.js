'use strict';

// DungeonDex v1.4.9b — Build label guard.
// Keeps the visible title stable when older render helpers try to write stale labels.
(function(){
  if (window.DDBuildLabelGuard) return;
  window.DDBuildLabelGuard = true;

  const BUILD = '1.4.9b';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.4.9b-interface-density-cleanup';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;

  function syncBuildLabel(){
    const tag = document.getElementById('buildTag');
    if (tag && tag.textContent !== LABEL) tag.textContent = LABEL;
    if (document.title !== LABEL) document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
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
    installObserver();
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 50);
  window.setTimeout(install, 250);
  window.setTimeout(install, 1000);
})();
