// Convert the guild nav into a side rail and keep it clear of Textastic's app chrome.
(function(){
  if (window.DDNavCentering) return;
  window.DDNavCentering = true;
  function isIosLike(){
    var userAgent = String(navigator.userAgent || '');
    var platform = String(navigator.platform || '');
    return /iPad|iPhone|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);
  }
  function isLocalPreview(){
    var protocol = String(window.location.protocol || '').toLowerCase();
    var hostname = String(window.location.hostname || '').toLowerCase();
    return protocol === 'file:'
      || protocol === 'textastic:'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1';
  }
  function hasTextasticOverride(){
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('ddx-host') === 'textastic' || params.get('textastic') === '1';
    } catch (_) {
      return false;
    }
  }
  function shouldOffsetForHost(){
    var identity = String(navigator.userAgent || '') + ' ' + String(navigator.vendor || '');
    return /\btextastic\b/i.test(identity)
      || hasTextasticOverride()
      || (isIosLike() && isLocalPreview());
  }
  function isTouchNav(){
    try {
      return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
    } catch (_) {
      return Number(navigator.maxTouchPoints || 0) > 0;
    }
  }
  function applyHostClass(){
    document.documentElement.classList.toggle('ddx-textastic-host', shouldOffsetForHost());
    document.documentElement.classList.toggle('ddx-touch-nav', isTouchNav());
  }
  function addNavCenteringCss(){
    if (document.getElementById('ddNavCenteringCss')) return;
    var style = document.createElement('style');
    style.id = 'ddNavCenteringCss';
    style.textContent = ':root{--ddx-nav-rail-width:46px;--ddx-nav-panel-width:164px;--ddx-nav-top:50%;--ddx-nav-y:-50%}.tabs.panel,nav.tabs{position:fixed!important;left:0!important;right:auto!important;top:var(--ddx-nav-top)!important;bottom:auto!important;width:var(--ddx-nav-panel-width)!important;max-width:min(76vw,var(--ddx-nav-panel-width))!important;max-height:min(420px,calc(100vh - 116px))!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:6px!important;padding:8px 8px 8px 6px!important;margin:0!important;border-radius:0 18px 18px 0!important;overflow:visible!important;transform:translate(calc(-100% + var(--ddx-nav-rail-width)),var(--ddx-nav-y))!important;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease!important;z-index:120!important;backdrop-filter:blur(14px)!important;box-shadow:12px 0 26px rgba(0,0,0,.18),inset 1px 0 0 rgba(255,220,150,.05)!important}.tabs.panel:hover,nav.tabs:hover,.tabs.panel:focus-within,nav.tabs:focus-within,.tabs.panel.ddx-nav-open,nav.tabs.ddx-nav-open{transform:translate(0,var(--ddx-nav-y))!important;box-shadow:18px 0 34px rgba(0,0,0,.34),inset 1px 0 0 rgba(255,220,150,.08)!important}.tabs.panel .tab,nav.tabs .tab{width:100%!important;min-height:36px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding:8px 10px!important;white-space:nowrap!important;overflow:hidden!important;text-align:left!important}.tabs.panel:not(:hover):not(:focus-within):not(.ddx-nav-open) .tab,nav.tabs:not(:hover):not(:focus-within):not(.ddx-nav-open) .tab{font-size:0!important;justify-content:center!important;padding:8px 4px!important}.tabs.panel:not(:hover):not(:focus-within):not(.ddx-nav-open) .tab::before,nav.tabs:not(:hover):not(:focus-within):not(.ddx-nav-open) .tab::before{content:attr(data-nav-short);font-size:12px;font-weight:900;letter-spacing:.08em;text-indent:0}.ddx-nav-toggle{display:flex;align-items:center;justify-content:center;width:30px;height:30px;min-height:30px;border-radius:10px;border:1px solid rgba(255,211,145,.28);background:rgba(255,180,80,.12);color:#f7d9a5;font:900 12px/1 var(--font,system-ui);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);cursor:pointer;padding:0}.tabs.panel.ddx-nav-open .ddx-nav-toggle,nav.tabs.ddx-nav-open .ddx-nav-toggle{background:rgba(255,180,80,.18);border-color:rgba(255,211,145,.40)}@media(hover:hover) and (pointer:fine){.ddx-nav-toggle{display:none}}@media(hover:none),(pointer:coarse){:root{--ddx-nav-rail-width:28px;--ddx-nav-top:calc(76px + var(--safe-top,0px));--ddx-nav-y:0}.tabs.panel,nav.tabs{padding:38px 7px 7px 5px!important;max-height:calc(100vh - 118px - var(--safe-bottom,0px))!important;transform:translateX(calc(-100% + var(--ddx-nav-rail-width)))!important}.tabs.panel.ddx-nav-open,nav.tabs.ddx-nav-open{transform:translateX(0)!important}.tabs.panel:hover,nav.tabs:hover{transform:translateX(calc(-100% + var(--ddx-nav-rail-width)))!important}.tabs.panel.ddx-nav-open:hover,nav.tabs.ddx-nav-open:hover{transform:translateX(0)!important}.ddx-nav-toggle{position:absolute;top:7px;right:3px;width:24px;height:24px;min-height:24px;border-radius:8px;font-size:10px;letter-spacing:-.05em;z-index:2}.tabs.panel:not(.ddx-nav-open) .tab,nav.tabs:not(.ddx-nav-open) .tab{display:none!important}.tabs.panel:not(.ddx-nav-open),nav.tabs:not(.ddx-nav-open){gap:0!important;min-height:38px!important;overflow:visible!important}.tabs.panel:not(.ddx-nav-open) .ddx-nav-toggle,nav.tabs:not(.ddx-nav-open) .ddx-nav-toggle{right:2px}}@media(max-width:520px){:root{--ddx-nav-rail-width:28px;--ddx-nav-panel-width:158px}.tabs.panel,nav.tabs{border-radius:0 16px 16px 0!important}.tabs.panel .tab,nav.tabs .tab{min-height:34px!important;padding:8px 9px!important}}@media(max-height:560px){.tabs.panel,nav.tabs{gap:4px!important;max-height:calc(100vh - 34px)!important}.tabs.panel .tab,nav.tabs .tab{min-height:31px!important;padding-top:6px!important;padding-bottom:6px!important}}';
    document.head.appendChild(style);
  }
  function navShortLabel(tab, index){
    var labels = ['T','R','G','A','J'];
    var text = String(tab.textContent || '').trim();
    return text ? text.charAt(0).toUpperCase() : (labels[index] || '?');
  }
  function setNavOpen(nav, open){
    if (!nav) return;
    nav.classList.toggle('ddx-nav-open', !!open);
    var toggle = nav.querySelector('.ddx-nav-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      toggle.textContent = '<-';
    }
  }
  function installSideNav(){
    var nav = document.querySelector('nav.tabs, .tabs.panel');
    if (!nav) return;
    nav.classList.add('ddx-side-nav');
    nav.setAttribute('aria-label', 'Guild Navigation Sidebar');
    Array.prototype.forEach.call(nav.querySelectorAll('.tab'), function(tab, index){
      if (!tab.getAttribute('data-nav-short')) tab.setAttribute('data-nav-short', navShortLabel(tab, index));
    });
    if (!nav.querySelector('.ddx-nav-toggle')) {
      var toggle = document.createElement('button');
      toggle.className = 'ddx-nav-toggle';
      toggle.type = 'button';
      toggle.textContent = '<-';
      toggle.setAttribute('aria-label', 'Open navigation');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        setNavOpen(nav, !nav.classList.contains('ddx-nav-open'));
      });
      nav.insertBefore(toggle, nav.firstChild);
    }
    Array.prototype.forEach.call(nav.querySelectorAll('.tab'), function(tab){
      if (tab.__ddxSideNavBound) return;
      tab.__ddxSideNavBound = true;
      tab.addEventListener('click', function(){
        if (isTouchNav()) window.setTimeout(function(){ setNavOpen(nav, false); }, 80);
      });
    });
    if (!nav.__ddxSideNavOutsideBound) {
      nav.__ddxSideNavOutsideBound = true;
      document.addEventListener('click', function(event){
        if (!isTouchNav() || !nav.classList.contains('ddx-nav-open')) return;
        if (nav.contains(event.target)) return;
        setNavOpen(nav, false);
      }, true);
      document.addEventListener('keydown', function(event){
        if (event.key === 'Escape') setNavOpen(nav, false);
      });
    }
  }
  function addHeaderCrestCss(){
    if (document.getElementById('ddHeaderCrestCss')) return;
    var style = document.createElement('style');
    style.id = 'ddHeaderCrestCss';
    style.textContent = '.app-title-lockup{display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 auto}.app-crest{width:42px;height:42px;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(255,210,120,.22))}.app-crest[hidden]{display:none!important}.app-title-lockup .ddx-lore-kicker{min-width:0;overflow-wrap:anywhere}@media(max-width:430px){.app-title-lockup{gap:8px}.app-crest{width:34px;height:34px}}@media(max-width:360px){.app-crest{display:none!important}}';
    document.head.appendChild(style);
  }
  function installHeaderCrest(){
    var slot = document.querySelector('.ddx-header-title-slot');
    var title = document.getElementById('buildTag');
    if (!slot || !title || slot.querySelector('.app-crest')) return;
    slot.classList.add('app-title-lockup');
    var crest = document.createElement('img');
    crest.className = 'app-crest';
    crest.src = './assets/img/ui/dungeondex-crest.svg';
    crest.alt = '';
    crest.setAttribute('aria-hidden', 'true');
    crest.decoding = 'async';
    crest.loading = 'eager';
    crest.addEventListener('error', function(){
      crest.hidden = true;
      crest.dataset.assetStatus = 'missing';
    }, { once: true });
    slot.insertBefore(crest, title);
  }
  function applyHeaderCrest(){
    addHeaderCrestCss();
    installHeaderCrest();
  }
  function addTownGateCss(){
    if (document.getElementById('ddTownGateCss')) return;
    var style = document.createElement('style');
    style.id = 'ddTownGateCss';
    style.textContent = '.ddx-record-title.town-gate-lockup{position:relative;min-height:74px;padding-right:112px}.town-gate-art{position:absolute;top:0;right:0;width:96px;height:74px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 12px rgba(255,170,72,.18));opacity:.92}.town-gate-art[hidden]{display:none!important}@media(max-width:700px){.ddx-record-title.town-gate-lockup{min-height:64px;padding-right:88px}.town-gate-art{width:78px;height:62px}}@media(max-width:430px){.ddx-record-title.town-gate-lockup{min-height:0;padding-right:0}.town-gate-art{display:none!important}}';
    document.head.appendChild(style);
  }
  function installTownGateArt(){
    var slot = document.querySelector('#screen-town .ddx-record-title');
    var line = document.getElementById('districtLine');
    if (!slot || !line || slot.querySelector('.town-gate-art')) return;
    slot.classList.add('town-gate-lockup');
    var gate = document.createElement('img');
    gate.className = 'town-gate-art';
    gate.src = './assets/img/ui/hollow-stair-gate.svg';
    gate.alt = '';
    gate.setAttribute('aria-hidden', 'true');
    gate.decoding = 'async';
    gate.loading = 'lazy';
    gate.addEventListener('error', function(){
      gate.hidden = true;
      gate.dataset.assetStatus = 'missing';
      slot.classList.remove('town-gate-lockup');
    }, { once: true });
    line.insertAdjacentElement('afterend', gate);
  }
  function applyTownGateArt(){
    addTownGateCss();
    installTownGateArt();
  }
  function applySideNav(){
    applyHostClass();
    addNavCenteringCss();
    installSideNav();
  }
  applySideNav();
  applyHeaderCrest();
  applyTownGateArt();
  window.addEventListener('DOMContentLoaded', applySideNav);
  window.addEventListener('DOMContentLoaded', applyHeaderCrest);
  window.addEventListener('DOMContentLoaded', applyTownGateArt);
  window.addEventListener('load', applySideNav);
  window.addEventListener('load', applyHeaderCrest);
  window.addEventListener('load', applyTownGateArt);
  window.setTimeout(applySideNav, 100);
  window.setTimeout(applyHeaderCrest, 100);
  window.setTimeout(applyTownGateArt, 100);
  window.setTimeout(applySideNav, 500);
  window.setTimeout(applyHeaderCrest, 500);
  window.setTimeout(applyTownGateArt, 500);
})();