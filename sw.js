const CACHE_NAME = 'dungeon-dex-1.4.9a-nav-center';
const BUILD_QS = '1.4.9a-nav-center';
const ASSETS = [
  './',
  './index.html',
  `./styles.css?build=${BUILD_QS}`,
  `./app.js?build=${BUILD_QS}`,
  './manifest.json',
  `./js/systems/00_core_constants_data.js?build=${BUILD_QS}`,
  `./js/systems/01_state_recovery.js?build=${BUILD_QS}`,
  `./js/systems/02_currency_pending_rewards.js?build=${BUILD_QS}`,
  `./js/systems/03_town_contracts_market.js?build=${BUILD_QS}`,
  `./js/systems/04_depth_progression_charters.js?build=${BUILD_QS}`,
  `./js/systems/05_elite_modifiers.js?build=${BUILD_QS}`,
  `./js/systems/06_scaling_generation_audits.js?build=${BUILD_QS}`,
  `./js/systems/07_player_combat_runtime.js?build=${BUILD_QS}`,
  `./js/systems/08_normalization_save.js?build=${BUILD_QS}`,
  `./js/systems/09_ui_common_intro.js?build=${BUILD_QS}`,
  `./js/systems/10_ui_town_shop.js?build=${BUILD_QS}`,
  `./js/systems/11_ui_run_gear_dex_archive.js?build=${BUILD_QS}`,
  `./js/systems/12_render_bindings_boot.js?build=${BUILD_QS}`,
  `./js/systems/13_devtools_overlay.js?build=${BUILD_QS}`,
  `./js/systems/16_relic_forge_crafting.js?build=${BUILD_QS}`,
  `./js/systems/17_relic_forge_clarity.js?build=${BUILD_QS}`,
  `./js/systems/18_relic_forge_compact_text.js?build=${BUILD_QS}`,
  `./js/systems/19_warden_talents_lowfire_board.js?build=${BUILD_QS}`,
  `./js/systems/20_town_currency_clean_strip.js?build=${BUILD_QS}`,
  `./js/systems/21_build_label_guard.js?build=${BUILD_QS}`,
  `./js/systems/22_nav_centering.js?build=${BUILD_QS}`,
  './assets/trophies/hollow_stair_skull_trophy.png'
];
const FRESH_FIRST_DESTINATIONS = new Set(['script','style','worker','manifest']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const network = () => globalThis.fetch(event.request);
  if (event.request.mode === 'navigate') {
    event.respondWith(network().catch(() => caches.match('./index.html')));
    return;
  }
  if (FRESH_FIRST_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(network().catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || network()));
});
