'use strict';

// DungeonDex v1.20.35 - Interface density and app-feel cleanup.
// Broad low-risk UI/copy cleanup for Town, Lowfire Board, Relic Forge, talents, boss headers, and mobile spacing.
(function(){
  if (window.DDInterfaceDensityCleanup) return;
  window.DDInterfaceDensityCleanup = true;

  const BUILD = '1.20.35';
  const LABEL = 'DungeonDex v' + BUILD;
  const BUILD_QS = '1.20.35-debt-clarity-renderer-copy-model-dry-run';

  window.DUNGEONDEX_BUILD = BUILD;
  window.DUNGEONDEX_BUILD_QS = BUILD_QS;

  function syncBuild(){
    const tag = document.getElementById('buildTag');
    if (tag) tag.textContent = LABEL;
    document.title = LABEL;
    if (window.S && typeof window.S === 'object') window.S.build = BUILD_QS;
  }

  function syncBuildHealth(){
    const health = typeof window.DUNGEONDEX_BUILD_HEALTH === 'function' ? window.DUNGEONDEX_BUILD_HEALTH() : null;
    if (!health) return;
    window.DUNGEONDEX_BUILD_STATUS = health;
    if (window.console && console.info) {
      console.info('Build check:', health.build);
      console.info('Cache query:', health.cacheQuery);
      console.info('Cache hygiene:', health.cacheHealth);
    }
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
      #questPanel .elite-trophy-strip,#screen-dex .elite-trophy-summary{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:7px 0 9px;padding:7px 8px;border:1px solid rgba(255,255,255,.06);border-radius:13px;background:rgba(255,255,255,.025)}
      #questPanel .elite-trophy-strip strong,#screen-dex .elite-trophy-summary-head h3{font-size:13px!important;margin:0}
      #questPanel .elite-trophy-strip p,#screen-dex .elite-trophy-summary-copy{margin:2px 0 0;font-size:10.75px!important;line-height:1.2!important;color:rgba(231,221,205,.72)!important}
      #questPanel .rival-writ-section{margin:8px 0 10px;padding:8px;border:1px solid rgba(255,100,80,.16);border-radius:14px;background:linear-gradient(180deg,rgba(140,28,20,.08),rgba(255,255,255,.018))}
      #questPanel .rival-writ-head{margin-bottom:6px}
      #questPanel .elite-contract-card{padding:9px!important;border-radius:14px!important}
      #questPanel .elite-contract-detail-grid{gap:5px 10px!important}
      #questPanel .refresh-compact strong{font-size:10px!important}

      /* Talent paths density */
      #talentPanel .talent-head{gap:7px!important;margin-bottom:6px!important}
      #talentPanel .talent-head p{font-size:10.75px!important;line-height:1.22!important}
      #talentPanel .talent-passive-note{font-size:10.5px!important;line-height:1.1!important;padding:3px 7px!important;margin-top:5px!important}
      #talentPanel .talent-preview-banner{display:flex;flex-direction:column;gap:2px;margin:4px 0 7px;padding:6px 8px;border:1px solid rgba(255,190,110,.14);border-radius:12px;background:rgba(255,255,255,.024)}
      #talentPanel .talent-preview-banner strong{font-size:10.75px;line-height:1.05;color:#f2d59a}
      #talentPanel .talent-preview-banner span{font-size:10.25px;line-height:1.2;color:rgba(231,221,205,.78)}
      #talentPanel .talent-ledger-card{margin:0 0 7px;padding:7px 8px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02)}
      #talentPanel .talent-ledger-head{gap:6px;align-items:flex-start}
      #talentPanel .talent-ledger-head strong{display:block;font-size:12px;line-height:1.08;color:#f1d79d}
      #talentPanel .talent-ledger-head p{font-size:10.5px;line-height:1.16;margin-top:2px}
      #talentPanel .talent-ledger-chips{gap:4px 5px;margin:5px 0 6px!important}
      #talentPanel .talent-point-line{gap:3px 6px!important;margin:4px 0 6px!important;padding:6px 7px!important;font-size:10.75px!important;line-height:1.18!important}
      #talentPanel .talent-milestone-line{gap:3px 7px!important;margin:0 0 7px!important;padding:6px 7px!important;font-size:10.75px!important;line-height:1.18!important}
      #talentPanel .talent-summary-row{display:flex;flex-wrap:wrap;gap:5px!important;margin:5px 0 8px!important}
      #talentPanel .talent-summary-row span{font-size:10.5px!important;padding:3px 6px!important}
      #talentPanel .talent-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important}
      #talentPanel .talent-preview-branch{padding:8px!important;border-radius:13px!important}
      #talentPanel .talent-preview-branch-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}
      #talentPanel .talent-preview-branch-head strong{margin:1px 0 3px!important;font-size:13px!important;line-height:1.08!important}
      #talentPanel .talent-state-pill{min-height:19px!important;padding:3px 6px!important;font-size:9.75px!important}
      #talentPanel .talent-path-label{display:block;font-size:10px!important;letter-spacing:.04em;text-transform:uppercase;color:#e3c187}
      #talentPanel .talent-path-effect,#talentPanel .talent-path-summary,#talentPanel .talent-path-note{font-size:10.5px!important;line-height:1.22!important}
      #talentPanel .talent-preview-tags{margin-top:5px!important}

      /* Gear and archive scanability */
      #screen-gear .inventory-upgrade-card{border-color:rgba(122,232,178,.20)!important;background:linear-gradient(180deg,rgba(122,232,178,.040),rgba(255,255,255,.014))!important}
      #screen-gear .inventory-upgrade-card .gear-status-badge.better{border-color:rgba(122,232,178,.28)!important;background:rgba(122,232,178,.08)!important;color:#baf6d8!important}
      #screen-gear .loadout-inventory-head{gap:6px!important}
      #screen-gear .inventory-subline{font-size:10.75px!important;line-height:1.15!important}
      #screen-archive .archive-history-head p{font-size:10.75px!important;line-height:1.2!important}
      #screen-dex .elite-trophy-list{display:grid;gap:6px}
      #screen-dex .elite-trophy-line{display:grid;gap:3px;padding:8px 9px;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(255,255,255,.02)}
      #screen-archive .archive-note-line{display:grid!important;gap:3px!important;padding:7px 8px!important;line-height:1.28!important}
      #screen-archive .archive-note-stamp{font-size:10px!important;line-height:1!important}
      #screen-archive .archive-note-line>div:last-child{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.28}
      #screen-dex .boss-trophy-record-list{display:grid;gap:6px}
      #screen-dex .boss-trophy-record-line{display:grid;gap:3px;padding:8px 9px;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(255,255,255,.02)}

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

      /* App feel polish: keep combat playable inside the mobile viewport. */
      .app-shell.combat-active{max-width:min(100vw,760px)!important}
      .app-shell.combat-active #screen-run .stack-8{gap:5px!important;max-width:min(100%,700px)!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
      .app-shell.combat-active .combat-device-top,
      .app-shell.combat-active .combat-device-shell{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      .app-shell.combat-active .combat-haul-row .run-progress-copy{justify-content:flex-end!important}
      .app-shell.combat-active .combat-haul-row .run-progress-copy span:first-child{display:none!important}
      .app-shell.combat-active .run-log-head{margin-bottom:4px!important}
      .app-shell.combat-active .run-log-head h2{font-size:.82rem!important;color:#fff1c9!important}
      .app-shell.combat-active .run-log-head .pill{font-size:.6rem!important;padding:3px 6px!important}
      .app-shell.combat-active .run-log-list{min-height:0!important;max-height:clamp(82px,15dvh,124px)!important;gap:4px!important;padding-bottom:3px!important}
      .app-shell.combat-active .run-log-list .combat-feed-line{grid-template-columns:21px minmax(0,1fr)!important;gap:6px!important;padding:5px 6px!important;border-radius:12px!important}
      .app-shell.combat-active .feed-icon{width:20px!important;height:20px!important;font-size:.62rem!important}
      .app-shell.combat-active .feed-body{-webkit-line-clamp:2!important;font-size:.68rem!important;line-height:1.24!important}
      .app-shell.combat-active .feed-chip{font-size:.58rem!important;padding:1px 5px!important}
      .app-shell.combat-active .combat-personality-cue{display:block!important}

      @media(max-width:560px){
        .app-shell.combat-active #runStatus,
        .app-shell.combat-active #combatPanel,
        .app-shell.combat-active #combatLog{padding:7px!important}
        .app-shell.combat-active .combat-device-shell{gap:6px!important;padding:7px!important}
        .app-shell.combat-active .combat-enemy-header{padding:7px 8px!important}
        .app-shell.combat-active .combat-monster-stage{min-height:clamp(92px,16dvh,132px)!important}
        .app-shell.combat-active .combat-monster-stage.stage-boss{min-height:clamp(104px,18dvh,146px)!important}
        .app-shell.combat-active .combat-hp-card{gap:4px!important;padding:6px 8px!important}
        .app-shell.combat-active .combat-hud.run-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
        .app-shell.combat-active .combat-hud.run-stat-grid .stat-box{min-height:36px!important;padding:5px 4px!important}
        .app-shell.combat-active .combat-device-actions{gap:5px!important}
        .app-shell.combat-active .combat-device-actions button{min-height:44px!important;padding:7px 3px!important;font-size:.66rem!important}
      }

      @media(max-width:380px){
        .app-shell.combat-active .run-log-list{max-height:clamp(64px,12dvh,92px)!important}
        .app-shell.combat-active .combat-monster-stage{min-height:clamp(78px,14dvh,112px)!important}
        .app-shell.combat-active .combat-device-actions button{font-size:.62rem!important}
      }

      @media(max-width:340px){
        #talentPanel .talent-preview-banner{margin-bottom:5px!important;padding:5px 7px!important}
        #talentPanel .talent-ledger-card{margin-bottom:5px!important;padding:5px 7px!important}
        #talentPanel .talent-ledger-head p{display:none!important}
        #talentPanel .talent-ledger-chips{gap:3px 4px!important;margin:3px 0 4px!important}
        #talentPanel .talent-preview-grid{gap:4px!important}
        #talentPanel .talent-preview-branch{padding:5px!important}
        #talentPanel .talent-preview-branch-head p{display:none!important}
        #talentPanel .talent-preview-node-grid{display:none!important}
        #talentPanel .talent-preview-tags{gap:2px!important;margin-top:2px!important}
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
    syncBuildHealth();
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
