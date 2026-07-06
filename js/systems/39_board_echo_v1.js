'use strict';

// Board Echo v1: safe town memory lane sourced from existing Elite Board history.
(function(){
  if (window.DDBoardEchoV1) return;
  window.DDBoardEchoV1 = true;

  const STORAGE_KEY = 'dungeondex_emberfall_v109';
  const originalCanStart = window.canStartRevisitRoute;
  const originalStart = window.startRevisitRoute;
  const originalActiveSummary = window.activeRevisitRouteSummary;
  const originalRevisitMarkup = window.earlierDungeonRevisitMarkup;
  const originalBindDynamic = window.bindDynamic;

  function obj(value){ return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function list(value){ return Array.isArray(value) ? value : []; }
  function num(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : Math.max(0, Math.floor(fallback));
  }
  function text(value, fallback = '', limit = 140){
    const raw = String(value || fallback || '').trim();
    const clean = typeof cleanDisplayText === 'function' ? cleanDisplayText(raw, fallback || '') : raw;
    return clean.slice(0, limit);
  }
  function esc(value){
    return typeof escapeHtml === 'function'
      ? escapeHtml(value)
      : String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }
  function push(state, message){ if (typeof pushLog === 'function') pushLog(state, message); }

  function boardEchoDefaultState(){
    return { active:null, history:[], completedKeys:{}, lastResult:null };
  }

  function ensureBoardEchoState(state){
    if (!state || typeof state !== 'object') return boardEchoDefaultState();
    if (!state.player || typeof state.player !== 'object') state.player = {};
    if (!state.player.revisitState || typeof state.player.revisitState !== 'object') state.player.revisitState = {};
    const revisit = state.player.revisitState;
    const board = obj(revisit.boardEcho);
    board.active = obj(board.active);
    if (!Object.keys(board.active).length) board.active = null;
    board.history = list(board.history).filter(entry => entry && typeof entry === 'object').slice(0, 20);
    board.completedKeys = obj(board.completedKeys);
    Object.keys(board.completedKeys).forEach(key => {
      if (!/^board_echo:[^:]+$/i.test(String(key || '').trim())) delete board.completedKeys[key];
      else board.completedKeys[key] = board.completedKeys[key] === true;
    });
    board.lastResult = obj(board.lastResult);
    if (!Object.keys(board.lastResult).length) board.lastResult = null;
    revisit.boardEcho = board;
    return board;
  }

  function boardContractDefinition(id){
    try {
      if (typeof eliteContractDef === 'function') return eliteContractDef(id);
    } catch (err) {}
    return null;
  }

  function boardEchoRecordId(raw, kind, index){
    const clean = text(raw.recordId || raw.id || raw.contractId || raw.sourceContractId || raw.name || '', '', 80)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return clean || `${kind}_${index}`;
  }

  function boardEchoSourceRecords(state){
    const contracts = obj(state?.player?.eliteContracts);
    const records = [];
    const seen = new Set();

    function add(rawValue, kind, index){
      const raw = typeof rawValue === 'string' ? { id: rawValue, contractId: rawValue } : obj(rawValue);
      const contractId = text(raw.contractId || raw.sourceContractId || raw.id || '', '', 80);
      const def = boardContractDefinition(contractId);
      const recordId = boardEchoRecordId({ ...raw, id: raw.id || contractId }, kind, index);
      if (!recordId || seen.has(recordId)) return;
      seen.add(recordId);
      const contractName = text(raw.name || raw.title || def?.name || def?.title || contractId || 'Board Contract', 'Board Contract', 80);
      records.push({
        recordId,
        contractId,
        contractName,
        eliteName: text(raw.eliteName || def?.eliteName || contractName, contractName, 80),
        district: text(raw.district || def?.district || raw.floorName || 'Lowfire Board', 'Lowfire Board', 80),
        status: text(raw.status || kind, kind, 40),
        sourceLabel: kind === 'claimed' || kind === 'completed' ? 'Completed Board Record' : kind === 'failed' ? 'Failed Board Record' : 'Expired Board Record',
        targetFloor: num(raw.targetFloor || def?.targetFloor || 0, 0),
        updatedAt: num(raw.completedAt || raw.claimedAt || raw.updatedAt || raw.createdAt || 0, 0)
      });
    }

    list(contracts.claimed).forEach((id, index) => add(id, 'claimed', index));
    list(contracts.completed).forEach((id, index) => add(id, 'completed', index));
    list(contracts.failed).forEach((entry, index) => add(entry, 'failed', index));
    list(contracts.expired).forEach((entry, index) => add(entry, 'expired', index));

    return records
      .sort((left, right) => num(right.updatedAt, 0) - num(left.updatedAt, 0) || left.recordId.localeCompare(right.recordId))
      .slice(0, 12);
  }

  function boardEchoCompletionKey(source){
    const id = text(source?.recordId || source?.contractId || '', '', 80);
    return id ? `board_echo:${id}` : '';
  }

  function createBoardEchoReflection(source){
    const contractName = text(source?.contractName || 'Board Contract', 'Board Contract', 80);
    const eliteName = text(source?.eliteName || contractName, contractName, 80);
    const district = text(source?.district || 'Lowfire Board', 'Lowfire Board', 80);
    return {
      memoryTitle: `${contractName} Echo`,
      summaryLine: `${contractName} lingers on the board as a safe echo.`,
      reflection: `${eliteName} returns as a board-memory from ${district}. You read the old mark, keep the payout closed, and leave combat, debt, Talent, economy, and board progression unchanged.`
    };
  }

  function boardEchoStatusModel(state){
    const board = ensureBoardEchoState(state);
    const records = boardEchoSourceRecords(state);
    const active = board.active && typeof board.active === 'object' ? board.active : null;
    const completedCount = Object.keys(board.completedKeys || {}).filter(key => /^board_echo:[^:]+$/i.test(String(key || '').trim()) && board.completedKeys[key] === true).length;
    const source = active
      ? records.find(entry => entry.recordId === active.sourceRecordId) || active
      : records[0] || null;
    return {
      routeKey: 'board_echo_route',
      historyCount: records.length,
      completedCount,
      locked: records.length <= 0 && !active,
      available: records.length > 0,
      active: !!active,
      completed: !active && (completedCount > 0 || board.history.length > 0),
      source,
      activeEcho: active,
      lastResult: board.lastResult || null
    };
  }

  function startBoardEchoRoute(state){
    if (!state?.player) return null;
    const revisit = state.player.revisitState || (state.player.revisitState = {});
    const board = ensureBoardEchoState(state);
    if (board.active || String(revisit.activeRouteKey || '').trim()) return null;
    const status = boardEchoStatusModel(state);
    const source = status.source;
    if (!source || status.locked) return null;
    const completionKey = boardEchoCompletionKey(source);
    if (!completionKey) return null;
    const reflection = createBoardEchoReflection(source);
    const startedAt = Date.now();
    board.active = {
      routeKey: 'board_echo_route',
      completionKey,
      sourceRecordId: text(source.recordId || '', '', 80),
      contractId: text(source.contractId || '', '', 80),
      contractName: text(source.contractName || 'Board Contract', 'Board Contract', 80),
      eliteName: text(source.eliteName || 'Board Mark', 'Board Mark', 80),
      district: text(source.district || 'Lowfire Board', 'Lowfire Board', 80),
      memoryTitle: reflection.memoryTitle,
      reflection: reflection.reflection,
      summaryLine: reflection.summaryLine,
      sourceLabel: text(source.sourceLabel || 'Completed Board Record', 'Completed Board Record', 80),
      sourceFloor: num(source.targetFloor, 0),
      startedAt
    };
    board.lastResult = null;
    revisit.activeRouteKey = 'board_echo_route';
    revisit.startedAt = startedAt;
    revisit.sourceFloor = board.active.sourceFloor;
    revisit.sideRoute = true;
    revisit.unlocked = true;
    revisit.locked = false;
    revisit.cappedReward = true;
    revisit.lastViewedAt = new Date(startedAt).toLocaleString();
    push(state, `Board Echo started: ${board.active.contractName}.`);
    return {
      routeKey: 'board_echo_route',
      routeTitle: 'Board Echo Route',
      startedAt,
      sourceFloor: board.active.sourceFloor,
      sideRoute: true,
      locked: false,
      cappedReward: true,
      sourceRecordId: board.active.sourceRecordId,
      contractName: board.active.contractName
    };
  }

  function completeBoardEchoRoute(state){
    if (!state?.player) return null;
    const revisit = state.player.revisitState || {};
    const board = ensureBoardEchoState(state);
    const active = board.active && typeof board.active === 'object' ? board.active : null;
    if (!active || String(revisit.activeRouteKey || '').trim() !== 'board_echo_route') return null;
    const completionKey = text(active.completionKey || boardEchoCompletionKey(active), '', 80);
    if (!/^board_echo:[^:]+$/i.test(completionKey)) return null;
    const firstCompletion = board.completedKeys[completionKey] !== true;
    board.completedKeys[completionKey] = true;
    const completedAt = Date.now();
    const summary = firstCompletion
      ? `${active.contractName} settles into the Guild Journal. Board Echo recorded.`
      : `${active.contractName} echoes again, but its board memory was already recorded.`;
    const result = {
      completionKey,
      sourceRecordId: text(active.sourceRecordId || '', '', 80),
      contractId: text(active.contractId || '', '', 80),
      contractName: text(active.contractName || 'Board Contract', 'Board Contract', 80),
      eliteName: text(active.eliteName || 'Board Mark', 'Board Mark', 80),
      district: text(active.district || 'Lowfire Board', 'Lowfire Board', 80),
      memoryTitle: text(active.memoryTitle || 'Board Echo', 'Board Echo', 80),
      reflection: text(active.reflection || '', '', 220),
      summary,
      sourceLabel: text(active.sourceLabel || 'Completed Board Record', 'Completed Board Record', 80),
      sourceFloor: num(active.sourceFloor, 0),
      startedAt: num(active.startedAt, 0),
      completedAt
    };
    board.history.unshift(result);
    board.history = board.history.slice(0, 20);
    board.lastResult = result;
    board.active = null;
    revisit.activeRouteKey = '';
    revisit.startedAt = 0;
    revisit.sourceFloor = 0;
    revisit.sideRoute = false;
    revisit.unlocked = true;
    revisit.locked = false;
    revisit.lastViewedAt = new Date(completedAt).toLocaleString();
    push(state, summary);
    return result;
  }

  function boardEchoResultSummary(state){
    return ensureBoardEchoState(state).lastResult || null;
  }

  function hydrateBoardEchoFromStorage(state){
    if (!state?.player || !window.localStorage) return false;
    let raw;
    try {
      raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (err) {
      return false;
    }
    const source = obj(raw?.player?.revisitState?.boardEcho);
    if (!Object.keys(source).length) return false;
    const board = ensureBoardEchoState(state);
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

  function boardEchoCardMarkup(state){
    const status = boardEchoStatusModel(state);
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
      <div class="small muted">Board records ${status.historyCount} • Echoes recorded ${status.completedCount}</div>
      <div class="small muted">${active ? 'Active: resolve the board echo in town.' : status.completed ? 'Recovered: the board note stays readable after reload.' : status.locked ? 'Locked until board history exists.' : 'Playable: start Board Echo from town.'}</div>
      <div class="small muted">Board Echo reads old contract history only; it grants no rewards and opens no combat path.</div>
      ${active ? `<div class="small muted">Active Memory: ${esc(text(active.memoryTitle || sourceName, sourceName, 80))}</div>` : ''}
      <div class="inline-actions revisit-echo-actions">${action}</div>
      ${resultMarkup}
    </article>`;
  }

  function injectBoardEchoCard(markup, state){
    if (!markup || markup.indexOf('board-echo-card') !== -1) return markup;
    const card = boardEchoCardMarkup(state);
    const marker = '<article class="quest-card revisit-lane-card revisit-unfinished-lanes-card';
    const index = markup.indexOf(marker);
    if (index >= 0) return markup.slice(0, index) + card + markup.slice(index);
    return markup.replace('</section>', `${card}</section>`);
  }

  window.canStartRevisitRoute = function canStartRevisitRoutePatched(state, routeKey){
    if (String(routeKey || '').trim() === 'board_echo_route') {
      const status = boardEchoStatusModel(state);
      const revisit = obj(state?.player?.revisitState);
      return status.available === true && !status.active && String(revisit.activeRouteKey || '').trim() === '';
    }
    return typeof originalCanStart === 'function' ? originalCanStart(state, routeKey) : false;
  };

  window.startRevisitRoute = function startRevisitRoutePatched(state, routeKey){
    if (String(routeKey || '').trim() === 'board_echo_route') return startBoardEchoRoute(state);
    return typeof originalStart === 'function' ? originalStart(state, routeKey) : null;
  };

  window.completeBoardEchoRoute = completeBoardEchoRoute;

  window.activeRevisitRouteSummary = function activeRevisitRouteSummaryPatched(state){
    const revisit = obj(state?.player?.revisitState);
    if (String(revisit.activeRouteKey || '').trim() === 'board_echo_route') {
      const active = ensureBoardEchoState(state).active;
      if (!active) return null;
      return {
        routeKey: 'board_echo_route',
        routeTitle: 'Board Echo Route',
        district: text(active.district || 'Contract history districts', 'Contract history districts', 80),
        startedAt: num(revisit.startedAt || active.startedAt, 0),
        sourceFloor: num(revisit.sourceFloor || active.sourceFloor, 0),
        sideRoute: true,
        locked: false,
        cappedReward: true,
        memoryTitle: text(active.memoryTitle || 'Board Echo', 'Board Echo', 80),
        reflection: text(active.reflection || '', '', 220),
        summaryLine: text(active.summaryLine || '', '', 140),
        contractName: text(active.contractName || 'Board Contract', 'Board Contract', 80),
        eliteName: text(active.eliteName || '', '', 80)
      };
    }
    return typeof originalActiveSummary === 'function' ? originalActiveSummary(state) : null;
  };

  if (typeof originalRevisitMarkup === 'function') {
    window.earlierDungeonRevisitMarkup = function earlierDungeonRevisitMarkupPatched(){
      return injectBoardEchoCard(originalRevisitMarkup(), window.S || {});
    };
  }

  if (typeof originalBindDynamic === 'function') {
    window.bindDynamic = function bindDynamicPatched(){
      originalBindDynamic();
      document.querySelectorAll('[data-complete-board-echo]').forEach(btn => {
        btn.onclick = () => {
          const run = typeof runGuardedAction === 'function' ? runGuardedAction : fn => fn();
          run(() => {
            if (typeof window.completeBoardEchoRoute !== 'function') return;
            window.completeBoardEchoRoute(window.S || {});
            if (typeof window.render === 'function') window.render();
          });
        };
      });
    };
  }

  const api = window.DungeonDexEliteContracts || (window.DungeonDexEliteContracts = {});
  const originalLaneClarity = api.revisitLaneStatusClarity;
  const originalUnfinishedRows = api.revisitUnfinishedLaneTownRows;
  const originalRoutePreviews = api.revisitRoutePreviews;

  api.boardEchoStatus = boardEchoStatusModel;
  api.startBoardEcho = startBoardEchoRoute;
  api.completeBoardEcho = completeBoardEchoRoute;
  api.boardEchoResultSummary = boardEchoResultSummary;

  api.revisitLaneStatusClarity = function revisitLaneStatusClarityPatched(state){
    const lanes = typeof originalLaneClarity === 'function' ? originalLaneClarity.call(api, state) : [];
    const status = boardEchoStatusModel(state);
    const shortLabel = status.active ? 'Active' : status.completed ? 'Completed' : status.available ? 'Playable' : 'Locked';
    const boardLane = {
      key: 'board_echo_route',
      title: 'Board Echo Route',
      status: shortLabel,
      bucket: status.active || status.available ? 'playable' : status.completed ? 'finished' : 'planned',
      isPlayable: status.available || status.active,
      isFinished: status.completed,
      isPreview: false,
      isPlanned: !status.available && !status.active,
      isLocked: status.locked,
      shortLabel,
      detailText: status.locked
        ? 'Board Echo waits for completed or claimed board history.'
        : 'Board Echo can read existing board history as a safe town memory.',
      nextStepText: status.active ? 'Resolve the active Board Echo from town.' : status.available ? 'Start Board Echo from town.' : 'Complete a board mark to open this lane.',
      sourceLabel: 'board_echo'
    };
    const others = list(lanes).filter(lane => lane && lane.key !== 'board_echo_route');
    return others.concat(boardLane);
  };

  api.revisitUnfinishedLaneTownRows = function revisitUnfinishedLaneTownRowsPatched(state){
    const rows = typeof originalUnfinishedRows === 'function' ? originalUnfinishedRows.call(api, state) : [];
    return list(rows).filter(row => row && row.key !== 'board_echo_route');
  };

  api.revisitRoutePreviews = function revisitRoutePreviewsPatched(state){
    const routes = typeof originalRoutePreviews === 'function' ? originalRoutePreviews.call(api, state) : [];
    const status = boardEchoStatusModel(state);
    const boardRoute = {
      key: 'board_echo_route',
      title: 'Board Echo Route',
      district: 'Contract history districts',
      reason: status.locked ? 'Completed board history is needed before this lane can answer.' : 'Completed board history can answer as a safe town memory.',
      hooks: ['Board Echo'],
      status: status.active ? 'Active' : status.completed ? 'Recovered' : status.available ? 'Playable' : 'Locked',
      locked: status.locked,
      playable: status.available,
      active: status.active,
      completed: status.completed,
      readOnly: false,
      entryAvailable: status.available && !status.active,
      startAvailable: status.available && !status.active,
      enterAvailable: status.available && !status.active,
      completionAvailable: status.active,
      completeAvailable: status.active,
      claimAvailable: false,
      rewardAvailable: false,
      resultAvailable: !!status.lastResult,
      mutatesSave: true,
      priority: 40,
      hookSource: 'board_echo',
      shortDescription: 'Old board contracts echo as a safe town memory.',
      routeFlavorLine: 'Paid marks can still linger.',
      safetyStatusLine: status.active ? 'Active board echo in progress. Resolve it from town.' : status.available ? 'Playable. Start a safe Board Echo from town.' : 'Locked. Board history required.',
      lockedReadinessNote: status.locked ? 'Needs completed or claimed board history.' : 'Board history is ready.',
      readiness: status.active ? 'Active' : status.completed ? 'Recovered' : status.available ? 'Ready' : 'Faint Trace'
    };
    return list(routes).filter(route => route && route.key !== 'board_echo_route').concat(boardRoute);
  };

  window.DDBoardEchoStatus = boardEchoStatusModel;
  window.DDBoardEchoStart = startBoardEchoRoute;
  window.DDBoardEchoComplete = completeBoardEchoRoute;

  function install(){
    const hydrated = hydrateBoardEchoFromStorage(window.S || {});
    if (hydrated && typeof window.save === 'function') window.save(window.S);
    if (typeof window.render === 'function') window.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ window.setTimeout(install, 0); });
  else window.setTimeout(install, 0);
})();
