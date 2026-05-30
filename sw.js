const CACHE_NAME = 'dungeon-dex-v1.4.3d-smoke-notes-recovery-polish';
const ASSETS = [
  './',
  './index.html',
  './styles.css?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './app.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './manifest.json',
  './js/systems/00_core_constants_data.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/01_state_recovery.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/02_currency_pending_rewards.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/03_town_contracts_market.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/04_depth_progression_charters.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/05_elite_modifiers.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/06_scaling_generation_audits.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/07_player_combat_runtime.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/08_normalization_save.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/09_ui_common_intro.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/10_ui_town_shop.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/11_ui_run_gear_dex_archive.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './js/systems/12_render_bindings_boot.js?build=dungeon-dex-v1.4.3d-smoke-notes-recovery-polish',
  './assets/trophies/hollow_stair_skull_trophy.png'
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
