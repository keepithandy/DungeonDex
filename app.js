// DungeonDex v1.25.2 runtime pointer.
// Runtime code now lives in ./js/systems/*.js and is loaded from index.html in numeric order.
// See ./js/systems/README.md for the system map.
//
// v1.25.2: Revisit No-op Stability + Version Alignment
// - Disabled the unstable Revisit DOM relocation helper after mobile/Textastic lag reports.
// - Bumped the service-worker cache to force stale relocation assets out of the app cache.
// - Aligned runtime/cache/version authority labels for the stability baseline.
// - Gameplay, save data, and system activation remain unchanged.

window.DUNGEONDEX_BUILD = '1.25.2';
window.DUNGEONDEX_BUILD_QS = '1.25.2-revisit-noop-stability';

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
    var qs = window.DUNGEONDEX_BUILD_QS || '1.25.2-revisit-noop-stability';
    loadModule('./js/systems/14_devtools_scenarios.js?build=' + qs, 'DungeonDexScenarioDevTools', 'DevTools scenario presets');
    loadModule('./js/systems/15_devtools_balance_reports.js?build=' + qs, 'DungeonDexBalanceReports', 'DevTools balance reports');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadExtensions, { once:true });
  } else {
    loadExtensions();
  }
})();
