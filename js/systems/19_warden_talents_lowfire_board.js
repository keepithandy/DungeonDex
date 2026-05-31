'use strict';

// DungeonDex v1.4.9a — Warden Talents + Lowfire Board.
(function(){
  if (window.DDWardenTalentsLowfireBoard) return;
  window.DDWardenTalentsLowfireBoard = true;

  const SCRIPT_BUILD = '1.4.9a-town-currency-cleanup';
  const H = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const F = v => typeof format === 'function' ? format(v) : String(Math.round(Number(v) || 0));
  const M = v => typeof formatMoney === 'function' ? formatMoney(v) : `${Math.floor(Number(v) || 0)}c`;
  const C = (g=0,s=0,c=0) => typeof coins === 'function' ? coins(g,s,c) : Math.max(0, Math.round(g*10000+s*100+c));
  const N = (v,d=0,min=-Infinity,max=Infinity) => typeof numberOr === 'function' ? numberOr(v,d,min,max) : Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Number(v) : d));
  const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
  const log = (state, text) => { if (typeof pushLog === 'function') pushLog(state, text); };

  const TALENTS = [
    ['deep_cut','Blade','Deep Cut',5,'+3% Power per rank.','Find the last warm seam in a monster.'],
    ['quick_footing','Blade','Quick Footing',5,'+1 Speed per rank.','Move before the room writes your debt.'],
    ['relic_instinct','Blade','Relic Instinct',5,'+2% extra loot-roll chance per rank.','Hear the stair click around hidden relics.'],
    ['iron_breath','Ward','Iron Breath',5,'+12 Max HP per rank.','Breathe through smoke and keep the haul moving.'],
    ['shield_memory','Ward','Shield Memory',5,'+4% Guard per rank.','Every bad block leaves a lesson.'],
    ['lamp_luck','Ward','Lamp Luck',5,'+1 Luck per rank.','A Lowfire lamp bends bad rooms slightly.'],
    ['scrappers_eye','Forge',"Scrapper's Eye",5,'+8% shard gains per rank.','Junk becomes teeth, rivets, and value.'],
    ['ember_sense','Forge','Ember Sense',5,'+8% chance per rank for +1 ember when ember drops.','The useful sparks are still trying to escape.'],
    ['forge_hand','Forge','Forge Hand',5,'+1 Wit per rank.','The focused forge answers steadier hands.']
  ].map(([id,tree,name,max,effect,lore]) => ({id,tree,name,max,effect,lore}));
  const BY_ID = Object.fromEntries(TALENTS.map(t => [t.id, t]));
  const TREES = ['Blade','Ward','Forge'];

  function bestDepth(state){
    const p = state?.player || {};
    return Math.max(1, Math.floor(+p.depth||0), Math.floor(+p.safeExtractDepth||0), Math.floor(+p.returnDepth||0), Math.floor(+p.permanentStartFloor||0));
  }
  function earnedPoints(state){
    const p = state?.player || {};
    return Math.min(60, Math.max(0, Math.floor(+p.level||1)-1) + Math.floor(bestDepth(state)/15));
  }
  function ensureTalents(state){
    if (!state?.player) return {spent:{}};
    const raw = state.player.talents && typeof state.player.talents === 'object' ? (state.player.talents.spent || state.player.talents) : {};
    const spent = {};
    TALENTS.forEach(t => { const r = Math.max(0, Math.min(t.max, Math.floor(+raw[t.id] || 0))); if (r) spent[t.id] = r; });
    const used = Object.values(spent).reduce((a,b) => a+b, 0);
    state.player.talents = {spent};
    state.player.talentPointsEarned = earnedPoints(state);
    state.player.talentPoints = Math.max(0, state.player.talentPointsEarned - used);
    return state.player.talents;
  }
  function rank(state,id){ return Math.max(0, Math.floor(+ensureTalents(state).spent[id] || 0)); }
  function spentPoints(state){ return Object.keys(ensureTalents(state).spent).reduce((sum,id) => sum + rank(state,id), 0); }
  function effects(state){
    ensureTalents(state);
    return {
      powerPct: rank(state,'deep_cut')*.03,
      speedFlat: rank(state,'quick_footing'),
      lootPct: rank(state,'relic_instinct')*.02,
      hpFlat: rank(state,'iron_breath')*12,
      guardPct: rank(state,'shield_memory')*.04,
      luckFlat: rank(state,'lamp_luck'),
      shardPct: rank(state,'scrappers_eye')*.08,
      emberChance: rank(state,'ember_sense')*.08,
      witFlat: rank(state,'forge_hand')
    };
  }
  function learn(state,id){
    const t = BY_ID[id]; if (!t) return false;
    ensureTalents(state);
    const r = rank(state,id);
    if (r >= t.max || state.player.talentPoints <= 0) return false;
    state.player.talents.spent[id] = r + 1;
    ensureTalents(state);
    if (typeof calcDerived === 'function') calcDerived(state);
    log(state, `Talent learned: ${t.name} ${r+1}/${t.max}.`);
    return true;
  }
  function reset(state){
    if (!state?.player) return false;
    state.player.talents = {spent:{}};
    ensureTalents(state);
    if (typeof calcDerived === 'function') calcDerived(state);
    log(state, 'Warden talents reset. Points returned.');
    return true;
  }

  function talentPanel(){
    const anchor = typeof el === 'function' ? el('gearPlayerPanel') : document.getElementById('gearPlayerPanel');
    if (!anchor?.parentNode) return null;
    let panel = document.getElementById('talentPanel');
    if (!panel) { panel = document.createElement('section'); panel.id = 'talentPanel'; panel.className = 'panel talent-panel'; anchor.insertAdjacentElement('afterend', panel); }
    return panel;
  }
  function talentCard(state,t){
    const r = rank(state,t.id), pts = Math.floor(+state.player.talentPoints || 0), off = r >= t.max || pts <= 0 ? 'disabled' : '';
    return `<button class="talent-card" data-learn-talent="${H(t.id)}" ${off}><span class="talent-card-top"><strong>${H(t.name)}</strong><em>${r}/${t.max}</em></span><span class="talent-effect">${H(t.effect)}</span><span class="talent-lore">${H(t.lore)}</span></button>`;
  }
  function renderTalentPanel(state){
    const panel = talentPanel(); if (!panel || !state?.player) return;
    ensureTalents(state);
    panel.innerHTML = `<div class="card-head talent-head"><div><h2>Warden Talents</h2><p>Permanent upgrades earned from level-ups and secured descent progress.</p></div><span class="pill rarity-rare">${F(state.player.talentPoints)} points</span></div><div class="talent-meter-row small muted"><span>Earned ${F(state.player.talentPointsEarned)}</span><span>Spent ${F(spentPoints(state))}</span><span>+1 point every 15 secured floors.</span></div><div class="talent-tree-grid">${TREES.map(tree => `<div class="talent-tree"><div class="split talent-tree-title"><strong>${H(tree)}</strong><span class="small muted">${tree === 'Blade' ? 'damage / drops' : tree === 'Ward' ? 'survival' : 'crafting'}</span></div>${TALENTS.filter(t => t.tree === tree).map(t => talentCard(state,t)).join('')}</div>`).join('')}</div><div class="talent-footer"><button class="ghost mini" id="resetTalentsBtn">Reset Talents</button><span class="small muted">Talents apply instantly.</span></div>`;
  }

  function boardCost(state){
    if (!state.town) state.town = {};
    const current = Math.floor(+state.town.lowfireBoardRefreshCost || C(0,1,25));
    return state.town.lowfireBoardRefreshCost = Math.max(C(0,0,25), Math.min(C(0,8,0), current));
  }
  function contractState(state){ return typeof ensureEliteContractState === 'function' ? ensureEliteContractState(state) : {active:null,claimed:[]}; }
  function contractPool(state){
    const st = contractState(state); if (st.active) return [];
    const all = typeof ELITE_CONTRACTS !== 'undefined' && Array.isArray(ELITE_CONTRACTS) ? ELITE_CONTRACTS : [];
    return all.filter(c => typeof isEliteContractAvailable === 'function' ? isEliteContractAvailable(c, st, state) : true);
  }
  function shuffle(list){ const out=list.slice(); for(let i=out.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; }
  function rollBoard(state){
    if (!state.town) state.town = {};
    const pool = contractPool(state), count = Math.min(pool.length, pool.length >= 3 ? 2 : pool.length);
    state.town.lowfireBoardOffers = shuffle(pool).slice(0,count).map(c => c.id);
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
    return chosen.length ? chosen : base.slice(0, Math.min(2, base.length));
  }
  function contractReward(contract,state){ return typeof calculateContractReward === 'function' ? calculateContractReward(contract,state) : C(0,2,0); }
  function contractObj(contract){ return typeof eliteContractObjective === 'function' ? eliteContractObjective(contract) : `${contract.goal || 3} marked elites`; }
  function contractRisk(contract){ return typeof eliteContractRiskLevel === 'function' ? eliteContractRiskLevel(contract) : 'Medium'; }
  function contractDef(id){ return typeof eliteContractDef === 'function' ? eliteContractDef(id) : null; }
  function activeReward(active,contract,state){ return typeof activeContractRewardAmount === 'function' ? activeContractRewardAmount(active,contract,state) : contractReward(contract,state); }

  function boardMarkup(state){
    const st = contractState(state), active = st.active;
    if (active) {
      const c = contractDef(active.id); if (!c) return '';
      const progress = Math.min(c.goal || 1, Math.floor(N(active.progress,0,0,c.goal || 1))), pct = Math.min(100, Math.round(progress / (c.goal || 1) * 100)), ready = active.complete || progress >= (c.goal || 1), reward = activeReward(active,c,state);
      return `<div class="elite-contract-board lowfire-board-v2"><div class="elite-contract-head"><div><h3>Lowfire Elite Board</h3><p>One paid mark can be active. The board freezes until the mark is finished or claimed.</p></div><span class="pill ${ready?'rarity-rare':''}">${ready?'Ready':'Active Mark'}</span></div><div class="elite-contract-card ${ready?'ready':'active'}"><div class="split"><strong>Active: ${H(c.name)}</strong><span class="small muted">${H(active.tier || c.tier || '')}</span></div><div class="elite-contract-detail-grid small"><span><b>Goal:</b> ${progress} / ${c.goal} elites defeated</span><span><b>Risk:</b> ${H(contractRisk(c))}</span><span><b>Reward:</b> ${M(reward)}</span></div><div class="elite-contract-meter"><div style="width:${pct}%"></div></div><div class="elite-contract-actions"><span class="pill">Held pay: ${M(reward)}</span>${ready?'<button class="primary mini" id="claimEliteContractBtn">Claim Reward</button>':'<span class="small muted">Kill marked elites, extract, then claim here.</span>'}</div></div></div>`;
    }
    const list = typeof availableEliteContracts === 'function' ? availableEliteContracts(state) : filteredContracts(state, contractPool(state));
    const cards = list.length ? list.map(c => `<div class="elite-contract-card"><div class="split"><strong>${H(c.name)}</strong><span class="small muted">${H(c.tier || '')}</span></div><p class="small muted">${H(c.summary || 'Paid Lowfire work for wardens willing to fight marked elites.')}</p><div class="elite-contract-detail-grid small"><span><b>Objective:</b> ${H(contractObj(c))}</span><span><b>Risk:</b> ${H(contractRisk(c))}</span><span><b>Reward:</b> ${M(contractReward(c,state))}</span></div><div class="elite-contract-actions"><span class="pill">Paid Mark</span><button class="primary mini" data-start-contract="${H(c.id)}">Take Mark</button></div></div>`).join('') : '<p class="small muted elite-contract-empty">No paid marks are currently available.</p>';
    return `<div class="elite-contract-board lowfire-board-v2"><div class="elite-contract-head"><div><h3>Lowfire Elite Board</h3><p>Take a paid mark, or pay to shuffle the visible offers.</p></div><button class="ghost mini refresh-compact" id="refreshLowfireBoardBtn"><span>Random Board</span><strong>${M(boardCost(state))}</strong></button></div><div class="lowfire-board-note small muted">Marks are optional risk. They make elites more dangerous while active, then pay coin when complete.</div><div class="elite-contract-list">${cards}</div></div>`;
  }

  function currencyStrip(state){
    return `<div class="town-currency-strip" aria-label="Compact currency reference"><span>Coin ${M(state.player.gold || 0)}</span><span>Spark ${F(state.player.forgeSpark || 0)}</span><span>Shards ${F(state.player.shards || 0)}</span><span>Ember ${F(state.player.ember || 0)}</span><span>Favor ${F(state.town?.relicFavor || 0)}</span></div>`;
  }
  function injectCss(){
    if (document.getElementById('ddWardenTalentBoardCss')) return;
    const st = document.createElement('style'); st.id = 'ddWardenTalentBoardCss';
    st.textContent = `.town-currency-strip{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:5px;font-size:10.75px;line-height:1.15;color:rgba(244,232,210,.82)}.town-currency-strip span{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.18);padding:3px 6px;font-weight:650;white-space:nowrap}.lowfire-board-v2 .elite-contract-head{align-items:flex-start;gap:8px}.lowfire-board-note{margin:-2px 0 8px}#talentPanel{font-size:12px}.talent-meter-row{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}.talent-meter-row span{border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:3px 6px;background:rgba(255,255,255,.035)}.talent-tree-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.talent-tree{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;background:rgba(255,255,255,.025)}.talent-card{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(0,0,0,.18);color:inherit;padding:7px;margin:0 0 6px}.talent-card:disabled{opacity:.62}.talent-card-top{display:flex;justify-content:space-between;gap:6px}.talent-card-top strong{font-size:12px}.talent-card-top em{font-style:normal;font-size:11px;color:#f2c06b}.talent-effect,.talent-lore{display:block;font-size:11px;line-height:1.2}.talent-effect{margin-top:3px;color:rgba(255,235,190,.9);font-weight:700}.talent-lore{margin-top:2px;color:rgba(230,222,205,.62)}.talent-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}@media(max-width:720px){.talent-tree-grid{grid-template-columns:1fr}.talent-footer{align-items:flex-start;flex-direction:column}}`;
    document.head.appendChild(st);
  }

  const oldCalc = typeof calcDerived === 'function' ? calcDerived : null;
  if (oldCalc) calcDerived = function(state){ const total = oldCalc(state); if (!state?.player || !total) return total; const e = effects(state); total.power += Math.max(rank(state,'deep_cut'), Math.floor((total.power||0)*e.powerPct)); total.guard += Math.max(rank(state,'shield_memory'), Math.floor((total.guard||0)*e.guardPct)); total.speed += e.speedFlat; total.luck += e.luckFlat; total.wit += e.witFlat; total.hpBonus += e.hpFlat; state.player.maxHp = 100 + total.hpBonus + Math.floor(N(state.player.level,1,1,999))*10; state.player.hp = Math.floor(N(state.player.hp,state.player.maxHp,0,state.player.maxHp)); total.talentBonuses = e; return total; };

  const oldShards = typeof addPendingRunShards === 'function' ? addPendingRunShards : null;
  if (oldShards) addPendingRunShards = function(state, amount){ let reward = Math.floor(+amount || 0), pct = effects(state).shardPct; if (reward > 0 && pct > 0) reward += Math.max(1, Math.floor(reward*pct)); return oldShards(state,reward); };
  const oldEmber = typeof addPendingRunEmber === 'function' ? addPendingRunEmber : null;
  if (oldEmber) addPendingRunEmber = function(state, amount){ let reward = Math.floor(+amount || 0), chance = effects(state).emberChance; if (reward > 0 && chance > 0 && Math.random() < chance) reward += 1; return oldEmber(state,reward); };
  const oldDrop = typeof shouldDropLoot === 'function' ? shouldDropLoot : null;
  if (oldDrop) shouldDropLoot = function(floor, source='normal', rollIndex=0, state=null){ const base = oldDrop(floor,source,rollIndex,state); if (base || !state) return base; const bonus = effects(state).lootPct; return bonus > 0 && Math.random() < Math.min(.16, bonus); };
  const oldAvail = typeof availableEliteContracts === 'function' ? availableEliteContracts : null;
  if (oldAvail) availableEliteContracts = function(state){ return filteredContracts(state, oldAvail(state)); };
  if (typeof eliteContractBoardMarkup === 'function') eliteContractBoardMarkup = boardMarkup;

  const oldTown = typeof renderTown === 'function' ? renderTown : null;
  if (oldTown) renderTown = function(){ oldTown(); injectCss(); if (typeof S !== 'undefined') { ensureBoard(S); const slot = typeof el === 'function' ? el('districtWalletSlot') : document.getElementById('districtWalletSlot'); if (slot) slot.innerHTML = currencyStrip(S); } };
  const oldGear = typeof renderGear === 'function' ? renderGear : null;
  if (oldGear) renderGear = function(){ oldGear(); injectCss(); if (typeof S !== 'undefined') renderTalentPanel(S); };
  const oldBind = typeof bindDynamic === 'function' ? bindDynamic : null;
  if (oldBind) bindDynamic = function(){ oldBind(); injectCss(); const r = document.getElementById('refreshLowfireBoardBtn'); if (r) r.onclick = () => guard(() => { refreshBoard(S); render(); }); document.querySelectorAll('[data-learn-talent]').forEach(btn => btn.onclick = () => guard(() => { learn(S, btn.dataset.learnTalent); render(); })); const resetBtn = document.getElementById('resetTalentsBtn'); if (resetBtn) resetBtn.onclick = () => guard(() => { if (window.confirm && !window.confirm('Reset all Warden talents?')) return; reset(S); render(); }); };

  window.DungeonDexWardenTalents = { build:SCRIPT_BUILD, defs:TALENTS, ensure:ensureTalents, effects, learn, reset, refreshLowfireBoard:refreshBoard };
  injectCss();
  if (typeof S !== 'undefined') { ensureTalents(S); ensureBoard(S); if (typeof calcDerived === 'function') calcDerived(S); }
  if (typeof render === 'function') render();
})();
