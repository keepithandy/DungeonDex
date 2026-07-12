'use strict';

// Hidden DevKit gesture: hold Reset for 4 seconds to open the internal DevTools overlay.
(function(){
  if (!window.DUNGEONDEX_DEVTOOLS_ENABLED) return;
  if (window.DDDevKitResetHold) return;
  window.DDDevKitResetHold = true;

  const HOLD_MS = 4000;
  const SUPPRESS_CLICK_MS = 900;
  let holdTimer = 0;
  let suppressResetClickUntil = 0;

  function now(){
    return Date.now();
  }

  function clearHold(){
    if (holdTimer) window.clearTimeout(holdTimer);
    holdTimer = 0;
  }

  function openDevKit(attemptsLeft = 8){
    const api = window.DungeonDexDevTools;
    if (api && typeof api.enable === 'function') {
      api.enable();
      if (typeof api.refresh === 'function') api.refresh();
      return true;
    }
    if (attemptsLeft > 0) {
      window.setTimeout(function(){ openDevKit(attemptsLeft - 1); }, 125);
    }
    return false;
  }

  function bindResetHold(){
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn || resetBtn.__ddDevKitResetHoldBound) return;
    resetBtn.__ddDevKitResetHoldBound = true;
    resetBtn.setAttribute('data-devkit-hold', '4s');
    resetBtn.title = resetBtn.title || 'Hold 4 seconds for DevKit';

    resetBtn.addEventListener('pointerdown', function(event){
      if (event && event.button != null && event.button !== 0) return;
      clearHold();
      holdTimer = window.setTimeout(function(){
        holdTimer = 0;
        suppressResetClickUntil = now() + SUPPRESS_CLICK_MS;
        openDevKit();
      }, HOLD_MS);
    });

    resetBtn.addEventListener('pointerup', clearHold);
    resetBtn.addEventListener('pointerleave', clearHold);
    resetBtn.addEventListener('pointercancel', clearHold);
    resetBtn.addEventListener('blur', clearHold);

    resetBtn.addEventListener('click', function(event){
      if (now() > suppressResetClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressResetClickUntil = 0;
    }, true);
  }

  function init(){
    bindResetHold();
    window.setTimeout(bindResetHold, 500);
    window.setTimeout(bindResetHold, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
