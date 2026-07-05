'use strict';

// Emergency render recovery guard.
// No CSS hiding. No Gear/Talent cleanup. Only restores a visible active screen.
(function(){
  window.DDInterfaceDensityCleanup = true;

  function state(){ try { return typeof S !== 'undefined' ? S : null; } catch (_) { return null; } }
  function html(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function num(v){ return Math.max(0, Math.floor(Number(v) || 0)); }
  function call(fn){ try { if (typeof fn === 'function') return fn(); } catch (err) { console.warn('DungeonDex recovery:', err); } }

  function setRunScreen(){
    const s = state();
    if (!s) return;
    s.screen = s.run && s.run.active ? 'run' : (s.screen || 'town');
    document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${s.screen}`));
    document.querySelectorAll('.tab').forEach(node => node.classList.toggle('active', node.dataset.screen === s.screen));
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.toggle('run-focus', s.screen === 'run');
      shell.classList.toggle('combat-active', s.screen === 'run' && !!s.run?.active);
    }
  }

  function runPanelsFilled(){
    return ['runStatus','combatPanel','combatLog'].some(id => {
      const node = document.getElementById(id);
      return node && (node.textContent || '').replace(/\s+/g, ' ').trim().length > 0;
    });
  }

  function drawRunFallback(){
    const s = state();
    if (!s?.run?.active || runPanelsFilled()) return;
    const runStatus = document.getElementById('runStatus');
    const combatPanel = document.getElementById('combatPanel');
    const combatLog = document.getElementById('combatLog');
    if (!runStatus || !combatPanel || !combatLog) return;
    const p = s.player || {};
    const m = s.run.monster || {};
    const floor = num(s.run.floor || 1) || 1;
    const mh = num(m.hp || 0);
    const mm = Math.max(1, num(m.maxHp || mh || 1));
    const ph = num(p.hp || 0);
    const pm = Math.max(1, num(p.maxHp || ph || 1));
    runStatus.innerHTML = '<div class="split"><div><h2>Recovered Descent</h2><p class="small muted">The normal run view failed, so a safe fallback view loaded.</p></div><span class="pill">D' + html(floor) + '</span></div>';
    combatPanel.innerHTML = '<div class="combat-device-shell"><section class="combat-enemy-header"><div class="depth-kicker">' + html(m.tier || 'Enemy') + '</div><p class="small muted">' + html(s.run.zone || 'The Hollow Stair') + '</p></section><section class="combat-hp-card enemy-hp"><div class="hp-label-row"><strong>' + html(m.name || 'Hollow Stair Threat') + '</strong><span>' + html(mh) + ' / ' + html(mm) + ' HP</span></div><div class="hpbar"><span style="width:' + Math.max(0, Math.min(100, mh / mm * 100)).toFixed(1) + '%"></span></div></section><section class="combat-hp-card player-hp"><div class="hp-label-row"><strong>Warden</strong><span>' + html(ph) + ' / ' + html(pm) + ' HP</span></div><div class="hpbar player-hpbar"><span style="width:' + Math.max(0, Math.min(100, ph / pm * 100)).toFixed(1) + '%"></span></div></section><section class="combat-device-actions"><button class="primary combat-btn" data-action="attack" type="button">Attack</button><button class="ghost combat-btn" data-action="skill" type="button">Ashburst</button><button class="ghost combat-btn" data-action="guard" type="button">Guard</button><button class="ghost combat-btn" data-action="extract" type="button">Extract</button></section></div>';
    const lines = Array.isArray(s.run.combatLog) ? s.run.combatLog.slice(0, 6) : [];
    combatLog.innerHTML = '<div class="run-log-head split"><h2>Feed</h2><span class="pill">Recovered</span></div><div class="run-log-list">' + (lines.length ? lines.map(line => '<div class="log-line small">' + html(line) + '</div>').join('') : '<div class="log-line small muted">Combat is active. Use the buttons above.</div>') + '</div>';
  }

  function recover(){
    const s = state();
    if (!s) return;
    if (s.run?.active) s.screen = 'run';
    call(() => typeof hideIntroModal === 'function' && hideIntroModal());
    call(() => typeof render === 'function' && render());
    setRunScreen();
    call(() => typeof renderRun === 'function' && renderRun());
    drawRunFallback();
    call(() => typeof bindCombatActions === 'function' && bindCombatActions());
    call(() => typeof bindDynamic === 'function' && bindDynamic());
  }

  function afterStart(){
    window.setTimeout(recover, 0);
    window.setTimeout(recover, 90);
    window.setTimeout(recover, 260);
  }

  function bind(){
    ['introModalEnterDungeonBtn','introModalContinueRunBtn','startRunBtn','runFromIdleBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn || btn.dataset.ddIntroRecovery) return;
      btn.dataset.ddIntroRecovery = '1';
      btn.addEventListener('click', afterStart, false);
    });
  }

  function install(){ setRunScreen(); bind(); if (state()?.run?.active) { drawRunFallback(); call(() => typeof bindCombatActions === 'function' && bindCombatActions()); } }

  const oldRender = window.render || globalThis.render;
  if (typeof oldRender === 'function' && !oldRender.__ddRecovery) {
    const wrapped = function(){ const r = oldRender.apply(this, arguments); setRunScreen(); drawRunFallback(); bind(); return r; };
    wrapped.__ddRecovery = true;
    try { window.render = wrapped; } catch (_) {}
    try { globalThis.render = wrapped; } catch (_) {}
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 100);
  window.setTimeout(install, 500);
})();
