'use strict';
(function(){
  if (window.DDWardenTalentsLowfireBoard) return;
  window.DDWardenTalentsLowfireBoard = 1;

  const SCRIPT_BUILD = '1.4.9-warden-talents-lowfire-board';
  const H = value => typeof escapeHtml === 'function'
    ? escapeHtml(value)
    : String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const A = (value, fallback = []) => Array.isArray(value) ? value : fallback;
  const F = value => typeof format === 'function' ? format(value) : String(Math.round(Number(value) || 0));
  const Money = value => typeof formatMoney === 'function' ? formatMoney(value) : `${Math.floor(Number(value) || 0)}c`;
  const Guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
  const Coin = (g = 0, s = 0, c = 0) => typeof coins === 'function' ? coins(g, s, c) : Math.max(0, Math.round(g * 10000 + s * 100 + c));

  const TALENT_DEFS = [
    { id:'deep_cut', tree:'Blade', name:'Deep Cut', max:5, effect:'+3% Power per rank.', lore:'You learn where the stair-things keep their last warm seam.' },
    { id:'quick_footing', tree:'Blade', name:'Quick Footing', max:5, effect:'+1 Speed per rank.', lore:'Lowfire wardens survive by moving before the debt collector writes.' },
    { id:'relic_instinct', tree:'Blade', name:'Relic Instinct', max:5, effect:'+2% extra loot roll chance per rank.', lore:'The Hollow Stair clicks differently when a relic is hidden nearby.' },
    { id:'iron_breath', tree:'Ward', name:'Iron Breath', max:5, effect:'+12 Max HP per rank.', lore:'Breathe through smoke. Stand through panic. Keep the haul moving.' },
    { id:'shield_memory', tree:'Ward', name:'Shield Memory', max:5, effect:'+4% Guard per rank.', lore:'Every bad block leaves a lesson in the arm.' },
    { id:'lamp_luck', tree:'Ward', name:'Lamp Luck', max:5, effect:'+1 Luck per rank.', lore:'A small Lowfire lamp can still bend a bad room in your favor.' },
    { id:'scrappers_eye', tree:'Forge', name:"Scrapper's Eye", max:5, effect:'+8% shard gains per rank.', lore:'You stop seeing junk. You start seeing edges, rivets, teeth, and value.' },
    { id:'ember_sense', tree:'Forge', name:'Ember Sense', max:5, effect:'+8% chance per rank for +1 ember when ember drops.', lore:'The useful sparks are the ones still trying to escape.' },
    { id:'forge_hand', tree:'Forge', name:'Forge Hand', max:5, effect:'+1 Wit per rank.', lore:'The focused forge answers cleaner hands and steadier eyes.' }
  ];
  const TALENT_BY_ID = Object.fromEntries(TALENT_DEFS.map(def => [def.id, def]));
  const TALENT_TREES = ['Blade','Ward','Forge'];

  function bestProgressDepth(state) {
    const p = state?.player || {};
    return Math.max(1,
      Math.floor(Number(p.depth) || 0),
      Math.floor(Number(p.safeExtractDepth) || 0),
      Math.floor(Number(p.returnDepth) || 0),
      Math.floor(Number(p.permanentStartFloor) || 0)
    );
  }

  function earnedTalentPoints(state) {
    const p = state?.player || {};
    const levelPoints = Math.max(0, Math.floor(Number(p.level) || 1) - 1);
    const depthPoints = Math.floor(bestProgressDepth(state) / 15);
    return Math.min(60, levelPoints + depthPoints);
  }

  function spentTalentPoints(state) {
    const spent = state?.player?.talents?.spent || {};
    return Object.entries(spent).reduce((sum, [id, raw]) => {
      const def = TALENT_BY_ID[id];
      if (!def) return sum;
      return sum + Math.max(0, Math.min(def.max, Math.floor(Number(raw) || 0)));
    }, 0);
  }

  function ensureTalentState(state) {
    if (!state || !state.player) return { spent:{} };
    const previous = state.player.talents && typeof state.player.talents === 'object' ? state.player.talents : {};
    const rawSpent = previous.spent && typeof previous.spent === 'object' ? previous.spent : previous;
    const spent = {};
    TALENT_DEFS.forEach(def => {
      const rank = Math.max(0, Math.min(def.max, Math.floor(Number(rawSpent[def.id]) || 0)));
      if (rank > 0) spent[def.id] = rank;
    });
    const earned = earnedTalentPoints(state);
    const used = Object.values(spent).reduce((sum, rank) => sum + rank, 0);
    state.player.talents = { spent };
    state.player.talentPointsEarned = earned;
    state.player.talentPoints = Math.max(0, earned - used);
    return state.player.talents;
  }

  function talentRank(state, id) {
    const talents = ensureTalentState(state);
    return Math.max(0, Math.floor(Number(talents.spent[id]) || 0));
  }

  function talentEffects(state) {
    ensureTalentState(state);
    return {
      powerPct: talentRank(state, 'deep_cut') * 0.03,
      speedFlat: talentRank(state, 'quick_footing'),
      lootPct: talentRank(state, 'relic_instinct') * 0.02,
      hpFlat: talentRank(state, 'iron_breath') * 12,
      guardPct: talentRank(state, 'shield_memory') * 0.04,
      luckFlat: talentRank(state, 'lamp_luck'),
      shardPct: talentRank(state, 'scrappers_eye') * 0.08,
      emberChance: talentRank(state, 'ember_sense') * 0.08,
      witFlat: talentRank(state, 'forge_hand')
    };
  }

  function learnTalent(state, id) {
    const def = TALENT_BY_ID[id];
    if (!def) return false;
    ensureTalentState(state);
    const rank = talentRank(state, id);
    if (rank >= def.max) return false;
    if ((state.player.talentPoints || 0) <= 0) return false;
    state.player.talents.spent[id] = rank + 1;
    ensureTalentState(state);
    if (typeof calcDerived === 'function') calcDerived(state);
    if (typeof pushLog === 'function') pushLog(state, `Talent learned: ${def.name} ${rank + 1}/${def.max}.`);
    return true;
  }

  function resetTalents(state) {
    if (!state?.player) return false;
    state.player.talents = { spent:{} };
    ensureTalentState(state);
    if (typeof calcDerived === 'function') calcDerived(state);
    if (typeof pushLog === 'function') pushLog(state, 'Warden talents reset. Points returned.');
    return true;
  }

  function talentPanelElement() {
    const anchor = typeof el === 'function' ? el('gearPlayerPanel') : document.getElementById('gearPlayerPanel');
    if (!anchor || !anchor.parentNode) return null;
    let panel = document.getElementById('talentPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'talentPanel';
      panel.className = 'panel talent-panel';
      anchor.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function talentButtonMarkup(state, def) {
    const rank = talentRank(state, def.id);
    const points = Math.max(0, Math.floor(Number(state?.player?.talentPoints) || 0));
    const capped = rank >= def.max;
    const disabled = capped || points <= 0 ? 'disabled' : '';
    return `<button class="talent-card" data-learn-talent="${H(def.id)}" ${disabled}>
      <span class="talent-card-top"><strong>${H(def.name)}</strong><em>${rank}/${def.max}</em></span>
      <span class="talent-effect">${H(def.effect)}</span>
      <span class="talent-lore">${H(def.lore)}</span>
    </button>`;
  }

  function renderTalentPanel(state) {
    const panel = talentPanelElement();
    if (!panel || !state?.player) return;
    ensureTalentState(state);
    const earned = Math.max(0, Math.floor(Number(state.player.talentPointsEarned) || 0));
    const unspent = Math.max(0, Math.floor(Number(state.player.talentPoints) || 0));
    const used = spentTalentPoints(state);
    panel.innerHTML = `<div class="card-head talent-head">
      <div><h2>Warden Talents</h2><p>Small permanent upgrades earned from level-ups and secured descent progress.</p></div>
      <span class="pill rarity-rare">${unspent} point${unspent === 1 ? '' : 's'}</span>
    </div>
    <div class="talent-meter-row small muted"><span>Earned ${earned}</span><span>Spent ${used}</span><span>Next depth point every 15 secured steps.</span></div>
    <div class="talent-tree-grid">
      ${TALENT_TREES.map(tree => `<div class="talent-tree"><div class="split talent-tree-title"><strong>${H(tree)}</strong><span class="small muted">${tree === 'Blade' ? 'damage / drops' : tree === 'Ward' ? 'survival' : 'crafting'}</span></div>${TALENT_DEFS.filter(def => def.tree === tree).map(def => talentButtonMarkup(state, def)).join('')}</div>`).join('')}
    </div>
    <div class="talent-footer"><button class="ghost mini" id="resetTalentsBtn">Reset Talents</button><span class="small muted">Talents apply instantly and are saved with the warden.</span></div>`;
  }

  function lowfireBoardRefreshCost(state) {
    if (!state.town) state.town = {};
    const fallback = Coin(0, 1, 25);
    const current = Math.floor(Number(state.town.lowfireBoardRefreshCost) || fallback);
    state.town.lowfireBoardRefreshCost = Math.max(Coin(0, 0, 25), Math.min(Coin(0, 8, 0), current));
    return state.town.lowfireBoardRefreshCost;
  }

  function baseContractPool(state) {
    const contracts = typeof ensureEliteContractState === 'function' ? ensureEliteContractState(state) : { active:null, claimed:[] };
    if (contracts.active) return [];
    const all = Array.isArray(window.ELITE_CONTRACTS) ? window.ELITE_CONTRACTS : (typeof ELITE_CONTRACTS !== 'undefined' ? ELITE_CONTRACTS : []);
    return all.filter(contract => typeof isEliteContractAvailable === 'function' ? isEliteContractAvailable(contract, contracts, state) : true);
  }

  function shuffleCopy(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function rollLowfireBoardOffers(state) {
    if (!state.town) state.town = {};
    const pool = baseContractPool(state);
    const count = Math.min(pool.length, pool.length >= 3 ? 2 : pool.length);
    state.town.lowfireBoardOffers = shuffleCopy(pool).slice(0, count).map(contract => contract.id);
    state.town.lowfireBoardRolledAt = Date.now();
    return state.town.lowfireBoardOffers;
  }

  function ensureLowfireBoardState(state) {
    if (!state || !state.town) return [];
    lowfireBoardRefreshCost(state);
    const pool = baseContractPool(state);
    const valid = new Set(pool.map(contract => contract.id));
    state.town.lowfireBoardOffers = A(state.town.lowfireBoardOffers, []).map(String).filter(id => valid.has(id));
    if (!state.town.lowfireBoardOffers.length && pool.length) rollLowfireBoardOffers(state);
    return state.town.lowfireBoardOffers;
  }

  function refreshLowfireBoard(state) {
    if (!state?.player) return false;
    const active = typeof ensureEliteContractState === 'function' ? ensureEliteContractState(state).active : null;
    if (active) {
      if (typeof pushLog === 'function') pushLog(state, 'Finish or claim the active Lowfire mark before shuffling the board.');
      return false;
    }
    const cost = lowfireBoardRefreshCost(state);
    if ((state.player.gold || 0) < cost) {
      if (typeof pushLog === 'function') pushLog(state, `Need ${Money(cost)} to shuffle the Lowfire Board.`);
      return false;
    }
    state.player.gold = Math.max(0, Math.floor(Number(state.player.gold) || 0) - cost);
    rollLowfireBoardOffers(state);
    state.town.lowfireBoardRefreshCost = Math.min(Coin(0, 8, 0), cost + Coin(0, 0, 75));
    if (typeof pushLog === 'function') pushLog(state, `Lowfire Board shuffled for ${Money(cost)}.`);
    return true;
  }

  function townCurrencyStripMarkup(state) {
    const rest = typeof restCost === 'function' ? restCost(state) : 0;
    const board = lowfireBoardRefreshCost(state);
    return `<div class="town-currency-strip" aria-label="Compact currency reference">
      <span title="Coins pay for rest, market gear, board shuffles, and repairs.">Coin ${Money(state.player.gold || 0)}</span>
      <span title="Spark drops from objectives and is spent on forge crafts.">Spark ${F(state.player.forgeSpark || 0)}</span>
      <span title="Shards come from rooms, elites, bosses, and salvage. Used for crafting and tempering.">Shards ${F(state.player.shards || 0)}</span>
      <span title="Ember drops during descent and fuels Ashburst, focused forging, and tempering.">Ember ${F(state.player.ember || 0)}</span>
      <span title="Favor rises when you craft, salvage, or temper. It raises forge tier.">Favor ${F(state.town?.relicFavor || 0)}</span>
      <b title="Quick cost comparison before spending.">Rest ${Money(rest)} • Board ${Money(board)}</b>
    </div>`;
  }

  function enhancedEliteContractBoardMarkup(state) {
    const contracts = ensureEliteContractState(state);
    const active = contracts.active;
    if (active) {
      const contract = eliteContractDef(active.id);
      if (!contract) return '';
      const progress = Math.min(contract.goal, Math.floor(numberOr(active.progress, 0, 0, contract.goal)));
      const pct = Math.min(100, Math.round((progress / contract.goal) * 100));
      const ready = active.complete || progress >= contract.goal;
      const rewardAmount = activeContractRewardAmount(active, contract, state);
      return `<div class="elite-contract-board lowfire-board-v2">
        <div class="elite-contract-head">
          <div><h3>Lowfire Elite Board</h3><p>One paid mark can be active. The board freezes until the mark is finished or claimed.</p></div>
          <span class="pill ${ready ? 'rarity-rare' : ''}">${ready ? 'Ready to Claim' : 'Active Mark'}</span>
        </div>
        <div class="elite-contract-card ${ready ? 'ready' : 'active'}">
          <div class="split"><strong>Active Contract: ${H(contract.name)}</strong><span class="small muted">${H(active.tier || contract.tier || '')}</span></div>
          <div class="elite-contract-detail-grid small">
            <span><b>Goal:</b> ${progress} / ${contract.goal} elites defeated</span>
            <span><b>Risk:</b> ${H(eliteContractRiskLevel(contract))}</span>
            <span><b>Reward:</b> ${Money(rewardAmount)}</span>
            <span><b>Why take it:</b> harder elite pressure, cleaner payout.</span>
          </div>
          <div class="elite-contract-meter"><div style="width:${pct}%"></div></div>
          <div class="elite-contract-actions">
            <span class="pill">Held pay: ${Money(rewardAmount)}</span>
            ${ready ? '<button class="primary mini" id="claimEliteContractBtn">Claim Reward</button>' : '<span class="small muted">Kill elite enemies, extract, then claim here.</span>'}
          </div>
        </div>
      </div>`;
    }

    const available = typeof availableEliteContracts === 'function' ? availableEliteContracts(state) : baseContractPool(state);
    const cost = lowfireBoardRefreshCost(state);
    const body = available.length
      ? available.map(contract => `<div class="elite-contract-card">
          <div class="split"><strong>${H(contract.name)}</strong><span class="small muted">${H(contract.tier || '')}</span></div>
          <p class="small muted">${H(contract.summary || 'Paid Lowfire work for wardens willing to fight marked elites.')}</p>
          <div class="elite-contract-detail-grid small">
            <span><b>Objective:</b> ${H(eliteContractObjective(contract))}</span>
            <span><b>Risk:</b> ${H(eliteContractRiskLevel(contract))}</span>
            <span><b>Reward:</b> ${Money(calculateContractReward(contract, state))}</span>
          </div>
          <div class="elite-contract-actions">
            <span class="pill">Paid Mark</span>
            <button class="primary mini" data-start-contract="${H(contract.id)}">Take Mark</button>
          </div>
        </div>`).join('')
      : '<p class="small muted elite-contract-empty">No paid marks are currently available.</p>';

    return `<div class="elite-contract-board lowfire-board-v2">
      <div class="elite-contract-head">
        <div><h3>Lowfire Elite Board</h3><p>Take a paid mark, or pay to shuffle the visible offers like a small merchant refresh.</p></div>
        <button class="ghost mini refresh-compact" id="refreshLowfireBoardBtn"><span>Random Board</span><strong>${Money(cost)}</strong></button>
      </div>
      <div class="lowfire-board-note small muted">Marks are optional risk. They make elites more dangerous while active, then pay coin when the quota is complete.</div>
      <div class="elite-contract-list">${body}</div>
    </div>`;
  }

  function injectCss() {
    if (document.getElementById('ddWardenTalentBoardCss')) return;
    const st = document.createElement('style');
    st.id = 'ddWardenTalentBoardCss';
    st.textContent = `
      .town-currency-strip{display:flex;flex-wrap:wrap;align-items:center;gap:5px 7px;margin-top:6px;font-size:11px;line-height:1.15;color:rgba(244,232,210,.82)}
      .town-currency-strip span,.town-currency-strip b{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.18);padding:3px 6px;font-weight:650;white-space:nowrap}
      .town-currency-strip b{color:#f4dfad;background:rgba(255,170,69,.08)}
      .lowfire-board-v2 .elite-contract-head{align-items:flex-start;gap:8px}.lowfire-board-note{margin:-2px 0 8px}.lowfire-board-v2 .elite-contract-card p{margin:3px 0 6px}
      #talentPanel{font-size:12px}.talent-head h2{margin-bottom:2px}.talent-meter-row{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}.talent-meter-row span{border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:3px 6px;background:rgba(255,255,255,.035)}
      .talent-tree-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.talent-tree{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;background:rgba(255,255,255,.025)}.talent-tree-title{margin-bottom:6px}
      .talent-card{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(0,0,0,.18);color:inherit;padding:7px;margin:0 0 6px}.talent-card:not(:disabled){cursor:pointer}.talent-card:disabled{opacity:.62}.talent-card-top{display:flex;justify-content:space-between;gap:6px;align-items:center}.talent-card-top strong{font-size:12px}.talent-card-top em{font-style:normal;font-size:11px;color:#f2c06b}.talent-effect,.talent-lore{display:block;font-size:11px;line-height:1.2}.talent-effect{margin-top:3px;color:rgba(255,235,190,.9);font-weight:700}.talent-lore{margin-top:2px;color:rgba(230,222,205,.62)}.talent-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
      @media(max-width:720px){.talent-tree-grid{grid-template-columns:1fr}.town-currency-strip{font-size:10.5px;gap:4px}.talent-footer{align-items:flex-start;flex-direction:column}}`;
    document.head.appendChild(st);
  }

  const originalCalcDerived = typeof calcDerived === 'function' ? calcDerived : null;
  if (originalCalcDerived) {
    calcDerived = function enhancedCalcDerived(state) {
      const total = originalCalcDerived(state);
      if (!state?.player || !total) return total;
      const bonus = talentEffects(state);
      if (bonus.powerPct > 0) total.power += Math.max(talentRank(state, 'deep_cut'), Math.floor(total.power * bonus.powerPct));
      if (bonus.guardPct > 0) total.guard += Math.max(talentRank(state, 'shield_memory'), Math.floor(total.guard * bonus.guardPct));
      total.speed += bonus.speedFlat;
      total.luck += bonus.luckFlat;
      total.wit += bonus.witFlat;
      total.hpBonus += bonus.hpFlat;
      state.player.maxHp = 100 + total.hpBonus + Math.floor(numberOr(state.player.level, 1, 1, 999)) * 10;
      state.player.hp = Math.floor(numberOr(state.player.hp, state.player.maxHp, 0, state.player.maxHp));
      total.talentBonuses = bonus;
      return total;
    };
  }

  const originalAddPendingRunShards = typeof addPendingRunShards === 'function' ? addPendingRunShards : null;
  if (originalAddPendingRunShards) {
    addPendingRunShards = function enhancedAddPendingRunShards(state, amount) {
      let reward = Math.floor(Number(amount) || 0);
      const pct = talentEffects(state).shardPct;
      if (reward > 0 && pct > 0) reward += Math.max(1, Math.floor(reward * pct));
      return originalAddPendingRunShards(state, reward);
    };
  }

  const originalAddPendingRunEmber = typeof addPendingRunEmber === 'function' ? addPendingRunEmber : null;
  if (originalAddPendingRunEmber) {
    addPendingRunEmber = function enhancedAddPendingRunEmber(state, amount) {
      let reward = Math.floor(Number(amount) || 0);
      const chance = talentEffects(state).emberChance;
      if (reward > 0 && chance > 0 && Math.random() < chance) reward += 1;
      return originalAddPendingRunEmber(state, reward);
    };
  }

  const originalShouldDropLoot = typeof shouldDropLoot === 'function' ? shouldDropLoot : null;
  if (originalShouldDropLoot) {
    shouldDropLoot = function enhancedShouldDropLoot(floor, source = 'normal', rollIndex = 0, state = null) {
      const base = originalShouldDropLoot(floor, source, rollIndex, state);
      if (base || !state) return base;
      const bonus = talentEffects(state).lootPct;
      return bonus > 0 && Math.random() < Math.min(0.16, bonus);
    };
  }

  const originalAvailableEliteContracts = typeof availableEliteContracts === 'function' ? availableEliteContracts : null;
  if (originalAvailableEliteContracts) {
    availableEliteContracts = function enhancedAvailableEliteContracts(state) {
      const contracts = ensureEliteContractState(state);
      if (contracts.active) return [];
      ensureLowfireBoardState(state);
      const pool = originalAvailableEliteContracts(state);
      const offers = A(state?.town?.lowfireBoardOffers, []);
      const byId = new Map(pool.map(contract => [contract.id, contract]));
      const rolled = offers.map(id => byId.get(id)).filter(Boolean);
      return rolled.length ? rolled : pool.slice(0, Math.min(2, pool.length));
    };
  }

  if (typeof eliteContractBoardMarkup === 'function') eliteContractBoardMarkup = enhancedEliteContractBoardMarkup;

  const originalRenderTown = typeof renderTown === 'function' ? renderTown : null;
  if (originalRenderTown) {
    renderTown = function enhancedRenderTown() {
      originalRenderTown();
      injectCss();
      if (typeof S !== 'undefined') {
        ensureLowfireBoardState(S);
        const slot = typeof el === 'function' ? el('districtWalletSlot') : document.getElementById('districtWalletSlot');
        if (slot) slot.innerHTML = townCurrencyStripMarkup(S);
      }
    };
  }

  const originalRenderGear = typeof renderGear === 'function' ? renderGear : null;
  if (originalRenderGear) {
    renderGear = function enhancedRenderGear() {
      originalRenderGear();
      injectCss();
      if (typeof S !== 'undefined') renderTalentPanel(S);
    };
  }

  const originalBindDynamic = typeof bindDynamic === 'function' ? bindDynamic : null;
  if (originalBindDynamic) {
    bindDynamic = function enhancedBindDynamic() {
      originalBindDynamic();
      injectCss();
      const refreshBoardBtn = document.getElementById('refreshLowfireBoardBtn');
      if (refreshBoardBtn) refreshBoardBtn.onclick = () => Guard(() => { refreshLowfireBoard(S); render(); });
      document.querySelectorAll('[data-learn-talent]').forEach(btn => {
        btn.onclick = () => Guard(() => { learnTalent(S, btn.dataset.learnTalent); render(); });
      });
      const resetBtn = document.getElementById('resetTalentsBtn');
      if (resetBtn) resetBtn.onclick = () => Guard(() => {
        if (window.confirm && !window.confirm('Reset all Warden talents?')) return;
        resetTalents(S);
        render();
      });
    };
  }

  window.DungeonDexWardenTalents = {
    build: SCRIPT_BUILD,
    defs: TALENT_DEFS,
    ensure: ensureTalentState,
    effects: talentEffects,
    learn: learnTalent,
    reset: resetTalents,
    refreshLowfireBoard
  };

  injectCss();
  if (typeof S !== 'undefined') {
    ensureTalentState(S);
    ensureLowfireBoardState(S);
    if (typeof calcDerived === 'function') calcDerived(S);
  }
  if (typeof render === 'function') render();
})();
