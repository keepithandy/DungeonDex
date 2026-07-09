'use strict';

/**
 * Vow System v1: Seven vows with tracking
 * 
 * Seven vows:
 * - iron_tongue: speak truth in combat (accumulates from combat actions)
 * - ashwalker: walk through fire (accumulates from taking damage)
 * - hollow_warden: protect the empty (accumulates from defending allies)
 * - shardborn: gather shards (accumulates from collecting shards)
 * - borrowed_hour: live on borrowed time (accumulates from narrow escapes)
 * - silent_dex: move unseen (accumulates from dodge/evasion)
 * - bell_vaults: unlock memories (accumulates from discovering gear)
 * 
 * Each vow has:
 * - active: boolean
 * - progress: number (current)
 * - target: number (goal, default 10)
 * - reward: string or function
 */

(function() {
  if (window.DD_VOW_SYSTEM_V1) return;
  window.DD_VOW_SYSTEM_V1 = true;

  const VOW_DEFS = {
    iron_tongue: {
      name: 'Iron Tongue',
      desc: 'Speak truth in combat. Actions taken.',
      target: 10,
      reward: 'Combat actions grant +5% XP'
    },
    ashwalker: {
      name: 'Ashwalker',
      desc: 'Walk through fire. Damage taken.',
      target: 100,
      reward: 'Taken damage converts to +1% max HP'
    },
    hollow_warden: {
      name: 'Hollow Warden',
      desc: 'Protect the empty. Guard actions.',
      target: 15,
      reward: 'Guard grants +10% damage reduction'
    },
    shardborn: {
      name: 'Shardborn',
      desc: 'Gather shards. Shards collected.',
      target: 50,
      reward: 'Shard drops +20% more'
    },
    borrowed_hour: {
      name: 'Borrowed Hour',
      desc: 'Live on borrowed time. Narrow escapes.',
      target: 5,
      reward: 'Revival timer halved'
    },
    silent_dex: {
      name: 'Silent Dex',
      desc: 'Move unseen. Dodges landed.',
      target: 20,
      reward: 'Dodge chance +5%'
    },
    bell_vaults: {
      name: 'Bell Vaults',
      desc: 'Unlock memories. New gear found.',
      target: 8,
      reward: 'Discovered gear rarity +1 tier'
    }
  };

  function ensureVowState() {
    const state = window.gameState || window.G || {};
    if (!state.vows) {
      state.vows = {};
      Object.keys(VOW_DEFS).forEach(vowId => {
        state.vows[vowId] = {
          active: false,
          progress: 0,
          target: VOW_DEFS[vowId].target,
          completed: false
        };
      });
    }
    return state;
  }

  window.activateVow = function(vowId) {
    const state = ensureVowState();
    if (state.vows[vowId] && !state.vows[vowId].active) {
      state.vows[vowId].active = true;
      console.log(`[Vow] Activated: ${VOW_DEFS[vowId].name}`);
      updateVowUI();
    }
  };

  window.addVowProgress = function(vowId, amount) {
    const state = ensureVowState();
    if (state.vows[vowId] && state.vows[vowId].active) {
      state.vows[vowId].progress = Math.min(
        state.vows[vowId].progress + amount,
        state.vows[vowId].target
      );
      if (state.vows[vowId].progress >= state.vows[vowId].target && !state.vows[vowId].completed) {
        state.vows[vowId].completed = true;
        console.log(`[Vow] Complete: ${VOW_DEFS[vowId].name}`);
      }
    }
  };

  window.getActiveVows = function() {
    const state = ensureVowState();
    return Object.entries(state.vows)
      .filter(([_, v]) => v.active)
      .map(([id, v]) => ({ id, ...v, ...VOW_DEFS[id] }));
  };

  window.getAllVows = function() {
    const state = ensureVowState();
    return Object.entries(state.vows)
      .map(([id, v]) => ({ id, ...v, ...VOW_DEFS[id] }));
  };

  // Hook combat actions to accumulate vow progress
  const originalCombatAction = window.doCombatAction;
  window.doCombatAction = function(action) {
    const state = ensureVowState();
    
    // iron_tongue: each action
    addVowProgress('iron_tongue', 1);

    // silent_dex: dodge actions
    if (action === 'dodge') {
      addVowProgress('silent_dex', 1);
    }

    // hollow_warden: guard actions
    if (action === 'guard') {
      addVowProgress('hollow_warden', 1);
    }

    if (originalCombatAction) return originalCombatAction(action);
  };

  // Hook damage to ashwalker
  const originalTakeDamage = window.takeDamage;
  window.takeDamage = function(amount) {
    addVowProgress('ashwalker', amount || 1);
    if (originalTakeDamage) return originalTakeDamage(amount);
  };

  function updateVowUI() {
    const drawer = document.getElementById('ddxVowsContent');
    if (!drawer) return;

    const activeVows = getActiveVows();
    if (activeVows.length === 0) {
      drawer.innerHTML = '<div style="color: rgba(240,234,222,0.35); font-size: 0.8rem;">No active vows yet. Activate one from the Vow Board.</div>';
      return;
    }

    let html = '';
    activeVows.forEach(v => {
      const pct = Math.round((v.progress / v.target) * 100);
      const barWidth = Math.round((v.progress / v.target) * 100);
      html += `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 0.75rem; color: #ffa246; margin-bottom: 3px; font-family: var(--font);">• ${v.name}</div>
          <div style="background: rgba(255,162,70,0.15); border-radius: 2px; height: 6px; overflow: hidden;">
            <div style="background: #ffa246; height: 100%; width: ${barWidth}%; transition: width 0.3s;"></div>
          </div>
          <div style="font-size: 0.65rem; color: rgba(240,234,222,0.50); margin-top: 2px; font-family: var(--font);">${v.progress}/${v.target} ${v.completed ? '✓' : ''}</div>
        </div>
      `;
    });

    drawer.innerHTML = html;
  }

  // Build Vow Board screen
  function buildVowBoard() {
    const container = document.getElementById('dex');
    if (!container) return;

    const allVows = getAllVows();

    let html = `
      <div style="padding: 12px; background: #06070a;">
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.85rem; color: #ffa246; margin-bottom: 8px; font-family: var(--font); font-weight: bold;">Seven Vows</div>
          <div style="font-size: 0.75rem; color: rgba(240,234,222,0.60); font-family: var(--font); line-height: 1.4;">
            Sacred oaths sworn in the deep. Each vow grows stronger as you follow its path.
          </div>
        </div>
    `;

    allVows.forEach(v => {
      const isActive = v.active;
      const pct = Math.round((v.progress / v.target) * 100);
      const bgColor = isActive ? 'rgba(255,162,70,0.12)' : 'rgba(255,162,70,0.04)';
      const borderColor = isActive ? 'rgba(255,162,70,0.25)' : 'rgba(255,162,70,0.12)';

      html += `
        <div style="padding: 12px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 6px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.8rem; font-weight: bold; color: #ffa246; font-family: var(--font);">${v.name}</div>
              <div style="font-size: 0.7rem; color: rgba(240,234,222,0.50); font-family: var(--font); margin-top: 2px;">${v.desc}</div>
            </div>
            <button class="ddx-vow-btn" data-vow-id="${v.id}" style="padding: 4px 12px; background: ${isActive ? 'rgba(255,162,70,0.20)' : 'rgba(255,162,70,0.08)'}; border: 1px solid rgba(255,162,70,0.20); color: #ffa246; cursor: pointer; border-radius: 3px; font-size: 0.65rem; font-family: var(--font); font-weight: bold;">
              ${isActive ? 'ACTIVE' : 'Activate'}
            </button>
          </div>

          ${isActive ? `
            <div style="margin-bottom: 8px;">
              <div style="background: rgba(255,162,70,0.15); border-radius: 2px; height: 8px; overflow: hidden; margin-bottom: 4px;">
                <div style="background: #ffa246; height: 100%; width: ${pct}%; transition: width 0.3s;"></div>
              </div>
              <div style="font-size: 0.65rem; color: rgba(240,234,222,0.50); font-family: var(--font);">
                Progress: ${v.progress}/${v.target} ${v.completed ? '✓ Complete' : ''}
              </div>
            </div>
          ` : ''}

          <div style="font-size: 0.7rem; color: rgba(240,234,222,0.40); font-family: var(--font); font-style: italic;">
            ${v.reward}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach listeners
    document.querySelectorAll('.ddx-vow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vowId = e.currentTarget.dataset.vowId;
        activateVow(vowId);
      });
    });
  }

  // Watch for screen changes
  const originalSwitchScreen = window.switchScreen;
  window.switchScreen = function(screen) {
    if (originalSwitchScreen) originalSwitchScreen(screen);
    if (screen === 'dex') {
      setTimeout(buildVowBoard, 50);
    }
  };

  // Init
  const DOMReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  DOMReady(() => {
    ensureVowState();
    updateVowUI();
    setInterval(updateVowUI, 500);
  });

})();
