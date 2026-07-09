'use strict';

// DungeonDex v1.4.9a — Lowfire Board Spark Expansion.
// Adds clearer, repeatable Forge Spark work without changing the core descent loop.
(function(){
  if (window.DDLowfireSparkBoard) return;
  window.DDLowfireSparkBoard = true;

  const SPARK_OBJECTIVES = [
    { id:'q4', title:'Elite Heat Audit', goal:3, progress:0, reward:'1 forge spark + 20 shards', type:'elite', detail:'Defeat elite enemies. Elite marks are the best combat source of Sparks.', rewardSpec:{ spark:1, shards:20 } },
    { id:'q5', title:'Boss Cinder Tithe', goal:1, progress:0, reward:'2 forge sparks + 1 ember', type:'boss', detail:'Clear one boss floor. Bosses pay the largest Spark bounties.', rewardSpec:{ spark:2, ember:1 } },
    { id:'q6', title:'Safe Return Receipt', goal:2, progress:0, reward:'1 forge spark', type:'extract', detail:'Extract safely twice. Lowfire only pays this after the haul is banked.', rewardSpec:{ spark:1 } },
    { id:'q7', title:'Junk to Kindling', goal:6, progress:0, reward:'1 forge spark + 30 shards', type:'salvage', detail:'Salvage safe common/uncommon gear at the Relic Forge.', rewardSpec:{ spark:1, shards:30 } },
    { id:'q8', title:'Hammer Mark Trial', goal:2, progress:0, reward:'1 forge spark + 25 favor', type:'temper', detail:'Temper equipped gear. Tempering proves a relic can hold more heat.', rewardSpec:{ spark:1, favor:25 } },
    { id:'q9', title:'Focused Pattern Work', goal:1, progress:0, reward:'1 forge spark rebate', type:'focusedForge', detail:'Use Focused Forge once. Lowfire refunds a Spark for learning slot control.', rewardSpec:{ spark:1 } }
  ];

  const SPARK_WRITS = [
    { id:'spark_elites', title:'Spark Writ: Elite Heat', type:'elite', goal:4, reward:{ spark:1, shards:25 }, hint:'Defeat 4 elites.' },
    { id:'spark_boss', title:'Spark Writ: Boss Brand', type:'boss', goal:1, reward:{ spark:1, ember:1 }, hint:'Clear 1 boss floor.' },
    { id:'spark_salvage', title:'Spark Writ: Salvage Order', type:'salvage', goal:8, reward:{ spark:1, shards:45 }, hint:'Salvage 8 safe items.' },
    { id:'spark_temper', title:'Spark Writ: Temper Receipt', type:'temper', goal:3, reward:{ spark:1, favor:30 }, hint:'Temper equipped gear 3 times.' },
    { id:'spark_extract', title:'Spark Writ: Safe Return', type:'extract', goal:2, reward:{ spark:1 }, hint:'Extract safely twice.' }
  ];

  const WRIT_REFRESH_COST = () => typeof coins === 'function' ? coins(0, 1, 50) : 150;
  const A = value => Array.isArray(value) ? value : [];
  const F = value => typeof format === 'function' ? format(value) : String(Math.floor(Number(value) || 0));
  const H = value => typeof escapeHtml === 'function'
    ? escapeHtml(value)
    : String(value ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const money = value => typeof formatMoney === 'function' ? formatMoney(value) : `${Math.floor(Number(value) || 0)}c`;
  const clean = value => typeof cleanDisplayText === 'function' ? cleanDisplayText(value) : String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const log = (state, line) => { if (typeof pushLog === 'function') pushLog(state, line); };

  function rewardText(reward = {}) {
    const parts = [];
    if (reward.spark) parts.push(`${F(reward.spark)} spark${reward.spark === 1 ? '' : 's'}`);
    if (reward.shards) parts.push(`${F(reward.shards)} shards`);
    if (reward.ember) parts.push(`${F(reward.ember)} ember`);
    if (reward.favor) parts.push(`${F(reward.favor)} favor`);
    return parts.join(' + ') || 'board credit';
  }

  function grantReward(state, reward = {}) {
    if (!state?.player) return '';
    state.player.forgeSpark = Math.max(0, Math.floor(Number(state.player.forgeSpark) || 0)) + Math.max(0, Math.floor(Number(reward.spark) || 0));
    state.player.shards = Math.max(0, Math.floor(Number(state.player.shards) || 0)) + Math.max(0, Math.floor(Number(reward.shards) || 0));
    state.player.ember = Math.max(0, Math.floor(Number(state.player.ember) || 0)) + Math.max(0, Math.floor(Number(reward.ember) || 0));
    if (!state.town) state.town = {};
    state.town.relicFavor = Math.max(0, Math.floor(Number(state.town.relicFavor) || 0)) + Math.max(0, Math.floor(Number(reward.favor) || 0));
    return rewardText(reward);
  }

  function ensureSparkObjectives(state) {
    if (!state?.player) return;
    state.player.quests = A(state.player.quests);
    SPARK_OBJECTIVES.forEach(def => {
      const existing = state.player.quests.find(q => q && q.id === def.id);
      if (existing) {
        Object.assign(existing, {
          title: def.title,
          type: def.type,
          reward: def.reward,
          detail: def.detail,
          rewardSpec: def.rewardSpec,
          goal: Math.max(1, Math.floor(Number(existing.goal) || def.goal))
        });
        existing.progress = Math.max(0, Math.min(existing.goal, Math.floor(Number(existing.progress) || 0)));
        existing.claimed = !!existing.claimed;
      } else {
        state.player.quests.push({ ...def });
      }
    });
  }

  function rollWrit(previousId = '') {
    const pool = SPARK_WRITS.filter(writ => writ.id !== previousId);
    const source = pool.length ? pool : SPARK_WRITS;
    const picked = source[Math.floor(Math.random() * source.length)] || SPARK_WRITS[0];
    return {
      id: picked.id,
      title: picked.title,
      type: picked.type,
      goal: picked.goal,
      progress: 0,
      reward: { ...picked.reward },
      hint: picked.hint,
      claimed: false
    };
  }

  function ensureSparkWrit(state) {
    if (!state?.player) return null;
    const active = state.player.lowfireSparkWrit;
    const valid = active && SPARK_WRITS.some(writ => writ.id === active.id);
    if (!valid) state.player.lowfireSparkWrit = rollWrit('');
    const writ = state.player.lowfireSparkWrit;
    writ.goal = Math.max(1, Math.floor(Number(writ.goal) || 1));
    writ.progress = Math.max(0, Math.min(writ.goal, Math.floor(Number(writ.progress) || 0)));
    writ.reward = typeof writ.reward === 'object' && writ.reward ? writ.reward : { spark:1 };
    return writ;
  }

  function refreshSparkWrit(state, forceFree = false) {
    if (!state?.player) return false;
    const current = ensureSparkWrit(state);
    if (current && current.progress >= current.goal) {
      log(state, 'Claim the finished Spark Writ before drawing a new one.');
      return false;
    }
    const cost = WRIT_REFRESH_COST();
    if (!forceFree) {
      state.player.gold = Math.max(0, Math.floor(Number(state.player.gold) || 0));
      if (state.player.gold < cost) {
        log(state, `Need ${clean(money(cost))} to draw a new Spark Writ.`);
        return false;
      }
      state.player.gold -= cost;
    }
    state.player.lowfireSparkWrit = rollWrit(current?.id || '');
    log(state, `New Lowfire Spark Writ posted: ${state.player.lowfireSparkWrit.title}.`);
    return true;
  }

  function claimSparkWrit(state) {
    const writ = ensureSparkWrit(state);
    if (!writ || writ.progress < writ.goal) return false;
    const paid = grantReward(state, writ.reward);
    log(state, `Spark Writ complete: ${writ.title}. Reward: ${paid}.`);
    state.player.lowfireSparkWrit = rollWrit(writ.id);
    return true;
  }

  function recordSparkWritProgress(state, type, amount = 1) {
    const writ = ensureSparkWrit(state);
    const amt = Math.max(0, Math.floor(Number(amount) || 0));
    if (!writ || amt <= 0 || writ.type !== type || writ.progress >= writ.goal) return false;
    writ.progress = Math.min(writ.goal, writ.progress + amt);
    if (writ.progress >= writ.goal) log(state, `Spark Writ ready: ${writ.title}. Claim it on the Lowfire Board.`);
    return true;
  }

  function recordObjectiveProgress(state, type, amount = 1) {
    ensureSparkObjectives(state);
    if (typeof updateQuest === 'function') updateQuest(state, type, amount);
    recordSparkWritProgress(state, type, amount);
  }

  function css() {
    if (document.getElementById('ddSparkBoardCss')) return;
    const style = document.createElement('style');
    style.id = 'ddSparkBoardCss';
    style.textContent = `
      #questPanel .lowfire-board-tip{font-size:11px;color:var(--muted);margin:4px 0 0;line-height:1.25}
      #questPanel .spark-source-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:8px 0 10px}
      #questPanel .spark-source-strip span{border:1px solid rgba(255,190,110,.18);border-radius:12px;padding:6px 7px;background:rgba(255,140,55,.055);font-size:11px;line-height:1.2;color:#d5c4ad}
      #questPanel .spark-writ-card{border:1px solid rgba(255,190,110,.25);background:linear-gradient(135deg,rgba(255,136,52,.10),rgba(255,210,128,.035));border-radius:16px;padding:10px;margin:8px 0 12px}
      #questPanel .spark-writ-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}
      #questPanel .warden-objective-card .objective-detail{margin-top:3px;font-size:11px;line-height:1.25;color:var(--muted)}
      @media(max-width:720px){#questPanel .spark-source-strip{grid-template-columns:repeat(2,minmax(0,1fr));}}
    `;
    document.head.appendChild(style);
  }

  function questCard(q) {
    const goal = Math.max(1, Math.floor(Number(q.goal) || 1));
    const progress = Math.max(0, Math.min(goal, Math.floor(Number(q.progress) || 0)));
    const pct = Math.min(100, Math.round((progress / goal) * 100));
    return `<div class="quest-card warden-objective-card ${q.claimed ? 'is-claimed' : ''}">
      <div class="split"><strong>${H(q.title)}</strong><span class="small muted">${progress}/${goal}</span></div>
      <p class="small">${H(q.reward)}${q.claimed ? ' - claimed' : ''}</p>
      ${q.detail ? `<p class="objective-detail">${H(q.detail)}</p>` : ''}
      <div class="xpbar"><div class="xpfill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function sparkWritMarkup(state) {
    const writ = ensureSparkWrit(state);
    if (!writ) return '';
    const pct = Math.min(100, Math.round((writ.progress / Math.max(1, writ.goal)) * 100));
    const ready = writ.progress >= writ.goal;
    return `<div class="spark-writ-card">
      <div class="split"><div><strong>${H(writ.title)}</strong><p class="small">${H(writ.hint || '')} Pays ${H(rewardText(writ.reward))}.</p></div><span class="pill ${ready ? 'rarity-rare' : ''}">${writ.progress}/${writ.goal}</span></div>
      <div class="xpbar"><div class="xpfill" style="width:${pct}%"></div></div>
      <div class="spark-writ-actions">
        ${ready ? '<button class="primary mini" id="claimSparkWritBtn">Claim Spark Writ</button>' : `<span class="small muted">Draw new writ: ${money(WRIT_REFRESH_COST())}</span><button class="ghost mini" id="refreshSparkWritBtn">New Writ</button>`}
      </div>
    </div>`;
  }

  function renderBoard(state) {
    ensureSparkObjectives(state);
    ensureSparkWrit(state);
    const panel = typeof el === 'function' ? el('questPanel') : document.getElementById('questPanel');
    if (!panel) return;
    const quests = A(state.player.quests);
    const claimed = quests.filter(q => q.claimed).length;
    panel.innerHTML = `
      <div class="card-head"><div><h2>Lowfire Board</h2><p>Board work is the steady way to earn Forge Sparks outside random drops.</p><p class="lowfire-board-tip">Sparks craft relics. Shards feed craft costs. Ember powers skills and focused forge work. Favor raises forge tier.</p></div></div>
      <div class="spark-source-strip">
        <span><b>Forge Spark</b><br>Earn from elite, boss, extraction, salvage, and temper board work.</span>
        <span><b>Shards</b><br>Dropped by fights and gained by salvaging junk gear.</span>
        <span><b>Ember</b><br>Bosses, events, and deeper runs. Spent on Ashburst and focused forging.</span>
        <span><b>Favor</b><br>Forge reputation from crafting, salvage, and tempering.</span>
      </div>
      <div class="warden-ledger">
        <div class="split ledger-subhead"><div><strong>Repeatable Spark Writ</strong><p class="small">One rotating order. Finish it, claim it, then Lowfire posts another.</p></div><span class="pill">Spark Source</span></div>
        ${sparkWritMarkup(state)}
        <div class="split ledger-subhead"><div><strong>Warden Objectives</strong><p class="small">One-time board goals paid after descent or forge work.</p></div><span class="pill">${claimed}/${quests.length}</span></div>
      </div>
      <div class="list warden-objective-list">${quests.map(questCard).join('')}</div>
      ${typeof eliteContractBoardMarkup === 'function' ? eliteContractBoardMarkup(state) : ''}`;
  }

  function bindBoard() {
    const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
    Array.from(document.querySelectorAll('[data-start-contract]')).forEach(btn => {
      btn.onclick = () => guard(() => {
        if (typeof startEliteContract === 'function') startEliteContract(S, btn.dataset.startContract);
        render();
      });
    });
    const eliteClaim = document.getElementById('claimEliteContractBtn');
    if (eliteClaim) eliteClaim.onclick = () => guard(() => {
      eliteClaim.disabled = true;
      const claimed = typeof claimEliteContract === 'function' ? claimEliteContract(S) : false;
      if (!claimed) eliteClaim.disabled = false;
      render();
    });
    const eliteRefresh = document.getElementById('refreshLowfireBoardBtn');
    if (eliteRefresh) eliteRefresh.onclick = () => guard(() => {
      if (window.DungeonDexWardenTalents && typeof window.DungeonDexWardenTalents.refreshLowfireBoard === 'function') {
        window.DungeonDexWardenTalents.refreshLowfireBoard(S);
      }
      render();
    });
    const claim = document.getElementById('claimSparkWritBtn');
    if (claim) claim.onclick = () => guard(() => { claimSparkWrit(S); render(); });
    const refresh = document.getElementById('refreshSparkWritBtn');
    if (refresh) refresh.onclick = () => guard(() => { refreshSparkWrit(S); render(); });
  }

  function installRenderWrap() {
    const originalTown = typeof renderTown === 'function' ? renderTown : window.renderTown;
    if (originalTown && !originalTown.__sparkBoardWrapped) {
      const wrapped = function(){
        originalTown.apply(this, arguments);
        css();
        if (typeof S !== 'undefined') renderBoard(S);
      };
      wrapped.__sparkBoardWrapped = true;
      try { renderTown = wrapped; } catch(_) { window.renderTown = wrapped; }
    }

    const originalBind = typeof bindDynamic === 'function' ? bindDynamic : window.bindDynamic;
    if (originalBind && !originalBind.__sparkBoardWrapped) {
      const wrappedBind = function(){
        originalBind.apply(this, arguments);
        bindBoard();
        bindForgeProgressButtons();
      };
      wrappedBind.__sparkBoardWrapped = true;
      try { bindDynamic = wrappedBind; } catch(_) { window.bindDynamic = wrappedBind; }
    }
  }

  function bindForgeProgressButtons() {
    if (!window.DungeonDexRelicForge || typeof S === 'undefined') return;
    const guard = fn => typeof runGuardedAction === 'function' ? runGuardedAction(fn) : fn();
    const forge = window.DungeonDexRelicForge;
    const salvageBtn = document.getElementById('salvageForgeBtn');
    if (salvageBtn) salvageBtn.onclick = () => guard(() => {
      const result = forge.salvage(S);
      if (result) recordObjectiveProgress(S, 'salvage', Math.max(1, Math.floor(Number(result.count || result.items || 1) || 1)));
      render();
    });
    const forgeBtn = document.getElementById('forgeBtn');
    if (forgeBtn) forgeBtn.onclick = () => guard(() => {
      const item = forge.craft(S, null, 0);
      if (item) recordObjectiveProgress(S, 'forge', 1);
      render();
    });
    Array.from(document.querySelectorAll('[data-forge-slot]')).forEach(btn => {
      btn.onclick = () => guard(() => {
        const item = forge.craft(S, btn.dataset.forgeSlot, 1);
        if (item) {
          recordObjectiveProgress(S, 'forge', 1);
          recordObjectiveProgress(S, 'focusedForge', 1);
        }
        render();
      });
    });
    Array.from(document.querySelectorAll('[data-temper-slot]')).forEach(btn => {
      btn.onclick = () => guard(() => {
        const item = forge.temper(S, btn.dataset.temperSlot);
        if (item) recordObjectiveProgress(S, 'temper', 1);
        render();
      });
    });
  }

  function installRewardWrap() {
    const originalReward = typeof rewardQuest === 'function' ? rewardQuest : window.rewardQuest;
    if (originalReward && !originalReward.__sparkBoardWrapped) {
      const wrappedReward = function(state, quest){
        if (!quest || quest.claimed) return;
        if (quest.rewardSpec) {
          quest.claimed = true;
          const paid = grantReward(state, quest.rewardSpec);
          log(state, `Objective complete: ${quest.title}. Reward: ${paid}.`);
          return;
        }
        return originalReward.apply(this, arguments);
      };
      wrappedReward.__sparkBoardWrapped = true;
      try { rewardQuest = wrappedReward; } catch(_) { window.rewardQuest = wrappedReward; }
    }
  }

  function installCombatWraps() {
    const originalWin = typeof winEncounter === 'function' ? winEncounter : window.winEncounter;
    if (originalWin && !originalWin.__sparkBoardWrapped) {
      const wrappedWin = function(state){
        const tier = state?.run?.monster?.tier || '';
        const result = originalWin.apply(this, arguments);
        if (tier === 'Elite') recordObjectiveProgress(state, 'elite', 1);
        if (tier === 'Boss') recordObjectiveProgress(state, 'boss', 1);
        return result;
      };
      wrappedWin.__sparkBoardWrapped = true;
      try { winEncounter = wrappedWin; } catch(_) { window.winEncounter = wrappedWin; }
    }

    const originalFinish = typeof finishRun === 'function' ? finishRun : window.finishRun;
    if (originalFinish && !originalFinish.__sparkBoardWrapped) {
      const wrappedFinish = function(state, reason){
        const wasExtract = String(reason || '').toLowerCase() === 'extract';
        const result = originalFinish.apply(this, arguments);
        if (wasExtract) recordObjectiveProgress(state, 'extract', 1);
        return result;
      };
      wrappedFinish.__sparkBoardWrapped = true;
      try { finishRun = wrappedFinish; } catch(_) { window.finishRun = wrappedFinish; }
    }
  }

  function boot() {
    css();
    installRewardWrap();
    installCombatWraps();
    installRenderWrap();
    if (typeof S !== 'undefined') {
      ensureSparkObjectives(S);
      ensureSparkWrit(S);
      renderBoard(S);
    }
    bindBoard();
    bindForgeProgressButtons();
  }

  window.DDLowfireSparkBoardAPI = {
    ensureSparkObjectives,
    ensureSparkWrit,
    refreshSparkWrit,
    claimSparkWrit,
    recordSparkWritProgress,
    recordObjectiveProgress
  };

  boot();
  window.addEventListener('DOMContentLoaded', boot);
  window.setTimeout(boot, 150);
  window.setTimeout(boot, 800);
})();
