'use strict';

// v1.25.1 Revisit Lowfire Board Slot
// Presentation-only relocation: keep Revisit lane behavior unchanged while placing
// the rendered Revisit panel inside the Lowfire Board section after each town render.
(function(){
	const SLOT_ID = 'lowfireRevisitBoardSlot';
	let renderTownPatched = false;

	function townBoardShell() {
		return document.querySelector('#questPanel .town-board-shell');
	}

	function ensureBoardSlot(shell) {
		let slot = document.getElementById(SLOT_ID);
		if (!slot) {
			slot = document.createElement('div');
			slot.id = SLOT_ID;
			slot.className = 'lowfire-revisit-board-slot';
		}

		if (slot.parentElement !== shell) {
			const objectiveLedger = shell.querySelector('.warden-ledger.town-board-ledger');
			shell.insertBefore(slot, objectiveLedger || shell.children[1] || null);
		}

		return slot;
	}

	function moveRevisitPanelIntoLowfireBoard() {
		const panel = document.getElementById('revisitPanel');
		const shell = townBoardShell();
		if (!panel || !shell) return false;

		const slot = ensureBoardSlot(shell);
		if (panel.parentElement !== slot) {
			slot.appendChild(panel);
		}
		return true;
	}

	function scheduleMove() {
		if (typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(moveRevisitPanelIntoLowfireBoard);
		} else {
			window.setTimeout(moveRevisitPanelIntoLowfireBoard, 0);
		}
		window.setTimeout(moveRevisitPanelIntoLowfireBoard, 60);
	}

	function patchRenderTown() {
		if (renderTownPatched) return;
		const original = window.renderTown || globalThis.renderTown;
		if (typeof original !== 'function' || original.__lowfireRevisitBoardSlot) return;

		const wrapped = function(){
			const result = original.apply(this, arguments);
			scheduleMove();
			return result;
		};
		wrapped.__lowfireRevisitBoardSlot = true;
		window.renderTown = wrapped;
		renderTownPatched = true;
	}

	patchRenderTown();
	window.addEventListener('DOMContentLoaded', function(){ patchRenderTown(); scheduleMove(); }, { passive: true });
	window.addEventListener('load', function(){ patchRenderTown(); scheduleMove(); }, { passive: true });

	const townScreen = document.getElementById('screen-town');
	if (townScreen && 'MutationObserver' in window) {
		const observer = new MutationObserver(scheduleMove);
		observer.observe(townScreen, { childList: true, subtree: true });
	}
})();
