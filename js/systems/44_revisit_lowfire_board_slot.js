'use strict';

// v1.25.2 Revisit Lowfire Board placement bridge
// Stable render hook: no MutationObserver, no repeated sweeps, no gameplay changes.
// Moves the already-rendered Revisit panel into the Lowfire Board flow directly
// above the Lowfire Elite Board.
(function(){
	if (window.__dungeondexRevisitAboveEliteBoardSlot) return;
	window.__dungeondexRevisitAboveEliteBoardSlot = true;

	function firstElementFromMarkup(html){
		if (!html) return null;
		const holder = document.createElement('div');
		holder.innerHTML = html;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function currentRevisitPanel(){
		const headerSlot = document.getElementById('revisitFoundationSlot');
		const headerPanel = headerSlot ? headerSlot.querySelector('#revisitPanel') : null;
		const boardPanel = document.querySelector('#questPanel .town-board-shell > #revisitPanel');
		if (headerPanel) return headerPanel;
		if (boardPanel) return boardPanel;
		if (typeof window.earlierDungeonRevisitMarkup === 'function') {
			return firstElementFromMarkup(window.earlierDungeonRevisitMarkup());
		}
		return null;
	}

	function clearOriginalHeaderSlot(){
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (headerSlot) headerSlot.innerHTML = '';
	}

	function removeOldPairWrapper(){
		const oldPair = document.getElementById('lowfireEliteRevisitSourcePair');
		if (!oldPair) return;
		const boardShell = document.querySelector('#questPanel .town-board-shell');
		const eliteBoard = oldPair.querySelector('.elite-contract-board');
		if (boardShell && eliteBoard) boardShell.appendChild(eliteBoard);
		oldPair.remove();
	}

	function placeRevisitAboveEliteBoard(){
		const boardShell = document.querySelector('#questPanel .town-board-shell');
		if (!boardShell) return false;

		removeOldPairWrapper();

		const eliteBoard = boardShell.querySelector('.elite-contract-board');
		const panel = currentRevisitPanel();
		if (!eliteBoard || !panel) {
			clearOriginalHeaderSlot();
			return false;
		}

		panel.classList.add('lowfire-board-revisit-slot');
		if (panel.parentElement !== boardShell || panel.nextElementSibling !== eliteBoard) {
			boardShell.insertBefore(panel, eliteBoard);
		}
		clearOriginalHeaderSlot();
		return true;
	}

	function installRenderHook(){
		if (typeof window.renderTown !== 'function' || window.renderTown.__ddRevisitAboveEliteWrapped) return false;
		const originalRenderTown = window.renderTown;
		window.renderTown = function ddRenderTownWithRevisitAboveElite(){
			const result = originalRenderTown.apply(this, arguments);
			placeRevisitAboveEliteBoard();
			return result;
		};
		window.renderTown.__ddRevisitAboveEliteWrapped = true;
		return true;
	}

	function install(){
		installRenderHook();
		placeRevisitAboveEliteBoard();
	}

	install();
	window.addEventListener('DOMContentLoaded', install, { passive: true });
	window.addEventListener('load', install, { passive: true });
})();
