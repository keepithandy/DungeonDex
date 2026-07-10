'use strict';

// v1.25.1 Revisit Lowfire Board Slot
// Presentation-only relocation: keep Revisit lane behavior unchanged while placing
// the rendered Revisit panel beside the Elite Contracts board after each town render.
(function(){
	const SLOT_ID = 'lowfireRevisitBoardSlot';
	const PAIR_ID = 'lowfireBoardRevisitPair';
	const STYLE_ID = 'lowfireRevisitBoardPairStyle';
	let renderTownPatched = false;

	function townBoardShell() {
		return document.querySelector('#questPanel .town-board-shell');
	}

	function ensurePairStyle() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'.lowfire-board-revisit-pair {',
			'  display: grid;',
			'  grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);',
			'  gap: 10px;',
			'  align-items: start;',
			'}',
			'.lowfire-board-revisit-pair > .elite-contract-board,',
			'.lowfire-board-revisit-pair > .lowfire-revisit-board-slot {',
			'  min-width: 0;',
			'}',
			'.lowfire-board-revisit-pair .revisit-foundation-panel {',
			'  height: 100%;',
			'  margin: 0;',
			'}',
			'@media (max-width: 760px) {',
			'  .lowfire-board-revisit-pair { grid-template-columns: 1fr; }',
			'}'
		].join('\n');
		document.head.appendChild(style);
	}

	function ensureBoardSlot() {
		let slot = document.getElementById(SLOT_ID);
		if (!slot) {
			slot = document.createElement('div');
			slot.id = SLOT_ID;
			slot.className = 'lowfire-revisit-board-slot';
		}
		return slot;
	}

	function ensureBoardPair(shell, eliteBoard, slot) {
		let pair = document.getElementById(PAIR_ID);
		if (!pair) {
			pair = document.createElement('div');
			pair.id = PAIR_ID;
			pair.className = 'lowfire-board-revisit-pair';
		}

		if (pair.parentElement !== shell) {
			shell.insertBefore(pair, eliteBoard);
		}

		if (eliteBoard.parentElement !== pair) {
			pair.appendChild(eliteBoard);
		}
		if (slot.parentElement !== pair) {
			pair.appendChild(slot);
		}

		return pair;
	}

	function moveRevisitPanelIntoLowfireBoard() {
		const panel = document.getElementById('revisitPanel');
		const shell = townBoardShell();
		if (!panel || !shell) return false;

		const eliteBoard = shell.querySelector('.elite-contract-board');
		if (!eliteBoard) return false;

		ensurePairStyle();
		const slot = ensureBoardSlot();
		ensureBoardPair(shell, eliteBoard, slot);

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
