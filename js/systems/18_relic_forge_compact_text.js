'use strict';

// DungeonDex v1.4.8c - Lowfire Forge compact text pass.
(function(){
  if (window.DDRelicForgeCompactText) return;
  window.DDRelicForgeCompactText = true;

  function injectCompactForgeTextStyles(){
    if (document.getElementById('ddForgeCompactTextCss')) return;
    const style = document.createElement('style');
    style.id = 'ddForgeCompactTextCss';
    style.textContent = `
      #forgePanel .card-head p,
      #forgePanel .forge-help,
      #forgePanel .forge-explain,
      #forgePanel .forge-note,
      #forgePanel .small {
        font-size: 11px;
        line-height: 1.32;
      }
      #forgePanel .forge-help {
        padding: 6px 8px;
        margin: 6px 0 1px;
      }
      #forgePanel .forge-help ul {
        margin: 4px 0 0;
        padding-left: 15px;
      }
      #forgePanel .forge-help li {
        margin: 2px 0;
      }
      #forgePanel .sep {
        margin-top: 7px;
        margin-bottom: 7px;
      }
      #forgePanel .tag-row {
        gap: 4px;
      }
      #forgePanel .pill {
        font-size: 10.5px;
      }
      #forgePanel button span {
        font-size: 10.5px;
      }
    `;
    document.head.appendChild(style);
  }

  injectCompactForgeTextStyles();
  const oldRender = typeof render === 'function' ? render : null;
  if (oldRender) {
    try {
      render = function(){ oldRender(); injectCompactForgeTextStyles(); };
    } catch (_) {
      window.render = function(){ oldRender(); injectCompactForgeTextStyles(); };
    }
  }
})();