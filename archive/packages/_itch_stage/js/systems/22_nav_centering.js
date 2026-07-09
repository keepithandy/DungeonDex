// DungeonDex v1.4.9a - Center bottom nav on wide screens.
(function(){
  if (window.DDNavCentering) return;
  window.DDNavCentering = true;
  function addNavCenteringCss(){
    if (document.getElementById('ddNavCenteringCss')) return;
    var style = document.createElement('style');
    style.id = 'ddNavCenteringCss';
    style.textContent = '.tabs.panel, nav.tabs{left:50%!important;right:auto!important;width:min(860px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;transform:translateX(-50%)!important;margin-left:0!important;margin-right:0!important}.app-shell.run-focus .tabs{left:50%!important;right:auto!important;transform:translateX(-50%)!important}@media(max-width:520px){.tabs.panel,nav.tabs{width:100vw!important;max-width:100vw!important;left:50%!important;transform:translateX(-50%)!important}}';
    document.head.appendChild(style);
  }
  addNavCenteringCss();
  window.addEventListener('DOMContentLoaded', addNavCenteringCss);
  window.addEventListener('load', addNavCenteringCss);
  window.setTimeout(addNavCenteringCss, 100);
  window.setTimeout(addNavCenteringCss, 500);
})();
