'use strict';

// DungeonDex v1.4.9b — Interface Density Cleanup.
// Broad low-risk UI/copy cleanup for Town, Lowfire Board, Relic Forge, talents, boss headers, and mobile spacing.
(function(){
  if (window.DDInterfaceDensityCleanup) return;
  window.DDInterfaceDensityCleanup = true;

  const BUILD = '1.4.9b';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.4.9b-interface-density-cleanup';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;

  function syncBuild(){
    const tag = document.getElementById('buildTag');
    if (tag) tag.textContent = LABEL;
    document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
  }

  function injectCss(){
    if (document.getElementById('ddInterfaceDensityCleanupCss')) return;
    const style = document.createElement('style');
    style.id = 'ddInterfaceDensityCleanupCss';
    style.textContent = `
      :root{--dd-tight-border:rgba(255,190,110,.16);--dd-tight-bg:rgba(255,255,255,.028)}

      /* Global density cleanup */
      .panel{scroll-margin-bottom:86px}
      .card-head h2,.card-head h3{line-height:1.05}
      .small{line-height:1.25}
      .pill{line-height:1!important;min-height:20px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
      button.mini,.mini{min-height:28px;padding-inline:9px}

      /* Top Town wallet chips */
      .district-wallet-slot{margin-top:6px!important}
      .town-wallet-chips{gap:4px 5px!important;font-size:10.75px!important}
      .town-wallet-chips>span{min-height:20px!important;padding:3px 7px!important;font-size:10.75px!important}

      /* Relic Forge: keep it functional, not tutorial-heavy */
      #forgePanel .forge-head p{max-width:54ch}
      #forgePanel .forge-wallet{gap:5px!important;margin-top:6px!important}
      #forgePanel .forge-wallet .pill{font-size:11px;padding:4px 8px}
      #forgePanel .forge-grid{gap:6px!important}
      #forgePanel .forge-note,#forgePanel .forge-explain{font-size:11px!important;line-height:1.35!important;margin:6px 0!important;color:rgba(231,221,205,.72)!important}
      #forgePanel .forge-slot-grid button,#forgePanel .forge-temper-grid button{font-size:11px!important;padding:7px 6px!important}
      #forgePanel button span{font-size:10px!important}

      /* Lowfire Board: make it read like a compact task board */
      #questPanel .card-head{align-items:flex-start!important;margin-bottom:6px!important}
      #questPanel .card-head h2{margin-bottom:2px!important}
      #questPanel .card-head p{line-height:1.22!important;margin:2px 0!important}
      #questPanel .lowfire-board-tip{max-width:82ch!important;font-size:10.75px!important;line-height:1.25!important;margin-top:3px!important}
      #questPanel .spark-source-strip{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;margin:7px 0 9px!important}
      #questPanel .spark-source-strip span{padding:6px 7px!important;font-size:10.75px!important;line-height:1.18!important;min-height:44px!important}
      #questPanel .spark-source-strip b{font-size:11px!important;color:#f2d59a!important}
      #questPanel .warden-ledger{border-top:1px solid rgba(255,255,255,.06);padding-top:8px}
      #questPanel .ledger-subhead{align-items:flex-start!important;margin:5px 0 6px!important}
      #questPanel .ledger-subhead strong{font-size:13px!important}
      #questPanel .ledger-subhead p{font-size:10.75px!important;margin-top:2px!important}
      #questPanel .spark-writ-card{padding:8px!important;margin:6px 0 10px!important;border-radius:14px!important}
      #questPanel .spark-writ-card strong{font-size:13px!important}
      #questPanel .spark-writ-card p{font-size:10.75px!important;line-height:1.22!important;margin-top:2px!important}
      #questPanel .spark-writ-actions{margin-top:6px!important;justify-content:flex-start!important}
      #questPanel .warden-objective-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
      #questPanel .quest-card{margin:0!important;padding:9px 10px!important;border-radius:14px!important;background:var(--dd-tight-bg)!important;border-color:var(--dd-tight-border)!important}
      #questPanel .quest-card strong{font-size:13px!important;line-height:1.1!important}
      #questPanel .quest-card p{margin:4px 0!important;font-size:10.75px!important;line-height:1.2!important}
      #questPanel .objective-detail{font-size:10.5px!important;line-height:1.2!important;color:rgba(231,221,205,.58)!important}
      #questPanel .xpbar{height:8px!important;margin-top:6px!important}

      /* Elite board under objectives */
      #questPanel .elite-contract-board{margin-top:12px!important;padding-top:10px!important;border-top:1px solid rgba(255,255,255,.06)}
      #questPanel .elite-contract-head h3{font-size:14px!important}
      #questPanel .elite-contract-head p{font-size:10.75px!important;line-height:1.22!important}
      #questPanel .elite-contract-card{padding:9px!important;border-radius:14px!important}
      #questPanel .elite-contract-detail-grid{gap:5px 10px!important}
      #questPanel .refresh-compact strong{font-size:10px!important}

      /* Warden talents density */
      #talentPanel .talent-head p{font-size:10.75px!important;line-height:1.22!important}
      #talentPanel .talent-tree{padding:7px!important;border-radius:13px!important}
      #talentPanel .talent-card{padding:7px!important;margin-bottom:5px!important;border-radius:11px!important}
      #talentPanel .talent-effect,#talentPanel .talent-lore{font-size:10.5px!important}

      /* Boss header remains clean and intentional */
      .combat-device-boss .combat-enemy-header{padding:7px 9px!important;min-height:auto!important}
      .combat-device-boss .combat-enemy-header .depth-kicker{font-size:11.5px!important;line-height:1.2!important}

      /* Better wide-screen nav, preserve mobile full width */
      .tabs.panel,nav.tabs{left:50%!important;right:auto!important;transform:translateX(-50%)!important;width:min(880px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important}

      @media(max-width:820px){
        #questPanel .spark-source-strip{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #questPanel .warden-objective-list{grid-template-columns:1fr!important}
      }
      @media(max-width:560px){
        #questPanel .spark-source-strip span{min-height:auto!important}
        .town-wallet-chips>span{font-size:10.5px!important;padding:3px 6px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function replaceTextNode(root, from, to){
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeValue && node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    });
  }

  function polishCopy(){
    const quest = document.getElementById('questPanel');
    const forge = document.getElementById('forgePanel');
    replaceTextNode(quest, 'Temper equipped gear 3 times.', 'Upgrade equipped gear with Tempering 3 times.');
    replaceTextNode(quest, 'Temper equipped gear. Each Temper counts once.', 'Temper any equipped item. Each upgrade counts once.');
    replaceTextNode(quest, 'One rotating order. Finish it, claim it, then Lowfire posts another.', 'A rotating work order. Finish it, claim it, and Lowfire posts another.');
    replaceTextNode(quest, 'Board work is the steady way to earn Forge Sparks outside random drops.', 'Board work is the steady way to earn Forge Sparks.');
    replaceTextNode(forge, 'Material farming is tracked on the Lowfire Board.', 'Material farming is tracked below on the Lowfire Board.');

    // Remove the now-obvious Spark Source pill if any earlier cleanup missed it.
    if (quest) {
      quest.querySelectorAll('.ledger-subhead .pill').forEach(pill => {
        if ((pill.textContent || '').trim().toLowerCase() === 'spark source') pill.remove();
      });
    }
  }

  function improveSparkWritButtons(){
    const refresh = document.getElementById('refreshSparkWritBtn');
    if (refresh && refresh.textContent.trim() === 'New Writ') refresh.textContent = 'Draw Writ';
    const claim = document.getElementById('claimSparkWritBtn');
    if (claim && claim.textContent.trim() === 'Claim Spark Writ') claim.textContent = 'Claim Writ';
  }

  function run(){
    injectCss();
    syncBuild();
    polishCopy();
    improveSparkWritButtons();
  }

  function wrap(name){
    const fn = window[name] || globalThis[name];
    if (typeof fn !== 'function' || fn.__interfaceDensityCleaned) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      run();
      return result;
    };
    wrapped.__interfaceDensityCleaned = true;
    try { window[name] = wrapped; } catch (_) {}
    try { globalThis[name] = wrapped; } catch (_) {}
  }

  function install(){
    wrap('render');
    wrap('renderTown');
    wrap('renderGear');
    wrap('bindDynamic');
    wrap('switchScreen');
    run();
  }

  install();
  window.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', install);
  window.setTimeout(install, 100);
  window.setTimeout(install, 400);
  window.setTimeout(install, 1000);
})();
