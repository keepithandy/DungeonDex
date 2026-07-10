// Center bottom nav on wide screens and keep it clear of Textastic's app chrome.
(function(){
  if (window.DDNavCentering) return;
  window.DDNavCentering = true;
  function applyHostClass(){
    var userAgent = String(navigator.userAgent || '') + ' ' + String(navigator.vendor || '');
    document.documentElement.classList.toggle('ddx-textastic-host', /\btextastic\b/i.test(userAgent));
  }
  function addNavCenteringCss(){
    if (document.getElementById('ddNavCenteringCss')) return;
    var style = document.createElement('style');
    style.id = 'ddNavCenteringCss';
    style.textContent = '.tabs.panel,nav.tabs{left:50%!important;right:auto!important;width:min(860px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;transform:translateX(-50%)!important;margin-left:0!important;margin-right:0!important}.app-shell.run-focus .tabs{left:50%!important;right:auto!important;transform:translateX(-50%)!important}:root.ddx-textastic-host .tabs.panel,:root.ddx-textastic-host nav.tabs{bottom:calc(56px + var(--safe-bottom,0px))!important}:root.ddx-textastic-host .app-shell{padding-bottom:calc(174px + var(--safe-bottom,0px));scroll-padding-bottom:calc(206px + var(--safe-bottom,0px))}@media(max-width:520px){.tabs.panel,nav.tabs{width:100vw!important;max-width:100vw!important;left:50%!important;transform:translateX(-50%)!important}}';
    document.head.appendChild(style);
  }
  applyHostClass();
  addNavCenteringCss();
  window.addEventListener('DOMContentLoaded', applyHostClass);
  window.addEventListener('DOMContentLoaded', addNavCenteringCss);
  window.addEventListener('load', applyHostClass);
  window.addEventListener('load', addNavCenteringCss);
  window.setTimeout(applyHostClass, 100);
  window.setTimeout(addNavCenteringCss, 100);
  window.setTimeout(applyHostClass, 500);
  window.setTimeout(addNavCenteringCss, 500);
})();
