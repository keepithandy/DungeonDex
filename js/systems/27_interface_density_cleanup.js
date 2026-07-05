'use strict';

// Emergency render recovery guard.
// This file intentionally does not inject CSS, hide panels, or wrap Gear/Talent UI.
(function(){
  window.DDInterfaceDensityCleanup = true;

  function safeCall(fn){
    try { if (typeof fn === 'function') return fn(); }
    catch (err) { console.warn('DungeonDex emergency recovery skipped:', err); }
    return undefined;
  }

  function getState(){
    try { return typeof S !== 'undefined' ? S : null; }
    catch (_) { return null; }
  }

  function setScreen(screen){
    const state = getState();
    if (!state) return;
    state.screen = screen;
    document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
    document.querySelectorAll('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === screen));
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.toggle('run-focus', screen === 'run');
      shell.classList.toggle('combat-active', screen === 'run' && state.run && state.run.active);
    }
  }

  function ensureVisibleScreen(){
    const state = getState();
    if (!state) return;
    const desired = state.run && state.run.active ? 'run' : (state.screen || 'town');
    const target = document.getElementById(`screen-${desired}`) ? desired : 'town';
    const activeScreens = Array.from(document.querySelectorAll('.screen.active'));
    if (state.screen !== target || activeScreens.length !== 1 || activeScreens[0]?.id !== `screen-${target}`) {
      setScreen(target);
    }
  }

  function activeScreenHasVisibleContent(){
    const active = document.querySelector('.screen.active');
    if (!active) return false;
    return (active.textContent || '').replace(/\s+/g, ' ').trim().length > 0;
  }

  function forceRunRenderIfNeeded(){
    const state = getState();
    if (!state || !state.run || !state.run.active) return;
    setScreen('run');
    safeCall(() => typeof renderRun === 'function' && renderRun());
    safeCall(() => typeof renderStickyBar === 'function' && renderStickyBar());
    safeCall(() => typeof bindCombatActions === 'function' && bindCombatActions());
  }

  function recoverVisibleGame(){
    const state = getState();
    if (!state) return;
    if (state.run && state.run.active) state.screen = 'run';
    safeCall(() => typeof hideIntroModal === 'function' && hideIntroModal());
    safeCall(() => typeof render === 'function' && render());
    ensureVisibleScreen();
    forceRunRenderIfNeeded();
    if (!activeScreenHasVisibleContent()) {
      forceRunRenderIfNeeded();
      ensureVisibleScreen();
    }
    safeCall(() => typeof bindDynamic === 'function' && bindDynamic());
  }

  function recoverAfterStart(){
    window.setTimeout(recoverVisibleGame, 0);
    window.setTimeout(recoverVisibleGame, 80);
    window.setTimeout(recoverVisibleGame, 240);
  }

  function installIntroRecovery(){
    const enter = document.getElementById('introModalEnterDungeonBtn');
    if (enter && !enter.dataset.ddIntroRecovery) {
      enter.dataset.ddIntroRecovery = '1';
      enter.addEventListener('click', recoverAfterStart, false);
    }
    const cont = document.getElementById('introModalContinueRunBtn');
    if (cont && !cont.dataset.ddIntroRecovery) {
      cont.dataset.ddIntroRecovery = '1';
      cont.addEventListener('click', recoverAfterStart, false);
    }
    const townStart = document.getElementById('startRunBtn');
    if (townStart && !townStart.dataset.ddIntroRecovery) {
      townStart.dataset.ddIntroRecovery = '1';
      townStart.addEventListener('click', recoverAfterStart, false);
    }
    const idleStart = document.getElementById('runFromIdleBtn');
    if (idleStart && !idleStart.dataset.ddIntroRecovery) {
      idleStart.dataset.ddIntroRecovery = '1';
      idleStart.addEventListener('click', recoverAfterStart, false);
    }
  }

  function install(){
    ensureVisibleScreen();
    installIntroRecovery();
    forceRunRenderIfNeeded();
  }

  const oldBindIntro = window.bindIntroModalActions || globalThis.bindIntroModalActions;
  if (typeof oldBindIntro === 'function' && !oldBindIntro.__ddEmergencyRecovery) {
    const wrapped = function(){
      const result = oldBindIntro.apply(this, arguments);
      installIntroRecovery();
      return result;
    };
    wrapped.__ddEmergencyRecovery = true;
    try { window.bindIntroModalActions = wrapped; } catch (_) {}
    try { globalThis.bindIntroModalActions = wrapped; } catch (_) {}
  }

  const oldRender = window.render || globalThis.render;
  if (typeof oldRender === 'function' && !oldRender.__ddEmergencyRecovery) {
    const wrappedRender = function(){
      const result = oldRender.apply(this, arguments);
      ensureVisibleScreen();
      forceRunRenderIfNeeded();
      installIntroRecovery();
      return result;
    };
    wrappedRender.__ddEmergencyRecovery = true;
    try { window.render = wrappedRender; } catch (_) {}
    try { globalThis.render = wrappedRender; } catch (_) {}
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 100);
  window.setTimeout(install, 400);
  window.setTimeout(install, 1000);
})();
