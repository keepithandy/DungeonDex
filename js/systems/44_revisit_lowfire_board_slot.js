'use strict';

// v1.25.2 Revisit Lowfire Board placement bridge
// Stable render hook: no MutationObserver, no repeated sweeps, no gameplay changes.
// Places the live Revisit panel inside the Lowfire Board flow directly above
// the Lowfire Elite Board when both surfaces are available.
(function(){
	if (window.__dungeondexRevisitAboveEliteBoardSlotSafe) return;
	window.__dungeondexRevisitAboveEliteBoardSlotSafe = true;

	function firstElementFromMarkup(html){
		if (!html) return null;
		const holder = document.createElement('div');
		holder.innerHTML = html;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function currentRevisitPanel(){
		const existingPanel = document.getElementById('revisitPanel');
		if (existingPanel) return existingPanel;
		if (typeof window.earlierDungeonRevisitMarkup === 'function') {
			return firstElementFromMarkup(window.earlierDungeonRevisitMarkup());
		}
		return null;
	}

	function clearOriginalHeaderSlot(panel){
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (!headerSlot) return;
		if (panel && headerSlot.contains(panel)) return;
		headerSlot.innerHTML = '';
	}

	function placeRevisitAboveEliteBoard(){
		const boardShell = document.querySelector('#questPanel .town-board-shell');
		const eliteBoard = boardShell ? boardShell.querySelector('.elite-contract-board') : null;
		const panel = currentRevisitPanel();

		if (!boardShell || !eliteBoard || !panel) return false;

		const oldPair = document.getElementById('lowfireEliteRevisitSourcePair');
		if (oldPair) {
			const pairedEliteBoard = oldPair.querySelector('.elite-contract-board');
			if (pairedEliteBoard && pairedEliteBoard !== eliteBoard) boardShell.appendChild(pairedEliteBoard);
			oldPair.remove();
		}

		panel.classList.add('lowfire-board-revisit-slot');
		if (panel.parentElement !== boardShell || panel.nextElementSibling !== eliteBoard) {
			boardShell.insertBefore(panel, eliteBoard);
		}
		clearOriginalHeaderSlot(panel);
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

	function scheduleInstallAttempts(){
		install();
		window.requestAnimationFrame ? window.requestAnimationFrame(install) : window.setTimeout(install, 0);
		window.setTimeout(install, 80);
		window.setTimeout(install, 240);
		window.setTimeout(install, 600);
	}

	scheduleInstallAttempts();
	window.addEventListener('DOMContentLoaded', scheduleInstallAttempts, { passive: true });
	window.addEventListener('load', scheduleInstallAttempts, { passive: true });
})();
