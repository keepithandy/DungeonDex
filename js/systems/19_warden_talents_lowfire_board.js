'use strict';

// DungeonDex v1.6.17 - Talent System Foundation + Lowfire Board.
(function(){
  if (window.DDWardenTalentsLowfireBoard) return;
  window.DDWardenTalentsLowfireBoard = true;

  const SCRIPT_BUILD = '1.6.25-early-dungeon-revisit-planning-stub';
  const TALENT_UI_POINT_STEP = 5;
  const TALENT_UI_POINT_CAP = 20;
  const H = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const F = v => typeof format === 'function' ? format(v) : String(Math.round(Number(v) || 0));
  const M = v => typeof formatMoney === 'function' ? formatMoney(v) : `${Math.floor(Number(v) || 0)}c`;
  const C = (g=0,s=0,c=0) => typeof coins === 'function' ? coins(g,s,c) : Math.max(0, Math.round(g*10000+s*100+c));
  const N = (v,d=0,min=-Infinity,max=Infinity) => typeof numberOr === 'function' ? numberOr(v,d,min,max) : Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Number(v) : d));
  const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
  const log = (state, text) => { if (typeof pushLog === 'function') pushLog(state, text); };

  const TALENT_PATHS = [
    { id:'survivor', label:'Survivor', summary:'Staying alive, recovery, and safer runs.' },
    { id:'hunter', label:'Hunter', summary:'Elite Board marks, rivals, and trophy flow.' },
    { id:'delver', label:'Delver', summary:'Deep stairs, charters, and boss pressure.' },
    { id:'collector', label:'Collector', summary:'Loot value, archive value, and careful selling.' }
  ];

  const TALENT_DEFS = [
    { id:'survivor_hardened_start', path:'survivor', name:'Hardened Start', effect:'+5% max HP', summary:'More room for early mistakes.', note:'Survivor passive.' },
    { id:'hunter_board_regular', path:'hunter', name:'Board Regular', effect:'+5% Elite Board payout', summary:'Board contracts pay a little more.', note:'Hunter passive.' },
    { id:'delver_stair_sense', path:'delver', name:'Stair Sense', effect:'Charters cost 5% less', summary:'Deep Stair routes are cheaper.', note:'Delver passive.' },
    { id:'collector_appraiser', path:'collector', name:'Appraiser', effect:'+5% sell value', summary:'Unequipped gear sells for more.', note:'Collector passive.' }
  ];

  const TALENT_BY_ID = Object.fromEntries(TALENT_DEFS.map(def => [def.id, def]));
  const TALENT_PATH_BY_ID = Object.fromEntries(TALENT_PATHS.map(path => [path.id, path]));

  function ensureTalents(state){
    if (typeof repairTalentState === 'function') return repairTalentState(state);
    if (!state?.player) return { pointsEarned:0, pointsSpent:0, unlocked:{}, spent:{}, unlockedIds:[] };
    if (!state.player.talents || typeof state.player.talents !== 'object') state.player.talents = { pointsEarned:0, pointsSpent:0, unlocked:{}, unlockedIds:[] };
    if (!state.player.talents.unlocked || typeof state.player.talents.unlocked !== 'object') state.player.talents.unlocked = {};
    state.player.talents.spent = state.player.talents.unlocked;
    state.player.talentPointsEarned = Math.max(0, Math.floor(Number(state.player.talents.pointsEarned) || 0));
    state.player.talentPointsSpent = Math.max(0, Math.floor(Number(state.player.talents.pointsSpent) || 0));
    state.player.talentPoints = Math.max(0, state.player.talentPointsEarned - state.player.talentPointsSpent);
    state.player.talentUnlockIds = Array.isArray(state.player.talentUnlockIds)
      ? state.player.talentUnlockIds.map(id => String(id || '').trim()).filter(Boolean)
      : Object.keys(state.player.talents.unlocked);
    return state.player.talents;
  }

  function availableTalentPoints(state){
    return typeof getAvailableTalentPoints === 'function'
      ? getAvailableTalentPoints(state)
      : Math.max(0, Math.floor(Number(state?.player?.talentPoints) || 0));
  }

  function talentEffects(state){
    const bonuses = typeof getTalentBonuses === 'function'
      ? getTalentBonuses(state)
      : { maxHpPct:0, eliteBoardRewardPct:0, charterCostPct:0, sellValuePct:0 };
    return bonuses;
  }

  function learn(state, id){
    const def = TALENT_BY_ID[id];
    if (!def) return false;
    ensureTalents(state);
    if (typeof unlockTalent === 'function') {
      const ok = unlockTalent(state, id);
      if (ok && typeof calcDerived === 'function') calcDerived(state);
      if (ok) log(state, `Talent unlocked: ${def.path === 'survivor' ? 'Survivor' : def.path === 'hunter' ? 'Hunter' : def.path === 'delver' ? 'Delver' : 'Collector'} - ${def.name}.`);
      return ok;
    }
    if (availableTalentPoints(state) <= 0 || state.player.talents.unlocked[id]) return false;
    state.player.talents.unlocked[id] = true;
    state.player.talents.pointsSpent = Object.keys(state.player.talents.unlocked).length;
    state.player.talents.unlockedIds = Object.keys(state.player.talents.unlocked);
    state.player.talentPointsSpent = state.player.talents.pointsSpent;
    state.player.talentPoints = Math.max(0, state.player.talentPointsEarned - state.player.talentPointsSpent);
    state.player.talentUnlockIds = state.player.talents.unlockedIds.slice();
    if (typeof calcDerived === 'function') calcDerived(state);
    log(state, `Talent unlocked: ${def.name}.`);
    return true;
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
    const fallback = {
      pointsEarned: Math.max(0, Math.floor(Number(state?.player?.talentPointsEarned) || 0)),
      pointsSpent: Math.max(0, Math.floor(Number(state?.player?.talentPointsSpent) || 0)),
      pointsAvailable: availableTalentPoints(state),
      unlockedIds: Object.keys(state?.player?.talents?.unlocked || {}),
      bonuses: talentEffects(state)
    };
    const raw = typeof talentSummary === 'function' ? (talentSummary(state) || fallback) : fallback;
    const unlockedIds = Array.isArray(raw.unlockedIds) ? raw.unlockedIds : fallback.unlockedIds;
    return {
      ...raw,
      pointsEarned: Math.max(0, Math.floor(N(raw.pointsEarned, fallback.pointsEarned, 0, 999999))),
      pointsSpent: Math.max(0, Math.floor(N(raw.pointsSpent, fallback.pointsSpent, 0, 999999))),
      pointsAvailable: Math.max(0, Math.floor(N(raw.pointsAvailable, fallback.pointsAvailable, 0, 999999))),
      unlockedIds: unlockedIds.map(id => String(id || '').trim()).filter(Boolean),
      bonuses: raw.bonuses || fallback.bonuses
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
    const securedPoints = Math.max(0, Math.min(TALENT_UI_POINT_CAP, Math.floor(securedDepth / TALENT_UI_POINT_STEP)));
    const currentPoint = securedPoints;
    const maxed = currentPoint >= TALENT_UI_POINT_CAP;
    const baseDepth = currentPoint * TALENT_UI_POINT_STEP;
    const nextDepth = maxed ? TALENT_UI_POINT_CAP * TALENT_UI_POINT_STEP : (currentPoint + 1) * TALENT_UI_POINT_STEP;
    const progress = maxed ? TALENT_UI_POINT_STEP : Math.max(0, Math.min(TALENT_UI_POINT_STEP, securedDepth - baseDepth));
    return {
      securedDepth,
      securedPoints,
      nextDepth,
      progress,
      maxed,
      statusLabel: maxed ? 'All milestone points earned.' : `Next point: secure depth ${F(nextDepth)}`,
      progressLabel: maxed ? `Max points: ${F(TALENT_UI_POINT_CAP)}` : `Progress: ${F(progress)} / ${F(TALENT_UI_POINT_STEP)} secured depths`,
      ruleLabel: `1 point per ${F(TALENT_UI_POINT_STEP)} secured depths. Max ${F(TALENT_UI_POINT_CAP)}.`
    };
  }

  function talentPathCardMarkup(state, def, summary){
    const path = TALENT_PATH_BY_ID[def.path] || { label:def.path, summary:'' };
    const unlocked = !!summary.unlockedIds.includes(def.id);
    const hasPoints = summary.pointsAvailable > 0;
    const stateKey = unlocked ? 'unlocked' : hasPoints ? 'ready' : 'locked';
    const stateLabel = unlocked ? 'Unlocked' : hasPoints ? 'Ready' : 'Locked';
    const buttonLabel = unlocked ? 'Unlocked' : hasPoints ? 'Unlock' : 'Need Point';
    return `<article class="talent-path-card is-${H(stateKey)}">
      <div class="talent-path-head">
        <div>
          <span class="talent-path-label">${H(path.label)}</span>
          <h3>${H(def.name)}</h3>
        </div>
        <span class="talent-state-pill is-${H(stateKey)}">${H(stateLabel)}</span>
      </div>
      <p class="talent-path-effect">${H(def.effect)}</p>
      <p class="small muted talent-path-summary">${H(def.summary)}</p>
      <p class="talent-path-note small muted">${H(def.note)}</p>
      <div class="talent-path-actions">
        <button class="primary mini talent-state-button is-${H(stateKey)}" ${unlocked ? '' : `data-learn-talent="${H(def.id)}"`} ${unlocked || !hasPoints ? 'disabled' : ''}>${H(buttonLabel)}</button>
      </div>
    </article>`;
  }

  function renderTalentPanel(state){
    const panel = talentPanel();
    if (!panel || !state?.player) return;
    ensureTalents(state);
    const summary = safeTalentSummary(state);
    const milestone = talentMilestoneInfo(state, summary);
    const visibleUnlockedCount = summary.unlockedIds.filter(id => TALENT_BY_ID[id]).length;
    const hiddenCount = summary.unlockedIds.filter(id => !TALENT_BY_ID[id]).length;
    panel.innerHTML = `
      <div class="card-head talent-head">
        <div>
          <h2>Warden Talents</h2>
          <p>Passive bonuses earned through secured depth milestones.</p>
          <div class="talent-passive-note small">Passive only. No combat buttons.</div>
        </div>
        <span class="pill rarity-rare">${F(summary.pointsAvailable)} available</span>
      </div>
      <div class="talent-point-line small" aria-label="Talent point totals">
        <span><b>Available:</b> ${F(summary.pointsAvailable)}</span>
        <span class="talent-separator" aria-hidden="true">&bull;</span>
        <span><b>Spent:</b> ${F(summary.pointsSpent)}</span>
        <span class="talent-separator" aria-hidden="true">&bull;</span>
        <span><b>Earned:</b> ${F(summary.pointsEarned)}</span>
      </div>
      <div class="talent-milestone-line small" aria-label="Talent milestone progress">
        <span><b>${H(milestone.statusLabel)}</b></span>
        <span>${H(milestone.progressLabel)}</span>
      </div>
      <div class="talent-summary-row small muted">
        <span>Earn points by securing deeper milestones.</span>
        <span>${F(visibleUnlockedCount)} unlocked</span>
        <span>${H(milestone.ruleLabel)}</span>
      </div>
      <div class="talent-grid">${TALENT_DEFS.map(def => talentPathCardMarkup(state, def, summary)).join('')}</div>
      <div class="talent-footer">
        <button class="ghost mini" id="resetTalentsBtn">Reset Talents</button>
        <span class="small muted">${hiddenCount ? `${F(hiddenCount)} legacy or unknown unlock id${hiddenCount === 1 ? '' : 's'} preserved in save and hidden here.` : 'Legacy aliases and the unlock mirror repair quietly.'}</span>
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
    st.textContent = `.town-currency-strip{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:5px;font-size:10.75px;line-height:1.15;color:rgba(244,232,210,.82)}.town-currency-strip span{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.18);padding:3px 6px;font-weight:650;white-space:nowrap}.lowfire-board-v2 .elite-contract-head{align-items:flex-start;gap:8px}.lowfire-board-note{margin:-2px 0 8px}.lowfire-board-v2 .active-contract-summary{gap:5px 7px;margin:6px 0 9px}.lowfire-board-v2 .active-contract-summary span{border-color:rgba(255,190,110,.14);background:rgba(255,190,110,.045);line-height:1.18}.lowfire-board-v2 .elite-contract-list{gap:8px}.lowfire-board-v2 .elite-contract-card{padding:10px;gap:6px}.lowfire-board-v2 .elite-contract-card .split{gap:6px}.lowfire-board-v2 .elite-contract-detail-grid{gap:5px 8px}.lowfire-board-v2 .elite-contract-detail-grid span{line-height:1.25;padding:3px 0}.lowfire-board-v2 .contract-threat{color:#ffd287}.lowfire-board-v2 .elite-contract-actions .pill{border-color:rgba(255,190,110,.22);background:rgba(255,190,110,.065)}#talentPanel{font-size:12px}.talent-meter-row{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}.talent-meter-row span{border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:3px 6px;background:rgba(255,255,255,.035)}.talent-tree-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.talent-tree{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;background:rgba(255,255,255,.025)}.talent-card{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(0,0,0,.18);color:inherit;padding:7px;margin:0 0 6px}.talent-card:disabled{opacity:.62}.talent-card-top{display:flex;justify-content:space-between;gap:6px}.talent-card-top strong{font-size:12px}.talent-card-top em{font-style:normal;font-size:11px;color:#f2c06b}.talent-effect,.talent-lore{display:block;font-size:11px;line-height:1.2}.talent-effect{margin-top:3px;color:rgba(255,235,190,.9);font-weight:700}.talent-lore{margin-top:2px;color:rgba(230,222,205,.62)}.talent-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}@media(max-width:720px){.talent-tree-grid{grid-template-columns:1fr}.talent-footer{align-items:flex-start;flex-direction:column}}`;
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
    const bonus = getTalentBonus(state, 'eliteBoardRewardPct');
    const rivalMultiplier = active?.rivalContract ? 1.10 : 1;
    const boosted = Math.round(base * rivalMultiplier * (1 + bonus));
    return Math.max(base, Math.max(1, Math.min(Math.max(base, Math.floor(N(contract.maxReward, base, base, Number.MAX_SAFE_INTEGER))), boosted)));
  }

  function talentCharterCost(depth){
    const baseCost = typeof oldCharterCost === 'function' ? oldCharterCost(depth) : C(0, 1, 25);
    if (baseCost <= 0) return 0;
    const bonus = getTalentBonus(typeof S !== 'undefined' ? S : null, 'charterCostPct');
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
    const bonus = getTalentBonus(typeof S !== 'undefined' ? S : null, 'sellValuePct');
    return bonus > 0 ? Math.max(1, Math.round(base * (1 + bonus))) : base;
  };

  const oldContractReward = typeof calculateContractReward === 'function' ? calculateContractReward : null;
  if (oldContractReward) calculateContractReward = function(contract, state){
    const base = Math.max(0, Math.floor(N(oldContractReward(contract, state), 0, 0, Number.MAX_SAFE_INTEGER)));
    const bonus = getTalentBonus(state, 'eliteBoardRewardPct');
    return bonus > 0 ? Math.max(1, Math.round(base * (1 + bonus))) : base;
  };

  const oldActiveReward = typeof activeContractRewardAmount === 'function' ? activeContractRewardAmount : null;
  if (oldActiveReward) activeContractRewardAmount = function(active, contract, state){
    if (!active || !contract) return 0;
    if (!Number.isFinite(Number(active.talentRewardBase))) active.talentRewardBase = talentRewardBase(contract, state);
    const base = Math.max(0, Math.floor(N(active.talentRewardBase, 0, 0, Number.MAX_SAFE_INTEGER)));
    const reward = talentRewardAmount(contract, state, active);
    active.rewardAmount = reward;
    active.talentRewardBonusPct = getTalentBonus(state, 'eliteBoardRewardPct');
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
  if (oldBind) bindDynamic = function(){ oldBind(); injectCss(); const r = document.getElementById('refreshLowfireBoardBtn'); if (r) r.onclick = () => guard(() => { refreshBoard(S); render(); }); document.querySelectorAll('[data-start-rival]').forEach(btn => btn.onclick = () => guard(() => { if (typeof startEliteRivalContract === 'function') startEliteRivalContract(S, btn.dataset.startRival); render(); })); document.querySelectorAll('[data-learn-talent]').forEach(btn => btn.onclick = () => guard(() => { learn(S, btn.dataset.learnTalent); render(); })); const resetBtn = document.getElementById('resetTalentsBtn'); if (resetBtn) resetBtn.onclick = () => guard(() => { if (window.confirm && !window.confirm('Reset all talent points?')) return; reset(S); render(); }); };

  const api = {
    build: SCRIPT_BUILD,
    defs: TALENT_DEFS,
    paths: TALENT_PATHS,
    ensure: ensureTalents,
    getState: ensureTalents,
    getAvailablePoints: availableTalentPoints,
    has: hasTalent,
    bonus: getTalentBonus,
    bonuses: talentEffects,
    unlock: learn,
    reset,
    grantPoints: typeof grantTalentPoints === 'function' ? grantTalentPoints : (state, amount = 1) => {
      if (!state?.player) return 0;
      const next = Math.max(0, Math.floor(Number(amount) || 0));
      if (!next) return 0;
      ensureTalents(state);
      state.player.talents.pointsEarned += next;
      state.player.talentPointsEarned = state.player.talents.pointsEarned;
      state.player.talentPoints = availableTalentPoints(state);
      return state.player.talents.pointsEarned;
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
        return {
          ok: true,
          available: cleaned.pointsAvailable,
          unlocked: cleaned.unlockedIds.length,
          summary: api.summaryText(snapshot)
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
