'use strict';

// DungeonDex v1.21.0 - Talent award claim repair contract.
(function(){
  if (window.DDTalentAwardClaimRepairContract) return;
  window.DDTalentAwardClaimRepairContract = true;

  const CLAIM_SOURCE = 'boss_trophy_milestone';
  const CLAIM_KEY_RE = /^boss_trophy_milestone:[A-Za-z0-9_.-]+$/;

  function isPlainObject(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function own(source, key, fallback){
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallback;
  }

  function normalizeDate(value){
    const text = String(value || '').trim();
    if (!text) return '';
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : '';
  }

  function normalizeRecord(key, record){
    if (!CLAIM_KEY_RE.test(String(key || ''))) return null;
    if (!isPlainObject(record)) return null;
    const sourceId = String(own(record, 'sourceId', '') || '').trim();
    if (!sourceId) return null;
    if (String(key) !== `boss_trophy_milestone:${sourceId}`) return null;
    if (String(own(record, 'source', '')) !== CLAIM_SOURCE) return null;
    if (Math.floor(Number(own(record, 'amount', 0))) !== 1) return null;
    if (Math.floor(Number(own(record, 'version', 0))) !== 1) return null;
    const claimedAt = normalizeDate(own(record, 'claimedAt', ''));
    if (!claimedAt) return null;
    return {
      key: String(key),
      source: CLAIM_SOURCE,
      sourceId,
      amount: 1,
      claimedAt,
      version: 1
    };
  }

  function normalizeTalentAwardClaims(value){
    if (!isPlainObject(value)) return {};
    const normalized = {};
    Object.keys(value).forEach(key => {
      const record = normalizeRecord(key, value[key]);
      if (record) normalized[key] = record;
    });
    return normalized;
  }

  function repairTalentAwardClaimsOnState(state){
    if (!isPlainObject(state) || !isPlainObject(state.player)) return {};
    if (!isPlainObject(state.player.talentLedger)) state.player.talentLedger = {};
    state.player.talentLedger.awardClaims = normalizeTalentAwardClaims(state.player.talentLedger.awardClaims);
    return state.player.talentLedger.awardClaims;
  }

  function talentAwardClaimRepairSummary(state){
    const awardClaims = repairTalentAwardClaimsOnState(state);
    return {
      repair_active: true,
      claimTrackingReady: true,
      validClaimCount: Object.keys(awardClaims).length,
      malformedClaimCount: 0
    };
  }

  function claimTrackingPlan(){
    return {
      source: CLAIM_SOURCE,
      status: 'repaired',
      repair_active: true,
      claimTrackingReady: true,
      currentSaveShapeAddsClaimTracking: true,
      currentPatchMutatesSave: true,
      plannedClaimPath: 'player.talentLedger.awardClaims',
      plannedClaimKeyPattern: 'boss_trophy_milestone:{bossTrophyId}',
      firstPreviewClaimKey: 'boss_trophy_milestone:first_award',
      duplicatePreventionRequired: true,
      requiresSaveRepairPatch: true,
      requiresLiveAwardPatch: true,
      requiresSpendPathPatch: true,
      proposedClaimRecordShape: {
        key: 'boss_trophy_milestone:{bossTrophyId}',
        source: CLAIM_SOURCE,
        sourceId: '{bossTrophyId}',
        amount: 1,
        claimedAt: '2026-06-21T12:00:00.000Z',
        version: 1
      },
      rules: [
        'Missing awardClaims repairs to {}.',
        'Malformed awardClaims containers repair to {}.',
        'Valid records must match key, source, sourceId, amount, claimedAt, and version.',
        'Invalid records are dropped.',
        'No points are awarded.'
      ]
    };
  }

  function claimTrackingPlanSummary(){
    const plan = claimTrackingPlan();
    return {
      repair_active: plan.repair_active,
      claimTrackingReady: plan.claimTrackingReady,
      status: plan.status
    };
  }

  function claimShapePreview(state){
    const awardClaims = normalizeTalentAwardClaims(state?.player?.talentLedger?.awardClaims);
    return {
      path: 'player.talentLedger.awardClaims',
      status: 'dry_run',
      repair_active: true,
      claimTrackingReady: true,
      saveFieldExists: true,
      wouldAddSaveField: false,
      mutatesSave: false,
      awardsPoints: false,
      grantsCurrency: false,
      enablesSpending: false,
      requiresRepairPatch: false,
      requiresLiveAwardPatch: true,
      requiresClaimTrackingPatch: false,
      expectedShape: 'object_map',
      expectedEmptyValue: {},
      allowedRecordVersion: 1,
      claimKeyPattern: 'boss_trophy_milestone:{bossTrophyId}',
      proposedRecordShape: {
        key: 'boss_trophy_milestone:{bossTrophyId}',
        source: CLAIM_SOURCE,
        sourceId: '{bossTrophyId}',
        amount: 1,
        claimedAt: '2026-06-21T12:00:00.000Z',
        version: 1
      },
      repairRules: claimTrackingPlan().rules.slice(),
      observedState: {
        hasTalentLedger: !!state?.player?.talentLedger,
        hasAwardClaims: !!state?.player?.talentLedger && Object.prototype.hasOwnProperty.call(state.player.talentLedger, 'awardClaims'),
        awardClaimsType: Array.isArray(awardClaims) ? 'array' : typeof awardClaims,
        validClaimCount: Object.keys(awardClaims).length,
        malformedClaimCount: 0
      }
    };
  }

  function claimShapePreviewSummary(state){
    const preview = claimShapePreview(state);
    return {
      repair_active: preview.repair_active,
      claimTrackingReady: preview.claimTrackingReady,
      status: preview.status
    };
  }

  function pointAwardPreview(state){
    const evidence = Array.isArray(state?.player?.bossTrophies) ? state.player.bossTrophies.slice() : [];
    return {
      source: CLAIM_SOURCE,
      status: 'preview',
      repair_active: true,
      claimTrackingReady: true,
      amountPreview: 1,
      alreadyClaimed: false,
      eligible: false,
      claimKey: 'boss_trophy_milestone:first_award',
      awardsPoints: false,
      mutatesSave: false,
      grantsCurrency: false,
      enablesSpending: false,
      requiresLiveAwardPatch: true,
      requiresClaimTrackingPatch: false,
      evidence
    };
  }

  function pointAwardPreviewSummary(state){
    const preview = pointAwardPreview(state);
    return {
      repair_active: true,
      claimTrackingReady: true,
      status: preview.status
    };
  }

  function resolveMutationEvidence(state){
    const trophies = Array.isArray(state?.player?.bossTrophies) ? state.player.bossTrophies : [];
    for (const entry of trophies){
      const sourceId = String(entry || '').trim();
      if (sourceId) {
        return { sourceId, claimKey: `boss_trophy_milestone:${sourceId}`, evidence: [{ source: 'bossTrophies', sourceId }] };
      }
    }
    const records = Array.isArray(state?.player?.bossTrophyRecords) ? state.player.bossTrophyRecords : [];
    for (const record of records){
      if (!record || typeof record !== 'object') continue;
      const recordId = String(record.id || '').trim();
      const trophyId = String(record.trophyId || '').trim();
      const bossId = String(record.bossId || '').trim();
      const sourceId = recordId || trophyId || bossId;
      if (sourceId) {
        return {
          sourceId,
          claimKey: `boss_trophy_milestone:${sourceId}`,
          evidence: [{ source: 'bossTrophyRecords', sourceId, recordId: recordId || '', trophyId: trophyId || '', bossId: bossId || '' }]
        };
      }
    }
    return { sourceId: '', claimKey: '', evidence: [] };
  }

  function talentAwardMutationPreview(state){
    const hasMalformedState = !state || typeof state !== 'object' || Array.isArray(state) || !isPlainObject(state.player) && state.player != null;
    const claims = normalizeTalentAwardClaims(state?.player?.talentLedger?.awardClaims);
    const repairReady = true;
    const resolved = resolveMutationEvidence(state);
    const alreadyClaimed = !!resolved.claimKey && Object.prototype.hasOwnProperty.call(claims, resolved.claimKey);
    const hasEvidence = Array.isArray(resolved.evidence) && resolved.evidence.length > 0;
    const eligible = !!resolved.sourceId && repairReady && hasEvidence && !alreadyClaimed && !hasMalformedState;
    const blockedReason = hasMalformedState
      ? 'malformed_state'
      : alreadyClaimed
        ? 'already_claimed'
        : !resolved.sourceId
          ? 'no_boss_trophy_evidence'
          : eligible
            ? 'ready'
            : 'no_boss_trophy_evidence';
    const proposedClaimRecord = eligible ? {
      key: resolved.claimKey,
      source: CLAIM_SOURCE,
      sourceId: resolved.sourceId,
      amount: 1,
      claimedAt: 'future_live_award_timestamp',
      version: 1
    } : null;
    return {
      source: CLAIM_SOURCE,
      label: 'Boss Trophy Milestone',
      status: 'mutation_preview',
      eligible,
      blockedReason,
      amountPreview: 1,
      claimKey: resolved.claimKey || '',
      sourceId: resolved.sourceId || '',
      alreadyClaimed,
      claimTrackingReady: true,
      awardClaimsShapeReady: repairReady,
      wouldAwardPoints: eligible,
      wouldCreateClaimRecord: eligible,
      wouldMutateSave: true,
      mutatesSave: false,
      awardsPoints: false,
      grantsCurrency: false,
      enablesSpending: false,
      requiresLiveAwardPatch: true,
      requiresSpendPathPatch: true,
      atomicMutationRequired: true,
      plannedMutation: {
        incrementLifetimePointsBy: 1,
        incrementAvailablePointsBy: 1,
        createAwardClaim: true,
        claimRecordVersion: 1
      },
      proposedClaimRecord,
      evidence: resolved.evidence || [],
      notes: eligible ? ['Preview only. No state mutation occurs.'] : []
    };
  }

  function talentAwardMutationPreviewSummary(state){
    const preview = talentAwardMutationPreview(state);
    return {
      source: preview.source,
      label: preview.label,
      status: preview.status,
      eligible: preview.eligible,
      blockedReason: preview.blockedReason,
      claimKey: preview.claimKey,
      sourceId: preview.sourceId,
      alreadyClaimed: preview.alreadyClaimed,
      claimTrackingReady: preview.claimTrackingReady,
      awardClaimsShapeReady: preview.awardClaimsShapeReady,
      wouldAwardPoints: preview.wouldAwardPoints,
      wouldCreateClaimRecord: preview.wouldCreateClaimRecord,
      mutatesSave: preview.mutatesSave,
      awardsPoints: preview.awardsPoints
    };
  }

  function talentAwardMutationGate(state, options){
    const preview = talentAwardMutationPreview(state);
    return {
      source: preview.source,
      enabled: !!(options && options.enabledOverride === true),
      eligible: preview.eligible,
      blockedReason: preview.blockedReason,
      claimKey: preview.claimKey,
      sourceId: preview.sourceId,
      preview
    };
  }

  function applyTalentAwardMutation(state, options){
    const gate = talentAwardMutationGate(state, options);
    const liveEnabled = !!(options && options.liveGate === true);
    const disabledResult = {
      ok: false,
      source: CLAIM_SOURCE,
      status: 'blocked',
      blockedReason: 'award_gate_disabled',
      enabled: false,
      claimKey: '',
      sourceId: '',
      awardedPoints: 0,
      createdClaimRecord: false,
      totalLifetimePoints: 0,
      availablePoints: 0,
      mutatesSave: false,
      awardsPoints: false,
      grantsCurrency: false,
      enablesSpending: false,
      spendPathEnabled: false,
      unlockUiEnabled: false
    };

    if (!gate.enabled && !liveEnabled) return disabledResult;

    const preview = gate.preview;
    if (!preview || typeof preview !== 'object') {
      return {
        ...disabledResult,
        blockedReason: 'invalid_preview'
      };
    }

    if (!preview.eligible || preview.blockedReason !== 'ready' || !preview.claimKey || !preview.sourceId || preview.amountPreview !== 1 || preview.alreadyClaimed) {
      const blockedReason = preview.blockedReason === 'already_claimed'
        ? 'already_claimed'
        : !preview.claimKey || !preview.sourceId
          ? 'missing_claim_key'
          : !preview.eligible
            ? 'invalid_preview'
            : 'invalid_preview';
      return {
        ...disabledResult,
        blockedReason,
        claimKey: preview.claimKey || '',
        sourceId: preview.sourceId || ''
      };
    }

    if (!isPlainObject(state) || !isPlainObject(state.player)) {
      return {
        ...disabledResult,
        blockedReason: 'malformed_state'
      };
    }

    if (!isPlainObject(state.player.talentLedger)) state.player.talentLedger = {};
    const claimMap = normalizeTalentAwardClaims(state.player.talentLedger.awardClaims);
    if (!Object.prototype.hasOwnProperty.call(claimMap, preview.claimKey)) {
      claimMap[preview.claimKey] = {
        key: preview.claimKey,
        source: CLAIM_SOURCE,
        sourceId: preview.sourceId,
        amount: 1,
        claimedAt: new Date().toISOString(),
        version: 1
      };
    } else {
      return {
        ...disabledResult,
        blockedReason: 'already_claimed',
        claimKey: preview.claimKey,
        sourceId: preview.sourceId
      };
    }

    const currentLifetime = Number(state.player.talentLedger.lifetimePoints || 0);
    const currentAvailable = Number(state.player.talentLedger.availablePoints || 0);
    const currentSpent = Number(state.player.talentLedger.spentPoints || 0);
    state.player.talentLedger.awardClaims = claimMap;
    state.player.talentLedger.lifetimePoints = currentLifetime + 1;
    state.player.talentLedger.availablePoints = currentAvailable + 1;
    state.player.talentLedger.spentPoints = Number.isFinite(currentSpent) ? currentSpent : 0;

    return {
      ok: true,
      source: CLAIM_SOURCE,
      status: 'awarded',
      blockedReason: '',
      enabled: true,
      claimKey: preview.claimKey,
      sourceId: preview.sourceId,
      awardedPoints: 1,
      createdClaimRecord: true,
      totalLifetimePoints: state.player.talentLedger.lifetimePoints,
      availablePoints: state.player.talentLedger.availablePoints,
      mutatesSave: true,
      awardsPoints: true,
      grantsCurrency: false,
      enablesSpending: false,
      spendPathEnabled: false,
      unlockUiEnabled: false
    };
  }

  function applyBossTrophyTalentAwardIfReady(state){
    return applyTalentAwardMutation(state, { liveGate: true });
  }

  function patchApi(){
    const api = window.DungeonDexTalents || window.DungeonDexWardenTalents;
    if (!api) return false;
    api.normalizeTalentAwardClaims = normalizeTalentAwardClaims;
    api.repairTalentAwardClaimsOnState = repairTalentAwardClaimsOnState;
    api.talentAwardClaimRepairSummary = talentAwardClaimRepairSummary;
    api.talentAwardClaimTrackingPlan = claimTrackingPlan;
    api.talentAwardClaimTrackingPlanSummary = claimTrackingPlanSummary;
    api.talentAwardClaimShapePreview = claimShapePreview;
    api.talentAwardClaimShapePreviewSummary = claimShapePreviewSummary;
    api.talentPointAwardPreview = pointAwardPreview;
    api.talentPointAwardPreviewSummary = pointAwardPreviewSummary;
    api.talentAwardMutationPreview = talentAwardMutationPreview;
    api.talentAwardMutationPreviewSummary = talentAwardMutationPreviewSummary;
    api.talentAwardMutationGate = talentAwardMutationGate;
    api.applyTalentAwardMutation = applyTalentAwardMutation;
    api.applyBossTrophyTalentAwardIfReady = applyBossTrophyTalentAwardIfReady;
    return true;
  }

  if (!patchApi()) {
    window.addEventListener('DOMContentLoaded', patchApi, { once: true });
    window.setTimeout(patchApi, 0);
  }

  window.normalizeTalentAwardClaims = normalizeTalentAwardClaims;
  window.repairTalentAwardClaimsOnState = repairTalentAwardClaimsOnState;
  window.talentAwardClaimRepairSummary = talentAwardClaimRepairSummary;
  window.talentAwardMutationPreview = talentAwardMutationPreview;
  window.talentAwardMutationPreviewSummary = talentAwardMutationPreviewSummary;
  window.talentAwardMutationGate = talentAwardMutationGate;
  window.applyTalentAwardMutation = applyTalentAwardMutation;
  window.applyBossTrophyTalentAwardIfReady = applyBossTrophyTalentAwardIfReady;
})();
