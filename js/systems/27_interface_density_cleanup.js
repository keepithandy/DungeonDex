'use strict';

// Emergency inert interface cleanup shell.
// The previous cleanup layer interfered with screen rendering on mobile/cached builds.
// Keep this file load-safe while preserving the existing script tag until the next full cleanup pass.
(function(){
  window.DDInterfaceDensityCleanup = true;
})();
