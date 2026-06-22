'use strict';

// DungeonDex v1.20.50 - First controlled Hunter Board Clarity spend.
(function(){
  if (window.DDTalentHunterBoardClaritySpend) return;
  window.DDTalentHunterBoardClaritySpend = true;

  const TARGET_NODE = 'hunter_board_clarity';
  const SPEND_COST = 1;
  const BUILD = '1.20.48-hunter-board-clarity-live-spend';

  function isPlainObject(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function safeInt(value, fallback = 0){
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.floor(number));
  }

  function cloneArray(value){
    return Array.isArray(value) ? value.map(entry => String(entry || '').trim()).filter(Boolean) : [];
  }

  function clonePlain(value){
    return isPlainObject(value) ? { ...value } : {};
  }

  function uniqueAppend(list, value){
    const clean = String(value || '').trim();
    const next = cloneArray(list).filter(entry => entry !== clean);
    if (clean) next.push(clean);
    return next;
  }

  function hasLearnedNode(player, nodeKey = TARGET_NODE){
    if (!isPlainObject(player)) return false;
    const learnedMap = clonePlain(player.talentLearnedIds);
    const unlockMap = clonePlain(player.talents?.unlocked);
    const spentMap = clonePlain(player.talents?.spent);
    const unlockIds = cloneArray(player.talentUnlockIds);
    const legacyIds = cloneArray(player.talents?.unlockedIds);
    return learnedMap[nodeKey] === true
      || unlockMap[nodeKey] === true
      || spentMap[nodeKey] === true
      || unlockIds.includes(nodeKey)
      || legacyIds.includes(nodeKey);
  }

  function spendableLedgerSnapshot(ledger){
    const lifetimePoints = safeInt(ledger?.lifetimePoints, 0);
    const spentPoints = safeInt(ledger?.spentPoints, 0);
    const availablePoints = safeInt(ledger?.availablePoints, 0);
    const remainingLifetime = Math.max(0, lifetimePoints - spentPoints);
    const effectiveAvailable = Math.min(availablePoints, remainingLifetime);
    return {
      lifetimePoints,
      spentPoints,
      availablePoints,
      effectiveAvailable
    };
  }

  function spendUiReadinessBase(state, nodeKey){
    const resolvedNodeKey = String(nodeKey || '').trim();
    const player = isPlainObject(state?.player) ? state.player : null;
    const ledger = isPlainObject(player?.talentLedger) ? player.talentLedger : null;
    const snapshot = spendableLedgerSnapshot(ledger || {});
    const preview = resolvedNodeKey === TARGET_NODE && typeof window.DungeonDexTalents?.hunterBoardClaritySpendPreview === 'function'
      ? window.DungeonDexTalents.hunterBoardClaritySpendPreview(state)
      : null;
    const learned = hasLearnedNode(player, TARGET_NODE);
    const malformed = !player || !ledger;
    const supported = resolvedNodeKey === TARGET_NODE;
    let blockedReason = 'unknown_node';
    let enabled = false;

    if (!supported) {
      blockedReason = 'unknown_node';
    } else if (malformed) {
      blockedReason = 'malformed_state';
    } else if (learned) {
      blockedReason = 'already_learned';
    } else if (snapshot.effectiveAvailable < SPEND_COST) {
      blockedReason = 'insufficient_points';
    } else if (!preview || preview.eligible !== true || preview.blockedReason !== 'ready') {
      blockedReason = 'preview_unavailable';
    } else {
      blockedReason = 'ready';
      enabled = true;
    }

    const actionLabel = 'Spend 1 Talent Point';
    return {
      version: 1,
      nodeKey: supported ? TARGET_NODE : resolvedNodeKey,
      supported,
      visible: supported,
      actionLabel,
      disabledLabel: 'Spend unavailable',
      enabled,
      blockedReason,
      cost: SPEND_COST,
      availablePoints: snapshot.effectiveAvailable,
      spentPoints: safeInt(snapshot.spentPoints, 0),
      lifetimePoints: safeInt(snapshot.lifetimePoints, 0),
      learned: learned,
      previewReady: !!preview,
      liveSpendPatchReady: !!preview && preview.liveSpendPatchReady === true,
      wouldMutateOnClick: true,
      mutatesDuringPreview: false,
      uiActionWired: false,
      clickHandlerEnabled: false,
      renderButtonNow: false
    };
  }

  function talentSpendUiReadinessModel(state, nodeKey){
    const resolvedNodeKey = String(nodeKey || '').trim();
    if (resolvedNodeKey !== TARGET_NODE) {
      return Object.freeze({
        version: 1,
        nodeKey: resolvedNodeKey,
        supported: false,
        visible: false,
        actionLabel: 'Spend 1 Talent Point',
        disabledLabel: 'Spend unavailable',
        enabled: false,
        blockedReason: resolvedNodeKey ? 'unknown_node' : 'malformed_state',
        cost: SPEND_COST,
        availablePoints: safeInt(state?.player?.talentLedger?.availablePoints, 0),
        spentPoints: safeInt(state?.player?.talentLedger?.spentPoints, 0),
        lifetimePoints: safeInt(state?.player?.talentLedger?.lifetimePoints, 0),
        learned: hasLearnedNode(state?.player, TARGET_NODE),
        previewReady: false,
        liveSpendPatchReady: false,
        wouldMutateOnClick: true,
        mutatesDuringPreview: false,
        uiActionWired: false,
        clickHandlerEnabled: false,
        renderButtonNow: false
      });
    }
    return Object.freeze(spendUiReadinessBase(state, TARGET_NODE));
  }

  function hunterBoardClaritySpendUiReadinessModel(state){
    return talentSpendUiReadinessModel(state, TARGET_NODE);
  }

  function blockedResult(reason, preview, snapshot){
    return {
      ok: false,
      status: 'blocked',
      blockedReason: reason || preview?.blockedReason || 'blocked',
      nodeKey: TARGET_NODE,
      cost: SPEND_COST,
      eligible: false,
      availableBefore: safeInt(snapshot?.effectiveAvailable, 0),
      availableAfter: safeInt(snapshot?.effectiveAvailable, 0),
      spentBefore: safeInt(snapshot?.spentPoints, 0),
      spentAfter: safeInt(snapshot?.spentPoints, 0),
      lifetimePoints: safeInt(snapshot?.lifetimePoints, 0),
      learnedStateWritten: false,
      passiveReady: false,
      passiveEnabled: false,
      mutatesSave: false,
      spendsPoints: false,
      learnsNode: false,
      enablesPassive: false,
      grantsCurrency: false,
      unlockUiEnabled: false,
      spendingUiEnabled: false,
      affectsCombat: false,
      affectsRewards: false,
      affectsEconomy: false,
      affectsDebt: false,
      affectsRevisit: false,
      affectedSurface: 'hunter_board'
    };
  }

  function patchPreview(api){
    if (!api || api.__ddHunterBoardClaritySpendPreviewPatched) return;
    const baseTalentSpendPreview = typeof api.talentSpendPreview === 'function' ? api.talentSpendPreview.bind(api) : null;
    const baseTalentSpendPreviewSummary = typeof api.talentSpendPreviewSummary === 'function' ? api.talentSpendPreviewSummary.bind(api) : null;

    api.talentSpendPreview = function(state, nodeKey){
      const preview = baseTalentSpendPreview
        ? baseTalentSpendPreview(state, nodeKey)
        : { nodeKey: String(nodeKey || '').trim(), eligible: false, blockedReason: 'missing_preview_helper' };
      if (String(nodeKey || '').trim() !== TARGET_NODE) return preview;
      return {
        ...preview,
        status: 'spend_preview',
        liveSpendPatchReady: true,
        controlledSpendHelper: 'applyHunterBoardClaritySpend',
        requiresLiveSpendPatch: false,
        mutatesSave: false,
        spendsPoints: false,
        learnsNode: false,
        notes: preview?.eligible === true
          ? ['Controlled spend helper is live. No Talent UI action is added.']
          : Array.isArray(preview?.notes) ? preview.notes.slice() : []
      };
    };

    api.talentSpendPreviewSummary = function(state, nodeKey){
      const summary = baseTalentSpendPreviewSummary
        ? baseTalentSpendPreviewSummary(state, nodeKey)
        : api.talentSpendPreview(state, nodeKey);
      if (String(nodeKey || '').trim() !== TARGET_NODE) return summary;
      const preview = api.talentSpendPreview(state, nodeKey);
      return Object.freeze({
        ...summary,
        liveSpendPatchReady: preview.liveSpendPatchReady === true,
        controlledSpendHelper: preview.controlledSpendHelper,
        requiresLiveSpendPatch: false,
        mutatesSave: false,
        spendsPoints: false,
        learnsNode: false
      });
    };

    api.hunterBoardClaritySpendPreview = function(state){
      return api.talentSpendPreview(state, TARGET_NODE);
    };

    api.hunterBoardClaritySpendPreviewSummary = function(state){
      return api.talentSpendPreviewSummary(state, TARGET_NODE);
    };

    api.__ddHunterBoardClaritySpendPreviewPatched = true;
  }

  function applyHunterBoardClaritySpend(state){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    const preview = api && typeof api.hunterBoardClaritySpendPreview === 'function'
      ? api.hunterBoardClaritySpendPreview(state)
      : null;
    const player = isPlainObject(state?.player) ? state.player : null;
    const ledger = isPlainObject(player?.talentLedger) ? player.talentLedger : null;
    const snapshot = spendableLedgerSnapshot(ledger || {});

    if (!api) return blockedResult('missing_talent_api', preview, snapshot);
    if (!player || !ledger) return blockedResult('malformed_state', preview, snapshot);
    if (!preview || preview.eligible !== true || preview.blockedReason !== 'ready') {
      return blockedResult(preview?.blockedReason || 'invalid_preview', preview, snapshot);
    }
    if (preview.nodeKey !== TARGET_NODE || safeInt(preview.cost, 0) !== SPEND_COST) {
      return blockedResult('invalid_preview', preview, snapshot);
    }
    if (hasLearnedNode(player, TARGET_NODE)) return blockedResult('already_learned', preview, snapshot);
    if (snapshot.effectiveAvailable < SPEND_COST) return blockedResult('insufficient_points', preview, snapshot);

    const learnedMap = clonePlain(player.talentLearnedIds);
    learnedMap[TARGET_NODE] = true;
    const unlockIds = uniqueAppend(player.talentUnlockIds, TARGET_NODE);
    const talentState = isPlainObject(player.talents) ? { ...player.talents } : {};
    const legacyUnlocked = clonePlain(talentState.unlocked);
    legacyUnlocked[TARGET_NODE] = true;
    const legacyUnlockIds = uniqueAppend(talentState.unlockedIds, TARGET_NODE);
    const newSpentPoints = snapshot.spentPoints + SPEND_COST;
    const newAvailablePoints = Math.max(0, snapshot.effectiveAvailable - SPEND_COST);
    const earnedSources = Array.isArray(ledger.earnedSources) && ledger.earnedSources.length
      ? ledger.earnedSources.map(source => isPlainObject(source) ? { ...source } : source).filter(Boolean)
      : [{ sourceId: 'boss_depth_milestone', points: snapshot.lifetimePoints }];
    const nextLedger = {
      ...ledger,
      version: Math.max(1, safeInt(ledger.version, 1)),
      previewOnly: true,
      unlocked: false,
      lifetimePoints: snapshot.lifetimePoints,
      availablePoints: newAvailablePoints,
      spentPoints: newSpentPoints,
      earnedSources,
      awardClaims: clonePlain(ledger.awardClaims),
      notes: cloneArray(ledger.notes)
    };

    player.talentLedger = nextLedger;
    player.talentLearnedIds = learnedMap;
    player.talentUnlockIds = unlockIds;
    player.talents = {
      ...talentState,
      unlocked: legacyUnlocked,
      spent: legacyUnlocked,
      unlockedIds: legacyUnlockIds
    };

    const passive = typeof api.hunterBoardClarityPassiveContract === 'function'
      ? api.hunterBoardClarityPassiveContract(state)
      : null;

    return {
      ok: true,
      status: 'spent',
      blockedReason: '',
      nodeKey: TARGET_NODE,
      cost: SPEND_COST,
      eligible: true,
      availableBefore: snapshot.effectiveAvailable,
      availableAfter: newAvailablePoints,
      spentBefore: snapshot.spentPoints,
      spentAfter: newSpentPoints,
      lifetimePoints: snapshot.lifetimePoints,
      learnedStateWritten: true,
      passiveReady: passive?.passiveReady === true,
      passiveEnabled: passive?.passiveEnabled === true,
      mutatesSave: true,
      spendsPoints: true,
      learnsNode: true,
      enablesPassive: true,
      grantsCurrency: false,
      unlockUiEnabled: false,
      spendingUiEnabled: false,
      affectsCombat: false,
      affectsRewards: false,
      affectsEconomy: false,
      affectsDebt: false,
      affectsRevisit: false,
      affectedSurface: 'hunter_board',
      build: BUILD
    };
  }

  function applyTalentSpendMutation(state, nodeKey){
    const resolvedNodeKey = String(nodeKey || '').trim();
    if (resolvedNodeKey !== TARGET_NODE) {
      return blockedResult(resolvedNodeKey ? 'unknown_node' : 'malformed_state', null, spendableLedgerSnapshot(state?.player?.talentLedger || {}));
    }
    return applyHunterBoardClaritySpend(state);
  }

  function hunterBoardClaritySpendResultSummary(result){
    return Object.freeze({
      ok: result?.ok === true,
      status: String(result?.status || ''),
      blockedReason: String(result?.blockedReason || ''),
      nodeKey: String(result?.nodeKey || TARGET_NODE),
      cost: safeInt(result?.cost, SPEND_COST),
      availableBefore: safeInt(result?.availableBefore, 0),
      availableAfter: safeInt(result?.availableAfter, 0),
      spentBefore: safeInt(result?.spentBefore, 0),
      spentAfter: safeInt(result?.spentAfter, 0),
      mutatesSave: result?.mutatesSave === true,
      spendsPoints: result?.spendsPoints === true,
      learnsNode: result?.learnsNode === true,
      enablesPassive: result?.enablesPassive === true,
      unlockUiEnabled: result?.unlockUiEnabled === true,
      spendingUiEnabled: result?.spendingUiEnabled === true
    });
  }

  function patchApi(){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    if (!api) return false;
    patchPreview(api);
    api.talentSpendUiReadinessModel = talentSpendUiReadinessModel;
    api.hunterBoardClaritySpendUiReadinessModel = hunterBoardClaritySpendUiReadinessModel;
    api.applyHunterBoardClaritySpend = applyHunterBoardClaritySpend;
    api.applyTalentSpendMutation = applyTalentSpendMutation;
    api.hunterBoardClaritySpendResultSummary = hunterBoardClaritySpendResultSummary;
    api.firstControlledSpendTarget = TARGET_NODE;
    api.firstControlledSpendBuild = BUILD;
    return true;
  }

  if (!patchApi()) {
    window.addEventListener('DOMContentLoaded', patchApi, { once: true });
    window.setTimeout(patchApi, 0);
  }

  window.talentSpendUiReadinessModel = talentSpendUiReadinessModel;
  window.hunterBoardClaritySpendUiReadinessModel = hunterBoardClaritySpendUiReadinessModel;
  window.applyHunterBoardClaritySpend = applyHunterBoardClaritySpend;
  window.applyTalentSpendMutation = applyTalentSpendMutation;
})();
