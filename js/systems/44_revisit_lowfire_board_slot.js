'use strict';

// v1.25.2 Revisit Lowfire Board source-slot bridge
// Stable render hook: no MutationObserver, no repeated sweeps, no gameplay changes.
// Keeps Revisit lane behavior owned by earlierDungeonRevisitMarkup(), then places the
// rendered panel beside the Elite Contract board after each normal town render.
(function(){
	if (window.__dungeondexRevisitLowfireBoardSourceSlot) return;
	window.__dungeondexRevisitLowfireBoardSourceSlot = true;

	const STYLE_ID = 'lowfireRevisitSourceSlotStyle';
	const PAIR_ID = 'lowfireEliteRevisitSourcePair';
	const CONTRACTS_COLUMN_ID = 'lowfireEliteContractsSourceColumn';
	const REVISIT_COLUMN_ID = 'lowfireRevisitSourceColumn';

	function ensureStyles(){
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'.lowfire-elite-revisit-source-pair {',
			'  display: grid;',
			'  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);',
			'  gap: 10px;',
			'  align-items: start;',
			'  margin-top: 10px;',
			'}',
			'.lowfire-elite-contracts-source-column, .lowfire-revisit-source-column {',
			'  min-width: 0;',
			'  display: grid;',
			'  gap: 8px;',
			'  align-content: start;',
			'}',
			'.lowfire-revisit-source-column .revisit-foundation-panel {',
			'  margin: 0;',
			'}',
			'@media (max-width: 760px) {',
			'  .lowfire-elite-revisit-source-pair { grid-template-columns: 1fr; }',
			'  .lowfire-revisit-source-column { order: -1; }',
			'}'
		].join('\n');
		(document.head || document.documentElement).appendChild(style);
	}

	function firstElementFromMarkup(html){
		if (!html) return null;
		const holder = document.createElement('div');
		holder.innerHTML = html;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function currentRevisitPanel(){
		const headerSlot = document.getElementById('revisitFoundationSlot');
		const boardSlotPanel = document.querySelector('#' + REVISIT_COLUMN_ID + ' #revisitPanel');
		const headerPanel = headerSlot ? headerSlot.querySelector('#revisitPanel') : null;
		if (headerPanel) return headerPanel;
		if (boardSlotPanel) return boardSlotPanel;
		if (typeof window.earlierDungeonRevisitMarkup === 'function') {
			return firstElementFromMarkup(window.earlierDungeonRevisitMarkup());
		}
		return null;
	}

	function clearOriginalHeaderSlot(){
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (headerSlot) headerSlot.innerHTML = '';
	}

	function placeRevisitBesideEliteBoard(){
		const boardShell = document.querySelector('#questPanel .town-board-shell');
		if (!boardShell) return false;

		const eliteBoard = boardShell.querySelector('.elite-contract-board');
		const panel = currentRevisitPanel();
		if (!eliteBoard || !panel) {
			clearOriginalHeaderSlot();
			return false;
		}

		ensureStyles();

		let pair = document.getElementById(PAIR_ID);
		if (!pair || pair.parentElement !== boardShell) {
			pair = document.createElement('div');
			pair.id = PAIR_ID;
			pair.className = 'lowfire-elite-revisit-source-pair';
			boardShell.insertBefore(pair, eliteBoard);
		}

		let contractsColumn = document.getElementById(CONTRACTS_COLUMN_ID);
		if (!contractsColumn || contractsColumn.parentElement !== pair) {
			contractsColumn = document.createElement('div');
			contractsColumn.id = CONTRACTS_COLUMN_ID;
			contractsColumn.className = 'lowfire-elite-contracts-source-column';
			pair.appendChild(contractsColumn);
		}

		let revisitColumn = document.getElementById(REVISIT_COLUMN_ID);
		if (!revisitColumn || revisitColumn.parentElement !== pair) {
			revisitColumn = document.createElement('div');
			revisitColumn.id = REVISIT_COLUMN_ID;
			revisitColumn.className = 'lowfire-revisit-source-column';
			pair.appendChild(revisitColumn);
		}

		if (eliteBoard.parentElement !== contractsColumn) contractsColumn.appendChild(eliteBoard);
		if (panel.parentElement !== revisitColumn) revisitColumn.appendChild(panel);
		clearOriginalHeaderSlot();
		return true;
	}

	function installRenderHook(){
		if (typeof window.renderTown !== 'function' || window.renderTown.__ddRevisitSourceSlotWrapped) return false;
		const originalRenderTown = window.renderTown;
		window.renderTown = function ddRenderTownWithRevisitSourceSlot(){
			const result = originalRenderTown.apply(this, arguments);
			placeRevisitBesideEliteBoard();
			return result;
		};
		window.renderTown.__ddRevisitSourceSlotWrapped = true;
		return true;
	}

	function install(){
		installRenderHook();
		placeRevisitBesideEliteBoard();
	}

	install();
	window.addEventListener('DOMContentLoaded', install, { passive: true });
	window.addEventListener('load', install, { passive: true });
})();
