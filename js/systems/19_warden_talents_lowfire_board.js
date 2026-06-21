'use strict';

// DungeonDex v1.16.2 - Talent preview copy polish.
(function(){
  if (window.DDWardenTalentsLowfireBoard) return;
  window.DDWardenTalentsLowfireBoard = true;

  const SCRIPT_BUILD = '1.16.2-talent-preview-copy-polish';
  const TALENT_UI_POINT_STEP = 5;
  const TALENT_UI_POINT_CAP = 20;
  const ZERO_TALENT_BONUSES = Object.freeze({ maxHpPct:0, eliteBoardRewardPct:0, charterCostPct:0, sellValuePct:0 });
  const H = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const F = v => typeof format === 'function' ? format(v) : String(Math.round(Number(v) || 0));
  const M = v => typeof formatMoney === 'function' ? formatMoney(v) : `${Math.floor(Number(v) || 0)}c`;
  const C = (g=0,s=0,c=0) => typeof coins === 'function' ? coins(g,s,c) : Math.max(0, Math.round(g*10000+s*100+c));
  const N = (v,d=0,min=-Infinity,max=Infinity) => typeof numberOr === 'function' ? numberOr(v,d,min,max) : Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Number(v) : d));
  const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
  const log = (state, text) => { if (typeof pushLog === 'function') pushLog(state, text); };

  function safeLedgerSource(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const proto = Object.getPrototypeOf(value);
    if (proto && proto !== Object.prototype && proto !== null) return {};
    return value;
  }

  function ownValue(source, key, fallback){
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallback;
  }

  function zeroTalentBonuses(){
    return { ...ZERO_TALENT_BONUSES };
  }

  function talentBonusValue(state, key){
    return 0;
  }

  function deepFreeze(value){
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return value;
  }

  function clonePlain(value){
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return Array.isArray(value) ? [] : {};
    }
  }

  const TALENT_PASSIVE_PREVIEW_MAP = {
    survivor: {
      branchName: 'Survivor',
      branchSummary: 'Stay alive. Recover safely.',
      nodes: [
        { nodeKey:'survivor_sturdy_start', nodeTitle:'Sturdy Start', tier:1, costPreview:1, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: sturdier starts.' },
        { nodeKey:'survivor_safe_recovery', nodeTitle:'Safe Recovery', tier:2, costPreview:2, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: safer early recovery.' },
        { nodeKey:'survivor_guard_return', nodeTitle:'Guarded Return', tier:3, costPreview:3, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: safer returns.' }
      ]
    },
    hunter: {
      branchName: 'Hunter',
      branchSummary: 'Contracts, rivals, Elite Board.',
      nodes: [
        { nodeKey:'hunter_board_clarity', nodeTitle:'Board Clarity', tier:1, costPreview:1, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: clearer contract reads.' },
        { nodeKey:'hunter_board_payout_plan', nodeTitle:'Payout Plan', tier:2, costPreview:2, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: payout planning.' },
        { nodeKey:'hunter_rival_trace', nodeTitle:'Rival Trace', tier:3, costPreview:3, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: rival awareness.' }
      ]
    },
    delver: {
      branchName: 'Delver',
      branchSummary: 'Depth, stairs, charter planning.',
      nodes: [
        { nodeKey:'delver_stair_sense', nodeTitle:'Stair Sense', tier:1, costPreview:1, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: stair sense.' },
        { nodeKey:'delver_depth_plan', nodeTitle:'Depth Plan', tier:2, costPreview:2, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: deeper-run planning.' },
        { nodeKey:'delver_charter_support', nodeTitle:'Charter Support', tier:3, costPreview:3, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: charter support.' }
      ]
    },
    collector: {
      branchName: 'Collector',
      branchSummary: 'Loot, gear, archive, trophies.',
      nodes: [
        { nodeKey:'collector_item_appraisal', nodeTitle:'Item Appraisal', tier:1, costPreview:1, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: item appraisal.' },
        { nodeKey:'collector_famous_memory', nodeTitle:'Famous Memory', tier:2, costPreview:2, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: Famous Gear memory.' },
        { nodeKey:'collector_trophy_archive', nodeTitle:'Trophy Archive', tier:3, costPreview:3, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: trophy visibility.' },
        { nodeKey:'debt_collector_clarity', nodeTitle:'Debt Collector Clarity', tier:3, costPreview:3, requirementPreview:'Preview only.', passivePreviewDescription:'Planned passive: clearer debt copy.' }
      ]
    }
  };

  const TALENT_PATHS = Object.entries(TALENT_PASSIVE_PREVIEW_MAP).map(([id, branch]) => ({
    id,
    label: branch.branchName,
    summary: branch.branchSummary,
    locked: true,
    previewOnly: true,
    active: false,
    gameplayEnabled: false
  }));

  const TALENT_DEFS = TALENT_PATHS.flatMap(path => TALENT_PASSIVE_PREVIEW_MAP[path.id].nodes.map(node => ({
    id: node.nodeKey,
    path: path.id,
    name: node.nodeTitle,
    effect: node.passivePreviewDescription,
    summary: node.requirementPreview,
    note: 'Preview only.'
  })));

  const TALENT_BY_ID = Object.fromEntries(TALENT_DEFS.map(def => [def.id, def]));
  const TALENT_PATH_BY_ID = Object.fromEntries(TALENT_PATHS.map(path => [path.id, path]));

  const TALENT_RULESET_PREVIEW = deepFreeze({
    id: 'talent_ruleset_preview_v1',
    version: 1,
    locked: true,
    previewOnly: true,
    active: false,
    gameplayEnabled: false,
    earningEnabled: true,
    spendingEnabled: false,
    unlocksEnabled: false,
    passiveEffectsEnabled: false,
    pointSources: [
      {
        id: 'boss_depth_milestone',
        label: 'Boss / depth milestones',
        sourceType: 'bossDepthMilestone',
        rule: 'Future points come from secured boss-depth milestones, not common monster grinding.',
        cadence: 'One planned point per secured milestone block.',
        enabled: true,
        active: false,
        locked: true,
        previewOnly: true
      }
    ],
    pointCaps: {
      earlyCap: 6,
      previewCap: 6,
      absoluteCap: 12,
      activeCap: 6,
      spendableCap: 0,
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false
    },
    branches: TALENT_PATHS.map(path => ({
      id: path.id,
      label: path.label,
      category: path.id === 'collector' ? 'identity' : path.id === 'hunter' ? 'contract' : 'role',
      summary: path.summary,
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false
    })),
    tiers: [
      { tier: 1, label: 'Tier I', plannedCost: 1, unlockRequirement: 'Ruleset only; no live unlock.', locked: true, previewOnly: true, active: false, gameplayEnabled: false },
      { tier: 2, label: 'Tier II', plannedCost: 2, unlockRequirement: 'Future branch investment gate; disabled.', locked: true, previewOnly: true, active: false, gameplayEnabled: false },
      { tier: 3, label: 'Tier III', plannedCost: 3, unlockRequirement: 'Future capstone gate; disabled.', locked: true, previewOnly: true, active: false, gameplayEnabled: false }
    ],
    costModel: {
      type: 'tiered_flat',
      costsByTier: { '1': 1, '2': 2, '3': 3 },
      activeCost: 0,
      refundEnabled: false,
      respecEnabled: false,
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false
    },
    unlockRequirements: [
      { id: 'branch_open', label: 'Branch exists', enabled: false, locked: true, previewOnly: true, active: false, gameplayEnabled: false },
      { id: 'previous_tier', label: 'Previous tier planned', enabled: false, locked: true, previewOnly: true, active: false, gameplayEnabled: false },
      { id: 'point_balance', label: 'Spendable point balance', enabled: false, locked: true, previewOnly: true, active: false, gameplayEnabled: false }
    ],
    nodes: TALENT_DEFS.map(def => {
      const nodeMeta = (TALENT_PASSIVE_PREVIEW_MAP[def.path]?.nodes || []).find(node => node.nodeKey === def.id) || {};
      const path = TALENT_PASSIVE_PREVIEW_MAP[def.path] || {};
      return {
        id: def.id,
        branch: def.path,
        tier: nodeMeta.tier || 1,
        title: def.name,
        branchName: path.branchName || def.path,
        branchSummary: path.branchSummary || '',
        nodeKey: def.id,
        nodeTitle: def.name,
        costPreview: nodeMeta.costPreview || 0,
        requirementPreview: nodeMeta.requirementPreview || '',
        passivePreviewDescription: def.effect,
        plannedRole: nodeMeta.requirementPreview || '',
        plannedEffect: def.effect,
        plannedCost: nodeMeta.costPreview || 0,
        locked: true,
        previewOnly: true,
        active: false,
        gameplayEnabled: false,
        learned: false,
        effectValue: 0,
        applied: false,
        status: 'Preview only. Inactive.'
      };
    })
  });

  const TALENT_EARNING_SOURCE_CONTRACT = deepFreeze({
    sourceId: 'boss_depth_milestone',
    sourceLabel: 'Boss / Depth Milestone',
    enabled: true,
    description: 'Talent points earned from defeating bosses and advancing depth milestones.',
    milestones: [
      { milestone:'first_boss', label:'First Boss Defeated', futureAwardIfEnabled:1 },
      { milestone:'depth_5', label:'Depth 5 Reached', futureAwardIfEnabled:1 },
      { milestone:'depth_10', label:'Depth 10 Reached', futureAwardIfEnabled:1 },
      { milestone:'depth_15', label:'Depth 15 Reached', futureAwardIfEnabled:1 },
      { milestone:'boss_5', label:'5 Bosses Defeated', futureAwardIfEnabled:1 },
      { milestone:'boss_10', label:'10 Bosses Defeated', futureAwardIfEnabled:1 }
    ],
    totalPointsIfAllMilestonesCompleted: 6,
    pointsAwardedNow: 0
  });

  window.TALENT_RULESET_PREVIEW = TALENT_RULESET_PREVIEW;

  function ensureTalents(state){
    if (typeof repairTalentState === 'function') return repairTalentState(state);
    if (!state?.player) return { pointsEarned:0, pointsSpent:0, unlocked:{}, spent:{}, unlockedIds:[] };
    const unlocked = {};
    state.player.talents = { pointsEarned:0, pointsSpent:0, unlocked, spent:unlocked, unlockedIds:[] };
    state.player.talentPointsEarned = 0;
    state.player.talentPointsSpent = 0;
    state.player.talentPoints = 0;
    state.player.talentUnlockIds = [];
    return state.player.talents;
  }

  function availableTalentPoints(state){
    ensureTalents(state);
    return 0;
  }

  function talentPassivePreviewSummary(branchId){
    const branch = TALENT_PASSIVE_PREVIEW_MAP[String(branchId || '').trim()];
    if (!branch) {
      return {
        branchName: '',
        branchSummary: '',
        locked: true,
        previewOnly: true,
        active: false,
        gameplayEnabled: false,
        nodeCount: 0
      };
    }
    return {
      branchName: branch.branchName,
      branchSummary: branch.branchSummary,
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false,
      nodeCount: branch.nodes.length
    };
  }

  function talentPreviewBranchSummary(branch){
    if (!branch || typeof branch !== 'object') {
      return {
        branchName: '',
        branchSummary: '',
        locked: true,
        previewOnly: true,
        active: false,
        gameplayEnabled: false,
        nodeCount: 0
      };
    }
    return {
      branchName: branch.label || branch.branchName || branch.id || '',
      branchSummary: branch.summary || branch.branchSummary || '',
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false,
      nodeCount: Array.isArray(branch.nodes) ? branch.nodes.length : 0
    };
  }

  function talentPreviewNodeDetails(node){
    if (!node || typeof node !== 'object') {
      return {
        nodeKey: '',
        nodeTitle: '',
        tier: 0,
        costPreview: 0,
        requirementPreview: '',
        passivePreviewDescription: '',
        locked: true,
        previewOnly: true,
        active: false,
        gameplayEnabled: false,
        learned: false,
        effectValue: 0,
        applied: false
      };
    }
    return {
      nodeKey: node.id || node.nodeKey || '',
      nodeTitle: node.title || node.nodeTitle || '',
      tier: Math.max(0, Math.floor(numberOr(node.tier, 0, 0, 999999))),
      costPreview: Math.max(0, Math.floor(numberOr(node.costPreview ?? node.plannedCost, 0, 0, 999999))),
      requirementPreview: String(node.requirementPreview || node.plannedRole || '').trim(),
      passivePreviewDescription: String(node.passivePreviewDescription || node.plannedEffect || '').trim(),
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false,
      learned: false,
      effectValue: 0,
      applied: false
    };
  }

  function talentPassivePreviewMap(){
    return clonePlain(TALENT_PASSIVE_PREVIEW_MAP);
  }

  function talentTreePreview(state){
    ensureTalents(state);
    const ruleset = talentRulesetPreview();
    const nodesSource = talentPreviewNodes();
    const branchNodes = new Map();
    nodesSource.forEach(node => {
      const key = String(node.branch || '').trim();
      if (!key) return;
      const list = branchNodes.get(key) || [];
      list.push(node);
      branchNodes.set(key, list);
    });
    const branches = asArray(ruleset.branches, []).map(branch => {
      const key = String(branch.id || branch.key || '').trim();
      const branchMeta = TALENT_PASSIVE_PREVIEW_MAP[key] || {};
      const nodes = (branchNodes.get(key) || []).map(node => ({
        key: node.id,
        branch: key,
        title: node.title,
        detail: node.plannedEffect || node.detail || '',
        plannedEffect: node.plannedEffect || node.detail || '',
        branchName: branchMeta.branchName || branch.label || key,
        branchSummary: branchMeta.branchSummary || branch.summary || '',
        nodeKey: node.id,
        nodeTitle: node.title,
        costPreview: Math.max(0, Math.floor(numberOr(node.plannedCost, 0, 0, 999999))),
        requirementPreview: String(node.plannedRole || '').trim(),
        passivePreviewDescription: String(node.plannedEffect || node.detail || '').trim(),
        status: 'Locked preview only. Inactive.',
        locked: true,
        active: false,
        purchased: false,
        learned: false,
        unlocked: false,
        previewOnly: true,
        gameplayEnabled: false,
        effectValue: 0,
        applied: false,
        order: Math.floor(numberOr(node.tier, node.order, 0, 999999))
      })).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
      return {
        key,
        title: branch.label || branch.title || key,
        detail: branch.summary || branch.detail || '',
        status: 'Locked preview only.',
        locked: true,
        active: false,
        purchased: false,
        learned: false,
        unlocked: false,
        previewOnly: true,
        gameplayEnabled: false,
        nodeCount: nodes.length,
        nodes
      };
    });
    const nodes = branches.flatMap(branch => branch.nodes);
    return {
      ...ruleset,
      previewOnly: true,
      branches,
      nodes
    };
  }

  function talentTreePreviewSummary(state){
    const preview = talentTreePreview(state);
    return {
      totalBranches: preview.branches.length,
      totalNodes: preview.nodes.length,
      lockedNodes: preview.nodes.filter(node => node.locked).length,
      activeNodes: 0,
      spendablePoints: 0,
      previewOnly: true,
      rulesetId: preview.id || '',
      rulesetVersion: preview.version || 0
    };
  }

  function talentRulesetPreview(){
    const ruleset = clonePlain(TALENT_RULESET_PREVIEW);
    ruleset.locked = true;
    ruleset.previewOnly = true;
    ruleset.active = false;
    ruleset.gameplayEnabled = false;
    ruleset.earningEnabled = true;
    ruleset.spendingEnabled = false;
    ruleset.unlocksEnabled = false;
    ruleset.passiveEffectsEnabled = false;
    return ruleset;
  }

  function talentPreviewNodes(){
    return TALENT_RULESET_PREVIEW.nodes.map(node => ({
      ...clonePlain(node),
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false,
      purchased: false,
      learned: false,
      unlocked: false
    }));
  }

  function talentRulesetSummary(){
    const costs = Object.values(TALENT_RULESET_PREVIEW.costModel.costsByTier).map(value => Math.max(0, Math.floor(Number(value) || 0)));
    return {
      id: TALENT_RULESET_PREVIEW.id,
      version: TALENT_RULESET_PREVIEW.version,
      locked: true,
      previewOnly: true,
      active: false,
      gameplayEnabled: false,
      earningEnabled: true,
      spendingEnabled: false,
      unlocksEnabled: false,
      passiveEffectsEnabled: false,
      pointSourceCount: TALENT_RULESET_PREVIEW.pointSources.length,
      branchCount: TALENT_RULESET_PREVIEW.branches.length,
      tierCount: TALENT_RULESET_PREVIEW.tiers.length,
      nodeCount: TALENT_RULESET_PREVIEW.nodes.length,
      earlyCap: TALENT_RULESET_PREVIEW.pointCaps.earlyCap,
      activeCap: TALENT_RULESET_PREVIEW.pointCaps.activeCap,
      spendableCap: 0,
      plannedMaxCost: costs.length ? Math.max(...costs) : 0,
      branchLabels: TALENT_RULESET_PREVIEW.branches.map(branch => branch.label),
      pointSourceLabels: TALENT_RULESET_PREVIEW.pointSources.map(source => source.label),
      costSummary: 'Tier costs planned: 1 / 2 / 3. Active cost: 0.'
    };
  }

  function talentEarningSourceContract(state){
    return clonePlain(TALENT_EARNING_SOURCE_CONTRACT);
  }

  function talentEarningEnabled(state){
    const earning = safeLedgerSource(state?.player?.talentEarning);
    return TALENT_RULESET_PREVIEW.earningEnabled === true && earning.enabled === true;
  }

  function talentEarningStatus(state){
    const contract = talentEarningSourceContract(state);
    const earning = safeLedgerSource(state?.player?.talentEarning);
    const enabled = talentEarningEnabled(state);
    return {
      sourceId: contract.sourceId,
      sourceLabel: contract.sourceLabel,
      enabled,
      pointsAwardedNow: enabled ? Math.max(0, Math.floor(N(ownValue(earning, 'pointsAwarded', 0), 0, 0, Number.MAX_SAFE_INTEGER))) : 0,
      availableMilestones: contract.milestones.length,
      totalPointsIfFullyUnlocked: contract.totalPointsIfAllMilestonesCompleted
    };
  }

  function normaliseMilestoneId(value){
    return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  function milestoneSetFromSource(source){
    const resolved = new Set();
    if (!source || typeof source !== 'object') return resolved;
    const reached = ownValue(source, 'milestonesReached', {});
    if (reached && typeof reached === 'object' && !Array.isArray(reached)) {
      Object.keys(reached).forEach(key => {
        if (reached[key]) resolved.add(normaliseMilestoneId(key));
      });
    }
    return resolved;
  }

  function detectBossMilestones(state){
    const player = state?.player || {};
    const gained = [];
    const defeatedBosses = Math.max(0, Math.floor(N(player.bossesDefeated ?? player.bosses ?? player.bossKills, 0, 0, Number.MAX_SAFE_INTEGER)));
    const reached = milestoneSetFromSource(player.talentEarning);
    const bossMilestones = [
      { milestone: 'first_boss', threshold: 1, label: 'First Boss Defeated' },
      { milestone: 'boss_5', threshold: 5, label: '5 Bosses Defeated' },
      { milestone: 'boss_10', threshold: 10, label: '10 Bosses Defeated' }
    ];
    bossMilestones.forEach(entry => {
      if (defeatedBosses >= entry.threshold || reached.has(entry.milestone)) {
        gained.push({ milestone: entry.milestone, label: entry.label, type: 'boss' });
      }
    });
    return gained;
  }

  function detectDepthMilestones(state){
    const player = state?.player || {};
    const gained = [];
    const depth = Math.max(0, Math.floor(N(player.safeExtractDepth ?? player.depth ?? player.floor, 0, 0, Number.MAX_SAFE_INTEGER)));
    const reached = milestoneSetFromSource(player.talentEarning);
    const depthMilestones = [
      { milestone: 'depth_5', threshold: 5, label: 'Depth 5 Reached' },
      { milestone: 'depth_10', threshold: 10, label: 'Depth 10 Reached' },
      { milestone: 'depth_15', threshold: 15, label: 'Depth 15 Reached' }
    ];
    depthMilestones.forEach(entry => {
      if (depth >= entry.threshold || reached.has(entry.milestone)) {
        gained.push({ milestone: entry.milestone, label: entry.label, type: 'depth' });
      }
    });
    return gained;
  }

  function getAllReachedMilestones(state){
    const boss = detectBossMilestones(state);
    const depth = detectDepthMilestones(state);
    const seen = new Set();
    const merged = [];
    [...boss, ...depth].forEach(entry => {
      const id = normaliseMilestoneId(entry?.milestone);
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push({ milestone: id, label: String(entry.label || ''), type: entry.type || '' });
    });
    return merged;
  }

  function calculateTalentPointsFromMilestones(state, enabledOverride = false){
    const enabled = enabledOverride === true || talentEarningEnabled(state);
    if (!enabled) return 0;
    return getAllReachedMilestones(state).reduce((sum, entry) => {
      const contractEntry = TALENT_EARNING_SOURCE_CONTRACT.milestones.find(item => normaliseMilestoneId(item.milestone) === entry.milestone);
      return sum + Math.max(0, Math.floor(N(contractEntry?.futureAwardIfEnabled, 0, 0, Number.MAX_SAFE_INTEGER)));
    }, 0);
  }

  function calculateTalentSpendDryRun(state, nodeKey, enabledOverride = false){
    const resolvedNodeKey = normaliseMilestoneId(nodeKey);
    const node = TALENT_BY_ID[resolvedNodeKey] || null;
    const ledger = talentPointLedger(state);
    const spendingEnabled = enabledOverride === true;
    const availableBefore = Math.max(0, Math.floor(N(ledger.availablePoints, 0, 0, Number.MAX_SAFE_INTEGER)));
    const cost = Math.max(0, Math.floor(N(node?.plannedCost ?? node?.costPreview ?? 0, 0, 0, Number.MAX_SAFE_INTEGER)));
    const nodeLocked = !!node?.locked;
    let blockedReason = '';
    let canAfford = false;
    if (!resolvedNodeKey) blockedReason = 'missing_node_key';
    else if (!node) blockedReason = 'unknown_node';
    else if (!spendingEnabled) blockedReason = 'spending_disabled';
    else if (nodeLocked) blockedReason = 'node_locked';
    else if (cost > availableBefore) blockedReason = 'insufficient_points';
    else canAfford = true;
    const availableAfterPreview = canAfford ? Math.max(0, availableBefore - cost) : availableBefore;
    return {
      targetNodeKey: resolvedNodeKey,
      nodeLabel: node ? String(node.name || node.title || node.nodeTitle || node.id || resolvedNodeKey) : '',
      cost,
      availableBefore,
      availableAfterPreview,
      canAfford,
      blockedReason,
      spendingEnabled,
      mutatesSave: false,
      learnedStateWritten: false,
      passiveApplied: false
    };
  }

  function safeTalentLearnedIds(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    try {
      if (Object.getPrototypeOf(value) !== Object.prototype) return [];
    } catch (err) {
      return [];
    }
    return Object.keys(value).filter(key => value[key] === true && TALENT_BY_ID[key]);
  }

  function applyTalentNodeSpend(state, nodeKey, enabledOverride = false){
    const sourceId = TALENT_EARNING_SOURCE_CONTRACT.sourceId;
    const resolvedNodeKey = normaliseMilestoneId(nodeKey);
    const node = TALENT_BY_ID[resolvedNodeKey] || null;
    const ledger = talentPointLedger(state);
    const availableBefore = Math.max(0, Math.floor(N(ledger.availablePoints, 0, 0, Number.MAX_SAFE_INTEGER)));
    const cost = Math.max(0, Math.floor(N(node?.plannedCost ?? node?.costPreview ?? 0, 0, 0, Number.MAX_SAFE_INTEGER)));
    const result = {
      ok: false,
      blockedReason: '',
      nodeKey: resolvedNodeKey,
      cost,
      availableBefore,
      availableAfter: availableBefore,
      learnedStateWritten: false,
      passiveApplied: false,
      alreadyLearned: false,
      mutatesSave: false,
      sourceId
    };
    if (!state?.player || enabledOverride !== true) {
      result.blockedReason = 'spending_disabled';
      return result;
    }
    if (!resolvedNodeKey) {
      result.blockedReason = 'missing_node_key';
      return result;
    }
    if (!node) {
      result.blockedReason = 'unknown_node';
      return result;
    }
    if (resolvedNodeKey !== 'hunter_board_clarity') {
      result.blockedReason = 'node_not_activated';
      return result;
    }
    const learnedIds = safeTalentLearnedIds(state.player.talentLearnedIds || state.player.talentUnlockIds || state.player.talents?.unlocked || {});
    const alreadyLearned = learnedIds.includes(resolvedNodeKey) || !!state.player.talentUnlockIds?.includes?.(resolvedNodeKey);
    result.alreadyLearned = alreadyLearned;
    if (alreadyLearned) {
      result.blockedReason = 'already_learned';
      return result;
    }
    if (availableBefore < cost) {
      result.blockedReason = 'insufficient_points';
      return result;
    }
    const learnedMap = isPlainObject(state.player.talentLearnedIds) ? state.player.talentLearnedIds : {};
    learnedMap[resolvedNodeKey] = true;
    state.player.talentLearnedIds = learnedMap;
    state.player.talentUnlockIds = Array.from(new Set([...(Array.isArray(state.player.talentUnlockIds) ? state.player.talentUnlockIds : []), resolvedNodeKey]));
    if (!isPlainObject(state.player.talentLedger)) state.player.talentLedger = {};
    state.player.talentLedger.previewOnly = true;
    state.player.talentLedger.unlocked = false;
    state.player.talentLedger.availablePoints = Math.max(0, availableBefore - cost);
    state.player.talentLedger.lifetimePoints = Math.max(state.player.talentLedger.lifetimePoints || 0, availableBefore);
    state.player.talentLedger.spentPoints = Math.max(0, cost);
    state.player.talentLedger.earnedSources = [{ sourceId, points: Math.max(0, state.player.talentLedger.lifetimePoints || 0) }];
    result.ok = true;
    result.learnedStateWritten = true;
    result.availableAfter = state.player.talentLedger.availablePoints;
    result.mutatesSave = true;
    return result;
  }

  function talentNodeStateContract(nodeKey, state, overrides = {}){
    const learnedIds = safeTalentLearnedIds(state?.player?.talentLearnedIds || state?.player?.talentUnlockIds || state?.player?.talents?.unlocked || {});
    const learned = learnedIds.includes(nodeKey) || !!state?.player?.talentUnlockIds?.includes?.(nodeKey);
    return Object.freeze({
      nodeKey,
      previewOnly: overrides.previewOnly === true,
      selectable: overrides.selectable === true,
      selected: overrides.selected === true,
      learned,
      passiveReady: overrides.passiveReady === true ? true : learned,
      passiveEnabled: overrides.passiveEnabled === true ? learned : false,
      appliesEffect: overrides.appliesEffect === true,
      liveRendererWired: overrides.liveRendererWired === true ? learned : false,
      mutatesSave: overrides.mutatesSave === true
    });
  }

  // Ready means learned; enabled means consumed live; appliesEffect is reserved for gameplay changes.
  function hunterBoardClarityPassiveContract(state){
    const resolvedNodeKey = 'hunter_board_clarity';
    const stateContract = talentNodeStateContract(resolvedNodeKey, state, {
      passiveEnabled: true,
      liveRendererWired: true
    });
    return {
      contractOwner: 'DungeonDexTalents',
      ...stateContract,
      effectKey: 'hunter_board_clarity_display_copy',
      affectedSurface: 'Elite Board display copy only',
      combat: false,
      economy: false,
      rewards: false,
      monsters: false,
      gear: false,
      dungeonProgression: false,
      dungeonScaling: false,
      revisit: false,
      debtCollector: false,
      eliteBoardDifficultyRiskRewardMath: false
    };
  }

  function debtCollectorClarityPassiveContract(state){
    const resolvedNodeKey = 'debt_collector_clarity';
    const stateContract = talentNodeStateContract(resolvedNodeKey, state, {
      passiveEnabled: true,
      liveRendererWired: true
    });
    return {
      contractOwner: 'DungeonDexTalents',
      ...stateContract,
      effectKey: 'debt_collector_clarity_display_copy',
      affectedSurface: 'Debt Collector display copy only',
      combat: false,
      economy: false,
      rewards: false,
      monsters: false,
      gear: false,
      progression: false,
      scaling: false,
      revisit: false,
      eliteBoardMath: false,
      debtMath: false,
      talentUiActions: false
    };
  }

  function talentPassiveActivationReadiness(state){
    const hunter = hunterBoardClarityPassiveContract(state);
    const debt = debtCollectorClarityPassiveContract(state);
    const passivesReady = [
      {
        id: hunter.nodeKey,
        contractDefined: true,
        contractSmoked: true,
        displayCopyDefined: true,
        displayCopySurface: 'Elite Board summary only',
        passiveReady: hunter.passiveReady,
        passiveEnabled: hunter.passiveEnabled,
        activationStatus: 'live (copy-only)',
        saveMutation: false,
        gameplayEffect: false,
        blockedSystems: [
          'talent earning',
          'talent spending',
          'talent unlocks',
          'combat scaling',
          'economy',
          'gear',
          'monsters'
        ]
      },
      {
        id: debt.nodeKey,
        contractDefined: true,
        contractSmoked: true,
        displayCopyDefined: true,
        displayCopySurface: 'Debt Collector preview helper only',
        passiveReady: debt.passiveReady,
        passiveEnabled: debt.passiveEnabled,
        activationStatus: 'preview-ready when learned; live renderer locked',
        saveMutation: false,
        gameplayEffect: false,
        blockedSystems: [
          'talent earning',
          'talent spending',
          'talent unlocks',
          'debt math',
          'combat scaling',
          'economy',
          'gear',
          'monsters'
        ]
      }
    ];
    return Object.freeze({
      passivesReady: Object.freeze(passivesReady.map(passive => Object.freeze({
        ...passive,
        blockedSystems: Object.freeze(passive.blockedSystems.slice())
      }))),
      readinessSummary: Object.freeze({
        total: 2,
        contractReady: 2,
        displayReady: 1,
        gameplayActive: 0,
        nextCandidate: null
      })
    });
  }

  function talentPassiveActivationGateDryRun(state){
    const readiness = talentPassiveActivationReadiness(state);
    const readinessByNode = new Map(readiness.passivesReady.map(passive => [passive.id, passive]));
    const blockedSystems = [
      'combat',
      'economy',
      'rewards',
      'progression',
      'Revisit',
      'debt math',
      'pressure',
      'repayment',
      'monsters',
      'gear',
      'scaling'
    ];
    const allowedSurface = 'display-copy only';
    const activationPolicyEnabled = false;
    const definitions = [
      {
        nodeKey: 'hunter_board_clarity',
        label: 'Board Clarity',
        contract: hunterBoardClarityPassiveContract(state),
        activationBlockedReason: 'Further activation is blocked; the existing Elite Board renderer remains copy-only.',
        requiredFutureSteps: [
          'Explicitly authorize any future copy-only activation change.',
          'Add activation-gate smoke coverage for the authorized renderer path.'
        ]
      },
      {
        nodeKey: 'debt_collector_clarity',
        label: 'Debt Collector Clarity',
        contract: debtCollectorClarityPassiveContract(state),
        activationBlockedReason: 'Activation is blocked by missing live Debt Collector renderer wiring; the renderer surface remains inactive.',
        requiredFutureSteps: [
          'Explicitly authorize live Debt Collector display-copy wiring.',
          'Wire the copy helper into the live renderer without changing debt behavior.',
          'Add renderer integration smoke coverage.'
        ]
      }
    ];
    const passives = definitions.map(definition => {
      const readinessEntry = readinessByNode.get(definition.nodeKey);
      const safetyGatesSatisfied = !!readinessEntry
        && readinessEntry.contractDefined === true
        && readinessEntry.displayCopyDefined === true
        && readinessEntry.contractSmoked === true
        && definition.contract.liveRendererWired === true
        && allowedSurface === 'display-copy only'
        && blockedSystems.length === 11
        && readinessEntry.saveMutation === false
        && readinessEntry.gameplayEffect === false;
      return Object.freeze({
        nodeKey: definition.nodeKey,
        label: definition.label,
        readinessKnown: !!readinessEntry,
        contractHelperPresent: readinessEntry?.contractDefined === true,
        displayCopyHelperPresent: readinessEntry?.displayCopyDefined === true,
        smokeGuarded: readinessEntry?.contractSmoked === true,
        learned: definition.contract.learned === true,
        passiveReady: definition.contract.passiveReady === true,
        passiveEnabled: definition.contract.passiveEnabled === true,
        liveRendererWired: definition.contract.liveRendererWired === true,
        canActivateNow: safetyGatesSatisfied && activationPolicyEnabled,
        activationBlockedReason: definition.activationBlockedReason,
        requiredFutureSteps: Object.freeze(definition.requiredFutureSteps.slice()),
        allowedSurface,
        blockedSystems: Object.freeze(blockedSystems.slice()),
        mutatesSave: false,
        appliesGameplayEffect: false
      });
    });
    return Object.freeze({
      dryRun: true,
      passives: Object.freeze(passives),
      canActivateAnyNow: false,
      mutatesSave: false,
      appliesGameplayEffect: false
    });
  }

  function applyHunterBoardClarityCopy(state, boardCardOrCopy){
    const passiveContract = hunterBoardClarityPassiveContract(state);
    const copy = boardCardOrCopy && typeof boardCardOrCopy === 'object' && !Array.isArray(boardCardOrCopy)
      ? {...boardCardOrCopy}
      : { text: String(boardCardOrCopy || '')};
    if (!passiveContract.passiveEnabled) return copy;
    const target = copy.targetLocation || copy.targetFloor || copy.where || copy.whereText || '';
    const objective = copy.contractText || copy.objective || copy.summary || '';
    const reward = copy.rewardPreview || copy.rewardText || copy.reward || '';
    if (target) copy.targetLocation = `Target: ${target}`;
    if (objective) copy.contractText = `Objective: ${objective}`;
    if (reward) copy.rewardPreview = `Reward preview: ${reward}`;
    if (copy.flavor) copy.flavor = `Clarity note: ${copy.flavor}`;
    if (copy.title) copy.title = `${copy.title} (clear read)`;
    if (copy.summary) copy.summary = `Clear read: ${copy.summary}`;
    copy.passiveSurface = 'Elite Board display copy only';
    copy.passiveApplied = true;
    return copy;
  }

  function applyDebtCollectorClarityCopy(state, debtCardOrCopy){
    const passiveContract = debtCollectorClarityPassiveContract(state);
    const copy = debtCardOrCopy && typeof debtCardOrCopy === 'object' && !Array.isArray(debtCardOrCopy)
      ? {...debtCardOrCopy}
      : { text: String(debtCardOrCopy || '') };
    if (!passiveContract.passiveReady) return copy;
    const status = copy.statusLabel || copy.status || copy.state || copy.summary || '';
    const owed = copy.balanceLabel || copy.balanceText || copy.amountOwed || copy.balance || '';
    const pressure = copy.pressureLabel || copy.pressureText || copy.pressure || '';
    const terms = copy.termsLabel || copy.terms || copy.note || '';
    const reminder = copy.reminderLabel || copy.reminder || copy.flavor || '';
    if (status) copy.statusLabel = `Debt status: ${status}`;
    if (owed) copy.balanceLabel = `Amount owed: ${owed}`;
    if (pressure) copy.pressureLabel = `Pressure: ${pressure}`;
    if (terms) copy.termsLabel = `Terms: ${terms}`;
    if (reminder) copy.reminderLabel = `Reminder: ${reminder}`;
    copy.passiveSurface = 'Debt Collector live renderer copy only';
    copy.passiveApplied = true;
    return copy;
  }

  function debtCollectorClarityRendererCopyModel(state, rendererCopy){
    const passiveContract = debtCollectorClarityPassiveContract(state);
    const copy = rendererCopy && typeof rendererCopy === 'object' && !Array.isArray(rendererCopy)
      ? {...rendererCopy}
      : {};
    if (!passiveContract.passiveReady) return copy;
    if (copy.active) {
      copy.summaryText = 'Active debt. Pressure is visible.';
      copy.flavorText = copy.balanceText && copy.pressureText
        ? `${copy.balanceText}. ${copy.pressureDetail || 'Pressure is visible.'}`
        : 'Debt is active. Pressure is visible.';
      copy.termsText = 'Repay spends purse coin. Pressure is visible only.';
    } else {
      copy.summaryText = 'No active debt. Pressure is quiet.';
      copy.flavorText = 'No debt due. Pressure is quiet.';
      copy.termsText = 'Repay spends purse coin. Pressure is visible only.';
    }
    copy.passiveSurface = 'Debt Collector live renderer copy only';
    copy.clarityApplied = true;
    copy.previewOnly = true;
    return copy;
  }

  function calculatePendingTalentMilestoneAwards(state, enabledOverride = false){
    const sourceId = TALENT_EARNING_SOURCE_CONTRACT.sourceId;
    const zeroState = {
      enabled: false,
      sourceId,
      reachedMilestones: [],
      alreadyAwardedMilestones: [],
      pendingMilestones: [],
      pendingPoints: 0,
      previewOnly: true,
      dryRun: true
    };
    const earning = state?.player?.talentEarning;
    if (enabledOverride !== true && earning?.enabled !== true) return zeroState;

    let milestonesReached = earning?.milestonesReached;
    try {
      if (!milestonesReached || typeof milestonesReached !== 'object' || Array.isArray(milestonesReached) || Object.getPrototypeOf(milestonesReached) !== Object.prototype) {
        milestonesReached = {};
      }
    } catch (_) {
      milestonesReached = {};
    }

    const reachedMilestones = Array.from(new Set(getAllReachedMilestones(state)
      .map(entry => normaliseMilestoneId(entry?.milestone))
      .filter(Boolean)));
    const alreadyAwardedMilestones = Array.from(new Set(Object.keys(milestonesReached)
      .filter(id => milestonesReached[id] === true)));
    const alreadyAwarded = new Set(alreadyAwardedMilestones);
    const pendingMilestones = reachedMilestones.filter(id => !alreadyAwarded.has(id));
    return {
      enabled: true,
      sourceId,
      reachedMilestones,
      alreadyAwardedMilestones,
      pendingMilestones,
      pendingPoints: pendingMilestones.length,
      previewOnly: true,
      dryRun: true
    };
  }

  function safeTalentMilestonesReached(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    try {
      if (Object.getPrototypeOf(value) !== Object.prototype) return {};
    } catch (err) {
      return {};
    }
    return value;
  }

  function applyPendingTalentMilestoneAwards(state){
    const sourceId = TALENT_EARNING_SOURCE_CONTRACT.sourceId;
    const earning = state?.player?.talentEarning;
    const currentPoints = Math.max(0, Math.floor(N(earning?.pointsAwarded, 0, 0, Number.MAX_SAFE_INTEGER)));
    if (!state?.player || earning?.enabled !== true) {
      return {
        ok: true,
        enabled: false,
        awardedMilestones: [],
        awardedPoints: 0,
        totalPointsAwarded: currentPoints,
        availablePoints: currentPoints,
        sourceId
      };
    }
    const result = calculatePendingTalentMilestoneAwards(state, false);
    const awardedMilestones = Array.isArray(result?.pendingMilestones) ? result.pendingMilestones.slice() : [];
    const milestonesReached = safeTalentMilestonesReached(earning.milestonesReached);
    awardedMilestones.forEach(id => {
      milestonesReached[id] = true;
    });
    earning.milestonesReached = milestonesReached;
    earning.pointsAwarded = currentPoints + awardedMilestones.length;
    const totalPointsAwarded = earning.pointsAwarded;
    const availablePoints = totalPointsAwarded;
    const ledger = state.player.talentLedger;
    if (ledger && typeof ledger === 'object') {
      ledger.lifetimePoints = totalPointsAwarded;
      ledger.availablePoints = availablePoints;
      ledger.spentPoints = 0;
      ledger.previewOnly = true;
      ledger.unlocked = false;
      ledger.earnedSources = [{ sourceId, points: totalPointsAwarded }];
    }
    return {
      ok: true,
      enabled: true,
      awardedMilestones,
      awardedPoints: awardedMilestones.length,
      totalPointsAwarded,
      availablePoints,
      sourceId
    };
  }

  function talentPointLedger(state){
    const player = state?.player || {};
    const source = safeLedgerSource(player.talentLedger);
    const notes = ownValue(source, 'notes', []);
    const earning = safeLedgerSource(player.talentEarning);
    const totalPointsAwarded = Math.max(0, Math.floor(N(ownValue(earning, 'pointsAwarded', 0), 0, 0, Number.MAX_SAFE_INTEGER)));
    return {
      version: Math.max(1, Math.floor(N(ownValue(source, 'version', 1), 1, 1, 999999))),
      unlocked: false,
      previewOnly: true,
      lifetimePoints: totalPointsAwarded,
      availablePoints: totalPointsAwarded,
      spentPoints: 0,
      earnedSources: [{ sourceId: TALENT_EARNING_SOURCE_CONTRACT.sourceId, points: totalPointsAwarded }],
      notes: Array.isArray(notes) ? notes.map(note => String(note || '').trim()).filter(Boolean).slice(0, 6) : []
    };
  }

  function talentPointLedgerSummary(state){
    const ledger = talentPointLedger(state);
    return {
      previewOnly: ledger.previewOnly === true,
      unlocked: ledger.unlocked === true,
      lifetimePoints: ledger.lifetimePoints,
      availablePoints: ledger.availablePoints,
      spentPoints: ledger.spentPoints,
      canEarn: true,
      canSpend: false,
      sourceCount: Array.isArray(ledger.earnedSources) ? ledger.earnedSources.length : 0
    };
  }

  function talentEffects(state){
    ensureTalents(state);
    return zeroTalentBonuses();
  }

  function learn(state, id){
    ensureTalents(state);
    return false;
  }

  function reset(state){
    if (!state?.player) return false;
    if (typeof resetTalents === 'function') {
      const ok = resetTalents(state);
      if (ok && typeof calcDerived === 'function') calcDerived(state);
      if (ok) log(state, 'Talent points reset. Unlocks returned to zero.');
      return ok;
    }
    state.player.talents = { pointsEarned:0, pointsSpent:0, unlocked:{}, spent:{} };
    state.player.talentPointsEarned = 0;
    state.player.talentPointsSpent = 0;
    state.player.talentPoints = 0;
    state.player.talentUnlockIds = [];
    if (typeof calcDerived === 'function') calcDerived(state);
    log(state, 'Talent points reset. Unlocks returned to zero.');
    return true;
  }

  function talentPanel(){
    return typeof el === 'function' ? el('talentPanel') : document.getElementById('talentPanel');
  }

  function safeTalentSummary(state){
    ensureTalents(state);
    return {
      pointsEarned: 0,
      pointsSpent: 0,
      pointsAvailable: 0,
      unlockedIds: [],
      bonuses: zeroTalentBonuses()
    };
  }

  function securedTalentDepth(state){
    return Math.max(
      1,
      Math.floor(N(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(N(state?.player?.returnDepth, 1, 1, 999999)),
      Math.floor(N(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
  }

  function talentMilestoneInfo(state, summary){
    const securedDepth = securedTalentDepth(state);
    return {
      securedDepth,
      securedPoints: 0,
      nextDepth: 0,
      progress: 0,
      maxed: false,
      statusLabel: 'Talent earning inactive.',
      progressLabel: 'Progress disabled in locked preview.',
      ruleLabel: 'No talent points can be earned or spent yet.'
    };
  }

  function talentPreviewNodeMarkup(node, branch){
    return `<article class="talent-preview-node is-locked">
      <div class="talent-path-head">
        <div>
          <span class="talent-path-label">${H(branch.title)}</span>
          <h3>${H(node.title)}</h3>
        </div>
        <span class="talent-state-pill is-locked">Locked</span>
      </div>
      <p class="talent-path-effect">${H(node.passivePreviewDescription || node.plannedEffect)}</p>
      <p class="small muted talent-path-summary">${H(node.branchSummary || node.detail)}</p>
      <p class="talent-path-note small muted">${H(node.requirementPreview || node.status)}</p>
      <div class="talent-preview-tags">
        <span class="pill">Preview</span>
        <span class="pill">Planned</span>
        <span class="pill">Inactive</span>
      </div>
    </article>`;
  }

  function renderTalentPanel(state){
    const panel = talentPanel();
    if (!panel || !state?.player) return;
    ensureTalents(state);
    const ledger = talentPointLedger(state);
    const ledgerSummary = talentPointLedgerSummary(state);
    const rulesSummary = talentRulesetSummary(state);
    const preview = talentTreePreview(state);
    const summary = talentTreePreviewSummary(state);
    panel.innerHTML = `
      <div class="card-head talent-head">
        <div>
          <h2>Talent Tree Preview</h2>
          <p>Locked preview only. No talent points, purchases, unlocks, or bonuses are active.</p>
          <div class="talent-passive-note small">Planned passives only. Inactive.</div>
        </div>
        <span class="pill rarity-rare">Locked</span>
      </div>
      <div class="talent-preview-banner small">
        <strong>Locked preview</strong>
        <span>Planning only. No earning, spending, or bonuses.</span>
      </div>
      <section class="talent-ledger-card">
        <div class="split talent-ledger-head">
          <div>
            <strong>Talent Ledger</strong>
            <p class="small muted">Ledger preview only. Earning and spending stay off.</p>
          </div>
          <span class="pill">Preview</span>
        </div>
        <div class="talent-summary-row small muted talent-ledger-chips">
          <span>Locked</span>
          <span>0 available</span>
          <span>Spending inactive</span>
          <span>No active points</span>
        </div>
        <div class="talent-milestone-line small" aria-label="Talent ledger status">
          <span>Preview only</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Unlocked: ${ledgerSummary.unlocked ? 'yes' : 'no'}</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Lifetime: ${ledgerSummary.lifetimePoints}</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Available: ${ledgerSummary.availablePoints}</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Spent: ${ledgerSummary.spentPoints}</span>
        </div>
      </section>
      <section class="talent-ledger-card talent-rules-card">
        <div class="split talent-ledger-head">
          <div>
            <strong>Ruleset Foundation</strong>
            <p class="small muted">Read-only future rules. Gameplay remains off.</p>
          </div>
          <span class="pill">Locked</span>
        </div>
        <div class="talent-summary-row small muted talent-ledger-chips">
          <span>Source: ${H(rulesSummary.pointSourceLabels[0] || 'Milestones')}</span>
          <span>Cap ${F(rulesSummary.earlyCap)} planned / ${F(rulesSummary.activeCap)} active</span>
          <span>${F(rulesSummary.branchCount)} branches</span>
          <span>${F(rulesSummary.tierCount)} tiers</span>
          <span>${F(rulesSummary.nodeCount)} nodes</span>
        </div>
        <div class="talent-milestone-line small" aria-label="Talent ruleset status">
          <span>Earning disabled</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Spending disabled</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Unlocks disabled</span>
          <span class="talent-separator" aria-hidden="true">&bull;</span>
          <span>Passives disabled</span>
        </div>
      </section>
      <div class="talent-point-line small" aria-label="Talent preview totals">
        <span><b>Branches:</b> ${F(summary.totalBranches)}</span>
        <span class="talent-separator" aria-hidden="true">&bull;</span>
        <span><b>Nodes:</b> ${F(summary.totalNodes)}</span>
        <span class="talent-separator" aria-hidden="true">&bull;</span>
        <span><b>Status:</b> Locked / preview only</span>
      </div>
      <div class="talent-milestone-line small" aria-label="Talent preview status">
        <span><b>Locked nodes:</b> ${F(summary.lockedNodes)}</span>
        <span>Active nodes: ${F(summary.activeNodes)}</span>
      </div>
      <div class="talent-summary-row small muted">
        <span>Preview only.</span>
        <span>Inactive.</span>
        <span>No gameplay effects.</span>
      </div>
      <div class="talent-preview-grid">
        ${preview.branches.map(branch => `
          <section class="talent-preview-branch">
            <div class="split talent-preview-branch-head">
              <div>
                <strong>${H(branch.title)}</strong>
                <p class="small muted">${H(branch.detail)}</p>
              </div>
              <span class="pill">Locked</span>
            </div>
            <div class="talent-meter-row">
              <span>Nodes ${F(branch.nodeCount)}</span>
              <span>Preview</span>
              <span>Inactive</span>
            </div>
            <div class="talent-preview-node-grid">
              ${branch.nodes.map(node => talentPreviewNodeMarkup(node, branch)).join('')}
            </div>
          </section>`).join('')}
      </div>
      <div class="talent-footer">
        <span class="small muted">${H(summary.previewOnly ? 'Preview only. No points or bonuses.' : '')}</span>
      </div>`;
  }

  function boardCost(state){
    if (!state.town) state.town = {};
    const current = Math.floor(+state.town.lowfireBoardRefreshCost || C(0,1,25));
    return state.town.lowfireBoardRefreshCost = Math.max(C(0,0,25), Math.min(C(0,8,0), current));
  }
  // TODO(v1.7): Revisit contracts can eventually point at earlier districts and old boss markers without changing board rules now.
  function contractState(state){ return typeof ensureEliteContractState === 'function' ? ensureEliteContractState(state) : {active:null,claimed:[]}; }
  function contractPool(state){
    const st = contractState(state); if (st.active) return [];
    const all = typeof ELITE_CONTRACTS !== 'undefined' && Array.isArray(ELITE_CONTRACTS) ? ELITE_CONTRACTS : [];
    return all.filter(c => typeof isEliteContractAvailable === 'function' ? isEliteContractAvailable(c, st, state) : true);
  }
  function shuffle(list){ const out=list.slice(); for(let i=out.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
  function rollBoard(state){
    if (!state.town) state.town = {};
    const pool = contractPool(state), count = Math.min(3, pool.length);
    state.town.lowfireBoardOffers = shuffle(pool).slice(0,count).map(c => c.id);
    state.town.eliteBoardContracts = [];
    state.town.lowfireBoardRolledAt = Date.now();
    return state.town.lowfireBoardOffers;
  }
  function ensureBoard(state){
    if (!state?.town) return [];
    boardCost(state);
    const valid = new Set(contractPool(state).map(c => c.id));
    state.town.lowfireBoardOffers = Array.isArray(state.town.lowfireBoardOffers) ? state.town.lowfireBoardOffers.filter(id => valid.has(id)) : [];
    if (!state.town.lowfireBoardOffers.length && valid.size) rollBoard(state);
    return state.town.lowfireBoardOffers;
  }
  function refreshBoard(state){
    if (!state?.player) return false;
    if (contractState(state).active) return log(state, 'Finish or claim the active Lowfire mark before shuffling the board.'), false;
    const cost = boardCost(state);
    if ((state.player.gold||0) < cost) return log(state, `Need ${M(cost)} to shuffle the Lowfire Board.`), false;
    state.player.gold = Math.max(0, Math.floor(+state.player.gold||0) - cost);
    rollBoard(state);
    state.town.lowfireBoardRefreshCost = Math.min(C(0,8,0), cost + C(0,0,75));
    log(state, `Lowfire Board shuffled for ${M(cost)}.`);
    return true;
  }

  function filteredContracts(state, base){
    const st = contractState(state); if (st.active) return [];
    ensureBoard(state);
    const offers = Array.isArray(state?.town?.lowfireBoardOffers) ? state.town.lowfireBoardOffers : [];
    const byId = new Map(base.map(c => [c.id,c]));
    const chosen = offers.map(id => byId.get(id)).filter(Boolean);
    return chosen.length ? chosen : base.slice(0, Math.min(3, base.length));
  }
  function contractReward(contract,state){ return typeof calculateContractReward === 'function' ? calculateContractReward(contract,state) : C(0,2,0); }
  function contractObj(contract){ return typeof eliteContractObjective === 'function' ? eliteContractObjective(contract) : `${contract.goal || 3} marked elites`; }
  function contractRisk(contract){ return typeof eliteContractRiskLevel === 'function' ? eliteContractRiskLevel(contract) : 'Medium'; }
  function contractDef(id){ return typeof eliteContractDef === 'function' ? eliteContractDef(id) : null; }
  function rivalContracts(state){ return typeof availableEliteRivals === 'function' ? availableEliteRivals(state) : []; }
  function activeReward(active,contract,state){ return typeof activeContractRewardAmount === 'function' ? activeContractRewardAmount(active,contract,state) : contractReward(contract,state); }
  function threatStars(threat){
    if (typeof eliteContractThreatStars === 'function') return eliteContractThreatStars(threat);
    const filled = Math.max(1, Math.min(3, Math.floor(+threat || 1)));
    return `${'★'.repeat(filled)}${'☆'.repeat(3 - filled)}`;
  }
  function contractModel(contract,state,accepted=false,seed=null){
    if (typeof eliteBoardContractModel === 'function') return eliteBoardContractModel(contract,state,accepted,seed);
    if (!contract) return null;
    const targetFloor = Math.max(1, Math.floor(+seed?.targetFloor || +contract.targetFloor || 4));
    const eliteName = seed?.eliteName || contract.eliteName || contract.name || 'Unlisted Elite';
    return {
      id: contract.id,
      eliteName,
      title: seed?.title || contract.title || `WANTED: ${eliteName}`,
      district: seed?.district || contract.district || 'Lowfire District',
      targetLocation: seed?.targetLocation || contract.targetLocation || eliteContractTargetLocationLabel(targetFloor),
      targetFloor,
      threat: Math.max(1, Math.min(3, Math.floor(+seed?.threat || +contract.threat || 1))),
      modifier: '',
      modifierKey: '',
      contractText: seed?.contractText || contract.contractText || `Defeat ${eliteName} when it appears.`,
      bonusWrit: seed?.bonusWrit || contract.bonusWrit || 'Defeat it before resting.',
      rewardPreview: seed?.rewardPreview || contract.rewardPreview || '+silver, +elite loot',
      flavor: seed?.flavor || contract.flavor || contract.summary || 'A paid mark for wardens willing to face elite danger.',
      accepted: !!accepted,
      completed: !!seed?.completed,
      expired: !!seed?.expired,
      failed: !!seed?.failed
    };
  }
  function generatedContracts(state,list,acceptedId=''){
    if (!state.town) state.town = {};
    const ids = list.map(c => c.id).join('|');
    const existing = Array.isArray(state.town.eliteBoardContracts) ? state.town.eliteBoardContracts : [];
    const existingIds = existing.map(c => c && c.id).filter(Boolean).join('|');
    if (ids && ids === existingIds && existing.length === list.length && existing.every(model => model?.eliteName && model?.targetFloor && model?.contractText)) {
      return existing;
    }
    const byId = new Map(existing.map(model => [model?.id, model]).filter(entry => entry[0]));
    const models = list.map(c => contractModel(c,state,c.id === acceptedId,byId.get(c.id))).filter(Boolean);
    state.town.eliteBoardContracts = models;
    return models;
  }
  function targetText(model){
    if (model?.targetLocation) return model.targetLocation;
    if (model?.targetFloor && model.targetFloor !== '?') return `Floor ${model.targetFloor}`;
    return 'Target assigned on accept';
  }
  function bonusWritState(active){
    if (!active) return 'Pending';
    if (active.bonusWritCompleted) return 'Completed';
    if (active.bonusWritMissed || active.bonusWritFailed) return 'Missed';
    return 'Pending';
  }
  function huntStatusLabel(active, ready){
    if (ready) return 'Completed';
    if (active?.failed) return 'Failed';
    if (active?.expired) return 'Expired';
    if (active?.rivalContract) return 'Rival';
    if (active?.bonusWritCompleted) return 'Bonus Complete';
    if (active?.bonusWritMissed || active?.bonusWritFailed) return 'Bonus Missed';
    if (active) return 'Active';
    return 'Active';
  }
  function activeStateText(active, ready){
    if (ready) return 'Completed';
    if (active?.failed) return 'Failed';
    if (active?.expired) return 'Expired';
    if (active?.status === 'active') return 'Active';
    return 'Active';
  }
  function trophyStrip(summary){
    const latest = summary.latestLabel && summary.latestLabel !== 'None yet' ? `Latest: ${summary.latestLabel}` : 'Latest: none yet';
    return `<div class="elite-trophy-strip"><div><strong>Elite Trophies</strong><p>${F(summary.uniqueFound)} found${summary.totalFound ? ` • ${F(summary.totalFound)} total` : ''}</p><p class="small muted">${H(latest)}</p></div><span class="pill">Trophy Bonus Preview: +${F(summary.bonus)}% board payout</span></div>`;
  }
  function boardNotice(st){
    const failed = Array.isArray(st.failed) ? st.failed[0] : null;
    if (failed) return `<div class="lowfire-board-note small muted"><b>Failed writ: ${H(failed.eliteName || 'Unknown mark')}.</b> ${H(failed.failureNote || 'The board reclaimed the contract after your fall.')}</div>`;
    const expired = Array.isArray(st.expired) ? st.expired[0] : null;
    if (expired) return `<div class="lowfire-board-note small muted"><b>Expired writ: ${H(expired.eliteName || 'Unknown mark')}.</b> The target slipped past its posted floor.</div>`;
    const completedRival = Array.isArray(st.rivals) ? st.rivals.filter(r => r.completed).sort((a,b) => N(b.updatedAt || b.createdAt,0) - N(a.updatedAt || a.createdAt,0))[0] : null;
    if (completedRival) return `<div class="lowfire-board-note small muted"><b>Rival cleared:</b> ${H(completedRival.eliteName)}. The board scratched its name from the danger list.</div>`;
    const completedCount = Math.max(Array.isArray(st.claimed) ? st.claimed.length : 0, Array.isArray(st.completed) ? st.completed.length : 0);
    if (completedCount) return `<div class="lowfire-board-note small muted"><b>Claimed contracts:</b> ${F(completedCount)} paid out. New marks are posted below.</div>`;
    return '';
  }
  function boardStateStrip(st, availableCount, state){
    const failedCount = Array.isArray(st.failed) ? st.failed.length : 0;
    const expiredCount = Array.isArray(st.expired) ? st.expired.length : 0;
    const rivalCount = rivalContracts(state).length;
    const completedCount = Math.max(Array.isArray(st.claimed) ? st.claimed.length : 0, Array.isArray(st.completed) ? st.completed.length : 0);
    return `<div class="active-contract-summary small"><span><b>Posted:</b> ${F(availableCount)}</span><span><b>Claimed:</b> ${F(completedCount)}</span><span><b>Failed:</b> ${F(failedCount)}</span><span><b>Expired:</b> ${F(expiredCount)}</span><span><b>Rival danger:</b> ${F(rivalCount)}</span></div>`;
  }
  function contractCard(model,contract,state,active=null){
    const displayModel = applyHunterBoardClarityCopy(state, model);
    const accepted = !!model.accepted;
    const rival = !!(model.rivalContract || active?.rivalContract);
    const completed = !!(model.completed || active?.completed || active?.complete);
    const expired = !!(model.expired || active?.expired);
    const failed = !!(model.failed || active?.failed);
    const button = active
      ? (completed ? '<button class="primary mini" id="claimEliteContractBtn">Claim Reward</button>' : `<span class="small muted">${active.status === 'active' ? 'Contract target engaged.' : 'Reach the target floor to draw out the hunt.'}</span>`)
      : rival
        ? `<button class="primary mini" data-start-rival="${H(model.rivalId)}">${accepted ? 'Accepted' : 'Accept Rival Hunt'}</button>`
        : `<button class="primary mini" data-start-contract="${H(model.id)}">${accepted ? 'Accepted' : 'Accept Contract'}</button>`;
    const reward = contract ? M(contractReward(contract,state)) : '';
    const statusText = active ? activeStateText(active, completed) : failed ? 'Failed' : expired ? 'Expired' : completed ? 'Completed' : rival ? 'Revenge available' : 'Available';
    const progress = active ? Math.min(1, Math.floor(N(active.progress,0,0,1))) : 0;
    const pct = active ? Math.min(100, Math.round(progress * 100)) : 0;
    return `<div class="elite-contract-card contract-identity-card ${accepted?'accepted':''} ${completed?'completed':''} ${expired?'expired':''} ${failed?'failed':''}">
      <div class="contract-wanted-line"><strong>${H(displayModel.title)}</strong>${accepted?'<span class="pill rarity-rare">Accepted</span>':''}</div>
      <div class="contract-elite-name">${H(displayModel.eliteName)}</div>
      <div class="elite-contract-detail-grid contract-identity-grid small">
        <span><b>Mark:</b> ${H(displayModel.eliteName)}</span>
        <span><b>Where:</b> ${H(displayModel.targetLocation || targetText(displayModel))}</span>
        <span><b>Objective:</b> ${H(displayModel.contractText || `Defeat ${displayModel.eliteName} when it appears.`)}</span>
        <span><b>Bonus Goal:</b> ${H(displayModel.bonusWrit || 'Pending')}</span>
        <span><b>Danger:</b> <span class="contract-threat">${H(threatStars(displayModel.threat))}</span></span>
        <span><b>Status:</b> ${H(statusText)}</span>
        ${rival ? '<span><b>Rival Layer:</b> Revenge hunt</span>' : ''}
        ${rival ? `<span><b>Killed you:</b> ${F(displayModel.defeats || displayModel.rivalDefeats || active?.rivalDefeats || 1)} time${(displayModel.defeats || displayModel.rivalDefeats || active?.rivalDefeats || 1) === 1 ? '' : 's'}</span>` : ''}
        ${rival ? `<span><b>Last seen:</b> ${H(displayModel.killedPlayerAtLocation || 'Unknown floor')}</span>` : ''}
        <span><b>Reward Preview:</b> ${H(displayModel.rewardPreview)}${reward ? ` (${reward})` : ''}</span>
      </div>
      <p class="small muted contract-flavor">${H(displayModel.flavor)}</p>
      ${active && contract ? `<div class="elite-contract-meter"><div style="width:${pct}%"></div></div>` : ''}
      <div class="elite-contract-actions"><span class="pill">${accepted ? (rival ? 'Active Rival Hunt' : 'Active Board Hunt') : (rival ? 'Rival Danger Layer' : 'Board Contract')}</span>${button}</div>
    </div>`;
  }

  function rivalCard(rival,state){
    const contract = contractDef(rival.sourceContractId) || contractDef('lowfire_bounty');
    const model = {
      id: contract?.id || rival.sourceContractId || 'lowfire_bounty',
      rivalId: rival.id,
      rivalContract: true,
      eliteName: rival.eliteName,
      title: `RIVAL SIGHTED: ${rival.eliteName}`,
      district: rival.floorName || 'Elite Board',
      targetFloor: '?',
      targetLocation: rival.killedPlayerAtLocation || rival.floorName || 'Elite Board',
      threat: 3,
      contractText: `Defeat ${rival.eliteName} and reclaim the writ.`,
      bonusWrit: contract?.bonusWrit || 'Defeat it before resting.',
      rewardPreview: '+silver, +rare chance, trophy chance',
      killedPlayerAtLocation: rival.killedPlayerAtLocation || '',
      defeats: Math.max(1, Math.floor(N(rival.defeats,1,1,9999))),
      flavor: `Killed you ${F(rival.defeats || 1)} time${(rival.defeats || 1) === 1 ? '' : 's'}.`
    };
    return contractCard(model, contract, state, null);
  }

  function rivalSection(state){
    const rivals = rivalContracts(state);
    if (!rivals.length) return '';
    return `<div class="rival-writ-section"><div class="split rival-writ-head"><strong>Rival Writs</strong><span class="pill">${F(rivals.length)} danger layer</span></div>${rivals.slice(0,1).map(rival => rivalCard(rival,state)).join('')}</div>`;
  }

  function boardMarkup(state){
    const st = contractState(state), active = st.active;
    const trophySummary = typeof eliteTrophySummary === 'function' ? eliteTrophySummary(state) : { totalFound:0, uniqueFound:0, latestLabel:'None yet', bonus:0 };
    try {
      if (active) {
        const c = contractDef(active.id); if (!c) return '<p class="small muted elite-contract-empty">The board is being rewritten. Check back after the next descent.</p>';
        const ready = active.complete || active.completed, reward = activeReward(active,c,state);
        const model = contractModel({...c, ...active}, state, true);
        return `<div class="elite-contract-board lowfire-board-v2 elite-contract-identity-board"><div class="elite-contract-head"><div><h3>Lowfire Elite Board</h3><p>One hunt can be active. Finish or claim it before taking another mark; rival writs are the danger layer.</p></div><span class="pill ${ready?'rarity-rare':''}">${ready?'Ready':active.rivalContract?'Rival Hunt':'Active Hunt'}</span></div><div class="active-contract-summary small"><span><b>${active.rivalContract?'Rival Writ':'Active Hunt'}:</b> ${H(model.eliteName)}</span><span><b>Where:</b> ${H(targetText(model))}</span>${active.rivalContract ? `<span><b>Last seen:</b> ${H(model.killedPlayerAtLocation || 'unknown')}</span>` : ''}<span><b>Bonus Goal:</b> ${H(model.bonusWrit || 'none')}</span><span><b>Bonus:</b> ${H(bonusWritState(active))}</span><span><b>Hunt:</b> ${H(huntStatusLabel(active, ready))}</span><span><b>Held Reward:</b> ${M(reward)}</span></div>${trophyStrip(trophySummary)}${contractCard(model,c,state,active)}</div>`;
      }
      const list = typeof availableEliteContracts === 'function' ? availableEliteContracts(state) : filteredContracts(state, contractPool(state));
      const models = generatedContracts(state, list, '');
      const cards = models.length ? models.map(model => contractCard(model, contractDef(model.id), state)).join('') : '<p class="small muted elite-contract-empty">The board is being rewritten. Check back after the next descent.</p>';
      return `<div class="elite-contract-board lowfire-board-v2 elite-contract-identity-board"><div class="elite-contract-head"><div><h3>Lowfire Elite Board</h3><p>Choose one posted mark before the next descent. Rivals are the extra danger layer.</p></div><button class="ghost mini refresh-compact" id="refreshLowfireBoardBtn"><span>Random Board</span><strong>${M(boardCost(state))}</strong></button></div>${boardStateStrip(st, models.length, state)}${boardNotice(st)}<div class="lowfire-board-note small muted">Three contracts are posted at a time. Reward previews show the payout; Bonus Goals are optional.</div>${trophyStrip(trophySummary)}${rivalSection(state)}<div class="elite-contract-list contract-identity-list">${cards}</div></div>`;
    } catch (_) {
      return `<div class="elite-contract-board lowfire-board-v2 elite-contract-identity-board"><div class="elite-contract-head"><div><h3>Lowfire Elite Board</h3><p>Choose one posted mark before the next descent. Rivals are the extra danger layer.</p></div></div><p class="small muted elite-contract-empty">The board is being rewritten. Check back after the next descent.</p></div>`;
    }
  }

  function currencyStrip(state){
    return `<div class="town-currency-strip" aria-label="Compact currency reference"><span>Coin ${M(state.player.gold || 0)}</span><span>Spark ${F(state.player.forgeSpark || 0)}</span><span>Shards ${F(state.player.shards || 0)}</span><span>Ember ${F(state.player.ember || 0)}</span><span>Favor ${F(state.town?.relicFavor || 0)}</span></div>`;
  }
  function injectCss(){
    if (document.getElementById('ddWardenTalentBoardCss')) return;
    const st = document.createElement('style'); st.id = 'ddWardenTalentBoardCss';
    st.textContent = `.town-currency-strip{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:5px;font-size:10.75px;line-height:1.15;color:rgba(244,232,210,.82)}.town-currency-strip span{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.18);padding:3px 6px;font-weight:650;white-space:nowrap}.lowfire-board-v2 .elite-contract-head{align-items:flex-start;gap:8px}.lowfire-board-note{margin:-2px 0 8px}.lowfire-board-v2 .active-contract-summary{gap:5px 7px;margin:6px 0 9px}.lowfire-board-v2 .active-contract-summary span{border-color:rgba(255,190,110,.14);background:rgba(255,190,110,.045);line-height:1.18}.lowfire-board-v2 .elite-contract-list{gap:8px}.lowfire-board-v2 .elite-contract-card{padding:10px;gap:6px}.lowfire-board-v2 .elite-contract-card .split{gap:6px}.lowfire-board-v2 .elite-contract-detail-grid{gap:5px 8px}.lowfire-board-v2 .elite-contract-detail-grid span{line-height:1.25;padding:3px 0}.lowfire-board-v2 .contract-threat{color:#ffd287}.lowfire-board-v2 .elite-contract-actions .pill{border-color:rgba(255,190,110,.22);background:rgba(255,190,110,.065)}#talentPanel{font-size:12px}.talent-meter-row{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}.talent-meter-row span{border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:3px 6px;background:rgba(255,255,255,.035)}.talent-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.talent-preview-branch{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;background:rgba(255,255,255,.025)}.talent-preview-branch-head{align-items:flex-start;gap:8px}.talent-preview-node-grid{display:grid;grid-template-columns:1fr;gap:7px;margin-top:6px}.talent-preview-node{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px;background:rgba(0,0,0,.18)}.talent-preview-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.talent-preview-tags .pill{font-size:10px;padding:3px 6px}.talent-card,.talent-tree{display:none}.talent-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}@media(max-width:720px){.talent-preview-grid{grid-template-columns:1fr}.talent-footer{align-items:flex-start;flex-direction:column}}@media(max-width:360px){#talentPanel{font-size:11.25px}.talent-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.talent-preview-branch{padding:6px}.talent-preview-branch-head{gap:3px}.talent-preview-branch-head p{display:none}.talent-preview-node-grid{gap:4px;margin-top:3px}.talent-preview-node{padding:5px}.talent-preview-node .talent-path-effect,.talent-preview-node .talent-path-summary,.talent-preview-node .talent-path-note{font-size:9.5px;line-height:1.12}.talent-preview-tags{gap:2px;margin-top:3px}.talent-preview-tags .pill{padding:2px 4px}}`;
    document.head.appendChild(st);
  }

  function talentRewardDepth(state){
    return Math.max(
      1,
      Math.floor(N(state?.player?.safeExtractDepth, 1, 1, 999999)),
      Math.floor(N(state?.player?.permanentStartFloor, 1, 1, 999999))
    );
  }

  function talentRewardBase(contract, state){
    if (!contract) return 0;
    const base = Math.max(0, Math.floor(N(contract.baseReward ?? contract.reward, 0, 0, Number.MAX_SAFE_INTEGER)));
    const floorBonus = Math.floor(N(contract.floorBonusPerDepth, 0, 0, Number.MAX_SAFE_INTEGER)) * talentRewardDepth(state);
    return Math.max(0, base + floorBonus);
  }

  function talentRewardAmount(contract, state, active = null){
    const base = talentRewardBase(contract, state);
    if (base <= 0) return 0;
    const bonus = talentBonusValue(state, 'eliteBoardRewardPct');
    const rivalMultiplier = active?.rivalContract ? 1.10 : 1;
    const boosted = Math.round(base * rivalMultiplier * (1 + bonus));
    return Math.max(base, Math.max(1, Math.min(Math.max(base, Math.floor(N(contract.maxReward, base, base, Number.MAX_SAFE_INTEGER))), boosted)));
  }

  function talentCharterCost(depth){
    const baseCost = typeof oldCharterCost === 'function' ? oldCharterCost(depth) : C(0, 1, 25);
    if (baseCost <= 0) return 0;
    const bonus = talentBonusValue(typeof S !== 'undefined' ? S : null, 'charterCostPct');
    return bonus > 0 ? Math.max(1, Math.round(baseCost * (1 - bonus))) : baseCost;
  }

  const oldCalc = typeof calcDerived === 'function' ? calcDerived : null;
  if (oldCalc) calcDerived = function(state){
    const total = oldCalc(state);
    if (!state?.player || !total) return total;
    const bonuses = talentEffects(state);
    if (bonuses.maxHpPct > 0) {
      const baseMaxHp = Math.max(1, Math.floor(N(state.player.maxHp, 1, 1, 999999)));
      const bonusHp = Math.max(1, Math.round(baseMaxHp * bonuses.maxHpPct));
      state.player.maxHp = baseMaxHp + bonusHp;
      state.player.hp = Math.floor(N(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
      total.hpBonus = Math.max(0, Math.floor(N(total.hpBonus, 0, 0, 999999))) + bonusHp;
    }
    total.talentBonuses = bonuses;
    return total;
  };

  const oldSellValue = typeof sellValue === 'function' ? sellValue : null;
  if (oldSellValue) sellValue = function(item){
    const base = Math.max(1, Math.floor(N(oldSellValue(item), 1, 1, Number.MAX_SAFE_INTEGER)));
    const bonus = talentBonusValue(typeof S !== 'undefined' ? S : null, 'sellValuePct');
    return bonus > 0 ? Math.max(1, Math.round(base * (1 + bonus))) : base;
  };

  const oldContractReward = typeof calculateContractReward === 'function' ? calculateContractReward : null;
  if (oldContractReward) calculateContractReward = function(contract, state){
    const base = Math.max(0, Math.floor(N(oldContractReward(contract, state), 0, 0, Number.MAX_SAFE_INTEGER)));
    const bonus = talentBonusValue(state, 'eliteBoardRewardPct');
    return bonus > 0 ? Math.max(1, Math.round(base * (1 + bonus))) : base;
  };

  const oldActiveReward = typeof activeContractRewardAmount === 'function' ? activeContractRewardAmount : null;
  if (oldActiveReward) activeContractRewardAmount = function(active, contract, state){
    if (!active || !contract) return 0;
    if (!Number.isFinite(Number(active.talentRewardBase))) active.talentRewardBase = talentRewardBase(contract, state);
    const base = Math.max(0, Math.floor(N(active.talentRewardBase, 0, 0, Number.MAX_SAFE_INTEGER)));
    const reward = talentRewardAmount(contract, state, active);
    active.rewardAmount = reward;
    active.talentRewardBonusPct = talentBonusValue(state, 'eliteBoardRewardPct');
    return reward || base;
  };

  const oldCharterCost = typeof charterStartCost === 'function' ? charterStartCost : null;
  if (oldCharterCost) charterStartCost = function(depth){
    return talentCharterCost(depth);
  };

  const oldAvail = typeof availableEliteContracts === 'function' ? availableEliteContracts : null;
  if (oldAvail) availableEliteContracts = function(state){ return filteredContracts(state, oldAvail(state)); };
  if (typeof eliteContractBoardMarkup === 'function') eliteContractBoardMarkup = boardMarkup;

  const oldTown = typeof renderTown === 'function' ? renderTown : null;
  if (oldTown) renderTown = function(){ oldTown(); injectCss(); if (typeof S !== 'undefined') { ensureBoard(S); const slot = typeof el === 'function' ? el('districtWalletSlot') : document.getElementById('districtWalletSlot'); if (slot) slot.innerHTML = currencyStrip(S); } };
  const oldGear = typeof renderGear === 'function' ? renderGear : null;
  if (oldGear) renderGear = function(){ oldGear(); injectCss(); if (typeof S !== 'undefined') renderTalentPanel(S); };
  const oldBind = typeof bindDynamic === 'function' ? bindDynamic : null;
  if (oldBind) bindDynamic = function(){ oldBind(); injectCss(); const r = document.getElementById('refreshLowfireBoardBtn'); if (r) r.onclick = () => guard(() => { refreshBoard(S); render(); }); document.querySelectorAll('[data-start-rival]').forEach(btn => btn.onclick = () => guard(() => { if (typeof startEliteRivalContract === 'function') startEliteRivalContract(S, btn.dataset.startRival); render(); })); };

  const api = {
    build: SCRIPT_BUILD,
    defs: TALENT_DEFS,
    paths: TALENT_PATHS,
    passivePreviewMap: talentPassivePreviewMap,
    passivePreviewSummary: talentPassivePreviewSummary,
    previewBranchSummary: talentPreviewBranchSummary,
    previewNodeDetails: talentPreviewNodeDetails,
    ruleset: talentRulesetPreview,
    rulesetSummary: talentRulesetSummary,
    rulesetNodes: talentPreviewNodes,
    earningSourceContract: talentEarningSourceContract,
    earningEnabled: talentEarningEnabled,
    earningStatus: talentEarningStatus,
    detectBossMilestones,
    detectDepthMilestones,
    getAllReachedMilestones,
    calculateTalentPointsFromMilestones,
    calculateTalentSpendDryRun,
    applyTalentNodeSpend,
    talentNodeStateContract,
    hunterBoardClarityPassiveContract,
    applyHunterBoardClarityCopy,
    debtCollectorClarityPassiveContract,
    applyDebtCollectorClarityCopy,
    debtCollectorClarityRendererCopyModel,
    readinessMatrix: talentPassiveActivationReadiness,
    readinessReport: state => {
      const matrix = talentPassiveActivationReadiness(state);
      return matrix?.readinessSummary || null;
    },
    talentPassiveActivationGateDryRun,
    calculatePendingTalentMilestoneAwards,
    applyPendingTalentMilestoneAwards,
    preview: talentTreePreview,
    previewSummary: talentTreePreviewSummary,
    ledger: talentPointLedger,
    ledgerSummary: talentPointLedgerSummary,
    ensure: ensureTalents,
    getState: ensureTalents,
    getAvailablePoints: availableTalentPoints,
    has: () => false,
    bonus: talentBonusValue,
    bonuses: talentEffects,
    unlock: learn,
    reset,
    grantPoints: (state, amount = 1) => {
      ensureTalents(state);
      return 0;
    },
    resetTalents: reset,
    unlockForTest: learn,
    passiveContract: (state, nodeKey) => {
      const resolvedNodeKey = normaliseMilestoneId(nodeKey);
      if (resolvedNodeKey === 'hunter_board_clarity') return hunterBoardClarityPassiveContract(state);
      if (resolvedNodeKey === 'debt_collector_clarity') return debtCollectorClarityPassiveContract(state);
      return null;
    },
    summary: state => {
      return safeTalentSummary(state);
    },
    milestoneInfo: state => talentMilestoneInfo(state, null),
    summaryText: state => {
      const summary = api.summary(state);
      const milestone = api.milestoneInfo(state);
      const unlockedNames = summary.unlockedIds
        .map(id => TALENT_BY_ID[id]?.name || id)
        .join(', ') || 'none';
      const pathLabels = TALENT_PATHS.map(path => path.label).join(', ');
      return [
        `Talent points: ${summary.pointsAvailable} available, ${summary.pointsSpent} spent, ${summary.pointsEarned} earned.`,
        `${milestone.statusLabel} ${milestone.progressLabel} ${milestone.ruleLabel}`,
        `Unlocked: ${unlockedNames}.`,
        `Paths: ${pathLabels}.`,
        `Bonuses: HP +${Math.round(summary.bonuses.maxHpPct * 100)}%, Board +${Math.round(summary.bonuses.eliteBoardRewardPct * 100)}%, Charters -${Math.round(summary.bonuses.charterCostPct * 100)}%, Sell +${Math.round(summary.bonuses.sellValuePct * 100)}%.`
      ].join(' ');
    },
    smoke: state => {
      if (!state?.player) return { ok:false, reason:'no state' };
      const snapshot = JSON.parse(JSON.stringify(state));
      try {
        delete snapshot.player.talents;
        delete snapshot.player.talentPointsEarned;
        delete snapshot.player.talentPointsSpent;
        delete snapshot.player.talentPoints;
        delete snapshot.player.talentUnlockIds;
        ensureTalents(snapshot);
        const cleaned = api.summary(snapshot);
        const preview = api.preview(snapshot);
        return {
          ok: true,
          available: cleaned.pointsAvailable,
          unlocked: cleaned.unlockedIds.length,
          summary: api.summaryText(snapshot),
          previewBranches: preview.branches.length,
          previewNodes: preview.nodes.length
        };
      } catch (err) {
        return { ok:false, reason: err?.message || String(err) };
      }
    }
  };
  window.DungeonDexTalents = api;
  window.DungeonDexWardenTalents = api;
  injectCss();
  if (typeof S !== 'undefined') { ensureTalents(S); ensureBoard(S); if (typeof calcDerived === 'function') calcDerived(S); }
  if (typeof render === 'function') render();
})();
