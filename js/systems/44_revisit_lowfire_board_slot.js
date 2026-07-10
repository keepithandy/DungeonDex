'use strict';

// v1.25.1 Revisit relocation stability hotfix
// Disabled after mobile/Textastic testing showed the post-render DOM relocation loop
// caused sluggish/unresponsive buttons. The canonical town renderer still owns the
// Revisit panel in its original slot until a source-render placement patch replaces
// this helper safely.
(function(){
	window.__dungeondexRevisitLowfireBoardSlotDisabled = true;
})();
