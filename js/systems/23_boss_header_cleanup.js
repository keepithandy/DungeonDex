'use strict';

// DungeonDex v1.4.9a — Boss header cleanup.
// Keeps the boss floor / district boss title, removes excess monster callout copy from boss encounters.
(function(){
  if (window.DDBossHeaderCleanup) return;
  window.DDBossHeaderCleanup = true;

  function inject(){
    if (document.getElementById('ddBossHeaderCleanupCss')) return;
    var style = document.createElement('style');
    style.id = 'ddBossHeaderCleanupCss';
    style.textContent = `
      .combat-device-boss .combat-enemy-header {
        padding: 8px 10px !important;
        text-align: center !important;
      }
      .combat-device-boss .combat-enemy-header > :not(.depth-kicker) {
        display: none !important;
      }
      .combat-device-boss .combat-enemy-header .depth-kicker {
        display: block !important;
        margin: 0 !important;
        font-size: 12px !important;
        line-height: 1.2 !important;
        letter-spacing: .03em !important;
        color: #f0bd67 !important;
        text-transform: uppercase !important;
        white-space: normal !important;
      }
    `;
    document.head.appendChild(style);
  }

  inject();
  window.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', inject);
  window.setTimeout(inject, 100);
  window.setTimeout(inject, 500);
})();
