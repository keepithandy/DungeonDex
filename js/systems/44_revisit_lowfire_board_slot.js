'use strict';

// v1.25.1 Revisit Lowfire Elite Board Anchor
// Presentation-only relocation: keep Revisit lane behavior unchanged while placing
// the rendered Revisit panel inside the Elite Board body beside the contract cards.
(function(){
	const SLOT_ID = 'lowfireRevisitBoardSlot';
	const BODY_ID = 'lowfireEliteRevisitBody';
	const CONTRACTS_COLUMN_ID = 'lowfireEliteContractsColumn';
	const STYLE_ID = 'lowfireRevisitBoardPairStyle';
	const PLACEHOLDER_ID = 'lowfireRevisitPlaceholder';
	let sweepCount = 0;

	function townBoardShell() {
		return document.querySelector('#questPanel .town-board-shell');
	}

	function directChildWithClass(parent, className) {
		if (!parent) return null;
		return Array.prototype.find.call(parent.children || [], child => child.classList && child.classList.contains(className)) || null;
	}

	function ensurePairStyle() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'.lowfire-elite-revisit-body {',
			'  display: grid;',
			'  grid-template-columns: minmax(0, 1.12fr) minmax(250px, 0.88fr);',
			'  gap: 10px;',
			'  align-items: start;',
			'}',
			'.lowfire-elite-contracts-column,',
			'.lowfire-revisit-board-slot {',
			'  min-width: 0;',
			'  display: grid;',
			'  gap: 8px;',
			'  align-content: start;',
			'}',
			'.lowfire-elite-contracts-column .elite-contract-list {',
			'  display: contents;',
			'}',
			'.lowfire-revisit-board-slot .revisit-foundation-panel,',
			'.lowfire-revisit-board-slot .lowfire-revisit-placeholder {',
			'  margin: 0;',
			'  height: auto;',
			'}',
			'.lowfire-revisit-placeholder {',
			'  display: grid;',
			'  gap: 8px;',
			'  border-style: dashed;',
			'}',
			'.lowfire-revisit-placeholder .pill { justify-self: start; }',
			'@media (max-width: 760px) {',
			'  .lowfire-elite-revisit-body { grid-template-columns: 1fr; }',
			'  .lowfire-revisit-board-slot { order: -1; }',
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

	function ensureContractBody(eliteBoard, slot) {
		let body = document.getElementById(BODY_ID);
		if (!body) {
			body = document.createElement('div');
			body.id = BODY_ID;
			body.className = 'lowfire-elite-revisit-body';
		}

		let contractsColumn = document.getElementById(CONTRACTS_COLUMN_ID);
		if (!contractsColumn) {
			contractsColumn = document.createElement('div');
			contractsColumn.id = CONTRACTS_COLUMN_ID;
			contractsColumn.className = 'lowfire-elite-contracts-column';
		}

		const head = directChildWithClass(eliteBoard, 'elite-contract-head');
		if (body.parentElement !== eliteBoard) {
			eliteBoard.insertBefore(body, head ? head.nextSibling : eliteBoard.firstChild);
		}

		Array.prototype.slice.call(eliteBoard.children || []).forEach(child => {
			if (child === head || child === body) return;
			contractsColumn.appendChild(child);
		});

		if (contractsColumn.parentElement !== body) {
			body.insertBefore(contractsColumn, body.firstChild);
		}
		if (slot.parentElement !== body) {
			body.appendChild(slot);
		}
		return body;
	}

	function placeholderMarkup() {
		return [
			'<section class="panel lowfire-revisit-placeholder" id="' + PLACEHOLDER_ID + '" aria-label="Revisit lanes">',
			'  <div class="card-head">',
			'    <div>',
			'      <h2>Revisit</h2>',
			'      <p>Memory lanes will appear here beside Elite Contracts.</p>',
			'    </div>',
			'  </div>',
			'  <span class="pill">No lane ready</span>',
			'  <p class="small muted">Defeat bosses, retire gear, or build named rival history to surface safe Revisit lanes here.</p>',
			'</section>'
		].join('');
	}

	function renderPlaceholderIfNeeded(slot, panel) {
		if (panel) {
			const existing = document.getElementById(PLACEHOLDER_ID);
			if (existing) existing.remove();
			return;
		}
		if (!document.getElementById(PLACEHOLDER_ID)) {
			slot.innerHTML = placeholderMarkup();
		}
	}

	function generatedRevisitPanel() {
		const helper = window.earlierDungeonRevisitMarkup || globalThis.earlierDungeonRevisitMarkup;
		if (typeof helper !== 'function') return null;
		const html = helper();
		if (!html) return null;
		const holder = document.createElement('div');
		holder.innerHTML = html;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function clearOriginalHeaderSlot(panel) {
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (!headerSlot) return;
		if (panel && headerSlot.contains(panel)) return;
		headerSlot.innerHTML = '';
	}

	function moveRevisitPanelIntoLowfireBoard() {
		const shell = townBoardShell();
		if (!shell) return false;

		const eliteBoard = shell.querySelector('.elite-contract-board');
		if (!eliteBoard) return false;

		ensurePairStyle();
		const slot = ensureBoardSlot();
		ensureContractBody(eliteBoard, slot);

		let panel = document.getElementById('revisitPanel');
		if (!panel) panel = generatedRevisitPanel();
		renderPlaceholderIfNeeded(slot, panel);

		if (panel && panel.parentElement !== slot) {
			slot.innerHTML = '';
			slot.appendChild(panel);
		}

		clearOriginalHeaderSlot(panel);
		return true;
	}

	function scheduleMove() {
		if (typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(moveRevisitPanelIntoLowfireBoard);
		} else {
			window.setTimeout(moveRevisitPanelIntoLowfireBoard, 0);
		}
		window.setTimeout(moveRevisitPanelIntoLowfireBoard, 60);
		window.setTimeout(moveRevisitPanelIntoLowfireBoard, 180);
	}

	function sweepMove() {
		scheduleMove();
		sweepCount += 1;
		if (sweepCount < 30) window.setTimeout(sweepMove, 200);
	}

	window.addEventListener('DOMContentLoaded', sweepMove, { passive: true });
	window.addEventListener('load', sweepMove, { passive: true });
	sweepMove();

	if ('MutationObserver' in window) {
		const observer = new MutationObserver(scheduleMove);
		observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
	}
})();
