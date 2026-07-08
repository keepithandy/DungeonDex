'use strict';

// DungeonDex v1.23.8.01 upgrade-panel text cleanup.
// Fixes escaped money markup in Merchant Gear Upgrade panels without changing costs or purchases.
(function(){
  if (window.DDGearUpgradeMoneyTextCleanup) return;
  window.DDGearUpgradeMoneyTextCleanup = true;

  function cleanMoneyText(raw){
    return String(raw || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanNodeText(node){
    if (!node) return;
    const raw = node.textContent || '';
    if (!/<\/?span\b/i.test(raw) && !/class=\"money/i.test(raw)) return;
    const cleaned = cleanMoneyText(raw);
    if (cleaned) node.textContent = cleaned;
  }

  function cleanUpgradeMoneyText(){
    document.querySelectorAll('.merchant-upgrade-card .pill, .merchant-upgrade-card p, .gear-upgrade-summary-card .pill, .gear-upgrade-summary-card p').forEach(cleanNodeText);
  }

  function wrapRender(name){
    const fn = window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : null);
    if (typeof fn !== 'function' || fn.__gearUpgradeMoneyTextCleanup) return false;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      cleanUpgradeMoneyText();
      return result;
    };
    wrapped.__gearUpgradeMoneyTextCleanup = true;
    try { window[name] = wrapped; } catch (_) {}
    try { globalThis[name] = wrapped; } catch (_) {}
    return true;
  }

  function install(){
    wrapRender('renderTown');
    wrapRender('renderGear');
    wrapRender('renderGearUpgradeSummaryPanel');
    cleanUpgradeMoneyText();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.setTimeout(install, 250);
  window.setTimeout(cleanUpgradeMoneyText, 600);
  window.setTimeout(cleanUpgradeMoneyText, 1200);
})();
