'use strict';

// DungeonDex v1.4.9a — Spark Writ header cleanup.
// Removes the redundant "Spark Source" bubble from the Repeatable Spark Writ header.
(function(){
  if (window.DDSparkWritPillCleanup) return;
  window.DDSparkWritPillCleanup = true;

  function inject(){
    if (document.getElementById('ddSparkWritPillCleanupCss')) return;
    const style = document.createElement('style');
    style.id = 'ddSparkWritPillCleanupCss';
    style.textContent = `
      #questPanel .warden-ledger > .ledger-subhead:first-child > .pill{
        display:none!important;
      }
      #questPanel .warden-ledger > .ledger-subhead:first-child{
        align-items:flex-start!important;
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
