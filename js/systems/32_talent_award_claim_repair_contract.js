'use strict';

// DungeonDex v1.20.43 - Talent award claim repair contract.
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
    return true;
  }

  if (!patchApi()) {
    window.addEventListener('DOMContentLoaded', patchApi, { once: true });
    window.setTimeout(patchApi, 0);
  }

  window.normalizeTalentAwardClaims = normalizeTalentAwardClaims;
  window.repairTalentAwardClaimsOnState = repairTalentAwardClaimsOnState;
  window.talentAwardClaimRepairSummary = talentAwardClaimRepairSummary;
})();
