// DungeonDex v1.13.1 runtime pointer.
// Runtime code now lives in ./js/systems/*.js and is loaded from index.html in numeric order.
// See ./js/systems/README.md for the system map.

window.DUNGEONDEX_BUILD = '1.13.1';
window.DUNGEONDEX_BUILD_QS = '1.13.1-rendered-build-label-cache-hygiene';

// Interface density cleanup helpers
window.DD_MONSTER_ARCHETYPES = [
  "Brute","Ritualist","Skulker","Ashbound",
  "Mireborn","Furnace Spawn","Hollowed","Warden"
];

window.ddGetMonsterCue = function(name){
  const cues = [
    "The creature watches silently.",
    "Ash drifts from the enemy's armor.",
    "A hostile presence fills the chamber.",
    "The monster prepares to strike."
  ];
  return cues[Math.floor(Math.random()*cues.length)];
};

(function(){
  if (window.DD_EXTRA_EXTENSION_LOADER) return;
  window.DD_EXTRA_EXTENSION_LOADER = true;
  function loadModule(src, globalName, label){
    if (globalName && window[globalName]) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onerror = function(){ console.warn('[DungeonDex] ' + label + ' failed to load.'); };
    document.head.appendChild(script);
  }
  function loadExtensions(){
    var qs = window.DUNGEONDEX_BUILD_QS || '1.13.1-rendered-build-label-cache-hygiene';
    loadModule('./js/systems/14_devtools_scenarios.js?build=' + qs, 'DungeonDexScenarioDevTools', 'DevTools scenario presets');
    loadModule('./js/systems/15_devtools_balance_reports.js?build=' + qs, 'DungeonDexBalanceReports', 'DevTools balance reports');
    window.setTimeout(function(){ loadModule('./js/systems/21_build_label_guard.js?build=' + qs, 'DDBuildLabelGuard', 'Build label guard'); }, 150);
    window.setTimeout(function(){ loadModule('./js/systems/26_spark_writ_pill_cleanup.js?build=' + qs, 'DDSparkWritPillCleanup', 'Spark Writ pill cleanup'); }, 220);
    window.setTimeout(function(){ loadModule('./js/systems/27_interface_density_cleanup.js?build=' + qs, 'DDInterfaceDensityCleanup', 'Interface Density Cleanup'); }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadExtensions);
  else loadExtensions();
})();

// Interface density cleanup runtime bindings
(function(){
  if (window.DD_IMPACT_142) return;
  window.DD_IMPACT_142 = true;

  function ddQueryAny(selectors){
    for (var i = 0; i < selectors.length; i++){
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function ddPulse(el, cls, ms){
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(function(){ el.classList.remove(cls); }, ms || 260);
  }

  window.ddImpactFeedback = function(kind){
    var stage = ddQueryAny([".combat-stage", ".monster-stage", ".encounter-stage", "#combatStage", "#monsterStage"]);
    var enemy = ddQueryAny([".enemy-card", ".monster-card", ".monster-portrait", ".enemy-combatant", "#enemyPanel"]);
    var player = ddQueryAny([".player-card", ".warden-card", ".hero-card", "#playerPanel"]);
    var reward = ddQueryAny([".reward-card", ".loot-card", ".run-event-card", "#rewardPanel"]);

    if (kind === "enemy-hit" || kind === "hit"){
      ddPulse(enemy || stage, "enemy-hit", 220);
      return;
    }
    if (kind === "player-hit" || kind === "hurt"){
      ddPulse(player || stage, "player-hit", 260);
      return;
    }
    if (kind === "heavy" || kind === "crit"){
      ddPulse(stage, "heavy-impact", 220);
      ddPulse(enemy || stage, "enemy-hit", 220);
      return;
    }
    if (kind === "elite"){
      ddPulse(stage, "elite-stinger", 520);
      return;
    }
    if (kind === "reward" || kind === "loot"){
      ddPulse(reward, "reward-reveal", 340);
      return;
    }
  };

  window.ddPlayImpactTone = function(kind){
    try{
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      window.__ddAudioCtx142 = window.__ddAudioCtx142 || new Ctx();
      var ctx = window.__ddAudioCtx142;
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = kind === "heavy" ? 92 : kind === "reward" ? 520 : 180;
      gain.gain.value = 0.018;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch(e) {}
  };
})();
