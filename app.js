// DungeonDex v1.26.3.02 runtime pointer.
// Runtime code now lives in ./js/systems/*.js and is loaded from index.html in numeric order.
// See ./js/systems/README.md for the system map.
//
// v1.26.3.02: Town Runtime Layer Cleanup
// - Consolidates the Town currency strip under one runtime owner.
// - Removes the redundant Spark Writ pill at its source and retires obsolete cleanup shells.
// - Preserves gameplay, economy, combat, rewards, saves, and Revisit behavior.

window.DUNGEONDEX_BUILD = '1.26.3.02';
window.DUNGEONDEX_BUILD_QS = '1.26.3.02-town-runtime-layer-cleanup';

window.DungeonDexComputeDevtoolsGate = window.DungeonDexComputeDevtoolsGate || function computeDevtoolsGate(locationLike){
  var loc = locationLike || {};
  var protocol = String(loc.protocol || '');
  var host = String(loc.hostname || '').toLowerCase();
  var search = String(loc.search || '');
  var params;
  try {
    params = new URLSearchParams(search);
  } catch (err) {
    params = new URLSearchParams('');
  }
  var queryFlag = params.get('devtools');
  if (queryFlag == null || queryFlag === '') queryFlag = params.get('dev');
  var queryEnabled = queryFlag === '1' || /^true$/i.test(String(queryFlag || ''));
  var explicitOff = queryFlag === '0' || /^false$/i.test(String(queryFlag || ''));
  var localHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]';
  var fileReview = protocol === 'file:';
  var enabled = !explicitOff && (queryEnabled || localHost || fileReview);
  var reason = explicitOff
    ? 'query-disabled'
    : queryEnabled
      ? 'query-enabled'
      : localHost
        ? 'localhost'
        : fileReview
          ? 'file-review'
          : 'public';
  return {
    enabled: enabled,
    reason: reason,
    queryFlag: queryFlag == null ? '' : String(queryFlag),
    localHost: localHost,
    fileReview: fileReview
  };
};

(function(){
  var gate = window.DungeonDexComputeDevtoolsGate(window.location);
  window.DUNGEONDEX_DEVTOOLS_ENABLED = !!gate.enabled;
  window.DUNGEONDEX_DEVTOOLS_GATE = gate;
})();

// Interface density cleanup helpers
window.DD_MONSTER_ARCHETYPES = [
  "Brute","Ritualist","Skulker","Ashbound",
  "Mireborn","Furnace Spawn","Hollowed","Warden"
];

window.ddGetMonsterCue = function(name){
  const monsterName = String(name || "").trim();
  const cues = [
    "The creature watches silently.",
    "Ash drifts from the enemy's armor.",
    "A hostile presence fills the chamber.",
    "The monster prepares to strike.",
    "The enemy's eyes gleam with malice.",
    "A shadow moves across the floor.",
    "The creature's breath is ragged and heavy.",
    "The monster's claws scrape against the stone.",
    "The enemy lets out a low growl.",
    "The creature's gaze is fixed on you.",
    "The monster's movements are deliberate and menacing.",
    "A chill runs down your spine as the enemy approaches.",
  ];
  const namedCues = monsterName ? [
    `the ${monsterName} studies your stance carefully.`,
    `the ${monsterName} lets out a low growl.`,
    `the ${monsterName} shifts its weight, preparing to strike.`,
    `the ${monsterName} eyes you with a predatory gaze.`,
    `the ${monsterName} moves with a fluid, dangerous grace.`,
  ]  : [];
  const pool = namedCues.length ? cues.concat(namedCues) : cues;
  return pool[Math.floor(Math.random()*pool.length)];
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
    var qs = window.DUNGEONDEX_BUILD_QS || '1.26.3.02-town-runtime-layer-cleanup';
    if (window.DUNGEONDEX_DEVTOOLS_ENABLED) {
      loadModule('./js/systems/13_devtools_overlay.js?build=' + qs, 'DungeonDexDevTools', 'DevTools overlay');
      window.setTimeout(function(){ loadModule('./js/systems/14_devtools_scenarios.js?build=' + qs, 'DungeonDexScenarioDevTools', 'DevTools scenario presets'); }, 20);
      window.setTimeout(function(){ loadModule('./js/systems/15_devtools_balance_reports.js?build=' + qs, 'DungeonDexBalanceReports', 'DevTools balance reports'); }, 40);
      window.setTimeout(function(){ loadModule('./js/systems/43_devkit_reset_hold.js?build=' + qs, 'DDDevKitResetHold', 'DevKit reset hold'); }, 660);
    }
    window.setTimeout(function(){ loadModule('./js/systems/44_revisit_lowfire_board_slot.js?build=' + qs, '__dungeondexRevisitTrophyEchoOnly', 'Trophy Echo-only Revisit surface'); }, 40);
    window.setTimeout(function(){ loadModule('./js/systems/36_ui_revisit_archive_codex.js?build=' + qs, 'DDRevisitArchiveCodex', 'Revisit archive codex'); }, 80);
    window.setTimeout(function(){ loadModule('./js/systems/45_trophy_echo_result_detail.js?build=' + qs, 'DDTrophyEchoResultDetail', 'Trophy Echo result detail'); }, 120);
    window.setTimeout(function(){ loadModule('./js/systems/21_build_label_guard.js?build=' + qs, 'DDBuildLabelGuard', 'Build label guard'); }, 150);
    window.setTimeout(function(){ loadModule('./js/systems/31_revisit_activation_surface_lockdown.js?build=' + qs, 'DDRevisitActivationSurfaceLockdown', 'Revisit activation surface lockdown'); }, 420);
    window.setTimeout(function(){ loadModule('./js/systems/39_gear_upgrade_summary_panel.js?build=' + qs, 'DDGearUpgradeSummaryPanel', 'Gear upgrade summary panel'); }, 500);
    window.setTimeout(function(){ loadModule('./js/systems/40_gear_detail_modal.js?build=' + qs, 'DDGearDetailModal', 'Gear detail modal'); }, 540);
    window.setTimeout(function(){ loadModule('./js/systems/41_debt_pressure_v1.js?build=' + qs, 'DDDebtPressureV1', 'Debt Pressure v1'); }, 580);
    window.setTimeout(function(){ loadModule('./js/systems/42_gear_upgrade_money_text_cleanup.js?build=' + qs, 'DDGearUpgradeMoneyTextCleanup', 'Gear upgrade money text cleanup'); }, 620);
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
      ddPulse(player, "player-hit", 260);
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
    } catch(err) {}
  };
})();