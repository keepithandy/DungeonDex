'use strict';

// v1.23.3 Revisit Archive Codex.
// Adds a read-only archive ledger for completed/active Revisit memories.
// Display-only: no combat, reward, debt, Talent, gear stat, or progression changes.
(function() {
	if (window.DDRevisitArchiveCodex) return;
	window.DDRevisitArchiveCodex = true;

	function list(value) { return Array.isArray(value) ? value : []; }

	function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

	function clean(value, fallback = '') {
		const raw = String(value || fallback || '').trim();
		if (typeof window.cleanDisplayText === 'function') return window.cleanDisplayText(raw, fallback);
		return raw || fallback;
	}

	function esc(value) {
		return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } [ch]));
	}

	function fmt(value) {
		if (typeof window.format === 'function') return window.format(value);
		const num = Number(value);
		return Number.isFinite(num) ? String(Math.floor(num)) : '0';
	}

	function memoryTime(entry) {
		const raw = Number(entry?.completedAt || entry?.startedAt || 0);
		if (!Number.isFinite(raw) || raw <= 0) return '';
		try { return new Date(raw).toLocaleString(); } catch (_) { return ''; }
	}

	function activeMemoryCard(label, active, detailLabel) {
		const title = clean(active.memoryTitle || active.bossName || active.itemName || active.eliteName || label, label);
		const summary = clean(active.summaryLine || active.reflection || 'Memory active in town.', 'Memory active in town.');
		const meta = clean(detailLabel || active.sourceLabel || active.floorName || '', '');
		return `<article class="archive-line archive-note-line revisit-codex-line revisit-codex-active">
      <div class="small muted archive-note-stamp">Active</div>
      <div>
        <strong>${esc(title)}</strong>
        <div class="small muted">${esc(label)}${meta ? ` • ${esc(meta)}` : ''}</div>
        <div>${esc(summary)}</div>
      </div>
    </article>`;
	}

	function historyCard(label, entry, index) {
		const title = clean(entry.memoryTitle || entry.bossName || entry.itemName || entry.eliteName || label, label);
		const summary = clean(entry.summary || entry.summaryLine || entry.reflection || 'Memory recorded.', 'Memory recorded.');
		const stamp = memoryTime(entry) || `Record ${fmt(index + 1)}`;
		const source = clean(entry.sourceLabel || entry.floorName || entry.trophyName || entry.slot || '', '');
		return `<article class="archive-line archive-note-line revisit-codex-line">
      <div class="small muted archive-note-stamp">${esc(stamp)}</div>
      <div>
        <strong>${esc(title)}</strong>
        <div class="small muted">${esc(label)}${source ? ` • ${esc(source)}` : ''}</div>
        <div>${esc(summary)}</div>
      </div>
    </article>`;
	}

	function laneModel(state) {
		const revisit = obj(state?.player?.revisitState);
		const trophy = obj(revisit.trophyEcho);
		const famous = obj(revisit.famousGear);
		const rival = obj(revisit.rivalTrace);
		return [{
				label: 'Trophy Echo',
				active: obj(trophy.active),
				activeDetail: clean(trophy.active?.bossName || trophy.active?.trophyName || '', ''),
				history: list(trophy.history),
				count: list(trophy.history).length,
				marker: `${fmt(trophy.memoryMarks || 0)} Memory Marks`
			},
			{
				label: 'Famous Gear Memory',
				active: obj(famous.active),
				activeDetail: clean(famous.active?.itemName || famous.active?.slot || '', ''),
				history: list(famous.history),
				count: list(famous.history).length,
				marker: `${fmt(Object.keys(obj(famous.completedKeys)).length)} recovered`
			},
			{
				label: 'Rival Trace',
				active: obj(rival.active),
				activeDetail: clean(rival.active?.eliteName || rival.active?.floorName || '', ''),
				history: list(rival.history),
				count: list(rival.history).length,
				marker: `${fmt(Object.keys(obj(rival.completedKeys)).length)} traced`
			}
		].map(lane => ({ ...lane, active: Object.keys(lane.active).length ? lane.active : null }));
	}

	function revisitArchiveCodexMarkup(state) {
		const lanes = laneModel(state);
		const totalHistory = lanes.reduce((sum, lane) => sum + lane.count, 0);
		const activeCount = lanes.filter(lane => !!lane.active).length;
		const rows = lanes.flatMap(lane => {
			const cards = [];
			if (lane.active) cards.push(activeMemoryCard(lane.label, lane.active, lane.activeDetail));
			lane.history.slice(0, 4).forEach((entry, index) => cards.push(historyCard(lane.label, entry, index)));
			return cards;
		});
		const empty = `<div class="archive-line archive-note-line revisit-codex-empty">
      <div class="small muted archive-note-stamp">Locked</div>
      <div><strong>No Revisit memories recorded yet</strong><div class="small muted">Trophy Echo is the only active memory lane. Older Famous Gear and Rival records remain read-only when present.</div></div>
    </div>`;
		return `<div class="sep"></div>
      <div class="archive-history-head revisit-codex-head">
        <div><h3>Revisit Memory Ledger</h3><p class="small muted">Safe town memories recorded outside combat rewards and main progression.</p></div>
        <span class="pill">${fmt(totalHistory)} records${activeCount ? ` • ${fmt(activeCount)} active` : ''}</span>
      </div>
      <div class="tag-row revisit-codex-tags">${lanes.map(lane => `<span class="pill">${esc(lane.label)}: ${esc(lane.marker)}</span>`).join('')}</div>
      <div class="list archive-log-list revisit-codex-list">${rows.length ? rows.join('') : empty}</div>`;
	}

	function injectArchiveCodex() {
		const panel = document.getElementById('archivePanel');
		if (!panel || panel.querySelector('.revisit-codex-head')) return;
		const state = typeof S !== 'undefined' ? S : window.S || {};
		const html = revisitArchiveCodexMarkup(state);
		const emberHeading = Array.from(panel.querySelectorAll('h3')).find(node => /Emberfall Notes/i.test(String(node.textContent || '')));
		if (emberHeading) {
			const marker = emberHeading.previousElementSibling;
			if (marker && marker.classList && marker.classList.contains('sep')) marker.insertAdjacentHTML('beforebegin', html);
			else emberHeading.insertAdjacentHTML('beforebegin', html);
			return;
		}
		panel.insertAdjacentHTML('beforeend', html);
	}

	const originalRenderArchive = typeof window.renderArchive === 'function' ? window.renderArchive : null;
	if (originalRenderArchive) {
		window.renderArchive = function renderArchive() {
			originalRenderArchive.apply(this, arguments);
			injectArchiveCodex();
		};
	}

	window.DDRevisitArchiveCodexRender = injectArchiveCodex;
	window.addEventListener('DOMContentLoaded', function() { window.setTimeout(injectArchiveCodex, 0); });
	window.addEventListener('load', function() { window.setTimeout(injectArchiveCodex, 50); });
})();
