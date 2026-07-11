'use strict';

// v1.25.2 Revisit source-render empty shell.
// Revisit placement is owned by source renderers; this module only gives
// earlierDungeonRevisitMarkup() a stable locked-state fallback when no lane
// is currently visible. It does not move DOM nodes or install timing loops.
(function(){
	function emptyRevisitShellMarkup(){
		return `
			<section class="panel revisit-foundation-panel" id="revisitPanel" aria-label="Revisit panel">
				<div class="card-head">
					<div>
						<h2>Revisit</h2>
						<p>Short memory lanes tied to DungeonDex history.</p>
					</div>
				</div>
				<article class="quest-card revisit-lane-card ready revisit-empty-state-card">
					<div class="quest-topline">
						<strong>No Revisit lane ready yet</strong>
						<span class="small muted">Locked</span>
					</div>
					<p class="small">Defeat a boss, retire notable gear, or record rival history to unlock a memory lane.</p>
					<p class="small muted">This is a town memory board only. No gameplay, rewards, combat, debt, or Talent values change here.</p>
					<div class="small muted">Next: keep playing the main dungeon loop until a Revisit source exists.</div>
					<div class="inline-actions revisit-echo-actions">
						<button class="ghost" type="button" disabled aria-disabled="true">Revisit Locked</button>
					</div>
				</article>
			</section>`;
	}

	const original = typeof earlierDungeonRevisitMarkup === 'function'
		? earlierDungeonRevisitMarkup
		: (typeof window.earlierDungeonRevisitMarkup === 'function' ? window.earlierDungeonRevisitMarkup : null);

	if (!original || original.__ddRevisitStableEmptyShellWrapped) {
		window.__dungeondexRevisitSourceRendered = true;
		window.__dungeondexRevisitStableEmptyShell = true;
		return;
	}

	const wrapped = function(){
		const markup = original.apply(this, arguments);
		return String(markup || '').trim() ? markup : emptyRevisitShellMarkup();
	};
	wrapped.__ddRevisitStableEmptyShellWrapped = true;

	try { earlierDungeonRevisitMarkup = wrapped; } catch(_) {}
	window.earlierDungeonRevisitMarkup = wrapped;
	window.__dungeondexRevisitSourceRendered = true;
	window.__dungeondexRevisitStableEmptyShell = true;
})();
