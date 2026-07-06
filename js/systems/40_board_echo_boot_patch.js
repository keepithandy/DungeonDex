'use strict';

// Board Echo boot patch: hydrate Board Echo before the first render/save pass and bind resolve clicks.
(function(){
  if (window.DDBoardEchoBootPatch) return;
  window.DDBoardEchoBootPatch = true;

  const STORAGE_KEY = 'dungeondex_emberfall_v109';

  function currentState(){
    try {
      if (typeof S !== 'undefined') return S;
    } catch (err) {}
    return window.S || {};
  }
  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function list(value){ return Array.isArray(value) ? value : []; }
  function num(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : Math.max(0, Math.floor(fallback));
  }
  function text(value, fallback = '', limit = 160){
    const raw = String(value || fallback || '').trim();
    const clean = typeof cleanDisplayText === 'function' ? cleanDisplayText(raw, fallback || '') : raw;
    return clean.slice(0, limit);
  }
  function esc(value){
    return typeof escapeHtml === 'function'
      ? escapeHtml(value)
      : String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }
  function ensureBoardEchoShape(state){
    if (!state || typeof state !== 'object') return null;
    if (!state.player || typeof state.player !== 'object') return null;
    if (!state.player.revisitState || typeof state.player.revisitState !== 'object') state.player.revisitState = {};
    const revisit = state.player.revisitState;
    const board = obj(revisit.boardEcho);
    board.active = obj(board.active);
    if (!Object.keys(board.active).length) board.active = null;
    board.history = list(board.history).filter(entry => entry && typeof entry === 'object').slice(0, 20);
    board.completedKeys = obj(board.completedKeys);
    board.lastResult = obj(board.lastResult);
    if (!Object.keys(board.lastResult).length) board.lastResult = null;
    revisit.boardEcho = board;
    return board;
  }

  function hydrateBoardEchoFromStoredSave(){
    const state = currentState();
    const board = ensureBoardEchoShape(state);
    if (!board || !window.localStorage) return false;
    let raw;
    try {
      raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (err) {
      return false;
    }
    const source = obj(raw?.player?.revisitState?.boardEcho);
    if (!Object.keys(source).length) return false;
    let changed = false;
    if (!board.active && source.active && typeof source.active === 'object') {
      board.active = { ...source.active };
      changed = true;
    }
    if (!board.history.length && Array.isArray(source.history) && source.history.length) {
      board.history = source.history.filter(entry => entry && typeof entry === 'object').slice(0, 20);
      changed = true;
    }
    Object.keys(obj(source.completedKeys)).forEach(key => {
      if (/^board_echo:[^:]+$/i.test(key) && board.completedKeys[key] !== source.completedKeys[key]) {
        board.completedKeys[key] = source.completedKeys[key] === true;
        changed = true;
      }
    });
    if (!board.lastResult && source.lastResult && typeof source.lastResult === 'object') {
      board.lastResult = { ...source.lastResult };
      changed = true;
    }
    if (changed && raw?.player?.revisitState?.activeRouteKey === 'board_echo_route') {
      state.player.revisitState.activeRouteKey = 'board_echo_route';
      state.player.revisitState.startedAt = num(raw.player.revisitState.startedAt, 0);
      state.player.revisitState.sourceFloor = num(raw.player.revisitState.sourceFloor, 0);
      state.player.revisitState.sideRoute = true;
      state.player.revisitState.unlocked = true;
      state.player.revisitState.locked = false;
      state.player.revisitState.cappedReward = true;
    }
    return changed;
  }

  function boardEchoStatus(){
    const state = currentState();
    return typeof window.DDBoardEchoStatus === 'function'
      ? window.DDBoardEchoStatus(state)
      : null;
  }

  function boardEchoCardMarkup(){
    const status = boardEchoStatus();
    if (!status) return '';
    const active = status.activeEcho || null;
    const result = status.lastResult || null;
    const sourceName = text(status.source?.contractName || active?.contractName || 'Board Contract', 'Board Contract', 80);
    const stateLabel = active ? 'Active' : status.completed ? 'Recovered' : status.locked ? 'Locked' : 'Playable';
    const cssState = active ? 'active' : status.completed ? 'completed' : status.locked ? 'locked' : 'ready';
    const summary = active
      ? text(active.summaryLine || `${sourceName} lingers on the board as a safe echo.`, `${sourceName} lingers on the board as a safe echo.`, 160)
      : status.completed
        ? `${sourceName} has already been recorded as a Board Echo.`
        : status.locked
          ? 'Locked until completed or claimed board history exists.'
          : 'Completed board history can be revisited as a safe memory lane.';
    const flavor = active
      ? text(active.reflection || '', '', 220)
      : status.locked
        ? 'The board is quiet. Finish a mark first, then the Guild can echo it safely.'
        : 'The old mark can be read from town. No combat, payout, debt, Talent, or board mission changes.';
    const action = active
      ? '<button class="primary" type="button" data-complete-board-echo="1">Resolve Board Echo</button>'
      : status.locked
        ? '<button class="ghost" type="button" disabled aria-disabled="true">Board Echo Locked</button>'
        : '<button class="primary" type="button" data-start-revisit="board_echo_route">Start Board Echo</button>';
    const resultMarkup = result
      ? `<div class="small revisit-echo-result"><strong>Last Result:</strong> ${esc(text(result.summary || '', '', 180))}</div>`
      : '';
    return `<article class="quest-card revisit-lane-card board-echo-card ${cssState}">
      <div class="quest-topline">
        <strong>Board Echo</strong>
        <span class="small ${active ? '' : 'muted'}">${esc(stateLabel)}</span>
      </div>
      <p class="small">${esc(summary)}</p>
      <p class="small muted">${esc(flavor)}</p>
      <div class="small muted">Board records ${num(status.historyCount, 0)} • Echoes recorded ${num(status.completedCount, 0)}</div>
      <div class="small muted">${active ? 'Active: resolve the board echo in town.' : status.completed ? 'Recovered: the board note stays readable after reload.' : status.locked ? 'Locked until board history exists.' : 'Playable: start Board Echo from town.'}</div>
      <div class="small muted">Board Echo reads old contract history only; it grants no rewards and opens no combat path.</div>
      ${active ? `<div class="small muted">Active Memory: ${esc(text(active.memoryTitle || sourceName, sourceName, 80))}</div>` : ''}
      <div class="inline-actions revisit-echo-actions">${action}</div>
      ${resultMarkup}
    </article>`;
  }

  function stripExistingBoardEcho(markup){
    return String(markup || '').replace(/<article class="quest-card revisit-lane-card board-echo-card[\s\S]*?<\/article>/, '');
  }

  function injectBoardEchoCard(markup){
    const cleanMarkup = stripExistingBoardEcho(markup);
    const card = boardEchoCardMarkup();
    if (!card) return cleanMarkup;
    const marker = '<article class="quest-card revisit-lane-card revisit-unfinished-lanes-card';
    const index = cleanMarkup.indexOf(marker);
    if (index >= 0) return cleanMarkup.slice(0, index) + card + cleanMarkup.slice(index);
    return cleanMarkup.replace('</section>', `${card}</section>`);
  }

  const previousMarkup = window.earlierDungeonRevisitMarkup;
  if (typeof previousMarkup === 'function') {
    window.earlierDungeonRevisitMarkup = function earlierDungeonRevisitMarkupBoardEchoBootPatch(){
      return injectBoardEchoCard(previousMarkup.apply(this, arguments));
    };
  }

  document.addEventListener('click', function(event){
    const button = event.target && event.target.closest ? event.target.closest('[data-complete-board-echo]') : null;
    if (!button) return;
    event.preventDefault();
    const run = typeof runGuardedAction === 'function' ? runGuardedAction : fn => fn();
    run(function(){
      if (typeof window.completeBoardEchoRoute !== 'function') return;
      window.completeBoardEchoRoute(currentState());
      if (typeof render === 'function') render();
      else if (typeof window.render === 'function') window.render();
    });
  });

  hydrateBoardEchoFromStoredSave();
})();
