'use strict';

// Screen/run shell recovery and ID helpers
  function normalizeScreenName(screen, fallback = 'town') {
    return VALID_SCREENS.includes(screen) ? screen : fallback;
  }
  function ensureRunShell(state) {
    if (!state) return {};
    if (!isPlainObject(state.run)) state.run = {};
    state.run.combatLog = asArray(state.run.combatLog, []);
    state.run.choices = asArray(state.run.choices, []);
    state.run.pendingRewards = createPendingRunRewards(state.run.pendingRewards);
    return state.run;
  }
  function hasActiveCombat(state) {
    return !!(state?.run?.active && state.run.monster && state?.player && numberOr(state.player.hp, 0, 0, Number.MAX_SAFE_INTEGER) > 0);
  }
  function recoverRunToTown(state, message = '') {
    if (!state) return false;
    ensureRunShell(state);
    state.run.active = false;
    state.run.monster = null;
    state.run.choices = [];
    state.run.chain = 0;
    state.run.goldBonusPct = 0;
    state.run.startedFromCharter = false;
    state.run.charterStartFloor = 0;
    clearPendingRunRewards(state);
    state.screen = 'town';
    if (message && state.player) pushLog(state, message);
    return true;
  }
  function continueRun(state) {
    if (hasActiveCombat(state)) {
      state.screen = 'run';
      return true;
    }
    if (state?.run?.active) {
      recoverRunToTown(state, 'Recovered from an incomplete active descent and returned to Lowfire.');
    } else if (state) {
      state.screen = 'town';
    }
    return false;
  }
  function makeId(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint32Array(2);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    return `${prefix}_${Date.now().toString(36)}_${(bytes[0] || Math.random() * 1e9).toString(36)}_${(bytes[1] || Math.random() * 1e9).toString(36)}`;
  }