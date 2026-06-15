'use strict';

// DungeonDex v1.16.0 - Talent passive preview mapping.
(function(){
  if (window.DDWardenTalentsLowfireBoard) return;
  window.DDWardenTalentsLowfireBoard = true;

  const SCRIPT_BUILD = '1.16.0-talent-passive-preview-mapping';
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
    return JSON.parse(JSON.stringify(value));
  }

  const TALENT_PASSIVE_PREVIEW_MAP = {
    survivor: {
      branchName: 'Survivor',
      branchSummary: 'HP, guard, and safer-return planning only.',
      nodes: [
        { nodeKey:'survivor_sturdy_start', nodeTitle:'Sturdy Start', tier:1, costPreview:1, requirementPreview:'Preview only. Branch stays locked.', passivePreviewDescription:'Planned future passive for slightly sturdier opening runs. Inactive.' },
        { nodeKey:'survivor_safe_recovery', nodeTitle:'Safe Recovery', tier:2, costPreview:2, requirementPreview:'Preview only. Requires future branch progress.', passivePreviewDescription:'Planned future passive for safer early recovery after extraction. Inactive.' },
        { nodeKey:'survivor_guard_return', nodeTitle:'Guarded Return', tier:3, costPreview:3, requirementPreview:'Preview only. Future capstone gate disabled.', passivePreviewDescription:'Planned future passive for clearer death and extraction resilience language. Inactive.' }
      ]
    },
    hunter: {
      branchName: 'Hunter',
      branchSummary: 'Elite Board, rival, and contract readability only.',
      nodes: [
        { nodeKey:'hunter_board_clarity', nodeTitle:'Board Clarity', tier:1, costPreview:1, requirementPreview:'Preview only. Board rules remain locked.', passivePreviewDescription:'Planned future passive for better contract readability. Inactive.' },
        { nodeKey:'hunter_board_payout_plan', nodeTitle:'Payout Plan', tier:2, costPreview:2, requirementPreview:'Preview only. No payout changes are live.', passivePreviewDescription:'Planned future passive for small board payout planning. Inactive.' },
        { nodeKey:'hunter_rival_trace', nodeTitle:'Rival Trace', tier:3, costPreview:3, requirementPreview:'Preview only. Rival layer stays inert.', passivePreviewDescription:'Planned future passive for rival trace awareness. Inactive.' }
      ]
    },
    delver: {
      branchName: 'Delver',
      branchSummary: 'Dungeon depth, navigation, and charter planning only.',
      nodes: [
        { nodeKey:'delver_stair_sense', nodeTitle:'Stair Sense', tier:1, costPreview:1, requirementPreview:'Preview only. Depth gates are disabled.', passivePreviewDescription:'Planned future passive for stair sense and safer route planning. Inactive.' },
        { nodeKey:'delver_depth_plan', nodeTitle:'Depth Plan', tier:2, costPreview:2, requirementPreview:'Preview only. Future depth support is inert.', passivePreviewDescription:'Planned future passive for deeper-run planning. Inactive.' },
        { nodeKey:'delver_charter_support', nodeTitle:'Charter Support', tier:3, costPreview:3, requirementPreview:'Preview only. Charter support stays disabled.', passivePreviewDescription:'Planned future passive for future charter support. Inactive.' }
      ]
    },
    collector: {
      branchName: 'Collector',
      branchSummary: 'Loot, gear memory, archive, and trophy planning only.',
      nodes: [
        { nodeKey:'collector_item_appraisal', nodeTitle:'Item Appraisal', tier:1, costPreview:1, requirementPreview:'Preview only. Loot values are unchanged.', passivePreviewDescription:'Planned future passive for item appraisal. Inactive.' },
        { nodeKey:'collector_famous_memory', nodeTitle:'Famous Memory', tier:2, costPreview:2, requirementPreview:'Preview only. Gear memory remains read-only.', passivePreviewDescription:'Planned future passive for Famous Gear memory support. Inactive.' },
        { nodeKey:'collector_trophy_archive', nodeTitle:'Trophy Archive', tier:3, costPreview:3, requirementPreview:'Preview only. Trophy archive visibility only.', passivePreviewDescription:'Planned future passive for trophy and archive visibility. Inactive.' }
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
    note: 'Locked preview only.'
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
    earningEnabled: false,
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
        enabled: false,
        active: false,
        locked: true,
        previewOnly: true
      }
    ],
    pointCaps: {
      earlyCap: 6,
      previewCap: 6,
      absoluteCap: 12,
      activeCap: 0,
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
        status: 'Locked preview only. Inactive.'
      };
    })
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
    if (!branch) return null;
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
    if (!branch) return null;
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
    if (!node) return null;
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
    ruleset.earningEnabled = false;
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
      earningEnabled: false,
      spendingEnabled: false,
      unlocksEnabled: false,
      passiveEffectsEnabled: false,
      pointSourceCount: TALENT_RULESET_PREVIEW.pointSources.length,
      branchCount: TALENT_RULESET_PREVIEW.branches.length,
      tierCount: TALENT_RULESET_PREVIEW.tiers.length,
      nodeCount: TALENT_RULESET_PREVIEW.nodes.length,
      earlyCap: TALENT_RULESET_PREVIEW.pointCaps.earlyCap,
      activeCap: 0,
      spendableCap: 0,
      plannedMaxCost: costs.length ? Math.max(...costs) : 0,
      branchLabels: TALENT_RULESET_PREVIEW.branches.map(branch => branch.label),
      pointSourceLabels: TALENT_RULESET_PREVIEW.pointSources.map(source => source.label),
      costSummary: 'Tier costs planned: 1 / 2 / 3. Active cost: 0.'
    };
  }

  function talentPointLedger(state){
    const player = state?.player || {};
    const source = safeLedgerSource(player.talentLedger);
    const notes = ownValue(source, 'notes', []);
    return {
      version: Math.max(1, Math.floor(N(ownValue(source, 'version', 1), 1, 1, 999999))),
      unlocked: false,
      previewOnly: true,
      lifetimePoints: 0,
      availablePoints: 0,
      spentPoints: 0,
      earnedSources: [],
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
      canEarn: false,
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
          <p>Talent Tree Preview is locked. No talent points, purchases, unlocks, or bonuses are active yet.</p>
          <div class="talent-passive-note small">Preview only. Locked. Inactive. No gameplay effect yet.</div>
        </div>
        <span class="pill rarity-rare">Locked</span>
      </div>
      <div class="talent-preview-banner small">
        <strong>Locked preview</strong>
        <span>Talents are planning-only. No talent spending is live yet.</span>
      </div>
      <section class="talent-ledger-card">
        <div class="split talent-ledger-head">
          <div>
            <strong>Talent Ledger</strong>
            <p class="small muted">Foundation only. Talent points cannot be earned or spent yet.</p>
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
            <p class="small muted">Read-only future rules. Gameplay remains disabled.</p>
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
        <span><b>Status:</b> Locked preview only</span>
      </div>
      <div class="talent-milestone-line small" aria-label="Talent preview status">
        <span><b>Locked nodes:</b> ${F(summary.lockedNodes)}</span>
        <span>Active nodes: ${F(summary.activeNodes)}</span>
      </div>
      <div class="talent-summary-row small muted">
        <span>Preview only.</span>
        <span>Nothing is purchasable.</span>
        <span>No combat, economy, or save effects are active.</span>
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
        <span class="small muted">${H(summary.previewOnly ? 'Preview only. No spendable points, unlocks, or active bonuses exist here.' : '')}</span>
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
      <div class="contract-wanted-line"><strong>${H(model.title)}</strong>${accepted?'<span class="pill rarity-rare">Accepted</span>':''}</div>
      <div class="contract-elite-name">${H(model.eliteName)}</div>
      <div class="elite-contract-detail-grid contract-identity-grid small">
        <span><b>Mark:</b> ${H(model.eliteName)}</span>
        <span><b>Where:</b> ${H(model.targetLocation || targetText(model))}</span>
        <span><b>Objective:</b> ${H(model.contractText || `Defeat ${model.eliteName} when it appears.`)}</span>
        <span><b>Bonus Goal:</b> ${H(model.bonusWrit || 'Pending')}</span>
        <span><b>Danger:</b> <span class="contract-threat">${H(threatStars(model.threat))}</span></span>
        <span><b>Status:</b> ${H(statusText)}</span>
        ${rival ? '<span><b>Rival Layer:</b> Revenge hunt</span>' : ''}
        ${rival ? `<span><b>Killed you:</b> ${F(model.defeats || model.rivalDefeats || active?.rivalDefeats || 1)} time${(model.defeats || model.rivalDefeats || active?.rivalDefeats || 1) === 1 ? '' : 's'}</span>` : ''}
        ${rival ? `<span><b>Last seen:</b> ${H(model.killedPlayerAtLocation || 'Unknown floor')}</span>` : ''}
        <span><b>Reward Preview:</b> ${H(model.rewardPreview)}${reward ? ` (${reward})` : ''}</span>
      </div>
      <p class="small muted contract-flavor">${H(model.flavor)}</p>
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
