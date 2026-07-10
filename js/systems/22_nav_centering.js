// Center bottom nav on wide screens and keep it clear of Textastic's app chrome.
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
  function applyHostClass(){
    document.documentElement.classList.toggle('ddx-textastic-host', shouldOffsetForHost());
  }
  function addNavCenteringCss(){
    if (document.getElementById('ddNavCenteringCss')) return;
    var style = document.createElement('style');
    style.id = 'ddNavCenteringCss';
    style.textContent = '.tabs.panel,nav.tabs{left:50%!important;right:auto!important;width:min(860px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;transform:translateX(-50%)!important;margin-left:0!important;margin-right:0!important}.app-shell.run-focus .tabs{left:50%!important;right:auto!important;transform:translateX(-50%)!important}:root.ddx-textastic-host .tabs.panel,:root.ddx-textastic-host nav.tabs{bottom:calc(80px + var(--safe-bottom,0px))!important}:root.ddx-textastic-host .app-shell{padding-bottom:calc(198px + var(--safe-bottom,0px));scroll-padding-bottom:calc(230px + var(--safe-bottom,0px))}@media(max-width:520px){.tabs.panel,nav.tabs{width:100vw!important;max-width:100vw!important;left:50%!important;transform:translateX(-50%)!important}}';
    document.head.appendChild(style);
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
    crest.src = './assets/img/ui/dungeondex-crest.png';
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
  applyHostClass();
  addNavCenteringCss();
  applyHeaderCrest();
  window.addEventListener('DOMContentLoaded', applyHostClass);
  window.addEventListener('DOMContentLoaded', addNavCenteringCss);
  window.addEventListener('DOMContentLoaded', applyHeaderCrest);
  window.addEventListener('load', applyHostClass);
  window.addEventListener('load', addNavCenteringCss);
  window.addEventListener('load', applyHeaderCrest);
  window.setTimeout(applyHostClass, 100);
  window.setTimeout(addNavCenteringCss, 100);
  window.setTimeout(applyHeaderCrest, 100);
  window.setTimeout(applyHostClass, 500);
  window.setTimeout(addNavCenteringCss, 500);
  window.setTimeout(applyHeaderCrest, 500);
})();
