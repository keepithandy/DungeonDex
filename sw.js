const CACHE_NAME = 'dungeon-dex-1.4.8-relic-forge-crafting';
const ASSETS = [
  './',
  './index.html',
  './styles.css?build=1.4.8-relic-forge-crafting',
  './app.js?build=1.4.8-relic-forge-crafting',
  './manifest.json',
  './js/systems/00_core_constants_data.js?build=1.4.8-relic-forge-crafting',
  './js/systems/01_state_recovery.js?build=1.4.8-relic-forge-crafting',
  './js/systems/02_currency_pending_rewards.js?build=1.4.8-relic-forge-crafting',
  './js/systems/03_town_contracts_market.js?build=1.4.8-relic-forge-crafting',
  './js/systems/04_depth_progression_charters.js?build=1.4.8-relic-forge-crafting',
  './js/systems/05_elite_modifiers.js?build=1.4.8-relic-forge-crafting',
  './js/systems/06_scaling_generation_audits.js?build=1.4.8-relic-forge-crafting',
  './js/systems/07_player_combat_runtime.js?build=1.4.8-relic-forge-crafting',
  './js/systems/08_normalization_save.js?build=1.4.8-relic-forge-crafting',
  './js/systems/09_ui_common_intro.js?build=1.4.8-relic-forge-crafting',
  './js/systems/10_ui_town_shop.js?build=1.4.8-relic-forge-crafting',
  './js/systems/11_ui_run_gear_dex_archive.js?build=1.4.8-relic-forge-crafting',
  './js/systems/12_render_bindings_boot.js?build=1.4.8-relic-forge-crafting',
  './js/systems/13_devtools_overlay.js?build=1.4.8-relic-forge-crafting',
  './js/systems/16_relic_forge_crafting.js?build=1.4.8-relic-forge-crafting',
  './assets/trophies/hollow_stair_skull_trophy.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
