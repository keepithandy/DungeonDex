'use strict';

// v1.25.1 Revisit Lowfire Elite Board Anchor
// Presentation-only relocation: keep Revisit lane behavior unchanged while placing
// the rendered Revisit panel inside the Elite Board body beside the contract cards.
(function(){
	const BODY_ID = 'lowfireEliteRevisitBody';
	const CONTRACTS_COLUMN_ID = 'lowfireEliteContractsColumn';
	const SLOT_ID = 'lowfireRevisitBoardSlot';
	const STYLE_ID = 'lowfireRevisitBoardPairStyle';
	const PLACEHOLDER_ID = 'lowfireRevisitPlaceholder';
	let attempts = 0;

	function ensureStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'.lowfire-elite-revisit-body {',
			'  display: grid;',
			'  grid-template-columns: minmax(0, 1.1fr) minmax(250px, 0.9fr);',
			'  gap: 10px;',
			'  align-items: start;',
			'}',
			'.lowfire-elite-contracts-column, .lowfire-revisit-board-slot {',
			'  min-width: 0;',
			'  display: grid;',
			'  gap: 8px;',
			'  align-content: start;',
			'}',
			'.lowfire-elite-contracts-column .elite-contract-list { display: contents; }',
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
		(document.head || document.documentElement).appendChild(style);
	}

	function directChildWithClass(parent, className) {
		if (!parent) return null;
		return Array.prototype.find.call(parent.children || [], child => child.classList && child.classList.contains(className)) || null;
	}

	function ensureBoardBody(eliteBoard) {
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

		let revisitSlot = document.getElementById(SLOT_ID);
		if (!revisitSlot) {
			revisitSlot = document.createElement('div');
			revisitSlot.id = SLOT_ID;
			revisitSlot.className = 'lowfire-revisit-board-slot';
		}

		const head = directChildWithClass(eliteBoard, 'elite-contract-head');
		if (body.parentElement !== eliteBoard) {
			eliteBoard.insertBefore(body, head ? head.nextSibling : eliteBoard.firstChild);
		}

		Array.prototype.slice.call(eliteBoard.children || []).forEach(child => {
			if (child === head || child === body) return;
			contractsColumn.appendChild(child);
		});

		if (contractsColumn.parentElement !== body) body.insertBefore(contractsColumn, body.firstChild);
		if (revisitSlot.parentElement !== body) body.appendChild(revisitSlot);
		return revisitSlot;
	}

	function placeholderPanel() {
		const wrapper = document.createElement('section');
		wrapper.className = 'panel lowfire-revisit-placeholder';
		wrapper.id = PLACEHOLDER_ID;
		wrapper.setAttribute('aria-label', 'Revisit lanes');
		wrapper.innerHTML = [
			'<div class="card-head"><div><h2>Revisit</h2><p>Memory lanes live here beside Elite Contracts.</p></div></div>',
			'<span class="pill">No lane ready</span>',
			'<p class="small muted">Defeat bosses, retire gear, or build named rival history to surface safe Revisit lanes here.</p>'
		].join('');
		return wrapper;
	}

	function panelFromHelper() {
		const helper = window.earlierDungeonRevisitMarkup || globalThis.earlierDungeonRevisitMarkup;
		if (typeof helper !== 'function') return null;
		const html = helper();
		if (!html) return null;
		const holder = document.createElement('div');
		holder.innerHTML = html;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function takeHeaderPanel() {
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (!headerSlot) return null;
		const panel = headerSlot.querySelector('#revisitPanel') || headerSlot.firstElementChild;
		if (panel) return panel;
		if (!headerSlot.innerHTML.trim()) return null;
		const holder = document.createElement('div');
		holder.innerHTML = headerSlot.innerHTML;
		return holder.querySelector('#revisitPanel') || holder.firstElementChild || null;
	}

	function clearHeaderSlot() {
		const headerSlot = document.getElementById('revisitFoundationSlot');
		if (headerSlot) headerSlot.innerHTML = '';
	}

	function relocateRevisit() {
		try {
			const eliteBoard = document.querySelector('#questPanel .elite-contract-board');
			if (!eliteBoard) return false;

			ensureStyles();
			const slot = ensureBoardBody(eliteBoard);
			let panel = document.querySelector('#lowfireRevisitBoardSlot #revisitPanel');
			if (!panel) panel = document.querySelector('#revisitFoundationSlot #revisitPanel');
			if (!panel) panel = takeHeaderPanel();
			if (!panel) panel = panelFromHelper();
			if (!panel) panel = placeholderPanel();

			slot.innerHTML = '';
			slot.appendChild(panel);
			clearHeaderSlot();
			return true;
		} catch (error) {
			window.__dungeondexRevisitRelocationError = error && (error.stack || error.message || String(error));
			return false;
		}
	}

	function schedule() {
		if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(relocateRevisit);
		window.setTimeout(relocateRevisit, 0);
		window.setTimeout(relocateRevisit, 80);
		window.setTimeout(relocateRevisit, 240);
	}

	function sweep() {
		schedule();
		attempts += 1;
		if (attempts < 40) window.setTimeout(sweep, 200);
	}

	window.addEventListener('DOMContentLoaded', sweep, { passive: true });
	window.addEventListener('load', sweep, { passive: true });
	sweep();

	if ('MutationObserver' in window) {
		const observer = new MutationObserver(schedule);
		observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
	}
})();
