const CACHE_NAME = 'dungeon-dex-v1.4.1-living-dungeon';
const ASSETS = [
  './',
  './index.html',
  './styles.css?build=1.4.1-living-dungeon',
  './manifest.json',
  './js/systems/00_core_constants_data.js?build=1.4.1-living-dungeon',
  './js/systems/01_state_recovery.js?build=1.4.1-living-dungeon',
  './js/systems/02_currency_pending_rewards.js?build=1.4.1-living-dungeon',
  './js/systems/03_town_contracts_market.js?build=1.4.1-living-dungeon',
  './js/systems/04_depth_progression_charters.js?build=1.4.1-living-dungeon',
  './js/systems/05_elite_modifiers.js?build=1.4.1-living-dungeon',
  './js/systems/06_scaling_generation_audits.js?build=1.4.1-living-dungeon',
  './js/systems/07_player_combat_runtime.js?build=1.4.1-living-dungeon',
  './js/systems/08_normalization_save.js?build=1.4.1-living-dungeon',
  './js/systems/09_ui_common_intro.js?build=1.4.1-living-dungeon',
  './js/systems/10_ui_town_shop.js?build=1.4.1-living-dungeon',
  './js/systems/11_ui_run_gear_dex_archive.js?build=1.4.1-living-dungeon',
  './js/systems/12_render_bindings_boot.js?build=1.4.1-living-dungeon'
];
const FRESH_FIRST_DESTINATIONS = new Set(['script','style','worker','manifest']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  if (FRESH_FIRST_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(found => found || fetch(event.request)));
});


// v1.4.1 Monster Identity & Elite Behavior Pass
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